import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  updateClassMode,
  updateAllTeacherClassesMode,
} from '../services/classService';
import {
  saveScript,
  getTeacherPublishedScripts,
  updateScript,
  deleteScript,
  getExamSubmissions,
} from '../services/scriptService';
import type {
  ClassItem,
  ClassMemberItem,
  ClassroomMode,
  SavedScriptItem,
  SavedScriptCategory,
  UserRole,
} from '../types';

interface TeacherPanelViewProps {
  onBackToWorkspace: () => void;
}

export const TeacherPanelView: React.FC<TeacherPanelViewProps> = ({ onBackToWorkspace }) => {
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

  // Confirmação de Mudança de Modo
  const [pendingModeChange, setPendingModeChange] = useState<{
    mode: ClassroomMode;
    applyAll: boolean;
  } | null>(null);
  const [isChangingMode, setIsChangingMode] = useState(false);

  // Admissão por E-mail
  const [admitEmail, setAdmitEmail] = useState('');
  const [isAdmittingEmail, setIsAdmittingEmail] = useState(false);

  // Feedback e Toasts
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeStudentTab, setActiveStudentTab] = useState<'members' | 'pending' | 'admit'>('members');
  const [activeResourcePanel, setActiveResourcePanel] = useState<'materials' | 'submissions' | null>(null);

  // Materiais e Scripts Pedagógicos
  const [materials, setMaterials] = useState<SavedScriptItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');

  // Modal de Criação / Edição de Material
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SavedScriptItem | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matCategory, setMatCategory] = useState<SavedScriptCategory>('class_database');
  const [matClassIds, setMatClassIds] = useState<string[]>(['all']);
  const [matAllClasses, setMatAllClasses] = useState(true);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  // Entregas dos Alunos na Avaliação
  const [submissions, setSubmissions] = useState<SavedScriptItem[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<SavedScriptItem | null>(null);

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

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

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
      setPendingModeChange({ mode, applyAll });
    } else {
      executeModeChange(mode, applyAll);
    }
  };

  const executeModeChange = async (mode: ClassroomMode, applyAll: boolean) => {
    if (!user || !userProfile || !selectedClass) return;
    try {
      setIsChangingMode(true);
      if (applyAll) {
        await updateAllTeacherClassesMode(user.uid, mode, userProfile);
        setClasses((prev) => prev.map((c) => ({ ...c, classroomMode: mode })));
        setSelectedClass((curr) => (curr ? { ...curr, classroomMode: mode } : null));
        showFeedback('success', `Modo "${mode.toUpperCase()}" aplicado a todas as suas turmas!`);
      } else {
        await updateClassMode(selectedClass.id, mode, userProfile);
        setClasses((prev) =>
          prev.map((c) => (c.id === selectedClass.id ? { ...c, classroomMode: mode } : c))
        );
        setSelectedClass((curr) => (curr ? { ...curr, classroomMode: mode } : null));
        showFeedback('success', `Modo da turma "${selectedClass.name}" atualizado para ${mode.toUpperCase()}!`);
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

      setClasses((prev) => prev.map((c) => (c.id === selectedClass.id ? updatedItem : c)));
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

      setClasses((prev) => [created, ...prev]);
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
      setActiveStudentTab('members');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao admitir aluno.');
    } finally {
      setIsAdmittingEmail(false);
    }
  };

  // Gestão de Materiais Pedagógicos
  const [modalError, setModalError] = useState<string | null>(null);

  // Zera e reseta todos os campos do modal de material didático
  const resetMaterialModal = () => {
    setEditingMaterial(null);
    setMatTitle('');
    setMatDesc('');
    setMatContent('-- Escreva aqui o script SQL do Banco de Dados, Exemplo ou Exercício...\n');
    setMatCategory('class_database');
    setMatClassIds(selectedClass ? [selectedClass.id] : ['all']);
    setMatAllClasses(false);
    setModalError(null);
    setIsMaterialModalOpen(false);
  };

  const handleOpenNewMaterialModal = () => {
    resetMaterialModal();
    setIsMaterialModalOpen(true);
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
    setModalError(null);
    setIsMaterialModalOpen(true);
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
      const cleanClassIds = matAllClasses
        ? ['all']
        : matClassIds.length > 0
        ? matClassIds
        : (selectedClass ? [selectedClass.id] : ['all']);

      const authorRole: UserRole = userProfile?.role || (isAdmin ? 'admin' : 'professor');
      const authorName = userProfile?.displayName || user.displayName || 'Professor';
      const authorEmail = userProfile?.email || user.email || '';

      if (editingMaterial) {
        await updateScript(editingMaterial.id, {
          title: matTitle.trim(),
          description: matDesc.trim(),
          content: matContent,
          category: matCategory,
          classIds: cleanClassIds,
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
          category: matCategory,
          classIds: cleanClassIds,
        });
        showFeedback('success', `Material "${matTitle.trim()}" publicado com sucesso para a turma!`);
      }

      // Zera a janela e fecha o modal
      resetMaterialModal();
      loadClassMaterials();
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
      await deleteScript(item.id);
      showFeedback('success', `Material "${item.title}" excluído.`);
      loadClassMaterials();
    } catch (err: any) {
      showFeedback('error', 'Erro ao excluir material.');
    }
  };

  // Filtragem de materiais da turma selecionada
  const filteredMaterials = materials.filter((m) => {
    if (materialCategoryFilter !== 'all' && m.category !== materialCategoryFilter) return false;
    if (!selectedClass) return true;
    const matchesClass = (m.classIds || []).includes('all') || (m.classIds || []).includes(selectedClass.id);
    return matchesClass;
  });

  const approvedMembers = members.filter((m) => m.status === 'approved');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  const currentMode = selectedClass?.classroomMode || 'normal';

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
              {classes.map((c) => {
                const isSelected = selectedClass?.id === c.id;
                const cMode = c.classroomMode || 'normal';
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClass(c)}
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

        {/* Coluna Direita: Detalhes, Modos e Materiais da Turma Selecionada (Mais larga - 9 Colunas) */}
        <div className="lg:col-span-9">
          {selectedClass ? (
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
                    className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[#0288D1] hover:bg-[#0288D1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#0288D1]">edit</span>
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDeleteClass(selectedClass)}
                    type="button"
                    disabled={isDeletingClass}
                    className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Excluir</span>
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

              {/* DIV DE RECURSOS PEDAGÓGICOS E AVALIAÇÕES (Mesma estética de Modo Operacional: Escrito à Esquerda, Botões à Direita) */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Escrito à Esquerda */}
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[22px] text-[#FF6B00]">folder_special</span>
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        Materiais Didáticos &amp; Avaliações
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Bancos de dados, exemplos, exercícios e entregas de avaliações da turma
                      </p>
                    </div>
                  </div>

                  {/* Botões à Direita (um ao lado do outro dentro do container pill idêntico ao do Modo Operacional) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
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
                        <span className="material-symbols-outlined text-[14px]">
                          {activeResourcePanel === 'materials' ? 'expand_less' : 'expand_more'}
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
                        <span>Entrega de Provas</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          activeResourcePanel === 'submissions' ? 'bg-white/20 text-white' : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          {submissions.length}
                        </span>
                        <span className="material-symbols-outlined text-[14px]">
                          {activeResourcePanel === 'submissions' ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PAINEL EXPANSÍVEL: MATERIAIS & BDS */}
                {activeResourcePanel === 'materials' && (
                  <div className="pt-3 border-t border-[var(--border-color)] space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'class_database', label: 'BDs Sala de Aula' },
                          { id: 'example', label: 'Exemplos' },
                          { id: 'exercise', label: 'Exercícios' },
                          { id: 'exam', label: 'Avaliações' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setMaterialCategoryFilter(f.id)}
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

                      <button
                        onClick={handleOpenNewMaterialModal}
                        type="button"
                        className="px-4 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8800] text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow self-start sm:self-auto"
                      >
                        <span className="material-symbols-outlined text-[17px]">add_circle</span>
                        <span>+ Novo Material</span>
                      </button>
                    </div>

                    {isLoadingMaterials ? (
                      <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
                        <span className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin inline-block" />
                        <p>Carregando materiais pedagógicos...</p>
                      </div>
                    ) : filteredMaterials.length === 0 ? (
                      <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-2">
                        <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
                          post_add
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                          Nenhum material publicado para esta turma nesta categoria.
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Clique em <strong>+ Novo Material</strong> para disponibilizar Bancos de Dados de Aula, Exemplos, Exercícios ou Avaliações.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {filteredMaterials.map((mat) => (
                          <div
                            key={mat.id}
                            className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between space-y-3"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                                  {mat.title}
                                </h4>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                  {mat.category === 'class_database'
                                    ? '🗄️ BD Aula'
                                    : mat.category === 'example'
                                    ? '💡 Exemplo'
                                    : mat.category === 'exercise'
                                    ? '📝 Exercício'
                                    : '🎯 Avaliação'}
                                </span>
                              </div>

                              {mat.description && (
                                <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                                  {mat.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)] font-mono">
                                <span>{mat.content.split('\n').length} linhas</span>
                                <span>•</span>
                                <span>
                                  {(mat.classIds || []).includes('all')
                                    ? '🌐 Todas as turmas'
                                    : `Turmas: ${(mat.classIds || []).length}`}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]/60">
                              <button
                                onClick={() => handleOpenEditMaterialModal(mat)}
                                type="button"
                                className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => handleDeleteMaterial(mat)}
                                type="button"
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-400 cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                              <th className="px-4 py-3">E-mail</th>
                              <th className="px-4 py-3">Avaliação</th>
                              <th className="px-4 py-3">Data/Hora da Entrega</th>
                              <th className="px-4 py-3 text-right">Resolução</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {submissions.map((sub) => (
                              <tr key={sub.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                                  {sub.authorName}
                                </td>
                                <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                                  {sub.authorEmail}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-primary)]">
                                  {sub.title}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-[11px]">
                                  {new Date(sub.submittedAt || sub.createdAt).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSubmission(sub)}
                                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] cursor-pointer shadow flex items-center gap-1.5 ml-auto"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    <span>Visualizar SQL</span>
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
                          {approvedMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                                {member.studentName}
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
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(member)}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  Remover da Turma
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
                                {member.studentName}
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
                Ao ativar o modo de prova, todas as guias abertas nos navegadores dos alunos desta turma serão{' '}
                <strong className="text-purple-300">automaticamente salvas como backup temporário no perfil</strong> e fechadas. Apenas as guias e os bancos da prova ficarão disponíveis durante a avaliação.
              </p>
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
                    <option value="exam">🎯 Avaliação / Prova</option>
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
                    {classes.map((c) => (
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
                  rows={8}
                  required
                  value={matContent}
                  onChange={(e) => setMatContent(e.target.value)}
                  placeholder="Cole o código SQL aqui ou clique em 'Carregar Arquivo' acima..."
                  className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

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

      {/* MODAL DE VISUALIZAÇÃO DE ENTREGA DE PROVA */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-purple-500/40 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">assignment_turned_in</span>
                  <span>{viewingSubmission.title}</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Aluno: <strong>{viewingSubmission.authorName}</strong> ({viewingSubmission.authorEmail}) • Enviado em{' '}
                  {new Date(viewingSubmission.submittedAt || viewingSubmission.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                type="button"
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 max-h-96 overflow-y-auto">
              <pre className="font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                {viewingSubmission.content}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(viewingSubmission.content);
                  showFeedback('success', 'Código da resolução copiado!');
                }}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Copiar SQL</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow hover:bg-purple-500 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
