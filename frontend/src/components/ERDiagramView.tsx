import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { DatabaseSchema, TableSchema, ColumnSchema } from '../types';

interface ERDiagramViewProps {
  schemas: DatabaseSchema[];
  activeDatabase: string;
  onSelectDatabase?: (dbName: string) => void;
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
  cardinality: string;
}

const TABLE_WIDTH = 260;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 28;

const POSITIONS_STORAGE_KEY = 'sqleditor_er_positions_by_db';
const LINE_OFFSETS_STORAGE_KEY = 'sqleditor_er_line_offsets_by_db';

function getStoredPositionsByDb(): Record<string, Record<string, TablePosition>> {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

export interface LineOffset {
  x?: number;
  y?: number;
}

function getStoredLineOffsetsByDb(): Record<string, Record<string, LineOffset>> {
  try {
    const raw = localStorage.getItem(LINE_OFFSETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Suporte a migração se os valores eram apenas números (x)
      const migrated: Record<string, Record<string, LineOffset>> = {};
      for (const db in parsed) {
        migrated[db] = {};
        for (const k in parsed[db]) {
          const val = parsed[db][k];
          if (typeof val === 'number') {
            migrated[db][k] = { x: val };
          } else if (val && typeof val === 'object') {
            migrated[db][k] = val;
          }
        }
      }
      return migrated;
    }
  } catch (_) {}
  return {};
}

// Gera traçado ortogonal de linhas retas com quebras de 90 graus, cantos arredondados e suporte a ajuste customizado de posição livre 2D e alternância automática de lados
function getOrthogonalPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius = 8,
  customOffset?: LineOffset,
  fromSide: 'left' | 'right' = 'right',
  toSide: 'left' | 'right' = 'left',
  spineOffset = 0
): { path: string; midX: number; midY: number } {
  const dy = y2 - y1;
  const signY = dy >= 0 ? 1 : -1;

  // Caso 1: Ambas conectam pelo lado DIREITO (mesma coluna ou contorno pela margem direita)
  if (fromSide === 'right' && toSide === 'right') {
    const defaultLoopX = Math.max(x1, x2) + 50 + spineOffset;
    const midX = customOffset?.x !== undefined ? customOffset.x : defaultLoopX;
    const midY = customOffset?.y !== undefined ? customOffset.y : (y1 + y2) / 2;
    const r = Math.max(2, Math.min(radius, Math.abs(midX - x1) / 2, Math.abs(midX - x2) / 2, Math.abs(dy) / 2));

    const path = [
      `M ${x1} ${y1}`,
      `L ${midX - r} ${y1}`,
      `Q ${midX} ${y1}, ${midX} ${y1 + signY * r}`,
      `L ${midX} ${y2 - signY * r}`,
      `Q ${midX} ${y2}, ${midX - r} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');

    return { path, midX, midY };
  }

  // Caso 2: Ambas conectam pelo lado ESQUERDO (mesma coluna ou contorno pela margem esquerda)
  if (fromSide === 'left' && toSide === 'left') {
    const defaultLoopX = Math.min(x1, x2) - 50 - spineOffset;
    const midX = customOffset?.x !== undefined ? customOffset.x : defaultLoopX;
    const midY = customOffset?.y !== undefined ? customOffset.y : (y1 + y2) / 2;
    const r = Math.max(2, Math.min(radius, Math.abs(x1 - midX) / 2, Math.abs(x2 - midX) / 2, Math.abs(dy) / 2));

    const path = [
      `M ${x1} ${y1}`,
      `L ${midX + r} ${y1}`,
      `Q ${midX} ${y1}, ${midX} ${y1 + signY * r}`,
      `L ${midX} ${y2 - signY * r}`,
      `Q ${midX} ${y2}, ${midX + r} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');

    return { path, midX, midY };
  }

  // Caso 3: fromSide === 'right' && toSide === 'left' (Tabela de origem está à esquerda da tabela de destino)
  if (fromSide === 'right' && toSide === 'left') {
    const defaultMidX = (x1 + x2) / 2 + spineOffset;
    const midX = customOffset?.x !== undefined ? customOffset.x : defaultMidX;
    const midY = customOffset?.y !== undefined ? customOffset.y : (y1 + y2) / 2;

    if (Math.abs(dy) < 3 && customOffset?.y === undefined) {
      return {
        path: `M ${x1} ${y1} L ${x2} ${y2}`,
        midX,
        midY: y1,
      };
    }

    const r = Math.max(2, Math.min(radius, Math.abs(midX - x1) / 2, Math.abs(x2 - midX) / 2, Math.abs(dy) / 2));

    const path = [
      `M ${x1} ${y1}`,
      `L ${midX - r} ${y1}`,
      `Q ${midX} ${y1}, ${midX} ${y1 + signY * r}`,
      `L ${midX} ${y2 - signY * r}`,
      `Q ${midX} ${y2}, ${midX + r} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');

    return { path, midX, midY };
  }

  // Caso 4: fromSide === 'left' && toSide === 'right' (Tabela de origem está à direita da tabela de destino)
  const defaultMidX = (x1 + x2) / 2 + spineOffset;
  const midX = customOffset?.x !== undefined ? customOffset.x : defaultMidX;
  const midY = customOffset?.y !== undefined ? customOffset.y : (y1 + y2) / 2;

  if (Math.abs(dy) < 3 && customOffset?.y === undefined) {
    return {
      path: `M ${x1} ${y1} L ${x2} ${y2}`,
      midX,
      midY: y1,
    };
  }

  const r = Math.max(2, Math.min(radius, Math.abs(x1 - midX) / 2, Math.abs(midX - x2) / 2, Math.abs(dy) / 2));

  const path = [
    `M ${x1} ${y1}`,
    `L ${midX + r} ${y1}`,
    `Q ${midX} ${y1}, ${midX} ${y1 + signY * r}`,
    `L ${midX} ${y2 - signY * r}`,
    `Q ${midX} ${y2}, ${midX - r} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ');

  return { path, midX, midY };
}

// Normalização inteligente de nomes de entidades relacionais (suporte completo a singulares, plurais e prefixos)
function cleanEntityName(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/[`'"]/g, '');
  s = s.replace(/^(tb_|tbl_|tab_|t_)/, '');
  s = s.replace(/^(id_|cod_|codigo_|cd_|fk_)/, '');
  s = s.replace(/(_id|_fk|_cod|_codigo)$/, '');
  if (s.endsWith('id') && s.length > 2) {
    s = s.slice(0, -2);
  }

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

// Algoritmo puro de posicionamento estratificado anti-cruzamento e desobstruído (nenhuma linha passa por cima de tabelas)
function calculateNonCrossingLayout(tables: TableSchema[], rels: Relationship[]): Record<string, TablePosition> {
  const tableMap = new Map<string, TableSchema>();
  tables.forEach(t => tableMap.set(t.name.toLowerCase(), t));

  const parentsMap = new Map<string, Set<string>>();
  const childrenMap = new Map<string, Set<string>>();

  tables.forEach(t => {
    parentsMap.set(t.name.toLowerCase(), new Set());
    childrenMap.set(t.name.toLowerCase(), new Set());
  });

  rels.forEach(r => {
    const from = r.fromTable.toLowerCase();
    const to = r.toTable.toLowerCase();
    if (parentsMap.has(from) && childrenMap.has(to) && from !== to) {
      parentsMap.get(from)!.add(to);
      childrenMap.get(to)!.add(from);
    }
  });

  const layerMap = new Map<string, number>();
  const getLayer = (name: string, visited = new Set<string>()): number => {
    if (layerMap.has(name)) return layerMap.get(name)!;
    if (visited.has(name)) return 0;
    visited.add(name);

    const parents = parentsMap.get(name);
    if (!parents || parents.size === 0) {
      layerMap.set(name, 0);
      return 0;
    }

    let maxParentLayer = -1;
    for (const p of parents) {
      maxParentLayer = Math.max(maxParentLayer, getLayer(p, new Set(visited)));
    }
    const layer = maxParentLayer + 1;
    layerMap.set(name, layer);
    return layer;
  };

  tables.forEach(t => getLayer(t.name.toLowerCase()));

  const layers: string[][] = [];
  tables.forEach(t => {
    const l = layerMap.get(t.name.toLowerCase()) || 0;
    while (layers.length <= l) layers.push([]);
    layers[l].push(t.name);
  });

  const newPositions: Record<string, TablePosition> = {};
  // Corredor livre amplo entre colunas (520px de espaçamento, com 260px de tabela = 260px livres de corredor para as linhas ortogonais)
  const SPACING_X = 520;
  const START_X = 60;
  const START_Y = 60;

  layers[0]?.sort((a, b) => {
    const countA = childrenMap.get(a.toLowerCase())?.size || 0;
    const countB = childrenMap.get(b.toLowerCase())?.size || 0;
    return countB - countA;
  });

  let currentY0 = START_Y;
  layers[0]?.forEach(tName => {
    const tbl = tableMap.get(tName.toLowerCase());
    const h = HEADER_HEIGHT + (tbl ? tbl.columns.length * ROW_HEIGHT : 140);
    newPositions[tName] = { x: START_X, y: currentY0 };
    currentY0 += h + 80;
  });

  for (let l = 1; l < layers.length; l++) {
    const currentLayer = layers[l];
    const barycenters = new Map<string, number>();

    currentLayer.forEach(tName => {
      const parents = parentsMap.get(tName.toLowerCase());
      if (parents && parents.size > 0) {
        let sumY = 0;
        let count = 0;
        for (const p of parents) {
          const pKey = Object.keys(newPositions).find(k => k.toLowerCase() === p);
          if (pKey && newPositions[pKey]) {
            sumY += newPositions[pKey].y;
            count++;
          }
        }
        barycenters.set(tName, count > 0 ? sumY / count : START_Y);
      } else {
        barycenters.set(tName, START_Y);
      }
    });

    currentLayer.sort((a, b) => (barycenters.get(a) || 0) - (barycenters.get(b) || 0));

    let currentY = START_Y;
    const layerX = START_X + l * SPACING_X;

    currentLayer.forEach(tName => {
      const tbl = tableMap.get(tName.toLowerCase());
      const h = HEADER_HEIGHT + (tbl ? tbl.columns.length * ROW_HEIGHT : 140);
      const desiredY = barycenters.get(tName) || currentY;
      const actualY = Math.max(currentY, desiredY);

      newPositions[tName] = { x: layerX, y: actualY };
      currentY = actualY + h + 80;
    });
  }

  return newPositions;
}

export const ERDiagramView: React.FC<ERDiagramViewProps> = ({
  schemas,
  activeDatabase,
  onSelectDatabase,
  onSelectTableForQuery,
}) => {
  // Sincronização do banco selecionado com suporte a seleção local e props externas
  const [selectedDb, setSelectedDb] = useState<string>(activeDatabase || schemas[0]?.name || '');
  const prevActiveDbProp = useRef<string>(activeDatabase);

  useEffect(() => {
    if (activeDatabase && activeDatabase !== prevActiveDbProp.current) {
      prevActiveDbProp.current = activeDatabase;
      setSelectedDb(activeDatabase);
    }
  }, [activeDatabase]);

  const handleDbChange = (newDb: string) => {
    // Salva o banco anterior antes de trocar
    if (currentDb) {
      setPositionsByDb(prev => {
        const next = { ...prev, [currentDb.name]: positionsRef.current };
        try { localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }
    setSelectedDb(newDb);
    onSelectDatabase?.(newDb);
  };

  const currentDb = useMemo(() => {
    return schemas.find(s => s.name === selectedDb) || schemas[0];
  }, [schemas, selectedDb]);

  // Posições persistidas por banco de dados
  const [positionsByDb, setPositionsByDb] = useState<Record<string, Record<string, TablePosition>>>(getStoredPositionsByDb);
  const [lineOffsetsByDb, setLineOffsetsByDb] = useState<Record<string, Record<string, LineOffset>>>(getStoredLineOffsetsByDb);

  // Posições ativas das tabelas do banco atual
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const positionsRef = useRef<Record<string, TablePosition>>({});

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Offsets livres (X e Y) customizados das linhas de relacionamento
  const [lineOffsets, setLineOffsets] = useState<Record<string, LineOffset>>({});
  const lineOffsetsRef = useRef<Record<string, LineOffset>>({});

  useEffect(() => {
    lineOffsetsRef.current = lineOffsets;
  }, [lineOffsets]);

  // Estado de Arraste da Linha de Relacionamento (suporte a modo 'free' pelo nome e 'axis' pela linha)
  const [draggingLineKey, setDraggingLineKey] = useState<string | null>(null);
  const [lineDragStart, setLineDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    initialMidX: number;
    initialMidY: number;
    mode: 'free' | 'axis';
  }>({ mouseX: 0, mouseY: 0, initialMidX: 0, initialMidY: 0, mode: 'free' });
  
  // Zoom e Pan do Canvas
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 40 });

  // Estado de Arraste de Tabela ou Canvas
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Identifica relacionamentos entre tabelas
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

  // Função auxiliar segura para obter posição de uma tabela (case-insensitive)
  const getTablePos = useCallback((tableName: string): TablePosition => {
    if (positions[tableName]) return positions[tableName];
    const key = Object.keys(positions).find(k => k.toLowerCase() === tableName.toLowerCase());
    if (key && positions[key]) return positions[key];
    const idx = currentDb?.tables.findIndex(t => t.name.toLowerCase() === tableName.toLowerCase()) ?? 0;
    const colsCount = Math.max(2, Math.ceil(Math.sqrt(currentDb?.tables.length || 4)));
    const col = Math.max(0, idx) % colsCount;
    const row = Math.floor(Math.max(0, idx) / colsCount);
    return {
      x: 60 + col * 420,
      y: 60 + row * 340,
    };
  }, [positions, currentDb]);

  // 3. Ajustar à Tela (Fit to View) - Enquadra perfeitamente todas as tabelas na viewport
  const handleFitToView = useCallback((positionsOverride?: Record<string, TablePosition>) => {
    const posSource = positionsOverride || positionsRef.current;
    if (!currentDb || !currentDb.tables || currentDb.tables.length === 0) return;

    const tableNames = Object.keys(posSource);
    if (tableNames.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const name of tableNames) {
      const pos = posSource[name];
      if (!pos) continue;
      const tbl = currentDb.tables.find(t => t.name.toLowerCase() === name.toLowerCase());
      const h = HEADER_HEIGHT + (tbl ? tbl.columns.length * ROW_HEIGHT : 140);

      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
      maxY = Math.max(maxY, pos.y + h);
    }

    if (!isFinite(minX) || !isFinite(maxX)) return;

    const boundsWidth = Math.max(100, maxX - minX);
    const boundsHeight = Math.max(100, maxY - minY);

    const clientWidth = containerRef.current?.clientWidth || window.innerWidth - 320;
    const clientHeight = containerRef.current?.clientHeight || window.innerHeight - 180;
    const padding = 70;

    const scaleX = (clientWidth - padding) / boundsWidth;
    const scaleY = (clientHeight - padding) / boundsHeight;
    const fitScale = Math.max(0.35, Math.min(1.2, Math.min(scaleX, scaleY)));

    const newZoom = Math.round(fitScale * 100);
    setZoom(newZoom);

    const centerX = (clientWidth - boundsWidth * fitScale) / 2 - minX * fitScale;
    const centerY = (clientHeight - boundsHeight * fitScale) / 2 - minY * fitScale;

    setPan({
      x: Math.round(centerX),
      y: Math.round(centerY),
    });
  }, [currentDb]);

  // 2. Aplica layout inicial anti-cruzamento e ajuste à tela quando o banco muda
  const applyAutoLayout = useCallback((forceRecalculate = false) => {
    if (!currentDb || !currentDb.tables || currentDb.tables.length === 0) return;
    const dbKey = currentDb.name;

    // Se já existem posições salvas e não foi forçado recálculo, restaura exatamente como o usuário deixou
    const savedForDb = positionsByDb[dbKey];
    const currentTableNames = currentDb.tables.map(t => t.name.toLowerCase());
    const hasAllTables = !forceRecalculate && savedForDb && currentTableNames.every(name => Object.keys(savedForDb).some(k => k.toLowerCase() === name));

    if (hasAllTables) {
      setPositions(savedForDb);
      positionsRef.current = savedForDb;
      handleFitToView(savedForDb);
    } else {
      const calculated = calculateNonCrossingLayout(currentDb.tables, relationships);
      setPositions(calculated);
      positionsRef.current = calculated;
      setPositionsByDb(prev => {
        const next = { ...prev, [dbKey]: calculated };
        try { localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });
      handleFitToView(calculated);
      setTimeout(() => handleFitToView(calculated), 60);
    }

    // Restaura offsets das linhas do banco
    const savedLines = lineOffsetsByDb[dbKey] || {};
    setLineOffsets(savedLines);
    lineOffsetsRef.current = savedLines;
  }, [currentDb, relationships, positionsByDb, lineOffsetsByDb, handleFitToView]);

  // Dispara carregamento ao trocar o banco
  useEffect(() => {
    if (!currentDb || !currentDb.tables || currentDb.tables.length === 0) return;
    applyAutoLayout(false);
  }, [selectedDb, currentDb?.name]);

  // 4. Arraste de Tabelas sem limite no canto esquerdo
  const handleTableMouseDown = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = positions[tableName] || positionsRef.current[tableName] || { x: 0, y: 0 };
    setDraggingTable(tableName);
    const scale = zoom / 100;
    const canvasMouseX = (e.clientX - pan.x) / scale;
    const canvasMouseY = (e.clientY - pan.y) / scale;
    setDragOffset({
      x: canvasMouseX - pos.x,
      y: canvasMouseY - pos.y,
    });
  };

  // Início do arraste de uma linha de relacionamento (modo 'free' para label, 'axis' para linha)
  const handleLineMouseDown = (
    relKey: string,
    currentMidX: number,
    currentMidY: number,
    e: React.MouseEvent,
    mode: 'free' | 'axis' = 'free'
  ) => {
    e.stopPropagation();
    const scale = zoom / 100;
    const canvasMouseX = (e.clientX - pan.x) / scale;
    const canvasMouseY = (e.clientY - pan.y) / scale;
    setDraggingLineKey(relKey);
    setLineDragStart({
      mouseX: canvasMouseX,
      mouseY: canvasMouseY,
      initialMidX: currentMidX,
      initialMidY: currentMidY,
      mode,
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
    const scale = zoom / 100;
    const canvasMouseX = (e.clientX - pan.x) / scale;
    const canvasMouseY = (e.clientY - pan.y) / scale;

    if (draggingTable) {
      // Arraste livre sem barreira no limite esquerdo (permite valores negativos para alcançar qualquer margem)
      const newX = Math.round(canvasMouseX - dragOffset.x);
      const newY = Math.round(canvasMouseY - dragOffset.y);
      setPositions(prev => {
        const next = {
          ...prev,
          [draggingTable]: { x: newX, y: newY }
        };
        positionsRef.current = next;
        return next;
      });
    } else if (draggingLineKey) {
      const deltaX = Math.round(canvasMouseX - lineDragStart.mouseX);
      const deltaY = Math.round(canvasMouseY - lineDragStart.mouseY);

      if (lineDragStart.mode === 'free') {
        // Arraste livre total em 2D pelo nome do relacionamento
        const newMidX = lineDragStart.initialMidX + deltaX;
        const newMidY = lineDragStart.initialMidY + deltaY;
        setLineOffsets(prev => {
          const next = {
            ...prev,
            [draggingLineKey]: { x: newMidX, y: newMidY }
          };
          lineOffsetsRef.current = next;
          return next;
        });
      } else {
        // Arraste da linha: permite mover tanto no eixo X quanto no eixo Y
        const newMidX = lineDragStart.initialMidX + deltaX;
        const newMidY = lineDragStart.initialMidY + deltaY;
        setLineOffsets(prev => {
          const next = {
            ...prev,
            [draggingLineKey]: { x: newMidX, y: newMidY }
          };
          lineOffsetsRef.current = next;
          return next;
        });
      }
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    // Salva posições permanentemente no banco ativo ao soltar
    if (draggingTable && currentDb) {
      const dbKey = currentDb.name;
      setPositionsByDb(prev => {
        const next = { ...prev, [dbKey]: positionsRef.current };
        try { localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }
    // Salva offsets das linhas permanentemente no banco ativo ao soltar
    if (draggingLineKey && currentDb) {
      const dbKey = currentDb.name;
      setLineOffsetsByDb(prev => {
        const next = { ...prev, [dbKey]: lineOffsetsRef.current };
        try { localStorage.setItem(LINE_OFFSETS_STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
        return next;
      });
    }

    setDraggingTable(null);
    setDraggingLineKey(null);
    setIsPanning(false);
  };

  // Suporte a zoom suave com a roda do mouse (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.max(50, Math.min(250, Math.round(prev * zoomFactor))));
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

    // Desenha Linhas de Relacionamento Ortogonais 90° com Cantos Arredondados
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

      if (fromPos.x <= toPos.x) {
        fromX = fromPos.x + TABLE_WIDTH + offsetX;
        toX = toPos.x + offsetX;
      } else {
        fromX = fromPos.x + offsetX;
        toX = toPos.x + TABLE_WIDTH + offsetX;
      }

      const dx = toX - fromX;
      const dy = toY - fromY;
      const midX = fromX + dx / 2;
      const midY = (fromY + toY) / 2;
      const r = Math.max(2, Math.min(8, Math.abs(dx) / 2, Math.abs(dy) / 2));
      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;

      // Traçado Ortogonal 90° com cantos arredondados
      ctx.beginPath();
      ctx.strokeStyle = isLight ? '#1D4ED8' : '#FFE600';
      ctx.lineWidth = 2.5;

      if (Math.abs(dy) < 3) {
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
      } else {
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(midX - signX * r, fromY);
        ctx.quadraticCurveTo(midX, fromY, midX, fromY + signY * r);
        ctx.lineTo(midX, toY - signY * r);
        ctx.quadraticCurveTo(midX, toY, midX + signX * r, toY);
        ctx.lineTo(toX, toY);
      }
      ctx.stroke();

      // Círculo Lado FK
      ctx.fillStyle = '#FF8533';
      ctx.beginPath();
      ctx.arc(fromX, fromY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Círculo Lado PK
      ctx.fillStyle = isLight ? '#15803D' : '#00E676';
      ctx.beginPath();
      ctx.arc(toX, toY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Etiqueta com Nome do Relacionamento
      const relName = `${rel.fromCol} ➔ ${rel.toTable}`;
      const tagWidth = Math.max(90, relName.length * 7.5 + 24);
      const tagHeight = 22;

      ctx.fillStyle = isLight ? '#FFFFFF' : '#1A1D26';
      ctx.strokeStyle = isLight ? '#1D4ED8' : '#FF6B00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(midX - tagWidth / 2, midY - tagHeight / 2, tagWidth, tagHeight, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isLight ? '#1D4ED8' : '#FFE600';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(relName, midX, midY);
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

          {/* Zoom In / Out / Reset */}
          <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-0.5">
            <button
              onClick={() => setZoom(z => Math.max(50, z - 15))}
              title="Diminuir Zoom (-)"
              className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <button
              onClick={() => setZoom(100)}
              title="Restaurar Zoom (100%)"
              className="px-2 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-w-[44px] text-center"
              type="button"
            >
              {zoom}%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(250, z + 15))}
              title="Aumentar Zoom (+)"
              className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
          </div>

          {/* Botão Reorganizar Layout (Anti-Cruzamento) */}
          <button
            onClick={() => applyAutoLayout()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Reorganizar automaticamente as tabelas sem cruzamento de linhas"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#00E676]">
              auto_awesome
            </span>
            <span>Reorganizar</span>
          </button>

          {/* Botão Ajustar à Tela (Fit to View) */}
          <button
            onClick={() => handleFitToView()}
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
        onWheel={handleWheel}
        className="flex-1 w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing bg-[var(--bg-primary)]"
        style={{
          backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className={`absolute inset-0 origin-top-left ${isPanning || draggingTable ? '' : 'transition-transform duration-100 ease-out'}`}
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
              const relKey = `${rel.fromTable}.${rel.fromCol}->${rel.toTable}.${rel.toCol}`;
              const customOffset = lineOffsets[relKey];

              const fromPos = getTablePos(rel.fromTable);
              const toPos = getTablePos(rel.toTable);

              const fromTbl = currentDb?.tables.find(t => t.name.toLowerCase() === rel.fromTable.toLowerCase());
              const toTbl = currentDb?.tables.find(t => t.name.toLowerCase() === rel.toTable.toLowerCase());

              const fromColIdx = Math.max(0, fromTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.fromCol.toLowerCase()) ?? 0);
              const toColIdx = Math.max(0, toTbl?.columns.findIndex((c: ColumnSchema) => c.name.toLowerCase() === rel.toCol.toLowerCase()) ?? 0);

              const fromY = fromPos.y + HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              const toY = toPos.y + HEADER_HEIGHT + toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

              const r1Left = fromPos.x;
              const r1Right = fromPos.x + TABLE_WIDTH;
              const r2Left = toPos.x;
              const r2Right = toPos.x + TABLE_WIDTH;

              let fromSide: 'left' | 'right';
              let toSide: 'left' | 'right';

              // Alternância automática dinâmica de lado do relacionamento para não cruzar por cima da tabela
              if (r1Right + 20 <= r2Left) {
                // Tabela 1 está à esquerda da Tabela 2
                fromSide = 'right';
                toSide = 'left';
              } else if (r2Right + 20 <= r1Left) {
                // Tabela 1 está à direita da Tabela 2
                fromSide = 'left';
                toSide = 'right';
              } else {
                // Tabelas sobrepostas no eixo horizontal ou na mesma coluna: contorna pelas margens externas
                if (customOffset?.x !== undefined && customOffset.x < Math.min(r1Left, r2Left)) {
                  fromSide = 'left';
                  toSide = 'left';
                } else {
                  fromSide = 'right';
                  toSide = 'right';
                }
              }

              const fromX = fromSide === 'right' ? r1Right : r1Left;
              const toX = toSide === 'right' ? r2Right : r2Left;

              // Escalonamento de corredores compartilhados para evitar que linhas entre mesmas tabelas fiquem perfeitamente coladas
              const spineOffset = ((i % 4) - 1.5) * 18;

              // Traçado ortogonal de linhas retas com quebras de 90° e cantos arredondados, respeitando os lados dinâmicos e ajustes manuais
              const { path: orthogonalPath, midX, midY } = getOrthogonalPath(
                fromX,
                fromY,
                toX,
                toY,
                8,
                customOffset,
                fromSide,
                toSide,
                spineOffset
              );

              // Nome do relacionamento exibido no centro
              const relName = `${rel.fromCol} ➔ ${rel.toTable}`;
              const tagWidth = Math.max(90, relName.length * 7.5 + 24);
              const tagHeight = 24;

              const isLightMode = document.documentElement.classList.contains('light');
              const strokeColor = isLightMode ? '#1D4ED8' : '#FFE600';
              const pkColor = isLightMode ? '#15803D' : '#00E676';
              const fkColor = '#FF8533';
              const pillBg = isLightMode ? '#FFFFFF' : '#1A1D26';
              const pillBorder = isLightMode ? '#1D4ED8' : '#FF6B00';
              const isDraggingThis = draggingLineKey === relKey;

              return (
                <g key={`${rel.fromTable}-${rel.fromCol}-${rel.toTable}-${i}`}>
                  {/* Área invisível mais ampla para facilitar o clique e arraste da linha de relacionamento */}
                  <path
                    d={orthogonalPath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    style={{ pointerEvents: 'stroke', cursor: 'move' }}
                    onMouseDown={(e) => handleLineMouseDown(relKey, midX, midY, e, 'axis')}
                  >
                    <title>Arraste para reposicionar a rota desta linha (horizontal ou vertical)</title>
                  </path>

                  {/* Linha Ortogonal 90° com Cantos Arredondados */}
                  <path
                    d={orthogonalPath}
                    fill="none"
                    stroke={isDraggingThis ? '#00E676' : strokeColor}
                    strokeWidth={isDraggingThis ? "3.5" : "2.5"}
                    opacity={isDraggingThis ? "1" : "0.95"}
                    style={{ pointerEvents: 'stroke', cursor: 'move' }}
                    onMouseDown={(e) => handleLineMouseDown(relKey, midX, midY, e, 'axis')}
                  />

                  {/* Marcador de Chave Estrangeira (Lado FK) */}
                  <circle
                    cx={fromX}
                    cy={fromY}
                    r="4.5"
                    fill={fkColor}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />

                  {/* Marcador de Chave Primária (Lado PK) */}
                  <circle
                    cx={toX}
                    cy={toY}
                    r="4.5"
                    fill={pkColor}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />

                  {/* Etiqueta Central com o NOME DO RELACIONAMENTO - Arraste LIVRE 2D */}
                  <g
                    transform={`translate(${midX - tagWidth / 2}, ${midY - tagHeight / 2})`}
                    style={{ pointerEvents: 'all', cursor: isDraggingThis ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => handleLineMouseDown(relKey, midX, midY, e, 'free')}
                    className="select-none group/tag"
                  >
                    <title>Clique e arraste livremente para reposicionar esta etiqueta em qualquer lugar</title>
                    <rect
                      x="0"
                      y="0"
                      width={tagWidth}
                      height={tagHeight}
                      rx="6"
                      fill={pillBg}
                      stroke={isDraggingThis ? '#00E676' : pillBorder}
                      strokeWidth={isDraggingThis ? "2" : "1.5"}
                      className="shadow-sm transition-all group-hover/tag:stroke-[#00E676]"
                    />
                    <text
                      x={tagWidth / 2}
                      y={tagHeight / 2 + 4}
                      textAnchor="middle"
                      fill={isDraggingThis ? '#00E676' : strokeColor}
                      fontSize="10"
                      fontFamily="'JetBrains Mono', monospace"
                      fontWeight="bold"
                    >
                      {relName}
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
