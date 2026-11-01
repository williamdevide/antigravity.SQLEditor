import React, { useState } from 'react';
import type { VisualColumnDraft } from '../../services/visualDdlGenerator';
import {
  SQLEDITOR_CARD_PALETTE,
  type ERRelationshipEdge,
  type ERStickyNote,
  type ERSubjectArea,
  type ERTableNode,
  type SchemaLintIssue,
} from '../../types/erStudio';

type InspectorTabId = 'tables' | 'relations' | 'areas' | 'notes' | 'linter';

interface ERInspectorSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  subjectAreas: ERSubjectArea[];
  stickyNotes: ERStickyNote[];
  lintIssues: SchemaLintIssue[];
  selectedTable: string | null;
  onSelectTable: (tableName: string | null) => void;
  onCreateTable: (tableName: string, columns: VisualColumnDraft[]) => void;
  onAddColumn: (tableName: string, column: VisualColumnDraft) => void;
  onCreateForeignKey: (
    sourceTable: string,
    sourceColumn: string,
    targetTable: string,
    targetColumn: string
  ) => void;
  onAddSubjectArea: (title: string, color: string) => void;
  onUpdateSubjectArea: (id: string, patch: Partial<ERSubjectArea>) => void;
  onDeleteSubjectArea: (id: string) => void;
  onAddStickyNote: (title: string, content: string, color: string) => void;
  onDeleteStickyNote: (id: string) => void;
  onApplyLintFixSql?: (sql: string) => void;
}

const COMMON_SQL_TYPES = [
  'INT',
  'VARCHAR(120)',
  'VARCHAR(255)',
  'DECIMAL(10,2)',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'TEXT',
];

