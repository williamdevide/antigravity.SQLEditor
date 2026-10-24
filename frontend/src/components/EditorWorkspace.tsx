import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { ZoomControl } from './ZoomControl';
import { NewTabDropdown } from './NewTabDropdown';
import type { TabItem, ThemeMode, FontTheme, DatabaseSchema } from '../types';
import type { SolutionItem } from '../services/scriptsLoader';
import { registerAllMonacoThemes, getMonacoThemeName } from '../services/monacoThemeHelper';
import { registerEnhancedSqlLanguage } from '../services/mysqlLanguageDefinition';

// Dicionário de auto-correção de palavras-chave para MAIÚSCULAS ao digitar (ex: 'from ' -> 'FROM ')
const SQL_KEYWORDS_MAP: Record<string, string> = {
  select: 'SELECT',
  from: 'FROM',
  where: 'WHERE',
  insert: 'INSERT',
  into: 'INTO',
  values: 'VALUES',
  update: 'UPDATE',
  set: 'SET',
  delete: 'DELETE',
  create: 'CREATE',
  table: 'TABLE',
  database: 'DATABASE',
  schema: 'SCHEMA',
  drop: 'DROP',
  alter: 'ALTER',
  add: 'ADD',
  column: 'COLUMN',
  use: 'USE',
  truncate: 'TRUNCATE',
  show: 'SHOW',
  describe: 'DESCRIBE',
  desc: 'DESC',
  asc: 'ASC',
  join: 'JOIN',
  inner: 'INNER',
  left: 'LEFT',
  right: 'RIGHT',
  outer: 'OUTER',
  cross: 'CROSS',
  on: 'ON',
  group: 'GROUP',
  order: 'ORDER',
  by: 'BY',
  having: 'HAVING',
  limit: 'LIMIT',
  offset: 'OFFSET',
  as: 'AS',
  distinct: 'DISTINCT',
  and: 'AND',
  or: 'OR',
  not: 'NOT',
  null: 'NULL',
  is: 'IS',
  in: 'IN',
  between: 'BETWEEN',
  like: 'LIKE',
  exists: 'EXISTS',
  case: 'CASE',
  when: 'WHEN',
  then: 'THEN',
  else: 'ELSE',
  end: 'END',
  union: 'UNION',
  all: 'ALL',
  primary: 'PRIMARY',
  key: 'KEY',
  foreign: 'FOREIGN',
  references: 'REFERENCES',
  auto_increment: 'AUTO_INCREMENT',
  autoincrement: 'AUTOINCREMENT',
  default: 'DEFAULT',
  check: 'CHECK',
  unique: 'UNIQUE',
  int: 'INT',
  integer: 'INTEGER',
  varchar: 'VARCHAR',
  char: 'CHAR',
  decimal: 'DECIMAL',
  numeric: 'NUMERIC',
  float: 'FLOAT',
  double: 'DOUBLE',
  date: 'DATE',
  datetime: 'DATETIME',
  time: 'TIME',
  timestamp: 'TIMESTAMP',
  text: 'TEXT',
  boolean: 'BOOLEAN',
  bool: 'BOOL',
  count: 'COUNT',
  sum: 'SUM',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
  concat: 'CONCAT',
  concat_ws: 'CONCAT_WS',
  length: 'LENGTH',
  char_length: 'CHAR_LENGTH',
  date_format: 'DATE_FORMAT',
  datediff: 'DATEDIFF',
  timediff: 'TIMEDIFF',
  now: 'NOW',
  curdate: 'CURDATE',
  curtime: 'CURTIME',
  upper: 'UPPER',
  lower: 'LOWER',
  round: 'ROUND',
  ceil: 'CEIL',
  ceiling: 'CEILING',
  floor: 'FLOOR',
  trim: 'TRIM',
  substring: 'SUBSTRING',
  replace: 'REPLACE',
  year: 'YEAR',
  month: 'MONTH',
  day: 'DAY',
  hour: 'HOUR',
  minute: 'MINUTE',
  second: 'SECOND',
  ifnull: 'IFNULL',
  coalesce: 'COALESCE',
  strftime: 'STRFTIME',
  julianday: 'JULIANDAY',
};

// Lista de palavras-chave SQL exibidas prioritariamente no autocompletar em MAIÚSCULAS
const SQL_KEYWORDS_LIST: string[] = [
  'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE FROM', 'CREATE DATABASE', 'USE', 'CREATE TABLE', 'DROP TABLE',
  'DROP DATABASE', 'ALTER TABLE', 'ADD COLUMN', 'ORDER BY', 'GROUP BY',
  'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'CROSS JOIN', 'ON', 'AS', 'DISTINCT', 'AND', 'OR', 'NOT', 'NULL', 'IS NULL',
  'IS NOT NULL', 'LIKE', 'BETWEEN', 'IN', 'NOT IN', 'PRIMARY KEY', 'FOREIGN KEY',
  'REFERENCES', 'AUTO_INCREMENT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'UNION', 'UNION ALL', 'ASC', 'DESC', 'SHOW TABLES', 'SHOW DATABASES',
  'DESCRIBE', 'TRUNCATE TABLE', 'INT', 'VARCHAR', 'DECIMAL', 'DATE', 'DATETIME',
  'TEXT', 'BOOLEAN'
];

