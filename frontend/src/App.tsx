import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace, extractStatementAtCursor, findActiveDatabaseAtPosition } from './components/EditorWorkspace';
import { ConsoleResults } from './components/ConsoleResults';
import { QueryHistoryView } from './components/QueryHistoryView';
import { ERDiagramView } from './components/ERDiagramView';
import { ERModelView } from './components/ERModelView';
import { ERStudioWorkspace } from './components/er/ERStudioWorkspace';
import { GalleryAndPracticeView, ActiveChallengeBanner } from './components/GalleryAndPracticeView';
import { GuideView } from './components/GuideView';
import { FeedbackView } from './components/FeedbackView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { UserProfileView } from './components/UserProfileView';
import { AdminPanelView } from './components/AdminPanelView';
import { TeacherPanelView } from './components/TeacherPanelView';
import { AuthModal } from './components/AuthModal';
import { NavigationHubModal } from './components/NavigationHubModal';
import { PostExamRecoveryModal } from './components/PostExamRecoveryModal';
import { useAuth } from './context/AuthContext';
import { LandingPageView } from './components/LandingPageView';
import { ContextMenu } from './components/ContextMenu';
import { dbEngine, type DatabaseLoadProgress } from './services/dbEngine';
import { dbStorage } from './services/storage';
import { reviewSqlQuery, resolveReviewTargetRange, applySuggestedSqlToScript } from './services/sqlReviewer';
import { getAvailableSolutions, type SolutionItem } from './services/scriptsLoader';
import { subscribeToClass, getClassesByTeacher, getAllClasses } from './services/classService';
import {
  getUserSavedScripts,
  getClassScripts,
  saveScript,
  submitExam,
} from './services/scriptService';
import {
  loadAppPreferences,
  saveAppPreferences,
  type SuperBackupRestoreSummary,
} from './services/preferencesStorage';
import { decodeSharedSchemaHash } from './services/shareSchemaLink';
import {
  type AppPreferences,
  type ERStudioPreferences,
} from './types/preferences';
import type { PracticeExerciseItem } from './data/practiceExercisesCatalog';
import type { SavedERDiagramRecord } from './types/erStudio';
import type { SurgicalSqlPatch } from './services/visualDdlGenerator';
import type { VisiblePanels } from './components/MainMenuDropdown';
import type {
  ActiveView,
  TabItem,
  QueryResult,
  DatabaseSchema,
  ZoomLevels,
  ThemeMode,
  FontTheme,
  ContextMenuTarget,
  SqlReview,
  ReviewTargetRange,
  DatabasePreset,
  ConsoleTab,
  TablePreviewData,
  DataPreviewLimit,
  ClassItem,
  SavedScriptItem,
  ClassroomMode,
} from './types';

const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    title: 'script_1.sql',
    content: `-- Bem-vindo ao SQLEditor! (Google Antigravity Professional Edition)
-- Central da Disciplina de Banco de Dados • v3.2
--
-- 📌 Para carregar bancos de dados de aula:
--    Acesse o menu 'Galeria & Prática Guiada' ou clique com botão direito no SCHEMA EXPLORER:
--    • Carregar vazio (iniciar sem nenhum banco)
--    • Carregar BDs de exemplo (ecommerce_db e universidade_db)
--    • Carregar BDs Aula (Pizzaria, Escola de Idiomas, RH, E-Commerce)
--
-- 📐 Estúdio DER & Split-View:
--    Clique em 'SQL ↔ DER' no topo do laboratório para desenhar seu modelo ao vivo!
`,
  },
];

