import alasql from 'alasql';
import { KNOWN_SQL_FUNCTIONS, registerMySQLFunctions, preprocessSqlQuery } from './mysqlFunctions';
import { parseSqlStatementsWithRanges, extractStatementAtCursor } from './sqlStatementParser';
import type { DatabaseSchema, SqlReview, ReviewTargetRange } from '../types';

// Garante que as funções MySQL estejam registradas no motor AlaSQL
registerMySQLFunctions(alasql);

const SQL_CLAUSE_KEYWORDS = new Set([
  'in', 'exists', 'values', 'not', 'and', 'or', 'case', 'when', 'then', 'else', 'end',
  'select', 'from', 'where', 'group', 'order', 'by', 'having', 'join', 'left', 'right',
  'inner', 'outer', 'insert', 'into', 'update', 'delete', 'create', 'table', 'database',
  'use', 'drop', 'alter', 'limit', 'offset', 'as', 'set', 'distinct', 'all'
]);

// Mapeamento direto de erros comuns de digitação em palavras-chave SQL
const KEYWORD_TYPO_MAP: Record<string, string> = {
  // FROM
  frm: 'FROM',
  fom: 'FROM',
  form: 'FROM',
  fro: 'FROM',
  frmo: 'FROM',
  fromm: 'FROM',
  fron: 'FROM',
  frpm: 'FROM',

  // SELECT
  selec: 'SELECT',
  seletc: 'SELECT',
  selet: 'SELECT',
  slct: 'SELECT',
  slect: 'SELECT',
  selct: 'SELECT',
  selcet: 'SELECT',
  slecet: 'SELECT',

  // WHERE
  wher: 'WHERE',
  were: 'WHERE',
  wheree: 'WHERE',
  whr: 'WHERE',
  wehre: 'WHERE',
  wherer: 'WHERE',
  whre: 'WHERE',

  // INSERT / INTO
  inser: 'INSERT',
  insrt: 'INSERT',
  isnert: 'INSERT',
  inot: 'INTO',
  inti: 'INTO',

  // UPDATE
  updat: 'UPDATE',
  updt: 'UPDATE',
  updaet: 'UPDATE',
  updte: 'UPDATE',

  // DELETE
  delet: 'DELETE',
  delte: 'DELETE',
  dlt: 'DELETE',
  deleet: 'DELETE',

  // ORDER / GROUP / BY
  oder: 'ORDER',
  ordr: 'ORDER',
  oreder: 'ORDER',
  grop: 'GROUP',
  gruop: 'GROUP',
  gropu: 'GROUP',

  // HAVING
  havng: 'HAVING',
  havin: 'HAVING',

  // JOIN
  jion: 'JOIN',
  jon: 'JOIN',
  jin: 'JOIN',

  // DATABASE / TABLE
  databas: 'DATABASE',
  databaes: 'DATABASE',
  tabl: 'TABLE',
  talbe: 'TABLE',
  tabel: 'TABLE',

  // VALUES
  valus: 'VALUES',
  vaules: 'VALUES',
  valeus: 'VALUES',

  // DISTINCT
  distinc: 'DISTINCT',
  distinto: 'DISTINCT',

  // PRIMARY / FOREIGN / KEY / REFERENCES
  primay: 'PRIMARY',
  primar: 'PRIMARY',
  foriegn: 'FOREIGN',
  foring: 'FOREIGN',
  refernces: 'REFERENCES',
  refrences: 'REFERENCES',
  reference: 'REFERENCES',

  // LIMIT
  limt: 'LIMIT',
  limite: 'LIMIT',
  lmite: 'LIMIT',
};

