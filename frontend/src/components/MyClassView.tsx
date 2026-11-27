import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getClassMembers,
  getClassesByTeacher,
  getAllClasses,
} from '../services/classService';
import { getStudentExamSubmissions } from '../services/scriptService';
import {
  subscribeToClassPresence,
  subscribeToClassMessages,
  updateClassPresence,
  sendClassMessage,
  markClassMessagesAsRead,
} from '../services/classroomRealtimeService';
import { formatStudentDisplayName, compareNamesPtBr } from '../utils/studentNameFormatter';
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
  teacherClasses?: ClassItem[];
  onBackToWorkspace: () => void;
  onOpenScriptInEditor: (title: string, content: string) => void;
  openTabs: TabItem[];
  savedScripts: SavedScriptItem[];
}

interface ScopedMessageItem extends ClassMessageItem {
  classNameLabel?: string;
}

interface TargetChannel {
  uid: string | 'all';
  classId?: string;
}

export const MyClassView: React.FC<MyClassViewProps> = ({
  classItem,
  teacherClasses = [],
  onBackToWorkspace,
  onOpenScriptInEditor,
  openTabs,
  savedScripts,
}) => {
  const { user, userProfile, isAdmin, isProfessor } = useAuth();
  const isTeacherOrAdmin = Boolean(
    isAdmin || isProfessor || userProfile?.role === 'professor' || userProfile?.role === 'admin'
  );

  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'grades'>('chat');
  const [fetchedTeacherClasses, setFetchedTeacherClasses] = useState<ClassItem[]>(teacherClasses);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [composeClassId, setComposeClassId] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<TargetChannel>({ uid: 'all' });

  // Mantém a lista de turmas sempre atualizada ao abrir Minha Classe / Chat como professor/admin
  useEffect(() => {
    setFetchedTeacherClasses(teacherClasses);
    if (!isTeacherOrAdmin || !user?.uid) return;
    let cancelled = false;
    const loader = isAdmin ? getAllClasses() : getClassesByTeacher(user.uid);
    loader
      .then((fresh) => {
        if (!cancelled && fresh.length >= 0) {
          setFetchedTeacherClasses(fresh);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isTeacherOrAdmin, isAdmin, user?.uid, teacherClasses]);

  // Dados agregados por classId (suporta 1 turma para aluno ou N turmas para professor/admin)
  const [membersByClass, setMembersByClass] = useState<Record<string, ClassMemberItem[]>>({});
  const [presenceByClass, setPresenceByClass] = useState<Record<string, ClassPresenceItem[]>>({});
  const [messagesByClass, setMessagesByClass] = useState<Record<string, ClassMessageItem[]>>({});

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modal de compartilhar script
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareSourceId, setSelectedShareSourceId] = useState('');
  const [shareNote, setShareNote] = useState('');

  // Notas publicadas (visão do aluno)
  const [submissions, setSubmissions] = useState<SavedScriptItem[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const sortedTeacherClasses = useMemo(
    () => [...fetchedTeacherClasses].sort((a, b) => compareNamesPtBr(a.name, b.name)),
    [fetchedTeacherClasses]
  );

  const effectiveClasses = useMemo(() => {
    if (isTeacherOrAdmin) return sortedTeacherClasses;
    return classItem ? [classItem] : [];
  }, [isTeacherOrAdmin, sortedTeacherClasses, classItem]);

  const classMap = useMemo(() => {
    const map = new Map<string, ClassItem>();
    effectiveClasses.forEach((c) => map.set(c.id, c));
    return map;
  }, [effectiveClasses]);

  const effectiveClassIdsKey = useMemo(
    () =>
      effectiveClasses
        .map((c) => c.id)
        .filter(Boolean)
        .sort()
        .join(','),
    [effectiveClasses]
  );

  // Mantém composeClassId válido para envio direcionado no modo Todas as Turmas
  useEffect(() => {
    if (!isTeacherOrAdmin) {
      setSelectedClassFilter(classItem?.id || 'all');
      setComposeClassId(classItem?.id || '');
      return;
    }
    if (
      selectedClassFilter !== 'all' &&
      !sortedTeacherClasses.some((c) => c.id === selectedClassFilter)
    ) {
      setSelectedClassFilter('all');
    }
    if (!composeClassId || !sortedTeacherClasses.some((c) => c.id === composeClassId)) {
      setComposeClassId(sortedTeacherClasses[0]?.id || '');
    }
  }, [isTeacherOrAdmin, classItem?.id, sortedTeacherClasses, selectedClassFilter, composeClassId]);

  const visibleScopeClasses = useMemo(() => {
    if (!isTeacherOrAdmin) return effectiveClasses;
    if (selectedClassFilter === 'all') return effectiveClasses;
    const found = effectiveClasses.find((c) => c.id === selectedClassFilter);
    return found ? [found] : effectiveClasses;
  }, [isTeacherOrAdmin, effectiveClasses, selectedClassFilter]);

  const activeSingleClass = useMemo(() => {
    if (!isTeacherOrAdmin) return classItem;
    if (selectedClassFilter !== 'all') {
      return effectiveClasses.find((c) => c.id === selectedClassFilter) || null;
    }
    return null;
  }, [isTeacherOrAdmin, classItem, selectedClassFilter, effectiveClasses]);

  // Turma usada como destino ao enviar mensagem ou script
  const targetSendClass = useMemo(() => {
    if (!isTeacherOrAdmin) return classItem;
    if (selectedClassFilter !== 'all') {
      return effectiveClasses.find((c) => c.id === selectedClassFilter) || effectiveClasses[0] || null;
    }
    if (selectedTarget.uid !== 'all' && selectedTarget.classId) {
      return effectiveClasses.find((c) => c.id === selectedTarget.classId) || effectiveClasses[0] || null;
    }
    return effectiveClasses.find((c) => c.id === composeClassId) || effectiveClasses[0] || null;
  }, [isTeacherOrAdmin, classItem, selectedClassFilter, selectedTarget, composeClassId, effectiveClasses]);

  const classroomMode = activeSingleClass?.classroomMode || 'normal';
  const isExamMode = !isTeacherOrAdmin && classroomMode === 'exam';
  const chatEnabled = isTeacherOrAdmin || activeSingleClass?.chatEnabled !== false;
  const scriptSharingEnabled =
    isTeacherOrAdmin || activeSingleClass?.scriptSharingEnabled !== false;

  // Em Modo Avaliação (apenas para aluno), força canal exclusivo Aluno <-> Professor
  useEffect(() => {
    if (isExamMode && classItem?.teacherId) {
      setSelectedTarget({ uid: classItem.teacherId, classId: classItem.id });
    }
  }, [isExamMode, classItem?.teacherId, classItem?.id]);

  // Carrega membros aprovados de todas as turmas no escopo
  useEffect(() => {
    const classIds = effectiveClassIdsKey ? effectiveClassIdsKey.split(',').filter(Boolean) : [];
    if (classIds.length === 0) {
      setMembersByClass({});
      return;
    }

    let cancelled = false;
    Promise.all(
      classIds.map(async (cId) => {
        const all = await getClassMembers(cId);
        return { cId, approved: all.filter((m) => m.status === 'approved') };
      })
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, ClassMemberItem[]> = {};
      results.forEach(({ cId, approved }) => {
        next[cId] = approved;
      });
      setMembersByClass(next);
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveClassIdsKey]);

  // Carrega notas do aluno
  useEffect(() => {
    if (isTeacherOrAdmin || !user?.uid) return;
    setIsLoadingGrades(true);
    getStudentExamSubmissions(user.uid)
      .then((list) => setSubmissions(list))
      .finally(() => setIsLoadingGrades(false));
  }, [isTeacherOrAdmin, user?.uid, activeSubTab]);

  // Escuta presença e mensagens em tempo real para todas as turmas no escopo
  useEffect(() => {
    const classIds = effectiveClassIdsKey ? effectiveClassIdsKey.split(',').filter(Boolean) : [];
    if (classIds.length === 0) {
      setPresenceByClass({});
      setMessagesByClass({});
      return;
    }

    const unsubs: Array<() => void> = [];
    classIds.forEach((cId) => {
      unsubs.push(
        subscribeToClassPresence(
          cId,
          (items) => {
            setPresenceByClass((prev) => ({ ...prev, [cId]: items }));
          },
          user?.uid
        )
      );
      unsubs.push(
        subscribeToClassMessages(cId, (msgs) => {
          setMessagesByClass((prev) => ({ ...prev, [cId]: msgs }));
        })
      );
    });

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [effectiveClassIdsKey, user?.uid]);

  // Reforça heartbeat imediato ao abrir a tela de Chat / trocar o filtro de turma
  useEffect(() => {
    if (!user?.uid || !userProfile) return;
    const classesToPing = visibleScopeClasses.filter((cls) =>
      isTeacherOrAdmin ? cls.teacherId === user.uid || cls.id === userProfile.classId : true
    );
    classesToPing.forEach((cls) => {
      updateClassPresence({
        classId: cls.id,
        uid: user.uid,
        displayName: userProfile.displayName || user.displayName || 'Usuário',
        email: userProfile.email || user.email || '',
        role: userProfile.role || (isTeacherOrAdmin ? 'professor' : 'aluno'),
        photoURL: userProfile.photoURL || user.photoURL || '',
        isOnline: true,
        activeView: 'my-class',
      });
    });
  }, [user?.uid, userProfile, visibleScopeClasses, isTeacherOrAdmin]);

  // Verifica se uma mensagem conta como não lida para o usuário atual (espelha o sininho da header)
  const isMessageRelevantUnread = (m: ClassMessageItem, cls: ClassItem): boolean => {
    if (!user) return false;
    if (m.senderUid === user.uid) return false;
    if ((m.readBy || []).includes(user.uid)) return false;

    if (!isTeacherOrAdmin && isExamMode) {
      return m.senderUid === cls.teacherId && m.recipientUid === user.uid;
    }
    if (isTeacherOrAdmin) {
      return (
        m.recipientUid === 'all' ||
        m.recipientUid === user.uid ||
        (isAdmin && Boolean(cls.teacherId) && m.recipientUid === cls.teacherId)
      );
    }
    return m.recipientUid === 'all' || m.recipientUid === user.uid;
  };

  // Alunos listados na barra esquerda (alunos com mensagens não lidas sobem para o topo; depois ordem alfabética)
  const listedStudents = useMemo(() => {
    const list: Array<ClassMemberItem & { displayName: string; unreadCount: number; isExternalSender?: boolean }> = [];
    const seenMemberKeys = new Set<string>();

    const countDirectUnreadFrom = (senderUid: string, cls: ClassItem): number => {
      if (!user) return 0;
      const msgs = messagesByClass[cls.id] || [];
      return msgs.filter(
        (m) =>
          isMessageRelevantUnread(m, cls) &&
          m.senderUid === senderUid &&
          m.recipientUid !== 'all'
      ).length;
    };

    visibleScopeClasses.forEach((cls) => {
      const clsMembers = membersByClass[cls.id] || [];
      clsMembers.forEach((m) => {
        if (!isTeacherOrAdmin && m.studentUid === user?.uid) return;
        const memberKey = `${cls.id}:${m.studentUid}`;
        seenMemberKeys.add(memberKey);
        list.push({
          ...m,
          className: m.className || cls.name,
          displayName: formatStudentDisplayName(m.studentName, m.studentEmail),
          unreadCount: countDirectUnreadFrom(m.studentUid, cls),
        });
      });

      // Garante card visível caso exista DM não lida (ou conversa selecionada) de remetente fora da lista atual de membros
      if (isTeacherOrAdmin && user) {
        const msgs = messagesByClass[cls.id] || [];
        msgs.forEach((m) => {
          if (m.senderUid === user.uid || m.recipientUid === 'all') return;
          const isDirectToTeacher =
            m.recipientUid === user.uid ||
            (isAdmin && Boolean(cls.teacherId) && m.recipientUid === cls.teacherId);
          if (!isDirectToTeacher) return;

          const isSelectedFallback =
            selectedTarget.uid === m.senderUid &&
            (!selectedTarget.classId || selectedTarget.classId === cls.id);
          if (!isMessageRelevantUnread(m, cls) && !isSelectedFallback) return;

          const memberKey = `${cls.id}:${m.senderUid}`;
          if (seenMemberKeys.has(memberKey)) return;
          seenMemberKeys.add(memberKey);
          list.push({
            id: `fallback-${cls.id}-${m.senderUid}`,
            classId: cls.id,
            classCode: cls.code,
            className: cls.name,
            studentUid: m.senderUid,
            studentName: m.senderName || 'Remetente',
            studentEmail: '',
            status: 'approved',
            requestedAt: m.createdAt || '',
            displayName: formatStudentDisplayName(m.senderName || 'Remetente', ''),
            unreadCount: countDirectUnreadFrom(m.senderUid, cls),
            isExternalSender: true,
          });
        });
      }
    });

    return list.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return compareNamesPtBr(a.displayName, b.displayName);
    });
  }, [
    visibleScopeClasses,
    membersByClass,
    messagesByClass,
    isTeacherOrAdmin,
    isExamMode,
    isAdmin,
    user?.uid,
    selectedTarget.uid,
    selectedTarget.classId,
  ]);

  const getPresenceForUser = (cId: string, uid: string): ClassPresenceItem | undefined => {
    const list = presenceByClass[cId] || [];
    return list.find((p) => p.uid === uid);
  };

  // Mensagens visíveis no canal selecionado
  const visibleMessages = useMemo<ScopedMessageItem[]>(() => {
    if (!user) return [];
    const collected: ScopedMessageItem[] = [];

    visibleScopeClasses.forEach((cls) => {
      const msgs = messagesByClass[cls.id] || [];
      msgs.forEach((m) => {
        if (!isTeacherOrAdmin && isExamMode && classItem) {
          const betweenStudentAndTeacher =
            (m.senderUid === user.uid && m.recipientUid === classItem.teacherId) ||
            (m.senderUid === classItem.teacherId && m.recipientUid === user.uid);
          if (betweenStudentAndTeacher) {
            collected.push({ ...m, classNameLabel: cls.name });
          }
          return;
        }

        if (selectedTarget.uid === 'all') {
          if (m.recipientUid === 'all') {
            collected.push({ ...m, classNameLabel: cls.name });
          }
          return;
        }

        if (selectedTarget.classId && m.classId !== selectedTarget.classId) {
          return;
        }

        const isDirectPair =
          (m.senderUid === user.uid && m.recipientUid === selectedTarget.uid) ||
          (m.senderUid === selectedTarget.uid &&
            (m.recipientUid === user.uid || (isAdmin && m.recipientUid === cls.teacherId))) ||
          (isAdmin && m.senderUid === cls.teacherId && m.recipientUid === selectedTarget.uid);
        if (isDirectPair) {
          collected.push({ ...m, classNameLabel: cls.name });
        }
      });
    });

    return collected.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }, [
    user,
    visibleScopeClasses,
    messagesByClass,
    isTeacherOrAdmin,
    isExamMode,
    classItem,
    selectedTarget,
    isAdmin,
  ]);

  // Marca mensagens visíveis como lidas automaticamente
  useEffect(() => {
    if (!user || activeSubTab !== 'chat') return;
    const unreadIds = visibleMessages
      .filter((m) => m.senderUid !== user.uid && !(m.readBy || []).includes(user.uid))
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      markClassMessagesAsRead(unreadIds, user.uid);
    }
  }, [visibleMessages, user, activeSubTab]);

  // Rola para o fim do chat ao chegar nova mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);

  const countUnreadGeneral = () => {
    if (!user) return 0;
    let total = 0;
    visibleScopeClasses.forEach((cls) => {
      const msgs = messagesByClass[cls.id] || [];
      total += msgs.filter(
        (m) => isMessageRelevantUnread(m, cls) && m.recipientUid === 'all'
      ).length;
    });
    return total;
  };

  const countUnreadFrom = (targetUid: string, cId?: string) => {
    if (!user) return 0;
    const classesToCheck = cId
      ? visibleScopeClasses.filter((c) => c.id === cId)
      : visibleScopeClasses;
    let total = 0;
    classesToCheck.forEach((cls) => {
      const msgs = messagesByClass[cls.id] || [];
      total += msgs.filter(
        (m) =>
          isMessageRelevantUnread(m, cls) &&
          m.senderUid === targetUid &&
          m.recipientUid !== 'all'
      ).length;
    });
    return total;
  };

  const countUnreadForClass = (cls: ClassItem): number => {
    const msgs = messagesByClass[cls.id] || [];
    return msgs.filter((m) => isMessageRelevantUnread(m, cls)).length;
  };

  const totalUnreadAllClasses = useMemo(() => {
    if (!user) return 0;
    return effectiveClasses.reduce((sum, cls) => sum + countUnreadForClass(cls), 0);
  }, [effectiveClasses, messagesByClass, user, isTeacherOrAdmin, isExamMode, isAdmin]);

  const unreadIdsInScope = useMemo(() => {
    if (!user) return [] as string[];
    const ids: string[] = [];
    visibleScopeClasses.forEach((cls) => {
      const msgs = messagesByClass[cls.id] || [];
      msgs.forEach((m) => {
        if (isMessageRelevantUnread(m, cls)) {
          ids.push(m.id);
        }
      });
    });
    return ids;
  }, [visibleScopeClasses, messagesByClass, user, isTeacherOrAdmin, isExamMode, isAdmin]);

  const renderUnreadBellBadge = (count: number) => {
    if (count <= 0) return null;
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.55)]"
        title={`${count} ${count === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`}
      >
        <span className="material-symbols-outlined text-[12px] animate-pulse">
          notifications_active
        </span>
        <span>{count}</span>
      </span>
    );
  };

  const canSendToSelectedTarget = useMemo(() => {
    if (!targetSendClass) return false;
    if (isTeacherOrAdmin) return true;
    if (!chatEnabled) return false;
    if (isExamMode) {
      return selectedTarget.uid === targetSendClass.teacherId;
    }
    return true;
  }, [targetSendClass, isTeacherOrAdmin, chatEnabled, isExamMode, selectedTarget.uid]);

  const canShareScriptToTarget = useMemo(() => {
    if (!targetSendClass) return false;
    if (isTeacherOrAdmin) return true;
    if (!scriptSharingEnabled) return false;
    if (isExamMode) {
      return selectedTarget.uid === targetSendClass.teacherId;
    }
    return true;
  }, [targetSendClass, isTeacherOrAdmin, scriptSharingEnabled, isExamMode, selectedTarget.uid]);

  const resolveRecipientName = (cls: ClassItem): string => {
    if (selectedTarget.uid === 'all') return 'Toda a Turma';
    if (selectedTarget.uid === cls.teacherId) return cls.teacherName;
    const clsMembers = membersByClass[cls.id] || [];
    const found = clsMembers.find((m) => m.studentUid === selectedTarget.uid);
    return found
      ? formatStudentDisplayName(found.studentName, found.studentEmail)
      : 'Aluno';
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetSendClass || !messageInput.trim() || !canSendToSelectedTarget) return;

    const targetName = resolveRecipientName(targetSendClass);

    try {
      setIsSending(true);
      await sendClassMessage({
        classId: targetSendClass.id,
        senderUid: user.uid,
        senderName:
          userProfile?.displayName ||
          user.displayName ||
          (isTeacherOrAdmin ? 'Professor' : 'Aluno'),
        senderRole: userProfile?.role || (isAdmin ? 'admin' : isTeacherOrAdmin ? 'professor' : 'aluno'),
        senderPhotoURL: userProfile?.photoURL || user.photoURL || '',
        recipientUid: selectedTarget.uid,
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
    if (!user || !targetSendClass || !canShareScriptToTarget) return;
    const picked = shareableSources.find((x) => x.id === selectedShareSourceId) || shareableSources[0];
    if (!picked) {
      alert('Nenhum script disponível para compartilhar.');
      return;
    }

    const targetName = resolveRecipientName(targetSendClass);

    try {
      setIsSending(true);
      await sendClassMessage({
        classId: targetSendClass.id,
        senderUid: user.uid,
        senderName:
          userProfile?.displayName ||
          user.displayName ||
          (isTeacherOrAdmin ? 'Professor' : 'Aluno'),
        senderRole: userProfile?.role || (isAdmin ? 'admin' : isTeacherOrAdmin ? 'professor' : 'aluno'),
        senderPhotoURL: userProfile?.photoURL || user.photoURL || '',
        recipientUid: selectedTarget.uid,
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

  if (!isTeacherOrAdmin && !classItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[var(--bg-primary)]">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">school</span>
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Você ainda não está vinculado a uma classe
          </h2>
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

  if (isTeacherOrAdmin && sortedTeacherClasses.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[var(--bg-primary)]">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-[#29B6F6]">forum</span>
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Minha Classe / Chat • Nenhuma turma encontrada
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Crie sua primeira turma em <strong>Minhas Turmas</strong> para conversar e compartilhar scripts com seus alunos.
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

  const teacherPresence =
    !isTeacherOrAdmin && classItem ? getPresenceForUser(classItem.id, classItem.teacherId) : undefined;
  const publishedGrades = submissions.filter((s) => s.gradePublished);
  const selectedStudentName =
    selectedTarget.uid !== 'all'
      ? listedStudents.find(
          (m) =>
            m.studentUid === selectedTarget.uid &&
            (!selectedTarget.classId || m.classId === selectedTarget.classId)
        )?.displayName
      : undefined;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Cabeçalho Superior de Minha Classe / Chat */}
      <div className="px-6 py-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="w-8 h-8 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#FF6B00] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer shrink-0"
            title="Voltar ao Laboratório SQL"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>

          <div className="w-10 h-10 rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/50 shadow-[0_0_12px_rgba(255,215,0,0.25)] flex items-center justify-center text-[#FFD700] shrink-0">
            <span className="material-symbols-outlined text-[22px]">school</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-[var(--text-primary)] truncate">
                {isTeacherOrAdmin
                  ? activeSingleClass
                    ? `${activeSingleClass.name} • Chat`
                    : 'Minha Classe / Chat • Todas as Turmas'
                  : classItem?.name}
              </h1>

              {activeSingleClass && (
                <>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30">
                    {activeSingleClass.code}
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
                </>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {isTeacherOrAdmin
                ? `${sortedTeacherClasses.length} ${
                    sortedTeacherClasses.length === 1 ? 'turma ativa' : 'turmas ativas'
                  } • ${listedStudents.length} ${
                    listedStudents.length === 1 ? 'aluno no filtro' : 'alunos no filtro'
                  }`
                : `Minha Classe / Chat • ${classItem?.course} • Prof. ${classItem?.teacherName}`}
            </p>
          </div>
        </div>

        {/* Controles à direita: Seletor de Turmas (Professor) ou Sub-abas (Aluno) */}
        {isTeacherOrAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] hidden sm:inline">
              Visualizar:
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                const nextFilter = e.target.value;
                setSelectedClassFilter(nextFilter);
                setSelectedTarget({ uid: 'all' });
                if (nextFilter !== 'all') {
                  setComposeClassId(nextFilter);
                }
              }}
              className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] cursor-pointer"
            >
              <option value="all">
                🌐 Todas as Turmas ({sortedTeacherClasses.length})
                {totalUnreadAllClasses > 0 ? ` • 🔔 ${totalUnreadAllClasses}` : ''}
              </option>
              {sortedTeacherClasses.map((cls) => {
                const clsUnread = countUnreadForClass(cls);
                return (
                  <option key={cls.id} value={cls.id}>
                    🏫 {cls.name} [{cls.code}]{clsUnread > 0 ? ` • 🔔 ${clsUnread}` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
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
        )}
      </div>

      {!isTeacherOrAdmin && activeSubTab === 'grades' ? (
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
                              (sub.grade ?? 0) >= 60
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                            }`}
                          >
                            Nota: {Number(sub.grade ?? 0).toFixed(1)} / 100
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
              {/* Canal Geral */}
              {(() => {
                const generalUnread = !isExamMode ? countUnreadGeneral() : 0;
                const isGeneralSelected = selectedTarget.uid === 'all' && !isExamMode;
                return (
                  <button
                    type="button"
                    disabled={isExamMode}
                    onClick={() => setSelectedTarget({ uid: 'all' })}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      isGeneralSelected
                        ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[var(--text-primary)]'
                        : generalUnread > 0
                        ? 'bg-emerald-500/10 border border-emerald-500/45 text-[var(--text-primary)] hover:bg-emerald-500/15'
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
                        <p className="text-xs font-bold truncate">
                          {isTeacherOrAdmin && selectedClassFilter === 'all'
                            ? 'Chat Geral (Todas)'
                            : 'Chat Geral da Turma'}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {isExamMode
                            ? 'Bloqueado no Modo Avaliação'
                            : `${listedStudents.length + (isTeacherOrAdmin ? 0 : 1)} participantes`}
                        </p>
                      </div>
                    </div>
                    {!isExamMode && renderUnreadBellBadge(generalUnread)}
                  </button>
                );
              })()}

              {/* Professor da Turma (exibido para o aluno) */}
              {!isTeacherOrAdmin && classItem && (() => {
                const teacherUnread = countUnreadFrom(classItem.teacherId, classItem.id);
                const isTeacherSelected = selectedTarget.uid === classItem.teacherId;
                return (
                  <>
                    <div className="pt-2 pb-1 px-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Docente Responsável
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTarget({ uid: classItem.teacherId, classId: classItem.id })}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                        isTeacherSelected
                          ? 'bg-[#0288D1]/15 border border-[#0288D1]/40 text-[var(--text-primary)]'
                          : teacherUnread > 0
                          ? 'bg-emerald-500/10 border border-emerald-500/45 text-[var(--text-primary)] hover:bg-emerald-500/15'
                          : 'hover:bg-[var(--bg-hover)] border border-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0288D1] to-[#29B6F6] text-white text-xs font-black flex items-center justify-center overflow-hidden">
                            {teacherPresence?.photoURL ? (
                              <img
                                src={teacherPresence.photoURL}
                                alt={classItem.teacherName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (classItem.teacherName || 'P')[0].toUpperCase()
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${
                              teacherPresence?.isOnline
                                ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]'
                                : 'bg-zinc-500'
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
                      {renderUnreadBellBadge(teacherUnread)}
                    </button>
                  </>
                );
              })()}

              {/* Colegas de Turma / Alunos */}
              <div className="pt-3 pb-1 px-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {isTeacherOrAdmin ? `Alunos (${listedStudents.length})` : `Colegas (${listedStudents.length})`}
                </p>
                {isExamMode && (
                  <span className="text-[9px] text-purple-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[11px]">lock</span>
                    Restrito
                  </span>
                )}
              </div>

              {listedStudents.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                  {isTeacherOrAdmin
                    ? 'Nenhum aluno matriculado neste filtro ainda.'
                    : 'Nenhum outro aluno matriculado ainda.'}
                </p>
              ) : (
                listedStudents.map((mate) => {
                  const pres = getPresenceForUser(mate.classId, mate.studentUid);
                  const unread = mate.unreadCount;
                  const isSelected =
                    selectedTarget.uid === mate.studentUid &&
                    (!selectedTarget.classId || selectedTarget.classId === mate.classId);
                  const mateClassName = classMap.get(mate.classId)?.name || mate.className;

                  return (
                    <button
                      key={mate.id}
                      type="button"
                      disabled={isExamMode}
                      onClick={() => {
                        setSelectedTarget({ uid: mate.studentUid, classId: mate.classId });
                        setComposeClassId(mate.classId);
                      }}
                      className={`w-full p-2 rounded-xl flex items-center justify-between gap-2 text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        isSelected && !isExamMode
                          ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[var(--text-primary)]'
                          : !isExamMode && unread > 0
                          ? 'bg-emerald-500/10 border border-emerald-500/45 text-[var(--text-primary)] hover:bg-emerald-500/15'
                          : 'hover:bg-[var(--bg-hover)] border border-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-bold flex items-center justify-center overflow-hidden">
                            {pres?.photoURL ? (
                              <img
                                src={pres.photoURL}
                                alt={mate.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (mate.displayName || 'A')[0].toUpperCase()
                            )}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${
                              pres?.isOnline
                                ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]'
                                : 'bg-zinc-500'
                            }`}
                            title={pres?.isOnline ? 'Online agora' : 'Offline'}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate text-[var(--text-primary)]">
                            {mate.displayName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                            <span>
                              {mate.isExternalSender
                                ? 'Remetente anterior'
                                : pres?.isOnline
                                ? '🟢 Online'
                                : 'Offline'}
                            </span>
                            {isTeacherOrAdmin && selectedClassFilter === 'all' && mateClassName && (
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[9px] font-semibold truncate max-w-[100px]">
                                {mateClassName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isExamMode && renderUnreadBellBadge(unread)}
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
                  {selectedTarget.uid === 'all' ? 'groups' : 'person'}
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">
                    {selectedTarget.uid === 'all'
                      ? isTeacherOrAdmin && selectedClassFilter === 'all'
                        ? 'Chat Geral • Todas as Turmas'
                        : `Chat Geral • ${activeSingleClass?.name || 'Turma'}`
                      : !isTeacherOrAdmin && classItem && selectedTarget.uid === classItem.teacherId
                      ? `Conversa Direta com Prof. ${classItem.teacherName}`
                      : `Conversa com ${selectedStudentName || 'Aluno'}${
                          isTeacherOrAdmin && targetSendClass ? ` • ${targetSendClass.name}` : ''
                        }`}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isTeacherOrAdmin
                      ? selectedClassFilter === 'all' && selectedTarget.uid === 'all'
                        ? 'Visualizando o feed unificado de todas as turmas; escolha abaixo para qual turma enviar.'
                        : 'Todas as mensagens e scripts enviados ficam disponíveis imediatamente para a turma.'
                      : isExamMode
                      ? 'Modo Avaliação: troca de mensagens permitida exclusivamente com o Professor.'
                      : 'Todas as mensagens e scripts da turma ficam acessíveis para supervisão do professor.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isTeacherOrAdmin && user && unreadIdsInScope.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markClassMessagesAsRead(unreadIdsInScope, user.uid)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Marcar todas as mensagens visíveis deste filtro como lidas"
                  >
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    <span>Marcar todas como lidas ({unreadIdsInScope.length})</span>
                  </button>
                )}

                {!isTeacherOrAdmin && !chatEnabled && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
                    🔇 Chat desativado pelo professor
                  </span>
                )}
              </div>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-2 py-12">
                  <span className="material-symbols-outlined text-[36px] opacity-40">
                    chat_bubble_outline
                  </span>
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
                  const isFromTeacher =
                    msg.senderRole === 'professor' || msg.senderRole === 'admin';
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
                          <span className="font-bold flex items-center gap-1.5 flex-wrap">
                            <span>{msg.senderName}</span>
                            {isFromTeacher && (
                              <span className="px-1.5 py-0.2 rounded bg-[#0288D1] text-white text-[9px]">
                                Professor
                              </span>
                            )}
                            {isTeacherOrAdmin &&
                              selectedClassFilter === 'all' &&
                              msg.classNameLabel && (
                                <span className="px-1.5 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[9px] text-[#FFE600] font-semibold">
                                  {msg.classNameLabel}
                                </span>
                              )}
                          </span>
                          <span className="text-[var(--text-muted)] font-mono shrink-0">
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
                              {/* Bloqueia abertura de script de colega no Modo Avaliação (aluno) */}
                              {(isTeacherOrAdmin || !isExamMode || isFromTeacher || isMine) && (
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
                                  <span className="material-symbols-outlined text-[13px]">
                                    open_in_new
                                  </span>
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

            {/* Seletor de Turma Destino quando professor envia no modo Todas as Turmas */}
            {isTeacherOrAdmin &&
              selectedClassFilter === 'all' &&
              selectedTarget.uid === 'all' &&
              sortedTeacherClasses.length > 1 && (
                <div className="px-3 py-1.5 bg-[var(--bg-surface)]/80 border-t border-[var(--border-color)] flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#FF6B00]">
                      outgoing_mail
                    </span>
                    Enviar para turma:
                  </span>
                  <select
                    value={composeClassId}
                    onChange={(e) => setComposeClassId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[#FF6B00]"
                  >
                    {sortedTeacherClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    : isExamMode && classItem && selectedTarget.uid !== classItem.teacherId
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
                    : targetSendClass
                    ? `Escreva para ${
                        selectedTarget.uid === 'all'
                          ? targetSendClass.name
                          : selectedStudentName || targetSendClass.teacherName
                      }...`
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
              {targetSendClass && (
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Destino:{' '}
                  <strong className="text-[#FFE600]">
                    {selectedTarget.uid === 'all'
                      ? `Chat Geral (${targetSendClass.name})`
                      : `${selectedStudentName || targetSendClass.teacherName} (${targetSendClass.name})`}
                  </strong>
                </p>
              )}

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
