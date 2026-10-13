import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './components/EditorWorkspace';
import { ConsoleResults } from './components/ConsoleResults';
import { QueryHistoryView } from './components/QueryHistoryView';
import { ERDiagramView } from './components/ERDiagramView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { ContextMenu } from './components/ContextMenu';
import { dbEngine } from './services/dbEngine';
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
  ContextMenuTarget,
  SqlReview,
  DatabasePreset,
} from './types';

const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    title: 'script_1.sql',
    content: `-- Bem-vindo ao SQLEditor! (Google Antigravity - SENAI Edition)
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
      // 1. Tenta recuperar do hash da URL (#about, #settings, #er-diagram, #history, #workspace)
      const hash = window.location.hash.replace(/^#\/?/, '') as ActiveView;
      if (['workspace', 'history', 'er-diagram', 'settings', 'about'].includes(hash)) {
        return hash;
      }
      // 2. Tenta recuperar do localStorage salvo
      const saved = localStorage.getItem('sqleditor_active_view') as ActiveView;
      if (saved && ['workspace', 'history', 'er-diagram', 'settings', 'about'].includes(saved)) {
        return saved;
      }
    } catch (_) {}
    return 'workspace';
  });

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    try {
      localStorage.setItem('sqleditor_active_view', view);
      if (view === 'workspace') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = `#${view}`;
      }
    } catch (_) {}
  }, []);

  // Ouve navegação por botões Voltar/Avançar do navegador
  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash.replace(/^#\/?/, '') || 'workspace') as ActiveView;
      if (['workspace', 'history', 'er-diagram', 'settings', 'about'].includes(hash)) {
        setActiveViewState(hash);
        try { localStorage.setItem('sqleditor_active_view', hash); } catch (_) {}
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
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [zoomLevels, setZoomLevels] = useState<ZoomLevels>({
    sidebar: 100,
    editor: 100,
    console: 100,
  });
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);

  // Soluções de aula disponíveis
  const solutions = useMemo(() => getAvailableSolutions(), []);

  // Aba de Revisão e Aba Ativa no Console
  const [sqlReview, setSqlReview] = useState<SqlReview | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'grid' | 'log' | 'review'>('grid');

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

  // Salva estado do workspace automaticamente no IndexedDB
  const persistWorkspace = useCallback(async () => {
    try {
      await dbStorage.workspace.put({
        id: 'current_workspace',
        tabs,
        activeTabId,
        zoomLevels,
        theme,
        activeDatabase,
        sidebarWidth,
      });
    } catch (_) {}
  }, [tabs, activeTabId, zoomLevels, theme, activeDatabase, sidebarWidth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      persistWorkspace();
    }, 500);
    return () => clearTimeout(timer);
  }, [persistWorkspace]);

  // Recarregar schemas
  const refreshSchemas = useCallback(async () => {
    const tree = await dbEngine.getSchemaTree();
    setSchemas(tree);
    setActiveDatabase(dbEngine.getActiveDatabase());
  }, []);

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

  // Revisar trecho selecionado (Alt+R)
  const handleReviewSnippet = useCallback((snippet: string) => {
    if (!snippet.trim()) return;
    const rev = reviewSqlQuery(snippet, activeDatabase, schemas);
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
  }, [tabs.length, activeDatabase, activeView]);

  // Criar Aba em Branco (via dropdown)
  const handleNewBlankTab = useCallback(() => {
    handleNewTab();
  }, [handleNewTab]);

  // Carregar Solução (via dropdown)
  const handleOpenSolution = useCallback((solution: SolutionItem) => {
    handleNewTab(solution.content, solution.fileName);
  }, [handleNewTab]);

  // Fechar Todas as Guias
  const handleCloseAllTabs = useCallback(() => {
    const newId = `tab-${Date.now()}`;
    const defaultContent = activeDatabase
      ? `-- Script SQL limpo\nUSE \`${activeDatabase}\`;\n\n`
      : `-- Script SQL limpo\n\n`;
    const newTab: TabItem = {
      id: newId,
      title: 'script_1.sql',
      content: defaultContent,
    };
    setTabs([newTab]);
    setActiveTabId(newId);
  }, [activeDatabase]);

  // Carregar Preset do Schema Explorer (Vazio, Exemplos, BDs Aula)
  const handleLoadPreset = useCallback(async (preset: DatabasePreset) => {
    setIsExecuting(true);
    await dbEngine.loadPreset(preset);
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
        columns: ['Status', 'Ambiente Ativo', 'Banco de Dados'],
        rows: [{
          Status: 'Ambiente carregado com sucesso!',
          'Ambiente Ativo': presetLabel,
          'Banco de Dados': newActiveDb || '(nenhum banco ativo)'
        }],
        executionTimeMs: 15,
        status: 'success',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        database: newActiveDb,
      },
    ]);
    setActiveConsoleTab('grid');
    setIsExecuting(false);
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

  // Fechar Aba
  const handleCloseTab = useCallback((id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id && next.length > 0) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next.length > 0 ? next : INITIAL_TABS;
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
      await dbEngine.resetDatabase();
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
    }
  }, [refreshSchemas]);

  // Alternar Tema
  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.className = next;
      return next;
    });
  }, []);

  // Atalhos Globais de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          const selectedText = ed.getModel()?.getValueInRange(selection);
          if (selectedText && selectedText.trim()) {
            handleRunSnippet(selectedText.trim());
          } else {
            handleRunQuery();
          }
        }
      }
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (editorRef.current) {
          const ed = editorRef.current;
          const selection = ed.getSelection();
          const selectedText = ed.getModel()?.getValueInRange(selection);
          const toReview = selectedText && selectedText.trim() ? selectedText.trim() : ed.getValue();
          if (toReview) {
            handleReviewSnippet(toReview);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunQuery, handleNewTab, handleRunSnippet, handleReviewSnippet]);

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
      {/* 1. Header Superior */}
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
        onToggleTheme={handleToggleTheme}
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
          onSelectTableForQuery={(db, tbl) =>
            handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
          }
        />
      ) : activeView === 'settings' ? (
        <SettingsView
          onResetDb={handleResetDb}
          onRefreshSchemas={refreshSchemas}
          onImportSqlSuccess={(sql) => handleNewTab(sql, 'importado.sql')}
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
                    setZoomLevels(p => ({ ...p, sidebar: Math.min(180, p.sidebar + 10) }))
                  }
                  onZoomOut={() =>
                    setZoomLevels(p => ({ ...p, sidebar: Math.max(70, p.sidebar - 10) }))
                  }
                  onZoomReset={() =>
                    setZoomLevels(p => ({ ...p, sidebar: 100 }))
                  }
                  onContextMenu={setContextMenuTarget}
                  onTableDoubleClick={(db, tbl) =>
                    handleNewTab(`USE \`${db}\`;\nSELECT * FROM \`${tbl}\` LIMIT 100;\n`, `${tbl}.sql`)
                  }
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
                      setZoomLevels(p => ({ ...p, editor: Math.min(180, p.editor + 10) }))
                    }
                    onZoomOut={() =>
                      setZoomLevels(p => ({ ...p, editor: Math.max(70, p.editor - 10) }))
                    }
                    onZoomReset={() =>
                      setZoomLevels(p => ({ ...p, editor: 100 }))
                    }
                    theme={theme}
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
                      setZoomLevels(p => ({ ...p, console: Math.min(180, p.console + 10) }))
                    }
                    onZoomOut={() =>
                      setZoomLevels(p => ({ ...p, console: Math.max(70, p.console - 10) }))
                    }
                    onZoomReset={() =>
                      setZoomLevels(p => ({ ...p, console: 100 }))
                    }
                    review={sqlReview}
                    onApplyReviewSuggestion={handleApplyReviewSuggestion}
                    activeConsoleTab={activeConsoleTab}
                    onSelectConsoleTab={setActiveConsoleTab}
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
                    setZoomLevels(p => ({ ...p, editor: Math.min(180, p.editor + 10) }))
                  }
                  onZoomOut={() =>
                    setZoomLevels(p => ({ ...p, editor: Math.max(70, p.editor - 10) }))
                  }
                  onZoomReset={() =>
                    setZoomLevels(p => ({ ...p, editor: 100 }))
                  }
                  theme={theme}
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
                    setZoomLevels(p => ({ ...p, console: Math.min(180, p.console + 10) }))
                  }
                  onZoomOut={() =>
                    setZoomLevels(p => ({ ...p, console: Math.max(70, p.console - 10) }))
                  }
                  onZoomReset={() =>
                    setZoomLevels(p => ({ ...p, console: 100 }))
                  }
                  review={sqlReview}
                  onApplyReviewSuggestion={handleApplyReviewSuggestion}
                  activeConsoleTab={activeConsoleTab}
                  onSelectConsoleTab={setActiveConsoleTab}
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
