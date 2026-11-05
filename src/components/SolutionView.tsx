'use client';

import dynamic from 'next/dynamic';
import type { PublicExercise, PublicSolution } from '@/lib/types';
import { SqlCode } from './SqlCode';

const ErView = dynamic(() => import('./er/ErView'), { ssr: false, loading: () => <p className="muted">Cargando diagrama…</p> });

/** Solución de un ejercicio (solo lectura), mostrada después de «Ver respuesta». */
export default function SolutionView({ exercise, solution }: { exercise: PublicExercise; solution: PublicSolution }) {
  if (solution.kind === 'quiz') {
    return (
      <ol className="quiz">
        {(exercise.questions ?? []).map((q, qi) => {
          const s = solution.answers[q.id];
          return (
            <li key={q.id} className="card">
              <p className="q-text"><b>{qi + 1}.</b> {q.text}</p>
              <div className="stack-sm">
                {q.options.map((o, oi) => (
                  <div key={oi} className={`opt${s?.answer === oi ? ' on correct' : ''}`}>
                    <span>{s?.answer === oi ? '✓ ' : ''}{o}</span>
                  </div>
                ))}
              </div>
              {s?.explanation && <p className="muted sol-expl">{s.explanation}</p>}
            </li>
          );
        })}
      </ol>
    );
  }
  if (solution.kind === 'model') return <ErView model={solution.model} height={560} />;
  return (
    <div className="stack">
      {solution.blocks.map((b, i) => (
        <div key={i} className="card">
          {b.label && <p className="muted"><b>{b.label}</b></p>}
          {b.sql ? <SqlCode code={b.code} /> : <pre className="sol-code">{b.code}</pre>}
        </div>
      ))}
    </div>
  );
}
