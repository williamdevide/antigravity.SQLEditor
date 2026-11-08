import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SystemEventItem, SystemEventType } from '../types';

/**
 * Registra um evento no log de auditoria do sistema no Firestore
 */
export async function logSystemEvent(
  params: Omit<SystemEventItem, 'id' | 'timestamp'>
): Promise<void> {
  const eventPayload: Omit<SystemEventItem, 'id'> = {
    ...params,
    timestamp: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, 'system_events'), eventPayload);
  } catch (err) {
    console.warn('[AuditService] Aviso: Falha ao persistir evento no Firestore:', err);
  }
}

/**
 * Recupera os eventos recentes de auditoria do sistema (Exclusivo do Administrador)
 */
export async function getAllSystemEvents(maxResults: number = 300): Promise<SystemEventItem[]> {
  try {
    const q = query(
      collection(db, 'system_events'),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    const events: SystemEventItem[] = [];
    snap.forEach((d) => {
      events.push({
        id: d.id,
        ...(d.data() as Omit<SystemEventItem, 'id'>),
      });
    });
    return events;
  } catch (err) {
    console.warn('[AuditService] Erro ao recuperar eventos de auditoria:', err);
    return [];
  }
}

/**
 * Rótulos descritivos amigáveis em Português para os tipos de eventos
 */
export function getEventTypeLabel(type: SystemEventType): string {
  switch (type) {
    case 'USER_REGISTERED':
      return 'Novo Usuário Cadastrado';
    case 'PROFESSOR_APPROVED':
      return 'Professor Autorizado';
    case 'PROFESSOR_REJECTED':
      return 'Professor Recusado';
    case 'CLASS_CREATED':
      return 'Turma Criada';
    case 'CLASS_UPDATED':
      return 'Turma Atualizada';
    case 'CLASS_DELETED':
      return 'Turma Excluída';
    case 'CLASS_STUDENT_REQUESTED':
      return 'Entrada em Turma Solicitada';
    case 'CLASS_STUDENT_APPROVED':
      return 'Aluno Admitido na Turma';
    case 'CLASS_STUDENT_REMOVED':
      return 'Aluno Removido da Turma';
    case 'ROLE_CHANGED':
      return 'Nível de Permissão Alterado';
    case 'USER_DELETED':
      return 'Usuário Excluído da Plataforma';
    default:
      return type;
  }
}

/**
 * Exporta a lista de eventos para arquivo CSV compatível com Microsoft Excel
 */
export function exportEventsToCSV(events: SystemEventItem[]): void {
  const headers = [
    'Data e Hora',
    'Tipo de Evento',
    'Responsável',
    'E-mail do Responsável',
    'Alvo',
    'E-mail do Alvo',
    'Detalhes',
  ];

  const escapeCSV = (value: string | undefined): string => {
    if (!value) return '""';
    const clean = String(value).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = events.map((ev) => [
    escapeCSV(new Date(ev.timestamp).toLocaleString('pt-BR')),
    escapeCSV(getEventTypeLabel(ev.type)),
    escapeCSV(ev.authorName),
    escapeCSV(ev.authorEmail),
    escapeCSV(ev.targetName || '—'),
    escapeCSV(ev.targetEmail || '—'),
    escapeCSV(ev.details),
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM para garantir acentos perfeitos no Excel
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `auditoria_sqleditor_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta a lista de eventos para arquivo JSON estruturado
 */
export function exportEventsToJSON(events: SystemEventItem[]): void {
  const jsonContent = JSON.stringify(events, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `auditoria_sqleditor_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

