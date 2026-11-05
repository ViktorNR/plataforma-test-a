'use client';

import { useActionState, useState } from 'react';
import type { ResultadoClave } from '@/app/admin/actions';

type Accion = (prev: ResultadoClave | null, formData: FormData) => Promise<ResultadoClave>;

/** Restablecer contraseña: genera una clave temporal (recomendado) o permite escribir una. */
export default function ClaveForm({ userId, action, compacto = false }: { userId: number; action: Accion; compacto?: boolean }) {
  const [res, enviar, pendiente] = useActionState(action, null);
  const [manual, setManual] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* el navegador puede bloquear el portapapeles: la clave queda visible para copiarla a mano */
    }
  }

  return (
    <form action={enviar} className={`clave-form${compacto ? ' compacto' : ''}`}>
      <input type="hidden" name="id" value={userId} />
      <input type="hidden" name="modo" value={manual ? 'manual' : 'auto'} />
      {manual && <input name="password" type="text" minLength={8} maxLength={100} required placeholder="Nueva clave (mín. 8)" autoComplete="off" />}
      <div className="row">
        <button className="btn btn-sm" disabled={pendiente}>{pendiente ? 'Guardando…' : manual ? 'Guardar clave' : 'Generar clave temporal'}</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setManual((m) => !m)}>{manual ? 'Generar automática' : 'Escribir una'}</button>
      </div>
      {res && (
        <div className={res.ok ? 'clave-ok' : 'err'} role="status">
          {res.mensaje}
          {res.clave && (
            <div className="row clave-box">
              <code>{res.clave}</code>
              <button type="button" className="btn btn-sm" onClick={() => copiar(res.clave!)}>{copiado ? '¡Copiada!' : 'Copiar'}</button>
              <small className="muted">Entrégasela al usuario: no se vuelve a mostrar.</small>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
