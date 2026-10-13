import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import type {
  ActiveView,
  TabItem,
  QueryResult,
  DatabaseSchema,
  ZoomLevels,
  ThemeMode,
  ContextMenuTarget,
  SqlReview,
} from './types';

const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    title: 'consulta_produtos.sql',
    content: `-- Bem-vindo ao SQLEditor! (Google Antigravity - SENAI Edition)
-- O motor AlaSQL e IndexedDB mantém todos os seus bancos salvos 100% no navegador.

USE ecommerce_db;

-- 1. Consultar produtos com suas categorias
SELECT 
  p.id,
  p.nome AS produto,
  p.preco,
  p.estoque,
  c.nome AS categoria
FROM produtos p
JOIN categorias c ON p.categoria_id = c.id
ORDER BY p.preco DESC;
`,
  },
  {
    id: 'tab-2',
    title: 'relatorio_pedidos.sql',
    content: `USE ecommerce_db;

-- 2. Resumo de pedidos com valor total
SELECT 
  pd.id AS pedido_id,
  u.nome AS cliente,
  u.cidade,
  pd.data_pedido,
  pd.valor_total,
  pd.status
FROM pedidos pd
JOIN usuarios u ON pd.usuario_id = u.id
ORDER BY pd.data_pedido DESC;
`,
  }
];

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>('ecommerce_db');
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

  // Carrega e restaura estado persistente ao inicializar
  useEffect(() => {
    const initApp = async () => {
      await dbEngine.initialize();
      const currentActiveDb = dbEngine.getActiveDatabase();
      setActiveDatabase(currentActiveDb);

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
    const newTab: TabItem = {
      id: newId,
      title: tabName || `script_${nextNum}.sql`,
      content: initialContent || `-- Novo script SQL\nUSE \`${activeDatabase}\`;\n\n`,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    if (activeView !== 'workspace') {
      setActiveView('workspace');
    }
  }, [tabs.length, activeDatabase, activeView]);

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

  // Resetar Banco de Dados
  const handleResetDb = useCallback(async () => {
    if (confirm('Deseja restaurar todos os bancos de dados para os valores padrão de estudo? Todas as alterações locais serão substituídas.')) {
      setIsExecuting(true);
      await dbEngine.resetDatabase();
      await refreshSchemas();
      setResults([
        {
          statement: 'RESTORE DEFAULTS;',
          columns: ['Mensagem'],
          rows: [{ Mensagem: 'Bancos de dados padrão restaurados com sucesso!' }],
          executionTimeMs: 10,
          status: 'success',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          database: 'ecommerce_db',
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
        onRunQuery={handleRunQuery}
        onNewTab={() => handleNewTab()}
        onClearEditor={handleClearEditor}
        onResetDb={handleResetDb}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isExecuting={isExecuting}
        activeDatabase={activeDatabase}
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

          {/* B. Coluna da Direita: Editor + Console */}
          <section id="workspace-panel" className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Editor de Código SQL (Parte Superior) */}
            <div style={{ height: `${editorHeightPercent}%` }} className="min-h-[140px] flex flex-col">
              <EditorWorkspace
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTab}
                onNewTab={() => handleNewTab()}
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

            {/* Console de Resultados, Grade de Dados e Revisão (Parte Inferior) */}
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
          </section>
        </main>
      )}

      {/* Menu de Contexto Flutuante */}
      <ContextMenu
        target={contextMenuTarget}
        onClose={() => setContextMenuTarget(null)}
        onAction={(sql) => handleNewTab(sql, 'script_contexto.sql')}
      />
    </div>
  );
};

export default App;
