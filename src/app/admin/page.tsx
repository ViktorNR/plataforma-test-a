import Link from 'next/link';
import { Barra, Delta, EstadoPill, GraficoActividad, Histograma, Kpi } from '@/components/Dash';
import { db } from '@/lib/db';
import { fmtFecha, hace } from '@/lib/indicadores';
import { metricasPlataforma } from '@/lib/plataforma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodoId = Number(sp.periodo) || undefined;
  const [m, periodos] = await Promise.all([metricasPlataforma(periodoId), db.periodo.findMany({ orderBy: { creadoEn: 'desc' } })]);
  const { usuarios: u, ind } = m;
  const r = ind.resumen;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const dificiles = ind.ejercicios.filter((e) => e.intentaron > 0).sort((a, b) => a.logro - b.logro).slice(0, 6);
  const populares = [...ind.ejercicios].sort((a, b) => b.intentaron - a.intentaron).slice(0, 6);
  const sinUso = ind.ejercicios.filter((e) => e.intentaron === 0).length;
  const periodoNombre = periodoId ? periodos.find((p) => p.id === periodoId)?.nombre : 'todos los periodos vigentes';

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Dashboard general</h1>
          <p className="muted">Indicadores de {periodoNombre}. Participación = ejercicios intentados; avance = ejercicios logrados (≥ 60 %).</p>
        </div>
        <form action="/admin" className="row">
          <select name="periodo" defaultValue={sp.periodo ?? ''} aria-label="Periodo">
            <option value="">Periodos vigentes</option>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? '' : ' (histórico)'}</option>)}
          </select>
          <button className="btn btn-sm">Aplicar</button>
        </form>
      </div>

      <section className="kpis kpis-lg">
        <Kpi valor={u.estudiantesVigentes} titulo="estudiantes" detalle={`${u.estudiantes} en total · ${u.sinCurso} sin curso`} extra={<Delta actual={u.nuevos7} previo={u.nuevosPrev7} sufijo=" nuevos" />} />
        <Kpi valor={u.hoy} titulo="activos hoy" detalle={`${pct(u.hoy, u.estudiantesVigentes)}% de los estudiantes`} tono="good" />
        <Kpi valor={u.semana} titulo="ingresaron esta semana" detalle={`${pct(u.semana, u.estudiantesVigentes)}% · últimos 7 días`} tono="good" />
        <Kpi valor={u.mes} titulo="activos en 30 días" detalle={`${pct(u.mes, u.estudiantesVigentes)}% de los estudiantes`} />
        <Kpi valor={u.nuncaIngresaron} titulo="nunca ingresaron" detalle="cuenta creada sin conexión" tono={u.nuncaIngresaron ? 'mid' : 'good'} />
        <Kpi valor={r.enRiesgo} titulo="en riesgo" detalle="más de 14 días sin conectarse" tono={r.enRiesgo ? 'low' : 'good'} />
      </section>

      <section className="kpis">
        <Kpi valor={`${r.participacion}%`} titulo="participación media" detalle={`${r.sinIntentos} estudiantes sin ningún intento`} />
        <Kpi valor={`${r.avance}%`} titulo="avance medio" detalle="ejercicios logrados" />
        <Kpi valor={`${r.promedio}%`} titulo="promedio de puntaje" />
        <Kpi valor={m.intentos7} titulo="intentos esta semana" extra={<Delta actual={m.intentos7} previo={m.intentosPrev7} />} />
        <Kpi valor={u.profesores} titulo="profesores" detalle={`${u.cursos} cursos · ${u.periodosActivos} periodos activos`} />
        <Kpi valor={r.conRespuestasVistas} titulo="vieron respuestas" detalle="estudiantes con «Ver respuesta»" tono={r.conRespuestasVistas ? 'mid' : undefined} />
      </section>

      <section className="grid-2 dash-grid">
        <div className="card">
          <h3>Estudiantes que ingresaron cada día</h3>
          <p className="muted">Últimos 30 días (usuarios distintos por día).</p>
          <GraficoActividad datos={m.accesos.map((d) => ({ ...d, intentos: d.alumnos }))} unidad="estudiantes" color="var(--chart-2)" />
        </div>
        <div className="card">
          <h3>Intentos por día</h3>
          <p className="muted">Ejercicios enviados por todos los estudiantes, últimos 30 días.</p>
          <GraficoActividad datos={ind.actividad} />
        </div>
      </section>

      <section className="grid-2 dash-grid">
        <div className="card scroll-x">
          <h3>Avance por semana del curso</h3>
          <table className="table compact">
            <thead><tr><th>Semana</th><th>Participación</th><th>Avance</th></tr></thead>
            <tbody>
              {ind.semanas.map((s) => (
                <tr key={s.n}>
                  <td><b>S{s.n}</b> <small className="muted">{s.title}</small></td>
                  <td>{s.total ? <Barra valor={s.participacion} /> : '—'}</td>
                  <td>{s.total ? <Barra valor={s.avance} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stack-lg">
          <div className="card">
            <h3>Distribución del avance</h3>
            <p className="muted">Estudiantes según el % de ejercicios logrados.</p>
            <Histograma datos={ind.distribucion} />
          </div>
        </div>
      </section>

      <section className="card scroll-x">
        <div className="row-between"><h3>Cursos</h3><Link className="btn btn-sm" href="/admin/cursos">Administrar cursos</Link></div>
        <table className="table">
          <thead><tr><th>Curso</th><th>NRC</th><th>Periodo</th><th>Profesor</th><th>Estudiantes</th><th>Activos 7 d</th><th>Participación</th><th>Avance</th><th>En riesgo</th><th /></tr></thead>
          <tbody>
            {m.cursos.map((c) => (
              <tr key={c.id}>
                <td><b>{c.nombre}</b></td>
                <td>{c.nrc}</td>
                <td>{c.periodo}</td>
                <td>{c.profesor ?? <span className="pill low">Sin profesor</span>}</td>
                <td>{c.alumnos}</td>
                <td>{c.activos7} <small className="muted">({pct(c.activos7, c.alumnos)}%)</small></td>
                <td><Barra valor={c.participacion} /></td>
                <td><Barra valor={c.avance} /></td>
                <td>{c.enRiesgo ? <span className="pill low">{c.enRiesgo}</span> : <span className="muted">0</span>}</td>
                <td className="actions"><Link className="btn btn-sm btn-ghost" href={`/profesor/curso/${c.id}`}>Ver panel</Link></td>
              </tr>
            ))}
            {m.cursos.length === 0 && <tr><td colSpan={10} className="muted">No hay cursos en este periodo. Créalos en «Cursos (NRC)».</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="grid-2 dash-grid">
        <div className="card scroll-x">
          <div className="row-between"><h3>Profesores</h3><Link className="btn btn-sm" href="/admin/profesores">Administrar</Link></div>
          <table className="table compact">
            <thead><tr><th>Profesor</th><th>Cursos</th><th>Estud.</th><th>Avance</th><th>Última conexión</th></tr></thead>
            <tbody>
              {m.profesores.map((p) => (
                <tr key={p.id} className={p.activo ? '' : 'off'}>
                  <td><b>{p.nombre}</b></td>
                  <td>{p.cursos}</td>
                  <td>{p.alumnos}</td>
                  <td>{p.alumnos ? `${p.avance}%` : '—'}</td>
                  <td suppressHydrationWarning>{fmtFecha(p.ultimaConexion)}</td>
                </tr>
              ))}
              {m.profesores.length === 0 && <tr><td colSpan={5} className="muted">Aún no hay profesores.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card scroll-x">
          <h3>Estudiantes que requieren atención</h3>
          <p className="muted">Más de 14 días sin conectarse o que nunca ingresaron.</p>
          <table className="table compact">
            <thead><tr><th>Estudiante</th><th>Última conexión</th><th>Avance</th><th>Estado</th></tr></thead>
            <tbody>
              {m.atencion.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/estudiantes/${a.id}`}><b>{a.apellido}, {a.nombre}</b></Link></td>
                  <td>{hace(a.diasSinConexion)}</td>
                  <td>{a.avance}%</td>
                  <td><EstadoPill estado={a.estado} /></td>
                </tr>
              ))}
              {m.atencion.length === 0 && <tr><td colSpan={4} className="muted">Nadie está en riesgo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2 dash-grid">
        <div className="card scroll-x">
          <h3>Ejercicios más difíciles</h3>
          <p className="muted">Menor % de logro entre los intentados. {sinUso > 0 && `${sinUso} ejercicios aún sin intentos.`}</p>
          <table className="table compact">
            <thead><tr><th>Ejercicio</th><th>Logro</th><th>Intentos</th></tr></thead>
            <tbody>
              {dificiles.map((e) => <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td><Barra valor={e.logro} /></td><td>{e.intentosMedios}</td></tr>)}
              {dificiles.length === 0 && <tr><td colSpan={3} className="muted">Sin datos todavía.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card scroll-x">
          <h3>Ejercicios más practicados</h3>
          <p className="muted">Estudiantes que lo han intentado.</p>
          <table className="table compact">
            <thead><tr><th>Ejercicio</th><th>Intentaron</th><th>Lo lograron</th></tr></thead>
            <tbody>
              {populares.filter((e) => e.intentaron > 0).map((e) => <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td>{e.intentaron}</td><td>{e.lograron}</td></tr>)}
              {populares.every((e) => e.intentaron === 0) && <tr><td colSpan={3} className="muted">Sin datos todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
