import Link from 'next/link';
import { Barra, EstadoPill, Kpi } from '@/components/Dash';
import { requireProfesor } from '@/lib/auth';
import { estudiantesDeCurso } from '@/lib/cursos';
import { db } from '@/lib/db';
import { calcularIndicadores, hace, whereCursosDe } from '@/lib/indicadores';

export default async function ProfesorHome({ searchParams }: { searchParams: Promise<{ historico?: string }> }) {
  const user = await requireProfesor();
  const historico = (await searchParams).historico === '1';

  const cursos = await db.curso.findMany({
    where: whereCursosDe(user, historico),
    include: { periodo: true, profesor: true },
    orderBy: [{ periodo: { creadoEn: 'desc' } }, { nombre: 'asc' }, { nrc: 'asc' }],
  });
  const detalle = await Promise.all(
    cursos.map(async (c) => {
      const ids = await estudiantesDeCurso(c.id, !c.periodo.activo);
      return { curso: c, ind: await calcularIndicadores(ids) };
    }),
  );
  const todos = await calcularIndicadores(detalle.flatMap((d) => d.ind.alumnos.map((a) => a.id)));
  const r = todos.resumen;
  const atencion = detalle
    .flatMap((d) => d.ind.alumnos.filter((a) => a.estado === 'riesgo' || a.estado === 'nunca').map((a) => ({ a, curso: d.curso })))
    .sort((x, y) => (y.a.diasSinConexion ?? 999) - (x.a.diasSinConexion ?? 999))
    .slice(0, 8);
  const q = historico ? '&historico=1' : '';

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="eyebrow">{user.rol === 'ADMIN' ? 'Panel docente · todos los cursos' : 'Panel docente'}</p>
          <h1>{historico ? 'Histórico de cursos' : 'Mis cursos'}</h1>
        </div>
        <div className="row">
          <Link href="/profesor" className={`pill${!historico ? ' good' : ''}`}>Periodos vigentes</Link>
          <Link href="/profesor?historico=1" className={`pill${historico ? ' good' : ''}`}>Histórico</Link>
          {cursos.length > 0 && (
            <>
              <a className="btn btn-sm" href={`/profesor/export?tipo=alumnos${q}`}>Descargar indicadores (CSV)</a>
            </>
          )}
        </div>
      </div>

      {historico && <p className="muted">Cursos de periodos cerrados. Se conservan solo para consulta: sus estudiantes y resultados no se modifican.</p>}

      {cursos.length === 0 ? (
        <div className="card">
          <p>{historico ? 'Todavía no hay cursos en el histórico.' : 'Aún no tienes cursos asignados en un periodo vigente.'}</p>
          {!historico && <p className="muted">El administrador debe vincular tu usuario a un NRC.</p>}
        </div>
      ) : (
        <>
          <section className="kpis">
            <Kpi valor={cursos.length} titulo="cursos" detalle={`${r.alumnos} estudiantes`} />
            <Kpi valor={r.activos7} titulo="conectados esta semana" detalle={`de ${r.alumnos}`} tono="good" />
            <Kpi valor={`${r.participacion}%`} titulo="participación media" detalle="ejercicios intentados" />
            <Kpi valor={`${r.avance}%`} titulo="avance medio" detalle="ejercicios logrados (≥ 60 %)" />
            <Kpi valor={`${r.promedio}%`} titulo="promedio de puntaje" />
            <Kpi valor={r.enRiesgo} titulo="en riesgo" detalle="más de 14 días sin conectarse" tono={r.enRiesgo ? 'low' : 'good'} />
          </section>

          <section className="card scroll-x">
            <h3>Cursos</h3>
            <table className="table">
              <thead>
                <tr><th>Curso</th><th>NRC</th><th>Periodo</th>{user.rol === 'ADMIN' && <th>Profesor</th>}<th>Estudiantes</th><th>Activos 7 d</th><th>Participación</th><th>Avance</th><th>Promedio</th><th>En riesgo</th><th /></tr>
              </thead>
              <tbody>
                {detalle.map(({ curso, ind }) => (
                  <tr key={curso.id}>
                    <td><b><Link href={`/profesor/curso/${curso.id}`}>{curso.nombre}</Link></b></td>
                    <td>{curso.nrc}</td>
                    <td>{curso.periodo.nombre}</td>
                    {user.rol === 'ADMIN' && <td>{curso.profesor ? `${curso.profesor.nombre} ${curso.profesor.apellido}` : <span className="muted">sin asignar</span>}</td>}
                    <td>{ind.resumen.alumnos}</td>
                    <td>{ind.resumen.activos7}</td>
                    <td><Barra valor={ind.resumen.participacion} /></td>
                    <td><Barra valor={ind.resumen.avance} /></td>
                    <td>{ind.resumen.promedio}%</td>
                    <td>{ind.resumen.enRiesgo ? <span className="pill low">{ind.resumen.enRiesgo}</span> : <span className="muted">0</span>}</td>
                    <td className="actions"><Link className="btn btn-sm" href={`/profesor/curso/${curso.id}`}>Abrir panel</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {atencion.length > 0 && (
            <section className="card scroll-x">
              <h3>Estudiantes que requieren atención</h3>
              <p className="muted">Sin conectarse hace más de 14 días o que nunca ingresaron.</p>
              <table className="table">
                <thead><tr><th>Estudiante</th><th>Curso</th><th>Última conexión</th><th>Avance</th><th>Estado</th></tr></thead>
                <tbody>
                  {atencion.map(({ a, curso }) => (
                    <tr key={`${curso.id}-${a.id}`}>
                      <td><Link href={`/profesor/curso/${curso.id}/alumno/${a.id}`}><b>{a.apellido}, {a.nombre}</b></Link></td>
                      <td>{curso.nombre} · {curso.nrc}</td>
                      <td>{hace(a.diasSinConexion)}</td>
                      <td>{a.avance}%</td>
                      <td><EstadoPill estado={a.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
