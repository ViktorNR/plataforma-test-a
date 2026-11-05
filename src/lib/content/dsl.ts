import type { ErAttr, ErEntity, ErModel, ErRel, ErSpec, Exercise, Fd, QuizQ, SqlCol, SqlSol, SqlTable, SqlWorkSpec } from '../types';

/* ============================== E/R ============================== */

const splitTop = (s: string) => {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim());
};

/**
 * Atributo: prefijos `*` clave, `^` clave parcial, `+` multivaluado, `~` derivado;
 * alias con `|`; compuesto con paréntesis: `direccion(calle,numero,comuna)`.
 */
export function A(spec: string): ErAttr {
  let s = spec.trim();
  const a: ErAttr = { name: '' };
  while (s && '*^+~'.includes(s[0])) {
    if (s[0] === '*') a.key = true;
    if (s[0] === '^') a.partialKey = true;
    if (s[0] === '+') a.multi = true;
    if (s[0] === '~') a.derived = true;
    s = s.slice(1);
  }
  const p = s.indexOf('(');
  if (p >= 0 && s.endsWith(')')) {
    a.parts = splitTop(s.slice(p + 1, -1)).map(A);
    s = s.slice(0, p);
  }
  const [name, ...aliases] = s.split('|').map((x) => x.trim());
  a.name = name;
  if (aliases.length) a.aliases = aliases;
  return a;
}

/** Entidad: `!Nombre|alias` (el `!` indica entidad débil). */
export function E(name: string, attrs: string[]): ErEntity {
  const weak = name.startsWith('!');
  const [n, ...aliases] = (weak ? name.slice(1) : name).split('|');
  return { name: n.trim(), ...(aliases.length ? { aliases } : {}), ...(weak ? { weak: true } : {}), attrs: attrs.map(A) };
}

/**
 * Relación: `R('nombre', ['Cliente:1', 'Pedido:N'], ['fecha'])`.
 * Cada extremo es `Entidad:máx` o `Entidad:mínmáx` (p. ej. `Libro:1N`, `Autor:0N`), con M = N.
 * Notación «look across»: el valor junto a una entidad es cuántas ocurrencias de ella se asocian con UNA de la otra.
 * El prefijo `!` en el nombre marca una relación identificadora.
 */
export function R(name: string, ends: string[], attrs: string[] = []): ErRel {
  const identifying = name.startsWith('!');
  return {
    name: identifying ? name.slice(1) : name,
    ...(identifying ? { identifying: true } : {}),
    between: ends.map((e) => {
      const i = e.lastIndexOf(':');
      const entity = e.slice(0, i);
      const code = e.slice(i + 1).toUpperCase().replace('M', 'N');
      return code.length === 2
        ? { entity, card: code[1] as '1' | 'N', min: Number(code[0]) as 0 | 1 }
        : { entity, card: code as '1' | 'N' };
    }),
    ...(attrs.length ? { attrs: attrs.map(A) } : {}),
  };
}

/** Especialización: `S('Persona', ['Estudiante','Funcionario'], 'd', 'p')` (d/o = disyunta/solapada, t/p = total/parcial). */
export function S(parent: string, children: string[], kind: 'd' | 'o', part: 't' | 'p'): ErSpec {
  return { parent, children, disjoint: kind === 'd', total: part === 't' };
}

export function M(entities: ErEntity[], relationships: ErRel[], specializations: ErSpec[] = [], layout?: (string | null)[][]): ErModel {
  return { entities, relationships, ...(specializations.length ? { specializations } : {}), ...(layout ? { layout } : {}) };
}

/* ============================ Ejercicios ============================ */

export const er = (slug: string, week: number, title: string, statement: string[], solution: ErModel, type: 'ER' | 'EER' = 'ER'): Exercise => ({
  slug,
  week,
  type,
  title,
  statement,
  solution,
});

/* ============================ Cuestionarios ============================ */

export const Q = (text: string, options: string[], answer: number, explanation: string): Omit<QuizQ, 'id'> => ({ text, options, answer, explanation });

