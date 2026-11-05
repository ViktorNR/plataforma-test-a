'use client';

import { useRef, useState } from 'react';
import type { ErModel, StudentSchema } from '@/lib/types';
import ErView from './er/ErView';

type T = StudentSchema['tables'][number];

export default function SchemaBuilder({ model, initial, onChange }: { model: ErModel; initial?: StudentSchema; onChange: (s: StudentSchema) => void }) {
  const [tables, setTables] = useState<T[]>(initial?.tables?.length ? initial.tables : []);
  const uid = useRef(Date.now());
  const id = () => `x${uid.current++}`;

  const commit = (next: T[]) => {
    setTables(next);
    onChange({ tables: next });
  };
  const patchTable = (tid: string, patch: Partial<T>) => commit(tables.map((t) => (t.id === tid ? { ...t, ...patch } : t)));
  const patchCol = (tid: string, cid: string, patch: Partial<T['cols'][number]>) =>
    commit(tables.map((t) => (t.id === tid ? { ...t, cols: t.cols.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : t)));

  const notation = (t: T) => (
    <code className="notation">
      {t.name.trim() ? t.name.trim().toUpperCase() : 'TABLA'}(
      {t.cols
        .filter((c) => c.name.trim())
        .map((c, i) => (
          <span key={c.id}>
            {i > 0 && ', '}
            {c.fkTable && <span className="fkmark">#</span>}
            {c.pk ? <u>{c.name.trim()}</u> : c.name.trim()}
          </span>
        ))}
      )
    </code>
  );

  return (
    <div className="stack-lg">
      <div>
        <h4>Modelo E/R (usa la rueda del ratón para acercar y arrastra para mover)</h4>
        <ErView model={model} height={Math.min(920, Math.max(440, (model.layout?.length ?? 2) * 300 + 60))} />
      </div>

      <div>
        <div className="row-between">
          <h4>Tu esquema relacional</h4>
          <button type="button" className="btn btn-sm" onClick={() => commit([...tables, { id: id(), name: '', cols: [{ id: id(), name: '', pk: false, fkTable: '' }] }])}>
            + Nueva tabla
          </button>
        </div>
        {tables.length === 0 && <p className="muted">Crea una tabla para empezar. Subrayado = clave primaria; # = clave foránea.</p>}
        <div className="grid-cards">
          {tables.map((t) => (
            <div className="card table-card" key={t.id}>
              <div className="row">
                <input className="grow" placeholder="Nombre de la tabla" value={t.name} onChange={(e) => patchTable(t.id, { name: e.target.value })} />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => commit(tables.filter((x) => x.id !== t.id))} aria-label="Eliminar tabla">✕</button>
              </div>
              <div className="cols-head"><span>Columna</span><span>PK</span><span>FK hacia</span><span /></div>
              {t.cols.map((c) => (
                <div className="cols-row" key={c.id}>
                  <input placeholder="columna" value={c.name} onChange={(e) => patchCol(t.id, c.id, { name: e.target.value })} />
                  <input type="checkbox" checked={c.pk} onChange={(e) => patchCol(t.id, c.id, { pk: e.target.checked })} aria-label="Clave primaria" />
                  <select value={c.fkTable} onChange={(e) => patchCol(t.id, c.id, { fkTable: e.target.value })}>
                    <option value="">—</option>
                    {tables.filter((o) => o.id !== t.id && o.name.trim()).map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => patchTable(t.id, { cols: t.cols.filter((x) => x.id !== c.id) })} aria-label="Quitar columna">−</button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => patchTable(t.id, { cols: [...t.cols, { id: id(), name: '', pk: false, fkTable: '' }] })}>
                + columna
              </button>
              <div className="notation-box">{notation(t)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
