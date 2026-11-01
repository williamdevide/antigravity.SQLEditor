import { APP_VERSION } from '../config/version';
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from '../types/preferences';
import type { FontTheme, ThemeMode } from '../types';
import type {
  SavedERDiagramRecord,
  StoredDictionaryMeta,
  StoredExerciseProgress,
} from '../types/erStudio';
import { dbStorage, type StoredDatabaseState, type StoredWorkspace } from './storage';
import { dbEngine } from './dbEngine';

const PREFERENCES_STORAGE_KEY = 'sqleditor_app_preferences_v32';

/**
 * Mescla de forma segura um objeto parcial salvo com os padrões oficiais de AppPreferences.
 */
export function normalizeAppPreferences(raw: unknown): AppPreferences {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppPreferences>;
  const ui = (obj.ui && typeof obj.ui === 'object' ? obj.ui : {}) as Partial<AppPreferences['ui']>;
  const editor = (obj.editor && typeof obj.editor === 'object' ? obj.editor : {}) as Partial<AppPreferences['editor']>;
  const er = (obj.er && typeof obj.er === 'object' ? obj.er : {}) as Partial<AppPreferences['er']>;
  const pedagogy = (obj.pedagogy && typeof obj.pedagogy === 'object' ? obj.pedagogy : {}) as Partial<AppPreferences['pedagogy']>;

  const clamp = (val: unknown, min: number, max: number, fallback: number): number => {
    if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
    return Math.max(min, Math.min(max, Math.round(val)));
  };

  return {
    ui: {
      editorFontSize: clamp(ui.editorFontSize, 12, 22, DEFAULT_APP_PREFERENCES.ui.editorFontSize),
      defaultErZoom: clamp(ui.defaultErZoom, 60, 150, DEFAULT_APP_PREFERENCES.ui.defaultErZoom),
      showQuickModulePills:
        typeof ui.showQuickModulePills === 'boolean'
          ? ui.showQuickModulePills
          : DEFAULT_APP_PREFERENCES.ui.showQuickModulePills,
      reducedMotionAndGlow:
        typeof ui.reducedMotionAndGlow === 'boolean'
          ? ui.reducedMotionAndGlow
          : DEFAULT_APP_PREFERENCES.ui.reducedMotionAndGlow,
    },
    editor: {
      autoUppercaseKeywords:
        typeof editor.autoUppercaseKeywords === 'boolean'
          ? editor.autoUppercaseKeywords
          : DEFAULT_APP_PREFERENCES.editor.autoUppercaseKeywords,
      autoInsertSemicolon:
        typeof editor.autoInsertSemicolon === 'boolean'
          ? editor.autoInsertSemicolon
          : DEFAULT_APP_PREFERENCES.editor.autoInsertSemicolon,
      syncDatabaseWithCursorUse:
        typeof editor.syncDatabaseWithCursorUse === 'boolean'
          ? editor.syncDatabaseWithCursorUse
          : DEFAULT_APP_PREFERENCES.editor.syncDatabaseWithCursorUse,
      defaultDataPreviewLimit:
        editor.defaultDataPreviewLimit === 30 ||
        editor.defaultDataPreviewLimit === 100 ||
        editor.defaultDataPreviewLimit === null
          ? editor.defaultDataPreviewLimit
          : DEFAULT_APP_PREFERENCES.editor.defaultDataPreviewLimit,
      defaultSplitRatio:
        editor.defaultSplitRatio === 50 || editor.defaultSplitRatio === 60
          ? editor.defaultSplitRatio
          : DEFAULT_APP_PREFERENCES.editor.defaultSplitRatio,
      confirmBeforeClear:
        typeof editor.confirmBeforeClear === 'boolean'
          ? editor.confirmBeforeClear
          : DEFAULT_APP_PREFERENCES.editor.confirmBeforeClear,
      confirmBeforeCloseAllTabs:
        typeof editor.confirmBeforeCloseAllTabs === 'boolean'
          ? editor.confirmBeforeCloseAllTabs
          : DEFAULT_APP_PREFERENCES.editor.confirmBeforeCloseAllTabs,
    },
    er: {
      lineStyle:
        er.lineStyle === 'orthogonal' || er.lineStyle === 'bezier'
          ? er.lineStyle
          : DEFAULT_APP_PREFERENCES.er.lineStyle,
      cardinalityNotation:
        er.cardinalityNotation === 'crowsfoot' ||
        er.cardinalityNotation === '1:N' ||
        er.cardinalityNotation === 'pins'
          ? er.cardinalityNotation
          : DEFAULT_APP_PREFERENCES.er.cardinalityNotation,
      labelVisibility:
        er.labelVisibility === 'hover' || er.labelVisibility === 'always'
          ? er.labelVisibility
          : DEFAULT_APP_PREFERENCES.er.labelVisibility,
      animateLaserFlow:
        typeof er.animateLaserFlow === 'boolean'
          ? er.animateLaserFlow
          : DEFAULT_APP_PREFERENCES.er.animateLaserFlow,
      gridMode:
        er.gridMode === 'dots' || er.gridMode === 'lines' || er.gridMode === 'none'
          ? er.gridMode
          : DEFAULT_APP_PREFERENCES.er.gridMode,
      snapToGrid:
        typeof er.snapToGrid === 'boolean'
          ? er.snapToGrid
          : DEFAULT_APP_PREFERENCES.er.snapToGrid,
      inferImplicitForeignKeys:
        typeof er.inferImplicitForeignKeys === 'boolean'
          ? er.inferImplicitForeignKeys
          : DEFAULT_APP_PREFERENCES.er.inferImplicitForeignKeys,
    },
    pedagogy: {
      linterStrictness:
        pedagogy.linterStrictness === 'strict' || pedagogy.linterStrictness === 'flexible'
          ? pedagogy.linterStrictness
          : DEFAULT_APP_PREFERENCES.pedagogy.linterStrictness,
    },
  };
}

