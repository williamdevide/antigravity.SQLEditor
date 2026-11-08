import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAllUsers,
  updateUserRole,
  approveTeacher,
  rejectTeacher,
  deleteUserPermanently,
  ADMIN_EMAIL,
} from '../services/authService';
import {
  getAllSystemEvents,
  getEventTypeLabel,
  exportEventsToCSV,
  exportEventsToJSON,
} from '../services/auditService';
import type { UserProfile, UserRole, SystemEventItem } from '../types';

interface AdminPanelViewProps {
  onBackToWorkspace: () => void;
}

type SortField = 'name' | 'course' | 'turma' | 'matricula' | 'role' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onBackToWorkspace }) => {
  const { isAdmin, userProfile } = useAuth();
  const [adminTab, setAdminTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auditoria / Eventos do Sistema
  const [systemEvents, setSystemEvents] = useState<SystemEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Filtros Compostos de Usuários
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [turmaFilter, setTurmaFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'professor' | 'aluno'>('all');
  
  // Ordenação
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Mensagem de feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Carrega lista de usuários do Firestore
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await getAllUsers();
      setUsers(list);
    } catch (err: any) {
      console.warn('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega eventos de auditoria
  const loadAuditEvents = useCallback(async () => {
    try {
      setIsLoadingEvents(true);
      const events = await getAllSystemEvents(400);
      setSystemEvents(events);
    } catch (err: any) {
      console.warn('Erro ao carregar histórico de auditoria:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAuditEvents();
    }
  }, [isAdmin, loadUsers, loadAuditEvents]);

  // Lista dinâmica de cursos presentes na base
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const c = u.course || (u.courseOrClass ? u.courseOrClass.split(' - ')[0] : '');
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Lista dinâmica de turmas presentes na base
  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const t = u.turma || (u.courseOrClass && u.courseOrClass.includes(' - ') ? u.courseOrClass.split(' - ')[1] : '');
      if (t && t.trim()) set.add(t.trim());
    });
    return Array.from(set).sort();
  }, [users]);

  // Professores aguardando autorização de acesso
  const pendingTeachers = useMemo(() => {
    return users.filter((u) => u.role === 'professor' && u.status === 'pending_approval');
  }, [users]);

  // Alterna campo e sentido de ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Alteração de Papel do Usuário (Select com 3 níveis)
  const handleRoleChange = async (userItem: UserProfile, newRole: UserRole) => {
    if (userItem.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('A conta do Administrador principal não pode ter sua função alterada.');
      return;
    }

    if (userItem.role === newRole) return;

    const roleLabels: Record<UserRole, string> = {
      aluno: 'Aluno(a)',
      professor: 'Professor(a)',
      admin: 'Administrador(a)',
    };

    const confirmText = `Deseja alterar o nível de ${userItem.displayName} para ${roleLabels[newRole]}?`;
    if (!window.confirm(confirmText)) return;

    try {
      await updateUserRole(userItem.uid, newRole, userProfile || undefined, userItem);
      setUsers((prev) =>
        prev.map((u) => (u.uid === userItem.uid ? { ...u, role: newRole, status: 'active' } : u))
      );
      setActionMessage(`Nível de ${userItem.displayName} alterado para ${roleLabels[newRole]} com sucesso!`);
      setTimeout(() => setActionMessage(null), 3500);
      loadAuditEvents();
    } catch (err: any) {
      alert('Erro ao atualizar permissão: ' + err?.message);
    }
  };

  // Autorizar Professor Pendente
  const handleApproveTeacher = async (teacher: UserProfile) => {
    if (!userProfile) return;
    try {
      await approveTeacher(teacher, userProfile);
      setUsers((prev) =>
        prev.map((u) => (u.uid === teacher.uid ? { ...u, status: 'active' } : u))
      );
      setActionMessage(`Professor(a) ${teacher.displayName} autorizado(a) com sucesso!`);
      setTimeout(() => setActionMessage(null), 4000);
      loadAuditEvents();
    } catch (err: any) {
      alert('Erro ao autorizar professor: ' + err?.message);
    }
  };

  // Recusar Professor Pendente
  const handleRejectTeacher = async (teacher: UserProfile) => {
    if (!userProfile) return;
    const reason = window.prompt(`Motivo da recusa do cadastro de ${teacher.displayName}:`, 'Dados cadastrais inconsistentes');
    if (reason === null) return;

    try {
      await rejectTeacher(teacher, userProfile, reason);
      setUsers((prev) =>
        prev.map((u) => (u.uid === teacher.uid ? { ...u, status: 'rejected' } : u))
      );
      setActionMessage(`Cadastro de ${teacher.displayName} foi recusado.`);
      setTimeout(() => setActionMessage(null), 4000);
      loadAuditEvents();
    } catch (err: any) {
      alert('Erro ao recusar professor: ' + err?.message);
    }
  };

  // Exclusão Permanente de Usuário (Exclusivo para o Administrador)
  const handleDeleteUser = async (target: UserProfile) => {
    if (!userProfile) return;
    if (target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('A conta do Administrador principal não pode ser excluída.');
      return;
    }

    const confirm = window.confirm(
      `⚠️ ATENÇÃO - EXCLUSÃO PERMANENTE:\n\nDeseja realmente excluir permanentemente o usuário "${target.displayName}" (${target.email}) da plataforma SQLEditor?\n\nEsta ação é irreversível e removerá seu perfil e acessos.`
    );
    if (!confirm) return;

    try {
      await deleteUserPermanently(target, userProfile);
      setUsers((prev) => prev.filter((u) => u.uid !== target.uid));
      setActionMessage(`Usuário ${target.displayName} excluído permanentemente da plataforma.`);
      setTimeout(() => setActionMessage(null), 4000);
      loadAuditEvents();
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + err?.message);
    }
  };

  // Filtragem composta
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const userCourse = u.course || (u.courseOrClass ? u.courseOrClass.split(' - ')[0] : '');
      const userTurma = u.turma || (u.courseOrClass && u.courseOrClass.includes(' - ') ? u.courseOrClass.split(' - ')[1] : '');

      const matchesSearch =
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userCourse.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userTurma.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.registrationNumber || '').includes(searchQuery) ||
        (u.phone || '').includes(searchQuery);

      const matchesCourse = courseFilter === 'all' || userCourse.trim() === courseFilter;
      const matchesTurma = turmaFilter === 'all' || userTurma.trim() === turmaFilter;
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesCourse && matchesTurma && matchesRole;
    });
  }, [users, searchQuery, courseFilter, turmaFilter, roleFilter]);

  // Ordenação dinâmica
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'name') {
        valA = a.displayName.toLowerCase();
        valB = b.displayName.toLowerCase();
      } else if (sortField === 'course') {
        valA = (a.course || a.courseOrClass || '').toLowerCase();
        valB = (b.course || b.courseOrClass || '').toLowerCase();
      } else if (sortField === 'turma') {
        valA = (a.turma || '').toLowerCase();
        valB = (b.turma || '').toLowerCase();
      } else if (sortField === 'matricula') {
        valA = (a.registrationNumber || '').toLowerCase();
        valB = (b.registrationNumber || '').toLowerCase();
      } else if (sortField === 'role') {
        valA = a.role;
        valB = b.role;
      } else if (sortField === 'createdAt') {
        valA = a.createdAt;
        valB = b.createdAt;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Filtragem de eventos de auditoria
  const filteredEvents = useMemo(() => {
    return systemEvents.filter((ev) => {
      const matchesType = eventTypeFilter === 'all' || ev.type === eventTypeFilter;
      const q = eventSearchQuery.toLowerCase();
      const matchesText =
        ev.authorName.toLowerCase().includes(q) ||
        ev.authorEmail.toLowerCase().includes(q) ||
        (ev.targetName && ev.targetName.toLowerCase().includes(q)) ||
        (ev.targetEmail && ev.targetEmail.toLowerCase().includes(q)) ||
        ev.details.toLowerCase().includes(q);
      return matchesType && matchesText;
    });
  }, [systemEvents, eventTypeFilter, eventSearchQuery]);

  // Exportar CSV
  const handleExportCSV = () => {
    exportEventsToCSV(filteredEvents);
    setActionMessage('Histórico de eventos exportado para CSV com sucesso!');
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Exportar JSON
  const handleExportJSON = () => {
    exportEventsToJSON(filteredEvents);
    setActionMessage('Histórico de eventos exportado para JSON com sucesso!');
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Contadores
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalProfessores = users.filter((u) => u.role === 'professor').length;
  const totalAlunos = users.filter((u) => u.role === 'aluno').length;

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Acesso Restrito</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
          Esta área é restrita a administradores e professores da plataforma SQLEditor.
        </p>
        <button
          onClick={onBackToWorkspace}
          type="button"
          className="px-6 py-2.5 rounded-full bg-[#FF6B00] text-white text-xs font-bold shadow hover:bg-[#FF8533] cursor-pointer"
        >
          Voltar ao Laboratório
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-4 sm:p-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold">
                🛡️ Área Administrativa
              </span>
              <span className="text-xs text-[var(--text-muted)]">• Escola SENAI Ourinhos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              Painel do Administrador &amp; Gestão Escolar
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Controle de usuários, elevação ao nível Professor, filtragem por turma e infraestrutura
            </p>
          </div>

          <button
            onClick={onBackToWorkspace}
            type="button"
            className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Voltar ao Laboratório</span>
          </button>
        </div>

        {/* Métricas do Painel (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">groups</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Total de Cadastros</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{users.length}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">school</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Alunos(as)</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{totalAlunos}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">co_present</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Professores(as)</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{totalProfessores}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">admin_panel_settings</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Administradores</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{totalAdmins}</p>
            </div>
          </div>
        </div>

        {/* Feedback de Ação */}
        {actionMessage && (
          <div className="p-3.5 rounded-xl bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] text-xs flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Seletor de Abas Administrativas */}
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
          <button
            type="button"
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === 'users'
                ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>Gestão de Usuários &amp; Professores</span>
            {pendingTeachers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                {pendingTeachers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAdminTab('audit')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminTab === 'audit'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Histórico de Eventos &amp; Auditoria</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] font-mono">
              {systemEvents.length}
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* ABA 1: GESTÃO DE USUÁRIOS & PROFESSORES                   */}
        {/* ========================================================= */}
        {adminTab === 'users' && (
          <div className="space-y-6">
            {/* Bloco de Professores Pendentes de Autorização */}
            {pendingTeachers.length > 0 && (
              <div className="border-2 alert-academic-notice rounded-3xl p-6 shadow-xl space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined alert-academic-icon text-[24px]">
                    notification_important
                  </span>
                  <div>
                    <h3 className="text-base font-bold alert-academic-title">
                      Professores Aguardando Autorização ({pendingTeachers.length})
                    </h3>
                    <p className="text-xs alert-academic-text">
                      Estes docentes criaram uma conta com perfil de Professor e precisam da sua aprovação para criar turmas e emitir códigos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {pendingTeachers.map((t) => (
                    <div
                      key={t.uid}
                      className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-amber-500/30 flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-[var(--text-primary)]">
                            {t.displayName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full border alert-academic-badge text-[10px] font-bold">
                            Pendente
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                          {t.email}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          Curso: {t.course || 'Não informado'} {t.phone ? `• Tel: ${t.phone}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                        <button
                          type="button"
                          onClick={() => handleRejectTeacher(t)}
                          className="px-3 py-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveTeacher(t)}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Autorizar Professor</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção 1: Lista e Permissões de Usuários */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF6B00]">manage_accounts</span>
                    <span>Alunos, Professores &amp; Permissões</span>
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Filtre por curso ou turma, ordene colunas, eleve permissões ou exclua usuários
                  </p>
                </div>

                {/* Barra de Filtros Compostos */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Busca Textual */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2 text-[17px] text-[var(--text-muted)]">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nome, e-mail, matrícula..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors w-44 sm:w-52"
                    />
                  </div>

                  {/* Filtro por Curso */}
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer max-w-[160px] truncate"
                    title="Filtrar por Curso"
                  >
                    <option value="all">Todos os Cursos</option>
                    {availableCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Filtro por Turma */}
                  <select
                    value={turmaFilter}
                    onChange={(e) => setTurmaFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer max-w-[140px] truncate"
                    title="Filtrar por Turma"
                  >
                    <option value="all">Todas as Turmas</option>
                    {availableTurmas.map((t) => (
                      <option key={t} value={t}>
                        Turma: {t}
                      </option>
                    ))}
                  </select>

                  {/* Filtro por Nível */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer"
                    title="Filtrar por Nível de Acesso"
                  >
                    <option value="all">Todos os Níveis ({users.length})</option>
                    <option value="aluno">Alunos ({totalAlunos})</option>
                    <option value="professor">Professores ({totalProfessores})</option>
                    <option value="admin">Administradores ({totalAdmins})</option>
                  </select>

                  {/* Botão Recarregar */}
                  <button
                    onClick={loadUsers}
                    type="button"
                    className="p-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="Recarregar lista"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Usuários com Ordenação */}
              {isLoading ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#FF6B00]/30 border-t-[#FF6B00] rounded-full animate-spin" />
                  <span>Consultando usuários no Firebase Firestore...</span>
                </div>
              ) : sortedUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
                    person_search
                  </span>
                  <p>Nenhum usuário localizado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] select-none">
                        {/* Coluna Nome */}
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Usuário / Integrante</span>
                            {sortField === 'name' && (
                              <span className="text-[#FF6B00] font-bold">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>

                        {/* Coluna Curso */}
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          onClick={() => handleSort('course')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Curso SENAI</span>
                            {sortField === 'course' && (
                              <span className="text-[#FF6B00] font-bold">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>

                        {/* Coluna Turma */}
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          onClick={() => handleSort('turma')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Turma</span>
                            {sortField === 'turma' && (
                              <span className="text-[#FF6B00] font-bold">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>

                        {/* Coluna Matrícula */}
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          onClick={() => handleSort('matricula')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Matrícula</span>
                            {sortField === 'matricula' && (
                              <span className="text-[#FF6B00] font-bold">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>

                        {/* Coluna Papel */}
                        <th
                          className="py-3 px-3 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                          onClick={() => handleSort('role')}
                        >
                          <div className="flex items-center gap-1">
                            <span>Nível / Status</span>
                            {sortField === 'role' && (
                              <span className="text-[#FF6B00] font-bold">
                                {sortDirection === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>

                        {/* Ações Administrativas */}
                        <th className="py-3 px-3 text-right">Permissão &amp; Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
                      {sortedUsers.map((item) => {
                        const isMainAdmin = item.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                        const courseDisplay = item.course || (item.courseOrClass ? item.courseOrClass.split(' - ')[0] : 'Não informado');
                        const turmaDisplay = item.className || item.turma || (item.courseOrClass && item.courseOrClass.includes(' - ') ? item.courseOrClass.split(' - ')[1] : 'Sem Turma');
                        const isPending = item.role === 'professor' && item.status === 'pending_approval';

                        return (
                          <tr key={item.uid} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
                            {/* Identidade */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {item.photoURL ? (
                                  <img
                                    src={item.photoURL}
                                    alt={item.displayName}
                                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FFE600] flex items-center justify-center text-black font-bold text-xs shrink-0">
                                    {(item.displayName || 'U')[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold flex items-center gap-1.5">
                                    <span>{item.displayName}</span>
                                    {item.emailVerified && (
                                      <span
                                        className="material-symbols-outlined text-[13px] text-[var(--status-success)]"
                                        title="E-mail verificado"
                                      >
                                        verified
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                                    {item.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Curso */}
                            <td className="py-3 px-3">
                              <span className="font-medium text-[var(--text-secondary)]">
                                {courseDisplay}
                              </span>
                            </td>

                            {/* Turma */}
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  turmaDisplay !== 'Sem Turma'
                                    ? 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]'
                                    : 'bg-zinc-500/10 border-zinc-500/30 text-[var(--text-muted)]'
                                }`}
                              >
                                {turmaDisplay}
                              </span>
                            </td>

                            {/* Matrícula */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs text-[var(--text-secondary)]">
                                {item.registrationNumber || '—'}
                              </span>
                            </td>

                            {/* Papel Visual */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    item.role === 'admin'
                                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                      : item.role === 'professor'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30'
                                  }`}
                                >
                                  <span>
                                    {item.role === 'admin'
                                      ? '🛡️ Admin'
                                      : item.role === 'professor'
                                      ? '👨‍🏫 Professor'
                                      : '🎓 Aluno'}
                                  </span>
                                </span>
                                {isPending && (
                                  <span className="text-[10px] alert-academic-text font-semibold">
                                    ⏳ Pendente autorização
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ações: Seletor de Nível e Botão de Excluir */}
                            <td className="py-3 px-3 text-right">
                              {isMainAdmin ? (
                                <span className="text-[11px] text-[var(--text-muted)] italic font-semibold">
                                  Superadministrador
                                </span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <select
                                    value={item.role}
                                    onChange={(e) => handleRoleChange(item, e.target.value as UserRole)}
                                    className="px-2.5 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#FF6B00] transition-colors cursor-pointer"
                                    title="Alterar nível deste usuário"
                                  >
                                    <option value="aluno">🎓 Aluno</option>
                                    <option value="professor">👨‍🏫 Professor</option>
                                    <option value="admin">🛡️ Administrador</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(item)}
                                    className="p-1.5 rounded-xl border border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                    title="Excluir usuário permanentemente da plataforma (Exclusivo do Administrador)"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: HISTÓRICO DE AUDITORIA & EVENTOS DO SISTEMA        */}
        {/* ========================================================= */}
        {adminTab === 'audit' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">history_edu</span>
                  <span>Trilha de Auditoria &amp; Eventos da Plataforma</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Registro cronológico de cadastros, autorizações, admissões e mutações de permissões
                </p>
              </div>

              {/* Botões de Exportação e Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Busca no Log */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-[17px] text-[var(--text-muted)]">
                    search
                  </span>
                  <input
                    type="text"
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome, email ou detalhe..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors w-48 sm:w-60"
                  />
                </div>

                {/* Filtro por Tipo de Evento */}
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-colors cursor-pointer max-w-[180px] truncate"
                >
                  <option value="all">Todos os Tipos de Eventos</option>
                  <option value="USER_REGISTERED">Novo Usuário Cadastrado</option>
                  <option value="PROFESSOR_APPROVED">Professor Autorizado</option>
                  <option value="PROFESSOR_REJECTED">Professor Recusado</option>
                  <option value="CLASS_CREATED">Turma Criada</option>
                  <option value="CLASS_STUDENT_REQUESTED">Entrada Solicitada</option>
                  <option value="CLASS_STUDENT_APPROVED">Aluno Admitido</option>
                  <option value="CLASS_STUDENT_REMOVED">Aluno Removido</option>
                  <option value="ROLE_CHANGED">Nível Alterado</option>
                  <option value="USER_DELETED">Usuário Excluído</option>
                </select>

                {/* Botão Exportar CSV */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredEvents.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Exportar dados formatados para Microsoft Excel (CSV com BOM UTF-8)"
                >
                  <span className="material-symbols-outlined text-[16px]">table_view</span>
                  <span>CSV (Excel)</span>
                </button>

                {/* Botão Exportar JSON */}
                <button
                  type="button"
                  onClick={handleExportJSON}
                  disabled={filteredEvents.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Exportar dados estruturados em JSON"
                >
                  <span className="material-symbols-outlined text-[16px]">data_object</span>
                  <span>JSON</span>
                </button>

                {/* Recarregar */}
                <button
                  onClick={loadAuditEvents}
                  type="button"
                  className="p-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Recarregar eventos de auditoria"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>

            {/* Tabela de Eventos */}
            {isLoadingEvents ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <span>Carregando trilha de auditoria...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">
                  find_in_page
                </span>
                <p>Nenhum evento registrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3">Data e Hora</th>
                      <th className="px-4 py-3">Tipo de Evento</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">Alvo / Destinatário</th>
                      <th className="px-4 py-3">Detalhes do Evento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-4 py-3 font-mono text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(ev.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ev.type === 'USER_DELETED'
                                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                : ev.type === 'PROFESSOR_APPROVED'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : ev.type === 'PROFESSOR_REJECTED'
                                ? 'border alert-academic-badge'
                                : ev.type === 'ROLE_CHANGED'
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                                : ev.type === 'CLASS_CREATED'
                                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                                : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {getEventTypeLabel(ev.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--text-primary)]">{ev.authorName}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">{ev.authorEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          {ev.targetName || ev.targetEmail ? (
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">{ev.targetName || '—'}</p>
                              <p className="text-[10px] text-[var(--text-muted)] font-mono">{ev.targetEmail || '—'}</p>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] text-[11px] max-w-md">
                          {ev.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Seção 2: Estrutura Modular para Futuras Configurações */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[22px]">
              construction
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Módulos do Professor &amp; Avaliações (Próxima Fase)
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Recursos para turmas e professores que serão ativados nas próximas etapas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border-color)] space-y-2 opacity-80">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[16px] text-blue-400">assignment</span>
                <span>Distribuição de Exercícios</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Professores poderão enviar desafios e listas de exercícios direcionadas a turmas específicas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border-color)] space-y-2 opacity-80">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">analytics</span>
                <span>Painel de Desempenho</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Visualização do progresso dos alunos nos laboratórios e taxas de acerto em queries SQL.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)]/40 border border-[var(--border-color)] space-y-2 opacity-80">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[16px] text-purple-400">database</span>
                <span>Bancos de Dados da Turma</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Compartilhamento em lote de schemas de prova ou templates para toda a sala de aula.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

