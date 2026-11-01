import React, { useId, useMemo } from 'react';
import {
  calculateTopologicalLayout,
  computeRelationshipRoute,
  ER_CARD_WIDTH,
  ER_COLUMN_PADDING_Y,
  ER_HEADER_HEIGHT,
  ER_ROW_HEIGHT,
  estimateERCardHeight,
  getVisibleColumnsForCard,
} from '../../services/erLayoutEngine';
import {
  SQLEDITOR_CARD_PALETTE,
  type ERColumnNode,
  type ERRelationshipEdge,
  type ERSubjectArea,
  type ERTableNode,
  type ERTablePosition,
  type ERTableVisualMeta,
} from '../../types/erStudio';

interface ERThumbnailSvgProps {
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  positions?: Record<string, ERTablePosition>;
  tableMeta?: Record<string, ERTableVisualMeta>;
  subjectAreas?: ERSubjectArea[];
  className?: string;
}

export const ERThumbnailSvg: React.FC<ERThumbnailSvgProps> = ({
  tables,
  relationships,
  positions,
  tableMeta = {},
  subjectAreas = [],
  className = 'w-full h-36',
}) => {
  const uid = useId().replace(/:/g, '');

  const effectivePositions = useMemo(() => {
    if (positions && Object.keys(positions).length >= tables.length && tables.length > 0) {
      return positions;
    }
    return calculateTopologicalLayout(tables, relationships, tableMeta, false);
  }, [tables, relationships, positions, tableMeta]);

  const viewBox = useMemo(() => {
    if (!tables || tables.length === 0) return '0 0 640 320';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const tbl of tables) {
      const pos = effectivePositions[tbl.name] || { x: 60, y: 60 };
      const h = estimateERCardHeight(tbl, relationships, tableMeta[tbl.name]);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + ER_CARD_WIDTH);
      maxY = Math.max(maxY, pos.y + h);
    }

    for (const area of subjectAreas) {
      minX = Math.min(minX, area.x);
      minY = Math.min(minY, area.y);
      maxX = Math.max(maxX, area.x + area.width);
      maxY = Math.max(maxY, area.y + area.height);
    }

    if (!Number.isFinite(minX)) return '0 0 640 320';
    const pad = 54;
    const w = Math.max(380, maxX - minX + pad * 2);
    const h = Math.max(220, maxY - minY + pad * 2);
    return `${Math.round(minX - pad)} ${Math.round(minY - pad)} ${Math.round(w)} ${Math.round(h)}`;
  }, [tables, relationships, effectivePositions, tableMeta, subjectAreas]);

  const tableMap = useMemo(() => new Map(tables.map((t) => [t.name, t])), [tables]);

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`block select-none bg-[var(--bg-primary)] ${className}`}
      aria-label="Miniatura vetorial do Diagrama Entidade-Relacionamento"
    >
      <defs>
        <pattern
          id={`thumb-grid-${uid}`}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.4" fill="var(--border-color)" />
        </pattern>
      </defs>

      <rect
        x="-4000"
        y="-4000"
        width="12000"
        height="12000"
        fill={`url(#thumb-grid-${uid})`}
      />

      {/* Áreas Temáticas na Miniatura */}
      {subjectAreas.map((area) => (
        <rect
          key={area.id}
          x={area.x}
          y={area.y}
          width={area.width}
          height={area.collapsed ? 40 : area.height}
          rx={16}
          fill={area.color}
          fillOpacity={0.08}
          stroke={area.color}
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeDasharray="8 5"
        />
      ))}

      {/* Linhas Ortogonais 90° Arredondadas */}
      {relationships.map((edge, idx) => {
        const srcTbl = tableMap.get(edge.sourceTable);
        const tgtTbl = tableMap.get(edge.targetTable);
        if (!srcTbl || !tgtTbl) return null;

        const route = computeRelationshipRoute({
          edge,
          sourceTable: srcTbl,
          targetTable: tgtTbl,
          sourcePos: effectivePositions[srcTbl.name] || { x: 60, y: 60 },
          targetPos: effectivePositions[tgtTbl.name] || { x: 420, y: 60 },
          allRelationships: relationships,
          sourceMeta: tableMeta[srcTbl.name],
          targetMeta: tableMeta[tgtTbl.name],
          lineStyle: 'orthogonal',
          edgeIndex: idx,
        });

        return (
          <g key={edge.id}>
            <path
              d={route.path}
              fill="none"
              stroke={edge.isExplicit ? '#FF6B00' : 'var(--accent-yellow)'}
              strokeWidth={3.2}
              strokeOpacity={0.85}
              strokeDasharray={edge.isExplicit ? undefined : '7 5'}
              strokeLinecap="round"
            />
            <circle cx={route.fromX} cy={route.fromY} r={4.2} fill="#FF6B00" />
            <circle cx={route.toX} cy={route.toY} r={4.2} fill="#00E676" />
          </g>
        );
      })}

      {/* Silhueta Vetorial dos Cards de Tabela */}
      {tables.map((tbl, tIdx) => {
        const pos = effectivePositions[tbl.name] || { x: 60, y: 60 };
        const meta = tableMeta[tbl.name];
        const cardH = estimateERCardHeight(tbl, relationships, meta);
        const stripColor =
          meta?.colorStrip ||
          SQLEDITOR_CARD_PALETTE[tIdx % SQLEDITOR_CARD_PALETTE.length].hex;
        const { visibleColumns } = getVisibleColumnsForCard(tbl, relationships, meta?.collapsed);

        return (
          <g key={tbl.name}>
            <rect
              x={pos.x}
              y={pos.y}
              width={ER_CARD_WIDTH}
              height={cardH}
              rx={12}
              fill="var(--bg-surface)"
              stroke="var(--border-color)"
              strokeWidth={2.2}
            />
            <rect
              x={pos.x}
              y={pos.y}
              width={ER_CARD_WIDTH}
              height={ER_HEADER_HEIGHT}
              rx={12}
              fill="var(--bg-secondary)"
            />
            <rect
              x={pos.x}
              y={pos.y}
              width={ER_CARD_WIDTH}
              height={5.5}
              rx={4}
              fill={stripColor}
            />
            <text
              x={pos.x + 14}
              y={pos.y + 28}
              fill="var(--text-primary)"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              fontSize="14"
            >
              {tbl.name.length > 22 ? `${tbl.name.slice(0, 21)}…` : tbl.name}
            </text>

            {visibleColumns.slice(0, 8).map((col: ERColumnNode, cIdx: number) => {
              const rowY =
                pos.y +
                ER_HEADER_HEIGHT +
                ER_COLUMN_PADDING_Y +
                cIdx * ER_ROW_HEIGHT +
                8;
              const pillColor = col.isPrimary
                ? 'var(--accent-yellow)'
                : col.isForeignKey
                ? '#FF6B00'
                : 'var(--text-muted)';
              const barW = Math.min(130, Math.max(52, col.name.length * 7.5));

              return (
                <g key={col.name}>
                  <circle
                    cx={pos.x + 18}
                    cy={rowY + 5}
                    r={col.isPrimary || col.isForeignKey ? 4.2 : 2.8}
                    fill={pillColor}
                  />
                  <rect
                    x={pos.x + 30}
                    y={rowY + 1}
                    width={barW}
                    height={8}
                    rx={4}
                    fill={
                      col.isPrimary || col.isForeignKey
                        ? pillColor
                        : 'var(--text-secondary)'
                    }
                    fillOpacity={col.isPrimary || col.isForeignKey ? 0.85 : 0.45}
                  />
                  <rect
                    x={pos.x + ER_CARD_WIDTH - 64}
                    y={rowY + 1.5}
                    width={48}
                    height={7}
                    rx={3.5}
                    fill="var(--border-color)"
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

