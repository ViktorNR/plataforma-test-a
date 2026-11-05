import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, homeOf } from '@/lib/auth';
import { db } from '@/lib/db';
import { clearAttempts, tooManyAttempts } from '@/lib/ratelimit';

const body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Correo o contraseña inválidos' }, { status: 400 });
  const { email, password } = parsed.data;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const rlKey = `${ip}:${email}`;
  if (tooManyAttempts(rlKey)) return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });

  const user = await db.user.findUnique({ where: { email } });
  const claveOk = !!user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !claveOk) return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
  if (!user.activo) {
    return NextResponse.json(
      { error: user.inactivoPorPeriodo ? 'Tu curso ya terminó y la cuenta quedó desactivada. Consulta con tu docente si necesitas volver a ingresar.' : 'Tu cuenta está desactivada. Consulta con tu docente.' },
      { status: 403 },
    );
  }

  clearAttempts(rlKey);
  await createSession(user.id);
  return NextResponse.json({ ok: true, destino: homeOf(user.rol) });
}
