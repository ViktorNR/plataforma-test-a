import { toDdl } from './content/dsl';
import { formatSql } from './sqlformat';
import { candidateKeys, closure } from './grading/normalization';
import type { Exercise, Fd, NormProblem, PublicSolution, SchemaSol } from './types';

const fmtSchema = (s: SchemaSol) =>
  s.tables
    .map((t) => `${t.name}(${t.cols.map((c) => `${c.pk ? '*' : ''}${c.name}${c.fk ? ` → ${c.fk}` : ''}`).join(', ')})`)
    .join('\n');

/** Descomposición en 3FN por síntesis (cubrimiento mínimo): una solución válida, sin pérdida y con dependencias preservadas. */
function synthesize3nf(p: NormProblem): string {
  const single: Fd[] = p.fds.flatMap((f) => f.rhs.map((r) => ({ lhs: [...f.lhs], rhs: [r] })));
  // Atributos extraños en el lado izquierdo.
  for (const f of single) {
    for (const a of [...f.lhs]) {
      if (f.lhs.length > 1 && closure(f.lhs.filter((x) => x !== a), single).has(f.rhs[0])) f.lhs = f.lhs.filter((x) => x !== a);
    }
  }
  // Dependencias redundantes.
  const cover = [...single];
  for (let i = cover.length - 1; i >= 0; i--) {
    const rest = cover.filter((_, j) => j !== i);
    if (closure(cover[i].lhs, rest).has(cover[i].rhs[0])) cover.splice(i, 1);
  }
  const groups = new Map<string, { lhs: string[]; attrs: Set<string> }>();
  for (const f of cover) {
    const k = [...f.lhs].sort().join('|');
    const g = groups.get(k) ?? { lhs: f.lhs, attrs: new Set(f.lhs) };
    g.attrs.add(f.rhs[0]);
    groups.set(k, g);
  }
  let tables = [...groups.values()].map((g) => ({ pk: g.lhs, attrs: [...g.attrs] }));
  tables = tables.filter((t, i) => !tables.some((o, j) => j !== i && t.attrs.every((a) => o.attrs.includes(a)) && (o.attrs.length > t.attrs.length || j < i)));
  const keys = candidateKeys(p.attrs, p.fds);
  const key = keys[0] ?? p.attrs;
  if (!tables.some((t) => key.every((a) => t.attrs.includes(a)))) tables.push({ pk: key, attrs: [...key] });
  const covered = new Set(tables.flatMap((t) => t.attrs));
  for (const a of p.attrs) if (!covered.has(a)) tables[tables.length - 1].attrs.push(a);
  return tables.map((t, i) => `T${i + 1}(${t.attrs.map((a) => (t.pk.includes(a) ? `*${a}` : a)).join(', ')})`).join('\n');
}

/** Solución del ejercicio en formato apto para el navegador. Solo se entrega tras «Ver respuesta». */
export function solutionOf(ex: Exercise): PublicSolution {
  switch (ex.type) {
    case 'QUIZ':
      return { kind: 'quiz', answers: Object.fromEntries(ex.questions.map((q) => [q.id, { answer: q.answer, explanation: q.explanation }])) };
    case 'ER':
    case 'EER':
      return { kind: 'model', model: ex.solution };
    case 'TRANSFORMACION':
      return {
        kind: 'text',
        blocks: ex.options.map((o, i) => ({
          label: ex.options.length > 1 ? `Variante válida ${i + 1} (* = clave primaria, → = clave foránea)` : 'Esquema relacional (* = clave primaria, → = clave foránea)',
          code: fmtSchema(o),
        })),
      };
    case 'NORMALIZACION':
      return {
        kind: 'text',
        blocks: [
          { label: `Una descomposición válida en 3FN (sirve también para ${ex.problem.target === '2NF' ? '2FN' : '3FN'}). * = clave primaria`, code: synthesize3nf(ex.problem) },
        ],
      };
    case 'SQL_DDL':
      return { kind: 'text', blocks: [{ label: 'Script de referencia', code: toDdl(ex.solution), sql: true }] };
    case 'SQL_WORK':
      return {
        kind: 'text',
        blocks: [
          { label: 'Respuesta de referencia', code: formatSql(ex.work.reference), sql: true },
          ...(ex.work.tests?.length ? [{ label: 'Sentencias de prueba usadas en la corrección', code: ex.work.tests.map((t) => `${t};`).join('\n'), sql: true }] : []),
        ],
      };
  }
}
