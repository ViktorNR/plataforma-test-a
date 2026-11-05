import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { readTemplateSql } from './sqltemplates';

/* Utilidades compartidas por el corrector de ejercicios SQL y la práctica con «Ejecutar». */

export interface ResultSet {
  columns: string[];
  rows: (string | number | null)[][];
}
export interface ExecOutcome {
  sql: string;
  kind: 'rows' | 'ok' | 'error';
  sets: ResultSet[];
  affected?: number;
  message?: string;
  ms: number;
}

const host = () => ({
  host: process.env.SANDBOX_MYSQL_HOST ?? 'sandbox',
  port: Number(process.env.SANDBOX_MYSQL_PORT ?? 3306),
});

export const cell = (v: unknown): string | number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (Buffer.isBuffer(v)) return v.length > 64 ? `[binario ${v.length} bytes]` : v.toString('utf8');
  return JSON.stringify(v);
};

export const openRoot = () =>
  mysql.createConnection({ ...host(), user: 'root', password: process.env.SANDBOX_MYSQL_ROOT_PASSWORD, connectTimeout: 5000, multipleStatements: true });

export const openSandbox = async (database: string) => {
  const conn = await mysql.createConnection({
    ...host(),
    user: process.env.SANDBOX_MYSQL_USER ?? 'sandbox',
    password: process.env.SANDBOX_MYSQL_PASSWORD,
    database,
    connectTimeout: 5000,
    dateStrings: true,
    bigNumberStrings: true,
    supportBigNumbers: true,
    multipleStatements: false,
  });
  await conn.query('SET SESSION max_execution_time = 8000').catch(() => undefined);
  return conn;
};

/** Crea una copia limpia de una base de ejemplo con un nombre único (`sbx_<hex>_<id>`). */
export async function createScratch(templateId: string): Promise<{ name: string; prefix: string }> {
  const prefix = `sbx_${randomBytes(4).toString('hex')}_`;
  const name = prefix + templateId;
  const root = await openRoot();
  try {
    await root.query(`CREATE DATABASE \`${name}\``);
    await root.query(`USE \`${name}\`;\nSET FOREIGN_KEY_CHECKS=0;\n${readTemplateSql(templateId)}\nSET FOREIGN_KEY_CHECKS=1;`);
  } catch (e) {
    await root.query(`DROP DATABASE IF EXISTS \`${name}\``).catch(() => undefined);
    throw e;
  } finally {
    await root.end().catch(() => undefined);
  }
  return { name, prefix };
}

export async function dropDatabases(...names: string[]) {
  if (!names.length) return;
  const root = await openRoot().catch(() => null);
  if (!root) return;
  try {
    for (const n of names) await root.query(`DROP DATABASE IF EXISTS \`${n}\``).catch(() => undefined);
  } finally {
    await root.end().catch(() => undefined);
  }
}

/** Reescribe las referencias a la base lógica (`USE x`, `CREATE DATABASE x`, `x.tabla`) hacia la base real del intento. */
export function isolateDb(script: string, dbName: string, prefix: string) {
  const n = dbName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const real = `${prefix}${dbName}`;
  return script
    .replace(new RegExp(`(\\buse\\s+)\`?${n}\`?(?![\\w$])`, 'gi'), `$1\`${real}\``)
    .replace(new RegExp(`(?<![\\w$\`.])\`?${n}\`?(?=\\s*\\.\\s*[\`\\w])`, 'gi'), `\`${real}\``);
}

/** Ejecuta una sentencia y normaliza el resultado (conjuntos de filas o confirmación). */
export async function execStatement(conn: mysql.Connection, sql: string, timeout = 10000, prefix = ''): Promise<ExecOutcome> {
  const t0 = Date.now();
  const strip = (s: string) => (prefix ? s.split(prefix).join('') : s);
  try {
    const [res, fields] = (await conn.query({ sql, rowsAsArray: true, timeout })) as unknown as [unknown, mysql.FieldPacket[] | mysql.FieldPacket[][] | undefined];
    const ms = Date.now() - t0;
    const sets: ResultSet[] = [];
    const push = (rows: unknown[][], cols: mysql.FieldPacket[]) =>
      sets.push({ columns: cols.map((c) => strip(c.name)), rows: rows.map((r) => r.map((v) => cell(typeof v === 'string' ? strip(v) : v))) });
    const isSet = (x: unknown) => Array.isArray(x) && (x.length === 0 || Array.isArray(x[0]));
    if (Array.isArray(res) && isSet(res) && Array.isArray(fields) && fields.length && !Array.isArray((fields as unknown[])[0])) {
      push(res as unknown[][], fields as mysql.FieldPacket[]);
      return { sql, kind: 'rows', sets, ms };
    }
    if (Array.isArray(res) && Array.isArray(fields) && Array.isArray((fields as unknown[])[0] ?? null)) {
      (res as unknown[]).forEach((part, k) => {
        const f = (fields as unknown[])[k];
        if (Array.isArray(part) && Array.isArray(f)) push(part as unknown[][], f as mysql.FieldPacket[]);
      });
      return { sql, kind: sets.length ? 'rows' : 'ok', sets, ms };
    }
    return { sql, kind: 'ok', sets, affected: (res as { affectedRows?: number })?.affectedRows ?? 0, ms };
  } catch (e) {
    const err = e as { sqlMessage?: string; message?: string; code?: string };
    let msg = strip(String(err.sqlMessage ?? err.message ?? 'Error'));
    if (/timeout|PROTOCOL_SEQUENCE_TIMEOUT/i.test(msg + (err.code ?? ''))) msg = 'La consulta tardó demasiado y fue cancelada.';
    return { sql, kind: 'error', sets: [], message: msg, ms: Date.now() - t0 };
  }
}