export const quiz = (slug: string, title: string, intro: string, qs: Omit<QuizQ, 'id'>[], week = 1): Exercise => ({
  slug,
  week,
  type: 'QUIZ',
  title,
  statement: [intro],
  questions: qs.map((q, i) => ({ id: `q${i + 1}`, ...q })),
});

/* ============================ Normalización ============================ */

/** `fd('a,b -> c,d')` */
export const fd = (s: string): Fd => {
  const [l, r] = s.split('->');
  return { lhs: l.split(',').map((x) => x.trim()), rhs: r.split(',').map((x) => x.trim()) };
};

export const norm = (slug: string, title: string, statement: string[], attrs: string[], fds: string[], target: '2NF' | '3NF'): Exercise => ({
  slug,
  week: 5,
  type: 'NORMALIZACION',
  title,
  statement,
  problem: { attrs, fds: fds.map(fd), target },
});

/* ================================ SQL ================================ */

/**
 * Columna: `'nombre str80 nn'`, `'id int pk ai'`, `'email str u'`, `'fecha date'`, `'nota dec'`,
 * `'tipo enum(Contrata,Honorario)'`. Banderas: pk, nn (NOT NULL), u (UNIQUE), ai (AUTO_INCREMENT).
 */
function parseCol(spec: string): { col: SqlCol; pk: boolean } {
  const m = spec.trim().match(/^(\w+)\s+(int|str\d*|dec|datetime|date|enum\([^)]*\))\s*(.*)$/i);
  if (!m) throw new Error(`Columna inválida: ${spec}`);
  const [, name, type, flags] = m;
  const f = new Set(flags.split(/\s+/).filter(Boolean));
  let col: SqlCol;
  if (/^int$/i.test(type)) col = { name, type: 'int' };
  else if (/^str/i.test(type)) col = { name, type: 'string', ...(type.length > 3 ? { size: Number(type.slice(3)) } : {}) };
  else if (/^dec$/i.test(type)) col = { name, type: 'decimal' };
  else if (/^date/i.test(type)) col = { name, type: 'date' };
  else col = { name, type: 'enum', values: type.slice(5, -1).split(',').map((v) => v.trim()) };
  if (f.has('nn')) col.notNull = true;
  if (f.has('u')) col.unique = true;
  if (f.has('ai')) col.autoInc = true;
  return { col, pk: f.has('pk') };
}

/** Tabla: `T('cliente', ['id int pk ai', 'nombre str80 nn'], ['id_x>otra.id'], { exact: true })`. */
export function T(name: string, cols: string[], fks: string[] = [], opts: { exact?: boolean } = {}): SqlTable {
  const parsed = cols.map(parseCol);
  return {
    name,
    cols: parsed.map((p) => p.col),
    pk: parsed.filter((p) => p.pk).map((p) => p.col.name),
    fks: fks.map((f) => {
      const [l, r] = f.split('>');
      const [ref, refCols] = r.split('.');
      return { cols: l.split(','), ref, refCols: refCols.split(',') };
    }),
    ...(opts.exact ? { exact: true } : {}),
  };
}

const typeText = (c: SqlCol) =>
  c.type === 'int'
    ? 'entero'
    : c.type === 'string'
      ? `texto${c.size ? ` de hasta ${c.size} caracteres` : ''}`
      : c.type === 'decimal'
        ? 'decimal'
        : c.type === 'date'
          ? 'fecha'
          : `lista de valores (${(c.values ?? []).join(', ')})`;

/** Redacta automáticamente la descripción de las tablas a partir de la solución. */
export function describeTables(sol: SqlSol): string[] {
  return sol.tables.map((t) => {
    const parts = t.cols.map((c) => {
      const f: string[] = [typeText(c)];
      if (t.pk.length === 1 && t.pk[0] === c.name) f.push('clave primaria');
      if (c.autoInc) f.push('autoincremental');
      if (c.notNull && !(t.pk.includes(c.name))) f.push('obligatorio');
      if (c.unique) f.push('único');
      const fk = t.fks.find((k) => k.cols.length === 1 && k.cols[0] === c.name);
      if (fk) f.push(`clave foránea hacia ${fk.ref}(${fk.refCols[0]})`);
      return `${c.name} (${f.join(', ')})`;
    });
    const extra: string[] = [];
    if (t.pk.length > 1) extra.push(`La clave primaria es compuesta: (${t.pk.join(', ')}).`);
    for (const k of t.fks.filter((x) => x.cols.length > 1)) extra.push(`Clave foránea compuesta (${k.cols.join(', ')}) hacia ${k.ref}(${k.refCols.join(', ')}).`);
    return `\`${t.name}\`: ${parts.join('; ')}.${extra.length ? ' ' + extra.join(' ') : ''}`;
  });
}

