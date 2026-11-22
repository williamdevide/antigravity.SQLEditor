import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createClass,
  updateClass,
  deleteClass,
  getClassesByTeacher,
  getAllClasses,
  getClassMembers,
  approveStudentRequest,
  removeStudentFromClass,
  admitStudentByEmail,
  admitStudentByProfile,
  getAvailableStudents,
  updateClassMode,
  updateAllTeacherClassesMode,
  updateClassSettings,
  buildDefaultExamSessionLabel,
} from '../services/classService';
import {
  saveScript,
  getTeacherPublishedScripts,
  updateScript,
  deleteScript,
  deleteScriptsBatch,
  getExamSubmissions,
  gradeExamSubmission,
  NORMAL_GLOBAL_CLASS_ID,
  getNormalGlobalScripts,
  ensureNormalGlobalSeeded,
  restoreMissingBuiltInNormalMaterials,
  copyNormalMaterialsToClass,
} from '../services/scriptService';
import {
  subscribeToClassPresence,
  subscribeToClassMessages,
  sendClassMessage,
  deleteClassMessage,
  deleteClassMessagesBatch,
  archiveClassMessagesBatch,
  formatClassMessagesToMarkdown,
  subscribeToClassExamAlerts,
  acknowledgeExamAlert,
  acknowledgeExamAlertsBatch,
  groupExamAlertsBySession,
  EXAM_ALERT_TYPE_LABELS,
  subscribeToClassLiveStates,
} from '../services/classroomRealtimeService';
import { StudentMonitorModal } from './StudentMonitorModal';
import { ExamGradingModal } from './ExamGradingModal';
import { formatStudentDisplayName, compareNamesPtBr } from '../utils/studentNameFormatter';
import type {
  ClassItem,
  ClassMemberItem,
  ClassroomMode,
  SavedScriptItem,
  SavedScriptCategory,
  UserProfile,
  UserRole,
  ClassPresenceItem,
  ClassMessageItem,
  ExamAlertItem,
  StudentLiveStateItem,
  AutoGradeDetails,
} from '../types';

interface TeacherPanelViewProps {
  onBackToWorkspace: () => void;
  onOpenStudentInSqlEditor?: (params: {
    classId: string;
    studentUid: string;
    studentName: string;
    studentEmail: string;
    tabTitle: string;
    content: string;
    activeDatabase?: string;
  }) => void;
}

