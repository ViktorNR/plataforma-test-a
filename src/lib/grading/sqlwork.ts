import type mysql from 'mysql2/promise';
import { createScratch, dropDatabases, execStatement, isolateDb, openSandbox, type ExecOutcome, type ResultSet } from '../sqlexec';
import { splitStatements } from '../sqlsplit';
import type { Feedback, FeedbackItem, SqlWorkSpec } from '../types';
import { finish } from './text';

/* Corrector de consultas, DML y rutinas: ejecuta la respuesta del estudiante y la solución de referencia sobre copias
 * limpias de la base de ejemplo y compara los resultados (filas, estado final de tablas o salida de llamadas de prueba). */

let running = 0;
const waiting: (() => void)[] = [];
async function acquire() {
  if (running >= 3) await new Promise<void>((res) => waiting.push(res));
  running++;
}
function release() {
  running--;
  waiting.shift()?.();
}

const MAX_STATEMENTS = 40;
const MAX_SCRIPT = 20_000;

const fmtNum = (n: number) => String(Number(n.toFixed(4)));
const normVal = (v: string | number | null): string => {
  if (v === null) return '∅';
  if (typeof v === 'number') return fmtNum(v);
  const s = String(v).trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? fmtNum(Number(s)) : s;
};
const rowKey = (r: (string | number | null)[]) => JSON.stringify(r.map(normVal));
const showRow = (r: (string | number | null)[]) => '(' + r.map((v) => (v === null ? 'NULL' : String(v))).join(' | ') + ')';

interface Cmp {
  equal: boolean;
  reordered: boolean; // mismas filas pero distinto orden (solo importa si `ordered`)
  colsSwapped: boolean; // mismas filas con columnas en otro orden
  colsEq: boolean;
  expRows: number;
  actRows: number;
  inter: number;
  missing: string[];
  extra: string[];
}

function compareSets(exp: ResultSet, act: ResultSet, ordered: boolean): Cmp {
  const colsEq = exp.columns.length === act.columns.length;
  const count = (rows: ResultSet['rows'], keyOf: (r: ResultSet['rows'][number]) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + 1);
    return m;
  };
  const sortedKey = (r: ResultSet['rows'][number]) => JSON.stringify(r.map(normVal).sort());
  const expM = count(exp.rows, rowKey);
  const actM = count(act.rows, rowKey);
  let inter = 0;
  for (const [k, n] of expM) inter += Math.min(n, actM.get(k) ?? 0);
  const missing: string[] = [];
  const extra: string[] = [];
  const seenE = new Map<string, number>();
  for (const r of exp.rows) {
    const k = rowKey(r);
    const used = (seenE.get(k) ?? 0) + 1;
    seenE.set(k, used);
    if (used > (actM.get(k) ?? 0) && missing.length < 3) missing.push(showRow(r));
  }
  const seenA = new Map<string, number>();
  for (const r of act.rows) {
    const k = rowKey(r);
    const used = (seenA.get(k) ?? 0) + 1;
    seenA.set(k, used);
    if (used > (expM.get(k) ?? 0) && extra.length < 3) extra.push(showRow(r));
  }
  const sameMulti = colsEq && inter === exp.rows.length && inter === act.rows.length;
  let reordered = false;
  if (sameMulti && ordered) reordered = exp.rows.some((r, i) => rowKey(r) !== rowKey(act.rows[i]));
  let colsSwapped = false;
  if (!sameMulti && colsEq) {
    const e2 = count(exp.rows, sortedKey);
    const a2 = count(act.rows, sortedKey);
    colsSwapped = exp.rows.length === act.rows.length && [...e2].every(([k, n]) => a2.get(k) === n);
  }
  return { equal: (sameMulti && !reordered) || colsSwapped, reordered, colsSwapped, colsEq, expRows: exp.rows.length, actRows: act.rows.length, inter, missing, extra };
}

function describeCmp(c: Cmp, exp: ResultSet, act: ResultSet, label: string): { items: FeedbackItem[]; score: number } {
  const items: FeedbackItem[] = [];
  if (c.equal) {
    items.push({ ok: true, text: `${label}el resultado coincide con el esperado (${c.expRows} fila(s)).` });
    if (c.colsSwapped) items.push({ ok: true, text: 'Las columnas están en distinto orden que en la solución, pero el contenido es el mismo (se acepta).' });
    return { items, score: 1 };
  }
  let score = 0;
  if (c.colsEq) score += 0.2;
  else items.push({ ok: false, text: `${label}tu resultado tiene ${act.columns.length} columna(s) y se esperaban ${exp.columns.length}.` });
  if (c.expRows === c.actRows) score += 0.2;
  else items.push({ ok: false, text: `${label}tu resultado tiene ${c.actRows} fila(s) y se esperaban ${c.expRows}.` });
  const denom = Math.max(c.expRows, c.actRows, 1);
  score += 0.6 * (c.inter / denom);
  if (c.reordered) {
    items.push({ ok: false, text: `${label}las filas son las correctas pero el orden no coincide (revisa ORDER BY y su sentido ASC/DESC).` });
    return { items, score: Math.max(score, 0.8) };
  }
  if (c.colsEq && c.missing.length) items.push({ ok: false, text: `${label}faltan filas como: ${c.missing.join(', ')}.` });
  if (c.colsEq && c.extra.length) items.push({ ok: false, text: `${label}sobran filas como: ${c.extra.join(', ')}.` });
  if (c.colsEq && !c.missing.length && !c.extra.length) items.push({ ok: false, text: `${label}los valores no coinciden con los esperados.` });
  return { items, score };
}

