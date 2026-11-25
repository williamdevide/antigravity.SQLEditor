// Guarda de área de transferência interna durante o Modo Avaliação:
// permite copiar e colar livremente entre as abas abertas do SQLEditor,
// bloqueando apenas colagens vindas de fontes externas.

const internalCopiedSet = new Set<string>();
const MAX_INTERNAL_CLIPBOARD_ENTRIES = 30;

function normalizeClipboardText(text: string): string {
  return (text || '').replace(/\r\n/g, '\n');
}

/**
 * Registra um trecho copiado/recortado dentro do editor durante a avaliação.
 */
export function recordInternalClipboard(rawText: string): void {
  const normalized = normalizeClipboardText(rawText);
  if (!normalized) return;

  if (internalCopiedSet.has(normalized)) {
    internalCopiedSet.delete(normalized);
  }
  internalCopiedSet.add(normalized);

  if (internalCopiedSet.size > MAX_INTERNAL_CLIPBOARD_ENTRIES) {
    const oldest = internalCopiedSet.values().next().value;
    if (oldest !== undefined) {
      internalCopiedSet.delete(oldest);
    }
  }
}

/**
 * Verifica se o texto sendo colado originou-se de uma cópia interna entre abas do SQLEditor.
 */
export function isAllowedInternalPaste(rawText: string): boolean {
  const normalized = normalizeClipboardText(rawText);
  if (!normalized) return false;
  if (internalCopiedSet.has(normalized)) return true;

  const trimmed = normalized.trim();
  if (!trimmed) return false;
  for (const saved of internalCopiedSet) {
    if (saved.trim() === trimmed) return true;
  }
  return false;
}

/**
 * Limpa o histórico interno de cópias (ex.: ao encerrar ou reiniciar a avaliação).
 */
export function clearInternalClipboard(): void {
  internalCopiedSet.clear();
}
