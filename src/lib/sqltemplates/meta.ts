/**
 * Bases de datos de ejemplo (scripts `.sql` en esta carpeta, generados con `scripts/templates/build_templates.py`).
 * El `id` es también el nombre lógico de la base de datos: los ejercicios y el Laboratorio usan `USE <id>;`.
 */
export interface TemplateMeta {
  id: string;
  title: string;
  description: string;
  origin: 'clase' | 'evaluacion';
}

export const TEMPLATES: TemplateMeta[] = [
  { id: 'centro_medico', title: 'Centro médico', description: 'Base de las clases: personal, médicos, pacientes, citas, recetas y medicamentos (15 tablas con ~700 registros).', origin: 'clase' },
  { id: 'unab', title: 'UNAB · Empresa', description: 'Empresa, departamentos, sedes, empleados, teléfonos y correos.', origin: 'clase' },
  { id: 'automotora', title: 'Automotora', description: 'Clientes, teléfonos y vehículos.', origin: 'clase' },
  { id: 'rosselot', title: 'Rosselot', description: 'Clientes y vehículos (motor y chasis).', origin: 'clase' },
  { id: 'ejemplo_unab', title: 'Alumnos, asignaturas y secciones', description: 'Alumnos, asignaturas, profesores y notas por sección.', origin: 'clase' },
  { id: 'educacion_superior', title: 'Educación superior (Control 2)', description: 'Instituciones, sedes, carreras, estudiantes y matrículas por año; base de las preguntas de consultas complejas.', origin: 'evaluacion' },
  { id: 'comercio', title: 'Comercio: clientes y facturas (Control 2)', description: 'Clientes, productos, categorías, tiendas, modos de pago, facturas y detalle.', origin: 'evaluacion' },
  { id: 'academico', title: 'Alumnos, cursos y carreras (Control 2)', description: 'Alumnos, cursos, académicos, carreras y notas finales.', origin: 'evaluacion' },
  { id: 'universidad', title: 'Universidad (Solemne 2)', description: 'Facultades, carreras, decanos, materias, profesores y estudiantes con sus tablas intermedias.', origin: 'evaluacion' },
  { id: 'biblioteca', title: 'Biblioteca (Solemne 2)', description: 'Personas, libros, editoriales, géneros, préstamos, usuarios y permisos.', origin: 'evaluacion' },
  { id: 'inventario', title: 'Inventario (Solemne 2)', description: 'Proveedores, artículos, categorías, ubicaciones, elementos y prestatarios.', origin: 'evaluacion' },
];

export const templateIds = new Set(TEMPLATES.map((t) => t.id));
