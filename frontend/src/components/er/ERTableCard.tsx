import React, { useState } from 'react';
import {
  ER_CARD_WIDTH,
  ER_COLLAPSED_FOOTER_HEIGHT,
  ER_COLUMN_PADDING_Y,
  ER_DATA_PEEK_HEIGHT,
  ER_HEADER_HEIGHT,
  ER_ROW_HEIGHT,
  ER_TRIGGER_ROW_HEIGHT,
  ER_TRIGGERS_HEADER_HEIGHT,
  getVisibleColumnsForCard,
} from '../../services/erLayoutEngine';
import {
  SQLEDITOR_CARD_PALETTE,
  type ERColumnCategory,
  type ERRelationshipEdge,
  type ERTableNode,
  type ERTablePosition,
  type ERTableVisualMeta,
} from '../../types/erStudio';

interface ERTableCardProps {
  table: ERTableNode;
  position: ERTablePosition;
  relationships: ERRelationshipEdge[];
  meta?: ERTableVisualMeta;
  isDragging: boolean;
  isSelected: boolean;
  isSearchMatch: boolean;
  isDimmed: boolean;
  isPresentationMode?: boolean;
  enableVisualConnect?: boolean;
  onMouseDownHeader: (tableName: string, e: React.MouseEvent) => void;
  onHoverTable: (tableName: string | null) => void;
  onSelectTable: (tableName: string) => void;
  onDoubleClickQuery?: (tableName: string) => void;
  onUpdateMeta: (tableName: string, patch: Partial<ERTableVisualMeta>) => void;
  onRequestDataPeek?: (tableName: string) => void;
  onStartConnectColumn?: (
    tableName: string,
    columnName: string,
    anchorYOffset: number,
    e: React.MouseEvent
  ) => void;
  onCompleteConnectColumn?: (targetTable: string, targetColumn: string) => void;
  isConnectingActive?: boolean;
  selectedColumn?: { tableName: string; columnName: string } | null;
  onSelectColumn?: (tableName: string, columnName: string) => void;
}

function getCategoryGlyph(category: ERColumnCategory): string {
  switch (category) {
    case 'numeric':
      return '#';
    case 'text':
      return 'Aa';
    case 'datetime':
      return '⏱';
    case 'boolean':
      return '✓';
    case 'json':
      return '{}';
    default:
      return '•';
  }
}

