import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { formatStudentDisplayName } from '../utils/studentNameFormatter';
import type {
  ClassPresenceItem,
  ClassMessageItem,
  ExamAlertItem,
  ExamAlertType,
  StudentLiveStateItem,
  StudentLiveTabSnapshot,
  UserRole,
} from '../types';

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
 * Atualiza ou registra o status de presença online de um usuário na turma
 */
export async function updateClassPresence(params: {
  classId: string;
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  isOnline: boolean;
  activeView?: string;
}): Promise<void> {
  if (!params.classId || !params.uid) return;
  const docId = `${params.classId}_${params.uid}`;
  const safeName = formatStudentDisplayName(params.displayName, params.email).slice(0, 100);
  try {
    await setDoc(
      doc(db, 'class_presence', docId),
      {
        id: docId,
        classId: params.classId.slice(0, 128),
        uid: params.uid.slice(0, 128),
        displayName: safeName,
        email: (params.email || '').slice(0, 150),
        role: params.role || 'aluno',
        photoURL: (params.photoURL || '').slice(0, 1000),
        isOnline: params.isOnline,
        lastSeenAt: serverTimestamp(),
        activeView: (params.activeView || 'workspace').slice(0, 100),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao atualizar presença:', err);
  }
}

/**
 * Inscreve para ouvir a lista de presença em tempo real da turma
 * Considera online quem tem isOnline === true e heartbeat recente (< 120s),
 * reavaliando periodicamente mesmo sem novas gravações no Firestore.
 */
export function subscribeToClassPresence(
  classId: string,
  callback: (items: ClassPresenceItem[]) => void
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }

  let latestRawItems: Array<{
    id: string;
    docData: ClassPresenceItem;
    rawLastSeenAt: unknown;
  }> = [];

  const emitComputed = () => {
    const nowMs = Date.now();
    const items: ClassPresenceItem[] = latestRawItems.map(({ id, docData, rawLastSeenAt }) => {
      const lastMs = extractTimestampMs(rawLastSeenAt);
      // Tolerância ampla para evitar oscilação por pequenas diferenças de relógio
      const isFresh = lastMs === null || Math.abs(nowMs - lastMs) < 120000;
      return {
        ...docData,
        id,
        lastSeenAt: lastMs !== null ? new Date(lastMs).toISOString() : new Date(nowMs).toISOString(),
        isOnline: Boolean(docData.isOnline && isFresh),
      };
    });
    callback(items);
  };

  const q = query(collection(db, 'class_presence'), where('classId', '==', classId));
  const unsub = onSnapshot(
    q,
    (snap) => {
      const nextRaw: typeof latestRawItems = [];
      snap.forEach((d) => {
        const data = d.data({ serverTimestamps: 'estimate' }) as ClassPresenceItem;
        nextRaw.push({
          id: d.id,
          docData: data,
          rawLastSeenAt: data.lastSeenAt,
        });
      });
      latestRawItems = nextRaw;
      emitComputed();
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar presença da turma:', err);
    }
  );

  const refreshTimer = window.setInterval(emitComputed, 20000);

  return () => {
    window.clearInterval(refreshTimer);
    unsub();
  };
}

/**
 * Envia uma mensagem de texto ou um script SQL compartilhado na turma
 */
export async function sendClassMessage(params: {
  classId: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  senderPhotoURL?: string;
  recipientUid: string | 'all';
  recipientName?: string;
  text: string;
  type: 'text' | 'script';
  scriptTitle?: string;
  scriptContent?: string;
}): Promise<ClassMessageItem> {
  const now = new Date().toISOString();
  const payload: Omit<ClassMessageItem, 'id'> = {
    classId: params.classId,
    senderUid: params.senderUid,
    senderName: params.senderName || 'Usuário',
    senderRole: params.senderRole || 'aluno',
    senderPhotoURL: params.senderPhotoURL || '',
    recipientUid: params.recipientUid || 'all',
    recipientName: params.recipientName || (params.recipientUid === 'all' ? 'Toda a Turma' : ''),
    text: params.text.trim(),
    type: params.type,
    createdAt: now,
    readBy: [params.senderUid],
  };

  if (params.scriptTitle) payload.scriptTitle = params.scriptTitle;
  if (params.scriptContent) payload.scriptContent = params.scriptContent;

  const docRef = await addDoc(collection(db, 'class_messages'), payload);
  return { id: docRef.id, ...payload };
}

/**
 * Escuta em tempo real todas as mensagens trafegadas na turma
 * (ordenação feita em memória por createdAt ascendente para evitar índice composto)
 */
export function subscribeToClassMessages(
  classId: string,
  callback: (messages: ClassMessageItem[]) => void,
  options?: { includeArchived?: boolean }
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }
  const includeArchived = Boolean(options?.includeArchived);
  const q = query(collection(db, 'class_messages'), where('classId', '==', classId));
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ClassMessageItem[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...(d.data() as Omit<ClassMessageItem, 'id'>) };
        if (!includeArchived && item.archived) return;
        msgs.push(item);
      });
      msgs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      callback(msgs);
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar mensagens da turma:', err);
    }
  );
}

