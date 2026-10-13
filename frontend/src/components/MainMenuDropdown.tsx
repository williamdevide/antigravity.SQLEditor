import React, { useState, useRef, useEffect } from 'react';
import type { ActiveView } from '../types';

export interface VisiblePanels {
  sidebar: boolean;
  scripts: boolean;
  info: boolean;
}

interface MainMenuDropdownProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  visiblePanels: VisiblePanels;
  onTogglePanel: (panel: keyof VisiblePanels) => void;
}

export const MainMenuDropdown: React.FC<MainMenuDropdownProps> = ({
  activeView,
  onViewChange,
  visiblePanels,
  onTogglePanel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isViewSubmenuOpen, setIsViewSubmenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsViewSubmenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsViewSubmenuOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
    setIsViewSubmenuOpen(false);
  };

  const handleNavClick = (view: ActiveView) => {
    onViewChange(view);
    setIsOpen(false);
    setIsViewSubmenuOpen(false);
  };

  const handleMouseEnterView = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    setIsViewSubmenuOpen(true);
  };

  const handleMouseLeaveView = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setIsViewSubmenuOpen(false);
    }, 250);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botão Hambúrguer ao lado esquerdo do logo */}
      <button
        onClick={toggleDropdown}
        title="Menu Principal"
        aria-label="Abrir Menu Principal"
        className={`w-8 h-8 flex items-center justify-center rounded transition-all cursor-pointer ${
          isOpen
            ? 'bg-[var(--bg-hover)] text-[var(--accent-yellow)] shadow-[0_0_8px_var(--glow-yellow)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        }`}
        type="button"
      >
        <span className="material-symbols-outlined text-[21px]">
          {isOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Menu Principal Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 min-w-[220px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
            Menu SQLEditor
          </div>

          {/* Opção 1: Workspace */}
          <button
            onClick={() => handleNavClick('workspace')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'workspace' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)]">
                terminal
              </span>
              <span>Workspace</span>
            </div>
            {activeView === 'workspace' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 2: Histórico */}
          <button
            onClick={() => handleNavClick('history')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'history' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#00E676]">
                history
              </span>
              <span>Histórico</span>
            </div>
            {activeView === 'history' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 3: Diagrama ER */}
          <button
            onClick={() => handleNavClick('er-diagram')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'er-diagram' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#29B6F6]">
                schema
              </span>
              <span>Diagrama ER</span>
            </div>
            {activeView === 'er-diagram' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 4: Configurações */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'settings' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#FFA726]">
                settings
              </span>
              <span>Configurações</span>
            </div>
            {activeView === 'settings' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 5: Sobre */}
          <button
            onClick={() => handleNavClick('about')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'about' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#AB47BC]">
                info
              </span>
              <span>Sobre</span>
            </div>
            {activeView === 'about' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          <div className="h-px bg-[var(--border-color)] my-1" />

          {/* Submenu Visualização */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnterView}
            onMouseLeave={handleMouseLeaveView}
          >
            <button
              onClick={() => setIsViewSubmenuOpen(prev => !prev)}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)]">
                  visibility
                </span>
                <span className="font-medium">Visualização</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                chevron_right
              </span>
            </button>

            {/* Submenu Flutuante com as 3 opções de alternância */}
            {isViewSubmenuOpen && (
              <div
                className="absolute left-full top-0 ml-1 min-w-[220px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                onMouseEnter={handleMouseEnterView}
                onMouseLeave={handleMouseLeaveView}
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                  Painéis da Interface
                </div>

                {/* Subopção 1: Exibir Schema Explorer */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePanel('sidebar');
                  }}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
                      account_tree
                    </span>
                    <span>Exibir Schema Explorer</span>
                  </div>
                  <div className="w-5 flex items-center justify-center font-bold">
                    {visiblePanels.sidebar ? (
                      <span className="text-[var(--status-success)] text-[14px] font-bold">✓</span>
                    ) : (
                      <span className="text-[var(--text-muted)] opacity-30 text-[11px]">—</span>
                    )}
                  </div>
                </button>

                {/* Subopção 2: Exibir Scripts */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePanel('scripts');
                  }}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-[#FF8533]">
                      code
                    </span>
                    <span>Exibir Scripts</span>
                  </div>
                  <div className="w-5 flex items-center justify-center font-bold">
                    {visiblePanels.scripts ? (
                      <span className="text-[var(--status-success)] text-[14px] font-bold">✓</span>
                    ) : (
                      <span className="text-[var(--text-muted)] opacity-30 text-[11px]">—</span>
                    )}
                  </div>
                </button>

                {/* Subopção 3: Exibir Informações */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePanel('info');
                  }}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-[#00E676]">
                      terminal
                    </span>
                    <span>Exibir Informações</span>
                  </div>
                  <div className="w-5 flex items-center justify-center font-bold">
                    {visiblePanels.info ? (
                      <span className="text-[var(--status-success)] text-[14px] font-bold">✓</span>
                    ) : (
                      <span className="text-[var(--text-muted)] opacity-30 text-[11px]">—</span>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
