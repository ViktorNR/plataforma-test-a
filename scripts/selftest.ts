// Autoprueba de contenido y correctores: `npx tsx scripts/selftest.ts`
// Con SANDBOX_MYSQL_* definido también ejecuta los 15 ejercicios SQL contra el MySQL real.
import { EXERCISES } from '../src/lib/content/catalog';
import { toDdl } from '../src/lib/content/dsl';
import { countOverlaps, toFlow } from '../src/lib/er-layout';
import { gradeEr } from '../src/lib/grading/er';
import { gradeNormalization } from '../src/lib/grading/normalization';
import { gradeSchema } from '../src/lib/grading/schema';
import { gradeSql } from '../src/lib/grading/sql';
import { gradeSqlWork, practiceSqlWork } from '../src/lib/grading/sqlwork';
import { solutionOf } from '../src/lib/solution';
import { formatSql } from '../src/lib/sqlformat';
import type mysql from 'mysql2/promise';
import { splitStatements } from '../src/lib/sqlsplit';
import { createScratch, dropDatabases, openRoot } from '../src/lib/sqlexec';
import { schemaOf, TEMPLATES } from '../src/lib/sqltemplates';
import type { ErModel, Fd, SchemaSol, StudentNorm, StudentSchema } from '../src/lib/types';

