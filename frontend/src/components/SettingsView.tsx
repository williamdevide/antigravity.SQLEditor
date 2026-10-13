import React, { useState } from 'react';
import { dbEngine } from '../services/dbEngine';

interface SettingsViewProps {
  onResetDb: () => void;
  onRefreshSchemas: () => void;
  onImportSqlSuccess: (sql: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetDb,
  onRefreshSchemas,
  onImportSqlSuccess,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [hideDbo, setHideDbo] = useState<boolean>(() => dbEngine.isHidingSystemDatabases());

  const handleToggleHideDbo = () => {
    const newVal = !hideDbo;
    setHideDbo(newVal);
    dbEngine.setHideSystemDatabases(newVal);
    onRefreshSchemas();
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
    a.download = `sqleditor_backup_${Date.now()}.json`;
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
        if (file.name.endsWith('.json')) {
          await dbEngine.importJSON(content);
          setImportStatus('Backup JSON restaurado com sucesso!');
          onRefreshSchemas();
        } else {
          // SQL script
          onImportSqlSuccess(content);
          setImportStatus('Arquivo SQL carregado numa nova aba do editor!');
        }
      } catch (err: any) {
        setImportStatus(`Erro ao importar arquivo: ${err?.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] p-6 overflow-y-auto select-none transition-colors">
      <div className="pb-4 border-b border-[var(--border-color)] mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--accent-yellow)] text-[24px]">
            settings
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Configurações e Gerenciamento
          </h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Importação, exportação de esquemas, atalhos de teclado e persistência local no navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* Card 1: Backup e Exportação */}
        <div className="p-5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--accent-yellow)] font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <h3>Exportar Bancos de Dados</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Exporte todos os bancos, tabelas e registros criados para o seu computador.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportSQL}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-semibold rounded shadow-[0_0_12px_rgba(255,107,0,0.3)] transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>Exportar Dump SQL (.sql)</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium rounded transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">data_object</span>
              <span>Backup JSON (.json)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Importação e Restauração */}
        <div className="p-5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--status-success)] font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <h3>Importar Arquivo SQL / JSON</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Importe um script SQL existente ou restaure um arquivo de backup JSON salvo anteriormente.
          </p>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-medium rounded cursor-pointer transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-[var(--status-success)]">folder_open</span>
              <span>Selecionar Arquivo (.sql ou .json)</span>
              <input
                type="file"
                accept=".sql,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="text-xs font-mono text-[var(--accent-yellow)] bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-color)]">
              {importStatus}
            </div>
          )}
        </div>

        {/* Card 3: Restaurar Padrões */}
        <div className="p-5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#FF3366] font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            <h3>Restaurar Padrões / Limpar Dados</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Limpa o banco de dados IndexedDB local do navegador e restaura os bancos sementes originais (<code>ecommerce_db</code> e <code>universidade_db</code>).
          </p>

          <div className="pt-2">
            <button
              onClick={onResetDb}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FF3366]/15 hover:bg-[#FF3366] text-[#FF3366] hover:text-white border border-[#FF3366]/40 text-xs font-semibold rounded transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Restaurar Bancos Padrão</span>
            </button>
          </div>
        </div>

        {/* Card 4: Bancos de Dados do Sistema (dbo) */}
        <div className="p-5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--accent-yellow)] font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px]">visibility_off</span>
            <h3>Bancos de Dados do Sistema</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            O motor de banco interno (AlaSQL) cria por padrão um esquema chamado <code>dbo</code>. Ative esta opção para ocultá-lo da árvore de esquemas e da interface, mantendo o ambiente limpo para as aulas.
          </p>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-color)] hover:border-[#FF6B00]/40 transition-colors">
              <input
                type="checkbox"
                checked={hideDbo}
                onChange={handleToggleHideDbo}
                className="w-4 h-4 rounded border-[var(--border-color)] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs text-[var(--text-primary)] font-semibold">
                  Ocultar banco de dados interno (<code className="text-[#FF6B00] font-mono">dbo</code>)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {hideDbo ? 'Ativado: o banco dbo está oculto da navegação.' : 'Desativado: o banco dbo é exibido no Schema Explorer.'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Card 5: Atalhos de Teclado */}
        <div className="p-5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-4 font-mono text-xs shadow-sm">
          <div className="flex items-center gap-2 text-[var(--accent-yellow)] font-semibold text-sm font-sans">
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
            <h3>Atalhos Rápidos de Teclado</h3>
          </div>

          <div className="space-y-2 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Executar Script SQL</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-yellow)] font-bold">Ctrl + Enter</kbd>
            </div>
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Executar Trecho Selecionado</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-yellow)] font-bold">Alt + E</kbd>
            </div>
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Revisar Trecho</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-yellow)] font-bold">Alt + R</kbd>
            </div>
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Alterar Todas as Ocorrências</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-yellow)] font-bold">Ctrl + F2</kbd>
            </div>
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)]">Nova Aba de Script</span>
              <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-yellow)] font-bold">Ctrl + T / +</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Gerar SELECT da Tabela</span>
              <span className="text-[var(--status-success)] font-bold">Duplo clique no Explorer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
