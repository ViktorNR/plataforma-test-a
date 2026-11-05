'use client';

import { useRef, useState } from 'react';
import type { NormProblem, StudentNorm } from '@/lib/types';

type T = StudentNorm['tables'][number];

export default function NormBuilder({ problem, initial, onChange }: { problem: NormProblem; initial?: StudentNorm; onChange: (s: StudentNorm) => void }) {
  const [tables, setTables] = useState<T[]>(initial?.tables ?? []);
  const [over, setOver] = useState<string | null>(null);
  const uid = useRef(Date.now());

  const commit = (next: T[]) => {
    setTables(next);
    onChange({ tables: next });
  };
  const patch = (tid: string, fn: (t: T) => T) => commit(tables.map((t) => (t.id === tid ? fn(t) : t)));
  const addAttr = (tid: string, a: string) => patch(tid, (t) => (t.attrs.includes(a) ? t : { ...t, attrs: [...t.attrs, a] }));
  const removeAttr = (tid: string, a: string) => patch(tid, (t) => ({ ...t, attrs: t.attrs.filter((x) => x !== a), pk: t.pk.filter((x) => x !== a) }));
  const togglePk = (tid: string, a: string) => patch(tid, (t) => ({ ...t, pk: t.pk.includes(a) ? t.pk.filter((x) => x !== a) : [...t.pk, a] }));

  return (
    <div className="stack-lg">
      <div className="card">
        <h4>Relación original R</h4>
        <p className="muted">Arrastra los atributos a tus tablas (un atributo puede aparecer en más de una tabla, por ejemplo como clave foránea).</p>
        <div className="chips">
          {problem.attrs.map((a) => (
            <span key={a} className="chip" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', a)}>
              {a}
            </span>
          ))}
        </div>
        <h4 style={{ marginTop: 16 }}>Dependencias funcionales</h4>
        <ul className="fds">
          {problem.fds.map((fd, i) => (
            <li key={i}>
              <span className="fd-lhs">{fd.lhs.join(', ')}</span>
              <span className="fd-arrow">→</span>
              <span className="fd-rhs">{fd.rhs.join(', ')}</span>
            </li>
          ))}
        </ul>
        <p className="muted">Meta: llevar la relación a <b>{problem.target === '2NF' ? 'segunda forma normal (2FN)' : 'tercera forma normal (3FN)'}</b>.</p>
      </div>

      <div>
        <div className="row-between">
          <h4>Tu descomposición</h4>
          <button type="button" className="btn btn-sm" onClick={() => commit([...tables, { id: `t${uid.current++}`, name: '', attrs: [], pk: [] }])}>
            + Nueva tabla
          </button>
        </div>
        {tables.length === 0 && <p className="muted">Crea tablas y arrastra atributos. Haz clic en un atributo dentro de una tabla para marcarlo como clave primaria.</p>}
        <div className="grid-cards">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`card norm-table${over === t.id ? ' over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(t.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const a = e.dataTransfer.getData('text/plain');
                if (problem.attrs.includes(a)) addAttr(t.id, a);
              }}
            >
              <div className="row">
                <input className="grow" placeholder="Nombre de la tabla" value={t.name} onChange={(e) => patch(t.id, (x) => ({ ...x, name: e.target.value }))} />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => commit(tables.filter((x) => x.id !== t.id))} aria-label="Eliminar tabla">✕</button>
              </div>
              <div className="chips norm-drop">
                {t.attrs.length === 0 && <span className="muted">Suelta aquí los atributos</span>}
                {t.attrs.map((a) => (
                  <span key={a} className={`chip${t.pk.includes(a) ? ' pk' : ''}`}>
                    <button type="button" className="chip-main" onClick={() => togglePk(t.id, a)} title="Clic: marcar/quitar clave primaria">
                      {a}
                    </button>
                    <button type="button" className="chip-x" onClick={() => removeAttr(t.id, a)} aria-label={`Quitar ${a}`}>×</button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addAttr(t.id, e.target.value);
                }}
                aria-label="Agregar atributo"
              >
                <option value="">+ agregar atributo…</option>
                {problem.attrs.filter((a) => !t.attrs.includes(a)).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div className="notation-box">
                <code className="notation">
                  {t.name.trim() ? t.name.trim().toUpperCase() : 'TABLA'}(
                  {t.attrs.map((a, i) => (
                    <span key={a}>
                      {i > 0 && ', '}
                      {t.pk.includes(a) ? <u>{a}</u> : a}
                    </span>
                  ))}
                  )
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
