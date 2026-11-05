# Cómo agregar y modificar ejercicios

Todo el contenido vive en `src/lib/content/`. El orden de presentación de cada semana se define en `catalog.ts`
(semana 1: `W1_ORDER` en `w1.ts`; semanas 5 y 6: listas de slugs en `catalog.ts`; semanas 2–4: orden de los arrays).
Tras cualquier cambio: correr `scripts/selftest.ts` (ver `docs/OPERACION.md`) y reconstruir `web`.

## DSL (`dsl.ts`)

### Modelo E/R (semanas 2, 3 y los modelos mostrados en la 4)
```ts
E('Cliente', ['*rut', 'nombre', 'direccion(calle,numero,ciudad)', '+telefono', '~edad'])
```
Prefijos de atributo: `*` clave · `^` clave parcial (entidad débil) · `+` multivaluado · `~` derivado ·
`nombre|alias1|alias2` sinónimos aceptados · `compuesto(parte1,parte2)`.
Entidad: `E('!Consultorio', [...])` (el `!` = débil); `E('Nombre|alias', ...)`.
Relación: `R('compra', ['Cliente:N', 'Producto:N'], ['fecha'])`; `R('!tiene', [...])` = identificadora.
Cada extremo `Entidad:max` o `Entidad:minmax` (`Libro:1N`, `Autor:0N`; M = N). **Notación look across**: `A:1, B:N` = A es el lado «uno».
Especialización: `S('Persona', ['Estudiante','Funcionario'], 'd'|'o', 't'|'p')`.
Modelo: `M(entidades, relaciones, especializaciones?, layout?)`. `layout` = filas de nombres de entidad (`null` = hueco), solo para dibujar.

Un ejercicio E/R: `er(slug, semana, título, [párrafos], modelo, 'ER'|'EER')`. El enunciado **debe** nombrar los identificadores
(«rut (identificador)») y, si la solución declara mínimos, decir la participación («puede no tener…», «al menos un…»).
Las subclases de una especialización se dibujan como entidades: dales `aliases` para variantes de nombre
(`E('Software_Escritorio|Software de escritorio|Escritorio', …)`).

### Transformación (semana 4)
```ts
tr('s4-golazo', 'Fábrica de pelotas «Golazo»', MODELO)   // en w4.ts: las soluciones salen de autoSchemas(MODELO)
```
Para un caso con soluciones escritas a mano, usa el formato `options: SchemaSol[]` como en `modeling.ts` (`s4-alumnos`).

### Normalización (semana 5)
`norm(slug, título, [párrafos], atributos, ['a,b -> c,d', …], '2NF'|'3NF')`. Los grupos repetitivos se «aplanan»: su clave es
(clave de la relación + atributo repetido) y las DF lo reflejan. El selftest comprueba que la síntesis de 3FN obtiene 100 %.

### SQL DDL (semana 6)
```ts
sql('s6-hotel', 'Hotel', 'hotel', ['contexto…'], [
  T('hotel', ['cod_hotel int pk', 'nombre str60 nn']),
  T('habitacion', ['cod_hotel int pk', 'numero int pk', 'tipo str20 nn'], ['cod_hotel>hotel.cod_hotel']),
])
```
Columna: `nombre tipo banderas` con tipos `int | str[N] | dec | date | datetime | enum(a,b)` y banderas `pk nn u ai`.
FK: `'col>tabla.col'` o compuesta `'a,b>tabla.x,y'`. `T(..., { exact: true })` penaliza columnas sobrantes (útil para ejercicios con ALTER).
El enunciado de las tablas se redacta solo (`describeTables`). El selftest ejecuta el DDL de referencia (`toDdl`) contra MySQL.

### Cuestionarios (semana 1)
`quiz(slug, título, intro, [Q(texto, opciones, índiceCorrecto, explicación), …])`. Verdadero/falso: opciones `['Verdadero','Falso']`.

## Activar/desactivar
Desde el panel admin (`/admin/contenido`) por semana o ejercicio; no requiere tocar código.

## Material de origen
Los ejercicios reutilizan el material del profesor (guías MER/MER-E, casos de video, controles, normalización en Excel, guías DDL).
Mapa: semana 2 ← «Guía de Ejercicios MER» (11), «Complementario» (Decathlon, PCFactory, Biblioteca UNAB), cápsulas (farmacias, veterinaria);
semana 3 ← «Guía Ejercicios MER-E», Control I, Casos 1 y 2 (centro médico, biblioteca universitaria), repaso; semana 4 ← práctica «Modelo Relacional»
(Golazo, centro cultural, agencia, farmacias…); semana 5 ← «Ejercicios Normalización» (xlsx/pptx); semana 6 ← guías DDL y resolución del centro médico.
El catálogo completo está en `docs/CATALOGO.md` (generado con `scripts/catalog-md.ts`).


## Ejercicios SQL corregidos por ejecución (`SQL_WORK`, semanas 7–13)
Se escriben con el DSL de `src/lib/content/dsl.ts`; la base (`db`) es el id de una plantilla de `src/lib/sqltemplates/` (`centro_medico`, `unab`, `automotora`, `rosselot`, `ejemplo_unab`, `educacion_superior`, `comercio`, `academico`, `universidad`, `biblioteca`, `inventario`).
```ts
sqlQ(slug, semana, título, db, [enunciado…], 'SELECT …', { ordered: true })        // consulta: compara el conjunto de filas (orden solo si ordered)
sqlDml(slug, semana, título, db, [enunciado…], 'UPDATE …;', ['tabla1'])             // INSERT/UPDATE/DELETE/ALTER: compara columnas y filas finales de las tablas
sqlRoutine(slug, semana, título, db, [enunciado…], 'DELIMITER $$ …', ['CALL p(1)', 'SELECT f(2)'], ['tabla'])  // vista/procedimiento/función/trigger: ejecuta `tests` y compara sus salidas
```
Reglas: la referencia debe devolver filas (consultas) o cambiar algo (DML); evita filtros que dejen el resultado vacío (el selftest lo detecta). Las pruebas de rutinas pueden hacer INSERT previos.
`selftest.ts` exige: referencia = 100 %, respuesta trivial `SELECT 1` < 100 %, consulta no vacía.

### Semanas armadas con ejercicios reutilizados
`catalog.ts` usa `reuse(ex, semana, prefijo)` / `pick(pool, índices, semana, prefijo)` para repasar ejercicios en las semanas 6 (simulacro Solemne 1), 12 (repaso) y 13 (examen):
copia con otro slug (`s6-…`, `s12-…`, `s13-…`), mismo corrector y progreso independiente. `examQuiz()` junta las preguntas de varios cuestionarios en uno solo.

### «Ver respuesta»
`solutionOf(ex)` (`src/lib/solution.ts`) debe poder responder para cualquier tipo nuevo de ejercicio; el selftest verifica que toda solución sea no vacía.