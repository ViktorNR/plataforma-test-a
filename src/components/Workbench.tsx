'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SqlCodeEditor from './SqlCode';
import { TEMPLATES } from '@/lib/sqltemplates/meta';
import { WB_EXAMPLES } from '@/lib/workbench-examples';
import type { RunResult, SchemaInfo, StatementResult } from '@/lib/workbench';

type LogEntry = { n: number; time: string; sql: string; kind: StatementResult['kind']; text: string; ms: number };

const STORAGE = 'bdplat.wb.script';
const DEFAULT_SCRIPT = `-- Escribe tus sentencias SQL y presiona «Ejecutar» (Ctrl + Enter).
-- Tip: carga la base «tienda_demo» desde el menú «Ejemplos» para practicar.

SELECT 'Hola MySQL' AS mensaje;
`;

const fmtTime = () => new Date().toLocaleTimeString('es-CL', { hour12: false });

function describe(r: StatementResult): string {
  if (r.kind === 'error') return r.message ?? 'Error';
  if (r.kind === 'skipped') return r.message ?? 'No ejecutada';
  if (r.kind === 'rows') return `${r.total ?? r.rows?.length ?? 0} fila(s) devuelta(s)${r.truncated ? ` (se muestran ${r.rows?.length})` : ''}`;
  return `OK, ${r.affected ?? 0} fila(s) afectada(s)${r.info ? ` · ${r.info}` : ''}`;
}

