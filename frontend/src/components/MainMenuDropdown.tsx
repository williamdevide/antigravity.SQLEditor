import React, { useState, useRef, useEffect } from 'react';
import {
  type ActiveView,
  type ThemeMode,
  type FontTheme,
  THEME_OPTIONS,
  FONT_THEME_OPTIONS,
} from '../types';

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
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  fontTheme: FontTheme;
  onFontThemeChange: (fontTheme: FontTheme) => void;
}

export const MainMenuDropdown: React.FC<MainMenuDropdownProps> = ({
  activeView,
  onViewChange,
  visiblePanels,
  onTogglePanel,
  theme,
  onThemeChange,
  fontTheme,
  onFontThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isViewSubmenuOpen, setIsViewSubmenuOpen] = useState(false);
  const [isSettingsSubmenuOpen, setIsSettingsSubmenuOpen] = useState(false);
  const [isColorThemeOpen, setIsColorThemeOpen] = useState(false);
  const [isFontThemeOpen, setIsFontThemeOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const viewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeAllSubmenus = () => {
    setIsViewSubmenuOpen(false);
    setIsSettingsSubmenuOpen(false);
    setIsColorThemeOpen(false);
    setIsFontThemeOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        closeAllSubmenus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        closeAllSubmenus();
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
    closeAllSubmenus();
  };

  const handleNavClick = (view: ActiveView) => {
    onViewChange(view);
    setIsOpen(false);
    closeAllSubmenus();
  };

  // Hover handlers para Visualização
  const handleMouseEnterView = () => {
    if (viewTimeoutRef.current) clearTimeout(viewTimeoutRef.current);
    if (settingsTimeoutRef.current) clearTimeout(settingsTimeoutRef.current);
    setIsSettingsSubmenuOpen(false);
    setIsViewSubmenuOpen(true);
  };

  const handleMouseLeaveView = () => {
    viewTimeoutRef.current = setTimeout(() => {
      setIsViewSubmenuOpen(false);
    }, 250);
  };

  // Hover handlers para Configurações
  const handleMouseEnterSettings = () => {
    if (settingsTimeoutRef.current) clearTimeout(settingsTimeoutRef.current);
    if (viewTimeoutRef.current) clearTimeout(viewTimeoutRef.current);
    setIsViewSubmenuOpen(false);
    setIsSettingsSubmenuOpen(true);
  };

  const handleMouseLeaveSettings = () => {
    settingsTimeoutRef.current = setTimeout(() => {
      setIsSettingsSubmenuOpen(false);
      setIsColorThemeOpen(false);
      setIsFontThemeOpen(false);
    }, 280);
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
        <div className="absolute left-0 mt-1.5 z-50 min-w-[230px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
            Menu SQLEditor
          </div>

          {/* Opção 0: Página Inicial (Landing Page) */}
          <button
            onClick={() => handleNavClick('landing')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'landing' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#FF6B00]">
                rocket_launch
              </span>
              <span>Página Inicial</span>
            </div>
            {activeView === 'landing' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 1: Workspace / Editor */}
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
              <span>Editor (Workspace)</span>
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

          {/* Opção 4: Modelo ER (MER - Texto) */}
          <button
            onClick={() => handleNavClick('er-model')}
            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
              activeView === 'er-model' ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
            }`}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[17px] text-[#AB47BC]">
                article
              </span>
              <span>Modelo ER (MER Texto)</span>
            </div>
            {activeView === 'er-model' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
            )}
          </button>

          {/* Opção 4: Configurações (com Submenu Temas / Cores do Tema & Cores das Letras) */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnterSettings}
            onMouseLeave={handleMouseLeaveSettings}
          >
            <button
              onClick={() => handleNavClick('settings')}
              className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group ${
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
              <div className="flex items-center gap-1">
                {activeView === 'settings' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-yellow)] shadow-[0_0_6px_var(--glow-yellow)]" />
                )}
                <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  chevron_right
                </span>
              </div>
            </button>

            {/* Submenu Nível 1: Configurações */}
            {isSettingsSubmenuOpen && (
              <div
                className="absolute left-full top-0 ml-1 min-w-[240px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                onMouseEnter={handleMouseEnterSettings}
                onMouseLeave={handleMouseLeaveSettings}
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)] flex items-center justify-between">
                  <span>Configurações</span>
                  <span className="text-[9px] text-[#FFA726]">SQLEditor</span>
                </div>

                {/* Acessar Painel Completo */}
                <button
                  onClick={() => handleNavClick('settings')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#FFA726]">
                    tune
                  </span>
                  <span>Abrir Painel de Configurações</span>
                </button>

                <div className="h-px bg-[var(--border-color)] my-1" />

                <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Submenu Temas
                </div>

                {/* Submenu Nível 2A: Cores do Tema */}
                <div
                  className="relative"
                  onMouseEnter={() => {
                    setIsColorThemeOpen(true);
                    setIsFontThemeOpen(false);
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsColorThemeOpen(prev => !prev);
                      setIsFontThemeOpen(false);
                    }}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-[var(--accent-orange)]">
                        palette
                      </span>
                      <span>Cores do Tema</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-mono">Alt+T</kbd>
                      <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>

                  {/* Submenu Nível 3: Opções de Cores do Tema */}
                  {isColorThemeOpen && (
                    <div className="absolute left-full top-0 ml-1 min-w-[260px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        Selecione as Cores do Tema
                      </div>
                      {THEME_OPTIONS.map((t) => {
                        const isSelected = theme === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onThemeChange(t.id);
                            }}
                            type="button"
                            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-inner shrink-0"
                                style={{ backgroundColor: t.bgPreview }}
                              />
                              <div className="flex flex-col">
                                <span className="leading-tight">{t.name}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{t.description.slice(0, 32)}...</span>
                              </div>
                            </div>
                            <div className="w-5 flex items-center justify-center font-bold">
                              {isSelected ? (
                                <span className="text-[var(--status-success)] text-[14px]">✓</span>
                              ) : (
                                <span className="text-[var(--text-muted)] opacity-20 text-[10px]">—</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submenu Nível 2B: Cores das Letras */}
                <div
                  className="relative"
                  onMouseEnter={() => {
                    setIsFontThemeOpen(true);
                    setIsColorThemeOpen(false);
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFontThemeOpen(prev => !prev);
                      setIsColorThemeOpen(false);
                    }}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
                        format_color_text
                      </span>
                      <span>Cores das Letras</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-mono">Alt+L</kbd>
                      <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>

                  {/* Submenu Nível 3: Opções de Cores das Letras */}
                  {isFontThemeOpen && (
                    <div className="absolute left-full top-0 ml-1 min-w-[260px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        Selecione as Cores das Letras
                      </div>
                      {FONT_THEME_OPTIONS.map((f) => {
                        const isSelected = fontTheme === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onFontThemeChange(f.id);
                            }}
                            type="button"
                            className={`w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-[var(--bg-hover)]/70 text-[var(--accent-yellow)] font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-md shrink-0"
                                style={{ backgroundColor: f.accentPreview }}
                              />
                              <div className="flex flex-col">
                                <span className="leading-tight">{f.name}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{f.description.slice(0, 32)}...</span>
                              </div>
                            </div>
                            <div className="w-5 flex items-center justify-center font-bold">
                              {isSelected ? (
                                <span className="text-[var(--status-success)] text-[14px]">✓</span>
                              ) : (
                                <span className="text-[var(--text-muted)] opacity-20 text-[10px]">—</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                className="absolute left-full top-0 ml-1 min-w-[220px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-50"
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