export const ERInspectorSidebar: React.FC<ERInspectorSidebarProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onTabChange,
  tables,
  relationships,
  subjectAreas,
  stickyNotes,
  lintIssues,
  selectedTable,
  onSelectTable,
  onCreateTable,
  onAddColumn,
  onCreateForeignKey,
  onAddSubjectArea,
  onUpdateSubjectArea,
  onDeleteSubjectArea,
  onAddStickyNote,
  onDeleteStickyNote,
  onApplyLintFixSql,
}) => {
  // Estados locais para formulários rápidos de modelagem visual
  const [showNewTableForm, setShowNewTableForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTablePkName, setNewTablePkName] = useState('id');
  const [newTableSecondCol, setNewTableSecondCol] = useState('nome');

  const [addingColToTable, setAddingColToTable] = useState<string | null>(null);
  const [colDraftName, setColDraftName] = useState('');
  const [colDraftType, setColDraftType] = useState('VARCHAR(120)');
  const [colDraftNotNull, setColDraftNotNull] = useState(true);
  const [colDraftUnique, setColDraftUnique] = useState(false);

  const [fkSourceTable, setFkSourceTable] = useState('');
  const [fkSourceCol, setFkSourceCol] = useState('');
  const [fkTargetTable, setFkTargetTable] = useState('');
  const [fkTargetCol, setFkTargetCol] = useState('');

  const [newAreaTitle, setNewAreaTitle] = useState('');
  const [newAreaColor, setNewAreaColor] = useState<string>(SQLEDITOR_CARD_PALETTE[0].hex);

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState<string>(SQLEDITOR_CARD_PALETTE[1].hex);

  const errorCount = lintIssues.filter((i) => i.severity === 'error').length;
  const warnCount = lintIssues.filter((i) => i.severity === 'warning').length;

  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTableName.trim();
    if (!clean) return;
    const cols: VisualColumnDraft[] = [
      {
        name: newTablePkName.trim() || 'id',
        type: 'INT',
        isPrimary: true,
        isNullable: false,
      },
    ];
    if (newTableSecondCol.trim()) {
      cols.push({
        name: newTableSecondCol.trim(),
        type: 'VARCHAR(120)',
        isNullable: false,
      });
    }
    onCreateTable(clean, cols);
    setNewTableName('');
    setShowNewTableForm(false);
  };

  const handleAddColumnSubmit = (tableName: string, e: React.FormEvent) => {
    e.preventDefault();
    const clean = colDraftName.trim();
    if (!clean) return;
    onAddColumn(tableName, {
      name: clean,
      type: colDraftType,
      isNullable: !colDraftNotNull,
      isUnique: colDraftUnique,
    });
    setColDraftName('');
    setColDraftUnique(false);
    setAddingColToTable(null);
  };

  const handleCreateFkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fkSourceTable || !fkSourceCol || !fkTargetTable || !fkTargetCol) return;
    onCreateForeignKey(fkSourceTable, fkSourceCol, fkTargetTable, fkTargetCol);
    setFkSourceCol('');
  };

  const selectedSourceTableObj = tables.find((t) => t.name === fkSourceTable);
  const selectedTargetTableObj = tables.find((t) => t.name === fkTargetTable);

  if (!isOpen) {
    return (
      <aside
        data-print-hide
        className="w-11 shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-3 gap-2 select-none z-20"
      >
        <button
          type="button"
          onClick={onToggleOpen}
          title="Abrir Inspetor do Estúdio DER"
          className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-yellow)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">dock_to_right</span>
        </button>

        {[
          { id: 'tables' as const, icon: 'table_chart', label: 'Tabelas' },
          { id: 'relations' as const, icon: 'conversion_path', label: 'Relacionamentos' },
          { id: 'areas' as const, icon: 'dashboard_customize', label: 'Áreas Temáticas' },
          { id: 'notes' as const, icon: 'sticky_note_2', label: 'Notas de Requisitos' },
          { id: 'linter' as const, icon: 'verified_user', label: 'Saúde & Normalização' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onTabChange(item.id);
              onToggleOpen();
            }}
            title={item.label}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              activeTab === item.id
                ? 'bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
            {item.id === 'linter' && lintIssues.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
                  errorCount > 0 ? 'bg-[var(--status-error)]' : 'bg-[#FF6B00]'
                }`}
              >
                {lintIssues.length}
              </span>
            )}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      data-print-hide
      className="w-80 shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col h-full select-none z-20"
    >
      {/* Cabeçalho do Inspetor */}
      <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#FF6B00] text-[18px]">
            design_services
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Inspetor DER
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          title="Recolher Inspetor"
          className="w-6 h-6 rounded hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>
      </div>

      {/* Navegação das 5 Abas do Estúdio */}
      <div className="grid grid-cols-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 p-1 gap-0.5">
        {[
          { id: 'tables' as const, icon: 'table_chart', label: 'Tabelas', count: tables.length },
          {
            id: 'relations' as const,
            icon: 'conversion_path',
            label: 'FKs',
            count: relationships.length,
          },
          {
            id: 'areas' as const,
            icon: 'dashboard_customize',
            label: 'Áreas',
            count: subjectAreas.length,
          },
          {
            id: 'notes' as const,
            icon: 'sticky_note_2',
            label: 'Notas',
            count: stickyNotes.length,
          },
          {
            id: 'linter' as const,
            icon: 'verified_user',
            label: 'Saúde',
            count: lintIssues.length,
          },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] border border-[var(--border-color)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                {t.id === 'linter' && t.count > 0 && (
                  <span
                    className={`ml-0.5 px-1 rounded-full text-[8px] font-bold text-white ${
                      errorCount > 0 ? 'bg-[var(--status-error)]' : 'bg-[#FF6B00]'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo Rolável da Aba Selecionada */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ABA 1: TABELAS & CRIAÇÃO VISUAL DDL */}
        {activeTab === 'tables' && (
          <>
            <button
              type="button"
              onClick={() => setShowNewTableForm((v) => !v)}
              className="w-full py-2 px-3 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showNewTableForm ? 'expand_less' : 'add_box'}
              </span>
              <span>Nova Tabela (Gera SQL)</span>
            </button>

            {showNewTableForm && (
              <form
                onSubmit={handleCreateTableSubmit}
                className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[#FF6B00]/40 space-y-2.5"
              >
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">
                    Nome da Entidade
                  </label>
                  <input
                    type="text"
                    required
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="ex: tb_fornecedores"
                    className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-muted)] mb-1">
                      Chave Primária (INT)
                    </label>
                    <input
                      type="text"
                      value={newTablePkName}
                      onChange={(e) => setNewTablePkName(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-muted)] mb-1">
                      2º Atributo Inicial
                    </label>
                    <input
                      type="text"
                      value={newTableSecondCol}
                      onChange={(e) => setNewTableSecondCol(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 rounded bg-[var(--status-success)]/20 hover:bg-[var(--status-success)]/30 border border-[var(--status-success)]/50 text-[var(--status-success)] text-xs font-bold cursor-pointer"
                >
                  Criar Entidade no Esquema
                </button>
              </form>
            )}

            {tables.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">
                Nenhuma tabela carregada no diagrama atual.
              </p>
            ) : (
              <div className="space-y-2">
                {tables.map((tbl) => {
                  const isSelected = selectedTable === tbl.name;
                  const isAddingCol = addingColToTable === tbl.name;
                  return (
                    <div
                      key={tbl.name}
                      className={`rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-[var(--bg-surface)] border-[#FF6B00]'
                          : 'bg-[var(--bg-surface)]/70 border-[var(--border-color)]'
                      }`}
                    >
                      <div
                        onClick={() => onSelectTable(isSelected ? null : tbl.name)}
                        className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] rounded-t-lg"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
                            table_rows
                          </span>
                          <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">
                            {tbl.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {tbl.columns.length} cols
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingColToTable(isAddingCol ? null : tbl.name);
                            }}
                            title="Adicionar coluna nesta tabela"
                            className="w-5 h-5 rounded bg-[var(--bg-secondary)] hover:bg-[#FF6B00] hover:text-white text-[var(--text-secondary)] flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">add</span>
                          </button>
                        </div>
                      </div>

                      {isAddingCol && (
                        <form
                          onSubmit={(e) => handleAddColumnSubmit(tbl.name, e)}
                          className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/60 space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              required
                              value={colDraftName}
                              onChange={(e) => setColDraftName(e.target.value)}
                              placeholder="nome_coluna"
                              className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                            />
                            <select
                              value={colDraftType}
                              onChange={(e) => setColDraftType(e.target.value)}
                              className="px-1.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                            >
                              {COMMON_SQL_TYPES.map((tp) => (
                                <option key={tp} value={tp}>
                                  {tp}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={colDraftNotNull}
                                onChange={(e) => setColDraftNotNull(e.target.checked)}
                              />
                              <span>NOT NULL</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={colDraftUnique}
                                onChange={(e) => setColDraftUnique(e.target.checked)}
                              />
                              <span>UNIQUE</span>
                            </label>
                            <button
                              type="submit"
                              className="px-2 py-1 rounded bg-[#FF6B00] text-white font-bold cursor-pointer"
                            >
                              Inserir
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ABA 2: RELACIONAMENTOS & CONEXÃO FK */}
        {activeTab === 'relations' && (
          <>
            <form
              onSubmit={handleCreateFkSubmit}
              className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-primary)]">
                  Conectar Chave Estrangeira (FK)
                </span>
                <span className="text-[9px] font-mono text-[var(--accent-yellow)]">
                  N ➔ 1
                </span>
              </div>

              <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                Dica: você também pode arrastar o pino laranja na borda direita de uma coluna diretamente até outra tabela no canvas!
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={fkSourceTable}
                  onChange={(e) => {
                    setFkSourceTable(e.target.value);
                    setFkSourceCol('');
                  }}
                  className="px-2 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                >
                  <option value="">Tabela Filha (FK)</option>
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={fkSourceCol}
                  onChange={(e) => setFkSourceCol(e.target.value)}
                  disabled={!selectedSourceTableObj}
                  className="px-2 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                >
                  <option value="">Coluna FK</option>
                  {selectedSourceTableObj?.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={fkTargetTable}
                  onChange={(e) => {
                    setFkTargetTable(e.target.value);
                    const tObj = tables.find((t) => t.name === e.target.value);
                    const pk = tObj?.columns.find((c) => c.isPrimary);
                    setFkTargetCol(pk?.name || '');
                  }}
                  className="px-2 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                >
                  <option value="">Tabela Pai (PK)</option>
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={fkTargetCol}
                  onChange={(e) => setFkTargetCol(e.target.value)}
                  disabled={!selectedTargetTableObj}
                  className="px-2 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-primary)]"
                >
                  <option value="">Coluna PK</option>
                  {selectedTargetTableObj?.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!fkSourceTable || !fkSourceCol || !fkTargetTable || !fkTargetCol}
                className="w-full py-1.5 rounded bg-[#FF6B00] disabled:opacity-40 hover:bg-[#FF8533] text-white text-xs font-bold cursor-pointer"
              >
                Criar Constraint FOREIGN KEY
              </button>
            </form>

            <div className="space-y-2">
              {relationships.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  Nenhum relacionamento identificado.
                </p>
              ) : (
                relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] truncate">
                        {rel.sourceTable}.{rel.sourceColumn}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          rel.isExplicit
                            ? 'bg-[var(--status-success)]/15 text-[var(--status-success)]'
                            : 'bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border border-dashed border-[var(--accent-yellow)]/50'
                        }`}
                      >
                        {rel.isExplicit ? 'Explícita' : 'Inferida'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                      <span>➔</span>
                      <span>
                        {rel.targetTable}.{rel.targetColumn} ({rel.cardinality})
                      </span>
                      {rel.isSelfJoin && (
                        <span className="px-1 rounded bg-[#29B6F6]/15 text-[#29B6F6] text-[9px]">
                          Auto-Relação
                        </span>
                      )}
                    </div>
                    {!rel.isExplicit && (
                      <button
                        type="button"
                        onClick={() =>
                          onCreateForeignKey(
                            rel.sourceTable,
                            rel.sourceColumn,
                            rel.targetTable,
                            rel.targetColumn
                          )
                        }
                        className="w-full mt-1 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[10px] font-semibold text-[var(--accent-yellow)] cursor-pointer"
                      >
                        + Formalizar FOREIGN KEY no SQL
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ABA 3: ÁREAS TEMÁTICAS (SUBJECT AREAS) */}
        {activeTab === 'areas' && (
          <>
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2.5">
              <span className="block text-xs font-bold text-[var(--text-primary)]">
                Nova Área Temática (Domínio)
              </span>
              <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                Agrupe tabelas por módulo (ex: Comercial, Financeiro, Acadêmico). Ao arrastar a área, as tabelas contidas movem-se juntas!
              </p>
              <input
                type="text"
                value={newAreaTitle}
                onChange={(e) => setNewAreaTitle(e.target.value)}
                placeholder="Ex: Módulo Faturamento"
                className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              />
              <div className="flex items-center gap-1.5">
                {SQLEDITOR_CARD_PALETTE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewAreaColor(c.hex)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full cursor-pointer border-2 ${
                      newAreaColor === c.hex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-75'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddSubjectArea(
                    newAreaTitle.trim() || `Domínio ${subjectAreas.length + 1}`,
                    newAreaColor
                  );
                  setNewAreaTitle('');
                }}
                className="w-full py-1.5 rounded bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold cursor-pointer"
              >
                + Adicionar Área no Canvas
              </button>
            </div>

            <div className="space-y-2">
              {subjectAreas.map((area) => (
                <div
                  key={area.id}
                  className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: area.color }}
                    />
                    <input
                      type="text"
                      value={area.title}
                      onChange={(e) =>
                        onUpdateSubjectArea(area.id, { title: e.target.value })
                      }
                      className="bg-transparent text-xs font-semibold text-[var(--text-primary)] focus:outline-none w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteSubjectArea(area.id)}
                    title="Remover Área"
                    className="text-[var(--text-muted)] hover:text-[var(--status-error)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ABA 4: NOTAS ADESIVAS DE REQUISITOS */}
        {activeTab === 'notes' && (
          <>
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
              <span className="block text-xs font-bold text-[var(--text-primary)]">
                Nova Nota de Requisito / Regra
              </span>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Título (ex: Regra RN-01)"
                className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
              />
              <textarea
                rows={3}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Descreva a regra de negócio, cardinalidade mínima ou observação de aula..."
                className="w-full px-2.5 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] resize-none"
              />
              <div className="flex items-center gap-1.5">
                {SQLEDITOR_CARD_PALETTE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewNoteColor(c.hex)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full cursor-pointer border-2 ${
                      newNoteColor === c.hex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-75'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddStickyNote(
                    newNoteTitle.trim() || `Requisito #${stickyNotes.length + 1}`,
                    newNoteContent.trim() || 'Anote aqui a regra de negócio do modelo.',
                    newNoteColor
                  );
                  setNewNoteTitle('');
                  setNewNoteContent('');
                }}
                className="w-full py-1.5 rounded bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold cursor-pointer"
              >
                + Fixar Post-it no Canvas
              </button>
            </div>

            <div className="space-y-2">
              {stickyNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {note.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">
                      {note.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteStickyNote(note.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--status-error)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ABA 5: LINTER PEDAGÓGICO DE ESQUEMA & NORMALIZAÇÃO (PT-BR) */}
        {activeTab === 'linter' && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Auditoria de Esquema
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  Integridade PK/FK, Ciclos &amp; 1FN–3FN
                </div>
              </div>
              {lintIssues.length === 0 ? (
                <span className="px-2 py-1 rounded-full bg-[var(--status-success)]/15 text-[var(--status-success)] text-[10px] font-bold">
                  100% Íntegro
                </span>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                  {errorCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--status-error)]/15 text-[var(--status-error)]">
                      {errorCount} erro(s)
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#FF6B00]/15 text-[#FF6B00]">
                      {warnCount} alerta(s)
                    </span>
                  )}
                </div>
              )}
            </div>

            {lintIssues.length === 0 ? (
              <div className="p-4 rounded-lg bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 text-center space-y-1">
                <span className="material-symbols-outlined text-[24px] text-[var(--status-success)]">
                  task_alt
                </span>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Parabéns! Nenhuma anomalia estrutural detectada.
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Todas as entidades possuem chave primária válida e relacionamentos consistentes.
                </p>
              </div>
            ) : (
              lintIssues.map((issue) => {
                const badgeColor =
                  issue.severity === 'error'
                    ? 'border-[var(--status-error)]/40 bg-[var(--status-error)]/10 text-[var(--status-error)]'
                    : issue.severity === 'warning'
                    ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-[#29B6F6]/40 bg-[#29B6F6]/10 text-[#29B6F6]';

                return (
                  <div
                    key={issue.id}
                    onClick={() => issue.tableName && onSelectTable(issue.tableName)}
                    className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#FF6B00]/50 space-y-1.5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                        {issue.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${badgeColor}`}
                      >
                        {issue.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {issue.message}
                    </p>
                    <div className="p-2 rounded bg-[var(--bg-primary)]/70 border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] leading-relaxed">
                      <strong className="text-[var(--accent-yellow)]">Conceito de Aula: </strong>
                      {issue.pedagogicalTip}
                    </div>
                    {issue.suggestedFixSql && onApplyLintFixSql && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyLintFixSql(issue.suggestedFixSql!);
                        }}
                        className="w-full mt-1 py-1.5 px-2 rounded bg-[#FF6B00]/15 hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white border border-[#FF6B00]/40 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Aplicar Correção SQL Automaticamente
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

