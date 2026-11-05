import type { Exercise } from '../types';
import { E, M, R, S, er } from './dsl';
import { EMPLEADOS, PERSONAS } from './modeling';

const NOTE = 'Dibuja el modelo E/R extendido. Conecta la superclase con el círculo de especialización y este con cada subclase; define si es disyunta (d) o solapada (o) y total o parcial. Incluye entidades débiles, atributos y cardinalidades (mín,máx) cuando el enunciado lo pida.';

const ee = (slug: string, title: string, statement: string[], model: ReturnType<typeof M>): Exercise => er(slug, 3, title, [...statement, NOTE], model, 'EER');

export const W3_CURSOS = M(
  [
    E('Curso', ['*cod_curso', 'nombre', 'horas']),
    E('Presencial|Curso presencial|Curso_Presencial', ['sala']),
    E('En_Linea|En línea|Curso en línea|Online|Curso_En_Linea', ['plataforma', 'url']),
    E('Instructor', ['*rut', 'nombre']),
    E('Participante', ['*rut_participante|rut', 'nombre']),
  ],
  [R('imparte', ['Instructor:1', 'Curso:N']), R('se_inscribe', ['Participante:N', 'Curso:N'], ['nota'])],
  [S('Curso', ['Presencial', 'En_Linea'], 'd', 't')],
  [['Instructor', 'Curso', 'Participante'], ['Presencial', null, 'En_Linea']],
);

export const W3_SOFTWARE = M(
  [
    E('Producto', ['*id_producto|id', 'nombre']),
    E('Software_Escritorio|Software de escritorio|Escritorio|Software_de_Escritorio', ['sistema_operativo']),
    E('Aplicacion_Web|Aplicación web|App_Web|Aplicacion Web', ['url_acceso|url']),
    E('Cliente', ['*id_cliente|id', 'nombre']),
    E('Empleado', ['*id_empleado|id', 'nombre']),
    E('Desarrollador', ['lenguaje_principal|lenguaje']),
    E('Vendedor', []),
  ],
  [
    R('compra', ['Cliente:N', 'Producto:N'], ['fecha_compra|fecha']),
    R('desarrolla', ['Desarrollador:N', 'Producto:N']),
    R('atiende', ['Vendedor:1', 'Cliente:N']),
  ],
  [S('Producto', ['Software_Escritorio', 'Aplicacion_Web'], 'd', 't'), S('Empleado', ['Desarrollador', 'Vendedor'], 'o', 'p')],
  [
    ['Cliente', 'Producto', 'Empleado'],
    ['Software_Escritorio', 'Aplicacion_Web', 'Desarrollador', 'Vendedor'],
  ],
);

export const W3_CONSULTORA = M(
  [
    E('Empleado', ['*id_empleado|id', 'nombre']),
    E('Consultor', ['especialidad']),
    E('Administrativo', ['cargo']),
    E('Cliente', ['*id_cliente|id', 'nombre']),
    E('Cliente_Personal|Cliente personal|Personal|Persona', ['rut']),
    E('Cliente_Empresa|Cliente empresa|Empresa', ['razon_social']),
    E('Proyecto', ['*cod_proyecto|codigo', 'nombre']),
  ],
  [R('trabaja_en', ['Empleado:N', 'Proyecto:N']), R('contrata', ['Cliente:1', 'Proyecto:N'])],
  [S('Empleado', ['Consultor', 'Administrativo'], 'd', 'p'), S('Cliente', ['Cliente_Personal', 'Cliente_Empresa'], 'd', 'p')],
  [
    ['Consultor', 'Administrativo', 'Cliente_Personal', 'Cliente_Empresa'],
    ['Empleado', 'Proyecto', 'Cliente'],
  ],
);