const MESSAGE_BATCH_CHUNK_SIZE = 450;

/**
 * Executa operações em lote (writeBatch) em blocos compatíveis com o limite de 500 ops do Firestore
 */
async function executeClassMessageBatch(
  messageIds: string[],
  applyOp: (batch: WriteBatch, ref: ReturnType<typeof doc>) => void
): Promise<number> {
  const uniqueIds = Array.from(new Set(messageIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  for (let i = 0; i < uniqueIds.length; i += MESSAGE_BATCH_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + MESSAGE_BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      applyOp(batch, doc(db, 'class_messages', id));
    });
    await batch.commit();
  }
  return uniqueIds.length;
}

/**
 * Exclui permanentemente uma única mensagem do chat da turma
 */
export async function deleteClassMessage(messageId: string): Promise<void> {
  if (!messageId) return;
  await deleteDoc(doc(db, 'class_messages', messageId));
}

/**
 * Exclui permanentemente várias mensagens do chat em lote
 */
export async function deleteClassMessagesBatch(messageIds: string[]): Promise<number> {
  return executeClassMessageBatch(messageIds, (batch, ref) => {
    batch.delete(ref);
  });
}

/**
 * Arquiva ou restaura várias mensagens do chat (soft-archive para histórico do professor)
 */
export async function archiveClassMessagesBatch(
  messageIds: string[],
  archivedByUid: string,
  archived = true
): Promise<number> {
  const nowIso = new Date().toISOString();
  return executeClassMessageBatch(messageIds, (batch, ref) => {
    if (archived) {
      batch.update(ref, {
        archived: true,
        archivedAt: nowIso,
        archivedBy: archivedByUid || null,
      });
    } else {
      batch.update(ref, {
        archived: false,
        archivedAt: null,
        archivedBy: null,
      });
    }
  });
}

/**
 * Formata uma lista de mensagens da turma em documento Markdown para download/arquivo local
 */
export function formatClassMessagesToMarkdown(
  className: string,
  classCode: string,
  messages: ClassMessageItem[],
  label: string
): string {
  const exportedAt = new Date().toLocaleString('pt-BR');
  const lines: string[] = [
    `# Histórico de Chat — ${className}${classCode ? ` [${classCode}]` : ''}`,
    ``,
    `- **Escopo:** ${label}`,
    `- **Exportado em:** ${exportedAt}`,
    `- **Total de mensagens:** ${messages.length}`,
    ``,
    `---`,
    ``,
  ];

  messages.forEach((msg, index) => {
    const dateLabel = msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR') : 'Sem data';
    const recipient = msg.recipientUid === 'all' ? 'Toda a Turma' : msg.recipientName || 'Privado';
    const statusTag = msg.archived ? ' [Arquivada]' : '';
    lines.push(`### ${index + 1}. ${msg.senderName} → ${recipient} (${dateLabel})${statusTag}`);
    if (msg.text) {
      lines.push(``);
      lines.push(msg.text);
    }
    if (msg.type === 'script' && (msg.scriptTitle || msg.scriptContent)) {
      lines.push(``);
      if (msg.scriptTitle) lines.push(`**Script compartilhado:** \`${msg.scriptTitle}\``);
      if (msg.scriptContent) {
        lines.push('```sql');
        lines.push(msg.scriptContent);
        lines.push('```');
      }
    }
    lines.push(``);
  });

  return lines.join('\n');
}

/**
 * Marca um conjunto de mensagens como lidas pelo usuário informado
 */
export async function markClassMessagesAsRead(messageIds: string[], uid: string): Promise<void> {
  if (!uid || messageIds.length === 0) return;
  for (const id of messageIds) {
    try {
      await updateDoc(doc(db, 'class_messages', id), {
        readBy: arrayUnion(uid),
      });
    } catch (_) {
      // Silencioso caso a mensagem já tenha sido excluída
    }
  }
}

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

/**
 * Registra uma ocorrência / alerta anti-trapaça durante o Modo Avaliação
 */
export async function reportExamAlert(params: {
  classId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  type: ExamAlertType;
  details: string;
  examSessionId?: string | null;
  examSessionLabel?: string | null;
}): Promise<boolean> {
  if (!params.classId || !params.studentUid) return false;
  try {
    const payload: Record<string, any> = {
      classId: params.classId,
      studentUid: params.studentUid,
      studentName: params.studentName || 'Aluno',
      studentEmail: params.studentEmail || '',
      type: params.type,
      details: params.details,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    };
    if (params.examSessionId) {
      payload.examSessionId = params.examSessionId.slice(0, 128);
    }
    if (params.examSessionLabel) {
      payload.examSessionLabel = params.examSessionLabel.slice(0, 120);
    }
    await addDoc(collection(db, 'exam_alerts'), payload);
    return true;
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao reportar alerta de avaliação:', err);
    return false;
  }
}

