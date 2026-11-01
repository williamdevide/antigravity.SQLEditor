import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ER_CARD_WIDTH,
  estimateERCardHeight,
  snapToGridCoord,
} from '../../services/erLayoutEngine';
import type { ERStudioPreferences } from '../../types/preferences';
import type {
  ERRelationshipEdge,
  ERStickyNote,
  ERSubjectArea,
  ERTableNode,
  ERTablePosition,
  ERTableVisualMeta,
} from '../../types/erStudio';
import { ERCanvasToolbar } from './ERCanvasToolbar';
import {
  ERRelationshipLayer,
  type ConnectingFkDraft,
} from './ERRelationshipLayer';
import { ERStickyNotesLayer } from './ERStickyNotesLayer';
import { ERSubjectAreasLayer } from './ERSubjectAreasLayer';
import { ERTableCard } from './ERTableCard';

interface ERInteractiveCanvasProps {
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  positions: Record<string, ERTablePosition>;
  onPositionsChange: (
    next: Record<string, ERTablePosition>,
    commitPersist?: boolean
  ) => void;
  lineOffsets: Record<string, { x: number; y: number }>;
  onLineOffsetsChange: (
    next: Record<string, { x: number; y: number }>,
    commitPersist?: boolean
  ) => void;
  tableMeta: Record<string, ERTableVisualMeta>;
  onUpdateTableMeta: (tableName: string, patch: Partial<ERTableVisualMeta>) => void;
  subjectAreas?: ERSubjectArea[];
  onSubjectAreasChange?: (next: ERSubjectArea[], commitPersist?: boolean) => void;
  stickyNotes?: ERStickyNote[];
  onStickyNotesChange?: (next: ERStickyNote[], commitPersist?: boolean) => void;
  selectedTable: string | null;
  onSelectTable: (tableName: string | null) => void;
  onDoubleClickTableQuery?: (tableName: string) => void;
  onRequestDataPeek?: (tableName: string) => void;
  onAutoLayout: () => void;
  isAutoLayoutActive?: boolean;
  erPreferences: ERStudioPreferences;
  onUpdateErPreferences?: (patch: Partial<ERStudioPreferences>) => void;
  defaultZoom?: number;
  reducedMotionAndGlow?: boolean;
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
  enableVisualConnect?: boolean;
  onCreateForeignKeyConnection?: (
    sourceTable: string,
    sourceColumn: string,
    targetTable: string,
    targetColumn: string
  ) => void;
  compact?: boolean;
  fitTriggerKey?: string;
}

