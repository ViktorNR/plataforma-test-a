'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiagramAnswer } from './er/ErEditor';

const ErEditor = dynamic(() => import('./er/ErEditor'), { ssr: false, loading: () => <p className="muted">Cargando lienzo…</p> });
const KEY = 'bdplat.lienzo.v1';

/** Lienzo E/R completamente libre: se guarda solo en el navegador, sin corrección ni puntaje. */
export default function FreeCanvas() {
  const [initial, setInitial] = useState<DiagramAnswer | undefined | null>(null);
  const [saved, setSaved] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setInitial(raw ? (JSON.parse(raw) as DiagramAnswer) : undefined);
    } catch {
      setInitial(undefined);
    }
  }, []);

  const onChange = useCallback((d: DiagramAnswer) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
        setSaved(`Guardado automáticamente en este navegador · ${new Date().toLocaleTimeString('es-CL', { hour12: false })}`);
      } catch {
        setSaved('No se pudo guardar en este navegador. Usa «Guardar archivo (.json)».');
      }
    }, 600);
  }, []);

  if (initial === null) return <p className="muted">Cargando lienzo…</p>;
  return (
    <div className="stack">
      <ErEditor extended free height={680} initial={initial} onChange={onChange} />
      <p className="muted">{saved || 'Tu diseño se guarda solo en este navegador. Para conservarlo o compartirlo, descárgalo como imagen o archivo.'}</p>
    </div>
  );
}
