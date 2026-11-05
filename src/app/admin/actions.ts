'use server';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function crearPeriodo(formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get('nombre') ?? '').trim().slice(0, 80);
  if (!nombre) return;
  await db.periodo.upsert({ where: { nombre }, update: {}, create: { nombre, activo: true } });
  revalidatePath('/admin/periodos');
}

/**
 * Cerrar un periodo lo envía al histórico: sus cursos (NRC) y sus estudiantes pasan a «desactivada».
 * Los profesores no se tocan: quedan disponibles para vincularlos a cursos de un periodo nuevo.
 * Reabrirlo reactiva los cursos y los estudiantes que se desactivaron por el cierre (no los desactivados a mano).
 */
export async function alternarPeriodo(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const p = await db.periodo.findUnique({ where: { id } });
  if (!p) return;
  const cerrar = p.activo;
  await db.$transaction([
    db.periodo.update({ where: { id }, data: { activo: !cerrar } }),
    db.curso.updateMany({ where: { periodoId: id }, data: { activo: !cerrar } }),
    cerrar
      ? db.user.updateMany({ where: { rol: 'ESTUDIANTE', periodoId: id, activo: true }, data: { activo: false, inactivoPorPeriodo: true } })
      : db.user.updateMany({ where: { rol: 'ESTUDIANTE', periodoId: id, inactivoPorPeriodo: true }, data: { activo: true, inactivoPorPeriodo: false } }),
  ]);
  revalidatePath('/admin', 'layout');
}

export async function eliminarPeriodo(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await db.user.count({ where: { periodoId: id } })) > 0 || (await db.curso.count({ where: { periodoId: id } })) > 0) return; // solo periodos vacíos
  await db.periodo.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/periodos');
}

/** Activa o desactiva una cuenta (estudiante o profesor). Un estudiante de un periodo cerrado no se puede activar. */
export async function alternarUsuario(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  if (id === admin.id) return;
  const u = await db.user.findUnique({ where: { id }, include: { periodo: true, curso: true } });
  if (!u || u.rol === 'ADMIN') return;
  if (!u.activo && u.rol === 'ESTUDIANTE' && ((u.periodo && !u.periodo.activo) || (u.curso && !u.curso.activo))) return;
  await db.user.update({ where: { id }, data: { activo: !u.activo, inactivoPorPeriodo: false } });
  revalidatePath('/admin', 'layout');
}

/** Elimina definitivamente a un profesor (sus cursos quedan sin profesor). */
export async function eliminarProfesor(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const u = await db.user.findFirst({ where: { id, rol: 'PROFESOR' } });
  if (!u) return;
  await db.user.delete({ where: { id } });
  revalidatePath('/admin', 'layout');
}

export async function restablecerClave(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.rol === 'ADMIN') return;
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  revalidatePath('/admin/estudiantes');
  revalidatePath('/admin/profesores');
}

export interface ResultadoClave {
  ok: boolean;
  mensaje: string;
  /** Clave temporal generada (se muestra una sola vez). */
  clave?: string;
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (l, 1, O, 0, I)

function claveTemporal(largo = 10) {
  const bytes = randomBytes(largo);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * Restablece la contraseña de un estudiante o profesor.
 * modo «auto»: genera una clave temporal aleatoria y la devuelve para entregarla; modo «manual»: usa la escrita.
 */
export async function restablecerClaveForm(_prev: ResultadoClave | null, formData: FormData): Promise<ResultadoClave> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const modo = String(formData.get('modo') ?? 'auto');
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.rol === 'ADMIN') return { ok: false, mensaje: 'Usuario no válido.' };
  const clave = modo === 'manual' ? String(formData.get('password') ?? '') : claveTemporal();
  if (clave.length < 8 || clave.length > 100) return { ok: false, mensaje: 'La clave debe tener entre 8 y 100 caracteres.' };
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(clave, 12) } });
  return { ok: true, mensaje: `Clave restablecida para ${u.nombre} ${u.apellido}.`, clave: modo === 'manual' ? undefined : clave };
}

