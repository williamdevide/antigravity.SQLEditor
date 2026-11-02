import React, { useState } from 'react';
import { APP_VERSION } from '../config/version';
import type { ActiveView, FontTheme, ThemeMode } from '../types';

export interface FeedbackViewProps {
  theme: ThemeMode;
  fontTheme: FontTheme;
  onNavigate: (view: ActiveView) => void;
}

const DEVELOPER_EMAIL = 'williamdevide.ourinhos@gmail.com';

export const FeedbackView: React.FC<FeedbackViewProps> = ({
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
      ? 'Reporte de Bug / Erro'
      : reportType === 'suggestion'
      ? 'Sugestão de Recurso Visual'
      : 'Ideia Pedagógica / Exercício';

  const buildEmailSubject = () => {
    const typeLabel = getReportTypeLabel();
    const cleanTitle = reportTitle.trim() || reportModule;
    return `[SQLEditor v${APP_VERSION}] [${typeLabel}] ${cleanTitle}`;
  };

  const buildEmailBody = () => {
    const typeLabel = getReportTypeLabel();
    const lines = [
      `Olá, Professor William Devidé!`,
      '',
      `Estou enviando este feedback a partir do SQLEditor v${APP_VERSION}:`,
      '',
      `• Categoria: ${typeLabel}`,
      `• Módulo Relacionado: ${reportModule}`,
      `• Tema UI: ${theme} | Sintaxe: ${fontTheme}`,
      `• Navegador / Plataforma: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `• Resumo: ${reportTitle.trim() || '(Não informado)'}`,
      '',
      '--- Detalhes / Passos Realizados ---',
      reportSteps.trim() || '(Sem descrição detalhada)',
    ];

    if (reportSql.trim()) {
      lines.push('', '--- Trecho SQL Relacionado ---', reportSql.trim());
    }

    lines.push('', '--- Enviado a partir da Central de Feedback do SQLEditor ---');
    return lines.join('\n');
  };

  const buildMarkdownReport = () => {
    const typeLabel = getReportTypeLabel();
    const lines = [
      `# Relatório Técnico - SQLEditor v${APP_VERSION}`,
      '',
      `**Data / Hora:** ${new Date().toLocaleString('pt-BR')}`,
      `**Tipo:** ${typeLabel}`,
      `**Módulo:** ${reportModule}`,
      `**Tema:** ${theme} • **Sintaxe:** ${fontTheme}`,
      `**Ambiente:** \`${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}\``,
      '',
      `## Título / Resumo`,
      reportTitle.trim() || `(Sem título - Módulo ${reportModule})`,
      '',
      `## Descrição ou Passos Realizados`,
      reportSteps.trim() || '*(Nenhum detalhe adicional informado)*',
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
    } catch {
      // Ignora erro
    }

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
    } catch {
      // Ignora erro
    }

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
    <div
      className="flex-1 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] p-6 relative"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 10%, rgba(255, 107, 0, 0.05), transparent 60%), url('/backgrounds/bg-geometric-poly.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Cabeçalho */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
              <span className="material-symbols-outlined text-[24px]">feedback</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                Canal Direto de Feedback &amp; Reporte Técnico
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Envie sugestões pedagógicas, novas ideias de recursos visuais ou reporte comportamentos inesperados diretamente ao desenvolvedor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('guide')}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">menu_book</span>
              <span>Guia da Disciplina</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('workspace')}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              <span>Voltar ao Editor</span>
            </button>
          </div>
        </div>

        {/* Gerador Estruturado de Feedback */}
        <section className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md border border-[var(--border-color)] space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">send</span>
                <span>Formulário de Comunicação Direta</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                O diagnóstico do ambiente (navegador, versão v{APP_VERSION}, tema e configurações) é empacotado automaticamente.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#FF6B00]/15 border border-[#FF6B00]/35 text-[11px] font-mono text-[#FF6B00] flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                <span>Destino: <strong>{DEVELOPER_EMAIL}</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-muted)]">
                v{APP_VERSION} • {theme}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Categoria da Mensagem
              </label>
              <select
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as 'bug' | 'suggestion' | 'pedagogy')
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:border-[#FF6B00] outline-none"
              >
                <option value="bug">Reporte de Bug / Erro</option>
                <option value="suggestion">Sugestão de Recurso Visual</option>
                <option value="pedagogy">Novo Exercício ou Banco de Aula</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Módulo Relacionado
              </label>
              <select
                value={reportModule}
                onChange={(e) => setReportModule(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:border-[#FF6B00] outline-none"
              >
                <option value="Estúdio DER">Estúdio DER (Diagrama)</option>
                <option value="Laboratório SQL (Editor)">Laboratório SQL (Editor Monaco)</option>
                <option value="Split-View SQL ↔ DER">Split-View SQL ↔ DER ao Vivo</option>
                <option value="Modelo Lógico & Dicionário 1FN–3FN">
                  Modelo Lógico &amp; Dicionário 1FN–3FN
                </option>
                <option value="Galeria & Desafios Práticos">
                  Galeria &amp; Desafios Práticos
                </option>
                <option value="Vídeos Tutoriais Interativos">
                  Vídeos Tutoriais Interativos
                </option>
                <option value="Configurações & Super-Backup">
                  Configurações &amp; Super-Backup
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Resumo Curto
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Ex: Sugestão para o desafio de JOIN"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:border-[#FF6B00] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Descrição Detalhada / Passos Realizados
              </label>
              <textarea
                rows={5}
                value={reportSteps}
                onChange={(e) => setReportSteps(e.target.value)}
                placeholder="Explique o que aconteceu, o que esperava que acontecesse ou como podemos enriquecer as aulas com sua ideia..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] resize-none focus:border-[#FF6B00] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Trecho SQL Opcional (para reprodução ou validação)
              </label>
              <textarea
                rows={5}
                value={reportSql}
                onChange={(e) => setReportSql(e.target.value)}
                placeholder="SELECT ... ou CREATE TABLE ..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] resize-none focus:border-[#FF6B00] outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
            {toastMessage ? (
              <div className="flex items-center gap-2 text-xs text-[var(--status-success)] bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 px-3 py-1.5 rounded-lg animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{toastMessage}</span>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#FF6B00]">info</span>
                <span>Ao clicar em enviar, o relatório técnico é copiado e seu e-mail é acionado.</span>
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
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
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

