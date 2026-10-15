import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { ZoomControl } from './ZoomControl';
import { NewTabDropdown } from './NewTabDropdown';
import type { TabItem, ThemeMode, FontTheme, DatabaseSchema } from '../types';
import type { SolutionItem } from '../services/scriptsLoader';
import { registerAllMonacoThemes, getMonacoThemeName } from '../services/monacoThemeHelper';

interface EditorWorkspaceProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewBlankTab: () => void;
  onOpenSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  onUpdateContent: (id: string, content: string) => void;
  onRunQuery: () => void;
  onRunSnippet: (snippet: string) => void;
  onReviewSnippet: (snippet: string) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  theme: ThemeMode;
  fontTheme: FontTheme;
  onRenameTab: (id: string, newTitle: string) => void;
  onExportScript?: () => void;
  onToggleTheme?: () => void;
  onToggleFontTheme?: () => void;
  schemas: DatabaseSchema[];
  activeDatabase: string;
  editorRefOut?: React.MutableRefObject<any>;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewBlankTab,
  onOpenSolution,
  solutions,
  onUpdateContent,
  onRunQuery,
  onRunSnippet,
  onReviewSnippet,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme,
  fontTheme,
  onRenameTab,
  onExportScript,
  onToggleTheme,
  onToggleFontTheme,
  schemas,
  activeDatabase,
  editorRefOut,
}) => {
  const editorRef = useRef<any>(null);
  const monacoInstanceRef = useRef<any>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Estado e métodos para renomeação de abas (duplo clique ou F2)
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Menu de contexto suspenso customizado do Editor de Script (elimina 100% de itens indesejados)
  const [editorContextMenu, setEditorContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const editorContextMenuRef = useRef<HTMLDivElement>(null);

  const handleOpenContextMenu = useCallback((clientX: number, clientY: number) => {
    const x = Math.max(10, Math.min(clientX, window.innerWidth - 300));
    const y = Math.max(10, Math.min(clientY, window.innerHeight - 240));
    setEditorContextMenu({ visible: true, x, y });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setEditorContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (editorContextMenuRef.current && !editorContextMenuRef.current.contains(e.target as Node)) {
        handleCloseContextMenu();
      }
    };
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseContextMenu();
      }
    };
    if (editorContextMenu.visible) {
      window.addEventListener('mousedown', handleGlobalClick);
      window.addEventListener('keydown', handleGlobalKey);
      return () => {
        window.removeEventListener('mousedown', handleGlobalClick);
        window.removeEventListener('keydown', handleGlobalKey);
      };
    }
  }, [editorContextMenu.visible, handleCloseContextMenu]);

  const startRenaming = useCallback((tabId: string, currentTitle: string) => {
    setEditingTabId(tabId);
    setEditingTitle(currentTitle);
  }, []);

  const commitRename = useCallback(() => {
    if (editingTabId) {
      let trimmed = editingTitle.trim();
      if (trimmed) {
        const currentTab = tabs.find(t => t.id === editingTabId);
        const originalExt = currentTab?.title && currentTab.title.includes('.')
          ? currentTab.title.substring(currentTab.title.lastIndexOf('.'))
          : '';
        if (originalExt && !trimmed.includes('.')) {
          trimmed = `${trimmed}${originalExt}`;
        }
        onRenameTab(editingTabId, trimmed);
      }
      setEditingTabId(null);
    }
  }, [editingTabId, editingTitle, onRenameTab, tabs]);

  const cancelRename = useCallback(() => {
    setEditingTabId(null);
  }, []);

  // Ao iniciar a renomeação, foca no input e seleciona somente o nome do arquivo, sem a extensão
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      const input = editInputRef.current;
      input.focus();
      const dotIndex = input.value.lastIndexOf('.');
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
    }
  }, [editingTabId]);

  // Sincroniza dinamicamente o tema de sintaxe e cores no Monaco quando theme ou fontTheme mudam
  useEffect(() => {
    if (monacoInstanceRef.current) {
      const themeId = getMonacoThemeName(theme, fontTheme);
      monacoInstanceRef.current.editor.setTheme(themeId);
    }
  }, [theme, fontTheme]);

  interface TabViewState {
    viewState: any;
    selection: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    } | null;
  }

  // Mapa de ViewState e Seleção por aba para preservar a seleção ao alternar entre abas
  const tabStatesRef = useRef<Record<string, TabViewState>>({});
  const currentTabIdRef = useRef<string>(activeTabId);
  currentTabIdRef.current = activeTabId;

  // Salva o ViewState e Seleção da aba ativa atual
  const saveCurrentTabState = () => {
    const currentId = currentTabIdRef.current;
    const editor = editorRef.current;
    if (currentId && editor) {
      try {
        const viewState = editor.saveViewState();
        const selection = editor.getSelection();
        tabStatesRef.current[currentId] = {
          viewState,
          selection: selection && !selection.isEmpty() ? {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn,
          } : null,
        };
      } catch (_) {}
    }
  };

  // Restaura ViewState e Seleção ao trocar de aba ativa
  useEffect(() => {
    const targetId = activeTabId;
    const editor = editorRef.current;
    if (!editor) return;

    const saved = tabStatesRef.current[targetId];
    if (saved) {
      const timer = setTimeout(() => {
        if (editorRef.current && currentTabIdRef.current === targetId) {
          try {
            if (saved.viewState) {
              editorRef.current.restoreViewState(saved.viewState);
            }
            if (saved.selection) {
              editorRef.current.setSelection(saved.selection);
              editorRef.current.revealRangeInCenterIfOutsideViewport(saved.selection);
            }
            editorRef.current.focus();
          } catch (_) {}
        }
      }, 35);
      return () => clearTimeout(timer);
    }
  }, [activeTabId]);

  // Rola automaticamente a barra de abas até o final (exibindo a última aba e o botão +)
  useEffect(() => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollTo({
        left: tabsContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [tabs.length, activeTabId]);
  const schemasRef = useRef(schemas);
  schemasRef.current = schemas;
  const activeDatabaseRef = useRef(activeDatabase);
  activeDatabaseRef.current = activeDatabase;

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Exportar script da aba ativa como arquivo .sql para download
  const handleExportCurrentScript = useCallback(() => {
    const tabToExport = tabs.find(t => t.id === currentTabIdRef.current) || activeTab;
    if (!tabToExport) return;
    const content = editorRef.current ? editorRef.current.getValue() : tabToExport.content;
    const rawTitle = tabToExport.title || 'script';
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
  }, [tabs, activeTab]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoInstanceRef.current = monaco;
    registerAllMonacoThemes(monaco);
    monaco.editor.setTheme(getMonacoThemeName(theme, fontTheme));

    if (editorRefOut) {
      editorRefOut.current = editor;
    }

    // Atalho F2 dentro do editor Monaco para renomear o script ativo
    editor.addCommand(monaco.KeyCode.F2, () => {
      const targetId = currentTabIdRef.current;
      const tabToRename = tabs.find(t => t.id === targetId) || activeTab;
      if (tabToRename) {
        startRenaming(tabToRename.id, tabToRename.title);
      }
    });

    // Atalhos para alternar cores do tema e cores das letras direto do editor
    if (onToggleTheme) {
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyT, () => {
        onToggleTheme();
      });
    }
    if (onToggleFontTheme) {
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyL, () => {
        onToggleFontTheme();
      });
    }

    // Monitora seleção e cursor em tempo real para preservar entre abas
    editor.onDidChangeCursorSelection((e) => {
      const currentId = currentTabIdRef.current;
      if (currentId && editorRef.current) {
        try {
          const viewState = editorRef.current.saveViewState();
          const sel = e.selection;
          tabStatesRef.current[currentId] = {
            viewState,
            selection: sel && !sel.isEmpty() ? {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            } : null,
          };
        } catch (_) {}
      }
    });

    editor.onDidScrollChange(() => {
      const currentId = currentTabIdRef.current;
      if (currentId && editorRef.current) {
        try {
          const viewState = editorRef.current.saveViewState();
          if (!tabStatesRef.current[currentId]) {
            tabStatesRef.current[currentId] = { viewState, selection: null };
          } else {
            tabStatesRef.current[currentId].viewState = viewState;
          }
        } catch (_) {}
      }
    });

    // Atalho global do editor: Ctrl+Enter / Cmd+Enter (Executar tudo)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunQuery();
    });

    // 1. Executar esse trecho (Alt+E)
    editor.addAction({
      id: 'sql-run-selection',
      label: 'Executar esse trecho (Alt+E)',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyE],
      contextMenuGroupId: '1_sql_actions',
      contextMenuOrder: 1,
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(selection);
          if (text && text.trim()) {
            onRunSnippet(text.trim());
            return;
          }
        }
        // Se não houver seleção, executa a linha atual ou tudo
        onRunQuery();
      },
    });

    // 2. Revisar trecho (Alt+R)
    editor.addAction({
      id: 'sql-review-selection',
      label: 'Revisar trecho (Alt+R)',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
      contextMenuGroupId: '1_sql_actions',
      contextMenuOrder: 2,
      run: (ed) => {
        const selection = ed.getSelection();
        const text = selection && !selection.isEmpty() ? ed.getModel()?.getValueInRange(selection) : '';
        const codeToReview = text && text.trim() ? text.trim() : ed.getValue();
        if (codeToReview) {
          onReviewSnippet(codeToReview);
        }
      },
    });

    // 3. Exportar Script .sql (Ctrl+S) com tecla de atalho
    editor.addAction({
      id: 'sql-export-script',
      label: 'Exportar Script .sql (Ctrl+S)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      contextMenuGroupId: '1_sql_actions',
      contextMenuOrder: 3,
      run: () => {
        if (onExportScript) {
          onExportScript();
        } else {
          handleExportCurrentScript();
        }
      },
    });

    // 4. Alterar todas as ocorrências (Substituir) (Ctrl+F2 / Ctrl+H)
    editor.addAction({
      id: 'sql-find-and-replace',
      label: 'Alterar todas as ocorrências (Substituir)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2],
      contextMenuGroupId: '1_sql_actions',
      contextMenuOrder: 4,
      run: (ed) => {
        ed.getAction('editor.action.startFindReplaceAction')?.run();
      },
    });

    // Ações de recortar/copiar/deletar via atalho permanecem ativas sem poluir o menu de contexto
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) navigator.clipboard.writeText(text);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(selection);
        if (text) {
          navigator.clipboard.writeText(text);
          editor.executeEdits('cut', [{ range: selection, text: '' }]);
        }
      }
    });

    // Intercepta e abre o menu de contexto customizado, garantindo 0 opções indesejadas
    editor.onContextMenu((e: any) => {
      e.event?.preventDefault();
      e.event?.stopPropagation();
      handleOpenContextMenu(e.event?.posx || 120, e.event?.posy || 120);
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleOpenContextMenu(e.clientX, e.clientY);
      }, true);
    }

    // Provedor de autocompletar dinâmico estrito ao BANCO ATIVO e com filtro pelo INÍCIO digitado
    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', '`'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const query = (word?.word || '').trim().toLowerCase();

        // Só exibe sugestões conforme digitamos letra correspondente ao início (não exibe em espaço em branco)
        if (!query || query.length === 0) {
          return { suggestions: [] };
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const currentActiveDb = activeDatabaseRef.current;
        const currentSchemas = schemasRef.current;
        const activeDbSchema = currentSchemas.find(d => d.name === currentActiveDb);

        const suggestions: any[] = [];

        // 1. TABELAS PERTINENTES AO BANCO SELECIONADO (somente iniciadas pelo texto digitado)
        if (activeDbSchema) {
          for (const tbl of activeDbSchema.tables) {
            if (tbl.name.toLowerCase().startsWith(query)) {
              suggestions.push({
                label: {
                  label: tbl.name,
                  description: `Tabela (${currentActiveDb})`,
                  detail: ` • ${tbl.rowCount} linhas`,
                },
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: tbl.name,
                sortText: `00_${tbl.name}`,
                documentation: `Tabela '${tbl.name}' no banco ativo '${currentActiveDb}'.\nColunas:\n${tbl.columns.map(c => ` - ${c.name} (${c.type})`).join('\n')}`,
                range,
              });
            }
          }

          // 2. COLUNAS DO BANCO SELECIONADO (somente iniciadas pelo texto digitado)
          for (const tbl of activeDbSchema.tables) {
            for (const col of tbl.columns) {
              if (col.name.toLowerCase().startsWith(query)) {
                suggestions.push({
                  label: {
                    label: col.name,
                    description: `${tbl.name}.${col.name}`,
                    detail: ` [${col.type}]`,
                  },
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.name,
                  sortText: `01_${col.name}`,
                  documentation: `Coluna '${col.name}' (${col.type}) na tabela '${tbl.name}' do banco ativo '${currentActiveDb}'.`,
                  range,
                });
              }
            }
          }
        }

        // 3. FUNÇÕES SQL / MYSQL (somente iniciadas pelo texto digitado)
        const functions = [
          { name: 'DATE_FORMAT', snippet: "DATE_FORMAT(${1:campo}, '${2:%d/%m/%Y}')", doc: 'Formata data conforme padrão MySQL' },
          { name: 'NOW', snippet: 'NOW()', doc: 'Retorna a data e hora atual (YYYY-MM-DD HH:MM:SS)' },
          { name: 'CURDATE', snippet: 'CURDATE()', doc: 'Retorna a data atual (YYYY-MM-DD)' },
          { name: 'CURTIME', snippet: 'CURTIME()', doc: 'Retorna a hora atual (HH:MM:SS)' },
          { name: 'DATEDIFF', snippet: 'DATEDIFF(${1:data1}, ${2:data2})', doc: 'Diferença em dias entre duas datas' },
          { name: 'IFNULL', snippet: 'IFNULL(${1:campo}, ${2:padrao})', doc: 'Retorna valor padrão se campo for nulo' },
          { name: 'CONCAT_WS', snippet: "CONCAT_WS('${1: }', ${2:val1}, ${3:val2})", doc: 'Concatena valores com separador' },
          { name: 'COUNT', snippet: 'COUNT(${1:*})', doc: 'Contagem de linhas' },
          { name: 'SUM', snippet: 'SUM(${1:campo})', doc: 'Soma dos valores' },
          { name: 'AVG', snippet: 'AVG(${1:campo})', doc: 'Média dos valores' },
          { name: 'MIN', snippet: 'MIN(${1:campo})', doc: 'Valor mínimo' },
          { name: 'MAX', snippet: 'MAX(${1:campo})', doc: 'Valor máximo' },
        ];

        for (const fn of functions) {
          if (fn.name.toLowerCase().startsWith(query)) {
            suggestions.push({
              label: fn.name,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: fn.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: `02_${fn.name}`,
              documentation: fn.doc,
              range,
            });
          }
        }

        // 4. PALAVRAS-CHAVE MYSQL (somente iniciadas pelo texto digitado)
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
          'DELETE FROM', 'CREATE DATABASE', 'USE', 'CREATE TABLE', 'DROP TABLE',
          'DROP DATABASE', 'ALTER TABLE', 'ADD COLUMN', 'ORDER BY', 'GROUP BY',
          'HAVING', 'LIMIT', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
          'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS NULL', 'IS NOT NULL',
          'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'AUTO_INCREMENT',
          'INT', 'VARCHAR', 'DECIMAL', 'DATE', 'DATETIME', 'TEXT', 'BOOLEAN'
        ];

        for (const kw of keywords) {
          if (kw.toLowerCase().startsWith(query)) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              sortText: `03_${kw}`,
              range,
            });
          }
        }

        return { suggestions };
      },
    });
  };

  const baseFontSize = 14;
  const currentFontSize = Math.round(baseFontSize * (zoomLevel / 100));

  return (
    <div className="flex-1 flex flex-col min-h-[160px] bg-[var(--bg-secondary)] overflow-hidden transition-colors">
      {/* Barra de Abas e Controle de Zoom */}
      <div className="h-9 bg-[var(--bg-primary)] flex items-center justify-between border-b border-[var(--border-color)] px-2 select-none shrink-0">
        <div
          ref={tabsContainerRef}
          className="flex items-center overflow-x-auto no-scrollbar gap-1 max-w-[calc(100%-140px)] scroll-smooth py-0.5"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = tab.id === editingTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  if (!isEditing) {
                    saveCurrentTabState();
                    onSelectTab(tab.id);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRenaming(tab.id, tab.title);
                }}
                className={`group h-8 px-3 flex items-center gap-2 text-xs font-mono cursor-pointer border-r border-[var(--border-color)] transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] border-t-2 border-t-[var(--accent-yellow)] font-semibold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={isEditing ? 'Pressione Enter para salvar, Esc para cancelar' : `${tab.title} (Duplo clique ou F2 para renomear)`}
              >
                <span className="material-symbols-outlined text-[13px] text-[#FF8533]">
                  description
                </span>
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="w-28 px-1.5 py-0.5 text-xs font-mono bg-[var(--bg-primary)] text-[var(--accent-yellow)] border border-[#FF6B00] rounded outline-none shadow-[0_0_8px_rgba(255,107,0,0.3)]"
                  />
                ) : (
                  <span className="truncate max-w-[140px] select-none">{tab.title}</span>
                )}
                {!isEditing && tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveCurrentTabState();
                      delete tabStatesRef.current[tab.id];
                      onCloseTab(tab.id);
                    }}
                    title="Fechar Aba"
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF3366] hover:bg-[#FF3366]/20 transition-colors ml-1"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* Botão de Adicionar Aba em Branco Direto (+) com Menu Suspenso de Soluções */}
          <div className="flex items-center ml-1 shrink-0 bg-[var(--bg-secondary)] rounded border border-[var(--border-color)]/60 p-0.5 shadow-sm">
            <button
              onClick={() => {
                saveCurrentTabState();
                onNewBlankTab();
              }}
              title="Nova Aba em Branco (+)"
              className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>

            <NewTabDropdown
              onNewBlankTab={() => {
                saveCurrentTabState();
                onNewBlankTab();
              }}
              onSelectSolution={(sol) => {
                saveCurrentTabState();
                onOpenSolution(sol);
              }}
              solutions={solutions}
              align="left"
              triggerButton={({ isOpen, toggle }) => (
                <button
                  onClick={toggle}
                  title="Mais Opções (Carregar Soluções)"
                  className={`w-4 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer ${
                    isOpen ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)]' : ''
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[13px]">arrow_drop_down</span>
                </button>
              )}
            />
          </div>
        </div>

        {/* Zoom do Editor */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ZoomControl
            level={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onZoomReset}
          />
        </div>
      </div>

      {/* Editor Monaco */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {activeTab ? (
          <Editor
            height="100%"
            language="sql"
            theme={getMonacoThemeName(theme, fontTheme)}
            beforeMount={(monaco) => {
              monacoInstanceRef.current = monaco;
              registerAllMonacoThemes(monaco);
            }}
            value={activeTab.content}
            onChange={(val) => onUpdateContent(activeTab.id, val || '')}
            onMount={handleEditorDidMount}
            options={{
              contextmenu: false,
              fontSize: currentFontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              tabSize: 2,
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-xs">
            Nenhuma aba aberta. Clique em + para criar uma nova aba.
          </div>
        )}

        {/* Menu Suspenso Customizado do Editor (100% livre de opções indesejadas) */}
        {editorContextMenu.visible && (
          <div
            ref={editorContextMenuRef}
            style={{
              position: 'fixed',
              left: `${editorContextMenu.x}px`,
              top: `${editorContextMenu.y}px`,
              zIndex: 999999,
            }}
            className="w-72 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.45)] py-1.5 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1 text-[10px] font-mono text-[var(--accent-yellow)] uppercase tracking-wider border-b border-[var(--border-color)] flex items-center justify-between font-semibold">
              <span>Opções do Script</span>
              <span className="text-[9px] text-[var(--text-muted)] font-normal">SQL Editor</span>
            </div>

            {/* 1. Executar esse trecho (Alt+E) */}
            <button
              onClick={() => {
                handleCloseContextMenu();
                const ed = editorRef.current;
                if (ed) {
                  const sel = ed.getSelection();
                  if (sel && !sel.isEmpty()) {
                    const text = ed.getModel()?.getValueInRange(sel);
                    if (text && text.trim()) {
                      onRunSnippet(text.trim());
                      return;
                    }
                  }
                }
                onRunQuery();
              }}
              className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--status-success)] group-hover:scale-110 transition-transform">
                  play_arrow
                </span>
                <span className="font-medium">Executar esse trecho</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent-yellow)]">
                Alt+E
              </kbd>
            </button>

            {/* 2. Revisar trecho (Alt+R) */}
            <button
              onClick={() => {
                handleCloseContextMenu();
                const ed = editorRef.current;
                let toReview = '';
                if (ed) {
                  const sel = ed.getSelection();
                  if (sel && !sel.isEmpty()) {
                    toReview = ed.getModel()?.getValueInRange(sel) || '';
                  }
                  if (!toReview.trim()) {
                    toReview = ed.getValue();
                  }
                }
                if (toReview.trim()) {
                  onReviewSnippet(toReview.trim());
                }
              }}
              className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)] group-hover:scale-110 transition-transform">
                  auto_fix_high
                </span>
                <span className="font-medium">Revisar trecho</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent-yellow)]">
                Alt+R
              </kbd>
            </button>

            <div className="h-px bg-[var(--border-color)] my-1" />

            {/* 3. Exportar Script .sql (Ctrl+S) */}
            <button
              onClick={() => {
                handleCloseContextMenu();
                if (onExportScript) {
                  onExportScript();
                } else {
                  handleExportCurrentScript();
                }
              }}
              className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#00E676] group-hover:scale-110 transition-transform">
                  download
                </span>
                <span className="font-medium">Exportar Script .sql</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent-orange)]">
                Ctrl+S
              </kbd>
            </button>

            {/* 4. Alterar todas as ocorrências (Substituir) (Ctrl+F2) */}
            <button
              onClick={() => {
                handleCloseContextMenu();
                editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
              }}
              className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#29B6F6] group-hover:scale-110 transition-transform">
                  find_replace
                </span>
                <span className="font-medium">Alterar todas as ocorrências (Substituir)</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[#29B6F6]">
                Ctrl+F2
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