async function runList(conn: mysql.Connection, statements: string[], prefix: string): Promise<ExecOutcome[]> {
  const out: ExecOutcome[] = [];
  for (const s of statements) {
    const o = await execStatement(conn, s, 10000, prefix);
    out.push(o);
    if (o.kind === 'error') break;
  }
  return out;
}

async function snapshot(conn: mysql.Connection, db: string, table: string) {
  const cols = await execStatement(conn, `SELECT LOWER(COLUMN_NAME), LOWER(COLUMN_TYPE) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${db}' AND TABLE_NAME='${table}' ORDER BY ORDINAL_POSITION`);
  const rows = await execStatement(conn, `SELECT * FROM \`${table}\` LIMIT 20000`);
  return { cols: cols.sets[0]?.rows.map((r) => `${r[0]}:${r[1]}`) ?? [], data: rows.sets[0] ?? { columns: [], rows: [] }, error: rows.kind === 'error' ? rows.message : undefined };
}

const lastRows = (outs: ExecOutcome[]): ResultSet | null => {
  for (let i = outs.length - 1; i >= 0; i--) if (outs[i].kind === 'rows' && outs[i].sets.length) return outs[i].sets[outs[i].sets.length - 1];
  return null;
};

export interface WorkRun {
  statements: ExecOutcome[];
}

