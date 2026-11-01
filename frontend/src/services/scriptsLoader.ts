// Loader de scripts SQL de Bancos de Dados e Soluções de Aula
// Utiliza Vite import.meta.glob com query '?raw' e eager: true
// Qualquer arquivo .sql adicionado em frontend/src/data/bds/ ou frontend/src/data/solutions/
// é automaticamente empacotado e disponibilizado pelo SQLEditor.

import { parseSqlStatementsWithRanges } from './sqlStatementParser';

export interface SolutionItem {
  id: string;
  fileName: string;
  displayName: string;
  content: string;
}

export interface ClassroomDbScript {
  fileName: string;
  content: string;
}

// 1. Carrega todos os arquivos SQL de bancos de dados de aula
const rawBdsModules = import.meta.glob<string>('../data/bds/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// 2. Carrega todos os arquivos SQL de soluções
const rawSolutionsModules = import.meta.glob<string>('../data/solutions/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const TEMA_LABEL_MAP: Record<string, string> = {
  'pizzaria streaming': 'Pizzaria & Streaming',
  'escolaidiomas': 'Escola de Idiomas',
  'rh': 'Recursos Humanos (RH)',
  'ecommerce': 'E-Commerce',
};

/**
 * Formata o nome do arquivo para um título mais legível e amigável
 * Ex: 'semana07-01-apoio-(pizzaria-streaming).sql' -> 'Semana 07: Apoio (Pizzaria Streaming)'
 */
export function formatSolutionTitle(fileName: string): string {
  const base = fileName.replace(/\.sql$/i, '');
  
  // Trata padrão semanaXX-YY-tipo-(tema)
  const match = base.match(/^semana(\d+)-(\d+)-(.*?)(?:-\((.*?)\))?$/i);
  if (match) {
    const [, sem, num, tipo, tema] = match;
    const tipoCapitalized = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    if (tema) {
      const temaKey = tema.replace(/-/g, ' ').toLowerCase();
      const temaDisplay = TEMA_LABEL_MAP[temaKey] || temaKey.replace(/\b\w/g, l => l.toUpperCase());
      return `Semana ${sem} (${num}) - ${tipoCapitalized} [${temaDisplay}]`;
    }
    return `Semana ${sem} (${num}) - ${tipoCapitalized}`;
  }

  // Fallback: substitui hífens e sublinhados por espaços e capitaliza
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Retorna todos os scripts de bancos de dados de aula ordenados pelo nome do arquivo
 */
export function getClassroomDbScripts(): ClassroomDbScript[] {
  const list: ClassroomDbScript[] = [];

  for (const [path, content] of Object.entries(rawBdsModules)) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] || path;
    list.push({
      fileName,
      content,
    });
  }

  // Ordena alfabeticamente para manter a sequência das semanas
  list.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return list;
}

export interface ClassroomDatabaseGroup {
  dbName: string;
  sourceFile: string;
  statements: string[];
}

/**
 * Divide script SQL em declarações individuais separadas por ';' ou limites de comandos de nível superior,
 * respeitando aspas simples, duplas, backticks e comentários de linha/bloco.
 */
export function splitSqlStatements(sql: string): string[] {
  return parseSqlStatementsWithRanges(sql).map(s => s.text);
}

/**
 * Agrupa todos os scripts SQL da pasta data/bds/ organizados por banco de dados.
 * Suporta múltiplos bancos no mesmo arquivo e arquivos individuais.
 */
export function getClassroomDatabases(): ClassroomDatabaseGroup[] {
  const scripts = getClassroomDbScripts();
  const dbMap = new Map<string, { sourceFile: string; statements: string[] }>();
  let currentDb = '';

  for (const scriptItem of scripts) {
    const statements = splitSqlStatements(scriptItem.content);
    for (const stmt of statements) {
      const clean = stmt.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const createMatch = clean.match(/^CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`'"\w-]+)/i);
      const useMatch = clean.match(/^USE\s+([`'"\w-]+)/i);

      if (createMatch) {
        currentDb = createMatch[1].replace(/[`'"]/g, '');
      } else if (useMatch) {
        currentDb = useMatch[1].replace(/[`'"]/g, '');
      }

      if (!currentDb) continue;

      if (!dbMap.has(currentDb)) {
        dbMap.set(currentDb, { sourceFile: scriptItem.fileName, statements: [] });
      }
      dbMap.get(currentDb)!.statements.push(stmt);
    }
  }

  return Array.from(dbMap.entries()).map(([dbName, info]) => ({
    dbName,
    sourceFile: info.sourceFile,
    statements: info.statements
  }));
}

/**
 * Retorna todas as soluções disponíveis ordenadas pelo nome do arquivo
 */
export function getAvailableSolutions(): SolutionItem[] {
  const list: SolutionItem[] = [];

  for (const [path, content] of Object.entries(rawSolutionsModules)) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] || path;
    list.push({
      id: fileName,
      fileName,
      displayName: formatSolutionTitle(fileName),
      content,
    });
  }

  list.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return list;
}

