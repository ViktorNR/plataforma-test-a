'use client';

import { useState } from 'react';
import SqlCodeEditor from './SqlCode';
import type { ExecOutcome } from '@/lib/sqlexec';
import type { PublicExercise } from '@/lib/types';

type Spec = NonNullable<PublicExercise['sqlwork']>;

const HINT: Record<Spec['kind'], string> = {
  query: 'Escribe una consulta SELECT. Se compara el resultado con el esperado (no importa el nombre de las columnas).',
  dml: 'Escribe las sentencias (INSERT, UPDATE, DELETE, ALTER…). Se compara el estado final de las tablas con el esperado.',
  routine: 'Escribe la vista, el procedimiento o la función (puedes usar DELIMITER). Se prueba con llamadas y se compara la salida.',
};

/** Editor SQL con esquema de la base, botón «Ejecutar» (sin puntaje) y la corrección en `ExercisePlayer`. */
export default function SqlWork({ slug, spec, initial, onChange }: { slug: string; spec: Spec; initial?: string; onChange: (script: string) => void }) {
  const [script, setScript] = useState(initial ?? '');
  const [results, setResults] = useState<ExecOutcome[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function run(slug: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/sql/probar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, script }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo ejecutar');
      if (data.error) setError(data.error);
      setResults(data.results);
      const i = data.results.findIndex((r: ExecOutcome) => r.kind === 'error');
      setActive(i >= 0 ? i : Math.max(0, data.results.length - 1));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cur = results[active];
  const set = cur?.sets[cur.sets.length - 1];

  return (
    <div className="sqlwork">
      <aside className="card sw-schema">
        <h4>Base de datos: {spec.dbTitle}</h4>
        <p className="muted sw-db"><code>USE {spec.db};</code> (ya está seleccionada)</p>
        <div className="wb-tree">
          {spec.schema.map((t) => (
            <div key={t.name}>
              <div className="wb-node">
                <button type="button" className="wb-twist" onClick={() => setOpen((o) => ({ ...o, [t.name]: !o[t.name] }))} aria-label="Ver columnas">{open[t.name] ? '▾' : '▸'}</button>
                <button type="button" className="wb-name" onClick={() => setOpen((o) => ({ ...o, [t.name]: !o[t.name] }))}>▦ {t.name}</button>
              </div>
              {open[t.name] && (
                <ul className="wb-cols">
                  {t.columns.map((c) => (
                    <li key={c.name}>
                      {c.pk && <b className="pk">PK</b>}
                      {c.fk && <b className="fk" title={`→ ${c.fk}`}>FK</b>}
                      {c.name} <small>{c.type.toLowerCase()}{c.fk ? ` → ${c.fk}` : ''}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="stack">
        <p className="muted">{HINT[spec.kind]}</p>
        <SqlCodeEditor
          className="code wb-editor"
          spellCheck={false}
          value={script}
          placeholder={spec.kind === 'query' ? 'SELECT ...' : '-- tu respuesta SQL'}
          onChange={(e) => {
            setScript(e.target.value);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const el = e.currentTarget;
              const s = el.selectionStart;
              const next = script.slice(0, s) + '  ' + script.slice(el.selectionEnd);
              setScript(next);
              onChange(next);
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
              e.preventDefault();
              run(slug);
            }
          }}
          aria-label="Editor SQL"
        />
        <div className="row">
          <button type="button" className="btn" onClick={() => run(slug)} disabled={busy || !script.trim()}>
            {busy ? 'Ejecutando…' : '▶ Ejecutar (sin puntaje)'}
          </button>
          <span className="muted hint">Ctrl + Shift + Enter · prueba tu consulta sobre una copia de la base antes de corregir</span>
        </div>
        {error && <p className="err">{error}</p>}

        {results.length > 0 && (
          <div className="wb-results card">
            <div className="wb-sets">
              {results.map((r, i) => (
                <button key={i} type="button" className={`wb-set ${r.kind}${i === active ? ' on' : ''}`} onClick={() => setActive(i)} title={r.sql}>
                  {i + 1}. {r.kind === 'rows' ? `${r.sets[r.sets.length - 1]?.rows.length ?? 0} filas` : r.kind === 'ok' ? 'OK' : 'Error'}
                </button>
              ))}
            </div>
            {cur && (
              <div className="pad">
                <p className="wb-sql"><code>{cur.sql.replace(/\s+/g, ' ').slice(0, 160)}</code></p>
                {cur.kind === 'rows' && set && (
                  <div className="wb-grid">
                    <table>
                      <thead>
                        <tr>
                          <th className="idx">#</th>
                          {set.columns.map((c, k) => <th key={k}>{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {set.rows.map((row, ri) => (
                          <tr key={ri}>
                            <td className="idx">{ri + 1}</td>
                            {row.map((v, ci) => <td key={ci} className={v === null ? 'null' : typeof v === 'number' ? 'num' : ''}>{v === null ? 'NULL' : String(v)}</td>)}
                          </tr>
                        ))}
                        {set.rows.length === 0 && <tr><td colSpan={set.columns.length + 1} className="muted">Sin filas.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={`wb-msg ${cur.kind}`}>
                  {cur.kind === 'error' ? `✖ ${cur.message}` : cur.kind === 'rows' ? `✔ ${set?.rows.length ?? 0} fila(s) devuelta(s)` : `✔ OK, ${cur.affected ?? 0} fila(s) afectada(s)`} <small>· {cur.ms} ms</small>
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
