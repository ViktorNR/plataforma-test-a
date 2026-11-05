import type { Exercise } from '../types';
import { sqlDml, sqlQ, sqlRoutine } from './dsl';

const use = (db: string) => `Trabaja con la base de datos \`${db}\` (cárgala desde «Bases de ejemplo» del Laboratorio o con \`USE ${db};\`).`;
const UNI = 'universidad';
const BIB = 'biblioteca';
const INV = 'inventario';
const DELIM = 'Recuerda cambiar el delimitador (`DELIMITER $$` … `$$` `DELIMITER ;`).';

/** Semana 11: simulacro de la Solemne 2 (seis tipos de pregunta sobre las bases de la evaluación). */
export const W11: Exercise[] = [
  // Universidad
  sqlDml(
    's11-uni-drop-col',
    11,
    'Universidad: eliminar una columna',
    UNI,
    [use(UNI), 'La universidad dejó de registrar la jornada de los profesores. Elimina la columna `jornada` de la tabla `profesor`.'],
    `ALTER TABLE profesor DROP COLUMN jornada;`,
    ['profesor'],
  ),
  sqlDml(
    's11-uni-sube-sueldo',
    11,
    'Universidad: reajuste condicionado',
    UNI,
    [use(UNI), 'Aumenta en un 10 % el salario de los profesores que dictan 2 o más materias (según `materia_profesor`).', 'Pista: usa una subconsulta con `GROUP BY` y `HAVING` dentro del `WHERE`.'],
    `UPDATE profesor SET salario = salario * 1.10 WHERE id IN (SELECT id_profesor FROM materia_profesor GROUP BY id_profesor HAVING COUNT(*) >= 2);`,
    ['profesor'],
  ),
  sqlRoutine(
    's11-uni-vista',
    11,
    'Universidad: vista con agregación',
    UNI,
    [use(UNI), 'Crea la vista `v_facultad_carreras` con el nombre de cada facultad (`facultad`) y la cantidad de carreras que tiene (`carreras`). Incluye también las facultades sin carreras (con 0).'],
    `CREATE VIEW v_facultad_carreras AS SELECT f.nombre AS facultad, COUNT(c.id) AS carreras FROM facultad f LEFT JOIN carrera c ON c.id_facultad = f.id GROUP BY f.id, f.nombre;`,
    ['SELECT * FROM v_facultad_carreras'],
  ),
  sqlQ(
    's11-uni-antijoin',
    11,
    'Universidad: estudiantes no inscritos en una materia',
    UNI,
    [use(UNI), 'Lista el nombre y apellido de los estudiantes que no están inscritos en la materia con id 1.', 'Pista: anti-join con `LEFT JOIN` condicionando la materia en el `ON`.'],
    `SELECT e.nombre, e.apellido FROM estudiante e LEFT JOIN materia_estudiante me ON me.id_estudiante = e.id AND me.id_materia = 1 WHERE me.id_estudiante IS NULL;`,
  ),
  sqlQ(
    's11-uni-max',
    11,
    'Universidad: facultad con más estudiantes',
    UNI,
    [use(UNI), 'Obtén el nombre de la facultad (o facultades, si hay empate) con mayor cantidad de estudiantes según `estudiante_facultad`, junto con esa cantidad.'],
    `SELECT f.nombre, COUNT(*) AS estudiantes FROM facultad f INNER JOIN estudiante_facultad ef ON ef.id_facultad = f.id GROUP BY f.id, f.nombre HAVING COUNT(*) = (SELECT MAX(x.n) FROM (SELECT COUNT(*) AS n FROM estudiante_facultad GROUP BY id_facultad) x);`,
  ),
  sqlRoutine(
    's11-uni-sp',
    11,
    'Universidad: procedimiento que actualiza',
    UNI,
    [use(UNI), 'Crea el procedimiento `sp_sube_decano(IN p_pct INT)` que aumente en `p_pct` por ciento el salario de todos los decanos.', DELIM],
    `DELIMITER $$\nCREATE PROCEDURE sp_sube_decano(IN p_pct INT)\nBEGIN\n  UPDATE decano SET salario = salario * (1 + p_pct / 100);\nEND$$\nDELIMITER ;`,
    ['CALL sp_sube_decano(5)'],
    ['decano'],
  ),
  // Biblioteca
  sqlDml(
    's11-bib-add-col',
    11,
    'Biblioteca: agregar una columna con valor por defecto',
    BIB,
    [use(BIB), 'Agrega a `libro` la columna `estado` de tipo `VARCHAR(10)` con valor por defecto `ACTIVO`.'],
    `ALTER TABLE libro ADD COLUMN estado VARCHAR(10) DEFAULT 'ACTIVO';`,
    ['libro'],
  ),
  sqlDml(
    's11-bib-upd-usuarios',
    11,
    'Biblioteca: desactivar usuarios sin un permiso',
    BIB,
    [use(BIB), 'Pon `condicion = 0` en los usuarios que no tienen asignado el permiso con id 4 en `usuario_permiso`.'],
    `UPDATE usuario SET condicion = 0 WHERE idusuario NOT IN (SELECT idusuario_fk FROM usuario_permiso WHERE idpermiso_fk = 4 AND idusuario_fk IS NOT NULL);`,
    ['usuario'],
  ),
  sqlRoutine(
    's11-bib-vista',
    11,
    'Biblioteca: vista de préstamos',
    BIB,
    [use(BIB), 'Crea la vista `v_prestamos` con `idprestamo`, el nombre de la persona (`persona`), el ISBN del libro (`isbn`), la fecha de préstamo y la de devolución.'],
    `CREATE VIEW v_prestamos AS SELECT p.idprestamo, pe.nom_persona AS persona, l.isbn, p.fecha_prestamo, p.fecha_devolucion FROM prestamo p INNER JOIN persona pe ON pe.idpersona = p.idpersona_fk INNER JOIN libro l ON l.idlibro = p.idlibro_fk;`,
    ['SELECT * FROM v_prestamos'],
  ),
  sqlQ(
    's11-bib-antijoin',
    11,
    'Biblioteca: libros nunca prestados',
    BIB,
    [use(BIB), 'Lista `idlibro` e `isbn` de los libros que nunca han sido prestados.'],
    `SELECT l.idlibro, l.isbn FROM libro l LEFT JOIN prestamo p ON p.idlibro_fk = l.idlibro WHERE p.idprestamo IS NULL;`,
  ),
  sqlQ(
    's11-bib-max',
    11,
    'Biblioteca: persona con más préstamos',
    BIB,
    [use(BIB), 'Obtén el nombre de la persona (o personas, si hay empate) con la mayor cantidad de préstamos y esa cantidad.'],
    `SELECT pe.nom_persona, COUNT(*) AS prestamos FROM persona pe INNER JOIN prestamo p ON p.idpersona_fk = pe.idpersona GROUP BY pe.idpersona, pe.nom_persona HAVING COUNT(*) = (SELECT MAX(x.n) FROM (SELECT COUNT(*) AS n FROM prestamo GROUP BY idpersona_fk) x);`,
  ),
  sqlRoutine(
    's11-bib-sp',
    11,
    'Biblioteca: procedimiento de devolución',
    BIB,
    [use(BIB), 'Crea el procedimiento `sp_devolver(IN p_id INT, IN p_fecha DATETIME)` que registre `p_fecha` como fecha de devolución del préstamo indicado.', DELIM],
    `DELIMITER $$\nCREATE PROCEDURE sp_devolver(IN p_id INT, IN p_fecha DATETIME)\nBEGIN\n  UPDATE prestamo SET fecha_devolucion = p_fecha WHERE idprestamo = p_id;\nEND$$\nDELIMITER ;`,
    [`CALL sp_devolver(1, '2026-10-01 10:00:00')`],
    ['prestamo'],
  ),
  // Inventario
  sqlRoutine(
    's11-inv-vista',
    11,
    'Inventario: valor por categoría',
    INV,
    [use(INV), 'Crea la vista `v_valor_categoria` con la descripción de la categoría (`categoria`) y el valor total de sus artículos (`valor`, suma de `cantidad * Importe`).'],
    `CREATE VIEW v_valor_categoria AS SELECT c.descripcion AS categoria, SUM(a.cantidad * a.Importe) AS valor FROM categoria c INNER JOIN articulo a ON a.Categoria_id = c.id GROUP BY c.id, c.descripcion;`,
    ['SELECT * FROM v_valor_categoria'],
  ),
  sqlQ(
    's11-inv-max-proveedor',
    11,
    'Inventario: proveedor con más artículos',
    INV,
    [use(INV), 'Obtén el nombre del proveedor (o proveedores, si hay empate) que suministra la mayor cantidad de artículos distintos y esa cantidad.'],
    `SELECT p.nombre, COUNT(*) AS articulos FROM proveedor p INNER JOIN articulo a ON a.Proveedor_id = p.id GROUP BY p.id, p.nombre HAVING COUNT(*) = (SELECT MAX(x.n) FROM (SELECT COUNT(*) AS n FROM articulo GROUP BY Proveedor_id) x);`,
  ),
  sqlDml(
    's11-inv-baja',
    11,
    'Inventario: dar de baja elementos',
    INV,
    [use(INV), 'Da de baja los elementos de la ubicación con id 1: `baja = 1`, `fechaBaja = \'2026-10-01\'` y `motivoBaja = \'Obsoleto\'`.'],
    `UPDATE elemento SET baja = 1, fechaBaja = '2026-10-01', motivoBaja = 'Obsoleto' WHERE Ubicacion_id = 1;`,
    ['elemento'],
  ),
];
