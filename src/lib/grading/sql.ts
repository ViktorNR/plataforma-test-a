import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { Feedback, FeedbackItem, SqlSol } from '../types';
import { finish } from './text';

const FAMILIES: Record<string, string[]> = {
  int: ['int', 'integer', 'bigint', 'smallint', 'mediumint', 'tinyint'],
  string: ['varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext'],
  decimal: ['decimal', 'numeric', 'float', 'double'],
  date: ['date', 'datetime', 'timestamp'],
  enum: ['enum', 'set'],
};
const FAMILY_LABEL: Record<string, string> = {
  int: 'entero (INT)',
  string: 'texto (VARCHAR)',
  decimal: 'decimal (DECIMAL)',
  date: 'fecha (DATE)',
  enum: 'lista de valores (ENUM)',
};

// Máximo de scripts ejecutándose a la vez en el sandbox.
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

function connect() {
  return mysql.createConnection({
    host: process.env.SANDBOX_MYSQL_HOST ?? 'sandbox',
    port: Number(process.env.SANDBOX_MYSQL_PORT ?? 3306),
    user: process.env.SANDBOX_MYSQL_USER ?? 'sandbox',
    password: process.env.SANDBOX_MYSQL_PASSWORD,
    multipleStatements: true,
    connectTimeout: 5000,
  });
}

/** Renombra la base esperada a un nombre único para aislar cada intento. */
function isolate(script: string, dbName: string, prefix: string) {
  const n = dbName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const real = `${prefix}${dbName}`;
  return script
    .replace(new RegExp(`(create\\s+(?:database|schema)\\s+(?:if\\s+not\\s+exists\\s+)?)\`?${n}\`?(?![\\w$])`, 'gi'), `$1\`${real}\``)
    .replace(new RegExp(`(\\buse\\s+)\`?${n}\`?(?![\\w$])`, 'gi'), `$1\`${real}\``)
    .replace(new RegExp(`(?<![\\w$\`])\`?${n}\`?(?=\\s*\\.\\s*[\`\\w])`, 'gi'), `\`${real}\``)
    .replace(new RegExp(`(drop\\s+(?:database|schema)\\s+(?:if\\s+exists\\s+)?)\`?${n}\`?(?![\\w$])`, 'gi'), `$1\`${real}\``);
}

