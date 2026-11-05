# Arquitectura

## Visión general
```
Navegador ──► bdplat-web (Next.js 15, puerto 8300→3000)
                 ├─► bdplat-db       PostgreSQL 16  (usuarios, periodos, intentos, activaciones)
                 └─► bdplat-sandbox  MySQL 8.4      (corrector DDL + Laboratorio MySQL)
```
Solo `web` publica puerto. Los tres servicios están en `docker-compose.yml` (proyecto `plataforma-bd`).
Volúmenes: `bdplat_pg` (Postgres) y `bdplat_mysql` (MySQL; conserva las bases del Laboratorio).

## Datos de la plataforma (Prisma / PostgreSQL)
- `Periodo(nombre único, activo)` — el admin los crea; el estudiante elige uno activo al registrarse.
- `User(nombre, apellido, email único, passwordHash, rol ADMIN|ESTUDIANTE, activo, periodoId)`.
- `Intento(userId, exerciseSlug, respuesta Json, puntaje Float, feedback Json, creadoEn)` — un registro por corrección.
- `ContentToggle(key, enabled)` — `week:3` o el slug de un ejercicio; por defecto todo está habilitado.
El esquema se sincroniza al iniciar el contenedor (`prisma db push`); `prisma/seed.mjs` crea el administrador y un periodo inicial.

## Autenticación
Sesión propia: JWT HS256 (`jose`) en cookie `bdplat_session` (httpOnly, 7 días) firmada con `AUTH_SECRET`; contraseñas con bcrypt.
`requireUser`/`requireAdmin` en `src/lib/auth.ts`. Límite de intentos en memoria (`src/lib/ratelimit.ts`) para login, registro, corrección y laboratorio.
Si se publica con HTTPS: variable `COOKIE_SECURE=true` en el servicio `web`.

## Contenido y corrección
Cada ejercicio es un objeto tipado (`Exercise` en `src/lib/types.ts`) con enunciado y solución. Tipos:
| Tipo | Respuesta del estudiante | Corrector |
|---|---|---|
| `QUIZ` | `{answers}` | `grading/quiz.ts` |
| `ER` / `EER` | `{nodes, edges}` del lienzo | `grading/er.ts` compara entidades, atributos (clave, parcial, multivaluado, derivado, compuesto), relaciones y cardinalidades, especializaciones, entidades débiles |
| `TRANSFORMACION` | tablas con columnas, PK y FK | `grading/schema.ts` prueba **todas** las soluciones aceptadas y elige la mejor |
| `NORMALIZACION` | tablas de atributos con PK | `grading/normalization.ts` calcula con cierre de dependencias: claves, 2FN/3FN, reunión sin pérdida (chase), preservación de DF |
| `SQL_DDL` | `{script}` | `grading/sql.ts` ejecuta en MySQL real y compara con `information_schema` |
| `SQL_WORK` | `{script}` | `grading/sqlwork.ts` (consultas, DML y rutinas sobre una base de ejemplo; ver abajo) |

Puntaje: porcentaje; «logrado» ≥ 60 (`PASS` en `src/lib/progress.ts`). Se guarda el mejor puntaje por ejercicio.
Los nombres se comparan sin tildes, mayúsculas ni plural simple (`strip`/`key` en `grading/text.ts`), con `aliases` por elemento.

### Semana 4: soluciones automáticas
`src/lib/content/transform.ts::autoSchemas(model)` genera todas las soluciones relacionales válidas de un modelo E/R:
entidad→tabla, compuesto→una columna por parte, derivado→no se almacena, multivaluado→tabla aparte, 1:N→FK en el lado N,
1:1→FK en cualquiera de los dos lados, N:M y ternarias→tabla intermedia, entidad débil→PK compuesta, reflexivas→FK a la misma tabla,
especialización→estrategia 1 (tabla por clase), 3 (tabla única con `tipo`, solo disyunta) o 4 (tabla única con indicadores `es_x`).
El corrector reconoce tablas intermedias y columnas FK por **estructura** (a qué tablas apuntan), no solo por nombre.

### Corrector SQL (semana 6)
Por intento: nombre de base único `sbx_<hex>_<nombre>`; el script se reescribe (`CREATE DATABASE/USE/DROP` y `db.tabla`), se ejecuta
con el usuario `sandbox` (privilegios solo sobre `sbx\_%`), se inspecciona `information_schema` (tablas, columnas, familia de tipo, NOT NULL,
UNIQUE, AUTO_INCREMENT, PK, FK, `exact` para columnas sobrantes) y se borra todo en `finally`. Máx. 3 correcciones simultáneas.

