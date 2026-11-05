import type { Exercise } from '../types';
import { MODELING } from './modeling';
import { QUIZZES } from './quizzes';
import { NORM_SQL } from './sqlnorm';
import { W1_NEW, W1_ORDER } from './w1';
import { W10 } from './w10';
import { W11 } from './w11';
import { W2 } from './w2';
import { W3 } from './w3';
import { W4_NEW } from './w4';
import { W5_NEW } from './w5';
import { W6_QUIZ } from './w6';
import { W7_DDL_NEW } from './w7ddl';
import { W7_DML } from './w7dml';
import { W8 } from './w8';
import { W9 } from './w9';

const bySlug = (pool: Exercise[], slugs: string[]) =>
  slugs.map((s) => {
    const ex = pool.find((e) => e.slug === s);
    if (!ex) throw new Error(`Ejercicio no encontrado: ${s}`);
    return ex;
  });

/** Copia un ejercicio de otra semana para repasarlo (progreso independiente, mismo corrector). */
const reuse = (ex: Exercise, week: number, prefix: string, title?: string): Exercise => ({ ...ex, slug: `${prefix}-${ex.slug}`, week, ...(title ? { title } : {}) }) as Exercise;
const pick = (pool: Exercise[], idx: number[], week: number, prefix: string) => idx.map((i) => reuse(pool[i], week, prefix));

const W1: Exercise[] = W1_ORDER.map((k) => (k === 'CONCEPTOS' ? QUIZZES[0] : k === 'MODELOS' ? QUIZZES[1] : W1_NEW[k]));

const W4: Exercise[] = [...MODELING.filter((e) => e.week === 4), ...W4_NEW];

const W5: Exercise[] = bySlug(
  [...NORM_SQL.filter((e) => e.week === 5), ...W5_NEW],
  [
    's5-cliente-direcciones',
    's5-estudiante-clases',
    's5-prestamo-socio',
    's5-pedidos',
    's5-empleado-puesto',
    's5-estudiante-actividad',
    's5-orden-items',
    's5-matriculas',
    's5-empresa-regiones',
    's5-orden-detalle',
    's5-factura',
    's5-paciente-atencion',
    's5-playlist',
    's5-peliculas-locales',
    's5-factura-electronica',
  ],
);

// Semana 7: sentencias básicas DDL (15 scripts de creación) y DML/consultas simples sobre la base de las clases.
const W7: Exercise[] = [
  ...bySlug(
    [...NORM_SQL.filter((e) => e.week === 7), ...W7_DDL_NEW],
    ['s7-tienda', 's7-universidad', 's7-automotora', 's7-rosselot', 's7-oxxo-alter', 's7-biblioteca', 's7-secciones', 's7-colegio', 's7-empresa-rrhh', 's7-tienda-online', 's7-jerarquia', 's7-veterinaria', 's7-gimnasio', 's7-hotel', 's7-centro-medico'],
  ),
  ...W7_DML,
];

// Semana 6: simulacro de la Solemne 1 (modelado, transformación, normalización y teoría).
const W6: Exercise[] = [
  ...W6_QUIZ,
  ...pick(W3, [0, 3, 6, 9, 12], 6, 's6'),
  ...pick(W4, [0, 4, 8, 12], 6, 's6'),
  ...pick(W5, [0, 4, 9], 6, 's6'),
];

// Semana 12: repaso y certificación (mezcla de consultas, DML, rutinas y DDL).
const sqlOnly = (pool: Exercise[], type?: string) => pool.filter((e) => (type ? e.type === type : true));
const W12: Exercise[] = [
  ...pick(W7, [0, 5, 14], 12, 's12'),
  ...pick(W7_DML, [0, 1, 9, 10, 12], 12, 's12'),
  ...pick(sqlOnly(W8, 'SQL_WORK'), [1, 6, 9], 12, 's12'),
  ...pick(W9, [1, 3, 8], 12, 's12'),
  ...pick(W10, [3, 8], 12, 's12'),
  ...pick(W11, [3, 4], 12, 's12'),
].slice(0, 20);

// Semana 13: simulacro del examen (selección múltiple + ejercicios integradores).
const examQuiz = (slug: string, title: string, from: Exercise[]): Exercise => {
  const qs = from.flatMap((e) => (e.type === 'QUIZ' ? e.questions : []));
  return { slug, week: 13, type: 'QUIZ', title, statement: ['Simulacro de preguntas de selección múltiple del examen: mezcla de todos los contenidos del curso.'], questions: qs.map((q, i) => ({ ...q, id: `q${i + 1}` })) };
};
const W13: Exercise[] = [
  examQuiz('s13-q-modelado', 'Examen: modelado y normalización', W6_QUIZ),
  examQuiz('s13-q-sql', 'Examen: consultas SQL', W8),
  ...pick(W3, [1, 7], 13, 's13'),
  ...pick(W4, [2, 10], 13, 's13'),
  ...pick(W5, [3], 13, 's13'),
  ...pick(W7, [4, 9], 13, 's13'),
  ...pick(sqlOnly(W8, 'SQL_WORK'), [2, 7], 13, 's13'),
  ...pick(W9, [5, 12], 13, 's13'),
  ...pick(W10, [1, 6], 13, 's13'),
  ...pick(W11, [8, 11], 13, 's13'),
];

export const EXERCISES: Exercise[] = [...W1, ...W2, ...W3, ...W4, ...W5, ...W6, ...W7, ...W8, ...W9, ...W10, ...W11, ...W12, ...W13];