export const W3_ESTUDIANTES = M(
  [
    E('Estudiante', ['*id_estudiante|id', 'nombre_completo|nombre']),
    E('Tiempo_Completo|Tiempo completo|Estudiante_Tiempo_Completo', []),
    E('Medio_Tiempo|Medio tiempo|Estudiante_Medio_Tiempo', ['numero_creditos|creditos']),
    E('A_Distancia|A distancia|Estudiante_A_Distancia|Distancia', ['modalidad_estudio|modalidad']),
    E('Programa', ['*cod_programa|codigo', 'nombre']),
    E('Asignatura', ['*cod_asignatura|codigo', 'nombre']),
    E('Tutor', ['*id_tutor|id', 'nombre']),
  ],
  [
    R('se_inscribe', ['Estudiante:N', 'Programa:N']),
    R('ofrece', ['Programa:1', 'Asignatura:N']),
    R('cursa', ['Estudiante:N', 'Asignatura:N']),
    R('asesora', ['Tutor:1', 'Estudiante:N']),
  ],
  [S('Estudiante', ['Tiempo_Completo', 'Medio_Tiempo', 'A_Distancia'], 'd', 't')],
  [
    ['Tiempo_Completo', 'Medio_Tiempo', 'A_Distancia', null],
    ['Tutor', 'Estudiante', 'Programa', 'Asignatura'],
  ],
);

export const W3_HOTEL = M(
  [
    E('Hotel', ['*cod_hotel|codigo', 'nombre', 'direccion', 'telefono', 'anio_construccion|año_construccion']),
    E('Categoria', ['*cod_categoria|codigo', 'tipo_iva|iva', 'descripcion']),
    E('Habitacion', ['*codigo_habitacion|codigo', 'tipo']),
    E('Cliente', ['*id_cliente|id', 'nombre', 'direccion', 'telefono']),
    E('Particular', []),
    E('Agencia|Agencia de viajes|Agencia_Viajes', ['nombre_persona']),
    E('Reserva', ['*cod_reserva|codigo', 'precio', 'fecha_inicio', 'fecha_fin']),
  ],
  [
    R('clasifica', ['Categoria:1', 'Hotel:N']),
    R('tiene', ['Hotel:1', 'Habitacion:N']),
    R('es_de', ['Habitacion:1', 'Reserva:N']),
    R('realiza', ['Cliente:1', 'Reserva:N']),
  ],
  [S('Cliente', ['Particular', 'Agencia'], 'd', 't')],
  [
    ['Categoria', 'Hotel', 'Habitacion', 'Reserva'],
    ['Particular', 'Cliente', 'Agencia', null],
  ],
);

export const W3_DENTAL = M(
  [
    E('Paciente', ['*rut', 'nombre', 'fecha_nacimiento', '+alergias']),
    E('Ficha_Dental|Ficha dental|Ficha', ['*numero_folio|folio', 'historial']),
    E('!Tratamiento', ['^codigo_tratamiento|codigo', 'descripcion', 'costo']),
    E('Odontologo|Odontólogo', ['*id_odontologo|id', 'nombre_odontologo|nombre']),
  ],
  [
    R('tiene', ['Paciente:1', 'Ficha_Dental:1']),
    R('!contiene', ['Ficha_Dental:1', 'Tratamiento:N']),
    R('realiza', ['Odontologo:1', 'Tratamiento:N']),
  ],
  [],
  [['Paciente', 'Ficha_Dental', 'Tratamiento', 'Odontologo']],
);

export const W3_ZOOLOGICO = M(
  [
    E('Animal', ['*id_animal|id', 'fecha_nacimiento']),
    E('Mamifero|Mamífero', ['es_depredador|depredador']),
    E('Ave', ['envergadura']),
    E('Reptil', ['es_venenoso|venenoso']),
    E('Habitat|Hábitat', ['*id_habitat|id']),
    E('Empleado', ['*rut', 'nombre']),
    E('Cuidador', []),
    E('Programa_Conservacion|Programa de conservación|Programa', ['*id_programa|id', 'estado_riesgo']),
  ],
  [
    R('alberga', ['Habitat:1', 'Animal:N']),
    R('esta_asignado', ['Habitat:1', 'Cuidador:N']),
    R('participa', ['Programa_Conservacion:1', 'Animal:N']),
  ],
  [S('Animal', ['Mamifero', 'Ave', 'Reptil'], 'd', 't'), S('Empleado', ['Cuidador'], 'd', 'p')],
  [
    ['Mamifero', 'Ave', 'Reptil', null],
    [null, 'Animal', 'Habitat', 'Programa_Conservacion'],
    [null, null, 'Cuidador', null],
    [null, null, 'Empleado', null],
  ],
);

