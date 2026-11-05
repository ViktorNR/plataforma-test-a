import Link from 'next/link';
import { db } from '@/lib/db';
import { crearCurso, eliminarCurso, vincularProfesor } from '../actions';

const ERRORES: Record<string, string> = {
  datos: 'Completa el nombre del curso, el NRC y el periodo.',
  nrc: 'Ya existe un curso con ese NRC en el periodo elegido.',
  periodo: 'Solo se pueden crear cursos en periodos activos.',
};

export default async function CursosPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const [periodos, profesores, cursos] = await Promise.all([
    db.periodo.findMany({ orderBy: { creadoEn: 'desc' } }),
    db.user.findMany({ where: { rol: 'PROFESOR', activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    db.curso.findMany({
      include: { periodo: true, profesor: true, _count: { select: { estudiantes: true } } },
      orderBy: [{ periodo: { creadoEn: 'desc' } }, { nombre: 'asc' }, { nrc: 'asc' }],
    }),
  ]);
  const vigentes = cursos.filter((c) => c.periodo.activo);
  const historico = cursos.filter((c) => !c.periodo.activo);

  const Tabla = ({ filas, editable }: { filas: typeof cursos; editable: boolean }) => (
    <table className="table">
      <thead><tr><th>Curso</th><th>NRC</th><th>Periodo</th><th>Profesor</th><th>Estudiantes</th><th /></tr></thead>
      <tbody>
        {filas.map((c) => (
          <tr key={c.id}>
            <td><b>{c.nombre}</b></td>
            <td>{c.nrc}</td>
            <td>{c.periodo.nombre}{!c.activo && <> <span className="pill">Desactivada</span></>}</td>
            <td>
              {editable ? (
                <form action={vincularProfesor} className="row">
                  <input type="hidden" name="cursoId" value={c.id} />
                  <select name="profesorId" defaultValue={c.profesorId ?? ''}>
                    <option value="">— sin profesor —</option>
                    {profesores.map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
                  </select>
                  <button className="btn btn-sm">Vincular</button>
                </form>
              ) : (
                c.profesor ? `${c.profesor.nombre} ${c.profesor.apellido}` : <span className="muted">sin profesor</span>
              )}
            </td>
            <td>{c._count.estudiantes}</td>
            <td className="actions">
              <Link className="btn btn-sm btn-ghost" href={`/profesor/curso/${c.id}`}>Ver panel</Link>
              {c._count.estudiantes === 0 && (
                <form action={eliminarCurso}><input type="hidden" name="id" value={c.id} /><button className="btn btn-sm btn-ghost">Eliminar</button></form>
              )}
            </td>
          </tr>
        ))}
        {filas.length === 0 && <tr><td colSpan={6} className="muted">Sin cursos.</td></tr>}
      </tbody>
    </table>
  );

  return (
    <div className="stack-lg">
      <h1>Cursos (NRC)</h1>
      <p className="muted">Un curso es una sección de la asignatura en un periodo. Los estudiantes se inscriben eligiendo su NRC al registrarse y el profesor vinculado ve sus indicadores. Al cerrar un periodo, sus cursos y estudiantes pasan al histórico.</p>

      <section className="card">
        <h3>Agregar curso</h3>
        {sp.error && <p className="err" role="alert">{ERRORES[sp.error] ?? 'No se pudo guardar.'}</p>}
        {sp.ok && <p className="ok">Curso creado.</p>}
        {periodos.length === 0 ? (
          <p className="muted">Primero crea un periodo en <Link href="/admin">Resumen</Link>.</p>
        ) : (
          <form action={crearCurso} className="stack">
            <div className="grid-2">
              <label>Nombre del curso<input name="nombre" required maxLength={100} defaultValue="Base de Datos" /></label>
              <label>NRC<input name="nrc" required maxLength={20} placeholder="Ej.: 4521" /></label>
            </div>
            <div className="grid-2">
              <label>
                Periodo
                <select name="periodoId" required defaultValue={periodos.find((p) => p.activo)?.id}>
                  {periodos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
              <label>
                Profesor (opcional)
                <select name="profesorId" defaultValue="">
                  <option value="">— sin profesor —</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
                </select>
              </label>
            </div>
            <div><button className="btn btn-primary">Crear curso</button></div>
          </form>
        )}
      </section>

      <section className="card scroll-x">
        <h3>Periodos vigentes</h3>
        <Tabla filas={vigentes} editable />
      </section>

      <section className="card scroll-x">
        <h3>Histórico (periodos cerrados)</h3>
        <Tabla filas={historico} editable={false} />
      </section>
    </div>
  );
}
