import alasql from 'alasql';
import { KNOWN_SQL_FUNCTIONS, registerMySQLFunctions } from './mysqlFunctions';
import type { DatabaseSchema, SqlReview } from '../types';

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

  // Varredura de outras palavras para substituição por KEYWORD_TYPO_MAP
  const words = correctedQuery.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
  for (const w of words) {
    const wLower = w.toLowerCase();
    // Não corrige palavras que coincidem com nomes de tabelas ou colunas do banco
    if (knownTables.has(wLower) || knownColumns.has(wLower)) {
      continue;
    }

    if (KEYWORD_TYPO_MAP[wLower]) {
      const properKeyword = KEYWORD_TYPO_MAP[wLower];
      if (!fixedTypos.some(f => f.original.toLowerCase() === wLower)) {
        const reg = new RegExp(`\\b${w}\\b`, 'g');
        correctedQuery = correctedQuery.replace(reg, properKeyword);
        fixedTypos.push({ original: w, corrected: properKeyword });
        errorsDetected.push(
          `Erro de Digitação: Palavra-chave '${w}' corrigida para '${properKeyword}'.`
        );
      }
    }
  }

  // 2. Validação Sintática com AlaSQL (no código original)
  let rawSyntaxError: string | null = null;
  try {
    alasql.parse(trimmed);
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
        (alasql as any).compile(trimmed);
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

  // Formata palavras-chave comuns para MAIÚSCULAS
  const sqlKeywords = [
    'select', 'from', 'where', 'and', 'or', 'insert', 'into', 'values',
    'update', 'set', 'delete', 'create', 'table', 'database', 'drop', 'alter',
    'add', 'column', 'order by', 'group by', 'having', 'limit', 'join', 'left join',
    'right join', 'inner join', 'on', 'as', 'like', 'in', 'is null', 'is not null',
    'asc', 'desc', 'primary key', 'foreign key'
  ];

  for (const kw of sqlKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    suggested = suggested.replace(regex, kw.toUpperCase());
  }

  // Adiciona WHERE id = 1 se for UPDATE/DELETE sem WHERE
  if (isDelete && !hasWhere) {
    suggested = suggested.replace(/;?$/, ' WHERE id = 1;');
  } else if (isUpdate && !hasWhere) {
    suggested = suggested.replace(/;?$/, ' WHERE id = 1;');
  }

  // Adiciona LIMIT 100 se for SELECT sem LIMIT
  if (isSelect && !hasLimit) {
    suggested = suggested.replace(/;?$/, ' LIMIT 100;');
  } else if (!suggested.endsWith(';')) {
    suggested += ';';
  }

  // 9. Validação Final da Sugestão Gerada
  try {
    alasql.parse(suggested);
    if (errorsDetected.length > 0) {
      recommendations.unshift('✓ A consulta sugerida corrigiu os erros detectados e agora compila com sucesso no motor SQL!');
    }
  } catch (err: any) {
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
