export type FeedbackItem = { ok: boolean; text: string };
export type Feedback = { score: number; summary: string; items: FeedbackItem[] };

// ---------- Modelo E/R (solución de ejercicios y visualización) ----------
export interface Pos {
  x: number;
  y: number;
}
export interface ErAttr {
  name: string;
  aliases?: string[];
  key?: boolean;
  partialKey?: boolean; // clave parcial (entidad débil)
  multi?: boolean;
  derived?: boolean;
  parts?: ErAttr[]; // atributo compuesto
}
export interface ErEntity {
  name: string;
  aliases?: string[];
  weak?: boolean;
  attrs: ErAttr[];
  pos?: Pos;
  arc?: [number, number];
}
export interface ErRel {
  name: string;
  identifying?: boolean;
  // Notación «look across» (erdplus): (min, max) junto a una entidad = cuántas ocurrencias de ESA
  // entidad se asocian con UNA ocurrencia de la otra. `card` es el máximo.
  between: { entity: string; card: '1' | 'N'; min?: 0 | 1 }[];
  attrs?: ErAttr[];
  pos?: Pos;
  arc?: [number, number];
}
export interface ErSpec {
  parent: string;
  children: string[];
  disjoint: boolean;
  total: boolean;
  pos?: Pos;
}
export interface ErModel {
  entities: ErEntity[];
  relationships: ErRel[];
  specializations?: ErSpec[];
  /** Disposición del diagrama de solo lectura: filas de nombres de entidad (null = hueco). */
  layout?: (string | null)[][];
}

// Diagrama dibujado por el estudiante (React Flow)
export interface FlowNode {
  id: string;
  type: string;
  position: Pos;
  data: Record<string, unknown>;
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, unknown>;
}

// ---------- Esquema relacional (semana 4) ----------
export interface SchemaCol {
  name: string;
  aliases?: string[];
  pk?: boolean;
  fk?: string; // nombre canónico de la tabla referenciada
}
export interface SchemaTable {
  name: string;
  aliases?: string[];
  structural?: boolean; // se reconoce por las tablas que referencia, no por nombre
  cols: SchemaCol[];
}
export interface SchemaSol {
  tables: SchemaTable[];
}
export interface StudentSchema {
  tables: {
    id: string;
    name: string;
    cols: { id: string; name: string; pk: boolean; fkTable: string }[];
  }[];
}

// ---------- Normalización (semana 5) ----------
export interface Fd {
  lhs: string[];
  rhs: string[];
}
export interface NormProblem {
  attrs: string[];
  fds: Fd[];
  target: '2NF' | '3NF';
}
export interface StudentNorm {
  tables: { id: string; name: string; attrs: string[]; pk: string[] }[];
}

// ---------- SQL DDL (semana 6) ----------
export interface SqlCol {
  name: string;
  type: 'int' | 'string' | 'decimal' | 'date' | 'enum';
  size?: number; // solo para el enunciado
  values?: string[]; // enum
  notNull?: boolean;
  unique?: boolean;
  autoInc?: boolean;
}
export interface SqlTable {
  name: string;
  cols: SqlCol[];
  pk: string[];
  fks: { cols: string[]; ref: string; refCols: string[] }[];
  /** Si es true, las columnas que no están en la solución se penalizan (útil tras ALTER ... DROP). */
  exact?: boolean;
}
export interface SqlSol {
  db: string;
  tables: SqlTable[];
}

// ---------- Cuestionarios (semana 1) ----------
export interface QuizQ {
  id: string;
  text: string;
  options: string[];
  answer: number;
  explanation: string;
}

// ---------- Consultas, DML y rutinas sobre una base de ejemplo (semanas 7 a 13) ----------
export interface SqlWorkSpec {
  /** query: SELECT · dml: INSERT/UPDATE/DELETE/ALTER · routine: vista, procedimiento o función + llamadas de prueba */
  kind: 'query' | 'dml' | 'routine';
  /** Base de ejemplo (id de plantilla) sobre la que se trabaja. */
  db: string;
  /** Script de referencia (solución). */
  reference: string;
  /** query: exige el mismo orden de filas (cuando el enunciado pide ORDER BY). */
  ordered?: boolean;
  /** routine: sentencias que se ejecutan después del script del estudiante y cuyo resultado se compara. */
  tests?: string[];
  /** dml/routine: tablas cuyo contenido y columnas finales se comparan. */
  tables?: string[];
}
export interface TableInfo {
  name: string;
  columns: { name: string; type: string; pk: boolean; fk?: string }[];
}

// ---------- Ejercicios ----------
interface Base {
  slug: string;
  week: number;
  title: string;
  statement: string[];
}
export type Exercise =
  | (Base & { type: 'QUIZ'; questions: QuizQ[] })
  | (Base & { type: 'ER' | 'EER'; solution: ErModel })
  | (Base & { type: 'TRANSFORMACION'; model: ErModel; options: SchemaSol[] })
  | (Base & { type: 'NORMALIZACION'; problem: NormProblem })
  | (Base & { type: 'SQL_DDL'; solution: SqlSol })
  | (Base & { type: 'SQL_WORK'; work: SqlWorkSpec });

// Solución mostrada al estudiante solo después de pulsar «Ver respuesta» (el ejercicio queda bloqueado y sin puntaje).
export type PublicSolution =
  | { kind: 'quiz'; answers: Record<string, { answer: number; explanation: string }> }
  | { kind: 'model'; model: ErModel }
  | { kind: 'text'; blocks: { label?: string; code: string; sql?: boolean }[] };

// Lo que recibe el navegador: nunca incluye soluciones.
export type PublicExercise = Base & {
  type: Exercise['type'];
  questions?: { id: string; text: string; options: string[] }[];
  model?: ErModel;
  problem?: NormProblem;
  dbName?: string;
  sqlwork?: { kind: SqlWorkSpec['kind']; db: string; dbTitle: string; schema: TableInfo[] };
};
