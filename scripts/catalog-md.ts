// Genera docs/CATALOGO.md a partir del contenido real: `npx tsx scripts/catalog-md.ts > docs/CATALOGO.md`
import { EXERCISES } from '../src/lib/content/catalog';
import { WEEKS } from '../src/lib/content/weeks';

const TYPE: Record<string, string> = {
  QUIZ: 'Cuestionario',
  ER: 'Modelo E/R',
  EER: 'E/R extendido',
  TRANSFORMACION: 'Transformación E/R → relacional',
  NORMALIZACION: 'Normalización',
  SQL_DDL: 'SQL DDL (MySQL)',
};
const WORK: Record<string, string> = { query: 'Consulta SQL', dml: 'DML / ALTER', routine: 'Vista / procedimiento / función / trigger' };
const label = (e: (typeof EXERCISES)[number]) => (e.type === 'SQL_WORK' ? `${WORK[e.work.kind]} · \`${e.work.db}\`` : TYPE[e.type]);

const lines: string[] = ['# Catálogo de ejercicios', '', `_Generado automáticamente con \`scripts/catalog-md.ts\`. Total: ${EXERCISES.length} ejercicios._`, ''];
for (const w of WEEKS) {
  const list = EXERCISES.filter((e) => e.week === w.n);
  lines.push(`## Semana ${w.n} — ${w.title} (${list.length})`, '', `Indicadores: ${w.indicators}`, '', '| # | Slug | Título | Tipo |', '|---|---|---|---|');
  list.forEach((e, i) => lines.push(`| ${i + 1} | \`${e.slug}\` | ${e.title} | ${label(e)} |`));
  lines.push('');
}
console.log(lines.join('\n'));
