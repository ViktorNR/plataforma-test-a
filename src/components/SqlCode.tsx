'use client';

import { forwardRef, useRef, type TextareaHTMLAttributes } from 'react';
import { tokenizeSql } from '@/lib/sqlhighlight';

function Tokens({ code }: { code: string }) {
  return (
    <>
      {tokenizeSql(code).map((t, i) => (t.k === 'id' || t.k === 'tx' ? <span key={i}>{t.s}</span> : <span key={i} className={`tk-${t.k}`}>{t.s}</span>))}
    </>
  );
}

/** Bloque de código SQL de solo lectura, con colores de sintaxis. */
export function SqlCode({ code }: { code: string }) {
  return (
    <pre className="sol-code sql-hl">
      <code>
        <Tokens code={code} />
      </code>
    </pre>
  );
}

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & { value: string };

/** Editor SQL con colores de sintaxis: un `textarea` transparente sobre una capa coloreada. */
const SqlCodeEditor = forwardRef<HTMLTextAreaElement, Props>(function SqlCodeEditor({ value, className, onScroll, ...rest }, ref) {
  const hl = useRef<HTMLPreElement>(null);
  return (
    <div className="sqled">
      <pre ref={hl} className="sqled-hl" aria-hidden="true">
        <code>
          <Tokens code={value} />
          {'\n'}
        </code>
      </pre>
      <textarea
        {...rest}
        ref={ref}
        value={value}
        spellCheck={false}
        className={`sqled-ta ${className ?? ''}`}
        onScroll={(e) => {
          if (hl.current) {
            hl.current.scrollTop = e.currentTarget.scrollTop;
            hl.current.scrollLeft = e.currentTarget.scrollLeft;
          }
          onScroll?.(e);
        }}
      />
    </div>
  );
});

export default SqlCodeEditor;