export function loadAppPreferences(): AppPreferences {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_APP_PREFERENCES;
    const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!saved) return DEFAULT_APP_PREFERENCES;
    return normalizeAppPreferences(JSON.parse(saved));
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(prefs: AppPreferences): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignora falha de quota em modo privado
  }
}

export interface SuperBackupPayload {
  kind: 'sqleditor-super-backup';
  formatVersion: '3.2';
  appVersion: string;
  exportedAt: string;
  theme: ThemeMode;
  fontTheme: FontTheme;
  dbPreset: string;
  hideSystemDbs: boolean;
  preferences: AppPreferences;
  workspace: StoredWorkspace | null;
  databasesState: StoredDatabaseState[];
  erDiagrams: SavedERDiagramRecord[];
  dictionaryMeta: StoredDictionaryMeta[];
  exerciseProgress: StoredExerciseProgress[];
  legacyErPositions?: string | null;
  legacyErLineOffsets?: string | null;
}

export interface SuperBackupRestoreSummary {
  databasesCount: number;
  tabsCount: number;
  diagramsCount: number;
  dictionariesCount: number;
  exercisesCount: number;
  restoredPreferences: AppPreferences;
  restoredTheme?: ThemeMode;
  restoredFontTheme?: FontTheme;
  restoredWorkspace?: StoredWorkspace | null;
}

/**
 * Gera o Super-Backup Portátil do Aluno (.sqleditor.json) contendo todo o ambiente local.
 */
