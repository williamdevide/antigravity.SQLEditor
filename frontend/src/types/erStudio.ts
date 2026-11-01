// ============================================================================
// MODELOS TIPADOS DO ESTÚDIO DER, DICIONÁRIO DE DADOS, LINTER E PRÁTICA GUIADA
// ============================================================================

export type ERColumnCategory =
  | 'key'
  | 'numeric'
  | 'text'
  | 'datetime'
  | 'boolean'
  | 'json'
  | 'other';

export interface ERTriggerNode {
  name: string;
  /** BEFORE, AFTER ou INSTEAD OF */
  timing: string;
  /** INSERT, UPDATE, DELETE, TRUNCATE */
  events: string[];
  /** Tabelas alteradas no corpo da trigger */
  writesTo: string[];
}

export interface ERColumnNode {
  id: string;
  name: string;
  type: string;
  category: ERColumnCategory;
  isPrimary: boolean;
  isForeignKey: boolean;
  /** true se declarada via FOREIGN KEY / REFERENCES; false se inferida por convenção de nome */
  isExplicitForeignKey: boolean;
  fkTarget?: {
    table: string;
    column: string;
  };
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  sampleValues?: (string | number | boolean | null)[];
  comment?: string;
}

export interface ERTableNode {
  id: string;
  name: string;
  columns: ERColumnNode[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  triggers: ERTriggerNode[];
  isView?: boolean;
  comment?: string;
}

export interface ERRelationshipEdge {
  id: string;
  /** Tabela de origem (lado da Chave Estrangeira / N) */
  sourceTable: string;
  /** Coluna FK principal */
  sourceColumn: string;
  /** Colunas FK quando chave estrangeira composta (garfo fork-trunk-fork) */
  sourceColumns?: string[];
  /** Tabela de destino (lado da Chave Primária / 1) */
  targetTable: string;
  /** Coluna PK principal */
  targetColumn: string;
  /** Colunas PK quando chave composta */
  targetColumns?: string[];
  cardinality: '1:1' | '1:N' | 'N:N';
  /** true = constraint explícita no DDL; false = inferida heuristicamente pelo nome */
  isExplicit: boolean;
  /** true quando sourceTable === targetTable (auto-relacionamento recursivo) */
  isSelfJoin: boolean;
}

export interface ERTablePosition {
  x: number;
  y: number;
}

export interface ERTableVisualMeta {
  /** Cor da faixa superior do card (paleta oficial SQLEditor) */
  colorStrip?: string;
  /** Posição travada contra arraste acidental */
  locked?: boolean;
  /** Colapso inteligente (oculta atributos comuns mantendo PK/FK ancoradas) */
  collapsed?: boolean;
  /** Modo de visualização do card: estrutura de colunas ou amostra viva de dados */
  viewMode?: 'structure' | 'data';
}

export interface ERSubjectArea {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
}

export interface ERStickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SavedERDiagramRecord {
  /** Ex: 'layout:ecommerce_db' ou 'custom:meu_modelo_1' */
  id: string;
  kind: 'db-layout' | 'custom-model';
  title: string;
  description?: string;
  dbName: string;
  ddlSql?: string;
  positions: Record<string, ERTablePosition>;
  lineOffsets: Record<string, { x: number; y: number }>;
  tableMeta: Record<string, ERTableVisualMeta>;
  subjectAreas: ERSubjectArea[];
  stickyNotes: ERStickyNote[];
  updatedAt: string;
}

export interface NormalizationChecklistState {
  fn1: boolean;
  fn2: boolean;
  fn3: boolean;
  notes?: string;
}

export interface StoredDictionaryMeta {
  id: string;
  dbName: string;
  tableComments: Record<string, string>;
  /** Chave no formato `${tableName}.${columnName}` */
  columnComments: Record<string, string>;
  normalizationChecks: Record<string, NormalizationChecklistState>;
  updatedAt: string;
}

export interface StoredExerciseProgress {
  exerciseId: string;
  completedAt: string;
  submittedSql: string;
  attempts: number;
}

export type SchemaLintSeverity = 'error' | 'warning' | 'info';

export interface SchemaLintIssue {
  id: string;
  severity: SchemaLintSeverity;
  code:
    | 'MISSING_PK'
    | 'ORPHAN_FK'
    | 'FK_TYPE_MISMATCH'
    | 'CIRCULAR_FK'
    | 'IMPLICIT_FK_ONLY'
    | 'NORMALIZATION_1NF'
    | 'NORMALIZATION_2NF'
    | 'NORMALIZATION_3NF'
    | 'EMPTY_TABLE';
  tableName?: string;
  columnName?: string;
  title: string;
  message: string;
  pedagogicalTip: string;
  suggestedFixSql?: string;
}

export type ERSourceMode = 'active-db' | 'live-script';

/** Paleta oficial permitida para faixas de tabelas, áreas temáticas e notas (Zero Roxo/Índigo!) */
export const SQLEDITOR_CARD_PALETTE = [
  { id: 'orange', label: 'Laranja Assinatura', hex: '#FF6B00' },
  { id: 'yellow', label: 'Âmbar Solar', hex: '#FFE600' },
  { id: 'green', label: 'Verde Sucesso', hex: '#00E676' },
  { id: 'cyan', label: 'Ciano Técnico', hex: '#29B6F6' },
  { id: 'crimson', label: 'Carmesim Alerta', hex: '#FF3366' },
  { id: 'amber', label: 'Ouro Acadêmico', hex: '#FFA726' },
] as const;

