import { db } from '../db';
import type { Exercise, PublicExercise } from '../types';
import { schemaOf, TEMPLATES } from '../sqltemplates';
import { EXERCISES } from './catalog';
import { WEEKS } from './weeks';

export { EXERCISES, WEEKS };

export const getExercise = (slug: string) => EXERCISES.find((e) => e.slug === slug);
export const exercisesOfWeek = (week: number) => EXERCISES.filter((e) => e.week === week);

export const TYPE_LABEL: Record<Exercise['type'], string> = {
  QUIZ: 'Cuestionario',
  ER: 'Modelo E/R',
  EER: 'E/R extendido',
  TRANSFORMACION: 'Transformación',
  NORMALIZACION: 'Normalización',
  SQL_DDL: 'SQL (MySQL)',
  SQL_WORK: 'Práctica SQL',
};

const WORK_LABEL = { query: 'Consulta SQL', dml: 'DML / DDL', routine: 'Vista · procedimiento · función' } as const;
/** Etiqueta legible del tipo de ejercicio (distingue consultas, DML y rutinas). */
export const typeLabel = (ex: Exercise) => (ex.type === 'SQL_WORK' ? WORK_LABEL[ex.work.kind] : TYPE_LABEL[ex.type]);

/** Versión del ejercicio apta para el navegador: sin respuestas ni soluciones. */
export function toPublic(ex: Exercise): PublicExercise {
  const base = { slug: ex.slug, week: ex.week, title: ex.title, statement: ex.statement, type: ex.type };
  switch (ex.type) {
    case 'QUIZ':
      return { ...base, questions: ex.questions.map(({ id, text, options }) => ({ id, text, options })) };
    case 'TRANSFORMACION':
      return { ...base, model: ex.model };
    case 'NORMALIZACION':
      return { ...base, problem: ex.problem };
    case 'SQL_DDL':
      return { ...base, dbName: ex.solution.db };
    case 'SQL_WORK':
      return { ...base, sqlwork: { kind: ex.work.kind, db: ex.work.db, dbTitle: TEMPLATES.find((t) => t.id === ex.work.db)?.title ?? ex.work.db, schema: schemaOf(ex.work.db) } };
    default:
      return base;
  }
}

/** Mapa clave -> habilitado ("week:3" o slug de ejercicio). Por defecto todo está habilitado. */
export async function getToggles() {
  const rows = await db.contentToggle.findMany();
  return new Map(rows.map((r) => [r.key, r.enabled]));
}

export const isExerciseEnabled = (t: Map<string, boolean>, ex: Exercise) => t.get(`week:${ex.week}`) !== false && t.get(ex.slug) !== false;
export const isWeekEnabled = (t: Map<string, boolean>, week: number) => t.get(`week:${week}`) !== false;
