import { db } from '@/lib/db';
import { alternarPeriodo, crearPeriodo, eliminarPeriodo } from '../actions';

export default async function PeriodosPage() {
  const periodos = await db.periodo.findMany({ orderBy: { creadoEn: 'desc' }, include: { _count: { select: { usuarios: true, cursos: true } } } });

  return (
    <div className="stack-lg">
      <div>
        <h1>Periodos</h1>
        <p className="muted">Los cursos (NRC) y sus estudiantes pertenecen a un periodo. <b>Cierra un periodo</b> para enviarlos al <b>histórico</b>: los profesores los consultan en «Histórico» y ya no se pueden elegir al registrarse. Puedes reabrirlo cuando quieras.</p>
      </div>

      <section className="card">
        <h3>Agregar periodo</h3>
        <form action={crearPeriodo} className="row form-inline">
          <input name="nombre" placeholder="Ej.: 2027 - Primer trimestre" required maxLength={80} className="grow" />
          <button className="btn btn-primary">Agregar periodo</button>
        </form>
      </section>

      <section className="card scroll-x">
        <table className="table">
          <thead><tr><th>Periodo</th><th>Cursos</th><th>Estudiantes</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={p.id}>
                <td><b>{p.nombre}</b></td>
                <td>{p._count.cursos}</td>
                <td>{p._count.usuarios}</td>
                <td><span className={`pill ${p.activo ? 'good' : ''}`}>{p.activo ? 'Activo' : 'Cerrado · histórico'}</span></td>
                <td className="actions">
                  <form action={alternarPeriodo}><input type="hidden" name="id" value={p.id} /><button className="btn btn-sm">{p.activo ? 'Cerrar (enviar al histórico)' : 'Reabrir'}</button></form>
                  {p._count.usuarios === 0 && p._count.cursos === 0 && (
                    <form action={eliminarPeriodo}><input type="hidden" name="id" value={p.id} /><button className="btn btn-sm btn-ghost">Eliminar</button></form>
                  )}
                </td>
              </tr>
            ))}
            {periodos.length === 0 && <tr><td colSpan={5} className="muted">Aún no hay periodos.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
