import type { Exercise } from '../types';
import { T, sql } from './dsl';

const ALTER_TIP = ['Puedes crear las tablas sin la clave foránea y agregarla después con ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES ...; lo que se revisa es la estructura final.'];

export const W7_DDL_NEW: Exercise[] = [
  sql(
    's7-automotora',
    'Automotora',
    'automotora',
    ['Un cliente puede tener varios teléfonos y varios vehículos; un vehículo pertenece a un cliente.'],
    [
      T('cliente', ['rut str10 pk', 'nombre str20', 'apaterno str20', 'amaterno str20']),
      T('telefono', ['rut str10 pk', 'telefono int pk'], ['rut>cliente.rut']),
      T('vehiculo', ['chasis int pk', 'marca str20', 'modelo str20', 'color str15', 'rut str10'], ['rut>cliente.rut']),
    ],
    ALTER_TIP,
  ),
  sql(
    's7-rosselot',
    'Taller Rosselot',
    'rosselot',
    ['Un cliente puede tener varios vehículos; cada vehículo pertenece a un cliente.'],
    [
      T('cliente', ['rut str11 pk', 'nombre str30', 'apellido str40', 'direccion str90', 'telefono int', 'fecha_nacimiento date']),
      T('vehiculo', ['num_motor str15 pk', 'num_chasis str15', 'rut str11'], ['rut>cliente.rut']),
    ],
  ),
  sql(
    's7-oxxo-alter',
    'Tienda OXXO: modificar una tabla (ALTER)',
    'oxxo',
    [
      'Sigue estos pasos en tu script: (1) crea la base de datos y la tabla `clientes` con las columnas rut (clave primaria, texto de hasta 20), nombre (texto, obligatorio), edad (entero) y nacionalidad (texto, obligatorio); (2) con ALTER TABLE agrega las columnas ciudad, comuna y estadocivil; (3) renombra la columna comuna a region; (4) elimina la columna estadocivil.',
      'La estructura FINAL de la tabla debe quedar así (no debe sobrar ninguna columna):',
    ],
    [T('clientes', ['rut str20 pk', 'nombre str20 nn', 'edad int', 'nacionalidad str40 nn', 'ciudad str40', 'region str40'], [], { exact: true })],
  ),
  sql(
    's7-biblioteca',
    'Biblioteca: autores y libros',
    'biblioteca',
    ['Un autor puede escribir varios libros y un libro puede tener varios autores (relación N:M con tabla intermedia).'],
    [
      T('autor', ['id_autor int pk ai', 'nombre str80 nn', 'nacionalidad str40']),
      T('libro', ['isbn str20 pk', 'titulo str120 nn', 'anio int', 'editorial str60']),
      T('escribe', ['id_autor int pk', 'isbn str20 pk'], ['id_autor>autor.id_autor', 'isbn>libro.isbn']),
    ],
  ),
  sql(
    's7-secciones',
    'Secciones con clave primaria compuesta',
    'ejemplo_unab',
    ['La tabla `secciones` une a un profesor, un alumno y una asignatura; su clave primaria está formada por las tres claves foráneas.'],
    [
      T('alumno', ['rut_alumno str12 pk', 'nombre str30']),
      T('asignatura', ['nrc int pk', 'nombre str12']),
      T('profesor', ['rut_profesor str12 pk', 'nombre str30']),
      T('secciones', ['rut_profesor str12 pk', 'rut_alumno str12 pk', 'nrc int pk', 'notas dec'], ['rut_profesor>profesor.rut_profesor', 'rut_alumno>alumno.rut_alumno', 'nrc>asignatura.nrc']),
    ],
  ),
  sql(
    's7-colegio',
    'Colegio: profesores, alumnos y asignaturas',
    'colegio',
    ['Las notas se guardan en `secciones`, que relaciona una asignatura, un alumno y su profesor (clave primaria compuesta por asignatura y alumno).'],
    [
      T('profesor', ['rut str45 pk', 'nombre str45 nn', 'fecha_nacimiento date', 'region str45 nn', 'telefono int nn']),
      T('alumno', ['rut str45 pk', 'nombre str45', 'fecha_nacimiento date nn', 'telefono int nn', 'comuna str45', 'region str45', 'calle str45', 'numero_calle int', 'seccion str45']),
      T('asignaturas', ['nrc int pk', 'nombre str45', 'seccion str45']),
      T('secciones', ['asignatura_nrc int pk', 'alumno_rut str45 pk', 'profesor_rut str45 nn', 'notas dec'], ['asignatura_nrc>asignaturas.nrc', 'alumno_rut>alumno.rut', 'profesor_rut>profesor.rut']),
    ],
    ALTER_TIP,
  ),
  sql(
    's7-empresa-rrhh',
    'Empresa: departamentos, sedes y empleados',
    'empresa_rrhh',
    ['Una empresa tiene departamentos y sedes; los empleados pertenecen a un departamento y pueden tener varios teléfonos y emails.'],
    [
      T('empresa', ['rut str12 pk', 'nombre str100']),
      T('departamento', ['id_depto int pk', 'nombre_depto str30', 'rut str12'], ['rut>empresa.rut']),
      T('sede', ['id_sede int pk', 'nombre_sede str30', 'ubicacion str50', 'rut str12'], ['rut>empresa.rut']),
      T('empleado', ['rut str12 pk', 'nombre str30', 'apaterno str50', 'amaterno str50', 'fecha_nacimiento date', 'tipo enum(Contrata,Honorario)', 'id_depto int'], ['id_depto>departamento.id_depto']),
      T('telefono', ['rut str12 pk', 'telefono int pk'], ['rut>empleado.rut']),
      T('email', ['rut str12 pk', 'email str30 pk'], ['rut>empleado.rut']),
    ],
  ),
  sql(
    's7-tienda-online',
    'Tienda en línea con listas de valores (ENUM)',
    'tienda_online',
    ['Usa ENUM para los campos que solo admiten ciertos valores. Un pedido tiene varios productos (tabla `detalle_pedido`).'],
    [
      T('cliente', ['id int pk ai', 'nombre str60 nn', 'email str80 nn u', 'tipo enum(Regular,Premium) nn']),
      T('producto', ['sku str20 pk', 'nombre str80 nn', 'precio int nn', 'stock int']),
      T('pedido', ['id_pedido int pk ai', 'fecha date nn', 'estado enum(Pendiente,Enviado,Entregado,Cancelado) nn', 'id_cliente int nn'], ['id_cliente>cliente.id']),
      T('detalle_pedido', ['id_pedido int pk', 'sku str20 pk', 'cantidad int nn'], ['id_pedido>pedido.id_pedido', 'sku>producto.sku']),
    ],
  ),
  sql(
    's7-jerarquia',
    'Empleados y jefes (relación reflexiva)',
    'organizacion',
    ['Cada empleado puede tener un jefe, que es otro empleado (clave foránea hacia la misma tabla), y pertenece a un departamento.'],
    [
      T('departamento', ['id int pk', 'nombre str40 nn u']),
      T('empleado', ['id int pk', 'nombre str60 nn', 'id_jefe int', 'id_depto int'], ['id_jefe>empleado.id', 'id_depto>departamento.id']),
    ],
  ),
  sql(
    's7-veterinaria',
    'Clínica veterinaria',
    'veterinaria',
    ['Un cliente tiene varias mascotas; cada atención la realiza un veterinario a una mascota.'],
    [
      T('cliente', ['rut str12 pk', 'nombre str60 nn', 'direccion str100', 'telefono int']),
      T('mascota', ['codigo int pk ai', 'nombre str40 nn', 'especie str30 nn', 'raza str30', 'fecha_nacimiento date', 'peso dec', 'rut_cliente str12 nn'], ['rut_cliente>cliente.rut']),
      T('veterinario', ['rut str12 pk', 'nombre str60 nn', 'especialidad str40', 'correo str60 u']),
      T('atencion', ['id_atencion int pk ai', 'fecha date nn', 'motivo str100', 'diagnostico str200', 'costo int', 'codigo_mascota int nn', 'rut_veterinario str12 nn'], ['codigo_mascota>mascota.codigo', 'rut_veterinario>veterinario.rut']),
    ],
  ),
  sql(
    's7-gimnasio',
    'Gimnasio: socios y planes',
    'gimnasio',
    ['Un socio puede contratar varios planes en distintas fechas; la clave primaria de `suscripcion` incluye la fecha de inicio.'],
    [
      T('socio', ['rut str12 pk', 'nombre str60 nn', 'fecha_inscripcion date nn']),
      T('plan', ['cod_plan int pk', 'nombre str40 nn', 'precio int nn']),
      T('suscripcion', ['rut str12 pk', 'cod_plan int pk', 'fecha_inicio date pk', 'fecha_fin date'], ['rut>socio.rut', 'cod_plan>plan.cod_plan']),
    ],
  ),
  sql(
    's7-hotel',
    'Hotel: clave foránea compuesta',
    'hotel',
    ['La habitación se identifica por el hotel y su número (clave primaria compuesta). La reserva apunta a la habitación con una clave foránea compuesta.'],
    [
      T('hotel', ['cod_hotel int pk', 'nombre str60 nn', 'categoria int']),
      T('habitacion', ['cod_hotel int pk', 'numero int pk', 'tipo str20 nn', 'precio int'], ['cod_hotel>hotel.cod_hotel']),
      T('huesped', ['rut str12 pk', 'nombre str60 nn', 'correo str60 u']),
      T('reserva', ['id_reserva int pk ai', 'rut str12 nn', 'cod_hotel int nn', 'numero int nn', 'fecha_inicio date nn', 'fecha_fin date nn'], ['rut>huesped.rut', 'cod_hotel,numero>habitacion.cod_hotel,numero']),
    ],
  ),
  sql(
    's7-centro-medico',
    'Centro médico (modelo completo)',
    'centro_medico',
    ['Implementa el esquema relacional completo del centro médico: personal con especializaciones (administrativo y médico, y los tipos de médico), centros con consultorios, pacientes, citas y recetas.'],
    [
      T('personal', ['rut_personal str12 pk', 'nombre str30', 'telefono int', 'correo str30', 'fecha_contratacion date', 'calle str50', 'numero int', 'comuna str50', 'ciudad str30']),
      T('administrativo', ['rut_personal str12 pk', 'cargo str30', 'area str40'], ['rut_personal>personal.rut_personal']),
      T('medico', ['rut_personal str12 pk', 'numero_colegiatura int', 'anios_experiencia int'], ['rut_personal>personal.rut_personal']),
      T('medico_tratante', ['rut_personal str12 pk', 'cupo_diario int'], ['rut_personal>medico.rut_personal']),
      T('medico_docente', ['rut_personal str12 pk', 'asignatura_rotacion str30'], ['rut_personal>medico.rut_personal']),
      T('centro_medico', ['codigo_centro int pk', 'nombre str30', 'direccion str30', 'telefono int', 'rut_personal str12'], ['rut_personal>medico.rut_personal']),
      T('consultorio', ['codigo_centro int pk', 'numero_consultorio int pk', 'piso int', 'tipo_equipamiento str30'], ['codigo_centro>centro_medico.codigo_centro']),
      T('especialidad', ['codigo_especialidad int pk', 'nombre str30', 'descripcion str50']),
      T('medico_especialidad', ['rut_personal str12 pk', 'codigo_especialidad int pk', 'fecha_certificacion date'], ['rut_personal>medico.rut_personal', 'codigo_especialidad>especialidad.codigo_especialidad']),
      T('paciente', ['rut_paciente str12 pk', 'nombre str30', 'correo str50', 'fecha_nacimiento date', 'calle str30', 'numero int', 'ciudad str40', 'comuna str30']),
      T('telefono', ['rut_paciente str12 pk', 'telefono int pk'], ['rut_paciente>paciente.rut_paciente']),
      T('cita', ['id_cita int pk', 'fecha_hora datetime', 'estado enum(RESERVADO,ANULADO,CONFIRMADO)', 'rut_paciente str12', 'rut_personal str12'], ['rut_paciente>paciente.rut_paciente', 'rut_personal>medico.rut_personal']),
      T('receta', ['id_receta int pk', 'fecha_emision date', 'observacion str100', 'id_cita int'], ['id_cita>cita.id_cita']),
      T('medicamento', ['codigo_medicamento int pk', 'nombre str30', 'descripcion str40', 'laboratorio str50']),
      T('receta_medicamento', ['id_receta int pk', 'codigo_medicamento int pk', 'dosis int', 'frecuencia int', 'duracion str30'], ['id_receta>receta.id_receta', 'codigo_medicamento>medicamento.codigo_medicamento']),
    ],
  ),
];
