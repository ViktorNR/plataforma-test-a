import { z } from 'zod';
import type { Exercise, Feedback } from '../types';
import { gradeEr } from './er';
import { gradeNormalization } from './normalization';
import { gradeQuiz } from './quiz';
import { gradeSchema } from './schema';
import { gradeSql } from './sql';
import { gradeSqlWork } from './sqlwork';

const node = z.object({ id: z.string(), type: z.string(), position: z.object({ x: z.number(), y: z.number() }), data: z.record(z.unknown()) }).passthrough();
const edge = z.object({ id: z.string(), source: z.string(), target: z.string(), data: z.record(z.unknown()).optional() }).passthrough();

const schemas = {
  QUIZ: z.object({ answers: z.record(z.number()) }),
  DIAGRAM: z.object({ nodes: z.array(node).max(200), edges: z.array(edge).max(400) }),
  SCHEMA: z.object({
    tables: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().max(80),
          cols: z.array(z.object({ id: z.string(), name: z.string().max(80), pk: z.boolean(), fkTable: z.string().max(80) })).max(40),
        }),
      )
      .max(20),
  }),
  NORM: z.object({
    tables: z.array(z.object({ id: z.string(), name: z.string().max(80), attrs: z.array(z.string().max(80)).max(40), pk: z.array(z.string().max(80)).max(40) })).max(20),
  }),
  SQL: z.object({ script: z.string().max(20000) }),
};

export class BadAnswer extends Error {}

export async function grade(ex: Exercise, respuesta: unknown): Promise<Feedback> {
  const parse = <T extends z.ZodTypeAny>(s: T): z.infer<T> => {
    const r = s.safeParse(respuesta);
    if (!r.success) throw new BadAnswer('Formato de respuesta inválido');
    return r.data;
  };
  switch (ex.type) {
    case 'QUIZ':
      return gradeQuiz(parse(schemas.QUIZ).answers, ex.questions);
    case 'ER':
    case 'EER':
      return gradeEr(parse(schemas.DIAGRAM) as never, ex.solution);
    case 'TRANSFORMACION':
      return gradeSchema(parse(schemas.SCHEMA), ex.options);
    case 'NORMALIZACION':
      return gradeNormalization(parse(schemas.NORM), ex.problem);
    case 'SQL_DDL':
      return gradeSql(parse(schemas.SQL).script, ex.solution);
    case 'SQL_WORK':
      return gradeSqlWork(parse(schemas.SQL).script, ex.work);
  }
}
