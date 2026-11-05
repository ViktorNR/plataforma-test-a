import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExerciseList from '@/components/ExerciseList';
import { requireUser } from '@/lib/auth';
import { typeLabel, WEEKS, exercisesOfWeek, getToggles, isExerciseEnabled, isWeekEnabled } from '@/lib/content';
import { PASS, average, bestScores } from '@/lib/progress';

export default async function SemanaPage({ params }: { params: Promise<{ n: string }> }) {
  const user = await requireUser();
  const { n } = await params;
  const week = WEEKS.find((w) => w.n === Number(n));
  if (!week) notFound();
  const toggles = await getToggles();
  const isAdmin = user.rol !== 'ESTUDIANTE';
  if (!isWeekEnabled(toggles, week.n) && !isAdmin) notFound();
  const mine = (await bestScores([user.id])).get(user.id) ?? new Map<string, number>();

  const exs = exercisesOfWeek(week.n).filter((e) => isExerciseEnabled(toggles, e) || isAdmin);
  const rows = exs.map((e, i) => ({
    n: i + 1,
    slug: e.slug,
    title: e.title,
    typeKey: e.type,
    typeLabel: typeLabel(e),
    best: mine.has(e.slug) ? Math.round(mine.get(e.slug)!) : null,
    hidden: !isExerciseEnabled(toggles, e),
  }));
  const done = rows.filter((r) => r.best !== null && r.best >= PASS).length;
  const pct = Math.round(average(exs.map((e) => mine.get(e.slug) ?? 0)));
  const prev = WEEKS.find((w) => w.n === week.n - 1);
  const nextW = WEEKS.find((w) => w.n === week.n + 1);

  return (
    <div className="stack-lg">
      <nav className="crumbs"><Link href="/panel">Inicio</Link> / Semana {week.n}</nav>
      <header className="page-head row-between">
        <div>
          <p className="eyebrow">Semana {week.n} · {week.indicators}</p>
          <h1>{week.title}</h1>
          <p className="lead">{week.short}</p>
        </div>
        <div className="hero-ring light">
          <div className="ring ring-lg" style={{ ['--p' as string]: pct }}><span>{pct}%</span></div>
          <small>{done} de {rows.length} logrados</small>
        </div>
      </header>

      <details className="card repaso" open>
        <summary>Para repasar antes de practicar</summary>
        <ul className="bullets">
          {week.summary.map((s, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
          ))}
        </ul>
      </details>

      <section className="stack">
        <h2>Ejercicios ({rows.length})</h2>
        <ExerciseList rows={rows} />
      </section>

      <nav className="pager">
        {prev ? <Link href={`/panel/semana/${prev.n}`} className="btn btn-sm">← Semana {prev.n}</Link> : <span />}
        {nextW ? <Link href={`/panel/semana/${nextW.n}`} className="btn btn-sm">Semana {nextW.n} →</Link> : <span />}
      </nav>
    </div>
  );
}