export const W3_RRHH = M(
  [
    E('Empleado', ['*id_empleado|id']),
    E('Contratado', ['salario']),
    E('Externo', ['empresa_consultora|consultora|empresa']),
    E('Gerente', ['presupuesto']),
    E('!Beneficio', ['^codigo_beneficio|codigo', 'descripcion|nombre']),
  ],
  [R('!tiene', ['Contratado:1', 'Beneficio:N'])],
  [S('Empleado', ['Contratado', 'Externo'], 'd', 't'), S('Contratado', ['Gerente'], 'd', 'p')],
  [
    ['Empleado', null, null],
    ['Contratado', null, 'Externo'],
    ['Gerente', 'Beneficio', null],
  ],
);

export const W3_PUBLICACIONES = M(
  [
    E('Publicacion|Publicación', ['*doi']),
    E('Articulo|Artículo', ['nombre_revista|revista']),
    E('Libro', ['editorial']),
    E('Personal', ['*rut']),
    E('Academico|Académico', ['grado']),
    E('Administrativo', []),
  ],
  [R('escribe', ['Academico:N', 'Publicacion:N'])],
  [S('Publicacion', ['Articulo', 'Libro'], 'o', 'p'), S('Personal', ['Academico', 'Administrativo'], 'd', 't')],
  [
    ['Articulo', 'Libro', null, 'Academico', 'Administrativo'],
    [null, 'Publicacion', null, 'Personal', null],
  ],
);

export const W3_CENTRO_INV = M(
  [
    E('Departamento', ['*codigo_depto|codigo', 'nombre', 'presupuesto_anual|presupuesto']),
    E('Cientifico|Científico', ['*id_empleado|id', 'nombre_completo(nombres,apellidos)', 'fecha_contratacion', '~antiguedad|antigüedad', '+especialidades|especialidad']),
    E('Junior|Cientifico_Junior|Científico junior', []),
    E('Senior|Cientifico_Senior|Científico senior', ['bono_productividad|bono']),
    E('Administrador_Laboratorio|Administrador de laboratorio|Administrador', ['laboratorio']),
    E('Coordinador_Postgrado|Coordinador de postgrado|Coordinador', ['programa']),
    E('Proyecto', ['*codigo_proyecto|codigo', 'titulo']),
    E('!Familiar', ['^nombre']),
  ],
  [
    R('dirige', ['Cientifico:1', 'Departamento:1']),
    R('emplea', ['Departamento:1', 'Cientifico:N']),
    R('tiene_mentor', ['Senior:1', 'Junior:N']),
    R('trabaja_en', ['Cientifico:N', 'Proyecto:N'], ['horas_semanales|horas']),
    R('!depende', ['Cientifico:1', 'Familiar:N']),
  ],
  [S('Cientifico', ['Junior', 'Senior'], 'd', 't'), S('Cientifico', ['Administrador_Laboratorio', 'Coordinador_Postgrado'], 'o', 'p')],
  [
    ['Departamento', 'Cientifico', 'Proyecto', 'Familiar'],
    ['Junior', 'Senior', 'Administrador_Laboratorio', 'Coordinador_Postgrado'],
  ],
);

