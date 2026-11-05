import type { ErModel, Exercise } from '../types';

// ---------------- Semana 2: Modelo E/R ----------------
export const BIBLIOTECA: ErModel = {
  entities: [
    {
      name: 'Socio',
      attrs: [
        { name: 'rut', key: true, aliases: ['id_socio', 'run'] },
        { name: 'nombre' },
        { name: 'email', aliases: ['correo', 'correo_electronico'] },
      ],
    },
    {
      name: 'Libro',
      attrs: [
        { name: 'isbn', key: true },
        { name: 'titulo' },
        { name: 'anio_publicacion', aliases: ['anio', 'año', 'ano_publicacion', 'anio_de_publicacion', 'año_publicacion', 'año_de_publicacion'] },
      ],
    },
    {
      name: 'Autor',
      attrs: [{ name: 'id_autor', key: true, aliases: ['id', 'codigo_autor'] }, { name: 'nombre' }, { name: 'nacionalidad' }],
    },
  ],
  relationships: [
    {
      name: 'presta',
      between: [
        { entity: 'Socio', card: 'N', min: 0 },
        { entity: 'Libro', card: 'N', min: 0 },
      ],
      attrs: [{ name: 'fecha_prestamo', aliases: ['fecha', 'fecha_de_prestamo'] }],
    },
    {
      name: 'escribe',
      between: [
        { entity: 'Autor', card: 'N', min: 1 },
        { entity: 'Libro', card: 'N', min: 1 },
      ],
    },
  ],
};

export const CLINICA: ErModel = {
  entities: [
    {
      name: 'Medico',
      aliases: ['Doctor'],
      attrs: [{ name: 'rut_medico', key: true, aliases: ['rut', 'id_medico'] }, { name: 'nombre' }, { name: 'especialidad' }],
    },
    {
      name: 'Paciente',
      attrs: [
        { name: 'rut_paciente', key: true, aliases: ['rut', 'id_paciente'] },
        { name: 'nombre' },
        { name: 'fecha_nacimiento', aliases: ['fecha_de_nacimiento', 'nacimiento'] },
        { name: 'telefono', multi: true, aliases: ['telefonos', 'fono'] },
        { name: 'edad', derived: true },
      ],
    },
    {
      name: 'Departamento',
      attrs: [{ name: 'cod_depto', key: true, aliases: ['codigo_depto', 'id_depto', 'codigo', 'id_departamento', 'cod_departamento'] }, { name: 'nombre' }],
    },
  ],
  relationships: [
    {
      name: 'pertenece',
      between: [
        { entity: 'Medico', card: 'N', min: 0 },
        { entity: 'Departamento', card: '1', min: 1 },
      ],
    },
    {
      name: 'atiende',
      between: [
        { entity: 'Medico', card: 'N', min: 1 },
        { entity: 'Paciente', card: 'N', min: 0 },
      ],
      attrs: [{ name: 'fecha' }, { name: 'diagnostico' }],
    },
  ],
};

// ---------------- Semana 3: E/R extendido ----------------
export const EMPLEADOS: ErModel = {
  entities: [
    {
      name: 'Empleado',
      attrs: [{ name: 'rut', key: true, aliases: ['run', 'id_empleado'] }, { name: 'nombre' }, { name: 'sueldo', aliases: ['salario'] }],
      pos: { x: 280, y: 40 },
      arc: [200, 340],
    },
    { name: 'Docente', attrs: [{ name: 'grado_academico', aliases: ['grado'] }], pos: { x: 110, y: 330 }, arc: [40, 140] },
    { name: 'Administrativo', attrs: [{ name: 'cargo' }], pos: { x: 440, y: 330 }, arc: [40, 140] },
    {
      name: 'Departamento',
      attrs: [{ name: 'cod_depto', key: true, aliases: ['codigo_depto', 'id_depto', 'codigo', 'id_departamento', 'cod_departamento'] }, { name: 'nombre' }],
      pos: { x: 760, y: 40 },
      arc: [200, 340],
    },
  ],
  relationships: [
    {
      name: 'trabaja_en',
      between: [
        { entity: 'Empleado', card: 'N', min: 0 },
        { entity: 'Departamento', card: '1', min: 1 },
      ],
      pos: { x: 520, y: 30 },
    },
  ],
  specializations: [{ parent: 'Empleado', children: ['Docente', 'Administrativo'], disjoint: true, total: true, pos: { x: 345, y: 180 } }],
};

