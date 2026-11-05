import type { Exercise } from '../types';
import { norm } from './dsl';

const HOW = 'Crea las tablas, arrastra los atributos desde la relación original y marca la clave primaria de cada tabla haciendo clic en el atributo. Las dependencias funcionales (DF) indicadas te dicen qué atributo determina a cuáles.';

export const W5_NEW: Exercise[] = [
  norm(
    's5-cliente-direcciones',
    'Clientes con varias direcciones de envío',
    [
      'Cliente(num_cliente, nombre, {direccion_envio}, saldo, limite_credito): un cliente puede tener varias direcciones de envío (grupo repetitivo, entre llaves).',
      'Al aplanar la relación, su clave es (num_cliente, direccion_envio). Llévala a segunda forma normal (2FN): separa los datos del cliente de sus direcciones.',
      HOW,
    ],
    ['num_cliente', 'nombre', 'saldo', 'limite_credito', 'direccion_envio'],
    ['num_cliente -> nombre, saldo, limite_credito'],
    '2NF',
  ),
  norm(
    's5-estudiante-clases',
    'Estudiantes y calificaciones',
    [
      'Estudiante(id_estudiante, nombre, promedio, {id_clase, calificacion}): cada estudiante cursa varias clases; el promedio es un dato del estudiante y la calificación es de cada clase que cursa.',
      'La clave de la relación aplanada es (id_estudiante, id_clase). Normalízala hasta 2FN.',
      HOW,
    ],
    ['id_estudiante', 'nombre', 'promedio', 'id_clase', 'calificacion'],
    ['id_estudiante -> nombre, promedio', 'id_estudiante, id_clase -> calificacion'],
    '2NF',
  ),
  norm(
    's5-prestamo-socio',
    'Préstamos de una biblioteca',
    [
      'PRESTAMO(num_socio, nombre_socio, cod_libro, fec_prest, editorial, pais): registra qué socio pidió qué libro y cuándo. La clave es (num_socio, cod_libro).',
      'El país corresponde a la editorial. Normaliza hasta 2FN (las dependencias parciales deben separarse).',
      HOW,
    ],
    ['num_socio', 'nombre_socio', 'cod_libro', 'fec_prest', 'editorial', 'pais'],
    ['num_socio -> nombre_socio', 'cod_libro -> editorial, pais', 'num_socio, cod_libro -> fec_prest'],
    '2NF',
  ),
  norm(
    's5-empleado-puesto',
    'Empleados y puestos de trabajo',
    [
      'Empleado(num, nombre, puesto_trabajo, sueldo): el sueldo depende del puesto de trabajo, no del empleado.',
      'La clave es num. Ya está en 2FN; llévala a tercera forma normal (3FN) eliminando la dependencia transitiva.',
      HOW,
    ],
    ['num', 'nombre', 'puesto_trabajo', 'sueldo'],
    ['num -> nombre, puesto_trabajo', 'puesto_trabajo -> sueldo'],
    '3NF',
  ),
  norm(
    's5-estudiante-actividad',
    'Actividades deportivas de los estudiantes',
    [
      'Estudiante(id_estudiante, nombre_estudiante, {id_actividad, actividad, tarifa_actividad, monto_pago}): cada estudiante se inscribe en varias actividades; la tarifa depende de la actividad y el monto pagado depende del estudiante y de la actividad.',
      'La clave aplanada es (id_estudiante, id_actividad). Normaliza hasta 3FN.',
      HOW,
    ],
    ['id_estudiante', 'nombre_estudiante', 'id_actividad', 'actividad', 'tarifa_actividad', 'monto_pago'],
    ['id_estudiante -> nombre_estudiante', 'id_actividad -> actividad, tarifa_actividad', 'id_estudiante, id_actividad -> monto_pago'],
    '3NF',
  ),
  norm(
    's5-orden-items',
    'Órdenes de compra con ítems',
    [
      'Orden(id_orden, fecha, id_cliente, nom_cliente, estado, {num_item, desc_item, cant, precio}): una orden tiene varios ítems (grupo repetitivo). El nombre y estado dependen del cliente; la descripción y el precio dependen del ítem; la cantidad depende de la orden y el ítem.',
      'La clave aplanada es (id_orden, num_item). Normaliza hasta 3FN.',
      HOW,
    ],
    ['id_orden', 'fecha', 'id_cliente', 'nom_cliente', 'estado', 'num_item', 'desc_item', 'cant', 'precio'],
    ['id_orden -> fecha, id_cliente', 'id_cliente -> nom_cliente, estado', 'num_item -> desc_item, precio', 'id_orden, num_item -> cant'],
    '3NF',
  ),
  norm(
    's5-empresa-regiones',
    'Empresas, regiones y comunas',
    [
      'EMPRESA(rut, razon_social, {direccion}, cod_region, region, cod_comuna, comuna): una empresa puede tener varias direcciones. La comuna pertenece a una región, y cada empresa está registrada en una comuna.',
      'La clave aplanada es (rut, direccion). Normaliza hasta 3FN.',
      HOW,
    ],
    ['rut', 'razon_social', 'direccion', 'cod_region', 'region', 'cod_comuna', 'comuna'],
    ['rut -> razon_social, cod_comuna', 'cod_comuna -> comuna, cod_region', 'cod_region -> region'],
    '3NF',
  ),
  norm(
    's5-orden-detalle',
    'Órdenes y detalle de productos',
    [
      'Orden(id_orden, fecha_orden, id_cliente, {id_producto, producto, cantidad, precio, total}): una orden la hace un cliente e incluye varios productos; el nombre y precio dependen del producto; la cantidad y el total dependen de la orden y el producto.',
      'La clave aplanada es (id_orden, id_producto). Normaliza hasta 3FN.',
      HOW,
    ],
    ['id_orden', 'fecha_orden', 'id_cliente', 'id_producto', 'producto', 'cantidad', 'precio', 'total'],
    ['id_orden -> fecha_orden, id_cliente', 'id_producto -> producto, precio', 'id_orden, id_producto -> cantidad, total'],
    '3NF',
  ),
  norm(
    's5-factura',
    'Factura de venta',
    [
      'Factura(num_factura, fecha_factura, nombre_cliente, dir_cliente, rut, ciudad, telefono, {codigo_producto, categoria, descripcion, precio, cantidad}).',
      'Los datos del cliente dependen de su rut; los del producto, del código de producto; la cantidad depende de la factura y el producto. La clave aplanada es (num_factura, codigo_producto). Normaliza hasta 3FN.',
      HOW,
    ],
    ['num_factura', 'fecha_factura', 'nombre_cliente', 'dir_cliente', 'rut', 'ciudad', 'telefono', 'codigo_producto', 'categoria', 'descripcion', 'precio', 'cantidad'],
    [
      'num_factura -> fecha_factura, rut',
      'rut -> nombre_cliente, dir_cliente, ciudad, telefono',
      'codigo_producto -> categoria, descripcion, precio',
      'num_factura, codigo_producto -> cantidad',
    ],
    '3NF',
  ),
  norm(
    's5-paciente-atencion',
    'Atenciones médicas',
    [
      'Paciente(paciente_id, nombre_paciente, edad, sexo, {medico_id, nombre_medico, especialidad, fecha_admision, diagnostico, tratamiento, costo_usd}): un paciente es atendido por varios médicos en distintas fechas.',
      'El nombre y especialidad dependen del médico; el diagnóstico, tratamiento y costo dependen del paciente, el médico y la fecha de admisión. La clave aplanada es (paciente_id, medico_id, fecha_admision). Normaliza hasta 3FN.',
      HOW,
    ],
    ['paciente_id', 'nombre_paciente', 'edad', 'sexo', 'medico_id', 'nombre_medico', 'especialidad', 'fecha_admision', 'diagnostico', 'tratamiento', 'costo_usd'],
    [
      'paciente_id -> nombre_paciente, edad, sexo',
      'medico_id -> nombre_medico, especialidad',
      'paciente_id, medico_id, fecha_admision -> diagnostico, tratamiento, costo_usd',
    ],
    '3NF',
  ),
  norm(
    's5-playlist',
    'Listas de reproducción',
    [
      'Playlist(id_playlist, nombre_playlist, email_usuario, alias_usuario, fecha_creacion_playlist, {id_cancion, titulo_cancion, duracion_cancion, id_artista, nombre_artista, fecha_anadida}).',
      'El alias depende del email del usuario; el título, duración y artista dependen de la canción; el nombre del artista depende del artista; la fecha en que se añadió depende de la playlist y la canción. La clave aplanada es (id_playlist, id_cancion). Normaliza hasta 3FN.',
      HOW,
    ],
    ['id_playlist', 'nombre_playlist', 'email_usuario', 'alias_usuario', 'fecha_creacion_playlist', 'id_cancion', 'titulo_cancion', 'duracion_cancion', 'id_artista', 'nombre_artista', 'fecha_anadida'],
    [
      'id_playlist -> nombre_playlist, email_usuario, fecha_creacion_playlist',
      'email_usuario -> alias_usuario',
      'id_cancion -> titulo_cancion, duracion_cancion, id_artista',
      'id_artista -> nombre_artista',
      'id_playlist, id_cancion -> fecha_anadida',
    ],
    '3NF',
  ),
  norm(
    's5-peliculas-locales',
    'Películas, formatos y locales',
    [
      'Una cadena de arriendo de películas registra, para cada película, los formatos de proyección disponibles, el local que los ofrece y el precio de renta. Atributos: pelicula_id, titulo, director, productora, anio_lanzamiento, genero, formato_proyeccion, local_id, local, precio_renta.',
      'Los datos de la película dependen de pelicula_id; el local y el precio dependen de la película y del formato; el nombre del local depende de local_id. La clave es (pelicula_id, formato_proyeccion). Normaliza hasta 3FN.',
      HOW,
    ],
    ['pelicula_id', 'titulo', 'director', 'productora', 'anio_lanzamiento', 'genero', 'formato_proyeccion', 'local_id', 'local', 'precio_renta'],
    [
      'pelicula_id -> titulo, director, productora, anio_lanzamiento, genero',
      'pelicula_id, formato_proyeccion -> local_id, precio_renta',
      'local_id -> local',
    ],
    '3NF',
  ),
  norm(
    's5-factura-electronica',
    'Factura electrónica con detalle',
    [
      'Factura(nro_factura, cliente, rut, direccion, comuna, fecha, subtotal, total, {producto, unidad, precio, cantidad}).',
      'El rut determina al cliente (nombre, dirección y comuna); la factura determina su rut, fecha y totales; el producto determina su unidad y precio; la cantidad depende de la factura y el producto. La clave aplanada es (nro_factura, producto). Normaliza hasta 3FN.',
      HOW,
    ],
    ['nro_factura', 'cliente', 'rut', 'direccion', 'comuna', 'fecha', 'subtotal', 'total', 'producto', 'unidad', 'precio', 'cantidad'],
    [
      'nro_factura -> rut, fecha, subtotal, total',
      'rut -> cliente, direccion, comuna',
      'producto -> unidad, precio',
      'nro_factura, producto -> cantidad',
    ],
    '3NF',
  ),
];