### Bases de ejemplo y ejercicios SQL sobre ellas (`SQL_WORK`)
- `src/lib/sqltemplates/<id>.sql`: DDL + datos (sin `CREATE DATABASE`/`USE`). El **id es el nombre lógico de la base** (`USE centro_medico;`). `meta.ts` (lista, seguro para el navegador),
  `index.ts` (`readTemplateSql`, `schemaOf` que extrae tablas/columnas/PK/FK para mostrar el esquema). 11 plantillas: ver `docs/EVALUACIONES.md`.
- `sqlexec.ts`: `createScratch(id)` crea (como root) una copia limpia `sbx_<hex>_<id>` ejecutando el script de la plantilla; `isolateDb` reescribe `USE x`/`x.tabla`; `execStatement` normaliza resultados.
- `grading/sqlwork.ts` (`gradeSqlWork`): para cada intento crea copia(s) limpia(s); ejecuta la **referencia** y la **respuesta** (sentencia por sentencia con `splitStatements`, usuario `sandbox`) y compara:
  - `query`: último conjunto de filas (multiconjunto; ignora nombres de columnas; acepta columnas en otro orden; `ordered` exige el orden). Puntaje parcial por columnas, filas y coincidencia.
  - `dml`: estado final de `tables` (columnas + filas). `routine`: se ejecutan `tests` (p. ej. `CALL p(1)`, `SELECT f(2)`, `SELECT * FROM vista`) en ambas copias y se compara la salida (+ `tables` opcional).
  - Máx. 3 correcciones simultáneas, 40 sentencias, 20.000 caracteres, 10 s por sentencia; todo se borra en `finally`.
- `practiceSqlWork` + `POST /api/sql/probar`: botón «Ejecutar (sin puntaje)» del ejercicio; corre el script en una copia y devuelve las salidas.
- El Laboratorio carga cualquier plantilla en el espacio del estudiante con `loadTemplate` (`POST /api/workbench/template`, como root hacia `sbx_u<id>_<id>`); límite 14 bases por estudiante.
- El servidor MySQL usa `--lower-case-table-names=1` (solo se puede fijar al crear el volumen de datos).

## Laboratorio MySQL (`/panel/laboratorio`)
- Cada estudiante tiene un usuario MySQL propio `ws<id>` (clave derivada con HMAC de `AUTH_SECRET`), creado la primera vez con la clave root
  (`SANDBOX_MYSQL_ROOT_PASSWORD`). Privilegios solo sobre `sbx\_u<id>\_%` (SELECT/INSERT/UPDATE/DELETE/CREATE/DROP/ALTER/INDEX/REFERENCES/
  CREATE VIEW/SHOW VIEW/CREATE ROUTINE/ALTER ROUTINE/EXECUTE/TRIGGER/…); sin EVENT, FILE, SUPER ni GRANT OPTION. Máx. 3 conexiones.
- El estudiante escribe nombres normales; `workbench.ts::rewrite` los traduce a `sbx_u<id>_<nombre>` y quita el prefijo de resultados y errores.
- `sqlsplit.ts` separa sentencias como Workbench: soporta `DELIMITER`, cadenas, comentarios y cuerpos BEGIN…END.
- Límites: 6 bases por estudiante, 60 sentencias y 60.000 caracteres por ejecución, 500 filas mostradas, 15 s por sentencia,
  `max_execution_time` 8 s en SELECT, sentencias bloqueadas (`GRANT`, `CREATE USER`, `LOAD DATA`, `CREATE EVENT`, …).
- El servidor MySQL arranca con `--log-bin-trust-function-creators=1` para permitir funciones y triggers sin SUPER.
- API: `POST /api/workbench/run`, `GET|DELETE /api/workbench/schema` (DELETE = restablecer el espacio).

## Lienzo E/R
`ErEditor` (React Flow) con nodos `entity | relationship | attribute | spec` y arista flotante `FloatingEdge`
(líneas rectas entre bordes; curvas con `data.bend` para relaciones reflexivas). Paleta con arrastrar/soltar,
atributo compuesto (crea 2 sub-atributos), entidad débil, relación identificadora, especialización d/o y total/parcial.
`free` activa exportar PNG (html-to-image), guardar/abrir `.json`. `FreeCanvas` guarda el diseño libre en `localStorage`.
`ErView` + `er-layout.ts` dibujan un `ErModel` de solo lectura (semana 4) con `layout` por filas de entidades.

## Interfaz
Layout: `Header` (logo, navegación activa con `NavLinks`, usuario) → páginas. Estilos en un solo `globals.css` con variables de marca.
Inicio: héroe con progreso y «Continuar», tarjetas de herramientas, semanas con anillo de progreso. Semana: repaso plegable + `ExerciseList`
(filtros Todos/Pendientes/Por mejorar/Logrados y buscador). Ejercicio: enunciado, consejo de resolución, editor según tipo, barra fija
«Corregir» (Ctrl+Enter), retroalimentación, siguiente ejercicio, historial.
