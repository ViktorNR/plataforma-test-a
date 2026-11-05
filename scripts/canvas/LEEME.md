# Análisis del curso de Canvas (export .imscc)

Scripts de apoyo usados para estudiar el curso `Backup Curso Canvas/202625-dot-2497-_-base-de-datos-export.imscc`
(un .imscc es un ZIP). Se ejecutan en Docker (`python:3.12-slim`); montan la carpeta del proyecto en `/in` y una carpeta de trabajo en `/out`.

| Script | Qué hace |
|---|---|
| `canvas_extract.py` | Descomprime el .imscc en `/out/canvas` (y `Clase 6.zip`) |
| `canvas_analyze.py` | Genera en `/out/canvas_txt`: módulos del curso, cuestionarios (QTI) con respuestas correctas, tareas, páginas wiki y lista de archivos |
| `canvas_extract2.py` | Lista las imágenes de cada pregunta de Control 1, Solemne 1, Control 2 y Solemne 2 y descomprime los enunciados de proyectos |
| `canvas_docs.py` | Convierte a texto los .docx/.pdf de las semanas 4–13 (bancos de preguntas, tablas de especificaciones) |

Las imágenes de los modelos de datos de las evaluaciones están en `/out/canvas/web_resources/` (por ejemplo
`Multimedia cargada/c2p37.png` = base de educación superior del Control 2; `solemne2/b1/*.png` = base universidad, `solemne2/b3/*`, `b5/1.png` = biblioteca,
`b2/4.png` = inventario). Resumen de lo aprendido: `docs/EVALUACIONES.md`.
