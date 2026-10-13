import React from 'react';
import type { ActiveView, ThemeMode } from '../types';
import { NewTabDropdown } from './NewTabDropdown';
import type { SolutionItem } from '../services/scriptsLoader';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onRunQuery: () => void;
  onNewBlankTab: () => void;
  onOpenSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  onClearEditor: () => void;
  onCloseAllTabs: () => void;
  onResetDb: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isExecuting: boolean;
  activeDatabase: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  onRunQuery,
  onNewBlankTab,
  onOpenSolution,
  solutions,
  onClearEditor,
  onCloseAllTabs,
  onResetDb,
  theme,
  onToggleTheme,
  isExecuting,
  activeDatabase,
}) => {
  return (
    <header className="h-[52px] bg-[var(--bg-surface)] text-[var(--text-primary)] px-4 flex items-center justify-between border-b border-[var(--border-color)] shadow-[0_1px_8px_rgba(0,0,0,0.25)] z-30 select-none transition-colors">
      {/* Brand & Navigation */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onViewChange('workspace')}>
          <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[22px] drop-shadow-[0_0_8px_var(--glow-yellow)]">
            bolt
          </span>
          <span className="text-[16px] text-[var(--text-primary)] tracking-tight font-bold">
            SQLEditor
          </span>
        </div>

        {/* Versão */}
        <span className="px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-[10px] font-mono font-semibold border border-[var(--accent-yellow)]/30 shadow-[0_0_8px_var(--glow-yellow)]">
          v2.5.5
        </span>

        {/* Indicador de Banco Ativo */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--status-success)] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] shadow-[0_0_6px_var(--glow-success)]"></span>
          <span className="text-[var(--text-muted)]">db:</span>
          <span className="font-semibold text-[var(--status-success)]">{activeDatabase}</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          <button
            onClick={() => onViewChange('workspace')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'workspace'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => onViewChange('history')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60'
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => onViewChange('er-diagram')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'er-diagram'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60'
            }`}
          >
            Diagrama ER
          </button>
          <button
            onClick={() => onViewChange('settings')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'settings'
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60'
            }`}
          >
            Configurações
          </button>
          <button
            onClick={() => onViewChange('about')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              activeView === 'about'
                ? 'bg-[var(--bg-hover)] text-[var(--accent-yellow)] border border-[var(--border-color)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/60'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>Sobre</span>
          </button>
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Executar */}
        <button
          onClick={onRunQuery}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF8533] active:scale-95 text-white text-xs font-semibold rounded shadow-[0_0_14px_rgba(255,107,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
          title="Executar Script SQL (Ctrl+Enter)"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isExecuting ? 'sync' : 'play_arrow'}
          </span>
          <span>{isExecuting ? 'Executando...' : 'Executar'}</span>
          <span className="hidden xl:inline text-[10px] text-white/80 font-mono font-normal">
            (Ctrl+↵)
          </span>
        </button>

        {/* Nova Aba com Menu Suspenso */}
        <NewTabDropdown
          onNewBlankTab={onNewBlankTab}
          onSelectSolution={onOpenSolution}
          solutions={solutions}
          align="left"
          triggerButton={({ isOpen, toggle }) => (
            <button
              onClick={toggle}
              className={`flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium rounded transition-colors cursor-pointer ${
                isOpen ? 'border-[#FFE600] bg-[var(--bg-hover)] shadow-[0_0_8px_rgba(255,230,0,0.2)]' : ''
              }`}
              title="Nova Aba ou Carregar Solução (Ctrl+T)"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px] text-[#FFE600]">add</span>
              <span className="hidden sm:inline">Nova Aba</span>
              <span className="material-symbols-outlined text-[13px] text-[var(--text-muted)] -ml-0.5">
                arrow_drop_down
              </span>
            </button>
          )}
        />

        {/* Limpar */}
        <button
          onClick={onClearEditor}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium rounded transition-colors cursor-pointer"
          title="Limpar Conteúdo do Editor Atual"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">clear_all</span>
          <span>Limpar</span>
        </button>

        {/* Excluir / Fechar Todas as Guias com Confirmação */}
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja fechar todas as guias de scripts abertas?')) {
              onCloseAllTabs();
            }
          }}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[#FF3366]/10 text-[var(--text-secondary)] hover:text-[#FF3366] border border-[var(--border-color)] hover:border-[#FF3366]/50 text-xs font-medium rounded transition-all cursor-pointer"
          title="Fechar todas as guias de scripts abertas (com confirmação)"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px] text-[#FF3366]">delete_sweep</span>
          <span>Fechar Todas</span>
        </button>

        {/* Resetar Banco */}
        <button
          onClick={onResetDb}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[#FF3366]/15 text-[#FF3366] border border-[#FF3366]/40 hover:border-[#FF3366] text-xs font-medium rounded transition-all cursor-pointer shadow-[0_0_8px_rgba(255,51,102,0.15)]"
          title="Restaurar Padrões e Bancos Iniciais"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">restart_alt</span>
          <span className="hidden sm:inline">Resetar Banco</span>
        </button>

        <div className="h-4 w-px bg-[var(--border-color)] mx-1"></div>

        {/* Alternar Tema */}
        <button
          onClick={onToggleTheme}
          aria-label="Alternar Tema"
          title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FFE600] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  );
};
