import Link from 'next/link';
import ClaveForm from '@/components/ClaveForm';
import ConfirmButton from '@/components/ConfirmButton';
import { db } from '@/lib/db';
import { fmtFecha } from '@/lib/indicadores';
import { alternarUsuario, crearProfesor, eliminarProfesor, restablecerClaveForm } from '../actions';

const ERRORES: Record<string, string> = {
  datos: 'Revisa los datos: nombre, apellido, correo válido y una clave de al menos 8 caracteres.',
  correo: 'Ya existe una cuenta con ese correo.',
};

export default async function ProfesoresPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; estado?: string }> }) {
  const sp = await searchParams;
  const inactivos = sp.estado === 'inactivos';
  const [todos, nActivos, nInactivos] = await Promise.all([
    db.user.findMany({
      where: { rol: 'PROFESOR', activo: !inactivos },
      include: { cursosDocente: { include: { periodo: true }, orderBy: { creadoEn: 'desc' } } },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    }),
    db.user.count({ where: { rol: 'PROFESOR', activo: true } }),
    db.user.count({ where: { rol: 'PROFESOR', activo: false } }),
  ]);

  return (
    <div className="stack-lg">
      <div>
        <h1>Profesores</h1>
        <p className="muted">Cada profesor ingresa con su correo y solo ve los cursos (NRC) que le vincules en <Link href="/admin/cursos">Cursos</Link>. Al cerrar un periodo los profesores no se tocan: quedan disponibles para vincularlos a los cursos del periodo siguiente. Puedes desactivar (pasan a «Inactivos», sin perder su historial) o eliminar definitivamente.</p>
      </div>

      <section className="card">
        <h3>Agregar profesor</h3>
        {sp.error && <p className="err" role="alert">{ERRORES[sp.error] ?? 'No se pudo guardar.'}</p>}
        {sp.ok && <p className="ok">Profesor creado.</p>}
        <form action={crearProfesor} className="stack">
          <div className="grid-2">
            <label>Nombre<input name="nombre" required maxLength={60} /></label>
            <label>Apellido<input name="apellido" required maxLength={60} /></label>
          </div>
          <div className="grid-2">
            <label>Correo<input name="email" type="email" required maxLength={120} /></label>
            <label>Clave inicial<input name="password" type="text" required minLength={8} maxLength={100} placeholder="Mínimo 8 caracteres" /></label>
          </div>
          <div><button className="btn btn-primary">Crear profesor</button></div>
        </form>
      </section>

      <div className="tabs" role="tablist">
        <Link role="tab" aria-selected={!inactivos} className={!inactivos ? 'on' : ''} href="/admin/profesores">Activos <b>{nActivos}</b></Link>
        <Link role="tab" aria-selected={inactivos} className={inactivos ? 'on' : ''} href="/admin/profesores?estado=inactivos">Inactivos <b>{nInactivos}</b></Link>
      </div>

      <section className="card scroll-x">
        <table className="table">
          <thead><tr><th>Profesor</th><th>Cursos vigentes</th><th>Última conexión</th><th /></tr></thead>
          <tbody>
            {todos.map((p) => {
              const vigentes = p.cursosDocente.filter((c) => c.activo && c.periodo.activo);
              const historicos = p.cursosDocente.length - vigentes.length;
              return (
                <tr key={p.id}>
                  <td><b>{p.apellido}, {p.nombre}</b><br /><small className="muted">{p.email}</small></td>
                  <td>
                    {vigentes.length === 0 && <span className={inactivos ? 'muted' : 'pill mid'}>{inactivos ? 'Sin cursos vigentes' : 'Disponible para asignar'}</span>}
                    {vigentes.map((c) => <div key={c.id}><small>{c.nombre} · NRC {c.nrc} · {c.periodo.nombre}</small></div>)}
                    {historicos > 0 && <div><small className="muted">+ {historicos} curso{historicos === 1 ? '' : 's'} en el histórico</small></div>}
                  </td>
                  <td suppressHydrationWarning>{fmtFecha(p.ultimaConexion)}</td>
                  <td>
                    <details className="gestion">
                      <summary className="btn btn-sm">Gestionar</summary>
                      <div className="stack-sm">
                        <b>Restablecer contraseña</b>
                        <ClaveForm userId={p.id} action={restablecerClaveForm} />
                        <div className="row">
                          <form action={alternarUsuario}><input type="hidden" name="id" value={p.id} /><button className="btn btn-sm">{p.activo ? 'Desactivar (pasa a inactivos)' : 'Reactivar'}</button></form>
                          <form action={eliminarProfesor}>
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton mensaje={`¿Eliminar definitivamente a ${p.nombre} ${p.apellido}? Sus cursos quedarán sin profesor. Esta acción no se puede deshacer.`}>Eliminar</ConfirmButton>
                          </form>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}
            {todos.length === 0 && <tr><td colSpan={4} className="muted">{inactivos ? 'No hay profesores inactivos.' : 'Aún no hay profesores activos.'}</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
