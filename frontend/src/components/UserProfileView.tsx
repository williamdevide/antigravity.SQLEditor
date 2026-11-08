import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfileData, updateCurrentUserPassword } from '../services/authService';
import { getClassByCode, requestJoinClass } from '../services/classService';
import { getFirebaseErrorMessage } from '../services/firebase';

interface UserProfileViewProps {
  onBackToWorkspace: () => void;
  onNavigateToLanding?: () => void;
  onSaveComplete?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onBackToWorkspace,
  onNavigateToLanding,
  onSaveComplete,
}) => {
  const { user, userProfile, isAdmin, isProfessor, isPendingTeacher, isEmailVerified, refreshUserProfile, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      if (onNavigateToLanding) onNavigateToLanding();
      else onBackToWorkspace();
    }
  }, [user, onNavigateToLanding, onBackToWorkspace]);

  // Se a sessão expirou ou o usuário deslogou, não renderiza a casca órfã
  if (!user) {
    return null;
  }

  // Campos Editáveis
  const [displayName, setDisplayName] = useState('');
  const [course, setCourse] = useState('Técnico em Desenvolvimento de Sistemas');
  const [turma, setTurma] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Código de Turma para Alunos
  const [joinClassCode, setJoinClassCode] = useState('');
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [joinClassMessage, setJoinClassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      setCourse(userProfile.course || userProfile.courseOrClass || 'Técnico em Desenvolvimento de Sistemas');
      setTurma(userProfile.turma || '');
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
    if (!course.trim()) {
      setProfileMessage({ type: 'error', text: 'O curso deve ser informado.' });
      return;
    }
    if (!turma.trim() && !isAdmin && !isProfessor) {
      setProfileMessage({ type: 'error', text: 'Por favor, informe a sua turma.' });
      return;
    }

    try {
      setIsSavingProfile(true);
      const finalTurma = isProfessor ? '' : turma.trim();
      await updateUserProfileData(user.uid, {
        displayName: displayName.trim(),
        course: course.trim(),
        turma: finalTurma,
        courseOrClass: finalTurma ? `${course.trim()} - ${finalTurma}` : course.trim(),
        registrationNumber: registrationNumber.trim(),
        phone: phone.trim(),
      });
      await refreshUserProfile();
      setProfileMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
      setTimeout(() => {
        setProfileMessage(null);
        if (onSaveComplete) {
          onSaveComplete();
        }
      }, 1200);
    } catch (err: any) {
      console.error('[SQL Editor Firebase Profile Save Error]', err);
      setProfileMessage({
        type: 'error',
        text: 'Erro ao salvar alterações: ' + (err?.message || 'Tente novamente.'),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Solicitar entrada na turma via código
  const handleJoinClassWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    setJoinClassMessage(null);

    const cleanCode = joinClassCode.trim().toUpperCase();
    if (cleanCode.length < 6) {
      setJoinClassMessage({
        type: 'error',
        text: 'Informe um código de turma válido com 6 caracteres (ex: A8F2K9).',
      });
      return;
    }

    try {
      setIsJoiningClass(true);
      const targetClass = await getClassByCode(cleanCode);
      if (!targetClass) {
        setJoinClassMessage({
          type: 'error',
          text: `Nenhuma turma ativa encontrada com o código [${cleanCode}]. Verifique o código com o seu professor.`,
        });
        return;
      }

      await requestJoinClass({ classItem: targetClass, student: userProfile });
      await refreshUserProfile();
      setJoinClassCode('');
      setJoinClassMessage({
        type: 'success',
        text: `Solicitação enviada com sucesso para a turma "${targetClass.name}"! Aguarde a aprovação do(a) professor(a) ${targetClass.teacherName}.`,
      });
    } catch (err: any) {
      console.error('[handleJoinClassWithCode Error]', err);
      setJoinClassMessage({
        type: 'error',
        text: err?.message || 'Falha ao solicitar entrada na turma. Tente novamente.',
      });
    } finally {
      setIsJoiningClass(false);
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
                  : isProfessor || userProfile?.role === 'professor'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30'
              }`}
            >
              {isAdmin
                ? '🛡️ Administrador'
                : isProfessor || userProfile?.role === 'professor'
                ? '👨‍🏫 Professor'
                : '🎓 Aluno(a) SENAI'}
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
                {userProfile?.displayName || user?.displayName || 'Usuário Sem Nome'}
              </h1>

              {/* Badges de Função e Status */}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">shield_person</span>
                  <span>Administrador</span>
                </span>
              )}

              {isProfessor && !isAdmin && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isPendingTeacher
                      ? 'alert-academic-badge'
                      : 'bg-[#0288D1]/15 border-[#0288D1]/30 text-[#29B6F6]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isPendingTeacher ? 'hourglass_top' : 'co_present'}
                  </span>
                  <span>{isPendingTeacher ? 'Professor (Pendente de Aprovação)' : 'Professor Docente'}</span>
                </span>
              )}

              {!isAdmin && !isProfessor && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  <span>Aluno(a)</span>
                </span>
              )}

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
                <span>
                  {isProfessor
                    ? userProfile?.course || 'Técnico em Desenvolvimento de Sistemas'
                    : userProfile?.courseOrClass || 'Curso não informado'}
                </span>
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
                  if (onNavigateToLanding) {
                    onNavigateToLanding();
                  } else {
                    onBackToWorkspace();
                  }
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

        {/* Alerta de Professor Pendente */}
        {isPendingTeacher && (
          <div className="p-4 sm:p-5 rounded-2xl border alert-academic-notice flex items-start gap-3.5 shadow-lg animate-fadeIn">
            <span className="material-symbols-outlined alert-academic-icon text-[28px] shrink-0 mt-0.5">
              hourglass_top
            </span>
            <div className="space-y-1">
              <h3 className="font-bold text-sm alert-academic-title">
                Cadastro de Professor(a) em Análise pelo Administrador
              </h3>
              <p className="text-xs alert-academic-text leading-relaxed">
                Seu cadastro docente foi registrado com sucesso e está aguardando liberação de um administrador do SENAI. Enquanto isso, seu acesso ao laboratório SQL e às ferramentas de consulta está totalmente liberado. Assim que autorizado, o acesso ao <strong>Painel do Professor</strong> será liberado.
              </p>
            </div>
          </div>
        )}

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

            {(!userProfile?.turma || userProfile.turma.trim() === '') && !isAdmin && !isProfessor && (
              <div className="p-4 rounded-2xl border alert-academic-notice flex items-start gap-3 animate-fadeIn">
                <span className="material-symbols-outlined alert-academic-icon text-[24px] shrink-0 mt-0.5">
                  info
                </span>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm alert-academic-title">
                    Complete seu cadastro acadêmico SENAI
                  </h3>
                  <p className="text-xs alert-academic-text leading-relaxed">
                    Você se autenticou via Google! Para que seus professores possam acompanhar seus desafios práticos e vinculá-lo à sua turma, por favor preencha os campos <strong>Curso</strong>, <strong>Turma</strong> e <strong>Matrícula</strong> abaixo e clique em <em>Salvar Alterações</em>.
                  </p>
                </div>
              </div>
            )}

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
                  Nome Completo *
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

              {/* Curso SENAI - Linha Inteira */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Curso SENAI *
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    school
                  </span>
                  <input
                    type="text"
                    required
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              {/* Turma e Matrícula - Grid de 2 Colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!isProfessor && !isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Turma (Opcional)
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                        groups
                      </span>
                      <input
                        type="text"
                        value={turma}
                        onChange={(e) => setTurma(e.target.value)}
                        placeholder="Ex: TDS-01 / 2º Módulo"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                      />
                    </div>
                  </div>
                )}
                <div className={isProfessor || isAdmin ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Matrícula {isProfessor ? 'Docente (Opcional)' : 'SENAI (Opcional)'}
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                      pin
                    </span>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder={isProfessor ? 'Ex: PROF-2026' : 'Ex: 2026-9041'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    call
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(14) 99876-5432"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
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

            {/* Vínculo com Turma / Classe do Aluno */}
            {userProfile?.role === 'aluno' && (
              <div className="mt-6 pt-5 border-t border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#29B6F6] text-[20px]">
                      groups
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Minha Turma &amp; Matrícula
                    </h3>
                  </div>
                  {userProfile.classStatus === 'approved' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] text-[11px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      <span>Matrícula Aprovada</span>
                    </span>
                  )}
                  {userProfile.classStatus === 'pending' && (
                    <span className="px-2.5 py-0.5 rounded-full border alert-academic-badge text-[11px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      <span>Aguardando Aprovação do Docente</span>
                    </span>
                  )}
                </div>

                {userProfile.classStatus === 'approved' ? (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[var(--text-primary)] text-sm">
                        {userProfile.className || userProfile.turma}
                      </p>
                      <p className="text-[var(--text-secondary)] text-[11px] mt-0.5">
                        Código de acesso da classe:{' '}
                        <span className="font-mono font-bold text-[#FF6B00]">
                          {userProfile.classCode || '---'}
                        </span>
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[var(--status-success)] text-[24px]">
                      school
                    </span>
                  </div>
                ) : userProfile.classStatus === 'pending' ? (
                  <div className="p-3.5 rounded-xl border alert-academic-notice text-xs space-y-1">
                    <p className="font-bold alert-academic-title">
                      Solicitação enviada para a turma {userProfile.className ? `"${userProfile.className}"` : ''} [{userProfile.classCode}]
                    </p>
                    <p className="text-[11px] alert-academic-text">
                      Seu pedido de entrada está aguardando aprovação do professor responsável pela turma. O laboratório SQL continua 100% liberado para seus estudos.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Você ainda não está matriculado em nenhuma turma. Se o seu professor compartilhou um código de 6 dígitos (ex: <code className="text-[#FF6B00]">A8F2K9</code>), informe-o abaixo:
                    </p>

                    {joinClassMessage && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                          joinClassMessage.type === 'success'
                            ? 'bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)]'
                            : 'bg-red-500/15 border border-red-500/30 text-red-500'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] shrink-0">
                          {joinClassMessage.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span>{joinClassMessage.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleJoinClassWithCode} className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-[17px] text-[var(--text-muted)]">
                          vpn_key
                        </span>
                        <input
                          type="text"
                          maxLength={6}
                          value={joinClassCode}
                          onChange={(e) => setJoinClassCode(e.target.value.toUpperCase())}
                          placeholder="Código de 6 caracteres (ex: A8F2K9)"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono uppercase text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isJoiningClass || joinClassCode.trim().length < 6}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0288D1] to-[#29B6F6] text-white font-bold text-xs shadow hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {isJoiningClass ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[15px]">send</span>
                        )}
                        <span>Entrar na Turma</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
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

