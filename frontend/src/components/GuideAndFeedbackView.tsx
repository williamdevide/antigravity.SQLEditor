import React, { useState } from 'react';
import { APP_VERSION } from '../config/version';
import type { ActiveView, FontTheme, ThemeMode } from '../types';

export interface GuideAndFeedbackViewProps {
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

const DEVELOPER_EMAIL = 'williamdevide.ourinhos@gmail.com';

export const GuideAndFeedbackView: React.FC<GuideAndFeedbackViewProps> = ({
  theme,
  fontTheme,
  onNavigate,
}) => {
  const [reportType, setReportType] = useState<'bug' | 'suggestion' | 'pedagogy'>('bug');
  const [reportModule, setReportModule] = useState<string>('Estúdio DER');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportSteps, setReportSteps] = useState<string>('');
  const [reportSql, setReportSql] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const getReportTypeLabel = () =>
    reportType === 'bug'
      ? 'Reporte de Bug'
      : reportType === 'suggestion'
      ? 'Sugestão de Melhoria'
      : 'Ideia Pedagógica / Exercício';

  const buildEmailSubject = () => {
    const typeLabel = getReportTypeLabel();
    const cleanTitle = reportTitle.trim() || reportModule;
    return `[SQLEditor v${APP_VERSION}] [${typeLabel}] ${cleanTitle}`;
  };

