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

export type ThemeMode = 'dark' | 'light' | 'beige' | 'graphite';
export type FontTheme = 'solar' | 'cyber' | 'matrix' | 'synthwave';

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  bgPreview: string;
  surfacePreview: string;
}

export interface FontThemeOption {
  id: FontTheme;
  name: string;
  description: string;
  accentPreview: string;
  secondaryPreview: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Escuro Noturno (Dark Obsidian)',
    description: 'Contraste profundo com preto e cinza escuro para programação noturna.',
    bgPreview: '#0F1117',
    surfacePreview: '#1E222D',
  },
  {
    id: 'light',
    name: 'Claro Alvorada (Light Daylight)',
    description: 'Interface clara e vibrante com alto contraste para ambientes iluminados.',
    bgPreview: '#F4F6F9',
    surfacePreview: '#FFFFFF',
  },
  {
    id: 'beige',
    name: 'Bege Conforto (Warm Sepia)',
    description: 'Tons de sépia e creme suave que reduzem a fadiga ocular em leituras longas.',
    bgPreview: '#F5EFEB',
    surfacePreview: '#FAF6F1',
  },
  {
    id: 'graphite',
    name: 'Grafite Titânio (Slate Charcoal)',
    description: 'Escuro equilibrado e elegante em tons de ardósia, mais suave que o preto total.',
    bgPreview: '#1E232B',
    surfacePreview: '#2F3642',
  },
];

export const FONT_THEME_OPTIONS: FontThemeOption[] = [
  {
    id: 'solar',
    name: 'Âmbar Solar (Padrão Antigravity)',
    description: 'Destaques quentes em amarelo e laranja elétrico característicos da IDE.',
    accentPreview: '#FFE600',
    secondaryPreview: '#FF6B00',
  },
  {
    id: 'cyber',
    name: 'Ciano Cibernético (Cyber Neon)',
    description: 'Visual futurista neon com tons de azul ciano e azul elétrico cintilante.',
    accentPreview: '#00E5FF',
    secondaryPreview: '#00B0FF',
  },
  {
    id: 'matrix',
    name: 'Esmeralda Matrix (Terminal Hacker)',
    description: 'Estilo clássico de terminal hacker com verdes esmeralda fosforescentes.',
    accentPreview: '#00FF66',
    secondaryPreview: '#00E676',
  },
  {
    id: 'synthwave',
    name: 'Púrpura Synthwave (Orquídea & Violeta)',
    description: 'Estética retro-synthwave com degradê de magenta e violeta suave.',
    accentPreview: '#E040FB',
    secondaryPreview: '#FF4081',
  },
];

export type ActiveView = 'landing' | 'workspace' | 'history' | 'er-diagram' | 'er-model' | 'settings' | 'about';

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


