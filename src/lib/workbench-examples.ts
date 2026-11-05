export interface WbExample {
  id: string;
  title: string;
  description: string;
  script: string;
}

const DEMO_SETUP = `CREATE DATABASE IF NOT EXISTS tienda_demo;
USE tienda_demo;

DROP TABLE IF EXISTS detalle;
DROP TABLE IF EXISTS pedido;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS cliente;

CREATE TABLE cliente (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  ciudad VARCHAR(40),
  email VARCHAR(80) UNIQUE
);

CREATE TABLE producto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60) NOT NULL,
  categoria VARCHAR(30),
  precio INT NOT NULL,
  stock INT DEFAULT 0
);

CREATE TABLE pedido (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fecha DATE NOT NULL,
  id_cliente INT NOT NULL,
  FOREIGN KEY (id_cliente) REFERENCES cliente(id)
);

CREATE TABLE detalle (
  id_pedido INT,
  id_producto INT,
  cantidad INT NOT NULL,
  PRIMARY KEY (id_pedido, id_producto),
  FOREIGN KEY (id_pedido) REFERENCES pedido(id),
  FOREIGN KEY (id_producto) REFERENCES producto(id)
);

INSERT INTO cliente (nombre, ciudad, email) VALUES
  ('Ana Pérez', 'Santiago', 'ana@correo.cl'),
  ('Luis Soto', 'Valparaíso', 'luis@correo.cl'),
  ('María Rojas', 'Viña del Mar', 'maria@correo.cl'),
  ('Pedro Díaz', 'Santiago', 'pedro@correo.cl'),
  ('Carla Muñoz', 'Concepción', 'carla@correo.cl');

INSERT INTO producto (nombre, categoria, precio, stock) VALUES
  ('Notebook 14"', 'Computación', 450000, 12),
  ('Mouse inalámbrico', 'Accesorios', 9990, 80),
  ('Teclado mecánico', 'Accesorios', 39990, 35),
  ('Monitor 24"', 'Computación', 129990, 20),
  ('Audífonos', 'Audio', 24990, 50),
  ('Parlante Bluetooth', 'Audio', 34990, 0);

INSERT INTO pedido (fecha, id_cliente) VALUES
  ('2026-03-02', 1), ('2026-03-05', 2), ('2026-03-09', 1), ('2026-04-01', 3), ('2026-04-10', 4);

INSERT INTO detalle (id_pedido, id_producto, cantidad) VALUES
  (1, 1, 1), (1, 2, 2), (2, 4, 1), (3, 5, 3), (3, 2, 1), (4, 3, 1), (4, 5, 2), (5, 1, 1);

SELECT * FROM cliente;`;

