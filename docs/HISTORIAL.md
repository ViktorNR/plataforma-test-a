# Historial, decisiones y pendientes

## Cronología del desarrollo (resumen)
1. **Planificación** (página de Notion «Plataforma Base de Datos ATDF103 — Estructura del proyecto»): stack TypeScript, roles, módulos por semana.
2. **Base**: Next.js + Prisma/PostgreSQL + sandbox MySQL en Docker, puerto 8300. Registro por periodo, panel admin, 12 ejercicios iniciales.
3. **Notación erdplus**: tras ver los ejemplos del profesor (MER y MERE de un estudiante) y la documentación de erdplus, el lienzo adopta
   cardinalidad `(mín,máx)` con la notación «look across», atributos clave/parcial/multivaluado/derivado/compuesto, entidad débil,
   relación identificadora y especialización con círculo `d`/`o`.
4. **Corrección del editor**: las conexiones atributo–entidad/relación estaban rechazadas (orden alfabético del par); se agregó el botón
   «Atributo compuesto» (crea el atributo con dos sub-atributos).
5. **90 ejercicios (15 por semana)** a partir de la carpeta `Material Ejercicios`; DSL de contenido; generador automático de soluciones
   relacionales (`transform.ts`); selftest de ~1.100 comprobaciones.
6. **Laboratorio MySQL** (tipo Workbench, sin puntaje) y **lienzo E/R libre** con exportación PNG/JSON.
7. **Rediseño visual y de usabilidad** con el logo UNAB y su paleta (azul marino `#151f2f`, rojo `#ad2131`); barra fija «Corregir», filtros, siguiente ejercicio.

8. **Curso completo y evaluaciones** (2026-10-25, en curso): el profesor aportó el export de Canvas y pidió cubrir las 13 semanas del syllabus con ejercicios similares a Control 1, Solemne 1,
   Control 2 y Solemne 2, y cargar en el Laboratorio todas las bases de ejemplo de clase. Se analizó el curso (`docs/EVALUACIONES.md`), se crearon 11 bases de ejemplo, el tipo `SQL_WORK`
   (consultas/DML/rutinas corregidas por ejecución), carga de bases desde el Laboratorio y la práctica «Ejecutar sin puntaje». Falta el contenido de las semanas 7–13 y los simulacros (ver `CLAUDE.md`).

## Decisiones tomadas (y por qué)
- **Ejercicios en código, no en BD**: versionables y verificables con el selftest; el admin solo activa/desactiva. Cambiar a editor web es posible (ver pendientes).
- **Sesión propia en lugar de Auth.js**: menos dependencias, suficiente para el alcance.
- **Notación look-across**: así lo define erdplus y lo usó el estudiante del ejemplo; el máximo siempre se corrige, el mínimo solo si el enunciado lo exige
  (el material original es ambiguo con la participación).
- **Soluciones múltiples** en transformación: el corrector prueba todas y toma la mejor (estrategias de especialización, lado de la FK en 1:1).
- **MySQL por estudiante con prefijo de base** en el Laboratorio: aislamiento real por privilegios MySQL, sin depender de analizar el SQL.
- **Comparación de nombres tolerante** (sin tildes, plural simple, aliases) para no penalizar variantes razonables.
- **Sin Node local**: todo se construye y prueba en contenedores.
- **Los ejercicios SQL se corrigen por resultado, no por texto**: se ejecutan la respuesta y la referencia en copias limpias de la base y se comparan filas/estado; así valen todas las formas correctas de escribir la consulta (JOIN, subconsulta, EXCEPT, LEFT JOIN…).
- **`lower-case-table-names=1`**: los scripts del profesor mezclan mayúsculas y minúsculas (MySQL en Windows); en Linux fallarían. Se recreó el volumen de MySQL para activarlo.
- **Datos de las evaluaciones**: Canvas solo trae el diagrama de cada base (imágenes), no los datos; se generaron datos sintéticos con semilla fija que hacen interesantes las preguntas típicas.

## Problemas resueltos (para no repetirlos)
- Líneas no dibujadas en `ErView` (faltaba `ConnectionMode.Loose`).
- Zoom automático del lienzo al soltar la primera forma (`fitView` solo con diagrama inicial).
- Error de hidratación por fechas en el historial.
- `CREATE FUNCTION/TRIGGER` fallaba por binlog (`--log-bin-trust-function-creators=1`).
- Comentario `/* */` dentro de un comentario JSDoc rompió la compilación de `sqlsplit.ts`.
- Divisor de sentencias: `prevWord` debía reiniciarse tras `;` para detectar `WHILE` después de `END`.
- Etiquetas `(?,M)` en rojo en diagramas de solo lectura (ahora muestran solo el máximo cuando el modelo no define mínimo).

## Pendientes e ideas
- **Semanas 7–13** del syllabus: consultas (SELECT, JOIN, GROUP BY/HAVING), operadores SET, procedimientos y funciones, certificación.
  El Laboratorio ya permite practicarlas; falta un corrector que compare **resultados de consultas** (ejecutar la consulta del estudiante y la de referencia
  sobre una base de datos de ejemplo y comparar conjuntos de filas) y de procedimientos/funciones.
- Editor de ejercicios en el panel admin (crear/editar sin tocar código) y banco de ejercicios en base de datos.
- Notas ponderadas / exportación a Canvas; LTI.
- Mostrar solución o pista progresiva tras N intentos (decisión pedagógica pendiente del profesor).
- Guardar el diseño libre en el servidor (hoy solo `localStorage` + archivo).
- Posible mejora de legibilidad automática del layout para modelos muy grandes (centro médico, biblioteca universitaria).
- Revisar con el profesor los enunciados donde el material original era ambiguo (participación mínima, claves de entidades como `Ciudad`).
- Rendimiento/seguridad si se publica a internet: HTTPS (`COOKIE_SECURE`), límites de recursos del MySQL, copias de seguridad programadas.


