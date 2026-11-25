import type { DatabaseSchema } from '../types';

export interface SqlDiagnosticMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning';
}

// Erros de digitação mais comuns em palavras-chave SQL (exibidos como erro imediato)
const SPELLCHECK_KEYWORD_TYPOS: Record<string, string> = {
  frm: 'FROM',
  fom: 'FROM',
  form: 'FROM',
  fro: 'FROM',
  frmo: 'FROM',
  fromm: 'FROM',
  fron: 'FROM',
  frpm: 'FROM',
  selec: 'SELECT',
  seletc: 'SELECT',
  selet: 'SELECT',
  slct: 'SELECT',
  slect: 'SELECT',
  selct: 'SELECT',
  selcet: 'SELECT',
  slecet: 'SELECT',
  wher: 'WHERE',
  were: 'WHERE',
  wheree: 'WHERE',
  whr: 'WHERE',
  wehre: 'WHERE',
  wherer: 'WHERE',
  whre: 'WHERE',
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
  grop: 'GROUP',
  gruop: 'GROUP',
  gropu: 'GROUP',
  havng: 'HAVING',
  havin: 'HAVING',
  jion: 'JOIN',
  jon: 'JOIN',
  jin: 'JOIN',
  databas: 'DATABASE',
  databaes: 'DATABASE',
  tabl: 'TABLE',
  talbe: 'TABLE',
  tabel: 'TABLE',
  valus: 'VALUES',
  vaules: 'VALUES',
  valeus: 'VALUES',
  distinc: 'DISTINCT',
  distinto: 'DISTINCT',
  primay: 'PRIMARY',
  primar: 'PRIMARY',
  foriegn: 'FOREIGN',
  foring: 'FOREIGN',
  refernces: 'REFERENCES',
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
  exits: 'EXISTS',
  unoin: 'UNION',
};

const CORE_CLAUSE_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DATABASE', 'DROP', 'ALTER', 'JOIN', 'INNER',
  'LEFT', 'RIGHT', 'OUTER', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'UNION',
  'DISTINCT', 'PRIMARY', 'FOREIGN', 'REFERENCES', 'BETWEEN', 'EXISTS',
];

const RESERVED_ALIAS_WORDS = new Set([
  'count', 'sum', 'avg', 'min', 'max', 'order', 'group', 'key', 'value',
  'values', 'date', 'time', 'year', 'month', 'day', 'user', 'table', 'select',
  'from', 'where', 'level', 'rank', 'index', 'check', 'default', 'limit',
]);

