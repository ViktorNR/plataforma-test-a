export interface WeekMeta {
  n: number;
  title: string;
  short: string;
  indicators: string;
  summary: string[];
}

export const WEEKS: WeekMeta[] = [
  {
    n: 1,
    title: 'Fundamentos de bases de datos',
    short: 'Conceptos, ventajas, modelos de datos y arquitecturas.',
    indicators: 'AE1 · IL 1.1, 1.2, 1.3',
    summary: [
      'Una base de datos es una colección organizada de datos relacionados; el SGBD (DBMS) es el software que permite definirla, manipularla y protegerla.',
      'Ventajas frente a archivos tradicionales: menor redundancia e inconsistencia, integridad, seguridad, acceso concurrente e independencia de datos.',
      'Modelos de datos: relacional (tablas), jerárquico, de red, orientado a objetos y NoSQL (documentos, clave-valor, columnas, grafos).',
      'Arquitectura de tres niveles (ANSI/SPARC): externo (vistas), conceptual (esquema lógico) e interno (almacenamiento físico).',
      'Arquitecturas de despliegue: centralizada, cliente-servidor, de tres capas y distribuida.',
    ],
  },
  {
    n: 2,
    title: 'Modelo Entidad-Relación',
    short: 'Entidades, atributos, relaciones y cardinalidades.',
    indicators: 'AE2 · IL 2.1, 2.2',
    summary: [
      'Entidad: objeto del mundo real distinguible (rectángulo). Atributo: propiedad de una entidad o relación (óvalo).',
      'El atributo clave identifica de forma única cada ocurrencia y se subraya. Un atributo multivaluado puede tener varios valores (doble óvalo).',
      'Relación: asociación entre entidades (rombo). La cardinalidad indica cuántas ocurrencias se asocian: 1:1, 1:N o N:M.',
      'Una relación también puede tener atributos propios (por ejemplo, la fecha de un préstamo).',
      'En esta plataforma la cardinalidad se escribe como (mín,máx) junto a cada entidad, con la notación «look across» de erdplus: indica con cuántas ocurrencias de esa entidad se asocia una ocurrencia de la otra. Mínimo 0 = participación opcional; 1 = obligatoria. Máximo 1 o M (muchos).',
      'Atributos: clave (subrayado), multivaluado (doble óvalo), derivado (óvalo punteado) y compuesto (un atributo con sub-atributos conectados a él). Entidad débil: rectángulo doble, con su relación identificadora (rombo doble) y clave parcial (subrayado punteado).',
    ],
  },
  {
    n: 3,
    title: 'Modelo Entidad-Relación extendido',
    short: 'Generalización y especialización: total/parcial, disyunta/solapada.',
    indicators: 'AE2 · IL 2.1, 2.2, 2.3',
    summary: [
      'Especialización: una superclase se divide en subclases con atributos propios; la generalización es el camino inverso.',
      'Participación total: todo miembro de la superclase pertenece a alguna subclase (doble línea). Parcial: puede no pertenecer a ninguna.',
      'Disyunta (d): un miembro pertenece como máximo a una subclase. Solapada (o): puede pertenecer a varias a la vez.',
      'Las subclases heredan los atributos y relaciones de la superclase.',
      'Dibujo: línea desde la superclase al símbolo de especialización y desde el símbolo a cada subclase.',
    ],
  },
  {
    n: 4,
    title: 'Reglas de transformación E/R → relacional',
    short: 'Convierte un modelo E/R en tablas, claves primarias y foráneas.',
    indicators: 'AE2 · IL 2.4',
    summary: [
      'Cada entidad fuerte se transforma en una tabla; su atributo clave pasa a ser la clave primaria.',
      'Relación 1:N: la clave de la entidad del lado «1» se agrega como clave foránea en la tabla del lado «N».',
      'Relación N:M: se crea una tabla intermedia con las claves de ambas entidades (clave primaria compuesta) y los atributos de la relación.',
      'Atributo multivaluado: se crea una tabla aparte con la clave de la entidad y el atributo; ambos forman la clave primaria.',
      'Especialización: varias alternativas (tabla por subclase con FK a la superclase, o tablas con todos los atributos si es total y disyunta).',
      'Notación algebraica: TABLA(<u>clave</u>, atributo, #clave_foranea).',
    ],
  },
  {
    n: 5,
    title: 'Normalización',
    short: 'Dependencias funcionales y formas normales hasta 3FN.',
    indicators: 'AE2 · IL 2.5',
    summary: [
      'Una dependencia funcional X → Y indica que el valor de X determina el de Y.',
      '1FN: valores atómicos. 2FN: 1FN y sin dependencias parciales (atributos no primos que dependen de una parte de la clave).',
      '3FN: 2FN y sin dependencias transitivas (atributos no primos que dependen de otro atributo no clave).',
      'Una buena descomposición debe ser sin pérdida de información y, idealmente, conservar las dependencias.',
      'Método: identifica la clave, detecta las dependencias que violan la forma normal y separa cada una en su propia tabla.',
    ],
  },
  {
    n: 6,
    title: 'Solemne 1: repaso integrador',
    short: 'Fundamentos, modelo E/R y extendido, reglas de transformación y primeras formas normales.',
    indicators: 'AE1 y AE2 · IL 2.1 a 2.5',
    summary: [
      'La Solemne 1 evalúa fundamentos y arquitectura de bases de datos, modelado E/R y extendido, reglas de transformación y normalización hasta 3FN.',
      'Especialización: define si es <b>disyunta</b> (un miembro pertenece a una sola subclase) o <b>solapada</b>, y <b>total</b> (todo miembro pertenece a alguna subclase) o <b>parcial</b>. Las subclases se enumeran cuando el enunciado las nombra todas (total) o solo algunas (parcial).',
      'Una venta, un préstamo o una matrícula suele modelarse como una <b>relación</b> entre entidades (con atributos propios), no como un atributo.',
      'Entidad débil: su clave primaria es la de la entidad fuerte más su identificador parcial. Especialización parcial: se puede crear una sola tabla con los atributos de las subclases.',
      'Cardinalidad: lee el enunciado en ambos sentidos («un animal pertenece a una especie; una especie tiene muchos animales» = 1:N).',
      'Normalización: 3FN elimina dependencias transitivas (atributos que dependen de otro atributo no clave).',
    ],
  },
  {
    n: 7,
    title: 'Sentencias básicas DDL y DML',
    short: 'CREATE, ALTER, DROP e INSERT, UPDATE, DELETE sobre bases reales en MySQL.',
    indicators: 'AE3 · IL 3.2, 3.4',
    summary: [
      'DDL define estructuras: CREATE DATABASE, CREATE TABLE (tipos, PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, AUTO_INCREMENT), ALTER TABLE (ADD, MODIFY, DROP COLUMN, RENAME) y DROP.',
      'DML manipula datos: <code>INSERT INTO t (cols) VALUES (...)</code>, <code>UPDATE t SET col = valor WHERE ...</code> y <code>DELETE FROM t WHERE ...</code>. Sin WHERE se afectan todas las filas.',
      'Las claves foráneas protegen la integridad: no puedes eliminar un registro referenciado ni insertar uno que referencie algo inexistente.',
      'Orden de inserción: primero las tablas referenciadas (padre), después las que tienen la clave foránea (hija).',
      'En esta semana tu script se ejecuta en MySQL real: los ejercicios DDL comparan la estructura creada y los DML comparan el estado final de las tablas.',
    ],
  },
  {
    n: 8,
    title: 'Consultas básicas y complejas en SQL',
    short: 'SELECT con filtros, JOIN, agrupación, subconsultas y vistas (Control 2).',
    indicators: 'AE3 · IL 3.1, 3.2, 3.4',
    summary: [
      'Orden de una consulta: <code>SELECT … FROM … JOIN … ON … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT</code>.',
      'Filtros: <code>=, &lt;&gt;, &gt;, BETWEEN, IN, NOT IN, LIKE, IS NULL, AND/OR</code> (usa paréntesis para combinar AND y OR).',
      'JOIN: INNER JOIN solo trae coincidencias; LEFT JOIN conserva todas las filas de la izquierda (útil para «los que no tienen…»).',
      'Funciones de grupo (COUNT, SUM, AVG, MIN, MAX) con GROUP BY; las condiciones sobre agregados van en HAVING, no en WHERE.',
      'Una vista guarda una consulta: <code>CREATE VIEW nombre AS SELECT …</code>.',
      'Se corrige comparando el <b>resultado</b> de tu consulta con el esperado; cualquier forma correcta de escribirla vale.',
    ],
  },
  {
    n: 9,
    title: 'Operadores relacionales en SQL',
    short: 'UNION, INTERSECT y EXCEPT (MINUS), funciones de grupo y agrupación.',
    indicators: 'AE3 · IL 3.1, 3.3',
    summary: [
      'Los operadores de conjuntos combinan consultas con el mismo número y tipo de columnas: <code>UNION</code> (sin repetidos), <code>UNION ALL</code>, <code>INTERSECT</code> (en ambas) y <code>EXCEPT</code> (en la primera y no en la segunda).',
      'En MySQL el equivalente de MINUS (Oracle) es <code>EXCEPT</code>; también puedes usar <code>LEFT JOIN … WHERE col IS NULL</code> o <code>NOT IN / NOT EXISTS</code>.',
      'COUNT(*) cuenta filas; COUNT(col) ignora NULL; COUNT(DISTINCT col) cuenta valores distintos.',
      'Toda columna del SELECT que no es agregada debe estar en el GROUP BY. HAVING filtra grupos.',
      'Subconsultas escalares (<code>… &gt; (SELECT AVG(…))</code>) y con IN/EXISTS permiten comparar contra resultados calculados.',
    ],
  },
  {
    n: 10,
    title: 'Procedimientos y funciones',
    short: 'CREATE PROCEDURE y CREATE FUNCTION con parámetros, variables y control de flujo.',
    indicators: 'AE3 · IL 3.4, 3.5',
    summary: [
      'Un procedimiento almacenado agrupa sentencias reutilizables: <code>CREATE PROCEDURE p(IN x INT) BEGIN … END</code>; se invoca con <code>CALL p(5)</code>.',
      'Una función devuelve un valor: <code>CREATE FUNCTION f(x INT) RETURNS INT DETERMINISTIC BEGIN … RETURN …; END</code>; se usa dentro de un SELECT.',
      'En el Laboratorio cambia el delimitador con <code>DELIMITER $$ … $$ DELIMITER ;</code> para que el cuerpo (con punto y coma) se envíe completo.',
      'Parámetros: IN (entrada), OUT (salida) e INOUT. No pongas comillas al usar un parámetro: <code>WHERE id = cliente_id</code> (no <code>\'cliente_id\'</code>).',
      'Los procedimientos pueden hacer SELECT, INSERT, UPDATE o DELETE con las condiciones recibidas por parámetro.',
      'Se corrige llamando a tu procedimiento/función con valores de prueba y comparando su salida o el estado de las tablas.',
    ],
  },
  {
    n: 11,
    title: 'Solemne 2: repaso integrador de SQL',
    short: 'ALTER, UPDATE condicionado, vistas, consultas sin relación, consultas complejas y procedimientos.',
    indicators: 'AE3 · IL 3.1 a 3.5',
    summary: [
      'La Solemne 2 tiene seis tipos de pregunta: <b>ALTER … DROP COLUMN</b>, <b>UPDATE con porcentaje y condición sobre conteos</b>, <b>CREATE VIEW con agregado</b>, <b>registros sin relacionados</b> (LEFT JOIN/EXCEPT), <b>consulta compleja con máximo</b> y <b>procedimiento que modifica datos</b>.',
      'UPDATE con porcentaje: <code>SET salario = salario * 1.10</code> (10 % más) o <code>* 0.95</code> (5 % menos). Para condicionar por conteos usa <code>WHERE id IN (SELECT … GROUP BY … HAVING COUNT(*) &gt; n)</code>.',
      'Para «el que tiene el mayor…» agrupa, ordena de forma descendente y limita a 1 (<code>ORDER BY total DESC LIMIT 1</code>) o compara con el máximo en una subconsulta.',
      'LIKE: <code>\'C%\'</code> empieza con C; <code>\'%A\'</code> termina con A; combínalos con paréntesis: <code>(nombre LIKE \'C%\' OR nombre LIKE \'M%\')</code>.',
      'Cada ejercicio indica la base de datos del modelo (universidad, biblioteca, inventario…).',
    ],
  },
  {
    n: 12,
    title: 'Repaso general y certificación',
    short: 'Preguntas integradoras de todo el curso para preparar el examen final.',
    indicators: 'AE1, AE2 y AE3',
    summary: [
      'Repasa los tres bloques del curso: fundamentos y modelos de datos (semanas 1–3), diseño relacional y normalización (semanas 4–6) y SQL (semanas 7–11).',
      'Si ya tienes la certificación de bases de datos (semana 12), súbela al aula virtual; si no, usa estas preguntas como preparación.',
      'Con nota de presentación igual o superior a 5,0 quedas eximido/a del examen final.',
      'Estrategia: resuelve primero lo que dominas, revisa la retroalimentación de cada intento y vuelve a los ejercicios con menos de 60 %.',
    ],
  },
  {
    n: 13,
    title: 'Examen final',
    short: 'Simulacros de selección múltiple sobre diseño, modelado, gestión de bases de datos y SQL.',
    indicators: 'AE1, AE2 y AE3',
    summary: [
      'El examen es de selección múltiple e integra todo el curso: arquitectura y tipos de bases de datos, E/R y extendido, transformación, normalización, DDL/DML, consultas, operadores de conjuntos, procedimientos y funciones.',
      'Los simulacros combinan preguntas de todas las semanas; repítelos hasta superar el 85 %.',
      'Lee todas las alternativas: muchas diferencias son detalles de sintaxis (paréntesis, comillas, HAVING vs WHERE, tipo de JOIN).',
    ],
  },
];