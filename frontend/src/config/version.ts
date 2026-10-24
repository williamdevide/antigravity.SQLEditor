/**
 * Versão do SQL Editor
 * Single source of truth para a versão da aplicação.
 */
export const APP_VERSION = '3.1.17';

/**
 * Compara se a versão atual é mais recente que a versão salva no armazenamento local.
 * Retorna true se a versão atual for mais nova ou se não houver versão salva.
 */
export function isNewerVersion(current: string, saved: string | null | undefined): boolean {
  if (!saved) return true;
  const cleanCurrent = current.replace(/^v/i, '').trim();
  const cleanSaved = saved.replace(/^v/i, '').trim();
  if (cleanCurrent === cleanSaved) return false;

  const currentParts = cleanCurrent.split('.').map(n => parseInt(n, 10) || 0);
  const savedParts = cleanSaved.split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(currentParts.length, savedParts.length); i++) {
    const c = currentParts[i] || 0;
    const s = savedParts[i] || 0;
    if (c > s) return true;
    if (c < s) return false;
  }
  return false;
}
