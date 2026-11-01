import React, { useMemo, useRef, useState } from 'react';
import { parseLiveSqlSchema } from '../../services/liveSqlSchemaParser';
import type {
  ERTablePosition,
  ERTableVisualMeta,
} from '../../types/erStudio';
import { ERRelationshipLayer } from './ERRelationshipLayer';
import { ERTableCard } from './ERTableCard';

const HERO_DEMO_SQL = `
CREATE TABLE tb_departamentos (
  id_depto INT PRIMARY KEY,
  nome_depto VARCHAR(80) NOT NULL,
  orcamento DECIMAL(12,2)
);

CREATE TABLE tb_cargos (
  id_cargo INT PRIMARY KEY,
  titulo_cargo VARCHAR(60) NOT NULL,
  nivel VARCHAR(20)
);

CREATE TABLE tb_funcionarios (
  id_funcionario INT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  departamento_id INT NOT NULL,
  cargo_id INT NOT NULL,
  salario DECIMAL(10,2),
  FOREIGN KEY (departamento_id) REFERENCES tb_departamentos(id_depto),
  FOREIGN KEY (cargo_id) REFERENCES tb_cargos(id_cargo)
);

INSERT INTO tb_departamentos VALUES (1, 'Engenharia de Software', 850000.00), (2, 'Dados & IA', 640000.00);
INSERT INTO tb_cargos VALUES (10, 'Tech Lead Senior', 'Sênior'), (20, 'Engenheira de Dados', 'Pleno');
INSERT INTO tb_funcionarios VALUES
  (101, 'Carlos Eduardo Silva', 1, 10, 14850.00),
  (102, 'Mariana Souza Castro', 2, 20, 11400.00);
`;

const INITIAL_POSITIONS: Record<string, ERTablePosition> = {
  tb_funcionarios: { x: 42, y: 54 },
  tb_cargos: { x: 488, y: 28 },
  tb_departamentos: { x: 488, y: 234 },
};

const INITIAL_META: Record<string, ERTableVisualMeta> = {
  tb_funcionarios: { colorStrip: '#FF6B00' },
  tb_cargos: { colorStrip: '#00E676' },
  tb_departamentos: { colorStrip: '#29B6F6' },
};

export const HeroInteractiveERCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tables, relationships } = useMemo(
    () => parseLiveSqlSchema(HERO_DEMO_SQL, { inferImplicitForeignKeys: true }),
    []
  );

  const [positions, setPositions] =
    useState<Record<string, ERTablePosition>>(INITIAL_POSITIONS);
  const [tableMeta, setTableMeta] =
    useState<Record<string, ERTableVisualMeta>>(INITIAL_META);
  const [lineOffsets, setLineOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [pinnedEdgeId, setPinnedEdgeId] = useState<string | null>(null);

  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDownHeader = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTable(tableName);
    const rect = containerRef.current?.getBoundingClientRect();
    const pos = positions[tableName] || { x: 40, y: 40 };
    const mx = e.clientX - (rect?.left || 0);
    const my = e.clientY - (rect?.top || 0);
    setDraggingTable(tableName);
    dragOffsetRef.current = { x: mx - pos.x, y: my - pos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTable) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const mx = e.clientX - (rect?.left || 0);
    const my = e.clientY - (rect?.top || 0);
    setPositions((prev) => ({
      ...prev,
      [draggingTable]: {
        x: Math.max(8, Math.round(mx - dragOffsetRef.current.x)),
        y: Math.max(8, Math.round(my - dragOffsetRef.current.y)),
      },
    }));
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
  };

  const connectedSet = useMemo(() => {
    const activeEdge = hoveredEdgeId || pinnedEdgeId;
    if (activeEdge) {
      const rel = relationships.find((r) => r.id === activeEdge);
      if (rel) {
        return new Set([
          rel.sourceTable.toLowerCase(),
          rel.targetTable.toLowerCase(),
        ]);
      }
    }
    if (hoveredTable) {
      const s = new Set([hoveredTable.toLowerCase()]);
      for (const r of relationships) {
        if (r.sourceTable.toLowerCase() === hoveredTable.toLowerCase()) {
          s.add(r.targetTable.toLowerCase());
        }
        if (r.targetTable.toLowerCase() === hoveredTable.toLowerCase()) {
          s.add(r.sourceTable.toLowerCase());
        }
      }
      return s;
    }
    return null;
  }, [hoveredTable, hoveredEdgeId, pinnedEdgeId, relationships]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={() => {
        setSelectedTable(null);
        setPinnedEdgeId(null);
      }}
      className="w-full h-full relative overflow-hidden select-none bg-[var(--bg-primary)]"
      style={{
        backgroundImage:
          'radial-gradient(var(--border-color) 1.15px, transparent 1.15px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Camada 1: Relacionamentos em Repouso (z-[5]) */}
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
        draggingEdgeId={null}
        onHoverEdge={setHoveredEdgeId}
        onTogglePinEdge={(id) =>
          setPinnedEdgeId((prev) => (prev === id ? null : id))
        }
        onStartDragEdge={() => {}}
        lineStyle="orthogonal"
        cardinalityNotation="crowsfoot"
        labelVisibility="always"
        animateLaserFlow={true}
        reducedMotionAndGlow={false}
      />

      {/* Camada 2: Cards Reais Interativos Arrastáveis a 60fps */}
      {tables.map((tbl) => {
        const isDimmed =
          connectedSet !== null && !connectedSet.has(tbl.name.toLowerCase());
        return (
          <ERTableCard
            key={tbl.name}
            table={tbl}
            position={positions[tbl.name] || { x: 40, y: 40 }}
            relationships={relationships}
            meta={tableMeta[tbl.name]}
            isDragging={draggingTable === tbl.name}
            isSelected={selectedTable === tbl.name}
            isSearchMatch={false}
            isDimmed={isDimmed}
            isPresentationMode={false}
            onMouseDownHeader={handleMouseDownHeader}
            onHoverTable={setHoveredTable}
            onSelectTable={setSelectedTable}
            onUpdateMeta={(tName, patch) =>
              setTableMeta((prev) => ({
                ...prev,
                [tName]: { ...(prev[tName] || {}), ...patch },
              }))
            }
          />
        );
      })}

      {/* Camada 3: Relacionamentos em Destaque / Hover (z-30) */}
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
        draggingEdgeId={null}
        onHoverEdge={setHoveredEdgeId}
        onTogglePinEdge={(id) =>
          setPinnedEdgeId((prev) => (prev === id ? null : id))
        }
        onStartDragEdge={() => {}}
        lineStyle="orthogonal"
        cardinalityNotation="crowsfoot"
        labelVisibility="always"
        animateLaserFlow={true}
        reducedMotionAndGlow={false}
      />

      {/* Barra Inferior Interativa do Showcase */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-surface)]/95 border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs shadow-lg"
      >
        <span className="text-[var(--text-secondary)]">
          💡 <strong>Experimente agora:</strong> arraste os cards acima, clique no olho{' '}
          <code className="text-[var(--accent-yellow)] font-mono">👁️</code> para espiar os dados ou passe o mouse nas linhas 90°!
        </span>
        <button
          type="button"
          onClick={() => {
            setPositions(INITIAL_POSITIONS);
            setTableMeta(INITIAL_META);
            setLineOffsets({});
          }}
          className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--accent-yellow)] cursor-pointer"
        >
          Resetar Posições
        </button>
      </div>
    </div>
  );
};

