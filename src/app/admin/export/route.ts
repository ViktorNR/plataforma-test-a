import { getSessionUser } from '@/lib/auth';
import { EXERCISES } from '@/lib/content';
import { db } from '@/lib/db';
import { bestScores } from '@/lib/progress';

// Evita inyección de fórmulas al abrir el CSV en Excel.
const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const admin = await getSessionUser();
  if (!admin || admin.rol !== 'ADMIN') return new Response('No autorizado', { status: 403 });

  const sp = new URL(req.url).searchParams;
  const periodo = sp.get('periodo');
  const curso = sp.get('curso');
  const cuenta = sp.get('cuenta');
  const q = (sp.get('q') ?? '').trim();
  const users = await db.user.findMany({
    where: {
      rol: 'ESTUDIANTE',
      ...(periodo ? { periodoId: Number(periodo) } : {}),
      ...(curso === 'sin' ? { cursoId: null } : curso ? { cursoId: Number(curso) } : {}),
      ...(cuenta === 'activos' || cuenta === 'inactivos' ? { activo: cuenta === 'activos' } : {}),
      ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' as const } }, { apellido: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
    },
    include: { periodo: true, curso: true },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
  const scores = await bestScores(users.map((u) => u.id));

  const head = ['Apellido', 'Nombre', 'Correo', 'Periodo', 'Curso', 'NRC', ...EXERCISES.map((e) => `S${e.week} ${e.title}`)];
  const rows = users.map((u) => {
    const mine = scores.get(u.id);
    return [u.apellido, u.nombre, u.email, u.periodo?.nombre ?? '', u.curso?.nombre ?? '', u.curso?.nrc ?? '', ...EXERCISES.map((e) => (mine?.has(e.slug) ? mine.get(e.slug)! : ''))];
  });
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="avance-estudiantes.csv"' },
  });
}
