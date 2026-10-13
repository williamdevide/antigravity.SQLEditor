import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { ZoomControl } from './ZoomControl';
import { NewTabDropdown } from './NewTabDropdown';
import type { TabItem, ThemeMode, DatabaseSchema } from '../types';
import type { SolutionItem } from '../services/scriptsLoader';

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
  schemas,
  activeDatabase,
  editorRefOut,
}) => {
  const editorRef = useRef<any>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (editorRefOut) {
      editorRefOut.current = editor;
    }

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

    // 3. Copiar trecho (Ctrl+C)
    editor.addAction({
      id: 'sql-copy-selection',
      label: 'Copiar trecho (Ctrl+C)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
      contextMenuGroupId: '2_edit_actions',
      contextMenuOrder: 1,
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(selection);
          if (text) {
            navigator.clipboard.writeText(text);
          }
        }
      },
    });

    // 4. Recortar trecho (Ctrl+X)
    editor.addAction({
      id: 'sql-cut-selection',
      label: 'Recortar trecho (Ctrl+X)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
      contextMenuGroupId: '2_edit_actions',
      contextMenuOrder: 2,
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection && !selection.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(selection);
          if (text) {
            navigator.clipboard.writeText(text);
            ed.executeEdits('cut', [{ range: selection, text: '' }]);
          }
        }
      },
    });

    // 5. Deletar trecho (Del)
    editor.addAction({
      id: 'sql-delete-selection',
      label: 'Deletar trecho (Del)',
      keybindings: [monaco.KeyCode.Delete],
      contextMenuGroupId: '2_edit_actions',
      contextMenuOrder: 3,
      run: (ed) => {
        const selection = ed.getSelection();
        if (selection && !selection.isEmpty()) {
          ed.executeEdits('delete', [{ range: selection, text: '' }]);
        }
      },
    });

    // 6. Alterar todas as ocorrências com Localizar e Substituir (Ctrl+F2 / Ctrl+H)
    editor.addAction({
      id: 'sql-find-and-replace',
      label: 'Alterar todas as ocorrências (Substituir)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2],
      contextMenuGroupId: '2_edit_actions',
      contextMenuOrder: 4,
      run: (ed) => {
        ed.getAction('editor.action.startFindReplaceAction')?.run();
      },
    });

    // Oculta a opção redundante em inglês 'Change All Occurrences', mantendo somente a nossa em português
    const hideEnglishChangeAll = () => {
      const actionItems = document.querySelectorAll('.monaco-menu .action-item');
      actionItems.forEach(item => {
        const label = item.querySelector('.action-label');
        if (label && label.textContent && label.textContent.toLowerCase().includes('change all occurrences')) {
          (item as HTMLElement).style.display = 'none';
        }
      });
    };

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('contextmenu', () => {
        setTimeout(hideEnglishChangeAll, 10);
        setTimeout(hideEnglishChangeAll, 50);
        setTimeout(hideEnglishChangeAll, 150);
      });
    }

    // Observer para garantir que qualquer abertura de menu filtre o item em inglês
    const observer = new MutationObserver(() => {
      hideEnglishChangeAll();
    });
    observer.observe(document.body, { childList: true, subtree: true });

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
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group h-8 px-3 flex items-center gap-2 text-xs font-mono cursor-pointer border-r border-[var(--border-color)] transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] border-t-2 border-t-[var(--accent-yellow)] font-semibold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={tab.title}
              >
                <span className="material-symbols-outlined text-[13px] text-[#FF8533]">
                  description
                </span>
                <span className="truncate max-w-[120px]">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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

          {/* Botão de Adicionar Aba com Menu Suspenso */}
          <NewTabDropdown
            onNewBlankTab={onNewBlankTab}
            onSelectSolution={onOpenSolution}
            solutions={solutions}
            align="left"
            triggerButton={({ isOpen, toggle }) => (
              <button
                onClick={toggle}
                title="Nova Aba ou Carregar Solução"
                className={`w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded transition-colors ml-1 cursor-pointer shrink-0 ${
                  isOpen ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)] shadow-sm' : ''
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
              </button>
            )}
          />
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
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            value={activeTab.content}
            onChange={(val) => onUpdateContent(activeTab.id, val || '')}
            onMount={handleEditorDidMount}
            options={{
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
      </div>
    </div>
  );
};
