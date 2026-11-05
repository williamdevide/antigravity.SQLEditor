import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, updateUserRole, ADMIN_EMAIL } from '../services/authService';
import type { UserProfile, UserRole } from '../types';

interface AdminPanelViewProps {
  onBackToWorkspace: () => void;
}

type SortField = 'name' | 'course' | 'turma' | 'matricula' | 'role' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onBackToWorkspace }) => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros Compostos
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
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const list = await getAllUsers();
      setUsers(list);
    } catch (err: any) {
      console.warn('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

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
      alert('A conta do Professor Administrador principal não pode ter sua função alterada.');
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
      await updateUserRole(userItem.uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === userItem.uid ? { ...u, role: newRole } : u))
      );
      setActionMessage(`Nível de ${userItem.displayName} alterado para ${roleLabels[newRole]} com sucesso!`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert('Erro ao atualizar permissão: ' + err?.message);
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

        {/* Seção 1: Lista e Permissões de Usuários */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF6B00]">manage_accounts</span>
                <span>Alunos, Professores &amp; Permissões</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Filtre por curso ou turma, ordene colunas e defina o papel de cada integrante
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
                        <span>Nível Atual</span>
                        {sortField === 'role' && (
                          <span className="text-[#FF6B00] font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>

                    {/* Ação de Nível */}
                    <th className="py-3 px-3 text-right">Alterar Nível</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
                  {sortedUsers.map((item) => {
                    const isMainAdmin = item.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                    const courseDisplay = item.course || (item.courseOrClass ? item.courseOrClass.split(' - ')[0] : 'Não informado');
                    const turmaDisplay = item.turma || (item.courseOrClass && item.courseOrClass.includes(' - ') ? item.courseOrClass.split(' - ')[1] : 'Pendente');

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
                              turmaDisplay !== 'Pendente'
                                ? 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
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
                        </td>

                        {/* Seletor de Nível */}
                        <td className="py-3 px-3 text-right">
                          {isMainAdmin ? (
                            <span className="text-[11px] text-[var(--text-muted)] italic font-semibold">
                              Admin Principal
                            </span>
                          ) : (
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

