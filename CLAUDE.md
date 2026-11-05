# Plataforma de práctica · Base de Datos (ATDF103, UNAB Online)

Plataforma web para el curso de Base de Datos del profesor Eduardo Navarro. Los estudiantes practican con
**216 ejercicios en las 13 semanas del syllabus** con corrección automática (más botón «Ver respuesta»), más dos herramientas libres sin puntaje
(Laboratorio MySQL y lienzo E/R libre). Este archivo es la entrada para retomar el proyecto en una sesión nueva.

> Léelo junto con `docs/ARQUITECTURA.md` (cómo está hecho), `docs/CONTENIDO.md` (cómo agregar ejercicios),
> `docs/OPERACION.md` (cómo correrlo/probarlo) y `docs/HISTORIAL.md` (decisiones, problemas resueltos, pendientes).
> Hay una copia resumida en Notion: «Plataforma Base de Datos ATDF103 — Estructura del proyecto».

## Estado actual (resumen)
- En producción local con Docker: http://localhost:8300 (puerto elegido porque estaba libre; cambia con `WEB_PORT` en `.env`).
- Administrador inicial: `ADMIN_EMAIL` / `ADMIN_PASSWORD` de `.env` (la contraseña NO se documenta aquí).
- Funcionalidad: registro/login por periodo, panel admin (periodos, estudiantes, avance, CSV, activar/desactivar contenido),
  panel del estudiante (inicio con progreso, semanas, lista filtrable de ejercicios, ejercicio con corrección y historial),
  Laboratorio MySQL (`/panel/laboratorio`), lienzo E/R libre (`/panel/lienzo`).
- Contenido hoy: **13 semanas, 216 ejercicios** (ver `docs/CATALOGO.md`). Semanas 1–5 (15 c/u): fundamentos, E/R, E/R extendido, transformación, normalización.
  Semana 6 = simulacro de la Solemne 1 (3 cuestionarios + 12 ejercicios reutilizados de las semanas 3–5). Semana 7 = SQL DDL (15 scripts) + DML/consultas básicas (13) sobre `centro_medico`.
  Semana 8 = consultas básicas y complejas (15 + 3 cuestionarios, estilo Control 2). Semana 9 = UNION/INTERSECT/EXCEPT/anti-join y funciones de grupo (15). Semana 10 = vistas, procedimientos, funciones y trigger (15).
  Semana 11 = simulacro Solemne 2 (15, bases `universidad`, `biblioteca`, `inventario`). Semana 12 = repaso/certificación (18, copias). Semana 13 = simulacro de examen (17: 2 cuestionarios largos + copias).
- **«Ver respuesta»** en cada ejercicio (pedido del profesor, 2026-10-25): el estudiante confirma, ve la solución y el ejercicio queda con **0 %** y **bloqueado** (no se puede volver a corregir; solo enunciado + respuesta).
  Tabla `RespuestaVista` (Prisma), `POST /api/respuesta`, `src/lib/solution.ts` (`solutionOf`: quiz → respuestas+explicación; E/R → diagrama; transformación → variantes válidas; normalización → síntesis 3FN; SQL → script de referencia),
  `src/components/SolutionView.tsx`; `/api/intentos` responde 403 si ya vio la respuesta; `bestScores()` fuerza 0 en los ejercicios vistos.
- Pruebas: `scripts/selftest.ts` (1.915 comprobaciones: incluye DDL y todos los `SQL_WORK` contra MySQL real y las soluciones de «Ver respuesta») y navegador `scripts/e2e/smoke.mjs` + `scripts/e2e/nuevo.mjs` (semanas 6–13, práctica SQL, ver respuesta, bases de ejemplo).

## Ampliación del 2026-10-25 (COMPLETADA): curso completo alineado con las evaluaciones
El profesor pidió: (a) plataforma de estudio para **todo el syllabus** (13 semanas), (b) ejercicios **similares a Control 1, Solemne 1, Control 2 y Solemne 2**
del export de Canvas, (c) cargar en el Laboratorio **todas las bases de datos de ejemplo** que usa en clase, (d) botón «Ver respuesta». Ver `docs/EVALUACIONES.md`.

**Hecho (infraestructura):**
- 11 bases de ejemplo en `src/lib/sqltemplates/*.sql` (+ `meta.ts`, `index.ts`): `centro_medico` (original del profesor), `unab`, `automotora`, `rosselot`, `ejemplo_unab`,
  `educacion_superior`, `comercio`, `academico`, `universidad`, `biblioteca`, `inventario`. Se regeneran con `scripts/templates/build_templates.py`.
- Laboratorio: panel «Bases de ejemplo» (botón Cargar) → `POST /api/workbench/template`; ejemplos «Clase: SELECT/DML del Centro médico».
- Nuevo tipo de ejercicio `SQL_WORK` (kinds `query` | `dml` | `routine`): `src/lib/grading/sqlwork.ts` ejecuta la respuesta y la solución de referencia sobre copias limpias de la plantilla
  (`src/lib/sqlexec.ts`) y compara resultados/estado/salida de llamadas de prueba. UI `src/components/SqlWork.tsx` (esquema de la base + «Ejecutar sin puntaje» → `POST /api/sql/probar`).
- MySQL del sandbox ahora con `--lower-case-table-names=1` (nombres insensibles a mayúsculas, como en Windows). **El volumen `bdplat_mysql` se recreó** (no hay datos que perder).

**Hecho (contenido):** `weeks.ts` (13 semanas), DSL `sqlQ/sqlDml/sqlRoutine`, archivos `w6.ts` (cuestionarios Solemne 1), `w7ddl.ts` + `w7dml.ts`, `w8.ts`…`w11.ts`; `catalog.ts` arma las semanas 6, 12 y 13
reutilizando ejercicios con `reuse()`/`pick()` (slugs `s6-…`, `s12-…`, `s13-…`; progreso independiente, mismo corrector). Los DDL pasaron de la semana 6 a la 7 (slugs `s6-*` → `s7-*`).

