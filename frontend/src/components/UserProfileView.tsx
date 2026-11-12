import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfileData, updateCurrentUserPassword } from '../services/authService';
import { getClassByCode, requestJoinClass } from '../services/classService';
import {
  getUserSavedScripts,
  updateScript,
  deleteScript,
  formatScriptFileName,
} from '../services/scriptService';
import { getFirebaseErrorMessage } from '../services/firebase';
import type { SavedScriptItem, SavedScriptCategory } from '../types';

interface UserProfileViewProps {
  onBackToWorkspace: () => void;
  onNavigateToLanding?: () => void;
  onSaveComplete?: () => void;
  onOpenSavedScript?: (script: SavedScriptItem) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onBackToWorkspace,
  onNavigateToLanding,
  onSaveComplete,
  onOpenSavedScript,
}) => {
  const {
    user,
    userProfile,
    isAdmin,
    isProfessor,
    isPendingTeacher,
    isEmailVerified,
    refreshUserProfile,
    logout,
  } = useAuth();

  useEffect(() => {
    if (!user) {
      if (onNavigateToLanding) onNavigateToLanding();
      else onBackToWorkspace();
    }
  }, [user, onNavigateToLanding, onBackToWorkspace]);

  if (!user) {
    return null;
  }

  // Navegação por Abas no Perfil
  const [activeProfileTab, setActiveProfileTab] = useState<'details' | 'scripts'>('details');

  // Campos Editáveis de Dados Pessoais
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Foto de Perfil
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback e Loading
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scripts Salvos
  const [savedScripts, setSavedScripts] = useState<SavedScriptItem[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scriptSearch, setScriptSearch] = useState('');
  const [editingScript, setEditingScript] = useState<SavedScriptItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setCourse(userProfile.course || userProfile.courseOrClass || 'Técnico em Desenvolvimento de Sistemas');
      setTurma(userProfile.turma || '');
      setRegistrationNumber(userProfile.registrationNumber || '');
      setPhone(userProfile.phone || '');
      setPhotoInputUrl(userProfile.photoURL || user.photoURL || '');
    }
  }, [userProfile, user]);

  const loadUserScripts = async () => {
    if (!user) return;
    try {
      setIsLoadingScripts(true);
      const list = await getUserSavedScripts(user.uid);
      setSavedScripts(list);
    } catch (err) {
      console.warn('[UserProfileView] Erro ao carregar scripts salvos:', err);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  useEffect(() => {
    if (activeProfileTab === 'scripts') {
      loadUserScripts();
    }
  }, [activeProfileTab]);

  const isGoogleAccount = user?.providerData.some((p) => p.providerId === 'google.com');

  // Upload e Redimensionamento de Foto Local via Canvas
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          setIsUpdatingPhoto(true);
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 160;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          await updateUserProfileData(user.uid, { photoURL: compressedDataUrl });
          await refreshUserProfile();
          setIsPhotoModalOpen(false);
        } catch (err: any) {
          console.error('[handlePhotoFileUpload Error]', err);
          alert('Erro ao salvar foto: ' + (err?.message || 'Tente novamente.'));
        } finally {
          setIsUpdatingPhoto(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Salvar Foto via URL
  const handleSavePhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsUpdatingPhoto(true);
      await updateUserProfileData(user.uid, { photoURL: photoInputUrl.trim() || undefined });
      await refreshUserProfile();
      setIsPhotoModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar link da foto: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  // Remover Foto
  const handleRemovePhoto = async () => {
    if (!user) return;
    try {
      setIsUpdatingPhoto(true);
      await updateUserProfileData(user.uid, { photoURL: '' });
      await refreshUserProfile();
      setPhotoInputUrl('');
      setIsPhotoModalOpen(false);
    } catch (err: any) {
      alert('Erro ao remover foto: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

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

  // Alterar Senha com Suporte a Reautenticação
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
      await updateCurrentUserPassword(newPassword, currentPassword || undefined);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setTimeout(() => setPassMessage(null), 4000);
    } catch (err: any) {
      console.error('[ChangePassword Error]', err);
      setPassMessage({
        type: 'error',
        text: getFirebaseErrorMessage(err?.code || err?.message || ''),
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Ações de Script Salvo
  const handleDeleteScript = async (script: SavedScriptItem) => {
    if (!window.confirm(`Deseja realmente excluir o script "${script.title}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteScript(script.id);
      setSavedScripts((prev) => prev.filter((s) => s.id !== script.id));
    } catch (err: any) {
      alert('Erro ao excluir script: ' + (err?.message || 'Tente novamente.'));
    }
  };

  const handleOpenEditModal = (script: SavedScriptItem) => {
    setEditingScript(script);
    setEditTitle(script.title);
    setEditDesc(script.description || '');
  };

  const handleSaveEditScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;
    try {
      setIsUpdatingScript(true);
      const formattedTitle = formatScriptFileName(editTitle);
      await updateScript(editingScript.id, {
        title: formattedTitle,
        description: editDesc.trim(),
      });
      setSavedScripts((prev) =>
        prev.map((s) =>
          s.id === editingScript.id
            ? { ...s, title: formattedTitle, description: editDesc.trim(), updatedAt: new Date().toISOString() }
            : s
        )
      );
      setEditingScript(null);
    } catch (err: any) {
      alert('Erro ao atualizar script: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsUpdatingScript(false);
    }
  };

  // Filtros de Scripts
  const filteredScripts = savedScripts.filter((sc) => {
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'temporary' && !sc.isTemporary) return false;
      if (categoryFilter !== 'temporary' && sc.category !== categoryFilter) return false;
    }
    if (scriptSearch.trim()) {
      const q = scriptSearch.toLowerCase();
      const matchTitle = sc.title.toLowerCase().includes(q);
      const matchDesc = (sc.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getCategoryBadge = (cat: SavedScriptCategory, isTemp?: boolean) => {
    if (isTemp) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          ⏳ Temporário
        </span>
      );
    }
    switch (cat) {
      case 'class_database':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            🗄️ BD Sala de Aula
          </span>
        );
      case 'example':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            💡 Exemplo
          </span>
        );
      case 'exercise':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30">
            📝 Exercício
          </span>
        );
      case 'exam':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            🎯 Avaliação
          </span>
        );
      case 'exam_submission':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            📤 Entrega de Prova
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            💾 Meu Script
          </span>
        );
    }
  };

  const activePhoto = userProfile?.photoURL || user?.photoURL;

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

          {/* Avatar com Botão de Alterar Foto */}
          <div className="relative group shrink-0">
            {activePhoto ? (
              <img
                src={activePhoto}
                alt={userProfile?.displayName || 'Avatar'}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.3)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[var(--accent-yellow)] to-[var(--status-success)] flex items-center justify-center text-black font-black text-3xl shadow-[0_0_20px_rgba(255,107,0,0.35)]">
                {(userProfile?.displayName || user?.displayName || 'U')[0].toUpperCase()}
              </div>
            )}

            {/* Botão de Câmera / Alterar Foto */}
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              type="button"
              title="Alterar Foto de Perfil"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FF6B00] hover:bg-[#FF8800] text-black border-2 border-[var(--bg-surface)] flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">photo_camera</span>
            </button>
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

        {/* Abas Superiores do Perfil */}
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-1">
          <button
            onClick={() => setActiveProfileTab('details')}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeProfileTab === 'details'
                ? 'bg-[#FF6B00] text-black shadow'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">badge</span>
            <span>Dados Pessoais &amp; Segurança</span>
          </button>

          <button
            onClick={() => setActiveProfileTab('scripts')}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeProfileTab === 'scripts'
                ? 'bg-[#FF6B00] text-black shadow'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">bookmark</span>
            <span>Meus Scripts Salvos</span>
            {savedScripts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {savedScripts.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: DADOS PESSOAIS & SEGURANÇA */}
        {activeProfileTab === 'details' && (
          <div className="space-y-6">
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

            {/* Grade de Configurações */}
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
                    className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                      profileMessage.type === 'success'
                        ? 'bg-[var(--status-success)]/15 border border-[var(--status-success)]/30 text-[var(--status-success)]'
                        : 'bg-red-500/15 border border-red-500/30 text-red-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {profileMessage.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Curso SENAI
                      </label>
                      <input
                        type="text"
                        required
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                      />
                    </div>
                  </div>

                  {!isProfessor && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          Turma (Ex: 1º TDS, Noite A, etc.)
                        </label>
                        <input
                          type="text"
                          required={!isAdmin}
                          value={turma}
                          onChange={(e) => setTurma(e.target.value)}
                          placeholder="Ex: 2º TDS - Manhã"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          Número de Matrícula SENAI
                        </label>
                        <input
                          type="text"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          placeholder="Ex: 2026.0482"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Telefone / WhatsApp (opcional)
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (14) 99888-7766"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-black font-bold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Salvar Alterações do Perfil</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Vínculo de Turma para Alunos */}
                {!isProfessor && !isAdmin && (
                  <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#00E5FF]">groups</span>
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        Vínculo com Turma do Professor
                      </h3>
                    </div>

                    {userProfile?.className ? (
                      <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">
                            {userProfile.className}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">
                            Código: {userProfile.classCode || 'Não informado'}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Matriculado
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleJoinClassWithCode} className="space-y-3">
                        {joinClassMessage && (
                          <div
                            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={joinClassCode}
                            onChange={(e) => setJoinClassCode(e.target.value.toUpperCase())}
                            maxLength={10}
                            placeholder="Código de 6 dígitos (ex: A8F2K9)"
                            className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-mono uppercase focus:outline-none focus:border-[#FF6B00]"
                          />
                          <button
                            type="submit"
                            disabled={isJoiningClass || joinClassCode.trim().length < 6}
                            className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00B0FF] text-black font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isJoiningClass ? 'Entrando...' : 'Entrar na Turma'}
                          </button>
                        </div>
                      </form>
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
                          Senha Atual
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Sua senha atual"
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
                        />
                      </div>

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
                            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                            <span>Atualizar Senha</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: MEUS SCRIPTS SALVOS */}
        {activeProfileTab === 'scripts' && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FF6B00]">bookmark</span>
                  <span>Meus Scripts Salvos no Perfil</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Gerencie, renomeie ou abra seus códigos SQL diretamente no editor
                </p>
              </div>

              <button
                onClick={loadUserScripts}
                disabled={isLoadingScripts}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span className={`material-symbols-outlined text-[16px] ${isLoadingScripts ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>Atualizar</span>
              </button>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'student_saved', label: 'Meus Scripts' },
                  { id: 'class_database', label: 'BDs de Aula' },
                  { id: 'example', label: 'Exemplos' },
                  { id: 'exercise', label: 'Exercícios' },
                  { id: 'exam', label: 'Avaliações' },
                  { id: 'temporary', label: 'Temporários' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCategoryFilter(f.id)}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      categoryFilter === f.id
                        ? 'bg-[#FF6B00] text-black font-bold'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  value={scriptSearch}
                  onChange={(e) => setScriptSearch(e.target.value)}
                  placeholder="Buscar script..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            {/* Listagem de Scripts */}
            {isLoadingScripts ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[var(--accent-yellow)] border-t-transparent rounded-full animate-spin" />
                <span>Carregando seus scripts...</span>
              </div>
            ) : filteredScripts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                <span className="material-symbols-outlined text-[36px] text-[var(--text-muted)]/50 block">
                  code_off
                </span>
                <p>Nenhum script encontrado com os filtros selecionados.</p>
                <p className="text-[11px]">
                  Abra uma guia no laboratório e use o botão <strong>Salvar (Ctrl+S)</strong> para armazenar scripts no perfil.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredScripts.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#FF6B00]/40 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px] text-[#FF6B00]">
                            description
                          </span>
                          <h3 className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[180px]">
                            {sc.title}
                          </h3>
                        </div>
                        {getCategoryBadge(sc.category, sc.isTemporary)}
                      </div>

                      {sc.description && (
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                          {sc.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)] font-mono">
                        <span>{sc.content.split('\n').length} linhas</span>
                        <span>•</span>
                        <span>
                          {new Date(sc.updatedAt || sc.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]/60">
                      <button
                        onClick={() => {
                          if (onOpenSavedScript) {
                            onOpenSavedScript(sc);
                          }
                        }}
                        type="button"
                        className="flex-1 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[#FF6B00] hover:text-black border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[15px]">tab</span>
                        <span>Abrir no Editor</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(sc)}
                        type="button"
                        title="Renomear / Editar Metadados"
                        className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#FF6B00] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteScript(sc)}
                        type="button"
                        title="Excluir Script"
                        className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-red-500/20 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL DE FOTO DE PERFIL */}
        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FF6B00]">photo_camera</span>
                  <span>Foto de Perfil</span>
                </h3>
                <button
                  onClick={() => setIsPhotoModalOpen(false)}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-3">
                {/* Opção 1: Upload de Arquivo Local */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Upload de Imagem (do computador/celular)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUpdatingPhoto}
                    type="button"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-black font-bold text-xs shadow hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    <span>Escolher Arquivo de Imagem</span>
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Formatos JPG, PNG ou WebP. A imagem é otimizada automaticamente.
                  </p>
                </div>

                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                  <span className="text-[10px] text-[var(--text-muted)] uppercase">ou link da web</span>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                {/* Opção 2: URL Externa */}
                <form onSubmit={handleSavePhotoUrl} className="space-y-2">
                  <input
                    type="url"
                    value={photoInputUrl}
                    onChange={(e) => setPhotoInputUrl(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingPhoto || !photoInputUrl.trim()}
                    className="w-full py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-xs cursor-pointer disabled:opacity-50"
                  >
                    Salvar Link da Imagem
                  </button>
                </form>

                {/* Opção 3: Remover Foto */}
                {activePhoto && (
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <button
                      onClick={handleRemovePhoto}
                      disabled={isUpdatingPhoto}
                      type="button"
                      className="w-full py-2 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      Remover Foto Atual
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DE METADADOS DO SCRIPT */}
        {editingScript && (
          <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FF6B00]">edit</span>
                  <span>Renomear / Editar Script</span>
                </h3>
                <button
                  onClick={() => setEditingScript(null)}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEditScript} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Título do Script
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setEditingScript(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingScript || !editTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-[#FF6B00] text-black font-bold text-xs shadow hover:brightness-110 disabled:opacity-50"
                  >
                    {isUpdatingScript ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
