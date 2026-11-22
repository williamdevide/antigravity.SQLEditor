import React, { useState, useRef, useEffect } from 'react';
import type { ActiveView, UserProfile } from '../types';

interface ProfileAvatarButtonProps {
  user: any;
  userProfile: UserProfile | null;
  isAdmin?: boolean;
  isProfessor?: boolean;
  onViewChange: (view: ActiveView) => void;
  unreadClassMessagesCount?: number;
  size?: 'sm' | 'md';
  activeClassName?: string;
}

/**
 * Botão circular de avatar compartilhado entre Header e LandingPageView.
 * Quando o aluno está aprovado em uma classe:
 *  - exibe borda dourada neon brilhante;
 *  - exibe sininho verde pulsante no canto superior direito quando há mensagens não lidas;
 *  - ao clicar, abre menu rápido com "Meu Perfil" e "Minha Classe".
 */
export const ProfileAvatarButton: React.FC<ProfileAvatarButtonProps> = ({
  user,
  userProfile,
  isAdmin = false,
  isProfessor = false,
  onViewChange,
  unreadClassMessagesCount = 0,
  size = 'sm',
  activeClassName,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInClass = Boolean(userProfile?.classId && userProfile?.classStatus === 'approved');
  const displayClassName = activeClassName || userProfile?.className || 'Minha Turma';

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const roleLabel = isAdmin
    ? 'Administrador'
    : isProfessor || userProfile?.role === 'professor'
    ? 'Professor'
    : 'Aluno';

  const photo = userProfile?.photoURL || user?.photoURL;
  const initial = (userProfile?.displayName || user?.displayName || user?.email || 'U')[0].toUpperCase();
  const dimensions = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';

  const handleClick = () => {
    if (isInClass) {
      setMenuOpen((prev) => !prev);
    } else {
      onViewChange('profile');
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        className={`${dimensions} rounded-full flex items-center justify-center p-0.5 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${
          isInClass
            ? 'bg-[#FFD700]/15 border-2 border-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.85),0_0_4px_rgba(255,230,0,0.9)] ring-1 ring-[#FFE600]/60'
            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[#FF6B00] shadow-sm'
        }`}
        title={
          isInClass
            ? `${userProfile?.displayName || user?.displayName || user?.email} • Turma: ${displayClassName}${
                unreadClassMessagesCount > 0 ? ` (${unreadClassMessagesCount} mensagem(ns) não lida(s))` : ''
              }`
            : `Perfil: ${userProfile?.displayName || user?.displayName || user?.email} (${roleLabel})`
        }
        aria-label={isInClass ? 'Menu Rápido de Perfil e Classe' : 'Acessar Meu Perfil'}
      >
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={userProfile?.displayName || user?.displayName || 'Avatar'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span
              className={`w-full h-full rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FFE600] text-black ${textSize} font-black flex items-center justify-center shadow-inner`}
            >
              {initial}
            </span>
          )}
        </div>
      </button>

      {/* Sininho verde no canto superior direito quando houver mensagens não lidas */}
      {isInClass && unreadClassMessagesCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onViewChange('my-class');
          }}
          title={`${unreadClassMessagesCount} nova(s) mensagem(ns) na classe ${displayClassName}`}
          aria-label="Abrir mensagens não lidas da classe"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.95)] border border-[#0F1117] animate-pulse cursor-pointer z-10"
        >
          <span className="material-symbols-outlined text-[11px] font-bold">notifications_active</span>
        </button>
      )}

      {/* Menu Rápido para aluno vinculado a classe */}
      {isInClass && menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] py-1.5 z-[999999] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-[var(--border-color)]/70">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {userProfile?.displayName || user?.displayName || 'Aluno'}
            </p>
            <p className="text-[10px] text-[#FFD700] font-semibold flex items-center gap-1 truncate mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_6px_#FFD700] shrink-0" />
              <span className="truncate">{displayClassName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onViewChange('profile');
            }}
            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2.5 text-xs text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">person</span>
            <div className="flex flex-col">
              <span className="font-semibold">Meu Perfil</span>
              <span className="text-[10px] text-[var(--text-muted)]">Dados cadastrais e scripts salvos</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onViewChange('my-class');
            }}
            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between text-xs text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-[#FFD700]">school</span>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold">Minha Classe</span>
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  Colegas, chat, scripts e notas
                </span>
              </div>
            </div>
            {unreadClassMessagesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)]">
                {unreadClassMessagesCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