const dir4 = 'direccion(calle,numero,comuna,ciudad)';
export const W3_BIBLIO_UNIV = M(
  [
    E('Sucursal', ['*codigo_sucursal|codigo', 'nombre', 'direccion', 'telefono', 'horario_atencion|horario']),
    E('Libro', ['*isbn', 'titulo', 'anio_publicacion|año_publicacion', 'editorial', 'categoria', 'numero_paginas']),
    E('Autor', ['*id_autor|id', 'nombre_completo|nombre', 'nacionalidad', 'fecha_nacimiento', 'email']),
    E('Ejemplar', ['*codigo_ejemplar|codigo', 'estado', 'ubicacion', 'fecha_adquisicion']),
    E('Usuario', ['*rut', 'nombre_completo|nombre', dir4, '+telefonos|telefono', 'correo|email', 'fecha_inscripcion', 'fecha_nacimiento', '~edad']),
    E('Estudiante', ['carrera', 'semestre', 'jornada']),
    E('Funcionario', ['cargo', 'departamento', 'tipo_contrato']),
    E('Bibliotecario', ['turno']),
    E('Administrativo', ['area_gestion|area']),
    E('Prestamo|Préstamo', ['*id_prestamo|id', 'fecha_prestamo', 'fecha_estimada_devolucion', 'fecha_real_devolucion', 'estado']),
    E('Sancion|Sanción', ['*id_sancion|id', 'monto', 'motivo', 'fecha_generacion', 'estado_pago']),
  ],
  [
    R('tiene', ['Sucursal:1', 'Ejemplar:N']),
    R('escribe', ['Autor:N', 'Libro:N']),
    R('posee', ['Libro:1', 'Ejemplar:N']),
    R('solicita', ['Usuario:1', 'Prestamo:N']),
    R('corresponde', ['Ejemplar:1', 'Prestamo:N']),
    R('genera', ['Prestamo:1', 'Sancion:N']),
    R('reserva', ['Usuario:N', 'Libro:N'], ['fecha_solicitud', 'estado', 'fecha_maxima_retiro']),
    R('responsable', ['Funcionario:1', 'Sucursal:1']),
    R('supervisa', ['Funcionario:1', 'Funcionario:N']),
  ],
  [S('Usuario', ['Estudiante', 'Funcionario'], 'd', 't'), S('Funcionario', ['Bibliotecario', 'Administrativo'], 'o', 'p')],
  [
    ['Autor', 'Libro', 'Ejemplar', 'Sucursal', 'Sancion'],
    [null, 'Usuario', 'Prestamo', null, null],
    ['Estudiante', 'Funcionario', null, null, null],
    ['Bibliotecario', null, 'Administrativo', null, null],
  ],
);

export const W3_CENTRO_MEDICO = M(
  [
    E('Personal', ['*rut_personal|rut', 'nombre_completo|nombre', dir4, 'telefono', 'correo', 'fecha_contratacion']),
    E('Medico|Médico', ['numero_colegiatura', 'anios_experiencia|años_experiencia']),
    E('Administrativo', ['cargo', 'area']),
    E('Medico_Tratante|Médico tratante|Tratante', ['cupo_diario_pacientes|cupo_diario']),
    E('Medico_Docente|Médico docente|Docente', ['asignatura_rotacion|asignatura|rotacion']),
    E('Centro_Medico|Centro médico|Centro', ['*codigo_centro|codigo', 'nombre', 'direccion', 'telefono', 'horario_atencion|horario']),
    E('!Consultorio', ['^numero_consultorio|numero', 'piso', 'tipo_equipamiento|equipamiento']),
    E('Especialidad', ['*codigo_especialidad|codigo', 'nombre', 'descripcion']),
    E('Paciente', ['*rut_paciente|rut', 'nombre_completo|nombre', dir4, 'correo', 'fecha_nacimiento', '+telefonos|telefono', '~edad']),
    E('Cita', ['*id_cita|id', 'fecha', 'hora', 'motivo', 'estado']),
    E('Receta', ['*id_receta|id']),
    E('Medicamento', ['*codigo_medicamento|codigo', 'nombre']),
  ],
  [
    R('!tiene', ['Centro_Medico:1', 'Consultorio:N']),
    R('dirige', ['Medico:1', 'Centro_Medico:1']),
    R('ejerce', ['Medico:N', 'Especialidad:N'], ['fecha_certificacion']),
    R('supervisa', ['Medico:1', 'Medico:N']),
    R('solicita', ['Paciente:1', 'Cita:N']),
    R('atiende', ['Medico:1', 'Cita:N']),
    R('emite', ['Cita:1', 'Receta:1']),
    R('incluye', ['Receta:N', 'Medicamento:N'], ['dosis', 'frecuencia', 'duracion']),
  ],
  [S('Personal', ['Medico', 'Administrativo'], 'd', 't'), S('Medico', ['Medico_Tratante', 'Medico_Docente'], 'o', 'p')],
  [
    ['Consultorio', 'Centro_Medico', 'Personal', 'Especialidad', 'Paciente'],
    [null, 'Administrativo', 'Medico', 'Cita', null],
    [null, 'Medico_Tratante', 'Medico_Docente', 'Receta', 'Medicamento'],
  ],
);

