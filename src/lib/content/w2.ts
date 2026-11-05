import type { Exercise } from '../types';
import { E, M, R, er } from './dsl';
import { BIBLIOTECA, CLINICA } from './modeling';

const NOTE = 'Dibuja el modelo Entidad-Relación con sus atributos y cardinalidades (mín,máx).';

export const W2_VENTAS = M(
  [
    E('Cliente', ['*rut', 'nombre', 'apellido', 'direccion(calle,numero,ciudad)', 'fecha_nacimiento', '~edad']),
    E('Producto', ['*codigo', 'nombre', 'precio_unitario']),
    E('Proveedor', ['*rut', 'nombre', 'direccion', '+representantes']),
  ],
  [R('compra', ['Cliente:N', 'Producto:N']), R('suministra', ['Proveedor:1', 'Producto:N'])],
  [],
  [['Cliente', null, 'Producto', null, 'Proveedor']],
);

export const W2_TRANSPORTES = M(
  [
    E('Camionero', ['*rut', 'nombre', '+telefono', 'direccion', 'sueldo', 'ciudad']),
    E('Paquete', ['*cod_paquete', 'descripcion', 'destinatario', 'direccion_destinatario']),
    E('Provincia', ['*cod_provincia', 'nombre']),
    E('Camion', ['*matricula', 'modelo', 'tipo', 'potencia']),
  ],
  [
    R('distribuye', ['Camionero:1', 'Paquete:N']),
    R('llega', ['Provincia:1', 'Paquete:N']),
    R('conduce', ['Camionero:N', 'Camion:N'], ['fecha']),
  ],
  [],
  [
    ['Camion', 'Camionero', 'Paquete', 'Provincia'],
  ],
);

export const W2_INSTITUTO = M(
  [
    E('Profesor', ['*dni', 'nombre', 'direccion', 'telefono']),
    E('Modulo', ['*cod_modulo', 'nombre']),
    E('Alumno', ['*n_expediente', 'nombre', 'apellidos', 'fecha_nacimiento']),
    E('Curso', ['*cod_curso']),
  ],
  [
    R('imparte', ['Profesor:1', 'Modulo:N']),
    R('matricula', ['Alumno:N', 'Modulo:N']),
    R('tiene', ['Curso:1', 'Alumno:N']),
    R('delegado', ['Curso:1', 'Alumno:1']),
  ],
  [],
  [['Profesor', 'Modulo', 'Alumno', 'Curso']],
);

export const W2_AUTOMOTORA = M(
  [
    E('Vehiculo', ['*matricula', 'marca', 'modelo', 'color', 'precio_venta']),
    E('Cliente', ['*codigo_interno', 'rut', 'nombre', 'direccion', 'ciudad', '+telefono']),
    E('Revision', ['*cod_revision', 'cambio_filtro', 'cambio_aceite', 'cambio_frenos', 'otros']),
  ],
  [R('compra', ['Cliente:1', 'Vehiculo:N']), R('se_revisa', ['Vehiculo:1', 'Revision:N'])],
  [],
  [['Cliente', 'Vehiculo', 'Revision']],
);

export const W2_SANTA_PAZ = M(
  [
    E('Paciente', ['*cod_paciente', 'nombre', 'apellidos', 'direccion', 'poblacion', 'provincia', 'codigo_postal', 'telefono', 'fecha_nacimiento']),
    E('Medico', ['*cod_medico', 'nombre', 'apellidos', 'telefono', 'especialidad']),
    E('Ingreso', ['*cod_ingreso', 'numero_habitacion', 'cama', 'fecha_ingreso']),
  ],
  [R('realiza', ['Paciente:1', 'Ingreso:N']), R('atiende', ['Medico:1', 'Ingreso:N'])],
  [],
  [['Paciente', 'Ingreso', 'Medico']],
);

export const W2_TIENDA = M(
  [
    E('Producto', ['*codigo', 'descripcion', 'precio', 'existencias']),
    E('Cliente', ['*codigo', 'nombre', 'apellidos', 'direccion', '+correos', '+telefonos']),
    E('Proveedor', ['*codigo', 'nombre', 'apellido', 'direccion', 'provincia', 'telefono']),
  ],
  [R('compra', ['Cliente:N', 'Producto:N'], ['fecha']), R('suministra', ['Proveedor:N', 'Producto:N'])],
  [],
  [['Cliente', 'Producto', 'Proveedor']],
);

