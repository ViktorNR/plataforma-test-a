'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AuthForm({ mode, cursos = [] }: { mode: 'login' | 'registro'; cursos?: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo completar la solicitud');
      router.push(data.destino);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack auth-form">
      {mode === 'registro' && (
        <div className="grid-2">
          <label>Nombre<input name="nombre" required maxLength={60} autoComplete="given-name" /></label>
          <label>Apellido<input name="apellido" required maxLength={60} autoComplete="family-name" /></label>
        </div>
      )}
      <label>Correo electrónico<input name="email" type="email" required autoComplete="email" /></label>
      <label>
        Contraseña
        <input name="password" type="password" required minLength={mode === 'registro' ? 8 : 1} autoComplete={mode === 'registro' ? 'new-password' : 'current-password'} />
        {mode === 'registro' && <small className="muted">Mínimo 8 caracteres.</small>}
      </label>
      {mode === 'registro' && (
        <label>
          Curso (NRC)
          <select name="cursoId" required defaultValue="">
            <option value="" disabled>Selecciona tu curso…</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Un momento…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      <p className="muted center">
        {mode === 'login' ? (
          <>¿Primera vez? <Link href="/registro">Crea tu cuenta</Link></>
        ) : (
          <>¿Ya tienes cuenta? <Link href="/login">Ingresa</Link></>
        )}
      </p>
    </form>
  );
}
