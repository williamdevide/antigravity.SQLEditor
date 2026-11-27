import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SolutionItem } from '../services/scriptsLoader';
import type { SavedScriptItem, ClassroomMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface NewTabDropdownProps {
  onNewBlankTab: () => void;
  onSelectSolution: (solution: SolutionItem) => void;
  solutions: SolutionItem[];
  savedScripts?: SavedScriptItem[];
  onSelectSavedScript?: (script: SavedScriptItem) => void;
  classExamples?: SavedScriptItem[];
  classExercises?: SavedScriptItem[];
  classSolutions?: SavedScriptItem[];
  classExams?: SavedScriptItem[];
  deliveredExams?: SavedScriptItem[];
  classroomMode?: ClassroomMode;
  isExamModeActive?: boolean;
  triggerButton: (props: {
    isOpen: boolean;
    toggle: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
  align?: 'left' | 'right';
}

type SubmenuType = 'solutions' | 'saved' | 'examples' | 'exercises' | 'exams' | 'deliveredExams' | null;

export const NewTabDropdown: React.FC<NewTabDropdownProps> = ({
  onNewBlankTab,
  onSelectSolution,
  solutions,
  savedScripts = [],
  onSelectSavedScript,
  classExamples = [],
  classExercises = [],
  classSolutions = [],
  classExams = [],
  deliveredExams = [],
  classroomMode = 'normal',
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

  const personalSavedScripts = savedScripts.filter(
    (sc) => sc.category === 'student_saved' && !sc.isTemporary
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {triggerButton({ isOpen, toggle: toggleDropdown })}

      {isOpen && menuCoords && createPortal(
        <div
          ref={menuRef}
          data-sql-app-portal="true"
          data-allow-exam-context="true"
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            zIndex: 99999,
          }}
          className="min-w-[230px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Se estiver em Modo Avaliação: apenas Carregar Exemplos e Carregar Avaliações (somem Soluções e Scripts Salvos) */}
          {isExamModeActive || classroomMode === 'exam' ? (
            <>
              <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-purple-400">lock</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-purple-300 leading-tight">
                    Modo Avaliação Ativo
                  </span>
                  <span className="text-[9.5px] text-[var(--text-muted)]">
                    Acesso restrito aos itens da prova
                  </span>
                </div>
              </div>

              {/* Carregar Exemplos (Modo Avaliação) */}
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
                        Carregar Exemplos
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {classExamples.length}{' '}
                        {classExamples.length === 1 ? 'exemplo liberado' : 'exemplos liberados'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">
                    chevron_right
                  </span>
                </button>

                {activeSubmenu === 'examples' && (
                  <div
                    className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md`}
                    onMouseEnter={() => handleMouseEnterSubmenu('examples')}
                    onMouseLeave={handleMouseLeaveSubmenu}
                  >
                    <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                      Exemplos Permitidos na Prova
                    </div>
                    {classExamples.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                        Nenhum exemplo liberado para esta avaliação.
                      </div>
                    ) : (
                      classExamples.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => handleSavedScriptClick(ex)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0"
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
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Carregar Avaliações */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnterSubmenu('exams')}
                onMouseLeave={handleMouseLeaveSubmenu}
              >
                <button
                  onClick={() => setActiveSubmenu((prev) => (prev === 'exams' ? null : 'exams'))}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[17px] text-purple-400 group-hover:scale-110 transition-transform">
                      quiz
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-[12px] text-[var(--text-primary)]">
                        Carregar Avaliações
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {classExams.length}{' '}
                        {classExams.length === 1 ? 'avaliação disponível' : 'avaliações disponíveis'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">
                    chevron_right
                  </span>
                </button>

                {activeSubmenu === 'exams' && (
                  <div
                    className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[260px] max-w-[340px] max-h-[360px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md`}
                    onMouseEnter={() => handleMouseEnterSubmenu('exams')}
                    onMouseLeave={handleMouseLeaveSubmenu}
                  >
                    <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
                      Avaliações da Turma
                    </div>
                    {classExams.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                        Nenhuma avaliação publicada nesta turma.
                      </div>
                    ) : (
                      classExams.map((exam) => (
                        <button
                          key={exam.id}
                          onClick={() => handleSavedScriptClick(exam)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0"
                        >
                          <span className="material-symbols-outlined text-[15px] text-purple-400 shrink-0 mt-0.5">
                            quiz
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                              {exam.title}
                            </span>
                            {exam.description && (
                              <span className="text-[10px] text-[var(--text-muted)] truncate">
                                {exam.description}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
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
                          : `${personalSavedScripts.length} ${personalSavedScripts.length === 1 ? 'script no perfil' : 'scripts no perfil'}`}
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
                    ) : personalSavedScripts.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px] space-y-1">
                        <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]/60 block mx-auto">
                          bookmark_border
                        </span>
                        <p className="font-medium text-[var(--text-primary)]">Nenhum Script Pessoal salvo ainda</p>
                        <p className="text-[10px]">
                          Abra uma guia e use <strong className="text-[var(--accent-yellow)]">Salvar no Perfil (Ctrl+S)</strong> ou <strong className="text-[#FF6B00]">Salvar Como (Script Pessoal)</strong>.
                        </p>
                      </div>
                    ) : (
                      personalSavedScripts.map((sc) => (
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
                                  {sc.category === 'example'
                                    ? 'Exemplo'
                                    : sc.category === 'exercise'
                                    ? 'Exercício'
                                    : sc.category === 'solution'
                                    ? 'Solução'
                                    : sc.category === 'class_database'
                                    ? 'BD'
                                    : sc.category === 'exam'
                                    ? 'Prova'
                                    : sc.category}
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

              {/* Opção Nova: Avaliações Entregues (Aparece fora do Modo Avaliação quando houver entregas do aluno) */}
              {deliveredExams.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnterSubmenu('deliveredExams')}
                  onMouseLeave={handleMouseLeaveSubmenu}
                >
                  <button
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === 'deliveredExams' ? null : 'deliveredExams'))
                    }
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[17px] text-purple-400 group-hover:scale-110 transition-transform">
                        assignment_turned_in
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-[12px] text-[var(--text-primary)]">
                          Avaliações Entregues
                        </span>
                        <span className="text-[10px] text-purple-300 font-semibold">
                          {deliveredExams.length}{' '}
                          {deliveredExams.length === 1 ? 'entrega arquivada' : 'entregas arquivadas'}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">
                      chevron_right
                    </span>
                  </button>

                  {activeSubmenu === 'deliveredExams' && (
                    <div
                      className={`absolute ${openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 min-w-[280px] max-w-[360px] max-h-[380px] overflow-y-auto bg-[var(--bg-surface)] border border-purple-500/40 rounded-xl shadow-2xl py-1 text-xs font-sans text-[var(--text-primary)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100`}
                      onMouseEnter={() => handleMouseEnterSubmenu('deliveredExams')}
                      onMouseLeave={handleMouseLeaveSubmenu}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-purple-300 uppercase tracking-wider border-b border-purple-500/30 flex items-center justify-between bg-purple-500/10">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">verified</span>
                          <span>Resoluções Entregues</span>
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)]">Apenas Leitura / Cópia</span>
                      </div>

                      {deliveredExams.map((del) => (
                        <button
                          key={del.id}
                          onClick={() => handleSavedScriptClick(del)}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-purple-500/10 flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                        >
                          <span className="material-symbols-outlined text-[15px] text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            lock
                          </span>
                          <div className="flex flex-col min-w-0 w-full">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-medium text-[11px] text-[var(--text-primary)] truncate group-hover:text-purple-300 transition-colors">
                                {del.title}
                              </span>
                              {typeof del.grade === 'number' && del.gradePublished && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    del.grade >= 60
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  }`}
                                >
                                  Nota: {del.grade.toFixed(1)} / 100
                                </span>
                              )}
                            </div>
                            {del.description && (
                              <p className="text-[9.5px] text-[var(--text-muted)] line-clamp-2 leading-tight mt-0.5">
                                {del.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1 text-[8.5px] text-[var(--text-muted)]">
                              <span>
                                {new Date(del.submittedAt || del.createdAt).toLocaleString('pt-BR')}
                              </span>
                              <span className="text-purple-300 font-semibold">🔒 Protegido</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Opção 3: Carregar Exemplos (em Modo Sala de Aula sempre aparece; no Normal aparece se houver marcados p/ Normal) */}
              {(classroomMode === 'classroom' || classExamples.length > 0) && (
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
                          Carregar Exemplos
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {classExamples.length}{' '}
                          {classExamples.length === 1 ? 'exemplo da turma' : 'exemplos da turma'}
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
                      {classExamples.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                          Nenhum exemplo visível nesta sala.
                        </div>
                      ) : (
                        classExamples.map((ex) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Opção 4: Carregar Exercícios (em Modo Sala de Aula sempre aparece; no Normal aparece se houver marcados p/ Normal) */}
              {(classroomMode === 'classroom' || classExercises.length > 0) && (
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
                          Carregar Exercícios
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
                      {classExercises.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                          Nenhum exercício visível nesta sala.
                        </div>
                      ) : (
                        classExercises.map((exe) => (
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Opção 5: Carregar Soluções (Modo Sala de Aula = SOMENTE soluções daquela sala; Modo Normal = soluções gerais + da sala marcadas p/ Normal) */}
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
                        {classroomMode === 'classroom'
                          ? `${classSolutions.length} ${classSolutions.length === 1 ? 'solução da sala' : 'soluções da sala'}`
                          : `${solutions.length + classSolutions.length} ${
                              solutions.length + classSolutions.length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'
                            }`}
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
                      {classroomMode === 'classroom' ? 'Soluções da Sala' : 'Selecione a Solução'}
                    </div>

                    {classroomMode === 'classroom' ? (
                      classSolutions.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[var(--text-muted)] text-[11px]">
                          Nenhuma solução visível publicada para esta sala.
                        </div>
                      ) : (
                        classSolutions.map((cSol) => (
                          <button
                            key={cSol.id}
                            onClick={() => handleSavedScriptClick(cSol)}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 last:border-b-0 group"
                          >
                            <span className="material-symbols-outlined text-[15px] text-emerald-400 shrink-0 mt-0.5">
                              check_circle
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                                {cSol.title}
                              </span>
                              {cSol.description && (
                                <span className="text-[10px] text-[var(--text-muted)] truncate">
                                  {cSol.description}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )
                    ) : (
                      <>
                        {classSolutions.map((cSol) => (
                          <button
                            key={cSol.id}
                            onClick={() => handleSavedScriptClick(cSol)}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-[var(--bg-hover)] flex items-start gap-2 transition-colors cursor-pointer border-b border-[var(--border-color)]/30 group"
                          >
                            <span className="material-symbols-outlined text-[15px] text-emerald-400 shrink-0 mt-0.5">
                              check_circle
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-[11px] text-[var(--text-primary)] truncate">
                                {cSol.title}
                              </span>
                              <span className="text-[9.5px] text-emerald-400/90 font-mono">
                                Turma (Modo Normal)
                              </span>
                            </div>
                          </button>
                        ))}
                        {solutions.length === 0 && classSolutions.length === 0 ? (
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
                      </>
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
