# Multiusuario: profesores, cursos (NRC), periodos e indicadores

## Modelo
- `Rol`: `ADMIN`, `PROFESOR`, `ESTUDIANTE`. `Periodo` (activo/cerrado) → `Curso` (nombre + NRC, único por periodo, con `profesorId` opcional) → estudiantes (`User.cursoId`).
- **Histórico:** un periodo cerrado (`activo = false`) deja a sus cursos y estudiantes en «Histórico» del panel docente (`/profesor?historico=1`) y deja de ofrecerse al registrarse. Reabrir el periodo los devuelve a vigentes. Los estudiantes cerrados conservan su acceso a la plataforma.
- `User.ultimaConexion` / `ingresos`: se actualizan al iniciar sesión y, con actividad, como máximo cada 5 minutos (`getSessionUser`).
- Migración: `prisma/seed.mjs` asigna los estudiantes anteriores a un curso provisorio `SIN-NRC` de su periodo; reasígnalos en `/admin/estudiantes` y elimina el provisorio cuando quede vacío.

## Administrador (`/admin`)
`Profesores` (crear, activar/desactivar, restablecer clave), `Cursos (NRC)` (crear con periodo, vincular/desvincular profesor, eliminar si no tiene estudiantes), `Estudiantes` (asignar curso), `Resumen` (periodos: cerrar = enviar al histórico). El admin también ve todos los cursos en `/profesor`.

## Panel docente (`/profesor`)
- Inicio: KPIs agregados, tabla de cursos (participación, avance, promedio, activos 7 d, en riesgo) y estudiantes que requieren atención.
- Curso (`/profesor/curso/[id]`): KPIs, actividad 30 días, distribución del avance, avance por semana, tabla de estudiantes con última conexión, estado, participación, avance, promedio, mapa de calor S1–S13 y respuestas vistas (filtros, búsqueda y orden), ejercicios más difíciles y con más respuestas vistas.
- Estudiante (`/profesor/curso/[id]/alumno/[uid]`): detalle por semana y ejercicio e historial de intentos.
- Descargas CSV (`/profesor/export?curso=ID&tipo=alumnos|semanas|ejercicios|matriz`, sin `curso` = todos los cursos vigentes; `&historico=1`).
- Seguridad: un profesor solo accede a sus cursos (404 en los demás, también en el CSV); el estudiante recibe 403/redirección.

## Definiciones (`src/lib/indicadores.ts`)
Ejercicios disponibles = habilitados en `/admin/contenido`. **Participación** = % de disponibles intentados al menos una vez. **Avance** = % logrados (mejor puntaje ≥ 60). **Promedio** = promedio de mejores puntajes (0 si no intentó; 0 si vio la respuesta). Estado por última conexión: activo ≤ 7 d, inactivo 8–14 d, en riesgo > 14 d, nunca ingresó.

## Prueba
`scripts/e2e/multiusuario.mjs` (mismo comando que `smoke.mjs`, con `-e TAG=<sufijo>`): crea 2 profesores y un NRC, inscribe 3 estudiantes, verifica paneles, CSV, aislamiento entre profesores, histórico y reapertura. Crea datos `@test.cl` (ver «Limpiar datos de prueba» en `OPERACION.md`; borrar también los cursos `T…`).

## Ciclo de vida (activos / inactivos)
- **Estudiante desactivado** (a mano): pasa a la pestaña «Inactivos» de `/admin/estudiantes` y no puede ingresar; se reactiva con un clic. Sus resultados se conservan.
- **Cerrar un periodo** (`/admin/periodos`): en una sola transacción, el periodo pasa al histórico, **todos sus cursos (NRC) quedan «Desactivada»** y **todos sus estudiantes quedan inactivos** (`inactivoPorPeriodo`), por lo que se les cierra la sesión y no pueden ingresar. Los **profesores no se tocan**: quedan disponibles para vincularlos a los cursos de un periodo nuevo.
- **Reabrir un periodo** reactiva sus cursos y solo a los estudiantes que se desactivaron por el cierre (no a los desactivados a mano). Un estudiante de un periodo cerrado no se puede activar suelto: se reabre el periodo o se le asigna un curso vigente (asignar a un curso vigente reactiva; a uno cerrado deja inactivo).
- Solo se crean cursos en periodos activos; el registro solo ofrece cursos activos de periodos activos.
- **Profesores**: pestañas «Activos» / «Inactivos» en `/admin/profesores`; el administrador puede desactivarlos (conservan su historial) o **eliminarlos** definitivamente (con confirmación; sus cursos quedan sin profesor).
- En cursos vigentes, los indicadores solo cuentan cuentas activas; en el histórico se cuentan todas.

## Entorno claro / oscuro
Botón sol/luna en la barra superior (y en el login). La elección se guarda en el navegador (`localStorage.tema`); sin elección se usa la preferencia del sistema. El informe imprimible siempre sale en claro.

## Menú y dashboard
La barra superior usa íconos; solo la opción activa muestra su nombre (las demás, al pasar el cursor). `/admin` es el dashboard general (usuarios activos hoy/semana/mes, nunca ingresaron, accesos diarios en `Acceso`, intentos, avance por semana y por curso, profesores, estudiantes en riesgo, ejercicios difíciles y más practicados).