export const W2_BIBLIO_CENTRO = M(
  [
    E('Autor', ['*cod_autor', 'nombre']),
    E('Libro', ['*cod_libro', 'titulo', 'isbn', 'editorial', 'numero_paginas']),
    E('Ejemplar', ['*cod_ejemplar', 'localizacion']),
    E('Usuario', ['*cod_usuario', 'nombre', 'direccion', 'telefono']),
  ],
  [
    R('escribe', ['Autor:N', 'Libro:N']),
    R('tiene', ['Libro:1', 'Ejemplar:N']),
    R('presta', ['Usuario:N', 'Ejemplar:N'], ['fecha_prestamo', 'fecha_devolucion']),
  ],
  [],
  [['Autor', 'Libro', 'Ejemplar', 'Usuario']],
);

export const W2_LIGA = M(
  [
    E('Jugador', ['*cod_jugador', 'nombre', 'fecha_nacimiento', 'posicion']),
    E('Equipo', ['*cod_equipo', 'nombre', 'nombre_estadio', 'aforo', 'anio_fundacion|año_fundacion', 'ciudad']),
    E('Partido', ['*cod_partido', 'fecha', 'goles_casa', 'goles_fuera']),
    E('Gol', ['*cod_gol', 'minuto', 'descripcion']),
    E('Presidente', ['*rut', 'nombre', 'apellidos', 'fecha_nacimiento']),
  ],
  [
    R('pertenece', ['Equipo:1', 'Jugador:N']),
    R('local', ['Equipo:1', 'Partido:N']),
    R('visitante', ['Equipo:1', 'Partido:N']),
    R('marca', ['Jugador:1', 'Gol:N']),
    R('contiene', ['Partido:1', 'Gol:N']),
    R('preside', ['Presidente:1', 'Equipo:1'], ['anio_eleccion|año_eleccion|anio_elegido']),
  ],
  [],
  [
    ['Presidente', 'Equipo', 'Partido', 'Gol'],
    [null, 'Jugador', null, null],
  ],
);

export const W2_PROYECTOS = M(
  [
    E('Proyecto', ['*cod_proyecto', 'descripcion', 'cuantia', 'fecha_inicio', 'fecha_fin']),
    E('Cliente', ['*cod_cliente', 'telefono', 'domicilio', 'razon_social']),
    E('Colaborador', ['*rut', 'nombre', 'domicilio', 'telefono', 'banco', 'numero_cuenta']),
    E('Pago', ['*numero_pago', 'concepto', 'cantidad', 'fecha_pago']),
    E('TipoPago|Tipo_de_pago|Tipo Pago', ['*cod_tipo', 'descripcion']),
  ],
  [
    R('realiza', ['Cliente:1', 'Proyecto:N']),
    R('participa', ['Colaborador:N', 'Proyecto:N']),
    R('recibe', ['Colaborador:1', 'Pago:N']),
    R('tiene', ['TipoPago:1', 'Pago:N']),
  ],
  [],
  [
    ['Cliente', 'Proyecto', 'Colaborador'],
    [null, 'TipoPago', 'Pago'],
  ],
);

export const W2_AGENCIA = M(
  [
    E('Viajero', ['*rut', 'nombre', 'direccion', 'telefono']),
    E('Viaje', ['*cod_viaje', 'numero_plazas', 'fecha', 'otros_datos']),
    E('Lugar', ['*cod_lugar', 'nombre', 'otros_datos']),
  ],
  [R('realiza', ['Viajero:1', 'Viaje:N']), R('destino', ['Lugar:1', 'Viaje:N']), R('origen', ['Lugar:1', 'Viaje:N'])],
  [],
  [['Viajero', 'Viaje', 'Lugar']],
);

export const W2_DECATHLON = M(
  [
    E('Sucursal', ['*num_sucursal', 'domicilio', 'ciudad', 'descuento']),
    E('Empleado', ['*rut', 'nombre_completo|nombre', 'domicilio(calle,numero,ciudad)', '+telefono']),
    E('Producto', ['*codigo', 'descripcion', 'color', 'costo_fijo']),
    E('Fabrica', ['*cuit', 'nombre', 'pais_origen', 'cantidad_empleados', 'gerente']),
    E('Cliente', ['*cod_cliente', 'rut', 'nombre', 'fecha_nacimiento', 'ciudad', '~edad']),
    E('Tarjeta', ['*numero', 'nombre_tarjeta|nombre', 'codigo_seguridad', 'fecha_vencimiento']),
  ],
  [
    R('trabaja', ['Empleado:N', 'Sucursal:N'], ['dia', 'horario']),
    R('vende', ['Sucursal:N', 'Producto:N'], ['precio_venta']),
    R('fabrica', ['Fabrica:1', 'Producto:1']),
    R('compra', ['Sucursal:1', 'Cliente:N']),
    R('utiliza', ['Cliente:1', 'Tarjeta:N']),
  ],
  [],
  [
    ['Empleado', 'Sucursal', 'Producto', 'Fabrica'],
    [null, 'Cliente', 'Tarjeta', null],
  ],
);

