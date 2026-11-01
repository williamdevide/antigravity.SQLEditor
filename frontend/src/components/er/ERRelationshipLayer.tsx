import React from 'react';
import type {
  ERCardinalityNotation,
  ERLabelVisibility,
  ERLineStyle,
} from '../../types/preferences';
import type {
  ERRelationshipEdge,
  ERTableNode,
  ERTablePosition,
  ERTableVisualMeta,
} from '../../types/erStudio';
import {
  computeRelationshipRoute,
  ER_CARD_WIDTH,
} from '../../services/erLayoutEngine';

export interface ConnectingFkDraft {
  sourceTable: string;
  sourceColumn: string;
  fromX: number;
  fromY: number;
  currentX: number;
  currentY: number;
}

interface ERRelationshipLayerProps {
  /** 'background' (z-[5], atrás dos cards) renderiza linhas em repouso; 'foreground' (z-30) renderiza apenas linhas ativas */
  layerMode: 'background' | 'foreground';
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  positions: Record<string, ERTablePosition>;
  tableMeta: Record<string, ERTableVisualMeta>;
  lineOffsets: Record<string, { x: number; y: number }>;
  hoveredTable: string | null;
  selectedTable: string | null;
  hoveredEdgeId: string | null;
  pinnedEdgeId: string | null;
  draggingEdgeId: string | null;
  onHoverEdge: (edgeId: string | null) => void;
  onTogglePinEdge: (edgeId: string) => void;
  onStartDragEdge: (
    edgeId: string,
    currentLabelX: number,
    currentLabelY: number,
    e: React.MouseEvent
  ) => void;
  lineStyle: ERLineStyle;
  cardinalityNotation: ERCardinalityNotation;
  labelVisibility: ERLabelVisibility;
  animateLaserFlow: boolean;
  reducedMotionAndGlow?: boolean;
  connectingDraft?: ConnectingFkDraft | null;
  cardWidth?: number;
}

