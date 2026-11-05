import type { ErModel, Exercise } from '../types';
import { E, M, R } from './dsl';
import { ALUMNOS_VIEW, EMPLEADOS_VIEW } from './modeling';
import { autoSchemas } from './transform';
import { W2_FARMACIAS, W2_VETERINARIA } from './w2';
import { W3_CENTRO_INV, W3_CENTRO_MEDICO, W3_DENTAL, W3_RRHH, W3_SOFTWARE, W3_ZOOLOGICO } from './w3';

/* ---- Modelos propios de la semana 4 ---- */

const GOLAZO = M(
  [
    E('Planta', ['*color', 'superficie']),
    E('Proceso', ['*nombre', 'grado_complejidad|complejidad']),
    E('Maquina|Máquina', ['*numero|número', 'marca', 'modelo']),
    E('Tecnico|Técnico', ['*dni', 'nombre', 'apellido', 'fecha_nacimiento', '+telefonos|telefono']),
  ],
  [
    R('se_realiza', ['Planta:N', 'Proceso:N']),
    R('posee', ['Planta:1', 'Maquina:N']),
    R('opera', ['Tecnico:N', 'Maquina:N'], ['fecha_inicio', 'fecha_fin', 'turno']),
    R('reemplaza', ['Maquina:1', 'Maquina:N']),
  ],
  [],
  [
    ['Proceso', 'Planta', 'Maquina'],
    [null, 'Tecnico', null],
  ],
);

const CENTRO_CULTURAL = M(
  [
    E('Epoca|Época', ['*nombre', 'caracteristicas', 'periodo(anio_inicio,anio_final)']),
    E('Genero|Género', ['*nombre', 'caracteristicas', 'origenes']),
    E('Musico|Músico', ['*nombre', 'fecha_nacimiento', 'fecha_muerte', 'historia']),
    E('Instrumento', ['*nombre', 'foto', 'lugar_creacion', 'creador', 'tipo', '+materiales']),
    E('Obra|Obra famosa', ['*nombre', 'anio|año', 'partitura']),
  ],
  [
    R('tiene', ['Epoca:1', 'Genero:N']),
    R('asocia', ['Genero:1', 'Musico:N']),
    R('usa', ['Genero:N', 'Instrumento:N']),
    R('pertenece', ['Genero:1', 'Obra:N']),
    R('compone', ['Musico:N', 'Obra:N']),
  ],
  [],
  [
    ['Epoca', 'Genero', 'Instrumento'],
    [null, 'Musico', 'Obra'],
  ],
);

const AGENCIA_UNQ = M(
  [
    E('Agencia', ['*codigo', 'fecha_inicio_actividades|fecha_inicio', 'ciudad']),
    E('Paquete|Paquete turístico', ['*cod_paquete|codigo', 'precio', '+paises|pais']),
    E('Cliente', ['*dni', 'nombre', 'domicilio']),
    E('Forma_Pago|Forma de pago|FormaPago', ['*cod_forma_pago|codigo', 'tipo', 'monto']),
    E('Banco', ['*nombre', 'sucursal']),
  ],
  [
    R('ofrece', ['Agencia:1', 'Paquete:N']),
    R('compra', ['Cliente:N', 'Paquete:N']),
    R('paga_con', ['Cliente:1', 'Forma_Pago:N']),
    R('autoriza', ['Banco:1', 'Forma_Pago:N'], ['fecha_validez']),
    R('combo', ['Paquete:N', 'Paquete:N']),
  ],
  [],
  [
    ['Agencia', 'Paquete', 'Cliente'],
    [null, null, 'Forma_Pago'],
    [null, null, 'Banco'],
  ],
);

const PCFACTORY = M(
  [
    E('Categoria', ['*id_categoria|id', 'nombre', 'descripcion']),
    E('Producto', ['*id_producto|id', 'nombre', 'precio', 'stock']),
    E('Proveedor', ['*id_proveedor|id', 'nombre', 'telefono', 'sitio_web', 'direccion(ciudad,comuna,calle,numero)']),
    E('Cliente', ['*id_cliente|id', 'nombre', '+telefonos|telefono', 'direccion(ciudad,comuna,calle,numero)']),
    E('Venta', ['*numero_factura|factura', 'fecha', 'monto_final', 'descuento']),
  ],
  [
    R('clasifica', ['Categoria:1', 'Producto:N']),
    R('suministra', ['Proveedor:N', 'Producto:N']),
    R('realiza', ['Cliente:1', 'Venta:N']),
    R('incluye', ['Venta:N', 'Producto:N'], ['cantidad', 'monto_total']),
  ],
  [],
  [
    ['Proveedor', 'Producto', 'Categoria'],
    [null, 'Venta', 'Cliente'],
  ],
);

