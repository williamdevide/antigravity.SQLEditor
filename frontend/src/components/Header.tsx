import React, { useState, useRef, useEffect } from 'react';
import {
  type ActiveView,
  type ThemeMode,
  type FontTheme,
  type SavedScriptItem,
  THEME_OPTIONS,
} from '../types';
import { NewTabDropdown } from './NewTabDropdown';
import { MainMenuDropdown, type VisiblePanels } from './MainMenuDropdown';
import type { SolutionItem } from '../services/scriptsLoader';
import { APP_VERSION } from '../config/version';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  visiblePanels: VisiblePanels;
  onTogglePanel: (panel: keyof VisiblePanels) => void;
  onRunQuery: () => void;
  onRunSnippet?: () => void;
  onNewBlankTab: () => void;
  onOpenSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  savedScripts?: SavedScriptItem[];
  onSelectSavedScript?: (script: SavedScriptItem) => void;
  classExamples?: SavedScriptItem[];
  classExercises?: SavedScriptItem[];
  classExams?: SavedScriptItem[];
  isExamModeActive?: boolean;
  onClearEditor: () => void;
  onCloseAllTabs: () => void;
  onResetDb: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleTheme: () => void;
  fontTheme: FontTheme;
  onFontThemeChange: (fontTheme: FontTheme) => void;
  isExecuting: boolean;
  activeDatabase: string;
  workspaceLayoutMode?: 'editor' | 'split' | 'der';
  onWorkspaceLayoutModeChange?: (mode: 'editor' | 'split' | 'der') => void;
  confirmBeforeCloseAllTabs?: boolean;
  onOpenHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  visiblePanels,
  onTogglePanel,
  onRunQuery,
  onNewBlankTab,
  onOpenSolution,
  solutions,
  savedScripts = [],
  onSelectSavedScript,
  classExamples = [],
  classExercises = [],
  classExams = [],
  isExamModeActive = false,
  onClearEditor,
  onCloseAllTabs,
  onResetDb,
  theme,
  onThemeChange,
  onToggleTheme,
  fontTheme,
  onFontThemeChange,
  isExecuting,
  activeDatabase,
  onRunSnippet,
  workspaceLayoutMode = 'editor',
  onWorkspaceLayoutModeChange,
  confirmBeforeCloseAllTabs = true,
  onOpenHub,
}) => {
  const { user, userProfile, isAdmin, isProfessor, openAuthModal, logout } = useAuth();
  const [runDropdownOpen, setRunDropdownOpen] = useState(false);
  const runDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (runDropdownRef.current && !runDropdownRef.current.contains(e.target as Node)) {
        setRunDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRunDropdownOpen(false);
    };
    if (runDropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [runDropdownOpen]);

  const currentThemeObj = THEME_OPTIONS.find(t => t.id === theme);

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return 'dark_mode';
      case 'light':
        return 'light_mode';
      case 'beige':
        return 'coffee';
      case 'graphite':
        return 'contrast';
      default:
        return 'dark_mode';
    }
  };

  const handleSafeCloseAllTabs = () => {
    if (confirmBeforeCloseAllTabs) {
      if (window.confirm('Tem certeza que deseja fechar todas as guias de scripts abertas?')) {
        onCloseAllTabs();
      }
    } else {
      onCloseAllTabs();
    }
  };

  return (
    <header className="h-[46px] bg-[var(--bg-surface)] text-[var(--text-primary)] px-2.5 sm:px-3 flex items-center justify-between border-b border-[var(--border-color)] shadow-[0_1px_8px_rgba(0,0,0,0.25)] relative z-50 select-none transition-colors">
      {/* Brand & Main Hamburger Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Menu Hambúrguer ao lado esquerdo do logo */}
        <MainMenuDropdown
          activeView={activeView}
          onViewChange={onViewChange}
          visiblePanels={visiblePanels}
          onTogglePanel={onTogglePanel}
          theme={theme}
          onThemeChange={onThemeChange}
          fontTheme={fontTheme}
          onFontThemeChange={onFontThemeChange}
          onOpenHub={onOpenHub}
        />

        {/* Brand */}
        <div 
          className="flex items-center gap-1.5 cursor-pointer group" 
          onClick={() => onViewChange('landing')}
          title="Ir para a Página Inicial (Landing Page)"
        >
          <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[19px] drop-shadow-[0_0_8px_var(--glow-yellow)] group-hover:scale-110 transition-transform">
            bolt
          </span>
          <span className="text-[14.5px] text-[var(--text-primary)] tracking-tight font-bold">
            SQLEditor
          </span>
        </div>

        {/* Versão */}
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-[9px] font-mono font-semibold border border-[var(--accent-yellow)]/30 shadow-[0_0_8px_var(--glow-yellow)]">
          v{APP_VERSION}
        </span>

        {/* Indicador de Banco Ativo */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--status-success)] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] shadow-[0_0_6px_var(--glow-success)]"></span>
          <span className="text-[var(--text-muted)]">db:</span>
          <span className="font-semibold text-[var(--status-success)] truncate max-w-[120px]">{activeDatabase}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Alternador de Layout do Workspace [Editor | SQL ↔ DER | DER] - Compacto 10% */}
        {activeView === 'workspace' && onWorkspaceLayoutModeChange && (
          <div className="hidden md:flex items-center p-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] whitespace-nowrap flex-nowrap shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => onWorkspaceLayoutModeChange('editor')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                workspaceLayoutMode === 'editor'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] font-bold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Exibir apenas o Editor de Scripts SQL"
            >
              <span className="material-symbols-outlined text-[13px]">code</span>
              <span className="hidden xl:inline text-[9.5px]">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => onWorkspaceLayoutModeChange('split')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                workspaceLayoutMode === 'split'
                  ? 'bg-[#FF6B00] text-white font-bold shadow-[0_0_8px_rgba(255,107,0,0.35)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Split-View Reativo: Editor SQL ↔ Estúdio DER lado a lado"
            >
              <span className="material-symbols-outlined text-[13px]">vertical_split</span>
              <span className="font-semibold text-[9.5px] whitespace-nowrap">SQL ↔ DER</span>
            </button>
            <button
              type="button"
              onClick={() => onWorkspaceLayoutModeChange('der')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                workspaceLayoutMode === 'der'
                  ? 'bg-[var(--bg-surface)] text-[#29B6F6] font-bold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Exibir DER em destaque no Workspace"
            >
              <span className="material-symbols-outlined text-[13px]">schema</span>
              <span className="hidden xl:inline text-[9.5px]">DER</span>
            </button>
          </div>
        )}

        {/* Botões operacionais exclusivos do modo Workspace */}
        {activeView === 'workspace' && (
          <>
            {/* Executar Split Button com Setinha Dropdown */}
            <div className={`relative inline-flex items-stretch rounded shadow-[0_0_14px_rgba(255,107,0,0.4)] ${runDropdownOpen ? "z-[60]" : ""}`}>

              {/* Botão Principal: Executar Tudo (Ctrl+Enter) */}
              <button
                onClick={onRunQuery}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FF6B00] hover:bg-[#FF8533] active:scale-95 text-white text-[11px] font-semibold rounded-l transition-all cursor-pointer disabled:opacity-50"
                title="Executar Script SQL Completo (Ctrl+Enter)"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isExecuting ? 'sync' : 'play_arrow'}
                </span>
                <span>{isExecuting ? 'Executando...' : 'Executar'}</span>
                <span className="hidden 2xl:inline text-[10px] text-white/80 font-mono font-normal">
                  (Ctrl+↵)
                </span>
              </button>

              {/* Divisor vertical sutil */}
              <div className="w-[1px] bg-white/20 self-stretch"></div>

              {/* Botão com Setinha para Opções de Execução */}
              <button
                onClick={() => setRunDropdownOpen(prev => !prev)}
                disabled={isExecuting}
                className={`px-1 py-1 bg-[#FF6B00] hover:bg-[#FF8533] active:scale-95 text-white rounded-r transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center ${
                  runDropdownOpen ? 'bg-[#FF8533]' : ''
                }`}
                title="Mais opções de execução"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  arrow_drop_down
                </span>
              </button>

              {/* Menu Suspenso de Execução */}
              {runDropdownOpen && (
                <div
                  ref={runDropdownRef}
                  className="absolute top-full left-0 mt-1 w-60 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.45)] py-1.5 text-xs select-none backdrop-blur-md z-[999999] animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => {
                      setRunDropdownOpen(false);
                      if (onRunSnippet) {
                        onRunSnippet();
                      } else {
                        onRunQuery();
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[var(--status-success)] group-hover:scale-110 transition-transform">
                        play_arrow
                      </span>
                      <span className="font-medium">Executar esse trecho</span>
                    </div>
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent-yellow)]">
                      Alt+E
                    </kbd>
                  </button>
                </div>
              )}
            </div>

            {/* Nova Aba (Split Button): Clique no texto/ícone cria aba em branco, clique na seta abre menu suspenso */}
            <div className="flex items-center bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] rounded transition-colors shadow-sm">
              <button
                onClick={onNewBlankTab}
                className="flex items-center gap-1 px-2 py-1 text-[var(--text-primary)] hover:text-[var(--accent-yellow)] text-[11px] font-medium rounded-l transition-colors cursor-pointer"
                title="Nova Aba em Branco (Ctrl+T)"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px] text-[#FFE600]">add</span>
                <span className="hidden sm:inline">Nova Aba</span>
              </button>

              <div className="w-[1px] h-4 bg-[var(--border-color)] self-center"></div>

              <NewTabDropdown
                onNewBlankTab={onNewBlankTab}
                onSelectSolution={onOpenSolution}
                solutions={solutions}
                savedScripts={savedScripts}
                onSelectSavedScript={onSelectSavedScript}
                classExamples={classExamples}
                classExercises={classExercises}
                classExams={classExams}
                isExamModeActive={isExamModeActive}
                align="left"
                triggerButton={({ isOpen, toggle }) => (
                  <button
                    onClick={toggle}
                    className={`px-1 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-r transition-colors cursor-pointer flex items-center justify-center ${
                      isOpen ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)]' : ''
                    }`}
                    title="Mais opções de Nova Aba (Carregar Soluções)"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      arrow_drop_down
                    </span>
                  </button>
                )}
              />
            </div>

            {/* Limpar */}
            <button
              onClick={onClearEditor}
              className="hidden md:flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-[11px] font-medium rounded transition-colors cursor-pointer"
              title="Limpar Conteúdo do Editor Atual (com confirmação)"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">clear_all</span>
              <span>Limpar</span>
            </button>

            {/* Excluir / Fechar Todas as Guias com Confirmação Segura */}
            <button
              onClick={handleSafeCloseAllTabs}
              className="hidden lg:flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] hover:bg-[#FF3366]/10 text-[var(--text-secondary)] hover:text-[#FF3366] border border-[var(--border-color)] hover:border-[#FF3366]/50 text-[11px] font-medium rounded transition-all cursor-pointer"
              title="Fechar todas as guias de scripts abertas (com confirmação)"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-[#FF3366]">delete_sweep</span>
              <span>Fechar Todas</span>
            </button>

            {/* Resetar Banco */}
            <button
              onClick={onResetDb}
              className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] hover:bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40 hover:border-[#FF3366] text-[11px] font-medium rounded transition-all cursor-pointer shadow-[0_0_8px_rgba(255,51,102,0.15)]"
              title="Restaurar Padrões e Bancos Iniciais"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              <span className="hidden sm:inline">Resetar Banco</span>
            </button>

            <div className="h-4 w-px bg-[var(--border-color)] mx-1"></div>
          </>
        )}

        {/* Alternar Tema (Ciclo entre Dark, Light, Beige e Graphite) - Sempre visível */}
        <button
          onClick={onToggleTheme}
          aria-label="Alternar Tema"
          title={`Tema Atual: ${currentThemeObj?.name || theme}. Clique ou pressione Alt+T para alternar temas.`}
          className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FFE600] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {getThemeIcon()}
          </span>
        </button>

        {/* 3 Botões de Exibir/Ocultar Áreas do Workspace (Estilo VS Code) ao lado do botão de tema */}
        {activeView === 'workspace' && (
          <div className="flex items-center gap-1 pl-1.5 border-l border-[var(--border-color)]">
            {/* 1. Toggle Barra Lateral (Primary Side Bar - Schema Explorer) */}
            <button
              onClick={() => onTogglePanel('sidebar')}
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
                visiblePanels.sidebar
                  ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)] border border-[var(--accent-yellow)]/30 shadow-[0_0_6px_var(--glow-yellow)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent opacity-60'
              }`}
              title={visiblePanels.sidebar ? "Ocultar Barra Lateral (Schema Explorer)" : "Exibir Barra Lateral (Schema Explorer)"}
              aria-label="Alternar Barra Lateral"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5ZM3.5 3H5.5V13H3.5C3.22386 13 3 12.7761 3 12.5V3.5C3 3.22386 3.22386 3 3.5 3ZM6.5 13H12.5C12.7761 13 13 12.7761 13 12.5V3.5C13 3.22386 12.7761 3 12.5 3H6.5V13Z" />
              </svg>
            </button>

            {/* 2. Toggle Editor de Scripts (Editor Workspace) */}
            <button
              onClick={() => onTogglePanel('scripts')}
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
                visiblePanels.scripts
                  ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)] border border-[var(--accent-yellow)]/30 shadow-[0_0_6px_var(--glow-yellow)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent opacity-60'
              }`}
              title={visiblePanels.scripts ? "Ocultar Editor de Scripts" : "Exibir Editor de Scripts"}
              aria-label="Alternar Editor de Scripts"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H12.5C12.7761 3 13 3.22386 13 3.5V5.5H3V3.5ZM3 6.5H13V12.5C13 12.7761 12.7761 13 12.5 13H3.5C3.22386 13 3 12.7761 3 12.5V6.5Z" />
              </svg>
            </button>

            {/* 3. Toggle Painel Inferior de Informações (Console / Dados / Retorno / Log / Revisão) */}
            <button
              onClick={() => onTogglePanel('info')}
              type="button"
              className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
                visiblePanels.info
                  ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)] border border-[var(--accent-yellow)]/30 shadow-[0_0_6px_var(--glow-yellow)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent opacity-60'
              }`}
              title={visiblePanels.info ? "Ocultar Painel Inferior (Dados, Retorno, Log, Revisão)" : "Exibir Painel Inferior (Dados, Retorno, Log, Revisão)"}
              aria-label="Alternar Painel Inferior"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H12.5C12.7761 3 13 3.22386 13 3.5V9.5H3V3.5ZM3 10.5V12.5C3 12.7761 3.22386 13 3.5 13H12.5C12.7761 13 13 12.7761 13 12.5V10.5H3Z" />
              </svg>
            </button>
          </div>
        )}

        {/* 4. Acesso / Perfil do Aluno e Administrador */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-[var(--border-color)]">
          {user ? (
            <div className="flex items-center gap-1.5">
              {/* Botão de Perfil: apenas foto ou letra inicial (sem texto do nome) */}
              <button
                type="button"
                onClick={() => onViewChange('profile')}
                className="w-7 h-7 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] hover:border-[#FF6B00] flex items-center justify-center p-0.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0 overflow-hidden"
                title={`Perfil: ${userProfile?.displayName || user.displayName || user.email} (${
                  isAdmin
                    ? 'Administrador'
                    : isProfessor || userProfile?.role === 'professor'
                    ? 'Professor'
                    : 'Aluno'
                })`}
                aria-label="Acessar Meu Perfil"
              >
                {user.photoURL || userProfile?.photoURL ? (
                  <img
                    src={(userProfile?.photoURL || user.photoURL) || undefined}
                    alt={userProfile?.displayName || user.displayName || 'Avatar'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FFE600] text-black text-[10px] font-black flex items-center justify-center shadow-inner">
                    {(userProfile?.displayName || user.displayName || user.email || 'U')[0].toUpperCase()}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Deseja realmente sair da conta?')) {
                    await logout();
                    onViewChange('landing');
                  }
                }}
                className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                title="Sair da Conta"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="px-2 py-1 rounded bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:brightness-110 text-white text-[11px] font-bold shadow-[0_0_8px_rgba(255,107,0,0.3)] transition-colors cursor-pointer"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
