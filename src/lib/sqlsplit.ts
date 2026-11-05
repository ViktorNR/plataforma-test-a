/**
 * Divide un script SQL en sentencias, como lo hace MySQL Workbench:
 * - soporta `DELIMITER` (para procedimientos, funciones y triggers),
 * - respeta cadenas, identificadores entre comillas y comentarios (de línea y de bloque),
 * - si no hay DELIMITER, mantiene unido el cuerpo BEGIN … END de CREATE PROCEDURE/FUNCTION/TRIGGER.
 */
export function splitStatements(script: string): string[] {
  const out: string[] = [];
  const n = script.length;
  let delim = ';';
  let buf = '';
  let i = 0;
  let lineStart = true;
  let depth = 0;
  let prevWord = '';
  let routine: boolean | null = null; // null = aún no se sabe

  const flush = () => {
    const t = buf.trim();
    if (t) out.push(t);
    buf = '';
    depth = 0;
    prevWord = '';
    routine = null;
  };

  while (i < n) {
    if (lineStart && buf.trim() === '') {
      const m = /^[ \t]*delimiter[ \t]+(\S+)[ \t]*(?:\r?\n|$)/i.exec(script.slice(i, i + 120));
      if (m) {
        delim = m[1];
        i += m[0].length;
        continue;
      }
    }
    const ch = script[i];

    // Comentarios
    if (ch === '-' && script[i + 1] === '-' && (i + 2 >= n || /\s/.test(script[i + 2]))) {
      while (i < n && script[i] !== '\n') i++;
      continue;
    }
    if (ch === '#') {
      while (i < n && script[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && script[i + 1] === '*') {
      const end = script.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      buf += ' ';
      continue;
    }

    // Cadenas e identificadores
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (script[j] === '\\' && ch !== '`') j += 2;
        else if (script[j] === ch && script[j + 1] === ch) j += 2;
        else if (script[j] === ch) break;
        else j++;
      }
      buf += script.slice(i, j + 1);
      i = j + 1;
      lineStart = false;
      continue;
    }

    // Delimitador
    if (script.startsWith(delim, i) && !(delim === ';' && depth > 0)) {
      flush();
      i += delim.length;
      lineStart = false;
      continue;
    }

    // Seguimiento de BEGIN … END cuando se usa `;` como delimitador
    if (delim === ';' && /[A-Za-z_]/.test(ch) && !/[A-Za-z0-9_$]/.test(script[i - 1] ?? ' ')) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(script[j])) j++;
      const w = script.slice(i, j).toLowerCase();
      if (routine === null && buf.trim().split(/\s+/).length >= 3) routine = /^create\s+(or\s+replace\s+)?(definer\s*=\s*\S+\s+)?(procedure|function|trigger|event)\b/i.test(buf.trim());
      if (routine) {
        const rest = script.slice(j, j + 40);
        const nextIsParen = /^\s*\(/.test(rest);
        if (w === 'begin' || w === 'case') depth++;
        else if (w === 'if' && prevWord !== 'end' && !nextIsParen && !/^\s*(not\s+)?exists\b/i.test(rest)) depth++;
        else if ((w === 'while' || w === 'loop' || w === 'repeat') && prevWord !== 'end' && !nextIsParen) depth++;
        else if (w === 'end') depth = Math.max(0, depth - 1);
      }
      prevWord = w;
      buf += script.slice(i, j);
      i = j;
      lineStart = false;
      continue;
    }

    if (!/\s/.test(ch)) prevWord = ''; // `;` u otro símbolo corta la adyacencia "END IF"
    buf += ch;
    i++;
    lineStart = ch === '\n';
  }
  flush();
  return out;
}
