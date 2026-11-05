import { readFileSync } from 'node:fs';
import path from 'node:path';
import { splitStatements } from '../sqlsplit';
import type { TableInfo } from '../types';

export { TEMPLATES, templateIds, type TemplateMeta } from './meta';
import { templateIds } from './meta';

const cache = new Map<string, string>();
export function readTemplateSql(id: string): string {
  if (!templateIds.has(id)) throw new Error(`Base de ejemplo desconocida: ${id}`);
  let s = cache.get(id);
  if (!s) {
    s = readFileSync(path.join(process.cwd(), 'src/lib/sqltemplates', `${id}.sql`), 'utf8');
    cache.set(id, s);
  }
  return s;
}

export type { TableInfo };

/** Resume las tablas de una plantilla (para mostrar el esquema en los ejercicios). */
export function schemaOf(id: string): TableInfo[] {
  const out: TableInfo[] = [];
  for (const st of splitStatements(readTemplateSql(id))) {
    const m = /^create\s+table\s+`?(\w+)`?\s*\(([\s\S]*)\)\s*(?:engine.*)?$/i.exec(st);
    if (!m) continue;
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of m[2]) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(cur);
        cur = '';
      } else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    const cols: TableInfo['columns'] = [];
    const pk = new Set<string>();
    const fks = new Map<string, string>();
    for (const raw of parts) {
      const p = raw.trim();
      let k: RegExpExecArray | null;
      if ((k = /^primary\s+key\s*\(([^)]*)\)/i.exec(p))) k[1].split(',').forEach((c) => pk.add(c.trim().replace(/`/g, '').toLowerCase()));
      else if ((k = /^(?:constraint\s+\w+\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+`?(\w+)`?/i.exec(p))) k[1].split(',').forEach((c) => fks.set(c.trim().replace(/`/g, '').toLowerCase(), k![2]));
      else {
        const c = /^`?(\w+)`?\s+([A-Za-z]+(?:\([^)]*\))?)/.exec(p);
        if (c) {
          cols.push({ name: c[1], type: c[2].toUpperCase(), pk: /primary\s+key/i.test(p) });
          if (/primary\s+key/i.test(p)) pk.add(c[1].toLowerCase());
        }
      }
    }
    out.push({ name: m[1], columns: cols.map((c) => ({ ...c, pk: pk.has(c.name.toLowerCase()), fk: fks.get(c.name.toLowerCase()) })) });
  }
  return out;
}