// Lista de funções SQL/MySQL enriquecidas com snippets interativos
const SQL_FUNCTIONS_LIST = [
  { name: 'CONCAT', snippet: 'CONCAT(${1:str1}, ${2:str2})', doc: 'Concatena dois ou mais textos ou colunas' },
  { name: 'CONCAT_WS', snippet: "CONCAT_WS('${1: }', ${2:val1}, ${3:val2})", doc: 'Concatena valores com separador definido' },
  { name: 'LENGTH', snippet: 'LENGTH(${1:campo})', doc: 'Retorna a quantidade de caracteres do texto' },
  { name: 'CHAR_LENGTH', snippet: 'CHAR_LENGTH(${1:campo})', doc: 'Retorna o número de caracteres do texto' },
  { name: 'DATE_FORMAT', snippet: "DATE_FORMAT(${1:campo}, '${2:%d/%m/%Y}')", doc: 'Formata data conforme padrão MySQL' },
  { name: 'DATEDIFF', snippet: 'DATEDIFF(${1:data1}, ${2:data2})', doc: 'Diferença em dias entre duas datas (data1 - data2)' },
  { name: 'TIMESTAMPDIFF', snippet: 'TIMESTAMPDIFF(${1:YEAR}, ${2:data_inicial}, ${3:data_final})', doc: 'Diferença entre duas datas na unidade especificada (YEAR, MONTH, DAY, HOUR, MINUTE, SECOND)' },
  { name: 'TIMEDIFF', snippet: 'TIMEDIFF(${1:hora1}, ${2:hora2})', doc: 'Diferença entre dois horários' },
  { name: 'NOW', snippet: 'NOW()', doc: 'Retorna a data e hora atual (YYYY-MM-DD HH:MM:SS)' },
  { name: 'CURDATE', snippet: 'CURDATE()', doc: 'Retorna a data atual (YYYY-MM-DD)' },
  { name: 'CURTIME', snippet: 'CURTIME()', doc: 'Retorna a hora atual (HH:MM:SS)' },
  { name: 'UPPER', snippet: 'UPPER(${1:campo})', doc: 'Converte texto para letras maiúsculas' },
  { name: 'LOWER', snippet: 'LOWER(${1:campo})', doc: 'Converte texto para letras minúsculas' },
  { name: 'ROUND', snippet: 'ROUND(${1:numero}, ${2:0})', doc: 'Arredonda valor numérico para N casas decimais' },
  { name: 'CEIL', snippet: 'CEIL(${1:numero})', doc: 'Arredonda valor numérico sempre para cima' },
  { name: 'FLOOR', snippet: 'FLOOR(${1:numero})', doc: 'Arredonda valor numérico sempre para baixo' },
  { name: 'TRIM', snippet: 'TRIM(${1:campo})', doc: 'Remove espaços em branco do início e fim do texto' },
  { name: 'SUBSTRING', snippet: 'SUBSTRING(${1:campo}, ${2:inicio}, ${3:tamanho})', doc: 'Extrai fatia do texto a partir da posição (1-based)' },
  { name: 'REPLACE', snippet: "REPLACE(${1:campo}, '${2:de}', '${3:para}')", doc: 'Substitui ocorrências de um trecho de texto' },
  { name: 'LEFT', snippet: 'LEFT(${1:campo}, ${2:tamanho})', doc: 'Extrai os primeiros N caracteres da esquerda' },
  { name: 'RIGHT', snippet: 'RIGHT(${1:campo}, ${2:tamanho})', doc: 'Extrai os últimos N caracteres da direita' },
  { name: 'YEAR', snippet: 'YEAR(${1:data})', doc: 'Extrai o ano (4 dígitos) de uma data' },
  { name: 'MONTH', snippet: 'MONTH(${1:data})', doc: 'Extrai o mês (1-12) de uma data' },
  { name: 'DAY', snippet: 'DAY(${1:data})', doc: 'Extrai o dia do mês (1-31) de uma data' },
  { name: 'IFNULL', snippet: 'IFNULL(${1:campo}, ${2:padrao})', doc: 'Retorna valor padrão se campo for nulo' },
  { name: 'COALESCE', snippet: 'COALESCE(${1:campo}, ${2:padrao})', doc: 'Retorna o primeiro valor não nulo da lista' },
  { name: 'COUNT', snippet: 'COUNT(${1:*})', doc: 'Contagem de linhas' },
  { name: 'SUM', snippet: 'SUM(${1:campo})', doc: 'Soma dos valores numéricos' },
  { name: 'AVG', snippet: 'AVG(${1:campo})', doc: 'Média aritmética dos valores' },
  { name: 'MIN', snippet: 'MIN(${1:campo})', doc: 'Valor mínimo' },
  { name: 'MAX', snippet: 'MAX(${1:campo})', doc: 'Valor máximo' },
  { name: 'STRFTIME', snippet: "STRFTIME('${1:%Y-%m-%d}', ${2:data})", doc: 'Formata data estilo SQLite/AlaSQL' },
  { name: 'JULIANDAY', snippet: 'JULIANDAY(${1:data})', doc: 'Número de dias julianos' },
  { name: 'DATETIME', snippet: "DATETIME(${1:'now'})", doc: 'Retorna data e hora' },
];

