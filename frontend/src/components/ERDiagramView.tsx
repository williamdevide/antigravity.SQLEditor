import React from 'react';
import type { SurgicalSqlPatch } from '../services/visualDdlGenerator';
import type { DatabaseSchema, ThemeMode } from '../types';
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  type ERStudioPreferences,
} from '../types/preferences';
import { ERStudioWorkspace } from './er/ERStudioWorkspace';

export interface ERDiagramViewProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  liveScriptSql?: string;
  activeTabName?: string;
  theme?: ThemeMode;
  preferences?: AppPreferences;
  onUpdateErPreferences?: (patch: Partial<ERStudioPreferences>) => void;
  onSelectDatabase?: (dbName: string) => void;
  onSelectTableForQuery: (dbName: string, tableName: string) => void;
  onApplySurgicalSqlPatch?: (
    patch: SurgicalSqlPatch,
    executeInAlaSql?: boolean
  ) => Promise<void> | void;
  onOpenDdlInEditor?: (title: string, sql: string) => void;
  onRefreshSchemas?: () => Promise<void> | void;
}

export const ERDiagramView: React.FC<ERDiagramViewProps> = ({
  schemas,
  activeDatabase,
  liveScriptSql = '',
  activeTabName = 'consulta.sql',
  theme = 'dark',
  preferences = DEFAULT_APP_PREFERENCES,
  onUpdateErPreferences,
  onSelectDatabase,
  onSelectTableForQuery,
  onApplySurgicalSqlPatch,
  onOpenDdlInEditor,
  onRefreshSchemas,
}) => {
  return (
    <ERStudioWorkspace
      mode="full-studio"
      schemas={schemas}
      activeDatabase={activeDatabase}
      liveScriptSql={liveScriptSql}
      activeTabName={activeTabName}
      theme={theme}
      preferences={preferences}
      onUpdateErPreferences={onUpdateErPreferences}
      onSelectDatabase={onSelectDatabase}
      onSelectTableForQuery={onSelectTableForQuery}
      onApplySurgicalSqlPatch={onApplySurgicalSqlPatch}
      onOpenDdlInEditor={onOpenDdlInEditor}
      onRefreshSchemas={onRefreshSchemas}
    />
  );
};
