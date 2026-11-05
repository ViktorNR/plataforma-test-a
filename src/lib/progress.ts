import { db } from './db';

/** Mejor puntaje por ejercicio para un conjunto de usuarios: Map<userId, Map<slug, puntaje>>. */
export async function bestScores(userIds?: number[]) {
  const rows = await db.intento.groupBy({
    by: ['userId', 'exerciseSlug'],
    _max: { puntaje: true },
    where: userIds ? { userId: { in: userIds } } : undefined,
  });
  const out = new Map<number, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.userId) ?? new Map<string, number>();
    m.set(r.exerciseSlug, r._max.puntaje ?? 0);
    out.set(r.userId, m);
  }
  // Los ejercicios cuya respuesta se vio no suman puntaje.
  const vistas = await db.respuestaVista.findMany({ where: userIds ? { userId: { in: userIds } } : undefined });
  for (const v of vistas) {
    const m = out.get(v.userId) ?? new Map<string, number>();
    m.set(v.exerciseSlug, 0);
    out.set(v.userId, m);
  }
  return out;
}

/** Slugs de los ejercicios cuya respuesta ya vio el estudiante. */
export async function viewedSlugs(userId: number) {
  const rows = await db.respuestaVista.findMany({ where: { userId }, select: { exerciseSlug: true } });
  return new Set(rows.map((r) => r.exerciseSlug));
}

/** Puntaje mínimo para considerar un ejercicio «logrado». */
export const PASS = 60;

export const average = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