const MAJOR_SQL_VERBS = /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|USE|SHOW|DESCRIBE|DESC|SET|WITH|TRUNCATE)\b/i;

/**
 * Extrai a instrução SQL que envolve a posição atual do cursor,
 * funcionando perfeitamente apenas de o cursor estar na linha, sem precisar selecionar a linha toda.
 */
export function extractStatementAtPosition(fullText: string, position: { lineNumber: number; column: number }): string | null {
  if (!fullText || !fullText.trim()) return null;
  const lines = fullText.split('\n');
  const lineIdx = position.lineNumber - 1;
  if (lineIdx < 0 || lineIdx >= lines.length) return null;

  // Calcula o offset de caractere absoluto da posição do cursor
  let cursorOffset = 0;
  for (let i = 0; i < lineIdx; i++) {
    cursorOffset += lines[i].length + 1;
  }
  cursorOffset += Math.max(0, (position.column || 1) - 1);

  // Varredura identificando os limites reais de cada declaração SQL
  // considerando strings ('...', "..."), crases (`...`), comentários (-- e /* */) e ponto-e-vírgula (;)
  const statements: Array<{ start: number; end: number; text: string; hasSemicolon: boolean }> = [];
  let stmtStart = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText[i];
    const next = i + 1 < fullText.length ? fullText[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingleQuote) {
      if (ch === '\\') { i++; continue; }
      if (ch === "'") {
        if (next === "'") { i++; continue; }
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') {
        if (next === '"') { i++; continue; }
        inDoubleQuote = false;
      }
      continue;
    }
    if (inBacktick) {
      if (ch === '`') inBacktick = false;
      continue;
    }

    // Início de comentários
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '#' && (i === 0 || fullText[i - 1] === '\n' || /\s/.test(fullText[i - 1]))) {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // Início de strings
    if (ch === "'") { inSingleQuote = true; continue; }
    if (ch === '"') { inDoubleQuote = true; continue; }
    if (ch === '`') { inBacktick = true; continue; }

    // Delimitador de declaração explícito ';'
    if (ch === ';') {
      statements.push({
        start: stmtStart,
        end: i + 1,
        text: fullText.substring(stmtStart, i + 1),
        hasSemicolon: true,
      });
      stmtStart = i + 1;
    }
  }

  // Trecho restante após o último ';'
  if (stmtStart < fullText.length) {
    const remaining = fullText.substring(stmtStart);
    if (remaining.trim().length > 0) {
      statements.push({
        start: stmtStart,
        end: fullText.length,
        text: remaining,
        hasSemicolon: false,
      });
    }
  }

  // 1. Se encontramos declaração com ponto-e-vírgula contendo o cursor, retorna-a
  if (statements.length > 0) {
    for (const stmt of statements) {
      if (cursorOffset >= stmt.start && cursorOffset <= stmt.end) {
        const trimmed = stmt.text.trim();
        if (stmt.hasSemicolon && trimmed) {
          return trimmed;
        }
      }
    }
  }

  // 2. Se a declaração não possui ponto-e-vírgula ou é um script em formato livre:
  const currentLine = lines[lineIdx];
  const trimmedLine = currentLine.trim();

  if (trimmedLine && !trimmedLine.startsWith('--') && !trimmedLine.startsWith('#')) {
    let blockStart = lineIdx;
    while (
      blockStart > 0 &&
      lines[blockStart - 1].trim().length > 0 &&
      !lines[blockStart - 1].trim().endsWith(';') &&
      !MAJOR_SQL_VERBS.test(lines[blockStart].trim())
    ) {
      blockStart--;
    }

    let blockEnd = lineIdx;
    while (
      blockEnd < lines.length - 1 &&
      lines[blockEnd + 1].trim().length > 0 &&
      !lines[blockEnd].trim().endsWith(';') &&
      !MAJOR_SQL_VERBS.test(lines[blockEnd + 1].trim())
    ) {
      blockEnd++;
    }

    const block = lines.slice(blockStart, blockEnd + 1).join('\n').trim();
    if (block) return block;
  }

  return trimmedLine || null;
}

/**
 * Detecta qual é o banco de dados ativo na posição do cursor dentro de um script,
 * inspecionando o comando USE mais recente que precede a linha atual.
 */
