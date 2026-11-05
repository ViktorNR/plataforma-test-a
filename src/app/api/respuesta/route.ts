import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { getExercise, getToggles, isExerciseEnabled } from '@/lib/content';
import { db } from '@/lib/db';
import { solutionOf } from '@/lib/solution';

const body = z.object({ slug: z.string().max(80) });

/** «Ver respuesta»: registra que el estudiante vio la solución (queda con 0 % y bloqueado) y la entrega. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const ex = getExercise(parsed.data.slug);
  if (!ex) return NextResponse.json({ error: 'Ejercicio no encontrado' }, { status: 404 });
  if (!isExerciseEnabled(await getToggles(), ex) && user.rol === 'ESTUDIANTE') return NextResponse.json({ error: 'Este ejercicio no está disponible' }, { status: 403 });

  await db.respuestaVista.upsert({
    where: { userId_exerciseSlug: { userId: user.id, exerciseSlug: ex.slug } },
    create: { userId: user.id, exerciseSlug: ex.slug },
    update: {},
  });
  return NextResponse.json({ solution: solutionOf(ex) });
}
