import { EXERCISES, WEEKS, getToggles, isExerciseEnabled } from './content';
import { db } from './db';
import { PASS, average } from './progress';

/** Días sin conectarse para considerar a un estudiante «inactivo» y «en riesgo». */
export const DIAS_ACTIVO = 7;
export const DIAS_RIESGO = 14;

export type Estado = 'activo' | 'inactivo' | 'riesgo' | 'nunca';

export const ESTADO_LABEL: Record<Estado, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  riesgo: 'En riesgo',
  nunca: 'Nunca ingresó',
};

export interface SemanaAlumno {
  n: number;
  total: number;
  intentados: number;
  logrados: number;
  /** % de ejercicios de la semana logrados (≥ PASS). */
  avance: number;
  /** Promedio de los mejores puntajes (0 si no se intentó). */
  promedio: number;
}

export interface FilaAlumno {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  ultimaConexion: Date | null;
  ultimoIntento: Date | null;
  diasSinConexion: number | null;
  ingresos: number;
  estado: Estado;
  intentos: number;
  intentados: number;
  logrados: number;
  vistas: number;
  /** % de ejercicios disponibles que el estudiante ha intentado al menos una vez. */
  participacion: number;
  /** % de ejercicios disponibles logrados (≥ PASS). */
  avance: number;
  promedio: number;
  semanas: SemanaAlumno[];
  /** Mejor puntaje por ejercicio (solo los intentados o vistos). */
  puntajes: Record<string, number>;
  vistosSlugs: string[];
}

export interface FilaSemana {
  n: number;
  title: string;
  total: number;
  participacion: number;
  avance: number;
  promedio: number;
}

export interface FilaEjercicio {
  slug: string;
  title: string;
  week: number;
  intentaron: number;
  lograron: number;
  vistas: number;
  /** % de los estudiantes del grupo que lo lograron. */
  logro: number;
  promedio: number;
  intentosMedios: number;
}

export interface DiaActividad {
  dia: string;
  intentos: number;
  alumnos: number;
}

export interface Indicadores {
  disponibles: number;
  alumnos: FilaAlumno[];
  semanas: FilaSemana[];
  ejercicios: FilaEjercicio[];
  actividad: DiaActividad[];
  distribucion: { rango: string; alumnos: number }[];
  resumen: {
    alumnos: number;
    activos7: number;
    enRiesgo: number;
    nuncaIngresaron: number;
    sinIntentos: number;
    participacion: number;
    avance: number;
    promedio: number;
    conRespuestasVistas: number;
    intentosTotales: number;
  };
}

const DIA_MS = 24 * 60 * 60 * 1000;
const claveDia = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Santiago' }).format(d);