export const ERInteractiveCanvas: React.FC<ERInteractiveCanvasProps> = ({
  tables,
  relationships,
  positions,
  onPositionsChange,
  lineOffsets,
  onLineOffsetsChange,
  tableMeta,
  onUpdateTableMeta,
  subjectAreas = [],
  onSubjectAreasChange,
  stickyNotes = [],
  onStickyNotesChange,
  selectedTable,
  onSelectTable,
  onDoubleClickTableQuery,
  onRequestDataPeek,
  onAutoLayout,
  isAutoLayoutActive = false,
  erPreferences,
  onUpdateErPreferences,
  defaultZoom = 100,
  reducedMotionAndGlow = false,
  isPresentationMode,
  onTogglePresentationMode,
  enableVisualConnect = false,
  onCreateForeignKeyConnection,
  compact = false,
  fitTriggerKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(defaultZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 36, y: 36 });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [spacePressed, setSpacePressed] = useState<boolean>(false);

  // Estados de Spotlight e Interação
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [pinnedEdgeId, setPinnedEdgeId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Estados de Arraste (Pan, Card, Linha, Área Temática, Nota, Drag-to-Connect FK)
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [draggingEdgeId, setDraggingEdgeId] = useState<string | null>(null);
  const edgeDragRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
  }>({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  const [draggingArea, setDraggingArea] = useState<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    initialAreaX: number;
    initialAreaY: number;
    capturedTables: Array<{ name: string; initialX: number; initialY: number }>;
  } | null>(null);

  const [resizingArea, setResizingArea] = useState<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const [draggingNote, setDraggingNote] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [connectingDraft, setConnectingDraft] = useState<ConnectingFkDraft | null>(null);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const lineOffsetsRef = useRef(lineOffsets);
  lineOffsetsRef.current = lineOffsets;
  const areasRef = useRef(subjectAreas);
  areasRef.current = subjectAreas;
  const notesRef = useRef(stickyNotes);
  notesRef.current = stickyNotes;

  // Suporte a Space + Arraste para Pan e Esc para sair da Apresentação / limpar seleção
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.code === 'Space' && !isTyping) {
        setSpacePressed(true);
      }
      if (e.key === 'Escape') {
        setPinnedEdgeId(null);
        setConnectingDraft(null);
        if (isPresentationMode) {
          onTogglePresentationMode();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isPresentationMode, onTogglePresentationMode]);

  // Ajustar todas as tabelas ao viewport (Fit-to-View)
  const handleFitToView = useCallback(() => {
    if (!tables || tables.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const tbl of tables) {
      const pos = positionsRef.current[tbl.name] || { x: 60, y: 60 };
      const h = estimateERCardHeight(tbl, relationships, tableMeta[tbl.name]);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + ER_CARD_WIDTH);
      maxY = Math.max(maxY, pos.y + h);
    }

    for (const area of areasRef.current) {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + area.width);
      maxY = Math.max(maxY, area.y + (area.collapsed ? 40 : area.height));
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

    const boundsWidth = Math.max(160, maxX - minX);
    const boundsHeight = Math.max(160, maxY - minY);
    const clientWidth = containerRef.current?.clientWidth || window.innerWidth - 360;
    const clientHeight = containerRef.current?.clientHeight || window.innerHeight - 160;
    const padding = compact ? 52 : 84;

    const scaleX = (clientWidth - padding) / boundsWidth;
    const scaleY = (clientHeight - padding) / boundsHeight;
    const fitScale = Math.max(0.28, Math.min(1.25, Math.min(scaleX, scaleY)));
    const nextZoom = Math.round(fitScale * 100);

    setZoom(nextZoom);
    setPan({
      x: Math.round((clientWidth - boundsWidth * fitScale) / 2 - minX * fitScale),
      y: Math.round((clientHeight - boundsHeight * fitScale) / 2 - minY * fitScale),
    });
  }, [tables, relationships, tableMeta, compact]);

  // Ajusta automaticamente quando a chave de contexto muda (ex: trocou de banco)
  useEffect(() => {
    if (!fitTriggerKey || tables.length === 0) return;
    const t = setTimeout(() => {
      handleFitToView();
    }, 45);
    return () => clearTimeout(t);
  }, [fitTriggerKey, tables.length, handleFitToView]);

  // Zoom Focal Ancorado no Cursor (Ctrl + Roda ou Roda direta no Canvas)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const oldScale = prevZoom / 100;
        const factor = e.deltaY < 0 ? 1.09 : 0.91;
        const nextZoom = Math.max(30, Math.min(240, Math.round(prevZoom * factor)));
        const newScale = nextZoom / 100;

        setPan((prevPan) => {
          const worldX = (cursorX - prevPan.x) / oldScale;
          const worldY = (cursorY - prevPan.y) / oldScale;
          return {
            x: Math.round(cursorX - worldX * newScale),
            y: Math.round(cursorY - worldY * newScale),
          };
        });

        return nextZoom;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toWorldCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const relX = clientX - (rect?.left || 0);
    const relY = clientY - (rect?.top || 0);
    const scale = zoom / 100;
    return {
      x: (relX - pan.x) / scale,
      y: (relY - pan.y) / scale,
    };
  };

  // Início do Pan no fundo do Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      };
      onSelectTable(null);
      setSelectedAreaId(null);
      setSelectedNoteId(null);
      setPinnedEdgeId(null);
    }
  };

  // Início do Arraste de Card de Tabela
  const handleTableMouseDown = (tableName: string, e: React.MouseEvent) => {
    if (spacePressed) {
      handleCanvasMouseDown(e);
      return;
    }
    e.stopPropagation();
    onSelectTable(tableName);
    const pos = positionsRef.current[tableName] || { x: 60, y: 60 };
    const world = toWorldCoords(e.clientX, e.clientY);
    setDraggingTable(tableName);
    dragOffsetRef.current = {
      x: world.x - pos.x,
      y: world.y - pos.y,
    };
  };

  // Início do Arraste de Etiqueta / Corredor de Linha
  const handleStartDragEdge = (
    edgeId: string,
    currentLabelX: number,
    currentLabelY: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const world = toWorldCoords(e.clientX, e.clientY);
    setDraggingEdgeId(edgeId);
    edgeDragRef.current = {
      mouseX: world.x,
      mouseY: world.y,
      initialX: currentLabelX,
      initialY: currentLabelY,
    };
  };

  // Início do Arraste Solidário de Área Temática (captura tabelas contidas na área)
  const handleStartDragArea = (areaId: string, e: React.MouseEvent) => {
    const area = areasRef.current.find((a) => a.id === areaId);
    if (!area) return;
    const world = toWorldCoords(e.clientX, e.clientY);

    const capturedTables: Array<{ name: string; initialX: number; initialY: number }> = [];
    for (const tbl of tables) {
      if (tableMeta[tbl.name]?.locked) continue;
      const pos = positionsRef.current[tbl.name] || { x: 60, y: 60 };
      const centerX = pos.x + ER_CARD_WIDTH / 2;
      const centerY = pos.y + 40;
      if (
        centerX >= area.x &&
        centerX <= area.x + area.width &&
        centerY >= area.y &&
        centerY <= area.y + area.height
      ) {
        capturedTables.push({ name: tbl.name, initialX: pos.x, initialY: pos.y });
      }
    }

    setSelectedAreaId(areaId);
    setDraggingArea({
      id: areaId,
      startMouseX: world.x,
      startMouseY: world.y,
      initialAreaX: area.x,
      initialAreaY: area.y,
      capturedTables,
    });
  };

  const handleStartResizeArea = (areaId: string, e: React.MouseEvent) => {
    const area = areasRef.current.find((a) => a.id === areaId);
    if (!area) return;
    const world = toWorldCoords(e.clientX, e.clientY);
    setResizingArea({
      id: areaId,
      startMouseX: world.x,
      startMouseY: world.y,
      initialWidth: area.width,
      initialHeight: area.height,
    });
  };

  const handleStartDragNote = (noteId: string, e: React.MouseEvent) => {
    const note = notesRef.current.find((n) => n.id === noteId);
    if (!note) return;
    const world = toWorldCoords(e.clientX, e.clientY);
    setSelectedNoteId(noteId);
    setDraggingNote({
      id: noteId,
      offsetX: world.x - note.x,
      offsetY: world.y - note.y,
    });
  };

  const handleStartConnectColumn = (
    tableName: string,
    columnName: string,
    anchorYOffset: number,
    e: React.MouseEvent
  ) => {
    const pos = positionsRef.current[tableName] || { x: 60, y: 60 };
    const world = toWorldCoords(e.clientX, e.clientY);
    setConnectingDraft({
      sourceTable: tableName,
      sourceColumn: columnName,
      fromX: pos.x + ER_CARD_WIDTH,
      fromY: pos.y + anchorYOffset,
      currentX: world.x,
      currentY: world.y,
    });
  };

  const handleCompleteConnectColumn = (targetTable: string, targetColumn: string) => {
    if (!connectingDraft) return;
    if (
      connectingDraft.sourceTable.toLowerCase() === targetTable.toLowerCase() &&
      connectingDraft.sourceColumn.toLowerCase() === targetColumn.toLowerCase()
    ) {
      setConnectingDraft(null);
      return;
    }
    if (onCreateForeignKeyConnection) {
      onCreateForeignKeyConnection(
        connectingDraft.sourceTable,
        connectingDraft.sourceColumn,
        targetTable,
        targetColumn
      );
    }
    setConnectingDraft(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = toWorldCoords(e.clientX, e.clientY);

    if (connectingDraft) {
      setConnectingDraft((prev) =>
        prev ? { ...prev, currentX: world.x, currentY: world.y } : null
      );
      return;
    }

    if (draggingTable) {
      const nextX = snapToGridCoord(
        world.x - dragOffsetRef.current.x,
        erPreferences.snapToGrid
      );
      const nextY = snapToGridCoord(
        world.y - dragOffsetRef.current.y,
        erPreferences.snapToGrid
      );
      onPositionsChange(
        {
          ...positionsRef.current,
          [draggingTable]: { x: nextX, y: nextY },
        },
        false
      );
      return;
    }

    if (draggingEdgeId) {
      const dx = Math.round(world.x - edgeDragRef.current.mouseX);
      const dy = Math.round(world.y - edgeDragRef.current.mouseY);
      onLineOffsetsChange(
        {
          ...lineOffsetsRef.current,
          [draggingEdgeId]: {
            x: edgeDragRef.current.initialX + dx,
            y: edgeDragRef.current.initialY + dy,
          },
        },
        false
      );
      return;
    }

    if (draggingArea && onSubjectAreasChange) {
      const dx = world.x - draggingArea.startMouseX;
      const dy = world.y - draggingArea.startMouseY;
      const snappedAreaX = snapToGridCoord(
        draggingArea.initialAreaX + dx,
        erPreferences.snapToGrid
      );
      const snappedAreaY = snapToGridCoord(
        draggingArea.initialAreaY + dy,
        erPreferences.snapToGrid
      );
      const effectiveDx = snappedAreaX - draggingArea.initialAreaX;
      const effectiveDy = snappedAreaY - draggingArea.initialAreaY;

      const updatedAreas = areasRef.current.map((a) =>
        a.id === draggingArea.id ? { ...a, x: snappedAreaX, y: snappedAreaY } : a
      );
      onSubjectAreasChange(updatedAreas, false);

      if (draggingArea.capturedTables.length > 0) {
        const nextPositions = { ...positionsRef.current };
        for (const cap of draggingArea.capturedTables) {
          nextPositions[cap.name] = {
            x: cap.initialX + effectiveDx,
            y: cap.initialY + effectiveDy,
          };
        }
        onPositionsChange(nextPositions, false);
      }
      return;
    }

    if (resizingArea && onSubjectAreasChange) {
      const dx = world.x - resizingArea.startMouseX;
      const dy = world.y - resizingArea.startMouseY;
      const nextW = Math.max(
        260,
        snapToGridCoord(resizingArea.initialWidth + dx, erPreferences.snapToGrid)
      );
      const nextH = Math.max(
        180,
        snapToGridCoord(resizingArea.initialHeight + dy, erPreferences.snapToGrid)
      );
      const updatedAreas = areasRef.current.map((a) =>
        a.id === resizingArea.id ? { ...a, width: nextW, height: nextH } : a
      );
      onSubjectAreasChange(updatedAreas, false);
      return;
    }

    if (draggingNote && onStickyNotesChange) {
      const nextX = snapToGridCoord(
        world.x - draggingNote.offsetX,
        erPreferences.snapToGrid
      );
      const nextY = snapToGridCoord(
        world.y - draggingNote.offsetY,
        erPreferences.snapToGrid
      );
      const updatedNotes = notesRef.current.map((n) =>
        n.id === draggingNote.id ? { ...n, x: nextX, y: nextY } : n
      );
      onStickyNotesChange(updatedNotes, false);
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingTable) {
      onPositionsChange(positionsRef.current, true);
      setDraggingTable(null);
    }
    if (draggingEdgeId) {
      onLineOffsetsChange(lineOffsetsRef.current, true);
      setDraggingEdgeId(null);
    }
    if (draggingArea && onSubjectAreasChange) {
      onSubjectAreasChange(areasRef.current, true);
      if (draggingArea.capturedTables.length > 0) {
        onPositionsChange(positionsRef.current, true);
      }
      setDraggingArea(null);
    }
    if (resizingArea && onSubjectAreasChange) {
      onSubjectAreasChange(areasRef.current, true);
      setResizingArea(null);
    }
    if (draggingNote && onStickyNotesChange) {
      onStickyNotesChange(notesRef.current, true);
      setDraggingNote(null);
    }
    if (connectingDraft) {
      setConnectingDraft(null);
    }
    setIsPanning(false);
  };

  // Tabelas conectadas ao foco atual para efeito Spotlight
  const connectedTableSet = useMemo(() => {
    const focusEdge = hoveredEdgeId || pinnedEdgeId || draggingEdgeId;
    if (focusEdge) {
      const rel = relationships.find((r) => r.id === focusEdge);
      if (rel) {
        return new Set([rel.sourceTable.toLowerCase(), rel.targetTable.toLowerCase()]);
      }
    }
    if (hoveredTable) {
      const set = new Set<string>([hoveredTable.toLowerCase()]);
      for (const r of relationships) {
        if (r.sourceTable.toLowerCase() === hoveredTable.toLowerCase()) {
          set.add(r.targetTable.toLowerCase());
        }
        if (r.targetTable.toLowerCase() === hoveredTable.toLowerCase()) {
          set.add(r.sourceTable.toLowerCase());
        }
      }
      return set;
    }
    return null;
  }, [hoveredTable, hoveredEdgeId, pinnedEdgeId, draggingEdgeId, relationships]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Estilo da malha de fundo (Pontilhada, Linhas ou Oculta)
  const gridBackgroundStyle: React.CSSProperties = useMemo(() => {
    if (erPreferences.gridMode === 'none') return {};
    if (erPreferences.gridMode === 'lines') {
      return {
        backgroundImage:
          'linear-gradient(to right, var(--border-color) 1px, transparent 1px), linear-gradient(to bottom, var(--border-color) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    }
    return {
      backgroundImage: 'radial-gradient(var(--border-color) 1.15px, transparent 1.15px)',
      backgroundSize: '24px 24px',
    };
  }, [erPreferences.gridMode]);

  const isInteracting = Boolean(
    isPanning ||
      draggingTable ||
      draggingEdgeId ||
      draggingArea ||
      resizingArea ||
      draggingNote ||
      connectingDraft
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex-1 w-full h-full overflow-hidden relative bg-[var(--bg-primary)] select-none ${
        spacePressed || isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={gridBackgroundStyle}
    >
      {/* Toolbar Flutuante + Busca Rápida */}
      <ERCanvasToolbar
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(240, z + 15))}
        onZoomOut={() => setZoom((z) => Math.max(30, z - 15))}
        onZoomReset={() => setZoom(100)}
        onFitToView={handleFitToView}
        onAutoLayout={onAutoLayout}
        isAutoLayoutActive={isAutoLayoutActive}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        erPreferences={erPreferences}
        onUpdateErPreferences={onUpdateErPreferences}
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={onTogglePresentationMode}
        compact={compact}
      />

      {/* Estado Vazio Didático quando não há tabelas */}
      {tables.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-yellow)] mb-3 shadow-lg">
            <span className="material-symbols-outlined text-[30px]">account_tree</span>
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
            Nenhuma Entidade no Diagrama Atual
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
            Carregue um banco na <strong>Galeria &amp; Prática</strong>, escreva comandos{' '}
            <code className="font-mono text-[var(--accent-yellow)]">CREATE TABLE</code> no{' '}
            <strong>Laboratório SQL</strong> ou crie tabelas visualmente pelo Inspetor Lateral.
          </p>
        </div>
      ) : (
        <div
          className={`absolute inset-0 origin-top-left ${
            isInteracting || reducedMotionAndGlow
              ? ''
              : 'transition-transform duration-100 ease-out'
          }`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
          }}
        >
          {/* 1. Camada de Áreas Temáticas (z-[2], fundo semântico) */}
          <ERSubjectAreasLayer
            areas={subjectAreas}
            selectedAreaId={selectedAreaId}
            isPresentationMode={isPresentationMode}
            onSelectArea={setSelectedAreaId}
            onStartDragArea={handleStartDragArea}
            onStartResizeArea={handleStartResizeArea}
            onToggleCollapseArea={(areaId) => {
              if (!onSubjectAreasChange) return;
              onSubjectAreasChange(
                subjectAreas.map((a) =>
                  a.id === areaId ? { ...a, collapsed: !a.collapsed } : a
                ),
                true
              );
            }}
            onDeleteArea={
              onSubjectAreasChange
                ? (areaId) =>
                    onSubjectAreasChange(
                      subjectAreas.filter((a) => a.id !== areaId),
                      true
                    )
                : undefined
            }
          />

          {/* 2. Camada SVG de Relacionamentos em Repouso (z-[5], atrás dos cards!) */}
          <ERRelationshipLayer
            layerMode="background"
            tables={tables}
            relationships={relationships}
            positions={positions}
            tableMeta={tableMeta}
            lineOffsets={lineOffsets}
            hoveredTable={hoveredTable}
            selectedTable={selectedTable}
            hoveredEdgeId={hoveredEdgeId}
            pinnedEdgeId={pinnedEdgeId}
            draggingEdgeId={draggingEdgeId}
            onHoverEdge={setHoveredEdgeId}
            onTogglePinEdge={(id) =>
              setPinnedEdgeId((prev) => (prev === id ? null : id))
            }
            onStartDragEdge={handleStartDragEdge}
            lineStyle={erPreferences.lineStyle}
            cardinalityNotation={erPreferences.cardinalityNotation}
            labelVisibility={erPreferences.labelVisibility}
            animateLaserFlow={erPreferences.animateLaserFlow}
            reducedMotionAndGlow={reducedMotionAndGlow}
          />

          {/* 3. Camada de Notas Adesivas / Requisitos (z-[15]) */}
          <ERStickyNotesLayer
            notes={stickyNotes}
            selectedNoteId={selectedNoteId}
            isPresentationMode={isPresentationMode}
            onSelectNote={setSelectedNoteId}
            onStartDragNote={handleStartDragNote}
            onUpdateNote={(noteId, patch) => {
              if (!onStickyNotesChange) return;
              onStickyNotesChange(
                stickyNotes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
                true
              );
            }}
            onDeleteNote={
              onStickyNotesChange
                ? (noteId) =>
                    onStickyNotesChange(
                      stickyNotes.filter((n) => n.id !== noteId),
                      true
                    )
                : undefined
            }
          />

          {/* 4. Camada de Cards Ricos das Tabelas (z-20) */}
          {tables.map((table) => {
            const pos = positions[table.name] || { x: 60, y: 60 };
            const isMatch =
              normalizedSearch.length > 0 &&
              (table.name.toLowerCase().includes(normalizedSearch) ||
                table.columns.some((c) =>
                  c.name.toLowerCase().includes(normalizedSearch)
                ));

            const isDimmedBySearch = normalizedSearch.length > 0 && !isMatch;
            const isDimmedBySpotlight =
              !normalizedSearch &&
              connectedTableSet !== null &&
              !connectedTableSet.has(table.name.toLowerCase());

            return (
              <ERTableCard
                key={table.name}
                table={table}
                position={pos}
                relationships={relationships}
                meta={tableMeta[table.name]}
                isDragging={draggingTable === table.name}
                isSelected={selectedTable === table.name}
                isSearchMatch={isMatch}
                isDimmed={isDimmedBySearch || isDimmedBySpotlight}
                isPresentationMode={isPresentationMode}
                enableVisualConnect={enableVisualConnect}
                onMouseDownHeader={handleTableMouseDown}
                onHoverTable={setHoveredTable}
                onSelectTable={onSelectTable}
                onDoubleClickQuery={onDoubleClickTableQuery}
                onUpdateMeta={onUpdateTableMeta}
                onRequestDataPeek={onRequestDataPeek}
                onStartConnectColumn={handleStartConnectColumn}
                onCompleteConnectColumn={handleCompleteConnectColumn}
                isConnectingActive={Boolean(connectingDraft)}
              />
            );
          })}

          {/* 5. Camada SVG de Relacionamentos em Destaque / Hover / Pin (z-30, acima dos cards!) */}
          <ERRelationshipLayer
            layerMode="foreground"
            tables={tables}
            relationships={relationships}
            positions={positions}
            tableMeta={tableMeta}
            lineOffsets={lineOffsets}
            hoveredTable={hoveredTable}
            selectedTable={selectedTable}
            hoveredEdgeId={hoveredEdgeId}
            pinnedEdgeId={pinnedEdgeId}
            draggingEdgeId={draggingEdgeId}
            onHoverEdge={setHoveredEdgeId}
            onTogglePinEdge={(id) =>
              setPinnedEdgeId((prev) => (prev === id ? null : id))
            }
            onStartDragEdge={handleStartDragEdge}
            lineStyle={erPreferences.lineStyle}
            cardinalityNotation={erPreferences.cardinalityNotation}
            labelVisibility={erPreferences.labelVisibility}
            animateLaserFlow={erPreferences.animateLaserFlow}
            reducedMotionAndGlow={reducedMotionAndGlow}
            connectingDraft={connectingDraft}
          />
        </div>
      )}
    </div>
  );
};

