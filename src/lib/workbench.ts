import { createHmac } from 'node:crypto';
import mysql from 'mysql2/promise';
import { openRoot } from './sqlexec';
import { splitStatements } from './sqlsplit';
import { readTemplateSql, templateIds } from './sqltemplates';

/* Laboratorio MySQL: cada estudiante tiene un usuario propio que solo ve y modifica las bases
 * `sbx_u<id>_*`. El estudiante escribe nombres normales (`CREATE DATABASE tienda`) y aquí se traducen. */

export interface StatementResult {
  sql: string;
  kind: 'rows' | 'ok' | 'error' | 'skipped';
  columns?: string[];
  rows?: (string | number | null)[][];
  truncated?: boolean;
  total?: number;
  affected?: number;
  info?: string;
  message?: string;
  ms: number;
}
export interface RunResult {
  statements: StatementResult[];
  database: string | null;
  databases: string[];
}
export interface SchemaInfo {
  databases: string[];
  database: string | null;
  tables: { name: string; type: 'TABLA' | 'VISTA'; columns: { name: string; type: string; key: string }[] }[];
  routines: { name: string; type: 'PROCEDIMIENTO' | 'FUNCIÓN' }[];
}

const MAX_DBS = 14;
const MAX_STATEMENTS = 60;
const MAX_ROWS = 500;
const MAX_SCRIPT = 60_000;

const host = () => ({
  host: process.env.SANDBOX_MYSQL_HOST ?? 'sandbox',
  port: Number(process.env.SANDBOX_MYSQL_PORT ?? 3306),
});
const prefixOf = (uid: number) => `sbx_u${uid}_`;
const userOf = (uid: number) => `ws${uid}`;
const passOf = (uid: number) => createHmac('sha256', process.env.AUTH_SECRET ?? 'dev').update(`workbench:${uid}`).digest('hex').slice(0, 28);

const provisioned = new Set<number>();
async function ensureUser(uid: number) {
  if (provisioned.has(uid)) return;
  const root = await mysql.createConnection({ ...host(), user: 'root', password: process.env.SANDBOX_MYSQL_ROOT_PASSWORD, connectTimeout: 5000 });
  try {
    const u = `'${userOf(uid)}'@'%'`;
    await root.query(`CREATE USER IF NOT EXISTS ${u} IDENTIFIED BY '${passOf(uid)}' WITH MAX_USER_CONNECTIONS 3`);
    await root.query(`ALTER USER ${u} IDENTIFIED BY '${passOf(uid)}' WITH MAX_USER_CONNECTIONS 3`);
    // Sin EVENT, FILE, SUPER ni GRANT OPTION: solo lo necesario para practicar.
    await root.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EXECUTE, TRIGGER, CREATE TEMPORARY TABLES, LOCK TABLES ON \`sbx\\_u${uid}\\_%\`.* TO ${u}`,
    );
    provisioned.add(uid);
  } finally {
    await root.end().catch(() => undefined);
  }
}

async function open(uid: number) {
  await ensureUser(uid);
  const conn = await mysql.createConnection({
    ...host(),
    user: userOf(uid),
    password: passOf(uid),
    connectTimeout: 5000,
    dateStrings: true,
    bigNumberStrings: true,
    supportBigNumbers: true,
    multipleStatements: false,
  });
  await conn.query('SET SESSION max_execution_time = 8000').catch(() => undefined);
  return conn;
}

const strip = (s: string, prefix: string) => s.split(prefix).join('');

async function listDatabases(conn: mysql.Connection, prefix: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES');
  return rows.map((r) => String(Object.values(r)[0])).filter((d) => d.startsWith(prefix)).map((d) => d.slice(prefix.length)).sort();
}

const IDENT = '`?([A-Za-z0-9_$]{1,40})`?';

/** Traduce los nombres de bases de datos del estudiante a los nombres reales (con prefijo). */
function rewrite(sql: string, prefix: string, known: Set<string>): { sql: string; created?: string; error?: string } {
  let created: string | undefined;
  let error: string | undefined;
  let out = sql
    .replace(new RegExp(`(\\bcreate\\s+(?:database|schema)\\s+(?:if\\s+not\\s+exists\\s+))${IDENT}`, 'i'), (_m, a, name) => ((created = name), `${a}\`${prefix}${name}\``))
    .replace(new RegExp(`(\\bcreate\\s+(?:database|schema)\\s+)(?!if\\s)${IDENT}`, 'i'), (_m, a, name) => ((created = name), `${a}\`${prefix}${name}\``))
    .replace(new RegExp(`(\\b(?:drop|alter)\\s+(?:database|schema)\\s+(?:if\\s+exists\\s+)?)${IDENT}`, 'i'), (_m, a, name) => `${a}\`${prefix}${name}\``)
    .replace(new RegExp(`(^\\s*use\\s+)${IDENT}`, 'i'), (_m, a, name) => `${a}\`${prefix}${name}\``);
  // Referencias calificadas: base.tabla (solo para bases conocidas)
  const names = new Set([...known, ...(created ? [created] : [])]);
  for (const name of names) {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![\\w$\`.])\`?${n}\`?(?=\\s*\\.\\s*[\`\\w])`, 'gi'), `\`${prefix}${name}\``);
  }
  if (created && !/^[A-Za-z0-9_$]+$/.test(created)) error = 'Nombre de base de datos no válido.';
  return { sql: out, created, error };
}

