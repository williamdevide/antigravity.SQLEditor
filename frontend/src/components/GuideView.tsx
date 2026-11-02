import React from 'react';
import { APP_VERSION } from '../config/version';
import type { ActiveView, FontTheme, ThemeMode } from '../types';
import { InteractiveVideoPlayer } from './video/InteractiveVideoPlayer';

export interface GuideViewProps {
  theme: ThemeMode;
  fontTheme: FontTheme;
  onNavigate: (view: ActiveView) => void;
}

const SHORTCUTS_LIST = [
  {
    category: 'Laboratório SQL & Execução',
    items: [
      { keys: 'Ctrl + Enter', desc: 'Executa todo o script SQL da aba ativa em sequência.' },
      {
        keys: 'Alt + E',
        desc: 'Executa cirurgicamente apenas o comando na linha atual do cursor (ou trecho selecionado).',
      },
      {
        keys: 'Alt + R',
        desc: 'Aciona a Revisão SQL heurística sobre o comando atual com aplicação cirúrgica in-place.',
      },
      { keys: 'F2 / Duplo-Clique', desc: 'Renomeia a aba de script SQL ativa.' },
      { keys: 'Ctrl + S', desc: 'Exporta e baixa o script `.sql` da aba ativa.' },
      { keys: 'Ctrl + Z / Ctrl + Y', desc: 'Desfaz ou refaz edições (inclusive mutações visuais do DER!).' },
    ],
  },
  {
    category: 'Estúdio DER & Canvas Interativo',
    items: [
      { keys: 'Roda do Mouse', desc: 'Zoom focal suave ancorado exatamente na posição do cursor.' },
      { keys: 'Espaço + Arrastar', desc: 'Move o canvas livremente (Pan) mesmo sobre cartões de tabelas.' },
      {
        keys: 'Arrastar Pino Laranja',
        desc: 'Conecta visualmente uma coluna a outra tabela gerando constraint FOREIGN KEY.',
      },
      {
        keys: 'Clique na Linha 90°',
        desc: 'Fixa o destaque Spotlight (22%) na relação selecionada para explicação em aula.',
      },
      { keys: 'Esc', desc: 'Limpa seleção de linha ou sai do Modo Apresentação em Tela Cheia.' },
      { keys: 'Duplo-Clique no Card', desc: 'Abre consulta `SELECT *` da entidade diretamente no Laboratório SQL.' },
    ],
  },
  {
    category: 'Aparência & Acessibilidade',
    items: [
      { keys: 'Alt + T', desc: 'Alterna entre os 4 temas de interface (Dark, Light, Bege, Grafite).' },
      { keys: 'Alt + L', desc: 'Alterna entre os 4 esquemas de cores de sintaxe SQL.' },
    ],
  },
];

export const GuideView: React.FC<GuideViewProps> = ({
  onNavigate,
}) => {
  return (
    <div
      className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 relative"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 10%, rgba(255, 107, 0, 0.05), transparent 60%), url('/backgrounds/bg-sql-laboratory.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Cabeçalho */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                Guia Rápido da Disciplina &amp; Vídeos de Treinamento
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Domine o fluxo completo de Banco de Dados no SQLEditor v{APP_VERSION}, assista aos tutoriais interativos ou consulte atalhos de produtividade.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('feedback')}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">feedback</span>
              <span>Canal de Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('gallery')}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Galeria de Desafios</span>
            </button>
          </div>
        </div>

        {/* 1. Vídeos Tutoriais Interativos & Demonstração Rápida */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-yellow)] font-mono flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">play_circle</span>
                <span>1. Tutoriais em Vídeo Interativo (Legendados em PT-BR)</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Assista a simulações visuais em tempo real das 5 etapas da plataforma, com legendas sincronizadas em Português e atalhos diretos para cada ferramenta.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[11px] font-mono text-[#FF6B00] font-bold">
              5 Módulos de Aprendizagem
            </span>
          </div>

          <InteractiveVideoPlayer onNavigate={onNavigate} />
        </section>

        {/* 2. Roteiro Visual das 5 Etapas da Disciplina */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-yellow)] font-mono">
            2. Roteiro Prático das 5 Etapas de Banco de Dados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                num: '01',
                title: 'Requisitos & Domínio',
                desc: 'Organize Áreas Temáticas e Notas Post-it com regras RN no Estúdio DER.',
                view: 'er-diagram' as ActiveView,
                cta: 'Abrir Estúdio DER',
              },
              {
                num: '02',
                title: 'Modelagem Visual',
                desc: 'Crie tabelas, chaves e conexões ortogonais 90° ou espie dados reais (👁️).',
                view: 'er-diagram' as ActiveView,
                cta: 'Modelar DER',
              },
              {
                num: '03',
                title: 'Normalização 1FN–3FN',
                desc: 'Audite dependências parciais/transitivas e preencha o Dicionário de Dados.',
                view: 'er-model' as ActiveView,
                cta: 'Dicionário 1FN–3FN',
              },
              {
                num: '04',
                title: 'DDL & Split-View',
                desc: 'Escreva CREATE/ALTER TABLE vendo o diagrama reagir em tempo real.',
                view: 'workspace' as ActiveView,
                cta: 'Laboratório SQL',
              },
              {
                num: '05',
                title: 'DQL & Desafios',
                desc: 'Treine SELECT, JOIN e GROUP BY com correção local instantânea.',
                view: 'gallery' as ActiveView,
                cta: 'Praticar Desafios',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-4 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border-color)] flex flex-col justify-between space-y-3 shadow-sm hover:border-[#FF6B00]/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-black text-[#FF6B00]">
                    ETAPA {step.num}
                  </span>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(step.view)}
                  className="w-full py-1.5 px-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--accent-yellow)] cursor-pointer transition-colors"
                >
                  {step.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Mapa de Atalhos de Teclado e Interação */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-yellow)] font-mono">
            3. Atalhos de Teclado &amp; Gestos do Canvas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {SHORTCUTS_LIST.map((group) => (
              <div
                key={group.category}
                className="p-5 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border-color)] space-y-3 shadow-sm"
              >
                <h3 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
                  {group.category}
                </h3>
                <div className="space-y-2.5">
                  {group.items.map((sc) => (
                    <div
                      key={sc.keys}
                      className="flex flex-col gap-1 pb-2 border-b border-[var(--border-color)]/60 last:border-b-0 last:pb-0"
                    >
                      <kbd className="self-start px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px] font-bold text-[var(--accent-yellow)]">
                        {sc.keys}
                      </kbd>
                      <span className="text-xs text-[var(--text-secondary)] leading-snug">
                        {sc.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

