'use client';

/** Botón de envío que pide confirmación antes de ejecutar una acción irreversible. */
export default function ConfirmButton({ children, mensaje, className = 'btn btn-sm danger' }: { children: React.ReactNode; mensaje: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
