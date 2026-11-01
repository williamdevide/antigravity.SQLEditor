import React, { useState } from 'react';
import { dbEngine } from '../services/dbEngine';
import {
  THEME_OPTIONS,
  FONT_THEME_OPTIONS,
  type ThemeMode,
  type FontTheme,
  type DataPreviewLimit,
} from '../types';
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  type ERCardinalityNotation,
  type ERGridMode,
} from '../types/preferences';
import {
  exportSuperBackupJson,
  importSuperBackupJson,
  type SuperBackupRestoreSummary,
} from '../services/preferencesStorage';

interface SettingsViewProps {
  onResetDb: () => void;
  onRefreshSchemas: () => void;
  onImportSqlSuccess: (sql: string) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  fontTheme: FontTheme;
  onFontThemeChange: (fontTheme: FontTheme) => void;
  preferences?: AppPreferences;
  onUpdatePreferences?: (next: AppPreferences) => void;
  onRestoreSuperBackup?: (summary: SuperBackupRestoreSummary) => Promise<void> | void;
}

type PillarId = 'all' | 'ui' | 'editor' | 'er' | 'pedagogy';

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetDb,
  onRefreshSchemas,
  onImportSqlSuccess,
  theme,
  onThemeChange,
  fontTheme,
  onFontThemeChange,
  preferences = DEFAULT_APP_PREFERENCES,
  onUpdatePreferences,
  onRestoreSuperBackup,
}) => {
  const [activePillar, setActivePillar] = useState<PillarId>('all');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(true);
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);
  const [hideDbo, setHideDbo] = useState<boolean>(() => dbEngine.isHidingSystemDatabases());

  const currentPrefs = preferences;

  const updatePrefs = (updater: (prev: AppPreferences) => AppPreferences) => {
    if (onUpdatePreferences) {
      const next = updater(currentPrefs);
      onUpdatePreferences(next);
    }
  };

  const handleToggleHideDbo = () => {
    const newVal = !hideDbo;
    setHideDbo(newVal);
    dbEngine.setHideSystemDatabases(newVal);
    onRefreshSchemas();
  };

  const handleExportSuperBackup = async () => {
    setIsExportingBackup(true);
    try {
      const jsonStr = await exportSuperBackupJson({
        theme,
        fontTheme,
        preferences: currentPrefs,
      });
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sqleditor_backup_completo_${Date.now()}.sqleditor.json`;
      a.click();
      URL.revokeObjectURL(url);
      setImportStatus('Super-Backup (.sqleditor.json) gerado e baixado com sucesso!');
      setImportSuccess(true);
    } catch (err: any) {
      setImportStatus(`Erro ao exportar Super-Backup: ${err?.message || err}`);
      setImportSuccess(false);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExportSQL = async () => {
    const sql = await dbEngine.exportSQL();
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqleditor_dump_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const json = await dbEngine.exportJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sqleditor_bancos_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      try {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.sqleditor.json') || (lowerName.endsWith('.json') && content.includes('"kind":"sqleditor-super-backup"'))) {
          // Super-Backup Portátil Completo
          const summary = await importSuperBackupJson(content);
          if (onRestoreSuperBackup) {
            await onRestoreSuperBackup(summary);
          } else {
            if (summary.restoredTheme) onThemeChange(summary.restoredTheme);
            if (summary.restoredFontTheme) onFontThemeChange(summary.restoredFontTheme);
            if (onUpdatePreferences) onUpdatePreferences(summary.restoredPreferences);
            await onRefreshSchemas();
          }
          setImportStatus(
            `Super-Backup restaurado com sucesso! (${summary.databasesCount} bancos, ${summary.diagramsCount} modelos DER, ${summary.dictionariesCount} dicionários, ${summary.exercisesCount} desafios).`
          );
          setImportSuccess(true);
        } else if (lowerName.endsWith('.json')) {
          // Backup Legado JSON de bancos AlaSQL
          await dbEngine.importJSON(content);
          setImportStatus('Backup JSON de bancos restaurado com sucesso!');
          setImportSuccess(true);
          onRefreshSchemas();
        } else {
          // Script SQL
          onImportSqlSuccess(content);
          setImportStatus(`Arquivo SQL (${file.name}) carregado em uma nova aba do laboratório!`);
          setImportSuccess(true);
        }
      } catch (err: any) {
        setImportStatus(`Erro ao importar arquivo: ${err?.message || err}`);
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetPreferencesToDefault = () => {
    if (window.confirm('Deseja restaurar todas as preferências para os valores padrão de fábrica?')) {
      if (onUpdatePreferences) {
        onUpdatePreferences(DEFAULT_APP_PREFERENCES);
      }
      setImportStatus('Preferências restauradas para os padrões de fábrica.');
      setImportSuccess(true);
    }
  };

  const showPillar = (id: PillarId) => activePillar === 'all' || activePillar === id;

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] p-6 overflow-y-auto select-none transition-colors">
      {/* Cabeçalho da Central de Configurações */}
      <div className="pb-4 border-b border-[var(--border-color)] mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[26px]">
              tune
            </span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Central de Configurações & Preferências
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30 text-[10px] font-mono font-bold">
              4 Pilares • v3.2
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Personalize a interface, tipografia, automações do editor Monaco, renderização 90° do Estúdio DER, linter pedagógico e gerencie o Super-Backup Portátil (.sqleditor.json).
          </p>
        </div>

        {/* Botão de Restauração de Preferências */}
        <button
          type="button"
          onClick={handleResetPreferencesToDefault}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Restaura todos os 4 pilares de configurações para o padrão"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Restaurar Preferências Padrão</span>
        </button>
      </div>

      {/* Barra de Filtro dos 4 Pilares */}
      <div className="flex flex-wrap items-center gap-1.5 mb-6 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] w-fit">
        <button
          type="button"
          onClick={() => setActivePillar('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activePillar === 'all'
              ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] shadow-sm border border-[var(--accent-yellow)]/40'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Todos os Pilares
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('ui')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activePillar === 'ui'
              ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] shadow-sm border border-[var(--accent-yellow)]/40'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-[var(--accent-orange)]">palette</span>
          <span>1. Interface & Tipografia</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('editor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activePillar === 'editor'
              ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] shadow-sm border border-[var(--accent-yellow)]/40'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">terminal</span>
          <span>2. Editor SQL & Automações</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('er')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activePillar === 'er'
              ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] shadow-sm border border-[var(--accent-yellow)]/40'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-[#29B6F6]">schema</span>
          <span>3. Estúdio DER & Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePillar('pedagogy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activePillar === 'pedagogy'
              ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] shadow-sm border border-[var(--accent-yellow)]/40'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-[#00E676]">verified</span>
          <span>4. Linter & Super-Backup</span>
        </button>
      </div>

      {/* Banner de Feedback de Importação / Ações */}
      {importStatus && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            importSuccess
              ? 'bg-[#00E676]/10 text-[var(--status-success)] border-[#00E676]/30'
              : 'bg-[#FF3366]/10 text-[var(--status-error)] border-[#FF3366]/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {importSuccess ? 'check_circle' : 'error'}
            </span>
            <span>{importStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportStatus(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-8 max-w-5xl">
        {/* ==================================================================== */}
        {/* PILAR 1: INTERFACE, TIPOGRAFIA & MODO LEVE LABORATÓRIO               */}
        {/* ==================================================================== */}
        {showPillar('ui') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-yellow)] border-b border-[var(--border-color)]/60 pb-2">
              <span className="material-symbols-outlined text-[22px]">palette</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Pilar 1 — Interface, Tipografia & Modo Leve
              </h3>
            </div>

            {/* Cores do Tema */}
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-orange)]">contrast</span>
                    Cores do Tema (Interface & Ambiente)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Modo escuro profissional, modos claros confortáveis para projetores de sala de aula e modo Grafite suave.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)]">
                  Ativo: <strong className="text-[var(--accent-yellow)]">{THEME_OPTIONS.find(t => t.id === theme)?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {THEME_OPTIONS.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      type="button"
                      className={`p-3.5 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between relative group ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[var(--bg-surface)] shadow-[0_0_12px_rgba(255,107,0,0.25)] ring-1 ring-[#FF6B00]'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)]/60 hover:bg-[var(--bg-surface)] hover:border-[var(--accent-yellow)]/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shadow-inner"
                              style={{ backgroundColor: t.bgPreview }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shadow-inner -ml-2.5"
                              style={{ backgroundColor: t.surfacePreview }}
                            />
                          </div>
                          {isSelected ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B00] text-white">
                              ✓ Ativo
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                              Selecionar
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                          {t.name}
                        </h5>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cores das Letras (Tipografia de Destaque) */}
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--accent-yellow)]">format_color_text</span>
                    Cores das Letras (Acentos de Destaque)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Realce de sintaxe SQL no Monaco e cores de acento nos badges e guias.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)]">
                  Ativo: <strong className="text-[var(--accent-yellow)]">{FONT_THEME_OPTIONS.find(f => f.id === fontTheme)?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {FONT_THEME_OPTIONS.map((f) => {
                  const isSelected = fontTheme === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => onFontThemeChange(f.id)}
                      type="button"
                      className={`p-3.5 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between relative group ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[var(--bg-surface)] shadow-[0_0_12px_rgba(255,107,0,0.25)] ring-1 ring-[#FF6B00]'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)]/60 hover:bg-[var(--bg-surface)] hover:border-[var(--accent-yellow)]/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shadow-md"
                              style={{ backgroundColor: f.accentPreview }}
                            />
                            <div
                              className="w-4 h-4 rounded-full border border-black/20 shadow-md -ml-2.5"
                              style={{ backgroundColor: f.secondaryPreview }}
                            />
                          </div>
                          {isSelected ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF6B00] text-white">
                              ✓ Ativo
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                              Selecionar
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                          {f.name}
                        </h5>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {f.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders e Toggles de UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tamanho da Fonte do Editor */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">text_fields</span>
                    Tamanho Base da Fonte do Editor
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--accent-yellow)]">
                    {currentPrefs.ui.editorFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="22"
                  step="1"
                  value={currentPrefs.ui.editorFontSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updatePrefs((p) => ({ ...p, ui: { ...p.ui, editorFontSize: val } }));
                  }}
                  className="w-full accent-[#FF6B00] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>12px (Compacto)</span>
                  <span>14px (Padrão)</span>
                  <span>22px (Projetor/Acessível)</span>
                </div>
              </div>

              {/* Zoom Inicial Padrão do Canvas DER */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">zoom_in</span>
                    Zoom Inicial Padrão do Estúdio DER
                  </span>
                  <span className="text-xs font-mono font-bold text-[#29B6F6]">
                    {currentPrefs.ui.defaultErZoom}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="150"
                  step="5"
                  value={currentPrefs.ui.defaultErZoom}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updatePrefs((p) => ({ ...p, ui: { ...p.ui, defaultErZoom: val } }));
                  }}
                  className="w-full accent-[#29B6F6] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>60% (Visão Geral)</span>
                  <span>100% (Padrão)</span>
                  <span>150% (Detalhado)</span>
                </div>
              </div>

              {/* Toggle: Pills Rápidas no Cabeçalho */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.ui.showQuickModulePills}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, ui: { ...p.ui, showQuickModulePills: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Exibir Pills Rápidas no Cabeçalho
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Barra de atalhos diretos para Galeria, Dicionário, Estúdio DER e Laboratório SQL no topo da tela.
                  </p>
                </div>
              </label>

              {/* Toggle: Modo Leve para Laboratório */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.ui.reducedMotionAndGlow}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, ui: { ...p.ui, reducedMotionAndGlow: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Modo Leve para Laboratório (Lab Mode)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00E676]/15 text-[var(--status-success)]">
                      60 FPS
                    </span>
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Desativa filtros blur pesados e animações contínuas, garantindo fluidez máxima em computadores modestos de sala de aula.
                  </p>
                </div>
              </label>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* PILAR 2: EDITOR SQL & AUTOMAÇÕES                                     */}
        {/* ==================================================================== */}
        {showPillar('editor') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-yellow)] border-b border-[var(--border-color)]/60 pb-2">
              <span className="material-symbols-outlined text-[22px]">terminal</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Pilar 2 — Editor SQL & Automações
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto-capitalizar palavras-chave */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.editor.autoUppercaseKeywords}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, editor: { ...p.editor, autoUppercaseKeywords: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Auto-capitalizar Palavras-Chave SQL
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Converte automaticamente palavras-chave para MAIÚSCULAS ao digitar espaço/Enter (ex: <code>select</code> ➔ <code>SELECT</code>).
                  </p>
                </div>
              </label>

              {/* Inserção de ponto e vírgula */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.editor.autoInsertSemicolon}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, editor: { ...p.editor, autoInsertSemicolon: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Auto-inserir Ponto e Vírgula (;)
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Se o comando anterior não foi finalizado com <code>;</code>, insere automaticamente ao iniciar novo comando sem quebrar subqueries.
                  </p>
                </div>
              </label>

              {/* Sincronização de Banco com USE */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.editor.syncDatabaseWithCursorUse}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, editor: { ...p.editor, syncDatabaseWithCursorUse: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Sincronizar Banco Ativo com Bloco USE
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Atualiza o banco de dados ativo do editor e do Schema Explorer ao mover o cursor entre diferentes blocos <code>USE banco;</code>.
                  </p>
                </div>
              </label>

              {/* Confirmação antes de Limpar */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.editor.confirmBeforeClear}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, editor: { ...p.editor, confirmBeforeClear: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Confirmar Antes de Limpar Script
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Evita perdas acidentais solicitando confirmação ao clicar no botão &quot;Limpar&quot; do editor (mantendo suporte a Ctrl+Z).
                  </p>
                </div>
              </label>

              {/* Confirmação antes de Fechar Todas */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.editor.confirmBeforeCloseAllTabs}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, editor: { ...p.editor, confirmBeforeCloseAllTabs: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Confirmar Antes de Fechar Todas as Abas
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Solicita confirmação preventiva antes de fechar todas as abas de scripts abertas na sessão.
                  </p>
                </div>
              </label>

              {/* Limite Padrão na Aba Dados */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Limite Inicial Padrão na Aba Dados
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent-yellow)]">
                    {currentPrefs.editor.defaultDataPreviewLimit === null ? 'Total' : `Limit ${currentPrefs.editor.defaultDataPreviewLimit}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 100, null].map((limitVal) => {
                    const isSel = currentPrefs.editor.defaultDataPreviewLimit === (limitVal as DataPreviewLimit);
                    const label = limitVal === null ? 'Total' : `Limit ${limitVal}`;
                    return (
                      <button
                        key={String(limitVal)}
                        type="button"
                        onClick={() => {
                          updatePrefs((p) => ({
                            ...p,
                            editor: { ...p.editor, defaultDataPreviewLimit: limitVal as DataPreviewLimit },
                          }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                          isSel
                            ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Alterne a qualquer momento clicando no botão de limite na própria aba Dados.
                </p>
              </div>

              {/* Proporção Padrão do Split-View */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Proporção do Split-View (SQL ↔ DER)
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#FF6B00]">
                    {currentPrefs.editor.defaultSplitRatio}% Editor / {100 - currentPrefs.editor.defaultSplitRatio}% DER
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([50, 60] as const).map((ratio) => {
                    const isSel = currentPrefs.editor.defaultSplitRatio === ratio;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => {
                          updatePrefs((p) => ({
                            ...p,
                            editor: { ...p.editor, defaultSplitRatio: ratio },
                          }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                          isSel
                            ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ratio}% / {100 - ratio}%
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Determina a divisão horizontal padrão ao acionar o modo <strong>SQL ↔ DER</strong>.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* PILAR 3: ESTÚDIO DER & CANVAS DE MODELAGEM                           */}
        {/* ==================================================================== */}
        {showPillar('er') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-yellow)] border-b border-[var(--border-color)]/60 pb-2">
              <span className="material-symbols-outlined text-[22px]">schema</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Pilar 3 — Estúdio DER & Canvas de Modelagem
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estilo das Linhas de Relacionamento */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Geometria das Linhas de Relacionamento
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#FF8533]">
                    {currentPrefs.er.lineStyle === 'orthogonal' ? 'Ortogonal 90°' : 'Bézier'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, er: { ...p.er, lineStyle: 'orthogonal' } }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border text-left transition-colors ${
                      currentPrefs.er.lineStyle === 'orthogonal'
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    <div className="font-bold">Ortogonal 90°</div>
                    <div className="text-[10px] opacity-80 font-normal">Padrão autoral arredondado</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, er: { ...p.er, lineStyle: 'bezier' } }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border text-left transition-colors ${
                      currentPrefs.er.lineStyle === 'bezier'
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    <div className="font-bold">Curva Bézier</div>
                    <div className="text-[10px] opacity-80 font-normal">Fluida estilo LiveSchema</div>
                  </button>
                </div>
              </div>

              {/* Notação de Cardinalidade */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Notação de Cardinalidade
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#29B6F6]">
                    {currentPrefs.er.cardinalityNotation}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['crowsfoot', '1:N', 'pins'] as const).map((not) => {
                    const isSel = currentPrefs.er.cardinalityNotation === not;
                    const labels: Record<ERCardinalityNotation, string> = {
                      crowsfoot: "Pé-de-Galinha",
                      '1:N': "1 : N Clássico",
                      pins: "Pinos Vetoriais",
                    };
                    return (
                      <button
                        key={not}
                        type="button"
                        onClick={() => {
                          updatePrefs((p) => ({ ...p, er: { ...p.er, cardinalityNotation: not } }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                          isSel
                            ? 'bg-[#29B6F6] text-[#0F1117] border-[#29B6F6] font-extrabold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {labels[not]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibilidade das Etiquetas de Relacionamento */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Etiquetas de Relacionamento nas Linhas
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent-yellow)]">
                    {currentPrefs.er.labelVisibility === 'hover' ? 'Sob Demanda' : 'Sempre Visíveis'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, er: { ...p.er, labelVisibility: 'hover' } }));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                      currentPrefs.er.labelVisibility === 'hover'
                        ? 'bg-[var(--accent-yellow)] text-black border-[var(--accent-yellow)] font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    Sob Demanda (Hover / Foco)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, er: { ...p.er, labelVisibility: 'always' } }));
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                      currentPrefs.er.labelVisibility === 'always'
                        ? 'bg-[var(--accent-yellow)] text-black border-[var(--accent-yellow)] font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    Sempre Visíveis
                  </button>
                </div>
              </div>

              {/* Estilo da Grade do Canvas */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Malha de Fundo do Canvas
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
                    {currentPrefs.er.gridMode}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['dots', 'lines', 'none'] as const).map((gMode) => {
                    const isSel = currentPrefs.er.gridMode === gMode;
                    const labels: Record<ERGridMode, string> = {
                      dots: 'Pontos',
                      lines: 'Linhas',
                      none: 'Oculta',
                    };
                    return (
                      <button
                        key={gMode}
                        type="button"
                        onClick={() => {
                          updatePrefs((p) => ({ ...p, er: { ...p.er, gridMode: gMode } }));
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                          isSel
                            ? 'bg-[#FF6B00] text-white border-[#FF6B00] font-bold'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                        }`}
                      >
                        {labels[gMode]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle: Fluxo Laser Animado */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.er.animateLaserFlow}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, er: { ...p.er, animateLaserFlow: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Fluxo Laser Animado nas Linhas
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Exibe um pulso pontilhado animado na direção FK ➔ PK para facilitar a visualização da dependência de chaves em aula.
                  </p>
                </div>
              </label>

              {/* Toggle: Imã de Grade Snap to Grid */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.er.snapToGrid}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, er: { ...p.er, snapToGrid: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Alinhar à Grade ao Arrastar (Snap 24px)
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Arredonda automaticamente as posições X e Y dos cartões de tabelas para múltiplos de 24px mantendo diagramas organizados.
                  </p>
                </div>
              </label>

              {/* Toggle: Inferir Chaves Estrangeiras Implícitas */}
              <label className="col-span-1 md:col-span-2 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={currentPrefs.er.inferImplicitForeignKeys}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updatePrefs((p) => ({ ...p, er: { ...p.er, inferImplicitForeignKeys: checked } }));
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Inferir Chaves Estrangeiras Implícitas</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFE600]/15 text-[var(--accent-yellow)]">
                      Pedagógico
                    </span>
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Detecta campos de nomenclatura convencional (<code>id_cliente</code>, <code>cliente_id</code>) mesmo quando a constraint <code>FOREIGN KEY</code> explícita ainda não foi criada pelo aluno, traçando linhas tracejadas com aviso de sugestão.
                  </p>
                </div>
              </label>
            </div>
          </section>
        )}

        {/* ==================================================================== */}
        {/* PILAR 4: RIGOR PEDAGÓGICO, SISTEMA & SUPER-BACKUP                    */}
        {/* ==================================================================== */}
        {showPillar('pedagogy') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-yellow)] border-b border-[var(--border-color)]/60 pb-2">
              <span className="material-symbols-outlined text-[22px]">verified</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Pilar 4 — Rigor Pedagógico, Sistema & Super-Backup (.sqleditor.json)
              </h3>
            </div>

            {/* Rigor do Linter & Ocultar dbo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Rigor do Linter Pedagógico de Esquemas
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#00E676]">
                    {currentPrefs.pedagogy.linterStrictness === 'strict' ? 'Estrito Acadêmico' : 'Flexível'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, pedagogy: { ...p.pedagogy, linterStrictness: 'strict' } }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border text-left transition-colors ${
                      currentPrefs.pedagogy.linterStrictness === 'strict'
                        ? 'bg-[#00E676] text-[#0F1117] border-[#00E676] font-extrabold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    <div className="font-bold">Estrito Acadêmico</div>
                    <div className="text-[10px] opacity-80 font-normal">Exige PKs e aponta violações 1FN-3FN</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updatePrefs((p) => ({ ...p, pedagogy: { ...p.pedagogy, linterStrictness: 'flexible' } }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border text-left transition-colors ${
                      currentPrefs.pedagogy.linterStrictness === 'flexible'
                        ? 'bg-[#00E676] text-[#0F1117] border-[#00E676] font-extrabold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    <div className="font-bold">Flexível</div>
                    <div className="text-[10px] opacity-80 font-normal">Suprime avisos leves em protótipos</div>
                  </button>
                </div>
              </div>

              {/* Ocultar dbo */}
              <label className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3 cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={hideDbo}
                  onChange={handleToggleHideDbo}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Ocultar Banco de Dados Interno (dbo)
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Oculta o esquema interno do AlaSQL no Schema Explorer para evitar poluição visual em aulas.
                  </p>
                </div>
              </label>
            </div>

            {/* SUPER-BACKUP PORTÁTIL (.sqleditor.json) */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-secondary)] border-2 border-[#FF6B00]/50 space-y-4 shadow-lg shadow-[#FF6B00]/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-[#FF6B00]">
                    cloud_sync
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      Super-Backup Portátil do Aluno (.sqleditor.json)
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Empacota 100% do seu ambiente: bancos de dados, registros, scripts abertos, diagramas DER, notas, dicionários 1FN–3FN e progresso nos desafios.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40 text-xs font-mono font-bold">
                  Offline-First & Portátil
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-color)]/60">
                <button
                  type="button"
                  onClick={handleExportSuperBackup}
                  disabled={isExportingBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold rounded-lg shadow-md shadow-[#FF6B00]/30 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>{isExportingBackup ? 'Empacotando...' : 'Exportar Super-Backup (.sqleditor.json)'}</span>
                </button>

                <label className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[17px] text-[var(--status-success)]">upload</span>
                  <span>Restaurar .sqleditor.json / .sql / .json</span>
                  <input
                    type="file"
                    accept=".sqleditor.json,.json,.sql"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Exportações e Restaurações Clássicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-xs">
                  <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">description</span>
                  <span>Exportações Clássicas</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Baixe cópias simples em SQL para outros SGDBs ou arquivo JSON para AlaSQL legado.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleExportSQL}
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer"
                  >
                    Dump SQL (.sql)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer"
                  >
                    AlaSQL JSON (.json)
                  </button>
                </div>
              </div>

              {/* Resetar Bancos de Dados */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[#FF3366]/30 space-y-3">
                <div className="flex items-center gap-2 text-[#FF3366] font-bold text-xs">
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Restaurar Bancos Padrão</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Restaura o banco local do navegador para o estado inicial original do preset selecionado.
                </p>
                <button
                  onClick={onResetDb}
                  type="button"
                  className="px-3.5 py-1.5 rounded-lg bg-[#FF3366]/15 hover:bg-[#FF3366] text-[#FF3366] hover:text-white border border-[#FF3366]/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  Restaurar Bancos Padrão
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
