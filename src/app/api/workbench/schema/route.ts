import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSchema, resetWorkspace } from '@/lib/workbench';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
  const db = new URL(req.url).searchParams.get('db') ?? undefined;
  try {
    return NextResponse.json(await getSchema(user.id, db));
  } catch (e) {
    console.error('[workbench] schema', e);
    return NextResponse.json({ error: 'El laboratorio MySQL no está disponible por ahora.' }, { status: 503 });
  }
}

/** Restablece el espacio personal: elimina todas las bases de datos del estudiante. */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
  try {
    await resetWorkspace(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[workbench] reset', e);
    return NextResponse.json({ error: 'No se pudo restablecer el espacio.' }, { status: 503 });
  }
}