const BLOCKED = /^\s*(create\s+user|alter\s+user|drop\s+user|rename\s+user|grant|revoke|set\s+(global|persist)|shutdown|install|uninstall|load\s+data|create\s+event|alter\s+event|create\s+server|flush|reset|kill|system|source)\b/i;

const cell = (v: unknown): string | number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (Buffer.isBuffer(v)) return v.length > 64 ? `[binario ${v.length} bytes]` : v.toString('utf8');
  return JSON.stringify(v);
};

function shortSql(s: string) {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > 140 ? one.slice(0, 137) + '…' : one;
}

export async function runScript(uid: number, script: string, database?: string): Promise<RunResult> {
  const prefix = prefixOf(uid);
  if (script.length > MAX_SCRIPT) throw new Error('El script es demasiado largo.');
  const statements = splitStatements(script);
  if (statements.length === 0) throw new Error('No hay sentencias para ejecutar.');
  if (statements.length > MAX_STATEMENTS) throw new Error(`Máximo ${MAX_STATEMENTS} sentencias por ejecución.`);

  const conn = await open(uid);
  const results: StatementResult[] = [];
  try {
    const known = new Set(await listDatabases(conn, prefix));
    if (database && known.has(database)) await conn.query(`USE \`${prefix}${database}\``);

    let failed = false;
    for (const raw of statements) {
      const t0 = Date.now();
      const label = shortSql(raw);
      if (failed) {
        results.push({ sql: label, kind: 'skipped', ms: 0, message: 'No se ejecutó porque una sentencia anterior falló.' });
        continue;
      }
      try {
        if (BLOCKED.test(raw)) throw new Error('Esa instrucción no está permitida en el laboratorio.');
        const rw = rewrite(raw, prefix, known);
        if (rw.error) throw new Error(rw.error);
        if (rw.created && !known.has(rw.created) && known.size >= MAX_DBS) throw new Error(`Puedes tener hasta ${MAX_DBS} bases de datos. Elimina alguna con DROP DATABASE.`);

        const [res, fields] = (await conn.query({ sql: rw.sql, rowsAsArray: true, timeout: 15000 })) as unknown as [unknown, mysql.FieldPacket[] | mysql.FieldPacket[][] | undefined];
        const ms = Date.now() - t0;

        if (rw.created) known.add(rw.created);
        const dropped = /^\s*drop\s+(database|schema)/i.exec(raw) && /^\s*drop\s+(?:database|schema)\s+(?:if\s+exists\s+)?`?([A-Za-z0-9_$]+)/i.exec(raw);
        if (dropped) known.delete(dropped[1]);

        const pushSet = (rows: unknown[][], cols: mysql.FieldPacket[]) => {
          const total = rows.length;
          results.push({
            sql: label,
            kind: 'rows',
            columns: cols.map((c) => strip(c.name, prefix)),
            rows: rows.slice(0, MAX_ROWS).map((r) => r.map((v) => cell(typeof v === 'string' ? strip(v, prefix) : v))),
            truncated: total > MAX_ROWS,
            total,
            ms,
          });
        };

        const isSet = (x: unknown) => Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));
        if (Array.isArray(res) && isSet(res) && fields && Array.isArray(fields) && fields.length && !Array.isArray((fields as unknown[])[0])) {
          pushSet(res as unknown[][], fields as mysql.FieldPacket[]);
        } else if (Array.isArray(res) && Array.isArray(fields) && Array.isArray((fields as unknown[])[0] ?? null)) {
          // CALL con varios conjuntos de resultados
          (res as unknown[]).forEach((part, k) => {
            const f = (fields as unknown[])[k];
            if (Array.isArray(part) && Array.isArray(f)) pushSet(part as unknown[][], f as mysql.FieldPacket[]);
          });
          const last = (res as unknown[])[(res as unknown[]).length - 1] as { affectedRows?: number } | undefined;
          if (last && !Array.isArray(last)) results.push({ sql: label, kind: 'ok', affected: last.affectedRows ?? 0, ms });
        } else {
          const ok = res as { affectedRows?: number; info?: string; warningStatus?: number };
          results.push({ sql: label, kind: 'ok', affected: ok?.affectedRows ?? 0, info: ok?.info ? strip(String(ok.info), prefix) : undefined, ms });
        }
      } catch (e) {
        failed = true;
        const err = e as { sqlMessage?: string; message?: string; code?: string };
        let msg = strip(String(err.sqlMessage ?? err.message ?? 'Error'), prefix);
        if (err.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || /timeout/i.test(msg)) msg = 'La consulta tardó demasiado y fue cancelada (límite 15 s).';
        if (/command denied/i.test(msg) || /Access denied/i.test(msg)) msg += ' — En el laboratorio solo puedes trabajar con tus propias bases de datos.';
        results.push({ sql: label, kind: 'error', message: msg, ms: Date.now() - t0 });
      }
    }

    let current: string | null = null;
    try {
      const [r] = await conn.query<mysql.RowDataPacket[]>('SELECT DATABASE() AS d');
      const d = r[0]?.d as string | null;
      current = d && d.startsWith(prefix) ? d.slice(prefix.length) : null;
    } catch {
      /* ignora */
    }
    return { statements: results, database: current, databases: await listDatabases(conn, prefix) };
  } finally {
    await conn.end().catch(() => conn.destroy());
  }
}

export async function getSchema(uid: number, database?: string): Promise<SchemaInfo> {
  const prefix = prefixOf(uid);
  const conn = await open(uid);
  try {
    const databases = await listDatabases(conn, prefix);
    const db = database && databases.includes(database) ? database : (databases[0] ?? null);
    const info: SchemaInfo = { databases, database: db, tables: [], routines: [] };
    if (!db) return info;
    const real = prefix + db;
    const [tbl] = await conn.query<mysql.RowDataPacket[]>('SELECT TABLE_NAME AS n, TABLE_TYPE AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [real]);
    const [col] = await conn.query<mysql.RowDataPacket[]>('SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ty, COLUMN_KEY AS k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION', [real]);
    info.tables = tbl.map((t) => ({
      name: String(t.n),
      type: t.t === 'VIEW' ? 'VISTA' : 'TABLA',
      columns: col.filter((c) => c.t === t.n).map((c) => ({ name: String(c.c), type: String(c.ty), key: String(c.k) })),
    }));
    const [rt] = await conn.query<mysql.RowDataPacket[]>('SELECT ROUTINE_NAME AS n, ROUTINE_TYPE AS t FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? ORDER BY ROUTINE_NAME', [real]);
    info.routines = rt.map((r) => ({ name: String(r.n), type: r.t === 'PROCEDURE' ? 'PROCEDIMIENTO' : 'FUNCIÓN' }));
    return info;
  } finally {
    await conn.end().catch(() => conn.destroy());
  }
}

/** Copia una base de ejemplo al espacio del estudiante (reemplaza la que ya tenga con el mismo nombre). */
export async function loadTemplate(uid: number, id: string) {
  if (!templateIds.has(id)) throw new Error('Base de ejemplo desconocida.');
  await ensureUser(uid);
  const prefix = prefixOf(uid);
  const real = prefix + id;
  const conn = await open(uid);
  try {
    const dbs = await listDatabases(conn, prefix);
    if (!dbs.includes(id) && dbs.length >= MAX_DBS) throw new Error(`Puedes tener hasta ${MAX_DBS} bases de datos. Elimina alguna con DROP DATABASE y vuelve a intentar.`);
  } finally {
    await conn.end().catch(() => conn.destroy());
  }
  const root = await openRoot();
  try {
    await root.query(`DROP DATABASE IF EXISTS \`${real}\``);
    await root.query(`CREATE DATABASE \`${real}\``);
    await root.query(`USE \`${real}\`;\nSET FOREIGN_KEY_CHECKS=0;\n${readTemplateSql(id)}\nSET FOREIGN_KEY_CHECKS=1;`);
  } finally {
    await root.end().catch(() => undefined);
  }
}

export async function resetWorkspace(uid: number) {
  const prefix = prefixOf(uid);
  const conn = await open(uid);
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SHOW DATABASES');
    for (const r of rows) {
      const d = String(Object.values(r)[0]);
      if (d.startsWith(prefix)) await conn.query(`DROP DATABASE \`${d}\``);
    }
  } finally {
    await conn.end().catch(() => conn.destroy());
  }
}
