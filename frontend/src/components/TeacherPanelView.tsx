import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createClass,
  getClassesByTeacher,
  getAllClasses,
  getClassMembers,
  approveStudentRequest,
  removeStudentFromClass,
  admitStudentByEmail,
} from '../services/classService';
import type { ClassItem, ClassMemberItem } from '../types';

interface TeacherPanelViewProps {
  onBackToWorkspace: () => void;
}

export const TeacherPanelView: React.FC<TeacherPanelViewProps> = ({ onBackToWorkspace }) => {
  const { user, userProfile, isAdmin, isProfessor, isTeacherApproved } = useAuth();

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

  // Admissão por E-mail
  const [admitEmail, setAdmitEmail] = useState('');
  const [isAdmittingEmail, setIsAdmittingEmail] = useState(false);

  // Feedback e Toasts
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'admit'>('members');

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
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

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadClassMembers(selectedClass.id);
    } else {
      setMembers([]);
    }
  }, [selectedClass, loadClassMembers]);

  // Copiar código da turma com feedback
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    showFeedback('success', `Código [${code}] copiado para a área de transferência!`);
  };

  // Criação de nova turma
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    if (!newClassName.trim()) {
      showFeedback('error', 'Informe o nome da turma (ex: TDS-01 / Noite).');
      return;
    }

    try {
      setIsCreatingClass(true);
      const created = await createClass({
        name: newClassName.trim(),
        course: newClassCourse.trim(),
        description: newClassDesc.trim(),
        teacherId: user.uid,
        teacherName: userProfile.displayName || 'Professor(a) SENAI',
        teacherEmail: userProfile.email,
      });

      // Atualiza o estado imediatamente para exibição em tempo real
      setClasses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setSelectedClass(created);
      setIsCreateModalOpen(false);
      setNewClassName('');
      setNewClassDesc('');
      showFeedback('success', `Turma "${created.name}" criada com sucesso! Código: ${created.code}`);

      // Sincroniza em segundo plano sem desmarcar a turma
      setTimeout(() => {
        loadTeacherClasses();
      }, 350);
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao criar turma:', err);
      showFeedback('error', 'Erro ao criar turma: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Aprovar solicitação de aluno
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

      showFeedback('success', `Aluno(a) ${member.studentName} aprovado(a) na turma!`);
      await loadClassMembers(selectedClass.id);
      await loadTeacherClasses();
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao aprovar aluno:', err);
      showFeedback('error', 'Falha ao aprovar aluno: ' + (err?.message || ''));
    }
  };

  // Remover aluno da turma
  const handleRemoveStudent = async (member: ClassMemberItem) => {
    if (!selectedClass || !userProfile) return;
    const confirm = window.confirm(
      `Deseja realmente remover o aluno "${member.studentName}" da turma "${selectedClass.name}"?\n\nEle deixará de ver as tarefas desta classe, mas continuará com a conta ativa na plataforma SQLEditor.`
    );
    if (!confirm) return;

    try {
      await removeStudentFromClass({
        memberId: member.id,
        classItem: selectedClass,
        studentUid: member.studentUid,
        studentName: member.studentName,
        studentEmail: member.studentEmail,
        teacher: userProfile,
      });

      showFeedback('success', `Aluno(a) ${member.studentName} removido da turma.`);
      await loadClassMembers(selectedClass.id);
      await loadTeacherClasses();
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao remover aluno:', err);
      showFeedback('error', 'Falha ao remover aluno: ' + (err?.message || ''));
    }
  };

  // Admitir diretamente por e-mail
  const handleAdmitByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !userProfile) return;
    if (!admitEmail.trim()) {
      showFeedback('error', 'Informe o e-mail do aluno cadastrado.');
      return;
    }

    try {
      setIsAdmittingEmail(true);
      await admitStudentByEmail({
        classItem: selectedClass,
        studentEmail: admitEmail.trim(),
        teacher: userProfile,
      });

      showFeedback('success', `Aluno com e-mail "${admitEmail.trim()}" admitido na turma!`);
      setAdmitEmail('');
      await loadClassMembers(selectedClass.id);
      await loadTeacherClasses();
    } catch (err: any) {
      console.error('[TeacherPanel] Erro ao admitir por e-mail:', err);
      showFeedback('error', err?.message || 'Falha ao admitir aluno.');
    } finally {
      setIsAdmittingEmail(false);
    }
  };

  // Se não for professor autorizado nem admin, bloqueia o acesso
  if (!isTeacherApproved) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)]">
        <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Acesso Restrito ao Corpo Docente</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isProfessor
              ? 'Seu cadastro como Professor(a) foi submetido com sucesso e está aguardando aprovação de um Administrador. Assim que aprovado, você poderá gerenciar suas turmas.'
              : 'Esta área é exclusiva para professores e instrutores do SENAI. Se você é professor, solicite autorização a um Administrador.'}
          </p>
          <button
            onClick={onBackToWorkspace}
            type="button"
            className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow transition-all cursor-pointer"
          >
            Voltar ao Laboratório SQL
          </button>
        </div>
      </div>
    );
  }

  const approvedMembers = members.filter((m) => m.status === 'approved');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-y-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-fadeIn border ${
            feedback.type === 'success'
              ? 'bg-[var(--bg-surface)] text-[var(--status-success)] border-[var(--status-success)]/40'
              : 'bg-[var(--bg-surface)] text-red-500 border-red-500/40'
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
                Crie turmas, compartilhe códigos de 6 dígitos e aprove a admissão dos seus alunos
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
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista de Turmas (4 Colunas) */}
        <div className="lg:col-span-4 space-y-4">
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
              {classes.map((cls) => {
                const isSelected = selectedClass?.id === cls.id;
                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-surface)] border-[#0288D1] shadow-lg shadow-[#0288D1]/10'
                        : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--text-primary)]">{cls.name}</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                          {cls.course}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#0288D1]/15 text-[#29B6F6] text-[11px] font-mono font-bold tracking-wider">
                        {cls.code}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">group</span>
                        <span>{cls.studentCount || 0} aluno(s)</span>
                      </span>
                      <span className="text-[10px]">
                        {new Date(cls.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Detalhes e Gestão de Alunos da Turma Selecionada (8 Colunas) */}
        <div className="lg:col-span-8">
          {selectedClass ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl space-y-6">
              {/* Header do Card da Turma Selecionada */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedClass.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      Ativa
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {selectedClass.course} {selectedClass.description ? `• ${selectedClass.description}` : ''}
                  </p>
                </div>

                {/* Card de Código de Acesso com botão de cópia */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <div className="px-2">
                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Código de Acesso
                    </p>
                    <p className="text-base font-mono font-bold text-[#FF6B00] tracking-wider">
                      {selectedClass.code}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(selectedClass.code)}
                    type="button"
                    className="p-2 rounded-xl bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] transition-colors cursor-pointer"
                    title="Copiar código de acesso para enviar aos alunos"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copiedCode === selectedClass.code ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Abas de Navegação Interna da Turma */}
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'members'
                      ? 'bg-[#0288D1] text-white shadow'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>Matriculados ({approvedMembers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'pending'
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
                  onClick={() => setActiveTab('admit')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admit'
                      ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Admitir por E-mail</span>
                </button>
              </div>

              {/* 1. ABA DE MATRICULADOS */}
              {activeTab === 'members' && (
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
                                  title="Remover aluno apenas desta turma"
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
              {activeTab === 'pending' && (
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

              {/* 3. ABA DE ADMITIR ALUNO POR E-MAIL */}
              {activeTab === 'admit' && (
                <div className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Admissão Direta por E-mail
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Insira o e-mail exato cadastrado pelo aluno na plataforma SQLEditor para vinculá-lo imediatamente a esta turma, dispensando o código de acesso.
                    </p>
                  </div>

                  <form onSubmit={handleAdmitByEmail} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                        mail
                      </span>
                      <input
                        type="email"
                        required
                        value={admitEmail}
                        onChange={(e) => setAdmitEmail(e.target.value)}
                        placeholder="aluno@escola.senai.br"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAdmittingEmail || !admitEmail.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,107,0,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAdmittingEmail ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">add_task</span>
                      )}
                      <span>Admitir na Turma</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl space-y-3">
              <span className="material-symbols-outlined text-[40px] text-[var(--text-muted)]">
                arrow_back
              </span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Selecione uma turma ao lado
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Ou crie uma nova turma para começar a compartilhar o código com seus alunos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação de Turma */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0288D1] text-[22px]">
                  add_circle
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Nova Turma / Classe</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome da Turma *
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: TDS-01 / Noite ou 2º Módulo A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Curso SENAI *
                </label>
                <input
                  type="text"
                  required
                  value={newClassCourse}
                  onChange={(e) => setNewClassCourse(e.target.value)}
                  placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Descrição ou Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Ex: Aulas às terças e quintas-feiras - Laboratório 04"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#0288D1]/10 border border-[#0288D1]/20 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#29B6F6] text-[18px] shrink-0">
                  vpn_key
                </span>
                <span>Um código de 6 caracteres único será gerado automaticamente após a criação.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0288D1] to-[#29B6F6] text-white text-xs font-bold shadow hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isCreatingClass ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                  <span>Criar Turma</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