/**
 * Professor escuta alertas anti-trapaça da turma em tempo real
 */
export function subscribeToClassExamAlerts(
  classId: string,
  callback: (alerts: ExamAlertItem[]) => void
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'exam_alerts'), where('classId', '==', classId));
  return onSnapshot(
    q,
    (snap) => {
      const list: ExamAlertItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<ExamAlertItem, 'id'>) });
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar alertas anti-trapaça:', err);
    }
  );
}

/**
 * Marca um alerta anti-trapaça como ciente pelo professor
 */
export async function acknowledgeExamAlert(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'exam_alerts', alertId), {
      acknowledged: true,
    });
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao marcar alerta como ciente:', err);
  }
}

/**
 * Marca vários alertas anti-trapaça como cientes em lote
 */
export async function acknowledgeExamAlertsBatch(alertIds: string[]): Promise<number> {
  const uniqueIds = Array.from(new Set(alertIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  for (let i = 0; i < uniqueIds.length; i += MESSAGE_BATCH_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + MESSAGE_BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      batch.update(doc(db, 'exam_alerts', id), { acknowledged: true });
    });
    await batch.commit();
  }
  return uniqueIds.length;
}

/**
 * Sincroniza o estado ao vivo do workspace do aluno para espelhamento pelo professor
 */
export async function syncStudentLiveState(params: {
  classId: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  activeTabTitle: string;
  activeTabContent: string;
  tabs: StudentLiveTabSnapshot[];
  activeDatabase: string;
  lastQueryStatus?: 'success' | 'error';
  lastQueryError?: string;
  lastQuerySummary?: string;
  violationCount?: number;
}): Promise<void> {
  if (!params.classId || !params.studentUid) return;
  const docId = `${params.classId}_${params.studentUid}`;
  try {
    // Limita snapshot das abas para respeitar tamanho máximo seguro
    const safeTabs = params.tabs.slice(0, 12).map((t) => ({
      id: t.id,
      title: (t.title || 'Script').slice(0, 120),
      content: (t.content || '').slice(0, 60000),
    }));

    const safeStudentName = formatStudentDisplayName(params.studentName, params.studentEmail).slice(0, 100);
    const payload: Record<string, any> = {
      id: docId.slice(0, 260),
      classId: params.classId.slice(0, 128),
      studentUid: params.studentUid.slice(0, 128),
      studentName: safeStudentName,
      studentEmail: (params.studentEmail || '').slice(0, 150),
      activeTabTitle: (params.activeTabTitle || 'Script').slice(0, 120),
      activeTabContent: (params.activeTabContent || '').slice(0, 60000),
      tabs: safeTabs,
      activeDatabase: (params.activeDatabase || '').slice(0, 128),
      updatedAt: new Date().toISOString(),
    };

    if (params.lastQueryStatus !== undefined) payload.lastQueryStatus = params.lastQueryStatus;
    if (params.lastQueryError !== undefined) payload.lastQueryError = params.lastQueryError.slice(0, 1000);
    if (params.lastQuerySummary !== undefined) payload.lastQuerySummary = params.lastQuerySummary.slice(0, 1000);
    if (params.violationCount !== undefined) payload.violationCount = params.violationCount;

    await setDoc(doc(db, 'student_live_state', docId), payload, { merge: true });
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao sincronizar estado ao vivo do aluno:', err);
  }
}

/**
 * Professor escuta em tempo real o espelhamento de tela/código de todos os alunos da turma
 */
export function subscribeToClassLiveStates(
  classId: string,
  callback: (states: StudentLiveStateItem[]) => void
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'student_live_state'), where('classId', '==', classId));
  return onSnapshot(
    q,
    (snap) => {
      const list: StudentLiveStateItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<StudentLiveStateItem, 'id'>) });
      });
      callback(list);
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar espelhamento ao vivo:', err);
    }
  );
}

/**
 * Aluno escuta o próprio estado ao vivo para receber congelamento/desbloqueio remoto do professor
 */
export function subscribeToOwnLiveState(
  classId: string,
  studentUid: string,
  callback: (state: StudentLiveStateItem | null) => void
): () => void {
  if (!classId || !studentUid) {
    callback(null);
    return () => {};
  }
  const docId = `${classId}_${studentUid}`;
  return onSnapshot(
    doc(db, 'student_live_state', docId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...(snap.data() as Omit<StudentLiveStateItem, 'id'>) });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar próprio estado ao vivo:', err);
    }
  );
}

/**
 * Permite ao professor congelar ou desbloquear o editor de um aluno remotamente
 */
export async function setStudentFrozenState(
  classId: string,
  studentUid: string,
  isFrozen: boolean,
  frozenMessage?: string
): Promise<void> {
  const docId = `${classId}_${studentUid}`;
  await setDoc(
    doc(db, 'student_live_state', docId),
    {
      id: docId,
      classId,
      studentUid,
      isFrozen,
      frozenMessage: isFrozen
        ? frozenMessage || 'Editor temporariamente congelado pelo professor para verificação.'
        : '',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
