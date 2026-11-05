# Evaluaciones del curso (según el export de Canvas) y cómo se reflejan en la plataforma

Fuente: `Backup Curso Canvas/202625-dot-2497-_-base-de-datos-export.imscc` (ver `scripts/canvas/LEEME.md`) y el syllabus.
Calendario del curso (13 semanas): U1 sem. 1; U2 sem. 2–6; U3 sem. 7–11; sem. 12 repaso/certificación; sem. 13 examen.

| Semana | Evaluación | Tipo / peso | Formato real en Canvas |
|---|---|---|---|
| 1 | Formativa 1 (guía) y diagnóstico | 0 % | Cuestionario |
| 2–3 | Formativas (avance de proyecto, diagramación ER) | 0 % | Tarea / ERDPlus |
| 4 | **Control 1** | Sumativa 7 % | 15 preguntas de selección: teoría de BD, tipo de especialización, transformación MER→relacional (imagen), normalización a 2FN (varias vistas) y a 1FN (facturas) |
| 5 | Proyecto parte 1 | 10,5 % | Entrega |
| 6 | **Solemne 1** | 14 % | Banco de 7: tipo de especialización (disyunta/solapada, total/parcial) en casos, identificar relación vs. entidad, cardinalidad de una relación, transformación de una entidad (débil, parcial) con imágenes, 3FN |
| 7 | Sentencias DDL y DML básicas | formativa | Práctica |
| 8 | **Control 2** | 7 % | 29 preguntas: 17 de selección sobre sintaxis (vistas, ALTER ADD, WHERE con AND/OR y paréntesis, COUNT + JOIN + IN, GROUP BY/HAVING, EXCEPT, INSERT, 9 variantes de CREATE PROCEDURE) y 12 de desarrollo (EXCEPT, procedimientos y funciones sobre la base de educación superior) |
| 9 | Operadores SET y funciones de grupo | formativa 4 | Práctica SQLite online |
| 10 | Proyecto parte 2 | 10,5 % | Entrega |
| 11 | **Solemne 2** | 14 % | 6 bancos de 10 variantes cada uno (se muestra 1 al azar): ver abajo |
| 12 | Certificación | 7 % | Certificado externo |
| 13 | **Examen** | 30 % | 15 bancos de selección múltiple (diseño, modelado, gestión de BD y SQL) |

## Solemne 2: los seis bancos (cada uno con 10 variantes sobre distintos modelos)
1. **ALTER TABLE … DROP COLUMN** (eliminar una columna de una tabla).
2. **UPDATE con porcentaje y condición sobre conteos** («subir 10 % el salario de los decanos con más de diez carreras»).
3. **CREATE VIEW** con un agregado (`COUNT`/`SUM`) agrupado por una entidad.
4. **Anti-join**: registros sin relacionados (`LEFT JOIN … IS NULL` o `MINUS`/`EXCEPT`).
5. **Consulta compleja**: el que tiene el mayor valor entre grupos filtrados con `LIKE`, `HAVING` y subconsultas.
6. **CREATE PROCEDURE** que modifica datos con un parámetro y condiciones sobre otras tablas.

## Bases de datos de las evaluaciones → plantillas de la plataforma
| Evaluación | Modelo (imagen) | Plantilla (`src/lib/sqltemplates/*.sql`) |
|---|---|---|
| Control 2, preguntas 18–29 | `Multimedia cargada/c2p37.png` (20 tablas: región…matrícula…estudiante) | `educacion_superior` |
| Control 2, preguntas 1–17 | cliente/factura/producto/categoría/modo_pago (inferido de las preguntas) | `comercio` |
| Control 2, preguntas 4–5 | `Sumativa4/B4/P1.png`, `B5/P1.png` (alumno, curso, curso_alumno, carrera, académico) | `academico` |
| Solemne 2 bancos 1, 2, 5, 6 | `solemne2/b1/*.png`, `b3/1.png`, `b4/6.png`, `b5/1.png` | `universidad` |
| Solemne 2 (préstamos, editorial, género) | `solemne2/b5/1.png`… `b6/2.png` | `biblioteca` |
| Solemne 2 (artículos, proveedores) | `solemne2/b2/4.png`, `b1/9.png`, `b1/10.png` | `inventario` |
| Clases semana 6–7 | scripts del profesor (`CENTRO_MEDICO`, UNAB, automotora, Rosselot, ejemplo UNAB) | `centro_medico`, `unab`, `automotora`, `rosselot`, `ejemplo_unab` |

Los datos de `centro_medico` y los DDL de clase son los **originales del profesor**; el resto son datos sintéticos deterministas
(`scripts/templates/build_templates.py`) diseñados para que las preguntas típicas tengan resultados interesantes
(p. ej. facultades sin carreras, materias con más de 30 estudiantes, personas sin préstamos, modalidad solo en 2021).

## Cómo se alinean los ejercicios (plan)
- **Semanas 1–6 (hechas)**: 15 ejercicios por semana. Pendiente: «simulacros» tipo Control 1 (semana 4) y Solemne 1 (semana 6) con preguntas de selección al estilo del Canvas.
- **Semanas 7–13 (en construcción)**: ejercicios de tipo `SQL_WORK` (consulta, DML/DDL, vista/procedimiento/función) corregidos por ejecución sobre las plantillas, más cuestionarios de sintaxis
  tipo Control 2, simulacros de Solemne 2 (los 6 bancos) y de Examen.
