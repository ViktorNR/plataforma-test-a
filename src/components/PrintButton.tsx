'use client';

export default function PrintButton({ label = 'Imprimir / Guardar como PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-primary btn-sm no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
