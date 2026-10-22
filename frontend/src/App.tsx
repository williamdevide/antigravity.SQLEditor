import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace, extractStatementAtPosition } from './components/EditorWorkspace';
import { ConsoleResults } from './components/ConsoleResults';
import { QueryHistoryView } from './components/QueryHistoryView';
import { ERDiagramView } from './components/ERDiagramView';
import { ERModelView } from './components/ERModelView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { LandingPageView } from './components/LandingPageView';
import { ContextMenu } from './components/ContextMenu';
import { dbEngine, type DatabaseLoadProgress } from './services/dbEngine';
import { dbStorage } from './services/storage';
import { reviewSqlQuery } from './services/sqlReviewer';
import { getAvailableSolutions, type SolutionItem } from './services/scriptsLoader';
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
  DatabasePreset,
  ConsoleTab,
  TablePreviewData,
} from './types';

const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    title: 'script_1.sql',
    content: `-- Bem-vindo ao SQLEditor! (Google Antigravity Professional Edition)
-- O motor AlaSQL e IndexedDB opera 100% no seu navegador.
--
-- 📌 Para carregar bancos de dados:
--    Clique com o BOTÃO DIREITO sobre 'SCHEMA EXPLORER' na barra lateral:
--    • Carregar vazio (iniciar sem nenhum banco)
--    • Carregar BDs de exemplo (ecommerce_db e universidade_db)
--    • Carregar BDs Aula (bancos enviados pelo professor em data/bds)
--
-- 💡 Para carregar soluções ou novas abas:
--    Clique no botão '+ Nova Aba' para abrir aba em branco ou carregar soluções de aula.
`,
  }
];


