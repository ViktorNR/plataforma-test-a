import { db } from './db';
import { type DiaActividad, type FilaAlumno, type Indicadores, calcularIndicadores } from './indicadores';

const DIA_MS = 24 * 60 * 60 * 1000;
const claveDia = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(d);
const media = (n: number[]) => (n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : 0);

export interface FilaCursoGlobal {
  id: number;
  nombre: string;
  nrc: string;
  periodo: string;
  vigente: boolean;
  profesor: string | null;
  alumnos: number;
  activos7: number;
  participacion: number;
  avance: number;
  promedio: number;
  enRiesgo: number;
}

export interface FilaProfesor {
  id: number;
  nombre: string;
  activo: boolean;
  cursos: number;
  alumnos: number;
  ultimaConexion: Date | null;
  avance: number;
  participacion: number;
}

export interface MetricasPlataforma {
  ind: Indicadores;
  usuarios: {
    estudiantes: number;
    estudiantesVigentes: number;
    profesores: number;
    cursos: number;
    periodosActivos: number;
    hoy: number;
    semana: number;
    mes: number;
    nuncaIngresaron: number;
    nuevos7: number;
    nuevosPrev7: number;
    sinCurso: number;
  };
  intentos7: number;
  intentosPrev7: number;
  /** Estudiantes distintos que ingresaron cada día (últimos 30 días) y número de ingresos. */
  accesos: DiaActividad[];
  cursos: FilaCursoGlobal[];
  profesores: FilaProfesor[];
  atencion: FilaAlumno[];
}

/** Métricas globales para el dashboard del administrador. periodoId: un periodo concreto; undefined: todos los periodos vigentes. */
export async function metricasPlataforma(periodoId?: number): Promise<MetricasPlataforma> {
  const ahora = new Date();
  const hace = (d: number) => new Date(ahora.getTime() - d * DIA_MS);
  const periodoSel = periodoId ? await db.periodo.findUnique({ where: { id: periodoId } }) : null;
  // Periodos vigentes: solo cuentas activas. Un periodo cerrado (histórico) se consulta completo.
  const soloActivos = !periodoSel || periodoSel.activo;
  const wherePeriodo = periodoId ? { periodoId } : { OR: [{ periodo: { activo: true } }, { periodoId: null }] };
  const whereEst = { rol: 'ESTUDIANTE' as const, ...wherePeriodo, ...(soloActivos ? { activo: true } : {}) };

  const [estudiantes, estudiantesVigentes, profesores, cursosTotal, periodosActivos, hoy, semana, mes, nunca, nuevos7, nuevosPrev7, sinCurso, cursosDb, profesoresDb, ids] = await Promise.all([
    db.user.count({ where: { rol: 'ESTUDIANTE' } }),
    db.user.count({ where: whereEst }),
    db.user.count({ where: { rol: 'PROFESOR' } }),
    db.curso.count(),
    db.periodo.count({ where: { activo: true } }),
    db.user.count({ where: { ...whereEst, ultimaConexion: { gte: hace(1) } } }),
    db.user.count({ where: { ...whereEst, ultimaConexion: { gte: hace(7) } } }),
    db.user.count({ where: { ...whereEst, ultimaConexion: { gte: hace(30) } } }),
    db.user.count({ where: { ...whereEst, ultimaConexion: null } }),
    db.user.count({ where: { ...whereEst, creadoEn: { gte: hace(7) } } }),
    db.user.count({ where: { ...whereEst, creadoEn: { gte: hace(14), lt: hace(7) } } }),
    db.user.count({ where: { ...whereEst, cursoId: null } }),
    db.curso.findMany({ where: periodoId ? { periodoId } : { periodo: { activo: true } }, include: { periodo: true, profesor: true }, orderBy: [{ nombre: 'asc' }, { nrc: 'asc' }] }),
    db.user.findMany({ where: { rol: 'PROFESOR' }, include: { cursosDocente: { include: { periodo: true } } }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    db.user.findMany({ where: whereEst, select: { id: true, cursoId: true } }),
  ]);

  const ind = await calcularIndicadores(ids.map((u) => u.id));
  const porId = new Map(ind.alumnos.map((a) => [a.id, a]));

  const [intentos7, intentosPrev7, accesosDb] = await Promise.all([
    db.intento.count({ where: { creadoEn: { gte: hace(7) }, user: whereEst } }),
    db.intento.count({ where: { creadoEn: { gte: hace(14), lt: hace(7) }, user: whereEst } }),
    db.acceso.findMany({ where: { creadoEn: { gte: hace(30) }, user: whereEst }, select: { userId: true, creadoEn: true } }),
  ]);

  const dias = new Map<string, { intentos: number; alumnos: Set<number> }>();
  for (let i = 29; i >= 0; i--) dias.set(claveDia(hace(i)), { intentos: 0, alumnos: new Set() });
  for (const a of accesosDb) {
    const d = dias.get(claveDia(a.creadoEn));
    if (d) {
      d.intentos++;
      d.alumnos.add(a.userId);
    }
  }
  const accesos = [...dias.entries()].map(([dia, v]) => ({ dia, intentos: v.intentos, alumnos: v.alumnos.size }));

  const alumnosDeCurso = new Map<number, FilaAlumno[]>();
  for (const u of ids) {
    const a = porId.get(u.id);
    if (a && u.cursoId) alumnosDeCurso.set(u.cursoId, [...(alumnosDeCurso.get(u.cursoId) ?? []), a]);
  }
  const cursos: FilaCursoGlobal[] = cursosDb.map((c) => {
    const al = alumnosDeCurso.get(c.id) ?? [];
    return {
      id: c.id,
      nombre: c.nombre,
      nrc: c.nrc,
      periodo: c.periodo.nombre,
      vigente: c.periodo.activo,
      profesor: c.profesor ? `${c.profesor.nombre} ${c.profesor.apellido}` : null,
      alumnos: al.length,
      activos7: al.filter((a) => a.estado === 'activo').length,
      participacion: media(al.map((a) => a.participacion)),
      avance: media(al.map((a) => a.avance)),
      promedio: media(al.map((a) => a.promedio)),
      enRiesgo: al.filter((a) => a.estado === 'riesgo' || a.estado === 'nunca').length,
    };
  });

  const profesoresFilas: FilaProfesor[] = profesoresDb.map((p) => {
    const al = p.cursosDocente.filter((c) => c.periodo.activo).flatMap((c) => alumnosDeCurso.get(c.id) ?? []);
    return {
      id: p.id,
      nombre: `${p.nombre} ${p.apellido}`,
      activo: p.activo,
      cursos: p.cursosDocente.length,
      alumnos: al.length,
      ultimaConexion: p.ultimaConexion,
      avance: media(al.map((a) => a.avance)),
      participacion: media(al.map((a) => a.participacion)),
    };
  });

  const atencion = ind.alumnos
    .filter((a) => a.estado === 'riesgo' || a.estado === 'nunca')
    .sort((a, b) => (b.diasSinConexion ?? 999) - (a.diasSinConexion ?? 999))
    .slice(0, 10);

  return {
    ind,
    usuarios: { estudiantes, estudiantesVigentes, profesores, cursos: cursosTotal, periodosActivos, hoy, semana, mes, nuncaIngresaron: nunca, nuevos7, nuevosPrev7, sinCurso },
    intentos7,
    intentosPrev7,
    accesos,
    cursos,
    profesores: profesoresFilas,
    atencion,
  };
}