interface RawToken {
  kind: 'word' | 'string' | 'ident' | 'punct' | 'dot' | 'unclosed_string';
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
      tokens.push({ kind: 'punct', text, startLine, startCol, endLine: line, endCol: col });
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
 * Analisa um script SQL em busca de erros ortográficos em palavras-chave,
 * strings/parênteses desbalanceados, aliases reservados e tabelas/colunas inexistentes.
 * Função pura reutilizável pelo Monaco Editor e pela suíte automatizada de testes.
 */
export function analyzeSqlDiagnostics(
  sql: string,
  activeDatabase: string,
  schemas: DatabaseSchema[]
): SqlDiagnosticMarker[] {
  if (!sql || !sql.trim()) return [];

  const markers: SqlDiagnosticMarker[] = [];
  const { tokens, unclosedParens, extraCloseParens } = scanSqlTokensWithPositions(sql);

  // 1. Aspas / crases sem fechamento
  for (const tok of tokens) {
    if (tok.kind === 'unclosed_string') {
      markers.push({
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
    markers.push({
      startLineNumber: p.line,
      startColumn: p.col,
      endLineNumber: p.line,
      endColumn: p.col + 1,
      message: 'Parêntese "(" aberto sem fechamento correspondente ")".',
      severity: 'error',
    });
  }
  for (const p of extraCloseParens) {
    markers.push({
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

    // Coleta mapa de alias -> nome real da tabela no comando para validar alias.coluna
    const aliasToTable = new Map<string, string>();
    const activeTblMap = dbMap.get(currentDbName);

    for (let idx = 0; idx < stmt.length; idx++) {
      const tok = stmt[idx];
      const prev = idx > 0 ? stmt[idx - 1] : null;
      const next = idx + 1 < stmt.length ? stmt[idx + 1] : null;

      if (tok.kind === 'word') {
        const lower = tok.text.toLowerCase();
        const isAfterDot = prev?.kind === 'dot';
        const isBeforeDot = next?.kind === 'dot';

        // 3. Erros de digitação em palavras-chave SQL (evita falsos positivos em nomes de tabela/coluna após ponto)
        if (!isAfterDot && !isBeforeDot) {
          const directTypo = SPELLCHECK_KEYWORD_TYPOS[lower];
          if (directTypo) {
            markers.push({
              startLineNumber: tok.startLine,
              startColumn: tok.startCol,
              endLineNumber: tok.endLine,
              endColumn: tok.endCol,
              message: `Possível erro de digitação em "${tok.text}". Você quis dizer ${directTypo}?`,
              severity: 'error',
            });
            continue;
          }

          // No primeiro token do comando (posição esperada de verbo SQL), checa distância 1
          if (idx === 0 && lower.length >= 4) {
            const matchNear = CORE_CLAUSE_KEYWORDS.find(
              (kw) => kw.toLowerCase() !== lower && levenshteinDist(lower, kw.toLowerCase()) === 1
            );
            if (matchNear) {
              markers.push({
                startLineNumber: tok.startLine,
                startColumn: tok.startCol,
                endLineNumber: tok.endLine,
                endColumn: tok.endCol,
                message: `Comando SQL "${tok.text}" não reconhecido. Você quis dizer ${matchNear}?`,
                severity: 'error',
              });
              continue;
            }
          }
        }

        // 4. Alias reservado sem crase após AS
        if (lower === 'as' && next?.kind === 'word' && RESERVED_ALIAS_WORDS.has(next.text.toLowerCase())) {
          markers.push({
            startLineNumber: next.startLine,
            startColumn: next.startCol,
            endLineNumber: next.endLine,
            endColumn: next.endCol,
            message: `Palavra reservada "${next.text}" usada como alias sem crase. Use \`${next.text}\`.`,
            severity: 'warning',
          });
        }

        // 5. Referências a tabelas após FROM / JOIN / UPDATE / INTO
        const expectsTableName =
          lower === 'from' ||
          lower === 'join' ||
          lower === 'update' ||
          (lower === 'into' && prev?.text.toLowerCase() === 'insert');

        if (expectsTableName && next && (next.kind === 'word' || next.kind === 'ident')) {
          // Ignora subqueries: FROM (SELECT ...)
          if (next.text !== '(') {
            // Verifica se há prefixo db.tabela
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
            } else if (
              cand1?.kind === 'word' &&
              !['where', 'on', 'join', 'inner', 'left', 'right', 'outer', 'cross', 'group', 'order', 'having', 'limit', 'set', 'values', 'union'].includes(
                cand1.text.toLowerCase()
              )
            ) {
              aliasToTable.set(cand1.text.toLowerCase(), tblNameLower);
            }

            if (
              !hasDbPrefix &&
              targetDbMap &&
              targetDbMap.size > 0 &&
              !targetDbMap.has(tblNameLower) &&
              !inlineCreatedTables.has(tblNameLower) &&
              !cteNames.has(tblNameLower)
            ) {
              markers.push({
                startLineNumber: tblToken.startLine,
                startColumn: tblToken.startCol,
                endLineNumber: tblToken.endLine,
                endColumn: tblToken.endCol,
                message: `Tabela "${unquoteIdentifier(tblToken.text)}" não encontrada no banco "${currentDbName || 'ativo'}".`,
                severity: 'error',
              });
            }
          }
        }
      }
    }

    // 6. Valida referências qualificadas alias.coluna ou tabela.coluna quando a tabela existe no schema ativo
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
          markers.push({
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
  }

  return markers;
}
