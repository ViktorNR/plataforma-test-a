import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { tooManyAttempts } from '@/lib/ratelimit';
import { runScript } from '@/lib/workbench';

export const maxDuration = 60;

const body = z.object({ script: z.string().max(60_000), database: z.string().max(40).optional().nullable() });

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' }, { status: 401 });
  if (tooManyAttempts(`wb:${user.id}`, 90, 10 * 60 * 1000)) return NextResponse.json({ error: 'Demasiadas ejecuciones seguidas. Espera unos minutos.' }, { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  try {
    return NextResponse.json(await runScript(user.id, parsed.data.script, parsed.data.database ?? undefined));
  } catch (e) {
    const msg = (e as Error).message;
    const known = /demasiado largo|No hay sentencias|Máximo/.test(msg);
    if (!known) console.error('[workbench] error', e);
    return NextResponse.json({ error: known ? msg : 'El laboratorio MySQL no está disponible por ahora. Intenta nuevamente.' }, { status: known ? 400 : 503 });
  }
}