// Distância de Levenshtein para identificar erros de digitação próximos
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Aplica transformações apenas em trechos de código SQL real, preservando literais de string, crases e comentários
function transformCodeSegments(sql: string, transformFn: (codeSegment: string) => string): string {
  const tokenPattern = /('(?:''|\\'|[^'])*'|"(?:""|\\"|[^"])*"|`[^`]*`|--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g;
  let result = '';
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(sql)) !== null) {
    if (match.index > lastIdx) {
      result += transformFn(sql.slice(lastIdx, match.index));
    }
    result += match[0];
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < sql.length) {
    result += transformFn(sql.slice(lastIdx));
  }
  return result;
}

export function reviewSqlQuery(
  query: string,
  activeDatabase: string,
  schemas: DatabaseSchema[],
  runtimeError?: string
): SqlReview {
  const trimmed = query.trim();
  const errorsDetected: string[] = [];
  const recommendations: string[] = [];

  if (runtimeError) {
    errorsDetected.push(`Erro de Execução (Runtime): ${runtimeError}`);
  }

  if (!trimmed) {
    return {
      originalQuery: query,
      errorsDetected: ['Nenhum comando SQL selecionado para revisão.'],
      suggestedQuery: query,
      recommendations: ['Selecione um trecho de código SQL no editor para revisar.'],
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
  }

  // Coleta tabelas e colunas conhecidas para evitar corrigir nomes de tabelas legítimos
  const currentDbSchema = schemas.find(s => s.name === activeDatabase);
  const knownTables = new Set(
    currentDbSchema ? currentDbSchema.tables.map(t => t.name.toLowerCase()) : []
  );
  const knownColumns = new Set<string>();
  if (currentDbSchema) {
    for (const t of currentDbSchema.tables) {
      for (const c of t.columns) {
        knownColumns.add(c.name.toLowerCase());
      }
    }
  }

  // 1. Diagnóstico e Correção de Erros de Digitação em Palavras-Chave (Keyword Typos)
  let correctedQuery = trimmed;
  const fixedTypos: { original: string; corrected: string }[] = [];

  // Padrão estrutural: SELECT ... <palavra_incorreta> <tabela>
  // Ex: SELECT * FRM tb_aulas -> FRM é substituído por FROM
  const fromTypoRegex = /\bSELECT\b([\s\S]*?)\b([A-Za-z_][A-Za-z0-9_]*)\b\s+([`'"]?[A-Za-z0-9_]+[`'"]?)/i;
  const fromMatch = correctedQuery.match(fromTypoRegex);
  if (fromMatch) {
    const candidateWord = fromMatch[2];
    const candidateLower = candidateWord.toLowerCase();
    const targetTable = fromMatch[3].replace(/[`'"]/g, '').toLowerCase();

    // Se candidateWord não for FROM, e não for tabela nem coluna, mas for similar a FROM ou estiver no mapa
    if (candidateLower !== 'from' && candidateLower !== 'distinct' && !knownTables.has(candidateLower) && !knownColumns.has(candidateLower)) {
      if (
        KEYWORD_TYPO_MAP[candidateLower] === 'FROM' ||
        levenshtein(candidateLower, 'from') <= 2 ||
        knownTables.has(targetTable)
      ) {
        const replaceRegex = new RegExp(`\\b${candidateWord}\\b(?=\\s+${fromMatch[3].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        correctedQuery = correctedQuery.replace(replaceRegex, 'FROM');
        fixedTypos.push({ original: candidateWord, corrected: 'FROM' });
        errorsDetected.push(
          `Erro de Sintaxe: Palavra-chave '${candidateWord}' não reconhecida após a projeção de colunas. Foi corrigida para 'FROM'.`
        );
        recommendations.push(
          `A cláusula FROM é obrigatória após os campos selecionados para indicar a tabela de origem.`
        );
      }
    }
  }

  // Varredura de outras palavras para substituição por KEYWORD_TYPO_MAP (preservando strings e comentários)
  correctedQuery = transformCodeSegments(correctedQuery, (segment) => {
    let updatedSegment = segment;
    const words = updatedSegment.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
    for (const w of words) {
      const wLower = w.toLowerCase();
      if (knownTables.has(wLower) || knownColumns.has(wLower)) {
        continue;
      }

      if (KEYWORD_TYPO_MAP[wLower]) {
        const properKeyword = KEYWORD_TYPO_MAP[wLower];
        const reg = new RegExp(`\\b${w}\\b`, 'g');
        updatedSegment = updatedSegment.replace(reg, properKeyword);
        if (!fixedTypos.some(f => f.original.toLowerCase() === wLower)) {
          fixedTypos.push({ original: w, corrected: properKeyword });
          errorsDetected.push(
            `Erro de Digitação: Palavra-chave '${w}' corrigida para '${properKeyword}'.`
          );
        }
      }
    }
    return updatedSegment;
  });

  // 2. Validação Sintática com AlaSQL (no código original pré-processado para MySQL)
  let rawSyntaxError: string | null = null;
  const preprocessedForValidation = preprocessSqlQuery(trimmed);
  try {
    alasql.parse(preprocessedForValidation);
  } catch (err: any) {
    rawSyntaxError = err?.message || String(err);
  }

  // Se houve erro sintático original e NÃO encontramos um typo específico, adiciona a mensagem do parser
  if (rawSyntaxError) {
    if (fixedTypos.length === 0) {
      errorsDetected.push(`Erro de Sintaxe SQL: ${rawSyntaxError}`);
    }
  }

  // Tenta compilar a query no AlaSQL para detectar erros de estrutura
  try {
    if (!/^\s*(USE|CREATE\s+DATABASE|DROP\s+DATABASE)\b/i.test(trimmed)) {
      if (typeof (alasql as any).compile === 'function') {
        (alasql as any).compile(preprocessedForValidation);
      }
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!errorsDetected.some(e => e.includes(msg)) && fixedTypos.length === 0) {
      errorsDetected.push(`Erro de Compilação SQL: ${msg}`);
    }
  }

  // 3. Validação de Chamadas de Funções (Detecta funções não suportadas pelo AlaSQL)
  const functionCallRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null;
  const detectedFunctions = new Set<string>();

  while ((match = functionCallRegex.exec(trimmed)) !== null) {
    const fnName = match[1];
    const fnLower = fnName.toLowerCase();
    if (!SQL_CLAUSE_KEYWORDS.has(fnLower)) {
      detectedFunctions.add(fnName);
    }
  }

  for (const fnName of detectedFunctions) {
    const fnLower = fnName.toLowerCase();
    const isKnown =
      KNOWN_SQL_FUNCTIONS.has(fnLower) ||
      (alasql.fn && typeof (alasql.fn as any)[fnName] === 'function') ||
      (alasql.fn && typeof (alasql.fn as any)[fnLower] === 'function') ||
      ((alasql as any).stdlib && (alasql as any).stdlib[fnLower] !== undefined);

    if (!isKnown) {
      errorsDetected.push(
        `Função '${fnName}()' não suportada ou não registrada no motor SQL. Se executada, causará erro 'alasql.fn.${fnName} is not a function'.`
      );
      recommendations.push(
        `Substitua '${fnName}()' por uma função compatível (ex: DATE_FORMAT, NOW, DATEDIFF, CONCAT, IFNULL, UPPER, LOWER, COUNT, SUM, AVG).`
      );
    }
  }

  // 4. Validação de Comandos Perigosos (UPDATE / DELETE sem WHERE)
  const isDelete = /^\s*DELETE\s+FROM/i.test(correctedQuery);
  const isUpdate = /^\s*UPDATE\s+/i.test(correctedQuery);
  const hasWhere = /\bWHERE\b/i.test(correctedQuery);

  if (isDelete && !hasWhere) {
    errorsDetected.push(
      'ALERTA DE SEGURANÇA: Comando DELETE executado sem cláusula WHERE. Todos os registros da tabela serão apagados!'
    );
    recommendations.push('Adicione uma cláusula WHERE com a chave primária (ex: WHERE id = 1).');
  }

  if (isUpdate && !hasWhere) {
    errorsDetected.push(
      'ALERTA DE SEGURANÇA: Comando UPDATE executado sem cláusula WHERE. Todas as linhas terão os valores sobrescritos!'
    );
    recommendations.push('Adicione uma cláusula WHERE especificando quais registros devem ser alterados.');
  }

  // 5. Validação de Existência de Tabelas no Schema Ativo
  const knownTablesList = currentDbSchema ? currentDbSchema.tables.map(t => t.name.toLowerCase()) : [];
  const fromTblMatch = correctedQuery.match(/\bFROM\s+([`'"]?[\w-]+[`'"]?)/i);
  const joinMatches = [...correctedQuery.matchAll(/\bJOIN\s+([`'"]?[\w-]+[`'"]?)/gi)];
  const intoMatch = correctedQuery.match(/\bINTO\s+([`'"]?[\w-]+[`'"]?)/i);
  const updateMatch = correctedQuery.match(/\bUPDATE\s+([`'"]?[\w-]+[`'"]?)/i);

  const referencedTables = new Set<string>();
  if (fromTblMatch) referencedTables.add(fromTblMatch[1].replace(/[`'"]/g, '').toLowerCase());
  for (const m of joinMatches) referencedTables.add(m[1].replace(/[`'"]/g, '').toLowerCase());
  if (intoMatch) referencedTables.add(intoMatch[1].replace(/[`'"]/g, '').toLowerCase());
  if (updateMatch) referencedTables.add(updateMatch[1].replace(/[`'"]/g, '').toLowerCase());

  if (knownTablesList.length > 0) {
    for (const refTable of referencedTables) {
      if (!knownTablesList.includes(refTable)) {
        errorsDetected.push(`Tabela '${refTable}' não encontrada no banco atual '${activeDatabase}'.`);
        recommendations.push(
          `Verifique se o nome da tabela está correto ou alterne para o banco correspondente com 'USE <banco>' (tabelas disponíveis: ${knownTablesList.join(', ')}).`
        );
      }
    }
  }

  // 6. Verificação de Boas Práticas (SELECT sem LIMIT)
  const isSelect = /^\s*SELECT\b/i.test(correctedQuery);
  const hasLimit = /\bLIMIT\b/i.test(correctedQuery);
  if (isSelect && !hasLimit) {
    recommendations.push(
      'Boas Práticas: Adicione LIMIT para evitar carregar volumes excessivos de dados na memória (ex: LIMIT 100).'
    );
  }

  // 7. Verificação de Ponto e Vírgula
  if (!trimmed.endsWith(';')) {
    recommendations.push('Sintaxe: Recomenda-se finalizar instruções SQL com ponto e vírgula (;).');
  }

  // 8. Geração de Sugestão Formatada e Validada
  let suggested = correctedQuery;

  // Formata palavras-chave comuns para MAIÚSCULAS (sem alterar conteúdo de strings ou comentários)
  const sqlKeywords = [
    'select', 'from', 'where', 'and', 'or', 'insert', 'into', 'values',
    'update', 'set', 'delete', 'create', 'table', 'database', 'drop', 'alter',
    'add', 'column', 'order by', 'group by', 'having', 'limit', 'join', 'left join',
    'right join', 'inner join', 'on', 'as', 'like', 'in', 'is null', 'is not null',
    'asc', 'desc', 'primary key', 'foreign key'
  ];

  suggested = transformCodeSegments(suggested, (segment) => {
    let out = segment;
    for (const kw of sqlKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      out = out.replace(regex, kw.toUpperCase());
    }
    return out;
  });

  // Adiciona WHERE id = 1 se for UPDATE/DELETE sem WHERE
  if (isDelete && !hasWhere) {
    suggested = suggested.replace(/;?$/, ' WHERE id = 1;');
  } else if (isUpdate && !hasWhere) {
    suggested = suggested.replace(/;?$/, ' WHERE id = 1;');
  }

  // Garante ponto e vírgula ao final sem injetar LIMIT 100 forçado na query do aluno
  if (!suggested.trimEnd().endsWith(';')) {
    suggested = `${suggested.trimEnd()};`;
  }

  // 9. Validação Final da Sugestão Gerada
  try {
    alasql.parse(preprocessSqlQuery(suggested));
    if (errorsDetected.length > 0) {
      recommendations.unshift('✓ A consulta sugerida corrigiu os erros detectados e agora compila com sucesso no motor SQL!');
    }
  } catch {
    // Se ainda não parseou, mantém como está
  }

  return {
    originalQuery: query,
    errorsDetected,
    suggestedQuery: suggested,
    recommendations,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
  };
}

function lineColToOffset(text: string, targetLine: number, targetCol: number): number {
  let line = 1;
  let i = 0;
  while (i < text.length && line < targetLine) {
    if (text[i] === '\n') line++;
    i++;
  }
  let col = 1;
  while (i < text.length && text[i] !== '\n' && text[i] !== '\r' && col < targetCol) {
    i++;
    col++;
  }
  return i;
}

function offsetToLineCol(text: string, targetOffset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(targetOffset, text.length));
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: clamped - lineStart + 1 };
}

/**
 * Localiza a faixa exata (linha/coluna inicial e final) de um comando SQL dentro do script completo,
 * usando `hintStartLine` para desambiguar caso existam dois comandos idênticos no mesmo arquivo.
 */
export function resolveReviewTargetRange(
  fullText: string,
  snippet: string,
  tabId: string,
  hintStartLine?: number
): ReviewTargetRange | undefined {
  const trimmedSnippet = snippet.trim();
  if (!fullText || !trimmedSnippet) return undefined;

  const normSnippet = trimmedSnippet.replace(/;\s*$/, '').trim();
  const statements = parseSqlStatementsWithRanges(fullText);

  const matchingStmts = statements.filter((s) => {
    const sTrim = s.text.trim();
    const sNorm = sTrim.replace(/;\s*$/, '').trim();
    return sTrim === trimmedSnippet || sNorm === normSnippet;
  });

  if (matchingStmts.length > 0) {
    let best = matchingStmts[0];
    if (hintStartLine !== undefined) {
      for (const candidate of matchingStmts) {
        if (Math.abs(candidate.codeStartLine - hintStartLine) < Math.abs(best.codeStartLine - hintStartLine)) {
          best = candidate;
        }
      }
    }
    return {
      tabId,
      startLine: best.codeStartLine,
      startColumn: best.codeStartCol,
      endLine: best.codeEndLine,
      endColumn: best.codeEndCol,
    };
  }

  // Fallback por busca textual exata próxima à linha indicada
  const occurrences: number[] = [];
  let searchFrom = 0;
  while (searchFrom < fullText.length) {
    const idx = fullText.indexOf(trimmedSnippet, searchFrom);
    if (idx === -1) break;
    occurrences.push(idx);
    searchFrom = idx + 1;
  }

  if (occurrences.length > 0) {
    let bestOffset = occurrences[0];
    if (hintStartLine !== undefined) {
      for (const off of occurrences) {
        const candLine = offsetToLineCol(fullText, off).line;
        const bestLine = offsetToLineCol(fullText, bestOffset).line;
        if (Math.abs(candLine - hintStartLine) < Math.abs(bestLine - hintStartLine)) {
          bestOffset = off;
        }
      }
    }
    const startPos = offsetToLineCol(fullText, bestOffset);
    const endPos = offsetToLineCol(fullText, bestOffset + trimmedSnippet.length);
    return {
      tabId,
      startLine: startPos.line,
      startColumn: startPos.column,
      endLine: endPos.line,
      endColumn: endPos.column,
    };
  }

  return undefined;
}

export interface SurgicalReviewReplacement {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  replacementText: string;
  newFullText: string;
}

/**
 * Aplica cirurgicamente `suggestedSql` apenas sobre o comando revisado (`originalQuery` / `targetRange`),
 * preservando 100% dos demais comandos, indentação, linhas em branco e evitando ';;' duplicado.
 */
export function applySuggestedSqlToScript(
  fullText: string,
  originalQuery: string,
  suggestedSql: string,
  targetRange?: Pick<ReviewTargetRange, 'startLine' | 'startColumn' | 'endLine' | 'endColumn'>
): SurgicalReviewReplacement | null {
  const cleanSuggested = suggestedSql.trim();
  if (!cleanSuggested) return null;

  if (!fullText || !fullText.trim()) {
    return {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      replacementText: cleanSuggested,
      newFullText: cleanSuggested,
    };
  }

  const trimmedOriginal = originalQuery.trim();
  const normOriginal = trimmedOriginal.replace(/;\s*$/, '').trim();
  let replaceStart = -1;
  let replaceEnd = -1;

  // 1. Verifica se o targetRange salvo ainda aponta exatamente para o comando revisado
  if (targetRange) {
    const rawS = lineColToOffset(fullText, targetRange.startLine, targetRange.startColumn);
    const rawE = lineColToOffset(fullText, targetRange.endLine, targetRange.endColumn);
    if (rawE >= rawS) {
      const slice = fullText.slice(rawS, rawE);
      const lead = slice.length - slice.trimStart().length;
      const trail = slice.length - slice.trimEnd().length;
      const trimmedSlice = slice.trim();
      const normSlice = trimmedSlice.replace(/;\s*$/, '').trim();
      if (trimmedSlice && (trimmedSlice === trimmedOriginal || normSlice === normOriginal)) {
        replaceStart = rawS + lead;
        replaceEnd = rawE - trail;
      }
    }
  }

  // 2. Re-analisa os statements do script para encontrar o comando mesmo se linhas acima foram editadas
  if (replaceStart === -1 && trimmedOriginal) {
    const resolved = resolveReviewTargetRange(fullText, trimmedOriginal, '', targetRange?.startLine);
    if (resolved) {
      replaceStart = lineColToOffset(fullText, resolved.startLine, resolved.startColumn);
      replaceEnd = lineColToOffset(fullText, resolved.endLine, resolved.endColumn);
    }
  }

  // 3. Fallback: se o usuário editou levemente o próprio comando naquela linha após abrir a revisão
  if (replaceStart === -1 && targetRange) {
    const atLine = extractStatementAtCursor(fullText, {
      lineNumber: targetRange.startLine,
      column: Math.max(1, targetRange.startColumn),
    });
    if (atLine && atLine.startLine <= targetRange.endLine && atLine.endLine >= targetRange.startLine) {
      replaceStart = atLine.codeStartOffset;
      replaceEnd = atLine.endOffset;
    }
  }

  if (replaceStart === -1 || replaceEnd < replaceStart) {
    return null;
  }

  // Evita duplicar ';' caso exista um ';' logo após a seleção parcial na mesma linha
  let look = replaceEnd;
  while (look < fullText.length && (fullText[look] === ' ' || fullText[look] === '\t')) {
    look++;
  }
  if (look < fullText.length && fullText[look] === ';' && cleanSuggested.endsWith(';')) {
    replaceEnd = look + 1;
  }

  const startPos = offsetToLineCol(fullText, replaceStart);
  const endPos = offsetToLineCol(fullText, replaceEnd);
  const newFullText = fullText.slice(0, replaceStart) + cleanSuggested + fullText.slice(replaceEnd);

  return {
    startLine: startPos.line,
    startColumn: startPos.column,
    endLine: endPos.line,
    endColumn: endPos.column,
    replacementText: cleanSuggested,
    newFullText,
  };
}