export async function exportSuperBackupJson(currentContext: {
  theme: ThemeMode;
  fontTheme: FontTheme;
  preferences: AppPreferences;
}): Promise<string> {
  await dbEngine.persistAllDatabases();

  const [databasesState, workspace, erDiagrams, dictionaryMeta, exerciseProgress] =
    await Promise.all([
      dbStorage.databasesState.toArray(),
      dbStorage.workspace.get('current_workspace'),
      dbStorage.erDiagrams.toArray(),
      dbStorage.dictionaryMeta.toArray(),
      dbStorage.exerciseProgress.toArray(),
    ]);

  let legacyErPositions: string | null = null;
  let legacyErLineOffsets: string | null = null;
  try {
    legacyErPositions = localStorage.getItem('sqleditor_er_positions_v2');
    legacyErLineOffsets = localStorage.getItem('sqleditor_er_line_offsets_v2');
  } catch {
    // Sem acesso a localStorage
  }

  const payload: SuperBackupPayload = {
    kind: 'sqleditor-super-backup',
    formatVersion: '3.2',
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    theme: currentContext.theme,
    fontTheme: currentContext.fontTheme,
    dbPreset: dbEngine.getPreset(),
    hideSystemDbs: dbEngine.isHidingSystemDatabases(),
    preferences: currentContext.preferences,
    workspace: workspace ?? null,
    databasesState,
    erDiagrams,
    dictionaryMeta,
    exerciseProgress,
    legacyErPositions,
    legacyErLineOffsets,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Restaura um Super-Backup Portátil (.sqleditor.json) ou um backup JSON legado de bancos.
 */
export async function importSuperBackupJson(rawJson: string): Promise<SuperBackupRestoreSummary> {
  const parsed = JSON.parse(rawJson);

  // Compatibilidade retroativa com backup legado (array direto de StoredDatabaseState)
  if (Array.isArray(parsed)) {
    await dbEngine.importJSON(rawJson);
    return {
      databasesCount: parsed.length,
      tabsCount: 0,
      diagramsCount: 0,
      dictionariesCount: 0,
      exercisesCount: 0,
      restoredPreferences: loadAppPreferences(),
    };
  }

  if (!parsed || typeof parsed !== 'object' || parsed.kind !== 'sqleditor-super-backup') {
    throw new Error('Formato de arquivo inválido. Selecione um arquivo .sqleditor.json válido.');
  }

  const payload = parsed as Partial<SuperBackupPayload>;
  const restoredPreferences = normalizeAppPreferences(payload.preferences);
  saveAppPreferences(restoredPreferences);

  if (typeof payload.hideSystemDbs === 'boolean') {
    dbEngine.setHideSystemDatabases(payload.hideSystemDbs);
  }
  if (typeof payload.dbPreset === 'string') {
    try {
      localStorage.setItem('sqleditor_db_preset', payload.dbPreset);
    } catch {
      // Ignora
    }
  }
  if (typeof payload.legacyErPositions === 'string') {
    try {
      localStorage.setItem('sqleditor_er_positions_v2', payload.legacyErPositions);
    } catch {
      // Ignora
    }
  }
  if (typeof payload.legacyErLineOffsets === 'string') {
    try {
      localStorage.setItem('sqleditor_er_line_offsets_v2', payload.legacyErLineOffsets);
    } catch {
      // Ignora
    }
  }

  // 1. Restaura Bancos de Dados no Dexie e recarrega o AlaSQL
  const dbs = Array.isArray(payload.databasesState) ? payload.databasesState : [];
  if (dbs.length > 0) {
    await dbStorage.databasesState.clear();
    await dbEngine.importJSON(JSON.stringify(dbs));
  }

  // 2. Restaura Workspace (Abas de Scripts, Zoom, Banco Ativo)
  let restoredWorkspace: StoredWorkspace | null = null;
  if (payload.workspace && typeof payload.workspace === 'object') {
    restoredWorkspace = {
      ...payload.workspace,
      id: 'current_workspace',
    };
    await dbStorage.workspace.put(restoredWorkspace);
  }

  // 3. Restaura Diagramas DER, Áreas Temáticas, Notas e Modelos Salvos
  const diagrams = Array.isArray(payload.erDiagrams) ? payload.erDiagrams : [];
  if (diagrams.length > 0) {
    await dbStorage.erDiagrams.bulkPut(diagrams);
  }

  // 4. Restaura Dicionário de Dados & Checklists 1FN-3FN
  const dictionaries = Array.isArray(payload.dictionaryMeta) ? payload.dictionaryMeta : [];
  if (dictionaries.length > 0) {
    await dbStorage.dictionaryMeta.bulkPut(dictionaries);
  }

  // 5. Restaura Progresso nos Exercícios Práticos
  const exercises = Array.isArray(payload.exerciseProgress) ? payload.exerciseProgress : [];
  if (exercises.length > 0) {
    await dbStorage.exerciseProgress.bulkPut(exercises);
  }

  const validTheme =
    payload.theme && ['dark', 'light', 'beige', 'graphite'].includes(payload.theme)
      ? payload.theme
      : undefined;
  const validFontTheme =
    payload.fontTheme && ['solar', 'cyber', 'matrix', 'synthwave'].includes(payload.fontTheme)
      ? payload.fontTheme
      : undefined;

  return {
    databasesCount: dbs.length,
    tabsCount: restoredWorkspace?.tabs?.length ?? 0,
    diagramsCount: diagrams.length,
    dictionariesCount: dictionaries.length,
    exercisesCount: exercises.length,
    restoredPreferences,
    restoredTheme: validTheme,
    restoredFontTheme: validFontTheme,
    restoredWorkspace,
  };
}