export default function Workbench() {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [database, setDatabase] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [results, setResults] = useState<StatementResult[]>([]);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<'resultados' | 'registro'>('resultados');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) setScript(saved);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, script);
      } catch {
        /* ignora */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [script]);

  const loadSchema = useCallback(async (db?: string | null) => {
    try {
      const res = await fetch(`/api/workbench/schema${db ? `?db=${encodeURIComponent(db)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSchema(data);
      setDatabase(data.database);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  const run = useCallback(
    async (selectionOnly: boolean) => {
      const ta = taRef.current;
      let text = script;
      if (ta && ta.selectionStart !== ta.selectionEnd && (selectionOnly || true)) text = script.slice(ta.selectionStart, ta.selectionEnd);
      if (!text.trim()) return;
      setBusy(true);
      setError('');
      try {
        const res = await fetch('/api/workbench/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: text, database }),
        });
        const data: RunResult & { error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'No se pudo ejecutar');
        setResults(data.statements);
        const firstRows = data.statements.findIndex((s) => s.kind === 'rows');
        const firstErr = data.statements.findIndex((s) => s.kind === 'error');
        setActive(firstErr >= 0 ? firstErr : firstRows >= 0 ? firstRows : 0);
        setTab('resultados');
        setLog((l) => [
          ...data.statements.map((s) => ({ n: ++counter.current, time: fmtTime(), sql: s.sql, kind: s.kind, text: describe(s), ms: s.ms })),
          ...l,
        ].slice(0, 300));
        setDatabase(data.database ?? database);
        await loadSchema(data.database ?? database);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [script, database, loadSchema],
  );

  const insert = (text: string) => {
    const ta = taRef.current;
    if (!ta) return setScript((s) => s + text);
    const { selectionStart: a, selectionEnd: b } = ta;
    const next = script.slice(0, a) + text + script.slice(b);
    setScript(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a + text.length, a + text.length);
    });
  };

  const [tplBusy, setTplBusy] = useState<string | null>(null);
  async function loadTpl(id: string, title: string) {
    if (schema?.databases.includes(id) && !confirm(`Ya tienes la base «${id}». Si la cargas de nuevo se reemplaza por la original (se pierden tus cambios en ella). ¿Continuar?`)) return;
    setTplBusy(id);
    setError('');
    try {
      const res = await fetch('/api/workbench/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar');
      setDatabase(id);
      await loadSchema(id);
      setScript((s) => (s.trim() && !s.startsWith('-- Escribe tus sentencias') ? s : `USE ${id};\n\n-- Base «${title}» cargada. Explora sus tablas en el panel izquierdo.\nSHOW TABLES;\n`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTplBusy(null);
    }
  }

  async function reset() {
    if (!confirm('Esto elimina TODAS tus bases de datos del laboratorio. ¿Continuar?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/workbench/schema', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setResults([]);
      setDatabase(null);
      await loadSchema();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const current = results[active];
  const hasErrors = results.some((r) => r.kind === 'error');

  return (
    <div className="wb">
      <aside className="wb-side card">
        <div className="row-between">
          <h4>Esquemas</h4>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => loadSchema(database)} title="Actualizar" aria-label="Actualizar esquemas">↻</button>
        </div>
        {schema && schema.databases.length === 0 && <p className="muted">Aún no tienes bases de datos. Carga un ejemplo o escribe <code>CREATE DATABASE mi_base;</code></p>}
        {schema && schema.databases.length > 0 && (
          <select
            value={database ?? ''}
            onChange={(e) => {
              setDatabase(e.target.value || null);
              loadSchema(e.target.value);
            }}
            aria-label="Base de datos activa"
          >
            {schema.databases.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        {schema?.database && (
          <div className="wb-tree">
            <p className="wb-group">Tablas y vistas ({schema.tables.length})</p>
            {schema.tables.map((t) => (
              <div key={t.name}>
                <div className="wb-node">
                  <button type="button" className="wb-twist" onClick={() => setOpen((o) => ({ ...o, [t.name]: !o[t.name] }))} aria-label="Ver columnas">{open[t.name] ? '▾' : '▸'}</button>
                  <button type="button" className="wb-name" onClick={() => insert(`SELECT * FROM ${t.name} LIMIT 100;\n`)} title="Insertar SELECT">
                    {t.type === 'VISTA' ? '👁 ' : '▦ '}
                    {t.name}
                  </button>
                </div>
                {open[t.name] && (
                  <ul className="wb-cols">
                    {t.columns.map((c) => (
                      <li key={c.name} onClick={() => insert(c.name)} title="Insertar nombre de columna">
                        {c.key === 'PRI' && <b className="pk">PK</b>}
                        {c.key === 'MUL' && <b className="fk">FK</b>}
                        {c.name} <small>{c.type}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {schema.routines.length > 0 && <p className="wb-group">Rutinas ({schema.routines.length})</p>}
            {schema.routines.map((r) => (
              <button key={r.name} type="button" className="wb-name" onClick={() => insert(r.type === 'PROCEDIMIENTO' ? `CALL ${r.name}();\n` : `SELECT ${r.name}();\n`)}>
                ƒ {r.name} <small>{r.type.toLowerCase()}</small>
              </button>
            ))}
          </div>
        )}
        <details className="wb-tpl" open={!schema?.databases.length}>
          <summary>Bases de ejemplo</summary>
          <p className="muted wb-note">Las mismas bases que usamos en clase y en las evaluaciones. Elige una y presiona «Cargar».</p>
          {(['clase', 'evaluacion'] as const).map((o) => (
            <div key={o}>
              <p className="wb-group">{o === 'clase' ? 'De las clases' : 'De las evaluaciones'}</p>
              {TEMPLATES.filter((t) => t.origin === o).map((t) => (
                <div key={t.id} className="wb-tplrow">
                  <div>
                    <b>{t.title}</b>
                    <small>{t.description}</small>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => loadTpl(t.id, t.title)} disabled={!!tplBusy || busy}>
                    {tplBusy === t.id ? 'Cargando…' : schema?.databases.includes(t.id) ? 'Recargar' : 'Cargar'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </details>
        <button type="button" className="btn btn-sm btn-ghost danger" onClick={reset} disabled={busy}>Restablecer mi espacio</button>
        <p className="muted wb-note">Tus bases de datos son privadas y se conservan entre sesiones. No tienen puntaje: úsalas para practicar libremente.</p>
      </aside>

      <section className="wb-main">
        <div className="wb-toolbar">
          <button type="button" className="btn btn-primary" onClick={() => run(false)} disabled={busy}>
            {busy ? 'Ejecutando…' : '▶ Ejecutar'}
          </button>
          <span className="muted hint">Ctrl + Enter · si seleccionas texto, se ejecuta solo la selección</span>
          <span className="grow" />
          <label className="wb-ex">
            <span className="sr">Ejemplos</span>
            <select
              value=""
              onChange={(e) => {
                const ex = WB_EXAMPLES.find((x) => x.id === e.target.value);
                if (ex) setScript(ex.script);
              }}
              aria-label="Ejemplos"
            >
              <option value="">Ejemplos…</option>
              {WB_EXAMPLES.map((x) => (
                <option key={x.id} value={x.id}>{x.title}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setScript('')}>Limpiar editor</button>
        </div>

        <SqlCodeEditor
          ref={taRef}
          className="code wb-editor"
          spellCheck={false}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              run(false);
            } else if (e.key === 'Tab') {
              e.preventDefault();
              insert('  ');
            }
          }}
          aria-label="Editor SQL"
        />
        {error && <p className="err" role="alert">{error}</p>}

        <div className="wb-results card">
          <div className="wb-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'resultados'} className={tab === 'resultados' ? 'on' : ''} onClick={() => setTab('resultados')}>
              Resultados{results.length ? ` (${results.length})` : ''}
              {hasErrors && <span className="dot-err" aria-label="con errores" />}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'registro'} className={tab === 'registro' ? 'on' : ''} onClick={() => setTab('registro')}>Registro de acciones</button>
          </div>

          {tab === 'resultados' && (
            <>
              {results.length === 0 && <p className="muted pad">Ejecuta una consulta para ver sus resultados aquí.</p>}
              {results.length > 0 && (
                <div className="wb-sets">
                  {results.map((r, i) => (
                    <button key={i} type="button" className={`wb-set ${r.kind}${i === active ? ' on' : ''}`} onClick={() => setActive(i)} title={r.sql}>
                      {i + 1}. {r.kind === 'rows' ? `${r.total} filas` : r.kind === 'ok' ? 'OK' : r.kind === 'error' ? 'Error' : 'Omitida'}
                    </button>
                  ))}
                </div>
              )}
              {current && (
                <div className="pad">
                  <p className="wb-sql"><code>{current.sql}</code></p>
                  {current.kind === 'rows' && (
                    <div className="wb-grid">
                      <table>
                        <thead>
                          <tr>
                            <th className="idx">#</th>
                            {current.columns!.map((c, k) => <th key={k}>{c}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {current.rows!.map((row, ri) => (
                            <tr key={ri}>
                              <td className="idx">{ri + 1}</td>
                              {row.map((v, ci) => (
                                <td key={ci} className={v === null ? 'null' : typeof v === 'number' ? 'num' : ''}>{v === null ? 'NULL' : String(v)}</td>
                              ))}
                            </tr>
                          ))}
                          {current.rows!.length === 0 && (
                            <tr><td colSpan={current.columns!.length + 1} className="muted">La consulta no devolvió filas.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className={`wb-msg ${current.kind}`}>
                    {current.kind === 'error' ? '✖ ' : current.kind === 'skipped' ? '… ' : '✔ '}
                    {describe(current)} <small>· {current.ms} ms</small>
                  </p>
                </div>
              )}
            </>
          )}

          {tab === 'registro' && (
            <div className="wb-grid pad">
              <table>
                <thead>
                  <tr><th>#</th><th>Hora</th><th>Acción</th><th>Respuesta</th><th>ms</th></tr>
                </thead>
                <tbody>
                  {log.map((l) => (
                    <tr key={l.n} className={l.kind === 'error' ? 'bad' : ''}>
                      <td>{l.n}</td><td>{l.time}</td><td><code>{l.sql}</code></td><td>{l.text}</td><td>{l.ms}</td>
                    </tr>
                  ))}
                  {log.length === 0 && <tr><td colSpan={5} className="muted">Todavía no has ejecutado nada.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