export async function gradeSql(script: string, sol: SqlSol): Promise<Feedback> {
  const items: FeedbackItem[] = [];
  if (!script.trim()) return { score: 0, summary: 'El script está vacío.', items: [{ ok: false, text: 'Escribe tu script SQL.' }] };
  if (script.length > 20000) return { score: 0, summary: 'El script es demasiado largo.', items: [{ ok: false, text: 'Máximo 20.000 caracteres.' }] };

  await acquire();
  const prefix = `sbx_${randomBytes(4).toString('hex')}_`;
  let conn: mysql.Connection | undefined;
  try {
    try {
      conn = await connect();
    } catch {
      return { score: 0, summary: 'El servidor de práctica SQL no está disponible.', items: [{ ok: false, text: 'Intenta nuevamente en unos minutos. Si persiste, avisa al docente.' }] };
    }

    let execError: string | null = null;
    try {
      await conn.query({ sql: isolate(script, sol.db, prefix), timeout: 10000 });
    } catch (e) {
      execError = String((e as { sqlMessage?: string; message?: string }).sqlMessage ?? (e as Error).message).split(prefix).join('');
      if (/command denied|access denied/i.test(execError)) {
        execError += ' (recuerda crear y usar solo la base de datos pedida en el enunciado).';
      }
    }
    if (execError) items.push({ ok: false, text: `Tu script produjo un error: ${execError}` });
    else items.push({ ok: true, text: 'El script se ejecutó sin errores.' });

    // Si el script cambió de conexión/estado, volvemos a abrir una conexión limpia para inspeccionar.
    const [dbs] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES');
    const mine = dbs.map((r) => String(Object.values(r)[0])).filter((d) => d.startsWith(prefix));
    const realName = `${prefix}${sol.db}`;

    let earned = 0;
    let max = 1;
    if (mine.includes(realName)) {
      earned += 1;
      items.push({ ok: true, text: `Base de datos «${sol.db}» creada.` });
    } else {
      items.push({ ok: false, text: `No se encontró la base de datos «${sol.db}». Usa exactamente ese nombre con CREATE DATABASE.` });
      for (const t of sol.tables) max += 1 + t.cols.length + 2 + t.fks.length * 2;
      return finish(0, max, 0, items);
    }

    const q = async <T extends mysql.RowDataPacket>(sql: string) => (await conn!.query<T[]>(sql, [realName]))[0];
    const tables = (await q('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'')).map((r) => String(r.t));
    const columns = await q('SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS ty, IS_NULLABLE AS nl, EXTRA AS ex FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=?');
    const pks = await q('SELECT TABLE_NAME AS t, COLUMN_NAME AS c, ORDINAL_POSITION AS o FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND CONSTRAINT_NAME=\'PRIMARY\'');
    const fks = await q('SELECT TABLE_NAME AS t, CONSTRAINT_NAME AS n, COLUMN_NAME AS c, REFERENCED_TABLE_NAME AS rt, REFERENCED_COLUMN_NAME AS rc FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY ORDINAL_POSITION');
    const uniq = await q('SELECT TABLE_NAME AS t, INDEX_NAME AS i, COLUMN_NAME AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND NON_UNIQUE=0 AND INDEX_NAME<>\'PRIMARY\'');

    const lc = (s: unknown) => String(s).toLowerCase();
    const real = new Map(tables.map((t) => [lc(t), t]));
    let extraPenalty = 0;

    for (const t of sol.tables) {
      max += 1;
      const rt = real.get(lc(t.name));
      if (!rt) {
        items.push({ ok: false, text: `Falta la tabla «${t.name}».` });
        max += t.cols.length + 2 + t.fks.length * 2;
        for (const c of t.cols) max += (c.notNull ? 1 : 0) + (c.unique ? 1 : 0) + (c.autoInc ? 1 : 0);
        continue;
      }
      earned += 1;
      const problems: string[] = [];

      for (const c of t.cols) {
        max += 2 + (c.notNull ? 1 : 0) + (c.unique ? 1 : 0) + (c.autoInc ? 1 : 0);
        const col = columns.find((r) => lc(r.t) === lc(rt) && lc(r.c) === lc(c.name));
        if (!col) {
          problems.push(`falta la columna «${c.name}»`);
          continue;
        }
        earned += 1;
        if (FAMILIES[c.type].includes(lc(col.ty))) earned += 1;
        else problems.push(`«${c.name}» debería ser de tipo ${FAMILY_LABEL[c.type]} (tienes ${String(col.ty).toUpperCase()})`);
        if (c.notNull) {
          if (col.nl === 'NO') earned += 1;
          else problems.push(`«${c.name}» debe ser NOT NULL`);
        }
        if (c.unique) {
          const isUnique = uniq.some((u) => lc(u.t) === lc(rt) && lc(u.c) === lc(c.name) && uniq.filter((x) => x.t === u.t && x.i === u.i).length === 1);
          if (isUnique) earned += 1;
          else problems.push(`«${c.name}» debe ser UNIQUE`);
        }
        if (c.autoInc) {
          if (/auto_increment/i.test(String(col.ex))) earned += 1;
          else problems.push(`«${c.name}» debe ser AUTO_INCREMENT`);
        }
      }

      max += 2;
      const gotPk = pks.filter((r) => lc(r.t) === lc(rt)).sort((a, b) => a.o - b.o).map((r) => lc(r.c));
      const wantPk = t.pk.map(lc);
      if (gotPk.length === wantPk.length && wantPk.every((c) => gotPk.includes(c))) earned += 2;
      else problems.push(gotPk.length ? `la clave primaria debería ser (${t.pk.join(', ')}) y tienes (${gotPk.join(', ')})` : `falta la clave primaria (${t.pk.join(', ')})`);

      for (const f of t.fks) {
        max += 2;
        const groups = new Map<string, { cols: string[]; rt: string; rcs: string[] }>();
        for (const r of fks.filter((x) => lc(x.t) === lc(rt))) {
          const g = groups.get(r.n) ?? { cols: [], rt: lc(r.rt), rcs: [] };
          g.cols.push(lc(r.c));
          g.rcs.push(lc(r.rc));
          groups.set(r.n, g);
        }
        const ok = [...groups.values()].some(
          (g) => g.rt === lc(f.ref) && g.cols.length === f.cols.length && f.cols.every((c, i) => g.cols[i] === lc(c) && g.rcs[i] === lc(f.refCols[i])),
        );
        if (ok) earned += 2;
        else problems.push(`falta la clave foránea (${f.cols.join(', ')}) → ${f.ref}(${f.refCols.join(', ')})`);
      }

      if (t.exact) {
        const extraCols = columns.filter((r) => lc(r.t) === lc(rt) && !t.cols.some((c) => lc(c.name) === lc(r.c)));
        for (const x of extraCols) {
          problems.push(`la columna «${x.c}» no debería existir`);
          extraPenalty += 1;
        }
      }
      if (problems.length) for (const p of problems) items.push({ ok: false, text: `Tabla «${t.name}»: ${p}.` });
      else items.push({ ok: true, text: `Tabla «${t.name}» correcta (columnas, tipos, restricciones y claves).` });
    }

    const extra = tables.filter((t) => !sol.tables.some((s) => lc(s.name) === lc(t)));
    let penalty = extraPenalty;
    for (const t of extra) {
      penalty += 1;
      items.push({ ok: false, text: `La tabla «${t}» no se pide en el enunciado.` });
    }

    return finish(earned, max, penalty, items);
  } finally {
    try {
      if (conn) {
        const [dbs] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES');
        for (const r of dbs) {
          const d = String(Object.values(r)[0]);
          if (d.startsWith(prefix)) await conn.query(`DROP DATABASE \`${d}\``);
        }
        await conn.end();
      }
    } catch {
      conn?.destroy();
    }
    release();
  }
}