export const WB_EXAMPLES: WbExample[] = [
  {
    id: 'demo',
    title: 'Cargar base de ejemplo (tienda_demo)',
    description: 'Crea la base, cuatro tablas relacionadas y datos para practicar consultas.',
    script: DEMO_SETUP,
  },
  {
    id: 'crear',
    title: 'Crear mi propia base de datos y tablas',
    description: 'CREATE DATABASE, USE, CREATE TABLE con claves primarias y foráneas.',
    script: `CREATE DATABASE IF NOT EXISTS mi_base;
USE mi_base;

CREATE TABLE IF NOT EXISTS alumno (
  rut VARCHAR(12) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  fecha_nacimiento DATE
);

CREATE TABLE IF NOT EXISTS curso (
  codigo VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  creditos INT
);

CREATE TABLE IF NOT EXISTS inscripcion (
  rut VARCHAR(12),
  codigo VARCHAR(10),
  nota DECIMAL(3,1),
  PRIMARY KEY (rut, codigo),
  FOREIGN KEY (rut) REFERENCES alumno(rut),
  FOREIGN KEY (codigo) REFERENCES curso(codigo)
);

INSERT INTO alumno VALUES ('11111111-1', 'Camila Torres', '2003-05-14'), ('22222222-2', 'Diego Vega', '2002-11-30');
INSERT INTO curso VALUES ('ATDF103', 'Base de Datos', 6), ('MAT101', 'Matemáticas', 5);
INSERT INTO inscripcion VALUES ('11111111-1', 'ATDF103', 6.2), ('22222222-2', 'ATDF103', 5.1);

SHOW TABLES;
DESCRIBE inscripcion;`,
  },
  {
    id: 'simples',
    title: 'Consultas simples',
    description: 'SELECT, WHERE, ORDER BY, LIMIT, LIKE, IN, BETWEEN, DISTINCT.',
    script: `USE tienda_demo;

-- Todos los productos
SELECT * FROM producto;

-- Filtrar y ordenar
SELECT nombre, precio FROM producto WHERE precio > 30000 ORDER BY precio DESC;

-- Rango, lista y patrón
SELECT * FROM producto WHERE precio BETWEEN 10000 AND 50000;
SELECT * FROM cliente WHERE ciudad IN ('Santiago', 'Valparaíso');
SELECT * FROM cliente WHERE nombre LIKE '%a %';

-- Valores distintos y conteo
SELECT DISTINCT categoria FROM producto;
SELECT COUNT(*) AS total_productos FROM producto;`,
  },
  {
    id: 'complejas',
    title: 'Consultas complejas (JOIN, GROUP BY, subconsultas)',
    description: 'Combinar tablas, agrupar con HAVING, subconsultas y UNION.',
    script: `USE tienda_demo;

-- JOIN de cuatro tablas: qué compró cada cliente
SELECT c.nombre AS cliente, p.fecha, pr.nombre AS producto, d.cantidad, d.cantidad * pr.precio AS subtotal
FROM cliente c
JOIN pedido p   ON p.id_cliente = c.id
JOIN detalle d  ON d.id_pedido = p.id
JOIN producto pr ON pr.id = d.id_producto
ORDER BY p.fecha, c.nombre;

-- Agrupación con HAVING: clientes que han gastado más de 100.000
SELECT c.nombre, SUM(d.cantidad * pr.precio) AS total
FROM cliente c
JOIN pedido p ON p.id_cliente = c.id
JOIN detalle d ON d.id_pedido = p.id
JOIN producto pr ON pr.id = d.id_producto
GROUP BY c.id, c.nombre
HAVING total > 100000
ORDER BY total DESC;

-- Subconsulta: productos más caros que el promedio
SELECT nombre, precio FROM producto WHERE precio > (SELECT AVG(precio) FROM producto);

-- LEFT JOIN: clientes que nunca han comprado
SELECT c.nombre FROM cliente c LEFT JOIN pedido p ON p.id_cliente = c.id WHERE p.id IS NULL;

-- UNION
SELECT nombre, 'Cliente' AS tipo FROM cliente
UNION
SELECT nombre, 'Producto' FROM producto;`,
  },
  {
    id: 'vista',
    title: 'Vistas',
    description: 'CREATE VIEW para guardar una consulta y usarla como una tabla.',
    script: `USE tienda_demo;

CREATE OR REPLACE VIEW v_ventas AS
SELECT p.id AS pedido, p.fecha, c.nombre AS cliente,
       SUM(d.cantidad * pr.precio) AS total
FROM pedido p
JOIN cliente c   ON c.id = p.id_cliente
JOIN detalle d   ON d.id_pedido = p.id
JOIN producto pr ON pr.id = d.id_producto
GROUP BY p.id, p.fecha, c.nombre;

-- Usar la vista como si fuera una tabla
SELECT * FROM v_ventas ORDER BY total DESC;
SELECT cliente, SUM(total) AS gastado FROM v_ventas GROUP BY cliente;`,
  },
  {
    id: 'procedimiento',
    title: 'Procedimiento almacenado',
    description: 'DELIMITER, parámetros de entrada/salida, IF y CALL.',
    script: `USE tienda_demo;

DROP PROCEDURE IF EXISTS sp_ventas_cliente;

DELIMITER $$
CREATE PROCEDURE sp_ventas_cliente(IN p_cliente INT, OUT p_total INT)
BEGIN
  SELECT COALESCE(SUM(d.cantidad * pr.precio), 0) INTO p_total
  FROM pedido p
  JOIN detalle d   ON d.id_pedido = p.id
  JOIN producto pr ON pr.id = d.id_producto
  WHERE p.id_cliente = p_cliente;

  IF p_total = 0 THEN
    SELECT 'El cliente no tiene compras' AS mensaje;
  ELSE
    SELECT CONCAT('Total comprado: ', p_total) AS mensaje;
  END IF;
END$$
DELIMITER ;

CALL sp_ventas_cliente(1, @total);
SELECT @total AS total_cliente_1;
CALL sp_ventas_cliente(5, @total);`,
  },
  {
    id: 'funcion',
    title: 'Función y trigger',
    description: 'CREATE FUNCTION con RETURNS y un trigger que valida datos.',
    script: `USE tienda_demo;

DROP FUNCTION IF EXISTS iva;
DELIMITER $$
CREATE FUNCTION iva(monto INT) RETURNS INT DETERMINISTIC
BEGIN
  RETURN ROUND(monto * 0.19);
END$$
DELIMITER ;

SELECT nombre, precio, iva(precio) AS iva, precio + iva(precio) AS precio_final FROM producto;

-- Trigger: impide precios negativos
DROP TRIGGER IF EXISTS trg_precio_valido;
DELIMITER $$
CREATE TRIGGER trg_precio_valido BEFORE INSERT ON producto
FOR EACH ROW
BEGIN
  IF NEW.precio < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El precio no puede ser negativo';
  END IF;
END$$
DELIMITER ;

INSERT INTO producto (nombre, categoria, precio) VALUES ('Prueba', 'Test', -5);`,
  },
  {
    id: 'clase_dql',
    title: 'Clase: consultas SELECT del Centro médico',
    description: 'Las 8 consultas de la clase (alias, JOIN, BETWEEN, IN, LIKE, NOT IN). Carga antes la base «Centro médico».',
    script: `USE centro_medico;

-- 1) Alias de columna y de tabla
SELECT p.NOMBRE AS Nombre_Paciente, p.CORREO AS Correo_Contacto, p.COMUNA AS Comuna_Residencia, p.CIUDAD AS Ciudad
FROM PACIENTE AS p;

-- 2) JOIN de 3 tablas: cita, paciente y médico
SELECT c.ID_CITA AS Codigo_Cita, pac.NOMBRE AS Paciente, per.NOMBRE AS Medico_Tratante, c.FECHA_HORA AS Fecha_Y_Hora, c.ESTADO AS Estado_Cita
FROM CITA AS c
INNER JOIN PACIENTE AS pac ON c.RUT_PACIENTE = pac.RUT_PACIENTE
INNER JOIN PERSONAL AS per ON c.RUT_PERSONAL = per.RUT_PERSONAL
ORDER BY c.FECHA_HORA;

-- 3) WHERE con dos condiciones
SELECT per.NOMBRE AS Medico, m.ANIOS_EXPERIENCIA, md.ASIGNATURA_ROTACION
FROM MEDICO AS m
INNER JOIN PERSONAL AS per ON m.RUT_PERSONAL = per.RUT_PERSONAL
INNER JOIN MEDICO_DOCENTE AS md ON m.RUT_PERSONAL = md.RUT_PERSONAL
WHERE m.ANIOS_EXPERIENCIA > 10;

-- 4) BETWEEN
SELECT c.ID_CITA, p.NOMBRE, c.FECHA_HORA, c.ESTADO
FROM CITA AS c INNER JOIN PACIENTE AS p ON c.RUT_PACIENTE = p.RUT_PACIENTE
WHERE c.FECHA_HORA BETWEEN '2025-01-01 00:00:00' AND '2025-12-31 23:59:59'
ORDER BY c.FECHA_HORA;

-- 5) IN
SELECT NOMBRE, COMUNA, CIUDAD FROM PACIENTE WHERE COMUNA IN ('Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa');

-- 6) LIKE
SELECT NOMBRE, CORREO FROM PACIENTE WHERE NOMBRE LIKE 'M%' AND CORREO LIKE '%@gmail.com';

-- 7) NOT IN con subconsulta
SELECT per.NOMBRE AS Medico, m.ANIOS_EXPERIENCIA
FROM MEDICO AS m INNER JOIN PERSONAL AS per ON m.RUT_PERSONAL = per.RUT_PERSONAL
WHERE m.RUT_PERSONAL NOT IN (SELECT RUT_PERSONAL FROM MEDICO_TRATANTE);`,
  },
  {
    id: 'clase_dml',
    title: 'Clase: DML del Centro médico (UPDATE y DELETE)',
    description: 'Actualizar el correo de un paciente, anular citas vencidas y eliminar registros. Carga antes la base «Centro médico».',
    script: `USE centro_medico;

-- Cambiar el correo de un paciente
UPDATE PACIENTE SET CORREO = 'ignacio.tapia@outlook.com' WHERE RUT_PACIENTE = '19061083-K';

-- Anular citas «RESERVADO» anteriores al 16 de agosto de 2026
UPDATE CITA SET ESTADO = 'ANULADO' WHERE ESTADO = 'RESERVADO' AND FECHA_HORA < '2026-08-16 00:00:00';

-- Eliminar el consultorio 4 del centro médico 1
DELETE FROM CONSULTORIO WHERE CODIGO_CENTRO = 1 AND NUMERO_CONSULTORIO = 4;

-- Eliminar el rol administrativo del área TI (no elimina a las personas)
DELETE FROM ADMINISTRATIVO WHERE AREA = 'TI';

SELECT ESTADO, COUNT(*) AS cantidad FROM CITA GROUP BY ESTADO;`,
  },
  {
    id: 'dml',
    title: 'Modificar datos (INSERT, UPDATE, DELETE)',
    description: 'Inserta, actualiza y elimina registros; observa las claves foráneas.',
    script: `USE tienda_demo;

INSERT INTO cliente (nombre, ciudad, email) VALUES ('Nuevo Cliente', 'Temuco', 'nuevo@correo.cl');
UPDATE producto SET stock = stock + 10 WHERE categoria = 'Audio';
SELECT * FROM producto WHERE categoria = 'Audio';

-- ¿Puedes eliminar un cliente que tiene pedidos? Prueba y lee el error.
DELETE FROM cliente WHERE id = 1;`,
  },
];
