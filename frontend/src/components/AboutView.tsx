import React from 'react';

interface AboutViewProps {
  onBackToWorkspace: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBackToWorkspace }) => {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 overflow-y-auto select-none transition-colors">
      {/* Topo / Header do Sobre */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-yellow)]/15 border border-[var(--accent-yellow)]/30 flex items-center justify-center text-[var(--accent-yellow)]">
              <span className="material-symbols-outlined text-[24px]">info</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Sobre o SQLEditor
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Portal de Aprendizagem e Simulação SQL com Inteligência Artificial
              </p>
            </div>
          </div>

          <button
            onClick={onBackToWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-xs font-semibold transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Voltar ao Workspace</span>
          </button>
        </div>

        {/* Card do Autor / Instrutor */}
        <div className="mb-8 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--accent-yellow)]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[var(--accent-yellow)] to-[var(--status-success)] p-0.5 shadow-md">
                <div className="w-full h-full rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xl">
                  WK
                </div>
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Desenvolvedor &amp; Idealizador
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                  Professor William Devidé Komel
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                  <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">mail</span>
                  <a
                    href="mailto:williamdevide@gmail.com"
                    className="hover:text-[var(--accent-yellow)] underline underline-offset-2 transition-colors font-mono"
                  >
                    williamdevide@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs text-[var(--text-secondary)] font-mono border-l-0 md:border-l border-[var(--border-color)] pl-0 md:pl-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-[var(--status-success)]">verified</span>
                <span>Instrutor de Desenvolvimento de Sistemas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-[#FF6B00]">school</span>
                <span>Perfil Educacional SENAI &amp; Antigravity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">code</span>
                <span>Foco em Mercado de Trabalho &amp; Excelência Técnica</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações da Stack Tecnológica */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[var(--accent-yellow)]">layers</span>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Stack Tecnológica e Arquitetura do Sistema
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Frontend Core */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">Frontend Core</span>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                    SPA
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Construído com <strong>React 18</strong>, <strong>TypeScript</strong> e <strong>Vite</strong> para máxima performance, tipagem rigorosa e recarregamento instantâneo.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                React • TypeScript • Vite
              </div>
            </div>

            {/* 2. Motor SQL & Dialeto */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">Motor SQL Client-Side</span>
                  <span className="text-[10px] font-mono bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/30 px-1.5 py-0.5 rounded font-bold">
                    MySQL
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Execução 100% no navegador com <strong>AlaSQL</strong> expandido com funções nativas do MySQL como <code>DATE_FORMAT</code>, <code>NOW</code>, <code>DATEDIFF</code>, <code>IFNULL</code> e esquemas múltiplos.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                AlaSQL • MySQL Dialect • Custom Functions
              </div>
            </div>

            {/* 3. Persistência Offline */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">Persistência Offline</span>
                  <span className="text-[10px] font-mono bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 px-1.5 py-0.5 rounded font-bold">
                    IndexedDB
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Armazenamento no dispositivo do usuário utilizando <strong>Dexie.js</strong> sobre <strong>IndexedDB</strong>. Os bancos criados, tabelas e histórico de scripts são preservados entre sessões.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                Dexie.js • IndexedDB • Local Storage
              </div>
            </div>

            {/* 4. Editor de Código */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">Editor Profissional</span>
                  <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                    VS Code
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  <strong>Monaco Editor</strong> com autocompleter inteligente para palavras-chave SQL, nomes de tabelas do banco ativo, atalhos de seleção (Alt+E, Alt+R) e menu de contexto personalizado.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                Monaco Editor • Dynamic Autocomplete
              </div>
            </div>

            {/* 5. Design & Prototipagem */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">Design System</span>
                  <span className="text-[10px] font-mono bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30 px-1.5 py-0.5 rounded font-bold">
                    Stitch
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Interface baseada no projeto <strong>Google Stitch</strong> (sqleditor) com <strong>Tailwind CSS</strong>, suportando modo escuro neon e modo claro otimizado com alto contraste.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                Tailwind CSS • Google Stitch • Material Icons
              </div>
            </div>

            {/* 6. IA e Orquestração */}
            <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--text-primary)]">IA &amp; Engenharia</span>
                  <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                    Antigravity
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Desenvolvido e orquestrado no <strong>Google Antigravity</strong> com protocolo multi-agente de autorrecuperação determinística e conformidade pedagógica SENAI.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                Google Antigravity • AG Kit • DeepMind
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé institucional */}
        <div className="mt-10 pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-mono">
          <div>
            © 2026 SQLEditor • Professor William Devidé Komel
          </div>
          <div className="flex items-center gap-2 text-[var(--accent-yellow)]">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span>SENAI Ourinhos Edition • Google Antigravity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