export const App: React.FC = () => {
  const [activeView, setActiveViewState] = useState<ActiveView>(() => {
    try {
      // 1. Tenta recuperar do hash da URL (#landing, #editor, #workspace, #about, #settings, #er-diagram, #er-model, #history)
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (raw === 'editor' || raw === 'workspace') return 'workspace';
      if (['landing', 'history', 'er-diagram', 'er-model', 'settings', 'about'].includes(raw)) {
        return raw as ActiveView;
      }
      // 2. Tenta recuperar do localStorage salvo
      const saved = localStorage.getItem('sqleditor_active_view') as ActiveView;
      if (saved && ['landing', 'workspace', 'history', 'er-diagram', 'er-model', 'settings', 'about'].includes(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'landing'; // Por padrão, exibe a landing page moderna nos moldes do drawdb.app
  });

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    try {
      localStorage.setItem('sqleditor_active_view', view);
      if (view === 'workspace') {
        window.location.hash = '#editor';
      } else if (view === 'landing') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = `#${view}`;
      }
    } catch (_) {}
  }, []);

  // Ouve navegação por botões Voltar/Avançar do navegador
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (raw === 'editor' || raw === 'workspace') {
        setActiveViewState('workspace');
        try { localStorage.setItem('sqleditor_active_view', 'workspace'); } catch (_) {}
        return;
      }
      if (['landing', 'history', 'er-diagram', 'er-model', 'settings', 'about'].includes(raw)) {
        setActiveViewState(raw as ActiveView);
        try { localStorage.setItem('sqleditor_active_view', raw); } catch (_) {}
      } else if (!raw) {
        setActiveViewState('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>('');
  const [currentPreset, setCurrentPreset] = useState<DatabasePreset>('empty');
  const [tabs, setTabs] = useState<TabItem[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [results, setResults] = useState<QueryResult[]>([]);
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

  // Tabela selecionada para visualização de Dados (LIMIT 30)
  const [selectedTable, setSelectedTable] = useState<{ dbName: string; tableName: string } | null>(null);
  const [tablePreviewData, setTablePreviewData] = useState<TablePreviewData | null>(null);
  const selectedTableRef = useRef<{ dbName: string; tableName: string } | null>(null);
  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

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
  }, []);

  // Sincroniza classes e atributos no elemento raiz HTML
  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.setAttribute('data-font-theme', fontTheme);
  }, [theme, fontTheme]);

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

  // Seleção e carregamento de dados da tabela (LIMIT 30)
  const handleSelectTable = useCallback(async (dbName: string, tableName: string, switchToDataTab: boolean = true) => {
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
      const preview = await dbEngine.getTablePreviewData(dbName, tableName, 30);
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

  // Recarregar schemas
  const refreshSchemas = useCallback(async () => {
    const tree = await dbEngine.getSchemaTree();
    setSchemas([...tree]);
    const currentActive = dbEngine.getActiveDatabase();
    if (currentActive) {
      setActiveDatabase(currentActive);
    }

    // Se há tabela selecionada, atualiza seus dados na aba Dados
    if (selectedTableRef.current) {
      const { dbName, tableName } = selectedTableRef.current;
      const dbFound = tree.find(d => d.name.toLowerCase() === dbName.toLowerCase());
      const tableFound = dbFound?.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (tableFound) {
        try {
          const preview = await dbEngine.getTablePreviewData(dbName, tableName, 30);
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

  // Seleção automática da primeira tabela disponível caso nenhuma esteja selecionada
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
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab || !currentTab.content.trim()) return;

    setIsExecuting(true);
    try {
      const res = await dbEngine.executeScript(currentTab.content);
      setResults(res);
      await refreshSchemas();
      setActiveConsoleTab('grid');

      // Confetti se foi sucesso
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
          statement: currentTab.content,
          columns: ['Erro'],
          rows: [],
          executionTimeMs: 0,
          status: 'error',
          errorMessage: err?.message || String(err),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: activeDatabase,
        },
      ]);
      setActiveConsoleTab('log');
    } finally {
      setIsExecuting(false);
    }
  }, [tabs, activeTabId, activeDatabase, refreshSchemas]);

  // Executar somente trecho selecionado (Alt+E)
  const handleRunSnippet = useCallback(async (snippet: string) => {
    if (!snippet.trim()) return;

    setIsExecuting(true);
    try {
      const res = await dbEngine.executeScript(snippet);
      setResults(res);
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
          columns: ['Erro'],
          rows: [],
          executionTimeMs: 0,
          status: 'error',
          errorMessage: err?.message || String(err),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: activeDatabase,
        },
      ]);
      setActiveConsoleTab('log');
    } finally {
      setIsExecuting(false);
    }
  }, [refreshSchemas, activeDatabase]);

  // Revisar trecho selecionado (Alt+R) ou comando com erro no log
  const handleReviewSnippet = useCallback((snippet: string, runtimeError?: string) => {
    if (!snippet.trim()) return;
    const rev = reviewSqlQuery(snippet, activeDatabase, schemas, runtimeError);
    setSqlReview(rev);
    setActiveConsoleTab('review');
  }, [activeDatabase, schemas]);

  // Atualizar Conteúdo da Aba
  const handleUpdateTabContent = useCallback((id: string, content: string) => {
    setTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, content, isDirty: true } : t))
    );
  }, []);

  // Aplicar sugestão da revisão no Editor
  const handleApplyReviewSuggestion = useCallback((suggestedSql: string) => {
    if (editorRef.current) {
      const ed = editorRef.current;
      const selection = ed.getSelection();
      if (selection && !selection.isEmpty()) {
        ed.executeEdits('review-apply', [{ range: selection, text: suggestedSql }]);
      } else {
        handleUpdateTabContent(activeTabId, suggestedSql);
      }
    } else {
      handleUpdateTabContent(activeTabId, suggestedSql);
    }
    setActiveConsoleTab('grid');
  }, [activeTabId, handleUpdateTabContent]);

  // Nova Aba
  const handleNewTab = useCallback((initialContent?: string, tabName?: string) => {
    const newId = `tab-${Date.now()}`;
    const nextNum = tabs.length + 1;
    const defaultContent = activeDatabase
      ? `-- Novo script SQL\nUSE \`${activeDatabase}\`;\n\n`
      : `-- Novo script SQL\n\n`;
    const newTab: TabItem = {
      id: newId,
      title: tabName || `script_${nextNum}.sql`,
      content: initialContent !== undefined ? initialContent : defaultContent,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    if (activeView !== 'workspace') {
      setActiveView('workspace');
    }
  }, [tabs.length, activeDatabase, activeView, setActiveView]);

  // Criar Aba em Branco (via dropdown ou botão + na barra de abas)
  const handleNewBlankTab = useCallback(() => {
    handleNewTab('');
  }, [handleNewTab]);

  // Carregar Solução (via dropdown)
  const handleOpenSolution = useCallback((solution: SolutionItem) => {
    handleNewTab(solution.content, solution.fileName);
  }, [handleNewTab]);

  // Fechar Todas as Guias (permite fechar 100% das abas)
  const handleCloseAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId('');
  }, []);

  // Fechar Outras Guias
  const handleCloseOtherTabs = useCallback((keepId: string) => {
    setTabs(prev => prev.filter(t => t.id === keepId));
    setActiveTabId(keepId);
  }, []);

  // Carregar Preset do Schema Explorer (Vazio, Exemplos, BDs Aula)
  const handleLoadPreset = useCallback(async (preset: DatabasePreset) => {
    setIsExecuting(true);
    if (preset === 'class') {
      setIsClassLoading(true);
    }

    await dbEngine.loadPreset(preset, (progressMap, completedCount) => {
      setLoadingProgress({ ...progressMap });
      if (completedCount > 0) {
        dbEngine.getSchemaTree().then(tree => {
          setSchemas(tree);
        });
      }
    });

    setCurrentPreset(preset);
    await refreshSchemas();
    const newActiveDb = dbEngine.getActiveDatabase();
    setActiveDatabase(newActiveDb);

    let presetLabel = 'Vazio';
    if (preset === 'samples') presetLabel = 'BDs de Exemplo (ecommerce_db, universidade_db)';
    if (preset === 'class') presetLabel = 'BDs da Aula (Professor)';

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
    setActiveConsoleTab('grid');
    setIsExecuting(false);

    // Mantém as barras em 100% por 1.8 segundos para confirmação visual
    setTimeout(() => {
      setLoadingProgress(null);
      setIsClassLoading(false);
    }, 1800);
  }, [refreshSchemas]);

  // Criar Novo Banco de Dados (pelo botão na Sidebar)
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

  // Fechar Aba (permite fechar até a última aba, deixando a lista vazia se desejado)
  const handleCloseTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : '');
      }
      return next;
    });
  }, [activeTabId]);

  // Limpar Editor
  const handleClearEditor = useCallback(() => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, content: '' } : t))
    );
  }, [activeTabId]);

  // Resetar Banco de Dados (restaura o estado da opção ativa no Schema Explorer)
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
      setActiveConsoleTab('grid');
      setIsExecuting(false);

      setTimeout(() => {
        setLoadingProgress(null);
        setIsClassLoading(false);
      }, 1800);
    }
  }, [refreshSchemas]);

  // Gerenciamento de Temas (Interface e Cores das Letras)
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

  // Alternar Cores das Letras (Cicla: Âmbar Solar -> Ciano Cibernético -> Esmeralda Matrix -> Púrpura Synthwave)
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

  // Alternar Tema (Cicla ordenadamente: Dark -> Light -> Bege -> Grafite -> Dark)
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

  // Renomear Aba de Script
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setTabs(prev =>
      prev.map(t => (t.id === tabId ? { ...t, title: trimmed } : t))
    );
  }, []);

  // Exportar Script da Aba Ativa (.sql)
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

  // Atalhos Globais de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Exportar Script .sql (Ctrl + S / Cmd + S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleExportScript();
        return;
      }

      // Alternar Cores do Tema (Alt + T)
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      // Alternar Cores das Letras (Alt + L)
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleToggleFontTheme();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunQuery();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
      // Atalhos Alt+E e Alt+R para seleção do editor
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (editorRef.current) {
          const ed = editorRef.current;
          const selection = ed.getSelection();
          if (selection && !selection.isEmpty()) {
            const selectedText = ed.getModel()?.getValueInRange(selection);
            if (selectedText && selectedText.trim()) {
              handleRunSnippet(selectedText.trim());
              return;
            }
          }
          const model = ed.getModel();
          const pos = ed.getPosition();
          if (model && pos) {
            const stmt = extractStatementAtPosition(model.getValue(), pos);
            if (stmt && stmt.trim()) {
              handleRunSnippet(stmt.trim());
              return;
            }
          }
          handleRunQuery();
        }
      }
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (editorRef.current) {
          const ed = editorRef.current;
          const selection = ed.getSelection();
          let toReview = '';
          if (selection && !selection.isEmpty()) {
            toReview = ed.getModel()?.getValueInRange(selection) || '';
          } else {
            const model = ed.getModel();
            const pos = ed.getPosition();
            if (model && pos) {
              toReview = extractStatementAtPosition(model.getValue(), pos) || '';
            }
          }
          if (!toReview.trim()) {
            toReview = ed.getValue();
          }
          if (toReview.trim()) {
            handleReviewSnippet(toReview.trim());
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunQuery, handleNewTab, handleRunSnippet, handleReviewSnippet, handleToggleTheme, handleToggleFontTheme, handleExportScript]);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      {/* 1. Página Inicial / Landing Page nos moldes do DrawDB */}
      {activeView === 'landing' ? (
        <div className="flex-1 w-full h-full overflow-y-auto">
          <LandingPageView
            onOpenEditor={() => setActiveView('workspace')}
            onOpenView={(view) => setActiveView(view)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
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
        onNewBlankTab={handleNewBlankTab}
        onOpenSolution={handleOpenSolution}
        solutions={solutions}
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
      />

      {/* 2. Área Central Conforme Visão Selecionada */}
      {activeView === 'history' ? (
        <QueryHistoryView
          onLoadQueryIntoNewTab={(query) => handleNewTab(query, 'historico.sql')}
        />
      ) : activeView === 'er-diagram' ? (
        <ERDiagramView
          schemas={schemas}
          activeDatabase={activeDatabase}
          onSelectDatabase={(db) => {
            dbEngine.setActiveDatabase(db);
            setActiveDatabase(db);
          }}
          onSelectTableForQuery={(db, tbl) =>
            handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
          }
        />
      ) : activeView === 'er-model' ? (
        <ERModelView
          schemas={schemas}
          activeDatabase={activeDatabase}
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
        />
      ) : activeView === 'about' ? (
        <AboutView onBackToWorkspace={() => setActiveView('workspace')} />
      ) : (
        /* Workspace Principal (IDE) */
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
                  onRefreshSchemas={refreshSchemas}
                  zoomLevel={zoomLevels.sidebar}
                  onZoomIn={() =>
                    setZoomLevels(p => ({ ...p, sidebar: Math.min(250, p.sidebar + 10) }))
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

          {/* B. Coluna da Direita: Editor + Console */}
          <section id="workspace-panel" className="flex-1 flex flex-col h-full overflow-hidden">
            {visiblePanels.scripts && visiblePanels.info ? (
              <>
                {/* Ambos visíveis: Editor com % de altura e Console com o restante */}
                <div style={{ height: `${editorHeightPercent}%` }} className="min-h-[140px] flex flex-col">
                  <EditorWorkspace
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSelectTab={setActiveTabId}
                    onCloseTab={handleCloseTab}
                    onNewBlankTab={handleNewBlankTab}
                    onOpenSolution={handleOpenSolution}
                    solutions={solutions}
                    onUpdateContent={handleUpdateTabContent}
                    onRunQuery={handleRunQuery}
                    onRunSnippet={handleRunSnippet}
                    onReviewSnippet={handleReviewSnippet}
                    zoomLevel={zoomLevels.editor}
                    onZoomIn={() =>
                      setZoomLevels(p => ({ ...p, editor: Math.min(250, p.editor + 10) }))
                    }
                    onZoomOut={() =>
                      setZoomLevels(p => ({ ...p, editor: Math.max(50, p.editor - 10) }))
                    }
                    onZoomReset={() =>
                      setZoomLevels(p => ({ ...p, editor: 100 }))
                    }
                    onCloseAllTabs={handleCloseAllTabs}
                    onCloseOtherTabs={handleCloseOtherTabs}
                    theme={theme}
                    fontTheme={fontTheme}
                    onRenameTab={handleRenameTab}
                    onExportScript={handleExportScript}
                    onToggleTheme={handleToggleTheme}
                    onToggleFontTheme={handleToggleFontTheme}
                    schemas={schemas}
                    activeDatabase={activeDatabase}
                    editorRefOut={editorRef}
                  />
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
                      setZoomLevels(p => ({ ...p, console: Math.min(250, p.console + 10) }))
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
                  />
                </div>
              </>
            ) : visiblePanels.scripts && !visiblePanels.info ? (
              /* Apenas Editor Visível (Ocupa 100%) */
              <div className="h-full w-full flex flex-col">
                <EditorWorkspace
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={handleCloseTab}
                  onNewBlankTab={handleNewBlankTab}
                  onOpenSolution={handleOpenSolution}
                  solutions={solutions}
                  onUpdateContent={handleUpdateTabContent}
                  onRunQuery={handleRunQuery}
                  onRunSnippet={handleRunSnippet}
                  onReviewSnippet={handleReviewSnippet}
                  zoomLevel={zoomLevels.editor}
                  onZoomIn={() =>
                    setZoomLevels(p => ({ ...p, editor: Math.min(250, p.editor + 10) }))
                  }
                  onZoomOut={() =>
                    setZoomLevels(p => ({ ...p, editor: Math.max(50, p.editor - 10) }))
                  }
                  onZoomReset={() =>
                    setZoomLevels(p => ({ ...p, editor: 100 }))
                  }
                  onCloseAllTabs={handleCloseAllTabs}
                  onCloseOtherTabs={handleCloseOtherTabs}
                  theme={theme}
                  fontTheme={fontTheme}
                  onRenameTab={handleRenameTab}
                  onExportScript={handleExportScript}
                  onToggleTheme={handleToggleTheme}
                  onToggleFontTheme={handleToggleFontTheme}
                  schemas={schemas}
                  activeDatabase={activeDatabase}
                  editorRefOut={editorRef}
                />
              </div>
            ) : !visiblePanels.scripts && visiblePanels.info ? (
              /* Apenas Console Visível (Ocupa 100%) */
              <div className="h-full w-full flex flex-col">
                <ConsoleResults
                  results={results}
                  isExecuting={isExecuting}
                  zoomLevel={zoomLevels.console}
                  onZoomIn={() =>
                    setZoomLevels(p => ({ ...p, console: Math.min(250, p.console + 10) }))
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
                />
              </div>
            ) : (
              /* Scripts e Informações Ocultos (ou Todos os Painéis Ocultos) */
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
                    ? 'O Schema Explorer (Barra Lateral), o Editor de Scripts e o Console de Informações foram ocultados. Você pode reexibi-los através do Menu Hambúrguer > Visualização ou usando os botões abaixo:'
                    : 'Você ocultou os painéis centrais de scripts e resultados do workspace. Reexiba-os abaixo ou através do Menu Hambúrguer > Visualização:'}
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
      />
    </div>
  );
};

export default App;
