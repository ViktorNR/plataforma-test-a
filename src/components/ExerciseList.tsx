'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface ExerciseRow {
  n: number;
  slug: string;
  title: string;
  typeKey: string;
  typeLabel: string;
  best: number | null;
  hidden?: boolean;
}

const PASS = 60;
type Filter = 'todos' | 'pendientes' | 'mejorar' | 'logrados';

export default function ExerciseList({ rows }: { rows: ExerciseRow[] }) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [q, setQ] = useState('');

  const counts = useMemo(
    () => ({
      todos: rows.length,
      pendientes: rows.filter((r) => r.best === null).length,
      mejorar: rows.filter((r) => r.best !== null && r.best < PASS).length,
      logrados: rows.filter((r) => r.best !== null && r.best >= PASS).length,
    }),
    [rows],
  );
  const shown = rows.filter((r) => {
    if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'pendientes') return r.best === null;
    if (filter === 'mejorar') return r.best !== null && r.best < PASS;
    if (filter === 'logrados') return r.best !== null && r.best >= PASS;
    return true;
  });

  const chip = (f: Filter, label: string) => (
    <button type="button" className={`chip-f${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)} aria-pressed={filter === f}>
      {label} <b>{counts[f]}</b>
    </button>
  );

  return (
    <div className="stack">
      <div className="list-tools">
        <div className="chips-f" role="group" aria-label="Filtrar ejercicios">
          {chip('todos', 'Todos')}
          {chip('pendientes', 'Pendientes')}
          {chip('mejorar', 'Por mejorar')}
          {chip('logrados', 'Logrados')}
        </div>
        <input type="search" placeholder="Buscar ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" className="search" />
      </div>
      <ol className="ex-rows">
        {shown.map((r) => (
          <li key={r.slug}>
            <Link href={`/panel/ejercicio/${r.slug}`} className="ex-row">
              <span className={`ex-n${r.best === null ? '' : r.best >= PASS ? ' done' : ' retry'}`}>{r.best !== null && r.best >= PASS ? '✓' : r.n}</span>
              <span className="ex-main">
                <b>{r.title}</b>
                <small>{r.typeLabel}{r.hidden ? ' · oculto a estudiantes' : ''}</small>
              </span>
              <span className={`pill${r.best === null ? '' : r.best >= 85 ? ' good' : r.best >= PASS ? ' mid' : ' low'}`}>{r.best === null ? 'Pendiente' : `${r.best}%`}</span>
              <span className="go" aria-hidden>→</span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && <li className="muted pad">No hay ejercicios con ese filtro.</li>}
      </ol>
    </div>
  );
}
