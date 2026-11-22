import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getClassMembers } from '../services/classService';
import { getStudentExamSubmissions } from '../services/scriptService';
import {
  subscribeToClassPresence,
  subscribeToClassMessages,
  sendClassMessage,
  markClassMessagesAsRead,
} from '../services/classroomRealtimeService';
import type {
  ClassItem,
  ClassMemberItem,
  ClassPresenceItem,
  ClassMessageItem,
  SavedScriptItem,
  TabItem,
} from '../types';

interface MyClassViewProps {
  classItem: ClassItem | null;
  onBackToWorkspace: () => void;
  onOpenScriptInEditor: (title: string, content: string) => void;
  openTabs: TabItem[];
  savedScripts: SavedScriptItem[];
}

export const MyClassView: React.FC<MyClassViewProps> = ({
  classItem,
  onBackToWorkspace,
  onOpenScriptInEditor,
  openTabs,
  savedScripts,
}) => {
  const { user, userProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'grades'>('chat');
  const [members, setMembers] = useState<ClassMemberItem[]>([]);
  const [presenceList, setPresenceList] = useState<ClassPresenceItem[]>([]);
  const [messages, setMessages] = useState<ClassMessageItem[]>([]);
  const [selectedTargetUid, setSelectedTargetUid] = useState<string | 'all'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modal de compartilhar script
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareSourceId, setSelectedShareSourceId] = useState('');
  const [shareNote, setShareNote] = useState('');

  // Notas publicadas
  const [submissions, setSubmissions] = useState<SavedScriptItem[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const classroomMode = classItem?.classroomMode || 'normal';
  const isExamMode = classroomMode === 'exam';
  const chatEnabled = classItem?.chatEnabled !== false;
  const scriptSharingEnabled = classItem?.scriptSharingEnabled !== false;

  // Em Modo Avaliação, força canal exclusivo Aluno <-> Professor
  useEffect(() => {
    if (isExamMode && classItem?.teacherId) {
      setSelectedTargetUid(classItem.teacherId);
    }
  }, [isExamMode, classItem?.teacherId]);

  // Carrega membros da turma
  useEffect(() => {
    if (!classItem?.id) return;
    getClassMembers(classItem.id).then((all) => {
      setMembers(all.filter((m) => m.status === 'approved'));
    });
  }, [classItem?.id]);

  // Carrega notas do aluno
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoadingGrades(true);
    getStudentExamSubmissions(user.uid)
      .then((list) => setSubmissions(list))
      .finally(() => setIsLoadingGrades(false));
  }, [user?.uid, activeSubTab]);

  // Escuta presença e mensagens em tempo real
  useEffect(() => {
    if (!classItem?.id) return;
    const unsubPresence = subscribeToClassPresence(classItem.id, setPresenceList);
    const unsubMsgs = subscribeToClassMessages(classItem.id, setMessages);
    return () => {
      unsubPresence();
      unsubMsgs();
    };
  }, [classItem?.id]);

  // Mapa rápido de presença online por UID
  const onlineMap = useMemo(() => {
    const map = new Map<string, ClassPresenceItem>();
    presenceList.forEach((p) => map.set(p.uid, p));
    return map;
  }, [presenceList]);

  // Mensagens visíveis no canal selecionado
  const visibleMessages = useMemo(() => {
    if (!user || !classItem) return [];
    return messages.filter((m) => {
      // No modo avaliação, aluno só vê conversas diretas com o professor
      if (isExamMode) {
        const betweenStudentAndTeacher =
          (m.senderUid === user.uid && m.recipientUid === classItem.teacherId) ||
          (m.senderUid === classItem.teacherId && m.recipientUid === user.uid);
        return betweenStudentAndTeacher;
      }

      if (selectedTargetUid === 'all') {
        return m.recipientUid === 'all';
      }
      return (
        (m.senderUid === user.uid && m.recipientUid === selectedTargetUid) ||
        (m.senderUid === selectedTargetUid && m.recipientUid === user.uid)
      );
    });
  }, [messages, selectedTargetUid, user, classItem, isExamMode]);

  // Marca mensagens visíveis como lidas automaticamente
  useEffect(() => {
    if (!user || activeSubTab !== 'chat') return;
    const unreadIds = visibleMessages
      .filter((m) => !(m.readBy || []).includes(user.uid))
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      markClassMessagesAsRead(unreadIds, user.uid);
    }
  }, [visibleMessages, user, activeSubTab]);

  // Rola para o fim do chat ao chegar nova mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);

  const countUnreadFrom = (targetUid: string | 'all') => {
    if (!user) return 0;
    return messages.filter((m) => {
      if ((m.readBy || []).includes(user.uid)) return false;
      if (m.senderUid === user.uid) return false;
      if (targetUid === 'all') return m.recipientUid === 'all';
      return m.senderUid === targetUid && m.recipientUid === user.uid;
    }).length;
  };

  const canSendToSelectedTarget = useMemo(() => {
    if (!classItem) return false;
    if (!chatEnabled) return false;
    if (isExamMode) {
      return selectedTargetUid === classItem.teacherId;
    }
    return true;
  }, [classItem, chatEnabled, isExamMode, selectedTargetUid]);

  const canShareScriptToTarget = useMemo(() => {
    if (!classItem) return false;
    if (!scriptSharingEnabled) return false;
    if (isExamMode) {
      return selectedTargetUid === classItem.teacherId;
    }
    return true;
  }, [classItem, scriptSharingEnabled, isExamMode, selectedTargetUid]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !classItem || !messageInput.trim() || !canSendToSelectedTarget) return;

    const targetName =
      selectedTargetUid === 'all'
        ? 'Toda a Turma'
        : selectedTargetUid === classItem.teacherId
        ? classItem.teacherName
        : members.find((m) => m.studentUid === selectedTargetUid)?.studentName || 'Colega';

    try {
      setIsSending(true);
      await sendClassMessage({
        classId: classItem.id,
        senderUid: user.uid,
        senderName: userProfile?.displayName || user.displayName || 'Aluno',
        senderRole: userProfile?.role || 'aluno',
        senderPhotoURL: userProfile?.photoURL || user.photoURL || '',
        recipientUid: selectedTargetUid,
        recipientName: targetName,
        text: messageInput.trim(),
        type: 'text',
      });
      setMessageInput('');
    } catch (err: any) {
      alert('Erro ao enviar mensagem: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSending(false);
    }
  };

  const shareableSources = useMemo(() => {
    const items: Array<{ id: string; label: string; title: string; content: string; source: string }> = [];
    openTabs.forEach((t) => {
      items.push({
        id: `tab:${t.id}`,
        label: `📄 Aba Aberta: ${t.title}`,
        title: t.title,
        content: t.content || '',
        source: 'Aba do Editor',
      });
    });
    savedScripts.forEach((s) => {
      items.push({
        id: `saved:${s.id}`,
        label: `🔖 Script Salvo: ${s.title}`,
        title: s.title,
        content: s.content || '',
        source: 'Perfil',
      });
    });
    return items;
  }, [openTabs, savedScripts]);

  const handleShareScriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !classItem || !canShareScriptToTarget) return;
    const picked = shareableSources.find((x) => x.id === selectedShareSourceId) || shareableSources[0];
    if (!picked) {
      alert('Nenhum script disponível para compartilhar.');
      return;
    }

    const targetName =
      selectedTargetUid === 'all'
        ? 'Toda a Turma'
        : selectedTargetUid === classItem.teacherId
        ? classItem.teacherName
        : members.find((m) => m.studentUid === selectedTargetUid)?.studentName || 'Colega';

    try {
      setIsSending(true);
      await sendClassMessage({
        classId: classItem.id,
        senderUid: user.uid,
        senderName: userProfile?.displayName || user.displayName || 'Aluno',
        senderRole: userProfile?.role || 'aluno',
        senderPhotoURL: userProfile?.photoURL || user.photoURL || '',
        recipientUid: selectedTargetUid,
        recipientName: targetName,
        text: shareNote.trim() || `Compartilhou o script "${picked.title}"`,
        type: 'script',
        scriptTitle: picked.title,
        scriptContent: picked.content,
      });
      setIsShareModalOpen(false);
      setShareNote('');
    } catch (err: any) {
      alert('Erro ao compartilhar script: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSending(false);
    }
  };

  if (!classItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[var(--bg-primary)]">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">school</span>
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Você ainda não está vinculado a uma classe</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Acesse <strong>Meu Perfil</strong> para informar o código de 6 dígitos da turma fornecido pelo seu professor.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToWorkspace}
          className="px-4 py-2 rounded-xl bg-[#FF6B00] text-black font-bold text-xs cursor-pointer"
        >
          Voltar ao Laboratório
        </button>
      </div>
    );
  }

  const teacherPresence = onlineMap.get(classItem.teacherId);
  const classmates = members.filter((m) => m.studentUid !== user?.uid);
  const publishedGrades = submissions.filter((s) => s.gradePublished);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Cabeçalho Superior de Minha Classe */}
      <div className="px-6 py-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="w-8 h-8 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#FF6B00] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer"
            title="Voltar ao Laboratório SQL"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>

          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/50 shadow-[0_0_12px_rgba(255,215,0,0.25)] flex items-center justify-center text-[#FFD700]">
            <span className="material-symbols-outlined text-[22px]">school</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-[var(--text-primary)]">{classItem.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30">
                {classItem.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  classroomMode === 'exam'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : classroomMode === 'classroom'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                }`}
              >
                {classroomMode === 'exam'
                  ? '🔒 Modo Avaliação'
                  : classroomMode === 'classroom'
                  ? '🏫 Modo Sala de Aula'
                  : '🌐 Modo Normal'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {classItem.course} • Prof. <strong>{classItem.teacherName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'chat'
                ? 'bg-[#FF6B00] text-black shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">forum</span>
            <span>Turma &amp; Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('grades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'grades'
                ? 'bg-purple-600 text-white shadow'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grading</span>
            <span>Minhas Notas ({publishedGrades.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'grades' ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">assignment_turned_in</span>
                <span>Avaliações Entregues e Notas Publicadas</span>
              </h2>
            </div>

            {isLoadingGrades ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                Carregando avaliações...
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-10 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-2">
                <span className="material-symbols-outlined text-[36px] text-[var(--text-muted)]">quiz</span>
                <p className="text-xs text-[var(--text-secondary)] font-semibold">
                  Você ainda não entregou nenhuma avaliação nesta conta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{sub.title}</h3>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">
                          Entregue em {new Date(sub.submittedAt || sub.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      {sub.gradePublished ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-xl text-sm font-black border ${
                              (sub.grade ?? 0) >= 6
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                            }`}
                          >
                            Nota: {Number(sub.grade ?? 0).toFixed(1)} / 10.0
                          </span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
                          ⏳ Aguardando Correção / Publicação
                        </span>
                      )}
                    </div>

                    {sub.gradePublished && sub.teacherFeedback && (
                      <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)] block mb-1">Comentário do Professor:</strong>
                        {sub.teacherFeedback}
                      </div>
                    )}

                    {sub.gradePublished && sub.autoGradeDetails && sub.autoGradeDetails.items.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]/60">
                        <p className="text-[11px] font-bold text-[var(--text-secondary)]">
                          Detalhamento ({sub.autoGradeDetails.passedQueries}/{sub.autoGradeDetails.totalQueries} acertos):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sub.autoGradeDetails.items.map((item, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                                item.passed
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">
                                {item.passed ? 'check_circle' : 'cancel'}
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold block">{item.label}</span>
                                <span className="text-[10px] opacity-85 block truncate">{item.actualSummary}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CORPO PRINCIPAL: PARTICIPANTES (ESQUERDA) + CHAT E SCRIPTS (DIREITA) */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Coluna Esquerda: Participantes Online */}
          <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col overflow-y-auto shrink-0">
            <div className="p-3 border-b border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Canais de Comunicação
              </p>
            </div>

            <div className="p-2 space-y-1">
              {/* Canal Geral da Turma (Bloqueado em Modo Avaliação) */}
              <button
                type="button"
                disabled={isExamMode}
                onClick={() => setSelectedTargetUid('all')}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  selectedTargetUid === 'all' && !isExamMode
                    ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-hover)] border border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      {isExamMode ? 'lock' : 'groups'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Chat Geral da Turma</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {isExamMode ? 'Bloqueado no Modo Avaliação' : `${members.length + 1} participantes`}
                    </p>
                  </div>
                </div>
                {!isExamMode && countUnreadFrom('all') > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                    {countUnreadFrom('all')}
                  </span>
                )}
              </button>

              {/* Professor da Turma */}
              <div className="pt-2 pb-1 px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Docente Responsável
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTargetUid(classItem.teacherId)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                  selectedTargetUid === classItem.teacherId
                    ? 'bg-[#0288D1]/15 border border-[#0288D1]/40 text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-hover)] border border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0288D1] to-[#29B6F6] text-white text-xs font-black flex items-center justify-center overflow-hidden">
                      {teacherPresence?.photoURL ? (
                        <img src={teacherPresence.photoURL} alt={classItem.teacherName} className="w-full h-full object-cover" />
                      ) : (
                        (classItem.teacherName || 'P')[0].toUpperCase()
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${
                        teacherPresence?.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : 'bg-zinc-500'
                      }`}
                      title={teacherPresence?.isOnline ? 'Online agora' : 'Offline'}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate flex items-center gap-1">
                      <span className="truncate">{classItem.teacherName}</span>
                    </p>
                    <p className="text-[10px] text-[#29B6F6] font-semibold">
                      Professor {teacherPresence?.isOnline ? '• Online' : '• Offline'}
                    </p>
                  </div>
                </div>
                {countUnreadFrom(classItem.teacherId) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                    {countUnreadFrom(classItem.teacherId)}
                  </span>
                )}
              </button>

              {/* Colegas de Turma */}
              <div className="pt-3 pb-1 px-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Colegas ({classmates.length})
                </p>
                {isExamMode && (
                  <span className="text-[9px] text-purple-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    Restrito
                  </span>
                )}
              </div>

              {classmates.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                  Nenhum outro aluno matriculado ainda.
                </p>
              ) : (
                classmates.map((mate) => {
                  const pres = onlineMap.get(mate.studentUid);
                  const unread = countUnreadFrom(mate.studentUid);
                  return (
                    <button
                      key={mate.id}
                      type="button"
                      disabled={isExamMode}
                      onClick={() => setSelectedTargetUid(mate.studentUid)}
                      className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        selectedTargetUid === mate.studentUid && !isExamMode
                          ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[var(--text-primary)]'
                          : 'hover:bg-[var(--bg-hover)] border border-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-bold flex items-center justify-center overflow-hidden">
                            {pres?.photoURL ? (
                              <img src={pres.photoURL} alt={mate.studentName} className="w-full h-full object-cover" />
                            ) : (
                              (mate.studentName || 'A')[0].toUpperCase()
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${
                              pres?.isOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : 'bg-zinc-500'
                            }`}
                            title={pres?.isOnline ? 'Online agora' : 'Offline'}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate text-[var(--text-primary)]">
                            {mate.studentName}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {pres?.isOnline ? '🟢 Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                      {!isExamMode && unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Coluna Direita: Feed de Mensagens e Compartilhamento de Scripts */}
          <section className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Banner de status do canal */}
            <div className="px-4 py-2.5 bg-[var(--bg-surface)]/70 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">
                  {selectedTargetUid === 'all' ? 'groups' : 'person'}
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">
                    {selectedTargetUid === 'all'
                      ? 'Chat Geral da Turma'
                      : selectedTargetUid === classItem.teacherId
                      ? `Conversa Direta com Prof. ${classItem.teacherName}`
                      : `Conversa com ${
                          members.find((m) => m.studentUid === selectedTargetUid)?.studentName || 'Aluno'
                        }`}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isExamMode
                      ? 'Modo Avaliação: troca de mensagens permitida exclusivamente com o Professor.'
                      : 'Todas as mensagens e scripts da turma ficam acessíveis para supervisão do professor.'}
                  </p>
                </div>
              </div>

              {!chatEnabled && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
                  🔇 Chat desativado pelo professor
                </span>
              )}
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-2 py-12">
                  <span className="material-symbols-outlined text-[36px] opacity-40">chat_bubble_outline</span>
                  <p className="text-xs font-medium">Nenhuma mensagem neste canal ainda.</p>
                  <p className="text-[11px] max-w-xs">
                    {chatEnabled
                      ? 'Envie uma mensagem ou compartilhe um script SQL usando os controles abaixo.'
                      : 'O envio de mensagens está temporariamente desativado pelo professor.'}
                  </p>
                </div>
              ) : (
                visibleMessages.map((msg) => {
                  const isMine = msg.senderUid === user?.uid;
                  const isFromTeacher = msg.senderRole === 'professor' || msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 border shadow-sm space-y-2 ${
                          isMine
                            ? 'bg-[#FF6B00]/15 border-[#FF6B00]/35 text-[var(--text-primary)]'
                            : isFromTeacher
                            ? 'bg-[#0288D1]/15 border-[#0288D1]/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="font-bold flex items-center gap-1">
                            {msg.senderName}
                            {isFromTeacher && (
                              <span className="px-1.5 py-0.2 rounded bg-[#0288D1] text-white text-[9px]">
                                Professor
                              </span>
                            )}
                          </span>
                          <span className="text-[var(--text-muted)] font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {msg.type === 'script' && msg.scriptContent && (
                          <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono font-bold text-[#FFE600] truncate">
                                📄 {msg.scriptTitle || 'script.sql'}
                              </span>
                              {/* Bloqueia abertura de script de colega no Modo Avaliação */}
                              {(!isExamMode || isFromTeacher || isMine) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onOpenScriptInEditor(
                                      msg.scriptTitle || 'compartilhado.sql',
                                      msg.scriptContent || ''
                                    );
                                    onBackToWorkspace();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-black font-bold text-[10px] cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                                  <span>Abrir no Editor</span>
                                </button>
                              )}
                            </div>
                            <pre className="text-[10px] font-mono text-[var(--text-secondary)] max-h-28 overflow-y-auto whitespace-pre-wrap">
                              {msg.scriptContent.slice(0, 600)}
                              {msg.scriptContent.length > 600 ? '\n...' : ''}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Barra de Digitação & Compartilhar Script */}
            <form
              onSubmit={handleSendText}
              className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                disabled={!canShareScriptToTarget || shareableSources.length === 0}
                onClick={() => {
                  setSelectedShareSourceId(shareableSources[0]?.id || '');
                  setIsShareModalOpen(true);
                }}
                title={
                  !scriptSharingEnabled
                    ? 'Compartilhamento de scripts desativado pelo professor'
                    : isExamMode && selectedTargetUid !== classItem.teacherId
                    ? 'Bloqueado entre alunos durante avaliação'
                    : 'Compartilhar um script SQL aberto ou salvo'
                }
                className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[#00E5FF] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">code</span>
                <span className="hidden sm:inline">Compartilhar Script</span>
              </button>

              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={!canSendToSelectedTarget || isSending}
                placeholder={
                  !chatEnabled
                    ? 'Chat desativado pelo professor...'
                    : 'Escreva uma mensagem...'
                }
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!canSendToSelectedTarget || !messageInput.trim() || isSending}
                className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Modal de Compartilhar Script */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleShareScriptSubmit}
            className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00E5FF]">share</span>
                <span>Compartilhar Script SQL</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Escolha a aba ou script salvo:
                </label>
                <select
                  value={selectedShareSourceId}
                  onChange={(e) => setSelectedShareSourceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                >
                  {shareableSources.map((src) => (
                    <option key={src.id} value={src.id}>
                      {src.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observação (opcional):
                </label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="Ex: Dúvida na consulta do exercício 3..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-1.5 rounded-xl bg-[#FF6B00] text-black font-bold text-xs cursor-pointer"
              >
                {isSending ? 'Enviando...' : 'Enviar Script'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
