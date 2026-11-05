import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { getExercise } from '@/lib/content';
import { practiceSqlWork } from '@/lib/grading/sqlwork';
import { tooManyAttempts } from '@/lib/ratelimit';

export const maxDuration = 60;

const body = z.object({ slug: z.string().max(80), script: z.string().max(20_000) });

/** Ejecuta el script del estudiante sobre una copia de la base del ejercicio, sin corregir ni guardar intento. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' }, { status: 401 });
  if (tooManyAttempts(`probar:${user.id}`, 80, 10 * 60 * 1000)) return NextResponse.json({ error: 'Demasiadas ejecuciones seguidas. Espera unos minutos.' }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  const ex = getExercise(parsed.data.slug);
  if (!ex || ex.type !== 'SQL_WORK') return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
  return NextResponse.json(await practiceSqlWork(parsed.data.script, ex.work.db));
}
