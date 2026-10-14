export interface ColumnSchema {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: { table: string; column: string };
  isNullable?: boolean;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: ColumnSchema[];
  isView?: boolean;
}

export interface DatabaseSchema {
  name: string;
  tables: TableSchema[];
  isActive?: boolean;
}

export interface TabItem {
  id: string;
  title: string;
  content: string;
  isDirty?: boolean;
}

export interface QueryResult {
  statement: string;
  columns: string[];
  rows: Record<string, any>[];
  affectedRows?: number;
  executionTimeMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  timestamp: string;
  database: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  status: 'success' | 'error';
  executionTimeMs: number;
  database: string;
  affectedRows?: number;
  errorMessage?: string;
}

export interface ZoomLevels {
  sidebar: number;
  editor: number;
  console: number;
}

export type ThemeMode = 'dark' | 'light';
export type ActiveView = 'workspace' | 'history' | 'er-diagram' | 'settings' | 'about';

export type DatabasePreset = 'empty' | 'samples' | 'class';

export interface ContextMenuTarget {
  type: 'database' | 'table' | 'schema_explorer';
  dbName?: string;
  tableName?: string;
  columns?: ColumnSchema[];
  x: number;
  y: number;
}

export interface SqlReview {
  originalQuery: string;
  errorsDetected: string[];
  suggestedQuery: string;
  recommendations: string[];
  timestamp: string;
}

export type ConsoleTab = 'data' | 'grid' | 'log' | 'review';

export interface TablePreviewData {
  dbName: string;
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  isLoading?: boolean;
}


