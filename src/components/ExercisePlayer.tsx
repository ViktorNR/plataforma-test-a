'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Feedback, PublicExercise, PublicSolution, StudentNorm, StudentSchema } from '@/lib/types';
import SolutionView from './SolutionView';
import FeedbackPanel from './FeedbackPanel';
import NormBuilder from './NormBuilder';
import Quiz from './Quiz';
import SchemaBuilder from './SchemaBuilder';
import SqlEditor from './SqlEditor';
import SqlWork from './SqlWork';
import type { DiagramAnswer } from './er/ErEditor';

const ErEditor = dynamic(() => import('./er/ErEditor'), { ssr: false, loading: () => <p className="muted">Cargando lienzo…</p> });

export interface HistoryItem {
  id: number;
  puntaje: number;
  creadoEn: string;
}

export default function ExercisePlayer({
  exercise,
  lastAnswer,
  lastFeedback,
  history,
  next,
  weekHref,
  solution: initialSolution,
}: {
  exercise: PublicExercise;
  lastAnswer: unknown;
  lastFeedback: Feedback | null;
  history: HistoryItem[];
  next: { href: string; title: string } | null;
  weekHref: string;
  /** Presente solo si el estudiante ya pidió «Ver respuesta» (ejercicio bloqueado). */
  solution: PublicSolution | null;
}) {
  const [solution, setSolution] = useState<PublicSolution | null>(initialSolution);
  const answer = useRef<unknown>(lastAnswer ?? undefined);
  const [feedback, setFeedback] = useState<Feedback | null>(lastFeedback);
  const [hist, setHist] = useState<HistoryItem[]>(history);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const set = (v: unknown) => {
    answer.current = v;
    setDirty(true);
  };

  // Avisa si hay cambios sin corregir al cerrar la pestaña.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function submit() {
    setError('');
    if (answer.current === undefined) {
      setError('Aún no has respondido nada.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/intentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: exercise.slug, respuesta: answer.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo corregir');
      setFeedback(data.feedback);
      setDirty(false);
      setHist((h) => [{ id: data.intentoId, puntaje: data.feedback.score, creadoEn: new Date().toISOString() }, ...h]);
      requestAnimationFrame(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function showAnswer() {
    if (!window.confirm('Si ves la respuesta, este ejercicio quedará con 0 % de puntaje y bloqueado: no podrás volver a resolverlo. ¿Quieres verla de todos modos?')) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/respuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: exercise.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo mostrar la respuesta');
      setDirty(false);
      setSolution(data.solution);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const la = lastAnswer as never;
  const best = hist.length ? Math.max(...hist.map((h) => h.puntaje)) : null;

  if (solution) {
    return (
      <div className="stack-lg">
        <div className="card locked-note" role="status">
          <b>Viste la respuesta de este ejercicio.</b> Quedó con <b>0 %</b> de puntaje y bloqueado: solo puedes revisar el enunciado y la respuesta.
        </div>
        <SolutionView exercise={exercise} solution={solution} />
        <div className="after">
          {next ? <Link href={next.href} className="btn btn-primary">Siguiente: {next.title} →</Link> : <Link href={weekHref} className="btn btn-primary">Volver a la semana →</Link>}
          {next && <Link href={weekHref} className="btn">Ver todos los ejercicios</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="stack-lg" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !busy) { e.preventDefault(); submit(); } }}>
      {exercise.type === 'QUIZ' && <Quiz questions={exercise.questions!} initial={(la as { answers?: Record<string, number> } | null)?.answers} onChange={(answers) => set({ answers })} />}
      {(exercise.type === 'ER' || exercise.type === 'EER') && (
        <ErEditor extended={exercise.type === 'EER'} initial={la as DiagramAnswer | undefined} onChange={(d) => set(d)} />
      )}
      {exercise.type === 'TRANSFORMACION' && <SchemaBuilder model={exercise.model!} initial={la as StudentSchema | undefined} onChange={(s) => set(s)} />}
      {exercise.type === 'NORMALIZACION' && <NormBuilder problem={exercise.problem!} initial={la as StudentNorm | undefined} onChange={(s) => set(s)} />}
      {exercise.type === 'SQL_DDL' && <SqlEditor dbName={exercise.dbName!} initial={(la as { script?: string } | null)?.script} onChange={(script) => set({ script })} />}
      {exercise.type === 'SQL_WORK' && <SqlWork slug={exercise.slug} spec={exercise.sqlwork!} initial={(la as { script?: string } | null)?.script} onChange={(script) => set({ script })} />}

      <div className="actionbar">
        <button type="button" className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>
          {busy ? 'Corrigiendo…' : 'Corregir mi respuesta'}
        </button>
        <button type="button" className="btn" onClick={showAnswer} disabled={busy} title="Verás la solución, pero el ejercicio quedará con 0 % y bloqueado">
          Ver respuesta
        </button>
        <span className="muted hint">Ctrl + Enter</span>
        {dirty && !busy && <span className="unsaved">● Cambios sin corregir</span>}
        {error && <span className="err">{error}</span>}
        <span className="grow" />
        {best !== null && <span className="muted">Intentos: <b>{hist.length}</b> · Mejor: <b>{best}%</b></span>}
      </div>

      <div id="resultado">
        {feedback && (
          <>
            <FeedbackPanel feedback={feedback} />
            <div className="after">
              {next ? (
                <Link href={next.href} className="btn btn-primary">Siguiente: {next.title} →</Link>
              ) : (
                <Link href={weekHref} className="btn btn-primary">Volver a la semana →</Link>
              )}
              {next && <Link href={weekHref} className="btn">Ver todos los ejercicios</Link>}
              <span className="muted">Puedes corregir tu respuesta y volver a intentarlo.</span>
            </div>
          </>
        )}
      </div>

      {hist.length > 0 && (
        <details className="card">
          <summary>Historial de intentos ({hist.length})</summary>
          <ul className="history">
            {hist.map((h) => (
              <li key={h.id}>
                <time dateTime={h.creadoEn} suppressHydrationWarning>{new Date(h.creadoEn).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</time>
                <b>{h.puntaje}%</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
