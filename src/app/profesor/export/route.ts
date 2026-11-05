import { getSessionUser } from '@/lib/auth';
import { cursoAccesible, estudiantesDeCurso } from '@/lib/cursos';
import { db } from '@/lib/db';
import { ESTADO_LABEL, calcularIndicadores, fmtFecha, whereCursosDe } from '@/lib/indicadores';
import { WEEKS } from '@/lib/content';

export const dynamic = 'force-dynamic';

// Evita inyección de fórmulas al abrir el CSV en Excel.
const cell = (v: string | number | null | undefined) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const csv = (rows: (string | number | null)[][]) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');

const slugify = (s: string) => s.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

/**
 * Indicadores en CSV (separador «;», UTF-8 con BOM para Excel).
 * ?curso=ID  un curso; sin curso: todos los cursos vigentes del docente (?historico=1 para el histórico).
 * ?tipo=alumnos | semanas | ejercicios | matriz
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.rol === 'ESTUDIANTE') return new Response('No autorizado', { status: 403 });

  const url = new URL(req.url);
  const tipo = url.searchParams.get('tipo') ?? 'alumnos';
  const cursoParam = url.searchParams.get('curso');
  const historico = url.searchParams.get('historico') === '1';

  const cursos = cursoParam
    ? [await cursoAccesible(user, Number(cursoParam))].filter((c): c is NonNullable<typeof c> => !!c)
    : await db.curso.findMany({ where: whereCursosDe(user, historico), include: { periodo: true, profesor: true }, orderBy: [{ nombre: 'asc' }, { nrc: 'asc' }] });
  if (cursos.length === 0) return new Response('Curso no encontrado', { status: 404 });

  const rows: (string | number | null)[][] = [];
  if (tipo === 'alumnos') {
    rows.push([
      'Periodo', 'Curso', 'NRC', 'Apellido', 'Nombre', 'Correo', 'Cuenta activa', 'Última conexión', 'Días sin conectarse', 'Estado', 'Ingresos',
      'Intentos', 'Ejercicios intentados', 'Ejercicios logrados', 'Respuestas vistas', 'Participación %', 'Avance %', 'Promedio %',
      ...WEEKS.map((w) => `Avance S${w.n} %`),
    ]);
  } else if (tipo === 'semanas') {
    rows.push(['Periodo', 'Curso', 'NRC', 'Semana', 'Título', 'Ejercicios', 'Participación %', 'Avance %', 'Promedio %']);
  } else if (tipo === 'ejercicios') {
    rows.push(['Periodo', 'Curso', 'NRC', 'Semana', 'Ejercicio', 'Estudiantes que lo intentaron', 'Lo lograron', 'Vieron la respuesta', 'Logro %', 'Promedio %', 'Intentos medios']);
  } else if (tipo === 'matriz') {
    // Una fila por estudiante y una columna por ejercicio (mejor puntaje).
    const ind0 = await calcularIndicadores([]);
    rows.push(['Periodo', 'Curso', 'NRC', 'Apellido', 'Nombre', ...ind0.ejercicios.map((e) => `S${e.week} ${e.title}`)]);
  } else {
    return new Response('Tipo de reporte no válido', { status: 400 });
  }

  for (const c of cursos) {
    const ind = await calcularIndicadores(await estudiantesDeCurso(c.id, !c.periodo.activo));
    const base = [c.periodo.nombre, c.nombre, c.nrc];
    if (tipo === 'alumnos') {
      for (const a of ind.alumnos) {
        rows.push([
          ...base, a.apellido, a.nombre, a.email, a.activo ? 'Sí' : 'No', fmtFecha(a.ultimaConexion), a.diasSinConexion, ESTADO_LABEL[a.estado], a.ingresos,
          a.intentos, a.intentados, a.logrados, a.vistas, a.participacion, a.avance, a.promedio,
          ...a.semanas.map((s) => (s.total ? s.avance : '')),
        ]);
      }
    } else if (tipo === 'semanas') {
      for (const s of ind.semanas) rows.push([...base, s.n, s.title, s.total, s.participacion, s.avance, s.promedio]);
    } else if (tipo === 'ejercicios') {
      for (const e of ind.ejercicios) rows.push([...base, e.week, e.title, e.intentaron, e.lograron, e.vistas, e.logro, e.promedio, e.intentosMedios]);
    } else {
      for (const a of ind.alumnos) rows.push([...base, a.apellido, a.nombre, ...ind.ejercicios.map((e) => (e.slug in a.puntajes ? a.puntajes[e.slug] : ''))]);
    }
  }

  const nombre = cursos.length === 1 ? `${slugify(cursos[0].nombre)}-nrc${cursos[0].nrc}` : 'mis-cursos';
  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="indicadores-${tipo}-${nombre}.csv"`,
    },
  });
}
