import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Barra, EstadoPill, Kpi, heatClass } from '@/components/Dash';
import { requireProfesor } from '@/lib/auth';
import { EXERCISES, WEEKS, exercisesOfWeek, isExerciseEnabled, getToggles } from '@/lib/content';
import { cursoAccesible } from '@/lib/cursos';
import { db } from '@/lib/db';
import { calcularIndicadores, fmtFecha, hace } from '@/lib/indicadores';
import { PASS } from '@/lib/progress';

export default async function AlumnoPage({ params }: { params: Promise<{ id: string; uid: string }> }) {
  const user = await requireProfesor();
  const { id, uid } = await params;
  const curso = await cursoAccesible(user, Number(id));
  if (!curso) notFound();
  const alumnoId = Number(uid);
  const alumno = await db.user.findFirst({ where: { id: alumnoId, cursoId: curso.id, rol: 'ESTUDIANTE' } });
  if (!alumno) notFound();

  const [{ alumnos }, toggles, porEjercicio, ultimos] = await Promise.all([
    calcularIndicadores([alumno.id]),
    getToggles(),
    db.intento.groupBy({ by: ['exerciseSlug'], where: { userId: alumno.id }, _count: { _all: true }, _max: { creadoEn: true } }),
    db.intento.findMany({ where: { userId: alumno.id }, orderBy: { creadoEn: 'desc' }, take: 12, select: { exerciseSlug: true, puntaje: true, creadoEn: true } }),
  ]);
  const a = alumnos[0];
  const intentos = new Map(porEjercicio.map((g) => [g.exerciseSlug, g]));
  const titulo = (slug: string) => EXERCISES.find((e) => e.slug === slug)?.title ?? slug;
  const cerrado = !curso.periodo.activo;

  return (
    <div className="stack-lg">
      <div>
        <p className="eyebrow"><Link href={`/profesor/curso/${curso.id}`}>← {curso.nombre} · NRC {curso.nrc}</Link> · {curso.periodo.nombre}{cerrado ? ' (cerrado)' : ''}</p>
        <h1>{a.nombre} {a.apellido}</h1>
        <p className="muted">{a.email} · <EstadoPill estado={a.estado} /> · última conexión <span suppressHydrationWarning>{fmtFecha(a.ultimaConexion)}</span> ({hace(a.diasSinConexion)})</p>
      </div>

      <section className="kpis">
        <Kpi valor={a.ingresos} titulo="ingresos a la plataforma" />
        <Kpi valor={a.intentos} titulo="intentos enviados" detalle={`último: ${fmtFecha(a.ultimoIntento)}`} />
        <Kpi valor={`${a.participacion}%`} titulo="participación" detalle={`${a.intentados} ejercicios intentados`} />
        <Kpi valor={`${a.avance}%`} titulo="avance" detalle={`${a.logrados} logrados (≥ ${PASS} %)`} />
        <Kpi valor={`${a.promedio}%`} titulo="promedio de puntaje" />
        <Kpi valor={a.vistas} titulo="respuestas vistas" tono={a.vistas ? 'mid' : undefined} />
      </section>

      <section className="weeks">
        {WEEKS.map((w, i) => {
          const s = a.semanas[i];
          if (!s.total) return null;
          const exs = exercisesOfWeek(w.n).filter((e) => isExerciseEnabled(toggles, e));
          return (
            <article key={w.n} className="card">
              <div className="row-between">
                <h3>Semana {w.n} · {w.title}</h3>
                <span className={`heat-chip ${heatClass(s.avance, s.total)}`}>{s.avance}%</span>
              </div>
              <Barra valor={s.avance} />
              <p className="muted">{s.logrados} de {s.total} logrados · {s.intentados} intentados · promedio {s.promedio}%</p>
              <table className="table compact">
                <tbody>
                  {exs.map((e) => {
                    const visto = a.vistosSlugs.includes(e.slug);
                    const p = a.puntajes[e.slug];
                    const g = intentos.get(e.slug);
                    return (
                      <tr key={e.slug}>
                        <td>{e.title}</td>
                        <td>{visto ? <span className="pill mid">Vio respuesta</span> : p === undefined ? <span className="muted">Sin intentar</span> : <span className={`pill ${p >= PASS ? 'good' : 'low'}`}>{Math.round(p)}%</span>}</td>
                        <td className="muted">{g ? `${g._count._all} int.` : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          );
        })}
      </section>

      <section className="card scroll-x">
        <h3>Últimos intentos</h3>
        <table className="table">
          <thead><tr><th>Fecha</th><th>Ejercicio</th><th>Puntaje</th></tr></thead>
          <tbody>
            {ultimos.map((u, i) => (
              <tr key={i}><td suppressHydrationWarning>{fmtFecha(u.creadoEn)}</td><td>{titulo(u.exerciseSlug)}</td><td>{Math.round(u.puntaje)}%</td></tr>
            ))}
            {ultimos.length === 0 && <tr><td colSpan={3} className="muted">Sin intentos todavía.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