export function sql(slug: string, title: string, db: string, intro: string[], tables: SqlTable[], outro: string[] = []): Exercise {
  const solution: SqlSol = { db, tables };
  return {
    slug,
    week: 7,
    type: 'SQL_DDL',
    title,
    statement: [
      ...intro,
      `Escribe un script MySQL que cree la base de datos \`${db}\` con las siguientes tablas:`,
      ...describeTables(solution),
      ...outro,
      `Recuerda usar \`USE ${db};\` antes de crear las tablas y crear primero las tablas referenciadas por claves foráneas.`,
    ],
    solution,
  };
}

/* ===================== Consultas, DML y rutinas (semanas 7 a 13) ===================== */

const work = (slug: string, week: number, title: string, statement: string[], w: SqlWorkSpec): Exercise => ({
  slug,
  week,
  type: 'SQL_WORK',
  title,
  statement,
  work: w,
});

/** Consulta SELECT: se corrige comparando el resultado con el de `reference`. `ordered` solo si el enunciado pide un orden. */
export const sqlQ = (slug: string, week: number, title: string, db: string, statement: string[], reference: string, opts: { ordered?: boolean } = {}): Exercise =>
  work(slug, week, title, statement, { kind: 'query', db, reference, ordered: opts.ordered });

/** DML/DDL (INSERT, UPDATE, DELETE, ALTER…): se corrige comparando el estado final de `tables` tras ejecutar la respuesta y `reference`. */
export const sqlDml = (slug: string, week: number, title: string, db: string, statement: string[], reference: string, tables: string[]): Exercise =>
  work(slug, week, title, statement, { kind: 'dml', db, reference, tables });

/** Vista, procedimiento o función: tras ejecutar la respuesta se ejecutan `tests` y se compara su salida (y `tables` si se indica). */
export const sqlRoutine = (slug: string, week: number, title: string, db: string, statement: string[], reference: string, tests: string[], tables?: string[]): Exercise =>
  work(slug, week, title, statement, { kind: 'routine', db, reference, tests, tables });

/** Genera el script DDL de referencia a partir de la solución (para autopruebas). */
export function toDdl(sol: SqlSol): string {
  const typeSql = (c: SqlCol) =>
    c.type === 'int' ? 'INT' : c.type === 'string' ? `VARCHAR(${c.size ?? 50})` : c.type === 'decimal' ? 'DECIMAL(10,2)' : c.type === 'date' ? 'DATE' : `ENUM(${(c.values ?? []).map((v) => `'${v}'`).join(',')})`;
  const lines = [`CREATE DATABASE ${sol.db};`, `USE ${sol.db};`];
  // Orden: tablas sin FK primero (orden topológico simple).
  const done = new Set<string>();
  const pending = [...sol.tables];
  while (pending.length) {
    const i = pending.findIndex((t) => t.fks.every((f) => f.ref === t.name || done.has(f.ref)));
    const t = pending.splice(i < 0 ? 0 : i, 1)[0];
    done.add(t.name);
    const cols = t.cols.map((c) => `  ${c.name} ${typeSql(c)}${c.notNull ? ' NOT NULL' : ''}${c.unique ? ' UNIQUE' : ''}${c.autoInc ? ' AUTO_INCREMENT' : ''}`);
    if (t.pk.length) cols.push(`  PRIMARY KEY (${t.pk.join(', ')})`);
    for (const f of t.fks) cols.push(`  FOREIGN KEY (${f.cols.join(', ')}) REFERENCES ${f.ref}(${f.refCols.join(', ')})`);
    lines.push(`CREATE TABLE ${t.name} (\n${cols.join(',\n')}\n);`);
  }
  return lines.join('\n');
}