export const ERTableCard: React.FC<ERTableCardProps> = ({
  table,
  position,
  relationships,
  meta,
  isDragging,
  isSelected,
  isSearchMatch,
  isDimmed,
  isPresentationMode = false,
  enableVisualConnect = false,
  onMouseDownHeader,
  onHoverTable,
  onSelectTable,
  onDoubleClickQuery,
  onUpdateMeta,
  onRequestDataPeek,
  onStartConnectColumn,
  onCompleteConnectColumn,
  isConnectingActive = false,
  selectedColumn,
  onSelectColumn,
}) => {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isLocked = Boolean(meta?.locked);
  const isCollapsed = Boolean(meta?.collapsed);
  const viewMode = meta?.viewMode || 'structure';
  const stripColor = meta?.colorStrip || '#FF6B00';

  const { visibleColumns, hiddenCount } = getVisibleColumnsForCard(
    table,
    relationships,
    isCollapsed
  );

  const handleToggleDataPeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode = viewMode === 'data' ? 'structure' : 'data';
    if (nextMode === 'data' && onRequestDataPeek) {
      onRequestDataPeek(table.name);
    }
    onUpdateMeta(table.name, { viewMode: nextMode });
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${ER_CARD_WIDTH}px`,
        opacity: isDimmed ? 0.35 : 1,
      }}
      onMouseEnter={() => onHoverTable(table.name)}
      onMouseLeave={() => {
        onHoverTable(null);
        setPaletteOpen(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectTable(table.name);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onDoubleClickQuery) onDoubleClickQuery(table.name);
      }}
      className={`rounded-lg bg-[var(--bg-secondary)] border transition-shadow select-none flex flex-col overflow-visible ${
        isDragging
          ? 'border-[#FF6B00] shadow-[0_12px_28px_rgba(255,107,0,0.35)] z-30'
          : isSearchMatch
          ? 'border-[var(--status-success)] ring-2 ring-[var(--status-success)]/40 shadow-lg z-25'
          : isSelected
          ? 'border-[var(--accent-yellow)] ring-1 ring-[var(--accent-yellow)]/40 shadow-lg z-25'
          : 'border-[var(--border-color)] hover:border-[var(--accent-yellow)]/80 shadow-md z-20'
      }`}
    >
      {/* Faixa Superior de Cor Customizável (4px) + Cabeçalho (40px) = ER_HEADER_HEIGHT (44px) */}
      <div
        style={{ height: `${ER_HEADER_HEIGHT}px` }}
        onMouseDown={(e) => {
          if (!isLocked) {
            onMouseDownHeader(table.name, e);
          }
        }}
        className={`flex flex-col rounded-t-lg overflow-hidden bg-[var(--bg-surface)] border-b border-[var(--border-color)] ${
          isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div
          style={{ height: '4px', backgroundColor: stripColor }}
          className="w-full shrink-0"
        />

        <div className="flex-1 px-2.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="material-symbols-outlined text-[15px] shrink-0"
              style={{ color: stripColor }}
            >
              {table.isView ? 'visibility' : 'table_chart'}
            </span>
            <span
              className="font-mono font-bold text-xs text-[var(--text-primary)] truncate"
              title={table.comment ? `${table.name} — ${table.comment}` : table.name}
            >
              {table.name}
            </span>
          </div>

          {/* Controles Rápidos do Card */}
          <div
            className="flex items-center gap-0.5 shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Contagem de linhas / Toggle Amostra de Dados Ao Vivo */}
            <button
              type="button"
              onClick={handleToggleDataPeek}
              title={
                viewMode === 'data'
                  ? 'Voltar para estrutura de colunas'
                  : `Inspecionar amostra viva de dados (${table.rowCount} linhas)`
              }
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-0.5 border transition-colors cursor-pointer ${
                viewMode === 'data'
                  ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                  : 'bg-[var(--status-success)]/10 text-[var(--status-success)] border-[var(--status-success)]/30 hover:bg-[var(--status-success)]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {viewMode === 'data' ? 'view_column' : 'visibility'}
              </span>
              <span>{table.rowCount}</span>
            </button>

            {!isPresentationMode && (
              <>
                {/* Seletor de Cor da Faixa */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaletteOpen((p) => !p);
                  }}
                  title="Cor de destaque da entidade"
                  className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/30"
                    style={{ backgroundColor: stripColor }}
                  />
                </button>

                {/* Colapso Inteligente PK/FK */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateMeta(table.name, { collapsed: !isCollapsed });
                  }}
                  title={
                    isCollapsed
                      ? 'Expandir todos os atributos'
                      : 'Colapsar atributos comuns (mantém PKs e FKs conectadas)'
                  }
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    isCollapsed
                      ? 'text-[var(--accent-yellow)] bg-[var(--bg-hover)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isCollapsed ? 'unfold_more' : 'unfold_less'}
                  </span>
                </button>

                {/* Trava de Posição */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateMeta(table.name, { locked: !isLocked });
                  }}
                  title={isLocked ? 'Destravar posição da tabela' : 'Travar posição no canvas'}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                    isLocked
                      ? 'text-[#FF6B00] bg-[#FF6B00]/15'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isLocked ? 'lock' : 'lock_open'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Popover de Paleta Oficial SQLEditor */}
      {paletteOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-2 top-11 z-50 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md shadow-xl p-1.5 flex items-center gap-1.5"
        >
          {SQLEDITOR_CARD_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateMeta(table.name, { colorStrip: c.hex });
                setPaletteOpen(false);
              }}
              className={`w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-125 ${
                stripColor === c.hex ? 'ring-2 ring-white border-black' : 'border-black/30'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      {/* CORPO 1: Modo Estrutura de Colunas (geometria sincronizada com getColumnAnchorY) */}
      {viewMode === 'structure' ? (
        <>
          <div
            style={{
              paddingTop: `${ER_COLUMN_PADDING_Y}px`,
              paddingBottom: `${ER_COLUMN_PADDING_Y}px`,
            }}
            className="px-2 font-mono text-xs"
          >
            {visibleColumns.map((col, idx) => {
              const isColSelected =
                selectedColumn?.tableName === table.name &&
                selectedColumn?.columnName === col.name;
              const anchorYOffset =
                ER_HEADER_HEIGHT +
                ER_COLUMN_PADDING_Y +
                idx * ER_ROW_HEIGHT +
                ER_ROW_HEIGHT / 2;

              return (
                <div
                  key={col.name}
                  style={{ height: `${ER_ROW_HEIGHT}px` }}
                  onClick={(e) => {
                    if (isConnectingActive) return;
                    e.stopPropagation();
                    onSelectColumn?.(table.name, col.name);
                  }}
                  onMouseUp={(e) => {
                    if (isConnectingActive && onCompleteConnectColumn) {
                      e.stopPropagation();
                      onCompleteConnectColumn(table.name, col.name);
                    }
                  }}
                  className={`group/col relative flex items-center justify-between px-1.5 rounded transition-all cursor-pointer ${
                    isConnectingActive
                      ? 'hover:bg-[var(--status-success)]/20 cursor-crosshair'
                      : isColSelected
                      ? 'bg-[var(--accent-orange)]/25 ring-1 ring-[#FF6B00] text-[var(--text-primary)] font-semibold'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                  title={`Clique para editar ou excluir "${table.name}.${col.name}" no painel à esquerda`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    {col.isPrimary ? (
                      <span
                        className="material-symbols-outlined text-[13px] text-[var(--accent-yellow)] shrink-0"
                        title="Chave Primária (PRIMARY KEY)"
                      >
                        key
                      </span>
                    ) : col.isForeignKey ? (
                      <span
                        className={`material-symbols-outlined text-[13px] shrink-0 ${
                          col.isExplicitForeignKey
                            ? 'text-[#FF6B00]'
                            : 'text-[var(--schema-icon-color)]'
                        }`}
                        title={
                          col.isExplicitForeignKey
                            ? `Chave Estrangeira Explícita ➔ ${col.fkTarget?.table}(${col.fkTarget?.column})`
                            : `Chave Estrangeira Inferida pelo nome ➔ ${col.fkTarget?.table}(${col.fkTarget?.column})`
                        }
                      >
                        link
                      </span>
                    ) : (
                      <span
                        className="w-3.5 text-center text-[10px] font-bold shrink-0"
                        style={{ color: 'var(--schema-icon-color)' }}
                      >
                        {getCategoryGlyph(col.category)}
                      </span>
                    )}

                    <span
                      className={`truncate ${
                        col.isPrimary
                          ? 'text-[var(--accent-yellow)] font-bold'
                          : col.isForeignKey
                          ? col.isExplicitForeignKey
                            ? 'text-[#FF6B00] font-semibold'
                            : 'text-[var(--text-primary)] font-medium underline decoration-dashed decoration-[var(--text-muted)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                      title={
                        col.comment
                          ? `${col.name} (${col.type}) — ${col.comment}`
                          : `${col.name} (${col.type})`
                      }
                    >
                      {col.name}
                    </span>
                  </div>

                  {/* Badges de Restrição + Tipo SQL */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!col.isNullable && !col.isPrimary && (
                      <span
                        title="NOT NULL"
                        className="px-1 rounded text-[8.5px] font-bold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                      >
                        NN
                      </span>
                    )}
                    {col.isUnique && !col.isPrimary && (
                      <span
                        title="UNIQUE"
                        className="px-1 rounded text-[8.5px] font-bold bg-[#29B6F6]/15 text-[#29B6F6] border border-[#29B6F6]/30"
                      >
                        UQ
                      </span>
                    )}
                    {col.isForeignKey && !col.isExplicitForeignKey && (
                      <span
                        title="FK inferida heuristicamente pelo nome (sem constraint FOREIGN KEY declarada)"
                        className="px-1 rounded text-[8.5px] font-bold bg-[var(--bg-surface)] text-[var(--text-muted)] border border-dashed border-[var(--border-color)]"
                      >
                        INF
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">
                      {col.type}
                    </span>

                    {/* Pino de Conexão Visual (Drag-to-Connect FK) no Estúdio DER */}
                    {enableVisualConnect && !isPresentationMode && onStartConnectColumn && (
                      <button
                        type="button"
                        title={`Arraste de ${table.name}.${col.name} até a coluna PK de outra tabela para criar FOREIGN KEY`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onStartConnectColumn(table.name, col.name, anchorYOffset, e);
                        }}
                        className="opacity-0 group-hover/col:opacity-100 w-4 h-4 -mr-1 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow cursor-crosshair transition-opacity"
                      >
                        <span className="text-[10px] leading-none font-bold">+</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé de Colapso Inteligente */}
          {hiddenCount > 0 && (
            <button
              type="button"
              style={{ height: `${ER_COLLAPSED_FOOTER_HEIGHT}px` }}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateMeta(table.name, { collapsed: false });
              }}
              className="w-full px-3 bg-[var(--bg-surface)]/70 hover:bg-[var(--bg-hover)] border-t border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>+ {hiddenCount} atributo(s) oculto(s)</span>
              <span className="text-[var(--accent-yellow)] font-semibold">Expandir</span>
            </button>
          )}
        </>
      ) : (
        /* CORPO 2: Modo 👁️ Live Data Peek (Amostra Real de Registros dentro do Card!) */
        <div
          style={{ height: `${ER_DATA_PEEK_HEIGHT}px` }}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="p-2 overflow-auto bg-[var(--bg-primary)]/50 font-mono text-[10px]"
        >
          {table.sampleRows && table.sampleRows.length > 0 ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--accent-yellow)]">
                  {table.columns.slice(0, 5).map((c) => (
                    <th key={c.name} className="py-1 px-1.5 truncate max-w-[80px]">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.sampleRows.slice(0, 5).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-[var(--border-color)]/40 hover:bg-[var(--bg-hover)]"
                  >
                    {table.columns.slice(0, 5).map((c) => {
                      const val = row[c.name];
                      return (
                        <td
                          key={c.name}
                          className="py-1 px-1.5 truncate max-w-[84px] text-[var(--text-primary)]"
                          title={val === null || val === undefined ? 'NULL' : String(val)}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-[var(--text-muted)] italic">NULL</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] px-3">
              <span className="material-symbols-outlined text-[20px] mb-1 opacity-60">
                dataset
              </span>
              <span>Nenhum registro de amostra disponível para {table.name}.</span>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO ⚡ TRIGGERS (exibida automaticamente quando a tabela possui gatilhos) */}
      {table.triggers.length > 0 && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-surface)]/80 px-2.5 py-1 rounded-b-lg">
          <div
            style={{ height: `${ER_TRIGGERS_HEADER_HEIGHT - 4}px` }}
            className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#FFA726]"
          >
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            <span>Triggers ({table.triggers.length})</span>
          </div>
          {table.triggers.map((trg) => (
            <div
              key={trg.name}
              style={{ height: `${ER_TRIGGER_ROW_HEIGHT}px` }}
              className="flex items-center justify-between gap-1 text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-color)]/40"
              title={`${trg.timing} ${trg.events.join('/')} — ${trg.name}${
                trg.writesTo.length > 0 ? ` (afeta: ${trg.writesTo.join(', ')})` : ''
              }`}
            >
              <span className="truncate font-semibold text-[var(--text-primary)]">
                {trg.name}
              </span>
              <span className="px-1 py-0.2 rounded bg-[#FFA726]/15 text-[#FFA726] border border-[#FFA726]/30 text-[9px] shrink-0">
                {trg.timing} {trg.events.join('|')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

