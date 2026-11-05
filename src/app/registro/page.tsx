import AuthForm from '@/components/AuthForm';
import AuthShell from '@/components/AuthShell';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function RegistroPage() {
  // Solo se ofrecen los cursos (NRC) de periodos activos.
  const cursos = await db.curso.findMany({
    where: { activo: true, periodo: { activo: true } },
    include: { periodo: true, profesor: true },
    orderBy: [{ periodo: { creadoEn: 'desc' } }, { nombre: 'asc' }, { nrc: 'asc' }],
  });
  const opciones = cursos.map((c) => ({
    id: c.id,
    nombre: `${c.nombre} · NRC ${c.nrc}${c.profesor ? ` · Prof. ${c.profesor.nombre} ${c.profesor.apellido}` : ''} · ${c.periodo.nombre}`,
  }));
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Regístrate con tu nombre, correo y el curso (NRC) en el que estás inscrito.">
      {opciones.length === 0 ? <p className="err">No hay cursos habilitados todavía. Consulta con tu docente.</p> : <AuthForm mode="registro" cursos={opciones} />}
    </AuthShell>
  );
}
