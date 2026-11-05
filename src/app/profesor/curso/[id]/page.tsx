import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Barra, EstadoPill, GraficoActividad, Histograma, Kpi, heatClass } from '@/components/Dash';
import { requireProfesor } from '@/lib/auth';
import { WEEKS } from '@/lib/content';
import { cursoAccesible, estudiantesDeCurso } from '@/lib/cursos';
import { type Estado, calcularIndicadores, fmtFecha, hace } from '@/lib/indicadores';

type Sp = { orden?: string; estado?: string; q?: string };

const ORDENES: Record<string, string> = {
  apellido: 'Apellido',
  avance: 'Avance (menor primero)',
  participacion: 'Participación (menor primero)',
  conexion: 'Última conexión (más antigua primero)',
  promedio: 'Promedio (menor primero)',
};

export default async function CursoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Sp> }) {
  const user = await requireProfesor();
  const curso = await cursoAccesible(user, Number((await params).id));
  if (!curso) notFound();
  const sp = await searchParams;
  const orden = sp.orden && sp.orden in ORDENES ? sp.orden : 'apellido';
  const filtroEstado = (['activo', 'inactivo', 'riesgo', 'nunca'] as Estado[]).find((e) => e === sp.estado);
  const q = (sp.q ?? '').trim().toLowerCase();

  const ind = await calcularIndicadores(await estudiantesDeCurso(curso.id, !curso.periodo.activo));
  const r = ind.resumen;
  const cerrado = !curso.periodo.activo;

  let filas = ind.alumnos.filter((a) => (!filtroEstado || a.estado === filtroEstado) && (!q || `${a.nombre} ${a.apellido} ${a.email}`.toLowerCase().includes(q)));
  const cmp: Record<string, (a: (typeof filas)[number], b: (typeof filas)[number]) => number> = {
    apellido: (a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
    avance: (a, b) => a.avance - b.avance,
    participacion: (a, b) => a.participacion - b.participacion,
    conexion: (a, b) => (a.diasSinConexion ?? 9999) * -1 - (b.diasSinConexion ?? 9999) * -1,
    promedio: (a, b) => a.promedio - b.promedio,
  };
  filas = [...filas].sort(cmp[orden]);

  const dificiles = ind.ejercicios.filter((e) => e.intentaron > 0).sort((a, b) => a.logro - b.logro || b.intentosMedios - a.intentosMedios).slice(0, 8);
  const masVistas = ind.ejercicios.filter((e) => e.vistas > 0).sort((a, b) => b.vistas - a.vistas).slice(0, 5);
  const sinTocar = ind.ejercicios.filter((e) => e.intentaron === 0).length;
  const href = (extra: Partial<Sp>) => {
    const p = new URLSearchParams();
    const merged = { orden: sp.orden, estado: sp.estado, q: sp.q, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/profesor/curso/${curso.id}${s ? `?${s}` : ''}`;
  };
  const exp = (tipo: string) => `/profesor/export?curso=${curso.id}&tipo=${tipo}`;

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <p className="eyebrow"><Link href={cerrado ? '/profesor?historico=1' : '/profesor'}>← {cerrado ? 'Histórico' : 'Mis cursos'}</Link> · {curso.periodo.nombre}{cerrado ? ' (cerrado)' : ''}</p>
          <h1>{curso.nombre} <span className="muted">· NRC {curso.nrc}</span></h1>
          <p className="muted">{curso.profesor ? `Profesor/a: ${curso.profesor.nombre} ${curso.profesor.apellido}` : 'Sin profesor asignado'} · {ind.disponibles} ejercicios habilitados</p>
        </div>
        <div className="row">
          <Link className="btn btn-sm btn-primary" href={`/profesor/curso/${curso.id}/informe`}>Informe imprimible (PDF)</Link>
          <a className="btn btn-sm" href={exp('alumnos')}>Descargar estudiantes</a>
          <a className="btn btn-sm" href={exp('matriz')}>Matriz de puntajes</a>
          <a className="btn btn-sm" href={exp('semanas')}>Por semana</a>
          <a className="btn btn-sm" href={exp('ejercicios')}>Por ejercicio</a>
        </div>
      </div>

      <section className="kpis">
        <Kpi valor={r.alumnos} titulo="estudiantes" detalle={`${r.nuncaIngresaron} nunca ingresaron`} />
        <Kpi valor={r.activos7} titulo="conectados (7 días)" detalle={`${r.alumnos ? Math.round((r.activos7 / r.alumnos) * 100) : 0}% del curso`} tono="good" />
        <Kpi valor={`${r.participacion}%`} titulo="participación media" detalle={`${r.sinIntentos} sin ningún intento`} />
        <Kpi valor={`${r.avance}%`} titulo="avance medio" detalle="ejercicios logrados (≥ 60 %)" />
        <Kpi valor={`${r.promedio}%`} titulo="promedio de puntaje" />
        <Kpi valor={r.enRiesgo} titulo="en riesgo" detalle="más de 14 días sin conectarse" tono={r.enRiesgo ? 'low' : 'good'} />
      </section>

      <section className="grid-2 dash-grid">
        <div className="card">
          <h3>Actividad de los últimos 30 días</h3>
          <p className="muted">Intentos enviados por día ({r.intentosTotales} en total, {r.conRespuestasVistas} estudiantes vieron alguna respuesta).</p>
          <GraficoActividad datos={ind.actividad} />
        </div>
        <div className="card">
          <h3>Distribución del avance</h3>
          <p className="muted">Cantidad de estudiantes según el % de ejercicios logrados.</p>
          <Histograma datos={ind.distribucion} />
        </div>
      </section>

      <section className="card scroll-x">
        <h3>Avance por semana</h3>
        <p className="muted">Promedio del curso: participación = ejercicios intentados; avance = ejercicios logrados (≥ 60 %); promedio = mejor puntaje por ejercicio.</p>
        <table className="table">
          <thead><tr><th>Semana</th><th>Ejercicios</th><th>Participación</th><th>Avance</th><th>Promedio</th></tr></thead>
          <tbody>
            {ind.semanas.map((s) => (
              <tr key={s.n}>
                <td><b>S{s.n}</b> · {s.title}</td>
                <td>{s.total || <span className="muted">deshabilitada</span>}</td>
                <td>{s.total ? <Barra valor={s.participacion} /> : '—'}</td>
                <td>{s.total ? <Barra valor={s.avance} /> : '—'}</td>
                <td>{s.total ? `${s.promedio}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card scroll-x">
        <div className="row-between">
          <h3>Estudiantes</h3>
          <form className="row" action={`/profesor/curso/${curso.id}`}>
            <input name="q" defaultValue={sp.q ?? ''} placeholder="Buscar por nombre o correo" className="mini wide" />
            {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
            {sp.orden && <input type="hidden" name="orden" value={sp.orden} />}
            <button className="btn btn-sm">Buscar</button>
          </form>
        </div>
        <div className="row filters">
          <Link href={href({ estado: undefined })} className={`pill${!filtroEstado ? ' good' : ''}`}>Todos ({ind.alumnos.length})</Link>
          {(['activo', 'inactivo', 'riesgo', 'nunca'] as Estado[]).map((e) => (
            <Link key={e} href={href({ estado: e })} className={`pill${filtroEstado === e ? ' good' : ''}`}>
              {{ activo: 'Activos (≤ 7 d)', inactivo: 'Inactivos (8–14 d)', riesgo: 'En riesgo (> 14 d)', nunca: 'Nunca ingresaron' }[e]} ({ind.alumnos.filter((a) => a.estado === e).length})
            </Link>
          ))}
        </div>
        <div className="row filters">
          <span className="muted">Ordenar por:</span>
          {Object.entries(ORDENES).map(([k, v]) => (
            <Link key={k} href={href({ orden: k })} className={`pill${orden === k ? ' good' : ''}`}>{v}</Link>
          ))}
        </div>
        <table className="table dash-table">
          <thead>
            <tr>
              <th>Estudiante</th><th>Última conexión</th><th>Estado</th><th>Participación</th><th>Avance</th><th>Prom.</th>
              {WEEKS.map((w) => <th key={w.n} title={`Semana ${w.n}: ${w.title}`} className="c">S{w.n}</th>)}
              <th title="Respuestas vistas">Vistas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.id} className={a.activo ? '' : 'off'}>
                <td><Link href={`/profesor/curso/${curso.id}/alumno/${a.id}`}><b>{a.apellido}, {a.nombre}</b></Link><br /><small className="muted">{a.email}</small></td>
                <td><span suppressHydrationWarning>{fmtFecha(a.ultimaConexion)}</span><br /><small className="muted">{hace(a.diasSinConexion)} · {a.ingresos} ingresos</small></td>
                <td><EstadoPill estado={a.estado} /></td>
                <td><Barra valor={a.participacion} /></td>
                <td><Barra valor={a.avance} /></td>
                <td>{a.promedio}%</td>
                {a.semanas.map((s) => (
                  <td key={s.n} className={`heat ${heatClass(s.avance, s.total)}`} title={s.total ? `Semana ${s.n}: ${s.logrados}/${s.total} logrados · promedio ${s.promedio}%` : 'Semana deshabilitada'}>
                    {s.total ? s.avance : '·'}
                  </td>
                ))}
                <td>{a.vistas || <span className="muted">0</span>}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={WEEKS.length + 7} className="muted">No hay estudiantes con este filtro.</td></tr>}
          </tbody>
        </table>
        <p className="muted">Las celdas S1…S13 muestran el % de ejercicios logrados de cada semana (mapa de calor: rojo bajo, ámbar medio, verde alto).</p>
      </section>

      <section className="grid-2 dash-grid">
        <div className="card scroll-x">
          <h3>Ejercicios más difíciles</h3>
          <p className="muted">Menor % de estudiantes que los logran, entre los ya intentados. {sinTocar > 0 && `${sinTocar} ejercicios aún no han sido intentados por nadie.`}</p>
          <table className="table">
            <thead><tr><th>Ejercicio</th><th>Logro</th><th>Intentos</th></tr></thead>
            <tbody>
              {dificiles.map((e) => (
                <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td><Barra valor={e.logro} /></td><td>{e.intentosMedios}</td></tr>
              ))}
              {dificiles.length === 0 && <tr><td colSpan={3} className="muted">Sin datos todavía.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card scroll-x">
          <h3>Ejercicios con más respuestas vistas</h3>
          <p className="muted">Quien ve la respuesta pierde el puntaje: sirve para detectar enunciados confusos.</p>
          <table className="table">
            <thead><tr><th>Ejercicio</th><th>Vistas</th><th>Lo lograron</th></tr></thead>
            <tbody>
              {masVistas.map((e) => (
                <tr key={e.slug}><td><small className="muted">S{e.week}</small> {e.title}</td><td><b>{e.vistas}</b></td><td>{e.lograron}</td></tr>
              ))}
              {masVistas.length === 0 && <tr><td colSpan={3} className="muted">Nadie ha visto respuestas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
