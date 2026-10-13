import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { DatabaseSchema, TableSchema, ColumnSchema } from '../types';

interface ERDiagramViewProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  onSelectTableForQuery: (dbName: string, tableName: string) => void;
}

interface TablePosition {
  x: number;
  y: number;
}

interface Relationship {
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
  cardinality: string; // Ex: '1:N'
}

const TABLE_WIDTH = 260;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 28;

// Normalização inteligente de nomes de entidades relacionais (suporte completo a singulares, plurais e prefixos)
function cleanEntityName(name: string): string {
  let s = name.toLowerCase().trim();
  // Remove crases e aspas
  s = s.replace(/[`'"]/g, '');
  // Remove prefixos de tabelas
  s = s.replace(/^(tb_|tbl_|tab_|t_)/, '');
  // Remove prefixos de chaves
  s = s.replace(/^(id_|cod_|codigo_|cd_|fk_)/, '');
  // Remove sufixos de chaves
  s = s.replace(/(_id|_fk|_cod|_codigo)$/, '');
  if (s.endsWith('id') && s.length > 2) {
    s = s.slice(0, -2);
  }

  // Plurais em Português e Inglês:
  // 1. -eis -> -el (responsaveis -> responsavel, papeis -> papel, niveis -> nivel, imoveis -> imovel)
  if (s.endsWith('eis')) {
    s = s.replace(/eis$/, 'el');
  }
  // 2. -oes -> -ao (secoes -> secao, permissoes -> permissao)
  else if (s.endsWith('oes')) {
    s = s.replace(/oes$/, 'ao');
  }
  // 3. -ais -> -al (filiais -> filial, canais -> canal)
  else if (s.endsWith('ais')) {
    s = s.replace(/ais$/, 'al');
  }
  // 4. -ois -> -ol
  else if (s.endsWith('ois')) {
    s = s.replace(/ois$/, 'ol');
  }
  // 5. -uis -> -ul
  else if (s.endsWith('uis')) {
    s = s.replace(/uis$/, 'ul');
  }
  // 6. -ns -> -m (itens -> item, armazens -> armazem)
  else if (s.endsWith('ns')) {
    s = s.replace(/ns$/, 'm');
  }
  // 7. -ores -> -or (professores -> professor, autores -> autor)
  else if (s.endsWith('ores')) {
    s = s.replace(/ores$/, 'or');
  }
  // 8. -res -> -r
  else if (s.endsWith('res')) {
    s = s.replace(/res$/, 'r');
  }
  // 9. -es -> "" (cidades -> cidade, etc.)
  else if (s.endsWith('es') && s.length > 3) {
    s = s.replace(/es$/, '');
  }
  // 10. -s -> "" (cursos -> curso, turmas -> turma, alunos -> aluno, pagamentos -> pagamento)
  else if (s.endsWith('s') && s.length > 2) {
    s = s.slice(0, -1);
  }
  return s;
}

export const ERDiagramView: React.FC<ERDiagramViewProps> = ({
  schemas,
  activeDatabase,
  onSelectTableForQuery,
}) => {
  const [selectedDb, setSelectedDb] = useState(activeDatabase || schemas[0]?.name || '');
  const currentDb = schemas.find(s => s.name === selectedDb) || schemas[0];

  // Posições das tabelas no canvas
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  
  // Zoom e Pan do Canvas
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });

  // Estado de Arraste de Tabela ou Canvas
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Identifica relacionamentos entre tabelas (via foreignKeyRef explícita ou inferência relacional inteligente)
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

        // A. Prioridade: Chave Estrangeira declarada formalmente no AlaSQL / SQL
        if (col.foreignKeyRef && col.foreignKeyRef.table) {
          const refTableClean = col.foreignKeyRef.table.trim().toLowerCase().replace(/[`'"]/g, '');
          targetTable = tables.find(t => t.name.toLowerCase().replace(/[`'"]/g, '') === refTableClean);
          if (targetTable) {
            toColName = col.foreignKeyRef.column || 'id';
          }
        }

        // B. Inferência heurística robusta para chaves relacionais
        if (!targetTable && !isSelfPk) {
          const cleanCol = cleanEntityName(col.name);

          // 1. Procura tabela alvo cujo radical coincida
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

          // 2. Se não achou, testa por prefixo/sufixo direto
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
              cardinality: '1:N', // 1 tabela pai (PK) -> N tabela dependente (FK)
            });
          }
        }
      }
    }

    return rels;
  }, [currentDb]);

  // Função auxiliar segura para obter posição de uma tabela (case-insensitive e com fallback imediato)
  const getTablePos = useCallback((tableName: string): TablePosition => {
    if (positions[tableName]) return positions[tableName];
    const key = Object.keys(positions).find(k => k.toLowerCase() === tableName.toLowerCase());
    if (key && positions[key]) return positions[key];
    const idx = currentDb?.tables.findIndex(t => t.name.toLowerCase() === tableName.toLowerCase()) ?? 0;
    const colsCount = Math.max(2, Math.ceil(Math.sqrt(currentDb?.tables.length || 4)));
    const col = Math.max(0, idx) % colsCount;
    const row = Math.floor(Math.max(0, idx) / colsCount);
    return {
      x: 60 + col * 360,
      y: 60 + row * 320,
    };
  }, [positions, currentDb]);

  // 2. Inicializa layout organizado das tabelas em grid quando o banco muda
  useEffect(() => {
    if (!currentDb || currentDb.tables.length === 0) return;

    const newPos: Record<string, TablePosition> = {};
    const colsCount = Math.max(2, Math.ceil(Math.sqrt(currentDb.tables.length)));
    const spacingX = 360;
    const spacingY = 320;

    currentDb.tables.forEach((tbl, idx) => {
      const col = idx % colsCount;
      const row = Math.floor(idx / colsCount);
      newPos[tbl.name] = {
        x: 60 + col * spacingX,
        y: 60 + row * spacingY,
      };
    });

    setPositions(newPos);
  }, [selectedDb, currentDb]);

  // Atualiza banco selecionado caso activeDatabase mude externamente
  useEffect(() => {
    if (activeDatabase && activeDatabase !== selectedDb) {
      setSelectedDb(activeDatabase);
    }
  }, [activeDatabase]);

  // 3. Ajustar à Tela (Fit to View)
  const handleFitToView = useCallback(() => {
    if (!currentDb || currentDb.tables.length === 0 || !containerRef.current) return;

    const tableNames = Object.keys(positions);
    if (tableNames.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const name of tableNames) {
      const pos = positions[name];
      if (!pos) continue;
      const tbl = currentDb.tables.find(t => t.name === name);
      const h = HEADER_HEIGHT + (tbl ? tbl.columns.length * ROW_HEIGHT : 150);

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
      maxY = Math.max(maxY, pos.y + h);
    }

    const boundsWidth = Math.max(100, maxX - minX);
    const boundsHeight = Math.max(100, maxY - minY);

    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 100;

    const scaleX = (clientWidth - padding) / boundsWidth;
    const scaleY = (clientHeight - padding) / boundsHeight;
    const fitScale = Math.max(0.3, Math.min(1.4, Math.min(scaleX, scaleY)));

    const newZoom = Math.round(fitScale * 100);
    setZoom(newZoom);

    // Centraliza o conteúdo perfeitamente
    const centerX = (clientWidth - boundsWidth * fitScale) / 2 - minX * fitScale;
    const centerY = (clientHeight - boundsHeight * fitScale) / 2 - minY * fitScale;

    setPan({ x: Math.max(20, Math.round(centerX)), y: Math.max(20, Math.round(centerY)) });
  }, [currentDb, positions]);

  // 4. Arraste de Tabelas e Pan com suporte total a zoom
  const handleTableMouseDown = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = positions[tableName] || { x: 0, y: 0 };
    setDraggingTable(tableName);
    const scale = zoom / 100;
    setDragOffset({
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y,
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingTable) {
      const scale = zoom / 100;
      const newX = Math.max(0, Math.round(e.clientX / scale - dragOffset.x));
      const newY = Math.max(0, Math.round(e.clientY / scale - dragOffset.y));
      setPositions(prev => ({
        ...prev,
        [draggingTable]: { x: newX, y: newY }
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
    setIsPanning(false);
  };

  // 5. Exportar Diagrama ER para PNG
  const handleExportPNG = () => {
    if (!currentDb || currentDb.tables.length === 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calcula dimensões totais
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const tbl of currentDb.tables) {
      const pos = positions[tbl.name] || { x: 50, y: 50 };
      const h = HEADER_HEIGHT + tbl.columns.length * ROW_HEIGHT;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
      maxY = Math.max(maxY, pos.y + h);
    }

    const padding = 60;
    const headerBannerHeight = 80;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2 + headerBannerHeight;

    canvas.width = Math.max(800, width);
    canvas.height = Math.max(600, height);

    const isLight = document.documentElement.classList.contains('light');

    // Fundo
    ctx.fillStyle = isLight ? '#F4F6F9' : '#0F1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Banner Superior
    ctx.fillStyle = isLight ? '#E9ECEF' : '#161922';
    ctx.fillRect(0, 0, canvas.width, 70);

    ctx.fillStyle = isLight ? '#111827' : '#F0F4F8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`SQLEditor • Diagrama ER: ${currentDb.name}`, 30, 42);

    ctx.fillStyle = isLight ? '#1D4ED8' : '#FFE600';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`Professor William Devidé Komel • ${currentDb.tables.length} tabelas • ${relationships.length} relacionamentos`, 30, 62);

    const offsetX = padding - minX;
    const offsetY = padding + headerBannerHeight - minY;

    // Desenha Linhas de Relacionamento
    for (const rel of relationships) {
      const fromPos = getTablePos(rel.fromTable);
      const toPos = getTablePos(rel.toTable);

      const fromTbl = currentDb.tables.find(t => t.name.toLowerCase() === rel.fromTable.toLowerCase());
      const toTbl = currentDb.tables.find(t => t.name.toLowerCase() === rel.toTable.toLowerCase());

      const fromColIdx = Math.max(0, fromTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.fromCol.toLowerCase()) ?? 0);
      const toColIdx = Math.max(0, toTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.toCol.toLowerCase()) ?? 0);

      const fromY = fromPos.y + HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;
      const toY = toPos.y + HEADER_HEIGHT + toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + offsetY;

      let fromX: number;
      let toX: number;
      let cp1X: number;
      let cp2X: number;

      if (Math.abs(fromPos.x - toPos.x) < 60) {
        fromX = fromPos.x + TABLE_WIDTH + offsetX;
        toX = toPos.x + TABLE_WIDTH + offsetX;
        const arc = 70;
        cp1X = fromX + arc;
        cp2X = toX + arc;
      } else if (fromPos.x < toPos.x) {
        fromX = fromPos.x + TABLE_WIDTH + offsetX;
        toX = toPos.x + offsetX;
        const curvature = Math.max(45, Math.min(150, Math.abs(toX - fromX) * 0.45));
        cp1X = fromX + curvature;
        cp2X = toX - curvature;
      } else {
        fromX = fromPos.x + offsetX;
        toX = toPos.x + TABLE_WIDTH + offsetX;
        const curvature = Math.max(45, Math.min(150, Math.abs(fromX - toX) * 0.45));
        cp1X = fromX - curvature;
        cp2X = toX + curvature;
      }

      // Linha de Conexão Bézier
      ctx.beginPath();
      ctx.strokeStyle = isLight ? '#1D4ED8' : '#FFE600';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(cp1X, fromY, cp2X, toY, toX, toY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Círculo e Badge N no lado FK
      ctx.fillStyle = '#FF3366';
      ctx.beginPath();
      ctx.arc(fromX, fromY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', fromX, fromY);

      // Círculo e Badge 1 no lado PK
      ctx.fillStyle = isLight ? '#15803D' : '#00E676';
      ctx.beginPath();
      ctx.arc(toX, toY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', toX, toY);

      // Pílula central 1:N
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      ctx.fillStyle = isLight ? '#FFFFFF' : '#161922';
      ctx.strokeStyle = isLight ? '#CFD4DA' : '#2E3445';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(midX - 25, midY - 12, 50, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isLight ? '#1D4ED8' : '#FFE600';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('1 : N', midX, midY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // Desenha Tabelas
    for (const tbl of currentDb.tables) {
      const pos = positions[tbl.name] || { x: 50, y: 50 };
      const x = pos.x + offsetX;
      const y = pos.y + offsetY;
      const h = HEADER_HEIGHT + tbl.columns.length * ROW_HEIGHT;

      // Card Background
      ctx.fillStyle = isLight ? '#FFFFFF' : '#161922';
      ctx.strokeStyle = isLight ? '#CFD4DA' : '#2E3445';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, TABLE_WIDTH, h, 8);
      ctx.fill();
      ctx.stroke();

      // Card Header
      ctx.fillStyle = isLight ? '#E9ECEF' : '#1E222D';
      ctx.beginPath();
      ctx.roundRect(x, y, TABLE_WIDTH, HEADER_HEIGHT, [8, 8, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = isLight ? '#111827' : '#F0F4F8';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(tbl.name, x + 14, y + 26);

      // Colunas
      tbl.columns.forEach((col, idx) => {
        const rowY = y + HEADER_HEIGHT + idx * ROW_HEIGHT;
        const isPk = col.name.toLowerCase() === 'id' || col.isPrimary;
        const isFk = col.name.endsWith('_id');

        // Borda divisória sutil
        ctx.strokeStyle = isLight ? '#E5E7EB' : '#2E3445';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + 10, rowY);
        ctx.lineTo(x + TABLE_WIDTH - 10, rowY);
        ctx.stroke();

        // Nome da Coluna
        ctx.fillStyle = isPk
          ? (isLight ? '#1D4ED8' : '#FFE600')
          : isFk
          ? '#FF8533'
          : (isLight ? '#374151' : '#F0F4F8');

        ctx.font = isPk ? 'bold 11px "JetBrains Mono", monospace' : '11px "JetBrains Mono", monospace';
        const prefix = isPk ? '🔑 ' : isFk ? '🔗 ' : '   ';
        ctx.fillText(`${prefix}${col.name}`, x + 10, rowY + 18);

        // Tipo da Coluna
        ctx.fillStyle = isLight ? '#6B7280' : '#94A3B8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(col.type, x + TABLE_WIDTH - 65, rowY + 18);
      });
    }

    // Download da imagem PNG
    const link = document.createElement('a');
    link.download = `diagrama_er_${currentDb.name}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden select-none transition-colors relative">
      {/* Barra de Ferramentas Superior do Diagrama */}
      <div className="h-14 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--accent-yellow)]/15 border border-[var(--accent-yellow)]/30 flex items-center justify-center text-[var(--accent-yellow)]">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Diagrama ER (Entidade-Relacionamento)
              </h2>
              {relationships.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30">
                  {relationships.length} relacionamento(s)
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Relacionamentos com cardinalidades (1:N), chaves primárias e conectores interativos.
            </p>
          </div>
        </div>

        {/* Controles de Zoom, Fit e Exportação */}
        <div className="flex items-center gap-2">
          {/* Seletor de Banco */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">Banco:</span>
            <select
              value={selectedDb}
              onChange={(e) => setSelectedDb(e.target.value)}
              className="bg-[var(--bg-secondary)] text-[var(--accent-yellow)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-[#FF6B00]"
            >
              {schemas.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.tables.length} tabelas)
                </option>
              ))}
            </select>
          </div>

          {/* Zoom In / Out / Reset */}
          <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(30, z - 10))}
              title="Diminuir Zoom"
              className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <span className="px-2 text-[11px] font-mono text-[var(--text-secondary)] min-w-[42px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(200, z + 10))}
              title="Aumentar Zoom"
              className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
          </div>

          {/* Botão Ajustar à Tela (Fit to View) */}
          <button
            onClick={handleFitToView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Ajustar todas as tabelas na tela ao mesmo tempo"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
              fit_screen
            </span>
            <span>Ajustar à Tela</span>
          </button>

          {/* Botão Exportar PNG */}
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded text-xs font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(255,107,0,0.3)]"
            title="Exportar diagrama completo como imagem PNG"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">image</span>
            <span>Exportar PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Interativo do Diagrama ER */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing bg-[var(--bg-primary)]"
        style={{
          backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          }}
        >
          {/* 1. Cards Interativos das Tabelas (HTML Nodes) */}
          {currentDb?.tables.map((table) => {
            const pos = positions[table.name] || { x: 50, y: 50 };
            const isDragging = draggingTable === table.name;

            return (
              <div
                key={table.name}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${TABLE_WIDTH}px`,
                }}
                onMouseDown={(e) => handleTableMouseDown(table.name, e)}
                onDoubleClick={() => onSelectTableForQuery(currentDb.name, table.name)}
                className={`rounded-lg bg-[var(--bg-secondary)] border ${
                  isDragging
                    ? 'border-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.4)] z-30 scale-102'
                    : 'border-[var(--border-color)] hover:border-[var(--accent-yellow)] shadow-md z-20'
                } transition-shadow overflow-hidden flex flex-col select-none cursor-move`}
              >
                {/* Cabeçalho da Tabela */}
                <div className="h-10 px-3 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-[16px] text-[#FF8533]">
                      table_chart
                    </span>
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)] truncate">
                      {table.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--status-success)] bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 px-1.5 py-0.2 rounded font-bold">
                    {table.rowCount} linhas
                  </span>
                </div>

                {/* Lista de Colunas */}
                <div className="p-2 space-y-1 font-mono text-xs">
                  {table.columns.map((col) => {
                    const isPk = col.name.toLowerCase() === 'id' || col.isPrimary;
                    const isFk = col.name.endsWith('_id') || col.isForeignKey || !!col.foreignKeyRef || col.name.startsWith('id_');

                    return (
                      <div
                        key={col.name}
                        className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isPk ? (
                            <span
                              className="material-symbols-outlined text-[13px] text-[var(--accent-yellow)]"
                              title="Chave Primária (PK)"
                            >
                              key
                            </span>
                          ) : isFk ? (
                            <span
                              className="material-symbols-outlined text-[13px] text-[#FF8533]"
                              title="Chave Estrangeira (FK)"
                            >
                              link
                            </span>
                          ) : (
                            <span className="w-3.5 text-center text-[var(--text-muted)] text-[10px]">•</span>
                          )}
                          <span
                            className={`truncate ${
                              isPk
                                ? 'text-[var(--accent-yellow)] font-bold'
                                : isFk
                                ? 'text-[#FF8533] font-semibold'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase shrink-0">
                          {col.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 2. Camada SVG: Linhas de Conexão com Cardinalidade (Renderizada por cima com zIndex: 40 e pointerEvents: none) */}
          <svg
            width="8000"
            height="8000"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 40,
              overflow: 'visible',
            }}
          >
            {relationships.map((rel, i) => {
              const fromPos = getTablePos(rel.fromTable);
              const toPos = getTablePos(rel.toTable);

              const fromTbl = currentDb?.tables.find(t => t.name.toLowerCase() === rel.fromTable.toLowerCase());
              const toTbl = currentDb?.tables.find(t => t.name.toLowerCase() === rel.toTable.toLowerCase());

              const fromColIdx = Math.max(0, fromTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.fromCol.toLowerCase()) ?? 0);
              const toColIdx = Math.max(0, toTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.toCol.toLowerCase()) ?? 0);

              const fromY = fromPos.y + HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              const toY = toPos.y + HEADER_HEIGHT + toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

              let fromX: number;
              let toX: number;
              let cp1X: number;
              let cp2X: number;
              let isLeftToRight = true;

              if (Math.abs(fromPos.x - toPos.x) < 60) {
                fromX = fromPos.x + TABLE_WIDTH;
                toX = toPos.x + TABLE_WIDTH;
                const arc = 70;
                cp1X = fromX + arc;
                cp2X = toX + arc;
                isLeftToRight = true;
              } else if (fromPos.x < toPos.x) {
                fromX = fromPos.x + TABLE_WIDTH;
                toX = toPos.x;
                const curvature = Math.max(45, Math.min(150, Math.abs(toX - fromX) * 0.45));
                cp1X = fromX + curvature;
                cp2X = toX - curvature;
                isLeftToRight = true;
              } else {
                fromX = fromPos.x;
                toX = toPos.x + TABLE_WIDTH;
                const curvature = Math.max(45, Math.min(150, Math.abs(fromX - toX) * 0.45));
                cp1X = fromX - curvature;
                cp2X = toX + curvature;
                isLeftToRight = false;
              }

              const midX = (fromX + toX) / 2 + (Math.abs(fromPos.x - toPos.x) < 60 ? 40 : 0);
              const midY = (fromY + toY) / 2;

              const isLightMode = document.documentElement.classList.contains('light');
              const strokeColor = isLightMode ? '#1D4ED8' : '#FFE600';
              const pkColor = isLightMode ? '#15803D' : '#00E676';
              const pillBg = isLightMode ? '#FFFFFF' : '#1E222D';
              const pillBorder = isLightMode ? '#1D4ED8' : '#FF6B00';

              return (
                <g key={`${rel.fromTable}-${rel.fromCol}-${rel.toTable}-${i}`}>
                  {/* Linha de Conexão Curva Suave (Bézier Cúbica) */}
                  <path
                    d={`M ${fromX} ${fromY} C ${cp1X} ${fromY}, ${cp2X} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeDasharray="8 5"
                    opacity="0.95"
                  />

                  {/* Círculo de Ancoragem Lado FK */}
                  <circle
                    cx={fromX}
                    cy={fromY}
                    r="5"
                    fill="#FF3366"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />

                  {/* Círculo de Ancoragem Lado PK */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r="5"
                    fill={pkColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />

                  {/* Cardinalidade: Lado FK (N) */}
                  <g transform={`translate(${isLeftToRight ? fromX + 6 : fromX - 28}, ${fromY - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="22"
                      height="22"
                      rx="5"
                      fill="#FF3366"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x="11"
                      y="15"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      N
                    </text>
                  </g>

                  {/* Cardinalidade: Lado PK (1) */}
                  <g transform={`translate(${isLeftToRight ? toX - 28 : toX + 6}, ${toY - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="22"
                      height="22"
                      rx="5"
                      fill={pkColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <text
                      x="11"
                      y="15"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      1
                    </text>
                  </g>

                  {/* Tag Central com Cardinalidade 1:N */}
                  <g transform={`translate(${midX - 35}, ${midY - 14})`}>
                    <rect
                      x="0"
                      y="0"
                      width="70"
                      height="26"
                      rx="7"
                      fill={pillBg}
                      stroke={pillBorder}
                      strokeWidth="2"
                    />
                    <text
                      x="35"
                      y="18"
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      1 : N
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
