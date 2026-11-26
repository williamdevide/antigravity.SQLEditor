import type {
  ClassPresenceItem,
  ExamAlertItem,
  ExamAlertType,
  SavedScriptItem,
} from '../types';

export const EXAM_ALERT_TYPE_LABELS: Record<ExamAlertType, string> = {
  tab_switch: '🔄 Troca de Aba',
  window_blur: '🪟 Saiu da Janela',
  copy_paste_attempt: '📋 Copiar/Colar',
  extension_detected: '🤖 Extensão/Overlay IA',
  devtools_or_resize: '🛠️ Inspeção/DevTools',
  page_exit_attempt: '🚪 Saída / Fechamento da Página',
};

export interface ExamAlertSessionGroup {
  sessionId: string;
  sessionLabel: string;
  isCurrentActive: boolean;
  alerts: ExamAlertItem[];
  unackCount: number;
  latestAt: string;
}

/**
 * Retorna exclusivamente scripts salvos como "Script Pessoal" (exclui exemplos, exercícios, provas e backups).
 */
export function filterPersonalSavedScripts(scripts: SavedScriptItem[]): SavedScriptItem[] {
  return (scripts || []).filter((s) => s.category === 'student_saved' && !s.isTemporary);
}

/**
 * Calcula assinatura determinística dos BDs de Aula para recarregar apenas quando houver alteração real.
 */
export function computeDatabasesFingerprint(
  scripts: Array<{ id?: string; title?: string; content?: string; updatedAt?: string }>
): string {
  if (!scripts || scripts.length === 0) return 'empty';
  const normalized = [...scripts]
    .sort((a, b) => (a.id || a.title || '').localeCompare(b.id || b.title || ''))
    .map((s) => {
      const content = s.content || '';
      // Hash rápido (FNV-1a 32-bit) sobre título + tamanho + conteúdo
      let hash = 2166136261;
      for (let i = 0; i < content.length; i++) {
        hash ^= content.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return `${s.id || ''}:${s.title || ''}:${content.length}:${(hash >>> 0).toString(36)}`;
    });
  return normalized.join('|');
}

/**
 * Converte Timestamp do Firestore, Date, número ou string ISO em milissegundos.
 */
export function extractTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    const maybeTs = value as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      return maybeTs.toMillis();
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000;
    }
    if (value instanceof Date) {
      const ms = value.getTime();
      return Number.isNaN(ms) ? null : ms;
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

/**
 * Calcula se o usuário está online compensando desvios de relógio entre máquina local e servidor Firestore.
 */
export function computePresenceOnlineStatus(
  docData: Partial<ClassPresenceItem> & { clientUpdatedAtMs?: number },
  rawLastSeenAt: unknown,
  nowMs: number,
  serverClockOffsetMs = 0,
  ttlMs = 300000
): { isOnline: boolean; lastSeenAtIso: string } {
  const serverMs = extractTimestampMs(rawLastSeenAt);
  const clientMs =
    typeof docData.clientUpdatedAtMs === 'number' && Number.isFinite(docData.clientUpdatedAtMs)
      ? docData.clientUpdatedAtMs
      : null;

  let ageMs: number | null = null;
  let effectiveMs = nowMs;

  if (serverMs !== null) {
    // Ajusta timestamp do servidor para o relógio local usando offset calibrado
    const adjustedLocalMs = serverMs + serverClockOffsetMs;
    ageMs = nowMs - adjustedLocalMs;
    effectiveMs = serverMs;
  } else if (clientMs !== null) {
    ageMs = nowMs - clientMs;
    effectiveMs = clientMs;
  }

  // Se ageMs for negativo por pequena latência/skew ou menor que TTL, considera recente
  const isFresh = ageMs === null || (ageMs <= ttlMs && ageMs >= -300000);

  return {
    isOnline: Boolean(docData.isOnline && isFresh),
    lastSeenAtIso: new Date(effectiveMs).toISOString(),
  };
}

/**
 * Agrupa ocorrências anti-trapaça por sessão de avaliação, mantendo a avaliação ativa
 * (se existir) no topo mesmo sem ocorrências e separando avaliações anteriores.
 */
export function groupExamAlertsBySession(
  alerts: ExamAlertItem[],
  activeSession?: {
    id?: string | null;
    label?: string | null;
    startedAt?: string | null;
    isExamActive?: boolean;
  }
): ExamAlertSessionGroup[] {
  const groupsMap = new Map<string, ExamAlertSessionGroup>();
  const activeId = activeSession?.isExamActive && activeSession.id ? activeSession.id : null;

  if (activeId) {
    groupsMap.set(activeId, {
      sessionId: activeId,
      sessionLabel: activeSession?.label || 'Avaliação Atual',
      isCurrentActive: true,
      alerts: [],
      unackCount: 0,
      latestAt: activeSession?.startedAt || new Date().toISOString(),
    });
  }

  for (const alert of alerts) {
    const sid = alert.examSessionId || '__legacy__';
    const existing = groupsMap.get(sid);
    if (existing) {
      existing.alerts.push(alert);
      if (!alert.acknowledged) existing.unackCount += 1;
      if ((alert.createdAt || '') > existing.latestAt) {
        existing.latestAt = alert.createdAt || existing.latestAt;
      }
      if (!existing.isCurrentActive && alert.examSessionLabel) {
        existing.sessionLabel = alert.examSessionLabel;
      }
    } else {
      const label =
        sid === '__legacy__'
          ? 'Avaliações Anteriores (Sem Sessão)'
          : alert.examSessionLabel || `Avaliação (${new Date(alert.createdAt).toLocaleString('pt-BR')})`;
      groupsMap.set(sid, {
        sessionId: sid,
        sessionLabel: label,
        isCurrentActive: sid === activeId,
        alerts: [alert],
        unackCount: alert.acknowledged ? 0 : 1,
        latestAt: alert.createdAt || '',
      });
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => {
    if (a.isCurrentActive && !b.isCurrentActive) return -1;
    if (!a.isCurrentActive && b.isCurrentActive) return 1;
    return (b.latestAt || '').localeCompare(a.latestAt || '');
  });
}
