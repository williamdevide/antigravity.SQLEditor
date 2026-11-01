import React, { useEffect, useMemo, useState } from 'react';
import {
  ER_TEMPLATES_CATALOG,
  type ERTemplateCatalogItem,
} from '../data/erTemplatesCatalog';
import {
  PRACTICE_EXERCISES_CATALOG,
  type PracticeExerciseItem,
} from '../data/practiceExercisesCatalog';
import {
  validatePracticeExercise,
  type ExerciseValidationResult,
} from '../services/exerciseValidator';
import { parseLiveSqlSchema } from '../services/liveSqlSchemaParser';
import { getClassroomDatabases } from '../services/scriptsLoader';
import { dbStorage } from '../services/storage';
import type { DatabasePreset } from '../types';
import type {
  SavedERDiagramRecord,
  StoredExerciseProgress,
} from '../types/erStudio';
import { ERThumbnailSvg } from './er/ERThumbnailSvg';

// ============================================================================
// BANNER ACOPLÁVEL DE DESAFIO ATIVO (EXIBIDO NO LABORATÓRIO SQL / ESTÚDIO DER)
// ============================================================================

interface ActiveChallengeBannerProps {
  exercise: PracticeExerciseItem;
  currentSql: string;
  onValidatedSuccess?: () => void;
  onCloseChallenge: () => void;
}

