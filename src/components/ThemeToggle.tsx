'use client';

import { useEffect, useState } from 'react';

/** Alterna entre entorno claro y oscuro; la elección se recuerda en este navegador. */
export default function ThemeToggle({ className = 'btn btn-sm btn-quiet icon-btn' }: { className?: string }) {
  const [tema, setTema] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTema(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  function alternar() {
    const siguiente = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = siguiente;
    try {
      localStorage.setItem('tema', siguiente);
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta visita */
    }
    setTema(siguiente);
  }

  const etiqueta = tema === 'dark' ? 'Cambiar a entorno claro' : 'Cambiar a entorno oscuro';
  return (
    <button type="button" className={className} onClick={alternar} aria-label={etiqueta} title={etiqueta}>
      {tema === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7z" />
        </svg>
      )}
    </button>
  );
}
