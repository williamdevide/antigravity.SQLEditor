import React, { useState, useEffect } from 'react';
import { autoGradeStudentSubmission } from '../services/autoGraderService';
import { gradeExamSubmission } from '../services/scriptService';
import type { SavedScriptItem, AutoGradeDetails } from '../types';

interface ExamGradingModalProps {
  submission: SavedScriptItem;
  classExams: SavedScriptItem[];
  classDatabaseScripts: SavedScriptItem[];
  teacherUid: string;
  onClose: () => void;
  onSaved: (updated: { grade: number; gradePublished: boolean; teacherFeedback: string }) => void;
}

/**
 * Modal de Visualização e Correção Automática de Entregas de Provas
 */
export const ExamGradingModal: React.FC<ExamGradingModalProps> = ({
  submission,
  classExams,
  classDatabaseScripts,
  teacherUid,
  onClose,
  onSaved,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(classExams[0]?.id || '');
  const [answerKeySql, setAnswerKeySql] = useState<string>(classExams[0]?.answerKeySql || '');
  const [grade, setGrade] = useState<string>(
    submission.grade !== undefined ? String(submission.grade) : '10'
  );
  const [feedback, setFeedback] = useState<string>(submission.teacherFeedback || '');
  const [gradePublished, setGradePublished] = useState<boolean>(
    submission.gradePublished ?? true
  );
  const [autoDetails, setAutoDetails] = useState<AutoGradeDetails | undefined>(
    submission.autoGradeDetails
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const found = classExams.find((e) => e.id === selectedExamId);
    if (found?.answerKeySql) {
      setAnswerKeySql(found.answerKeySql);
    }
  }, [selectedExamId, classExams]);

  const handleRunAutoGrade = () => {
    const details = autoGradeStudentSubmission({
      studentSql: submission.content,
      answerKeySql,
      setupDatabaseScripts: classDatabaseScripts.map((d) => d.content),
    });
    setAutoDetails(details);
    setGrade(String(details.score));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const numericGrade = Math.max(0, Math.min(10, Number(grade) || 0));
      await gradeExamSubmission(submission.id, {
        grade: numericGrade,
        teacherFeedback: feedback,
        gradedBy: teacherUid,
        gradePublished,
        autoGradeDetails: autoDetails,
      });
      onSaved({
        grade: numericGrade,
        gradePublished,
        teacherFeedback: feedback,
      });
    } catch (err: any) {
      alert('Erro ao salvar avaliação e nota: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-purple-500/40 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">assignment_turned_in</span>
              <span>{submission.title}</span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Aluno: <strong>{submission.authorName}</strong> ({submission.authorEmail}) • Enviado em{' '}
              {new Date(submission.submittedAt || submission.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Código do Aluno */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Código SQL Entregue pelo Aluno</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {submission.content.split('\n').length} linhas
                </span>
              </label>
              <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 h-72 overflow-y-auto">
                <pre className="font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {submission.content}
                </pre>
              </div>
            </div>

            {/* Gabarito e Correção Automática */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Gabarito SQL (para Correção Automática)
                </label>
                <button
                  type="button"
                  onClick={handleRunAutoGrade}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow"
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Corrigir Automaticamente</span>
                </button>
              </div>

              {classExams.length > 0 && (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                >
                  <option value="">-- Sem gabarito vinculado (validar sintaxe/avulso) --</option>
                  {classExams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      Gabarito de: {ex.title}
                    </option>
                  ))}
                </select>
              )}

              <textarea
                rows={7}
                value={answerKeySql}
                onChange={(e) => setAnswerKeySql(e.target.value)}
                placeholder="Cole aqui os comandos SQL esperados (gabarito). Se vazio, a correção verifica se todas as instruções do aluno executam sem erros nos bancos da turma."
                className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Relatório da Correção Automática */}
          {autoDetails && (
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-300">
                  Relatório Automático ({autoDetails.passedQueries} de {autoDetails.totalQueries} acertos)
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-[#FFE600] text-xs font-black">
                  Sugestão: {autoDetails.score.toFixed(1)} / 10.0
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {autoDetails.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border text-[11px] flex items-start gap-2 ${
                      item.passed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5">
                      {item.passed ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold block">{item.label}</span>
                      <span className="text-[10px] opacity-85 block truncate">Esperado: {item.expectedSummary}</span>
                      <span className="text-[10px] opacity-85 block truncate">Aluno: {item.actualSummary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nota, Feedback e Publicação */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-color)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Nota Final (0 a 10)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
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
                {isSaving ? 'Salvando...' : 'Salvar Nota & Feedback'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
