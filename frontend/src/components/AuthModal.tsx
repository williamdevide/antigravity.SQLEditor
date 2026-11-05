import React, { useState, useEffect } from 'react';
import { useAuth, type AuthModalTab } from '../context/AuthContext';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  resendVerificationEmail,
} from '../services/authService';
import { getFirebaseErrorMessage } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthModalTab;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onAuthSuccess,
}) => {
  const { user, refreshEmailVerification } = useAuth();
  const [tab, setTab] = useState<AuthModalTab>(initialTab);

  // Campos de Login e Recuperação
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos adicionais de Cadastro
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [course, setCourse] = useState('Técnico em Desenvolvimento de Sistemas');
  const [turma, setTurma] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');

  // Estados de Operação e Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // 1. Ação de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      setIsLoading(true);
      await loginWithEmail(email, password);
      // Checa se o e-mail está verificado
      const verified = await refreshEmailVerification();
      if (!verified) {
        setTab('verify');
        setSuccessMessage('Por favor, confirme seu e-mail para ter acesso completo.');
      } else {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }
    } catch (err: any) {
      console.error('[SQL Editor Firebase Login Error]', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Ação de Cadastro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }
    if (!course.trim()) {
      setErrorMessage('Informe o curso.');
      return;
    }
    if (!turma.trim()) {
      setErrorMessage('Informe sua turma (ex: TDS-01, 1º Módulo, etc.).');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setIsLoading(true);
      await registerWithEmail(email, password, {
        fullName,
        course,
        turma,
        courseOrClass: `${course} - ${turma}`,
        registrationNumber,
        phone,
      });

      setTab('verify');
      setSuccessMessage(
        'Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail.'
      );
    } catch (err: any) {
      console.error('[SQL Editor Firebase Register Error]', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Ação com Google
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      setIsLoading(true);
      const profile = await loginWithGoogle();
      onClose();
      if (onAuthSuccess) onAuthSuccess();
      // Se for aluno autenticado pelo Google e ainda não preencheu turma, redireciona para #perfil
      if (!profile.turma && profile.role !== 'admin') {
        window.location.hash = '#perfil';
      }
    } catch (err: any) {
      console.error('[SQL Editor Firebase Google Auth Error]', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Ação de Recuperar Senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage('Digite seu e-mail para receber o link de recuperação.');
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordReset(email);
      setSuccessMessage(
        'E-mail de recuperação enviado! Verifique sua caixa de entrada e a pasta de spam.'
      );
    } catch (err: any) {
      console.error('[SQL Editor Firebase Password Reset Error]', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Ação de Reenviar Confirmação
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      setIsLoading(true);
      await resendVerificationEmail();
      setSuccessMessage('Novo e-mail de confirmação enviado com sucesso!');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('[SQL Editor Firebase Resend Verification Error]', err);
      setErrorMessage(getFirebaseErrorMessage(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Checar se já confirmou
  const handleCheckVerification = async () => {
    try {
      setIsLoading(true);
      const verified = await refreshEmailVerification();
      if (verified) {
        setSuccessMessage('E-mail confirmado com sucesso! Bem-vindo ao SQLEditor.');
        setTimeout(() => {
          onClose();
          if (onAuthSuccess) onAuthSuccess();
        }, 1200);
      } else {
        setErrorMessage(
          'Ainda não identificamos a confirmação. Clique no link que enviamos para o seu e-mail e depois clique aqui.'
        );
      }
    } catch {
      setErrorMessage('Erro ao checar status. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 pb-4 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-r from-[#FF6B00]/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FFE600] flex items-center justify-center shadow-[0_0_12px_rgba(255,107,0,0.4)]">
              <span className="material-symbols-outlined text-black font-bold text-[20px]">
                {tab === 'login'
                  ? 'lock'
                  : tab === 'register'
                  ? 'person_add'
                  : tab === 'forgot'
                  ? 'key'
                  : 'mark_email_read'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {tab === 'login' && 'Entrar na Plataforma'}
                {tab === 'register' && 'Criar Conta de Aluno'}
                {tab === 'forgot' && 'Recuperar Acesso'}
                {tab === 'verify' && 'Confirmação de E-mail'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {tab === 'login' && 'Acesse seus bancos, perfil e atividades'}
                {tab === 'register' && 'Cadastre-se para registrar seu aprendizado'}
                {tab === 'forgot' && 'Enviaremos as instruções para seu e-mail'}
                {tab === 'verify' && 'Validação obrigatória de segurança'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            aria-label="Fechar"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Abas Superiores (Alternância Rápida Login / Cadastro) */}
        {tab !== 'verify' && (
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
                tab === 'login'
                  ? 'border-[#FF6B00] text-[#FF6B00] font-bold bg-[var(--bg-surface)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Já tenho conta (Entrar)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
                tab === 'register'
                  ? 'border-[#FF6B00] text-[#FF6B00] font-bold bg-[var(--bg-surface)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Criar nova conta
            </button>
          </div>
        )}

        {/* Corpo com Scroll Suave */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Alertas de Erro ou Sucesso */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs flex items-start gap-2.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)] text-xs flex items-start gap-2.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                check_circle
              </span>
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* 1. ABA DE LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  E-mail institucional ou pessoal
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Senha de acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-[#FF6B00] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    lock
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_18px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no SQLEditor</span>
                    <span className="material-symbols-outlined text-[18px]">login</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-[var(--border-color)] w-full" />
                <span className="bg-[var(--bg-surface)] px-3 text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  ou
                </span>
                <div className="border-t border-[var(--border-color)] w-full" />
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com a Conta Google</span>
              </button>
            </form>
          )}

          {/* 2. ABA DE CADASTRO */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nome Completo *
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    badge
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Gabriel Henrique Silva"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  E-mail *
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@escola.senai.br"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
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
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              {/* Turma e Matrícula em Grid de 2 Colunas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Turma *
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[17px] text-[var(--text-muted)]">
                      groups
                    </span>
                    <input
                      type="text"
                      required
                      value={turma}
                      onChange={(e) => setTurma(e.target.value)}
                      placeholder="Ex: TDS-01 / 2º Módulo"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Matrícula (Opcional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[17px] text-[var(--text-muted)]">
                      pin
                    </span>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Ex: 2026-9843"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  WhatsApp / Telefone (Opcional)
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
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Senha (mín. 6 dígitos) *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#29B6F6]/10 border border-[#29B6F6]/20 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#29B6F6] text-[18px] shrink-0">
                  info
                </span>
                <span>
                  Um link de validação será enviado para seu e-mail após a confirmação.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_18px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando sua conta...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir Cadastro &amp; Validar</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Cadastrar diretamente com o Google</span>
              </button>
            </form>
          )}

          {/* 3. ABA DE RECUPERAR SENHA */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Digite o e-mail cadastrado na sua conta. Nós lhe enviaremos um link seguro do
                Firebase para você redefinir sua senha com facilidade.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Seu e-mail cadastrado
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[var(--text-muted)]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_18px_rgba(255,107,0,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Disparando e-mail...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {/* 4. ABA DE AGUARDANDO CONFIRMAÇÃO DE E-MAIL (Bloqueio Estrito) */}
          {tab === 'verify' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-yellow)]/15 border border-[var(--accent-yellow)]/30 text-[var(--accent-yellow)] flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <span className="material-symbols-outlined text-[32px]">mark_email_unread</span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Confirmação de E-mail Pendente
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  Enviamos uma mensagem com um link de ativação para{' '}
                  <strong className="text-[var(--text-primary)]">{email || user?.email}</strong>.
                  Para a sua segurança e integridade das atividades acadêmicas, clique no link
                  recebido antes de continuar.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-left text-xs space-y-1.5 text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">
                    help_outline
                  </span>
                  <span>Não encontrou o e-mail?</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li>Verifique a pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.</li>
                  <li>O e-mail vem do remetente oficial do Firebase / Google.</li>
                  <li>Aguarde até 2 minutos para a entrega da mensagem.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--status-success)] to-emerald-600 hover:brightness-110 text-white font-bold text-sm shadow-[0_0_18px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verificando status...</span>
                    </>
                  ) : (
                    <>
                      <span>Já confirmei meu e-mail</span>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isLoading || resendCooldown > 0}
                  className="w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Aguarde ${resendCooldown}s para reenviar`
                    : 'Reenviar e-mail de confirmação'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
