import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { dbEngine } from '../../services/dbEngine';
import {
  buildERGraphFromDatabaseSchema,
  calculateTopologicalLayout,
} from '../../services/erLayoutEngine';
import { parseLiveSqlSchema } from '../../services/liveSqlSchemaParser';
import {
  downloadERDiagramPngHd,
  downloadERDiagramSvg,
  generateMarkdownDataDictionary,
  generateMermaidErDiagram,
  printERDiagramAsPdfA4,
  triggerBrowserDownload,
} from '../../services/schemaExporters';
import { runPedagogicalSchemaLinter } from '../../services/schemaLinter';
import { buildShareableSchemaUrl } from '../../services/shareSchemaLink';
import { dbStorage } from '../../services/storage';
import {
  buildAddColumnPatch,
  buildAddForeignKeyPatch,
  buildAppendTablePatch,
  generateFullDdlFromERGraph,
  type SurgicalSqlPatch,
  type VisualColumnDraft,
} from '../../services/visualDdlGenerator';
import type { DatabaseSchema, ThemeMode } from '../../types';
import type {
  ERSourceMode,
  ERStickyNote,
  ERSubjectArea,
  ERTablePosition,
  ERTableVisualMeta,
  SavedERDiagramRecord,
  StoredDictionaryMeta,
} from '../../types/erStudio';
import type { AppPreferences, ERStudioPreferences } from '../../types/preferences';
import { ERInspectorSidebar } from './ERInspectorSidebar';
import { ERInteractiveCanvas } from './ERInteractiveCanvas';

export interface ERStudioWorkspaceProps {
  mode?: 'full-studio' | 'split-preview';
  schemas: DatabaseSchema[];
  activeDatabase: string;
  liveScriptSql?: string;
  activeTabName?: string;
  theme?: ThemeMode;
  preferences: AppPreferences;
  onUpdateErPreferences?: (patch: Partial<ERStudioPreferences>) => void;
  onSelectDatabase?: (dbName: string) => void;
  onSelectTableForQuery?: (dbName: string, tableName: string) => void;
  onApplySurgicalSqlPatch?: (
    patch: SurgicalSqlPatch,
    executeInAlaSql?: boolean
  ) => Promise<void> | void;
  onOpenDdlInEditor?: (title: string, sql: string) => void;
  onRefreshSchemas?: () => Promise<void> | void;
  onExpandToFullStudio?: () => void;
}

const LEGACY_POSITIONS_KEY = 'sqleditor_er_positions_by_db';