**Ideas pendientes (opcionales):**
1. Simulacros tipo **Control 1** como cuestionarios largos en la semana 4 (hoy se cubren con la semana 6 y 13).
2. Más ejercicios `SQL_WORK` con otras bases (`automotora`, `rosselot`, `unab`, `ejemplo_unab`) y preguntas de selección múltiple de Control 2 (P8–P29) sobre procedimientos.
3. Mostrar una insignia «respuesta vista» en las listas de ejercicios (hoy aparece como 0 %).
4. Limpieza: estudiantes de prueba creados por los scripts e2e (correos `…@test.cl`) conviene borrarlos desde el panel admin / base de datos.

## Stack
TypeScript · Next.js 15 (App Router, React 19) · Prisma 6 + PostgreSQL 16 · mysql2 · @xyflow/react 12 (lienzo) ·
html-to-image (PNG) · jose + bcryptjs (sesión propia) · zod · CSS plano (`src/app/globals.css`, sin Tailwind).
MySQL 8.4 aislado (contenedor `sandbox`) para corregir SQL y para el laboratorio.

## Convenciones importantes (no las rompas)
1. **Soluciones nunca al navegador**: `toPublic()` en `src/lib/content/index.ts` filtra lo que ve el cliente.
2. **Notación de cardinalidad «look across» (erdplus)**: el valor junto a una entidad es cuántas ocurrencias de ESA entidad se asocian
   con UNA de la otra. En el DSL `R('distribuye', ['Camionero:1','Paquete:N'])` significa «un camionero, muchos paquetes».
   El corrector compara siempre el **máximo**; el **mínimo** solo si la solución lo declara (`'Libro:1N'`).
3. **Ejercicios = código** (`src/lib/content/`), no base de datos. El admin solo los activa/desactiva (`ContentToggle`).
4. **El corrector SQL ejecuta scripts de estudiantes**: solo en el contenedor `sandbox`, con usuario `sandbox` limitado a bases `sbx_*`.
   El Laboratorio usa un usuario MySQL por estudiante (`ws<id>`) limitado a `sbx_u<id>_*`. No ampliar privilegios.
5. Después de tocar contenido o correctores, corre `scripts/selftest.ts` (ver `docs/OPERACION.md`). Debe terminar con 0 fallidas.
6. Idioma: toda la interfaz y el contenido en español de Chile. Nombres de código en inglés/español mixto ya establecido.
7. Colores/branding: logo en `public/logo_uandresbello.png`; azul marino `#151f2f` y rojo `#ad2131` (tomados del logo).

## Mapa de archivos clave
| Ruta | Qué hay |
|---|---|
| `src/lib/content/` | `weeks.ts` (resúmenes), `dsl.ts` (E/R, SQL, quiz, normalización), `w1..w11.ts` (w6 = cuestionarios Solemne 1; w7ddl/w7dml; w8–w11 SQL), `modeling.ts`/`quizzes.ts`/`sqlnorm.ts` (ejercicios originales), `transform.ts` (soluciones automáticas semana 4), `catalog.ts` (orden final), `index.ts` |
| `src/lib/grading/` | `er.ts`, `schema.ts`, `normalization.ts`, `sql.ts`, `quiz.ts`, `index.ts` (despacho + validación zod) |
| `src/lib/workbench.ts`, `sqlsplit.ts`, `workbench-examples.ts` | Laboratorio MySQL |
| `src/lib/sqltemplates/` | Bases de ejemplo (`*.sql`, `meta.ts` seguro para el navegador, `index.ts` con lectura y `schemaOf`) |
| `src/lib/sqlexec.ts`, `src/lib/grading/sqlwork.ts` | Ejecución en copias limpias y corrector de consultas/DML/rutinas |
| `scripts/canvas/`, `scripts/templates/` | Análisis del export de Canvas y generador de bases de ejemplo |
| `src/lib/er-layout.ts` | Dibuja un `ErModel` como diagrama (semana 4) |
| `src/components/er/` | Lienzo: `ErEditor` (editor), `ErView` (solo lectura), `ErParts` (nodos/aristas) |
| `src/components/` | `ExercisePlayer`, `SchemaBuilder`, `NormBuilder`, `SqlEditor`, `Quiz`, `Workbench`, `FreeCanvas`, `ExerciseList`, `Header`, `NavLinks`… |
| `src/app/` | `login`, `registro`, `panel/*` (estudiante), `admin/*`, `api/*` |
| `prisma/schema.prisma`, `prisma/seed.mjs` | Datos de la plataforma y administrador inicial |
| `docker-compose.yml`, `Dockerfile`, `docker/mysql-init/` | Despliegue |

## Pendientes / ideas (ver `docs/HISTORIAL.md` para más)
- Notas ponderadas / integración con Canvas (LTI) no implementadas.
- Editor de ejercicios desde el panel admin (hoy se edita el código).

## Material de clases en LaTeX (fuera de este repo)
Las presentaciones Beamer de cada semana están en `..\Clases Latex\` (5 archivos por semana, tema UNAB igual al del sitio, última diapositiva con captura de la plataforma).
Estado: semanas 1 a 3 listas; faltan 4 a 10. Reglas, componentes y flujo en `..\Clases Latex\README.md`; compilar con `compilar.ps1`, que **rechaza cualquier desborde** (tabla/tarjeta/diagrama más grande que la diapositiva).
Las capturas salen de `scripts/e2e/capturas.mjs` (`WEEK=N`), contra la plataforma local.