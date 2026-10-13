import React, { useState, useRef, useEffect } from 'react';
import type { SolutionItem } from '../services/scriptsLoader';

interface NewTabDropdownProps {
  onNewBlankTab: () => void;
  onSelectSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  triggerButton: (props: {
    isOpen: boolean;
    toggle: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
  align?: 'left' | 'right';
}

export const NewTabDropdown: React.FC<NewTabDropdownProps> = ({
  onNewBlankTab,
  onSelectSolution,
  solutions,
  triggerButton,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSolutionsSubmenuOpen, setIsSolutionsSubmenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSolutionsSubmenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsSolutionsSubmenuOpen(false);
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
    setIsSolutionsSubmenuOpen(false);
  };

  const handleBlankClick = () => {
    onNewBlankTab();
    setIsOpen(false);
    setIsSolutionsSubmenuOpen(false);
  };

  const handleSolutionClick = (sol: SolutionItem) => {
    onSelectSolution(sol);
    setIsOpen(false);
    setIsSolutionsSubmenuOpen(false);
  };

  const handleMouseEnterSolutions = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsSolutionsSubmenuOpen(true);
  };

  const handleMouseLeaveSolutions = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsSolutionsSubmenuOpen(false);
    }, 250);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {triggerButton({ isOpen, toggle: toggleDropdown })}

      {isOpen && (
        <div
          className={`absolute z-50 mt-1 min-w-[210px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Opção 1: Criar aba em branco */}
          <button
            onClick={handleBlankClick}
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2.5 transition-colors cursor-pointer group"
          >
            <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)] group-hover:scale-110 transition-transform">
              note_add
            </span>
            <div className="flex flex-col">
              <span className="font-medium text-[12px] text-[var(--text-primary)]">
                Criar aba em branco
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Novo script SQL vazio
              </span>
            </div>
          </button>

          <div className="h-px bg-[var(--border-color)] my-1" />

          {/* Opção 2: Carregar Soluções com Submenu */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnterSolutions}
            onMouseLeave={handleMouseLeaveSolutions}
          >
            <button
              onClick={() => setIsSolutionsSubmenuOpen(prev => !prev)}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-[#00E676] group-hover:scale-110 transition-transform">
                  school
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-[12px] text-[var(--text-primary)]">
                    Carregar Soluções
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {solutions.length} {solutions.length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                chevron_right
              </span>
            </button>

            {/* Submenu de Soluções */}
            {isSolutionsSubmenuOpen && (
              <div
                className="absolute left-full top-0 ml-1 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                onMouseEnter={handleMouseEnterSolutions}
                onMouseLeave={handleMouseLeaveSolutions}
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                  Selecione a Solução
                </div>

                {solutions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                    Nenhum arquivo de solução encontrado em data/solutions.
                  </div>
                ) : (
                  solutions.map(sol => (
                    <button
                      key={sol.id}
                      onClick={() => handleSolutionClick(sol)}
                      type="button"
                      title={sol.fileName}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                    >
                      <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)] shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        description
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[11px] text-[var(--text-primary)] truncate group-hover:text-[var(--accent-yellow)] transition-colors">
                          {sol.displayName}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                          {sol.fileName}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
