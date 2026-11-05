import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Barra, EstadoPill, Kpi } from '@/components/Dash';
import ClaveForm from '@/components/ClaveForm';
import { db } from '@/lib/db';
import { calcularIndicadores, fmtFecha, hace } from '@/lib/indicadores';
import { alternarUsuario, asignarCurso, restablecerClaveForm } from '../../actions';

export default async function EstudianteAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const u = Number.isInteger(id) ? await db.user.findFirst({ where: { id, rol: 'ESTUDIANTE' }, include: { curso: { include: { periodo: true } } } }) : null;
  if (!u) notFound();
  const [cursos, { alumnos }] = await Promise.all([
    db.curso.findMany({ include: { periodo: true }, orderBy: [{ periodo: { creadoEn: 'desc' } }, { nombre: 'asc' }, { nrc: 'asc' }] }),
    calcularIndicadores([u.id]),
  ]);
  const a = alumnos[0];
  const periodoCerrado = !!u.curso && (!u.curso.periodo.activo || !u.curso.activo);

  return (
    <div className="stack-lg">
      <div>
        <p className="eyebrow"><Link href="/admin/estudiantes">← Estudiantes</Link></p>
        <h1>{u.nombre} {u.apellido} {!u.activo && <span className="pill">Desactivada</span>}</h1>
        <p className="muted">{u.email} · registrado el <span suppressHydrationWarning>{fmtFecha(u.creadoEn)}</span> · última conexión <span suppressHydrationWarning>{fmtFecha(u.ultimaConexion)}</span> ({hace(a.diasSinConexion)}) · <EstadoPill estado={a.estado} /></p>
      </div>

      <section className="kpis">
        <Kpi valor={a.ingresos} titulo="ingresos" />
        <Kpi valor={a.intentos} titulo="intentos" />
        <Kpi valor={`${a.participacion}%`} titulo="participación" />
        <Kpi valor={`${a.avance}%`} titulo="avance" />
        <Kpi valor={`${a.promedio}%`} titulo="promedio" />
      </section>
      <Barra valor={a.avance} />

      <section className="grid-2 dash-grid">
        <div className="card stack">
          <h3>Restablecer contraseña</h3>
          <p className="muted">Genera una clave temporal aleatoria para entregársela al estudiante, o escribe una propia. La anterior deja de funcionar de inmediato.</p>
          <ClaveForm userId={u.id} action={restablecerClaveForm} />
        </div>

        <div className="card stack">
          <h3>Curso (NRC)</h3>
          <p className="muted">
            {u.curso ? <>Actual: <b>{u.curso.nombre} · NRC {u.curso.nrc}</b> · {u.curso.periodo.nombre}{u.curso.periodo.activo ? '' : ' (histórico)'}</> : 'Sin curso asignado.'} Al cambiarlo, el periodo del estudiante pasa a ser el del curso.
          </p>
          <form action={asignarCurso} className="row">
            <input type="hidden" name="id" value={u.id} />
            <select name="cursoId" defaultValue={u.cursoId ?? ''} className="grow">
              <option value="">— sin curso —</option>
              {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.nrc} · {c.periodo.nombre}{c.periodo.activo ? '' : ' (histórico)'}</option>)}
            </select>
            <button className="btn btn-sm">Guardar</button>
          </form>
        </div>

        <div className="card stack">
          <h3>Estado de la cuenta</h3>
          <p className="muted">
            {u.activo ? 'La cuenta está activa.' : u.inactivoPorPeriodo ? 'Cuenta desactivada porque su periodo está cerrado (histórico): no puede ingresar.' : 'La cuenta está desactivada: no puede ingresar y aparece en «Inactivos».'} Desactivar conserva todos sus resultados.
          </p>
          {!u.activo && (periodoCerrado || u.inactivoPorPeriodo) ? (
            <p className="muted">Para reactivarla, reabre el periodo en «Periodos» o asígnala a un curso de un periodo vigente.</p>
          ) : (
            <form action={alternarUsuario}>
              <input type="hidden" name="id" value={u.id} />
              <button className={`btn btn-sm${u.activo ? ' danger' : ''}`}>{u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
            </form>
          )}
        </div>

        <div className="card stack">
          <h3>Avance detallado</h3>
          <p className="muted">Ejercicios por semana, intentos y respuestas vistas están en el panel docente.</p>
          {u.cursoId ? <Link className="btn btn-sm" href={`/profesor/curso/${u.cursoId}/alumno/${u.id}`}>Ver detalle del estudiante</Link> : <p className="muted">Asígnale un curso para ver su detalle.</p>}
        </div>
      </section>
    </div>
  );
}