export const TeacherPanelView: React.FC<TeacherPanelViewProps> = ({
  onBackToWorkspace,
  onOpenStudentInSqlEditor,
}) => {
  const { user, userProfile, isAdmin } = useAuth();

  // Estados de Turmas
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [members, setMembers] = useState<ClassMemberItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Modal / Formulário de Criação de Turma
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCourse, setNewClassCourse] = useState('Técnico em Desenvolvimento de Sistemas');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Modal / Formulário de Edição de Turma
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  const [editClassCourse, setEditClassCourse] = useState('');
  const [editClassDesc, setEditClassDesc] = useState('');
  const [editClassActive, setEditClassActive] = useState(true);
  const [isUpdatingClass, setIsUpdatingClass] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Confirmação de Mudança de Modo e Sessão de Avaliação
  const [pendingModeChange, setPendingModeChange] = useState<{
    mode: ClassroomMode;
    applyAll: boolean;
  } | null>(null);
  const [examSessionLabelInput, setExamSessionLabelInput] = useState<string>(() =>
    buildDefaultExamSessionLabel()
  );
  const [isChangingMode, setIsChangingMode] = useState(false);

  // Admissão por E-mail
  const [admitEmail, setAdmitEmail] = useState('');
  const [isAdmittingEmail, setIsAdmittingEmail] = useState(false);

  // Feedback e Toasts
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeStudentTab, setActiveStudentTab] = useState<'members' | 'pending' | 'admit' | 'available'>('members');
  const [activeResourcePanel, setActiveResourcePanel] = useState<
    'materials' | 'submissions' | 'chat' | 'alerts' | null
  >(null);

  // Alunos Disponíveis (sem turma)
  const [availableStudents, setAvailableStudents] = useState<UserProfile[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedAvailableUids, setSelectedAvailableUids] = useState<string[]>([]);
  const [isAdmittingAvailable, setIsAdmittingAvailable] = useState(false);
  const [admittingSingleUid, setAdmittingSingleUid] = useState<string | null>(null);
  const [highlightedAvailableUid, setHighlightedAvailableUid] = useState<string | null>(null);
  const availableHighlightTimerRef = useRef<number | null>(null);

  // Materiais e Scripts Pedagógicos
  const [materials, setMaterials] = useState<SavedScriptItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [isDeletingBatchMaterials, setIsDeletingBatchMaterials] = useState(false);

  // Card Especial "Geral (Modo Normal)" exclusivo do Administrador
  const [isNormalGlobalSelected, setIsNormalGlobalSelected] = useState(false);
  const [normalGlobalMaterials, setNormalGlobalMaterials] = useState<SavedScriptItem[]>([]);
  const [isLoadingNormalGlobal, setIsLoadingNormalGlobal] = useState(false);

  // Modal "Copiar do Modo Normal" para dentro de uma Turma
  const [isCopyNormalModalOpen, setIsCopyNormalModalOpen] = useState(false);
  const [normalCatalogForCopy, setNormalCatalogForCopy] = useState<SavedScriptItem[]>([]);
  const [isLoadingNormalCatalog, setIsLoadingNormalCatalog] = useState(false);
  const [copyNormalCategoryFilter, setCopyNormalCategoryFilter] = useState<string>('all');
  const [copyNormalSearch, setCopyNormalSearch] = useState('');
  const [selectedCopyNormalIds, setSelectedCopyNormalIds] = useState<string[]>([]);
  const [isCopyingNormalMaterials, setIsCopyingNormalMaterials] = useState(false);

  // Modal de Criação / Edição de Material
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SavedScriptItem | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matCategory, setMatCategory] = useState<SavedScriptCategory>('class_database');
  const [matClassIds, setMatClassIds] = useState<string[]>(['all']);
  const [matAllClasses, setMatAllClasses] = useState(true);
  const [matVisibleNormal, setMatVisibleNormal] = useState(false);
  const [matVisibleClassroom, setMatVisibleClassroom] = useState(true);
  const [matVisibleExam, setMatVisibleExam] = useState(false);
  const [matAnswerKeySql, setMatAnswerKeySql] = useState('');
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  // Entregas dos Alunos na Avaliação
  const [submissions, setSubmissions] = useState<SavedScriptItem[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<SavedScriptItem | null>(null);

  // Monitoramento em Tempo Real: Presença, Chat Completo, Alertas Anti-Trapaça e Espelho ao Vivo
  const [presenceList, setPresenceList] = useState<ClassPresenceItem[]>([]);
  const [classMessages, setClassMessages] = useState<ClassMessageItem[]>([]);
  const [examAlerts, setExamAlerts] = useState<ExamAlertItem[]>([]);
  const [liveStates, setLiveStates] = useState<StudentLiveStateItem[]>([]);
  const [monitoringStudent, setMonitoringStudent] = useState<{
    uid: string;
    name: string;
    email: string;
  } | null>(null);
  const [viewingStudentAlerts, setViewingStudentAlerts] = useState<{
    uid: string;
    name: string;
    email: string;
  } | null>(null);
  const [selectedAlertSessionFilter, setSelectedAlertSessionFilter] = useState<string>('all');
  const [studentAlertSessionFilter, setStudentAlertSessionFilter] = useState<string>('all');
  const [isAcknowledgingAlerts, setIsAcknowledgingAlerts] = useState(false);

  // Envio e gestão de mensagens pelo professor no painel Chat Geral
  const [teacherChatTarget, setTeacherChatTarget] = useState<string>('all');
  const [teacherChatText, setTeacherChatText] = useState('');
  const [isSendingTeacherChat, setIsSendingTeacherChat] = useState(false);
  const [chatArchiveTab, setChatArchiveTab] = useState<'active' | 'archived'>('active');
  const [isProcessingChatAction, setIsProcessingChatAction] = useState(false);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ type, message });
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 4500);
  };

  // Carrega as turmas do professor (ou todas as turmas para Administrador)
  const loadTeacherClasses = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingClasses(true);
      const list = isAdmin ? await getAllClasses() : await getClassesByTeacher(user.uid);
      setClasses(list);
      setSelectedClass((curr) => {
        if (!curr && list.length > 0) return list[0];
        if (curr) {
          const match = list.find((c) => c.id === curr.id);
          return match || (list.length > 0 ? list[0] : null);
        }
        return null;
      });
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao carregar turmas:', err);
      showFeedback('error', 'Falha ao carregar lista de turmas.');
    } finally {
      setIsLoadingClasses(false);
    }
  }, [user, isAdmin]);

  // Carrega membros da turma selecionada
  const loadClassMembers = useCallback(async (classId: string) => {
    try {
      setIsLoadingMembers(true);
      const list = await getClassMembers(classId);
      setMembers(list);
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao carregar membros:', err);
      showFeedback('error', 'Falha ao carregar alunos da turma.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  // Carrega materiais / scripts pedagógicos
  const loadClassMaterials = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingMaterials(true);
      const list = await getTeacherPublishedScripts(user.uid);
      setMaterials(list);
    } catch (err) {
      console.error('[TeacherPanel] Erro ao carregar materiais:', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  }, [user]);

  // Carrega entregas de avaliações da turma
  const loadSubmissions = useCallback(async (classId: string) => {
    try {
      setIsLoadingSubmissions(true);
      const list = await getExamSubmissions(classId);
      setSubmissions(list);
    } catch (err) {
      console.error('[TeacherPanel] Erro ao carregar entregas:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, []);

  // Carrega alunos disponíveis na plataforma (sem turma)
  const loadAvailableStudents = useCallback(async () => {
    try {
      setIsLoadingAvailable(true);
      const list = await getAvailableStudents();
      setAvailableStudents(list);
      setSelectedAvailableUids((prev) => prev.filter((uid) => list.some((s) => s.uid === uid)));
    } catch (err) {
      console.error('[TeacherPanel] Erro ao carregar alunos disponíveis:', err);
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  // Carrega catálogo público "Geral (Modo Normal)" (e garante seed inicial para Administrador)
  const loadNormalGlobalCatalog = useCallback(
    async (seedIfNeeded = false) => {
      try {
        setIsLoadingNormalGlobal(true);
        if (seedIfNeeded && isAdmin && user) {
          const seeded = await ensureNormalGlobalSeeded({
            uid: user.uid,
            displayName: userProfile?.displayName || user.displayName || 'Administrador',
            email: userProfile?.email || user.email || '',
          });
          setNormalGlobalMaterials(seeded);
        } else {
          const list = await getNormalGlobalScripts();
          setNormalGlobalMaterials(list);
        }
      } catch (err) {
        console.error('[TeacherPanel] Erro ao carregar Geral (Modo Normal):', err);
      } finally {
        setIsLoadingNormalGlobal(false);
      }
    },
    [isAdmin, user, userProfile?.displayName, userProfile?.email]
  );

  useEffect(() => {
    loadTeacherClasses();
    loadAvailableStudents();
    if (isAdmin) {
      loadNormalGlobalCatalog(false);
    }
  }, [loadTeacherClasses, loadAvailableStudents, isAdmin, loadNormalGlobalCatalog]);

  useEffect(() => {
    if (selectedClass) {
      loadClassMembers(selectedClass.id);
      loadClassMaterials();
      loadSubmissions(selectedClass.id);
    } else {
      setMembers([]);
      setMaterials([]);
      setSubmissions([]);
    }
  }, [selectedClass, loadClassMembers, loadClassMaterials, loadSubmissions]);

  // Copiar código da turma com feedback
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showFeedback('success', `Código ${code} copiado para a área de transferência!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // Alteração de Modo de Turma (Normal, Sala de Aula, Avaliação)
  const requestModeChange = (mode: ClassroomMode, applyAll = false) => {
    if (mode === 'exam') {
      setExamSessionLabelInput(buildDefaultExamSessionLabel());
      setPendingModeChange({ mode, applyAll });
    } else {
      executeModeChange(mode, applyAll);
    }
  };

  const executeModeChange = async (mode: ClassroomMode, applyAll: boolean) => {
    if (!user || !userProfile || !selectedClass) return;
    const sessionOptions =
      mode === 'exam' ? { examSessionLabel: examSessionLabelInput } : undefined;
    try {
      setIsChangingMode(true);
      if (applyAll) {
        const sessionMap = await updateAllTeacherClassesMode(
          user.uid,
          mode,
          userProfile,
          sessionOptions
        );
        setClasses((prev) =>
          prev.map((c) =>
            sessionMap[c.id]
              ? { ...c, classroomMode: mode, ...sessionMap[c.id] }
              : { ...c, classroomMode: mode }
          )
        );
        setSelectedClass((curr) =>
          curr
            ? {
                ...curr,
                classroomMode: mode,
                ...(sessionMap[curr.id] || {}),
              }
            : null
        );
        showFeedback('success', `Modo "${mode.toUpperCase()}" aplicado a todas as suas turmas!`);
      } else {
        const sessionMeta = await updateClassMode(
          selectedClass.id,
          mode,
          userProfile,
          sessionOptions
        );
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClass.id ? { ...c, classroomMode: mode, ...sessionMeta } : c
          )
        );
        setSelectedClass((curr) =>
          curr ? { ...curr, classroomMode: mode, ...sessionMeta } : null
        );
        if (mode === 'exam' && sessionMeta.activeExamSessionId) {
          setSelectedAlertSessionFilter(sessionMeta.activeExamSessionId);
        }
        showFeedback(
          'success',
          mode === 'exam'
            ? `Avaliação "${sessionMeta.activeExamSessionLabel}" iniciada! Alunos em recarregamento no Laboratório SQL.`
            : `Modo da turma "${selectedClass.name}" atualizado para ${mode.toUpperCase()}!`
        );
      }
      setPendingModeChange(null);
    } catch (err: any) {
      console.error('[executeModeChange Error]', err);
      showFeedback('error', 'Falha ao alterar modo da turma: ' + (err?.message || 'Erro'));
    } finally {
      setIsChangingMode(false);
    }
  };

  // Abertura do Modal de Edição de Turma
  const handleOpenEditModal = (classItem: ClassItem) => {
    setEditClassName(classItem.name);
    setEditClassCourse(classItem.course);
    setEditClassDesc(classItem.description || '');
    setEditClassActive(classItem.active !== false);
    setIsEditModalOpen(true);
  };

  // Submissão da Atualização de Turma
  const handleUpdateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !user || !userProfile) return;
    if (!editClassName.trim() || !editClassCourse.trim()) {
      showFeedback('error', 'Nome e curso da turma são obrigatórios.');
      return;
    }

    try {
      setIsUpdatingClass(true);
      await updateClass({
        classId: selectedClass.id,
        name: editClassName.trim(),
        course: editClassCourse.trim(),
        description: editClassDesc.trim(),
        active: editClassActive,
        teacher: userProfile,
      });

      const updatedItem: ClassItem = {
        ...selectedClass,
        name: editClassName.trim(),
        course: editClassCourse.trim(),
        description: editClassDesc.trim(),
        active: editClassActive,
      };

      setClasses((prev) =>
        prev
          .map((c) => (c.id === selectedClass.id ? updatedItem : c))
          .sort((a, b) => compareNamesPtBr(a.name, b.name))
      );
      setSelectedClass(updatedItem);
      setIsEditModalOpen(false);
      showFeedback('success', `Turma "${editClassName}" atualizada com sucesso!`);
    } catch (err: any) {
      console.error('[handleUpdateClassSubmit Error]', err);
      showFeedback('error', 'Falha ao atualizar turma: ' + (err?.message || 'Erro'));
    } finally {
      setIsUpdatingClass(false);
    }
  };

  // Exclusão de Turma
  const handleDeleteClass = async (classItem: ClassItem) => {
    if (!user || !userProfile) return;
    const confirmMsg = `ATENÇÃO: Deseja realmente excluir permanentemente a turma "${classItem.name}" [${classItem.code}]?\n\nOs alunos permanecerão cadastrados na plataforma com seus perfis intactos, mas seu vínculo com esta turma será desfeito.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeletingClass(true);
      await deleteClass({
        classItem,
        teacher: userProfile,
      });

      setClasses((prev) => prev.filter((c) => c.id !== classItem.id));
      setSelectedClass((curr) => {
        if (curr?.id === classItem.id) {
          const remaining = classes.filter((c) => c.id !== classItem.id);
          return remaining.length > 0 ? remaining[0] : null;
        }
        return curr;
      });
      setIsEditModalOpen(false);
      showFeedback('success', `Turma "${classItem.name}" excluída com sucesso!`);
    } catch (err: any) {
      console.error('[handleDeleteClass Error]', err);
      showFeedback('error', 'Falha ao excluir turma: ' + (err?.message || 'Erro'));
    } finally {
      setIsDeletingClass(false);
    }
  };

  // Criação de Turma
  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (!newClassName.trim() || !newClassCourse.trim()) {
      showFeedback('error', 'Nome e curso da turma são obrigatórios.');
      return;
    }

    try {
      setIsCreatingClass(true);
      const created = await createClass({
        name: newClassName.trim(),
        course: newClassCourse.trim(),
        description: newClassDesc.trim(),
        teacherId: user.uid,
        teacherName: userProfile.displayName || user.displayName || 'Professor',
        teacherEmail: userProfile.email || user.email || '',
      });

      setClasses((prev) =>
        [...prev, created].sort((a, b) => compareNamesPtBr(a.name, b.name))
      );
      setSelectedClass(created);
      setIsCreateModalOpen(false);
      setNewClassName('');
      setNewClassDesc('');
      showFeedback('success', `Turma "${created.name}" criada com código [${created.code}]!`);
    } catch (err: any) {
      console.error('[handleCreateClassSubmit Error]', err);
      showFeedback('error', 'Falha ao criar turma: ' + (err?.message || 'Erro'));
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Aprovação e Remoção de Alunos
  const handleApproveStudent = async (member: ClassMemberItem) => {
    if (!selectedClass || !userProfile) return;
    try {
      await approveStudentRequest({
        memberId: member.id,
        classItem: selectedClass,
        studentUid: member.studentUid,
        studentName: member.studentName,
        studentEmail: member.studentEmail,
        teacher: userProfile,
      });
      showFeedback('success', `Aluno "${member.studentName}" aprovado na turma!`);
      loadClassMembers(selectedClass.id);
    } catch (err: any) {
      showFeedback('error', 'Erro ao aprovar aluno.');
    }
  };

  const handleRemoveStudent = async (member: ClassMemberItem) => {
    if (!selectedClass || !userProfile) return;
    if (!window.confirm(`Deseja remover ${member.studentName} da turma?`)) return;
    try {
      await removeStudentFromClass({
        memberId: member.id,
        classItem: selectedClass,
        studentUid: member.studentUid,
        studentName: member.studentName,
        studentEmail: member.studentEmail,
        teacher: userProfile,
      });
      showFeedback('success', `Aluno "${member.studentName}" removido.`);
      loadClassMembers(selectedClass.id);
      loadAvailableStudents();
    } catch (err: any) {
      showFeedback('error', 'Erro ao remover aluno.');
    }
  };

  // Admissão por E-mail
  const handleAdmitByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !userProfile || !admitEmail.trim()) return;
    try {
      setIsAdmittingEmail(true);
      await admitStudentByEmail({
        classItem: selectedClass,
        studentEmail: admitEmail.trim(),
        teacher: userProfile,
      });
      showFeedback('success', `Aluno com e-mail "${admitEmail.trim()}" matriculado com sucesso!`);
      setAdmitEmail('');
      loadClassMembers(selectedClass.id);
      loadAvailableStudents();
      setActiveStudentTab('members');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao admitir aluno.');
    } finally {
      setIsAdmittingEmail(false);
    }
  };

  // Posiciona foco e scroll suave no próximo aluno da lista Disponíveis após inserção
  const focusNextAvailableStudent = useCallback((nextUid: string | null) => {
    if (!nextUid) return;

    setHighlightedAvailableUid(nextUid);
    if (availableHighlightTimerRef.current) {
      window.clearTimeout(availableHighlightTimerRef.current);
    }
    availableHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedAvailableUid(null);
    }, 2400);

    requestAnimationFrame(() => {
      const nextBtn = document.querySelector<HTMLButtonElement>(
        `button[data-admit-uid="${nextUid}"]`
      );
      const nextRow = document.querySelector<HTMLTableRowElement>(
        `tr[data-available-row-uid="${nextUid}"]`
      );
      if (nextBtn) {
        nextBtn.focus({ preventScroll: true });
      }
      if (nextRow) {
        const rect = nextRow.getBoundingClientRect();
        const isOutOfView = rect.top < 72 || rect.bottom > window.innerHeight - 24;
        if (isOutOfView) {
          nextRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    });
  }, []);

  // Inserir aluno disponível individualmente na turma atual mantendo posicionado no próximo nome
  const handleAdmitSingleAvailable = async (student: UserProfile) => {
    if (!selectedClass || !userProfile) return;
    const formattedName = getStudentDisplayName(student);

    // Captura o próximo nome na ordem exibida antes da remoção
    const currentIndex = filteredAvailableStudents.findIndex((s) => s.uid === student.uid);
    const nextStudent =
      currentIndex >= 0
        ? filteredAvailableStudents[currentIndex + 1] ||
          filteredAvailableStudents[currentIndex - 1] ||
          null
        : null;

    try {
      setAdmittingSingleUid(student.uid);
      await admitStudentByProfile({
        classItem: selectedClass,
        student,
        teacher: userProfile,
      });

      // Atualiza estado localmente para não desmontar a tabela nem perder a posição do scroll
      setAvailableStudents((prev) => prev.filter((s) => s.uid !== student.uid));
      setSelectedAvailableUids((prev) => prev.filter((id) => id !== student.uid));
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClass.id ? { ...c, studentCount: (c.studentCount ?? 0) + 1 } : c
        )
      );
      setSelectedClass((curr) =>
        curr && curr.id === selectedClass.id
          ? { ...curr, studentCount: (curr.studentCount ?? 0) + 1 }
          : curr
      );

      // Atualiza os matriculados silenciosamente em segundo plano sem exibir spinner
      getClassMembers(selectedClass.id)
        .then((updatedMembers) => setMembers(updatedMembers))
        .catch(() => {});

      showFeedback('success', `Aluno "${formattedName}" inserido na turma!`);
      focusNextAvailableStudent(nextStudent?.uid || null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao inserir aluno na turma.');
    } finally {
      setAdmittingSingleUid(null);
    }
  };

  // Inserir múltiplos alunos disponíveis selecionados via checkbox na turma atual
  const handleAdmitSelectedAvailable = async () => {
    if (!selectedClass || !userProfile || selectedAvailableUids.length === 0) return;
    const targets = availableStudents.filter((s) => selectedAvailableUids.includes(s.uid));
    if (targets.length === 0) return;

    const targetUidSet = new Set(targets.map((t) => t.uid));
    // Identifica o primeiro aluno restante após os selecionados na ordem exibida
    const lastSelectedIdx = filteredAvailableStudents.reduce(
      (lastIdx, st, idx) => (targetUidSet.has(st.uid) ? idx : lastIdx),
      -1
    );
    const nextRemaining =
      filteredAvailableStudents.slice(lastSelectedIdx + 1).find((st) => !targetUidSet.has(st.uid)) ||
      filteredAvailableStudents.find((st) => !targetUidSet.has(st.uid)) ||
      null;

    try {
      setIsAdmittingAvailable(true);
      let addedCount = 0;
      const insertedUids: string[] = [];
      for (const student of targets) {
        await admitStudentByProfile({
          classItem: selectedClass,
          student,
          teacher: userProfile,
        });
        insertedUids.push(student.uid);
        addedCount++;
      }

      const insertedSet = new Set(insertedUids);
      setAvailableStudents((prev) => prev.filter((s) => !insertedSet.has(s.uid)));
      setSelectedAvailableUids([]);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClass.id
            ? { ...c, studentCount: (c.studentCount ?? 0) + addedCount }
            : c
        )
      );
      setSelectedClass((curr) =>
        curr && curr.id === selectedClass.id
          ? { ...curr, studentCount: (curr.studentCount ?? 0) + addedCount }
          : curr
      );

      getClassMembers(selectedClass.id)
        .then((updatedMembers) => setMembers(updatedMembers))
        .catch(() => {});

      showFeedback(
        'success',
        `${addedCount} ${addedCount === 1 ? 'aluno inserido' : 'alunos inseridos'} com sucesso na turma "${selectedClass.name}"!`
      );
      focusNextAvailableStudent(nextRemaining?.uid || null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao inserir alunos selecionados.');
    } finally {
      setIsAdmittingAvailable(false);
    }
  };

  // Gestão de Materiais Pedagógicos
  const [modalError, setModalError] = useState<string | null>(null);

  // Subscriptions em tempo real quando uma turma é selecionada
  useEffect(() => {
    setChatArchiveTab('active');
    setViewingStudentAlerts(null);
    if (!selectedClass?.id) {
      setPresenceList([]);
      setClassMessages([]);
      setExamAlerts([]);
      setLiveStates([]);
      return;
    }
    const unsubPresence = subscribeToClassPresence(selectedClass.id, setPresenceList);
    const unsubMsgs = subscribeToClassMessages(selectedClass.id, setClassMessages, {
      includeArchived: true,
    });
    const unsubAlerts = subscribeToClassExamAlerts(selectedClass.id, setExamAlerts);
    const unsubLive = subscribeToClassLiveStates(selectedClass.id, setLiveStates);

    return () => {
      unsubPresence();
      unsubMsgs();
      unsubAlerts();
      unsubLive();
    };
  }, [selectedClass?.id]);

  // Zera e reseta todos os campos do modal de material didático
  const resetMaterialModal = () => {
    setEditingMaterial(null);
    setMatTitle('');
    setMatDesc('');
    setMatContent('-- Escreva aqui o script SQL do Banco de Dados, Exemplo ou Exercício...\n');
    setMatCategory('class_database');
    if (isAdmin && isNormalGlobalSelected) {
      setMatClassIds([NORMAL_GLOBAL_CLASS_ID]);
      setMatAllClasses(false);
      setMatVisibleNormal(true);
      setMatVisibleClassroom(false);
      setMatVisibleExam(false);
    } else {
      setMatClassIds(selectedClass ? [selectedClass.id] : ['all']);
      setMatAllClasses(false);
      setMatVisibleNormal(false);
      setMatVisibleClassroom(true);
      setMatVisibleExam(false);
    }
    setMatAnswerKeySql('');
    setModalError(null);
    setIsMaterialModalOpen(false);
  };

  const handleOpenNewMaterialModal = () => {
    resetMaterialModal();
    setIsMaterialModalOpen(true);
  };

  const handleSelectNormalGlobal = async () => {
    setIsNormalGlobalSelected(true);
    setSelectedMaterialIds([]);
    setMaterialCategoryFilter('all');
    await loadNormalGlobalCatalog(true);
  };

  const handleRestoreNormalBuiltIns = async () => {
    if (!isAdmin || !user) return;
    try {
      setIsLoadingNormalGlobal(true);
      const count = await restoreMissingBuiltInNormalMaterials({
        uid: user.uid,
        displayName: userProfile?.displayName || user.displayName || 'Administrador',
        email: userProfile?.email || user.email || '',
      });
      await loadNormalGlobalCatalog(false);
      showFeedback(
        'success',
        count > 0
          ? `${count} material(is) padrão restaurado(s) em Geral (Modo Normal)!`
          : 'Todos os materiais padrão originais já estão presentes.'
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao restaurar materiais padrão.');
      setIsLoadingNormalGlobal(false);
    }
  };

  const handleOpenCopyNormalModal = async () => {
    setIsCopyNormalModalOpen(true);
    setCopyNormalCategoryFilter('all');
    setCopyNormalSearch('');
    setSelectedCopyNormalIds([]);
    setIsLoadingNormalCatalog(true);
    try {
      const list = await getNormalGlobalScripts();
      setNormalCatalogForCopy(list);
    } catch (err) {
      console.error('[TeacherPanel] Erro ao abrir catálogo Normal:', err);
      showFeedback('error', 'Erro ao carregar materiais do Modo Normal.');
    } finally {
      setIsLoadingNormalCatalog(false);
    }
  };

  const handleCopyNormalSubmit = async () => {
    if (!selectedClass || !user || selectedCopyNormalIds.length === 0) return;
    const targets = normalCatalogForCopy.filter((m) => selectedCopyNormalIds.includes(m.id));
    if (targets.length === 0) return;

    try {
      setIsCopyingNormalMaterials(true);
      const authorRole: UserRole = userProfile?.role || (isAdmin ? 'admin' : 'professor');
      const authorName = userProfile?.displayName || user.displayName || 'Professor';
      const authorEmail = userProfile?.email || user.email || '';

      await copyNormalMaterialsToClass({
        materials: targets,
        classId: selectedClass.id,
        authorUid: user.uid,
        authorName,
        authorEmail,
        authorRole,
      });

      setIsCopyNormalModalOpen(false);
      setSelectedCopyNormalIds([]);
      await loadClassMaterials();
      showFeedback(
        'success',
        `${targets.length} ${
          targets.length === 1 ? 'material copiado' : 'materiais copiados'
        } para a turma "${selectedClass.name}"!`
      );
    } catch (err: any) {
      console.error('[handleCopyNormalSubmit Error]', err);
      showFeedback('error', err?.message || 'Erro ao copiar materiais para a turma.');
    } finally {
      setIsCopyingNormalMaterials(false);
    }
  };

  const handleOpenEditMaterialModal = (item: SavedScriptItem) => {
    setEditingMaterial(item);
    setMatTitle(item.title);
    setMatDesc(item.description || '');
    setMatContent(item.content);
    setMatCategory(item.category);
    const isAll = (item.classIds || []).includes('all');
    setMatAllClasses(isAll);
    setMatClassIds(isAll ? ['all'] : item.classIds || []);
    setMatVisibleNormal(Boolean(item.visibleInNormal));
    setMatVisibleClassroom(item.visibleInClassroom !== false);
    setMatVisibleExam(item.visibleInExam ?? (item.category === 'exam'));
    setMatAnswerKeySql(item.answerKeySql || '');
    setModalError(null);
    setIsMaterialModalOpen(true);
  };

  const handleToggleMaterialClassroomVisibility = async (item: SavedScriptItem) => {
    const nextVal = !(item.visibleInClassroom !== false);
    setMaterials((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, visibleInClassroom: nextVal } : m))
    );
    try {
      await updateScript(item.id, { visibleInClassroom: nextVal });
      showFeedback(
        'success',
        `"${item.title}" agora está ${nextVal ? 'visível' : 'oculto'} no Modo Sala de Aula.`
      );
    } catch (err) {
      showFeedback('error', 'Erro ao atualizar visibilidade no Modo Aula.');
      loadClassMaterials();
    }
  };

  const handleToggleMaterialExamVisibility = async (item: SavedScriptItem) => {
    const currentVal = item.visibleInExam ?? (item.category === 'exam');
    const nextVal = !currentVal;
    setMaterials((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, visibleInExam: nextVal } : m))
    );
    try {
      await updateScript(item.id, { visibleInExam: nextVal });
      showFeedback(
        'success',
        `"${item.title}" agora está ${nextVal ? 'visível' : 'oculto'} no Modo Avaliação.`
      );
    } catch (err) {
      showFeedback('error', 'Erro ao atualizar visibilidade no Modo Avaliação.');
      loadClassMaterials();
    }
  };

  const handleToggleClassSetting = async (field: 'chatEnabled' | 'scriptSharingEnabled') => {
    if (!selectedClass) return;
    const current =
      field === 'chatEnabled'
        ? selectedClass.chatEnabled !== false
        : selectedClass.scriptSharingEnabled !== false;
    const nextVal = !current;
    try {
      await updateClassSettings(
        selectedClass.id,
        { [field]: nextVal },
        userProfile || undefined
      );
      setClasses((prev) =>
        prev.map((c) => (c.id === selectedClass.id ? { ...c, [field]: nextVal } : c))
      );
      setSelectedClass((curr) => (curr ? { ...curr, [field]: nextVal } : null));
      showFeedback(
        'success',
        field === 'chatEnabled'
          ? `Chat da turma ${nextVal ? 'ativado' : 'desativado'}!`
          : `Compartilhamento de scripts ${nextVal ? 'ativado' : 'desativado'}!`
      );
    } catch (err: any) {
      showFeedback('error', 'Falha ao atualizar configuração da turma: ' + (err?.message || 'Erro'));
    }
  };

  const handleSendTeacherChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClass || !teacherChatText.trim()) return;
    const targetName =
      teacherChatTarget === 'all'
        ? 'Toda a Turma'
        : members.find((m) => m.studentUid === teacherChatTarget)?.studentName || 'Aluno';

    try {
      setIsSendingTeacherChat(true);
      await sendClassMessage({
        classId: selectedClass.id,
        senderUid: user.uid,
        senderName: userProfile?.displayName || user.displayName || 'Professor',
        senderRole: userProfile?.role || (isAdmin ? 'admin' : 'professor'),
        senderPhotoURL: userProfile?.photoURL || user.photoURL || '',
        recipientUid: teacherChatTarget,
        recipientName: targetName,
        text: teacherChatText.trim(),
        type: 'text',
      });
      setTeacherChatText('');
    } catch (err: any) {
      showFeedback('error', 'Erro ao enviar mensagem: ' + (err?.message || 'Erro'));
    } finally {
      setIsSendingTeacherChat(false);
    }
  };

  const handleDeleteSingleMessage = async (msg: ClassMessageItem) => {
    if (!user || isProcessingChatAction) return;
    if (
      !window.confirm(
        `Excluir permanentemente a mensagem de "${msg.senderName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      setIsProcessingChatAction(true);
      await deleteClassMessage(msg.id);
      showFeedback('success', 'Mensagem excluída com sucesso.');
    } catch (err: any) {
      showFeedback('error', 'Erro ao excluir mensagem: ' + (err?.message || 'Erro'));
    } finally {
      setIsProcessingChatAction(false);
    }
  };

  const handleToggleArchiveMessages = async (
    ids: string[],
    shouldArchive: boolean,
    confirmMessage?: string
  ) => {
    if (!user || isProcessingChatAction || ids.length === 0) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      setIsProcessingChatAction(true);
      const count = await archiveClassMessagesBatch(ids, user.uid, shouldArchive);
      showFeedback(
        'success',
        shouldArchive
          ? `${count} ${count === 1 ? 'mensagem arquivada' : 'mensagens arquivadas'} com sucesso!`
          : `${count} ${count === 1 ? 'mensagem restaurada' : 'mensagens restauradas'} para o chat ativo!`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        `Erro ao ${shouldArchive ? 'arquivar' : 'restaurar'} mensagens: ` + (err?.message || 'Erro')
      );
    } finally {
      setIsProcessingChatAction(false);
    }
  };

  const handleDeleteAllMessagesInTab = async (msgs: ClassMessageItem[], tabLabel: string) => {
    if (!user || isProcessingChatAction || msgs.length === 0) return;
    if (
      !window.confirm(
        `Deseja excluir PERMANENTEMENTE todas as ${msgs.length} mensagens ${tabLabel} desta turma? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    try {
      setIsProcessingChatAction(true);
      const count = await deleteClassMessagesBatch(msgs.map((m) => m.id));
      showFeedback(
        'success',
        `${count} ${count === 1 ? 'mensagem excluída' : 'mensagens excluídas'} permanentemente.`
      );
    } catch (err: any) {
      showFeedback('error', 'Erro ao excluir mensagens: ' + (err?.message || 'Erro'));
    } finally {
      setIsProcessingChatAction(false);
    }
  };

  const handleExportChatMarkdown = (msgs: ClassMessageItem[], tabLabel: string) => {
    if (!selectedClass || msgs.length === 0) return;
    const md = formatClassMessagesToMarkdown(
      selectedClass.name,
      selectedClass.code,
      msgs,
      tabLabel
    );
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeCode = (selectedClass.code || 'turma').replace(/[^a-zA-Z0-9_-]/g, '_');
    const slugTab = tabLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${safeCode}_${slugTab}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('success', `Histórico (${tabLabel}) baixado em Markdown (.md)!`);
  };

  const handleQuickSaveGradeFromMonitor = async (params: {
    studentUid: string;
    studentName: string;
    studentEmail: string;
    content: string;
    grade: number;
    feedback: string;
    autoGradeDetails: AutoGradeDetails;
  }) => {
    if (!user || !selectedClass) return;
    // Procura se já existe entrega do aluno nessa turma para atualizar; caso contrário cria um registro de avaliação avaliada
    const existingSub = submissions.find((s) => s.authorUid === params.studentUid);
    if (existingSub) {
      await gradeExamSubmission(existingSub.id, {
        grade: params.grade,
        teacherFeedback: params.feedback,
        gradedBy: user.uid,
        gradePublished: true,
        autoGradeDetails: params.autoGradeDetails,
      });
    } else {
      const created = await saveScript({
        title: `[Avaliação Ao Vivo] ${selectedClass.name} - ${params.studentName}`,
        description: `Avaliação corrigida diretamente pelo monitoramento em tela pelo professor em ${new Date().toLocaleString('pt-BR')}`,
        content: params.content || '-- Sem conteúdo',
        authorUid: params.studentUid,
        authorName: params.studentName,
        authorEmail: params.studentEmail,
        authorRole: 'aluno',
        category: 'exam_submission',
        classIds: [selectedClass.id],
        submittedAt: new Date().toISOString(),
      });
      await gradeExamSubmission(created.id, {
        grade: params.grade,
        teacherFeedback: params.feedback,
        gradedBy: user.uid,
        gradePublished: true,
        autoGradeDetails: params.autoGradeDetails,
      });
    }
    loadSubmissions(selectedClass.id);
  };

  // Carregamento de arquivo (.sql ou .txt) para o modal de material pedagógico
  const handleMaterialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setMatContent(text);
        if (!matTitle.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          setMatTitle(cleanName);
        }
        showFeedback('success', `Arquivo "${file.name}" carregado com sucesso no campo SQL!`);
      }
    };
    reader.onerror = () => {
      showFeedback('error', 'Falha ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const msg = 'Você precisa estar autenticado para publicar materiais.';
      setModalError(msg);
      showFeedback('error', msg);
      return;
    }
    if (!matTitle.trim() || !matContent.trim()) {
      const msg = 'Título e código SQL são obrigatórios.';
      setModalError(msg);
      showFeedback('error', msg);
      return;
    }

    try {
      setIsSavingMaterial(true);
      setModalError(null);

      const isManagingNormalGlobal = Boolean(isAdmin && isNormalGlobalSelected);
      const cleanClassIds = isManagingNormalGlobal
        ? editingMaterial && !editingMaterial.id.startsWith('builtin-')
          ? Array.from(new Set([...(editingMaterial.classIds || []), NORMAL_GLOBAL_CLASS_ID]))
          : [NORMAL_GLOBAL_CLASS_ID]
        : matAllClasses
        ? ['all']
        : matClassIds.length > 0
        ? matClassIds
        : selectedClass
        ? [selectedClass.id]
        : ['all'];

      const effectiveCategory: SavedScriptCategory =
        isManagingNormalGlobal && matCategory === 'exam' ? 'exercise' : matCategory;
      const effectiveVisibleNormal = isManagingNormalGlobal ? true : matVisibleNormal;
      const effectiveVisibleClassroom = isManagingNormalGlobal ? false : matVisibleClassroom;
      const effectiveVisibleExam = isManagingNormalGlobal ? false : matVisibleExam;

      const authorRole: UserRole = userProfile?.role || (isAdmin ? 'admin' : 'professor');
      const authorName = userProfile?.displayName || user.displayName || 'Professor';
      const authorEmail = userProfile?.email || user.email || '';

      if (editingMaterial && !editingMaterial.id.startsWith('builtin-')) {
        await updateScript(editingMaterial.id, {
          title: matTitle.trim(),
          description: matDesc.trim(),
          content: matContent,
          category: effectiveCategory,
          classIds: cleanClassIds,
          visibleInNormal: effectiveVisibleNormal,
          visibleInClassroom: effectiveVisibleClassroom,
          visibleInExam: effectiveVisibleExam,
          ...(!isManagingNormalGlobal && effectiveCategory === 'exam'
            ? { answerKeySql: matAnswerKeySql }
            : {}),
        });
        showFeedback('success', `Material "${matTitle.trim()}" atualizado com sucesso!`);
      } else {
        await saveScript({
          title: matTitle.trim(),
          description: matDesc.trim(),
          content: matContent,
          authorUid: user.uid,
          authorName,
          authorEmail,
          authorRole,
          category: effectiveCategory,
          classIds: cleanClassIds,
          visibleInNormal: effectiveVisibleNormal,
          visibleInClassroom: effectiveVisibleClassroom,
          visibleInExam: effectiveVisibleExam,
          answerKeySql:
            !isManagingNormalGlobal && effectiveCategory === 'exam' ? matAnswerKeySql : undefined,
        });
        showFeedback(
          'success',
          isManagingNormalGlobal
            ? `Material "${matTitle.trim()}" publicado em Geral (Modo Normal)!`
            : `Material "${matTitle.trim()}" publicado com sucesso para a turma!`
        );
      }

      // Zera a janela e fecha o modal
      resetMaterialModal();
      if (isManagingNormalGlobal) {
        await loadNormalGlobalCatalog(false);
      } else {
        await loadClassMaterials();
      }
    } catch (err: any) {
      console.error('[handleSaveMaterialSubmit Error]', err);
      const errMsg = 'Erro ao salvar material: ' + (err?.message || 'Erro inesperado');
      setModalError(errMsg);
      showFeedback('error', errMsg);
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (item: SavedScriptItem) => {
    if (!window.confirm(`Deseja excluir o material "${item.title}"?`)) return;
    try {
      if (!item.id.startsWith('builtin-')) {
        await deleteScript(item.id);
      }
      setSelectedMaterialIds((prev) => prev.filter((id) => id !== item.id));
      showFeedback('success', `Material "${item.title}" excluído.`);
      if (isAdmin && isNormalGlobalSelected) {
        await loadNormalGlobalCatalog(false);
      } else {
        await loadClassMaterials();
      }
    } catch (err: any) {
      showFeedback('error', 'Erro ao excluir material.');
    }
  };

  const handleDeleteSelectedMaterials = async (currentFiltered: SavedScriptItem[]) => {
    const visibleSet = new Set(currentFiltered.map((m) => m.id));
    const targetIds = selectedMaterialIds.filter((id) => visibleSet.has(id));
    if (targetIds.length === 0) return;

    if (
      !window.confirm(
        `Deseja excluir permanentemente ${targetIds.length} ${
          targetIds.length === 1 ? 'material selecionado' : 'materiais selecionados'
        }?`
      )
    ) {
      return;
    }

    try {
      setIsDeletingBatchMaterials(true);
      const deletableIds = targetIds.filter((id) => !id.startsWith('builtin-'));
      await deleteScriptsBatch(deletableIds);
      setSelectedMaterialIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      showFeedback(
        'success',
        `${targetIds.length} ${
          targetIds.length === 1 ? 'material excluído' : 'materiais excluídos'
        } com sucesso!`
      );
      if (isAdmin && isNormalGlobalSelected) {
        await loadNormalGlobalCatalog(false);
      } else {
        await loadClassMaterials();
      }
    } catch (err: any) {
      console.error('[handleDeleteSelectedMaterials Error]', err);
      showFeedback('error', err?.message || 'Erro ao excluir materiais selecionados.');
    } finally {
      setIsDeletingBatchMaterials(false);
    }
  };

  // Filtragem de materiais da turma selecionada
  const filteredMaterials = materials.filter((m) => {
    if (materialCategoryFilter !== 'all' && m.category !== materialCategoryFilter) return false;
    if (!selectedClass) return true;
    const matchesClass = (m.classIds || []).includes('all') || (m.classIds || []).includes(selectedClass.id);
    return matchesClass;
  });

  // Filtragem de materiais do card "Geral (Modo Normal)" (sem categoria 'exam')
  const filteredNormalGlobalMaterials = normalGlobalMaterials
    .filter((m) => {
      if (m.category === 'exam') return false;
      if (materialCategoryFilter !== 'all' && m.category !== materialCategoryFilter) return false;
      return true;
    })
    .sort((a, b) => compareNamesPtBr(a.title, b.title));

  const getMemberDisplayName = (member: ClassMemberItem) =>
    formatStudentDisplayName(member.studentName, member.studentEmail);

  const getStudentDisplayName = (student: UserProfile) =>
    formatStudentDisplayName(student.displayName, student.email);

  const sortedClasses = [...classes].sort((a, b) => compareNamesPtBr(a.name, b.name));

  const approvedMembers = [...members]
    .filter((m) => m.status === 'approved')
    .sort((a, b) => compareNamesPtBr(getMemberDisplayName(a), getMemberDisplayName(b)));

  const pendingMembers = [...members]
    .filter((m) => m.status === 'pending')
    .sort((a, b) => compareNamesPtBr(getMemberDisplayName(a), getMemberDisplayName(b)));

  // Filtro da aba Disponíveis (alunos sem turma) ordenado alfabeticamente
  const filteredAvailableStudents = [...availableStudents]
    .filter((st) => {
      const term = availableSearch.trim().toLowerCase();
      if (!term) return true;
      const formattedName = getStudentDisplayName(st).toLowerCase();
      return (
        formattedName.includes(term) ||
        (st.displayName || '').toLowerCase().includes(term) ||
        (st.email || '').toLowerCase().includes(term) ||
        (st.registrationNumber || '').toLowerCase().includes(term) ||
        (st.course || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => compareNamesPtBr(getStudentDisplayName(a), getStudentDisplayName(b)));

  const allFilteredAvailableSelected =
    filteredAvailableStudents.length > 0 &&
    filteredAvailableStudents.every((s) => selectedAvailableUids.includes(s.uid));

  const currentMode = selectedClass?.classroomMode || 'normal';
  const chatEnabled = selectedClass?.chatEnabled !== false;
  const scriptSharingEnabled = selectedClass?.scriptSharingEnabled !== false;

  // Encapsulamento das ocorrências anti-trapaça por sessão de avaliação
  const activeExamSessionInfo = useMemo(
    () => ({
      id: selectedClass?.activeExamSessionId || null,
      label: selectedClass?.activeExamSessionLabel || null,
      startedAt: selectedClass?.activeExamStartedAt || null,
      isExamActive: currentMode === 'exam' && Boolean(selectedClass?.activeExamSessionId),
    }),
    [
      currentMode,
      selectedClass?.activeExamSessionId,
      selectedClass?.activeExamSessionLabel,
      selectedClass?.activeExamStartedAt,
    ]
  );

  const examAlertSessions = useMemo(
    () => groupExamAlertsBySession(examAlerts, activeExamSessionInfo),
    [examAlerts, activeExamSessionInfo]
  );

  // Sincroniza filtro da aba Alertas para focar na avaliação atual ao iniciar uma nova prova
  useEffect(() => {
    if (activeExamSessionInfo.isExamActive && activeExamSessionInfo.id) {
      setSelectedAlertSessionFilter(activeExamSessionInfo.id);
    } else {
      setSelectedAlertSessionFilter('all');
    }
  }, [selectedClass?.id, activeExamSessionInfo.isExamActive, activeExamSessionInfo.id]);

  const currentScopeAlerts = useMemo(() => {
    if (activeExamSessionInfo.isExamActive && activeExamSessionInfo.id) {
      return examAlerts.filter((a) => a.examSessionId === activeExamSessionInfo.id);
    }
    return examAlerts;
  }, [examAlerts, activeExamSessionInfo.isExamActive, activeExamSessionInfo.id]);

  const unackAlerts = currentScopeAlerts.filter((a) => !a.acknowledged);

  const visiblePanelAlerts = useMemo(() => {
    if (selectedAlertSessionFilter === 'all') return examAlerts;
    return examAlerts.filter(
      (a) => (a.examSessionId || '__legacy__') === selectedAlertSessionFilter
    );
  }, [examAlerts, selectedAlertSessionFilter]);

  const viewingStudentAllAlerts = useMemo(
    () =>
      viewingStudentAlerts
        ? examAlerts.filter((a) => a.studentUid === viewingStudentAlerts.uid)
        : [],
    [examAlerts, viewingStudentAlerts]
  );

  const viewingStudentSessions = useMemo(
    () =>
      viewingStudentAlerts
        ? groupExamAlertsBySession(viewingStudentAllAlerts, activeExamSessionInfo)
        : [],
    [viewingStudentAlerts, viewingStudentAllAlerts, activeExamSessionInfo]
  );

  const visibleStudentModalAlerts = useMemo(() => {
    if (studentAlertSessionFilter === 'all') return viewingStudentAllAlerts;
    return viewingStudentAllAlerts.filter(
      (a) => (a.examSessionId || '__legacy__') === studentAlertSessionFilter
    );
  }, [viewingStudentAllAlerts, studentAlertSessionFilter]);

  const handleAcknowledgeBatch = async (alertIds: string[]) => {
    if (alertIds.length === 0 || isAcknowledgingAlerts) return;
    try {
      setIsAcknowledgingAlerts(true);
      const count = await acknowledgeExamAlertsBatch(alertIds);
      showFeedback(
        'success',
        `${count} ${count === 1 ? 'ocorrência marcada' : 'ocorrências marcadas'} como ciente.`
      );
    } catch (err: any) {
      showFeedback('error', 'Erro ao marcar ocorrências como cientes: ' + (err?.message || 'Erro'));
    } finally {
      setIsAcknowledgingAlerts(false);
    }
  };
  const activeClassMessages = useMemo(
    () => classMessages.filter((m) => !m.archived),
    [classMessages]
  );
  const archivedClassMessages = useMemo(
    () => classMessages.filter((m) => Boolean(m.archived)),
    [classMessages]
  );
  const displayedChatMessages =
    chatArchiveTab === 'active' ? activeClassMessages : archivedClassMessages;
  const classDbMaterials = materials.filter(
    (m) =>
      m.category === 'class_database' &&
      selectedClass &&
      ((m.classIds || []).includes('all') || (m.classIds || []).includes(selectedClass.id))
  );
  const classExamMaterials = materials.filter(
    (m) =>
      m.category === 'exam' &&
      selectedClass &&
      ((m.classIds || []).includes('all') || (m.classIds || []).includes(selectedClass.id))
  );

  const handleAnswerKeyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setMatAnswerKeySql(ev.target.result);
        showFeedback('success', `Gabarito "${file.name}" carregado!`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Lista filtrada para o modal "Copiar do Modo Normal"
  const existingMaterialTitleSet = new Set(
    filteredMaterials.map((m) => m.title.trim().toLowerCase())
  );

  const filteredCopyNormalCatalog = normalCatalogForCopy
    .filter((item) => {
      if (item.category === 'exam') return false;
      if (copyNormalCategoryFilter !== 'all' && item.category !== copyNormalCategoryFilter) {
        return false;
      }
      const term = copyNormalSearch.trim().toLowerCase();
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => compareNamesPtBr(a.title, b.title));

  // Helper reutilizável para renderizar a lista de materiais com seleção múltipla e exclusão em lote
  const renderMaterialsSection = (params: {
    items: SavedScriptItem[];
    isLoading: boolean;
    isNormalGlobalMode: boolean;
  }) => {
    const { items, isLoading, isNormalGlobalMode } = params;
    const itemIdSet = new Set(items.map((m) => m.id));
    const selectedVisibleIds = selectedMaterialIds.filter((id) => itemIdSet.has(id));
    const allVisibleSelected = items.length > 0 && selectedVisibleIds.length === items.length;

    const categoryOptions = isNormalGlobalMode
      ? [
          { id: 'all', label: 'Todos' },
          { id: 'class_database', label: 'BDs Sala de Aula' },
          { id: 'example', label: 'Exemplos' },
          { id: 'exercise', label: 'Exercícios' },
          { id: 'solution', label: 'Soluções' },
        ]
      : [
          { id: 'all', label: 'Todos' },
          { id: 'class_database', label: 'BDs Sala de Aula' },
          { id: 'example', label: 'Exemplos' },
          { id: 'exercise', label: 'Exercícios' },
          { id: 'solution', label: 'Soluções' },
          { id: 'exam', label: 'Avaliações' },
        ];

    const toggleSelectAllVisible = () => {
      if (allVisibleSelected) {
        setSelectedMaterialIds((prev) => prev.filter((id) => !itemIdSet.has(id)));
      } else {
        setSelectedMaterialIds((prev) => Array.from(new Set([...prev, ...items.map((m) => m.id)])));
      }
    };

    const toggleSingleSelection = (id: string) => {
      setSelectedMaterialIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {categoryOptions.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setMaterialCategoryFilter(f.id);
                  setSelectedMaterialIds([]);
                }}
                type="button"
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  materialCategoryFilter === f.id
                    ? 'bg-[#FF6B00] text-black font-bold'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isNormalGlobalMode ? (
              <button
                onClick={handleRestoreNormalBuiltIns}
                type="button"
                disabled={isLoading}
                title="Restaurar BDs e soluções padrão caso algum tenha sido excluído"
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">restore</span>
                <span>Restaurar Padrões</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCopyNormalModal}
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Copiar BDs, Exemplos, Exercícios ou Soluções do Modo Normal para esta turma"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>Copiar do Modo Normal</span>
              </button>
            )}

            <button
              onClick={handleOpenNewMaterialModal}
              type="button"
              className="px-4 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8800] text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>+ Novo Material</span>
            </button>
          </div>
        </div>

        {/* Barra de Seleção Múltipla & Exclusão em Lote */}
        {!isLoading && items.length > 0 && (
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="rounded accent-[#FF6B00] cursor-pointer"
              />
              <span>Selecionar todos ({items.length})</span>
            </label>

            {selectedVisibleIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {selectedVisibleIds.length} selecionado(s)
                </span>
                <button
                  type="button"
                  disabled={isDeletingBatchMaterials}
                  onClick={() => handleDeleteSelectedMaterials(items)}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                  <span>
                    {isDeletingBatchMaterials
                      ? 'Excluindo...'
                      : `Excluir Selecionados (${selectedVisibleIds.length})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
            <span className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin inline-block" />
            <p>Carregando materiais pedagógicos...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-2">
            <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
              post_add
            </span>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {isNormalGlobalMode
                ? 'Nenhum material cadastrado em Geral (Modo Normal) nesta categoria.'
                : 'Nenhum material publicado para esta turma nesta categoria.'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isNormalGlobalMode
                ? 'Clique em + Novo Material ou Restaurar Padrões para adicionar itens ao Modo Normal.'
                : 'Clique em + Novo Material ou Copiar do Modo Normal para disponibilizar materiais.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((mat) => {
              const isAulaVisible = mat.visibleInClassroom !== false;
              const isExamVisible = mat.visibleInExam ?? mat.category === 'exam';
              const isChecked = selectedMaterialIds.includes(mat.id);

              return (
                <div
                  key={mat.id}
                  className={`p-2.5 px-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isChecked
                      ? 'bg-red-500/5 border-red-500/40'
                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[#FF6B00]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSingleSelection(mat.id)}
                      title="Selecionar material para exclusão em lote"
                      className="rounded accent-[#FF6B00] cursor-pointer shrink-0"
                    />

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] shrink-0 flex items-center gap-1">
                      {mat.category === 'class_database'
                        ? '🗄️ BD Aula'
                        : mat.category === 'example'
                        ? '💡 Exemplo'
                        : mat.category === 'exercise'
                        ? '📝 Exercício'
                        : mat.category === 'solution'
                        ? '✅ Solução'
                        : '🎯 Avaliação'}
                    </span>

                    {!isNormalGlobalMode && mat.visibleInNormal && (
                      <span
                        title="Também disponível no Modo Normal"
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0"
                      >
                        Normal
                      </span>
                    )}

                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <h4
                        className="font-bold text-xs text-[var(--text-primary)] truncate"
                        title={mat.title}
                      >
                        {mat.title}
                      </h4>
                      {mat.description && (
                        <span
                          className="text-[11px] text-[var(--text-secondary)] truncate hidden md:inline max-w-[280px]"
                          title={mat.description}
                        >
                          — {mat.description}
                        </span>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                      <span>{mat.content.split('\n').length} linhas</span>
                      {!isNormalGlobalMode && (
                        <>
                          <span>•</span>
                          <span>
                            {(mat.classIds || []).includes('all')
                              ? '🌐 Todas'
                              : `Turmas: ${(mat.classIds || []).length}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {!isNormalGlobalMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleMaterialClassroomVisibility(mat)}
                          title={
                            isAulaVisible
                              ? 'Modo Sala de Aula: VISÍVEL para os alunos (clique para ocultar)'
                              : 'Modo Sala de Aula: INVISÍVEL para os alunos (clique para tornar visível)'
                          }
                          aria-label="Alternar visibilidade no Modo Sala de Aula"
                          className={`p-1.5 px-2 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shadow-sm ${
                            isAulaVisible
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isAulaVisible ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMaterialExamVisibility(mat)}
                          title={
                            isExamVisible
                              ? 'Modo Avaliação: VISÍVEL na prova (clique para ocultar)'
                              : 'Modo Avaliação: INVISÍVEL na prova (clique para liberar na prova)'
                          }
                          aria-label="Alternar visibilidade no Modo Avaliação"
                          className={`p-1.5 px-2 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shadow-sm ${
                            isExamVisible
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isExamVisible ? 'quiz' : 'visibility_off'}
                          </span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenEditMaterialModal(mat)}
                      type="button"
                      title="Editar Material"
                      aria-label="Editar Material"
                      className="p-1.5 px-2 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[#0288D1] hover:border-[#0288D1]/40 cursor-pointer flex items-center justify-center transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteMaterial(mat)}
                      type="button"
                      title="Excluir Material"
                      aria-label="Excluir Material"
                      className="p-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 cursor-pointer flex items-center justify-center transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-y-auto">
      {/* Toast Feedback - z-[999999] para sobrepor modais e backdrops */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-[999999] p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 border ${
            feedback.type === 'success'
              ? 'bg-[var(--bg-surface)] text-emerald-400 border-emerald-500/40 shadow-emerald-950/40'
              : 'bg-[var(--bg-surface)] text-red-500 border-red-500/40 shadow-red-950/40'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Cabeçalho do Painel do Professor */}
      <header className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/80 backdrop-blur-md sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWorkspace}
            type="button"
            className="p-2 rounded-xl border border-[var(--border-color)] hover:border-[#FF6B00] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Laboratório</span>
          </button>
          <div className="h-5 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0288D1]/15 text-[#29B6F6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">co_present</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                Painel do Professor • Gestão de Turmas
                <span className="px-2 py-0.5 rounded-full bg-[#0288D1]/15 text-[#29B6F6] text-[10px] font-bold">
                  {isAdmin ? 'Admin / Docente' : 'Docente Autorizado'}
                </span>
              </h1>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Controle o modo de sala de aula, avaliações em tempo real e materiais didáticos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0288D1] to-[#29B6F6] hover:brightness-110 text-white font-bold text-xs shadow-[0_0_15px_rgba(2,136,209,0.3)] flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Nova Turma</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-6 max-w-[1520px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista de Turmas (Mais estreita - 3 Colunas) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0288D1] text-[18px]">school</span>
              <span>Minhas Turmas ({classes.length})</span>
            </h2>
            <button
              onClick={loadTeacherClasses}
              title="Atualizar lista"
              className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {/* Card Especial do Administrador: Geral (Modo Normal) */}
          {isAdmin && (
            <div
              onClick={handleSelectNormalGlobal}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isNormalGlobalSelected
                  ? 'bg-sky-950/35 border-sky-400 shadow-lg shadow-sky-500/15'
                  : 'bg-[var(--bg-surface)]/80 border-sky-500/30 hover:border-sky-400/70 hover:bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-sky-400 text-[18px]">
                      public
                    </span>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                      Geral (Modo Normal)
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
                    BDs Aula, Soluções, Exemplos e Exercícios públicos
                  </p>
                </div>

                <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/35 text-[10px] font-bold text-sky-300 shrink-0">
                  Sem Login / Normal
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-3 pt-2.5 border-t border-[var(--border-color)]/50">
                <span>Catálogo Global</span>
                <span className="font-semibold text-sky-300">
                  {normalGlobalMaterials.length}{' '}
                  {normalGlobalMaterials.length === 1 ? 'material' : 'materiais'}
                </span>
              </div>
            </div>
          )}

          {isLoadingClasses ? (
            <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-2">
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-[var(--text-secondary)]">Carregando turmas...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="p-6 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-3">
              <span className="material-symbols-outlined text-[36px] text-[var(--text-muted)]">
                folder_off
              </span>
              <p className="text-xs text-[var(--text-secondary)]">
                Você ainda não possui nenhuma turma criada.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-[#0288D1] text-white text-xs font-bold hover:brightness-110 transition-colors cursor-pointer"
              >
                Criar Primeira Turma
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedClasses.map((c) => {
                const isSelected = !isNormalGlobalSelected && selectedClass?.id === c.id;
                const cMode = c.classroomMode || 'normal';
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setIsNormalGlobalSelected(false);
                      setSelectedMaterialIds([]);
                      setSelectedClass(c);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-[var(--bg-surface)] border-[#0288D1] shadow-lg shadow-[#0288D1]/10'
                        : 'bg-[var(--bg-surface)]/60 border-[var(--border-color)] hover:border-[var(--border-color)]/80 hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {c.name}
                          </h3>
                          {cMode === 'exam' ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🎯 Avaliação
                            </span>
                          ) : cMode === 'classroom' ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🏫 Sala de Aula
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {c.course}
                        </p>
                      </div>

                      <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[#FF6B00]">
                        {c.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-3 pt-2.5 border-t border-[var(--border-color)]/50">
                      <span>Criada em {new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {c.studentCount ?? 0} alunos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Geral (Modo Normal) ou Detalhes, Modos e Materiais da Turma Selecionada */}
        <div className="lg:col-span-9">
          {isAdmin && isNormalGlobalSelected ? (
            <div className="bg-[var(--bg-surface)] border border-sky-500/40 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">public</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Geral (Modo Normal)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        Público • Modo Normal e Sem Login
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Gestão centralizada dos BDs de Aula, Soluções, Exemplos e Exercícios exibidos globalmente no Modo Normal e para visitantes sem login.
                    </p>
                  </div>
                </div>
              </div>

              {renderMaterialsSection({
                items: filteredNormalGlobalMaterials,
                isLoading: isLoadingNormalGlobal,
                isNormalGlobalMode: true,
              })}
            </div>
          ) : selectedClass ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl space-y-6">
              {/* Header do Card da Turma Selecionada */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedClass.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedClass.active !== false
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {selectedClass.active !== false ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {selectedClass.course} {selectedClass.description ? `• ${selectedClass.description}` : ''}
                  </p>
                </div>

                {/* Ações da Turma: Código de Acesso + Editar e Excluir */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[var(--text-muted)] leading-none">
                        Código
                      </p>
                      <p className="text-sm font-mono font-bold text-[#FF6B00] tracking-wider leading-tight">
                        {selectedClass.code}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyCode(selectedClass.code)}
                      type="button"
                      className="p-1.5 rounded-xl bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] transition-colors cursor-pointer"
                      title="Copiar código de acesso para enviar aos alunos"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedCode === selectedClass.code ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(selectedClass)}
                    type="button"
                    title="Editar Turma"
                    aria-label="Editar Turma"
                    className="p-2 sm:px-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[#0288D1] hover:bg-[#0288D1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#0288D1]">edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteClass(selectedClass)}
                    type="button"
                    disabled={isDeletingClass}
                    title="Excluir Turma"
                    aria-label="Excluir Turma"
                    className="p-2 sm:px-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              {/* SELETOR DE MODOS EM TEMPO REAL: Normal | Sala de Aula | Avaliação */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px] text-[#FF6B00]">tune</span>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      Modo Operacional da Turma
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Alterne em tempo real o que os alunos veem no laboratório SQL
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor com 3 opções */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <button
                      type="button"
                      disabled={isChangingMode}
                      onClick={() => requestModeChange('normal', false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentMode === 'normal'
                          ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Normal
                    </button>

                    <button
                      type="button"
                      disabled={isChangingMode}
                      onClick={() => requestModeChange('classroom', false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        currentMode === 'classroom'
                          ? 'bg-emerald-500 text-white shadow font-bold'
                          : 'text-[var(--text-muted)] hover:text-emerald-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">school</span>
                      <span>Sala de Aula</span>
                    </button>

                    <button
                      type="button"
                      disabled={isChangingMode}
                      onClick={() => requestModeChange('exam', false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        currentMode === 'exam'
                          ? 'bg-purple-600 text-white shadow font-bold animate-pulse'
                          : 'text-[var(--text-muted)] hover:text-purple-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">quiz</span>
                      <span>Avaliação</span>
                    </button>
                  </div>

                  {/* Ação em Lote */}
                  {classes.length > 1 && (
                    <button
                      type="button"
                      disabled={isChangingMode}
                      onClick={() => requestModeChange(currentMode, true)}
                      title={`Aplicar modo "${currentMode.toUpperCase()}" a todas as minhas ${classes.length} turmas`}
                      className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:border-[#FF6B00] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer"
                    >
                      🌐 Aplicar a Todas
                    </button>
                  )}
                </div>
              </div>

              {/* BANNER DE ALERTAS ANTI-TRAPAÇA EM TEMPO REAL (SE HOUVER OCORRÊNCIAS) */}
              {unackAlerts.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex flex-wrap items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[22px] text-rose-400">warning</span>
                    <div>
                      <p className="text-xs font-bold text-rose-300">
                        ⚠️ {unackAlerts.length} alerta(s) anti-trapaça detectado(s) nesta turma!
                      </p>
                      <p className="text-[11px] text-rose-200/80">
                        Último: <strong>{formatStudentDisplayName(unackAlerts[0].studentName, unackAlerts[0].studentEmail)}</strong> — {unackAlerts[0].details}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveResourcePanel('alerts')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Ver Ocorrências
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMonitoringStudent({
                          uid: unackAlerts[0].studentUid,
                          name: formatStudentDisplayName(unackAlerts[0].studentName, unackAlerts[0].studentEmail),
                          email: unackAlerts[0].studentEmail,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer"
                    >
                      Ver Tela do Aluno
                    </button>
                  </div>
                </div>
              )}

              {/* CONTROLES DE COMUNICAÇÃO E RECURSOS PEDAGÓGICOS */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Escrito à Esquerda */}
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[22px] text-[#FF6B00]">folder_special</span>
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        Materiais, Comunicação &amp; Provas
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Gerencie conteúdos, chat da sala, scripts compartilhados e monitoramento de avaliação
                      </p>
                    </div>
                  </div>

                  {/* Controles rápidos de Chat e Compartilhamento */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleClassSetting('chatEnabled')}
                      title="Ligar ou desligar o Chat dos alunos nesta turma"
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        chatEnabled
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {chatEnabled ? 'chat' : 'speaker_notes_off'}
                      </span>
                      <span>Chat: {chatEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleClassSetting('scriptSharingEnabled')}
                      title="Permitir ou bloquear compartilhamento de scripts entre alunos"
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        scriptSharingEnabled
                          ? 'bg-sky-500/15 border-sky-500/35 text-sky-400'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {scriptSharingEnabled ? 'share' : 'block'}
                      </span>
                      <span>Scripts: {scriptSharingEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Pill com painéis expansíveis */}
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                      {/* Botão Materiais & BDs */}
                      <button
                        type="button"
                        onClick={() => setActiveResourcePanel((prev) => (prev === 'materials' ? null : 'materials'))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeResourcePanel === 'materials'
                            ? 'bg-[#FF6B00] text-black shadow font-bold'
                            : 'text-[var(--text-muted)] hover:text-[#FF6B00]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                        <span>Materiais &amp; BDs</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          activeResourcePanel === 'materials' ? 'bg-black/20 text-black' : 'bg-[#FF6B00]/15 text-[#FF6B00]'
                        }`}>
                          {filteredMaterials.length}
                        </span>
                      </button>

                      {/* Botão Entrega de Provas */}
                      <button
                        type="button"
                        onClick={() => setActiveResourcePanel((prev) => (prev === 'submissions' ? null : 'submissions'))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeResourcePanel === 'submissions'
                            ? 'bg-purple-600 text-white shadow font-bold'
                            : 'text-[var(--text-muted)] hover:text-purple-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">assignment_turned_in</span>
                        <span>Provas</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          activeResourcePanel === 'submissions' ? 'bg-white/20 text-white' : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          {submissions.length}
                        </span>
                      </button>

                      {/* Botão Chat & Mensagens Trafegadas */}
                      <button
                        type="button"
                        onClick={() => setActiveResourcePanel((prev) => (prev === 'chat' ? null : 'chat'))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeResourcePanel === 'chat'
                            ? 'bg-[#0288D1] text-white shadow font-bold'
                            : 'text-[var(--text-muted)] hover:text-[#29B6F6]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">forum</span>
                        <span>Chat Geral</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          activeResourcePanel === 'chat' ? 'bg-white/20 text-white' : 'bg-sky-500/15 text-sky-400'
                        }`}>
                          {activeClassMessages.length}
                        </span>
                      </button>

                      {/* Botão Alertas Anti-Trapaça */}
                      <button
                        type="button"
                        onClick={() => setActiveResourcePanel((prev) => (prev === 'alerts' ? null : 'alerts'))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeResourcePanel === 'alerts'
                            ? 'bg-rose-600 text-white shadow font-bold'
                            : unackAlerts.length > 0
                            ? 'text-rose-400 animate-pulse'
                            : 'text-[var(--text-muted)] hover:text-rose-400'
                        }`}
                        title={
                          activeExamSessionInfo.isExamActive
                            ? `Alertas da avaliação ativa: ${activeExamSessionInfo.label || 'Avaliação Atual'} (histórico total: ${examAlerts.length})`
                            : 'Histórico de alertas anti-trapaça encapsulado por avaliação'
                        }
                      >
                        <span className="material-symbols-outlined text-[14px]">security</span>
                        <span>Alertas</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          activeResourcePanel === 'alerts'
                            ? 'bg-white/20 text-white'
                            : unackAlerts.length > 0
                            ? 'bg-rose-500 text-white'
                            : 'bg-zinc-500/15 text-[var(--text-muted)]'
                        }`}>
                          {currentScopeAlerts.length}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PAINEL EXPANSÍVEL: MATERIAIS & BDS */}
                {activeResourcePanel === 'materials' && (
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-4 animate-in fade-in duration-150">
                    {renderMaterialsSection({
                      items: filteredMaterials,
                      isLoading: isLoadingMaterials,
                      isNormalGlobalMode: false,
                    })}
                  </div>
                )}

                {/* PAINEL EXPANSÍVEL: ENTREGAS DE PROVAS */}
                {activeResourcePanel === 'submissions' && (
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
                    {isLoadingSubmissions ? (
                      <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                        <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                        <p>Carregando resoluções de provas dos alunos...</p>
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-2">
                        <span className="material-symbols-outlined text-[32px] text-purple-400">
                          quiz
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                          Nenhuma entrega de avaliação registrada para esta turma ainda.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Quando os alunos clicarem em <strong>Entregar Avaliação</strong> durante o modo de prova, suas resoluções completas aparecerão aqui.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                            <tr>
                              <th className="px-4 py-3">Aluno</th>
                              <th className="px-4 py-3">Avaliação</th>
                              <th className="px-4 py-3">Data/Hora</th>
                              <th className="px-4 py-3">Nota</th>
                              <th className="px-4 py-3 text-right">Correção</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {submissions.map((sub) => (
                              <tr key={sub.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-[var(--text-primary)]">{sub.authorName}</div>
                                  <div className="font-mono text-[10px] text-[var(--text-muted)]">{sub.authorEmail}</div>
                                </td>
                                <td className="px-4 py-3 text-[var(--text-primary)]">{sub.title}</td>
                                <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-[11px]">
                                  {new Date(sub.submittedAt || sub.createdAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 py-3">
                                  {sub.grade !== undefined ? (
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                                        sub.gradePublished
                                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                                          : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                                      }`}
                                    >
                                      {Number(sub.grade).toFixed(1)} {sub.gradePublished ? '✓' : '(rascunho)'}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-[var(--text-muted)]">Pendente</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSubmission(sub)}
                                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] cursor-pointer shadow flex items-center gap-1.5 ml-auto"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">grading</span>
                                    <span>Avaliar / Corrigir</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* PAINEL EXPANSÍVEL: AUDITORIA DE CHAT & MENSAGENS DA TURMA */}
                {activeResourcePanel === 'chat' && (
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-[#29B6F6] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                          <span>Mensagens &amp; Scripts da Turma</span>
                        </p>

                        <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-color)]">
                          <button
                            type="button"
                            onClick={() => setChatArchiveTab('active')}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              chatArchiveTab === 'active'
                                ? 'bg-[#0288D1] text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            Ativas ({activeClassMessages.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setChatArchiveTab('archived')}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              chatArchiveTab === 'archived'
                                ? 'bg-amber-500 text-black shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            Arquivadas ({archivedClassMessages.length})
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={displayedChatMessages.length === 0 || isProcessingChatAction}
                          onClick={() =>
                            handleExportChatMarkdown(
                              displayedChatMessages,
                              chatArchiveTab === 'active' ? 'Ativas' : 'Arquivadas'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Baixar histórico destas mensagens em Markdown (.md)"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>Baixar (.md)</span>
                        </button>

                        {chatArchiveTab === 'active' ? (
                          <button
                            type="button"
                            disabled={activeClassMessages.length === 0 || isProcessingChatAction}
                            onClick={() =>
                              handleToggleArchiveMessages(
                                activeClassMessages.map((m) => m.id),
                                true,
                                `Arquivar todas as ${activeClassMessages.length} mensagens ativas desta turma? Elas ficarão ocultas no chat dos alunos e acessíveis na aba "Arquivadas".`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Arquivar todas as mensagens ativas da turma"
                          >
                            <span className="material-symbols-outlined text-[14px]">archive</span>
                            <span>Arquivar Todas</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={archivedClassMessages.length === 0 || isProcessingChatAction}
                            onClick={() =>
                              handleToggleArchiveMessages(
                                archivedClassMessages.map((m) => m.id),
                                false,
                                `Restaurar todas as ${archivedClassMessages.length} mensagens arquivadas para o chat ativo da turma?`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Restaurar todas as mensagens arquivadas para o chat ativo"
                          >
                            <span className="material-symbols-outlined text-[14px]">unarchive</span>
                            <span>Restaurar Todas</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={displayedChatMessages.length === 0 || isProcessingChatAction}
                          onClick={() =>
                            handleDeleteAllMessagesInTab(
                              displayedChatMessages,
                              chatArchiveTab === 'active' ? 'ativas' : 'arquivadas'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Excluir permanentemente todas as mensagens desta aba"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                          <span>Excluir Todas</span>
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-3">
                      {displayedChatMessages.length === 0 ? (
                        <p className="text-center text-xs text-[var(--text-muted)] py-6">
                          {chatArchiveTab === 'active'
                            ? 'Nenhuma mensagem ativa registrada nesta turma.'
                            : 'Nenhuma mensagem arquivada nesta turma.'}
                        </p>
                      ) : (
                        displayedChatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-[#FF6B00]">{msg.senderName}</span>
                                <span className="text-[var(--text-muted)]">➔</span>
                                <span className="font-bold text-[#29B6F6]">
                                  {msg.recipientUid === 'all' ? '🌐 Toda a Turma' : msg.recipientName || 'Privado'}
                                </span>
                                {msg.type === 'script' && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
                                    📄 Script: {msg.scriptTitle}
                                  </span>
                                )}
                                {msg.archived && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
                                    Arquivada
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[var(--text-muted)]">
                                  {new Date(msg.createdAt).toLocaleString('pt-BR')}
                                </span>
                                {msg.archived && (
                                  <button
                                    type="button"
                                    disabled={isProcessingChatAction}
                                    onClick={() => handleToggleArchiveMessages([msg.id], false)}
                                    className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer disabled:opacity-40"
                                    title="Restaurar mensagem para o chat ativo"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">unarchive</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isProcessingChatAction}
                                  onClick={() => handleDeleteSingleMessage(msg)}
                                  className="p-1 rounded-md text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer disabled:opacity-40"
                                  title="Excluir esta mensagem"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-[var(--text-primary)] whitespace-pre-wrap">{msg.text}</p>
                            {msg.type === 'script' && msg.scriptContent && (
                              <pre className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[10px] text-[var(--text-secondary)] max-h-24 overflow-y-auto">
                                {msg.scriptContent}
                              </pre>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {chatArchiveTab === 'active' && (
                      <form onSubmit={handleSendTeacherChat} className="flex flex-wrap items-center gap-2">
                        <select
                          value={teacherChatTarget}
                          onChange={(e) => setTeacherChatTarget(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                        >
                          <option value="all">🌐 Para Toda a Turma</option>
                          {approvedMembers.map((m) => (
                            <option key={m.studentUid} value={m.studentUid}>
                              👤 Privado: {m.studentName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={teacherChatText}
                          onChange={(e) => setTeacherChatText(e.target.value)}
                          placeholder="Enviar aviso ou resposta como professor..."
                          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingTeacherChat || !teacherChatText.trim()}
                          className="px-4 py-2 rounded-xl bg-[#0288D1] hover:bg-[#0277BD] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          Enviar
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* PAINEL EXPANSÍVEL: ALERTAS ANTI-TRAPAÇA ENCAPSULADOS POR AVALIAÇÃO */}
                {activeResourcePanel === 'alerts' && (() => {
                  const unackInFilterIds = visiblePanelAlerts
                    .filter((a) => !a.acknowledged)
                    .map((a) => a.id);
                  return (
                    <div className="pt-3 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[var(--text-secondary)] mr-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-purple-400">
                              inventory_2
                            </span>
                            <span>Avaliação:</span>
                          </span>

                          {examAlertSessions.map((session) => {
                            const isSelected = selectedAlertSessionFilter === session.sessionId;
                            return (
                              <button
                                key={session.sessionId}
                                type="button"
                                onClick={() => setSelectedAlertSessionFilter(session.sessionId)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-500 shadow'
                                    : session.isCurrentActive
                                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <span>{session.sessionLabel}</span>
                                <span
                                  className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                    session.isCurrentActive
                                      ? isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-zinc-500/20 text-[var(--text-muted)]'
                                  }`}
                                >
                                  {session.isCurrentActive ? 'Em andamento' : 'Encerrada'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    session.unackCount > 0
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-black/20 text-current'
                                  }`}
                                >
                                  {session.alerts.length}
                                </span>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => setSelectedAlertSessionFilter('all')}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              selectedAlertSessionFilter === 'all'
                                ? 'bg-[#0288D1] text-white border-[#0288D1] shadow'
                                : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                            }`}
                          >
                            <span>Todas ({examAlerts.length})</span>
                          </button>
                        </div>

                        {unackInFilterIds.length > 0 && (
                          <button
                            type="button"
                            disabled={isAcknowledgingAlerts}
                            onClick={() => handleAcknowledgeBatch(unackInFilterIds)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[14px]">done_all</span>
                            <span>Marcar todas como cientes ({unackInFilterIds.length})</span>
                          </button>
                        )}
                      </div>

                      {visiblePanelAlerts.length === 0 ? (
                        <div className="p-6 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl text-xs text-[var(--text-muted)]">
                          {selectedAlertSessionFilter === 'all'
                            ? 'Nenhuma infração ou comportamento suspeito registrado nesta turma.'
                            : 'Nenhuma ocorrência registrada nesta sessão de avaliação até o momento.'}
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto space-y-2">
                          {visiblePanelAlerts.map((al) => (
                            <div
                              key={al.id}
                              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                                al.acknowledged
                                  ? 'bg-[var(--bg-surface)] border-[var(--border-color)] opacity-65'
                                  : 'bg-rose-500/10 border-rose-500/40'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-bold text-[var(--text-primary)]">
                                    {al.studentName}{' '}
                                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                      ({al.studentEmail})
                                    </span>{' '}
                                    •{' '}
                                    <span className="text-rose-400">
                                      {EXAM_ALERT_TYPE_LABELS[al.type] || al.type}
                                    </span>
                                  </p>
                                  <span className="px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
                                    📌 {al.examSessionLabel || 'Avaliações Anteriores'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)]">{al.details}</p>
                                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                  {new Date(al.createdAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMonitoringStudent({
                                      uid: al.studentUid,
                                      name: al.studentName,
                                      email: al.studentEmail,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0288D1]/15 border border-[#0288D1]/40 text-[#29B6F6] text-[11px] font-bold cursor-pointer"
                                >
                                  Ver Tela
                                </button>
                                {!al.acknowledged && (
                                  <button
                                    type="button"
                                    onClick={() => acknowledgeExamAlert(al.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[11px] font-bold cursor-pointer"
                                  >
                                    Ciente
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ÁREA DE ALUNOS DA TURMA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveStudentTab('members')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeStudentTab === 'members'
                        ? 'bg-[#0288D1] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    <span>Matriculados ({approvedMembers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStudentTab('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeStudentTab === 'pending'
                        ? 'bg-amber-500 text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                    <span>Solicitações Pendentes</span>
                    {pendingMembers.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {pendingMembers.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStudentTab('admit')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeStudentTab === 'admit'
                        ? 'bg-gradient-to-r from-[#0288D1] to-[#29B6F6] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Admitir por E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveStudentTab('available');
                      loadAvailableStudents();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeStudentTab === 'available'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    <span>Disponíveis ({availableStudents.length})</span>
                  </button>
                </div>

              {/* 1. ABA DE MATRICULADOS */}
              {activeStudentTab === 'members' && (
                <div className="space-y-3">
                  {isLoadingMembers ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                      <p>Carregando alunos da turma...</p>
                    </div>
                  ) : approvedMembers.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-2">
                      <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
                        person_search
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] font-medium">
                        Nenhum aluno aprovado nesta turma ainda.
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Compartilhe o código <strong className="text-[#FF6B00] font-mono">{selectedClass.code}</strong> com a turma ou adicione alunos diretamente pelo e-mail.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-4 py-3">Aluno</th>
                            <th className="px-4 py-3">E-mail</th>
                            <th className="px-4 py-3">Matrícula</th>
                            <th className="px-4 py-3">Data de Entrada</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {approvedMembers.map((member) => {
                            const pres = presenceList.find((p) => p.uid === member.studentUid);
                            const live = liveStates.find((s) => s.studentUid === member.studentUid);
                            const studentAllAlerts = examAlerts.filter(
                              (a) => a.studentUid === member.studentUid
                            );
                            const studentSessionAlerts = activeExamSessionInfo.isExamActive
                              ? studentAllAlerts.filter(
                                  (a) => a.examSessionId === activeExamSessionInfo.id
                                )
                              : studentAllAlerts;
                            const studentAlerts = studentSessionAlerts.filter((a) => !a.acknowledged);
                            const studentAlertBadgeCount = activeExamSessionInfo.isExamActive
                              ? studentSessionAlerts.length
                              : studentAllAlerts.length;
                            return (
                              <tr key={member.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        pres?.isOnline
                                          ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]'
                                          : 'bg-zinc-500'
                                      }`}
                                      title={pres?.isOnline ? 'Online agora no SQLEditor' : 'Offline'}
                                    />
                                    <span>{getMemberDisplayName(member)}</span>
                                    {live?.isFrozen && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 text-[9px] font-bold">
                                        ❄️ Congelado
                                      </span>
                                    )}
                                    {studentAlerts.length > 0 && (
                                      <span
                                        className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold animate-pulse"
                                        title={`${studentAlerts.length} alerta(s) anti-trapaça`}
                                      >
                                        ⚠️ {studentAlerts.length}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                                  {member.studentEmail}
                                </td>
                                <td className="px-4 py-3 font-mono text-[var(--text-muted)]">
                                  {member.studentRegistration || '---'}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-muted)]">
                                  {member.approvedAt
                                    ? new Date(member.approvedAt).toLocaleDateString('pt-BR')
                                    : '---'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMonitoringStudent({
                                          uid: member.studentUid,
                                          name: getMemberDisplayName(member),
                                          email: member.studentEmail,
                                        })
                                      }
                                      title="Ver tela e código SQL ao vivo do aluno para avaliação e nota"
                                      className="px-2.5 py-1 rounded-lg bg-[#0288D1]/15 hover:bg-[#0288D1]/25 text-[#29B6F6] border border-[#0288D1]/35 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">desktop_windows</span>
                                      <span>Ver Tela</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStudentAlertSessionFilter(
                                          activeExamSessionInfo.isExamActive && activeExamSessionInfo.id
                                            ? activeExamSessionInfo.id
                                            : 'all'
                                        );
                                        setViewingStudentAlerts({
                                          uid: member.studentUid,
                                          name: getMemberDisplayName(member),
                                          email: member.studentEmail,
                                        });
                                      }}
                                      title={
                                        activeExamSessionInfo.isExamActive
                                          ? `Ocorrências na avaliação atual (${studentSessionAlerts.length}) • Total histórico (${studentAllAlerts.length})`
                                          : `Ver ocorrências anti-trapaça do aluno encapsuladas por avaliação (${studentAllAlerts.length} no histórico)`
                                      }
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                        studentAlerts.length > 0
                                          ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/40 animate-pulse'
                                          : studentAlertBadgeCount > 0
                                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
                                          : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-color)]'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[14px]">security</span>
                                      <span>Ocorrências</span>
                                      {studentAlertBadgeCount > 0 && (
                                        <span
                                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                                            studentAlerts.length > 0
                                              ? 'bg-rose-500 text-white'
                                              : 'bg-amber-500/25 text-amber-200'
                                          }`}
                                        >
                                          {studentAlertBadgeCount}
                                        </span>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStudent(member)}
                                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. ABA DE SOLICITAÇÕES PENDENTES */}
              {activeStudentTab === 'pending' && (
                <div className="space-y-3">
                  {pendingMembers.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-2">
                      <span className="material-symbols-outlined text-[32px] text-emerald-400">
                        task_alt
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] font-medium">
                        Todas as solicitações de alunos foram atendidas!
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Quando um aluno informar o código <strong className="text-[#FF6B00] font-mono">{selectedClass.code}</strong>, ele aparecerá aqui para sua validação.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingMembers.map((member) => (
                        <div
                          key={member.id}
                          className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-amber-500/30 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                                {getMemberDisplayName(member)}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                                Aguardando Aprovação
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                              {member.studentEmail} {member.studentRegistration ? `• Matrícula: ${member.studentRegistration}` : ''}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                              Solicitou entrada em: {new Date(member.requestedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveStudent(member)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>Aprovar Matrícula</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(member)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. ABA DE ADMITIR POR E-MAIL */}
              {activeStudentTab === 'admit' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#0288D1]">
                        mail
                      </span>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        Matricular Aluno Imediatamente pelo E-mail
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Se o aluno já criou sua conta no SQLEditor (via Google ou e-mail), digite o e-mail cadastrado dele abaixo para vinculá-lo diretamente a esta turma sem necessidade de aprovação pendente.
                    </p>

                    <form onSubmit={handleAdmitByEmail} className="flex gap-2 pt-1">
                      <input
                        type="email"
                        required
                        value={admitEmail}
                        onChange={(e) => setAdmitEmail(e.target.value)}
                        placeholder="email.do.aluno@provedor.com"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1]"
                      />
                      <button
                        type="submit"
                        disabled={isAdmittingEmail || !admitEmail.trim()}
                        className="px-5 py-2.5 rounded-xl bg-[#0288D1] hover:bg-[#0288D1]/80 text-white font-bold text-xs shadow disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isAdmittingEmail ? 'Admitindo...' : 'Admitir Aluno'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* 4. ABA DE ALUNOS DISPONÍVEIS (SEM TURMA) */}
              {activeStudentTab === 'available' && (
                <div className="space-y-3">
                  {/* Barra de Busca + Ação em Lote */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="relative flex-1 min-w-[220px]">
                      <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2">
                        search
                      </span>
                      <input
                        type="text"
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        placeholder="Buscar por nome, e-mail, matrícula ou curso..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadAvailableStudents}
                        disabled={isLoadingAvailable}
                        title="Atualizar lista de alunos disponíveis"
                        className="p-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            isLoadingAvailable ? 'animate-spin' : ''
                          }`}
                        >
                          refresh
                        </span>
                      </button>

                      {selectedAvailableUids.length > 0 && (
                        <button
                          type="button"
                          disabled={isAdmittingAvailable}
                          onClick={handleAdmitSelectedAvailable}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">group_add</span>
                          <span>
                            {isAdmittingAvailable
                              ? 'Inserindo...'
                              : `Inserir Selecionados (${selectedAvailableUids.length})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoadingAvailable ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                      <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                      <p>Buscando alunos disponíveis sem turma...</p>
                    </div>
                  ) : filteredAvailableStudents.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-2">
                      <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
                        {availableStudents.length === 0 ? 'done_all' : 'person_off'}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] font-medium">
                        {availableStudents.length === 0
                          ? 'Todos os alunos cadastrados na plataforma já estão vinculados a uma turma!'
                          : 'Nenhum aluno encontrado para o filtro digitado.'}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {availableStudents.length === 0
                          ? 'Assim que novos alunos se cadastrarem ou saírem de turmas, aparecerão automaticamente aqui.'
                          : 'Tente limpar a busca para visualizar todos os alunos disponíveis.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={allFilteredAvailableSelected}
                                onChange={() => {
                                  if (allFilteredAvailableSelected) {
                                    const filteredSet = new Set(
                                      filteredAvailableStudents.map((s) => s.uid)
                                    );
                                    setSelectedAvailableUids((prev) =>
                                      prev.filter((id) => !filteredSet.has(id))
                                    );
                                  } else {
                                    const merged = new Set([
                                      ...selectedAvailableUids,
                                      ...filteredAvailableStudents.map((s) => s.uid),
                                    ]);
                                    setSelectedAvailableUids(Array.from(merged));
                                  }
                                }}
                                title="Selecionar todos da lista"
                                className="rounded accent-emerald-500 cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-3">Aluno</th>
                            <th className="px-4 py-3">E-mail</th>
                            <th className="px-4 py-3">Matrícula</th>
                            <th className="px-4 py-3">Curso</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {filteredAvailableStudents.map((student) => {
                            const isChecked = selectedAvailableUids.includes(student.uid);
                            const isBusy =
                              admittingSingleUid === student.uid ||
                              (isAdmittingAvailable && isChecked);
                            const isHighlighted = highlightedAvailableUid === student.uid;
                            return (
                              <tr
                                key={student.uid}
                                data-available-row-uid={student.uid}
                                className={`hover:bg-[var(--bg-hover)] transition-colors ${
                                  isHighlighted
                                    ? 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40'
                                    : isChecked
                                    ? 'bg-emerald-500/5'
                                    : ''
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedAvailableUids((prev) =>
                                        prev.includes(student.uid)
                                          ? prev.filter((id) => id !== student.uid)
                                          : [...prev, student.uid]
                                      );
                                    }}
                                    className="rounded accent-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                                  {getStudentDisplayName(student)}
                                </td>
                                <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                                  {student.email}
                                </td>
                                <td className="px-4 py-3 font-mono text-[var(--text-muted)]">
                                  {student.registrationNumber || '---'}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-muted)] truncate max-w-[180px]">
                                  {student.course || '---'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    data-admit-uid={student.uid}
                                    disabled={isBusy || isAdmittingAvailable}
                                    onClick={() => handleAdmitSingleAvailable(student)}
                                    className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/35 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      person_add
                                    </span>
                                    <span>
                                      {admittingSingleUid === student.uid
                                        ? 'Inserindo...'
                                        : 'Inserir'}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-12 text-center text-xs text-[var(--text-muted)] space-y-2 shadow-xl">
              <span className="material-symbols-outlined text-[48px] text-[var(--text-muted)]/50 block">
                touch_app
              </span>
              <p>Selecione uma turma na coluna à esquerda para gerenciar seus alunos, modos e materiais.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE MODO AVALIAÇÃO */}
      {pendingModeChange && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-purple-500/40 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(168,85,247,0.3)]">
              <span className="material-symbols-outlined text-[32px]">quiz</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Ativar Modo Avaliação?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Ao ativar o modo de prova, as guias abertas dos alunos serão{' '}
                <strong className="text-purple-300">salvas como backup temporário</strong>, a tela de cada aluno será{' '}
                <strong className="text-purple-300">automaticamente recarregada no Laboratório SQL</strong> e todas as ocorrências ficarão encapsuladas nesta avaliação.
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block">
                Identificação desta Avaliação (para encapsular ocorrências):
              </label>
              <input
                type="text"
                maxLength={120}
                value={examSessionLabelInput}
                onChange={(e) => setExamSessionLabelInput(e.target.value)}
                placeholder="Ex.: Prova P1 SQL"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-purple-500/40 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingModeChange(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isChangingMode}
                onClick={() => executeModeChange(pendingModeChange.mode, pendingModeChange.applyAll)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isChangingMode ? 'Ativando...' : 'Confirmar e Iniciar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE TURMA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0288D1]">add_circle</span>
                <span>Nova Turma</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome da Turma <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: 2º TDS - Manhã (Banco de Dados)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Curso SENAI <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassCourse}
                  onChange={(e) => setNewClassCourse(e.target.value)}
                  placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observações / Semestre (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Ex: Aulas de terças e quintas no Lab 04"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-5 py-2.5 rounded-xl bg-[#0288D1] hover:bg-[#0288D1]/80 text-white font-bold text-xs shadow"
                >
                  {isCreatingClass ? 'Criando...' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE TURMA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0288D1]">edit</span>
                <span>Editar Turma</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                type="button"
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateClassSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome da Turma
                </label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Curso SENAI
                </label>
                <input
                  type="text"
                  required
                  value={editClassCourse}
                  onChange={(e) => setEditClassCourse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={editClassDesc}
                  onChange={(e) => setEditClassDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#0288D1] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingClass}
                  className="px-5 py-2.5 rounded-xl bg-[#0288D1] text-white font-bold text-xs shadow"
                >
                  {isUpdatingClass ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE MATERIAL PEDAGÓGICO */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF6B00]">inventory_2</span>
                <span>{editingMaterial ? 'Editar Material' : 'Novo Material Didático / Prova'}</span>
              </h3>
              <button
                onClick={resetMaterialModal}
                type="button"
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMaterialSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Título do Material <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={matTitle}
                    onChange={(e) => setMatTitle(e.target.value)}
                    placeholder="Ex: bd_clinica_medica.sql ou avaliacao_1_ddl"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Finalidade / Categoria <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={matCategory}
                    onChange={(e) => setMatCategory(e.target.value as SavedScriptCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                  >
                    <option value="class_database">🗄️ Banco de Dados Sala de Aula</option>
                    <option value="example">💡 Exemplo de Aula</option>
                    <option value="exercise">📝 Exercício Prático</option>
                    <option value="solution">✅ Solução de Aula</option>
                    {!(isAdmin && isNormalGlobalSelected) && (
                      <option value="exam">🎯 Avaliação / Prova</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  placeholder="Instruções ou resumo para os alunos"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {isAdmin && isNormalGlobalSelected ? (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                  <span>
                    Este material será disponibilizado publicamente no catálogo{' '}
                    <strong>Geral (Modo Normal e Sem Login)</strong>.
                  </span>
                </div>
              ) : (
                <>
                  {/* Visibilidade por Modo (Normal / Sala de Aula / Avaliação) */}
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
                    <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                      Disponibilidade &amp; Visibilidade nos Modos da Turma:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[var(--bg-hover)]">
                        <input
                          type="checkbox"
                          checked={matVisibleNormal}
                          onChange={() => setMatVisibleNormal(!matVisibleNormal)}
                          className="rounded accent-sky-500"
                        />
                        <span className="text-[var(--text-primary)]">🌐 Modo Normal</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[var(--bg-hover)]">
                        <input
                          type="checkbox"
                          checked={matVisibleClassroom}
                          onChange={() => setMatVisibleClassroom(!matVisibleClassroom)}
                          className="rounded accent-emerald-500"
                        />
                        <span className="text-[var(--text-primary)]">👁️ Modo Sala de Aula</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[var(--bg-hover)]">
                        <input
                          type="checkbox"
                          checked={matVisibleExam}
                          onChange={() => setMatVisibleExam(!matVisibleExam)}
                          className="rounded accent-purple-500"
                        />
                        <span className="text-[var(--text-primary)]">🎯 Modo Avaliação</span>
                      </label>
                    </div>
                  </div>

                  {/* Vinculação de Turmas */}
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matAllClasses}
                        onChange={() => setMatAllClasses(!matAllClasses)}
                        className="rounded border-[var(--border-color)] accent-[#FF6B00]"
                      />
                      <span>🌐 Disponibilizar para todas as minhas turmas</span>
                    </label>

                    {!matAllClasses && (
                      <div className="space-y-1 max-h-24 overflow-y-auto pl-5 text-xs text-[var(--text-secondary)]">
                        {sortedClasses.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={matClassIds.includes(c.id)}
                              onChange={() => {
                                setMatClassIds((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id]
                                );
                              }}
                              className="rounded border-[var(--border-color)] accent-[#FF6B00]"
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Conteúdo SQL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Código SQL <span className="text-red-400">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">upload_file</span>
                    <span>Carregar Arquivo (.sql, .txt)</span>
                    <input
                      type="file"
                      accept=".sql,.txt,text/plain"
                      className="hidden"
                      onChange={handleMaterialFileUpload}
                    />
                  </label>
                </div>
                <textarea
                  rows={6}
                  required
                  value={matContent}
                  onChange={(e) => setMatContent(e.target.value)}
                  placeholder="Cole o código SQL aqui ou clique em 'Carregar Arquivo' acima..."
                  className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              {/* Gabarito SQL (apenas para categoria Avaliação em turmas) */}
              {!(isAdmin && isNormalGlobalSelected) && matCategory === 'exam' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-purple-300">
                      ⚡ Gabarito SQL Oficial (para Correção Automática - opcional)
                    </label>
                    <label className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-purple-500/40 text-[11px] font-semibold text-purple-300 cursor-pointer">
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      <span>Carregar Gabarito</span>
                      <input
                        type="file"
                        accept=".sql,.txt,text/plain"
                        className="hidden"
                        onChange={handleAnswerKeyFileUpload}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={4}
                    value={matAnswerKeySql}
                    onChange={(e) => setMatAnswerKeySql(e.target.value)}
                    placeholder="Cole os SELECTs oficiais do gabarito separados por ponto e vírgula (;)..."
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={resetMaterialModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingMaterial}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-black font-bold text-xs shadow hover:brightness-110"
                >
                  {isSavingMaterial ? 'Salvando...' : 'Publicar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE COPIAR MATERIAIS DO MODO NORMAL PARA A TURMA */}
      {isCopyNormalModalOpen && selectedClass && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">content_copy</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    Copiar Materiais do Modo Normal
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Destino: <strong className="text-[#FF6B00]">{selectedClass.name}</strong> (cria cópias independentes editáveis na turma)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyNormalModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-color)] space-y-3 shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={copyNormalSearch}
                  onChange={(e) => setCopyNormalSearch(e.target.value)}
                  placeholder="Buscar material pelo título ou nome do arquivo..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'class_database', label: 'BDs Sala de Aula' },
                    { id: 'example', label: 'Exemplos' },
                    { id: 'exercise', label: 'Exercícios' },
                    { id: 'solution', label: 'Soluções' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCopyNormalCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        copyNormalCategoryFilter === cat.id
                          ? 'bg-sky-500 text-black font-bold'
                          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {filteredCopyNormalCatalog.length > 0 && (
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        filteredCopyNormalCatalog.length > 0 &&
                        filteredCopyNormalCatalog.every((m) =>
                          selectedCopyNormalIds.includes(m.id)
                        )
                      }
                      onChange={() => {
                        const visibleIds = filteredCopyNormalCatalog.map((m) => m.id);
                        const allSelected = visibleIds.every((id) =>
                          selectedCopyNormalIds.includes(id)
                        );
                        if (allSelected) {
                          const vSet = new Set(visibleIds);
                          setSelectedCopyNormalIds((prev) => prev.filter((id) => !vSet.has(id)));
                        } else {
                          setSelectedCopyNormalIds((prev) =>
                            Array.from(new Set([...prev, ...visibleIds]))
                          );
                        }
                      }}
                      className="rounded accent-sky-500 cursor-pointer"
                    />
                    <span>Selecionar todos ({filteredCopyNormalCatalog.length})</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoadingNormalCatalog ? (
                <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <span className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin inline-block" />
                  <p>Carregando materiais do Modo Normal...</p>
                </div>
              ) : filteredCopyNormalCatalog.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  Nenhum material encontrado no catálogo do Modo Normal para este filtro.
                </div>
              ) : (
                filteredCopyNormalCatalog.map((item) => {
                  const isChecked = selectedCopyNormalIds.includes(item.id);
                  const alreadyExists = existingMaterialTitleSet.has(
                    item.title.trim().toLowerCase()
                  );
                  return (
                    <label
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-sky-500/10 border-sky-500/45'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedCopyNormalIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((x) => x !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          className="rounded accent-sky-500 cursor-pointer shrink-0"
                        />

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-surface)] border border-[var(--border-color)] shrink-0">
                          {item.category === 'class_database'
                            ? '🗄️ BD Aula'
                            : item.category === 'example'
                            ? '💡 Exemplo'
                            : item.category === 'exercise'
                            ? '📝 Exercício'
                            : '✅ Solução'}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {item.title}
                            </p>
                            {alreadyExists && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                Já na turma
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                        {item.content.split('\n').length} linhas
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[var(--text-secondary)]">
                <strong>{selectedCopyNormalIds.length}</strong> selecionado(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCopyNormalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedCopyNormalIds.length === 0 || isCopyingNormalMaterials}
                  onClick={handleCopyNormalSubmit}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs shadow disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>
                    {isCopyingNormalMaterials
                      ? 'Copiando...'
                      : `Copiar para Turma (${selectedCopyNormalIds.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO & CORREÇÃO AUTOMÁTICA DE ENTREGA DE PROVA */}
      {viewingSubmission && user && (
        <ExamGradingModal
          submission={viewingSubmission}
          classExams={classExamMaterials}
          classDatabaseScripts={classDbMaterials}
          teacherUid={user.uid}
          onClose={() => setViewingSubmission(null)}
          onSaved={({ grade, gradePublished, teacherFeedback }) => {
            setSubmissions((prev) =>
              prev.map((s) =>
                s.id === viewingSubmission.id
                  ? { ...s, grade, gradePublished, teacherFeedback }
                  : s
              )
            );
            setViewingSubmission(null);
            showFeedback(
              'success',
              `Nota ${grade.toFixed(1)} salva${gradePublished ? ' e publicada para o aluno' : ''}!`
            );
          }}
        />
      )}

      {/* MODAL DE MONITORAMENTO AO VIVO DA TELA DO ALUNO ("Ver Tela") */}
      {monitoringStudent && selectedClass && (
        <StudentMonitorModal
          studentUid={monitoringStudent.uid}
          studentName={monitoringStudent.name}
          studentEmail={monitoringStudent.email}
          classId={selectedClass.id}
          liveState={liveStates.find((s) => s.studentUid === monitoringStudent.uid) || null}
          studentAlerts={examAlerts.filter((a) => a.studentUid === monitoringStudent.uid)}
          classDatabaseScripts={classDbMaterials}
          classExams={classExamMaterials}
          onClose={() => setMonitoringStudent(null)}
          onAcknowledgeAlert={acknowledgeExamAlert}
          onOpenDirectMessage={(uid) => {
            setMonitoringStudent(null);
            setTeacherChatTarget(uid);
            setActiveResourcePanel('chat');
          }}
          onOpenInSqlEditor={
            onOpenStudentInSqlEditor
              ? (params) => {
                  setMonitoringStudent(null);
                  onOpenStudentInSqlEditor(params);
                }
              : undefined
          }
          onQuickSaveGrade={handleQuickSaveGradeFromMonitor}
        />
      )}

      {/* MODAL DE OCORRÊNCIAS ANTI-TRAPAÇA POR ALUNO (ENCAPSULADAS POR AVALIAÇÃO) */}
      {viewingStudentAlerts && selectedClass && (() => {
        const unackModalIds = visibleStudentModalAlerts
          .filter((a) => !a.acknowledged)
          .map((a) => a.id);
        return (
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--bg-primary)]/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">security</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      Ocorrências Anti-Trapaça • {viewingStudentAlerts.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                      {viewingStudentAlerts.email} • {selectedClass.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingStudentAlerts;
                      setViewingStudentAlerts(null);
                      setMonitoringStudent(target);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0288D1]/15 hover:bg-[#0288D1]/25 border border-[#0288D1]/40 text-[#29B6F6] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">desktop_windows</span>
                    <span>Ver Tela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingStudentAlerts(null)}
                    className="p-1.5 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    title="Fechar"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {viewingStudentSessions.map((session) => {
                    const isSelected = studentAlertSessionFilter === session.sessionId;
                    return (
                      <button
                        key={session.sessionId}
                        type="button"
                        onClick={() => setStudentAlertSessionFilter(session.sessionId)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500 shadow'
                            : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <span>{session.sessionLabel}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">
                          {session.alerts.length}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setStudentAlertSessionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      studentAlertSessionFilter === 'all'
                        ? 'bg-[#0288D1] text-white border-[#0288D1] shadow'
                        : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    Todas ({viewingStudentAllAlerts.length})
                  </button>
                </div>

                {unackModalIds.length > 0 && (
                  <button
                    type="button"
                    disabled={isAcknowledgingAlerts}
                    onClick={() => handleAcknowledgeBatch(unackModalIds)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    <span>Marcar todas como cientes ({unackModalIds.length})</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {visibleStudentModalAlerts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-emerald-400/70">
                      verified_user
                    </span>
                    <p className="font-semibold text-[var(--text-secondary)]">
                      Nenhuma ocorrência registrada para este aluno neste filtro.
                    </p>
                  </div>
                ) : (
                  visibleStudentModalAlerts.map((al) => (
                    <div
                      key={al.id}
                      className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                        al.acknowledged
                          ? 'bg-[var(--bg-primary)]/40 border-[var(--border-color)] opacity-70'
                          : 'bg-rose-500/10 border-rose-500/40'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-rose-400">
                            {EXAM_ALERT_TYPE_LABELS[al.type] || al.type}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
                            📌 {al.examSessionLabel || 'Avaliações Anteriores'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-primary)]">{al.details}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">
                          {new Date(al.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      {!al.acknowledged ? (
                        <button
                          type="button"
                          onClick={() => acknowledgeExamAlert(al.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 text-[11px] font-bold cursor-pointer shrink-0"
                        >
                          Ciente
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold shrink-0">
                          ✓ Ciente
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