function parseActiveViewFromHash(rawHash: string): ActiveView | null {
  const raw = (rawHash || '').replace(/^#\/?/, '').toLowerCase().trim();
  if (!raw) return null;
  if (raw === 'editor' || raw === 'workspace' || raw === 'laboratorio') return 'workspace';
  if (raw === 'galeria' || raw === 'gallery') return 'gallery';
  if (raw === 'modelo' || raw === 'er-model' || raw === 'dicionario') return 'er-model';
  if (raw === 'der' || raw === 'er-diagram' || raw === 'estudio') return 'er-diagram';
  if (raw === 'historico' || raw === 'history') return 'history';
  if (raw === 'configuracoes' || raw === 'config' || raw === 'settings') return 'settings';
  if (raw === 'guia' || raw === 'guide') return 'guide';
  if (raw === 'feedback' || raw === 'suporte') return 'feedback';
  if (raw === 'guide-feedback') return 'guide';
  if (raw === 'sobre' || raw === 'about') return 'about';
  if (raw === 'perfil' || raw === 'profile') return 'profile';
  if (raw === 'admin' || raw === 'admin-panel' || raw === 'administrador') return 'admin-panel';
  if (raw === 'turmas' || raw === 'teacher-panel' || raw === 'professor') return 'teacher-panel';
  if (raw === 'landing' || raw === 'home') return 'landing';
  return null;
}

export const App: React.FC = () => {
  const { user, userProfile, authModalOpen, authModalInitialTab, closeAuthModal } = useAuth();
  const [preferences, setPreferencesState] = useState<AppPreferences>(() => loadAppPreferences());
  const [workspaceLayoutMode, setWorkspaceLayoutMode] = useState<'editor' | 'split' | 'der'>('editor');
  const [activeExercise, setActiveExercise] = useState<PracticeExerciseItem | null>(null);
  const [isHubModalOpen, setIsHubModalOpen] = useState<boolean>(() => {
    try {
      return parseActiveViewFromHash(window.location.hash) === 'workspace';
    } catch {
      return false;
    }
  });

  const [activeView, setActiveViewState] = useState<ActiveView>(() => {
    try {
      const fromHash = parseActiveViewFromHash(window.location.hash);
      // Se há rota explícita por hash (ex: #editor, #der, #guia, #feedback), honra o hash
      if (fromHash) return fromHash;
      // Ao entrar no endereço raiz sem hash, SEMPRE abre a página inicial institucional (landing)
      return 'landing';
    } catch (_) {}
    return 'landing';
  });

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    try {
      localStorage.setItem('sqleditor_active_view', view);
      if (view === 'workspace') {
        window.location.hash = '#editor';
      } else if (view === 'gallery') {
        window.location.hash = '#galeria';
      } else if (view === 'er-model') {
        window.location.hash = '#modelo';
      } else if (view === 'er-diagram') {
        window.location.hash = '#der';
      } else if (view === 'history') {
        window.location.hash = '#historico';
      } else if (view === 'settings') {
        window.location.hash = '#configuracoes';
      } else if (view === 'guide') {
        window.location.hash = '#guia';
      } else if (view === 'feedback') {
        window.location.hash = '#feedback';
      } else if (view === 'guide-feedback') {
        window.location.hash = '#guia';
      } else if (view === 'about') {
        window.location.hash = '#sobre';
      } else if (view === 'profile') {
        window.location.hash = '#perfil';
      } else if (view === 'admin-panel') {
        window.location.hash = '#admin';
      } else if (view === 'teacher-panel') {
        window.location.hash = '#turmas';
      } else if (view === 'landing') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}
  }, []);

  // Se o usuário deslogar enquanto estiver em telas restritas (perfil, admin, turmas), redireciona imediatamente para a landing page
  useEffect(() => {
    if (!user && (activeView === 'profile' || activeView === 'admin-panel' || activeView === 'teacher-panel')) {
      setActiveView('landing');
    }
  }, [user, activeView, setActiveView]);

  const handleUpdatePreferences = useCallback((next: AppPreferences) => {
    setPreferencesState(next);
    saveAppPreferences(next);
  }, []);

  const handleUpdateErPreferences = useCallback((patch: Partial<ERStudioPreferences>) => {
    setPreferencesState((prev) => {
      const updated: AppPreferences = {
        ...prev,
        er: { ...prev.er, ...patch },
      };
      saveAppPreferences(updated);
      return updated;
    });
  }, []);

  // Ouve navegação por hash e links compartilhados (#z. / #u.)
  const checkAndApplySharedSchema = useCallback(async (hashStr: string) => {
    const clean = (hashStr || '').replace(/^#\/?/, '');
    if (!clean.startsWith('z.') && !clean.startsWith('u.')) {
      return false;
    }
    const decoded = await decodeSharedSchemaHash(hashStr);
    if (decoded) {
      const newTabId = `tab-shared-${Date.now()}`;
      const title = decoded.title || 'esquema_compartilhado.sql';
      setTabs((prev) => [
        ...prev,
        { id: newTabId, title, content: decoded.sql },
      ]);
      setActiveTabId(newTabId);
      setActiveView('workspace');
      setWorkspaceLayoutMode('split');
      return true;
    }
    return false;
  }, [setActiveView]);

  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      const isShared = await checkAndApplySharedSchema(hash);
      if (isShared) return;

      const parsed = parseActiveViewFromHash(hash);
      if (parsed) {
        setActiveViewState(parsed);
        try { localStorage.setItem('sqleditor_active_view', parsed); } catch (_) {}
      } else if (!hash) {
        setActiveViewState('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [checkAndApplySharedSchema]);

  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>('');
  const [currentPreset, setCurrentPreset] = useState<DatabasePreset>('empty');
  const [tabs, setTabs] = useState<TabItem[]>(INITIAL_TABS);
  const tabsRef = useRef<TabItem[]>(tabs);
  tabsRef.current = tabs;

  // Estados de Sala de Aula, Modo Avaliação e Materiais/Scripts Salvos
  const [activeClassroomMode, setActiveClassroomMode] = useState<ClassroomMode>('normal');
  const [activeClassName, setActiveClassName] = useState<string>('');
  const [isExamModeActive, setIsExamModeActive] = useState<boolean>(false);
  const isExamModeActiveRef = useRef<boolean>(false);
  const [teacherClasses, setTeacherClasses] = useState<ClassItem[]>([]);
  const [savedScripts, setSavedScripts] = useState<SavedScriptItem[]>([]);
  const [classExamples, setClassExamples] = useState<SavedScriptItem[]>([]);
  const [classExercises, setClassExercises] = useState<SavedScriptItem[]>([]);
  const [classExams, setClassExams] = useState<SavedScriptItem[]>([]);
  const [teacherClassDbs, setTeacherClassDbs] = useState<SavedScriptItem[]>([]);

  // Modal de Recuperação pós-avaliação
  const [isPostExamRecoveryOpen, setIsPostExamRecoveryOpen] = useState<boolean>(false);
  const [tempRecoveryScripts, setTempRecoveryScripts] = useState<SavedScriptItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [executedTabId, setExecutedTabId] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('sqleditor_theme') as ThemeMode;
      if (['dark', 'light', 'beige', 'graphite'].includes(saved)) return saved;
    } catch (_) {}
    return 'dark';
  });
  const [fontTheme, setFontTheme] = useState<FontTheme>(() => {
    try {
      const saved = localStorage.getItem('sqleditor_font_theme') as FontTheme;
      if (['solar', 'cyber', 'matrix', 'synthwave'].includes(saved)) return saved;
    } catch (_) {}
    return 'solar';
  });
  const [zoomLevels, setZoomLevels] = useState<ZoomLevels>({
    sidebar: 100,
    editor: 100,
    console: 100,
  });
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);

  // Progresso de Carregamento Assíncrono dos Bancos da Aula
  const [loadingProgress, setLoadingProgress] = useState<Record<string, DatabaseLoadProgress> | null>(null);
  const [isClassLoading, setIsClassLoading] = useState<boolean>(false);

  // Soluções de aula disponíveis
  const solutions = useMemo(() => getAvailableSolutions(), []);

  // Aba de Revisão e Aba Ativa no Console
  const [sqlReview, setSqlReview] = useState<SqlReview | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTab>('data');

  // Tabela selecionada e limite ativo de visualização na aba Dados
  const [selectedTable, setSelectedTable] = useState<{ dbName: string; tableName: string } | null>(null);
  const [tablePreviewData, setTablePreviewData] = useState<TablePreviewData | null>(null);
  const [dataPreviewLimit, setDataPreviewLimit] = useState<DataPreviewLimit>(
    preferences.editor.defaultDataPreviewLimit
  );
  const dataPreviewLimitRef = useRef<DataPreviewLimit>(preferences.editor.defaultDataPreviewLimit);
  const selectedTableRef = useRef<{ dbName: string; tableName: string } | null>(null);

  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);
  useEffect(() => {
    dataPreviewLimitRef.current = dataPreviewLimit;
  }, [dataPreviewLimit]);

  // Referência do Monaco Editor
  const editorRef = useRef<any>(null);

  // Redimensionamento de Painéis
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [editorHeightPercent, setEditorHeightPercent] = useState<number>(60);
  const isResizingSidebar = useRef(false);
  const isResizingEditor = useRef(false);

  // Painéis Visíveis (Sidebar, Scripts, Info)
  const [visiblePanels, setVisiblePanels] = useState<VisiblePanels>(() => {
    try {
      const saved = localStorage.getItem('sqleditor_visible_panels');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return { sidebar: true, scripts: true, info: true };
  });

  const handleTogglePanel = useCallback((panel: keyof VisiblePanels) => {
    setVisiblePanels(prev => {
      const next = { ...prev, [panel]: !prev[panel] };
      try {
        localStorage.setItem('sqleditor_visible_panels', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const handleShowAllPanels = useCallback(() => {
    const all = { sidebar: true, scripts: true, info: true };
    setVisiblePanels(all);
    try {
      localStorage.setItem('sqleditor_visible_panels', JSON.stringify(all));
    } catch (_) {}
  }, []);

  // Carrega e restaura estado persistente ao inicializar
  useEffect(() => {
    const initApp = async () => {
      await dbEngine.initialize();
      const currentActiveDb = dbEngine.getActiveDatabase();
      setActiveDatabase(currentActiveDb);
      setCurrentPreset(dbEngine.getPreset());

      const tree = await dbEngine.getSchemaTree();
      setSchemas(tree);

      // Verifica se a URL contém esquema compartilhado (#z. / #u.)
      if (typeof window !== 'undefined' && window.location.hash) {
        const isShared = await checkAndApplySharedSchema(window.location.hash);
        if (isShared) return;
      }

      // Restaura workspace salvo do IndexedDB
      try {
        const savedWs = await dbStorage.workspace.get('current_workspace');
        if (savedWs) {
          if (savedWs.tabs && savedWs.tabs.length > 0) {
            setTabs(savedWs.tabs);
            setActiveTabId(savedWs.activeTabId || savedWs.tabs[0].id);
          }
          if (savedWs.zoomLevels) setZoomLevels(savedWs.zoomLevels);
          if (savedWs.theme) {
            setTheme(savedWs.theme);
            document.documentElement.className = savedWs.theme;
          }
          if (savedWs.fontTheme) {
            setFontTheme(savedWs.fontTheme);
            document.documentElement.setAttribute('data-font-theme', savedWs.fontTheme);
          }
          if (savedWs.activeDatabase) {
            setActiveDatabase(savedWs.activeDatabase);
            dbEngine.setActiveDatabase(savedWs.activeDatabase);
          }
          if (savedWs.sidebarWidth) {
            setSidebarWidth(savedWs.sidebarWidth);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar workspace salvo:', err);
      }
    };

    initApp();
  }, [checkAndApplySharedSchema]);

  // Sincroniza classes, tema de letras e preferência de movimento reduzido no elemento raiz HTML
  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.setAttribute('data-font-theme', fontTheme);
    document.documentElement.setAttribute(
      'data-reduced-motion',
      preferences.ui.reducedMotionAndGlow ? 'true' : 'false'
    );
  }, [theme, fontTheme, preferences.ui.reducedMotionAndGlow]);

  // Salva estado do workspace automaticamente no IndexedDB
  const persistWorkspace = useCallback(async () => {
    try {
      await dbStorage.workspace.put({
        id: 'current_workspace',
        tabs,
        activeTabId,
        zoomLevels,
        theme,
        fontTheme,
        activeDatabase,
        sidebarWidth,
      });
    } catch (_) {}
  }, [tabs, activeTabId, zoomLevels, theme, fontTheme, activeDatabase, sidebarWidth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      persistWorkspace();
    }, 500);
    return () => clearTimeout(timer);
  }, [persistWorkspace]);

  // Seleção e carregamento de dados da tabela respeitando o limite ativo (Limit 30, Limit 100 ou Total)
  const handleSelectTable = useCallback(async (
    dbName: string,
    tableName: string,
    switchToDataTab: boolean = true,
    overrideLimit?: DataPreviewLimit
  ) => {
    const effectiveLimit = overrideLimit !== undefined ? overrideLimit : dataPreviewLimitRef.current;
    setSelectedTable({ dbName, tableName });
    if (switchToDataTab) {
      setActiveConsoleTab('data');
    }
    setTablePreviewData(prev => ({
      dbName,
      tableName,
      columns: prev?.tableName === tableName && prev?.dbName === dbName ? prev.columns : [],
      rows: prev?.tableName === tableName && prev?.dbName === dbName ? prev.rows : [],
      totalRows: prev?.tableName === tableName && prev?.dbName === dbName ? prev.totalRows : 0,
      isLoading: true,
    }));
    try {
      const preview = await dbEngine.getTablePreviewData(dbName, tableName, effectiveLimit);
      setTablePreviewData({
        dbName,
        tableName,
        columns: preview.columns,
        rows: preview.rows,
        totalRows: preview.totalRows,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Erro ao carregar preview da tabela:', err);
      setTablePreviewData({
        dbName,
        tableName,
        columns: [],
        rows: [],
        totalRows: 0,
        isLoading: false,
      });
    }
  }, []);

  const handleRefreshTablePreview = useCallback(async () => {
    if (selectedTableRef.current) {
      const { dbName, tableName } = selectedTableRef.current;
      await handleSelectTable(dbName, tableName, false);
    }
  }, [handleSelectTable]);

  // Alterna ciclicamente na aba Dados: Limit 30 -> Limit 100 -> Total -> Limit 30
  const handleCycleDataPreviewLimit = useCallback(async () => {
    const current = dataPreviewLimitRef.current;
    const nextLimit: DataPreviewLimit = current === 30 ? 100 : current === 100 ? null : 30;
    dataPreviewLimitRef.current = nextLimit;
    setDataPreviewLimit(nextLimit);

    if (selectedTableRef.current) {
      const { dbName, tableName } = selectedTableRef.current;
      await handleSelectTable(dbName, tableName, false, nextLimit);
    }
  }, [handleSelectTable]);

  // Recarregar schemas
  const refreshSchemas = useCallback(async () => {
    const tree = await dbEngine.getSchemaTree();
    setSchemas([...tree]);
    const currentActive = dbEngine.getActiveDatabase();
    if (currentActive) {
      setActiveDatabase(currentActive);
    }

    if (selectedTableRef.current) {
      const { dbName, tableName } = selectedTableRef.current;
      const dbFound = tree.find(d => d.name.toLowerCase() === dbName.toLowerCase());
      const tableFound = dbFound?.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (tableFound) {
        try {
          const preview = await dbEngine.getTablePreviewData(dbName, tableName, dataPreviewLimitRef.current);
          setTablePreviewData({
            dbName,
            tableName,
            columns: preview.columns,
            rows: preview.rows,
            totalRows: preview.totalRows,
            isLoading: false,
          });
        } catch (_) {}
      }
    }
  }, []);

  // Seleção automática da primeira tabela disponível
  useEffect(() => {
    if (!selectedTable && schemas.length > 0) {
      const activeDbObj = schemas.find(d => d.name === activeDatabase && d.tables.length > 0);
      const targetDb = activeDbObj || schemas.find(d => d.tables.length > 0);
      if (targetDb && targetDb.tables.length > 0) {
        handleSelectTable(targetDb.name, targetDb.tables[0].name, false);
      }
    }
  }, [schemas, activeDatabase, selectedTable, handleSelectTable]);

  // Executar query completa
  const handleRunQuery = useCallback(async () => {
    const activeCode = editorRef.current ? editorRef.current.getValue() : (tabs.find(t => t.id === activeTabId)?.content || '');
    if (!activeCode.trim()) return;

    setIsExecuting(true);
    try {
      const res = await dbEngine.executeScript(activeCode, 1);
      setResults(res);
      setExecutedTabId(activeTabId);
      setSelectedResultIndex(Math.max(0, res.length - 1));
      await refreshSchemas();
      setActiveConsoleTab('grid');

      if (res.length > 0 && res.every(r => r.status === 'success')) {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.1, x: 0.8 },
          colors: ['#FF6B00', '#FFE600', '#00E676'],
        });
      }
    } catch (err: any) {
      setResults([
        {
          statement: activeCode,
          columns: [],
          rows: [],
          executionTimeMs: 0,
          status: 'error',
          errorMessage: err?.message || String(err),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: activeDatabase,
          commandIndex: 0,
          startLine: 1,
        },
      ]);
      setExecutedTabId(activeTabId);
      setSelectedResultIndex(0);
      setActiveConsoleTab('grid');
    } finally {
      setIsExecuting(false);
    }
  }, [tabs, activeTabId, activeDatabase, refreshSchemas]);

  // Executar somente trecho selecionado ou comando na linha do cursor (Alt+E)
  const handleRunSnippet = useCallback(async (snippet: string, baseStartLine: number = 1) => {
    if (!snippet.trim()) return;

    setIsExecuting(true);
    try {
      const res = await dbEngine.executeScript(snippet, baseStartLine);
      setResults(res);
      setExecutedTabId(activeTabId);
      setSelectedResultIndex(Math.max(0, res.length - 1));
      await refreshSchemas();
      setActiveConsoleTab('grid');

      if (res.length > 0 && res.every(r => r.status === 'success')) {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.1, x: 0.8 },
          colors: ['#FF6B00', '#FFE600', '#00E676'],
        });
      }
    } catch (err: any) {
      setResults([
        {
          statement: snippet,
          columns: [],
          rows: [],
          executionTimeMs: 0,
          status: 'error',
          errorMessage: err?.message || String(err),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: activeDatabase,
          commandIndex: 0,
          startLine: baseStartLine,
        },
      ]);
      setExecutedTabId(activeTabId);
      setSelectedResultIndex(0);
      setActiveConsoleTab('grid');
    } finally {
      setIsExecuting(false);
    }
  }, [refreshSchemas, activeDatabase, activeTabId]);

  // Seleção de aba sincronizando banco ativo
  const handleSelectTab = useCallback((id: string) => {
    setActiveTabId(id);
    const targetTab = tabs.find(t => t.id === id);
    if (targetTab && targetTab.content) {
      const detectedDb = findActiveDatabaseAtPosition(targetTab.content);
      if (detectedDb) {
        const matchedDb = schemas.find(s => s.name.toLowerCase() === detectedDb.toLowerCase());
        const finalDb = matchedDb ? matchedDb.name : detectedDb;
        dbEngine.setActiveDatabase(finalDb);
        setActiveDatabase(finalDb);
      }
    }
  }, [tabs, schemas]);

  // Executar trecho onde o cursor está posicionado
  const handleRunCurrentSnippet = useCallback(() => {
    const ed = editorRef.current;
    if (ed) {
      const model = ed.getModel();
      const pos = ed.getPosition();

      if (model && pos) {
        const detectedDb = findActiveDatabaseAtPosition(model.getValue(), pos);
        if (detectedDb) {
          const matchedDb = schemas.find(s => s.name.toLowerCase() === detectedDb.toLowerCase());
          const finalDb = matchedDb ? matchedDb.name : detectedDb;
          if (finalDb !== activeDatabase) {
            dbEngine.setActiveDatabase(finalDb);
            setActiveDatabase(finalDb);
          }
        }
      }

      const sel = ed.getSelection();
      if (sel && !sel.isEmpty()) {
        const text = model?.getValueInRange(sel);
        if (text && text.trim()) {
          handleRunSnippet(text.trim(), sel.startLineNumber);
          return;
        }
      }
      if (model && pos) {
        const extracted = extractStatementAtCursor(model.getValue(), pos);
        if (extracted && extracted.statement.trim()) {
          handleRunSnippet(extracted.statement.trim(), extracted.startLine);
          return;
        }
      }
    }
    handleRunQuery();
  }, [handleRunSnippet, handleRunQuery, schemas, activeDatabase]);

  const handleEditorSelectResultIndex = useCallback((index: number, fromGutterClick?: boolean) => {
    setSelectedResultIndex(index);
    if (fromGutterClick) {
      setActiveConsoleTab('grid');
    }
  }, []);

  const handleConsoleSelectResultIndex = useCallback((index: number, revealInEditor?: boolean) => {
    setSelectedResultIndex(index);
    if (revealInEditor && editorRef.current && activeTabId === executedTabId) {
      const targetLine = results[index]?.startLine;
      if (targetLine) {
        editorRef.current.revealLineInCenterIfOutsideViewport(targetLine);
      }
    }
  }, [results, activeTabId, executedTabId]);

  const handleUpdateTabContent = useCallback((id: string, content: string) => {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, content, isDirty: true } : t))
    );
  }, []);

  // Aplicação cirúrgica de patch DDL vindo do DER no Monaco Editor
  const handleApplySurgicalSqlPatch = useCallback(async (
    patch: SurgicalSqlPatch,
    executeInAlaSql?: boolean
  ) => {
    const ed = editorRef.current;
    const model = ed?.getModel?.();

    if (ed && model && activeTabId) {
      const startPos = model.getPositionAt(patch.startOffset);
      const endPos = model.getPositionAt(patch.endOffset);
      ed.pushUndoStop();
      ed.executeEdits('er-visual-ddl', [
        {
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          text: patch.replacementText,
          forceMoveMarkers: true,
        },
      ]);
      ed.pushUndoStop();
      const updatedVal = model.getValue();
      handleUpdateTabContent(activeTabId, updatedVal);
    } else if (activeTabId) {
      handleUpdateTabContent(activeTabId, patch.newFullSql);
    }

    if (executeInAlaSql) {
      try {
        await dbEngine.executeScript(patch.replacementText);
        await refreshSchemas();
      } catch (err) {
        console.warn('Erro ao sincronizar DDL visual no AlaSQL:', err);
      }
    }
  }, [activeTabId, handleUpdateTabContent, refreshSchemas]);

  // Revisar trecho selecionado
  const handleReviewSnippet = useCallback((
    snippet: string,
    runtimeError?: string,
    targetOrHintLine?: ReviewTargetRange | number
  ) => {
    if (!snippet.trim()) return;

    let resolvedRange: ReviewTargetRange | undefined;
    if (targetOrHintLine && typeof targetOrHintLine === 'object') {
      resolvedRange = targetOrHintLine;
    } else {
      const targetTabId = executedTabId || activeTabId;
      const fullText =
        editorRef.current && targetTabId === activeTabId
          ? editorRef.current.getValue()
          : tabs.find(t => t.id === targetTabId)?.content || '';
      const hintLine = typeof targetOrHintLine === 'number' ? targetOrHintLine : undefined;
      resolvedRange = resolveReviewTargetRange(fullText, snippet, targetTabId, hintLine);
    }

    const rev = reviewSqlQuery(snippet, activeDatabase, schemas, runtimeError);
    setSqlReview({
      ...rev,
      targetRange: resolvedRange,
    });
    setActiveConsoleTab('review');
  }, [activeDatabase, schemas, executedTabId, activeTabId, tabs]);

  // Aplicar sugestão da revisão cirurgicamente
  const handleApplyReviewSuggestion = useCallback((suggestedSql: string) => {
    const cleanSuggested = suggestedSql.trim();
    if (!cleanSuggested) return;

    const targetTabId = sqlReview?.targetRange?.tabId || activeTabId;
    const isCurrentTab = targetTabId === activeTabId;
    const ed = isCurrentTab ? editorRef.current : null;
    const model = ed?.getModel?.();

    const fullText = model
      ? model.getValue()
      : tabs.find(t => t.id === targetTabId)?.content || '';

    const originalQuery = sqlReview?.originalQuery || '';
    const replacement = applySuggestedSqlToScript(
      fullText,
      originalQuery,
      cleanSuggested,
      sqlReview?.targetRange
    );

    if (replacement) {
      if (ed && model) {
        ed.pushUndoStop();
        ed.executeEdits('review-apply', [
          {
            range: {
              startLineNumber: replacement.startLine,
              startColumn: replacement.startColumn,
              endLineNumber: replacement.endLine,
              endColumn: replacement.endColumn,
            },
            text: replacement.replacementText,
            forceMoveMarkers: true,
          },
        ]);
        ed.pushUndoStop();
        const updatedValue = model.getValue();
        handleUpdateTabContent(targetTabId, updatedValue);
        ed.revealLineInCenterIfOutsideViewport(replacement.startLine);
        ed.setPosition({
          lineNumber: replacement.startLine,
          column: replacement.startColumn + replacement.replacementText.length,
        });
        ed.focus();
      } else {
        handleUpdateTabContent(targetTabId, replacement.newFullText);
        if (!isCurrentTab) {
          setActiveTabId(targetTabId);
        }
      }
    } else if (ed && model) {
      const selection = ed.getSelection();
      if (selection) {
        ed.pushUndoStop();
        ed.executeEdits('review-apply', [{ range: selection, text: cleanSuggested, forceMoveMarkers: true }]);
        ed.pushUndoStop();
        handleUpdateTabContent(activeTabId, model.getValue());
        ed.focus();
      }
    }
  }, [sqlReview, activeTabId, tabs, handleUpdateTabContent]);

  // Nova Aba
  const handleNewTab = useCallback((initialContent?: string, tabName?: string, savedScriptId?: string) => {
    const newId = `tab-${Date.now()}`;
    const nextNum = tabs.length + 1;
    const defaultContent = activeDatabase
      ? `-- Novo script SQL\nUSE \`${activeDatabase}\`;\n\n`
      : `-- Novo script SQL\n\n`;
    const newTab: TabItem = {
      id: newId,
      title: tabName || `script_${nextNum}.sql`,
      content: initialContent !== undefined ? initialContent : defaultContent,
      savedScriptId,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    if (activeView !== 'workspace') {
      setActiveView('workspace');
    }
  }, [tabs.length, activeDatabase, activeView, setActiveView]);

  const handleNewBlankTab = useCallback(() => {
    handleNewTab('');
  }, [handleNewTab]);

  const handleOpenSolution = useCallback((solution: SolutionItem) => {
    handleNewTab(solution.content, solution.fileName);
  }, [handleNewTab]);

  const handleCloseAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId('');
  }, []);

  const handleCloseOtherTabs = useCallback((keepId: string) => {
    setTabs(prev => prev.filter(t => t.id === keepId));
    setActiveTabId(keepId);
  }, []);

  // Carregar Preset do Schema Explorer
  const handleLoadPreset = useCallback(async (
    preset: DatabasePreset,
    customScripts?: { title: string; content: string }[]
  ) => {
    setIsExecuting(true);
    if (preset === 'class') {
      setIsClassLoading(true);
    }

    let effectiveCustomScripts = customScripts;
    if (!effectiveCustomScripts) {
      if (preset === 'teacher_class') {
        effectiveCustomScripts = teacherClassDbs.map(s => ({ title: s.title, content: s.content }));
      } else if (preset === 'exam') {
        effectiveCustomScripts = classExams.map(s => ({ title: s.title, content: s.content }));
      }
    }

    await dbEngine.loadPreset(preset, (progressMap, completedCount) => {
      setLoadingProgress({ ...progressMap });
      if (completedCount > 0) {
        dbEngine.getSchemaTree().then(tree => {
          setSchemas(tree);
        });
      }
    }, effectiveCustomScripts);

    setCurrentPreset(preset);
    await refreshSchemas();
    const newActiveDb = dbEngine.getActiveDatabase();
    setActiveDatabase(newActiveDb);

    let presetLabel = 'Vazio';
    if (preset === 'samples') presetLabel = 'BDs de Exemplo (ecommerce_db, universidade_db)';
    if (preset === 'class') presetLabel = 'BDs da Aula (Professor)';
    if (preset === 'teacher_class') presetLabel = 'BDs Aula Professor (Turma)';
    if (preset === 'exam') presetLabel = 'BDs da Avaliação';

    setResults([
      {
        statement: `LOAD PRESET: ${preset.toUpperCase()};`,
        columns: ['Status', 'Ambiente Ativo', 'Banco de Dados', 'Modo'],
        rows: [{
          Status: 'Ambiente carregado com sucesso!',
          'Ambiente Ativo': presetLabel,
          'Banco de Dados': newActiveDb || '(nenhum banco ativo)',
          'Modo': 'Carregamento Assíncrono com Progresso (100%)'
        }],
        executionTimeMs: 15,
        status: 'success',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        database: newActiveDb,
      },
    ]);
    setSelectedResultIndex(0);
    setExecutedTabId('');
    setActiveConsoleTab('grid');
    setIsExecuting(false);

    setTimeout(() => {
      setLoadingProgress(null);
      setIsClassLoading(false);
    }, 1800);
  }, [refreshSchemas, teacherClassDbs, classExams]);

  const handleReloadAllDatabases = useCallback(async () => {
    const preset = dbEngine.getPreset();
    await handleLoadPreset(preset);
  }, [handleLoadPreset]);

  const handleCreateDatabase = useCallback(async (name: string) => {
    try {
      await dbEngine.createDatabase(name);
      await refreshSchemas();
      setActiveDatabase(name);
      handleNewTab(`-- Novo Banco de Dados: ${name}\nUSE \`${name}\`;\n\nCREATE TABLE exemplo (\n  id INT PRIMARY KEY,\n  nome VARCHAR(100)\n);\n`, `${name}.sql`);
    } catch (err: any) {
      alert('Erro ao criar banco de dados: ' + (err?.message || err));
    }
  }, [refreshSchemas, handleNewTab]);

  const handleCloseTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : '');
      }
      return next;
    });
  }, [activeTabId]);

  // 1. Recarrega scripts do usuário e materiais de aula
  const reloadAllScripts = useCallback(async () => {
    if (!user) {
      setSavedScripts([]);
      setClassExamples([]);
      setClassExercises([]);
      setClassExams([]);
      setTeacherClassDbs([]);
      return;
    }

    try {
      // Scripts salvos pelo próprio usuário
      const myScripts = await getUserSavedScripts(user.uid);
      setSavedScripts(myScripts.filter(s => !s.isTemporary));

      // Se for professor ou admin, busca também as turmas lecionadas
      if (userProfile?.role === 'admin') {
        const classes = await getAllClasses();
        setTeacherClasses(classes);
      } else if (userProfile?.role === 'professor') {
        const classes = await getClassesByTeacher(user.uid);
        setTeacherClasses(classes);
      }

      // Se estiver matriculado em uma turma
      const classId = userProfile?.classId;
      if (classId) {
        const allClassScripts = await getClassScripts(classId);
        setClassExamples(allClassScripts.filter(s => s.category === 'example'));
        setClassExercises(allClassScripts.filter(s => s.category === 'exercise'));
        setClassExams(allClassScripts.filter(s => s.category === 'exam'));
        setTeacherClassDbs(allClassScripts.filter(s => s.category === 'class_database'));
      }
    } catch (err) {
      console.warn('[reloadAllScripts Warning]', err);
    }
  }, [user, userProfile?.classId, userProfile?.role, userProfile?.uid]);

  useEffect(() => {
    reloadAllScripts();
  }, [reloadAllScripts]);

  // Atualização otimista e sincronizada de scripts salvos pelo usuário
  const handleScriptSaved = useCallback((savedScript?: SavedScriptItem) => {
    if (savedScript) {
      setSavedScripts((prev) => [
        savedScript,
        ...prev.filter((s) => s.id !== savedScript.id),
      ]);
    }
    reloadAllScripts();
  }, [reloadAllScripts]);

  // 2. Ouve alterações da turma do aluno em tempo real (Modo Sala de Aula / Modo Avaliação)
  useEffect(() => {
    const classId = userProfile?.classId;
    const isStudent = userProfile?.role === 'aluno';

    if (!classId || !isStudent) {
      setActiveClassroomMode('normal');
      setIsExamModeActive(false);
      isExamModeActiveRef.current = false;
      return;
    }

    const unsubscribe = subscribeToClass(classId, async (classData) => {
      if (!classData) return;
      const newMode: ClassroomMode = classData.classroomMode || 'normal';
      setActiveClassroomMode(newMode);
      setActiveClassName(classData.name || '');

      const wasInExam = isExamModeActiveRef.current;
      const willBeInExam = newMode === 'exam';

      if (willBeInExam && !wasInExam) {
        // ENTRANDO NO MODO AVALIAÇÃO:
        isExamModeActiveRef.current = true;
        setIsExamModeActive(true);

        // A. Faz backup de todas as abas abertas no perfil como temporárias
        try {
          const currentTabs = tabsRef.current;
          for (const tab of currentTabs) {
            await saveScript({
              title: tab.title,
              content: tab.content,
              authorUid: user!.uid,
              authorName: userProfile.displayName || 'Aluno',
              authorEmail: userProfile.email || '',
              authorRole: userProfile.role || 'aluno',
              category: 'student_saved',
              isTemporary: true,
              classIds: [classData.id],
            });
          }
        } catch (backupErr) {
          console.warn('[Exam Mode Backup Error]', backupErr);
        }

        // B. Fecha todas as abas atuais
        setTabs([]);
        setActiveTabId('');

        // C. Carrega scripts oficiais de prova da turma
        try {
          const examScripts = await getClassScripts(classData.id, 'exam');
          if (examScripts.length > 0) {
            const newExamTabs: TabItem[] = examScripts.map((s) => ({
              id: s.id,
              title: s.title,
              content: s.content,
            }));
            setTabs(newExamTabs);
            setActiveTabId(newExamTabs[0].id);
          } else {
            const defaultExamTab: TabItem = {
              id: `tab-exam-${Date.now()}`,
              title: 'avaliacao_respostas.sql',
              content: `-- AVALIAÇÃO DA TURMA: ${classData.name}\n-- Digite suas respostas SQL abaixo e salve no seu perfil com Ctrl+S.\n\n`,
            };
            setTabs([defaultExamTab]);
            setActiveTabId(defaultExamTab.id);
          }
        } catch (loadErr) {
          console.warn('[Exam Scripts Load Error]', loadErr);
        }

        // D. Carrega BDs de avaliação
        try {
          const examDbScripts = (await getClassScripts(classData.id, 'exam')).map(s => ({
            title: s.title,
            content: s.content,
          }));
          await handleLoadPreset('exam', examDbScripts);
        } catch (presetErr) {
          console.warn('[Exam Preset Load Error]', presetErr);
        }
      } else if (!willBeInExam && wasInExam) {
        // SAINDO DO MODO AVALIAÇÃO:
        isExamModeActiveRef.current = false;
        setIsExamModeActive(false);

        // Verifica se há scripts temporários para restaurar
        try {
          const userScripts = await getUserSavedScripts(user!.uid);
          const tempOnly = userScripts.filter(s => s.isTemporary);
          if (tempOnly.length > 0) {
            setTempRecoveryScripts(tempOnly);
            setIsPostExamRecoveryOpen(true);
          }
        } catch (checkErr) {
          console.warn('[Post Exam Check Error]', checkErr);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, userProfile?.classId, userProfile?.role, userProfile?.displayName, userProfile?.email, handleLoadPreset]);

  // 3. Entregar Avaliação (Aluno envia todas as abas atuais)
  const handleDeliverExam = useCallback(async () => {
    if (!user || !userProfile || !userProfile.classId) return;
    if (!window.confirm('Deseja realmente entregar sua avaliação agora? O professor receberá todas as suas respostas salvas.')) return;

    try {
      setIsExecuting(true);
      const currentTabs = tabsRef.current;
      const combinedContent = currentTabs
        .map(t => `-- === ABA: ${t.title} ===\n${t.content || ''}\n`)
        .join('\n\n');

      await submitExam({
        classId: userProfile.classId,
        className: activeClassName || 'Turma',
        studentUid: user.uid,
        studentName: userProfile.displayName || 'Aluno',
        studentEmail: userProfile.email || '',
        examTitle: activeClassName ? `Avaliação ${activeClassName}` : 'Avaliação SQL',
        content: combinedContent,
      });
      alert('Avaliação entregue com sucesso! Suas respostas foram enviadas ao professor.');
    } catch (err: any) {
      console.error('[handleDeliverExam Error]', err);
      alert('Erro ao entregar avaliação: ' + (err?.message || 'Erro inesperado'));
    } finally {
      setIsExecuting(false);
    }
  }, [user, userProfile, activeClassName]);

  // Limpar Editor
  const handleClearEditor = useCallback(() => {
    if (!activeTabId) return;
    const needsConfirm = preferences.editor.confirmBeforeClear;
    if (needsConfirm && !window.confirm('Tem certeza que deseja limpar todo o conteúdo do script atual?')) {
      return;
    }

    const ed = editorRef.current;
    const model = ed?.getModel?.();
    if (ed && model && model.getValue().length > 0) {
      ed.pushUndoStop();
      ed.executeEdits('clear-editor', [
        {
          range: model.getFullModelRange(),
          text: '',
          forceMoveMarkers: true,
        },
      ]);
      ed.pushUndoStop();
      ed.focus();
    }

    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, content: '', isDirty: true } : t))
    );
  }, [activeTabId, preferences.editor.confirmBeforeClear]);

  // Resetar Banco de Dados
  const handleResetDb = useCallback(async () => {
    const preset = dbEngine.getPreset();
    let presetLabel = 'Vazio (sem bancos)';
    if (preset === 'samples') presetLabel = 'BDs de Exemplo (ecommerce_db e universidade_db)';
    if (preset === 'class') presetLabel = 'BDs da Aula (Professor)';

    if (confirm(`Deseja restaurar o banco de dados para o estado original da opção selecionada (${presetLabel})? Todas as alterações locais serão substituídas.`)) {
      setIsExecuting(true);
      if (preset === 'class') {
        setIsClassLoading(true);
      }
      await dbEngine.resetDatabase((progressMap, completedCount) => {
        setLoadingProgress({ ...progressMap });
        if (completedCount > 0) {
          dbEngine.getSchemaTree().then(tree => setSchemas(tree));
        }
      });
      await refreshSchemas();
      const newActiveDb = dbEngine.getActiveDatabase();
      setActiveDatabase(newActiveDb);

      setResults([
        {
          statement: 'RESTORE DATABASE STATE;',
          columns: ['Status', 'Modo Restaurado', 'Banco de Dados'],
          rows: [{
            Status: 'Banco restaurado com sucesso para o estado original da opção selecionada!',
            'Modo Restaurado': presetLabel,
            'Banco de Dados': newActiveDb || '(nenhum banco ativo)'
          }],
          executionTimeMs: 10,
          status: 'success',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: newActiveDb,
        },
      ]);
      setSelectedResultIndex(0);
      setExecutedTabId('');
      setActiveConsoleTab('grid');
      setIsExecuting(false);

      setTimeout(() => {
        setLoadingProgress(null);
        setIsClassLoading(false);
      }, 1800);
    }
  }, [refreshSchemas]);

  const handleThemeChange = useCallback((newTheme: ThemeMode) => {
    setTheme(newTheme);
    document.documentElement.className = newTheme;
    try {
      localStorage.setItem('sqleditor_theme', newTheme);
    } catch (_) {}
  }, []);

  const handleFontThemeChange = useCallback((newFontTheme: FontTheme) => {
    setFontTheme(newFontTheme);
    document.documentElement.setAttribute('data-font-theme', newFontTheme);
    try {
      localStorage.setItem('sqleditor_font_theme', newFontTheme);
    } catch (_) {}
  }, []);

  const handleToggleFontTheme = useCallback(() => {
    const cycle: FontTheme[] = ['solar', 'cyber', 'matrix', 'synthwave'];
    setFontTheme(prev => {
      const next = cycle[(cycle.indexOf(prev) + 1) % cycle.length];
      document.documentElement.setAttribute('data-font-theme', next);
      try {
        localStorage.setItem('sqleditor_font_theme', next);
      } catch (_) {}
      return next;
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    const cycle: ThemeMode[] = ['dark', 'light', 'beige', 'graphite'];
    setTheme(prev => {
      const next = cycle[(cycle.indexOf(prev) + 1) % cycle.length];
      document.documentElement.className = next;
      try {
        localStorage.setItem('sqleditor_theme', next);
      } catch (_) {}
      return next;
    });
  }, []);

  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setTabs(prev =>
      prev.map(t => (t.id === tabId ? { ...t, title: trimmed } : t))
    );
  }, []);

  const handleExportScript = useCallback(() => {
    const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    if (!currentTab) return;
    const content = editorRef.current ? editorRef.current.getValue() : currentTab.content;
    const rawTitle = currentTab.title || 'script';
    const filename = rawTitle.endsWith('.sql') ? rawTitle : `${rawTitle}.sql`;

    const blob = new Blob([content || ''], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tabs, activeTabId]);

  // Integração da Galeria, Templates e Desafios com a IDE
  const handleInstantiateSqlAndOpenView = useCallback(async (params: {
    title?: string;
    dbName: string;
    sql: string;
    targetView: 'er-diagram' | 'workspace' | 'er-model';
    enableSplitView?: boolean;
    onProgress?: (progress: { percent: number; label: string }) => void;
  }) => {
    setIsExecuting(true);
    try {
      params.onProgress?.({ percent: 15, label: 'Verificando estado do banco...' });

      const alreadyLoaded = dbEngine.isDatabaseLoaded(params.dbName);

      if (!alreadyLoaded && params.sql.trim()) {
        params.onProgress?.({ percent: 30, label: 'Compilando tabelas no motor AlaSQL...' });

        await dbEngine.executeScript(params.sql, 1, {
          recordHistory: false, // Não polui o histórico interativo do aluno com dezenas de INSERTs internos
          onProgress: (p) => {
            const mappedPct = 30 + Math.round((p.percent * 0.50)); // 30% a 80%
            params.onProgress?.({
              percent: mappedPct,
              label: `Instanciando tabelas e registros (${p.current}/${p.total})...`,
            });
          },
        });

        params.onProgress?.({ percent: 85, label: 'Atualizando catálogo de esquemas...' });
        await refreshSchemas();
      }

      params.onProgress?.({ percent: 92, label: 'Ativando contexto...' });
      if (params.dbName) {
        dbEngine.setActiveDatabase(params.dbName);
        setActiveDatabase(params.dbName);
      }

      const newTitle = params.title || `${params.dbName || 'modelo'}.sql`;
      const newTabId = `tab-template-${Date.now()}`;

      setTabs((prev) => {
        // Se já existe uma aba com o mesmo título e mesmo conteúdo, reutiliza para não duplicar abas
        const existing = prev.find((t) => t.title === newTitle && t.content === params.sql);
        if (existing) {
          setActiveTabId(existing.id);
          return prev;
        }
        return [
          ...prev,
          { id: newTabId, title: newTitle, content: params.sql },
        ];
      });
      setActiveTabId((curr) => (curr.startsWith('tab-template') ? newTabId : newTabId));

      if (params.enableSplitView && params.targetView === 'workspace') {
        setWorkspaceLayoutMode('split');
      }

      params.onProgress?.({ percent: 100, label: 'Concluído!' });
      // Pequeno timeout sutil para a barra completar 100% de forma visualmente fluida
      await new Promise((r) => setTimeout(r, 120));
      setActiveView(params.targetView);
    } finally {
      setIsExecuting(false);
    }
  }, [refreshSchemas, setActiveView]);

  const handleStartExercise = useCallback(async (exercise: PracticeExerciseItem) => {
    setActiveExercise(exercise);
    if (exercise.setupSql) {
      await dbEngine.executeScript(exercise.setupSql);
      await refreshSchemas();
    }
    const newTabId = `tab-ex-${exercise.id}`;
    const newTabTitle = `${exercise.id}.sql`;
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === newTabId);
      if (existing) return prev;
      return [
        ...prev,
        { id: newTabId, title: newTabTitle, content: exercise.starterSql },
      ];
    });
    setActiveTabId(newTabId);
    setActiveView('workspace');
    if (exercise.validationMode === 'schema-check') {
      setWorkspaceLayoutMode('split');
    } else {
      setWorkspaceLayoutMode('editor');
    }
  }, [refreshSchemas, setActiveView]);

  const handleRestoreSavedDiagram = useCallback(async (record: SavedERDiagramRecord) => {
    if (record.dbName) {
      dbEngine.setActiveDatabase(record.dbName);
      setActiveDatabase(record.dbName);
    }
    setActiveView('er-diagram');
  }, [setActiveView]);

  const handleRestoreSuperBackup = useCallback(async (summary: SuperBackupRestoreSummary) => {
    if (summary.restoredTheme) {
      handleThemeChange(summary.restoredTheme);
    }
    if (summary.restoredFontTheme) {
      handleFontThemeChange(summary.restoredFontTheme);
    }
    if (summary.restoredPreferences) {
      handleUpdatePreferences(summary.restoredPreferences);
    }
    if (summary.restoredWorkspace) {
      if (summary.restoredWorkspace.tabs && summary.restoredWorkspace.tabs.length > 0) {
        setTabs(summary.restoredWorkspace.tabs);
        setActiveTabId(summary.restoredWorkspace.activeTabId || summary.restoredWorkspace.tabs[0].id);
      }
      if (summary.restoredWorkspace.zoomLevels) setZoomLevels(summary.restoredWorkspace.zoomLevels);
      if (summary.restoredWorkspace.sidebarWidth) setSidebarWidth(summary.restoredWorkspace.sidebarWidth);
    }
    await refreshSchemas();
    const activeDb = dbEngine.getActiveDatabase();
    if (activeDb) setActiveDatabase(activeDb);
    setActiveView('workspace');
  }, [handleThemeChange, handleFontThemeChange, handleUpdatePreferences, refreshSchemas, setActiveView]);

  // Atalhos Globais de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleExportScript();
        return;
      }

      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleToggleFontTheme();
        return;
      }

      const isInsideMonaco = Boolean((e.target as HTMLElement | null)?.closest?.('.monaco-editor'));

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isInsideMonaco) return;
        e.preventDefault();
        handleRunQuery();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        if (isInsideMonaco) return;
        e.preventDefault();
        handleRunCurrentSnippet();
      }
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        if (isInsideMonaco) return;
        e.preventDefault();
        if (editorRef.current) {
          const ed = editorRef.current;
          const model = ed.getModel();
          const selection = ed.getSelection();
          let toReview = '';
          let targetRange: ReviewTargetRange | undefined;
          if (selection && !selection.isEmpty() && model) {
            const fullVal = model.getValue();
            const sOff = model.getOffsetAt({ lineNumber: selection.startLineNumber, column: selection.startColumn });
            const eOff = model.getOffsetAt({ lineNumber: selection.endLineNumber, column: selection.endColumn });
            const rawSel = fullVal.slice(sOff, eOff);
            const lead = rawSel.length - rawSel.trimStart().length;
            const trail = rawSel.length - rawSel.trimEnd().length;
            const sPos = model.getPositionAt(sOff + lead);
            const ePos = model.getPositionAt(Math.max(sOff + lead, eOff - trail));
            toReview = rawSel.trim();
            if (toReview) {
              targetRange = {
                tabId: activeTabId,
                startLine: sPos.lineNumber,
                startColumn: sPos.column,
                endLine: ePos.lineNumber,
                endColumn: ePos.column,
              };
            }
          } else if (model) {
            const pos = ed.getPosition();
            if (pos) {
              const extracted = extractStatementAtCursor(model.getValue(), pos);
              if (extracted) {
                toReview = extracted.statement;
                targetRange = {
                  tabId: activeTabId,
                  startLine: extracted.startLine,
                  startColumn: extracted.startColumn,
                  endLine: extracted.endLine,
                  endColumn: extracted.endColumn,
                };
              }
            }
          }
          if (!toReview.trim() && model) {
            toReview = model.getValue();
          }
          if (toReview.trim()) {
            handleReviewSnippet(toReview.trim(), undefined, targetRange);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, handleRunQuery, handleNewTab, handleRunCurrentSnippet, handleReviewSnippet, handleToggleTheme, handleToggleFontTheme, handleExportScript]);

  // Redimensionamento de Painéis (Mouse Listeners)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const maxSidebar = Math.min(window.innerWidth * 0.7, 750);
        const newWidth = Math.max(180, Math.min(maxSidebar, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingEditor.current) {
        const workspaceEl = document.getElementById('workspace-panel');
        if (workspaceEl) {
          const rect = workspaceEl.getBoundingClientRect();
          const offset = e.clientY - rect.top;
          const pct = Math.max(15, Math.min(85, (offset / rect.height) * 100));
          setEditorHeightPercent(pct);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingSidebar.current || isResizingEditor.current) {
        isResizingSidebar.current = false;
        isResizingEditor.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const editorWorkspaceSharedProps = {
    tabs,
    activeTabId,
    onSelectTab: handleSelectTab,
    onCloseTab: handleCloseTab,
    onCloseAllTabs: handleCloseAllTabs,
    onCloseOtherTabs: handleCloseOtherTabs,
    onNewBlankTab: handleNewBlankTab,
    onOpenSolution: handleOpenSolution,
    solutions,
    onUpdateContent: handleUpdateTabContent,
    onRunQuery: handleRunQuery,
    onRunSnippet: handleRunSnippet,
    onReviewSnippet: handleReviewSnippet,
    zoomLevel: zoomLevels.editor,
    onZoomIn: () => setZoomLevels(p => ({ ...p, editor: Math.min(400, p.editor + 10) })),
    onZoomOut: () => setZoomLevels(p => ({ ...p, editor: Math.max(50, p.editor - 10) })),
    onZoomReset: () => setZoomLevels(p => ({ ...p, editor: 100 })),
    theme,
    fontTheme,
    onRenameTab: handleRenameTab,
    onExportScript: handleExportScript,
    onToggleTheme: handleToggleTheme,
    onToggleFontTheme: handleToggleFontTheme,
    schemas,
    activeDatabase,
    editorRefOut: editorRef,
    onSelectDatabase: (db: string) => {
      dbEngine.setActiveDatabase(db);
      setActiveDatabase(db);
    },
    results,
    executedTabId,
    selectedResultIndex,
    onSelectResultIndex: handleEditorSelectResultIndex,
    preferences,
    user,
    userProfile,
    teacherClasses,
    isExamModeActive,
    classroomName: activeClassName,
    savedScripts,
    onSelectSavedScript: (script: SavedScriptItem) => handleNewTab(script.content, script.title, script.id),
    classExamples,
    classExercises,
    classExams,
    onDeliverExam: handleDeliverExam,
    onScriptSaved: handleScriptSaved,
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* 1. Página Inicial / Landing Page nos moldes do DrawDB */}
      {activeView === 'landing' ? (
        <div className="flex-1 w-full h-full overflow-y-auto">
          <LandingPageView
            onOpenEditor={() => {
              setActiveView('workspace');
              setIsHubModalOpen(true);
            }}
            onOpenView={(view) => setActiveView(view)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onInstantiateTemplate={(tplId) => {
              const found = solutions.find((s) => s.id === tplId);
              if (found) {
                handleOpenSolution(found);
              } else {
                setActiveView('gallery');
              }
            }}
          />
        </div>
      ) : (
        <>
          {/* Header Superior para o Editor e Ferramentas */}
          <Header
            activeView={activeView}
            onViewChange={setActiveView}
            visiblePanels={visiblePanels}
            onTogglePanel={handleTogglePanel}
            onRunQuery={handleRunQuery}
            onRunSnippet={handleRunCurrentSnippet}
            onNewBlankTab={handleNewBlankTab}
            onOpenSolution={handleOpenSolution}
            solutions={solutions}
            savedScripts={savedScripts}
            onSelectSavedScript={(script: SavedScriptItem) => handleNewTab(script.content, script.title, script.id)}
            classExamples={classExamples}
            classExercises={classExercises}
            classExams={classExams}
            isExamModeActive={isExamModeActive}
            onClearEditor={handleClearEditor}
            onCloseAllTabs={handleCloseAllTabs}
            onResetDb={handleResetDb}
            theme={theme}
            onThemeChange={handleThemeChange}
            onToggleTheme={handleToggleTheme}
            fontTheme={fontTheme}
            onFontThemeChange={handleFontThemeChange}
            isExecuting={isExecuting}
            activeDatabase={activeDatabase || '(nenhum)'}
            workspaceLayoutMode={workspaceLayoutMode}
            onWorkspaceLayoutModeChange={setWorkspaceLayoutMode}
            confirmBeforeCloseAllTabs={preferences.editor.confirmBeforeCloseAllTabs}
            onOpenHub={() => setIsHubModalOpen(true)}
          />

          {/* Banner de Desafio Ativo Acoplado ao Topo da Tela */}
          {activeExercise && (activeView === 'workspace' || activeView === 'er-diagram') && (
            <ActiveChallengeBanner
              exercise={activeExercise}
              currentSql={activeTab?.content || ''}
              onValidatedSuccess={() => {
                confetti({
                  particleCount: 50,
                  spread: 70,
                  origin: { y: 0.2 },
                  colors: ['#00E676', '#FFE600', '#FF6B00'],
                });
              }}
              onCloseChallenge={() => setActiveExercise(null)}
            />
          )}

          {/* 2. Área Central Conforme Visão Selecionada */}
          {activeView === 'gallery' ? (
            <GalleryAndPracticeView
              onInstantiateSqlAndOpenView={handleInstantiateSqlAndOpenView}
              onLoadPreset={handleLoadPreset}
              onStartExercise={handleStartExercise}
              onRestoreSavedDiagram={handleRestoreSavedDiagram}
            />
          ) : activeView === 'history' ? (
            <QueryHistoryView
              onLoadQueryIntoNewTab={(query) => handleNewTab(query, 'historico.sql')}
            />
          ) : activeView === 'er-diagram' ? (
            <ERDiagramView
              schemas={schemas}
              activeDatabase={activeDatabase}
              liveScriptSql={activeTab?.content || ''}
              activeTabName={activeTab?.title || 'consulta.sql'}
              theme={theme}
              preferences={preferences}
              onUpdateErPreferences={handleUpdateErPreferences}
              onSelectDatabase={(db) => {
                dbEngine.setActiveDatabase(db);
                setActiveDatabase(db);
              }}
              onSelectTableForQuery={(db, tbl) =>
                handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
              }
              onApplySurgicalSqlPatch={handleApplySurgicalSqlPatch}
              onOpenDdlInEditor={(title, sql) => handleNewTab(sql, title)}
              onRefreshSchemas={refreshSchemas}
            />
          ) : activeView === 'er-model' ? (
            <ERModelView
              schemas={schemas}
              activeDatabase={activeDatabase}
              preferences={preferences}
              onSelectDatabase={(db) => {
                dbEngine.setActiveDatabase(db);
                setActiveDatabase(db);
              }}
              onSelectTableForQuery={(db, tbl) =>
                handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
              }
            />
          ) : activeView === 'settings' ? (
            <SettingsView
              onResetDb={handleResetDb}
              onRefreshSchemas={refreshSchemas}
              onImportSqlSuccess={(sql) => handleNewTab(sql, 'importado.sql')}
              theme={theme}
              onThemeChange={handleThemeChange}
              fontTheme={fontTheme}
              onFontThemeChange={handleFontThemeChange}
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
              onRestoreSuperBackup={handleRestoreSuperBackup}
            />
          ) : activeView === 'guide' ? (
            <GuideView
              theme={theme}
              fontTheme={fontTheme}
              onNavigate={setActiveView}
            />
          ) : activeView === 'feedback' ? (
            <FeedbackView
              theme={theme}
              fontTheme={fontTheme}
              onNavigate={setActiveView}
            />
          ) : activeView === 'guide-feedback' ? (
            <GuideView
              theme={theme}
              fontTheme={fontTheme}
              onNavigate={setActiveView}
            />
          ) : activeView === 'about' ? (
            <AboutView onBackToWorkspace={() => setActiveView('workspace')} />
          ) : activeView === 'profile' ? (
            <UserProfileView
              onBackToWorkspace={() => setActiveView('workspace')}
              onNavigateToLanding={() => setActiveView('landing')}
              onSaveComplete={() => {
                setActiveView('workspace');
                setIsHubModalOpen(true);
              }}
              onOpenSavedScript={(script) => {
                handleNewTab(script.content, script.title, script.id);
                setActiveView('workspace');
              }}
            />
          ) : activeView === 'admin-panel' ? (
            <AdminPanelView onBackToWorkspace={() => setActiveView('workspace')} />
          ) : activeView === 'teacher-panel' ? (
            <TeacherPanelView onBackToWorkspace={() => setActiveView('workspace')} />
          ) : (
            /* Workspace Principal (Laboratório SQL) */
            <main className="flex-1 flex flex-row overflow-hidden relative">
              {/* A. Coluna da Esquerda: Schema Explorer */}
              {visiblePanels.sidebar && (
                <>
                  <div style={{ width: `${sidebarWidth}px` }} className="h-full shrink-0 flex flex-col overflow-hidden">
                    <Sidebar
                      schemas={schemas}
                      activeDatabase={activeDatabase}
                      onSelectDatabase={(db) => {
                        dbEngine.setActiveDatabase(db);
                        setActiveDatabase(db);
                      }}
                      onCreateDatabase={handleCreateDatabase}
                      onRefreshSchemas={handleReloadAllDatabases}
                      zoomLevel={zoomLevels.sidebar}
                      onZoomIn={() =>
                        setZoomLevels(p => ({ ...p, sidebar: Math.min(400, p.sidebar + 10) }))
                      }
                      onZoomOut={() =>
                        setZoomLevels(p => ({ ...p, sidebar: Math.max(50, p.sidebar - 10) }))
                      }
                      onZoomReset={() =>
                        setZoomLevels(p => ({ ...p, sidebar: 100 }))
                      }
                      onContextMenu={setContextMenuTarget}
                      onTableDoubleClick={(db, tbl) =>
                        handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                      }
                      selectedTable={selectedTable}
                      onSelectTable={(db, tbl) => handleSelectTable(db, tbl, true)}
                      loadingProgress={loadingProgress}
                      isClassLoading={isClassLoading}
                    />
                  </div>

                  {/* Divisor Redimensionável Horizontal */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      isResizingSidebar.current = true;
                      document.body.style.cursor = 'col-resize';
                      document.body.style.userSelect = 'none';
                    }}
                    className="w-1.5 hover:w-2 bg-[var(--border-color)] hover:bg-[#FF6B00] cursor-col-resize z-20 transition-all shrink-0 active:bg-[#FF6B00] active:shadow-[0_0_8px_#FF6B00]"
                    title="Arraste para redimensionar a Barra Lateral"
                  />
                </>
              )}

              {/* B. Coluna da Direita: Editor + Console / Split-View */}
              <section id="workspace-panel" className="flex-1 flex flex-col h-full overflow-hidden">
                {visiblePanels.scripts && visiblePanels.info ? (
                  <>
                    {/* Ambos visíveis: Editor com % de altura e Console com o restante */}
                    <div style={{ height: `${editorHeightPercent}%` }} className="min-h-[140px] flex flex-col overflow-hidden">
                      {workspaceLayoutMode === 'split' ? (
                        /* Modo Split-View: Editor SQL ↔ Estúdio DER lado a lado */
                        <div className="flex-1 flex flex-row overflow-hidden border-b border-[var(--border-color)]">
                          <div
                            style={{ width: `${preferences.editor.defaultSplitRatio}%` }}
                            className="h-full flex flex-col border-r border-[var(--border-color)] shrink-0"
                          >
                            <EditorWorkspace {...editorWorkspaceSharedProps} />
                          </div>

                          <div className="flex-1 h-full flex flex-col overflow-hidden">
                            <ERStudioWorkspace
                              mode="split-preview"
                              schemas={schemas}
                              activeDatabase={activeDatabase}
                              liveScriptSql={activeTab?.content || ''}
                              activeTabName={activeTab?.title || 'consulta.sql'}
                              theme={theme}
                              preferences={preferences}
                              onUpdateErPreferences={handleUpdateErPreferences}
                              onSelectDatabase={(db) => {
                                dbEngine.setActiveDatabase(db);
                                setActiveDatabase(db);
                              }}
                              onSelectTableForQuery={(db, tbl) =>
                                handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                              }
                              onApplySurgicalSqlPatch={handleApplySurgicalSqlPatch}
                              onOpenDdlInEditor={(title, sql) => handleNewTab(sql, title)}
                              onRefreshSchemas={refreshSchemas}
                              onExpandToFullStudio={() => setActiveView('er-diagram')}
                            />
                          </div>
                        </div>
                      ) : workspaceLayoutMode === 'der' ? (
                        /* Modo DER em destaque no topo */
                        <div className="flex-1 h-full flex flex-col overflow-hidden border-b border-[var(--border-color)]">
                          <ERStudioWorkspace
                            mode="split-preview"
                            schemas={schemas}
                            activeDatabase={activeDatabase}
                            liveScriptSql={activeTab?.content || ''}
                            activeTabName={activeTab?.title || 'consulta.sql'}
                            theme={theme}
                            preferences={preferences}
                            onUpdateErPreferences={handleUpdateErPreferences}
                            onSelectDatabase={(db) => {
                              dbEngine.setActiveDatabase(db);
                              setActiveDatabase(db);
                            }}
                            onSelectTableForQuery={(db, tbl) =>
                              handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                            }
                            onApplySurgicalSqlPatch={handleApplySurgicalSqlPatch}
                            onOpenDdlInEditor={(title, sql) => handleNewTab(sql, title)}
                            onRefreshSchemas={refreshSchemas}
                            onExpandToFullStudio={() => setActiveView('er-diagram')}
                          />
                        </div>
                      ) : (
                        /* Modo Editor Padrão */
                        <EditorWorkspace {...editorWorkspaceSharedProps} />
                      )}
                    </div>

                    {/* Divisor Redimensionável Vertical */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        isResizingEditor.current = true;
                        document.body.style.cursor = 'row-resize';
                        document.body.style.userSelect = 'none';
                      }}
                      className="h-1.5 hover:h-2 bg-[var(--border-color)] hover:bg-[#FF6B00] cursor-row-resize z-20 transition-all shrink-0 active:bg-[#FF6B00] active:shadow-[0_0_8px_#FF6B00]"
                      title="Arraste para redimensionar o Console"
                    />

                    {/* Console de Resultados */}
                    <div style={{ height: `${100 - editorHeightPercent}%` }} className="min-h-[120px] flex flex-col">
                      <ConsoleResults
                        results={results}
                        isExecuting={isExecuting}
                        zoomLevel={zoomLevels.console}
                        onZoomIn={() =>
                          setZoomLevels(p => ({ ...p, console: Math.min(400, p.console + 10) }))
                        }
                        onZoomOut={() =>
                          setZoomLevels(p => ({ ...p, console: Math.max(50, p.console - 10) }))
                        }
                        onZoomReset={() =>
                          setZoomLevels(p => ({ ...p, console: 100 }))
                        }
                        review={sqlReview}
                        onApplyReviewSuggestion={handleApplyReviewSuggestion}
                        activeConsoleTab={activeConsoleTab}
                        onSelectConsoleTab={setActiveConsoleTab}
                        tablePreviewData={tablePreviewData}
                        onRefreshTablePreview={handleRefreshTablePreview}
                        schemas={schemas}
                        onSelectPreviewTable={(db, tbl) => handleSelectTable(db, tbl, false)}
                        onReviewSnippet={handleReviewSnippet}
                        selectedResultIndex={selectedResultIndex}
                        onSelectResultIndex={handleConsoleSelectResultIndex}
                        dataPreviewLimit={dataPreviewLimit}
                        onCycleDataPreviewLimit={handleCycleDataPreviewLimit}
                      />
                    </div>
                  </>
                ) : visiblePanels.scripts && !visiblePanels.info ? (
                  /* Apenas Editor Visível (Ocupa 100%) */
                  <div className="h-full w-full flex flex-col">
                    {workspaceLayoutMode === 'split' ? (
                      <div className="flex-1 flex flex-row overflow-hidden">
                        <div
                          style={{ width: `${preferences.editor.defaultSplitRatio}%` }}
                          className="h-full flex flex-col border-r border-[var(--border-color)] shrink-0"
                        >
                          <EditorWorkspace {...editorWorkspaceSharedProps} />
                        </div>
                        <div className="flex-1 h-full flex flex-col overflow-hidden">
                          <ERStudioWorkspace
                            mode="split-preview"
                            schemas={schemas}
                            activeDatabase={activeDatabase}
                            liveScriptSql={activeTab?.content || ''}
                            activeTabName={activeTab?.title || 'consulta.sql'}
                            theme={theme}
                            preferences={preferences}
                            onUpdateErPreferences={handleUpdateErPreferences}
                            onSelectDatabase={(db) => {
                              dbEngine.setActiveDatabase(db);
                              setActiveDatabase(db);
                            }}
                            onSelectTableForQuery={(db, tbl) =>
                              handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                            }
                            onApplySurgicalSqlPatch={handleApplySurgicalSqlPatch}
                            onOpenDdlInEditor={(title, sql) => handleNewTab(sql, title)}
                            onRefreshSchemas={refreshSchemas}
                            onExpandToFullStudio={() => setActiveView('er-diagram')}
                          />
                        </div>
                      </div>
                    ) : workspaceLayoutMode === 'der' ? (
                      <ERStudioWorkspace
                        mode="split-preview"
                        schemas={schemas}
                        activeDatabase={activeDatabase}
                        liveScriptSql={activeTab?.content || ''}
                        activeTabName={activeTab?.title || 'consulta.sql'}
                        theme={theme}
                        preferences={preferences}
                        onUpdateErPreferences={handleUpdateErPreferences}
                        onSelectDatabase={(db) => {
                          dbEngine.setActiveDatabase(db);
                          setActiveDatabase(db);
                        }}
                        onSelectTableForQuery={(db, tbl) =>
                          handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                        }
                        onApplySurgicalSqlPatch={handleApplySurgicalSqlPatch}
                        onOpenDdlInEditor={(title, sql) => handleNewTab(sql, title)}
                        onRefreshSchemas={refreshSchemas}
                        onExpandToFullStudio={() => setActiveView('er-diagram')}
                      />
                    ) : (
                      <EditorWorkspace {...editorWorkspaceSharedProps} />
                    )}
                  </div>
                ) : !visiblePanels.scripts && visiblePanels.info ? (
                  /* Apenas Console Visível (Ocupa 100%) */
                  <div className="h-full w-full flex flex-col">
                    <ConsoleResults
                      results={results}
                      isExecuting={isExecuting}
                      zoomLevel={zoomLevels.console}
                      onZoomIn={() =>
                        setZoomLevels(p => ({ ...p, console: Math.min(400, p.console + 10) }))
                      }
                      onZoomOut={() =>
                        setZoomLevels(p => ({ ...p, console: Math.max(50, p.console - 10) }))
                      }
                      onZoomReset={() =>
                        setZoomLevels(p => ({ ...p, console: 100 }))
                      }
                      review={sqlReview}
                      onApplyReviewSuggestion={handleApplyReviewSuggestion}
                      activeConsoleTab={activeConsoleTab}
                      onSelectConsoleTab={setActiveConsoleTab}
                      tablePreviewData={tablePreviewData}
                      onRefreshTablePreview={handleRefreshTablePreview}
                      schemas={schemas}
                      onSelectPreviewTable={(db, tbl) => handleSelectTable(db, tbl, false)}
                      onReviewSnippet={handleReviewSnippet}
                      selectedResultIndex={selectedResultIndex}
                      onSelectResultIndex={handleConsoleSelectResultIndex}
                      dataPreviewLimit={dataPreviewLimit}
                      onCycleDataPreviewLimit={handleCycleDataPreviewLimit}
                    />
                  </div>
                ) : (
                  /* Scripts e Informações Ocultos */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
                    <span className="material-symbols-outlined text-[48px] text-[var(--accent-yellow)] opacity-60 mb-3 animate-pulse">
                      visibility_off
                    </span>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                      {!visiblePanels.sidebar
                        ? 'Todos os Painéis do Workspace Estão Ocultos'
                        : 'Painéis de Scripts e Informações Ocultos'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
                      {!visiblePanels.sidebar
                        ? 'O Schema Explorer (Barra Lateral), o Editor de Scripts e o Console de Informações foram ocultados. Você pode reexibi-los através do Menu Hambúrguer > Painéis do Workspace ou usando os botões abaixo:'
                        : 'Você ocultou os painéis centrais de scripts e resultados do workspace. Reexiba-os abaixo ou através do Menu Hambúrguer > Painéis do Workspace:'}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button
                        onClick={handleShowAllPanels}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded-lg cursor-pointer transition-all shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:scale-105 active:scale-95"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>Reexibir Todos os Painéis</span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {!visiblePanels.sidebar && (
                          <button
                            onClick={() => handleTogglePanel('sidebar')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg cursor-pointer transition-colors shadow-sm"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">account_tree</span>
                            <span>Exibir Schema Explorer</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleTogglePanel('scripts')}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg cursor-pointer transition-colors shadow-sm"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#FF6B00]">code</span>
                          <span>Exibir Scripts</span>
                        </button>

                        <button
                          onClick={() => handleTogglePanel('info')}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg cursor-pointer transition-colors shadow-sm"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[var(--status-success)]">terminal</span>
                          <span>Exibir Informações</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </main>
          )}
        </>
      )}

      {/* Menu de Contexto Flutuante */}
      <ContextMenu
        target={contextMenuTarget}
        onClose={() => setContextMenuTarget(null)}
        onAction={(sql) => handleNewTab(sql, 'script_contexto.sql')}
        onSelectPreset={handleLoadPreset}
        currentPreset={currentPreset}
        classroomMode={activeClassroomMode}
        hasTeacherClassDbs={teacherClassDbs.length > 0}
        hasExamDbs={classExams.length > 0}
      />

      {/* Modal de Autenticação (Firebase Auth & Cadastro SENAI) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        initialTab={authModalInitialTab}
        onAuthSuccess={() => {
          setActiveView('workspace');
          setIsHubModalOpen(true);
        }}
      />

      {/* Central de Início / Hub de Navegação (Aparece à frente do Editor) */}
      <NavigationHubModal
        isOpen={isHubModalOpen}
        onClose={() => setIsHubModalOpen(false)}
        onSelectView={(view) => setActiveView(view)}
      />

      {/* Modal de Recuperação Pós-Avaliação */}
      <PostExamRecoveryModal
        isOpen={isPostExamRecoveryOpen}
        onClose={() => setIsPostExamRecoveryOpen(false)}
        tempScripts={tempRecoveryScripts}
        userUid={user?.uid || ''}
        onRestoreAll={(scripts) => {
          const restoredTabs: TabItem[] = scripts.map((s) => ({
            id: s.id,
            title: s.title,
            content: s.content,
          }));
          setTabs((prev) => [...prev, ...restoredTabs]);
          if (restoredTabs.length > 0) {
            setActiveTabId(restoredTabs[0].id);
          }
        }}
        onRefreshUserScripts={reloadAllScripts}
      />
    </div>
  );
};

export default App;
