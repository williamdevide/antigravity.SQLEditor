import type { DatabaseSchema } from '../types';

export interface SqlDiagnosticMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning';
}

// Erros de digitação mais comuns em palavras-chave e tipos SQL (exibidos como erro imediato)
const SPELLCHECK_KEYWORD_TYPOS: Record<string, string> = {
  frm: 'FROM',
  fom: 'FROM',
  form: 'FROM',
  fro: 'FROM',
  frmo: 'FROM',
  frpm: 'FROM',
  fromm: 'FROM',
  fron: 'FROM',
  selec: 'SELECT',
  seletc: 'SELECT',
  selet: 'SELECT',
  slct: 'SELECT',
  slect: 'SELECT',
  selct: 'SELECT',
  selcet: 'SELECT',
  slecet: 'SELECT',
  sel: 'SELECT',
  sele: 'SELECT',
  wher: 'WHERE',
  were: 'WHERE',
  weree: 'WHERE',
  wheree: 'WHERE',
  whr: 'WHERE',
  wehre: 'WHERE',
  wherer: 'WHERE',
  whre: 'WHERE',
  wherr: 'WHERE',
  inser: 'INSERT',
  insrt: 'INSERT',
  isnert: 'INSERT',
  inest: 'INSERT',
  inot: 'INTO',
  inti: 'INTO',
  updat: 'UPDATE',
  updt: 'UPDATE',
  updaet: 'UPDATE',
  updte: 'UPDATE',
  delet: 'DELETE',
  delte: 'DELETE',
  dlt: 'DELETE',
  deleet: 'DELETE',
  oder: 'ORDER',
  ordr: 'ORDER',
  oreder: 'ORDER',
  byy: 'BY',
  grop: 'GROUP',
  grup: 'GROUP',
  gruop: 'GROUP',
  gropu: 'GROUP',
  havng: 'HAVING',
  havig: 'HAVING',
  havin: 'HAVING',
  jion: 'JOIN',
  jon: 'JOIN',
  jin: 'JOIN',
  innner: 'INNER',
  inerr: 'INNER',
  lefft: 'LEFT',
  rigth: 'RIGHT',
  righ: 'RIGHT',
  databas: 'DATABASE',
  databaes: 'DATABASE',
  datbase: 'DATABASE',
  tabl: 'TABLE',
  talbe: 'TABLE',
  tabel: 'TABLE',
  tabble: 'TABLE',
  valus: 'VALUES',
  vaules: 'VALUES',
  valeus: 'VALUES',
  distinc: 'DISTINCT',
  distinto: 'DISTINCT',
  primay: 'PRIMARY',
  primry: 'PRIMARY',
  primar: 'PRIMARY',
  foriegn: 'FOREIGN',
  foring: 'FOREIGN',
  refernces: 'REFERENCES',
  refereces: 'REFERENCES',
  refrences: 'REFERENCES',
  limt: 'LIMIT',
  limite: 'LIMIT',
  lmite: 'LIMIT',
  cretae: 'CREATE',
  craete: 'CREATE',
  ceate: 'CREATE',
  altr: 'ALTER',
  dropp: 'DROP',
  betwen: 'BETWEEN',
  betwenn: 'BETWEEN',
  lik: 'LIKE',
  lkie: 'LIKE',
  ascc: 'ASC',
  descc: 'DESC',
  nul: 'NULL',
  varchr: 'VARCHAR',
  interger: 'INTEGER',
  integre: 'INTEGER',
  bolean: 'BOOLEAN',
  decmal: 'DECIMAL',
  exits: 'EXISTS',
  unoin: 'UNION',
};

const CORE_CLAUSE_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DATABASE', 'DROP', 'ALTER', 'JOIN', 'INNER',
  'LEFT', 'RIGHT', 'OUTER', 'CROSS', 'GROUP', 'ORDER', 'HAVING', 'LIMIT',
  'OFFSET', 'UNION', 'DISTINCT', 'PRIMARY', 'FOREIGN', 'REFERENCES',
  'BETWEEN', 'EXISTS', 'LIKE', 'NULL', 'VARCHAR', 'INTEGER', 'BOOLEAN', 'DECIMAL',
];

const RESERVED_ALIAS_WORDS = new Set([
  'count', 'sum', 'avg', 'min', 'max', 'order', 'group', 'key', 'value',
  'values', 'date', 'time', 'year', 'month', 'day', 'user', 'table', 'select',
  'from', 'where', 'level', 'rank', 'index', 'check', 'default', 'limit',
]);

