/**
 * Utilitários para normalização e ordenação alfabética de nomes de alunos e turmas.
 */

// Padrões de nomes genéricos ou quebrados gerados no cadastro padrão
const INVALID_DISPLAY_NAME_PATTERNS = [
  /^aluno(\(a\))?(\s+sqleditor)?$/i,
  /^aluna(\s+sqleditor)?$/i,
  /^usu[aá]rio(\s+sqleditor)?$/i,
  /^sem\s+nome$/i,
  /^student$/i,
  /^sqleditor$/i,
];

/**
 * Converte uma string para Title Case (somente a primeira letra de cada palavra em maiúsculo).
 */
export function toTitleCasePtBr(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return (
        word.charAt(0).toLocaleUpperCase('pt-BR') +
        word.slice(1).toLocaleLowerCase('pt-BR')
      );
    })
    .join(' ');
}

/**
 * Recalcula um nome legível a partir da parte local do e-mail institucional ou pessoal.
 */
export function deriveNameFromEmail(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const localPart = email.split('@')[0]?.trim() || '';
  if (!localPart) return '';

  // Separa por pontos, underscores, hífens ou sinais de mais
  const rawTokens = localPart
    .split(/[._\-+]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (rawTokens.length === 0) return '';

  // Remove tokens puramente numéricos (ex: RA ou ano no e-mail) caso existam palavras alfabéticas
  const alphaTokens = rawTokens.filter((token) => /[a-zA-ZÀ-ÿ]/.test(token));
  const tokensToUse = alphaTokens.length > 0 ? alphaTokens : rawTokens;

  // Remove sufixos numéricos colados ao final de um único bloco caso haja separação óbvia? Não alterar letras+números de username válido sem separador, apenas capitalizar
  return toTitleCasePtBr(tokensToUse.join(' '));
}

/**
 * Normaliza o nome de exibição do aluno:
 * - Recalcula a partir do e-mail caso o nome esteja vazio ou seja placeholder como "Aluno(a) SQLEditor".
 * - Formata todas as palavras com apenas a primeira letra maiúscula e o restante minúsculo.
 */
export function formatStudentDisplayName(rawName?: string, email?: string): string {
  const trimmedName = (rawName || '').trim().replace(/\s+/g, ' ');
  const isInvalidName =
    !trimmedName ||
    INVALID_DISPLAY_NAME_PATTERNS.some((pattern) => pattern.test(trimmedName));

  if (!isInvalidName) {
    return toTitleCasePtBr(trimmedName);
  }

  const derived = deriveNameFromEmail(email);
  if (derived) {
    return derived;
  }

  return 'Aluno';
}

/**
 * Compara dois textos em ordem alfabética respeitando acentuação em Português do Brasil.
 */
export function compareNamesPtBr(a?: string, b?: string): number {
  return (a || '').trim().localeCompare((b || '').trim(), 'pt-BR', {
    sensitivity: 'base',
    numeric: true,
  });
}
