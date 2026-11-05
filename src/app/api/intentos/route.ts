import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { getExercise, getToggles, isExerciseEnabled } from '@/lib/content';
import { db } from '@/lib/db';
import { BadAnswer, grade } from '@/lib/grading';
import { tooManyAttempts } from '@/lib/ratelimit';

export const maxDuration = 30;

const body = z.object({ slug: z.string().max(80), respuesta: z.unknown() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' }, { status: 401 });

  const raw = await req.text();
  if (raw.length > 300_000) return NextResponse.json({ error: 'La respuesta es demasiado grande' }, { status: 413 });
  const parsed = body.safeParse(JSON.parse(raw || 'null'));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const ex = getExercise(parsed.data.slug);
  if (!ex) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
  if (!isExerciseEnabled(await getToggles(), ex) && user.rol === 'ESTUDIANTE') return NextResponse.json({ error: 'Este ejercicio no está disponible' }, { status: 403 });

  const visto = await db.respuestaVista.findUnique({ where: { userId_exerciseSlug: { userId: user.id, exerciseSlug: ex.slug } } });
  if (visto) return NextResponse.json({ error: 'Ya viste la respuesta de este ejercicio: quedó bloqueado y no suma puntaje.' }, { status: 403 });

  if (tooManyAttempts(`grade:${user.id}`, 40, 10 * 60 * 1000)) return NextResponse.json({ error: 'Demasiados intentos seguidos. Espera unos minutos.' }, { status: 429 });

  try {
    const feedback = await grade(ex, parsed.data.respuesta);
    const intento = await db.intento.create({
      data: {
        userId: user.id,
        exerciseSlug: ex.slug,
        respuesta: parsed.data.respuesta as never,
        puntaje: feedback.score,
        feedback: feedback as never,
      },
    });
    return NextResponse.json({ feedback, intentoId: intento.id });
  } catch (e) {
    if (e instanceof BadAnswer) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[intentos] error al corregir', e);
    return NextResponse.json({ error: 'Ocurrió un error al corregir. Intenta nuevamente.' }, { status: 500 });
  }
}
