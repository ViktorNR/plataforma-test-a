'use client';

import { useState } from 'react';
import SqlCodeEditor from './SqlCode';

export default function SqlEditor({ dbName, initial, onChange }: { dbName: string; initial?: string; onChange: (script: string) => void }) {
  const [script, setScript] = useState(initial ?? `-- Escribe aquí tu script MySQL\n-- Base de datos esperada: ${dbName}\n\n`);

  return (
    <div className="stack">
      <div className="row-between">
        <span className="muted">
          Base de datos esperada: <code>{dbName}</code> · Motor: MySQL 8.4
        </span>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setScript(''); onChange(''); }}>Borrar</button>
      </div>
      <SqlCodeEditor
        className="code"
        spellCheck={false}
        value={script}
        rows={22}
        onChange={(e) => {
          setScript(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget;
            const { selectionStart: s, selectionEnd: en } = el;
            const next = script.slice(0, s) + '  ' + script.slice(en);
            setScript(next);
            onChange(next);
            requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
          }
        }}
      />
      <p className="muted">Tu script se ejecuta en un servidor MySQL de práctica y luego se revisa la estructura creada (tablas, columnas, tipos, claves y restricciones).</p>
    </div>
  );
}