export const PERSONAS: ErModel = {
  entities: [
    {
      name: 'Persona',
      attrs: [{ name: 'rut', key: true, aliases: ['run'] }, { name: 'nombre' }, { name: 'email', aliases: ['correo'] }],
    },
    { name: 'Estudiante', attrs: [{ name: 'carrera' }, { name: 'anio_ingreso', aliases: ['año_ingreso', 'ano_ingreso', 'anio_de_ingreso'] }] },
    { name: 'Funcionario', attrs: [{ name: 'cargo' }] },
    { name: 'Curso', attrs: [{ name: 'cod_curso', key: true, aliases: ['codigo_curso', 'id_curso', 'codigo', 'cod'] }, { name: 'nombre' }] },
  ],
  relationships: [
    {
      name: 'cursa',
      between: [
        { entity: 'Estudiante', card: 'N', min: 0 },
        { entity: 'Curso', card: 'N', min: 0 },
      ],
    },
  ],
  specializations: [{ parent: 'Persona', children: ['Estudiante', 'Funcionario'], disjoint: false, total: false }],
};

// ---------------- Semana 4: modelos para transformar ----------------
export const ALUMNOS_VIEW: ErModel = {
  entities: [
    { name: 'Carrera', attrs: [{ name: 'cod_carrera', key: true }, { name: 'nombre' }], pos: { x: 0, y: 220 }, arc: [225, 315] },
    {
      name: 'Alumno',
      attrs: [{ name: 'rut', key: true }, { name: 'nombre' }, { name: 'telefono', multi: true }],
      pos: { x: 480, y: 220 },
      arc: [235, 305],
    },
    { name: 'Curso', attrs: [{ name: 'cod_curso', key: true }, { name: 'nombre' }, { name: 'creditos' }], pos: { x: 960, y: 220 }, arc: [235, 305] },
  ],
  relationships: [
    {
      name: 'pertenece',
      between: [
        { entity: 'Carrera', card: '1', min: 1 },
        { entity: 'Alumno', card: 'N', min: 0 },
      ],
      pos: { x: 240, y: 200 },
      arc: [60, 120],
    },
    {
      name: 'inscribe',
      between: [
        { entity: 'Alumno', card: 'N', min: 0 },
        { entity: 'Curso', card: 'N', min: 0 },
      ],
      attrs: [{ name: 'nota' }],
      pos: { x: 720, y: 200 },
      arc: [60, 120],
    },
  ],
};

export const EMPLEADOS_VIEW: ErModel = {
  entities: [
    {
      name: 'Empleado',
      attrs: [{ name: 'rut', key: true }, { name: 'nombre' }, { name: 'sueldo' }],
      pos: { x: 280, y: 40 },
      arc: [200, 340],
    },
    { name: 'Docente', attrs: [{ name: 'grado_academico' }], pos: { x: 110, y: 330 }, arc: [40, 140] },
    { name: 'Administrativo', attrs: [{ name: 'cargo' }], pos: { x: 440, y: 330 }, arc: [40, 140] },
    { name: 'Departamento', attrs: [{ name: 'cod_depto', key: true }, { name: 'nombre' }], pos: { x: 760, y: 40 }, arc: [200, 340] },
  ],
  relationships: [
    {
      name: 'trabaja_en',
      between: [
        { entity: 'Empleado', card: 'N', min: 0 },
        { entity: 'Departamento', card: '1', min: 1 },
      ],
      pos: { x: 520, y: 30 },
    },
  ],
  specializations: [{ parent: 'Empleado', children: ['Docente', 'Administrativo'], disjoint: true, total: true, pos: { x: 345, y: 180 } }],
};