// Conjunto de palavras-chave e funções SQL conhecidas (não disparam falso positivo em coluna/typo)
const KNOWN_SQL_KEYWORDS_AND_FUNCS = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
  'delete', 'create', 'table', 'database', 'drop', 'alter', 'add', 'column',
  'modify', 'change', 'rename', 'to', 'if', 'not', 'exists', 'use', 'show',
  'describe', 'desc', 'asc', 'as', 'join', 'inner', 'left', 'right', 'outer',
  'cross', 'full', 'natural', 'on', 'using', 'and', 'or', 'xor', 'is', 'null',
  'in', 'between', 'like', 'ilike', 'glob', 'regexp', 'case', 'when', 'then',
  'else', 'end', 'group', 'by', 'having', 'order', 'limit', 'offset', 'union',
  'all', 'distinct', 'primary', 'key', 'foreign', 'references', 'unique',
  'check', 'default', 'auto_increment', 'autoincrement', 'constraint', 'cascade',
  'restrict', 'truncate', 'begin', 'commit', 'rollback', 'transaction', 'with',
  'recursive', 'over', 'partition', 'rows', 'range', 'true', 'false',
  // Tipos de dados comuns
  'int', 'integer', 'bigint', 'smallint', 'tinyint', 'varchar', 'char', 'text',
  'decimal', 'numeric', 'float', 'double', 'real', 'boolean', 'bool', 'date',
  'datetime', 'timestamp', 'time', 'year', 'blob', 'json', 'enum',
  // Funções agregadas e escalares comuns (SQLite/MySQL)
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'ifnull', 'nullif', 'upper',
  'lower', 'length', 'char_length', 'trim', 'ltrim', 'rtrim', 'substr',
  'substring', 'replace', 'concat', 'round', 'abs', 'floor', 'ceil', 'ceiling',
  'now', 'current_date', 'current_time', 'current_timestamp', 'datetime',
  'strftime', 'year', 'month', 'day', 'cast', 'typeof', 'group_concat',
  'random', 'hex', 'instr', 'printf', 'iif', 'row_number', 'rank', 'dense_rank',
]);

// Palavras-chave após as quais uma vírgula imediata é estritamente proibida
const NO_COMMA_AFTER_KEYWORDS = new Set([
  'select', 'distinct', 'from', 'where', 'set', 'join', 'on', 'into', 'values',
  'update', 'delete', 'having', 'limit', 'offset', 'by', 'and', 'or', 'not',
  'as', 'case', 'when', 'then', 'else',
]);

// Palavras-chave antes das quais uma vírgula pendente é proibida
const NO_COMMA_BEFORE_CLAUSE = new Set([
  'from', 'where', 'join', 'inner', 'left', 'right', 'outer', 'cross', 'full',
  'on', 'group', 'order', 'having', 'limit', 'offset', 'union', 'set', 'values',
  'into', 'as',
]);

// Palavras que costumam anteceder outra palavra-chave SQL (ex.: ORDER BY, GROUP BY, CREATE TABLE)
const CLAUSE_TRANSITION_PREFIX = new Set([
  'create', 'alter', 'drop', 'order', 'group', 'inner', 'left', 'right',
  'outer', 'cross', 'full', 'primary', 'foreign', 'insert', 'delete',
]);

const BOUNDARY_FOLLOWING_EXPRESSION = new Set([
  'from', 'where', 'join', 'inner', 'left', 'right', 'outer', 'cross',
  'group', 'order', 'having', 'limit', 'offset', 'union', 'set', 'values',
]);

const COMPARISON_OR_BINARY_OPS = new Set(['=', '!=', '<>', '<', '>', '<=', '>=', '+', '/', '%']);

type ClauseContext =
  | 'SELECT'
  | 'FROM'
  | 'WHERE'
  | 'JOIN'
  | 'ON'
  | 'GROUP'
  | 'ORDER'
  | 'HAVING'
  | 'SET'
  | 'VALUES'
  | 'CREATE'
  | 'INSERT'
  | 'OTHER';

