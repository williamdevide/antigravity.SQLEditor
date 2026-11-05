import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfileData, updateCurrentUserPassword } from '../services/authService';
import { getFirebaseErrorMessage } from '../services/firebase';

interface UserProfileViewProps {
  onBackToWorkspace: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onBackToWorkspace }) => {
  const { user, userProfile, isAdmin, isEmailVerified, refreshUserProfile, logout } = useAuth();

  // Campos Editáveis
  const [displayName, setDisplayName] = useState('');
  const [courseOrClass, setCourseOrClass] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Campos de Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Feedback e Loading
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setCourseOrClass(userProfile.courseOrClass || '');
      setRegistrationNumber(userProfile.registrationNumber || '');
      setPhone(userProfile.phone || '');
    }
  }, [userProfile, user]);

  const isGoogleAccount = user?.providerData.some((p) => p.providerId === 'google.com');

  // Salvar Dados Pessoais
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileMessage(null);

    if (!displayName.trim()) {
      setProfileMessage({ type: 'error', text: 'O nome completo não pode ficar em branco.' });
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateUserProfileData(user.uid, {
        displayName: displayName.trim(),
        courseOrClass: courseOrClass.trim(),
        registrationNumber: registrationNumber.trim(),
        phone: phone.trim(),
      });
      await refreshUserProfile();
      setProfileMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: 'Erro ao salvar alterações: ' + (err?.message || 'Tente novamente.'),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword.length < 6) {
      setPassMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassMessage({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    try {
      setIsChangingPass(true);
      await updateCurrentUserPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      setPassMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setTimeout(() => setPassMessage(null), 4000);
    } catch (err: any) {
      setPassMessage({
        type: 'error',
        text: getFirebaseErrorMessage(err?.code || ''),
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-4 sm:p-8 animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Barra Superior de Retorno */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToWorkspace}
            type="button"
            className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Voltar ao Laboratório SQL</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isAdmin
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30'
              }`}
            >
              {isAdmin ? '🛡️ Administrador' : '🎓 Aluno(a) SENAI'}
            </span>
          </div>
        </div>

        {/* Card de Identidade do Usuário */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FF6B00]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Avatar com Moldura Gradiente */}
          <div className="relative group shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={userProfile?.displayName || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.3)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[var(--accent-yellow)] to-[var(--status-success)] flex items-center justify-center text-black font-black text-3xl shadow-[0_0_20px_rgba(255,107,0,0.35)]">
                {(userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[#FF6B00] shadow">
              <span className="material-symbols-outlined text-[16px]">
                {isGoogleAccount ? 'star' : 'badge'}
              </span>
            </div>
          </div>

          {/* Dados Resumidos */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {userProfile?.displayName || user?.displayName || 'Aluno(a) Sem Nome'}
              </h1>
              {isEmailVerified && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] text-[11px] font-bold"
                  title="E-mail validado no Firebase"
                >
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>E-mail Verificado</span>
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--text-secondary)] font-mono">
              {user?.email || 'Sem e-mail'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">
                  school
                </span>
                <span>{userProfile?.courseOrClass || 'Curso não informado'}</span>
              </div>
              {userProfile?.createdAt && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">
                    calendar_today
                  </span>
                  <span>
                    Membro desde{' '}
                    {new Date(userProfile.createdAt).toLocaleDateString('pt-BR', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Botão Sair */}
          <div className="shrink-0 self-center sm:self-start">
            <button
              onClick={async () => {
                if (window.confirm('Deseja realmente encerrar a sessão no SQLEditor?')) {
                  await logout();
                  onBackToWorkspace();
                }
              }}
              type="button"
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Grade de Configurações do Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Dados Pessoais & Acadêmicos SENAI (2 Colunas) */}
          <div className="md:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-color)]">
              <span className="material-symbols-outlined text-[#FF6B00] text-[22px]">
                manage_accounts
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Dados Pessoais &amp; Acadêmicos
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Mantenha suas informações do SENAI atualizadas
                </p>
              </div>
            </div>

            {profileMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMessage.type === 'success'
                    ? 'bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)]'
                    : 'bg-red-500/15 border border-red-500/30 text-red-500'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {profileMessage.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  E-mail de Cadastro (Identificador Único)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)]/50 border border-[var(--border-color)] text-[var(--text-muted)] text-sm cursor-not-allowed"
                />
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                  Para alterar o e-mail, solicite auxílio ao administrador do sistema.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Turma / Curso SENAI
                  </label>
                  <input
                    type="text"
                    value={courseOrClass}
                    onChange={(e) => setCourseOrClass(e.target.value)}
                    placeholder="Ex: TDS - Turma A"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Matrícula SENAI (Opcional)
                  </label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Ex: 2026-9041"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(14) 99876-5432"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando dados...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Segurança & Senha (1 Coluna) */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-color)]">
                <span className="material-symbols-outlined text-[#FFE600] text-[22px]">
                  security
                </span>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Segurança</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Credenciais de acesso</p>
                </div>
              </div>

              {isGoogleAccount ? (
                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2 text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">
                    Autenticado pelo Google
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Sua conta está vinculada com a segurança OAuth 2.0 da sua Conta Google. Para
                    mudar sua senha ou ativar 2FA, acesse sua conta Google.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  {passMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        passMessage.type === 'success'
                          ? 'bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)]'
                          : 'bg-red-500/15 border border-red-500/30 text-red-500'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0">
                        {passMessage.type === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <span>{passMessage.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Nova Senha (mín. 6)
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full py-2.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[#FF6B00] text-[var(--text-primary)] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isChangingPass ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Alterando senha...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">key</span>
                        <span>Atualizar Senha</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Dica de Segurança */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/60 border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] space-y-1">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">
                  lightbulb
                </span>
                Proteção de Sessão
              </span>
              <p>Nunca compartilhe suas credenciais. Seus bancos locais continuam salvos com segurança no seu navegador.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

