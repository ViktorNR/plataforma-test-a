import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@unab.cl').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'cambiar-esta-clave';

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: {
        nombre: 'Administrador',
        apellido: 'Docente',
        email,
        passwordHash: await bcrypt.hash(password, 12),
        rol: 'ADMIN',
      },
    });
    console.log(`[seed] Administrador creado: ${email}`);
  }

  if ((await db.periodo.count()) === 0) {
    await db.periodo.create({ data: { nombre: '2026 - Tercer trimestre', activo: true } });
    console.log('[seed] Periodo inicial creado');
  }

  // Coherencia: los periodos cerrados dejan sus cursos y estudiantes desactivados.
  const cerrados = (await db.periodo.findMany({ where: { activo: false }, select: { id: true } })).map((p) => p.id);
  if (cerrados.length) {
    await db.curso.updateMany({ where: { periodoId: { in: cerrados }, activo: true }, data: { activo: false } });
    await db.user.updateMany({ where: { rol: 'ESTUDIANTE', periodoId: { in: cerrados }, activo: true }, data: { activo: false, inactivoPorPeriodo: true } });
  }

  // Historial de accesos: quien ya tenía última conexión y ningún registro conserva ese día como primer acceso.
  const sinAcceso = await db.user.findMany({ where: { ultimaConexion: { not: null }, accesos: { none: {} } }, select: { id: true, ultimaConexion: true } });
  if (sinAcceso.length) {
    await db.acceso.createMany({ data: sinAcceso.map((u) => ({ userId: u.id, creadoEn: u.ultimaConexion })) });
    console.log(`[seed] ${sinAcceso.length} accesos históricos creados`);
  }

  // Migración a cursos (NRC): los estudiantes anteriores quedan en un curso provisorio de su periodo.
  // El administrador puede reasignarlos a sus NRC reales y eliminar el curso provisorio cuando quede vacío.
  const huerfanos = await db.user.findMany({ where: { rol: 'ESTUDIANTE', cursoId: null, periodoId: { not: null } }, select: { id: true, periodoId: true } });
  const porPeriodo = new Map();
  for (const u of huerfanos) porPeriodo.set(u.periodoId, [...(porPeriodo.get(u.periodoId) ?? []), u.id]);
  for (const [periodoId, ids] of porPeriodo) {
    const curso = await db.curso.upsert({
      where: { nrc_periodoId: { nrc: 'SIN-NRC', periodoId } },
      update: {},
      create: { nombre: 'Base de Datos (sin NRC asignado)', nrc: 'SIN-NRC', periodoId },
    });
    await db.user.updateMany({ where: { id: { in: ids } }, data: { cursoId: curso.id } });
    console.log(`[seed] ${ids.length} estudiantes del periodo ${periodoId} asignados al curso provisorio SIN-NRC`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