export const W3_RED_CLIMATICA = M(
  [
    E('Persona', ['*orcid', 'nombre_completo(nombre_pila,apellidos)', '+correos|correo', 'anio_nacimiento|año_nacimiento', '~edad']),
    E('Investigador', ['campo_estudio|campo']),
    E('Tecnico_Laboratorio|Técnico de laboratorio|Tecnico', ['certificacion|certificación']),
    E('Jefe_Departamento|Jefe de departamento|Jefe', []),
    E('Editor_Revista|Editor de revista|Editor', []),
    E('Estacion|Estación', ['*codigo_estacion|codigo', 'ubicacion(latitud,longitud)']),
    E('!Registro', ['^fecha_hora|fecha', 'temperatura', 'humedad']),
    E('Publicacion|Publicación', ['*doi', 'titulo']),
    E('Proyecto', ['*id_proyecto|id|codigo', 'nombre']),
  ],
  [
    R('opera', ['Tecnico_Laboratorio:1', 'Estacion:1']),
    R('!genera', ['Estacion:1', 'Registro:N']),
    R('escribe', ['Investigador:N', 'Publicacion:N'], ['orden_autor|orden']),
    R('financia', ['Proyecto:1', 'Publicacion:N']),
  ],
  [S('Persona', ['Investigador', 'Tecnico_Laboratorio'], 'd', 't'), S('Investigador', ['Jefe_Departamento', 'Editor_Revista'], 'o', 'p')],
  [
    ['Jefe_Departamento', 'Editor_Revista', null, null],
    [null, 'Investigador', 'Publicacion', 'Proyecto'],
    [null, 'Persona', null, null],
    ['Tecnico_Laboratorio', null, 'Estacion', 'Registro'],
  ],
);