interface RawToken {
  kind: 'word' | 'string' | 'ident' | 'punct' | 'dot' | 'unclosed_string' | 'number';
  text: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

function levenshteinDist(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function scanSqlTokensWithPositions(sql: string): {
  tokens: RawToken[];
  unclosedParens: Array<{ line: number; col: number }>;
  extraCloseParens: Array<{ line: number; col: number }>;
} {
  const tokens: RawToken[] = [];
  const parenStack: Array<{ line: number; col: number }> = [];
  const extraCloseParens: Array<{ line: number; col: number }> = [];

  let line = 1;
  let col = 1;
  let i = 0;
  const len = sql.length;

  const advance = (ch: string) => {
    if (ch === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
    i += 1;
  };

  while (i < len) {
    const ch = sql[i];
    const next = i + 1 < len ? sql[i + 1] : '';

    // Espaços em branco
    if (/\s/.test(ch)) {
      advance(ch);
      continue;
    }

    // Comentário -- ou #
    if ((ch === '-' && next === '-') || ch === '#') {
      while (i < len && sql[i] !== '\n') {
        advance(sql[i]);
      }
      continue;
    }

    // Comentário de bloco /* ... */
    if (ch === '/' && next === '*') {
      advance(ch);
      advance(next);
      while (i < len) {
        if (sql[i] === '*' && i + 1 < len && sql[i + 1] === '/') {
          advance('*');
          advance('/');
          break;
        }
        advance(sql[i]);
      }
      continue;
    }

    // Strings ('...' ou "...") e identificadores com crase (`...`)
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      const startLine = line;
      const startCol = col;
      let text = quote;
      advance(ch);
      let closed = false;
      while (i < len) {
        const cur = sql[i];
        text += cur;
        if (cur === '\\' && i + 1 < len) {
          advance(cur);
          text += sql[i];
          advance(sql[i]);
          continue;
        }
        if (cur === quote) {
          if (i + 1 < len && sql[i + 1] === quote) {
            advance(cur);
            text += sql[i];
            advance(sql[i]);
            continue;
          }
          advance(cur);
          closed = true;
          break;
        }
        advance(cur);
      }
      tokens.push({
        kind: closed ? (quote === '`' ? 'ident' : 'string') : 'unclosed_string',
        text,
        startLine,
        startCol,
        endLine: line,
        endCol: col,
      });
      continue;
    }

    if (ch === '(') {
      parenStack.push({ line, col });
      tokens.push({ kind: 'punct', text: '(', startLine: line, startCol: col, endLine: line, endCol: col + 1 });
      advance(ch);
      continue;
    }

    if (ch === ')') {
      if (parenStack.length > 0) {
        parenStack.pop();
      } else {
        extraCloseParens.push({ line, col });
      }
      tokens.push({ kind: 'punct', text: ')', startLine: line, startCol: col, endLine: line, endCol: col + 1 });
      advance(ch);
      continue;
    }

    if (ch === '.') {
      tokens.push({ kind: 'dot', text: '.', startLine: line, startCol: col, endLine: line, endCol: col + 1 });
      advance(ch);
      continue;
    }

    // Operadores compostos (!=, <>, <=, >=)
    if (
      (ch === '!' && next === '=') ||
      (ch === '<' && (next === '>' || next === '=')) ||
      (ch === '>' && next === '=')
    ) {
      tokens.push({ kind: 'punct', text: ch + next, startLine: line, startCol: col, endLine: line, endCol: col + 2 });
      advance(ch);
      advance(next);
      continue;
    }

    if (/[A-Za-zÀ-ÿ_]/.test(ch)) {
      const startLine = line;
      const startCol = col;
      let text = '';
      while (i < len && /[A-Za-zÀ-ÿ0-9_$]/.test(sql[i])) {
        text += sql[i];
        advance(sql[i]);
      }
      tokens.push({ kind: 'word', text, startLine, startCol, endLine: line, endCol: col });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const startLine = line;
      const startCol = col;
      let text = '';
      while (i < len && /[0-9.]/.test(sql[i])) {
        text += sql[i];
        advance(sql[i]);
      }
      tokens.push({ kind: 'number', text, startLine, startCol, endLine: line, endCol: col });
      continue;
    }

    tokens.push({ kind: 'punct', text: ch, startLine: line, startCol: col, endLine: line, endCol: col + 1 });
    advance(ch);
  }

  return { tokens, unclosedParens: parenStack, extraCloseParens };
}

function splitTokenStatements(tokens: RawToken[]): RawToken[][] {
  const statements: RawToken[][] = [];
  let current: RawToken[] = [];
  for (const tok of tokens) {
    if (tok.kind === 'punct' && tok.text === ';') {
      if (current.length > 0) {
        statements.push(current);
        current = [];
      }
    } else {
      current.push(tok);
    }
  }
  if (current.length > 0) {
    statements.push(current);
  }
  return statements;
}

function unquoteIdentifier(raw: string): string {
  return raw.replace(/^`|`$/g, '').trim();
}

/**
 * Analisa um script SQL em busca de múltiplos erros simultâneos:
 * - Erros ortográficos em palavras-chave em qualquer posição da consulta
 * - Vírgulas em posições sintaticamente proibidas (",,", "SELECT ,", ", FROM", ", WHERE", ", )", "( ,", "WHERE a=1, b=2", etc.)
 * - Aspas/crases não fechadas e parênteses desbalanceados
 * - Aliases reservados sem crase
 * - Tabelas inexistentes e colunas inexistentes (com ou sem qualificação alias.coluna) no banco ativo
 * Função pura reutilizável pelo Monaco Editor e pela suíte automatizada de testes.
 */
export function analyzeSqlDiagnostics(
  sql: string,
  activeDatabase: string,
  schemas: DatabaseSchema[]
): SqlDiagnosticMarker[] {
  if (!sql || !sql.trim()) return [];

  const markers: SqlDiagnosticMarker[] = [];
  const seenKeys = new Set<string>();
  const pushMarker = (marker: SqlDiagnosticMarker) => {
    const key = `${marker.startLineNumber}:${marker.startColumn}:${marker.endLineNumber}:${marker.endColumn}:${marker.message}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      markers.push(marker);
    }
  };

  const { tokens, unclosedParens, extraCloseParens } = scanSqlTokensWithPositions(sql);

  // 1. Aspas / crases sem fechamento
  for (const tok of tokens) {
    if (tok.kind === 'unclosed_string') {
      pushMarker({
        startLineNumber: tok.startLine,
        startColumn: tok.startCol,
        endLineNumber: tok.endLine,
        endColumn: Math.max(tok.startCol + 1, tok.endCol),
        message: 'Aspas ou crase não fechada neste literal/identificador.',
        severity: 'error',
      });
    }
  }

  // 2. Parênteses desbalanceados
  for (const p of unclosedParens) {
    pushMarker({
      startLineNumber: p.line,
      startColumn: p.col,
      endLineNumber: p.line,
      endColumn: p.col + 1,
      message: 'Parêntese "(" aberto sem fechamento correspondente ")".',
      severity: 'error',
    });
  }
  for (const p of extraCloseParens) {
    pushMarker({
      startLineNumber: p.line,
      startColumn: p.col,
      endLineNumber: p.line,
      endColumn: p.col + 1,
      message: 'Parêntese ")" extra sem abertura correspondente "(".',
      severity: 'error',
    });
  }

  // Índice de esquemas por banco para validar tabelas/colunas
  const dbMap = new Map<string, Map<string, Set<string>>>();
  for (const db of schemas || []) {
    const tblMap = new Map<string, Set<string>>();
    for (const t of db.tables || []) {
      const colSet = new Set((t.columns || []).map((c) => c.name.toLowerCase()));
      tblMap.set(t.name.toLowerCase(), colSet);
    }
    dbMap.set(db.name.toLowerCase(), tblMap);
  }

  // Tabelas criadas inline no próprio script também são consideradas válidas
  const inlineCreatedTables = new Map<string, Set<string>>();
  let currentDbName = (activeDatabase || '').toLowerCase();

  const statements = splitTokenStatements(tokens);

  for (const stmt of statements) {
    if (stmt.length === 0) continue;

    // Atualiza banco ativo quando o comando for USE <db>
    if (stmt[0].kind === 'word' && stmt[0].text.toLowerCase() === 'use' && stmt[1]) {
      currentDbName = unquoteIdentifier(stmt[1].text).toLowerCase();
      continue;
    }

    // Registra CTEs (WITH alias AS (...)) para não acusar como tabela inexistente
    const cteNames = new Set<string>();
    if (stmt[0].kind === 'word' && stmt[0].text.toLowerCase() === 'with') {
      for (let idx = 1; idx < stmt.length - 1; idx++) {
        if (
          stmt[idx].kind === 'word' &&
          stmt[idx + 1]?.kind === 'word' &&
          stmt[idx + 1].text.toLowerCase() === 'as'
        ) {
          cteNames.add(stmt[idx].text.toLowerCase());
        }
      }
    }

    // Registra CREATE TABLE inline
    if (
      stmt[0].kind === 'word' &&
      stmt[0].text.toLowerCase() === 'create' &&
      stmt[1]?.kind === 'word' &&
      stmt[1].text.toLowerCase() === 'table'
    ) {
      let tblIdx = 2;
      if (
        stmt[2]?.text.toLowerCase() === 'if' &&
        stmt[3]?.text.toLowerCase() === 'not' &&
        stmt[4]?.text.toLowerCase() === 'exists'
      ) {
        tblIdx = 5;
      }
      const tblTok = stmt[tblIdx];
      if (tblTok && (tblTok.kind === 'word' || tblTok.kind === 'ident')) {
        inlineCreatedTables.set(unquoteIdentifier(tblTok.text).toLowerCase(), new Set());
      }
    }

    const activeTblMap = dbMap.get(currentDbName);
    const aliasToTable = new Map<string, string>();
    const declaredAliases = new Set<string>();
    const referencedKnownTables = new Set<string>();
    let hasUnresolvedOrCompositeTable = false;
    const typoTokenKeys = new Set<string>();
    const tokenKey = (t: RawToken) => `${t.startLine}:${t.startCol}`;

    // =========================================================================
    // A. Validação de palavras-chave (typos diretos + distância 1), aliases e tabelas
    //    (NUNCA interrompe o loop após o primeiro erro: acumula todos no script!)
    // =========================================================================
    for (let idx = 0; idx < stmt.length; idx++) {
      const tok = stmt[idx];
      const prev = idx > 0 ? stmt[idx - 1] : null;
      const next = idx + 1 < stmt.length ? stmt[idx + 1] : null;

      if (tok.kind !== 'word') continue;
      const lower = tok.text.toLowerCase();
      const isAfterDot = prev?.kind === 'dot';
      const isBeforeDot = next?.kind === 'dot';

      let correctedKeyword: string | null = null;

      if (!isAfterDot && !isBeforeDot) {
        const directTypo = SPELLCHECK_KEYWORD_TYPOS[lower];
        if (directTypo) {
          correctedKeyword = directTypo.toLowerCase();
          typoTokenKeys.add(tokenKey(tok));
          pushMarker({
            startLineNumber: tok.startLine,
            startColumn: tok.startCol,
            endLineNumber: tok.endLine,
            endColumn: tok.endCol,
            message: `Possível erro de digitação em "${tok.text}". Você quis dizer ${directTypo}?`,
            severity: 'error',
          });
        } else if (!KNOWN_SQL_KEYWORDS_AND_FUNCS.has(lower) && lower.length >= 4) {
          // Verifica se é identificador conhecido no banco (tabela/coluna/CTE/alias)
          const isKnownTableOrCte =
            Boolean(activeTblMap?.has(lower)) ||
            inlineCreatedTables.has(lower) ||
            cteNames.has(lower);
          const isKnownColumnAny = Boolean(
            activeTblMap && Array.from(activeTblMap.values()).some((cols) => cols.has(lower))
          );

          const prevLower = prev?.kind === 'word' ? prev.text.toLowerCase() : '';
          const nextLower = next?.kind === 'word' ? next.text.toLowerCase() : '';
          const isClausePosition =
            idx === 0 ||
            CLAUSE_TRANSITION_PREFIX.has(prevLower) ||
            (prev?.kind === 'word' &&
              !KNOWN_SQL_KEYWORDS_AND_FUNCS.has(prevLower) &&
              prevLower !== 'as') ||
            nextLower === 'by' ||
            (prev?.kind === 'punct' && prev.text === ')');

          if (
            isClausePosition &&
            !isKnownTableOrCte &&
            !isKnownColumnAny &&
            prevLower !== 'as'
          ) {
            const matchNear = CORE_CLAUSE_KEYWORDS.find(
              (kw) => kw.toLowerCase() !== lower && levenshteinDist(lower, kw.toLowerCase()) === 1
            );
            if (matchNear) {
              // Evita acusar palavra de condição após WHERE/ON/AND/OR/SET como cláusula
              const isAfterConditionIntro = ['where', 'and', 'or', 'on', 'set'].includes(prevLower);
              if (!isAfterConditionIntro || BOUNDARY_FOLLOWING_EXPRESSION.has(matchNear.toLowerCase())) {
                correctedKeyword = matchNear.toLowerCase();
                typoTokenKeys.add(tokenKey(tok));
                pushMarker({
                  startLineNumber: tok.startLine,
                  startColumn: tok.startCol,
                  endLineNumber: tok.endLine,
                  endColumn: tok.endCol,
                  message: `Palavra-chave SQL "${tok.text}" incorreta. Você quis dizer ${matchNear}?`,
                  severity: 'error',
                });
              }
            }
          }
        }
      }

      const effectiveKeyword = correctedKeyword || lower;

      // Alias reservado sem crase após AS
      if (effectiveKeyword === 'as' && next?.kind === 'word' && RESERVED_ALIAS_WORDS.has(next.text.toLowerCase())) {
        pushMarker({
          startLineNumber: next.startLine,
          startColumn: next.startCol,
          endLineNumber: next.endLine,
          endColumn: next.endCol,
          message: `Palavra reservada "${next.text}" usada como alias sem crase. Use \`${next.text}\`.`,
          severity: 'warning',
        });
      }
      if (effectiveKeyword === 'as' && next?.kind === 'word') {
        declaredAliases.add(next.text.toLowerCase());
      }

