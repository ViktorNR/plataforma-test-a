import { db } from './db';

/** Curso con su periodo y profesor, solo si el usuario puede consultarlo (administrador: todos; profesor: los suyos). */
export async function cursoAccesible(user: { id: number; rol: string }, cursoId: number) {
  if (!Number.isInteger(cursoId) || cursoId <= 0) return null;
  const curso = await db.curso.findUnique({ where: { id: cursoId }, include: { periodo: true, profesor: true } });
  if (!curso) return null;
  if (user.rol !== 'ADMIN' && curso.profesorId !== user.id) return null;
  return curso;
}

/** Ids de los estudiantes de un curso (solo rol ESTUDIANTE). En cursos vigentes solo cuentan las cuentas activas; en el histórico, todas. */
export async function estudiantesDeCurso(cursoId: number, historico = false) {
  const rows = await db.user.findMany({ where: { cursoId, rol: 'ESTUDIANTE', ...(historico ? {} : { activo: true }) }, select: { id: true } });
  return rows.map((r) => r.id);
}
