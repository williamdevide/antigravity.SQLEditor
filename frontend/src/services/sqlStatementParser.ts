// Parser Léxico e Estrutural Unificado de Declarações SQL
// Responsável por:
// 1. Dividir scripts SQL em declarações individuais (com ou sem ';') rastreando linhas exatas de código.
// 2. Extrair cirurgicamente o comando SQL na linha do cursor (Alt+E / "Executar esse trecho").
// 3. Detectar ausência de ';' no comando anterior ao iniciar um novo comando SQL principal (Auto-Semicolon).

export interface SqlToken {
  type: 'word' | 'string' | 'identifier' | 'number' | 'symbol' | 'semicolon';
  value: string;
  upper: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

export interface ParsedSqlStatement {
  /** Texto SQL limpo da declaração (preservando ';' final caso exista) */
  text: string;
  /** Offset 0-based do início do bloco bruto (pode incluir comentários precedentes) */
  rawStartOffset: number;
  /** Offset 0-based do primeiro token de código SQL real */
  codeStartOffset: number;
  /** Offset 0-based exclusivo do final da declaração (inclui ';' se presente) */
  endOffset: number;
  /** Offset 0-based exclusivo do último token de código antes de ';' */
  lastTokenEndOffset: number;
  /** Linha inicial 1-based incluindo comentários imediatamente anteriores ao comando */
  rawStartLine: number;
  /** Linha final 1-based do comando */
  rawEndLine: number;
  /** Linha inicial 1-based do primeiro token de código real (usada para marcadores no gutter) */
  codeStartLine: number;
  /** Linha final 1-based do último token ou ';' do comando */
  codeEndLine: number;
  /** Coluna inicial 1-based do primeiro token de código */
  codeStartCol: number;
  /** Coluna final 1-based exclusiva do término da declaração */
  codeEndCol: number;
  /** Indica se terminou explicitamente com ';' */
  hasSemicolon: boolean;
  /** Verbo SQL inicial em maiúsculas (ex: 'SELECT', 'INSERT', 'USE') */
  firstKeyword: string;
}

/**
 * Verbos primários de início de comando SQL que disparam auto-inserção de ';'
 * quando o comando anterior já está completo e não possui ponto e vírgula.
 */
export const AUTO_SEMICOLON_VERBS = new Set<string>([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'USE',
  'TRUNCATE',
  'SHOW',
  'DESCRIBE',
]);

/**
 * Verbos de nível superior capazes de iniciar uma nova instrução SQL em scripts sem ';'.
 */
const STATEMENT_BOUNDARY_VERBS = new Set<string>([
  ...AUTO_SEMICOLON_VERBS,
  'WITH',
]);

/**
 * Palavras-chave que NUNCA encerram um comando SQL completo (exigem continuação/operando).
 */
const DANGLING_KEYWORDS = new Set<string>([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'OUTER', 'NATURAL',
  'ON', 'USING', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'DISTINCT', 'INTERSECT', 'EXCEPT',
  'INSERT', 'REPLACE', 'INTO', 'VALUES', 'VALUE', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'TABLE', 'DATABASE', 'SCHEMA', 'VIEW', 'INDEX', 'TRIGGER',
  'ADD', 'MODIFY', 'CHANGE', 'RENAME', 'TO', 'COLUMN', 'CONSTRAINT', 'PRIMARY', 'FOREIGN', 'REFERENCES',
  'IF', 'NOT', 'AND', 'OR', 'XOR', 'IS', 'IN', 'BETWEEN', 'LIKE', 'ILIKE', 'REGEXP', 'RLIKE',
  'AS', 'CASE', 'WHEN', 'THEN', 'ELSE',
  'FOR', 'BEFORE', 'AFTER', 'INSTEAD', 'OF',
  'USE', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH',
]);

/**
 * Verbos de ação válidos dentro de um comando ALTER TABLE após o nome da tabela.
 */
const ALTER_ACTION_VERBS = new Set<string>([
  'ADD', 'MODIFY', 'CHANGE', 'RENAME', 'DROP', 'CONVERT', 'ALTER', 'DISABLE', 'ENABLE',
]);

/**
 * Verifica se o final do trecho `sqlPrefix` encontra-se aberto dentro de um comentário
 * (de linha '--'/'#' ou de bloco '/* ... *\/') ou literal de string/identificador ('...', "...", `...`).
 */
export function isOffsetInsideCommentOrString(sqlPrefix: string): boolean {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlPrefix.length; i++) {
    const ch = sqlPrefix[i];
    const next = i + 1 < sqlPrefix.length ? sqlPrefix[i + 1] : '';

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
    if (inSingle) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === "'") {
        if (next === "'") {
          i++;
          continue;
        }
        inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '"') {
        if (next === '"') {
          i++;
          continue;
        }
        inDouble = false;
      }
      continue;
    }
    if (inBacktick) {
      if (ch === '`') {
        if (next === '`') {
          i++;
          continue;
        }
        inBacktick = false;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '#') {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inBacktick = true;
      continue;
    }
  }

  return inSingle || inDouble || inBacktick || inLineComment || inBlockComment;
}

