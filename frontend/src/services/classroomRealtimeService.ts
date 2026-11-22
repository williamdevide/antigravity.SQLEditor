import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
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
  try {
    await setDoc(
      doc(db, 'class_presence', docId),
      {
        id: docId,
        classId: params.classId,
        uid: params.uid,
        displayName: params.displayName || 'Usuário',
        email: params.email || '',
        role: params.role || 'aluno',
        photoURL: params.photoURL || '',
        isOnline: params.isOnline,
        lastSeenAt: new Date().toISOString(),
        activeView: params.activeView || 'workspace',
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao atualizar presença:', err);
  }
}

/**
 * Inscreve para ouvir a lista de presença em tempo real da turma
 * Considera online apenas quem tem isOnline === true e heartbeat recente (< 90s)
 */
export function subscribeToClassPresence(
  classId: string,
  callback: (items: ClassPresenceItem[]) => void
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'class_presence'), where('classId', '==', classId));
  return onSnapshot(
    q,
    (snap) => {
      const nowMs = Date.now();
      const items: ClassPresenceItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as ClassPresenceItem;
        const lastMs = data.lastSeenAt ? new Date(data.lastSeenAt).getTime() : 0;
        const isFresh = nowMs - lastMs < 90000;
        items.push({
          ...data,
          id: d.id,
          isOnline: Boolean(data.isOnline && isFresh),
        });
      });
      callback(items);
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar presença da turma:', err);
    }
  );
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
  callback: (messages: ClassMessageItem[]) => void
): () => void {
  if (!classId) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'class_messages'), where('classId', '==', classId));
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ClassMessageItem[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Omit<ClassMessageItem, 'id'>) });
      });
      msgs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      callback(msgs);
    },
    (err) => {
      console.warn('[ClassroomRealtime] Erro ao escutar mensagens da turma:', err);
    }
  );
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
}): Promise<void> {
  if (!params.classId || !params.studentUid) return;
  try {
    await addDoc(collection(db, 'exam_alerts'), {
      classId: params.classId,
      studentUid: params.studentUid,
      studentName: params.studentName || 'Aluno',
      studentEmail: params.studentEmail || '',
      type: params.type,
      details: params.details,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    });
  } catch (err) {
    console.warn('[ClassroomRealtime] Erro ao reportar alerta de avaliação:', err);
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

    const payload: Record<string, any> = {
      id: docId,
      classId: params.classId,
      studentUid: params.studentUid,
      studentName: params.studentName || 'Aluno',
      studentEmail: params.studentEmail || '',
      activeTabTitle: (params.activeTabTitle || 'Script').slice(0, 120),
      activeTabContent: (params.activeTabContent || '').slice(0, 60000),
      tabs: safeTabs,
      activeDatabase: params.activeDatabase || '',
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
