import React, { useState, useEffect } from 'react';
import { setStudentFrozenState } from '../services/classroomRealtimeService';
import { autoGradeStudentSubmission } from '../services/autoGraderService';
import type {
  StudentLiveStateItem,
  ExamAlertItem,
  SavedScriptItem,
  AutoGradeDetails,
} from '../types';

interface StudentMonitorModalProps {
  studentUid: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  liveState: StudentLiveStateItem | null;
  studentAlerts: ExamAlertItem[];
  classDatabaseScripts: SavedScriptItem[];
  classExams: SavedScriptItem[];
  onClose: () => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  onOpenDirectMessage?: (studentUid: string, studentName: string) => void;
  onQuickSaveGrade?: (params: {
    studentUid: string;
    studentName: string;
    studentEmail: string;
    content: string;
    grade: number;
    feedback: string;
    autoGradeDetails: AutoGradeDetails;
  }) => Promise<void>;
}

/**
 * Modal de Monitoramento Ao Vivo do Workspace do Aluno ("Ver Tela")
 * Exibe abas abertas, código SQL digitado ao vivo, erros, alertas anti-trapaça,
 * botão de congelamento remoto e avaliação rápida com correção automática.
 */
export const StudentMonitorModal: React.FC<StudentMonitorModalProps> = ({
  studentUid,
  studentName,
  studentEmail,
  classId,
  liveState,
  studentAlerts,
  classDatabaseScripts,
  classExams,
  onClose,
  onAcknowledgeAlert,
  onOpenDirectMessage,
  onQuickSaveGrade,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<string>('');
  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>(classExams[0]?.id || '');
  const [customAnswerKey, setCustomAnswerKey] = useState<string>(classExams[0]?.answerKeySql || '');
  const [autoReport, setAutoReport] = useState<AutoGradeDetails | null>(null);
  const [gradeValue, setGradeValue] = useState<string>('10');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [showGrader, setShowGrader] = useState(false);

  const tabs = liveState?.tabs || [];
  const activeSnapshot =
    tabs.find((t) => t.id === selectedTabId) ||
    tabs[0] ||
    (liveState
      ? { id: 'active', title: liveState.activeTabTitle || 'script.sql', content: liveState.activeTabContent || '' }
      : null);

  useEffect(() => {
    const matched = classExams.find((e) => e.id === selectedExamId);
    if (matched?.answerKeySql) {
      setCustomAnswerKey(matched.answerKeySql);
    }
  }, [selectedExamId, classExams]);

  const handleToggleFreeze = async () => {
    try {
      setIsTogglingFreeze(true);
      const nextFrozen = !liveState?.isFrozen;
      await setStudentFrozenState(
        classId,
        studentUid,
        nextFrozen,
        nextFrozen
          ? 'Editor bloqueado temporariamente pelo professor durante a avaliação.'
          : ''
      );
    } finally {
      setIsTogglingFreeze(false);
    }
  };

  const handleRunAutoGrade = () => {
    const code = activeSnapshot?.content || liveState?.activeTabContent || '';
    const report = autoGradeStudentSubmission({
      studentSql: code,
      answerKeySql: customAnswerKey,
      setupDatabaseScripts: classDatabaseScripts.map((d) => d.content),
    });
    setAutoReport(report);
    setGradeValue(String(report.score));
    setShowGrader(true);
  };

  const handlePublishQuickGrade = async () => {
    if (!onQuickSaveGrade) return;
    const code =
      tabs.length > 0
        ? tabs.map((t) => `-- === ABA: ${t.title} ===\n${t.content}`).join('\n\n')
        : liveState?.activeTabContent || '';
    try {
      setIsSavingGrade(true);
      const details =
        autoReport ||
        autoGradeStudentSubmission({
          studentSql: code,
          answerKeySql: customAnswerKey,
          setupDatabaseScripts: classDatabaseScripts.map((d) => d.content),
        });
      await onQuickSaveGrade({
        studentUid,
        studentName,
        studentEmail,
        content: code,
        grade: Number(gradeValue) || 0,
        feedback: feedbackText,
        autoGradeDetails: details,
      });
      setShowGrader(false);
      alert(`Nota ${gradeValue} publicada para ${studentName}!`);
    } catch (err: any) {
      alert('Erro ao publicar nota: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSavingGrade(false);
    }
  };

  const unackCount = studentAlerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--bg-primary)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0288D1]/15 border border-[#0288D1]/40 text-[#29B6F6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">desktop_windows</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Tela ao Vivo: {studentName}
                </h3>
                {liveState?.isFrozen && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                    ❄️ Editor Congelado
                  </span>
                )}
                {unackCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold animate-pulse">
                    ⚠️ {unackCount} alerta(s) anti-trapaça
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                {studentEmail} • Banco ativo:{' '}
                <strong className="text-[#FFE600]">{liveState?.activeDatabase || '(nenhum)'}</strong>{' '}
                {liveState?.updatedAt
                  ? `• Sincronizado às ${new Date(liveState.updatedAt).toLocaleTimeString('pt-BR')}`
                  : '• Aguardando atividade no editor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenDirectMessage && (
              <button
                type="button"
                onClick={() => onOpenDirectMessage(studentUid, studentName)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[#29B6F6] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">chat</span>
                <span>Mensagem</span>
              </button>
            )}

            <button
              type="button"
              disabled={isTogglingFreeze}
              onClick={handleToggleFreeze}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                liveState?.isFrozen
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {liveState?.isFrozen ? 'lock_open' : 'ac_unit'}
              </span>
              <span>{liveState?.isFrozen ? 'Desbloquear Editor' : 'Congelar Editor'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGrader((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <span className="material-symbols-outlined text-[15px]">grading</span>
              <span>Avaliar / Nota</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Espelho do Código (2 colunas) */}
          <div className="lg:col-span-2 flex flex-col space-y-3 min-h-[340px]">
            {/* Abas do aluno */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-color)]">
              {tabs.length === 0 ? (
                <span className="text-[11px] text-[var(--text-muted)] px-2 py-1">
                  {liveState?.activeTabTitle || 'Sem abas sincronizadas ainda'}
                </span>
              ) : (
                tabs.map((t) => {
                  const isSelected = activeSnapshot?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTabId(t.id)}
                      className={`px-3 py-1 rounded-t-lg text-xs font-mono border-b-2 transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[var(--bg-primary)] text-[#FFE600] border-[#FFE600] font-bold'
                          : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {t.title}
                    </button>
                  );
                })
              )}
            </div>

            {/* Editor Mirror Read-Only */}
            <div className="flex-1 rounded-2xl bg-[#0B0D12] border border-[var(--border-color)] p-4 overflow-auto min-h-[260px] max-h-[420px]">
              <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {activeSnapshot?.content || liveState?.activeTabContent || '-- Aluno ainda não digitou código neste ciclo --'}
              </pre>
            </div>

            {/* Status da última execução do aluno */}
            {liveState?.lastQueryStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  liveState.lastQueryStatus === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                  {liveState.lastQueryStatus === 'success' ? 'check_circle' : 'error'}
                </span>
                <div className="min-w-0">
                  <span className="font-bold block">
                    Última execução: {liveState.lastQueryStatus === 'success' ? 'Sucesso' : 'Erro SQL'}
                  </span>
                  <span className="text-[11px] font-mono break-all">
                    {liveState.lastQueryError || liveState.lastQuerySummary || ''}
                  </span>
                </div>
              </div>
            )}

            {/* Painel Rápido de Correção Automática e Nota */}
            {showGrader && (
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-purple-500/40 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    <span>Correção Automática &amp; Nota Direta</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleRunAutoGrade}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    <span>Executar Correção Automática</span>
                  </button>
                </div>

                {classExams.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                        Avaliação Base (Gabarito):
                      </label>
                      <select
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                      >
                        <option value="">-- Gabarito avulso / apenas sintaxe --</option>
                        {classExams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                        Nota Final (0 a 10):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[#FFE600]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    Gabarito SQL Esperado (opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={customAnswerKey}
                    onChange={(e) => setCustomAnswerKey(e.target.value)}
                    placeholder="Cole os SELECTs esperados do gabarito para comparação automática..."
                    className="w-full p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)]"
                  />
                </div>

                {autoReport && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">
                      Resultado Automático: {autoReport.passedQueries}/{autoReport.totalQueries} acertos • Nota sugerida:{' '}
                      <span className="text-[#FFE600]">{autoReport.score.toFixed(1)}</span>
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {autoReport.items.map((it, idx) => (
                        <div
                          key={idx}
                          className={`px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                            it.passed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          <span>{it.passed ? '✅' : '❌'} {it.label}</span>
                          <span className="font-mono text-[10px]">{it.actualSummary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    Feedback para o Aluno:
                  </label>
                  <input
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Ex: Boa estruturação nos JOINs, atenção ao GROUP BY..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                {onQuickSaveGrade && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingGrade}
                      onClick={handlePublishQuickGrade}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                    >
                      {isSavingGrade ? 'Publicando...' : 'Salvar e Publicar Nota'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Painel Direito: Alertas Anti-Trapaça do Aluno */}
          <div className="flex flex-col space-y-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-400">security</span>
                <span>Monitor Anti-Trapaça ({studentAlerts.length})</span>
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[440px]">
              {studentAlerts.length === 0 ? (
                <div className="py-10 text-center text-[11px] text-[var(--text-muted)] space-y-1">
                  <span className="material-symbols-outlined text-[28px] text-emerald-400/70">verified_user</span>
                  <p>Nenhuma ocorrência suspeita registrada para este aluno.</p>
                </div>
              ) : (
                studentAlerts.map((alertItem) => (
                  <div
                    key={alertItem.id}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      alertItem.acknowledged
                        ? 'bg-[var(--bg-surface)] border-[var(--border-color)] opacity-65'
                        : 'bg-rose-500/10 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-rose-300">
                        {alertItem.type === 'tab_switch'
                          ? '🔄 Troca de Aba'
                          : alertItem.type === 'window_blur'
                          ? '🪟 Saiu da Janela'
                          : alertItem.type === 'copy_paste_attempt'
                          ? '📋 Copiar/Colar'
                          : alertItem.type === 'extension_detected'
                          ? '🤖 Extensão/Overlay IA'
                          : '🛠️ Inspeção/DevTools'}
                      </span>
                      <span className="font-mono text-[9.5px] text-[var(--text-muted)]">
                        {new Date(alertItem.createdAt).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-snug">{alertItem.details}</p>
                    {!alertItem.acknowledged && onAcknowledgeAlert && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onAcknowledgeAlert(alertItem.id)}
                          className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                        >
                          Marcar ciente
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