  const buildEmailBody = () => {
    const typeLabel = getReportTypeLabel();
    const lines = [
      `Olá, William!`,
      '',
      `Estou enviando este feedback a partir do SQLEditor v${APP_VERSION}:`,
      '',
      `• Categoria: ${typeLabel}`,
      `• Módulo Relacionado: ${reportModule}`,
      `• Tema UI: ${theme} | Sintaxe: ${fontTheme}`,
      `• Navegador / Plataforma: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      '',
      `==================================================`,
      `DESCRIÇÃO / SUGESTÃO / PASSOS:`,
      `==================================================`,
      reportSteps.trim() || '(Nenhum detalhe adicional informado)',
      '',
    ];

    if (reportSql.trim()) {
      lines.push(
        `==================================================`,
        `SCRIPT SQL RELACIONADO:`,
        `==================================================`,
        reportSql.trim(),
        ''
      );
    }

    lines.push(
      `--------------------------------------------------`,
      `Mensagem enviada via Central de Feedback do SQLEditor`
    );

    return lines.join('\n');
  };

  const buildMarkdownReport = () => {
    const typeLabel = getReportTypeLabel();

    const lines = [
      `## [${typeLabel}] ${reportTitle.trim() || 'Sem título'}`,
      '',
      `- **Versão do SQLEditor:** v${APP_VERSION}`,
      `- **Módulo:** ${reportModule}`,
      `- **Tema UI / Sintaxe:** ${theme} / ${fontTheme}`,
      `- **Navegador:** ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      '',
      `### Descrição / Passos para Reproduzir`,
      reportSteps.trim() || '_Não informado._',
    ];

    if (reportSql.trim()) {
      lines.push('', '### Script SQL Relacionado', '```sql', reportSql.trim(), '```');
    }

    return lines.join('\n');
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdownReport());
      setCopiedReport(true);
      showToast('Relatório Markdown copiado para a área de transferência!');
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Sem acesso ao clipboard
    }
  };

  const handleSendEmail = async () => {
    const subject = buildEmailSubject();
    const body = buildEmailBody();

    try {
      await navigator.clipboard.writeText(buildMarkdownReport());
    } catch (_) {}

    const mailtoUrl = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    showToast(`Cliente de e-mail acionado para ${DEVELOPER_EMAIL}!`);
  };

  const handleSendViaGmailWeb = async () => {
    const subject = buildEmailSubject();
    const body = buildEmailBody();

    try {
      await navigator.clipboard.writeText(buildMarkdownReport());
    } catch (_) {}

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${DEVELOPER_EMAIL}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    showToast(`Rascunho aberto no Gmail Web para ${DEVELOPER_EMAIL}!`);
  };

  const handleOpenGitHubIssue = () => {
    const title = encodeURIComponent(
      `[${reportType.toUpperCase()}] ${reportTitle.trim() || reportModule}`
    );
    const body = encodeURIComponent(buildMarkdownReport());
    window.open(
      `https://github.com/williamdevide/antigravity.SQLEditor/issues/new?title=${title}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Cabeçalho */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
              <span className="material-symbols-outlined text-[24px]">help_center</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                Guia Rápido da Disciplina, Atalhos &amp; Feedback
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Domine o fluxo completo de Banco de Dados no SQLEditor v{APP_VERSION}, consulte atalhos de produtividade ou envie sugestões.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('gallery')}
            className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>Ir para Galeria &amp; Prática</span>
          </button>
        </div>

        {/* 1. Roteiro Visual das 5 Etapas da Disciplina */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-yellow)] font-mono">
            1. Roteiro Prático das 5 Etapas de Banco de Dados
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
                className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between space-y-3"
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
                  className="w-full py-1.5 px-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--accent-yellow)] cursor-pointer"
                >
                  {step.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Mapa de Atalhos de Teclado e Interação */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-yellow)] font-mono">
            2. Atalhos de Teclado &amp; Gestos do Canvas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {SHORTCUTS_LIST.map((group) => (
              <div
                key={group.category}
                className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3"
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

        {/* 3. Gerador Estruturado de Feedback / Reporte de Bug */}
        <section className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                3. Central de Feedback &amp; Reporte Técnico Estruturado
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Encontrou um comportamento inesperado ou quer sugerir um novo recurso ou desafio para as aulas? Envie diretamente para o desenvolvedor ou gere o relatório técnico com diagnóstico automático do ambiente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#FF6B00]/15 border border-[#FF6B00]/35 text-[11px] font-mono text-[#FF6B00] flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                <span>Destino: <strong>{DEVELOPER_EMAIL}</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                Ambiente: v{APP_VERSION} • {theme} • {fontTheme}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Categoria
              </label>
              <select
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as 'bug' | 'suggestion' | 'pedagogy')
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              >
                <option value="bug">Reporte de Bug / Erro</option>
                <option value="suggestion">Sugestão de Recurso Visual</option>
                <option value="pedagogy">Novo Exercício ou Banco de Aula</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Módulo Relacionado
              </label>
              <select
                value={reportModule}
                onChange={(e) => setReportModule(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              >
                <option value="Estúdio DER">Estúdio DER</option>
                <option value="Laboratório SQL (Editor)">Laboratório SQL (Editor)</option>
                <option value="Split-View SQL ↔ DER">Split-View SQL ↔ DER</option>
                <option value="Modelo Lógico & Dicionário 1FN–3FN">
                  Modelo Lógico &amp; Dicionário 1FN–3FN
                </option>
                <option value="Galeria & Desafios Práticos">
                  Galeria &amp; Desafios Práticos
                </option>
                <option value="Configurações & Super-Backup">
                  Configurações &amp; Super-Backup
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Resumo Curto
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Ex: Sugestão de desafio com HAVING"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Descrição ou Passos Realizados
              </label>
              <textarea
                rows={4}
                value={reportSteps}
                onChange={(e) => setReportSteps(e.target.value)}
                placeholder="Descreva o que esperava acontecer ou os detalhes da sua sugestão..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Trecho SQL Opcional (para reprodução)
              </label>
              <textarea
                rows={4}
                value={reportSql}
                onChange={(e) => setReportSql(e.target.value)}
                placeholder="SELECT ... ou CREATE TABLE ..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]/70">
            {toastMessage ? (
              <div className="flex items-center gap-2 text-xs text-[var(--status-success)] bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 px-3 py-1.5 rounded-lg animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{toastMessage}</span>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#FF6B00]">info</span>
                <span>O relatório técnico do ambiente é anexado automaticamente à mensagem.</span>
              </span>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                title="Copiar relatório formatado em Markdown para a área de transferência"
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
                  {copiedReport ? 'check' : 'content_copy'}
                </span>
                <span>{copiedReport ? 'Copiado!' : 'Copiar .md'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenGitHubIssue}
                title="Abrir uma nova issue pública no repositório GitHub do projeto"
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                <span>Issue GitHub</span>
              </button>

              <button
                type="button"
                onClick={handleSendViaGmailWeb}
                title={`Abrir rascunho preenchido direto no Gmail no navegador para ${DEVELOPER_EMAIL}`}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] text-[#EA4335]">mail</span>
                <span>Gmail Web</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                title={`Enviar por e-mail para ${DEVELOPER_EMAIL} através do seu aplicativo de e-mail padrão`}
                className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Enviar por E-mail</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

