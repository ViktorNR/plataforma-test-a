import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Barra, EstadoPill, GraficoActividad, Histograma, Kpi, heatClass } from '@/components/Dash';
import PrintButton from '@/components/PrintButton';
import { requireProfesor } from '@/lib/auth';
import { WEEKS } from '@/lib/content';
import { cursoAccesible, estudiantesDeCurso } from '@/lib/cursos';
import { calcularIndicadores, fmtFecha, hace } from '@/lib/indicadores';

/** Informe del curso pensado para imprimir (A4 horizontal) o guardar como PDF desde el diálogo de impresión. */
export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProfesor();
  const curso = await cursoAccesible(user, Number((await params).id));
  if (!curso) notFound();
  const ind = await calcularIndicadores(await estudiantesDeCurso(curso.id, !curso.periodo.activo));
  const r = ind.resumen;
  const dificiles = ind.ejercicios.filter((e) => e.intentaron > 0).sort((a, b) => a.logro - b.logro || b.intentosMedios - a.intentosMedios).slice(0, 8);
  const masVistas = ind.ejercicios.filter((e) => e.vistas > 0).sort((a, b) => b.vistas - a.vistas).slice(0, 5);
  const riesgo = ind.alumnos.filter((a) => a.estado === 'riesgo' || a.estado === 'nunca');
  const hoy = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  return (
    <div className="informe stack-lg">
      <div className="row-between no-print">
        <Link href={`/profesor/curso/${curso.id}`}>← Volver al panel del curso</Link>
        <PrintButton />
      </div>

      <header className="informe-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_uandresbello.png" alt="Universidad Andrés Bello" width={150} height={60} />
        <div>
          <p className="eyebrow">Informe de indicadores · Base de Datos ATDF103</p>
          <h1>{curso.nombre} · NRC {curso.nrc}</h1>
          <p className="muted" suppressHydrationWarning>
            {curso.periodo.nombre}{curso.periodo.activo ? '' : ' (histórico)'} · {curso.profesor ? `Profesor/a: ${curso.profesor.nombre} ${curso.profesor.apellido}` : 'Sin profesor asignado'} · Generado el {hoy}
          </p>
        </div>
      </header>

      <section className="kpis">
        <Kpi valor={r.alumnos} titulo="estudiantes" detalle={`${r.nuncaIngresaron} nunca ingresaron`} />
        <Kpi valor={r.activos7} titulo="conectados (7 días)" tono="good" />
        <Kpi valor={`${r.participacion}%`} titulo="participación media" detalle={`${r.sinIntentos} sin intentos`} />
        <Kpi valor={`${r.avance}%`} titulo="avance medio" detalle="logrados (≥ 60 %)" />
        <Kpi valor={`${r.promedio}%`} titulo="promedio de puntaje" />
        <Kpi valor={r.enRiesgo} titulo="en riesgo" detalle="> 14 días sin conectarse" tono={r.enRiesgo ? 'low' : 'good'} />
      </section>

      <section className="grid-2 dash-grid avoid-break">
        <div className="card">
          <h3>Actividad de los últimos 30 días</h3>
          <GraficoActividad datos={ind.actividad} />
        </div>
        <div className="card">
          <h3>Distribución del avance</h3>
          <Histograma datos={ind.distribucion} />
        </div>
      </section>

      <section className="card splittable">
        <h3>Avance por semana</h3>
        <table className="table compact">
          <thead><tr><th>Semana</th><th>Ejercicios</th><th>Participación</th><th>Avance</th><th>Promedio</th></tr></thead>
          <tbody>
            {ind.semanas.map((s) => (
              <tr key={s.n}>
                <td><b>S{s.n}</b> · {s.title}</td>
                <td>{s.total || '—'}</td>
                <td>{s.total ? <Barra valor={s.participacion} /> : '—'}</td>
                <td>{s.total ? <Barra valor={s.avance} /> : '—'}</td>
                <td>{s.total ? `${s.promedio}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card page-break">
        <h3>Estudiantes</h3>
        <table className="table compact dash-table">
          <thead>
            <tr>
              <th>Estudiante</th><th>Última conexión</th><th>Estado</th><th>Partic.</th><th>Avance</th><th>Prom.</th>
              {WEEKS.map((w) => <th key={w.n} className="c">S{w.n}</th>)}
              <th>Vistas</th>
            </tr>
          </thead>
          <tbody>
            {ind.alumnos.map((a) => (
              <tr key={a.id}>
                <td><b>{a.apellido}, {a.nombre}</b></td>
                <td suppressHydrationWarning>{fmtFecha(a.ultimaConexion)} <small className="muted">({hace(a.diasSinConexion)})</small></td>
                <td><EstadoPill estado={a.estado} /></td>
                <td>{a.participacion}%</td>
                <td>{a.avance}%</td>
                <td>{a.promedio}%</td>
                {a.semanas.map((s) => <td key={s.n} className={`heat ${heatClass(s.avance, s.total)}`}>{s.total ? s.avance : '·'}</td>)}
                <td>{a.vistas}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">S1…S13: % de ejercicios logrados de cada semana. Participación: % de ejercicios intentados. Avance: % de ejercicios logrados (≥ 60 %).</p>
      </section>

      <section className="grid-2 dash-grid avoid-break">
        <div className="card">
          <h3>Ejercicios más difíciles</h3>
          <table className="table compact">
            <thead><tr><th>Ejercicio</th><th>Logro</th><th>Int.</th></tr></thead>
            <tbody>
              {dificiles.map((e) => <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td>{e.logro}%</td><td>{e.intentosMedios}</td></tr>)}
              {dificiles.length === 0 && <tr><td colSpan={3} className="muted">Sin datos todavía.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Con más respuestas vistas</h3>
          <table className="table compact">
            <thead><tr><th>Ejercicio</th><th>Vistas</th></tr></thead>
            <tbody>
              {masVistas.map((e) => <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td>{e.vistas}</td></tr>)}
              {masVistas.length === 0 && <tr><td colSpan={2} className="muted">Nadie ha visto respuestas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {riesgo.length > 0 && (
        <section className="card avoid-break">
          <h3>Estudiantes que requieren atención ({riesgo.length})</h3>
          <p>{riesgo.map((a) => `${a.apellido}, ${a.nombre} (${hace(a.diasSinConexion)})`).join(' · ')}</p>
        </section>
      )}
    </div>
  );
}
