import React from 'react';
import {
  type ActiveView,
  type ThemeMode,
  type FontTheme,
  THEME_OPTIONS,
} from '../types';
import { NewTabDropdown } from './NewTabDropdown';
import { MainMenuDropdown, type VisiblePanels } from './MainMenuDropdown';
import type { SolutionItem } from '../services/scriptsLoader';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  visiblePanels: VisiblePanels;
  onTogglePanel: (panel: keyof VisiblePanels) => void;
  onRunQuery: () => void;
  onNewBlankTab: () => void;
  onOpenSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
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
}) => {
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

  return (
    <header className="h-[52px] bg-[var(--bg-surface)] text-[var(--text-primary)] px-3 sm:px-4 flex items-center justify-between border-b border-[var(--border-color)] shadow-[0_1px_8px_rgba(0,0,0,0.25)] z-30 select-none transition-colors">
      {/* Brand & Main Hamburger Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
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
        />

        {/* Brand */}
        <div 
          className="flex items-center gap-1.5 cursor-pointer group" 
          onClick={() => onViewChange('landing')}
          title="Ir para a Página Inicial (Landing Page)"
        >
          <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[22px] drop-shadow-[0_0_8px_var(--glow-yellow)] group-hover:scale-110 transition-transform">
            bolt
          </span>
          <span className="text-[16px] text-[var(--text-primary)] tracking-tight font-bold">
            SQLEditor
          </span>
        </div>

        {/* Versão */}
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-[10px] font-mono font-semibold border border-[var(--accent-yellow)]/30 shadow-[0_0_8px_var(--glow-yellow)]">
          v3.1.15
        </span>

        {/* Indicador de Banco Ativo */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--status-success)] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] shadow-[0_0_6px_var(--glow-success)]"></span>
          <span className="text-[var(--text-muted)]">db:</span>
          <span className="font-semibold text-[var(--status-success)]">{activeDatabase}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Botões operacionais exclusivos do modo Workspace */}
        {activeView === 'workspace' && (
          <>
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
          </>
        )}

        {/* Alternar Tema (Ciclo entre Dark, Light, Beige e Graphite) - Sempre visível */}
        <button
          onClick={onToggleTheme}
          aria-label="Alternar Tema"
          title={`Tema Atual: ${currentThemeObj?.name || theme}. Clique ou pressione Alt+T para alternar temas.`}
          className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FFE600] hover:bg-[var(--bg-hover)] rounded transition-colors cursor-pointer"
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
              className={`w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer ${
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
              className={`w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer ${
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
              className={`w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer ${
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
      </div>
    </header>
  );
};