export const W2_FARMACIAS = M(
  [
    E('Farmacia', ['*nombre', 'domicilio']),
    E('Ciudad', ['*nombre', '*provincia', 'habitantes', 'superficie']),
    E('Propietario', ['*dni', 'nombre', 'domicilio(calle,numero,codigo_postal,ciudad)', '+telefonos', '+emails']),
    E('Medicamento', ['*id', 'nombre_comercial', '+drogas|monodrogas']),
  ],
  [
    R('se_ubica', ['Ciudad:1', 'Farmacia:N']),
    R('posee', ['Propietario:1', 'Farmacia:1']),
    R('vende', ['Farmacia:N', 'Medicamento:N'], ['precio']),
    R('complementa', ['Medicamento:1', 'Medicamento:N']),
  ],
  [],
  [
    ['Ciudad', 'Farmacia', 'Propietario'],
    [null, 'Medicamento', null],
  ],
);

export const W2_VETERINARIA = M(
  [
    E('Cliente', ['*rut', 'nombre', 'direccion(calle,numero,comuna)', '+telefono']),
    E('Mascota', ['*codigo', 'nombre', 'especie', 'raza', 'fecha_nacimiento', 'peso', '~edad']),
    E('Veterinario', ['*rut', 'nombre', 'especialidad', 'correo', 'telefono']),
    E('Atencion', ['*cod_atencion', 'fecha', 'motivo', 'diagnostico', 'tratamiento', 'costo']),
    E('Medicamento', ['*codigo', 'nombre', 'dosis_recomendada', 'laboratorio']),
  ],
  [
    R('tiene', ['Cliente:1', 'Mascota:N']),
    R('recibe', ['Mascota:1', 'Atencion:N']),
    R('realiza', ['Veterinario:1', 'Atencion:N']),
    R('indica', ['Atencion:N', 'Medicamento:N']),
  ],
  [],
  [
    ['Cliente', 'Mascota', 'Atencion', 'Medicamento'],
    [null, null, 'Veterinario', null],
  ],
);

