import Link from 'next/link';
import { notFound } from 'next/navigation';
import ExercisePlayer from '@/components/ExercisePlayer';
import { requireUser } from '@/lib/auth';
import { EXERCISES, typeLabel, WEEKS, getExercise, getToggles, isExerciseEnabled, isWeekEnabled, toPublic } from '@/lib/content';
import { db } from '@/lib/db';
import { solutionOf } from '@/lib/solution';
import type { Feedback } from '@/lib/types';

const inline = (s: string) =>
  s.split(/(`[^`]+`)/g).map((part, i) => (part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : <span key={i}>{part}</span>));

const TIPS: Partial<Record<string, string>> = {
  ER: 'Arrastra las formas desde la paleta, conéctalas y haz clic en cada línea entre una entidad y una relación para indicar su cardinalidad (mín,máx). El corrector siempre revisa el máximo; el mínimo solo cuando el enunciado lo indica.',
  EER: 'Arrastra las formas desde la paleta, conéctalas y define cada especialización (d/o, total/parcial). El corrector siempre revisa el máximo de las cardinalidades; el mínimo solo cuando el enunciado lo indica.',
  TRANSFORMACION: 'Crea una tabla por cada elemento que corresponda; marca las claves primarias (PK) y elige a qué tabla apunta cada clave foránea. Se aceptan las variantes válidas vistas en clase.',
  NORMALIZACION: 'Arrastra los atributos a tus tablas y haz clic en un atributo dentro de la tabla para marcarlo como clave primaria.',
  SQL_DDL: 'Tu script se ejecuta en un MySQL real; se compara la estructura creada con la esperada. Puedes probar tu script antes en el Laboratorio MySQL.',
};

export default async function EjercicioPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const ex = getExercise((await params).slug);
  if (!ex) notFound();
  const toggles = await getToggles();
  const isAdmin = user.rol !== 'ESTUDIANTE';
  if ((!isExerciseEnabled(toggles, ex) || !isWeekEnabled(toggles, ex.week)) && !isAdmin) notFound();

  const week = WEEKS.find((w) => w.n === ex.week)!;
  const sameWeek = EXERCISES.filter((e) => e.week === ex.week && (isExerciseEnabled(toggles, e) || isAdmin));
  const idx = sameWeek.findIndex((e) => e.slug === ex.slug);
  const prev = idx > 0 ? sameWeek[idx - 1] : null;
  const next = idx >= 0 && idx < sameWeek.length - 1 ? sameWeek[idx + 1] : null;

  const intentos = await db.intento.findMany({ where: { userId: user.id, exerciseSlug: ex.slug }, orderBy: { creadoEn: 'desc' }, take: 30 });
  const last = intentos[0];
  const visto = await db.respuestaVista.findUnique({ where: { userId_exerciseSlug: { userId: user.id, exerciseSlug: ex.slug } } });

  return (
    <div className="stack-lg">
      <nav className="crumbs">
        <Link href="/panel">Inicio</Link> / <Link href={`/panel/semana/${week.n}`}>Semana {week.n}</Link> / {ex.title}
      </nav>
      <header className="ex-head">
        <div>
          <p className="eyebrow"><span className={`type-chip t-${ex.type}`}>{typeLabel(ex)}</span> Ejercicio {idx + 1} de {sameWeek.length} · Semana {week.n}</p>
          <h1>{ex.title}</h1>
        </div>
        <div className="pager">
          {prev ? <Link href={`/panel/ejercicio/${prev.slug}`} className="btn btn-sm" title={prev.title}>← Anterior</Link> : <span />}
          {next ? <Link href={`/panel/ejercicio/${next.slug}`} className="btn btn-sm" title={next.title}>Siguiente →</Link> : <span />}
        </div>
      </header>

      <section className="card statement" aria-label="Enunciado">
        {ex.statement.map((p, i) => (
          <p key={i}>{inline(p)}</p>
        ))}
        {TIPS[ex.type] && <p className="tip"><b>Cómo se resuelve:</b> {TIPS[ex.type]}</p>}
      </section>

      <ExercisePlayer
        exercise={toPublic(ex)}
        lastAnswer={last?.respuesta ?? null}
        lastFeedback={(last?.feedback as Feedback | undefined) ?? null}
        history={intentos.map((i) => ({ id: i.id, puntaje: i.puntaje, creadoEn: i.creadoEn.toISOString() }))}
        next={next ? { href: `/panel/ejercicio/${next.slug}`, title: next.title } : null}
        weekHref={`/panel/semana/${week.n}`}
        solution={visto ? solutionOf(ex) : null}
      />
    </div>
  );
}
