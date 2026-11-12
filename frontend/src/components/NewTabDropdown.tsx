import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SolutionItem } from '../services/scriptsLoader';
import type { SavedScriptItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface NewTabDropdownProps {
  onNewBlankTab: () => void;
  onSelectSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  savedScripts?: SavedScriptItem[];
  onSelectSavedScript?: (script: SavedScriptItem) => void;
  classExamples?: SavedScriptItem[];
  classExercises?: SavedScriptItem[];
  classExams?: SavedScriptItem[];
  isExamModeActive?: boolean;
  triggerButton: (props: {
    isOpen: boolean;
    toggle: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
  align?: 'left' | 'right';
}

type SubmenuType = 'solutions' | 'saved' | 'examples' | 'exercises' | 'exams' | null;

export const NewTabDropdown: React.FC<NewTabDropdownProps> = ({
  onNewBlankTab,
  onSelectSolution,
  solutions,
  savedScripts = [],
  onSelectSavedScript,
  classExamples = [],
  classExercises = [],
  classExams = [],
  isExamModeActive = false,
  triggerButton,
  align = 'left',
}) => {
  const { user, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSubmenuLeft = menuCoords ? (menuCoords.left + 230 + 320 > window.innerWidth) : false;

  const updatePosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const top = rect.bottom + 4;
      let left = align === 'right' ? rect.right - 230 : rect.left;
      if (left < 8) left = 8;
      if (left + 240 > window.innerWidth) left = Math.max(8, window.innerWidth - 245);
      setMenuCoords({ top, left });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
    setActiveSubmenu(null);
  };

  const handleBlankClick = () => {
    if (isExamModeActive) return;
    onNewBlankTab();
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleSolutionClick = (sol: SolutionItem) => {
    onSelectSolution(sol);
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleSavedScriptClick = (script: SavedScriptItem) => {
    if (onSelectSavedScript) {
      onSelectSavedScript(script);
    }
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleMouseEnterSubmenu = (type: SubmenuType) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveSubmenu(type);
  };

  const handleMouseLeaveSubmenu = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 350);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {triggerButton({ isOpen, toggle: toggleDropdown })}

      {isOpen && menuCoords && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            zIndex: 99999,
          }}
          className="min-w-[230px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Se estiver em Modo Avaliação, bloqueia opções gerais */}
          {isExamModeActive ? (
            <div className="p-3 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <p className="text-[11px] font-bold text-purple-300">Modo Avaliação Ativo</p>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                A criação de novas abas livres e consulta a outros scripts está bloqueada durante a prova.
              </p>
              {classExams.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-color)] text-left">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">
                    Guias da Prova:
                  </span>
                  {classExams.map((exam) => (
                    <button
                      key={exam.id}
                      onClick={() => handleSavedScriptClick(exam)}
                      type="button"
                      className="w-full text-left p-1.5 rounded hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] text-purple-400">quiz</span>
                      <span className="text-xs truncate text-[var(--text-primary)]">{exam.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
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

              {/* Opção 2: Carregar Scripts Salvos (do próprio aluno/professor) */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnterSubmenu('saved')}
                onMouseLeave={handleMouseLeaveSubmenu}
              >
                <button
                  onClick={() => setActiveSubmenu((prev) => (prev === 'saved' ? null : 'saved'))}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[17px] text-[#FF6B00] group-hover:scale-110 transition-transform">
                      bookmark
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-[12px] text-[var(--text-primary)]">
                        Carregar Scripts Salvos
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {!user
                          ? 'Requer login'
                          : `${savedScripts.length} ${savedScripts.length === 1 ? 'script no perfil' : 'scripts no perfil'}`}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                    chevron_right
                  </span>
                </button>

                {/* Submenu: Scripts Salvos */}
                {activeSubmenu === 'saved' && (
                  <div
                    className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}
                    onMouseEnter={() => handleMouseEnterSubmenu('saved')}
                    onMouseLeave={handleMouseLeaveSubmenu}
                  >
                    <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                      Meus Scripts Salvos
                    </div>

                    {!user ? (
                      <div className="p-3 text-center space-y-2">
                        <span className="material-symbols-outlined text-[24px] text-[var(--accent-yellow)] block mx-auto">
                          account_circle
                        </span>
                        <p className="font-semibold text-xs text-[var(--text-primary)]">
                          Login Necessário
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] leading-tight">
                          Faça login para salvar e carregar seus scripts na nuvem em qualquer dispositivo.
                        </p>
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            setActiveSubmenu(null);
                            openAuthModal('login');
                          }}
                          type="button"
                          className="w-full py-1.5 px-3 rounded-lg bg-[var(--accent-yellow)] text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer mt-1"
                        >
                          Entrar na Conta
                        </button>
                      </div>
                    ) : savedScripts.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px] space-y-1">
                        <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]/60 block mx-auto">
                          bookmark_border
                        </span>
                        <p className="font-medium text-[var(--text-primary)]">Nenhum script salvo ainda</p>
                        <p className="text-[10px]">
                          Abra uma guia e use o botão <strong className="text-[var(--accent-yellow)]">Salvar no Perfil (Ctrl+S)</strong>.
                        </p>
                      </div>
                    ) : (
                      savedScripts.map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() => handleSavedScriptClick(sc)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#FF6B00] shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            description
                          </span>
                          <div className="flex flex-col min-w-0 w-full">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-medium text-[11px] text-[var(--text-primary)] truncate group-hover:text-[#FF6B00] transition-colors">
                                {sc.title}
                              </span>
                              {sc.category && sc.category !== 'student_saved' && (
                                <span className="text-[8px] font-mono px-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] shrink-0">
                                  {sc.category === 'example' ? 'Exemplo' : sc.category === 'exercise' ? 'Exercício' : sc.category === 'class_database' ? 'BD' : sc.category === 'exam' ? 'Prova' : sc.category}
                                </span>
                              )}
                            </div>
                            {sc.description && (
                              <p className="text-[9.5px] text-[var(--text-muted)] line-clamp-2 leading-tight mt-0.5 group-hover:text-[var(--text-secondary)] transition-colors">
                                {sc.description}
                              </p>
                            )}
                            <span className="text-[8.5px] text-[var(--text-muted)]/80 mt-0.5">
                              {new Date(sc.updatedAt || sc.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Opção 3: Exemplos da Turma (se houver) */}
              {classExamples.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnterSubmenu('examples')}
                  onMouseLeave={handleMouseLeaveSubmenu}
                >
                  <button
                    onClick={() => setActiveSubmenu((prev) => (prev === 'examples' ? null : 'examples'))}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[17px] text-[#00E5FF] group-hover:scale-110 transition-transform">
                        lightbulb
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-[12px] text-[var(--text-primary)]">
                          Exemplos da Turma
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {classExamples.length}{' '}
                          {classExamples.length === 1 ? 'exemplo do professor' : 'exemplos do professor'}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      chevron_right
                    </span>
                  </button>

                  {activeSubmenu === 'examples' && (
                    <div
                      className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}
                      onMouseEnter={() => handleMouseEnterSubmenu('examples')}
                      onMouseLeave={handleMouseLeaveSubmenu}
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        Exemplos de Aula
                      </div>
                      {classExamples.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => handleSavedScriptClick(ex)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[#00E5FF] shrink-0 mt-0.5">
                            code
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                              {ex.title}
                            </span>
                            {ex.description && (
                              <span className="text-[10px] text-[var(--text-muted)] truncate">
                                {ex.description}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Opção 4: Exercícios da Turma (se houver) */}
              {classExercises.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnterSubmenu('exercises')}
                  onMouseLeave={handleMouseLeaveSubmenu}
                >
                  <button
                    onClick={() => setActiveSubmenu((prev) => (prev === 'exercises' ? null : 'exercises'))}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[17px] text-[var(--accent-yellow)] group-hover:scale-110 transition-transform">
                        assignment
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-[12px] text-[var(--text-primary)]">
                          Exercícios da Turma
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {classExercises.length}{' '}
                          {classExercises.length === 1 ? 'exercício prático' : 'exercícios práticos'}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      chevron_right
                    </span>
                  </button>

                  {activeSubmenu === 'exercises' && (
                    <div
                      className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}
                      onMouseEnter={() => handleMouseEnterSubmenu('exercises')}
                      onMouseLeave={handleMouseLeaveSubmenu}
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                        Exercícios da Turma
                      </div>
                      {classExercises.map((exe) => (
                        <button
                          key={exe.id}
                          onClick={() => handleSavedScriptClick(exe)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                        >
                          <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)] shrink-0 mt-0.5">
                            edit_note
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                              {exe.title}
                            </span>
                            {exe.description && (
                              <span className="text-[10px] text-[var(--text-muted)] truncate">
                                {exe.description}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Opção 5: Carregar Soluções com Submenu */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnterSubmenu('solutions')}
                onMouseLeave={handleMouseLeaveSubmenu}
              >
                <button
                  onClick={() => setActiveSubmenu((prev) => (prev === 'solutions' ? null : 'solutions'))}
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
                {activeSubmenu === 'solutions' && (
                  <div
                    className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}
                    onMouseEnter={() => handleMouseEnterSubmenu('solutions')}
                    onMouseLeave={handleMouseLeaveSubmenu}
                  >
                    <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                      Selecione a Solução
                    </div>

                    {solutions.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                        Nenhum arquivo de solução encontrado em data/solutions.
                      </div>
                    ) : (
                      solutions.map((sol) => (
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
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
