import Dexie, { type Table } from 'dexie';
import type { TabItem, QueryHistoryItem, ZoomLevels, ThemeMode, FontTheme } from '../types';
import type {
  SavedERDiagramRecord,
  StoredDictionaryMeta,
  StoredExerciseProgress,
} from '../types/erStudio';

export interface StoredColumnInfo {
  name: string;
  type: string;
  isPrimary?: boolean;
}

export interface StoredDatabaseState {
  dbName: string;
  tables: Record<string, { columns: Array<string | StoredColumnInfo>; data: any[] }>;
  updatedAt: string;
}

export interface StoredWorkspace {
  id: string;
  tabs: TabItem[];
  activeTabId: string;
  zoomLevels: ZoomLevels;
  theme: ThemeMode;
  fontTheme?: FontTheme;
  activeDatabase: string;
  sidebarWidth?: number;
}

class SQLEditorDatabase extends Dexie {
  databasesState!: Table<StoredDatabaseState, string>;
  workspace!: Table<StoredWorkspace, string>;
  history!: Table<QueryHistoryItem, string>;
  erDiagrams!: Table<SavedERDiagramRecord, string>;
  dictionaryMeta!: Table<StoredDictionaryMeta, string>;
  exerciseProgress!: Table<StoredExerciseProgress, string>;

  constructor() {
    super('SQLEditorStorage');
    this.version(1).stores({
      databasesState: 'dbName, updatedAt',
      workspace: 'id',
      history: 'id, timestamp, status',
    });
    // Versão 2 (v3.2+): suporte completo à Central de Banco de Dados (Estúdio DER, Dicionário e Prática)
    this.version(2).stores({
      databasesState: 'dbName, updatedAt',
      workspace: 'id',
      history: 'id, timestamp, status',
      erDiagrams: 'id, kind, dbName, updatedAt',
      dictionaryMeta: 'id, dbName, updatedAt',
      exerciseProgress: 'exerciseId, completedAt',
    });
  }
}

export const dbStorage = new SQLEditorDatabase();