export const MODELING: Exercise[] = [
  {
    slug: 's2-biblioteca',
    week: 2,
    type: 'ER',
    title: 'Biblioteca universitaria',
    statement: [
      'Una biblioteca desea registrar a sus socios, los libros y los autores.',
      'De cada socio se guarda su rut (identificador), nombre y email. De cada libro: isbn (identificador), título y año de publicación. De cada autor: id_autor (identificador), nombre y nacionalidad.',
      'Un socio puede pedir prestados muchos libros (o ninguno todavía) y un libro puede ser prestado por muchos socios (o por ninguno); de cada préstamo interesa la fecha_prestamo. Un autor escribe al menos un libro (y puede escribir muchos) y todo libro tiene al menos un autor (y puede tener varios).',
      'Dibuja el modelo Entidad-Relación. Indica la cardinalidad (mín,máx) en cada extremo de las relaciones con la notación «look across» de erdplus: el valor junto a una entidad indica con cuántas ocurrencias de ESA entidad se asocia UNA ocurrencia de la otra. Ejemplo: si todo libro tiene al menos un autor (y puede tener varios), junto a «Autor» va (1,M).',
    ],
    solution: BIBLIOTECA,
  },
  {
    slug: 's2-clinica',
    week: 2,
    type: 'ER',
    title: 'Clínica médica',
    statement: [
      'Una clínica gestiona médicos, pacientes y departamentos.',
      'Médico: rut_medico (identificador), nombre y especialidad. Paciente: rut_paciente (identificador), nombre, fecha_nacimiento, edad (se calcula a partir de la fecha de nacimiento, por lo tanto es derivado) y puede tener varios teléfonos. Departamento: cod_depto (identificador) y nombre.',
      'Todo médico pertenece a un único departamento, pero un departamento puede tener muchos médicos (o ninguno todavía). Un médico puede atender a muchos pacientes (o a ninguno todavía) y todo paciente registrado ha sido atendido por al menos un médico (y puede haber sido atendido por varios); de cada atención se registra la fecha y el diagnóstico.',
      'Dibuja el modelo Entidad-Relación con cardinalidades (mín,máx). Recuerda marcar los atributos multivaluado y derivado.',
    ],
    solution: CLINICA,
  },
  {
    slug: 's3-empleados',
    week: 3,
    type: 'EER',
    title: 'Empleados de una universidad',
    statement: [
      'Una universidad registra a sus empleados: rut (identificador), nombre y sueldo. Todo empleado es docente o administrativo, y no puede ser ambas cosas a la vez.',
      'Los docentes tienen grado_academico; los administrativos tienen cargo.',
      'Además, todo empleado trabaja en un único departamento (cod_depto como identificador, y nombre). Un departamento puede tener muchos empleados, o ninguno todavía.',
      'Dibuja el modelo E/R extendido. Conecta la superclase con el círculo de especialización y este con cada subclase, y define si es total o parcial y disyunta (d) o solapada (o).',
    ],
    solution: EMPLEADOS,
  },
  {
    slug: 's3-personas',
    week: 3,
    type: 'EER',
    title: 'Personas en la universidad',
    statement: [
      'De cada persona se registra su rut (identificador), nombre y email. Algunas personas son estudiantes (con carrera y anio_ingreso) y otras son funcionarios (con cargo).',
      'No toda persona es estudiante o funcionario (por ejemplo, un visitante), y una persona puede ser estudiante y funcionario al mismo tiempo (por ejemplo, un ayudante).',
      'Un estudiante puede cursar muchos cursos (o ninguno todavía) (cod_curso como identificador, y nombre) y cada curso puede ser cursado por muchos estudiantes (o por ninguno).',
      'Dibuja el modelo E/R extendido indicando el tipo de especialización.',
    ],
    solution: PERSONAS,
  },
  {
    slug: 's4-alumnos',
    week: 4,
    type: 'TRANSFORMACION',
    title: 'Alumnos, carreras y cursos',
    statement: [
      'Aplica las reglas de transformación al modelo E/R mostrado y escribe el esquema relacional.',
      'Para cada tabla define sus columnas, marca la clave primaria (PK) y, cuando corresponda, la clave foránea (FK) indicando a qué tabla referencia.',
      'No olvides las tablas adicionales que generan las relaciones N:M y los atributos multivaluados.',
    ],
    model: ALUMNOS_VIEW,
    options: [
      {
        tables: [
          { name: 'CARRERA', cols: [{ name: 'cod_carrera', pk: true, aliases: ['id_carrera', 'codigo_carrera'] }, { name: 'nombre' }] },
          {
            name: 'ALUMNO',
            cols: [
              { name: 'rut', pk: true, aliases: ['run', 'id_alumno'] },
              { name: 'nombre' },
              { name: 'cod_carrera', fk: 'CARRERA', aliases: ['id_carrera', 'codigo_carrera', 'carrera'] },
            ],
          },
          { name: 'CURSO', cols: [{ name: 'cod_curso', pk: true, aliases: ['id_curso', 'codigo_curso'] }, { name: 'nombre' }, { name: 'creditos' }] },
          {
            name: 'INSCRIPCION',
            structural: true,
            aliases: ['inscribe', 'alumno_curso', 'cursa', 'matricula', 'inscripciones'],
            cols: [
              { name: 'rut', pk: true, fk: 'ALUMNO', aliases: ['rut_alumno', 'run', 'id_alumno'] },
              { name: 'cod_curso', pk: true, fk: 'CURSO', aliases: ['id_curso', 'codigo_curso'] },
              { name: 'nota' },
            ],
          },
          {
            name: 'TELEFONO_ALUMNO',
            structural: true,
            aliases: ['telefono', 'telefonos', 'alumno_telefono', 'telefonos_alumno'],
            cols: [
              { name: 'rut', pk: true, fk: 'ALUMNO', aliases: ['rut_alumno', 'run', 'id_alumno'] },
              { name: 'telefono', pk: true, aliases: ['fono', 'numero'] },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 's4-empleados',
    week: 4,
    type: 'TRANSFORMACION',
    title: 'Empleados con especialización',
    statement: [
      'Transforma el modelo E/R extendido a relacional. La especialización es total y disyunta, por lo que existen dos estrategias válidas: una tabla por cada clase (con la clave de la superclase como PK y FK en las subclases) o solo tablas para las subclases que repiten los atributos de Empleado.',
      'Cualquiera de las dos estrategias se acepta; asegúrate de aplicar bien la relación 1:N con Departamento.',
    ],
    model: EMPLEADOS_VIEW,
    options: [
      {
        tables: [
          { name: 'DEPARTAMENTO', cols: [{ name: 'cod_depto', pk: true, aliases: ['id_depto', 'codigo_depto'] }, { name: 'nombre' }] },
          {
            name: 'EMPLEADO',
            cols: [
              { name: 'rut', pk: true, aliases: ['run'] },
              { name: 'nombre' },
              { name: 'sueldo' },
              { name: 'cod_depto', fk: 'DEPARTAMENTO', aliases: ['id_depto', 'codigo_depto', 'departamento'] },
            ],
          },
          { name: 'DOCENTE', cols: [{ name: 'rut', pk: true, fk: 'EMPLEADO', aliases: ['run', 'rut_empleado'] }, { name: 'grado_academico', aliases: ['grado'] }] },
          { name: 'ADMINISTRATIVO', cols: [{ name: 'rut', pk: true, fk: 'EMPLEADO', aliases: ['run', 'rut_empleado'] }, { name: 'cargo' }] },
        ],
      },
      {
        tables: [
          { name: 'DEPARTAMENTO', cols: [{ name: 'cod_depto', pk: true, aliases: ['id_depto', 'codigo_depto'] }, { name: 'nombre' }] },
          {
            name: 'DOCENTE',
            cols: [
              { name: 'rut', pk: true, aliases: ['run'] },
              { name: 'nombre' },
              { name: 'sueldo' },
              { name: 'grado_academico', aliases: ['grado'] },
              { name: 'cod_depto', fk: 'DEPARTAMENTO', aliases: ['id_depto', 'codigo_depto', 'departamento'] },
            ],
          },
          {
            name: 'ADMINISTRATIVO',
            cols: [
              { name: 'rut', pk: true, aliases: ['run'] },
              { name: 'nombre' },
              { name: 'sueldo' },
              { name: 'cargo' },
              { name: 'cod_depto', fk: 'DEPARTAMENTO', aliases: ['id_depto', 'codigo_depto', 'departamento'] },
            ],
          },
        ],
      },
    ],
  },
];
