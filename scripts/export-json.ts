// Exporta ejercicios con su solución a JSON: `npx tsx scripts/export-json.ts <carpeta> <semana> [semana…]`
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXERCISES } from '../src/lib/content/catalog';
import { WEEKS } from '../src/lib/content/weeks';
import { toFlow } from '../src/lib/er-layout';

const [out, ...ws] = process.argv.slice(2);
const weeks = ws.map(Number);
const SOL_KEY = { QUIZ: 'questions', ER: 'solution', EER: 'solution', TRANSFORMACION: 'options', NORMALIZACION: 'problem', SQL_DDL: 'solution', SQL_WORK: 'work' } as const;

mkdirSync(out, { recursive: true });
const index: unknown[] = [];
for (const w of weeks) {
  const dir = `${out}/semana-${w}`;
  mkdirSync(dir, { recursive: true });
  const info = WEEKS.find((x) => x.n === w);
  const list = EXERCISES.filter((e) => e.week === w).map((e, i) => {
    const raw = e as unknown as Record<string, unknown>;
    const base = { numero: i + 1, slug: e.slug, semana: e.week, tipo: e.type, titulo: e.title, enunciado: e.statement };
    if (e.type === 'QUIZ') {
      return {
        ...base,
        preguntas: e.questions.map((q) => ({ id: q.id, pregunta: q.text, alternativas: q.options, respuestaCorrecta: q.answer, respuestaCorrectaTexto: q.options[q.answer], explicacion: q.explanation })),
      };
    }
    return { ...base, [SOL_KEY[e.type]]: raw[SOL_KEY[e.type]], ...(raw.model ? { modelo: raw.model } : {}) };
  });
  // Diagramas listos para «Importar» en el lienzo (mismo formato que «Guardar archivo (.json)»).
  const dirL = `${out}/importar-lienzo/semana-${w}`;
  EXERCISES.filter((e) => e.week === w).forEach((e, i) => {
    if (e.type !== 'ER' && e.type !== 'EER') return;
    mkdirSync(dirL, { recursive: true });
    const { nodes, edges } = toFlow(e.solution);
    const file = { nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map((x) => ({ id: x.id, source: x.source, target: x.target, type: 'floating', data: x.data ?? {} })) };
    writeFileSync(`${dirL}/${String(i + 1).padStart(2, '0')}-${e.slug}.json`, JSON.stringify(file, null, 2) + '\n', 'utf8');
  });
  for (const ex of list) writeFileSync(`${dir}/${String(ex.numero).padStart(2, '0')}-${ex.slug}.json`, JSON.stringify(ex, null, 2) + '\n', 'utf8');
  writeFileSync(`${out}/semana-${w}.json`, JSON.stringify({ semana: w, titulo: info?.title, ejercicios: list }, null, 2) + '\n', 'utf8');
  index.push({ semana: w, titulo: info?.title, ejercicios: list.length, archivo: `semana-${w}.json`, carpeta: `semana-${w}/` });
}
writeFileSync(`${out}/indice.json`, JSON.stringify({ generado: new Date().toISOString(), semanas: index }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(index));