/**
 * Tokeniza um script SQL preservando posições exatas de linha, coluna e offset,
 * ignorando comentários (-- , # , /* ... *\/) e tratando strings/crases com segurança.
 */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const len = sql.length;
  let i = 0;
  let line = 1;
  let lineStart = 0;

  const advanceChar = () => {
    if (sql[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
    i++;
  };

  while (i < len) {
    const ch = sql[i];
    const next = i + 1 < len ? sql[i + 1] : '';

    // 1. Espaços em branco e quebras de linha
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advanceChar();
      continue;
    }

    // 2. Comentário de linha '--'
    if (ch === '-' && next === '-') {
      while (i < len && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // 3. Comentário de linha '#'
    if (ch === '#') {
      while (i < len && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // 4. Comentário de bloco '/* ... */'
    if (ch === '/' && next === '*') {
      advanceChar();
      advanceChar();
      while (i < len) {
        if (sql[i] === '*' && i + 1 < len && sql[i + 1] === '/') {
          advanceChar();
          advanceChar();
          break;
        }
        advanceChar();
      }
      continue;
    }

    const startOffset = i;
    const startLine = line;
    const startCol = i - lineStart + 1;

    // 5. Ponto e vírgula
    if (ch === ';') {
      advanceChar();
      tokens.push({
        type: 'semicolon',
        value: ';',
        upper: ';',
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 6. Strings com aspas simples ou duplas
    if (ch === "'" || ch === '"') {
      const quote = ch;
      advanceChar();
      while (i < len) {
        if (sql[i] === '\\') {
          advanceChar();
          if (i < len) advanceChar();
          continue;
        }
        if (sql[i] === quote) {
          advanceChar();
          if (i < len && sql[i] === quote) {
            advanceChar();
            continue;
          }
          break;
        }
        advanceChar();
      }
      const val = sql.slice(startOffset, i);
      tokens.push({
        type: 'string',
        value: val,
        upper: val,
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 7. Identificadores entre crases (`...`) ou colchetes ([...])
    if (ch === '`' || ch === '[') {
      const closeChar = ch === '`' ? '`' : ']';
      advanceChar();
      while (i < len) {
        if (sql[i] === closeChar) {
          advanceChar();
          if (closeChar === '`' && i < len && sql[i] === '`') {
            advanceChar();
            continue;
          }
          break;
        }
        advanceChar();
      }
      const val = sql.slice(startOffset, i);
      tokens.push({
        type: 'identifier',
        value: val,
        upper: val.toUpperCase(),
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 8. Números
    if (ch >= '0' && ch <= '9') {
      while (i < len && sql[i] >= '0' && sql[i] <= '9') {
        advanceChar();
      }
      if (i < len && sql[i] === '.' && i + 1 < len && sql[i + 1] >= '0' && sql[i + 1] <= '9') {
        advanceChar();
        while (i < len && sql[i] >= '0' && sql[i] <= '9') {
          advanceChar();
        }
      }
      const val = sql.slice(startOffset, i);
      tokens.push({
        type: 'number',
        value: val,
        upper: val,
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 9. Palavras-chave e identificadores não delimitados (suporta acentuação UTF-8)
    if (/[a-zA-Z_À-ÿ$]/.test(ch)) {
      while (i < len && /[a-zA-Z0-9_À-ÿ$]/.test(sql[i])) {
        advanceChar();
      }
      const val = sql.slice(startOffset, i);
      tokens.push({
        type: 'word',
        value: val,
        upper: val.toUpperCase(),
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 10. Operadores compostos de 2 caracteres
    const twoChar = sql.slice(i, i + 2);
    if (
      twoChar === '<>' ||
      twoChar === '!=' ||
      twoChar === '<=' ||
      twoChar === '>=' ||
      twoChar === '||' ||
      twoChar === '::' ||
      twoChar === ':='
    ) {
      advanceChar();
      advanceChar();
      tokens.push({
        type: 'symbol',
        value: twoChar,
        upper: twoChar,
        startOffset,
        endOffset: i,
        startLine,
        endLine: line,
        startCol,
        endCol: i - lineStart + 1,
      });
      continue;
    }

    // 11. Símbolo simples
    advanceChar();
    tokens.push({
      type: 'symbol',
      value: ch,
      upper: ch,
      startOffset,
      endOffset: i,
      startLine,
      endLine: line,
      startCol,
      endCol: i - lineStart + 1,
    });
  }

  return tokens;
}

interface OngoingStatementState {
  tokens: SqlToken[];
  parenDepth: number;
  caseDepthStack: number[];
  firstKeyword: string;
  hasTableKeywordInHeader: boolean;
  hasSeenValuesOrSet: boolean;
  hasSeenTopLevelDmlInWith: boolean;
  hasSeenTopLevelSelectInInsert: boolean;
  hasSeenCreateTableBody: boolean;
  hasSeenAlterTableTarget: boolean;
  hasSeenAlterAction: boolean;
}

function createEmptyState(): OngoingStatementState {
  return {
    tokens: [],
    parenDepth: 0,
    caseDepthStack: [0],
    firstKeyword: '',
    hasTableKeywordInHeader: false,
    hasSeenValuesOrSet: false,
    hasSeenTopLevelDmlInWith: false,
    hasSeenTopLevelSelectInInsert: false,
    hasSeenCreateTableBody: false,
    hasSeenAlterTableTarget: false,
    hasSeenAlterAction: false,
  };
}

/**
 * Avalia se o token `incomingVerbUpper` inicia um NOVO comando SQL de nível superior
 * dado o estado acumulado da declaração atual (sem ';' explícito).
 */
function shouldStartNewStatementBeforeVerb(
  state: OngoingStatementState,
  incomingVerbUpper: string,
  incomingLine: number,
  nextToken?: SqlToken
): boolean {
  if (state.tokens.length === 0) return false;
  if (state.parenDepth > 0) return false;
  if ((state.caseDepthStack[0] || 0) > 0) return false;

  const prevTok = state.tokens[state.tokens.length - 1];

  // Regra especial para comando USE sem ';': USE <db> termina ao quebrar linha
  if (
    state.firstKeyword === 'USE' &&
    state.tokens.length >= 2 &&
    incomingLine > prevTok.endLine
  ) {
    return true;
  }

  if (!STATEMENT_BOUNDARY_VERBS.has(incomingVerbUpper)) {
    return false;
  }

  // Se o token anterior for um símbolo, apenas ')' pode encerrar uma expressão/declaração válida
  if (prevTok.type === 'symbol' && prevTok.value !== ')') {
    return false;
  }

  // Verifica palavras-chave pendentes que exigem continuação
  if (prevTok.type === 'word') {
    if (prevTok.upper === 'EXISTS') {
      // Exceção: 'CREATE DATABASE db_x IF NOT EXISTS' ou 'DROP TABLE tb_x IF EXISTS' (identificador veio antes do IF)
      const len = state.tokens.length;
      const isTrailingIfExists =
        (state.firstKeyword === 'CREATE' || state.firstKeyword === 'DROP') &&
        len >= 5 &&
        ((state.tokens[len - 2]?.upper === 'NOT' && state.tokens[len - 3]?.upper === 'IF') ||
          state.tokens[len - 2]?.upper === 'IF');
      if (!isTrailingIfExists) {
        return false;
      }
    } else if (DANGLING_KEYWORDS.has(prevTok.upper)) {
      return false;
    }
  }

  // Regras gramaticais específicas por verbo entrante
  if (incomingVerbUpper === 'SELECT') {
    // CTE: WITH cte AS (...) SELECT ...
    if (state.firstKeyword === 'WITH' && !state.hasSeenTopLevelDmlInWith) {
      return false;
    }
    // INSERT INTO tbl [(cols)] SELECT ...
    if (
      (state.firstKeyword === 'INSERT' || state.firstKeyword === 'REPLACE') &&
      !state.hasSeenValuesOrSet &&
      !state.hasSeenTopLevelSelectInInsert
    ) {
      return false;
    }
    // CREATE TABLE tbl SELECT ... (CTAS sem AS)
    if (
      state.firstKeyword === 'CREATE' &&
      state.hasTableKeywordInHeader &&
      !state.hasSeenCreateTableBody
    ) {
      return false;
    }
  }

  if (
    incomingVerbUpper === 'INSERT' ||
    incomingVerbUpper === 'UPDATE' ||
    incomingVerbUpper === 'DELETE'
  ) {
    if (state.firstKeyword === 'WITH' && !state.hasSeenTopLevelDmlInWith) {
      return false;
    }
  }

  if (incomingVerbUpper === 'UPDATE') {
    // INSERT ... ON DUPLICATE KEY UPDATE ...
    if (prevTok.type === 'word' && prevTok.upper === 'KEY') {
      return false;
    }
  }

  if (incomingVerbUpper === 'DROP' || incomingVerbUpper === 'ALTER') {
    // ALTER TABLE tbl DROP COLUMN ... / ALTER TABLE tbl ALTER COLUMN ...
    if (state.firstKeyword === 'ALTER' && !state.hasSeenAlterAction) {
      return false;
    }
  }

  if (incomingVerbUpper === 'TRUNCATE') {
    // TRUNCATE(valor, casas) como função matemática
    if (nextToken && nextToken.value === '(') {
      return false;
    }
  }

  if (incomingVerbUpper === 'USE') {
    // Hint MySQL: SELECT * FROM tbl USE INDEX (...) / USE KEY (...)
    if (nextToken && (nextToken.upper === 'INDEX' || nextToken.upper === 'KEY')) {
      return false;
    }
    // Na mesma linha após identificador (ex: digitação em andamento de FROM tbl USE INDEX), exige nova linha
    if (state.firstKeyword !== 'USE' && incomingLine === prevTok.endLine) {
      return false;
    }
  }

  if (incomingVerbUpper === 'WITH') {
    // GROUP BY col WITH ROLLUP / CREATE VIEW v AS SELECT ... WITH CHECK OPTION
    if (nextToken && (nextToken.upper === 'ROLLUP' || nextToken.upper === 'CHECK' || nextToken.upper === 'CASCADED' || nextToken.upper === 'LOCAL')) {
      return false;
    }
  }

  return true;
}

/**
 * Atualiza o estado gramatical da declaração atual ao anexar um novo token.
 */
function pushTokenToState(state: OngoingStatementState, tok: SqlToken): void {
  const prevTok = state.tokens.length > 0 ? state.tokens[state.tokens.length - 1] : null;
  const isFirst = state.tokens.length === 0;
  state.tokens.push(tok);

  if (isFirst && tok.type === 'word') {
    state.firstKeyword = tok.upper;
    return;
  }

  if (tok.type === 'symbol') {
    if (tok.value === '(') {
      if (state.parenDepth === 0 && state.firstKeyword === 'CREATE' && state.hasTableKeywordInHeader) {
        state.hasSeenCreateTableBody = true;
      }
      state.parenDepth++;
      state.caseDepthStack[state.parenDepth] = 0;
    } else if (tok.value === ')') {
      if (state.parenDepth > 0) {
        state.caseDepthStack[state.parenDepth] = 0;
        state.parenDepth--;
      }
    }
    return;
  }

  if (tok.type === 'word') {
    if (tok.upper === 'CASE') {
      state.caseDepthStack[state.parenDepth] = (state.caseDepthStack[state.parenDepth] || 0) + 1;
    } else if (tok.upper === 'END') {
      if ((state.caseDepthStack[state.parenDepth] || 0) > 0) {
        state.caseDepthStack[state.parenDepth]--;
      }
    }
  }

  // Rastreamentos apenas no nível superior (fora de parênteses)
  if (state.parenDepth === 0) {
    if (tok.type === 'word') {
      if (state.firstKeyword === 'CREATE' && tok.upper === 'TABLE' && state.tokens.length <= 4) {
        state.hasTableKeywordInHeader = true;
      }
      if (
        state.firstKeyword === 'CREATE' &&
        state.hasTableKeywordInHeader &&
        (tok.upper === 'AS' || tok.upper === 'LIKE')
      ) {
        state.hasSeenCreateTableBody = true;
      }
      if (
        (state.firstKeyword === 'INSERT' || state.firstKeyword === 'REPLACE') &&
        (tok.upper === 'VALUES' || tok.upper === 'VALUE' || tok.upper === 'SET')
      ) {
        state.hasSeenValuesOrSet = true;
      }
      if (
        (state.firstKeyword === 'INSERT' || state.firstKeyword === 'REPLACE') &&
        tok.upper === 'SELECT'
      ) {
        state.hasSeenTopLevelSelectInInsert = true;
      }
      if (
        state.firstKeyword === 'WITH' &&
        (tok.upper === 'SELECT' ||
          tok.upper === 'INSERT' ||
          tok.upper === 'UPDATE' ||
          tok.upper === 'DELETE')
      ) {
        state.hasSeenTopLevelDmlInWith = true;
      }
      if (state.firstKeyword === 'ALTER') {
        if (!state.hasSeenAlterTableTarget) {
          if (
            prevTok &&
            prevTok.upper === 'TABLE' &&
            tok.upper !== 'IF' &&
            tok.upper !== 'EXISTS'
          ) {
            state.hasSeenAlterTableTarget = true;
          } else if (
            prevTok &&
            prevTok.upper === 'EXISTS' &&
            state.tokens.some(t => t.upper === 'TABLE')
          ) {
            state.hasSeenAlterTableTarget = true;
          }
        } else if (ALTER_ACTION_VERBS.has(tok.upper)) {
          state.hasSeenAlterAction = true;
        }
      }
    } else if (tok.type === 'identifier' && state.firstKeyword === 'ALTER' && !state.hasSeenAlterTableTarget) {
      if (state.tokens.some(t => t.upper === 'TABLE')) {
        state.hasSeenAlterTableTarget = true;
      }
    }
  }
}

/**
 * Calcula a linha (1-based) correspondente a um offset de caractere no texto.
 */
function getLineAtOffset(sql: string, offset: number): number {
  let line = 1;
  const max = Math.min(offset, sql.length);
  for (let i = 0; i < max; i++) {
    if (sql[i] === '\n') line++;
  }
  return line;
}

/**
 * Avança o offset além de espaços e quebras de linha iniciais para determinar o rawStartLine real
 * (incluindo comentários dedicados à próxima declaração, mas ignorando linhas em branco anteriores).
 */
function skipLeadingWhitespace(sql: string, fromOffset: number, maxOffset: number): number {
  let idx = fromOffset;
  while (idx < maxOffset && (sql[idx] === ' ' || sql[idx] === '\t' || sql[idx] === '\r' || sql[idx] === '\n')) {
    idx++;
  }
  return idx;
}

/**
 * Divide um script SQL em declarações estruturadas com mapeamento preciso de linhas e colunas.
 * Suporta tanto comandos terminados por ';' quanto comandos separados sem ';' (ex: USE ou múltiplos SELECTs).
 */
export function parseSqlStatementsWithRanges(sql: string): ParsedSqlStatement[] {
  if (!sql || !sql.trim()) return [];

  const tokens = tokenizeSql(sql);
  if (tokens.length === 0) return [];

  const statements: ParsedSqlStatement[] = [];
  let state = createEmptyState();
  let rawBlockStartOffset = 0;

  const finalizeStatement = (semicolonToken?: SqlToken) => {
    if (state.tokens.length === 0) {
      if (semicolonToken) {
        rawBlockStartOffset = semicolonToken.endOffset;
      }
      return;
    }

    const firstTok = state.tokens[0];
    const lastCodeTok = state.tokens[state.tokens.length - 1];
    const endOffset = semicolonToken ? semicolonToken.endOffset : lastCodeTok.endOffset;
    const codeEndLine = semicolonToken ? semicolonToken.endLine : lastCodeTok.endLine;
    const codeEndCol = semicolonToken ? semicolonToken.endCol : lastCodeTok.endCol;

    const trimmedBlockStart = skipLeadingWhitespace(sql, rawBlockStartOffset, firstTok.startOffset);
    const rawStartLine = getLineAtOffset(sql, trimmedBlockStart);
    const text = sql.slice(firstTok.startOffset, endOffset).trim();

    if (text) {
      statements.push({
        text,
        rawStartOffset: trimmedBlockStart,
        codeStartOffset: firstTok.startOffset,
        endOffset,
        lastTokenEndOffset: lastCodeTok.endOffset,
        rawStartLine,
        rawEndLine: codeEndLine,
        codeStartLine: firstTok.startLine,
        codeEndLine,
        codeStartCol: firstTok.startCol,
        codeEndCol,
        hasSemicolon: Boolean(semicolonToken),
        firstKeyword: state.firstKeyword,
      });
    }

    rawBlockStartOffset = endOffset;
    state = createEmptyState();
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    const nextTok = idx + 1 < tokens.length ? tokens[idx + 1] : undefined;

    if (tok.type === 'semicolon') {
      finalizeStatement(tok);
      continue;
    }

    // Checa se um comando USE sem ';' terminou na linha anterior mesmo antes de não-verbo, ou se um novo verbo inicia outro comando
    if (state.tokens.length > 0 && state.parenDepth === 0 && (state.caseDepthStack[0] || 0) === 0) {
      const prevTok = state.tokens[state.tokens.length - 1];
      const isCompletedUseOnPrevLine =
        state.firstKeyword === 'USE' &&
        state.tokens.length >= 2 &&
        tok.startLine > prevTok.endLine &&
        tok.value !== '.';

      const isNewVerbBoundary =
        tok.type === 'word' &&
        shouldStartNewStatementBeforeVerb(state, tok.upper, tok.startLine, nextTok);

      if (isCompletedUseOnPrevLine || isNewVerbBoundary) {
        finalizeStatement(undefined);
      }
    }

    pushTokenToState(state, tok);
  }

  if (state.tokens.length > 0) {
    finalizeStatement(undefined);
  }

  return statements;
}

/**
 * Extrai a declaração SQL exata na posição atual do cursor no editor,
 * sem exigir seleção de texto. Suporta cursor no início, meio, após o ';' na mesma linha,
 * em comandos multilinhas (com ou sem ';') e em linhas de comentário acima do comando.
 */
export function extractStatementAtCursor(
  fullText: string,
  position: { lineNumber: number; column: number }
): { statement: string; startLine: number; endLine: number; statementIndex: number } | null {
  if (!fullText || !fullText.trim()) return null;

  const statements = parseSqlStatementsWithRanges(fullText);
  if (statements.length === 0) return null;

  const lines = fullText.split('\n');
  const lineIdx = Math.max(0, Math.min(position.lineNumber - 1, lines.length - 1));
  const targetLine = lineIdx + 1;

  let cursorOffset = 0;
  for (let i = 0; i < lineIdx; i++) {
    cursorOffset += lines[i].length + 1;
  }
  cursorOffset += Math.max(0, (position.column || 1) - 1);

  // 1. Prioridade máxima: declarações cujo código real abrange a linha atual do cursor
  const onCodeLine = statements
    .map((stmt, index) => ({ stmt, index }))
    .filter(({ stmt }) => targetLine >= stmt.codeStartLine && targetLine <= stmt.codeEndLine);

  if (onCodeLine.length === 1) {
    const { stmt, index } = onCodeLine[0];
    return {
      statement: stmt.text,
      startLine: stmt.codeStartLine,
      endLine: stmt.codeEndLine,
      statementIndex: index,
    };
  }

  if (onCodeLine.length > 1) {
    // Múltiplos comandos na mesma linha (ex: 'SELECT 1; SELECT 2;')
    for (const { stmt, index } of onCodeLine) {
      if (cursorOffset >= stmt.codeStartOffset && cursorOffset <= stmt.endOffset) {
        return {
          statement: stmt.text,
          startLine: stmt.codeStartLine,
          endLine: stmt.codeEndLine,
          statementIndex: index,
        };
      }
    }
    // Se o cursor está em espaço após o último ';' da linha, pega o último comando daquela linha
    const lastOnLine = onCodeLine[onCodeLine.length - 1];
    return {
      statement: lastOnLine.stmt.text,
      startLine: lastOnLine.stmt.codeStartLine,
      endLine: lastOnLine.stmt.codeEndLine,
      statementIndex: lastOnLine.index,
    };
  }

  // 2. Cursor posicionado em linha de comentário pertencente ao cabeçalho de uma declaração
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (targetLine >= stmt.rawStartLine && targetLine <= stmt.rawEndLine) {
      return {
        statement: stmt.text,
        startLine: stmt.codeStartLine,
        endLine: stmt.codeEndLine,
        statementIndex: i,
      };
    }
  }

  // 3. Cursor em linha em branco entre declarações: se estiver logo abaixo ou acima, associa ao comando mais próximo se não houver ambiguidade?
  // Para evitar executar o arquivo inteiro por acidente no Alt+E, se estiver colado imediatamente após um comando (linha seguinte) ou antes, pega o comando adjacente.
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (targetLine < stmt.codeStartLine) {
      return {
        statement: stmt.text,
        startLine: stmt.codeStartLine,
        endLine: stmt.codeEndLine,
        statementIndex: i,
      };
    }
  }

  const lastIdx = statements.length - 1;
  return {
    statement: statements[lastIdx].text,
    startLine: statements[lastIdx].codeStartLine,
    endLine: statements[lastIdx].codeEndLine,
    statementIndex: lastIdx,
  };
}

/**
 * Analisa o texto SQL anterior à nova palavra-chave digitada (`typedVerbUpper`, ex: 'SELECT')
 * na linha `typedVerbLine` (1-based) e verifica se existe um comando anterior completo sem ';'.
 *
 * Retorna o offset exato (0-based, logo após o último token de código do comando anterior,
 * antes de comentários/quebras de linha) onde o ';' deve ser inserido automaticamente,
 * ou `null` caso não deva inserir ';' (ex: já possui ';', ou está em subquery, UNION, AS SELECT, etc.).
 */
export function detectMissingPreviousSemicolon(
  sqlBeforeWord: string,
  typedVerbUpper: string,
  typedVerbLine: number
): number | null {
  if (!AUTO_SEMICOLON_VERBS.has(typedVerbUpper)) return null;
  if (!sqlBeforeWord || !sqlBeforeWord.trim()) return null;

  const tokens = tokenizeSql(sqlBeforeWord);
  if (tokens.length === 0) return null;

  // Se o último token de código antes da palavra atual já for ';', o comando anterior já está fechado
  const lastGlobalToken = tokens[tokens.length - 1];
  if (lastGlobalToken.type === 'semicolon') return null;

  // Reconstrói apenas o estado da última declaração em aberto (após o último ';' de nível 0)
  let state = createEmptyState();
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    const nextTok = idx + 1 < tokens.length ? tokens[idx + 1] : undefined;

    if (tok.type === 'semicolon') {
      state = createEmptyState();
      continue;
    }

    if (state.tokens.length > 0 && state.parenDepth === 0 && (state.caseDepthStack[0] || 0) === 0) {
      const prevTok = state.tokens[state.tokens.length - 1];
      const isCompletedUseOnPrevLine =
        state.firstKeyword === 'USE' &&
        state.tokens.length >= 2 &&
        tok.startLine > prevTok.endLine &&
        tok.value !== '.';

      const isNewVerbBoundary =
        tok.type === 'word' &&
        shouldStartNewStatementBeforeVerb(state, tok.upper, tok.startLine, nextTok);

      if (isCompletedUseOnPrevLine || isNewVerbBoundary) {
        state = createEmptyState();
      }
    }

    pushTokenToState(state, tok);
  }

  // Agora avalia se `typedVerbUpper` na linha `typedVerbLine` inicia uma nova instrução após `state`
  if (shouldStartNewStatementBeforeVerb(state, typedVerbUpper, typedVerbLine, undefined)) {
    const prevLastTok = state.tokens[state.tokens.length - 1];
    return prevLastTok.endOffset;
  }

  return null;
}
