import { splitStatements } from './sqlsplit';

/**
 * Da formato legible (una cláusula por línea e indentación) a sentencias SELECT/INSERT/UPDATE/DELETE/CREATE VIEW.
 * Si el texto tiene comentarios, DELIMITER o bloques BEGIN…END se devuelve sin cambios.
 */
const TOK = /('(?:[^'\\]|\\[\s\S]|'')*'|"(?:[^"\\]|\\[\s\S])*"|`[^`\n]*`)|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_*][A-Za-z0-9_$]*)*(?:\.\*)?)|(<=>|<=|>=|<>|!=|:=|[\s\S])/g;

const NO_BREAK_FN = new Set(['IN', 'AS', 'VALUES', 'ON', 'AND', 'OR', 'NOT', 'EXISTS', 'SELECT', 'WHEN', 'THEN', 'ELSE', 'WHERE', 'BY', 'SET', 'FROM', 'ANY', 'ALL', 'SOME', 'LIKE', 'BETWEEN', 'USING', 'JOIN', 'UNION', 'INTERSECT', 'EXCEPT', 'HAVING', 'TABLE', 'INTO']);
const JOIN_MOD = new Set(['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'NATURAL', 'OUTER']);
const SETOPS = new Set(['UNION', 'INTERSECT', 'EXCEPT']);

function formatOne(sql: string): string {
  const toks: string[] = [];
  TOK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOK.exec(sql))) if (!/^\s+$/.test(m[0])) toks.push(m[0]);
  if (!toks.length) return sql.trim();

  const lines: string[] = [];
  let cur = '';
  let curLevel = 0;
  const flush = () => {
    if (cur.trim()) lines.push('  '.repeat(curLevel) + cur.trim());
    cur = '';
  };
  const nl = (level: number) => {
    flush();
    curLevel = level;
  };
  const emit = (t: string, prev?: string) => {
    const p = prev ?? '';
    const noSpace = !cur || t === ',' || t === ')' || t === ';' || t === '.' || p === '(' || p === '.' || (t === '(' && p && /^[A-Za-z_][\w$]*$/.test(p) && !NO_BREAK_FN.has(p.toUpperCase()));
    cur += (noSpace ? '' : ' ') + t;
  };

  type Ctx = { sub: boolean; base: number; mode: string; between: boolean };
  const stack: Ctx[] = [{ sub: true, base: 0, mode: '', between: false }];
  const top = () => stack[stack.length - 1];
  let prev = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const up = t.toUpperCase();
    const ctx = top();
    const inline = !ctx.sub;
    const next = (toks[i + 1] ?? '').toUpperCase();
    const prevUp = prev.toUpperCase();

    if (t === '(') {
      const sub = next === 'SELECT';
      emit(t, prev);
      stack.push({ sub, base: sub ? ctx.base + 1 : ctx.base, mode: '', between: false });
      if (sub) nl(ctx.base + 1);
    } else if (t === ')') {
      const c = stack.length > 1 ? stack.pop()! : ctx;
      if (c.sub) nl(c.base - 1);
      emit(t, prev);
    } else if (inline) {
      emit(t, prev);
    } else {
      const b = ctx.base;
      if (up === 'SELECT') {
        if (cur.trim() && prevUp !== 'ALL') nl(b);
        emit(t, prev);
        if (next === 'DISTINCT' || next === 'ALL') {
          emit(toks[++i], t);
        }
        ctx.mode = 'select';
        nl(b + 1);
      } else if (up === 'FROM' && prevUp !== 'DELETE') {
        nl(b);
        emit(t, prev);
        ctx.mode = 'from';
      } else if (up === 'JOIN' || (JOIN_MOD.has(up) && !JOIN_MOD.has(prevUp))) {
        if (!(up === 'JOIN' && JOIN_MOD.has(prevUp))) nl(b);
        emit(t, prev);
        ctx.mode = 'from';
      } else if (up === 'ON' && ctx.mode === 'from') {
        nl(b + 1);
        emit(t, prev);
        ctx.mode = 'cond';
      } else if (up === 'WHERE' || up === 'HAVING') {
        nl(b);
        emit(t, prev);
        ctx.mode = 'cond';
      } else if ((up === 'GROUP' || up === 'ORDER') && next === 'BY') {
        nl(b);
        emit(t, prev);
        ctx.mode = 'by';
      } else if (up === 'LIMIT') {
        nl(b);
        emit(t, prev);
      } else if (SETOPS.has(up)) {
        nl(b);
        emit(t, prev);
        if (next === 'ALL') emit(toks[++i], t);
        nl(b);
      } else if (up === 'SET' && ctx.mode !== 'cond') {
        nl(b);
        emit(t, prev);
        ctx.mode = 'set';
        nl(b + 1);
      } else if (up === 'VALUES' || up === 'VALUE') {
        nl(b);
        emit(t, prev);
        ctx.mode = 'values';
        nl(b + 1);
      } else if (up === 'AS' && next === 'SELECT') {
        emit(t, prev);
      } else if (t === ',' && (ctx.mode === 'select' || ctx.mode === 'set' || ctx.mode === 'values')) {
        emit(t, prev);
        nl(b + 1);
      } else if (up === 'BETWEEN') {
        ctx.between = true;
        emit(t, prev);
      } else if ((up === 'AND' || up === 'OR') && ctx.mode === 'cond') {
        if (up === 'AND' && ctx.between) {
          ctx.between = false;
          emit(t, prev);
        } else {
          nl(b + 1);
          emit(t, prev);
        }
      } else {
        emit(t, prev);
      }
    }
    prev = t;
  }
  flush();
  return lines.join('\n');
}

export function formatSql(script: string): string {
  if (/--|\/\*|#|\bDELIMITER\b|\bBEGIN\b/i.test(script)) return script.trim();
  const stmts = splitStatements(script);
  if (!stmts.length) return script.trim();
  return stmts.map((s) => formatOne(s) + ';').join('\n\n');
}
