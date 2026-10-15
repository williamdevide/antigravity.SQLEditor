import Dexie, { type Table } from 'dexie';
import type { TabItem, QueryHistoryItem, ZoomLevels, ThemeMode, FontTheme } from '../types';

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

  constructor() {
    super('SQLEditorStorage');
    this.version(1).stores({
      databasesState: 'dbName, updatedAt',
      workspace: 'id',
      history: 'id, timestamp, status'
    });
  }
}

export const dbStorage = new SQLEditorDatabase();
