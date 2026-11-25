/**
 * Envolve uma Promise do Firestore com timeout explícito para evitar estados de
 * carregamento infinito ("Salvando...", botões travados) quando a rede ou cota falhar.
 */
export async function withFirestoreTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 12000,
  actionLabel = 'concluir a operação no banco em nuvem'
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new Error(
          `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao ${actionLabel}. Verifique sua conexão ou as regras/cota do Firestore.`
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
  }
}
