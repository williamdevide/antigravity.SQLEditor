import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DatabaseSchema, TableSchema, ColumnSchema } from '../types';

interface ERModelViewProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  onSelectDatabase?: (dbName: string) => void;
  onSelectTableForQuery: (dbName: string, tableName: string) => void;
}

interface Relationship {
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
  cardinality: string;
}

// Normalização de nomes de entidades relacionais
function cleanEntityName(name: string): string {
  let s = name.toLowerCase().trim().replace(/[`'"]/g, '');
  s = s.replace(/^(tb_|tbl_|tab_|t_)/, '');
  s = s.replace(/^(id_|cod_|codigo_|cd_|fk_)/, '');
  s = s.replace(/(_id|_fk|_cod|_codigo)$/, '');
  if (s.endsWith('id') && s.length > 2) s = s.slice(0, -2);

  if (s.endsWith('eis')) s = s.replace(/eis$/, 'el');
  else if (s.endsWith('oes')) s = s.replace(/oes$/, 'ao');
  else if (s.endsWith('ais')) s = s.replace(/ais$/, 'al');
  else if (s.endsWith('ois')) s = s.replace(/ois$/, 'ol');
  else if (s.endsWith('uis')) s = s.replace(/uis$/, 'ul');
  else if (s.endsWith('ns')) s = s.replace(/ns$/, 'm');
  else if (s.endsWith('ores')) s = s.replace(/ores$/, 'or');
  else if (s.endsWith('res')) s = s.replace(/res$/, 'r');
  else if (s.endsWith('es') && s.length > 3) s = s.replace(/es$/, '');
  else if (s.endsWith('s') && s.length > 2) s = s.slice(0, -1);

  return s;
}

export const ERModelView: React.FC<ERModelViewProps> = ({
  schemas,
  activeDatabase,
  onSelectDatabase,
  onSelectTableForQuery,
}) => {
  const [selectedDb, setSelectedDb] = useState<string>(activeDatabase || schemas[0]?.name || '');
  const prevActiveDbProp = useRef<string>(activeDatabase);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewFormat, setViewFormat] = useState<'cards' | 'text'>('cards');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Sincroniza quando activeDatabase vem de fora
  useEffect(() => {
    if (activeDatabase && activeDatabase !== prevActiveDbProp.current) {
      prevActiveDbProp.current = activeDatabase;
      setSelectedDb(activeDatabase);
    }
  }, [activeDatabase]);

  const handleDbChange = (newDb: string) => {
    setSelectedDb(newDb);
    onSelectDatabase?.(newDb);
  };

  const currentDb = useMemo(() => {
    return schemas.find(s => s.name === selectedDb) || schemas[0];
  }, [schemas, selectedDb]);

  // Identificação dos relacionamentos estruturais do banco
  const relationships: Relationship[] = useMemo(() => {
    if (!currentDb || !currentDb.tables || currentDb.tables.length === 0) return [];
    const rels: Relationship[] = [];
    const tables = currentDb.tables;

    for (const table of tables) {
      for (const col of table.columns) {
        const colLower = col.name.toLowerCase().trim();
        const isSelfPk = col.isPrimary || colLower === 'id' || colLower === `id_${table.name.toLowerCase()}`;

        let targetTable: TableSchema | undefined;
        let toColName = 'id';

        if (col.foreignKeyRef && col.foreignKeyRef.table) {
          const refTableClean = col.foreignKeyRef.table.trim().toLowerCase().replace(/[`'"]/g, '');
          targetTable = tables.find(t => t.name.toLowerCase().replace(/[`'"]/g, '') === refTableClean);
          if (targetTable) {
            toColName = col.foreignKeyRef.column || 'id';
          }
        }

        if (!targetTable && !isSelfPk) {
          const cleanCol = cleanEntityName(col.name);

          targetTable = tables.find(t => {
            if (t.name.toLowerCase() === table.name.toLowerCase()) return false;
            const cleanTbl = cleanEntityName(t.name);
            const tLower = t.name.toLowerCase().replace(/[`'"]/g, '');
            return (
              cleanTbl === cleanCol ||
              cleanTbl === colLower ||
              tLower === colLower.replace(/_id$/, '') ||
              tLower === colLower.replace(/^id_/, '') ||
              tLower === colLower.replace(/^fk_/, '') ||
              (cleanTbl.length >= 4 && cleanCol.length >= 4 && (cleanTbl.startsWith(cleanCol) || cleanCol.startsWith(cleanTbl)))
            );
          });

          if (!targetTable) {
            let targetPrefix = '';
            if (colLower.endsWith('_id')) targetPrefix = colLower.replace(/_id$/, '');
            else if (colLower.startsWith('id_')) targetPrefix = colLower.replace(/^id_/, '');
            else if (colLower.startsWith('cod_')) targetPrefix = colLower.replace(/^cod_/, '');
            else if (colLower.startsWith('codigo_')) targetPrefix = colLower.replace(/^codigo_/, '');
            else if (colLower.startsWith('fk_')) targetPrefix = colLower.replace(/^fk_/, '');

            if (targetPrefix) {
              const cleanPrefix = cleanEntityName(targetPrefix);
              targetTable = tables.find(t => {
                if (t.name.toLowerCase() === table.name.toLowerCase()) return false;
                const tLower = t.name.toLowerCase().replace(/[`'"]/g, '');
                const cleanT = cleanEntityName(tLower);
                return (
                  cleanT === cleanPrefix ||
                  tLower === targetPrefix ||
                  tLower === targetPrefix + 's' ||
                  tLower === targetPrefix + 'es' ||
                  (cleanT.length >= 4 && cleanPrefix.length >= 4 && (cleanT.startsWith(cleanPrefix) || cleanPrefix.startsWith(cleanT)))
                );
              });
            }
          }

          if (targetTable) {
            const pkCol = targetTable.columns.find((c: ColumnSchema) => c.isPrimary || c.name.toLowerCase() === 'id' || c.name.toLowerCase().startsWith('id_')) || targetTable.columns[0];
            toColName = pkCol ? pkCol.name : 'id';
          }
        }

        if (targetTable && targetTable.name.toLowerCase() !== table.name.toLowerCase()) {
          const already = rels.some(r =>
            r.fromTable.toLowerCase() === table.name.toLowerCase() &&
            r.fromCol.toLowerCase() === col.name.toLowerCase() &&
            r.toTable.toLowerCase() === targetTable!.name.toLowerCase()
          );

          if (!already) {
            rels.push({
              fromTable: table.name,
              fromCol: col.name,
              toTable: targetTable.name,
              toCol: toColName,
              cardinality: '1:N',
            });
          }
        }
      }
    }

    return rels;
  }, [currentDb]);

  // Contagem total de atributos
  const totalColumnsCount = useMemo(() => {
    return currentDb?.tables?.reduce((acc, t) => acc + t.columns.length, 0) || 0;
  }, [currentDb]);

  // Gera a representação formal textual do MER (Modelo Entidade-Relacionamento)
  const merTextContent = useMemo(() => {
    if (!currentDb || !currentDb.tables || currentDb.tables.length === 0) {
      return '-- Nenhum banco de dados ou tabela carregada no momento.\n';
    }

    const lines: string[] = [];
    const timestamp = new Date().toLocaleString('pt-BR');

    lines.push('================================================================================');
    lines.push(` MODELO ENTIDADE-RELACIONAMENTO (MER) - ESPECIFICAÇÃO TEXTUAL FORMAL`);
    lines.push(` Banco de Dados: ${currentDb.name}`);
    lines.push(` Gerado em: ${timestamp}`);
    lines.push(` Ferramenta: Google Antigravity SQLEditor Professional`);
    lines.push('================================================================================\n');

    lines.push('--------------------------------------------------------------------------------');
    lines.push(` 1. ESQUEMA DAS ENTIDADES (TABELAS E ATRIBUTOS) - Total: ${currentDb.tables.length} entidade(s)`);
    lines.push('--------------------------------------------------------------------------------\n');

    for (const table of currentDb.tables) {
      lines.push(`${table.name} (`);
      const colLines = table.columns.map((col) => {
        const isPk = col.isPrimary || col.name.toLowerCase() === 'id';
        const rel = relationships.find(
          r => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromCol.toLowerCase() === col.name.toLowerCase()
        );

        const modifiers: string[] = [];
        if (isPk) modifiers.push('PRIMARY KEY');
        if (rel) modifiers.push(`FOREIGN KEY -> ${rel.toTable}(${rel.toCol})`);

        const modStr = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
        return `    ${col.name.padEnd(25)} ${col.type}${modStr}`;
      });

      lines.push(colLines.join(',\n'));
      lines.push(`);\n`);
    }

    lines.push('--------------------------------------------------------------------------------');
    lines.push(` 2. INTEGRIDADE REFERENCIAL & RELACIONAMENTOS (DER/MER) - Total: ${relationships.length} relação(ões)`);
    lines.push('--------------------------------------------------------------------------------\n');

    if (relationships.length === 0) {
      lines.push('  (Nenhum relacionamento explícito ou inferido detectado nesta base de dados)\n');
    } else {
      relationships.forEach((rel, idx) => {
        lines.push(`  [${String(idx + 1).padStart(2, '0')}] ${rel.fromTable} (${rel.fromCol})  [N] ────── (1)  ${rel.toTable} (${rel.toCol})`);
      });
      lines.push('');
    }

    lines.push('================================================================================');
    lines.push(' FIM DO DOCUMENTO DE MODELO ENTIDADE-RELACIONAMENTO');
    lines.push('================================================================================');

    return lines.join('\n');
  }, [currentDb, relationships]);

  // Copiar MER como texto
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(merTextContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (_) {}
  };

  // Exportar como PDF (via janela de impressão com CSS @media print dedicada)
  const handleExportPDF = () => {
    window.print();
  };

  // Filtragem de tabelas
  const filteredTables = useMemo(() => {
    if (!currentDb?.tables) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return currentDb.tables;

    return currentDb.tables.filter(t => {
      const matchTable = t.name.toLowerCase().includes(term);
      const matchCol = t.columns.some(c => c.name.toLowerCase().includes(term));
      return matchTable || matchCol;
    });
  }, [currentDb, searchTerm]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden select-none transition-colors relative print:bg-white print:text-black">
      {/* 1. Barra Superior com Ferramentas e Seletor */}
      <div className="h-14 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between shrink-0 z-20 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#AB47BC]/15 border border-[#AB47BC]/30 flex items-center justify-center text-[#AB47BC]">
            <span className="material-symbols-outlined text-[20px]">article</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Modelo ER (MER - Notação Textual)
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#AB47BC]/15 text-[#AB47BC] border border-[#AB47BC]/30">
                {currentDb?.tables.length || 0} entidades • {totalColumnsCount} atributos • {relationships.length} relações
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Dicionário de dados, atributos relacionais, chaves e integridade referencial com exportação em PDF.
            </p>
          </div>
        </div>

        {/* Ações e Controles */}
        <div className="flex items-center gap-2">
          {/* Seletor de Banco */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">Banco:</span>
            <select
              value={selectedDb}
              onChange={(e) => handleDbChange(e.target.value)}
              className="bg-[var(--bg-secondary)] text-[var(--accent-yellow)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-[#FF6B00] cursor-pointer"
            >
              {schemas.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.tables.length} tabelas)
                </option>
              ))}
            </select>
          </div>

          {/* Alternador de Modo: Cards ou Texto Puro */}
          <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-0.5">
            <button
              onClick={() => setViewFormat('cards')}
              title="Modo Dicionário Estruturado (Cartões Técnicos)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                viewFormat === 'cards'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">grid_view</span>
              <span>Dicionário</span>
            </button>
            <button
              onClick={() => setViewFormat('text')}
              title="Modo Notação Textual Formal (MER Clássico)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${
                viewFormat === 'text'
                  ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">code</span>
              <span>Texto MER</span>
            </button>
          </div>

          {/* Botão Copiar Texto */}
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Copiar texto formal do MER para a área de transferência"
            type="button"
          >
            <span className={`material-symbols-outlined text-[15px] ${copiedText ? 'text-[var(--status-success)]' : 'text-[var(--accent-yellow)]'}`}>
              {copiedText ? 'check' : 'content_copy'}
            </span>
            <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          {/* Botão Exportar PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded text-xs font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(255,107,0,0.3)] active:scale-95"
            title="Exportar documento completo do Modelo ER em formato PDF profissional"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Área Principal de Visualização */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
        {/* Cabeçalho Oficial visível apenas na impressão/PDF */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold font-mono text-black uppercase">
                MODELO ENTIDADE-RELACIONAMENTO (MER)
              </h1>
              <p className="text-xs text-gray-700 font-mono">
                Banco de Dados: <span className="font-bold">{currentDb?.name}</span> | SQLEditor Professional
              </p>
            </div>
            <div className="text-right text-[10px] font-mono text-gray-600">
              <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>{currentDb?.tables.length || 0} tabelas • {relationships.length} relacionamentos</p>
            </div>
          </div>
        </div>

        {/* Modo 1: Dicionário Estruturado em Cards */}
        {viewFormat === 'cards' ? (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Barra de Busca e Filtro de Entidades (oculta na impressão) */}
            <div className="flex items-center justify-between gap-4 print:hidden">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[16px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filtrar por nome de tabela ou coluna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="text-xs text-[var(--text-secondary)] font-mono">
                Mostrando <span className="font-bold text-[var(--text-primary)]">{filteredTables.length}</span> de {currentDb?.tables.length} tabelas
              </div>
            </div>

            {/* Grid de Cartões de Tabelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTables.map((table) => {
                const tableRels = relationships.filter(
                  r => r.fromTable.toLowerCase() === table.name.toLowerCase() || r.toTable.toLowerCase() === table.name.toLowerCase()
                );

                return (
                  <div
                    key={table.name}
                    className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[var(--accent-yellow)] transition-all flex flex-col print:border print:border-gray-300 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Header do Card */}
                    <div className="px-3.5 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between print:bg-gray-100">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[17px] text-[#FF8533]">
                          table_chart
                        </span>
                        <span className="font-mono font-bold text-xs text-[var(--text-primary)] truncate">
                          {table.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/30 font-bold">
                          {table.rowCount} linhas
                        </span>
                        <button
                          onClick={() => onSelectTableForQuery(currentDb.name, table.name)}
                          title="Abrir consulta SELECT desta tabela"
                          className="print:hidden w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-yellow)] rounded hover:bg-[var(--bg-hover)]"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      </div>
                    </div>

                    {/* Lista de Atributos/Colunas */}
                    <div className="p-3 space-y-1.5 flex-1 font-mono text-xs">
                      {table.columns.map((col) => {
                        const isPk = col.isPrimary || col.name.toLowerCase() === 'id';
                        const fkRel = relationships.find(
                          r => r.fromTable.toLowerCase() === table.name.toLowerCase() && r.fromCol.toLowerCase() === col.name.toLowerCase()
                        );

                        return (
                          <div
                            key={col.name}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--border-color)]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isPk ? (
                                <span
                                  className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)] shrink-0"
                                  title="Chave Primária (PK)"
                                >
                                  key
                                </span>
                              ) : fkRel ? (
                                <span
                                  className="material-symbols-outlined text-[14px] text-[#FF8533] shrink-0"
                                  title={`Chave Estrangeira (FK) -> ${fkRel.toTable}.${fkRel.toCol}`}
                                >
                                  link
                                </span>
                              ) : (
                                <span className="w-3.5 text-center text-[var(--text-muted)] text-[10px] shrink-0">•</span>
                              )}
                              <span
                                className={`truncate font-medium ${
                                  isPk
                                    ? 'text-[var(--accent-yellow)] font-bold'
                                    : fkRel
                                    ? 'text-[#FF8533] font-semibold'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {col.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                {col.type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Rodapé do Card com Relacionamentos Envolvidos */}
                    {tableRels.length > 0 && (
                      <div className="px-3 py-2 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-color)] text-[11px] font-mono space-y-1">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">
                          Conexões Relacionais:
                        </span>
                        {tableRels.map((r, i) => (
                          <div key={i} className="text-[10px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                            <span className="text-[#FF8533]">➔</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {r.fromTable === table.name ? `${r.fromCol} aponta para ${r.toTable}(${r.toCol})` : `Referenciada por ${r.fromTable}(${r.fromCol})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Painel de Integridade Referencial Global */}
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 shadow-sm print:break-before-page">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent-yellow)]">
                  hub
                </span>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                  Mapeamento Geral de Integridade Referencial ({relationships.length} relacionamentos)
                </h3>
              </div>

              {relationships.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Nenhum relacionamento formal ou inferido detectado neste banco.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                  {relationships.map((rel, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-[#FF8533]/15 text-[#FF8533] text-[10px] font-bold">
                          FK
                        </span>
                        <span className="font-bold text-[var(--text-primary)]">{rel.fromTable}</span>
                        <span className="text-[var(--text-muted)]">({rel.fromCol})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#00E676] font-bold px-2">
                        <span>[N] ─── (1)</span>
                      </div>
                      <div className="flex items-center gap-2 truncate text-right">
                        <span className="font-bold text-[var(--accent-yellow)]">{rel.toTable}</span>
                        <span className="text-[var(--text-muted)]">({rel.toCol})</span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] text-[10px] font-bold">
                          PK
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Modo 2: Notação Textual Formal Completa (MER em Texto) */
          <div className="max-w-5xl mx-auto">
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#AB47BC]">
                    terminal
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    mer_relacional_{currentDb?.name}.txt
                  </span>
                </div>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded text-xs font-mono cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  <span>{copiedText ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 sm:p-6 font-mono text-xs leading-relaxed text-[var(--text-primary)] overflow-x-auto whitespace-pre selection:bg-[#AB47BC]/30 print:text-black print:p-0">
                {merTextContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
