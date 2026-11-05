import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { Barra, EstadoPill, heatClass } from '@/components/Dash';
import { db } from '@/lib/db';
import { calcularIndicadores, fmtFecha, hace } from '@/lib/indicadores';
import { alternarUsuario } from '../actions';

const POR_PAGINA = 25;

type Sp = { q?: string; periodo?: string; curso?: string; cuenta?: string; pagina?: string };

export default async function EstudiantesPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 80);
  const periodoId = Number(sp.periodo) || undefined;
  const cursoSel = sp.curso === 'sin' ? 'sin' : Number(sp.curso) || undefined;
  const inactivos = sp.cuenta === 'inactivos';
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const base: Prisma.UserWhereInput = {
    rol: 'ESTUDIANTE',
    ...(periodoId ? { periodoId } : {}),
    ...(cursoSel === 'sin' ? { cursoId: null } : cursoSel ? { cursoId: cursoSel } : {}),
    ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { apellido: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
  };
  const where: Prisma.UserWhereInput = { ...base, activo: !inactivos };

  const [periodos, cursos, nActivos, nInactivos, users] = await Promise.all([
    db.periodo.findMany({ orderBy: { creadoEn: 'desc' } }),
    db.curso.findMany({ include: { periodo: true }, orderBy: [{ periodo: { creadoEn: 'desc' } }, { nombre: 'asc' }, { nrc: 'asc' }] }),
    db.user.count({ where: { ...base, activo: true } }),
    db.user.count({ where: { ...base, activo: false } }),
    db.user.findMany({ where, include: { curso: { include: { periodo: true } }, periodo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
  ]);
  const total = inactivos ? nInactivos : nActivos;
  const ind = await calcularIndicadores(users.map((u) => u.id));
  const porId = new Map(ind.alumnos.map((a) => [a.id, a]));
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const qs = (extra: Partial<Sp>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, periodo: sp.periodo, curso: sp.curso, cuenta: sp.cuenta, ...extra })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className="stack-lg">
      <div className="row-between">
        <div>
          <h1>Estudiantes</h1>
          <p className="muted">Haz clic en un nombre para gestionar su cuenta (clave, curso, activación). Al cerrar un periodo, sus estudiantes pasan automáticamente a «Inactivos».</p>
        </div>
        <a className="btn" href={`/admin/export${qs({ pagina: undefined, cuenta: inactivos ? 'inactivos' : 'activos' })}`}>Exportar CSV</a>
      </div>

      <div className="tabs" role="tablist">
        <Link role="tab" aria-selected={!inactivos} className={!inactivos ? 'on' : ''} href={`/admin/estudiantes${qs({ cuenta: undefined, pagina: undefined })}`}>Activos <b>{nActivos}</b></Link>
        <Link role="tab" aria-selected={inactivos} className={inactivos ? 'on' : ''} href={`/admin/estudiantes${qs({ cuenta: 'inactivos', pagina: undefined })}`}>Inactivos <b>{nInactivos}</b></Link>
      </div>

      <form className="card filtros" action="/admin/estudiantes">
        {inactivos && <input type="hidden" name="cuenta" value="inactivos" />}
        <label className="grow">Buscar<input name="q" defaultValue={q} placeholder="Nombre, apellido o correo" /></label>
        <label>Periodo
          <select name="periodo" defaultValue={sp.periodo ?? ''}>
            <option value="">Todos</option>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? '' : ' (histórico)'}</option>)}
          </select>
        </label>
        <label>Curso (NRC)
          <select name="curso" defaultValue={sp.curso ?? ''}>
            <option value="">Todos</option>
            <option value="sin">Sin curso asignado</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.nrc} · {c.periodo.nombre}</option>)}
          </select>
        </label>
        <div className="row"><button className="btn btn-primary">Filtrar</button><Link className="btn btn-ghost" href={`/admin/estudiantes${inactivos ? '?cuenta=inactivos' : ''}`}>Limpiar</Link></div>
      </form>

      <div className="card scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Estudiante</th><th>Curso</th><th>Última conexión</th><th>Avance</th>
              <th title="% logrado en cada semana, de S1 a S13">Semanas</th>
              <th>{inactivos ? 'Motivo' : 'Actividad'}</th>
              {inactivos && <th />}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const a = porId.get(u.id)!;
              const periodoCerrado = !!u.periodo && !u.periodo.activo;
              return (
                <tr key={u.id}>
                  <td><Link href={`/admin/estudiantes/${u.id}`}><b>{u.apellido}, {u.nombre}</b></Link><br /><small className="muted">{u.email}</small></td>
                  <td>
                    {u.curso ? <>{u.curso.nombre}<br /><small className="muted">NRC {u.curso.nrc} · {u.curso.periodo.nombre}</small></> : <span className="pill low">Sin curso</span>}
                  </td>
                  <td><span suppressHydrationWarning>{fmtFecha(u.ultimaConexion)}</span><br /><small className="muted">{hace(a.diasSinConexion)}</small></td>
                  <td><Barra valor={a.avance} /></td>
                  <td>
                    <div className="strip">
                      {a.semanas.map((s) => <i key={s.n} className={`heat ${heatClass(s.avance, s.total)}`} title={`Semana ${s.n}: ${s.total ? s.avance + '%' : 'deshabilitada'}`} />)}
                    </div>
                  </td>
                  <td>
                    {inactivos ? (u.inactivoPorPeriodo ? <span className="pill">Periodo cerrado</span> : <span className="pill mid">Desactivada</span>) : <EstadoPill estado={a.estado} />}
                  </td>
                  {inactivos && (
                    <td className="actions">
                      {periodoCerrado || u.inactivoPorPeriodo ? (
                        <small className="muted">Reabre el periodo o asígnala a un curso vigente</small>
                      ) : (
                        <form action={alternarUsuario}><input type="hidden" name="id" value={u.id} /><button className="btn btn-sm">Reactivar</button></form>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={inactivos ? 7 : 6} className="muted">{inactivos ? 'No hay estudiantes inactivos con estos filtros.' : 'No hay estudiantes activos con estos filtros.'}</td></tr>}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="row filters">
          {pagina > 1 && <Link className="pill" href={`/admin/estudiantes${qs({ pagina: String(pagina - 1) })}`}>← Anterior</Link>}
          <span className="muted">Página {pagina} de {paginas}</span>
          {pagina < paginas && <Link className="pill" href={`/admin/estudiantes${qs({ pagina: String(pagina + 1) })}`}>Siguiente →</Link>}
        </div>
      )}
    </div>
  );
}
