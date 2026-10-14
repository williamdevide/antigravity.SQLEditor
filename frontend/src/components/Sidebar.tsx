import React, { useState } from 'react';
import { ZoomControl } from './ZoomControl';
import type { DatabaseSchema, ContextMenuTarget } from '../types';

interface SidebarProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  onSelectDatabase: (dbName: string) => void;
  onCreateDatabase: (dbName: string) => void;
  onRefreshSchemas: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onContextMenu: (target: ContextMenuTarget) => void;
  onTableDoubleClick: (dbName: string, tableName: string) => void;
  selectedTable?: { dbName: string; tableName: string } | null;
  onSelectTable?: (dbName: string, tableName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  schemas,
  activeDatabase,
  onSelectDatabase,
  onCreateDatabase,
  onRefreshSchemas,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onContextMenu,
  onTableDoubleClick,
  selectedTable,
  onSelectTable,
}) => {
  const [filterText, setFilterText] = useState('');
  const [collapsedDbs, setCollapsedDbs] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [newDbName, setNewDbName] = useState('');

  const toggleDb = (dbName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedDbs(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  const toggleTable = (key: string) => {
    setExpandedTables(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateDbSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newDbName.trim().replace(/[`'";\s]/g, '_');
    if (clean) {
      onCreateDatabase(clean);
      setNewDbName('');
      setIsCreatingDb(false);
    }
  };

  const filteredSchemas = schemas.map(db => {
    const term = filterText.toLowerCase().trim();
    if (!term) return db;

    const matchesDb = db.name.toLowerCase().includes(term);
    const matchingTables = db.tables.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.columns.some(c => c.name.toLowerCase().includes(term))
    );

    if (matchesDb) return db;
    return { ...db, tables: matchingTables };
  }).filter(db => db.tables.length > 0 || db.name.toLowerCase().includes(filterText.toLowerCase().trim()));

  const totalDbs = schemas.length;
  const totalTables = schemas.reduce((acc, db) => acc + db.tables.length, 0);

  const zoomScale = zoomLevel / 100;

  return (
    <aside
      className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] flex flex-col h-full select-none transition-colors"
    >
      {/* Topo do Schema Explorer */}
      <div
        className="h-9 px-3 bg-[var(--bg-surface)] flex items-center justify-between border-b border-[var(--border-color)] shrink-0 cursor-context-menu select-none hover:bg-[var(--bg-hover)]/30 transition-colors"
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu({
            type: 'schema_explorer',
            x: e.clientX,
            y: e.clientY,
          });
        }}
        title="Clique com botão direito para alternar bancos (Vazio, Exemplos, BDs Aula)"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="material-symbols-outlined text-[15px] text-[var(--accent-yellow)]">
            account_tree
          </span>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-primary)] truncate">
            Schema Explorer
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ZoomControl
            level={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onZoomReset}
          />
          <button
            onClick={onRefreshSchemas}
            title="Recarregar Metadados dos Bancos"
            className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[13px]">refresh</span>
          </button>
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onContextMenu({
                type: 'schema_explorer',
                x: rect.left,
                y: rect.bottom + 4,
              });
            }}
            title="Opções de Banco de Dados (Carregar vazio, Exemplos, BDs Aula)"
            className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] hover:bg-[var(--bg-hover)] rounded transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">more_vert</span>
          </button>
        </div>
      </div>

      {/* Busca / Filtro */}
      <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center bg-[var(--bg-primary)] px-2 py-1 rounded border border-[var(--border-color)] focus-within:border-[#FF6B00] transition-colors">
          <span className="material-symbols-outlined text-[14px] text-[var(--text-muted)] mr-1.5">
            filter_alt
          </span>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrar tabelas e schemas..."
            className="bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs focus:outline-none w-full font-sans"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[12px] font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Formulário Inline de Criar Banco (quando ativo) */}
      {isCreatingDb && (
        <form onSubmit={handleCreateDbSubmit} className="p-2 bg-[var(--bg-surface)] border-b border-[var(--border-color)] shrink-0">
          <label className="block text-[11px] font-medium text-[var(--accent-yellow)] mb-1 font-mono">
            Nome do Novo Banco:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              placeholder="ex: meu_banco"
              className="flex-1 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#FF6B00]"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded text-xs font-semibold"
              title="Salvar Banco"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => { setIsCreatingDb(false); setNewDbName(''); }}
              className="px-2 py-1 bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded text-xs"
              title="Cancelar"
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* Árvore de Bancos e Tabelas com Zoom Proporcional */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono"
        style={{ zoom: zoomScale }}
      >
        {schemas.length === 0 ? (
          <div className="text-center py-10 px-4 flex flex-col items-center gap-2 text-[var(--text-muted)] text-xs font-sans">
            <span className="material-symbols-outlined text-3xl text-[var(--accent-yellow)]/60">
              database
            </span>
            <span className="font-semibold text-[var(--text-primary)]">Nenhum banco carregado</span>
            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              Clique com o botão direito sobre <strong className="text-[var(--accent-yellow)]">SCHEMA EXPLORER</strong> para carregar bancos de exemplo ou da aula.
            </p>
          </div>
        ) : filteredSchemas.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-xs font-sans">
            Nenhum banco ou tabela encontrado para o filtro.
          </div>
        ) : (
          filteredSchemas.map((db) => {
            const isCollapsed = collapsedDbs[db.name];
            const isActive = db.name === activeDatabase;

            return (
              <div
                key={db.name}
                className={`rounded border overflow-hidden transition-all ${
                  isActive
                    ? 'bg-[var(--bg-surface)] border-[#FF6B00] shadow-[0_0_8px_rgba(255,107,0,0.15)]'
                    : 'bg-[var(--bg-surface)]/40 border-[var(--border-color)]/60'
                }`}
              >
                {/* Nó do Banco de Dados */}
                <div
                  onClick={() => onSelectDatabase(db.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu({
                      type: 'database',
                      dbName: db.name,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-hover)] text-[var(--accent-yellow)] font-bold'
                      : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  }`}
                  title={`Banco: ${db.name} (Clique para selecionar como ativo • Botão direito para opções)`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      onClick={(e) => toggleDb(db.name, e)}
                      className="material-symbols-outlined text-[15px] text-[var(--text-secondary)] hover:text-[var(--accent-yellow)]"
                      title="Expandir/Recolher"
                    >
                      {isCollapsed ? 'arrow_right' : 'arrow_drop_down'}
                    </span>
                    <span className="material-symbols-outlined text-[15px] text-[var(--status-success)] drop-shadow-[0_0_6px_var(--glow-success)]">
                      database
                    </span>
                    <span className="text-xs truncate">
                      {db.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[var(--status-success)]/20 text-[var(--status-success)] border border-[var(--status-success)]/40 font-sans font-bold">
                        ATIVO
                      </span>
                    ) : null}
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] px-1 rounded">
                      {db.tables.length}
                    </span>
                  </div>
                </div>

                {/* Lista de Tabelas do Banco */}
                {!isCollapsed && (
                  <div className="pl-3 pr-1 py-1 space-y-0.5 bg-[var(--bg-secondary)]/80 border-t border-[var(--border-color)]/40">
                    {db.tables.length === 0 ? (
                      <div className="text-[11px] text-[var(--text-muted)] italic py-1 pl-2 font-sans">
                        (Sem tabelas criadas)
                      </div>
                    ) : (
                      db.tables.map((table) => {
                        const tableKey = `${db.name}.${table.name}`;
                        const isTableExpanded = expandedTables[tableKey];

                        const isTableSelected = selectedTable?.dbName === db.name && selectedTable?.tableName === table.name;

                        return (
                          <div key={table.name} className="flex flex-col">
                            {/* Nó da Tabela */}
                            <div
                              onClick={() => {
                                toggleTable(tableKey);
                                onSelectTable?.(db.name, table.name);
                              }}
                              onDoubleClick={() => {
                                onSelectTable?.(db.name, table.name);
                                onTableDoubleClick(db.name, table.name);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onContextMenu({
                                  type: 'table',
                                  dbName: db.name,
                                  tableName: table.name,
                                  columns: table.columns,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                              className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-all border ${
                                isTableSelected
                                  ? 'bg-[#FF8533]/15 border-[#FF8533]/50 text-[#FF8533] font-semibold shadow-[0_0_8px_rgba(255,133,51,0.2)]'
                                  : 'border-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                              title={`Tabela: ${table.name} • Clique para visualizar Dados • Duplo clique para SELECT`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="material-symbols-outlined text-[12px] text-[var(--text-muted)]">
                                  {isTableExpanded ? 'expand_more' : 'chevron_right'}
                                </span>
                                <span className={`material-symbols-outlined text-[14px] ${isTableSelected ? 'text-[#FF8533]' : 'text-[#FF8533]/80'}`}>
                                  {table.isView ? 'visibility' : 'table_chart'}
                                </span>
                                <span className={`text-xs truncate font-medium ${isTableSelected ? 'text-[#FF8533]' : 'group-hover:text-[var(--text-primary)]'}`}>
                                  {table.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isTableSelected && (
                                  <span className="text-[9px] font-mono font-bold bg-[#FF8533] text-black px-1 rounded uppercase tracking-wider">
                                    DADOS
                                  </span>
                                )}
                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-primary)] px-1 py-0.2 rounded">
                                  {table.columns.length} cols • {table.rowCount}
                                </span>
                              </div>
                            </div>

                            {/* Colunas da Tabela (Quando expandido) */}
                            {isTableExpanded && (
                              <div className="pl-6 pr-1 py-1 space-y-0.5 text-[11px] text-[var(--text-muted)] border-l border-[var(--border-color)] ml-3">
                                {table.columns.map((col) => (
                                  <div
                                    key={col.name}
                                    className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-[var(--bg-hover)]"
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <span className="material-symbols-outlined text-[10px] text-[var(--accent-yellow)]">
                                        {col.isPrimary ? 'key' : 'view_column'}
                                      </span>
                                      <span className={`truncate ${col.isPrimary ? 'text-[var(--accent-yellow)] font-semibold' : 'text-[var(--text-primary)]'}`}>
                                        {col.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] uppercase text-[var(--text-muted)]">
                                      {col.type}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé com Estatísticas e Botão Novo Banco */}
      <div className="p-2 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between text-[var(--text-muted)] text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[#00E676]">storage</span>
            <span>{totalDbs} {totalDbs === 1 ? 'BD' : 'BDs'}</span>
          </span>
          <span>•</span>
          <span>{totalTables} Tab</span>
        </div>

        {/* Botão Novo Banco de Dados */}
        <button
          onClick={() => setIsCreatingDb(true)}
          className="flex items-center gap-1 px-2 py-0.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded text-[11px] font-sans font-semibold shadow-sm transition-all cursor-pointer"
          type="button"
          title="Criar um Novo Banco de Dados"
        >
          <span className="material-symbols-outlined text-[13px]">add</span>
          <span>Novo Banco</span>
        </button>
      </div>
    </aside>
  );
};