export const W2: Exercise[] = [
  { ...er('s2-biblioteca', 2, 'Biblioteca universitaria', [
    'Una biblioteca desea registrar a sus socios, los libros y los autores.',
    'De cada socio se guarda su rut (identificador), nombre y email. De cada libro: isbn (identificador), título y año de publicación. De cada autor: id_autor (identificador), nombre y nacionalidad.',
    'Un socio puede pedir prestados muchos libros (o ninguno todavía) y un libro puede ser prestado por muchos socios (o por ninguno); de cada préstamo interesa la fecha_prestamo. Un autor escribe al menos un libro (y puede escribir muchos) y todo libro tiene al menos un autor (y puede tener varios).',
    'Dibuja el modelo Entidad-Relación. Indica la cardinalidad (mín,máx) en cada extremo de las relaciones con la notación «look across» de erdplus: el valor junto a una entidad indica con cuántas ocurrencias de ESA entidad se asocia UNA ocurrencia de la otra. Ejemplo: si todo libro tiene al menos un autor (y puede tener varios), junto a «Autor» va (1,M).',
  ], BIBLIOTECA) },
  { ...er('s2-clinica', 2, 'Clínica médica', [
    'Una clínica gestiona médicos, pacientes y departamentos.',
    'Médico: rut_medico (identificador), nombre y especialidad. Paciente: rut_paciente (identificador), nombre, fecha_nacimiento, edad (se calcula a partir de la fecha de nacimiento, por lo tanto es derivado) y puede tener varios teléfonos. Departamento: cod_depto (identificador) y nombre.',
    'Todo médico pertenece a un único departamento, pero un departamento puede tener muchos médicos (o ninguno todavía). Un médico puede atender a muchos pacientes (o a ninguno todavía) y todo paciente registrado ha sido atendido por al menos un médico (y puede haber sido atendido por varios); de cada atención se registra la fecha y el diagnóstico.',
    'Dibuja el modelo Entidad-Relación con cardinalidades (mín,máx). Recuerda marcar los atributos multivaluado y derivado.',
  ], CLINICA) },
  er('s2-ventas', 2, 'Empresa de ventas', [
    'Una empresa vende productos a varios clientes. De los clientes se guardan: rut (identificador), nombre, apellido, dirección (compuesta por calle, número y ciudad), fecha de nacimiento y edad (se calcula a partir de la fecha de nacimiento). Cada producto tiene un código (identificador), un nombre y un precio unitario.',
    'Un cliente puede comprar varios productos a la empresa, y un mismo producto puede ser comprado por varios clientes.',
    'Los productos son suministrados por diferentes proveedores. Un producto solo puede ser suministrado por un proveedor, y un proveedor puede suministrar diferentes productos. De cada proveedor se desea conocer el rut (identificador), nombre, dirección y sus representantes (puede tener varios).',
    NOTE,
  ], W2_VENTAS),
  er('s2-transportes', 2, 'Empresa de transportes', [
    'Se desea informatizar la gestión de una empresa de transportes que reparte paquetes. Los encargados de llevar los paquetes son los camioneros, de los que se quiere guardar el rut (identificador), nombre, teléfonos (puede tener varios), dirección, sueldo y ciudad en la que vive.',
    'De los paquetes transportados interesa conocer el código de paquete (identificador), descripción, destinatario y dirección del destinatario. Un camionero distribuye muchos paquetes, y un paquete solo puede ser distribuido por un camionero.',
    'De las provincias a las que llegan los paquetes interesa guardar el código de provincia (identificador) y el nombre. Un paquete solo puede llegar a una provincia; sin embargo, a una provincia pueden llegar varios paquetes.',
    'De los camiones interesa conocer la matrícula (identificador), modelo, tipo y potencia. Un camionero puede conducir diferentes camiones en fechas diferentes (se registra la fecha), y un camión puede ser conducido por varios camioneros.',
    NOTE,
  ], W2_TRANSPORTES),
  er('s2-instituto', 2, 'Instituto', [
    'Se desea diseñar la base de datos de un instituto. De los profesores se guarda el dni (identificador), nombre, dirección y teléfono. Los profesores imparten módulos, y cada módulo tiene un código (identificador) y un nombre.',
    'Cada alumno está matriculado en uno o varios módulos. De cada alumno se guarda el n.º de expediente (identificador), nombre, apellidos y fecha de nacimiento. Los profesores pueden impartir varios módulos, pero un módulo solo puede ser impartido por un profesor.',
    'Cada curso (identificado por un código) tiene un grupo de alumnos, y cada alumno pertenece a un curso. Uno de los alumnos del curso es el delegado del grupo (un alumno es delegado de, como máximo, un curso y cada curso tiene un delegado).',
    NOTE,
  ], W2_INSTITUTO),
  er('s2-automotora', 2, 'Venta de automóviles', [
    'Se desea diseñar una base de datos para una empresa dedicada a la venta de automóviles. La empresa dispone de vehículos para su venta: se necesita conocer la matrícula (identificador), marca, modelo, color y precio de venta.',
    'De cada cliente interesa el rut, nombre, dirección, ciudad y números de teléfono (puede tener varios). Además, los clientes se diferencian por un código interno (identificador) que se incrementa automáticamente cuando un cliente se da de alta.',
    'Un cliente puede comprar tantos vehículos como desee. Un vehículo determinado solo puede ser comprado por un único cliente.',
    'El concesionario también realiza las revisiones de cada vehículo. Cada revisión tiene un código (identificador) y se desea saber si se hizo cambio de filtro, de aceite, de frenos u otros. Un vehículo puede pasar varias revisiones, y cada revisión corresponde a un solo vehículo.',
    NOTE,
  ], W2_AUTOMOTORA),
  er('s2-santa-paz', 2, 'Clínica «Santa Paz»', [
    'La clínica «Santa Paz» necesita llevar un control informatizado de sus pacientes y médicos.',
    'De cada paciente se guarda el código (identificador), nombre, apellidos, dirección, población, provincia, código postal, teléfono y fecha de nacimiento. De cada médico: código (identificador), nombre, apellidos, teléfono y especialidad.',
    'Se controla cada ingreso que el paciente hace en la clínica. De cada ingreso se guarda el código de ingreso (identificador), el número de habitación, la cama y la fecha de ingreso.',
    'Un médico puede atender varios ingresos, pero cada ingreso solo es atendido por un único médico. Un paciente puede realizar varios ingresos y cada ingreso corresponde a un solo paciente.',
    NOTE,
  ], W2_SANTA_PAZ),
  er('s2-tienda-informatica', 2, 'Tienda informática', [
    'Se desea informatizar la gestión de una tienda informática. De cada producto se guarda el código (identificador), descripción, precio y número de existencias.',
    'De cada cliente: código (identificador), nombre, apellidos, dirección, correos (puede tener varios) y teléfonos (puede tener varios). Un cliente puede comprar varios productos y un mismo producto puede ser comprado por varios clientes. Cada compra queda registrada con la fecha en la que se realizó.',
    'La tienda tiene contactos con varios proveedores que suministran los productos. Un mismo producto puede ser suministrado por varios proveedores (y un proveedor suministra varios productos). De cada proveedor: código (identificador), nombre, apellido, dirección, provincia y teléfono.',
    NOTE,
  ], W2_TIENDA),
  er('s2-biblioteca-centro', 2, 'Biblioteca del centro', [
    'En la biblioteca de un centro se manejan fichas de autores y libros. De cada autor: código de autor (identificador) y nombre. De cada libro: código (identificador), título, ISBN, editorial y número de páginas.',
    'Un autor puede escribir varios libros, y un libro puede ser escrito por varios autores.',
    'Un libro está formado por ejemplares. Cada ejemplar tiene un código (identificador) y una localización. Un libro tiene muchos ejemplares y un ejemplar pertenece solo a un libro.',
    'Los usuarios también tienen ficha: código (identificador), nombre, dirección y teléfono. Los ejemplares son prestados a los usuarios: un usuario puede tomar prestados varios ejemplares, y un ejemplar puede ser prestado a varios usuarios (en distintos momentos). De cada préstamo se guarda la fecha de préstamo y la fecha de devolución.',
    NOTE,
  ], W2_BIBLIO_CENTRO),
  er('s2-proyectos', 2, 'Gestión de proyectos', [
    'Una empresa desea almacenar la información generada en cada uno de sus proyectos. De cada proyecto interesa: código (identificador), descripción, cuantía, fecha de inicio y fecha de fin.',
    'Los proyectos son realizados por clientes, de los que se guarda el código (identificador), teléfono, domicilio y razón social. Un cliente puede realizar varios proyectos, pero un proyecto es realizado por un único cliente.',
    'En los proyectos participan colaboradores: rut (identificador), nombre, domicilio, teléfono, banco y número de cuenta. Un colaborador puede participar en varios proyectos, y un proyecto es realizado por uno o más colaboradores.',
    'Los colaboradores reciben pagos (cada pago se hace a un colaborador). De cada pago: número de pago (identificador), concepto, cantidad y fecha de pago. También se almacenan los tipos de pago (código —identificador— y descripción); un tipo de pago puede pertenecer a varios pagos y cada pago tiene un tipo.',
    NOTE,
  ], W2_PROYECTOS),
  er('s2-agencia-viajes', 2, 'Agencia de viajes', [
    'Una agencia de viajes desea informatizar la gestión de sus viajeros y de los viajes que estos realizan.',
    'De los viajeros se guarda el rut (identificador), nombre, dirección y teléfono. De cada viaje: código de viaje (identificador), número de plazas, fecha y otros datos.',
    'Un viajero puede realizar tantos viajes como desee con la agencia. Un viaje determinado solo puede ser cubierto por un viajero.',
    'Cada viaje tiene un lugar de destino y un lugar de origen. De cada lugar se guarda el código (identificador), nombre y otros datos. Un viaje tiene un único destino y un único origen (ambos son lugares).',
    NOTE,
  ], W2_AGENCIA),
  er('s2-liga-futbol', 2, 'Liga de fútbol', [
    'Una liga de fútbol profesional desea crear una base de datos con la información de los partidos que se juegan. Se guarda: de cada jugador su código (identificador), nombre, fecha de nacimiento y posición (portero, defensa, centrocampista…); de cada equipo su código (identificador), nombre, nombre del estadio, aforo, año de fundación y ciudad.',
    'Un jugador solo puede pertenecer a un único equipo. De cada partido: código numérico (identificador), fecha, goles del equipo de casa y goles del equipo de fuera. Cada partido lo juega un equipo local y un equipo visitante (dos relaciones entre equipo y partido).',
    'También se registra cada gol: código de gol (identificador), minuto y descripción. Un partido tiene varios goles y un jugador puede meter varios goles. Cada gol pertenece a un partido y lo mete un jugador.',
    'Por último, se guardan los presidentes de los equipos: rut (identificador), nombre, apellidos y fecha de nacimiento, además del año en que fue elegido presidente. Un equipo solo puede tener un presidente y una persona solo puede ser presidente de un equipo.',
    NOTE,
  ], W2_LIGA),
  er('s2-decathlon', 2, 'Decathlon Chile', [
    'La empresa Decathlon Chile desea una base de datos para manejar sus sucursales, empleados, productos y clientes.',
    'De las sucursales se sabe el número único que la identifica dentro de la cadena, el domicilio y la ciudad. De los empleados: rut (identificador), nombre completo, domicilio (calle, número y ciudad) y los teléfonos en los que puede ser contactado (varios). Los empleados trabajan en diferentes sucursales en diferentes días de la semana, y en cada sucursal tienen asignado un horario que puede ser distinto en cada una; en cada sucursal trabajan varios empleados (se registra el día y el horario).',
    'De los productos se conoce un código (identificador), descripción, color y costo fijo de fabricación. Las fábricas se identifican con CUIT y se conoce su nombre, país de origen, cantidad de empleados y nombre del gerente. Cada producto es fabricado en una sola fábrica, y cada fábrica solamente realiza un tipo de producto.',
    'Cada sucursal puede vender varios productos y cada producto puede ser vendido por varias sucursales; cada sucursal establece el precio de venta del producto que ofrece.',
    'De los clientes se conoce el código de cliente (identificador), rut, nombre, fecha de nacimiento, ciudad y edad (calculable). Cada cliente puede utilizar varias tarjetas de crédito, identificadas por su número, de las que se guarda el nombre de la tarjeta, el código de seguridad y la fecha de vencimiento. Cada cliente compra en una sola sucursal y en una sucursal pueden comprar varios clientes. Cada sucursal ofrece a sus clientes un descuento fijo por fidelidad (atributo de la sucursal).',
    NOTE,
  ], W2_DECATHLON),
  er('s2-farmacias', 2, 'Sistema de farmacias', [
    'Se debe diseñar un sistema para registrar las farmacias de las ciudades de un país. Cada farmacia tiene un nombre (único, identificador) y un domicilio. Cada farmacia se ubica en una sola ciudad, pero en una ciudad hay varias farmacias.',
    'De cada ciudad se conoce el nombre, la provincia, la cantidad de habitantes y la superficie; cada ciudad se identifica con el nombre y la provincia (clave compuesta).',
    'Cada farmacia puede tener un propietario y cada propietario tiene solamente una farmacia (puede haber farmacias sin propietario). De los propietarios se conoce el dni (identificador), nombre, domicilio (compuesto por calle, número, código postal y ciudad), teléfonos (varios) y emails (varios).',
    'Cada farmacia vende varios medicamentos y un medicamento se vende en varias farmacias, a un precio determinado que puede ser distinto en cada farmacia. De cada medicamento se conoce su id (identificador), nombre comercial y las drogas de las que se compone (varias monodrogas).',
    'Un medicamento puede complementar a otros medicamentos, pero cada medicamento puede ser complementado por un solo medicamento (relación reflexiva).',
    NOTE,
  ], W2_FARMACIAS),
  er('s2-veterinaria', 2, 'Clínica veterinaria', [
    'Una clínica veterinaria necesita diseñar una base de datos para administrar sus clientes, mascotas, veterinarios y atenciones médicas.',
    'Cada cliente tiene rut (identificador), nombre, dirección (calle, número y comuna) y teléfonos (puede tener varios). Un cliente puede tener una o varias mascotas, pero cada mascota pertenece a un solo cliente.',
    'De cada mascota se registra código (identificador), nombre, especie, raza, fecha de nacimiento y peso; la edad debe poder calcularse a partir de la fecha de nacimiento.',
    'Cada veterinario tiene rut (identificador), nombre, especialidad, correo electrónico y teléfono. Cada atención médica (identificada por un número de atención) es realizada por un veterinario a una mascota y registra la fecha, motivo de consulta, diagnóstico, tratamiento indicado y costo. Un veterinario realiza muchas atenciones y una mascota puede recibir varias atenciones.',
    'Además, se registran los medicamentos indicados en cada atención: código (identificador), nombre, dosis recomendada y laboratorio. Una atención puede incluir varios medicamentos y un medicamento puede indicarse en muchas atenciones.',
    NOTE,
  ], W2_VETERINARIA),
];
