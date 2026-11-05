import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

const COOKIE = 'bdplat_session';
const MAX_AGE = 60 * 60 * 24 * 7;

const diaChile = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(d);

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-secret-solo-para-desarrollo-local');

/** Cada inicio de sesión cuenta como un ingreso y actualiza la última conexión. */
export async function createSession(userId: number) {
  await db.user.update({ where: { id: userId }, data: { ultimaConexion: new Date(), ingresos: { increment: 1 } } }).catch(() => undefined);
  await db.acceso.create({ data: { userId } }).catch(() => undefined);
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await db.user.findUnique({
      where: { id: Number(payload.uid) },
      include: { periodo: true },
    });
    if (!user || !user.activo) return null;
    // La sesión dura 7 días: se refresca la última conexión si la actividad es nueva (máx. cada 5 min).
    if (!user.ultimaConexion || Date.now() - user.ultimaConexion.getTime() > 5 * 60 * 1000) {
      const nuevoDia = !user.ultimaConexion || diaChile(user.ultimaConexion) !== diaChile(new Date());
      await db.user.update({ where: { id: user.id }, data: { ultimaConexion: new Date() } }).catch(() => undefined);
      if (nuevoDia) await db.acceso.create({ data: { userId: user.id } }).catch(() => undefined);
    }
    return user;
  } catch {
    return null;
  }
}

/** Administrador o profesor: ven todo el contenido sin restricciones de habilitación. */
export const isStaff = (rol: string) => rol === 'ADMIN' || rol === 'PROFESOR';

export const homeOf = (rol: string) => (rol === 'ADMIN' ? '/admin' : rol === 'PROFESOR' ? '/profesor' : '/panel');

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** Profesor (o administrador, que puede ver cualquier curso). */
export async function requireProfesor() {
  const user = await requireUser();
  if (user.rol === 'ESTUDIANTE') redirect('/panel');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== 'ADMIN') redirect(homeOf(user.rol));
  return user;
}
