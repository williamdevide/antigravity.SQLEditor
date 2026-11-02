import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../config/version';

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  Sobre o SQLEditor
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] text-[10px] font-mono font-semibold border border-[var(--accent-yellow)]/30">
                  v{APP_VERSION}
                </span>
              </div>
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

        {/* Informações da Stack Tecnológica com 3D Flip Cards com Logotipos Autênticos e Chamativos */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[var(--accent-yellow)]">layers</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Stack Tecnológica &amp; Arquitetura Oficial do Sistema
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
              <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)] animate-spin">sync</span>
              <span>Passe o cursor para virar os cards e ver a arquitetura</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Frontend Core - React 18 & TypeScript (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#61DAFB] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#61DAFB]/15 text-[#61DAFB] border border-[#61DAFB]/40 px-2 py-0.5 rounded-full font-bold">REACT 18 &amp; TS</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo Real React + TypeScript Badge */}
                    <div className="w-20 h-20 rounded-2xl bg-[#20232A] border-2 border-[#61DAFB]/70 shadow-[0_0_25px_rgba(97,218,251,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/react.svg" alt="React 18" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(97,218,251,0.6)]" />
                      <img src="/logos/typescript.svg" alt="TypeScript" className="w-6 h-6 absolute -bottom-1 -right-1 rounded-md shadow-md border border-white/20" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">Frontend Core</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">React 18 • TypeScript • Vite</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#61DAFB] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#61DAFB] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#61DAFB]">Frontend Core</span>
                      <span className="text-[10px] font-mono bg-[#61DAFB]/15 text-[#61DAFB] border border-[#61DAFB]/30 px-2 py-0.5 rounded-full font-bold">
                        Vite + React
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Construído com <strong>React 18</strong>, <strong>TypeScript</strong> rigoroso e <strong>Vite</strong>. Renderização em árvore eficiente, estados atômicos e hot module replacement instantâneo.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    React 18 • TypeScript 5 • Vite 6
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Motor SQL Client-Side - MySQL & AlaSQL (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#00758F] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#00758F]/15 text-[#00E5FF] border border-[#00758F]/40 px-2 py-0.5 rounded-full font-bold">DIALETO MYSQL</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo Autêntico MySQL Dolphin */}
                    <div className="w-20 h-20 rounded-2xl bg-[#005E86]/40 border-2 border-[#F29111]/80 shadow-[0_0_25px_rgba(242,145,17,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/mysql.svg" alt="MySQL & AlaSQL" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(242,145,17,0.6)]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">Motor SQL Client-Side</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">AlaSQL • Dialeto MySQL Nativo</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#F29111] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#00758F] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#00E5FF]">AlaSQL &amp; MySQL Engine</span>
                      <span className="text-[10px] font-mono bg-[#00758F]/20 text-[#00E5FF] border border-[#00758F]/40 px-2 py-0.5 rounded-full font-bold">
                        Zero Backend
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Execução determinística no navegador. Totalmente expandido com funções de data (<code>DATE_FORMAT</code>, <code>DATEDIFF</code>, <code>NOW</code>), agregações e compatibilidade de esquemas relacionais.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    AlaSQL • MySQL Dialect • Local Tables
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Persistência Offline - Dexie & IndexedDB (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#FF6B00] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 px-2 py-0.5 rounded-full font-bold">INDEXEDDB LOCAL</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo IndexedDB / Storage Autêntico */}
                    <div className="w-20 h-20 rounded-2xl bg-[#1C1E24] border-2 border-[#FF6B00]/80 shadow-[0_0_25px_rgba(255,107,0,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/indexeddb.svg" alt="IndexedDB & Dexie" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(255,107,0,0.6)]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">Persistência Offline</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Dexie.js • IndexedDB • Super-Backup</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#FF8533] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#FF6B00] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#FF6B00]">Dexie.js Offline</span>
                      <span className="text-[10px] font-mono bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 px-2 py-0.5 rounded-full font-bold">
                        100% Privado
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Seus bancos, histórico de scripts, preferências de tema e modelos DER permanecem gravados localmente no navegador, sem nenhum envio para servidores externos.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Dexie.js • IndexedDB v3 • JSON Backup
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Editor Profissional - Monaco & VS Code (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#007ACC] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#007ACC]/15 text-[#29B6F6] border border-[#007ACC]/40 px-2 py-0.5 rounded-full font-bold">VS CODE ENGINE</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo Autêntico VS Code Origami */}
                    <div className="w-20 h-20 rounded-2xl bg-[#1E1E1E] border-2 border-[#007ACC]/80 shadow-[0_0_25px_rgba(0,122,204,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/vscode.svg" alt="Monaco Editor & VS Code" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(0,122,204,0.6)]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">Editor Profissional</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Monaco Editor • Autocomplete SQL</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#29B6F6] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#007ACC] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#29B6F6]">Monaco Editor</span>
                      <span className="text-[10px] font-mono bg-[#007ACC]/20 text-[#29B6F6] border border-[#007ACC]/40 px-2 py-0.5 rounded-full font-bold">
                        VS Code
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      O mesmo motor que alimenta o VS Code. Autocomplete inteligente sincronizado com as tabelas ativas, realce de sintaxe SQL, atalhos de teclado (Ctrl+Enter, Alt+E) e histórico ilimitado.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Monaco Editor • Multi-Tab • Syntax Highlight
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Design System - Tailwind CSS & Google Stitch (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#38BDF8] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full font-bold">TAILWIND &amp; STITCH</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo Autêntico Tailwind CSS */}
                    <div className="w-20 h-20 rounded-2xl bg-[#0F172A] border-2 border-[#38BDF8]/80 shadow-[0_0_25px_rgba(56,189,248,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/tailwind.svg" alt="Tailwind CSS & Google Stitch" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">Design System</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Tailwind CSS • Google Stitch UI</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#38BDF8] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#38BDF8] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#38BDF8]">Design Tokens &amp; Temas</span>
                      <span className="text-[10px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 px-2 py-0.5 rounded-full font-bold">
                        4 Temas
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Arquitetura visual baseada no <strong>Google Stitch</strong> (sqleditor) com <strong>Tailwind CSS</strong>. Suporte dinâmico a 4 paletas completas: Dark Neon, Light Studio, Bege Editorial e Grafite Industrial.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Tailwind CSS • Google Stitch • Material Symbols
                  </div>
                </div>
              </div>
            </div>

            {/* 6. IA & Engenharia Multi-Agente - Google Antigravity & DeepMind (Flip Card) */}
            <div className="group [perspective:1000px] h-72 sm:h-64 w-full cursor-pointer">
              <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] rounded-2xl">
                {/* FRENTE */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] group-hover:border-[#4285F4] [backface-visibility:hidden] flex flex-col items-center justify-between text-center shadow-xl transition-all">
                  <div className="w-full flex items-center justify-between text-[10px] font-mono">
                    <span className="bg-[#4285F4]/15 text-[#4285F4] border border-[#4285F4]/40 px-2 py-0.5 rounded-full font-bold">DEEPMIND AGENTS</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">touch_app</span> Virar
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 my-auto">
                    {/* Logotipo Autêntico Google Antigravity 4 Cores */}
                    <div className="w-20 h-20 rounded-2xl bg-[#0B0F19] border-2 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center relative group-hover:scale-110 transition-transform p-2">
                      <img src="/logos/antigravity.svg" alt="Google Antigravity & DeepMind" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[var(--text-primary)]">IA &amp; Engenharia</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Google Antigravity • Multi-Agentes</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#4285F4] flex items-center gap-1">
                    <span>↺ Veja as especificações</span>
                  </div>
                </div>

                {/* VERSO */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-[var(--bg-secondary)] border border-[#4285F4] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#4285F4]">Google Antigravity</span>
                      <span className="text-[10px] font-mono bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/40 px-2 py-0.5 rounded-full font-bold">
                        AG Kit 2.0
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Orquestrado através de agentes especializados (Orquestrador, Frontend Specialist, Database Architect) operando com ciclo rigoroso de autorrecuperação e conformidade SENAI Ourinhos.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                    Google Antigravity • DeepMind • Pair Programming
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
