import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { EXERCISES, typeLabel, WEEKS, exercisesOfWeek, getToggles, isExerciseEnabled, isWeekEnabled } from '@/lib/content';
import { PASS, average, bestScores } from '@/lib/progress';

export default async function PanelPage() {
  const user = await requireUser();
  const [toggles, scores] = await Promise.all([getToggles(), bestScores([user.id])]);
  const mine = scores.get(user.id) ?? new Map<string, number>();
  const isAdmin = user.rol !== 'ESTUDIANTE'; // administración y docentes ven todo el contenido

  const weeks = WEEKS.filter((w) => isWeekEnabled(toggles, w.n) || isAdmin);
  const available = (week?: number) => EXERCISES.filter((e) => (week ? e.week === week : true) && (isExerciseEnabled(toggles, e) || isAdmin) && (isWeekEnabled(toggles, e.week) || isAdmin));
  const all = available();
  const done = all.filter((e) => (mine.get(e.slug) ?? -1) >= PASS).length;
  const overall = Math.round(average(all.map((e) => mine.get(e.slug) ?? 0)));

  const next = all.find((e) => !mine.has(e.slug)) ?? all.find((e) => (mine.get(e.slug) ?? 0) < PASS);
  const attempted = all.filter((e) => mine.has(e.slug)).length;

  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow light">{user.periodo ? user.periodo.nombre : 'Base de Datos · ATDF103'}</p>
          <h1>Hola, {user.nombre} 👋</h1>
          <p>
            {attempted === 0
              ? 'Bienvenido/a. Elige una semana, resuelve los ejercicios y recibe corrección al instante. Puedes reintentar cuantas veces quieras.'
              : `Llevas ${done} de ${all.length} ejercicios logrados (≥ ${PASS}%). ¡Sigue así!`}
          </p>
          {next && (
            <Link href={`/panel/ejercicio/${next.slug}`} className="btn btn-primary btn-lg">
              {attempted === 0 ? 'Empezar' : 'Continuar'}: {next.title} →
            </Link>
          )}
        </div>
        <div className="hero-ring" title="Promedio de tus mejores puntajes">
          <div className="ring ring-lg" style={{ ['--p' as string]: overall }}><span>{overall}%</span></div>
          <small>avance general</small>
        </div>
      </section>

      <section className="tools">
        <Link href="/panel/laboratorio" className="tool card">
          <span className="tool-ic" aria-hidden>⌗</span>
          <span>
            <b>Laboratorio MySQL</b>
            <small>Crea bases de datos, consultas, vistas y procedimientos. Sin puntaje.</small>
          </span>
          <span className="go" aria-hidden>→</span>
        </Link>
        <Link href="/panel/lienzo" className="tool card">
          <span className="tool-ic red" aria-hidden>◇</span>
          <span>
            <b>Realiza tu diseño de modelo Entidad-Relación</b>
            <small>Un lienzo limpio para diseñar lo que quieras y descargarlo.</small>
          </span>
          <span className="go" aria-hidden>→</span>
        </Link>
      </section>

      <section className="stack">
        <div className="row-between">
          <h2>Semanas</h2>
          <span className="muted">Un ejercicio se considera logrado con {PASS}% o más</span>
        </div>
        <div className="weeks">
          {weeks.map((w) => {
            const exs = available(w.n);
            const wkDone = exs.filter((e) => (mine.get(e.slug) ?? -1) >= PASS).length;
            const pct = Math.round(average(exercisesOfWeek(w.n).map((e) => mine.get(e.slug) ?? 0)));
            const nextInWeek = exs.find((e) => !mine.has(e.slug)) ?? exs.find((e) => (mine.get(e.slug) ?? 0) < PASS);
            const types = [...new Set(exs.map((e) => typeLabel(e)))].join(' · ');
            return (
              <article key={w.n} className="card week-card">
                <div className="week-top">
                  <span className="week-n">Semana {w.n}</span>
                  <div className="ring" style={{ ['--p' as string]: pct }}><span>{pct}%</span></div>
                </div>
                <h3><Link href={`/panel/semana/${w.n}`}>{w.title}</Link></h3>
                <p className="muted">{w.short}</p>
                <p className="week-meta"><b>{wkDone}</b> de {exs.length} logrados · {types}</p>
                <div className="bar"><span className="bar-mid" style={{ width: `${(wkDone / Math.max(1, exs.length)) * 100}%` }} /></div>
                <div className="week-actions">
                  <Link href={`/panel/semana/${w.n}`} className="btn btn-sm">Ver ejercicios</Link>
                  {nextInWeek && <Link href={`/panel/ejercicio/${nextInWeek.slug}`} className="btn btn-sm btn-primary">{wkDone === 0 && !mine.size ? 'Empezar' : 'Continuar'}</Link>}
                </div>
              </article>
            );
          })}
          {weeks.length === 0 && <p className="muted">Todavía no hay semanas habilitadas.</p>}
        </div>
      </section>
    </div>
  );
}