export const W3: Exercise[] = [
  { ...er('s3-empleados', 3, 'Empleados de una universidad', [
    'Una universidad registra a sus empleados: rut (identificador), nombre y sueldo. Todo empleado es docente o administrativo, y no puede ser ambas cosas a la vez.',
    'Los docentes tienen grado_academico; los administrativos tienen cargo.',
    'Además, todo empleado trabaja en un único departamento (cod_depto como identificador, y nombre). Un departamento puede tener muchos empleados, o ninguno todavía.',
    'Dibuja el modelo E/R extendido. Conecta la superclase con el círculo de especialización y este con cada subclase, y define si es total o parcial y disyunta (d) o solapada (o).',
  ], EMPLEADOS, 'EER') },
  { ...er('s3-personas', 3, 'Personas en la universidad', [
    'De cada persona se registra su rut (identificador), nombre y email. Algunas personas son estudiantes (con carrera y anio_ingreso) y otras son funcionarios (con cargo).',
    'No toda persona es estudiante o funcionario (por ejemplo, un visitante), y una persona puede ser estudiante y funcionario al mismo tiempo (por ejemplo, un ayudante).',
    'Un estudiante puede cursar muchos cursos (o ninguno todavía) (cod_curso como identificador, y nombre) y cada curso puede ser cursado por muchos estudiantes (o por ninguno).',
    'Dibuja el modelo E/R extendido indicando el tipo de especialización.',
  ], PERSONAS, 'EER') },
  ee('s3-cursos', 'Cursos presenciales y en línea', [
    'Una institución de capacitación ofrece cursos, identificados por un código, con nombre y horas. Todo curso es presencial (con la sala donde se dicta) o en línea (con la plataforma y la URL de acceso), y no puede ser ambas cosas.',
    'Cada curso es impartido por un instructor (rut como identificador y nombre); un instructor imparte muchos cursos. Los participantes (rut como identificador y nombre) pueden inscribirse en muchos cursos y cada curso tiene muchos participantes; de cada inscripción se guarda la nota.',
  ], W3_CURSOS),
  ee('s3-software', 'Empresa de software', [
    'Una empresa de software gestiona sus productos. Un producto, con un ID único, puede ser de dos tipos: software de escritorio o aplicación web. Todo producto debe ser de un tipo y solo uno. Del software de escritorio se anota el sistema operativo compatible. De las aplicaciones web, la URL de acceso.',
    'La empresa tiene clientes (ID y nombre), y un cliente puede comprar licencias para varios productos. Una compra asocia un cliente con un producto y una fecha.',
    'Además, los empleados de la empresa (ID y nombre) se clasifican como desarrolladores o vendedores. Un empleado puede ser ambas cosas, pero no es obligatorio que sea alguna de ellas. De los desarrolladores se guarda su lenguaje de programación principal.',
    'Los desarrolladores desarrollan los productos: un desarrollador puede trabajar en muchos productos y un producto es desarrollado por muchos desarrolladores. Cada cliente es atendido por un vendedor, y un vendedor atiende a muchos clientes.',
  ], W3_SOFTWARE),
  ee('s3-consultora', 'Consultora', [
    'Una consultora registra a sus empleados (ID y nombre), que pueden ser consultores (con su especialidad) o administrativos (con su cargo). Un empleado no puede ser de ambos tipos, pero puede no ser de ninguno (por ejemplo, personal de apoyo).',
    'Sus clientes (ID y nombre) pueden ser personas (con su rut) o empresas (con su razón social); un cliente no puede ser ambas cosas y puede ser de otro tipo (por ejemplo, una institución pública).',
    'La consultora ejecuta proyectos (código como identificador y nombre). Cada proyecto es contratado por un cliente, y un cliente puede contratar varios proyectos. En cada proyecto trabajan varios empleados y un empleado puede trabajar en varios proyectos.',
  ], W3_CONSULTORA),
  ee('s3-estudiantes', 'Gestión de estudiantes', [
    'En una universidad hay estudiantes de tiempo completo, de medio tiempo y a distancia. Todo estudiante pertenece a exactamente una de estas categorías. De todos los estudiantes se requiere su ID (identificador) y nombre completo; de los estudiantes a distancia, la modalidad de estudio (online o semipresencial); y de los de medio tiempo, el número de créditos que están cursando.',
    'Los estudiantes se inscriben en uno o más programas académicos (código identificador y nombre); un programa tiene muchos estudiantes. Cada programa ofrece varias asignaturas (código identificador y nombre) y cada asignatura pertenece a un solo programa. Un estudiante cursa varias asignaturas y una asignatura es cursada por varios estudiantes.',
    'Cada estudiante tiene un tutor asignado (ID y nombre) que lo asesora; un tutor puede asesorar a muchos estudiantes.',
  ], W3_ESTUDIANTES),
  ee('s3-hotel', 'Cadena de hoteles', [
    'Cadena de hoteles: de cada hotel se almacena el código (identificador), nombre, dirección, teléfono y año de construcción. Cada hotel se clasifica obligatoriamente en una categoría (por ejemplo, tres estrellas); cada categoría tiene código (identificador), tipo de IVA y descripción, y agrupa a muchos hoteles.',
    'Cada hotel tiene varias habitaciones, de las que se guarda el código (identificador) y el tipo (suite, doble, individual…); cada habitación pertenece a un hotel.',
    'Las reservas las realizan clientes (identificador, nombre, dirección y teléfono), que pueden ser particulares o agencias de viaje (no ambos; todo cliente es de uno de los dos tipos). Si la reserva la realiza una agencia, se necesita además el nombre de la persona para quien se reserva.',
    'De cada reserva (código identificador) se guarda el precio, la fecha de inicio y la fecha de fin. Cada reserva es de una habitación y la realiza un cliente; una habitación puede tener muchas reservas y un cliente puede hacer muchas reservas.',
  ], W3_HOTEL),
  ee('s3-clinica-dental', 'Clínica dental', [
    'Una clínica dental necesita un sistema para gestionar sus pacientes y tratamientos. Cada paciente es identificado por un rut y se registra su nombre y fecha de nacimiento. Un paciente puede tener múltiples alergias registradas.',
    'Cada paciente tiene asignada una única ficha dental, identificada por un número de folio, que contiene el historial. De cada ficha se desglosan los tratamientos realizados. Un tratamiento, que se identifica por un código único dentro de cada ficha, no puede existir sin ella (entidad débil). De cada tratamiento se anota la descripción y el costo.',
    'Un odontólogo, con un ID único (y su nombre), puede realizar muchos tratamientos, y un tratamiento es realizado por un único odontólogo.',
  ], W3_DENTAL),
  ee('s3-zoologico', 'Zoológico', [
    'Un zoológico cataloga sus animales. Cada animal tiene un ID único y una fecha de nacimiento. Los animales se clasifican en mamíferos, aves o reptiles; todo animal debe pertenecer a una y solo una de estas categorías. De los mamíferos se registra si es depredador; de las aves, la envergadura de sus alas; de los reptiles, si es venenoso.',
    'El zoológico también tiene empleados (rut como identificador y nombre); los cuidadores son un tipo de empleado (no todos los empleados son cuidadores). Un cuidador está asignado a un único hábitat. Un hábitat (ID de hábitat) alberga a muchos animales, pero un animal vive en un único hábitat.',
    'Además, algunos animales, pero no todos, pueden estar en un programa de conservación (ID del programa y estado de riesgo); un programa agrupa a muchos animales y cada animal está en, como máximo, un programa.',
  ], W3_ZOOLOGICO),
  ee('s3-rrhh', 'Recursos humanos', [
    'Un sistema de recursos humanos registra a los empleados de una corporación. Cada empleado tiene un ID único. Los empleados son contratados o externos: todo empleado debe pertenecer a una de estas dos categorías y solo a una. De los contratados se guarda el salario; de los externos, la empresa consultora a la que pertenecen.',
    'Adicionalmente, cualquier empleado contratado puede ser ascendido a un cargo de gerencia, del cual se guarda el presupuesto que maneja. No todos los contratados son gerentes.',
    'Un empleado contratado también tiene beneficios. Un beneficio (por ejemplo, «Seguro Dental») se identifica por un código dentro de cada empleado y no puede existir sin él (entidad débil).',
  ], W3_RRHH),
  ee('s3-publicaciones', 'Publicaciones académicas', [
    'Una universidad gestiona sus publicaciones académicas. Cada publicación tiene un DOI único. Las publicaciones son de dos tipos: artículos o libros. Una publicación puede ser un artículo, un libro o ambos (por ejemplo, un capítulo de libro publicado como artículo), o ninguno de los dos. De los artículos se guarda el nombre de la revista; de los libros, la editorial.',
    'Todo el personal de la universidad, con un rut único, se clasifica como académico o administrativo; esta clasificación es exclusiva y cubre a todo el personal. De los académicos se anota su grado (por ejemplo, Doctor).',
    'Las publicaciones son escritas por académicos: un académico puede escribir muchas publicaciones y una publicación puede tener muchos autores.',
  ], W3_PUBLICACIONES),
  ee('s3-centro-investigacion', 'Centro de investigación', [
    'Un centro de investigación gestiona su capital humano y sus proyectos. El centro está organizado en departamentos (código único, nombre y presupuesto anual). Cada departamento es dirigido por un único científico (director único); además, cada departamento emplea a muchos científicos, pero cada científico pertenece a un único departamento.',
    'De cada científico (ID de empleado) se guarda su nombre completo, que se compone de nombres y apellidos, y su fecha de contratación, a partir de la cual se calcula su antigüedad. Un científico puede tener múltiples especialidades.',
    'Cada científico debe ser clasificado obligatoriamente como junior o senior, pero no ambos. De los juniors se registra su mentor (un científico senior); de los seniors, su bono de productividad. Adicionalmente, un científico puede ser administrador de laboratorio (se guarda el laboratorio que gestiona) y/o coordinador de postgrado (el programa que dirige); estos roles no son obligatorios y puede tener ambos.',
    'El centro lleva a cabo proyectos (código único y título). Un científico puede trabajar en varios proyectos y un proyecto tiene muchos científicos, registrándose las horas semanales que cada científico dedica a cada proyecto.',
    'Cada científico puede registrar a sus familiares como beneficiarios del seguro médico; cada familiar se identifica por su nombre y no puede existir en el sistema sin el científico del que depende.',
  ], W3_CENTRO_INV),
  ee('s3-biblioteca-universitaria', 'Biblioteca universitaria', [
    'Una universidad tiene sucursales de biblioteca (código único, nombre, dirección, teléfono y horario de atención). Una sucursal tiene muchos ejemplares de libros, pero cada ejemplar físico pertenece a una sola sucursal.',
    'Cada libro tiene ISBN (identificador), título, año de publicación, editorial, categoría y número de páginas. Un libro puede tener varios autores y un autor puede haber escrito varios libros; de cada autor: id (identificador), nombre completo, nacionalidad, fecha de nacimiento y correo. Un libro puede tener varios ejemplares físicos (código único, estado, ubicación y fecha de adquisición).',
    'Los usuarios se clasifican en estudiantes o funcionarios; todo usuario pertenece obligatoriamente a una de las dos categorías. De cada usuario: rut (identificador), nombre completo, dirección (calle, número, comuna y ciudad), teléfonos (puede tener varios), correo, fecha de inscripción y fecha de nacimiento (de la que se calcula la edad). De los estudiantes: carrera, semestre y jornada; de los funcionarios: cargo, departamento y tipo de contrato.',
    'Un funcionario puede desempeñar uno, ambos o ninguno de estos roles: bibliotecario (se guarda el turno) y administrativo (el área de gestión). Cada sucursal tiene un funcionario responsable (relación 1:1) y un funcionario puede supervisar a otros funcionarios.',
    'Los usuarios solicitan préstamos de ejemplares (id, fecha de préstamo, fecha estimada de devolución, fecha real de devolución y estado); cada préstamo pertenece a un solo usuario y a un ejemplar específico. Un usuario puede reservar varios libros y un libro puede ser reservado por varios usuarios; de cada reserva se guarda la fecha de solicitud, el estado y la fecha máxima de retiro. Cada sanción por atraso (id, monto, motivo, fecha de generación y estado de pago) está asociada a un préstamo, y un préstamo puede generar varias sanciones.',
  ], W3_BIBLIO_UNIV),
  ee('s3-centro-medico', 'Centro médico universitario', [
    'Una universidad con facultad de medicina diseña el sistema de su red de centros médicos. Cada centro tiene código único, nombre, dirección, teléfono y horario de atención. Cada centro tiene varios consultorios, que solo tienen sentido en el contexto de un centro: se identifican por un número (único solo dentro de su centro), con piso y tipo de equipamiento (entidad débil). Cada centro tiene un médico jefe responsable (relación 1:1).',
    'Todo el personal se clasifica en médicos o administrativos (exclusivo y obligatorio). De todo el personal: rut (identificador), nombre completo, dirección (calle, número, comuna y ciudad), teléfono, correo y fecha de contratación. De los médicos: número de colegiatura y años de experiencia; de los administrativos: cargo y área.',
    'Dentro de los médicos hay dos roles: tratante (cupo diario de pacientes) y docente (asignatura o rotación a cargo). Un médico puede ser tratante, docente, ambos, o ninguno. Un médico puede supervisar a otros médicos (relación reflexiva).',
    'Hay especialidades (código, nombre y descripción): un médico ejerce varias especialidades y una especialidad es ejercida por muchos médicos, registrándose la fecha de certificación.',
    'Los pacientes (rut, nombre completo, dirección compuesta, correo, fecha de nacimiento —de la que se calcula la edad— y varios teléfonos) solicitan citas (id, fecha, hora, motivo y estado); cada cita pertenece a un paciente y a un médico. De una cita puede emitirse una receta (id), que incluye uno o varios medicamentos (código y nombre); un medicamento puede estar en varias recetas, con dosis, frecuencia y duración.',
  ], W3_CENTRO_MEDICO),
  ee('s3-red-climatica', 'Red de institutos de investigación climática', [
    'Una red de institutos climáticos registra a las personas afiliadas, identificadas por un ORCID. De cada persona: nombre completo (compuesto por nombre de pila y apellidos), correos electrónicos (varios), año de nacimiento y edad (calculable). Las personas son investigadores o técnicos de laboratorio, y solo de una de estas categorías (todas pertenecen a una). De los investigadores: campo de estudio principal; de los técnicos: certificación de especialidad.',
    'Ciertos investigadores pueden ser jefes de departamento y/o editores de revista; un investigador puede no tener ninguno de estos roles, uno o ambos.',
    'Hay estaciones meteorológicas (código único y ubicación compuesta por latitud y longitud). Cada estación es operada por un único técnico de laboratorio (relación exclusiva 1:1). Una estación genera múltiples registros; un registro se identifica por la fecha y hora de la medición (única para esa estación) y no puede existir sin su estación (entidad débil). De cada registro: temperatura y humedad.',
    'Los investigadores colaboran en publicaciones (DOI y título): una publicación puede ser escrita por varios investigadores y un investigador puede escribir muchas publicaciones; para cada autoría se registra el orden de los autores. Cada publicación está financiada por un único proyecto (id y nombre), pero un proyecto puede financiar muchas publicaciones.',
  ], W3_RED_CLIMATICA),
];
