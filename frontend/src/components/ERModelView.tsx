import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildERGraphFromDatabaseSchema } from '../services/erLayoutEngine';
import {
  generateMarkdownDataDictionary,
  generateMermaidErDiagram,
  triggerBrowserDownload,
} from '../services/schemaExporters';
import { runPedagogicalSchemaLinter } from '../services/schemaLinter';
import { dbStorage } from '../services/storage';
import type { DatabaseSchema } from '../types';
import type {
  NormalizationChecklistState,
  StoredDictionaryMeta,
} from '../types/erStudio';
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from '../types/preferences';

export interface ERModelViewProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  preferences?: AppPreferences;
  onSelectDatabase?: (dbName: string) => void;
  onSelectTableForQuery: (dbName: string, tableName: string) => void;
}

export const ERModelView: React.FC<ERModelViewProps> = ({
  schemas,
  activeDatabase,
  preferences = DEFAULT_APP_PREFERENCES,
  onSelectDatabase,
  onSelectTableForQuery,
}) => {
  const [selectedDb, setSelectedDb] = useState<string>(
    activeDatabase || schemas[0]?.name || ''
  );
  const prevActiveDbProp = useRef<string>(activeDatabase);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewFormat, setViewFormat] = useState<'cards' | 'text' | 'mermaid'>('cards');
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  // Estado persistente do Dicionário de Dados & Checklist 1FN-3FN no Dexie
  const [dictMeta, setDictMeta] = useState<StoredDictionaryMeta>({
    id: `dict:${selectedDb || 'default'}`,
    dbName: selectedDb || 'default',
    tableComments: {},
    columnComments: {},
    normalizationChecks: {},
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (activeDatabase && activeDatabase !== prevActiveDbProp.current) {
      prevActiveDbProp.current = activeDatabase;
      setSelectedDb(activeDatabase);
    } else if (!selectedDb && schemas.length > 0) {
      setSelectedDb(schemas[0].name);
    }
  }, [activeDatabase, schemas, selectedDb]);

  const currentDb = useMemo(
    () => schemas.find((s) => s.name === selectedDb) || schemas[0],
    [schemas, selectedDb]
  );

  const effectiveDbName = currentDb?.name || selectedDb || '';

  // Carrega metadados salvos do Dicionário de Dados quando o banco selecionado muda
  useEffect(() => {
    if (!effectiveDbName) return;
    let active = true;
    const dictId = `dict:${effectiveDbName}`;

    dbStorage.dictionaryMeta
      .get(dictId)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          setDictMeta(saved);
        } else {
          setDictMeta({
            id: dictId,
            dbName: effectiveDbName,
            tableComments: {},
            columnComments: {},
            normalizationChecks: {},
            updatedAt: new Date().toISOString(),
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [effectiveDbName]);

  const persistDictionary = useCallback(
    async (next: StoredDictionaryMeta) => {
      setDictMeta(next);
      if (!effectiveDbName) return;
      try {
        await dbStorage.dictionaryMeta.put({
          ...next,
          id: `dict:${effectiveDbName}`,
          dbName: effectiveDbName,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Ignora erro de quota
      }
    },
    [effectiveDbName]
  );

  const handleUpdateTableComment = (tableName: string, comment: string) => {
    persistDictionary({
      ...dictMeta,
      tableComments: {
        ...dictMeta.tableComments,
        [tableName]: comment,
      },
    });
  };

  const handleUpdateColumnComment = (
    tableName: string,
    columnName: string,
    comment: string
  ) => {
    const key = `${tableName}.${columnName}`;
    persistDictionary({
      ...dictMeta,
      columnComments: {
        ...dictMeta.columnComments,
        [key]: comment,
      },
    });
  };

  const handleToggleNormalization = (
    tableName: string,
    fnKey: keyof Pick<NormalizationChecklistState, 'fn1' | 'fn2' | 'fn3'>
  ) => {
    const current: NormalizationChecklistState = dictMeta.normalizationChecks[
      tableName
    ] || {
      fn1: false,
      fn2: false,
      fn3: false,
    };
    persistDictionary({
      ...dictMeta,
      normalizationChecks: {
        ...dictMeta.normalizationChecks,
        [tableName]: {
          ...current,
          [fnKey]: !current[fnKey],
        },
      },
    });
  };

  const handleDbChange = (newDb: string) => {
    setSelectedDb(newDb);
    onSelectDatabase?.(newDb);
  };

  // Grafo ER unificado + Linter Pedagógico 1FN-3FN
  const { tables, relationships } = useMemo(
    () =>
      buildERGraphFromDatabaseSchema(currentDb, {
        inferImplicitForeignKeys: preferences.er.inferImplicitForeignKeys,
        dictionaryTableComments: dictMeta.tableComments,
        dictionaryColumnComments: dictMeta.columnComments,
      }),
    [currentDb, preferences.er.inferImplicitForeignKeys, dictMeta]
  );

  const lintIssues = useMemo(
    () =>
      runPedagogicalSchemaLinter(
        tables,
        relationships,
        preferences.pedagogy.linterStrictness
      ),
    [tables, relationships, preferences.pedagogy.linterStrictness]
  );

  const totalColumnsCount = useMemo(
    () => tables.reduce((acc, t) => acc + t.columns.length, 0),
    [tables]
  );

  const normalizedTablesCount = useMemo(
    () =>
      tables.filter((t) => {
        const c = dictMeta.normalizationChecks[t.name];
        return c?.fn1 && c?.fn2 && c?.fn3;
      }).length,
    [tables, dictMeta.normalizationChecks]
  );

  // Notação Textual Formal (MER Clássico enriquecido com Dicionário e 1FN-3FN)
  const merTextContent = useMemo(() => {
    if (!currentDb || tables.length === 0) {
      return '-- Nenhum banco de dados ou tabela carregada no momento.\n';
    }

    const lines: string[] = [];
    const timestamp = new Date().toLocaleString('pt-BR');

    lines.push('================================================================================');
    lines.push(' MODELO LÓGICO RELACIONAL (MER) & DICIONÁRIO DE DADOS (1FN–3FN)');
    lines.push(` Banco de Dados: ${currentDb.name}`);
    lines.push(` Gerado em: ${timestamp}`);
    lines.push(' Ferramenta: SQLEditor — Central da Disciplina de Banco de Dados');
    lines.push('================================================================================\n');

    lines.push('--------------------------------------------------------------------------------');
    lines.push(` 1. ESQUEMA LÓGICO DAS RELAÇÕES - Total: ${tables.length} entidade(s)`);
    lines.push('--------------------------------------------------------------------------------\n');

    for (const table of tables) {
      const desc = dictMeta.tableComments[table.name];
      const norm = dictMeta.normalizationChecks[table.name];
      if (desc) {
        lines.push(`-- Descrição: ${desc}`);
      }
      if (norm) {
        lines.push(
          `-- Normalização validada: 1FN[${norm.fn1 ? 'OK' : ' '}] 2FN[${
            norm.fn2 ? 'OK' : ' '
          }] 3FN[${norm.fn3 ? 'OK' : ' '}]`
        );
      }
      lines.push(`${table.name} (`);
      const colLines = table.columns.map((col) => {
        const modifiers: string[] = [];
        if (col.isPrimary) modifiers.push('PK');
        if (col.isForeignKey && col.fkTarget) {
          modifiers.push(
            `${col.isExplicitForeignKey ? 'FK' : 'FK-Inferida'} -> ${col.fkTarget.table}(${
              col.fkTarget.column
            })`
          );
        }
        if (!col.isNullable && !col.isPrimary) modifiers.push('NOT NULL');
        if (col.isUnique && !col.isPrimary) modifiers.push('UNIQUE');

        const colComment = dictMeta.columnComments[`${table.name}.${col.name}`];
        const modStr = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
        const commentStr = colComment ? ` -- ${colComment}` : '';
        return `    ${col.name.padEnd(24)} ${col.type}${modStr}${commentStr}`;
      });
      lines.push(colLines.join(',\n'));
      lines.push(');\n');
    }

    lines.push('--------------------------------------------------------------------------------');
    lines.push(
      ` 2. INTEGRIDADE REFERENCIAL & CARDINALIDADES - Total: ${relationships.length} relação(ões)`
    );
    lines.push('--------------------------------------------------------------------------------\n');

    if (relationships.length === 0) {
      lines.push('  (Nenhum relacionamento explícito ou inferido detectado nesta base)\n');
    } else {
      relationships.forEach((rel, idx) => {
        const tag = rel.isExplicit ? '[EXPLÍCITA]' : '[INFERIDA] ';
        lines.push(
          `  [${String(idx + 1).padStart(2, '0')}] ${tag} ${rel.sourceTable}(${
            rel.sourceColumn
          }) [N] ────── (1) ${rel.targetTable}(${rel.targetColumn})`
        );
      });
      lines.push('');
    }

    lines.push('================================================================================');
    return lines.join('\n');
  }, [currentDb, tables, relationships, dictMeta]);

  const mermaidContent = useMemo(
    () => generateMermaidErDiagram(effectiveDbName || 'esquema', tables, relationships),
    [effectiveDbName, tables, relationships]
  );

  const flashFeedback = (label: string) => {
    setCopiedFeedback(label);
    setTimeout(() => setCopiedFeedback(null), 2200);
  };

  const handleCopyContent = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashFeedback(label);
    } catch {
      // Sem permissão de clipboard
    }
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownDataDictionary(
      effectiveDbName || 'esquema',
      tables,
      relationships,
      dictMeta
    );
    triggerBrowserDownload(
      new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      `dicionario_${effectiveDbName || 'esquema'}.md`
    );
    flashFeedback('Markdown (.md) baixado!');
  };

  const filteredTables = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return tables;
    return tables.filter((t) => {
      const desc = (dictMeta.tableComments[t.name] || '').toLowerCase();
      return (
        t.name.toLowerCase().includes(term) ||
        desc.includes(term) ||
        t.columns.some(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (dictMeta.columnComments[`${t.name}.${c.name}`] || '')
              .toLowerCase()
              .includes(term)
        )
      );
    });
  }, [tables, searchTerm, dictMeta]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden transition-colors relative print:bg-white print:text-black">
      {/* 1. Barra Superior com Ferramentas, Seletor e Exportadores */}
      <div
        data-print-hide
        className="px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-sm print:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Modelo Lógico &amp; Dicionário de Dados
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30">
                {tables.length} entidades • {totalColumnsCount} atributos • {relationships.length} FKs
              </span>
              {tables.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--status-success)]/15 text-[var(--status-success)] border border-[var(--status-success)]/30">
                  3FN: {normalizedTablesCount}/{tables.length} auditadas
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Documente semântica de tabelas/colunas, valide Formas Normais (1FN–3FN) e exporte em Markdown, Mermaid ou PDF.
            </p>
          </div>
        </div>

        {/* Controles e Exportadores */}
        <div className="flex flex-wrap items-center gap-2">
          {copiedFeedback && (
            <span className="px-2.5 py-1 rounded bg-[var(--status-success)]/15 border border-[var(--status-success)]/40 text-[var(--status-success)] text-[11px] font-bold">
              {copiedFeedback}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-[var(--text-muted)]">Banco:</span>
            <select
              value={selectedDb}
              onChange={(e) => handleDbChange(e.target.value)}
              className="bg-[var(--bg-secondary)] text-[var(--accent-yellow)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-[#FF6B00] cursor-pointer"
            >
              {schemas.length === 0 ? (
                <option value="">Nenhum banco carregado</option>
              ) : (
                schemas.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.tables.length} tabelas)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Alternador das 3 Visões: Dicionário Cards | Texto MER | Mermaid */}
          <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-0.5">
            {[
              { id: 'cards' as const, icon: 'grid_view', label: 'Dicionário 1FN–3FN' },
              { id: 'text' as const, icon: 'code', label: 'Texto MER' },
              { id: 'mermaid' as const, icon: 'schema', label: 'Mermaid' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewFormat(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  viewFormat === tab.id
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-yellow)] font-bold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            disabled={tables.length === 0}
            title="Baixar Dicionário de Dados completo em Markdown (.md) com diagrama Mermaid embutido"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-xs font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-[var(--status-success)]">
              description
            </span>
            <span className="hidden xl:inline">Markdown (.md)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={tables.length === 0}
            title="Imprimir ou salvar especificação em PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Corpo Principal */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
        {/* Cabeçalho exclusivo de Impressão / PDF */}
        <div className="hidden print:block mb-6 border-b-2 border-black pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold font-mono text-black uppercase">
                MODELO LÓGICO &amp; DICIONÁRIO DE DADOS — {effectiveDbName}
              </h1>
              <p className="text-xs text-gray-700 font-mono">
                SQLEditor — Central da Disciplina de Banco de Dados
              </p>
            </div>
            <div className="text-right text-[10px] font-mono text-gray-600">
              <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>
                {tables.length} entidades • {relationships.length} relacionamentos
              </p>
            </div>
          </div>
        </div>

        {tables.length === 0 ? (
          <div className="max-w-lg mx-auto my-16 p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[var(--accent-yellow)]">
              menu_book
            </span>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Nenhum Banco de Dados Carregado
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Acesse a <strong>Galeria &amp; Prática Guiada</strong> para carregar um banco de aula ou crie suas tabelas no <strong>Laboratório SQL</strong> para documentar o Dicionário de Dados e auditar as Formas Normais (1FN–3FN).
            </p>
          </div>
        ) : viewFormat === 'cards' ? (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filtro + Resumo do Linter Pedagógico */}
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2 text-[16px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filtrar por entidade, atributo ou descrição semântica..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
                <span>
                  Exibindo{' '}
                  <strong className="text-[var(--text-primary)]">
                    {filteredTables.length}
                  </strong>{' '}
                  de {tables.length} entidades
                </span>
                <span
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                    lintIssues.length === 0
                      ? 'bg-[var(--status-success)]/10 border-[var(--status-success)]/40 text-[var(--status-success)]'
                      : 'bg-[#FF6B00]/10 border-[#FF6B00]/40 text-[#FF6B00]'
                  }`}
                >
                  {lintIssues.length === 0
                    ? 'Linter: 0 anomalias'
                    : `Linter: ${lintIssues.length} observação(ões)`}
                </span>
              </div>
            </div>

            {/* Cartões de Dicionário de Dados Editáveis + Checklist 1FN/2FN/3FN */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredTables.map((table) => {
                const tableRels = relationships.filter(
                  (r) =>
                    r.sourceTable.toLowerCase() === table.name.toLowerCase() ||
                    r.targetTable.toLowerCase() === table.name.toLowerCase()
                );
                const tableIssues = lintIssues.filter(
                  (i) => i.tableName?.toLowerCase() === table.name.toLowerCase()
                );
                const normState = dictMeta.normalizationChecks[table.name] || {
                  fn1: false,
                  fn2: false,
                  fn3: false,
                };

                return (
                  <div
                    key={table.name}
                    className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm hover:border-[#FF6B00]/60 transition-all flex flex-col print:border print:border-gray-300 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Cabeçalho da Entidade + Checklist 1FN / 2FN / 3FN */}
                    <div className="px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] space-y-2 print:bg-gray-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-[18px] text-[#FF6B00]">
                            table_chart
                          </span>
                          <span className="font-mono font-bold text-sm text-[var(--text-primary)] truncate">
                            {table.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--status-success)]/10 text-[var(--status-success)] border border-[var(--status-success)]/30 font-bold">
                            {table.rowCount} reg
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Checkboxes interativos 1FN, 2FN e 3FN */}
                          {(
                            [
                              {
                                key: 'fn1' as const,
                                label: '1FN',
                                tip: '1ª Forma Normal: atributos atômicos e sem grupos repetitivos',
                              },
                              {
                                key: 'fn2' as const,
                                label: '2FN',
                                tip: '2ª Forma Normal: sem dependência parcial de chave primária composta',
                              },
                              {
                                key: 'fn3' as const,
                                label: '3FN',
                                tip: '3ª Forma Normal: sem dependência transitiva entre atributos não-chave',
                              },
                            ] as const
                          ).map((fn) => {
                            const checked = normState[fn.key];
                            return (
                              <button
                                key={fn.key}
                                type="button"
                                title={fn.tip}
                                onClick={() => handleToggleNormalization(table.name, fn.key)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-[var(--status-success)]/20 border-[var(--status-success)]/50 text-[var(--status-success)]'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {checked ? `✓ ${fn.label}` : fn.label}
                              </button>
                            );
                          })}

                          {currentDb && (
                            <button
                              type="button"
                              onClick={() =>
                                onSelectTableForQuery(currentDb.name, table.name)
                              }
                              title="Consultar SELECT * desta tabela no Laboratório SQL"
                              className="print:hidden w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-yellow)] rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                open_in_new
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Descrição Semântica da Entidade (Salva automaticamente no Dexie) */}
                      <input
                        type="text"
                        value={dictMeta.tableComments[table.name] || ''}
                        onChange={(e) =>
                          handleUpdateTableComment(table.name, e.target.value)
                        }
                        placeholder="Clique para descrever o papel desta entidade no domínio..."
                        className="w-full px-2.5 py-1 rounded bg-[var(--bg-primary)]/60 border border-[var(--border-color)] text-xs text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B00]"
                      />

                      {/* Alertas do Linter Pedagógico específicos desta tabela */}
                      {tableIssues.length > 0 && (
                        <div className="space-y-1 pt-0.5 print:hidden">
                          {tableIssues.map((iss) => (
                            <div
                              key={iss.id}
                              className="px-2.5 py-1.5 rounded bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[11px] text-[var(--text-primary)] flex items-start gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[14px] text-[#FF6B00] shrink-0 mt-0.5">
                                school
                              </span>
                              <div>
                                <strong className="text-[#FF6B00]">{iss.code}: </strong>
                                <span>{iss.message}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grade de Atributos com Descrição Semântica Inline */}
                    <div className="divide-y divide-[var(--border-color)]/60 flex-1 text-xs">
                      {table.columns.map((col) => {
                        const commentKey = `${table.name}.${col.name}`;
                        return (
                          <div
                            key={col.name}
                            className="px-4 py-2 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-[var(--bg-hover)]/40 transition-colors"
                          >
                            <div className="flex items-center justify-between sm:w-60 shrink-0 gap-2 font-mono">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {col.isPrimary ? (
                                  <span
                                    className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)] shrink-0"
                                    title="Chave Primária (PK)"
                                  >
                                    key
                                  </span>
                                ) : col.isForeignKey ? (
                                  <span
                                    className="material-symbols-outlined text-[14px] text-[#FF6B00] shrink-0"
                                    title={
                                      col.fkTarget
                                        ? `FK -> ${col.fkTarget.table}(${col.fkTarget.column})`
                                        : 'Chave Estrangeira'
                                    }
                                  >
                                    link
                                  </span>
                                ) : (
                                  <span className="w-3.5 text-center text-[var(--schema-icon-color)] text-[10px] shrink-0">
                                    •
                                  </span>
                                )}
                                <span
                                  className={`truncate ${
                                    col.isPrimary
                                      ? 'text-[var(--accent-yellow)] font-bold'
                                      : col.isForeignKey
                                      ? 'text-[#FF6B00] font-semibold'
                                      : 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  {col.name}
                                </span>
                              </div>

                              <span className="text-[10px] text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0">
                                {col.type}
                              </span>
                            </div>

                            <input
                              type="text"
                              value={dictMeta.columnComments[commentKey] || ''}
                              onChange={(e) =>
                                handleUpdateColumnComment(
                                  table.name,
                                  col.name,
                                  e.target.value
                                )
                              }
                              placeholder={
                                col.fkTarget
                                  ? `Referencia ${col.fkTarget.table}(${col.fkTarget.column})...`
                                  : 'Significado / domínio do atributo...'
                              }
                              className="flex-1 bg-transparent border-b border-transparent focus:border-[#FF6B00] text-xs text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:outline-none py-0.5"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Rodapé de Integridade Referencial da Tabela */}
                    {tableRels.length > 0 && (
                      <div className="px-4 py-2 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-color)] text-[11px] font-mono space-y-1">
                        {tableRels.map((r) => (
                          <div
                            key={r.id}
                            className="text-[10px] text-[var(--text-secondary)] truncate flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-[#FF6B00]">➔</span>
                              <span>
                                {r.sourceTable === table.name
                                  ? `${r.sourceColumn} referencia ${r.targetTable}(${r.targetColumn})`
                                  : `Referenciada por ${r.sourceTable}(${r.sourceColumn})`}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] px-1 rounded ${
                                r.isExplicit
                                  ? 'text-[var(--status-success)]'
                                  : 'text-[var(--accent-yellow)]'
                              }`}
                            >
                              {r.isExplicit ? 'FK Explícita' : 'FK Inferida'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewFormat === 'text' ? (
          /* Visão 2: Especificação Textual Formal (MER Clássico) */
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">
                    terminal
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    mer_relacional_{effectiveDbName}.txt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyContent(merTextContent, 'Texto MER copiado!')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-mono cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] text-[var(--accent-yellow)]">
                    content_copy
                  </span>
                  <span>Copiar Texto MER</span>
                </button>
              </div>
              <pre className="p-4 sm:p-6 font-mono text-xs leading-relaxed text-[var(--text-primary)] overflow-x-auto whitespace-pre selection:bg-[#FF6B00]/30 print:text-black print:p-0">
                {merTextContent}
              </pre>
            </div>
          </div>
        ) : (
          /* Visão 3: Código Mermaid (erDiagram) para GitHub / Notion / TCC */
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#29B6F6]">
                    schema
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    diagrama_{effectiveDbName}.mmd (Mermaid erDiagram)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyContent(mermaidContent, 'Código Mermaid copiado!')
                  }
                  className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-mono cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#29B6F6]">
                    content_copy
                  </span>
                  <span>Copiar Mermaid</span>
                </button>
              </div>
              <pre className="p-4 sm:p-6 font-mono text-xs leading-relaxed text-[var(--text-primary)] overflow-x-auto whitespace-pre selection:bg-[#FF6B00]/30">
                {mermaidContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