const BIBLIO_UNAB = M(
  [
    E('Autor', ['*nombre', 'nacionalidad', 'fecha_nacimiento', '+emails|email']),
    E('Libro', ['*titulo', 'idioma', 'numero_paginas']),
    E('Edicion|Edición', ['*isbn', 'anio|año']),
    E('!Copia', ['^numero_copia|numero']),
    E('Usuario', ['*rut', 'nombre', 'apellido', 'domicilio']),
  ],
  [
    R('escribe', ['Autor:N', 'Libro:N']),
    R('tiene', ['Libro:1', 'Edicion:N']),
    R('!posee', ['Edicion:1', 'Copia:N']),
    R('prestamo', ['Usuario:N', 'Copia:N'], ['fecha_prestamo', 'fecha_devolucion', 'precio_alquiler']),
    R('hace_referencia', ['Libro:1', 'Libro:1']),
  ],
  [],
  [
    ['Autor', 'Libro', 'Edicion'],
    [null, null, 'Copia'],
    [null, 'Usuario', null],
  ],
);

/* ---- Enunciado y ejercicios ---- */

function features(m: ErModel): string[] {
  const out: string[] = [];
  if (m.entities.some((e) => e.weak)) out.push('entidades débiles (su clave primaria incluye la de la entidad fuerte)');
  if (m.entities.some((e) => e.attrs.some((a) => a.multi))) out.push('atributos multivaluados (tabla aparte)');
  if (m.entities.some((e) => e.attrs.some((a) => a.parts?.length))) out.push('atributos compuestos (una columna por cada parte)');
  if (m.entities.some((e) => e.attrs.some((a) => a.derived))) out.push('atributos derivados (no se almacenan)');
  if (m.relationships.some((r) => r.between.length === 2 && r.between.every((b) => b.card === 'N'))) out.push('relaciones N:M (tabla intermedia)');
  if (m.relationships.some((r) => r.between.length === 2 && r.between.every((b) => b.card === '1') && !r.identifying)) out.push('relaciones 1:1 (la clave foránea puede ir en cualquiera de las dos tablas)');
  if (m.relationships.some((r) => new Set(r.between.map((b) => b.entity)).size === 1)) out.push('relaciones reflexivas (clave foránea hacia la misma tabla)');
  if (m.specializations?.length) out.push('especialización: aplica una de las estrategias vistas en clase (tabla por clase, o tabla única con tipo o con indicadores)');
  return out;
}

const tr = (slug: string, title: string, model: ErModel, intro?: string): Exercise => ({
  slug,
  week: 4,
  type: 'TRANSFORMACION',
  title,
  statement: [
    intro ?? 'Aplica las reglas de transformación al modelo E/R mostrado y escribe el esquema relacional.',
    'Para cada tabla define sus columnas, marca la clave primaria (PK) y, cuando corresponda, la clave foránea (FK) indicando a qué tabla referencia. Puedes zoom y mover el diagrama para verlo completo.',
    ...(features(model).length ? [`En este modelo debes resolver: ${features(model).join('; ')}.`] : []),
  ],
  model,
  options: autoSchemas(model),
});

export const W4_MODELS = { GOLAZO, CENTRO_CULTURAL, AGENCIA_UNQ, PCFACTORY, BIBLIO_UNAB };

export const W4_NEW: Exercise[] = [
  tr('s4-pcfactory', 'PCFactory: ventas', PCFACTORY),
  tr('s4-veterinaria', 'Clínica veterinaria', W2_VETERINARIA),
  tr('s4-software', 'Empresa de software', W3_SOFTWARE),
  tr('s4-golazo', 'Fábrica de pelotas «Golazo»', GOLAZO),
  tr('s4-centro-cultural', 'Centro cultural', CENTRO_CULTURAL),
  tr('s4-zoologico', 'Zoológico', W3_ZOOLOGICO),
  tr('s4-farmacias', 'Sistema de farmacias', W2_FARMACIAS),
  tr('s4-dental', 'Clínica dental', W3_DENTAL),
  tr('s4-rrhh', 'Recursos humanos', W3_RRHH),
  tr('s4-agencia-unq', 'Agencia de viajes con paquetes combo', AGENCIA_UNQ),
  tr('s4-biblioteca-unab', 'Biblioteca UNAB', BIBLIO_UNAB),
  tr('s4-centro-investigacion', 'Centro de investigación', W3_CENTRO_INV),
  tr('s4-centro-medico', 'Centro médico universitario', W3_CENTRO_MEDICO),
];

export { ALUMNOS_VIEW, EMPLEADOS_VIEW };
