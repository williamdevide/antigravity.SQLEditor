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
      const temaFormat = tema.replace(/-/g, ' ');
      return `Semana ${sem} (${num}) - ${tipoCapitalized} [${temaFormat}]`;
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