function readLegacyPositionsForDb(dbName: string): Record<string, ERTablePosition> | null {
  try {
    const raw = localStorage.getItem(LEGACY_POSITIONS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.[dbName] || null;
  } catch {
    return null;
  }
}

export const ERStudioWorkspace: React.FC<ERStudioWorkspaceProps> = ({
  mode = 'full-studio',
  schemas,
  activeDatabase,
  liveScriptSql = '',
  activeTabName = 'consulta.sql',
  theme = 'dark',
  preferences,
  onUpdateErPreferences,
  onSelectDatabase,
  onSelectTableForQuery,
  onApplySurgicalSqlPatch,
  onOpenDdlInEditor,
  onRefreshSchemas,
  onExpandToFullStudio,
}) => {
  const isSplitPreview = mode === 'split-preview';
  const deferredLiveSql = useDeferredValue(liveScriptSql);

  const hasLiveCreateTable = useMemo(
    () => /\bCREATE\s+(?:TEMPORARY\s+|TEMP\s+)?TABLE\b/i.test(deferredLiveSql),
    [deferredLiveSql]
  );

  const [sourceMode, setSourceMode] = useState<ERSourceMode>(() => {
    if (isSplitPreview && hasLiveCreateTable) return 'live-script';
    if (!activeDatabase && schemas.length === 0 && hasLiveCreateTable) return 'live-script';
    return 'active-db';
  });

  const [selectedDb, setSelectedDb] = useState<string>(
    activeDatabase || schemas[0]?.name || ''
  );

  // Sincroniza banco selecionado com o banco ativo global
  useEffect(() => {
    if (activeDatabase && schemas.some((s) => s.name === activeDatabase)) {
      setSelectedDb(activeDatabase);
    } else if (!selectedDb && schemas.length > 0) {
      setSelectedDb(schemas[0].name);
    }
  }, [activeDatabase, schemas, selectedDb]);

  // Se estiver no Split-View sem banco ativo e o aluno começar a digitar CREATE TABLE, ativa Script Ao Vivo
  useEffect(() => {
    if (isSplitPreview && !selectedDb && hasLiveCreateTable && sourceMode === 'active-db') {
      setSourceMode('live-script');
    }
  }, [isSplitPreview, selectedDb, hasLiveCreateTable, sourceMode]);

  // Estado do Inspetor Lateral (somente no Estúdio DER dedicado)
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<
    'tables' | 'relations' | 'areas' | 'notes' | 'linter'
  >('tables');

  // Estados visuais do Diagrama
  const [positions, setPositions] = useState<Record<string, ERTablePosition>>({});
  const [lineOffsets, setLineOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [tableMeta, setTableMeta] = useState<Record<string, ERTableVisualMeta>>({});
  const [subjectAreas, setSubjectAreas] = useState<ERSubjectArea[]>([]);
  const [stickyNotes, setStickyNotes] = useState<ERStickyNote[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Cache de amostras de dados do AlaSQL para o recurso "Live Data Peek (👁️)"
  const [sampleRowsByTable, setSampleRowsByTable] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [dictionaryMeta, setDictionaryMeta] = useState<StoredDictionaryMeta | null>(null);

  // UI de menus e feedback rápido
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [customModelTitle, setCustomModelTitle] = useState<string>('');
  const [customModelDesc, setCustomModelDesc] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Fecha menu de exportação ao clicar fora
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Limpa cache de Data Peek ao trocar de banco
  useEffect(() => {
    setSampleRowsByTable({});
  }, [selectedDb]);

  // Carrega metadados do Dicionário de Dados para o banco atual
  useEffect(() => {
    if (!selectedDb) {
      setDictionaryMeta(null);
      return;
    }
    let active = true;
    dbStorage.dictionaryMeta
      .get(`dict:${selectedDb}`)
      .then((rec) => {
        if (active) setDictionaryMeta(rec || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedDb]);

  // Construção do Grafo ER (Fonte 1: Banco Ativo AlaSQL | Fonte 2: Parser Reativo do Script SQL)
  const currentDbSchema = useMemo(
    () => schemas.find((s) => s.name === selectedDb),
    [schemas, selectedDb]
  );

  const liveParsed = useMemo(() => {
    if (sourceMode !== 'live-script') {
      return { tables: [], relationships: [], errors: [], detectedDatabase: undefined };
    }
    return parseLiveSqlSchema(deferredLiveSql, {
      inferImplicitForeignKeys: preferences.er.inferImplicitForeignKeys,
    });
  }, [sourceMode, deferredLiveSql, preferences.er.inferImplicitForeignKeys]);

  const activeDbGraph = useMemo(() => {
    if (sourceMode !== 'active-db') {
      return { tables: [], relationships: [] };
    }
    return buildERGraphFromDatabaseSchema(currentDbSchema, {
      inferImplicitForeignKeys: preferences.er.inferImplicitForeignKeys,
      sampleRowsByTable,
      dictionaryTableComments: dictionaryMeta?.tableComments,
      dictionaryColumnComments: dictionaryMeta?.columnComments,
    });
  }, [
    sourceMode,
    currentDbSchema,
    preferences.er.inferImplicitForeignKeys,
    sampleRowsByTable,
    dictionaryMeta,
  ]);

  const tables = sourceMode === 'live-script' ? liveParsed.tables : activeDbGraph.tables;
  const relationships =
    sourceMode === 'live-script' ? liveParsed.relationships : activeDbGraph.relationships;

  const effectiveContextName =
    sourceMode === 'live-script'
      ? liveParsed.detectedDatabase || activeTabName.replace(/\.sql$/i, '') || 'script_ao_vivo'
      : selectedDb || 'sem_banco';

  const layoutRecordId =
    sourceMode === 'live-script'
      ? `layout:live:${effectiveContextName}`
      : `layout:db:${selectedDb || 'default'}`;

  // Linter Pedagógico em tempo real
  const lintIssues = useMemo(
    () =>
      runPedagogicalSchemaLinter(
        tables,
        relationships,
        preferences.pedagogy.linterStrictness
      ),
    [tables, relationships, preferences.pedagogy.linterStrictness]
  );

  // Persistência no Dexie (erDiagrams)
  const persistDiagramState = useCallback(
    async (overrides?: Partial<SavedERDiagramRecord>) => {
      if (!effectiveContextName) return;
      try {
        const record: SavedERDiagramRecord = {
          id: layoutRecordId,
          kind: 'db-layout',
          title: `Layout ${effectiveContextName}`,
          dbName: effectiveContextName,
          positions,
          lineOffsets,
          tableMeta,
          subjectAreas,
          stickyNotes,
          updatedAt: new Date().toISOString(),
          ...overrides,
        };
        await dbStorage.erDiagrams.put(record);
      } catch {
        // Ignora erro silencioso de IndexedDB
      }
    },
    [
      effectiveContextName,
      layoutRecordId,
      positions,
      lineOffsets,
      tableMeta,
      subjectAreas,
      stickyNotes,
    ]
  );

  // Carrega ou calcula posições topológicas 16:9 quando o contexto ou lista de tabelas muda
  const tableSignature = useMemo(() => tables.map((t) => t.name).join('|'), [tables]);
  const loadedContextRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    async function hydrateLayout() {
      if (tables.length === 0) {
        if (loadedContextRef.current !== layoutRecordId) {
          loadedContextRef.current = layoutRecordId;
          setPositions({});
          setLineOffsets({});
          setTableMeta({});
          setSubjectAreas([]);
          setStickyNotes([]);
        }
        return;
      }

      const isContextSwitch = loadedContextRef.current !== layoutRecordId;
      if (isContextSwitch) {
        loadedContextRef.current = layoutRecordId;
        const saved = await dbStorage.erDiagrams.get(layoutRecordId).catch(() => undefined);
        if (cancelled) return;

        if (saved) {
          // Garante coordenadas para novas tabelas adicionadas desde o último salvamento
          const autoFallback = calculateTopologicalLayout(
            tables,
            relationships,
            saved.tableMeta,
            preferences.er.snapToGrid
          );
          const mergedPos: Record<string, ERTablePosition> = {};
          for (const tbl of tables) {
            mergedPos[tbl.name] = saved.positions[tbl.name] || autoFallback[tbl.name] || { x: 72, y: 72 };
          }
          setPositions(mergedPos);
          setLineOffsets(saved.lineOffsets || {});
          setTableMeta(saved.tableMeta || {});
          setSubjectAreas(saved.subjectAreas || []);
          setStickyNotes(saved.stickyNotes || []);
          return;
        }

        // Migração transparente de posições v3.1 salvas em localStorage
        const legacyPos =
          sourceMode === 'active-db' && selectedDb
            ? readLegacyPositionsForDb(selectedDb)
            : null;
        const autoPos = calculateTopologicalLayout(
          tables,
          relationships,
          {},
          preferences.er.snapToGrid
        );
        const initialPos: Record<string, ERTablePosition> = {};
        for (const tbl of tables) {
          initialPos[tbl.name] = legacyPos?.[tbl.name] || autoPos[tbl.name] || { x: 72, y: 72 };
        }
        setPositions(initialPos);
        setLineOffsets({});
        setTableMeta({});
        setSubjectAreas([]);
        setStickyNotes([]);
        return;
      }

      // Mesmo contexto, porém novas tabelas surgiram enquanto o aluno digita SQL ao vivo!
      setPositions((prev) => {
        const missing = tables.filter((t) => !prev[t.name]);
        if (missing.length === 0) return prev;
        const autoPos = calculateTopologicalLayout(
          tables,
          relationships,
          tableMeta,
          preferences.er.snapToGrid
        );
        const next = { ...prev };
        for (const tbl of missing) {
          next[tbl.name] = autoPos[tbl.name] || { x: 80, y: 80 };
        }
        return next;
      });
    }

    hydrateLayout();
    return () => {
      cancelled = true;
    };
  }, [
    layoutRecordId,
    tableSignature,
    tables,
    relationships,
    sourceMode,
    selectedDb,
    tableMeta,
    preferences.er.snapToGrid,
  ]);

  const handlePositionsChange = useCallback(
    (next: Record<string, ERTablePosition>, commitPersist?: boolean) => {
      setPositions(next);
      if (commitPersist) {
        persistDiagramState({ positions: next });
      }
    },
    [persistDiagramState]
  );

  const handleLineOffsetsChange = useCallback(
    (next: Record<string, { x: number; y: number }>, commitPersist?: boolean) => {
      setLineOffsets(next);
      if (commitPersist) {
        persistDiagramState({ lineOffsets: next });
      }
    },
    [persistDiagramState]
  );

  const handleUpdateTableMeta = useCallback(
    (tableName: string, patch: Partial<ERTableVisualMeta>) => {
      setTableMeta((prev) => {
        const next = {
          ...prev,
          [tableName]: { ...(prev[tableName] || {}), ...patch },
        };
        persistDiagramState({ tableMeta: next });
        return next;
      });
    },
    [persistDiagramState]
  );

  const handleSubjectAreasChange = useCallback(
    (next: ERSubjectArea[], commitPersist?: boolean) => {
      setSubjectAreas(next);
      if (commitPersist) {
        persistDiagramState({ subjectAreas: next });
      }
    },
    [persistDiagramState]
  );

  const handleStickyNotesChange = useCallback(
    (next: ERStickyNote[], commitPersist?: boolean) => {
      setStickyNotes(next);
      if (commitPersist) {
        persistDiagramState({ stickyNotes: next });
      }
    },
    [persistDiagramState]
  );

  const handleAutoLayout = useCallback(() => {
    const unlockedPos = calculateTopologicalLayout(
      tables,
      relationships,
      tableMeta,
      preferences.er.snapToGrid
    );
    const merged: Record<string, ERTablePosition> = { ...unlockedPos };
    // Respeita cards travados com cadeado (🔒)
    for (const tbl of tables) {
      if (tableMeta[tbl.name]?.locked && positions[tbl.name]) {
        merged[tbl.name] = positions[tbl.name];
      }
    }
    setPositions(merged);
    setLineOffsets({});
    persistDiagramState({ positions: merged, lineOffsets: {} });
    showToast('Layout topológico 16:9 reorganizado.');
  }, [
    tables,
    relationships,
    tableMeta,
    preferences.er.snapToGrid,
    positions,
    persistDiagramState,
    showToast,
  ]);

  // Lazy-load de 5 registros reais do AlaSQL ao clicar em "Live Data Peek (👁️)"
  const handleRequestDataPeek = useCallback(
    async (tableName: string) => {
      if (sourceMode !== 'active-db' || !selectedDb) return;
      if (sampleRowsByTable[tableName]) return;
      const preview = await dbEngine.getTablePreviewData(selectedDb, tableName, 5);
      setSampleRowsByTable((prev) => ({
        ...prev,
        [tableName]: preview.rows,
      }));
    },
    [sourceMode, selectedDb, sampleRowsByTable]
  );

  // Mutações Visuais Bidirecionais (DER -> SQL Cirúrgico + AlaSQL)
  const executeVisualDdlMutation = useCallback(
    async (patch: SurgicalSqlPatch, feedbackLabel: string) => {
      const shouldExecAlaSql = sourceMode === 'active-db';

      if (shouldExecAlaSql) {
        let targetDb = selectedDb;
        if (!targetDb) {
          targetDb = 'meu_modelo_db';
          await dbEngine.executeScript(
            `CREATE DATABASE IF NOT EXISTS \`${targetDb}\`; USE \`${targetDb}\`;`
          );
          setSelectedDb(targetDb);
          onSelectDatabase?.(targetDb);
        } else {
          await dbEngine.executeScript(`USE \`${targetDb}\`;`);
        }
        await dbEngine.executeScript(patch.executedDdlStatement);
        await onRefreshSchemas?.();
      }

      if (onApplySurgicalSqlPatch) {
        await onApplySurgicalSqlPatch(patch, false);
      }

      showToast(feedbackLabel);
    },
    [
      sourceMode,
      selectedDb,
      onSelectDatabase,
      onRefreshSchemas,
      onApplySurgicalSqlPatch,
      showToast,
    ]
  );

  const handleVisualCreateTable = useCallback(
    (tableName: string, columns: VisualColumnDraft[]) => {
      const patch = buildAppendTablePatch(liveScriptSql, tableName, columns);
      executeVisualDdlMutation(patch, `Tabela "${tableName}" criada e sincronizada com SQL!`);
    },
    [liveScriptSql, executeVisualDdlMutation]
  );

  const handleVisualAddColumn = useCallback(
    (tableName: string, column: VisualColumnDraft) => {
      const patch = buildAddColumnPatch(liveScriptSql, tableName, column);
      executeVisualDdlMutation(
        patch,
        `Atributo "${tableName}.${column.name}" adicionado ao esquema!`
      );
    },
    [liveScriptSql, executeVisualDdlMutation]
  );

  const handleVisualCreateForeignKey = useCallback(
    (
      sourceTable: string,
      sourceColumn: string,
      targetTable: string,
      targetColumn: string
    ) => {
      const patch = buildAddForeignKeyPatch(
        liveScriptSql,
        sourceTable,
        sourceColumn,
        targetTable,
        targetColumn
      );
      executeVisualDdlMutation(
        patch,
        `Relacionamento ${sourceTable}.${sourceColumn} ➔ ${targetTable}.${targetColumn} criado!`
      );
    },
    [liveScriptSql, executeVisualDdlMutation]
  );

  const handleApplyLintFixSql = useCallback(
    (fixSql: string) => {
      const trimmed = liveScriptSql.trimEnd();
      const prefix = trimmed.length > 0 ? '\n' : '';
      const replacementText = `${prefix}${fixSql}\n`;
      const patch: SurgicalSqlPatch = {
        startOffset: liveScriptSql.length,
        endOffset: liveScriptSql.length,
        replacementText,
        newFullSql: liveScriptSql + replacementText,
        executedDdlStatement: fixSql,
      };
      executeVisualDdlMutation(patch, 'Correção do Linter aplicada ao esquema!');
    },
    [liveScriptSql, executeVisualDdlMutation]
  );

  // Compartilhamento Zero-Backend via Hash #z.<deflate-base64url>
  const handleShareSchemaUrl = async () => {
    try {
      const sqlPayload =
        sourceMode === 'live-script' && deferredLiveSql.trim().length > 0
          ? deferredLiveSql
          : generateFullDdlFromERGraph(effectiveContextName, tables, relationships);

      const url = await buildShareableSchemaUrl({
        v: 1,
        title: `${effectiveContextName}.sql`,
        dbName: effectiveContextName,
        sql: sqlPayload,
      });

      await navigator.clipboard.writeText(url);
      showToast('Link #z. copiado! Qualquer pessoa pode abrir o modelo sem backend.');
    } catch {
      showToast('Não foi possível copiar o link automaticamente.');
    }
  };

  // Salvar snapshot em "Meus Modelos Salvos" para a Galeria & Prática
  const handleSaveCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = customModelTitle.trim() || `Modelo ${effectiveContextName}`;
    const ddl =
      sourceMode === 'live-script' && deferredLiveSql.trim().length > 0
        ? deferredLiveSql
        : generateFullDdlFromERGraph(effectiveContextName, tables, relationships);

    const record: SavedERDiagramRecord = {
      id: `custom:${Date.now()}`,
      kind: 'custom-model',
      title,
      description:
        customModelDesc.trim() ||
        `${tables.length} entidades • ${relationships.length} relacionamentos`,
      dbName: effectiveContextName,
      ddlSql: ddl,
      positions,
      lineOffsets,
      tableMeta,
      subjectAreas,
      stickyNotes,
      updatedAt: new Date().toISOString(),
    };

    await dbStorage.erDiagrams.put(record);
    setSaveModalOpen(false);
    setCustomModelTitle('');
    setCustomModelDesc('');
    showToast(`"${title}" salvo em Meus Modelos na Galeria!`);
  };

  const isLightTheme = theme === 'light' || theme === 'beige';

  const buildExportContext = () => ({
    dbName: effectiveContextName,
    tables,
    relationships,
    positions,
    lineOffsets,
    tableMeta,
    subjectAreas,
    stickyNotes,
    lineStyle: preferences.er.lineStyle,
    cardinalityNotation: preferences.er.cardinalityNotation,
    isLightTheme,
  });

  const errorCount = lintIssues.filter((i) => i.severity === 'error').length;

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative">
      {/* Notificação Toast Flutuante */}
      {toastMessage && (
        <div
          data-print-hide
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[#FF6B00] text-xs font-semibold text-[var(--text-primary)] shadow-2xl flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BARRA SUPERIOR (Oculta em Modo Apresentação Tela Cheia) */}
      {!isPresentationMode && (
        <div
          data-print-hide
          className={`shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-2 ${
            isSplitPreview ? 'px-3 py-1.5' : 'px-4 py-2.5'
          }`}
        >
          {/* Esquerda: Seletor de Fonte (Banco Ativo vs Script Ao Vivo) + Seletor de Banco */}
          <div className="flex flex-wrap items-center gap-2">
            {!isSplitPreview && (
              <div className="flex items-center gap-2 mr-1">
                <span className="material-symbols-outlined text-[#FF6B00] text-[20px]">
                  account_tree
                </span>
                <span className="text-sm font-bold tracking-tight hidden sm:inline">
                  Estúdio DER
                </span>
              </div>
            )}

            {/* Toggle Fonte de Dados: Banco Ativo (AlaSQL) vs Script Ao Vivo */}
            <div className="flex items-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSourceMode('active-db')}
                title="Renderiza o esquema real instanciado no motor AlaSQL"
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                  sourceMode === 'active-db'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">database</span>
                <span>Banco Ativo</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('live-script')}
                title="Renderiza os comandos CREATE/ALTER/INSERT da aba ativa do editor enquanto você digita"
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                  sourceMode === 'live-script'
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">bolt</span>
                <span>Script Ao Vivo</span>
              </button>
            </div>

            {sourceMode === 'active-db' ? (
              <select
                value={selectedDb}
                onChange={(e) => {
                  setSelectedDb(e.target.value);
                  onSelectDatabase?.(e.target.value);
                }}
                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
              >
                {schemas.length === 0 ? (
                  <option value="">Nenhum banco ativo</option>
                ) : (
                  schemas.map((db) => (
                    <option key={db.name} value={db.name}>
                      {db.name} ({db.tables.length} tab)
                    </option>
                  ))
                )}
              </select>
            ) : (
              <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--accent-yellow)]">
                {activeTabName}
              </span>
            )}

            <span className="text-[11px] font-mono text-[var(--text-muted)] hidden md:inline">
              {tables.length} ent • {relationships.length} rel
            </span>
          </div>

          {/* Direita: Saúde/Linter, Compartilhar #z., Salvar Modelo e 5 Exportadores */}
          <div className="flex items-center gap-1.5">
            {/* Badge de Saúde do Esquema */}
            <button
              type="button"
              onClick={() => {
                if (isSplitPreview && onExpandToFullStudio) {
                  onExpandToFullStudio();
                  return;
                }
                setInspectorOpen(true);
                setInspectorTab('linter');
              }}
              title="Ver auditoria completa do Linter Pedagógico (PK/FK e 1FN–3FN)"
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                lintIssues.length === 0
                  ? 'bg-[var(--status-success)]/10 border-[var(--status-success)]/40 text-[var(--status-success)]'
                  : errorCount > 0
                  ? 'bg-[var(--status-error)]/10 border-[var(--status-error)]/40 text-[var(--status-error)]'
                  : 'bg-[#FF6B00]/10 border-[#FF6B00]/40 text-[#FF6B00]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {lintIssues.length === 0 ? 'verified' : 'warning'}
              </span>
              <span className="hidden sm:inline">
                {lintIssues.length === 0 ? 'Íntegro' : `${lintIssues.length} alerta(s)`}
              </span>
            </button>

            {/* Compartilhar Link #z. */}
            <button
              type="button"
              onClick={handleShareSchemaUrl}
              disabled={tables.length === 0}
              title="Gerar link comprimido #z. para compartilhar este modelo sem servidor"
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] disabled:opacity-40 border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-[#29B6F6]">
                share
              </span>
              {!isSplitPreview && <span className="hidden lg:inline">Link #z.</span>}
            </button>

            {/* Salvar em Meus Modelos */}
            {!isSplitPreview && (
              <button
                type="button"
                onClick={() => {
                  setCustomModelTitle(`Modelo ${effectiveContextName}`);
                  setSaveModalOpen(true);
                }}
                disabled={tables.length === 0}
                title="Salvar este diagrama e layout na aba Meus Modelos da Galeria"
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] disabled:opacity-40 border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">
                  bookmark_add
                </span>
                <span className="hidden lg:inline">Salvar</span>
              </button>
            )}

            {/* Dropdown dos 5 Exportadores + DDL */}
            <div ref={exportDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={tables.length === 0}
                className="px-2.5 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                {!isSplitPreview && <span>Exportar</span>}
                <span className="material-symbols-outlined text-[13px]">expand_more</span>
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl py-1.5 z-50 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      setExportMenuOpen(false);
                      await downloadERDiagramPngHd(buildExportContext());
                      showToast('Imagem PNG HD (2x) exportada!');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">
                      image
                    </span>
                    <span>Imagem PNG Alta Definição (2x)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      downloadERDiagramSvg(buildExportContext());
                      showToast('Diagrama SVG Vetorial exportado!');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
                      polyline
                    </span>
                    <span>Vetor SVG Escalável</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      printERDiagramAsPdfA4(buildExportContext());
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[var(--status-error)]">
                      picture_as_pdf
                    </span>
                    <span>Imprimir / PDF A4 Paisagem</span>
                  </button>

                  <div className="my-1 border-t border-[var(--border-color)]" />

                  <button
                    type="button"
                    onClick={async () => {
                      setExportMenuOpen(false);
                      const mermaid = generateMermaidErDiagram(
                        effectiveContextName,
                        tables,
                        relationships
                      );
                      await navigator.clipboard.writeText(mermaid);
                      showToast('Código Mermaid (erDiagram) copiado!');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">
                      schema
                    </span>
                    <span>Copiar Mermaid (erDiagram)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      const md = generateMarkdownDataDictionary(
                        effectiveContextName,
                        tables,
                        relationships,
                        dictionaryMeta
                      );
                      triggerBrowserDownload(
                        new Blob([md], { type: 'text/markdown;charset=utf-8' }),
                        `dicionario_${effectiveContextName}.md`
                      );
                      showToast('Dicionário de Dados (.md) baixado!');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[var(--status-success)]">
                      menu_book
                    </span>
                    <span>Baixar Dicionário Markdown (.md)</span>
                  </button>

                  {onOpenDdlInEditor && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportMenuOpen(false);
                        const ddl = generateFullDdlFromERGraph(
                          effectiveContextName,
                          tables,
                          relationships
                        );
                        onOpenDdlInEditor(`ddl_${effectiveContextName}.sql`, ddl);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
                        terminal
                      </span>
                      <span>Abrir Script DDL no Editor</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Botão para expandir Split-View diretamente para o Estúdio DER completo */}
            {isSplitPreview && onExpandToFullStudio && (
              <button
                type="button"
                onClick={onExpandToFullStudio}
                title="Abrir no Estúdio DER Completo com Inspetor Visual, Áreas e Notas"
                className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_full</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL: INSPETOR LATERAL (Estúdio DER) + CANVAS INTERATIVO */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {!isSplitPreview && !isPresentationMode && (
          <ERInspectorSidebar
            isOpen={inspectorOpen}
            onToggleOpen={() => setInspectorOpen((v) => !v)}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            tables={tables}
            relationships={relationships}
            subjectAreas={subjectAreas}
            stickyNotes={stickyNotes}
            lintIssues={lintIssues}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onCreateTable={handleVisualCreateTable}
            onAddColumn={handleVisualAddColumn}
            onCreateForeignKey={handleVisualCreateForeignKey}
            onAddSubjectArea={(title, color) => {
              const next: ERSubjectArea[] = [
                ...subjectAreas,
                {
                  id: `area_${Date.now()}`,
                  title,
                  color,
                  x: 48 + subjectAreas.length * 36,
                  y: 48 + subjectAreas.length * 36,
                  width: 620,
                  height: 380,
                },
              ];
              handleSubjectAreasChange(next, true);
              showToast(`Área temática "${title}" adicionada ao canvas!`);
            }}
            onUpdateSubjectArea={(id, patch) => {
              const next = subjectAreas.map((a) => (a.id === id ? { ...a, ...patch } : a));
              handleSubjectAreasChange(next, true);
            }}
            onDeleteSubjectArea={(id) => {
              handleSubjectAreasChange(
                subjectAreas.filter((a) => a.id !== id),
                true
              );
            }}
            onAddStickyNote={(title, content, color) => {
              const next: ERStickyNote[] = [
                ...stickyNotes,
                {
                  id: `note_${Date.now()}`,
                  title,
                  content,
                  color,
                  x: 84 + stickyNotes.length * 28,
                  y: 84 + stickyNotes.length * 28,
                  width: 240,
                  height: 150,
                },
              ];
              handleStickyNotesChange(next, true);
              showToast('Nota adesiva adicionada ao canvas!');
            }}
            onDeleteStickyNote={(id) => {
              handleStickyNotesChange(
                stickyNotes.filter((n) => n.id !== id),
                true
              );
            }}
            onApplyLintFixSql={handleApplyLintFixSql}
          />
        )}

        <ERInteractiveCanvas
          tables={tables}
          relationships={relationships}
          positions={positions}
          onPositionsChange={handlePositionsChange}
          lineOffsets={lineOffsets}
          onLineOffsetsChange={handleLineOffsetsChange}
          tableMeta={tableMeta}
          onUpdateTableMeta={handleUpdateTableMeta}
          subjectAreas={subjectAreas}
          onSubjectAreasChange={handleSubjectAreasChange}
          stickyNotes={stickyNotes}
          onStickyNotesChange={handleStickyNotesChange}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onDoubleClickTableQuery={
            onSelectTableForQuery && sourceMode === 'active-db' && selectedDb
              ? (tblName) => onSelectTableForQuery(selectedDb, tblName)
              : undefined
          }
          onRequestDataPeek={handleRequestDataPeek}
          onAutoLayout={handleAutoLayout}
          erPreferences={preferences.er}
          onUpdateErPreferences={onUpdateErPreferences}
          defaultZoom={preferences.ui.defaultErZoom}
          reducedMotionAndGlow={preferences.ui.reducedMotionAndGlow}
          isPresentationMode={isPresentationMode}
          onTogglePresentationMode={() => setIsPresentationMode((v) => !v)}
          enableVisualConnect={!isSplitPreview}
          onCreateForeignKeyConnection={handleVisualCreateForeignKey}
          compact={isSplitPreview}
          fitTriggerKey={`${layoutRecordId}:${tables.length}`}
        />
      </div>

      {/* Modal Rápido: Salvar em Meus Modelos */}
      {saveModalOpen && (
        <div
          data-print-hide
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSaveCustomModel}
            className="w-full max-w-md rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent-yellow)]">
                  bookmark_add
                </span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Salvar em Meus Modelos (Galeria)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Título do Modelo DER
                </label>
                <input
                  type="text"
                  required
                  value={customModelTitle}
                  onChange={(e) => setCustomModelTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Descrição / Observações da Atividade
                </label>
                <textarea
                  rows={2}
                  value={customModelDesc}
                  onChange={(e) => setCustomModelDesc(e.target.value)}
                  placeholder="Ex: Projeto Integrador — Etapa de Modelagem Física"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold cursor-pointer"
              >
                Salvar Modelo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