      // Referências a tabelas após FROM / JOIN / UPDATE / INTO (inclusive quando FROM/JOIN teve typo como "FRM")
      const prevEffective =
        prev?.kind === 'word'
          ? (SPELLCHECK_KEYWORD_TYPOS[prev.text.toLowerCase()] || prev.text).toLowerCase()
          : '';
      const expectsTableName =
        effectiveKeyword === 'from' ||
        effectiveKeyword === 'join' ||
        effectiveKeyword === 'update' ||
        (effectiveKeyword === 'into' && prevEffective === 'insert');

      if (expectsTableName && next && (next.kind === 'word' || next.kind === 'ident')) {
        if (next.text !== '(') {
          const hasDbPrefix = stmt[idx + 2]?.kind === 'dot' && stmt[idx + 3];
          const targetDbMap = hasDbPrefix
            ? dbMap.get(unquoteIdentifier(next.text).toLowerCase())
            : activeTblMap;
          const tblToken = hasDbPrefix ? stmt[idx + 3] : next;
          const tblNameLower = unquoteIdentifier(tblToken.text).toLowerCase();

          // Registra possível alias logo após o nome da tabela
          const afterTblIdx = hasDbPrefix ? idx + 4 : idx + 2;
          const cand1 = stmt[afterTblIdx];
          const cand2 = stmt[afterTblIdx + 1];
          aliasToTable.set(tblNameLower, tblNameLower);
          if (cand1?.kind === 'word' && cand1.text.toLowerCase() === 'as' && cand2?.kind === 'word') {
            aliasToTable.set(cand2.text.toLowerCase(), tblNameLower);
            declaredAliases.add(cand2.text.toLowerCase());
          } else if (
            cand1?.kind === 'word' &&
            !KNOWN_SQL_KEYWORDS_AND_FUNCS.has(cand1.text.toLowerCase()) &&
            !SPELLCHECK_KEYWORD_TYPOS[cand1.text.toLowerCase()]
          ) {
            aliasToTable.set(cand1.text.toLowerCase(), tblNameLower);
            declaredAliases.add(cand1.text.toLowerCase());
          }

          if (inlineCreatedTables.has(tblNameLower) || cteNames.has(tblNameLower)) {
            hasUnresolvedOrCompositeTable = true;
          } else if (targetDbMap && targetDbMap.size > 0) {
            if (!targetDbMap.has(tblNameLower)) {
              hasUnresolvedOrCompositeTable = true;
              pushMarker({
                startLineNumber: tblToken.startLine,
                startColumn: tblToken.startCol,
                endLineNumber: tblToken.endLine,
                endColumn: tblToken.endCol,
                message: `Tabela "${unquoteIdentifier(tblToken.text)}" não encontrada no banco "${currentDbName || 'ativo'}".`,
                severity: 'error',
              });
            } else if (!hasDbPrefix) {
              referencedKnownTables.add(tblNameLower);
            } else {
              hasUnresolvedOrCompositeTable = true;
            }
          }
        } else {
          hasUnresolvedOrCompositeTable = true;
        }
      }
    }

    // =========================================================================
    // B. Validação de vírgulas em posições sintaticamente proibidas
    // =========================================================================
    let parenDepth = 0;
    let activeClause: ClauseContext = 'OTHER';

    for (let idx = 0; idx < stmt.length; idx++) {
      const tok = stmt[idx];
      const prev = idx > 0 ? stmt[idx - 1] : null;
      const next = idx + 1 < stmt.length ? stmt[idx + 1] : null;

      if (tok.kind === 'punct' && tok.text === '(') {
        parenDepth += 1;
        continue;
      }
      if (tok.kind === 'punct' && tok.text === ')') {
        parenDepth = Math.max(0, parenDepth - 1);
        continue;
      }

      if (tok.kind === 'word' && parenDepth === 0) {
        const kw = (SPELLCHECK_KEYWORD_TYPOS[tok.text.toLowerCase()] || tok.text).toLowerCase();
        if (kw === 'select') activeClause = 'SELECT';
        else if (kw === 'from') activeClause = 'FROM';
        else if (kw === 'where') activeClause = 'WHERE';
        else if (kw === 'join') activeClause = 'JOIN';
        else if (kw === 'on') activeClause = 'ON';
        else if (kw === 'group') activeClause = 'GROUP';
        else if (kw === 'order') activeClause = 'ORDER';
        else if (kw === 'having') activeClause = 'HAVING';
        else if (kw === 'set') activeClause = 'SET';
        else if (kw === 'values') activeClause = 'VALUES';
        else if (kw === 'create') activeClause = 'CREATE';
        else if (kw === 'insert') activeClause = 'INSERT';
        continue;
      }

      if (tok.kind !== 'punct' || tok.text !== ',') continue;

      const pushCommaError = (message: string) => {
        pushMarker({
          startLineNumber: tok.startLine,
          startColumn: tok.startCol,
          endLineNumber: tok.endLine,
          endColumn: tok.endCol,
          message,
          severity: 'error',
        });
      };

      // 1. Vírgula no início do comando ou no final antes de ';' / EOF
      if (!prev) {
        pushCommaError('Vírgula inesperada no início do comando SQL.');
        continue;
      }
      if (!next) {
        pushCommaError('Vírgula sobrando no final do comando SQL.');
        continue;
      }

      // 2. Vírgula duplicada (,,)
      if (prev.kind === 'punct' && prev.text === ',') {
        pushCommaError('Vírgula duplicada ",," não é permitida.');
        continue;
      }

      // 3. Vírgula imediatamente após '(' ou antes de ')'
      if (prev.kind === 'punct' && prev.text === '(') {
        pushCommaError('Vírgula inesperada logo após parêntese de abertura "(".');
        continue;
      }
      if (next.kind === 'punct' && next.text === ')') {
        pushCommaError('Vírgula sobrando antes do parêntese de fechamento ")".');
        continue;
      }

      // 4. Vírgula adjacente a ponto ou operador binário (nunca bloqueia "SELECT *,")
      if (
        prev.kind === 'dot' ||
        next.kind === 'dot' ||
        (prev.kind === 'punct' && COMPARISON_OR_BINARY_OPS.has(prev.text)) ||
        (next.kind === 'punct' && COMPARISON_OR_BINARY_OPS.has(next.text))
      ) {
        pushCommaError('Vírgula em posição inválida junto a operador ou ponto.');
        continue;
      }

      // 5. Vírgula logo após palavra-chave que não aceita vírgula (ex.: "SELECT ,", "FROM ,", "WHERE ,")
      if (prev.kind === 'word') {
        const prevKw = (SPELLCHECK_KEYWORD_TYPOS[prev.text.toLowerCase()] || prev.text).toLowerCase();
        if (NO_COMMA_AFTER_KEYWORDS.has(prevKw)) {
          pushCommaError(`Vírgula proibida logo após a palavra-chave "${prev.text.toUpperCase()}".`);
          continue;
        }
      }

      // 6. Vírgula pendente logo antes de nova cláusula SQL (ex.: "SELECT nome, FROM alunos")
      if (next.kind === 'word') {
        const nextKw = (SPELLCHECK_KEYWORD_TYPOS[next.text.toLowerCase()] || next.text).toLowerCase();
        if (NO_COMMA_BEFORE_CLAUSE.has(nextKw)) {
          pushCommaError(`Vírgula inválida antes da cláusula "${next.text.toUpperCase()}".`);
          continue;
        }
      }

      // 7. Vírgula solta fora de parênteses dentro de WHERE / HAVING / ON (ex.: "WHERE id = 1, nome = 'Ana'")
      if (parenDepth === 0 && (activeClause === 'WHERE' || activeClause === 'HAVING' || activeClause === 'ON')) {
        pushCommaError(
          `Vírgula inválida na cláusula ${activeClause}. Use AND ou OR para combinar condições.`
        );
      }
    }

    // =========================================================================
    // C. Validação de colunas qualificadas (alias.coluna / tabela.coluna)
    // =========================================================================
    if (activeTblMap && activeTblMap.size > 0) {
      for (let idx = 1; idx < stmt.length - 1; idx++) {
        if (stmt[idx].kind !== 'dot') continue;
        const leftTok = stmt[idx - 1];
        const rightTok = stmt[idx + 1];
        if (!leftTok || !rightTok) continue;
        if (leftTok.kind !== 'word' && leftTok.kind !== 'ident') continue;
        if (rightTok.kind !== 'word' && rightTok.kind !== 'ident') continue;
        if (rightTok.text === '*') continue;

        const leftLower = unquoteIdentifier(leftTok.text).toLowerCase();
        const rightLower = unquoteIdentifier(rightTok.text).toLowerCase();

        // Pula db.tabela
        if (dbMap.has(leftLower)) continue;

        const resolvedTable = aliasToTable.get(leftLower) || (activeTblMap.has(leftLower) ? leftLower : null);
        if (!resolvedTable) continue;
        const colSet = activeTblMap.get(resolvedTable);
        if (colSet && colSet.size > 0 && !colSet.has(rightLower)) {
          pushMarker({
            startLineNumber: rightTok.startLine,
            startColumn: rightTok.startCol,
            endLineNumber: rightTok.endLine,
            endColumn: rightTok.endCol,
            message: `Coluna "${unquoteIdentifier(rightTok.text)}" não existe na tabela "${resolvedTable}".`,
            severity: 'error',
          });
        }
      }
    }

    // =========================================================================
    // D. Validação de colunas não-qualificadas em SELECT de tabela única do schema ativo
    // =========================================================================
    const stmtFirstWord = stmt[0]?.kind === 'word'
      ? (SPELLCHECK_KEYWORD_TYPOS[stmt[0].text.toLowerCase()] || stmt[0].text).toLowerCase()
      : '';
    if (
      stmtFirstWord === 'select' &&
      !hasUnresolvedOrCompositeTable &&
      referencedKnownTables.size === 1 &&
      activeTblMap
    ) {
      const onlyTable = Array.from(referencedKnownTables)[0];
      const validCols = activeTblMap.get(onlyTable);
      if (validCols && validCols.size > 0) {
        let clause: ClauseContext = 'SELECT';
        for (let idx = 0; idx < stmt.length; idx++) {
          const tok = stmt[idx];
          const prev = idx > 0 ? stmt[idx - 1] : null;
          const next = idx + 1 < stmt.length ? stmt[idx + 1] : null;
          if (tok.kind !== 'word') continue;

          const rawLower = tok.text.toLowerCase();
          const effectiveKw = (SPELLCHECK_KEYWORD_TYPOS[rawLower] || rawLower).toLowerCase();

          if (effectiveKw === 'select') { clause = 'SELECT'; continue; }
          if (effectiveKw === 'from') { clause = 'FROM'; continue; }
          if (effectiveKw === 'where') { clause = 'WHERE'; continue; }
          if (effectiveKw === 'group') { clause = 'GROUP'; continue; }
          if (effectiveKw === 'order') { clause = 'ORDER'; continue; }
          if (effectiveKw === 'having') { clause = 'HAVING'; continue; }
          if (effectiveKw === 'limit') { clause = 'OTHER'; continue; }

          if (clause !== 'SELECT' && clause !== 'WHERE' && clause !== 'GROUP' && clause !== 'ORDER' && clause !== 'HAVING') {
            continue;
          }

          if (typoTokenKeys.has(tokenKey(tok))) continue;
          if (prev?.kind === 'dot' || next?.kind === 'dot') continue;
          if (next?.kind === 'punct' && next.text === '(') continue; // Chamada de função (ex.: COUNT(...))
          if (prev?.kind === 'word' && prev.text.toLowerCase() === 'as') continue; // Definição de alias
          if (KNOWN_SQL_KEYWORDS_AND_FUNCS.has(rawLower)) continue;
          if (declaredAliases.has(rawLower) || rawLower === onlyTable) continue;
          if (validCols.has(rawLower)) continue;

          pushMarker({
            startLineNumber: tok.startLine,
            startColumn: tok.startCol,
            endLineNumber: tok.endLine,
            endColumn: tok.endCol,
            message: `Coluna "${tok.text}" não existe na tabela "${onlyTable}".`,
            severity: 'error',
          });
        }
      }
    }
  }

  return markers;
}
