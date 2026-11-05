# Plataforma de práctica · Base de Datos (ATDF103 · UNAB Online)

216 ejercicios con corrección automática en las 13 semanas del syllabus, más dos herramientas libres sin puntaje:
**Laboratorio MySQL** (tipo Workbench, con las 11 bases de ejemplo de clase y evaluaciones) y **lienzo Entidad-Relación libre** (estilo erdplus).
Cada ejercicio tiene un botón **«Ver respuesta»**: muestra la solución, pero el ejercicio queda con 0 % y bloqueado.

## Puesta en marcha
```powershell
docker compose up -d --build
```
- Aplicación: http://localhost:8300 (puerto configurable con `WEB_PORT` en `.env`).
- Administrador inicial: `ADMIN_EMAIL` / `ADMIN_PASSWORD` del archivo `.env` (se crea solo la primera vez).
- Los estudiantes se registran en `/registro` eligiendo uno de los periodos **activos** que crea el administrador.
- Servicios: `web` (Next.js), `db` (PostgreSQL) y `sandbox` (MySQL 8.4 aislado). Solo `web` publica puerto.

## ¿Qué contiene?
| Semana | Tipo de ejercicio | Cantidad |
|---|---|---|
| 1 | Cuestionarios de fundamentos | 15 |
| 2 | Modelo Entidad-Relación (lienzo) | 15 |
| 3 | E/R extendido (especialización, entidades débiles…) | 15 |
| 4 | Reglas de transformación E/R → relacional | 15 |
| 5 | Normalización hasta 3FN (arrastrar atributos) | 15 |
| 6 | Simulacro de Solemne 1 (cuestionarios + modelado, transformación, normalización) | 15 |
| 7 | SQL DDL y DML ejecutados en MySQL real | 28 |
| 8 | Consultas básicas y complejas (estilo Control 2) | 18 |
| 9 | UNION/INTERSECT/EXCEPT, anti-join, funciones de grupo | 15 |
| 10 | Vistas, procedimientos, funciones y triggers | 15 |
| 11 | Simulacro de Solemne 2 | 15 |
| 12 | Repaso y certificación | 18 |
| 13 | Simulacro de examen | 17 |

Panel admin: periodos, estudiantes, avance por semana, exportación CSV, cambio de clave y activación de semanas/ejercicios.
Catálogo completo en [`docs/CATALOGO.md`](docs/CATALOGO.md).

## Documentación
- [`CLAUDE.md`](CLAUDE.md) — **empieza aquí** para retomar el proyecto (estado, convenciones, mapa de archivos).
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — cómo está construido (datos, correctores, laboratorio, lienzo).
- [`docs/CONTENIDO.md`](docs/CONTENIDO.md) — cómo agregar o modificar ejercicios (DSL).
- [`docs/OPERACION.md`](docs/OPERACION.md) — comandos, pruebas (selftest y navegador), respaldo, problemas conocidos.
- [`docs/HISTORIAL.md`](docs/HISTORIAL.md) — decisiones, problemas resueltos y pendientes.
- [`docs/EVALUACIONES.md`](docs/EVALUACIONES.md) — Control 1, Solemne 1, Control 2, Solemne 2 y Examen del curso de Canvas, y cómo se reflejan en la plataforma.

> **Estado:** 13 semanas completas, 11 bases de ejemplo en el Laboratorio y «Ver respuesta» operativo. Ideas pendientes en `CLAUDE.md`.

## Seguridad (resumen)
Contraseñas con bcrypt; sesión httpOnly; límites de intentos. El SQL de los estudiantes solo corre en `sandbox` con usuarios MySQL de privilegios mínimos
(`sandbox` para la corrección; `ws<id>` por estudiante en el Laboratorio, limitado a sus propias bases). Con HTTPS agrega `COOKIE_SECURE=true` al servicio `web`.