export async function gradeSqlWork(script: string, spec: SqlWorkSpec): Promise<Feedback> {
  if (!script.trim()) return { score: 0, summary: 'El script está vacío.', items: [{ ok: false, text: 'Escribe tu respuesta SQL.' }] };
  if (script.length > MAX_SCRIPT) return { score: 0, summary: 'El script es demasiado largo.', items: [{ ok: false, text: 'Máximo 20.000 caracteres.' }] };

  await acquire();
  const created: string[] = [];
  const conns: mysql.Connection[] = [];
  try {
    const stu = await createScratch(spec.db);
    created.push(stu.name);
    const ref = spec.kind === 'query' ? stu : await createScratch(spec.db);
    if (ref !== stu) created.push(ref.name);

    // 1) Referencia
    const refConn = await openSandbox(ref.name);
    conns.push(refConn);
    const refOuts = await runList(refConn, splitStatements(isolateDb(spec.reference, spec.db, ref.prefix)), ref.prefix);
    const refErr = refOuts.find((o) => o.kind === 'error');
    if (refErr) throw new Error(`La solución de referencia falló: ${refErr.message}`);

    // 2) Respuesta del estudiante
    const stuConn = await openSandbox(stu.name);
    conns.push(stuConn);
    const stmts = splitStatements(isolateDb(script, spec.db, stu.prefix));
    if (stmts.length === 0) return { score: 0, summary: 'No hay sentencias para ejecutar.', items: [{ ok: false, text: 'Tu script no contiene sentencias SQL.' }] };
    if (stmts.length > MAX_STATEMENTS) return { score: 0, summary: 'Demasiadas sentencias.', items: [{ ok: false, text: `Máximo ${MAX_STATEMENTS} sentencias.` }] };
    const stuOuts = await runList(stuConn, stmts, stu.prefix);
    const stuErr = stuOuts.find((o) => o.kind === 'error');
    const items: FeedbackItem[] = [];
    if (stuErr) items.push({ ok: false, text: `Error en tu script: ${stuErr.message}` });
    else items.push({ ok: true, text: 'Tu script se ejecutó sin errores.' });

    // 3) Comparación
    let score = 0;
    if (spec.kind === 'query') {
      const exp = lastRows(refOuts)!;
      const act = lastRows(stuOuts);
      if (!act) {
        items.push({ ok: false, text: stuErr ? 'Corrige el error para ver el resultado de tu consulta.' : 'Tu script no devolvió un conjunto de resultados (¿falta el SELECT?).' });
      } else {
        const d = describeCmp(compareSets(exp, act, !!spec.ordered), exp, act, 'Consulta: ');
        items.push(...d.items);
        score = d.score;
      }
    } else {
      const parts: number[] = [];
      for (const t of spec.tests ?? []) {
        const [e] = await runList(refConn, [t], ref.prefix);
        const [a] = await runList(stuConn, [t], stu.prefix);
        const label = `Prueba «${t.length > 60 ? t.slice(0, 57) + '…' : t}»: `;
        if (a.kind === 'error') {
          items.push({ ok: false, text: `${label}${a.message}` });
          parts.push(0);
        } else if (e.kind === 'rows') {
          if (a.kind !== 'rows' || !a.sets.length) {
            items.push({ ok: false, text: `${label}debía devolver filas y no devolvió resultados.` });
            parts.push(0);
          } else {
            const d = describeCmp(compareSets(e.sets[e.sets.length - 1], a.sets[a.sets.length - 1], true), e.sets[e.sets.length - 1], a.sets[a.sets.length - 1], label);
            items.push(...d.items);
            parts.push(d.score);
          }
        } else {
          items.push({ ok: true, text: `${label}se ejecutó correctamente.` });
          parts.push(1);
        }
      }
      for (const t of spec.tables ?? []) {
        const e = await snapshot(refConn, ref.name, t);
        const a = await snapshot(stuConn, stu.name, t);
        if (a.error) {
          items.push({ ok: false, text: `Tabla «${t}»: ${a.error}` });
          parts.push(0);
          continue;
        }
        const colsOk = JSON.stringify(e.cols) === JSON.stringify(a.cols);
        const cmp = compareSets(e.data, a.data, false);
        if (!colsOk) items.push({ ok: false, text: `Tabla «${t}»: las columnas no coinciden con las esperadas (esperadas: ${e.cols.map((c) => c.split(':')[0]).join(', ')}).` });
        if (cmp.equal && colsOk) {
          items.push({ ok: true, text: `Tabla «${t}»: el contenido final es el esperado (${cmp.expRows} fila(s)).` });
          parts.push(1);
        } else {
          if (colsOk || colsOk === false) {
            if (!cmp.equal) {
              if (cmp.expRows !== cmp.actRows) items.push({ ok: false, text: `Tabla «${t}»: tiene ${cmp.actRows} fila(s) y se esperaban ${cmp.expRows}.` });
              if (cmp.missing.length) items.push({ ok: false, text: `Tabla «${t}»: faltan registros como ${cmp.missing.join(', ')}.` });
              if (cmp.extra.length) items.push({ ok: false, text: `Tabla «${t}»: sobran o difieren registros como ${cmp.extra.join(', ')}.` });
              if (!cmp.missing.length && !cmp.extra.length && cmp.expRows === cmp.actRows) items.push({ ok: false, text: `Tabla «${t}»: los valores no coinciden con los esperados.` });
            }
          }
          parts.push((colsOk ? 0.3 : 0) + 0.7 * (cmp.inter / Math.max(cmp.expRows, cmp.actRows, 1)));
        }
      }
      score = parts.length ? parts.reduce((x, y) => x + y, 0) / parts.length : 0;
      if (stuErr && score > 0.5) score = 0.5;
    }
    if (stuErr && score > 0.5 && spec.kind === 'query') score = 0.5;
    const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
    return { ...finish(pct, 100, 0, items), score: pct };
  } catch (e) {
    const msg = (e as Error).message;
    if (/La solución de referencia/.test(msg)) console.error('[sqlwork] referencia inválida', msg);
    return { score: 0, summary: 'No se pudo corregir.', items: [{ ok: false, text: /La solución de referencia/.test(msg) ? 'Este ejercicio tiene un problema interno. Avisa al docente.' : 'El servidor MySQL de práctica no está disponible. Intenta nuevamente en unos minutos.' }] };
  } finally {
    for (const c of conns) await c.end().catch(() => c.destroy());
    await dropDatabases(...created);
    release();
  }
}

/** Ejecuta el script del estudiante sobre una copia de la base del ejercicio (sin corrección) y devuelve las salidas. */
export async function practiceSqlWork(script: string, dbId: string): Promise<{ results: ExecOutcome[]; error?: string }> {
  if (!script.trim()) return { results: [], error: 'Escribe una sentencia SQL.' };
  if (script.length > MAX_SCRIPT) return { results: [], error: 'El script es demasiado largo.' };
  await acquire();
  const created: string[] = [];
  let conn: mysql.Connection | undefined;
  try {
    const s = await createScratch(dbId);
    created.push(s.name);
    conn = await openSandbox(s.name);
    const stmts = splitStatements(isolateDb(script, dbId, s.prefix)).slice(0, MAX_STATEMENTS);
    const results = await runList(conn, stmts, s.prefix);
    return { results: results.map((o) => ({ ...o, sets: o.sets.map((x) => ({ columns: x.columns, rows: x.rows.slice(0, 300) })) })) };
  } catch {
    return { results: [], error: 'El servidor MySQL de práctica no está disponible. Intenta nuevamente.' };
  } finally {
    await conn?.end().catch(() => conn?.destroy());
    await dropDatabases(...created);
    release();
  }
}
