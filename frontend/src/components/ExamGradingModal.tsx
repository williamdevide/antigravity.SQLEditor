import React, { useState, useEffect } from 'react';
import { autoGradeStudentSubmission } from '../services/autoGraderService';
import { gradeExamSubmission } from '../services/scriptService';
import type { SavedScriptItem, AutoGradeDetails, AutoGradeQueryDetail } from '../types';

interface ExamGradingModalProps {
  submission: SavedScriptItem;
  allStudentSubmissions?: SavedScriptItem[];
  classExams: SavedScriptItem[];
  classDatabaseScripts: SavedScriptItem[];
  teacherUid: string;
  onClose: () => void;
  onSaved: (updated: {
    submissionId: string;
    grade: number;
    gradePublished: boolean;
    teacherFeedback: string;
    autoGradeDetails?: AutoGradeDetails;
  }) => void;
  onDeleteSubmission?: (submissionId: string) => void;
}

/**
 * Tela dedicada de Visualização e Correção Automática/Manual de Avaliações (Escala 0 a 100)
 */
export const ExamGradingModal: React.FC<ExamGradingModalProps> = ({
  submission: initialSubmission,
  allStudentSubmissions = [],
  classExams,
  classDatabaseScripts,
  teacherUid,
  onClose,
  onSaved,
  onDeleteSubmission,
}) => {
  const [currentSubmission, setCurrentSubmission] = useState<SavedScriptItem>(initialSubmission);
  const [selectedExamId, setSelectedExamId] = useState<string>(classExams[0]?.id || '');
  const [answerKeySql, setAnswerKeySql] = useState<string>(classExams[0]?.answerKeySql || '');
  const [showAnswerKeyEditor, setShowAnswerKeyEditor] = useState<boolean>(!initialSubmission.autoGradeDetails);
  const [grade, setGrade] = useState<string>(
    initialSubmission.grade !== undefined ? String(initialSubmission.grade) : '0'
  );
  const [feedback, setFeedback] = useState<string>(initialSubmission.teacherFeedback || '');
  const [gradePublished, setGradePublished] = useState<boolean>(
    initialSubmission.gradePublished ?? true
  );
  const [autoDetails, setAutoDetails] = useState<AutoGradeDetails | undefined>(
    initialSubmission.autoGradeDetails
  );
  const [isSaving, setIsSaving] = useState(false);

  // Filtra outras versões do mesmo aluno para esta avaliação/sessão
  const studentVersions = allStudentSubmissions.filter(
    (s) =>
      s.authorUid === currentSubmission.authorUid &&
      (s.examSessionId || null) === (currentSubmission.examSessionId || null)
  );

  useEffect(() => {
    setGrade(currentSubmission.grade !== undefined ? String(currentSubmission.grade) : '0');
    setFeedback(currentSubmission.teacherFeedback || '');
    setGradePublished(currentSubmission.gradePublished ?? true);
    setAutoDetails(currentSubmission.autoGradeDetails);
    setShowAnswerKeyEditor(!currentSubmission.autoGradeDetails);
  }, [currentSubmission]);

  useEffect(() => {
    const found = classExams.find((e) => e.id === selectedExamId);
    if (found?.answerKeySql !== undefined) {
      setAnswerKeySql(found.answerKeySql || '');
    }
  }, [selectedExamId, classExams]);

  const handleRunAutoGrade = () => {
    const details = autoGradeStudentSubmission({
      studentSql: currentSubmission.content,
      answerKeySql,
      setupDatabaseScripts: classDatabaseScripts.map((d) => d.content),
    });
    setAutoDetails(details);
    setGrade(String(details.score));
    setShowAnswerKeyEditor(false);
  };

  // Permite ao professor ajustar a pontuação individual de uma questão e recalcular os 100 pontos automaticamente
  const handleQuestionPointsChange = (idx: number, rawVal: string) => {
    if (!autoDetails) return;
    const item = autoDetails.items[idx];
    if (!item) return;
    const maxPts = item.maxPoints ?? (autoDetails.totalQueries > 0 ? 100 / autoDetails.totalQueries : 100);
    const parsed = Math.max(0, Math.min(maxPts, Number(rawVal) || 0));

    const updatedItems: AutoGradeQueryDetail[] = autoDetails.items.map((it, i) => {
      if (i !== idx) return it;
      const rounded = Math.round(parsed * 10) / 10;
      const newStatus: 'correct' | 'partial' | 'wrong' =
        rounded >= (it.maxPoints ?? maxPts) - 0.05
          ? 'correct'
          : rounded > 0
          ? 'partial'
          : 'wrong';
      return {
        ...it,
        manualPoints: rounded,
        earnedPoints: rounded,
        passed: newStatus === 'correct',
        status: newStatus,
      };
    });

    const newTotalRaw = updatedItems.reduce(
      (acc, it) => acc + (it.manualPoints ?? it.earnedPoints ?? 0),
      0
    );
    const allCorrect = updatedItems.every((it) => it.status === 'correct');
    const newScore = allCorrect ? 100 : Math.min(100, Math.round(newTotalRaw * 10) / 10);

    setAutoDetails({
      ...autoDetails,
      passedQueries: updatedItems.filter((it) => it.status === 'correct' || it.passed).length,
      partialQueries: updatedItems.filter((it) => it.status === 'partial').length,
      score: newScore,
      items: updatedItems,
    });
    setGrade(String(newScore));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const numericGrade = Math.max(0, Math.min(100, Number(grade) || 0));
      await gradeExamSubmission(currentSubmission.id, {
        grade: numericGrade,
        teacherFeedback: feedback,
        gradedBy: teacherUid,
        gradePublished,
        autoGradeDetails: autoDetails,
      });
      onSaved({
        submissionId: currentSubmission.id,
        grade: numericGrade,
        gradePublished,
        teacherFeedback: feedback,
        autoGradeDetails: autoDetails,
      });
    } catch (err: any) {
      alert('Erro ao salvar avaliação e nota: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!onDeleteSubmission) return;
    const confirm = window.confirm(
      `Deseja realmente EXCLUIR esta entrega do aluno "${currentSubmission.authorName}" (${currentSubmission.title})?\n\nEsta ação removerá a resposta e as notas atribuídas permanentemente.`
    );
    if (!confirm) return;
    onDeleteSubmission(currentSubmission.id);
  };

  const numericGradePreview = Math.max(0, Math.min(100, Number(grade) || 0));

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-purple-500/40 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[var(--bg-primary)]/40">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">assignment_turned_in</span>
                <span>{currentSubmission.title}</span>
              </h3>
              {studentVersions.length > 1 && (
                <div className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                  <span className="text-[10px] font-bold text-purple-300">Versões do aluno:</span>
                  {[...studentVersions]
                    .sort((a, b) => (a.submissionVersion || 1) - (b.submissionVersion || 1))
                    .map((ver) => (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => setCurrentSubmission(ver)}
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          ver.id === currentSubmission.id
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-[var(--text-muted)] hover:text-purple-300'
                        }`}
                      >
                        v{ver.submissionVersion || 1}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Aluno: <strong>{currentSubmission.authorName}</strong> ({currentSubmission.authorEmail}) • Enviado em{' '}
              {new Date(currentSubmission.submittedAt || currentSubmission.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={`px-3.5 py-1.5 rounded-2xl border font-black text-sm flex items-center gap-1.5 ${
                numericGradePreview >= 60
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              <span>{numericGradePreview.toFixed(1)}</span>
              <span className="text-[11px] font-semibold opacity-80">/ 100 pts</span>
            </div>

            {onDeleteSubmission && (
              <button
                type="button"
                onClick={handleDeleteCurrent}
                title="Excluir esta entrega permanentemente"
                className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Painel de Configuração do Gabarito & Disparo da Auto-Correção */}
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-purple-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[18px]">auto_awesome</span>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Gabarito SQL &amp; Auto-Correção Proporcional (0 a 100 pontos)
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Remove automaticamente todos os comentários da prova e do gabarito, atribui peso igual por questão e avalia acertos parciais.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnswerKeyEditor((p) => !p)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-secondary)] cursor-pointer"
                >
                  {showAnswerKeyEditor ? 'Ocultar Gabarito' : 'Editar Gabarito'}
                </button>
                <button
                  type="button"
                  onClick={handleRunAutoGrade}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">bolt</span>
                  <span>Executar Auto-Correção (0–100)</span>
                </button>
              </div>
            </div>

            {showAnswerKeyEditor && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                {classExams.length > 0 && (
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="">-- Sem gabarito vinculado (validar execução dos comandos) --</option>
                    {classExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        Gabarito de: {ex.title}
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  rows={5}
                  value={answerKeySql}
                  onChange={(e) => setAnswerKeySql(e.target.value)}
                  placeholder="Cole aqui os comandos SQL esperados do gabarito. Comentários (/* */, --, #) serão ignorados automaticamente na comparação."
                  className="w-full p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* Análise Questão a Questão (quando a auto-correção foi executada) */}
          {autoDetails && autoDetails.items.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-purple-300">
                    Análise por Questão ({autoDetails.totalQueries}{' '}
                    {autoDetails.totalQueries === 1 ? 'questão' : 'questões'} • Peso:{' '}
                    {(100 / Math.max(1, autoDetails.totalQueries)).toFixed(1)} pts/questão)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10.5px] font-bold">
                    ✓ {autoDetails.passedQueries} correta(s)
                  </span>
                  {(autoDetails.partialQueries || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10.5px] font-bold">
                      ◐ {autoDetails.partialQueries} parcial(is)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Você pode confirmar ou editar os pontos de cada questão abaixo:
                </span>
              </div>

              <div className="space-y-3">
                {autoDetails.items.map((item, idx) => {
                  const status = item.status || (item.passed ? 'correct' : 'wrong');
                  const maxPts =
                    item.maxPoints ??
                    Math.round((100 / Math.max(1, autoDetails.totalQueries)) * 10) / 10;
                  const currentPts =
                    item.manualPoints ?? item.earnedPoints ?? (item.passed ? maxPts : 0);

                  const cardStyle =
                    status === 'correct'
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : status === 'partial'
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-rose-500/40 bg-rose-950/10';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-3 ${cardStyle}`}
                    >
                      {/* Cabeçalho da Questão com Editor de Pontuação Manual */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              status === 'correct'
                                ? 'text-emerald-400'
                                : status === 'partial'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {status === 'correct'
                              ? 'check_circle'
                              : status === 'partial'
                              ? 'contrast'
                              : 'cancel'}
                          </span>
                          <span className="font-bold text-xs text-[var(--text-primary)]">
                            {item.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              status === 'correct'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : status === 'partial'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {status === 'correct'
                              ? 'Correta'
                              : status === 'partial'
                              ? 'Acerto Parcial'
                              : 'Incorreta'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] px-2.5 py-1 rounded-xl border border-[var(--border-color)]">
                          <label className="text-[10.5px] font-semibold text-[var(--text-secondary)]">
                            Pontos:
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxPts}
                            value={currentPts}
                            onChange={(e) => handleQuestionPointsChange(idx, e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-black text-[#FFE600] text-center"
                          />
                          <span className="text-[10.5px] font-mono text-[var(--text-muted)]">
                            / {maxPts.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Comparação lado a lado sem comentários */}
                      {(item.studentSqlClean !== undefined || item.expectedSqlClean) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                              SQL do Aluno (sem comentários)
                            </span>
                            <pre className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)] whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {item.studentSqlClean || '-- (Sem resposta para esta questão)'}
                            </pre>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                              Gabarito Oficial (sem comentários)
                            </span>
                            <pre className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {item.expectedSqlClean || '-- (Avaliação livre sem gabarito vinculado)'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Resumo de Execução e Diagnóstico Detalhado */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                        <span>
                          <strong>Esperado:</strong> {item.expectedSummary}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Aluno:</strong> {item.actualSummary}
                        </span>
                      </div>

                      {item.breakdown && item.breakdown.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.breakdown.map((b, bIdx) => (
                            <span
                              key={bIdx}
                              className={`px-2 py-0.5 rounded-lg text-[10.5px] border ${
                                b.startsWith('✓')
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : b.startsWith('⚠')
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Visualização Bruta quando ainda não foi executada a auto-correção */
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Código SQL Entregue pelo Aluno</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {currentSubmission.content.split('\n').length} linhas
                </span>
              </label>
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 h-72 overflow-y-auto">
                <pre className="font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {currentSubmission.content}
                </pre>
              </div>
            </div>
          )}

          {/* Nota Final, Feedback e Publicação */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-color)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Nota Final (0 a 100)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm font-black text-[#FFE600]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Feedback / Observações ao Aluno
              </label>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Comentário construtivo sobre a resolução da prova..."
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={gradePublished}
                onChange={() => setGradePublished(!gradePublished)}
                className="accent-emerald-500 rounded"
              />
              <span>✅ Disponibilizar / Publicar nota e feedback imediatamente para o aluno</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 text-white font-bold text-xs shadow cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Confirmar & Salvar Nota'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