let failed = 0;
let passed = 0;
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`);
  }
};

// ---------- Estructura del catálogo ----------
const slugs = new Set<string>();
for (const e of EXERCISES) {
  check(`slug único ${e.slug}`, !slugs.has(e.slug));
  slugs.add(e.slug);
}
for (let w = 1; w <= 13; w++) check(`semana ${w} tiene al menos 15 ejercicios`, EXERCISES.filter((e) => e.week === w).length >= 15, String(EXERCISES.filter((e) => e.week === w).length));

// ---------- E/R y E/R extendido ----------
function modelChecks(slug: string, m: ErModel) {
  const names = new Set(m.entities.map((e) => e.name));
  for (const e of m.entities) {
    const isChild = (m.specializations ?? []).some((s) => s.children.includes(e.name));
    if (!isChild && !e.weak && !e.attrs.some((a) => a.key)) check(`${slug}: entidad sin clave ${e.name}`, false);
    if (e.weak && !e.attrs.some((a) => a.partialKey)) check(`${slug}: débil sin clave parcial ${e.name}`, false);
  }
  for (const r of m.relationships) for (const b of r.between) check(`${slug}: relación ${r.name} apunta a entidad inexistente ${b.entity}`, names.has(b.entity));
  for (const s of m.specializations ?? []) for (const n of [s.parent, ...s.children]) check(`${slug}: especialización con entidad inexistente ${n}`, names.has(n));
  const lay = (m.layout ?? []).flat().filter(Boolean) as string[];
  if (m.layout) for (const n of lay) check(`${slug}: layout con entidad inexistente ${n}`, names.has(n));
}

for (const ex of EXERCISES) {
  if (ex.type === 'ER' || ex.type === 'EER') {
    modelChecks(ex.slug, ex.solution);
    const { nodes, edges } = toFlow(ex.solution);
    const fb = gradeEr({ nodes, edges }, ex.solution);
    check(`ER ${ex.slug} solución = 100`, fb.score === 100, `${fb.score} ${fb.items.filter((i) => !i.ok).map((i) => i.text).join(' | ')}`);
    check(`ER ${ex.slug} vacío = 0`, gradeEr({ nodes: [], edges: [] }, ex.solution).score === 0);
    const broken = edges.map((e) => (e.data?.card ? { ...e, data: { ...e.data, card: e.data.card === 'N' ? '1' : 'N' } } : e));
    if (ex.solution.relationships.some((r) => r.between.length === 2 && r.between[0].card !== r.between[1].card)) check(`ER ${ex.slug} cardinalidad invertida < 100`, gradeEr({ nodes, edges: broken }, ex.solution).score < 100);
  }
  if (ex.type === 'TRANSFORMACION') {
    modelChecks(ex.slug, ex.model);
    check(`TRANSF ${ex.slug} tiene opciones`, ex.options.length > 0);
    check(`TRANSF ${ex.slug} opciones razonables (≤ 40)`, ex.options.length <= 40, String(ex.options.length));
    ex.options.forEach((opt: SchemaSol, i) => {
      // Un estudiante que usa nombres «propios» para tablas intermedias y columnas FK distintas.
      const tableName = (t: SchemaSol['tables'][number]) => (t.structural ? `x_${t.name}` : t.name);
      const student: StudentSchema = {
        tables: opt.tables.map((t, ti) => ({
          id: `t${ti}`,
          name: tableName(t),
          cols: t.cols.map((c, ci) => ({ id: `c${ti}_${ci}`, name: c.fk ? `${c.name}_fk${ci}` : c.name, pk: !!c.pk, fkTable: '' })),
        })),
      };
      opt.tables.forEach((t, ti) =>
        t.cols.forEach((c, ci) => {
          if (c.fk) {
            const idx = opt.tables.findIndex((x) => x.name === c.fk);
            student.tables[ti].cols[ci].fkTable = student.tables[idx].name;
          }
        }),
      );
      const fb = gradeSchema(student, ex.options);
      check(`TRANSF ${ex.slug} opción ${i + 1}/${ex.options.length} = 100`, fb.score === 100, `${fb.score} ${fb.items.filter((x) => !x.ok).map((x) => x.text).join(' | ')}`);
    });
    check(`TRANSF ${ex.slug} vacío = 0`, gradeSchema({ tables: [] }, ex.options).score === 0);
  }
}

// ---------- Normalización: síntesis de 3FN como respuesta de referencia ----------
const closure = (start: string[], fds: Fd[]) => {
  const c = new Set(start);
  let ch = true;
  while (ch) {
    ch = false;
    for (const f of fds) if (f.lhs.every((a) => c.has(a))) for (const r of f.rhs) if (!c.has(r)) (c.add(r), (ch = true));
  }
  return c;
};
function synth(attrs: string[], fds: Fd[]): StudentNorm {
  const groups = new Map<string, { lhs: string[]; rhs: Set<string> }>();
  for (const f of fds) {
    const k = [...f.lhs].sort().join(',');
    const g = groups.get(k) ?? { lhs: f.lhs, rhs: new Set<string>() };
    f.rhs.forEach((r) => g.rhs.add(r));
    groups.set(k, g);
  }
  let rels = [...groups.values()].map((g) => ({ attrs: [...new Set([...g.lhs, ...g.rhs])], pk: g.lhs }));
  // clave candidata de R
  let key: string[] = attrs;
  for (let mask = 1; mask < 1 << attrs.length; mask++) {
    const s = attrs.filter((_, i) => mask & (1 << i));
    if (s.length < key.length && attrs.every((a) => closure(s, fds).has(a))) key = s;
  }
  if (!rels.some((r) => key.every((a) => r.attrs.includes(a)))) rels.push({ attrs: key, pk: key });
  rels = rels.filter((r, i) => !rels.some((o, j) => j !== i && r.attrs.every((a) => o.attrs.includes(a)) && (o.attrs.length > r.attrs.length || j < i)));
  return { tables: rels.map((r, i) => ({ id: `t${i}`, name: `T${i}`, attrs: r.attrs, pk: r.pk })) };
}
for (const ex of EXERCISES) {
  if (ex.type !== 'NORMALIZACION') continue;
  const p = ex.problem;
  for (const f of p.fds) for (const a of [...f.lhs, ...f.rhs]) check(`NORM ${ex.slug}: atributo desconocido ${a}`, p.attrs.includes(a));
  const fb = gradeNormalization(synth(p.attrs, p.fds), p);
  check(`NORM ${ex.slug} síntesis 3FN = 100`, fb.score === 100, `${fb.score} ${fb.items.filter((x) => !x.ok).map((x) => x.text).join(' | ')}`);
  check(`NORM ${ex.slug} tabla única < 40`, gradeNormalization({ tables: [{ id: 'r', name: 'R', attrs: p.attrs, pk: synth(p.attrs, p.fds).tables.find((t) => t.attrs.length > 0)!.pk }] }, p).score < 40);
}

// ---------- «Ver respuesta»: todo ejercicio produce una solución mostrable ----------
for (const ex of EXERCISES) {
  const s = solutionOf(ex);
  check(`solución ${ex.slug}`, s.kind === 'quiz' ? Object.keys(s.answers).length > 0 : s.kind === 'model' ? s.model.entities.length > 0 : s.blocks.length > 0 && s.blocks.every((b) => b.code.trim().length > 0));
}

// ---------- Formateador SQL: no debe alterar el contenido (solo espacios/saltos) y debe repartir en varias líneas ----------
for (const ex of EXERCISES) {
  if (ex.type !== 'SQL_WORK') continue;
  const strip = (s: string) => s.replace(/[\s;]+/g, '');
  const f = formatSql(ex.work.reference);
  check(`formato SQL ${ex.slug} conserva el contenido`, strip(f) === strip(ex.work.reference), f);
  if (ex.work.kind === 'query' && ex.work.reference.length > 60 && !/^s(6|12|13)-/.test(ex.slug)) check(`formato SQL ${ex.slug} usa varias líneas`, f.includes('\n'));
}
// ---------- Todos los modelos E/R deben ser conexos (sin entidades sueltas) ----------
for (const ex of EXERCISES) {
  const m = ex.type === 'ER' || ex.type === 'EER' ? ex.solution : ex.type === 'TRANSFORMACION' ? ex.model : null;
  if (!m || /^s(6|12|13)-/.test(ex.slug) || m.entities.length < 2) continue;
  const adj = new Map<string, Set<string>>(m.entities.map((e) => [e.name, new Set<string>()]));
  const link = (a: string, b: string) => { adj.get(a)?.add(b); adj.get(b)?.add(a); };
  for (const r of m.relationships) for (const x of r.between) for (const y of r.between) if (x.entity !== y.entity) link(x.entity, y.entity);
  for (const s of m.specializations ?? []) for (const c of s.children) link(s.parent, c);
  const seen = new Set<string>([m.entities[0].name]);
  const q = [m.entities[0].name];
  while (q.length) for (const n of adj.get(q.pop()!) ?? []) if (!seen.has(n)) (seen.add(n), q.push(n));
  const loose = m.entities.filter((e) => !seen.has(e.name)).map((e) => e.name);
  check(`modelo ${ex.slug} conexo`, loose.length === 0, `sin relacionar: ${loose.join(', ')}`);
}

// ---------- Diagramas de solo lectura: nada se superpone ----------
for (const ex of EXERCISES) {
  const m = ex.type === 'ER' || ex.type === 'EER' ? ex.solution : ex.type === 'TRANSFORMACION' ? ex.model : null;
  if (!m || /^s(6|12|13)-/.test(ex.slug)) continue;
  const ov = countOverlaps(toFlow(m).nodes);
  check(`diagrama ${ex.slug} sin superposiciones`, ov.length === 0, ov.slice(0, 6).join(' | '));
}

// ---------- Divisor de sentencias del laboratorio ----------
{
  const eq = (name: string, got: unknown, want: unknown) => check(name, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  eq('split simple', splitStatements('SELECT 1; SELECT 2;'), ['SELECT 1', 'SELECT 2']);
  eq('split cadenas y comentarios', splitStatements("SELECT 'a;b' AS x; -- coment; otro\nSELECT 2 /* ; */;"), ["SELECT 'a;b' AS x", 'SELECT 2']);
  const proc = `DROP PROCEDURE IF EXISTS p;\nDELIMITER $$\nCREATE PROCEDURE p(IN a INT)\nBEGIN\n  SELECT 1;\n  IF a > 0 THEN SELECT 2; END IF;\nEND$$\nDELIMITER ;\nCALL p(1);`;
  const parts = splitStatements(proc);
  check('split DELIMITER: 3 sentencias', parts.length === 3, JSON.stringify(parts));
  check('split DELIMITER: cuerpo íntegro', /SELECT 1;[\s\S]*END IF;\s*END$/.test(parts[1] ?? ''), parts[1]);
  const noDelim = splitStatements('CREATE PROCEDURE q()\nBEGIN\n  SELECT CASE WHEN 1=1 THEN 1 ELSE 2 END;\n  WHILE 1=0 DO SELECT 3; END WHILE;\nEND;\nSELECT 9;');
  check('split sin DELIMITER (BEGIN…END)', noDelim.length === 2 && noDelim[1] === 'SELECT 9', JSON.stringify(noDelim));
  eq('split trigger de una línea', splitStatements('CREATE TRIGGER t BEFORE INSERT ON x FOR EACH ROW SET NEW.a = 1; SELECT 1;').length, 2);
  eq('split DROP … IF EXISTS no confunde', splitStatements('DROP TABLE IF EXISTS a; DROP TABLE IF EXISTS b;').length, 2);
}

// ---------- SQL contra MySQL real ----------
async function sqlChecks() {
  for (const ex of EXERCISES) {
    if (ex.type !== 'SQL_DDL') continue;
    const fb = await gradeSql(toDdl(ex.solution), ex.solution);
    check(`SQL ${ex.slug} script de referencia = 100`, fb.score === 100, `${fb.score} ${fb.items.filter((x) => !x.ok).map((x) => x.text).join(' | ')}`);
  }
}

// ---------- SQL_WORK: la referencia debe puntuar 100 %, una respuesta trivial no, y el resultado/efecto no puede ser vacío ----------
async function workChecks() {
  for (const ex of EXERCISES) {
    if (ex.type !== 'SQL_WORK' || /^s(6|12|13)-/.test(ex.slug)) continue;
    const w = ex.work;
    const fb = await gradeSqlWork(w.reference, w);
    check(`WORK ${ex.slug} referencia = 100`, fb.score === 100, `${fb.score} ${fb.items.filter((x) => !x.ok).map((x) => x.text).join(' | ')}`);
    const bad = await gradeSqlWork('SELECT 1', w);
    check(`WORK ${ex.slug} respuesta trivial < 100`, bad.score < 100, String(bad.score));
    if (w.kind === 'query') {
      const r = await practiceSqlWork(w.reference, w.db);
      const last = r.results[r.results.length - 1];
      check(`WORK ${ex.slug} la consulta devuelve filas`, !r.error && last?.kind === 'rows' && (last.sets[last.sets.length - 1]?.rows.length ?? 0) > 0, r.error ?? '');
    }
  }
}
// ---------- Bases de ejemplo: cada plantilla debe cargar completa en MySQL ----------
async function templateChecks() {
  for (const t of TEMPLATES) {
    try {
      const { name } = await createScratch(t.id);
      const root = await openRoot();
      const [rows] = await root.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA='${name}'`);
      const info = schemaOf(t.id);
      check(`plantilla ${t.id}: tablas cargadas = tablas del DDL`, Number(rows[0].n) === info.length && info.length > 0, `${rows[0].n} vs ${info.length}`);
      for (const tb of info.slice(0, 40)) {
        const [c] = await root.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${name}\`.\`${tb.name}\``);
        if (['centro_medico', 'universidad', 'educacion_superior', 'comercio', 'biblioteca'].includes(t.id) && tb.columns.length && tb.name.match(/^(paciente|cita|estudiante|matricula|factura|prestamo|carrera|libro)$/i)) {
          check(`plantilla ${t.id}.${tb.name} tiene datos`, Number(c[0].n) > 0);
        }
      }
      await root.end();
      await dropDatabases(name);
    } catch (e) {
      check(`plantilla ${t.id} carga`, false, String((e as Error).message).slice(0, 300));
    }
  }
}

(async () => {
  if (process.env.SANDBOX_MYSQL_ROOT_PASSWORD) await templateChecks();
  if (process.env.SANDBOX_MYSQL_PASSWORD) {
    await sqlChecks();
    if (process.env.SANDBOX_MYSQL_ROOT_PASSWORD) await workChecks();
  }
  else console.log('(SQL omitido: sin SANDBOX_MYSQL_PASSWORD)');
  console.log(`\n${passed} comprobaciones correctas, ${failed} fallidas`);
  process.exit(failed ? 1 : 0);
})();
