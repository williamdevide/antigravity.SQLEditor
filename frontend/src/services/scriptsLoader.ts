// Loader de scripts SQL de Bancos de Dados e Soluções de Aula
// Utiliza Vite import.meta.glob com query '?raw' e eager: true
// Qualquer arquivo .sql adicionado em frontend/src/data/bds/ ou frontend/src/data/solutions/
// é automaticamente empacotado e disponibilizado pelo SQLEditor.

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
 * Divide script SQL em declarações individuais separadas por ';',
 * respeitando aspas simples, duplas, backticks e comentários de linha/bloco.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    // Trata comentários de linha (-- ou #)
    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inBlockComment) {
      if (!inLineComment && ((char === '-' && next === '-') || char === '#')) {
        inLineComment = true;
      } else if (inLineComment && (char === '\n' || char === '\r')) {
        inLineComment = false;
      }
    }

    // Trata comentários de bloco (/* ... */)
    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !inLineComment) {
      if (!inBlockComment && char === '/' && next === '*') {
        inBlockComment = true;
      } else if (inBlockComment && prev === '*' && char === '/') {
        inBlockComment = false;
        current += char;
        continue;
      }
    }

    // Trata strings com aspas simples, duplas e backticks (fora de comentários)
    if (!inLineComment && !inBlockComment) {
      if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      }
    }

    // Trata quebra de linha após comando USE sem ponto e vírgula
    if ((char === '\n' || char === '\r') && !inSingleQuote && !inDoubleQuote && !inBacktick && !inBlockComment) {
      const cleanCurrent = current.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (/^USE\s+[`'"]?[\w-]+[`'"]?$/i.test(cleanCurrent)) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    // Ponto e vírgula delimitador fora de qualquer delimitador ou comentário
    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick && !inLineComment && !inBlockComment) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
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

