import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { tooManyAttempts } from '@/lib/ratelimit';
import { loadTemplate } from '@/lib/workbench';

export const maxDuration = 60;

const body = z.object({ id: z.string().max(40) });

/** Carga una base de datos de ejemplo (centro médico, universidad, etc.) en el espacio del estudiante. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' }, { status: 401 });
  if (tooManyAttempts(`wbt:${user.id}`, 30, 10 * 60 * 1000)) return NextResponse.json({ error: 'Demasiadas cargas seguidas. Espera unos minutos.' }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  try {
    await loadTemplate(user.id, parsed.data.id);
    return NextResponse.json({ ok: true, database: parsed.data.id });
  } catch (e) {
    const msg = (e as Error).message;
    const known = /desconocida|hasta \d+ bases/.test(msg);
    if (!known) console.error('[workbench] plantilla', e);
    return NextResponse.json({ error: known ? msg : 'No se pudo cargar la base de ejemplo. Intenta nuevamente.' }, { status: known ? 400 : 503 });
  }
}
