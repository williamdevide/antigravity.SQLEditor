import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, updateUserRole, ADMIN_EMAIL } from '../services/authService';
import type { UserProfile, UserRole } from '../types';

interface AdminPanelViewProps {
  onBackToWorkspace: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onBackToWorkspace }) => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'aluno'>('all');
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

  const handleToggleRole = async (userItem: UserProfile) => {
    if (userItem.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('A conta do Professor Administrador principal não pode ter sua permissão alterada.');
      return;
    }

    const newRole: UserRole = userItem.role === 'admin' ? 'aluno' : 'admin';
    const confirmText =
      newRole === 'admin'
        ? `Deseja conceder permissões de Administrador para ${userItem.displayName}?`
        : `Deseja rebaixar a conta de ${userItem.displayName} para Aluno(a)?`;

    if (!window.confirm(confirmText)) return;

    try {
      await updateUserRole(userItem.uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === userItem.uid ? { ...u, role: newRole } : u))
      );
      setActionMessage(`Permissão de ${userItem.displayName} atualizada para ${newRole.toUpperCase()}!`);
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert('Erro ao atualizar permissão: ' + err?.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.courseOrClass || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.registrationNumber || '').includes(searchQuery);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalAlunos = users.filter((u) => u.role === 'aluno').length;

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-4 sm:p-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-8">
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
              Painel do Administrador &amp; Permissões
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Controle de usuários cadastrados, privilégios de acesso e infraestrutura Firebase
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

        {/* Métricas do Painel */}
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
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">admin_panel_settings</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Administradores</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">{totalAdmins}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--status-success)]/15 text-[var(--status-success)] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">cloud_done</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Firebase Firestore</p>
              <p className="text-sm font-bold text-[var(--status-success)] flex items-center gap-1">
                <span>●</span> Conectado &amp; Ativo
              </p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF6B00]">manage_accounts</span>
                <span>Alunos &amp; Permissões de Acesso</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Gerencie turmas, matrículas e funções dos usuários cadastrados
              </p>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar nome, e-mail, turma..."
                  className="pl-9 pr-4 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors w-56 sm:w-64"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer"
              >
                <option value="all">Todas as funções ({users.length})</option>
                <option value="aluno">Alunos ({totalAlunos})</option>
                <option value="admin">Administradores ({totalAdmins})</option>
              </select>

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

          {/* Tabela de Usuários */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#FF6B00]/30 border-t-[#FF6B00] rounded-full animate-spin" />
              <span>Consultando usuários no Firebase Firestore...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
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
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Usuário / Aluno</th>
                    <th className="py-3 px-3">Turma / Matrícula</th>
                    <th className="py-3 px-3">Status E-mail</th>
                    <th className="py-3 px-3">Papel Atual</th>
                    <th className="py-3 px-3 text-right">Ação de Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] text-[var(--text-primary)]">
                  {filteredUsers.map((item) => {
                    const isMainAdmin = item.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                    return (
                      <tr key={item.uid} className="hover:bg-[var(--bg-primary)]/40 transition-colors">
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
                              <p className="font-bold">{item.displayName}</p>
                              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                                {item.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold">{item.courseOrClass || 'Não informada'}</p>
                          {item.registrationNumber && (
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Mat: {item.registrationNumber}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {item.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[var(--status-success)] text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>Confirmado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[var(--accent-yellow)] text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-[14px]">pending</span>
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              item.role === 'admin'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30'
                            }`}
                          >
                            {item.role === 'admin' ? '🛡️ Admin' : '🎓 Aluno'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isMainAdmin ? (
                            <span className="text-[11px] text-[var(--text-muted)] italic">
                              Professor Responsável
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleRole(item)}
                              type="button"
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                item.role === 'admin'
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
                              }`}
                            >
                              {item.role === 'admin' ? 'Tornar Aluno' : 'Promover a Admin'}
                            </button>
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

        {/* Seção 2: Configurações Extras do Laboratório (Estrutura Modular para as Próximas Etapas) */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-color)]">
            <span className="material-symbols-outlined text-[#FFE600] text-[24px]">
              tune
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Configurações Extras &amp; Módulos Pedagógicos
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Recursos estruturados para a evolução da plataforma ao longo dos próximos dias
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#FF6B00] text-[18px]">
                    cloud_sync
                  </span>
                  Sincronização de Progresso Aluno ↔ Cloud
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] text-[10px] font-bold">
                  Em Estruturação
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Permitirá aos alunos autenticados sincronizarem o histórico de comandos e os exercícios resolvidos para consulta e avaliação do professor.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#29B6F6] text-[18px]">
                    assignment_turned_in
                  </span>
                  Módulo de Avaliações em Tempo Real
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] text-[10px] font-bold">
                  Em Estruturação
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Possibilidade de aplicar provas práticas de SQL onde o professor disponibiliza o script de partida e recolhe as consultas dos alunos.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-purple-400 text-[18px]">
                    database
                  </span>
                  Bancos de Dados Exclusivos para Turmas
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] text-[10px] font-bold">
                  Em Estruturação
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Permitirá ao administrador fazer upload de novos scripts SQL de bancos didáticos diretamente pela web sem necessidade de novo deploy.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[var(--status-success)] text-[18px]">
                    campaign
                  </span>
                  Mural de Avisos &amp; Comunicados
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] text-[10px] font-bold">
                  Em Estruturação
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Mensagens institucionais ou dicas do professor que surgem no topo do editor para todos os alunos logados daquela turma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
