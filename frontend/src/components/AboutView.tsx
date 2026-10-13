import React, { useState, useEffect } from 'react';

interface AboutViewProps {
  onBackToWorkspace: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBackToWorkspace }) => {
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  // Fechar modal ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLogoModalOpen(false);
      }
    };
    if (isLogoModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLogoModalOpen]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 overflow-y-auto select-none transition-colors">
      {/* Modal Ampliado do Logo Milkfed */}
      {isLogoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLogoModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full p-6 sm:p-8 bg-[var(--bg-secondary)] border border-[#FF6B00]/40 rounded-2xl shadow-2xl shadow-black/80 flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-surface)] hover:bg-[#FF6B00] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] flex items-center justify-center transition-all cursor-pointer shadow-md"
              title="Fechar (Esc)"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Logo da Milkfed em Alta Definição */}
            <div className="p-4 my-2 flex items-center justify-center">
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo Ampliado"
                className="max-h-[55vh] max-w-full object-contain drop-shadow-[0_10px_35px_rgba(255,107,0,0.45)] select-none"
              />
            </div>

            {/* Informações no Modal */}
            <div className="text-center mt-3 space-y-1">
              <h3 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
              </h3>
              <p className="text-xs text-[var(--accent-yellow)] font-mono">
                Software House • Requirements Mastery • AI Architecture
              </p>
              <p className="text-[11px] text-[var(--text-muted)] pt-2">
                Clique fora deste modal ou pressione <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[10px] font-mono">Esc</kbd> para fechar.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] via-[var(--accent-yellow)] to-[var(--status-success)] p-0.5 shadow-lg shrink-0 overflow-hidden">
                <img
                  src="/foto-william.jpg"
                  alt="Professor William Devidé Komel"
                  className="w-full h-full rounded-full object-cover shadow-inner"
                />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Desenvolvedor &amp; Idealizador
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                  Professor William Devidé Komel
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">mail</span>
                    <a
                      href="mailto:williamdevide@gmail.com"
                      className="hover:text-[var(--accent-yellow)] underline underline-offset-2 transition-colors font-mono"
                    >
                      williamdevide@gmail.com
                    </a>
                  </div>
                  <a
                    href="https://www.linkedin.com/in/williamdevide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0A66C2]/15 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border border-[#0A66C2]/40 rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Conectar no LinkedIn"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>LinkedIn Profile</span>
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

        {/* Card da Empresa: Milkfed Devs && Reqs Lords */}
        <div className="mb-8 p-6 sm:p-7 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl relative overflow-hidden transition-all hover:border-[#FF6B00]/40">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent-yellow)]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative z-10">
            {/* Logo da Empresa com clique para modal ampliado */}
            <div
              onClick={() => setIsLogoModalOpen(true)}
              className="shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00] shadow-lg shadow-black/20 group cursor-zoom-in transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.3)]"
              title="Clique para ampliar o logo"
            >
              <img
                src="/logo-milkfed.png"
                alt="Milkfed Devs && Reqs Lords Logo"
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_4px_16px_rgba(255,107,0,0.35)] group-hover:scale-105 transition-transform duration-300"
              />
              <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[#FF6B00] transition-colors">
                <span className="material-symbols-outlined text-[13px]">zoom_in</span>
                <span>Ampliar logo</span>
              </div>
            </div>

            {/* Conteúdo Institucional */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 uppercase tracking-wider">
                  Software House &amp; Tech Consulting
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/20">
                  Engineering &amp; Requirements Mastery
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  Milkfed Devs <span className="text-[#FF6B00]">&amp;&amp;</span> Reqs Lords
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[var(--accent-yellow)] mt-0.5">
                  Engenharia de Software de Alta Precisão, Requisitos Refinados e Soluções Guiadas por IA
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                A <strong>Milkfed Devs &amp;&amp; Reqs Lords</strong> nasceu da convicção de que o verdadeiro diferencial em tecnologia reside no equilíbrio perfeito entre código de alto padrão (<em>Devs</em>) e a maestria profunda na especificação de regras de negócio e requisitos (<em>Reqs Lords</em>).
              </p>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Especializada no desenvolvimento de sistemas complexos, ferramentas de produtividade para desenvolvedores e plataformas educacionais inovadoras — como o ecossistema <strong>SQLEditor</strong> —, nossa atuação combina arquiteturas offline-first, microsserviços resilientes, processamento local de dados em tempo real e orquestração autônoma de agentes de Inteligência Artificial para entregar produtos robustos, escaláveis e esteticamente impecáveis.
              </p>

              {/* Pilares / Destaques da Empresa */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">verified_user</span>
                  <span className="text-[var(--text-primary)] font-medium">Engenharia de Requisitos &amp; Domínio de Negócio</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[16px] text-[var(--status-success)]">speed</span>
                  <span className="text-[var(--text-primary)] font-medium">Aplicações Offline-First &amp; Performance Extrema</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">smart_toy</span>
                  <span className="text-[var(--text-primary)] font-medium">Inteligência Artificial Generativa &amp; Agentes Autônomos</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[16px] text-blue-400">school</span>
                  <span className="text-[var(--text-primary)] font-medium">EdTech, Simuladores &amp; Ferramentas para Desenvolvedores</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações da Stack Tecnológica com 3D Flip Cards */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--accent-yellow)]">layers</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Stack Tecnológica e Arquitetura do Sistema
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
              <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)] animate-spin">sync</span>
              <span>Passe o mouse sobre os cards para virar</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Frontend Core - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-cyan-400/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">SPA</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo React */}
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9 fill-none stroke-current" viewBox="-11.5 -10.23174 23 20.46348">
                        <circle cx="0" cy="0" r="2.05" fill="#61DAFB"/>
                        <g stroke="#61DAFB" strokeWidth="1">
                          <ellipse rx="11" ry="4.2"/>
                          <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                          <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                        </g>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">Frontend Core</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">React 18 • TypeScript • Vite</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-cyan-400/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-cyan-400">Frontend Core</span>
                      <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                        SPA
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Construído com <strong>React 18</strong>, <strong>TypeScript</strong> e <strong>Vite</strong> para máxima performance, tipagem rigorosa e recarregamento instantâneo.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    React • TypeScript • Vite
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Motor SQL & Dialeto - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-[var(--status-success)]/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/30 px-1.5 py-0.5 rounded font-bold">MySQL</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo MySQL / Database */}
                    <div className="w-14 h-14 rounded-2xl bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 flex items-center justify-center text-[var(--status-success)] shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 2c4.97 0 8 1.62 8 2.5s-3.03 2.5-8 2.5-8-1.62-8-2.5 3.03-2.5 8-2.5zm0 16c-4.97 0-8-1.62-8-2.5v-2.26c2.09 1.15 5.02 1.76 8 1.76s5.91-.61 8-1.76V17.5c0 .88-3.03 2.5-8 2.5zm0-4.5c-4.97 0-8-1.62-8-2.5v-2.26c2.09 1.15 5.02 1.76 8 1.76s5.91-.61 8-1.76V13c0 .88-3.03 2.5-8 2.5zm0-4.5c-4.97 0-8-1.62-8-2.5V6.74c2.09 1.15 5.02 1.76 8 1.76s5.91-.61 8-1.76V8.5c0 .88-3.03 2.5-8 2.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">Motor SQL Client-Side</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">AlaSQL • Dialeto MySQL</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--status-success)]/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-[var(--status-success)]/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[var(--status-success)]">Motor SQL Client-Side</span>
                      <span className="text-[10px] font-mono bg-[var(--status-success)]/15 text-[var(--status-success)] border border-[var(--status-success)]/30 px-1.5 py-0.5 rounded font-bold">
                        MySQL
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Execução 100% no navegador com <strong>AlaSQL</strong> expandido com funções nativas do MySQL como <code>DATE_FORMAT</code>, <code>NOW</code>, <code>DATEDIFF</code>, <code>IFNULL</code>, <code>STRFTIME</code> e esquemas múltiplos.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    AlaSQL • MySQL Dialect • Custom Functions
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Persistência Offline - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-[#FF6B00]/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 px-1.5 py-0.5 rounded font-bold">IndexedDB</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo IndexedDB / Storage */}
                    <div className="w-14 h-14 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V18z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">Persistência Offline</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Dexie.js • IndexedDB Local</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#FF6B00]/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-[#FF6B00]/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#FF6B00]">Persistência Offline</span>
                      <span className="text-[10px] font-mono bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 px-1.5 py-0.5 rounded font-bold">
                        IndexedDB
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Armazenamento no dispositivo do usuário utilizando <strong>Dexie.js</strong> sobre <strong>IndexedDB</strong>. Os bancos criados, tabelas e histórico de scripts são preservados entre sessões sem envio externo.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Dexie.js • IndexedDB • Local Storage
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Editor de Código - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-purple-400/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">VS Code</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo Monaco / VS Code */}
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.5 2.5L23 5.5v13l-5.5 3L1 14.5l1.5-2.5L17.5 20V4l-9 5.5L7 8l10.5-5.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">Editor Profissional</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Monaco Editor • VS Code</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-purple-400/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-purple-400/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-purple-400">Editor Profissional</span>
                      <span className="text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold">
                        VS Code
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      <strong>Monaco Editor</strong> com autocompleter inteligente para palavras-chave SQL, nomes de tabelas do banco ativo, atalhos de seleção (Alt+E, Alt+R) e menu de contexto personalizado.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Monaco Editor • Dynamic Autocomplete
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Design & Prototipagem - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-[var(--accent-yellow)]/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30 px-1.5 py-0.5 rounded font-bold">Stitch</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo Tailwind CSS */}
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 flex items-center justify-center text-[var(--accent-yellow)] shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24">
                        <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">Design System</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Tailwind CSS • Stitch</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--accent-yellow)]/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-[var(--accent-yellow)]/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[var(--accent-yellow)]">Design System</span>
                      <span className="text-[10px] font-mono bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30 px-1.5 py-0.5 rounded font-bold">
                        Stitch
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Interface baseada no projeto <strong>Google Stitch</strong> (sqleditor) com <strong>Tailwind CSS</strong>, suportando modo escuro neon e modo claro otimizado com alto contraste.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Tailwind CSS • Google Stitch • Material Icons
                  </div>
                </div>
              </div>
            </div>

            {/* 6. IA e Orquestração - Flip Card */}
            <div className="group [perspective:1000px] h-64 sm:h-60 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group-hover:border-cyan-400/50 [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-lg transition-colors">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">Antigravity</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2.5 my-auto">
                    {/* Logotipo Google Antigravity / AI */}
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">IA &amp; Engenharia</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Google Antigravity • AG Kit</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400/80 flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-xl p-4 bg-[var(--bg-surface)] border border-cyan-400/50 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-cyan-400">IA &amp; Engenharia</span>
                      <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                        Antigravity
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Desenvolvido e orquestrado no <strong>Google Antigravity</strong> com protocolo multi-agente de autorrecuperação determinística e conformidade pedagógica SENAI.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Google Antigravity • AG Kit • DeepMind
                  </div>
                </div>
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
