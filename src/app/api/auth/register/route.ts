import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { tooManyAttempts } from '@/lib/ratelimit';

const body = z.object({
  nombre: z.string().trim().min(1, 'Ingresa tu nombre').max(60),
  apellido: z.string().trim().min(1, 'Ingresa tu apellido').max(60),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  cursoId: z.coerce.number().int().positive('Elige tu curso (NRC)'),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (tooManyAttempts(`reg:${ip}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: 'Demasiados registros desde esta red. Intenta más tarde.' }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  const { nombre, apellido, email, password, cursoId } = parsed.data;

  // El estudiante se inscribe en un NRC; el periodo sale del curso y debe estar activo.
  const curso = await db.curso.findUnique({ where: { id: cursoId }, include: { periodo: true } });
  if (!curso || !curso.activo || !curso.periodo.activo) return NextResponse.json({ error: 'El curso elegido no está disponible' }, { status: 400 });
  if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 });

  const user = await db.user.create({
    data: { nombre, apellido, email, passwordHash: await bcrypt.hash(password, 12), periodoId: curso.periodoId, cursoId: curso.id, rol: 'ESTUDIANTE' },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, destino: '/panel' });
}
