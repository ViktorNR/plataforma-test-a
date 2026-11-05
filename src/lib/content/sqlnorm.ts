import type { Exercise } from '../types';

export const NORM_SQL: Exercise[] = [
  {
    slug: 's5-pedidos',
    week: 5,
    type: 'NORMALIZACION',
    title: 'Pedidos: hasta 2FN',
    statement: [
      'La siguiente relación guarda el detalle de los pedidos de una tienda. Su clave es (num_pedido, cod_producto).',
      'Descomponla para que cada tabla cumpla la segunda forma normal (2FN): elimina las dependencias parciales. Una dependencia transitiva puede permanecer por ahora.',
      'Crea tablas, arrastra los atributos desde la relación original y marca la clave primaria de cada tabla haciendo clic en el atributo.',
    ],
    problem: {
      target: '2NF',
      attrs: ['num_pedido', 'fecha', 'cod_cliente', 'nombre_cliente', 'cod_producto', 'desc_producto', 'precio', 'cantidad'],
      fds: [
        { lhs: ['num_pedido'], rhs: ['fecha', 'cod_cliente', 'nombre_cliente'] },
        { lhs: ['cod_cliente'], rhs: ['nombre_cliente'] },
        { lhs: ['cod_producto'], rhs: ['desc_producto', 'precio'] },
        { lhs: ['num_pedido', 'cod_producto'], rhs: ['cantidad'] },
      ],
    },
  },
  {
    slug: 's5-matriculas',
    week: 5,
    type: 'NORMALIZACION',
    title: 'Matrículas: hasta 3FN',
    statement: [
      'La relación registra las notas de los alumnos en cada curso, junto con datos de la carrera y del profesor que dicta el curso. Su clave es (rut, cod_curso).',
      'Llévala a tercera forma normal (3FN): elimina las dependencias parciales y las transitivas. La descomposición debe ser sin pérdida y conservar las dependencias.',
    ],
    problem: {
      target: '3NF',
      attrs: ['rut', 'nombre_alumno', 'cod_carrera', 'nombre_carrera', 'cod_curso', 'nombre_curso', 'creditos', 'cod_profesor', 'nombre_profesor', 'nota'],
      fds: [
        { lhs: ['rut'], rhs: ['nombre_alumno', 'cod_carrera'] },
        { lhs: ['cod_carrera'], rhs: ['nombre_carrera'] },
        { lhs: ['cod_curso'], rhs: ['nombre_curso', 'creditos', 'cod_profesor'] },
        { lhs: ['cod_profesor'], rhs: ['nombre_profesor'] },
        { lhs: ['rut', 'cod_curso'], rhs: ['nota'] },
      ],
    },
  },
  {
    slug: 's7-tienda',
    week: 7,
    type: 'SQL_DDL',
    title: 'Base de datos «tienda»',
    statement: [
      'Escribe un script MySQL que cree la base de datos `tienda` y las siguientes tablas:',
      '`cliente`: id_cliente (entero, clave primaria, autoincremental), nombre (texto de hasta 80 caracteres, obligatorio) y email (texto de hasta 100 caracteres, único).',
      '`pedido`: id_pedido (entero, clave primaria, autoincremental), fecha (fecha, obligatoria) e id_cliente (entero, obligatorio, clave foránea hacia cliente).',
      'Recuerda usar `USE tienda;` antes de crear las tablas y crear primero la tabla referenciada.',
    ],
    solution: {
      db: 'tienda',
      tables: [
        {
          name: 'cliente',
          cols: [
            { name: 'id_cliente', type: 'int', autoInc: true },
            { name: 'nombre', type: 'string', notNull: true },
            { name: 'email', type: 'string', unique: true },
          ],
          pk: ['id_cliente'],
          fks: [],
        },
        {
          name: 'pedido',
          cols: [
            { name: 'id_pedido', type: 'int', autoInc: true },
            { name: 'fecha', type: 'date', notNull: true },
            { name: 'id_cliente', type: 'int', notNull: true },
          ],
          pk: ['id_pedido'],
          fks: [{ cols: ['id_cliente'], ref: 'cliente', refCols: ['id_cliente'] }],
        },
      ],
    },
  },
  {
    slug: 's7-universidad',
    week: 7,
    type: 'SQL_DDL',
    title: 'Base de datos «universidad»',
    statement: [
      'Escribe un script MySQL que cree la base de datos `universidad` con estas tablas:',
      '`alumno`: rut (texto de hasta 12 caracteres, clave primaria) y nombre (texto, obligatorio).',
      '`curso`: cod_curso (texto de hasta 10 caracteres, clave primaria), nombre (texto, obligatorio) y creditos (entero).',
      '`inscripcion`: rut (clave foránea hacia alumno), cod_curso (clave foránea hacia curso) y nota (decimal). La clave primaria es compuesta: (rut, cod_curso).',
    ],
    solution: {
      db: 'universidad',
      tables: [
        {
          name: 'alumno',
          cols: [
            { name: 'rut', type: 'string', notNull: true },
            { name: 'nombre', type: 'string', notNull: true },
          ],
          pk: ['rut'],
          fks: [],
        },
        {
          name: 'curso',
          cols: [
            { name: 'cod_curso', type: 'string', notNull: true },
            { name: 'nombre', type: 'string', notNull: true },
            { name: 'creditos', type: 'int' },
          ],
          pk: ['cod_curso'],
          fks: [],
        },
        {
          name: 'inscripcion',
          cols: [
            { name: 'rut', type: 'string', notNull: true },
            { name: 'cod_curso', type: 'string', notNull: true },
            { name: 'nota', type: 'decimal' },
          ],
          pk: ['rut', 'cod_curso'],
          fks: [
            { cols: ['rut'], ref: 'alumno', refCols: ['rut'] },
            { cols: ['cod_curso'], ref: 'curso', refCols: ['cod_curso'] },
          ],
        },
      ],
    },
  },
];