// ---------- Profesores ----------

export async function crearProfesor(formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get('nombre') ?? '').trim().slice(0, 60);
  const apellido = String(formData.get('apellido') ?? '').trim().slice(0, 60);
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const password = String(formData.get('password') ?? '');
  if (!nombre || !apellido || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) redirect('/admin/profesores?error=datos');
  if (await db.user.findUnique({ where: { email } })) redirect('/admin/profesores?error=correo');
  await db.user.create({ data: { nombre, apellido, email, passwordHash: await bcrypt.hash(password, 12), rol: 'PROFESOR' } });
  revalidatePath('/admin/profesores');
  redirect('/admin/profesores?ok=1');
}

// ---------- Cursos (NRC) ----------

export async function crearCurso(formData: FormData) {
  await requireAdmin();
  const nombre = String(formData.get('nombre') ?? '').trim().slice(0, 100);
  const nrc = String(formData.get('nrc') ?? '').trim().slice(0, 20);
  const periodoId = Number(formData.get('periodoId'));
  const profesorId = Number(formData.get('profesorId')) || null;
  if (!nombre || !nrc || !periodoId) redirect('/admin/cursos?error=datos');
  if (!(await db.periodo.findFirst({ where: { id: periodoId, activo: true } }))) redirect('/admin/cursos?error=periodo');
  if (await db.curso.findUnique({ where: { nrc_periodoId: { nrc, periodoId } } })) redirect('/admin/cursos?error=nrc');
  if (profesorId && !(await db.user.findFirst({ where: { id: profesorId, rol: 'PROFESOR', activo: true } }))) redirect('/admin/cursos?error=datos');
  await db.curso.create({ data: { nombre, nrc, periodoId, profesorId } });
  revalidatePath('/admin/cursos');
  redirect('/admin/cursos?ok=1');
}

/** Vincula (o desvincula, con valor vacío) un profesor a un NRC. */
export async function vincularProfesor(formData: FormData) {
  await requireAdmin();
  const cursoId = Number(formData.get('cursoId'));
  const profesorId = Number(formData.get('profesorId')) || null;
  if (profesorId && !(await db.user.findFirst({ where: { id: profesorId, rol: 'PROFESOR', activo: true } }))) return;
  await db.curso.update({ where: { id: cursoId }, data: { profesorId } }).catch(() => undefined);
  revalidatePath('/admin/cursos');
}

export async function eliminarCurso(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if ((await db.user.count({ where: { cursoId: id } })) > 0) return; // solo cursos sin estudiantes
  await db.curso.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/admin/cursos');
}

/** Asigna un estudiante (p. ej. uno anterior a los cursos) a un NRC; su periodo pasa a ser el del curso. */
export async function asignarCurso(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const cursoId = Number(formData.get('cursoId')) || null;
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.rol !== 'ESTUDIANTE') return;
  const curso = cursoId ? await db.curso.findUnique({ where: { id: cursoId }, include: { periodo: true } }) : null;
  if (cursoId && !curso) return;
  // Un curso vigente reactiva al estudiante; uno cerrado lo deja desactivado (histórico).
  const estado = curso ? (curso.activo && curso.periodo.activo ? { activo: true, inactivoPorPeriodo: false } : { activo: false, inactivoPorPeriodo: true }) : {};
  await db.user.update({ where: { id }, data: { cursoId, ...(curso ? { periodoId: curso.periodoId } : {}), ...estado } });
  revalidatePath('/admin', 'layout');
}

export async function alternarContenido(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get('key') ?? '').slice(0, 80);
  if (!key) return;
  const current = await db.contentToggle.findUnique({ where: { key } });
  const enabled = !(current ? current.enabled : true);
  await db.contentToggle.upsert({ where: { key }, update: { enabled }, create: { key, enabled } });
  revalidatePath('/admin/contenido');
  revalidatePath('/panel');
}