export function estadoDe(ultima: Date | null, ahora = new Date()): { estado: Estado; dias: number | null } {
  if (!ultima) return { estado: 'nunca', dias: null };
  const dias = Math.floor((ahora.getTime() - ultima.getTime()) / DIA_MS);
  return { estado: dias <= DIAS_ACTIVO ? 'activo' : dias <= DIAS_RIESGO ? 'inactivo' : 'riesgo', dias };
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Indicadores de un grupo de estudiantes sobre los ejercicios actualmente habilitados. */
export async function calcularIndicadores(userIds: number[]): Promise<Indicadores> {
  const ahora = new Date();
  const toggles = await getToggles();
  const disponibles = EXERCISES.filter((e) => isExerciseEnabled(toggles, e));
  const porSemana = (n: number) => disponibles.filter((e) => e.week === n);
  const slugsDisp = new Set(disponibles.map((e) => e.slug));

  const [users, grupos, vistasDb, recientes] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] }),
    db.intento.groupBy({
      by: ['userId', 'exerciseSlug'],
      where: { userId: { in: userIds } },
      _max: { puntaje: true, creadoEn: true },
      _count: { _all: true },
    }),
    db.respuestaVista.findMany({ where: { userId: { in: userIds } }, select: { userId: true, exerciseSlug: true } }),
    db.intento.findMany({ where: { userId: { in: userIds }, creadoEn: { gte: new Date(ahora.getTime() - 30 * DIA_MS) } }, select: { userId: true, creadoEn: true } }),
  ]);

  const mejor = new Map<number, Map<string, number>>();
  const nIntentos = new Map<number, number>();
  const ultimoInt = new Map<number, Date>();
  const intentosPorSlug = new Map<string, number>();
  for (const g of grupos) {
    if (!mejor.has(g.userId)) mejor.set(g.userId, new Map());
    mejor.get(g.userId)!.set(g.exerciseSlug, g._max.puntaje ?? 0);
    nIntentos.set(g.userId, (nIntentos.get(g.userId) ?? 0) + g._count._all);
    const f = g._max.creadoEn;
    if (f && (!ultimoInt.get(g.userId) || f > ultimoInt.get(g.userId)!)) ultimoInt.set(g.userId, f);
    if (slugsDisp.has(g.exerciseSlug)) intentosPorSlug.set(g.exerciseSlug, (intentosPorSlug.get(g.exerciseSlug) ?? 0) + g._count._all);
  }
  const vistasPorUser = new Map<number, Set<string>>();
  for (const v of vistasDb) {
    if (!vistasPorUser.has(v.userId)) vistasPorUser.set(v.userId, new Set());
    vistasPorUser.get(v.userId)!.add(v.exerciseSlug);
  }

  const alumnos: FilaAlumno[] = users.map((u) => {
    const m = mejor.get(u.id) ?? new Map<string, number>();
    const vistos = vistasPorUser.get(u.id) ?? new Set<string>();
    // Quien vio la respuesta pierde el puntaje de ese ejercicio.
    const score = (slug: string) => (vistos.has(slug) ? 0 : (m.get(slug) ?? 0));
    const semanas: SemanaAlumno[] = WEEKS.map((w) => {
      const exs = porSemana(w.n);
      const logrados = exs.filter((e) => score(e.slug) >= PASS).length;
      const intentados = exs.filter((e) => m.has(e.slug) || vistos.has(e.slug)).length;
      return { n: w.n, total: exs.length, intentados, logrados, avance: pct(logrados, exs.length), promedio: Math.round(average(exs.map((e) => score(e.slug)))) };
    });
    const intentados = disponibles.filter((e) => m.has(e.slug)).length;
    const logrados = disponibles.filter((e) => score(e.slug) >= PASS).length;
    const { estado, dias } = estadoDe(u.ultimaConexion, ahora);
    const puntajes: Record<string, number> = {};
    for (const e of disponibles) if (m.has(e.slug) || vistos.has(e.slug)) puntajes[e.slug] = score(e.slug);
    return {
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      activo: u.activo,
      ultimaConexion: u.ultimaConexion,
      ultimoIntento: ultimoInt.get(u.id) ?? null,
      diasSinConexion: dias,
      ingresos: u.ingresos,
      estado,
      intentos: nIntentos.get(u.id) ?? 0,
      intentados,
      logrados,
      vistas: disponibles.filter((e) => vistos.has(e.slug)).length,
      participacion: pct(intentados, disponibles.length),
      avance: pct(logrados, disponibles.length),
      promedio: Math.round(average(disponibles.map((e) => score(e.slug)))),
      semanas,
      puntajes,
      vistosSlugs: [...vistos],
    };
  });

  const semanas: FilaSemana[] = WEEKS.map((w) => {
    const exs = porSemana(w.n);
    const idx = WEEKS.findIndex((x) => x.n === w.n);
    return {
      n: w.n,
      title: w.title,
      total: exs.length,
      participacion: Math.round(average(alumnos.map((a) => pct(a.semanas[idx].intentados, a.semanas[idx].total)))),
      avance: Math.round(average(alumnos.map((a) => a.semanas[idx].avance))),
      promedio: Math.round(average(alumnos.map((a) => a.semanas[idx].promedio))),
    };
  });

  const ejercicios: FilaEjercicio[] = disponibles.map((e) => {
    const intentaron = alumnos.filter((a) => e.slug in a.puntajes).length;
    const lograron = alumnos.filter((a) => (a.puntajes[e.slug] ?? 0) >= PASS).length;
    return {
      slug: e.slug,
      title: e.title,
      week: e.week,
      intentaron,
      lograron,
      vistas: alumnos.filter((a) => a.vistosSlugs.includes(e.slug)).length,
      logro: pct(lograron, alumnos.length),
      promedio: Math.round(average(alumnos.filter((a) => e.slug in a.puntajes).map((a) => a.puntajes[e.slug]))),
      intentosMedios: intentaron ? Math.round(((intentosPorSlug.get(e.slug) ?? 0) / intentaron) * 10) / 10 : 0,
    };
  });

  // Actividad de los últimos 30 días (intentos y estudiantes distintos por día, hora de Chile).
  const dias = new Map<string, { intentos: number; alumnos: Set<number> }>();
  for (let i = 29; i >= 0; i--) dias.set(claveDia(new Date(ahora.getTime() - i * DIA_MS)), { intentos: 0, alumnos: new Set() });
  for (const r of recientes) {
    const d = dias.get(claveDia(r.creadoEn));
    if (d) {
      d.intentos++;
      d.alumnos.add(r.userId);
    }
  }
  const actividad = [...dias.entries()].map(([dia, v]) => ({ dia, intentos: v.intentos, alumnos: v.alumnos.size }));

  const rangos = [
    ['0–20 %', 0, 20],
    ['21–40 %', 21, 40],
    ['41–60 %', 41, 60],
    ['61–80 %', 61, 80],
    ['81–100 %', 81, 100],
  ] as const;
  const distribucion = rangos.map(([rango, a, b]) => ({ rango, alumnos: alumnos.filter((x) => x.avance >= a && x.avance <= b).length }));

  return {
    disponibles: disponibles.length,
    alumnos,
    semanas,
    ejercicios,
    actividad,
    distribucion,
    resumen: {
      alumnos: alumnos.length,
      activos7: alumnos.filter((a) => a.estado === 'activo').length,
      enRiesgo: alumnos.filter((a) => a.estado === 'riesgo' || a.estado === 'nunca').length,
      nuncaIngresaron: alumnos.filter((a) => a.estado === 'nunca').length,
      sinIntentos: alumnos.filter((a) => a.intentados === 0).length,
      participacion: Math.round(average(alumnos.map((a) => a.participacion))),
      avance: Math.round(average(alumnos.map((a) => a.avance))),
      promedio: Math.round(average(alumnos.map((a) => a.promedio))),
      conRespuestasVistas: alumnos.filter((a) => a.vistas > 0).length,
      intentosTotales: alumnos.reduce((s, a) => s + a.intentos, 0),
    },
  };
}

/** Cursos que el usuario puede consultar: los suyos si es profesor, todos si es administrador. */
export function whereCursosDe(user: { id: number; rol: string }, historico: boolean) {
  return {
    periodo: { activo: !historico },
    ...(user.rol === 'ADMIN' ? {} : { profesorId: user.id }),
  };
}

const fmt = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' });
export const fmtFecha = (d: Date | null) => (d ? fmt.format(d) : '—');

export function hace(dias: number | null) {
  if (dias === null) return 'nunca';
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}
