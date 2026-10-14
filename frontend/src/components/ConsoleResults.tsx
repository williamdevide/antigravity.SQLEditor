import React, { useState, useMemo } from 'react';
import { ZoomControl } from './ZoomControl';
import type { QueryResult, SqlReview, ConsoleTab, TablePreviewData, DatabaseSchema } from '../types';

interface ConsoleResultsProps {
  results: QueryResult[];
  isExecuting: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  review: SqlReview | null;
  onApplyReviewSuggestion: (suggestedSql: string) => void;
  activeConsoleTab?: ConsoleTab;
  onSelectConsoleTab?: (tab: ConsoleTab) => void;
  tablePreviewData?: TablePreviewData | null;
  onRefreshTablePreview?: () => void;
  schemas?: DatabaseSchema[];
  onSelectPreviewTable?: (dbName: string, tableName: string) => void;
}

export const ConsoleResults: React.FC<ConsoleResultsProps> = ({
  results,
  isExecuting,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  review,
  onApplyReviewSuggestion,
  activeConsoleTab = 'data',
  onSelectConsoleTab,
  tablePreviewData,
  onRefreshTablePreview,
  schemas = [],
  onSelectPreviewTable,
}) => {
  const [internalTab, setInternalTab] = useState<ConsoleTab>('data');
  
  // Ordenação e busca da aba Retorno (Query Results)
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ordenação e busca da aba Dados (Table Preview)
  const [dataSortCol, setDataSortCol] = useState<string | null>(null);
  const [dataSortAsc, setDataSortAsc] = useState<boolean>(true);
  const [dataSearchTerm, setDataSearchTerm] = useState<string>('');

  const [copiedLogIndex, setCopiedLogIndex] = useState<number | null>(null);

  const handleCopyLog = (res: QueryResult, index: number) => {
    const textToCopy = res.status === 'error' && res.errorMessage
      ? res.errorMessage
      : res.statement;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLogIndex(index);
    setTimeout(() => {
      setCopiedLogIndex(null);
    }, 2000);
  };

  const currentTab = onSelectConsoleTab ? activeConsoleTab : internalTab;
  const setTab = onSelectConsoleTab || setInternalTab;

  // Pega o último resultado relevante com dados para a aba Retorno
  const latestResult = results[results.length - 1];
  const selectResult = results.slice().reverse().find(r => r.columns.length > 0 && r.rows.length > 0) || latestResult;

  const handleHeaderClick = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleDataHeaderClick = (col: string) => {
    if (dataSortCol === col) {
      setDataSortAsc(!dataSortAsc);
    } else {
      setDataSortCol(col);
      setDataSortAsc(true);
    }
  };

  // Linhas filtradas e ordenadas da aba Retorno
  const sortedAndFilteredRows = useMemo(() => {
    if (!selectResult || !selectResult.rows) return [];

    let rows = [...selectResult.rows];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    if (sortCol) {
      rows.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }

        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [selectResult, sortCol, sortAsc, searchTerm]);

  // Linhas filtradas e ordenadas da aba Dados (Preview da Tabela)
  const sortedAndFilteredDataRows = useMemo(() => {
    if (!tablePreviewData || !tablePreviewData.rows) return [];

    let rows = [...tablePreviewData.rows];

    if (dataSearchTerm.trim()) {
      const term = dataSearchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    if (dataSortCol) {
      rows.sort((a, b) => {
        const valA = a[dataSortCol];
        const valB = b[dataSortCol];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return dataSortAsc ? valA - valB : valB - valA;
        }

        return dataSortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [tablePreviewData, dataSortCol, dataSortAsc, dataSearchTerm]);

  const exportToCSV = () => {
    if (!selectResult || sortedAndFilteredRows.length === 0) return;

    const headers = selectResult.columns.join(',');
    const rows = sortedAndFilteredRows.map(r =>
      selectResult.columns.map(col => {
        const val = r[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    ).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(headers + '\n' + rows)}`;
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `retorno_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDataToCSV = () => {
    if (!tablePreviewData || sortedAndFilteredDataRows.length === 0) return;

    const headers = tablePreviewData.columns.join(',');
    const rows = sortedAndFilteredDataRows.map(r =>
      tablePreviewData.columns.map(col => {
        const val = r[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    ).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(headers + '\n' + rows)}`;
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${tablePreviewData.tableName}_dados_limit30_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const zoomScale = zoomLevel / 100;

  // Lista plana de todas as tabelas para o seletor rápido
  const allAvailableTables = useMemo(() => {
    const list: { dbName: string; tableName: string }[] = [];
    schemas.forEach(db => {
      db.tables.forEach(t => {
        list.push({ dbName: db.name, tableName: t.name });
      });
    });
    return list;
  }, [schemas]);

  return (
    <div
      className="h-full flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)] border-t border-[var(--border-color)] select-none transition-colors"
    >
      {/* Topo do Console: Abas, Status e Zoom */}
      <div className="h-9 px-3 bg-[var(--bg-surface)] flex items-center justify-between border-b border-[var(--border-color)] shrink-0">
        {/* Abas: 1. Dados (Nova) • 2. Retorno (Renomeada) • 3. Log • 4. Revisão */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Aba 1: Dados da Tabela Selecionada (LIMIT 30) */}
          <button
            onClick={() => setTab('data')}
            className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              currentTab === 'data'
                ? 'border-[#FF8533] text-[#FF8533] bg-[var(--bg-secondary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
            title="Visualizar campos e primeiros 30 registros da tabela selecionada"
          >
            <span className="material-symbols-outlined text-[14px]">dataset</span>
            <span>Dados</span>
            {tablePreviewData?.tableName && (
              <span className="text-[10px] bg-[#FF8533]/15 text-[#FF8533] border border-[#FF8533]/30 px-1.5 py-0.2 rounded font-mono font-bold truncate max-w-[120px]">
                {tablePreviewData.tableName}
              </span>
            )}
          </button>

          {/* Aba 2: Retorno da Consulta SQL (Renomeada) */}
          <button
            onClick={() => setTab('grid')}
            className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              currentTab === 'grid'
                ? 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] bg-[var(--bg-secondary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
            title="Grade de retorno da execução dos scripts SQL"
          >
            <span className="material-symbols-outlined text-[14px]">table_chart</span>
            <span>Retorno</span>
            {selectResult && selectResult.rows.length > 0 && (
              <span className="text-[10px] bg-[var(--bg-primary)] text-[var(--status-success)] px-1 rounded font-mono font-bold">
                {selectResult.rows.length}
              </span>
            )}
          </button>

          {/* Aba 3: Log de Execução */}
          <button
            onClick={() => setTab('log')}
            className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              currentTab === 'log'
                ? 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] bg-[var(--bg-secondary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span>Log de Execução</span>
            {results.some(r => r.status === 'error') && (
              <span className="w-2 h-2 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]"></span>
            )}
          </button>

          {/* Aba 4: Revisão SQL */}
          <button
            onClick={() => setTab('review')}
            className={`px-3 py-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              currentTab === 'review'
                ? 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] bg-[var(--bg-secondary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px] text-[var(--status-success)]">fact_check</span>
            <span>Revisão SQL</span>
            {review && review.errorsDetected.length > 0 && (
              <span className="text-[10px] bg-[#FF3366]/20 text-[#FF3366] px-1.5 rounded-full font-mono font-bold">
                {review.errorsDetected.length}
              </span>
            )}
          </button>
        </div>

        {/* Status Badge & Controles de Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          {isExecuting ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-[#FF6B00] text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-ping"></span>
              <span>Executando...</span>
            </div>
          ) : latestResult?.status === 'error' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#FF3366] text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3366] shadow-[0_0_6px_#FF3366]"></span>
              <span>Erro SQL</span>
              <span className="text-[10px] text-[var(--text-muted)]">({latestResult.executionTimeMs}ms)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] text-[11px] font-mono font-medium shadow-[0_0_8px_rgba(0,230,118,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]"></span>
              <span>Pronto</span>
              {latestResult && (
                <span className="text-[10px] text-[var(--text-muted)]">({latestResult.executionTimeMs}ms)</span>
              )}
            </div>
          )}

          {currentTab === 'grid' && selectResult && selectResult.rows.length > 0 && (
            <button
              onClick={exportToCSV}
              title="Exportar retorno para CSV"
              className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[#FFE600] border border-[var(--border-color)] rounded text-[11px] font-mono transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">download</span>
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}

          {currentTab === 'data' && tablePreviewData && tablePreviewData.rows.length > 0 && (
            <button
              onClick={exportDataToCSV}
              title="Exportar dados da tabela para CSV"
              className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[#FF8533] border border-[var(--border-color)] rounded text-[11px] font-mono transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">download</span>
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}

          <ZoomControl
            level={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onZoomReset}
          />
        </div>
      </div>

      {/* Conteúdo: 1. Dados (LIMIT 30) | 2. Retorno | 3. Log | 4. Revisão */}
      <div className="flex-1 overflow-hidden relative">
        {currentTab === 'data' ? (
          /* View 1: Dados da Tabela Selecionada (SELECT * FROM tbl LIMIT 30) */
          <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
            {/* Barra de Ferramentas da Aba Dados */}
            <div className="px-3 py-1.5 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#FF8533]">table_view</span>
                
                {/* Seletor rápido de tabela */}
                {allAvailableTables.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-secondary)] text-[11px]">Tabela:</span>
                    <select
                      value={tablePreviewData ? `${tablePreviewData.dbName}.${tablePreviewData.tableName}` : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [db, tbl] = val.split('.');
                        onSelectPreviewTable?.(db, tbl);
                      }}
                      className="px-2 py-0.5 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-xs font-mono font-medium focus:border-[#FF8533] focus:outline-none cursor-pointer"
                    >
                      {allAvailableTables.map(item => (
                        <option key={`${item.dbName}.${item.tableName}`} value={`${item.dbName}.${item.tableName}`}>
                          {item.dbName}.{item.tableName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                    {tablePreviewData ? `${tablePreviewData.dbName}.${tablePreviewData.tableName}` : 'Nenhuma tabela selecionada'}
                  </span>
                )}

                {/* Badge de LIMIT 30 */}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF8533]/15 text-[#FF8533] border border-[#FF8533]/30 tracking-wider">
                  LIMIT 30
                </span>

                {/* Botão de Atualizar dados */}
                {onRefreshTablePreview && (
                  <button
                    onClick={onRefreshTablePreview}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-yellow)] border border-[var(--border-color)] rounded text-[11px] font-mono transition-colors cursor-pointer"
                    title="Recarregar dados da tabela"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                  </button>
                )}

                {tablePreviewData && (
                  <span className="text-[11px] text-[var(--text-secondary)] font-mono hidden md:inline">
                    Mostrando <strong className="text-[#00E676]">{sortedAndFilteredDataRows.length}</strong> de {tablePreviewData.totalRows} registros ({tablePreviewData.columns.length} colunas)
                  </span>
                )}
              </div>

              {/* Filtro / Busca na Aba Dados */}
              {tablePreviewData && tablePreviewData.rows.length > 0 && (
                <div className="flex items-center bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[13px] text-[var(--text-muted)] mr-1">search</span>
                  <input
                    type="text"
                    value={dataSearchTerm}
                    onChange={(e) => setDataSearchTerm(e.target.value)}
                    placeholder="Filtrar dados da tabela..."
                    className="bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-36 font-mono"
                  />
                  {dataSearchTerm && (
                    <button onClick={() => setDataSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
                  )}
                </div>
              )}
            </div>

            {/* Grade de Dados da Tabela com Zoom */}
            <div
              className="flex-1 overflow-auto"
              style={{ zoom: zoomScale }}
            >
              {!tablePreviewData || !tablePreviewData.tableName ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 p-6 text-center">
                  <span className="material-symbols-outlined text-[36px] text-[#FF8533] opacity-60">dataset</span>
                  <p className="text-xs font-mono font-medium text-[var(--text-primary)]">
                    Nenhuma tabela selecionada.
                  </p>
                  <p className="text-[11px] max-w-md leading-relaxed text-[var(--text-secondary)]">
                    Clique em qualquer tabela no <strong>Schema Explorer</strong> à esquerda para visualizar sua estrutura de campos e seus primeiros 30 registros.
                  </p>
                </div>
              ) : tablePreviewData.columns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 p-6 text-center">
                  <span className="material-symbols-outlined text-[36px] opacity-40">table_rows</span>
                  <p className="text-xs font-mono">Tabela sem colunas definidas.</p>
                </div>
              ) : (
                <table className="w-full border-collapse font-mono text-left text-xs">
                  <thead className="bg-[var(--bg-surface)] sticky top-0 z-10 border-b-2 border-[var(--border-color)] shadow-sm">
                    <tr>
                      <th className="px-3 py-2 text-[var(--text-muted)] font-semibold w-12 text-center border-r border-[var(--border-color)]">
                        #
                      </th>
                      {tablePreviewData.columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleDataHeaderClick(col)}
                          className="px-3 py-2 text-[#FF8533] font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-r border-[var(--border-color)] truncate"
                          title={`Clique para ordenar pela coluna ${col}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            {dataSortCol === col && (
                              <span className="material-symbols-outlined text-[13px] text-[var(--accent-yellow)]">
                                {dataSortAsc ? 'arrow_upward' : 'arrow_downward'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sortedAndFilteredDataRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={tablePreviewData.columns.length + 1}
                          className="text-center py-8 text-[var(--text-muted)] italic"
                        >
                          {tablePreviewData.totalRows === 0
                            ? 'Tabela vazia (0 registros). A estrutura de campos está pronta para receber dados.'
                            : 'Nenhum registro corresponde ao filtro de busca.'}
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredDataRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[var(--bg-hover)] transition-colors odd:bg-[var(--bg-secondary)] even:bg-[var(--bg-surface)]/40"
                        >
                          <td className="px-3 py-1.5 text-center text-[var(--text-muted)] text-[11px] border-r border-[var(--border-color)] font-semibold">
                            {idx + 1}
                          </td>
                          {tablePreviewData.columns.map((col) => {
                            const val = row[col];
                            const isNull = val === null || val === undefined;
                            return (
                              <td
                                key={col}
                                className={`px-3 py-1.5 border-r border-[var(--border-color)] truncate max-w-[280px] ${
                                  isNull ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {isNull ? 'NULL' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : currentTab === 'grid' ? (
          /* View 2: Retorno da Consulta SQL (Antiga Grade de Dados) */
          <div className="h-full flex flex-col">
            {/* Barra de Filtro da Grade */}
            {selectResult && selectResult.rows.length > 0 && (
              <div className="px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)] font-mono">
                    Mostrando <strong className="text-[#00E676]">{sortedAndFilteredRows.length}</strong> de {selectResult.rows.length} registros
                  </span>
                </div>
                <div className="flex items-center bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  <span className="material-symbols-outlined text-[13px] text-[var(--text-muted)] mr-1">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar resultados..."
                    className="bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-36 font-mono"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
                  )}
                </div>
              </div>
            )}

            {/* Tabela Interativa com Zoom Proporcional */}
            <div
              className="flex-1 overflow-auto"
              style={{ zoom: zoomScale }}
            >
              {!selectResult || selectResult.columns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 p-6 text-center">
                  <span className="material-symbols-outlined text-[36px] opacity-40">table_rows</span>
                  <p className="text-xs font-mono">Execute uma consulta SQL no editor para visualizar o retorno aqui.</p>
                  <p className="text-[11px]">Dica: Dê um duplo clique numa tabela no Schema Explorer ou selecione um script e pressione Ctrl+Enter.</p>
                </div>
              ) : (
                <table className="w-full border-collapse font-mono text-left text-xs">
                  <thead className="bg-[var(--bg-surface)] sticky top-0 z-10 border-b-2 border-[var(--border-color)] shadow-sm">
                    <tr>
                      <th className="px-3 py-2 text-[var(--text-muted)] font-semibold w-12 text-center border-r border-[var(--border-color)]">
                        #
                      </th>
                      {selectResult.columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleHeaderClick(col)}
                          className="px-3 py-2 text-[var(--accent-yellow)] font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-colors border-r border-[var(--border-color)] truncate"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            {sortCol === col && (
                              <span className="material-symbols-outlined text-[13px] text-[#FF8533]">
                                {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sortedAndFilteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={selectResult.columns.length + 1}
                          className="text-center py-6 text-[var(--text-muted)] italic"
                        >
                          Nenhuma linha corresponde ao filtro ou resultado vazio.
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[var(--bg-hover)] transition-colors odd:bg-[var(--bg-secondary)] even:bg-[var(--bg-surface)]/40"
                        >
                          <td className="px-3 py-1.5 text-center text-[var(--text-muted)] text-[11px] border-r border-[var(--border-color)]">
                            {idx + 1}
                          </td>
                          {selectResult.columns.map((col) => {
                            const val = row[col];
                            const isNull = val === null || val === undefined;
                            return (
                              <td
                                key={col}
                                className={`px-3 py-1.5 border-r border-[var(--border-color)] truncate max-w-[280px] ${
                                  isNull ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {isNull ? 'NULL' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : currentTab === 'log' ? (
          /* View 2: Log de Execução */
          <div
            className="h-full overflow-y-auto p-3 font-mono text-xs space-y-2.5 bg-[var(--bg-primary)]"
            style={{ zoom: zoomScale }}
          >
            {results.length === 0 ? (
              <div className="text-[var(--text-muted)] italic py-4">Nenhum log de execução registrado ainda.</div>
            ) : (
              results.map((res, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded border ${
                    res.status === 'success'
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]'
                      : 'bg-[#FF3366]/10 border-[#FF3366]/40 text-[#FF3366]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-b border-[var(--border-color)] pb-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-[var(--accent-yellow)]">
                        schedule
                      </span>
                      <span>{res.timestamp}</span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="text-[var(--status-success)] font-semibold">db: {res.database}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLog(res, i)}
                        title={res.status === 'error' ? 'Copiar mensagem de erro completa' : 'Copiar comando SQL'}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          copiedLogIndex === i
                            ? 'bg-[var(--status-success)]/25 text-[var(--status-success)] border border-[var(--status-success)]/50'
                            : res.status === 'error'
                            ? 'bg-[#FF3366]/20 hover:bg-[#FF3366]/35 text-[#FF3366] border border-[#FF3366]/40 shadow-sm'
                            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedLogIndex === i ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedLogIndex === i ? 'Copiado!' : res.status === 'error' ? 'Copiar Erro' : 'Copiar'}</span>
                      </button>
                      <span>{res.executionTimeMs} ms</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          res.status === 'success'
                            ? 'bg-[var(--status-success)]/20 text-[var(--status-success)]'
                            : 'bg-[#FF3366]/20 text-[#FF3366]'
                        }`}
                      >
                        {res.status === 'success' ? 'SUCESSO' : 'FALHA'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[var(--accent-yellow)] font-semibold text-[11px] mb-1 truncate">
                    &gt; {res.statement}
                  </div>

                  {res.status === 'success' ? (
                    <div className="text-[var(--status-success)] text-[11px]">
                      {res.affectedRows !== undefined && res.affectedRows > 0
                        ? `✓ ${res.affectedRows} linha(s) retornada(s) ou afetada(s).`
                        : '✓ Comando executado com sucesso.'}
                    </div>
                  ) : (
                    <div className="text-[#FF3366] text-[11px] font-bold whitespace-pre-wrap">
                      ✖ Erro: {res.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* View 3: Aba de Revisão SQL */
          <div
            className="h-full overflow-y-auto p-4 font-mono text-xs space-y-4 bg-[var(--bg-primary)]"
            style={{ zoom: zoomScale }}
          >
            {!review ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 py-8 text-center font-sans">
                <span className="material-symbols-outlined text-[36px] text-[var(--status-success)]">fact_check</span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhum trecho revisado no momento.</p>
                <p className="text-xs max-w-md">
                  Selecione um comando SQL no editor, clique com o botão direito e escolha <strong>"Revisar trecho"</strong> (ou pressione <strong>Alt+R</strong>).
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {/* 1. Comando Selecionado */}
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                    <span className="font-semibold text-[var(--text-primary)]">1. Comando Selecionado:</span>
                    <span>{review.timestamp}</span>
                  </div>
                  <pre className="p-2.5 rounded bg-[var(--bg-primary)] text-[var(--accent-yellow)] border border-[var(--border-color)] whitespace-pre-wrap">
                    {review.originalQuery}
                  </pre>
                </div>

                {/* 2. Erros Detectados */}
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-[#FF3366]">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>2. Diagnóstico e Erros Detectados ({review.errorsDetected.length}):</span>
                  </div>
                  {review.errorsDetected.length === 0 ? (
                    <div className="text-[var(--status-success)] text-xs flex items-center gap-1 font-sans">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Nenhum erro de sintaxe crítico detectado no comando.</span>
                    </div>
                  ) : (
                    <ul className="space-y-1.5 pl-2 text-xs">
                      {review.errorsDetected.map((err, idx) => (
                        <li key={idx} className="text-[#FF3366] flex items-start gap-1.5">
                          <span>✖</span>
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Recomendações e Boas Práticas */}
                {review.recommendations.length > 0 && (
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-[#FF8533]">
                      <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                      <span>3. Recomendações de Otimização:</span>
                    </div>
                    <ul className="space-y-1.5 pl-2 text-xs">
                      {review.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-[var(--text-secondary)] flex items-start gap-1.5 font-sans">
                          <span className="text-[#FFE600] font-bold">💡</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. Sugestão Corrigida / Formatada */}
                <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[#00E676]/40 shadow-sm">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-[#00E676] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                      4. Consulta Sugerida:
                    </span>
                    <button
                      onClick={() => onApplyReviewSuggestion(review.suggestedQuery)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#00E676] hover:bg-[#00E676]/90 text-black font-semibold rounded text-xs transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">done_all</span>
                      <span>Aplicar no Editor</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-[var(--bg-primary)] text-[#00E676] border border-[var(--border-color)] whitespace-pre-wrap">
                    {review.suggestedQuery}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
