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

export function reviewSqlQuery(
  query: string,
  activeDatabase: string,
  schemas: DatabaseSchema[]
): SqlReview {
  const trimmed = query.trim();
  const errorsDetected: string[] = [];
  const recommendations: string[] = [];

  if (!trimmed) {
    return {
      originalQuery: query,
      errorsDetected: ['Nenhum comando SQL selecionado para revisão.'],
      suggestedQuery: query,
      recommendations: ['Selecione um trecho de código SQL no editor para revisar.'],
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
  }

  // 1. Validação Sintática e de Compilação com AlaSQL
  try {
    alasql.parse(trimmed);
  } catch (err: any) {
    errorsDetected.push(`Erro de Sintaxe SQL: ${err?.message || String(err)}`);
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
    // Adiciona se não for mensagem repetida de sintaxe
    if (!errorsDetected.some(e => e.includes(msg))) {
      errorsDetected.push(`Erro de Compilação SQL: ${msg}`);
    }
  }

  // 2. Validação de Chamadas de Funções (Detecta funções não suportadas pelo AlaSQL)
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

  // 3. Validação de Comandos Perigosos (UPDATE / DELETE sem WHERE)
  const isDelete = /^\s*DELETE\s+FROM/i.test(trimmed);
  const isUpdate = /^\s*UPDATE\s+/i.test(trimmed);
  const hasWhere = /\bWHERE\b/i.test(trimmed);

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

  // 4. Validação de Existência de Tabelas no Schema Ativo
  const currentDbSchema = schemas.find(s => s.name === activeDatabase);
  const knownTables = currentDbSchema ? currentDbSchema.tables.map(t => t.name.toLowerCase()) : [];

  // Extrai possíveis nomes de tabelas da query
  const fromMatch = trimmed.match(/\bFROM\s+([`'"]?[\w-]+[`'"]?)/i);
  const joinMatches = [...trimmed.matchAll(/\bJOIN\s+([`'"]?[\w-]+[`'"]?)/gi)];
  const intoMatch = trimmed.match(/\bINTO\s+([`'"]?[\w-]+[`'"]?)/i);
  const updateMatch = trimmed.match(/\bUPDATE\s+([`'"]?[\w-]+[`'"]?)/i);

  const referencedTables = new Set<string>();
  if (fromMatch) referencedTables.add(fromMatch[1].replace(/[`'"]/g, '').toLowerCase());
  for (const m of joinMatches) referencedTables.add(m[1].replace(/[`'"]/g, '').toLowerCase());
  if (intoMatch) referencedTables.add(intoMatch[1].replace(/[`'"]/g, '').toLowerCase());
  if (updateMatch) referencedTables.add(updateMatch[1].replace(/[`'"]/g, '').toLowerCase());

  if (knownTables.length > 0) {
    for (const refTable of referencedTables) {
      if (!knownTables.includes(refTable)) {
        errorsDetected.push(`Tabela '${refTable}' não encontrada no banco atual '${activeDatabase}'.`);
        recommendations.push(
          `Verifique se o nome da tabela está correto ou se precisa alternar de banco com 'USE <banco>' (tabelas disponíveis: ${knownTables.join(', ')}).`
        );
      }
    }
  }

  // 5. Verificação de Boas Práticas (SELECT sem LIMIT)
  const isSelect = /^\s*SELECT\b/i.test(trimmed);
  const hasLimit = /\bLIMIT\b/i.test(trimmed);
  if (isSelect && !hasLimit) {
    recommendations.push(
      'Boas Práticas: Adicione LIMIT para evitar carregar volumes excessivos de dados na memória (ex: LIMIT 100).'
    );
  }

  // 6. Verificação de Ponto e Vírgula
  if (!trimmed.endsWith(';')) {
    recommendations.push('Sintaxe: Recomenda-se finalizar instruções SQL com ponto e vírgula (;).');
  }

  // 7. Geração de Sugestão Formatada
  let suggested = trimmed;

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

  // Adiciona WHERE id = ... se for UPDATE/DELETE sem WHERE
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

  return {
    originalQuery: query,
    errorsDetected,
    suggestedQuery: suggested,
    recommendations,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
  };
}