export const ERRelationshipLayer: React.FC<ERRelationshipLayerProps> = ({
  layerMode,
  tables,
  relationships,
  positions,
  tableMeta,
  lineOffsets,
  hoveredTable,
  selectedTable,
  hoveredEdgeId,
  pinnedEdgeId,
  draggingEdgeId,
  onHoverEdge,
  onTogglePinEdge,
  onStartDragEdge,
  lineStyle,
  cardinalityNotation,
  labelVisibility,
  animateLaserFlow,
  reducedMotionAndGlow = false,
  connectingDraft,
  cardWidth = ER_CARD_WIDTH,
}) => {
  const tableMap = React.useMemo(() => {
    const map = new Map<string, ERTableNode>();
    for (const t of tables) {
      map.set(t.name.toLowerCase(), t);
    }
    return map;
  }, [tables]);

  const activeFocusTable = hoveredTable || selectedTable;
  const activeFocusEdge = hoveredEdgeId || pinnedEdgeId || draggingEdgeId;
  const hasAnySpotlightFocus = Boolean(activeFocusTable || activeFocusEdge);

  const isEdgeHighlighted = (edge: ERRelationshipEdge): boolean => {
    if (activeFocusEdge === edge.id) return true;
    if (activeFocusTable) {
      const low = activeFocusTable.toLowerCase();
      return (
        edge.sourceTable.toLowerCase() === low ||
        edge.targetTable.toLowerCase() === low
      );
    }
    return false;
  };

  /**
   * Renderiza os símbolos vetoriais de cardinalidade nas extremidades FK e PK.
   */
  const renderCardinalityMarkers = (
    edge: ERRelationshipEdge,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    fromSide: 'left' | 'right',
    toSide: 'left' | 'right',
    isActive: boolean
  ) => {
    const fkDir = fromSide === 'right' ? 1 : -1;
    const pkDir = toSide === 'right' ? 1 : -1;
    const strokeMain = isActive ? 'var(--accent-orange)' : 'var(--accent-yellow)';

    // 1. Notação Pé-de-Galinha (Crow's Foot Acadêmico)
    if (cardinalityNotation === 'crowsfoot') {
      const tipFkX = fromX + fkDir * 14;
      const barPk1X = toX + pkDir * 7;
      const barPk2X = toX + pkDir * 12;

      return (
        <g className="pointer-events-none">
          {/* Lado FK (Muitos = Pé-de-galinha de 3 hastes; ou 1:1 = barra dupla) */}
          {edge.cardinality === '1:1' ? (
            <>
              <line
                x1={fromX + fkDir * 6}
                y1={fromY - 6}
                x2={fromX + fkDir * 6}
                y2={fromY + 6}
                stroke={strokeMain}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={fromX + fkDir * 11}
                y1={fromY - 6}
                x2={fromX + fkDir * 11}
                y2={fromY + 6}
                stroke={strokeMain}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              {/* Três garras convergindo da borda do card FK para o tronco */}
              <path
                d={`M ${fromX} ${fromY - 7} L ${tipFkX} ${fromY} L ${fromX} ${fromY + 7}`}
                fill="none"
                stroke={strokeMain}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1={tipFkX + fkDir * 3}
                y1={fromY - 6}
                x2={tipFkX + fkDir * 3}
                y2={fromY + 6}
                stroke={strokeMain}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </>
          )}

          {/* Lado PK (Um e Apenas Um = Dupla Barra Vertical || em Verde Sucesso) */}
          <line
            x1={barPk1X}
            y1={toY - 6.5}
            x2={barPk1X}
            y2={toY + 6.5}
            stroke="var(--status-success)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <line
            x1={barPk2X}
            y1={toY - 6.5}
            x2={barPk2X}
            y2={toY + 6.5}
            stroke="var(--status-success)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      );
    }

    // 2. Notação Clássica (1 : N)
    if (cardinalityNotation === '1:N') {
      const fkBadgeX = fromX + fkDir * 14;
      const pkBadgeX = toX + pkDir * 14;
      const fkSymbol = edge.cardinality === '1:1' ? '1' : 'N';

      return (
        <g className="pointer-events-none">
          <circle
            cx={fkBadgeX}
            cy={fromY}
            r={8.5}
            fill="var(--bg-surface)"
            stroke="var(--accent-orange)"
            strokeWidth={1.6}
          />
          <text
            x={fkBadgeX}
            y={fromY + 3.5}
            textAnchor="middle"
            fill="var(--accent-orange)"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="var(--font-code)"
          >
            {fkSymbol}
          </text>

          <circle
            cx={pkBadgeX}
            cy={toY}
            r={8.5}
            fill="var(--bg-surface)"
            stroke="var(--status-success)"
            strokeWidth={1.6}
          />
          <text
            x={pkBadgeX}
            y={toY + 3.5}
            textAnchor="middle"
            fill="var(--status-success)"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="var(--font-code)"
          >
            1
          </text>
        </g>
      );
    }

    // 3. Notação Pinos Modernos + Seta Direcional
    const arrowTipX = toX;
    const arrowBaseX = toX + pkDir * 9;
    return (
      <g className="pointer-events-none">
        <circle
          cx={fromX}
          cy={fromY}
          r={isActive ? 5 : 4}
          fill="var(--accent-orange)"
          stroke="var(--bg-surface)"
          strokeWidth={1.6}
        />
        <polygon
          points={`${arrowTipX},${toY} ${arrowBaseX},${toY - 5} ${arrowBaseX},${toY + 5}`}
          fill="var(--status-success)"
        />
        <circle
          cx={toX}
          cy={toY}
          r={isActive ? 4.5 : 3.5}
          fill="var(--status-success)"
          stroke="var(--bg-surface)"
          strokeWidth={1.4}
        />
      </g>
    );
  };

  return (
    <svg
      width="10000"
      height="10000"
      className={`absolute top-0 left-0 overflow-visible pointer-events-none ${
        layerMode === 'foreground' ? 'z-30' : 'z-[5]'
      }`}
    >
      {!reducedMotionAndGlow && layerMode === 'foreground' && (
        <defs>
          <filter id="er-glow-active" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {relationships.map((edge, idx) => {
        const highlighted = isEdgeHighlighted(edge);

        // Separação de profundidade: linhas em repouso ficam atrás dos cards (z-[5]);
        // linhas destacadas sobem para z-30 acima dos cards!
        if (layerMode === 'background' && highlighted) return null;
        if (layerMode === 'foreground' && !highlighted) return null;

        const sourceTable = tableMap.get(edge.sourceTable.toLowerCase());
        const targetTable = tableMap.get(edge.targetTable.toLowerCase());
        if (!sourceTable || !targetTable) return null;

        const sourcePos = positions[sourceTable.name] || { x: 60, y: 60 };
        const targetPos = positions[targetTable.name] || { x: 420, y: 60 };

        const route = computeRelationshipRoute({
          edge,
          sourceTable,
          targetTable,
          sourcePos,
          targetPos,
          allRelationships: relationships,
          sourceMeta: tableMeta[sourceTable.name],
          targetMeta: tableMeta[targetTable.name],
          lineStyle,
          edgeIndex: idx,
          customOffset: lineOffsets[edge.id],
          cardWidth,
        });

        const isPinned = pinnedEdgeId === edge.id;
        const isDragging = draggingEdgeId === edge.id;
        const spotlightOpacity = hasAnySpotlightFocus && !highlighted ? 0.22 : 1;

        const strokeColor = isDragging
          ? 'var(--status-success)'
          : highlighted
          ? 'var(--accent-orange)'
          : 'var(--accent-yellow)';

        const showPillLabel =
          labelVisibility === 'always' || highlighted || isPinned || isDragging;

        const relText = edge.isSelfJoin
          ? `↻ ${edge.sourceColumn} ➔ ${edge.targetColumn} (${edge.cardinality})`
          : `${edge.sourceColumn} ➔ ${edge.targetTable}.${edge.targetColumn} (${edge.cardinality})`;
        const suffixText = !edge.isExplicit ? ' • Inferida' : '';
        const fullLabel = `${relText}${suffixText}`;
        const pillWidth = Math.max(120, fullLabel.length * 6.8 + 26);
        const pillHeight = 24;

        return (
          <g
            key={edge.id}
            style={{
              opacity: spotlightOpacity,
              transition: reducedMotionAndGlow ? 'none' : 'opacity 160ms ease-out',
            }}
          >
            {/* CAMADA 1: Corredor Invisível Largo de 22px para Hover, Pin e Arraste */}
            <path
              d={route.path}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => onHoverEdge(edge.id)}
              onMouseLeave={() => onHoverEdge(null)}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinEdge(edge.id);
              }}
              onMouseDown={(e) => {
                if (e.altKey || e.shiftKey) {
                  onStartDragEdge(edge.id, route.labelX, route.labelY, e);
                }
              }}
            >
              <title>
                {`${edge.sourceTable}.${edge.sourceColumn} ➔ ${edge.targetTable}.${edge.targetColumn} [${edge.cardinality}]${
                  !edge.isExplicit ? ' (FK inferida pelo nome — sem constraint explícita)' : ''
                } — Clique para fixar ou arraste a etiqueta`}
              </title>
            </path>

            {/* CAMADA 2: Trilha Backdrop de Contraste sobre a grade e cruzamentos */}
            <path
              d={route.path}
              fill="none"
              stroke="var(--bg-primary)"
              strokeWidth={highlighted ? 6.5 : 4.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
            {route.forkPaths.map((fp, fIdx) => (
              <path
                key={`fork-bg-${fIdx}`}
                d={fp}
                fill="none"
                stroke="var(--bg-primary)"
                strokeWidth={highlighted ? 5.5 : 4}
                strokeLinecap="round"
                className="pointer-events-none"
              />
            ))}

            {/* CAMADA 3: Traço Vetorial Principal (Sólido para FK Explícita, Tracejado Longo para FK Inferida) */}
            <path
              d={route.path}
              fill="none"
              stroke={strokeColor}
              strokeWidth={highlighted ? 2.8 : 2}
              strokeDasharray={!edge.isExplicit && !highlighted ? '9 5' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={
                highlighted && !reducedMotionAndGlow && layerMode === 'foreground'
                  ? 'url(#er-glow-active)'
                  : undefined
              }
              className="pointer-events-none"
            />
            {route.forkPaths.map((fp, fIdx) => (
              <path
                key={`fork-fg-${fIdx}`}
                d={fp}
                fill="none"
                stroke={strokeColor}
                strokeWidth={highlighted ? 2.4 : 1.8}
                strokeLinecap="round"
                className="pointer-events-none"
              />
            ))}

            {/* CAMADA 4: Fluxo Laser Animado Direcional (FK ➔ PK) */}
            {animateLaserFlow && !reducedMotionAndGlow && (
              <path
                d={route.path}
                fill="none"
                stroke={highlighted ? '#FFFFFF' : 'var(--accent-orange)'}
                strokeWidth={highlighted ? 2.2 : 1.6}
                strokeDasharray="6 26"
                strokeLinecap="round"
                opacity={highlighted ? 0.92 : 0.65}
                className="animate-er-laser pointer-events-none"
              />
            )}

            {/* CAMADA 6: Marcadores de Cardinalidade (Pé-de-Galinha / 1:N / Pinos) */}
            {renderCardinalityMarkers(
              edge,
              route.fromX,
              route.fromY,
              route.toX,
              route.toY,
              route.fromSide,
              route.toSide,
              highlighted
            )}

            {/* CAMADA 7: Pílula de Rótulo Interativa (Sob Demanda no Foco ou Sempre Visível) */}
            {showPillLabel && (
              <g
                transform={`translate(${route.labelX - pillWidth / 2}, ${route.labelY - pillHeight / 2})`}
                style={{ pointerEvents: 'all', cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseEnter={() => onHoverEdge(edge.id)}
                onMouseLeave={() => onHoverEdge(null)}
                onMouseDown={(e) => onStartDragEdge(edge.id, route.labelX, route.labelY, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinEdge(edge.id);
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={pillWidth}
                  height={pillHeight}
                  rx={6}
                  fill="var(--bg-surface)"
                  stroke={
                    isDragging
                      ? 'var(--status-success)'
                      : isPinned
                      ? 'var(--accent-orange)'
                      : !edge.isExplicit
                      ? 'var(--text-muted)'
                      : 'var(--accent-orange)'
                  }
                  strokeWidth={highlighted || isPinned ? 1.8 : 1.2}
                  strokeDasharray={!edge.isExplicit ? '4 2' : undefined}
                />
                <text
                  x={pillWidth / 2}
                  y={pillHeight / 2 + 3.8}
                  textAnchor="middle"
                  fill={highlighted ? 'var(--accent-yellow)' : 'var(--text-primary)'}
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="var(--font-code)"
                >
                  {fullLabel}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Fio Elástico Ao Vivo durante Drag-to-Connect FK (Fase 2 habilitada desde a base) */}
      {layerMode === 'foreground' && connectingDraft && (
        <g className="pointer-events-none">
          <path
            d={`M ${connectingDraft.fromX} ${connectingDraft.fromY} L ${
              (connectingDraft.fromX + connectingDraft.currentX) / 2
            } ${connectingDraft.fromY} L ${
              (connectingDraft.fromX + connectingDraft.currentX) / 2
            } ${connectingDraft.currentY} L ${connectingDraft.currentX} ${connectingDraft.currentY}`}
            fill="none"
            stroke="var(--status-success)"
            strokeWidth={2.6}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          <circle
            cx={connectingDraft.fromX}
            cy={connectingDraft.fromY}
            r={5}
            fill="var(--accent-orange)"
          />
          <circle
            cx={connectingDraft.currentX}
            cy={connectingDraft.currentY}
            r={6}
            fill="var(--status-success)"
          />
        </g>
      )}
    </svg>
  );
};