## 2026-10-25 — Curso completo (13 semanas) y «Ver respuesta»
- Se estudió el export de Canvas (`scripts/canvas/`, `docs/EVALUACIONES.md`) y la carpeta `Material Ejercicios`; se cargaron 11 bases de ejemplo (`src/lib/sqltemplates/`).
- Nuevo tipo `SQL_WORK` (consulta/DML/rutina corregidos ejecutando en MySQL real sobre copias limpias). MySQL con `--lower-case-table-names=1` y `--log-bin-trust-function-creators=1`.
- Semanas según syllabus: 6 = Solemne 1, 7 = DDL/DML, 8 = consultas (Control 2), 9 = operadores relacionales, 10 = procedimientos/funciones, 11 = Solemne 2, 12 = repaso, 13 = examen. Los DDL se movieron de la semana 6 a la 7
  (slugs `s6-*` → `s7-*`; el progreso previo de esos ejercicios en una base ya usada quedaría huérfano: no había estudiantes reales aún).
- Botón «Ver respuesta» (pedido del profesor): 0 % y ejercicio bloqueado. Decisión: se muestra la solución *de referencia* (en normalización, una síntesis 3FN calculada), no la respuesta del estudiante.
- Problemas resueltos: consultas de anti-join vacías en los datos sintéticos (se cambiaron las condiciones); `UPDATE` sin efecto detectado por el selftest (usuario/permiso de `biblioteca`).
- Pendientes opcionales: ver `CLAUDE.md`.
## 2026-10-25 (tarde) — Colores de sintaxis y respuestas formateadas
- «Ver respuesta» muestra las respuestas SQL con indentación (`src/lib/sqlformat.ts`, una cláusula por línea, subconsultas indentadas) y con colores (`src/lib/sqlhighlight.ts`, componente `SqlCode`).
- Los editores SQL (ejercicios DDL/SQL y Laboratorio) usan `SqlCodeEditor`: textarea transparente sobre una capa coloreada (palabras reservadas azul, funciones amarillo, tipos verde, cadenas naranja, números verde claro, comentarios gris).
- El formateador no se aplica si hay comentarios, DELIMITER o BEGIN…END. El selftest verifica que formatear no cambie el contenido (2.049 comprobaciones).
- Ojo: `scripts/e2e/node_modules` y `out` se excluyen en `.dockerignore` (si no, `docker compose build` falla).

## 2026-10-25 (tarde) — Colores de sintaxis y respuestas formateadas
- «Ver respuesta» muestra las respuestas SQL con indentación (`src/lib/sqlformat.ts`: una cláusula por línea, subconsultas indentadas) y con colores (`src/lib/sqlhighlight.ts`, componente `SqlCode`).
- Los editores SQL (ejercicios DDL/SQL y Laboratorio) usan `SqlCodeEditor`: textarea transparente sobre una capa coloreada.
- El formateador no actúa si hay comentarios, DELIMITER o BEGIN…END. El selftest verifica que no cambie el contenido (2.049 comprobaciones).
- `scripts/e2e/node_modules` y `out` están en `.dockerignore` (sin eso `docker compose build` falla).

## 2026-10-25 (noche) — Diagramas de solución sin superposiciones
- `resolveOverlaps()` en `src/lib/er-layout.ts`: separa relaciones/atributos/especializaciones que quedaban sobre otros nodos (entidades fijas) y reubica los atributos cuya línea cruzaba otro elemento. `countOverlaps()` + selftest: ningún diagrama de los ejercicios (E/R, EER y transformación) tiene nodos superpuestos.
- El lienzo libre centra el diagrama tras «Abrir archivo…». `scripts/export-json.ts` genera `exportacion-json/` (incluye `importar-lienzo/` con diagramas importables).

- 2026-10-25: «Empresa de software» (semana 3 y 4) tenía los empleados sin relación con el resto; se agregaron las relaciones `desarrolla` (Desarrollador–Producto, N:M) y `atiende` (Vendedor–Cliente, 1:N) y se actualizó el enunciado. El selftest ahora exige que todo modelo E/R sea conexo (sin entidades sueltas).

## 2026-10-25 — Clases en LaTeX (semanas 1 a 4)
- `Clases Latex/` contiene las presentaciones Beamer (tema UNAB igual al del sitio) de las semanas 1 a 4, con diagramas E/R y esquemas relacionales generados por `diagramas/er_tikz.py` (todos los atributos conectados) y verificación automática de desbordes en `compilar.ps1`. Reglas y flujo en `Clases Latex/README.md`. Desde la semana 7 (SQL) se agregan .txt con el DDL y la resolución.

## 2026-10-25 — Multiusuario (profesores, cursos NRC, histórico e indicadores)
- Roles ADMIN/PROFESOR/ESTUDIANTE, cursos (nombre + NRC) por periodo vinculados a un profesor, registro de estudiantes por NRC, histórico al cerrar un periodo y panel docente con indicadores y descargas CSV. Detalle en docs/MULTIUSUARIO.md; prueba e2e scripts/e2e/multiusuario.mjs.

- 2026-10-25: informe imprimible del curso (/profesor/curso/[id]/informe), gestión de estudiantes con ficha y clave temporal, menú con íconos, dashboard general del administrador, entorno claro/oscuro y ciclo de vida activos/inactivos (cerrar periodo desactiva NRC y estudiantes; profesores se conservan).

- 2026-10-26: Clases LaTeX, semanas 5 (normalización), 6 (repaso Solemne 1) y 7 (DDL/DML con .txt de DDL, datos y resolución) listas.