export const ActiveChallengeBanner: React.FC<ActiveChallengeBannerProps> = ({
  exercise,
  currentSql,
  onValidatedSuccess,
  onCloseChallenge,
}) => {
  const [showHint, setShowHint] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ExerciseValidationResult | null>(null);

  useEffect(() => {
    setShowHint(false);
    setValidationResult(null);
  }, [exercise.id]);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await validatePracticeExercise(exercise, currentSql);
      setValidationResult(res);
      if (res.passed) {
        onValidatedSuccess?.();
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      data-print-hide
      className="shrink-0 bg-[var(--bg-surface)] border-b-2 border-[#FF6B00] px-4 py-2.5 shadow-md z-20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FF6B00] text-white text-[10px] font-bold uppercase tracking-wider">
              Desafio Ativo • {exercise.stageLabel}
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {exercise.title}
            </span>
            <span className="text-[10px] font-mono text-[var(--accent-yellow)]">
              Banco: {exercise.targetDatabase}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {exercise.prompt}
          </p>
          {showHint && (
            <div className="mt-1 px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--accent-yellow)]/40 text-[11px] font-mono text-[var(--accent-yellow)]">
              💡 Dica: {exercise.hint}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--accent-yellow)] flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">lightbulb</span>
            <span>{showHint ? 'Ocultar Dica' : 'Dica'}</span>
          </button>

          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--status-success)] hover:opacity-90 text-[#0F1117] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            <span>{isValidating ? 'Validando...' : 'Validar Resposta'}</span>
          </button>

          <button
            type="button"
            onClick={onCloseChallenge}
            title="Encerrar modo desafio"
            className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {validationResult && (
        <div
          className={`mt-2 px-3 py-2 rounded-lg border text-xs flex items-start gap-2 ${
            validationResult.passed
              ? 'bg-[var(--status-success)]/15 border-[var(--status-success)]/50 text-[var(--status-success)]'
              : 'bg-[var(--status-error)]/15 border-[var(--status-error)]/50 text-[var(--status-error)]'
          }`}
        >
          <span className="material-symbols-outlined text-[17px] shrink-0">
            {validationResult.passed ? 'celebration' : 'error'}
          </span>
          <div>
            <strong className="font-bold">{validationResult.title} </strong>
            <span className="text-[var(--text-primary)]">
              {validationResult.feedback}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TELA PRINCIPAL: GALERIA & PRÁTICA GUIADA DA DISCIPLINA (#galeria)
// ============================================================================

type GalleryTabId = 'classroom' | 'templates' | 'challenges' | 'saved';

export interface GalleryAndPracticeViewProps {
  onInstantiateSqlAndOpenView: (options: {
    title: string;
    dbName: string;
    sql: string;
    targetView: 'er-diagram' | 'workspace' | 'er-model';
    enableSplitView?: boolean;
  }) => Promise<void> | void;
  onLoadPreset: (preset: DatabasePreset) => Promise<void> | void;
  onStartExercise: (exercise: PracticeExerciseItem) => Promise<void> | void;
  onRestoreSavedDiagram: (record: SavedERDiagramRecord) => Promise<void> | void;
}

export const GalleryAndPracticeView: React.FC<GalleryAndPracticeViewProps> = ({
  onInstantiateSqlAndOpenView,
  onLoadPreset,
  onStartExercise,
  onRestoreSavedDiagram,
}) => {
  const [activeTab, setActiveTab] = useState<GalleryTabId>('classroom');
  const [templateFilter, setTemplateFilter] = useState<
    'all' | 'template' | 'normalization-lab'
  >('all');
  const [stageFilter, setStageFilter] = useState<number>(0);
  const [savedModels, setSavedModels] = useState<SavedERDiagramRecord[]>([]);
  const [progressMap, setProgressMap] = useState<
    Record<string, StoredExerciseProgress>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Carrega modelos salvos pelo aluno e progresso nos desafios
  const refreshLocalRecords = async () => {
    try {
      const [allDiagrams, allProgress] = await Promise.all([
        dbStorage.erDiagrams.where('kind').equals('custom-model').toArray(),
        dbStorage.exerciseProgress.toArray(),
      ]);
      allDiagrams.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setSavedModels(allDiagrams);

      const pMap: Record<string, StoredExerciseProgress> = {};
      for (const p of allProgress) {
        pMap[p.exerciseId] = p;
      }
      setProgressMap(pMap);
    } catch {
      // Ignora erro de leitura
    }
  };

  useEffect(() => {
    refreshLocalRecords();
  }, [activeTab]);

  // Bancos de Dados de Aula extraídos dinamicamente de frontend/src/data/bds/*.sql
  const classroomCards = useMemo(() => {
    const groups = getClassroomDatabases();
    return groups.map((grp) => {
      const joinedSql = grp.statements.join('\n\n');
      const parsed = parseLiveSqlSchema(joinedSql, {
        inferImplicitForeignKeys: true,
      });
      return {
        dbName: grp.dbName,
        sourceFile: grp.sourceFile,
        sql: joinedSql,
        tables: parsed.tables,
        relationships: parsed.relationships,
      };
    });
  }, []);

  // Templates curados pré-parseados com silhueta vetorial viva
  const parsedTemplates = useMemo(() => {
    return ER_TEMPLATES_CATALOG.map((tpl) => {
      const parsed = parseLiveSqlSchema(tpl.ddlSql, {
        inferImplicitForeignKeys: true,
      });
      return {
        ...tpl,
        tables: parsed.tables,
        relationships: parsed.relationships,
      };
    });
  }, []);

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'all') return parsedTemplates;
    return parsedTemplates.filter((t) => t.kind === templateFilter);
  }, [parsedTemplates, templateFilter]);

  const filteredExercises = useMemo(() => {
    if (stageFilter === 0) return PRACTICE_EXERCISES_CATALOG;
    return PRACTICE_EXERCISES_CATALOG.filter((e) => e.stageNumber === stageFilter);
  }, [stageFilter]);

  const completedCount = useMemo(
    () =>
      PRACTICE_EXERCISES_CATALOG.filter((e) => Boolean(progressMap[e.id])).length,
    [progressMap]
  );

  const handleDeleteSavedModel = async (id: string) => {
    await dbStorage.erDiagrams.delete(id);
    await refreshLocalRecords();
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Cabeçalho da Galeria & Prática Guiada */}
      <div className="px-6 py-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
            <span className="material-symbols-outlined text-[22px]">school</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                Galeria de Modelos &amp; Prática Guiada
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[var(--status-success)]/15 text-[var(--status-success)] border border-[var(--status-success)]/30 text-[10px] font-mono font-bold">
                {completedCount}/{PRACTICE_EXERCISES_CATALOG.length} desafios concluídos
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Explore bancos reais das aulas, estude templates normalizados (1FN–3FN), resolva desafios autocorrigíveis e gerencie seus modelos DER.
            </p>
          </div>
        </div>

        {/* Navegação entre as 4 Abas */}
        <div className="flex flex-wrap items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1 gap-1">
          {[
            {
              id: 'classroom' as const,
              icon: 'database',
              label: 'Bancos de Aula',
              badge: classroomCards.length,
            },
            {
              id: 'templates' as const,
              icon: 'account_tree',
              label: 'Templates & 1FN–3FN',
              badge: ER_TEMPLATES_CATALOG.length,
            },
            {
              id: 'challenges' as const,
              icon: 'emoji_events',
              label: 'Desafios Práticos',
              badge: `${completedCount}/${PRACTICE_EXERCISES_CATALOG.length}`,
            },
            {
              id: 'saved' as const,
              icon: 'bookmarks',
              label: 'Meus Modelos',
              badge: savedModels.length,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active
                      ? 'bg-black/25 text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal Rolável */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ================================================================ */}
          {/* ABA 1: BANCOS DE DADOS DE AULA & PRESETS                         */}
          {/* ================================================================ */}
          {activeTab === 'classroom' && (
            <>
              {/* Atalhos de Carga em Lote */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#FF6B00] text-[20px]">
                        library_books
                      </span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Pacote Completo — Bancos de Aula
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Instancia simultaneamente todos os esquemas utilizados nas semanas de aula no motor local AlaSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadPreset('class')}
                    className="px-3.5 py-2 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Carregar Todos
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[20px]">
                        rocket_launch
                      </span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Bancos de Exemplo Rápidos (E-Commerce &amp; Universidade)
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Carrega `ecommerce_db` e `universidade_db` prontos para treino rápido de consultas e diagramas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadPreset('samples')}
                    className="px-3.5 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--accent-yellow)] text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Carregar Exemplos
                  </button>
                </div>
              </div>

              {/* Cards Individuais com Miniatura Vetorial Viva (<ERThumbnailSvg />) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {classroomCards.map((item) => (
                  <div
                    key={item.dbName}
                    className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00]/60 overflow-hidden flex flex-col shadow-sm transition-all"
                  >
                    <div className="h-40 border-b border-[var(--border-color)] overflow-hidden relative">
                      <ERThumbnailSvg
                        tables={item.tables}
                        relationships={item.relationships}
                        className="w-full h-full"
                      />
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-[var(--bg-surface)]/90 border border-[var(--border-color)] text-[10px] font-mono font-bold text-[var(--accent-yellow)]">
                        {item.tables.length} tab • {item.relationships.length} rel
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-sm font-mono font-bold text-[var(--text-primary)]">
                          {item.dbName}
                        </h3>
                        <p className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                          Fonte: {item.sourceFile}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={loadingId === item.dbName}
                          onClick={async () => {
                            setLoadingId(item.dbName);
                            try {
                              await onInstantiateSqlAndOpenView({
                                title: `${item.dbName}.sql`,
                                dbName: item.dbName,
                                sql: item.sql,
                                targetView: 'er-diagram',
                              });
                            } finally {
                              setLoadingId(null);
                            }
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            account_tree
                          </span>
                          <span>Abrir DER</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onInstantiateSqlAndOpenView({
                              title: `${item.dbName}.sql`,
                              dbName: item.dbName,
                              sql: item.sql,
                              targetView: 'workspace',
                              enableSplitView: false,
                            })
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">
                            terminal
                          </span>
                          <span>Laboratório</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* ABA 2: TEMPLATES DER & CENÁRIOS DE NORMALIZAÇÃO (1FN–3FN)        */}
          {/* ================================================================ */}
          {activeTab === 'templates' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'all' as const, label: 'Todos os Modelos' },
                    { id: 'template' as const, label: 'Arquiteturas de Referência (3FN)' },
                    {
                      id: 'normalization-lab' as const,
                      label: 'Laboratórios de Violação (1FN / 2FN / 3FN)',
                    },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTemplateFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                        templateFilter === f.id
                          ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[var(--accent-yellow)]'
                          : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTemplates.map((tpl: ERTemplateCatalogItem & { tables: any[]; relationships: any[] }) => {
                  const isNormLab = tpl.kind === 'normalization-lab';
                  return (
                    <div
                      key={tpl.id}
                      className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00]/60 overflow-hidden flex flex-col shadow-sm transition-all"
                    >
                      <div className="h-44 border-b border-[var(--border-color)] relative overflow-hidden">
                        <ERThumbnailSvg
                          tables={tpl.tables}
                          relationships={tpl.relationships}
                          className="w-full h-full"
                        />
                        <span
                          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isNormLab
                              ? 'bg-[#FF6B00] text-white'
                              : 'bg-[var(--status-success)]/20 text-[var(--status-success)] border border-[var(--status-success)]/40'
                          }`}
                        >
                          {tpl.badge}
                        </span>
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-[var(--bg-surface)]/90 border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)]">
                          {tpl.difficulty}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {tpl.title}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {tpl.subtitle}
                          </p>
                          <div className="p-2.5 rounded-lg bg-[var(--bg-primary)]/70 border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                            <strong className="text-[var(--accent-yellow)]">
                              Objetivo Pedagógico:{' '}
                            </strong>
                            {tpl.pedagogicalGoal}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              onInstantiateSqlAndOpenView({
                                title: `${tpl.dbName}.sql`,
                                dbName: tpl.dbName,
                                sql: tpl.ddlSql,
                                targetView: 'er-diagram',
                              })
                            }
                            className="py-1.5 px-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              account_tree
                            </span>
                            <span>Estúdio DER</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onInstantiateSqlAndOpenView({
                                title: `${tpl.dbName}.sql`,
                                dbName: tpl.dbName,
                                sql: tpl.ddlSql,
                                targetView: 'workspace',
                                enableSplitView: true,
                              })
                            }
                            className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] text-[#29B6F6]">
                              vertical_split
                            </span>
                            <span>SQL ↔ DER</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* ABA 3: DESAFIOS PRÁTICOS AUTOCORRIGÍVEIS                         */}
          {/* ================================================================ */}
          {activeTab === 'challenges' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { num: 0, label: 'Todas as Etapas' },
                  { num: 1, label: '1. Modelagem & DDL' },
                  { num: 2, label: '2. Normalização 1FN' },
                  { num: 3, label: '3. Consultas & Filtros' },
                  { num: 4, label: '4. Junções (JOIN)' },
                  { num: 5, label: '5. Agregações (GROUP BY)' },
                ].map((st) => (
                  <button
                    key={st.num}
                    type="button"
                    onClick={() => setStageFilter(st.num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      stageFilter === st.num
                        ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[var(--accent-yellow)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExercises.map((ex) => {
                  const prog = progressMap[ex.id];
                  const isDone = Boolean(prog);

                  return (
                    <div
                      key={ex.id}
                      className={`p-5 rounded-xl bg-[var(--bg-surface)] border transition-all flex flex-col justify-between space-y-4 ${
                        isDone
                          ? 'border-[var(--status-success)]/50'
                          : 'border-[var(--border-color)] hover:border-[#FF6B00]/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-mono font-bold text-[var(--accent-yellow)]">
                            {ex.stageLabel}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              {ex.difficulty}
                            </span>
                            {isDone && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--status-success)]/15 text-[var(--status-success)] text-[10px] font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">
                                  check_circle
                                </span>
                                Concluído
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                          {ex.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {ex.prompt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          Alvo: <strong className="text-[var(--text-primary)]">{ex.targetDatabase}</strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => onStartExercise(ex)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            play_arrow
                          </span>
                          <span>{isDone ? 'Refazer Desafio' : 'Praticar Agora'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================================================================ */}
          {/* ABA 4: MEUS MODELOS SALVOS PELO ALUNO                            */}
          {/* ================================================================ */}
          {activeTab === 'saved' && (
            <>
              {savedModels.length === 0 ? (
                <div className="max-w-3xl mx-auto my-8 p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center space-y-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
                    <span className="material-symbols-outlined text-[30px]">
                      bookmarks
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Seu Portfólio Local de Modelos DER está Pronto para Começar
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-xl mx-auto">
                      Salve snapshots dos seus diagramas com posições customizadas, faixas coloridas, áreas temáticas e notas de requisitos diretamente no navegador.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    {[
                      {
                        step: 'Passo 1',
                        title: 'Modele ou Clone',
                        desc: 'Escolha um Template 3FN nesta Galeria ou escreva CREATE TABLE no Laboratório SQL.',
                      },
                      {
                        step: 'Passo 2',
                        title: 'Organize o Estúdio DER',
                        desc: 'Adicione Áreas Temáticas, Notas Adesivas e personalize cores das entidades.',
                      },
                      {
                        step: 'Passo 3',
                        title: 'Clique em "Salvar"',
                        desc: 'Seus modelos aparecem aqui com miniatura vetorial e entram no Super-Backup (.sqleditor.json).',
                      },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className="p-3.5 rounded-xl bg-[var(--bg-primary)]/70 border border-[var(--border-color)] space-y-1"
                      >
                        <span className="text-[10px] font-mono font-bold text-[#FF6B00] uppercase">
                          {s.step}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {s.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedModels.map((rec) => {
                    const parsed = parseLiveSqlSchema(rec.ddlSql || '', {
                      inferImplicitForeignKeys: true,
                    });
                    return (
                      <div
                        key={rec.id}
                        className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00]/60 overflow-hidden flex flex-col shadow-sm"
                      >
                        <div className="h-40 border-b border-[var(--border-color)] relative overflow-hidden">
                          <ERThumbnailSvg
                            tables={parsed.tables}
                            relationships={parsed.relationships}
                            positions={rec.positions}
                            tableMeta={rec.tableMeta}
                            subjectAreas={rec.subjectAreas}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                {rec.title}
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleDeleteSavedModel(rec.id)}
                                title="Excluir modelo salvo"
                                className="text-[var(--text-muted)] hover:text-[var(--status-error)] cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                              {rec.description}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                              Salvo em {new Date(rec.updatedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onRestoreSavedDiagram(rec)}
                              className="py-1.5 px-2.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold cursor-pointer"
                            >
                              Abrir no DER
                            </button>
                            {rec.ddlSql && (
                              <button
                                type="button"
                                onClick={() =>
                                  onInstantiateSqlAndOpenView({
                                    title: `${rec.dbName || 'modelo'}.sql`,
                                    dbName: rec.dbName || 'meu_modelo_db',
                                    sql: rec.ddlSql!,
                                    targetView: 'workspace',
                                    enableSplitView: true,
                                  })
                                }
                                className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs font-semibold cursor-pointer"
                              >
                                SQL ↔ DER
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