export function findActiveDatabaseAtPosition(
  fullText: string,
  position?: { lineNumber: number; column: number }
): string | null {
  if (!fullText || !fullText.trim()) return null;

  const lines = fullText.split('\n');
  const maxLine = position && position.lineNumber ? Math.min(position.lineNumber, lines.length) : lines.length;

  let activeDb: string | null = null;
  let inBlockComment = false;

  for (let i = 0; i < maxLine; i++) {
    const line = lines[i];

    // Trata comentários de bloco multilinha e de linha (-- ou #)
    let processedLine = '';
    let j = 0;
    while (j < line.length) {
      if (inBlockComment) {
        const endBlock = line.indexOf('*/', j);
        if (endBlock === -1) {
          j = line.length;
        } else {
          inBlockComment = false;
          j = endBlock + 2;
        }
      } else {
        const startBlock = line.indexOf('/*', j);
        const lineComment = line.indexOf('--', j);
        const hashComment = line.indexOf('#', j);

        let firstComment = -1;
        let commentType = '';
        if (startBlock !== -1) {
          firstComment = startBlock;
          commentType = '/*';
        }
        if (lineComment !== -1 && (firstComment === -1 || lineComment < firstComment)) {
          firstComment = lineComment;
          commentType = '--';
        }
        if (hashComment !== -1 && (firstComment === -1 || hashComment < firstComment)) {
          firstComment = hashComment;
          commentType = '#';
        }

        if (firstComment === -1) {
          processedLine += line.substring(j);
          break;
        } else if (commentType === '/*') {
          processedLine += line.substring(j, firstComment);
          inBlockComment = true;
          j = firstComment + 2;
        } else {
          processedLine += line.substring(j, firstComment);
          break;
        }
      }
    }

    const trimmed = processedLine.trim();
    if (!trimmed) continue;

    // Detecta comandos USE na linha
    const useMatches = trimmed.matchAll(/\bUSE\s+([`'"]?[\w-]+[`'"]?)/gi);
    for (const match of useMatches) {
      if (match && match[1]) {
        activeDb = match[1].replace(/[`'"]/g, '');
      }
    }
  }

  return activeDb;
}

interface EditorWorkspaceProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseAllTabs?: () => void;
  onCloseOtherTabs?: (id: string) => void;
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
  onSelectDatabase?: (dbName: string) => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseAllTabs,
  onCloseOtherTabs,
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
  onSelectDatabase,
}) => {
  const editorRef = useRef<any>(null);
  const monacoInstanceRef = useRef<any>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const onSelectDatabaseRef = useRef(onSelectDatabase);
  onSelectDatabaseRef.current = onSelectDatabase;

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

  const currentTabIdRef = useRef<string>(activeTabId);
  currentTabIdRef.current = activeTabId;
  const isAutoCapitalizingRef = useRef<boolean>(false);
  const completionProviderRef = useRef<any>(null);

  // Sistema de buffer e debounce de digitação para garantir 120 FPS e eliminar 100% do atraso do cursor
  const contentDebounceTimerRef = useRef<any>(null);
  const pendingContentRef = useRef<Record<string, string>>({});

  const flushPendingContent = useCallback(() => {
    if (contentDebounceTimerRef.current) {
      clearTimeout(contentDebounceTimerRef.current);
      contentDebounceTimerRef.current = null;
    }
    const currentId = currentTabIdRef.current;
    if (currentId && pendingContentRef.current[currentId] !== undefined) {
      const content = pendingContentRef.current[currentId];
      delete pendingContentRef.current[currentId];
      onUpdateContent(currentId, content);
    }
  }, [onUpdateContent]);

  const handleEditorContentChange = useCallback((val: string | undefined) => {
    const text = val || '';
    const tabId = currentTabIdRef.current;
    if (!tabId) return;

    pendingContentRef.current[tabId] = text;

    if (contentDebounceTimerRef.current) {
      clearTimeout(contentDebounceTimerRef.current);
    }
    contentDebounceTimerRef.current = setTimeout(() => {
      contentDebounceTimerRef.current = null;
      if (pendingContentRef.current[tabId] !== undefined) {
        const toSave = pendingContentRef.current[tabId];
        delete pendingContentRef.current[tabId];
        onUpdateContent(tabId, toSave);
      }
    }, 350);
  }, [onUpdateContent]);

  // Limpa o timer de debounce no unmount e descarrega qualquer texto pendente
  useEffect(() => {
    return () => {
      if (contentDebounceTimerRef.current) {
        clearTimeout(contentDebounceTimerRef.current);
        const currentId = currentTabIdRef.current;
        if (currentId && pendingContentRef.current[currentId] !== undefined) {
          const content = pendingContentRef.current[currentId];
          delete pendingContentRef.current[currentId];
          onUpdateContent(currentId, content);
        }
      }
    };
  }, [onUpdateContent]);

  // Menu de contexto com clique com botão direito na aba
  const [tabContextMenu, setTabContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tabId: string;
    tabTitle: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    tabId: '',
    tabTitle: '',
  });
  const tabContextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tabContextMenuRef.current && !tabContextMenuRef.current.contains(e.target as Node)) {
        setTabContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    if (tabContextMenu.visible) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [tabContextMenu.visible]);

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

  // Sincroniza alterações externas de conteúdo no modelo do editor Monaco quando a aba não está sendo ativamente digitada
  useEffect(() => {
    if (!editorRef.current || !activeTab) return;
    const currentVal = editorRef.current.getValue();
    if (activeTab.content !== currentVal && !pendingContentRef.current[activeTab.id]) {
      editorRef.current.setValue(activeTab.content);
    }
    if (monacoInstanceRef.current) {
      try {
        monacoInstanceRef.current.editor.remeasureFonts();
        editorRef.current.layout();
      } catch (_) {}
    }
  }, [activeTab?.id, activeTab?.content]);

  // Exportar script da aba ativa como arquivo .sql para download
  const handleExportCurrentScript = useCallback(() => {
    flushPendingContent();
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
    registerEnhancedSqlLanguage(monaco);
    monaco.editor.setTheme(getMonacoThemeName(theme, fontTheme));

    if (editorRefOut) {
      editorRefOut.current = editor;
    }

    // Sincronização contínua e recálculo de métricas de fontes no Monaco para eliminar 100% do drift de cursor
    const triggerFontRemeasure = () => {
      try {
        monaco.editor.remeasureFonts();
        editor.layout();
      } catch (_) {}
    };

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(triggerFontRemeasure);
      document.fonts.addEventListener('loadingdone', triggerFontRemeasure);
    }

    // Disparos automáticos pós-montagem cobrindo o ciclo de download e renderização de fontes
    [30, 100, 250, 600, 1200, 2500].forEach((delay) => {
      setTimeout(() => {
        if (!editor.getDomNode()) return;
        triggerFontRemeasure();
      }, delay);
    });

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

    // Auto-correção em tempo real de palavras-chave SQL para MAIÚSCULAS ao digitar (ex: 'from ' -> 'FROM ')
    editor.onDidChangeModelContent((e) => {
      if (isAutoCapitalizingRef.current) return;
      if (!e.changes || e.changes.length === 0) return;

      for (const change of e.changes) {
        // Se for inserção em lote (ex: colagem grande), não processa tecla por tecla
        if (change.text.length > 5) continue;

        // Dispara quando o usuário digita delimitadores como espaço, quebra de linha, parênteses, vírgula ou ponto-e-vírgula
        if (!/[\s\(\,\;\)\n\t]/.test(change.text)) continue;

        const model = editor.getModel();
        if (!model) continue;

        const lineNumber = change.range.startLineNumber;
        const lineContent = model.getLineContent(lineNumber);
        const textBeforeChange = lineContent.substring(0, change.range.startColumn - 1);

        // Ignora comentários de linha (--)
        const commentIndex = textBeforeChange.indexOf('--');
        if (commentIndex !== -1) {
          const beforeComment = textBeforeChange.substring(0, commentIndex);
          const singleQ = (beforeComment.match(/'/g) || []).length;
          const doubleQ = (beforeComment.match(/"/g) || []).length;
          if (singleQ % 2 === 0 && doubleQ % 2 === 0) continue;
        }

        // Ignora strings ou identificadores em aspas ou crases
        const singleQuotes = (textBeforeChange.match(/'/g) || []).length;
        const doubleQuotes = (textBeforeChange.match(/"/g) || []).length;
        const backticks = (textBeforeChange.match(/`/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) continue;

        // Extrai a palavra imediatamente anterior ao delimitador digitado
        const match = textBeforeChange.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (!match) continue;

        const rawWord = match[1];
        const lowerWord = rawWord.toLowerCase();

        // Se for acesso de propriedade/coluna precedido por ponto (ex: tb.from ou tabela.campo), não capitaliza
        const charBeforeWord = textBeforeChange.charAt(textBeforeChange.length - rawWord.length - 1);
        if (charBeforeWord === '.') continue;

        const upperWord = SQL_KEYWORDS_MAP[lowerWord];
        if (upperWord && rawWord !== upperWord) {
          const wordStartCol = (change.range.startColumn - 1) - rawWord.length + 1;
          const wordEndCol = change.range.startColumn;
          const wordRange = new monaco.Range(lineNumber, wordStartCol, lineNumber, wordEndCol);

          // Executa a substituição em microtask sem interromper o loop de digitação nem deslocar o cursor
          queueMicrotask(() => {
            if (model.isDisposed()) return;
            const currentWord = model.getValueInRange(wordRange);
            if (currentWord === rawWord) {
              isAutoCapitalizingRef.current = true;
              try {
                model.pushEditOperations(
                  [],
                  [
                    {
                      range: wordRange,
                      text: upperWord,
                    },
                  ],
                  () => null
                );
              } finally {
                isAutoCapitalizingRef.current = false;
              }
            }
          });
        }
      }
    });

    // Sincronização automática do Banco de Dados Ativo com base na posição do cursor no script
    let cursorDbTimer: any = null;
    editor.onDidChangeCursorPosition((e) => {
      if (cursorDbTimer) clearTimeout(cursorDbTimer);
      cursorDbTimer = setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        const detectedDb = findActiveDatabaseAtPosition(model.getValue(), e.position);
        if (detectedDb && onSelectDatabaseRef.current) {
          const matchedDb = (schemasRef.current || []).find(s => s.name.toLowerCase() === detectedDb.toLowerCase());
          const finalDbName = matchedDb ? matchedDb.name : detectedDb;
          if (finalDbName !== activeDatabaseRef.current) {
            onSelectDatabaseRef.current(finalDbName);
          }
        }
      }, 120);
    });

    // Atalho global do editor: Ctrl+Enter / Cmd+Enter (Executar tudo)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      flushPendingContent();
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
        const model = ed.getModel();
        const pos = ed.getPosition();

        // Se houver USE precedente no cursor, sincroniza o banco ativo antes de executar o snippet
        if (model && pos && onSelectDatabaseRef.current) {
          const detectedDb = findActiveDatabaseAtPosition(model.getValue(), pos);
          if (detectedDb) {
            const matchedDb = (schemasRef.current || []).find(s => s.name.toLowerCase() === detectedDb.toLowerCase());
            const finalDbName = matchedDb ? matchedDb.name : detectedDb;
            if (finalDbName !== activeDatabaseRef.current) {
              onSelectDatabaseRef.current(finalDbName);
            }
          }
        }

        if (selection && !selection.isEmpty()) {
          const text = ed.getModel()?.getValueInRange(selection);
          if (text && text.trim()) {
            onRunSnippet(text.trim());
            return;
          }
        }
        // Se não houver seleção de texto, executa o comando onde o cursor está posicionado
        if (model && pos) {
          const stmt = extractStatementAtPosition(model.getValue(), pos);
          if (stmt && stmt.trim()) {
            onRunSnippet(stmt.trim());
            return;
          }
        }
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
        let codeToReview = '';
        if (selection && !selection.isEmpty()) {
          codeToReview = ed.getModel()?.getValueInRange(selection) || '';
        } else {
          const model = ed.getModel();
          const pos = ed.getPosition();
          if (model && pos) {
            codeToReview = extractStatementAtPosition(model.getValue(), pos) || '';
          }
        }
        if (!codeToReview.trim()) {
          codeToReview = ed.getValue();
        }
        if (codeToReview.trim()) {
          onReviewSnippet(codeToReview.trim());
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
      if (e.target && e.target.position) {
        const sel = editor.getSelection();
        if (!sel || sel.isEmpty()) {
          editor.setPosition(e.target.position);
        }
      }
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
    if (completionProviderRef.current) {
      if (Array.isArray(completionProviderRef.current)) {
        completionProviderRef.current.forEach((d: any) => d?.dispose());
      } else {
        completionProviderRef.current.dispose();
      }
    }
    const completionProviderConfig = {
      triggerCharacters: ['.', '`'],
      provideCompletionItems: (model: any, position: any) => {
        const lineContentBefore = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const query = (word?.word || '').trim().toLowerCase();

        // 1. Obtenção estrita do Banco Ativo Atual
        const currentSchemas = schemasRef.current || [];
        const rawActiveDb = (activeDatabaseRef.current || '').trim().replace(/[`'"]/g, '');
        let activeDbSchema = currentSchemas.find(
          d => d.name.toLowerCase() === rawActiveDb.toLowerCase()
        );
        if (!activeDbSchema && currentSchemas.length === 1) {
          activeDbSchema = currentSchemas[0];
        }

        const suggestions: any[] = [];

        // 2. SUPORTE A AUTOCOMPLETAR APÓS PONTO (.) -> Ex: tb_alunos. ou alias.
        const dotMatch = lineContentBefore.match(/([a-zA-Z0-9_`]+)\.([a-zA-Z0-9_]*)$/);
        if (dotMatch) {
          const qualifier = dotMatch[1].replace(/[`'"]/g, '').toLowerCase();
          const colQuery = dotMatch[2].toLowerCase();

          // Procura a tabela correspondente no banco ativo
          let targetTable = activeDbSchema?.tables.find(
            t => t.name.toLowerCase() === qualifier
          );

          // Se não encontrou pelo nome direto da tabela, procura se é um alias no script (ex: FROM tb_alunos a / tb_alunos AS a)
          if (!targetTable && activeDbSchema) {
            const scriptText = model.getValue();
            const aliasRegex = new RegExp(`(?:FROM|JOIN)\\s+[\`']?([a-zA-Z0-9_]+)[\`']?\\s+(?:AS\\s+)?${qualifier}\\b`, 'i');
            const aliasMatch = scriptText.match(aliasRegex);
            if (aliasMatch) {
              const actualTableName = aliasMatch[1].toLowerCase();
              targetTable = activeDbSchema.tables.find(t => t.name.toLowerCase() === actualTableName);
            }
          }

          if (targetTable) {
            const colRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - colQuery.length,
              endColumn: position.column,
            };

            for (const col of targetTable.columns) {
              if (!colQuery || col.name.toLowerCase().startsWith(colQuery)) {
                suggestions.push({
                  label: {
                    label: col.name,
                    description: `${targetTable.name}.${col.name}`,
                    detail: ` [${col.type}]`,
                  },
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.name,
                  sortText: `00_${col.name}`,
                  documentation: `Coluna '${col.name}' (${col.type}) da tabela '${targetTable.name}' no banco ativo '${activeDbSchema?.name}'.`,
                  range: colRange,
                });
              }
            }
            return { suggestions };
          }
        }

        // Se não for autocompletar de ponto e não tiver nada digitado, não abre popup desnecessário
        if (!query || query.length === 0) {
          return { suggestions: [] };
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // 3. PALAVRAS-CHAVE SQL (SEMPRE EM MAIÚSCULAS) - Prioridade alta (00_) ao digitar iniciais
        for (const kw of SQL_KEYWORDS_LIST) {
          if (kw.toLowerCase().startsWith(query)) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              sortText: `00_${kw}`,
              documentation: `Comando SQL: ${kw}`,
              range,
            });
          }
        }

        // 4. TABELAS PERTINENTES EXCLUSIVAMENTE AO BANCO SELECIONADO
        if (activeDbSchema) {
          for (const tbl of activeDbSchema.tables) {
            if (tbl.name.toLowerCase().startsWith(query)) {
              suggestions.push({
                label: {
                  label: tbl.name,
                  description: `Tabela (${activeDbSchema.name})`,
                  detail: ` • ${tbl.rowCount} linhas`,
                },
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: tbl.name,
                sortText: `01_${tbl.name}`,
                documentation: `Tabela '${tbl.name}' no banco ativo '${activeDbSchema.name}'.\nColunas:\n${tbl.columns.map(c => ` - ${c.name} (${c.type})`).join('\n')}`,
                range,
              });
            }
          }

          // 5. COLUNAS DO BANCO SELECIONADO
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
                  sortText: `02_${col.name}`,
                  documentation: `Coluna '${col.name}' (${col.type}) na tabela '${tbl.name}' do banco ativo '${activeDbSchema.name}'.`,
                  range,
                });
              }
            }
          }
        }

        // 6. FUNÇÕES SQL / MYSQL (EM MAIÚSCULAS COM SNIPPET)
        for (const fn of SQL_FUNCTIONS_LIST) {
          if (fn.name.toLowerCase().startsWith(query)) {
            suggestions.push({
              label: fn.name,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: fn.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: `03_${fn.name}`,
              documentation: fn.doc,
              range,
            });
          }
        }

        return { suggestions };
      },
    };

    completionProviderRef.current = [
      monaco.languages.registerCompletionItemProvider('sql', completionProviderConfig),
      monaco.languages.registerCompletionItemProvider('mysql', completionProviderConfig),
    ];
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
                    flushPendingContent();
                    onSelectTab(tab.id);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRenaming(tab.id, tab.title);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTabContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    tabId: tab.id,
                    tabTitle: tab.title,
                  });
                }}
                className={`group h-8 px-3 flex items-center gap-2 text-xs font-mono cursor-pointer border-r border-[var(--border-color)] transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] border-t-2 border-t-[var(--accent-yellow)] font-semibold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={isEditing ? 'Pressione Enter para salvar, Esc para cancelar' : `${tab.title} (Duplo clique ou F2 para renomear, botão direito para opções)`}
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
                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      flushPendingContent();
                      if (monacoInstanceRef.current) {
                        try {
                          const uri = monacoInstanceRef.current.Uri.parse(`tab_${tab.id}.sql`);
                          monacoInstanceRef.current.editor.getModel(uri)?.dispose();
                        } catch (_) {}
                      }
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
                flushPendingContent();
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
                flushPendingContent();
                onNewBlankTab();
              }}
              onSelectSolution={(sol) => {
                flushPendingContent();
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

          {/* Botão Fechar Todas as Abas se houver abas abertas */}
          {tabs.length > 0 && onCloseAllTabs && (
            <button
              onClick={() => {
                if (window.confirm('Tem certeza que deseja fechar todas as guias de scripts abertas?')) {
                  flushPendingContent();
                  if (monacoInstanceRef.current) {
                    tabs.forEach(t => {
                      try {
                        const uri = monacoInstanceRef.current.Uri.parse(`tab_${t.id}.sql`);
                        monacoInstanceRef.current.editor.getModel(uri)?.dispose();
                      } catch (_) {}
                    });
                  }
                  onCloseAllTabs();
                }
              }}
              title="Fechar Todas as Abas (com confirmação)"
              className="ml-1 px-1.5 h-6 flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[#FF3366] hover:bg-[#FF3366]/15 rounded transition-colors cursor-pointer shrink-0 border border-transparent hover:border-[#FF3366]/30"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
              <span className="hidden sm:inline">Fechar Todas</span>
            </button>
          )}
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
            path={`tab_${activeTab.id}.sql`}
            saveViewState={false}
            defaultValue={activeTab.content}
            theme={getMonacoThemeName(theme, fontTheme)}
            beforeMount={(monaco) => {
              monacoInstanceRef.current = monaco;
              registerAllMonacoThemes(monaco);
              registerEnhancedSqlLanguage(monaco);
            }}
            onChange={handleEditorContentChange}
            onMount={handleEditorDidMount}
            options={{
              contextmenu: false,
              fontSize: currentFontSize,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontLigatures: false,
              letterSpacing: 0,
              cursorSmoothCaretAnimation: 'off',
              cursorBlinking: 'blink',
              cursorStyle: 'line',
              cursorWidth: 2,
              renderWhitespace: 'none',
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
              // Configurações de precisão do autocompletar (sem poluição de palavras aleatórias)
              wordBasedSuggestions: 'off',
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              suggest: {
                showWords: false,
                showClasses: true,
                showFields: true,
                showFunctions: true,
                showKeywords: true,
                snippetsPreventQuickSuggestions: false,
              },
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 select-none bg-[var(--bg-primary)]/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FFE600]/10 border border-[#FF6B00]/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,107,0,0.15)]">
              <span className="material-symbols-outlined text-[28px] text-[var(--accent-yellow)]">
                post_add
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              Nenhuma aba de script aberta
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4">
              Todas as abas foram fechadas. Crie um novo script em branco ou carregue um exercício para continuar praticando SQL.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNewBlankTab()}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFAA00] text-black font-semibold hover:brightness-110 shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                Novo Script
              </button>
            </div>
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
                  const model = ed.getModel();
                  const pos = ed.getPosition();
                  if (model && pos) {
                    const stmt = extractStatementAtPosition(model.getValue(), pos);
                    if (stmt && stmt.trim()) {
                      onRunSnippet(stmt.trim());
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

        {/* Menu de Contexto ao Clicar com Botão Direito na Aba */}
        {tabContextMenu.visible && (
          <div
            ref={tabContextMenuRef}
            style={{
              position: 'fixed',
              left: `${tabContextMenu.x}px`,
              top: `${tabContextMenu.y}px`,
              zIndex: 999999,
            }}
            className="w-56 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.45)] py-1.5 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1 text-[10px] font-mono text-[var(--accent-yellow)] uppercase tracking-wider border-b border-[var(--border-color)] flex items-center justify-between font-semibold">
              <span className="truncate max-w-[130px]">{tabContextMenu.tabTitle}</span>
              <span className="text-[9px] text-[var(--text-muted)] font-normal">Aba</span>
            </div>

            {/* Renomear Aba */}
            <button
              onClick={() => {
                const targetId = tabContextMenu.tabId;
                const targetTitle = tabContextMenu.tabTitle;
                setTabContextMenu(prev => ({ ...prev, visible: false }));
                startRenaming(targetId, targetTitle);
              }}
              className="w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">edit</span>
                <span>Renomear</span>
              </div>
              <kbd className="text-[10px] font-mono px-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)]">F2</kbd>
            </button>

            {/* Fechar esta Aba */}
            <button
              onClick={() => {
                const targetId = tabContextMenu.tabId;
                setTabContextMenu(prev => ({ ...prev, visible: false }));
                flushPendingContent();
                if (monacoInstanceRef.current) {
                  try {
                    const uri = monacoInstanceRef.current.Uri.parse(`tab_${targetId}.sql`);
                    monacoInstanceRef.current.editor.getModel(uri)?.dispose();
                  } catch (_) {}
                }
                onCloseTab(targetId);
              }}
              className="w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-[#FF3366]">close</span>
              <span>Fechar</span>
            </button>

            {/* Fechar Outras Abas */}
            {tabs.length > 1 && onCloseOtherTabs && (
              <button
                onClick={() => {
                  const targetId = tabContextMenu.tabId;
                  setTabContextMenu(prev => ({ ...prev, visible: false }));
                  flushPendingContent();
                  if (monacoInstanceRef.current) {
                    tabs.filter(t => t.id !== targetId).forEach(t => {
                      try {
                        const uri = monacoInstanceRef.current.Uri.parse(`tab_${t.id}.sql`);
                        monacoInstanceRef.current.editor.getModel(uri)?.dispose();
                      } catch (_) {}
                    });
                  }
                  onCloseOtherTabs(targetId);
                }}
                className="w-full px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)]">tab_close</span>
                <span>Fechar Outras</span>
              </button>
            )}

            {/* Fechar Todas as Abas */}
            {onCloseAllTabs && (
              <button
                onClick={() => {
                  setTabContextMenu(prev => ({ ...prev, visible: false }));
                  if (window.confirm('Tem certeza que deseja fechar todas as guias de scripts abertas?')) {
                    flushPendingContent();
                    if (monacoInstanceRef.current) {
                      tabs.forEach(t => {
                        try {
                          const uri = monacoInstanceRef.current.Uri.parse(`tab_${t.id}.sql`);
                          monacoInstanceRef.current.editor.getModel(uri)?.dispose();
                        } catch (_) {}
                      });
                    }
                    onCloseAllTabs();
                  }
                }}
                className="w-full px-3 py-1.5 text-left text-[#FF3366] hover:bg-[#FF3366]/10 flex items-center gap-2 transition-colors cursor-pointer border-t border-[var(--border-color)] mt-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">clear_all</span>
                <span>Fechar Todas</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
