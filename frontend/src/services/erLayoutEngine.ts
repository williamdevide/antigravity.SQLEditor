import type { ColumnSchema, DatabaseSchema, TableSchema } from '../types';
import type { ERLineStyle } from '../types/preferences';
import type {
  ERColumnCategory,
  ERColumnNode,
  ERRelationshipEdge,
  ERTableNode,
  ERTablePosition,
  ERTableVisualMeta,
} from '../types/erStudio';

// ============================================================================
// CONSTANTES GEOMÉTRICAS COMPARTILHADAS ( CARD DOM === ÂNCORAS SVG === EXPORT )
// ============================================================================

export const ER_CARD_WIDTH = 276;
export const ER_HEADER_HEIGHT = 44;
export const ER_COLUMN_PADDING_Y = 8;
export const ER_ROW_HEIGHT = 30;
export const ER_DATA_PEEK_HEIGHT = 176;
export const ER_COLLAPSED_FOOTER_HEIGHT = 26;
export const ER_TRIGGERS_HEADER_HEIGHT = 24;
export const ER_TRIGGER_ROW_HEIGHT = 28;
export const ER_SNAP_GRID_SIZE = 24;

/**
 * Arredonda uma coordenada para a grade de 24px quando o Snap-to-Grid está ativo.
 */
export function snapToGridCoord(value: number, enabled: boolean, gridSize = ER_SNAP_GRID_SIZE): number {
  if (!enabled) return Math.round(value);
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Classifica o tipo SQL em categoria semântica para ícones e cores consistentes.
 */
export function categorizeSqlType(rawType: string, isPk: boolean, isFk: boolean): ERColumnCategory {
  if (isPk || isFk) return 'key';
  const t = (rawType || '').toLowerCase();
  if (t.includes('serial') || t.includes('uuid')) return 'key';
  if (t.startsWith('bool') || t === 'tinyint(1)' || t === 'bit' || t === 'bit(1)') return 'boolean';
  if (
    t.includes('int') ||
    t.includes('float') ||
    t.includes('double') ||
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('real') ||
    t.includes('money')
  ) {
    return 'numeric';
  }
  if (
    t.includes('char') ||
    t.includes('text') ||
    t.includes('string') ||
    t.startsWith('enum') ||
    t.startsWith('set(')
  ) {
    return 'text';
  }
  if (t.includes('time') || t.includes('date') || t === 'year') {
    return 'datetime';
  }
  if (t.includes('json') || t.includes('array') || t.endsWith('[]')) {
    return 'json';
  }
  return 'other';
}

/**
 * Normaliza radicais em português/inglês para correspondência heurística de FKs implícitas.
 */
function normalizeEntityStem(str: string): string {
  let s = str.toLowerCase().trim();
  s = s.replace(/^(tb_|tbl_|tab_|dim_|fato_|t_)/, '');
  if (s.endsWith('coes')) return s.slice(0, -4) + 'cao';
  if (s.endsWith('soes')) return s.slice(0, -4) + 'sao';
  if (s.endsWith('ais') && s.length > 4) return s.slice(0, -3) + 'al';
  if (s.endsWith('eis') && s.length > 4) return s.slice(0, -3) + 'el';
  if (s.endsWith('ois') && s.length > 4) return s.slice(0, -3) + 'ol';
  if (s.endsWith('ns') && s.length > 3) return s.slice(0, -2) + 'm';
  if (s.endsWith('res') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('zes') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('ies') && s.length > 4) return s.slice(0, -3) + 'y';
  if (s.endsWith('s') && !s.endsWith('ss') && s.length > 3) return s.slice(0, -1);
  return s;
}

function findPrimaryKeyColumnName(table: TableSchema): string {
  const explicitPk = table.columns.find((c) => c.isPrimary);
  if (explicitPk) return explicitPk.name;

  const tblStem = normalizeEntityStem(table.name);
  const conventional = table.columns.find((c) => {
    const low = c.name.toLowerCase();
    return (
      low === 'id' ||
      low === `id_${table.name.toLowerCase()}` ||
      low === `id_${tblStem}` ||
      low === `${tblStem}_id`
    );
  });
  return conventional ? conventional.name : table.columns[0]?.name || 'id';
}

/**
 * Converte um DatabaseSchema (AlaSQL) em nós ERTableNode e arestas ERRelationshipEdge,
 * respeitando a preferência pedagógica `inferImplicitForeignKeys` e suportando Self-Join!
 */
export function buildERGraphFromDatabaseSchema(
  dbSchema: DatabaseSchema | undefined,
  options: {
    inferImplicitForeignKeys: boolean;
    sampleRowsByTable?: Record<string, Record<string, unknown>[]>;
    dictionaryTableComments?: Record<string, string>;
    dictionaryColumnComments?: Record<string, string>;
  }
): { tables: ERTableNode[]; relationships: ERRelationshipEdge[] } {
  if (!dbSchema || !dbSchema.tables || dbSchema.tables.length === 0) {
    return { tables: [], relationships: [] };
  }

  const relationships: ERRelationshipEdge[] = [];
  const seenEdgeIds = new Set<string>();
  const rawTables = dbSchema.tables;

  // Mapa rápido de tabelas por nome (case-insensitive)
  const tableByLower = new Map<string, TableSchema>();
  for (const t of rawTables) {
    tableByLower.set(t.name.toLowerCase(), t);
  }

  // 1. Primeira passagem: extrai relacionamentos explícitos e (opcionalmente) implícitos
  const inferredFkMap = new Map<string, { targetTable: string; targetColumn: string; isExplicit: boolean }>();

  for (const table of rawTables) {
    const tableStem = normalizeEntityStem(table.name);

    for (const col of table.columns) {
      const colKey = `${table.name.toLowerCase()}.${col.name.toLowerCase()}`;

      // A. Chave estrangeira explícita declarada no DDL (FOREIGN KEY / REFERENCES)
      if (col.foreignKeyRef && col.foreignKeyRef.table) {
        const targetTbl = tableByLower.get(col.foreignKeyRef.table.toLowerCase());
        const resolvedTargetTable = targetTbl ? targetTbl.name : col.foreignKeyRef.table;
        let resolvedTargetCol = col.foreignKeyRef.column;
        if (!resolvedTargetCol && targetTbl) {
          resolvedTargetCol = findPrimaryKeyColumnName(targetTbl);
        } else if (targetTbl && resolvedTargetCol) {
          const matchedCol = targetTbl.columns.find(
            (tc) => tc.name.toLowerCase() === resolvedTargetCol.toLowerCase()
          );
          if (matchedCol) resolvedTargetCol = matchedCol.name;
        }
        resolvedTargetCol = resolvedTargetCol || 'id';

        inferredFkMap.set(colKey, {
          targetTable: resolvedTargetTable,
          targetColumn: resolvedTargetCol,
          isExplicit: true,
        });

        const edgeId = `${table.name}.${col.name}->${resolvedTargetTable}.${resolvedTargetCol}`.toLowerCase();
        if (!seenEdgeIds.has(edgeId)) {
          seenEdgeIds.add(edgeId);
          const isOneToOne = Boolean(col.isUnique || (col.isPrimary && table.columns.filter((c) => c.isPrimary).length === 1));
          relationships.push({
            id: edgeId,
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable: resolvedTargetTable,
            targetColumn: resolvedTargetCol,
            cardinality: isOneToOne ? '1:1' : '1:N',
            isExplicit: true,
            isSelfJoin: table.name.toLowerCase() === resolvedTargetTable.toLowerCase(),
          });
        }
        continue;
      }

      // B. Chave estrangeira implícita por convenção de nomenclatura (somente se inferImplicitForeignKeys === true)
      if (!options.inferImplicitForeignKeys) continue;

      const colLower = col.name.toLowerCase();
      const isOwnPk =
        Boolean(col.isPrimary) &&
        (colLower === 'id' ||
          colLower === `id_${table.name.toLowerCase()}` ||
          colLower === `id_${tableStem}` ||
          colLower === `${tableStem}_id`);
      if (isOwnPk) continue;

      let candidateRaw = '';
      if (colLower.endsWith('_id') && colLower.length > 3) {
        candidateRaw = colLower.slice(0, -3);
      } else if (colLower.startsWith('id_') && colLower.length > 3) {
        candidateRaw = colLower.slice(3);
      } else if (colLower.startsWith('fk_') && colLower.length > 3) {
        candidateRaw = colLower.slice(3);
      } else if (colLower.startsWith('cod_') && colLower.length > 4) {
        candidateRaw = colLower.slice(4);
      }

      if (!candidateRaw) continue;

      // Suporte a auto-relacionamento implícito: ex: id_gerente / categoria_pai_id / supervisor_id
      let targetTable: TableSchema | undefined;
      const cleanedParentCandidate = candidateRaw.replace(/_(pai|mae|superior|chefe|origem|destino|ref)$/, '');
      const candidateStem = normalizeEntityStem(cleanedParentCandidate);

      targetTable = rawTables.find((t) => {
        const tLow = t.name.toLowerCase();
        const tStem = normalizeEntityStem(t.name);
        return (
          tLow === candidateRaw ||
          tLow === cleanedParentCandidate ||
          tStem === candidateStem ||
          (candidateStem.length >= 4 && (tStem.endsWith(`_${candidateStem}`) || tLow.endsWith(`_${candidateStem}`)))
        );
      });

      // Evita falso positivo de PK própria tratada como Self-Join quando o nome é exatamente id_<propria_tabela>
      if (
        targetTable &&
        targetTable.name.toLowerCase() === table.name.toLowerCase() &&
        cleanedParentCandidate === candidateRaw &&
        (colLower === `id_${tableStem}` || colLower === `${tableStem}_id` || colLower === `id_${table.name.toLowerCase()}`)
      ) {
        continue;
      }

      if (targetTable) {
        const targetCol = findPrimaryKeyColumnName(targetTable);
        inferredFkMap.set(colKey, {
          targetTable: targetTable.name,
          targetColumn: targetCol,
          isExplicit: false,
        });

        const edgeId = `${table.name}.${col.name}->${targetTable.name}.${targetCol}`.toLowerCase();
        if (!seenEdgeIds.has(edgeId)) {
          seenEdgeIds.add(edgeId);
          relationships.push({
            id: edgeId,
            sourceTable: table.name,
            sourceColumn: col.name,
            targetTable: targetTable.name,
            targetColumn: targetCol,
            cardinality: col.isUnique ? '1:1' : '1:N',
            isExplicit: false,
            isSelfJoin: table.name.toLowerCase() === targetTable.name.toLowerCase(),
          });
        }
      }
    }
  }

  // 2. Segunda passagem: monta ERTableNode[] enriquecidos
  const tables: ERTableNode[] = rawTables.map((table) => {
    const sampleRows = options.sampleRowsByTable?.[table.name] || [];
    const columns: ERColumnNode[] = table.columns.map((col: ColumnSchema) => {
      const colKey = `${table.name.toLowerCase()}.${col.name.toLowerCase()}`;
      const fkInfo = inferredFkMap.get(colKey);
      const isPk = Boolean(col.isPrimary);
      const isFk = Boolean(fkInfo);
      const dictKey = `${table.name}.${col.name}`;

      return {
        id: `${table.name}_${col.name}`,
        name: col.name,
        type: col.type || 'VARCHAR(100)',
        category: categorizeSqlType(col.type, isPk, isFk),
        isPrimary: isPk,
        isForeignKey: isFk,
        isExplicitForeignKey: Boolean(fkInfo?.isExplicit),
        fkTarget: fkInfo
          ? { table: fkInfo.targetTable, column: fkInfo.targetColumn }
          : undefined,
        isNullable: !col.isNotNull && !isPk,
        isUnique: Boolean(col.isUnique),
        comment: options.dictionaryColumnComments?.[dictKey],
      };
    });

    return {
      id: table.name,
      name: table.name,
      columns,
      rowCount: table.rowCount ?? sampleRows.length,
      sampleRows,
      triggers: [],
      isView: table.isView,
      comment: options.dictionaryTableComments?.[table.name],
    };
  });

  return { tables, relationships };
}

/**
 * Retorna as colunas visíveis do card (no modo Smart Collapse mantém sempre PKs, FKs e colunas conectadas!).
 */
export function getVisibleColumnsForCard(
  table: ERTableNode,
  relationships: ERRelationshipEdge[],
  collapsed?: boolean
): { visibleColumns: ERColumnNode[]; hiddenCount: number } {
  if (!collapsed) {
    return { visibleColumns: table.columns, hiddenCount: 0 };
  }

  const connectedCols = new Set<string>();
  const tblLow = table.name.toLowerCase();
  for (const rel of relationships) {
    if (rel.sourceTable.toLowerCase() === tblLow) {
      connectedCols.add(rel.sourceColumn.toLowerCase());
      rel.sourceColumns?.forEach((c) => connectedCols.add(c.toLowerCase()));
    }
    if (rel.targetTable.toLowerCase() === tblLow) {
      connectedCols.add(rel.targetColumn.toLowerCase());
      rel.targetColumns?.forEach((c) => connectedCols.add(c.toLowerCase()));
    }
  }

  const visibleColumns = table.columns.filter(
    (c) => c.isPrimary || c.isForeignKey || connectedCols.has(c.name.toLowerCase())
  );

  // Se uma tabela não tiver nenhuma PK/FK, mantém a primeira coluna para não ficar vazia
  if (visibleColumns.length === 0 && table.columns.length > 0) {
    return {
      visibleColumns: [table.columns[0]],
      hiddenCount: Math.max(0, table.columns.length - 1),
    };
  }

  return {
    visibleColumns,
    hiddenCount: Math.max(0, table.columns.length - visibleColumns.length),
  };
}

/**
 * Calcula a altura exata em pixels de um ERTableCard no DOM para âncoras, Auto-Layout e Fit-to-View.
 */
export function estimateERCardHeight(
  table: ERTableNode,
  relationships: ERRelationshipEdge[],
  meta?: ERTableVisualMeta
): number {
  const triggersHeight =
    table.triggers.length > 0
      ? ER_TRIGGERS_HEADER_HEIGHT + table.triggers.length * ER_TRIGGER_ROW_HEIGHT + 8
      : 0;

  if (meta?.viewMode === 'data') {
    return ER_HEADER_HEIGHT + ER_DATA_PEEK_HEIGHT + triggersHeight;
  }

  const { visibleColumns, hiddenCount } = getVisibleColumnsForCard(
    table,
    relationships,
    meta?.collapsed
  );

  const colsBodyHeight =
    ER_COLUMN_PADDING_Y * 2 + Math.max(1, visibleColumns.length) * ER_ROW_HEIGHT;
  const collapsedFooter = hiddenCount > 0 ? ER_COLLAPSED_FOOTER_HEIGHT : 0;

  return ER_HEADER_HEIGHT + colsBodyHeight + collapsedFooter + triggersHeight;
}

/**
 * Calcula a coordenada Y exata do pino de conexão de uma coluna específica.
 */
export function getColumnAnchorY(
  table: ERTableNode,
  tablePos: ERTablePosition,
  columnName: string,
  relationships: ERRelationshipEdge[],
  meta?: ERTableVisualMeta
): number {
  if (meta?.viewMode === 'data') {
    const colIdx = Math.max(
      0,
      table.columns.findIndex((c) => c.name.toLowerCase() === columnName.toLowerCase())
    );
    const ratio = table.columns.length > 1 ? colIdx / (table.columns.length - 1) : 0.5;
    return Math.round(tablePos.y + ER_HEADER_HEIGHT + 24 + ratio * (ER_DATA_PEEK_HEIGHT - 48));
  }

  const { visibleColumns } = getVisibleColumnsForCard(table, relationships, meta?.collapsed);
  const idx = visibleColumns.findIndex(
    (c) => c.name.toLowerCase() === columnName.toLowerCase()
  );
  const safeIdx = idx >= 0 ? idx : 0;

  return (
    tablePos.y +
    ER_HEADER_HEIGHT +
    ER_COLUMN_PADDING_Y +
    safeIdx * ER_ROW_HEIGHT +
    ER_ROW_HEIGHT / 2
  );
}

// ============================================================================
// MOTOR DE ROTEAMENTO DE LINHAS (90° ORTOGONAL ARREDONDADO, BÉZIER, SELF-JOIN & FORK)
// ============================================================================

export interface ComputedRelationshipRoute {
  path: string;
  /** Traçados secundários para chaves estrangeiras compostas (garfo fork-trunk-fork) */
  forkPaths: string[];
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromSide: 'left' | 'right';
  toSide: 'left' | 'right';
  labelX: number;
  labelY: number;
}

/**
 * Constrói caminho SVG ortogonal 90° com cantos quadráticos arredondados suaves (assinatura SQLEditor).
 */
export function buildRoundedOrthogonalSvgPath(
  points: Array<{ x: number; y: number }>,
  maxRadius = 10
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Remove pontos consecutivos colineares redundantes ou idênticos
  const cleaned: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = points[i];
    if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;
    cleaned.push(curr);
  }
  if (cleaned.length < 2) return '';

  let d = `M ${cleaned[0].x} ${cleaned[0].y}`;

  for (let i = 1; i < cleaned.length - 1; i++) {
    const prev = cleaned[i - 1];
    const curr = cleaned[i];
    const next = cleaned[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1 || len2 < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Se colinear, apenas segue reto
    const cross = Math.abs(v1x * v2y - v1y * v2x);
    if (cross < 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(maxRadius, len1 / 2, len2 / 2);
    const startCornerX = curr.x - (v1x / len1) * r;
    const startCornerY = curr.y - (v1y / len1) * r;
    const endCornerX = curr.x + (v2x / len2) * r;
    const endCornerY = curr.y + (v2y / len2) * r;

    d += ` L ${Number(startCornerX.toFixed(1))} ${Number(startCornerY.toFixed(1))}`;
    d += ` Q ${Number(curr.x.toFixed(1))} ${Number(curr.y.toFixed(1))} ${Number(endCornerX.toFixed(1))} ${Number(endCornerY.toFixed(1))}`;
  }

  const last = cleaned[cleaned.length - 1];
  d += ` L ${Number(last.x.toFixed(1))} ${Number(last.y.toFixed(1))}`;
  return d;
}

/**
 * Calcula a rota completa de uma aresta ER (Ortogonal 90° Arredondada, Bézier, Self-Join "C" e Fork Composto).
 */
export function computeRelationshipRoute(params: {
  edge: ERRelationshipEdge;
  sourceTable: ERTableNode;
  targetTable: ERTableNode;
  sourcePos: ERTablePosition;
  targetPos: ERTablePosition;
  allRelationships: ERRelationshipEdge[];
  sourceMeta?: ERTableVisualMeta;
  targetMeta?: ERTableVisualMeta;
  lineStyle: ERLineStyle;
  edgeIndex: number;
  customOffset?: { x: number; y: number };
  cardWidth?: number;
}): ComputedRelationshipRoute {
  const {
    edge,
    sourceTable,
    targetTable,
    sourcePos,
    targetPos,
    allRelationships,
    sourceMeta,
    targetMeta,
    lineStyle,
    edgeIndex,
    customOffset,
    cardWidth = ER_CARD_WIDTH,
  } = params;

  const fromY = getColumnAnchorY(
    sourceTable,
    sourcePos,
    edge.sourceColumn,
    allRelationships,
    sourceMeta
  );
  const toY = getColumnAnchorY(
    targetTable,
    targetPos,
    edge.targetColumn,
    allRelationships,
    targetMeta
  );

  // 1. CASO ESPECIAL: Self-Join (Auto-Relacionamento Recursivo em arco "C" lateral)
  if (edge.isSelfJoin || sourceTable.name.toLowerCase() === targetTable.name.toLowerCase()) {
    const rightX = sourcePos.x + cardWidth;
    const loopExtend = 46 + (edgeIndex % 3) * 18;
    const spineX = customOffset?.x ?? rightX + loopExtend;
    const effectiveToY = Math.abs(toY - fromY) < 6 ? fromY + 22 : toY;

    const path =
      lineStyle === 'bezier'
        ? `M ${rightX} ${fromY} C ${spineX + 24} ${fromY}, ${spineX + 24} ${effectiveToY}, ${rightX} ${effectiveToY}`
        : buildRoundedOrthogonalSvgPath(
            [
              { x: rightX, y: fromY },
              { x: spineX, y: fromY },
              { x: spineX, y: effectiveToY },
              { x: rightX, y: effectiveToY },
            ],
            10
          );

    return {
      path,
      forkPaths: [],
      fromX: rightX,
      fromY,
      toX: rightX,
      toY: effectiveToY,
      fromSide: 'right',
      toSide: 'right',
      labelX: spineX,
      labelY: customOffset?.y ?? (fromY + effectiveToY) / 2,
    };
  }

  // 2. Determinação inteligente dos lados de saída e chegada para evitar cruzar por cima dos cards
  const sLeft = sourcePos.x;
  const sRight = sourcePos.x + cardWidth;
  const tLeft = targetPos.x;
  const tRight = targetPos.x + cardWidth;

  let fromSide: 'left' | 'right';
  let toSide: 'left' | 'right';

  if (sRight + 28 <= tLeft) {
    fromSide = 'right';
    toSide = 'left';
  } else if (tRight + 28 <= sLeft) {
    fromSide = 'left';
    toSide = 'right';
  } else {
    if (customOffset && customOffset.x < Math.min(sLeft, tLeft)) {
      fromSide = 'left';
      toSide = 'left';
    } else {
      fromSide = 'right';
      toSide = 'right';
    }
  }

  const fromX = fromSide === 'right' ? sRight : sLeft;
  const toX = toSide === 'right' ? tRight : tLeft;
  const corridorSpread = ((edgeIndex % 5) - 2) * 14;

  // 3. MODO BÉZIER SUAVE (opcional nas configurações / toolbar)
  if (lineStyle === 'bezier') {
    if (fromSide === toSide) {
      const outDir = fromSide === 'right' ? 1 : -1;
      const ctrlX =
        customOffset?.x ??
        (fromSide === 'right' ? Math.max(fromX, toX) + 64 : Math.min(fromX, toX) - 64) +
          corridorSpread;
      const path = `M ${fromX} ${fromY} C ${ctrlX} ${fromY}, ${ctrlX} ${toY}, ${toX} ${toY}`;
      return {
        path,
        forkPaths: [],
        fromX,
        fromY,
        toX,
        toY,
        fromSide,
        toSide,
        labelX: (fromX + toX) / 2 + outDir * 44,
        labelY: customOffset?.y ?? (fromY + toY) / 2,
      };
    }

    const dx = Math.abs(toX - fromX);
    const offset = Math.max(Math.min(dx * 0.45, 160), 48);
    const c1x = fromSide === 'right' ? fromX + offset : fromX - offset;
    const c2x = toSide === 'right' ? toX + offset : toX - offset;
    const path = `M ${fromX} ${fromY} C ${c1x} ${fromY}, ${c2x} ${toY}, ${toX} ${toY}`;

    return {
      path,
      forkPaths: [],
      fromX,
      fromY,
      toX,
      toY,
      fromSide,
      toSide,
      labelX: customOffset?.x ?? (fromX + toX) / 2,
      labelY: customOffset?.y ?? (fromY + toY) / 2,
    };
  }

  // 4. MODO PADRÃO AUTORAL SQLEDITOR: Ortogonal 90° com Cantos Arredondados
  let midX: number;
  if (customOffset?.x !== undefined) {
    midX = customOffset.x;
  } else if (fromSide === 'right' && toSide === 'right') {
    midX = Math.max(fromX, toX) + 44 + Math.abs(corridorSpread);
  } else if (fromSide === 'left' && toSide === 'left') {
    midX = Math.min(fromX, toX) - 44 - Math.abs(corridorSpread);
  } else {
    midX = (fromX + toX) / 2 + corridorSpread;
  }

  const labelY = customOffset?.y ?? (fromY + toY) / 2;

  const points: Array<{ x: number; y: number }> =
    Math.abs(toY - fromY) < 2 && fromSide !== toSide
      ? [
          { x: fromX, y: fromY },
          { x: toX, y: toY },
        ]
      : [
          { x: fromX, y: fromY },
          { x: midX, y: fromY },
          { x: midX, y: toY },
          { x: toX, y: toY },
        ];

  const path = buildRoundedOrthogonalSvgPath(points, 10);

  // Garfos secundários caso seja uma chave estrangeira composta (fork-trunk-fork)
  const forkPaths: string[] = [];
  if (edge.sourceColumns && edge.sourceColumns.length > 1) {
    const forkJoinX = fromSide === 'right' ? fromX + 18 : fromX - 18;
    for (const extraCol of edge.sourceColumns.slice(1)) {
      const extraY = getColumnAnchorY(
        sourceTable,
        sourcePos,
        extraCol,
        allRelationships,
        sourceMeta
      );
      forkPaths.push(
        buildRoundedOrthogonalSvgPath(
          [
            { x: fromX, y: extraY },
            { x: forkJoinX, y: extraY },
            { x: forkJoinX, y: fromY },
          ],
          6
        )
      );
    }
  }

  return {
    path,
    forkPaths,
    fromX,
    fromY,
    toX,
    toY,
    fromSide,
    toSide,
    labelX: midX,
    labelY,
  };
}

// ============================================================================
// AUTO-LAYOUT TOPOLÓGICO ANTI-CRUZAMENTO EM PROPORÇÃO WIDESCREEN 16:9
// ============================================================================

export function calculateTopologicalLayout(
  tables: ERTableNode[],
  relationships: ERRelationshipEdge[],
  tableMeta?: Record<string, ERTableVisualMeta>,
  snapToGrid = false
): Record<string, ERTablePosition> {
  const result: Record<string, ERTablePosition> = {};
  if (!tables || tables.length === 0) return result;

  const names = tables.map((t) => t.name);
  const lowerToReal = new Map(tables.map((t) => [t.name.toLowerCase(), t.name]));

  // Grafo direcionado: tabela Pai (PK) -> tabela Filha (FK)
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  const degree = new Map<string, number>();

  for (const name of names) {
    parentsOf.set(name, new Set());
    childrenOf.set(name, new Set());
    degree.set(name, 0);
  }

  for (const rel of relationships) {
    const child = lowerToReal.get(rel.sourceTable.toLowerCase());
    const parent = lowerToReal.get(rel.targetTable.toLowerCase());
    if (!child || !parent || child === parent) continue;

    parentsOf.get(child)!.add(parent);
    childrenOf.get(parent)!.add(child);
    degree.set(child, (degree.get(child) || 0) + 1);
    degree.set(parent, (degree.get(parent) || 0) + 1);
  }

  // Atribuição de camadas topológicas (pais à esquerda, filhos/associativas à direita)
  const layerOf = new Map<string, number>();
  const visited = new Set<string>();

  // Raízes = tabelas conectadas que não dependem de nenhuma outra (tabelas dimensão/fortes)
  const roots = names
    .filter((n) => (parentsOf.get(n)?.size || 0) === 0 && (degree.get(n) || 0) > 0)
    .sort((a, b) => (degree.get(b) || 0) - (degree.get(a) || 0));

  const queue: string[] = [...roots];
  for (const r of roots) {
    layerOf.set(r, 0);
    visited.add(r);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currLayer = layerOf.get(curr) || 0;
    for (const child of childrenOf.get(curr) || []) {
      const nextLayer = Math.min(4, currLayer + 1);
      if (!visited.has(child)) {
        visited.add(child);
        layerOf.set(child, nextLayer);
        queue.push(child);
      } else if ((layerOf.get(child) || 0) < nextLayer && nextLayer <= 3) {
        layerOf.set(child, nextLayer);
      }
    }
  }

  // Tabelas em ciclos ou não alcançadas a partir de raízes puras
  const unvisitedConnected = names
    .filter((n) => !visited.has(n) && (degree.get(n) || 0) > 0)
    .sort((a, b) => (degree.get(b) || 0) - (degree.get(a) || 0));

  for (const node of unvisitedConnected) {
    visited.add(node);
    layerOf.set(node, 0);
    for (const child of childrenOf.get(node) || []) {
      if (!visited.has(child)) {
        visited.add(child);
        layerOf.set(child, 1);
      }
    }
  }

  // Tabelas isoladas sem relacionamentos
  const isolated = names.filter((n) => !visited.has(n));

  // Agrupa colunas por camada, balanceando para proporção Widescreen 16:9
  const maxColsTarget = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(tables.length * 1.45))));
  const columns: string[][] = Array.from({ length: maxColsTarget }, () => []);

  for (const [node, lyr] of layerOf.entries()) {
    const colIdx = Math.min(maxColsTarget - 1, lyr);
    columns[colIdx].push(node);
  }

  // Rebalanceia colunas muito longas para colunas adjacentes mantendo widescreen 16:9
  const maxPerCol = Math.max(2, Math.ceil(tables.length / maxColsTarget));
  for (let c = 0; c < columns.length - 1; c++) {
    while (columns[c].length > maxPerCol + 1) {
      const moved = columns[c].pop()!;
      columns[c + 1].unshift(moved);
    }
  }

  // Distribui tabelas isoladas nas colunas com menor altura
  for (const iso of isolated) {
    let bestCol = 0;
    let bestLen = Infinity;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].length < bestLen) {
        bestLen = columns[c].length;
        bestCol = c;
      }
    }
    columns[bestCol].push(iso);
  }

  const nonEmptyColumns = columns.filter((col) => col.length > 0);

  // Ordenação vertical por baricentro para minimizar cruzamentos de linhas entre colunas
  const rankY = new Map<string, number>();
  nonEmptyColumns[0]?.forEach((n, idx) => rankY.set(n, idx));

  for (let c = 1; c < nonEmptyColumns.length; c++) {
    nonEmptyColumns[c].sort((a, b) => {
      const neighborsA = [
        ...Array.from(parentsOf.get(a) || []),
        ...Array.from(childrenOf.get(a) || []),
      ].filter((nb) => rankY.has(nb));
      const neighborsB = [
        ...Array.from(parentsOf.get(b) || []),
        ...Array.from(childrenOf.get(b) || []),
      ].filter((nb) => rankY.has(nb));

      const baryA =
        neighborsA.length > 0
          ? neighborsA.reduce((acc, nb) => acc + (rankY.get(nb) || 0), 0) / neighborsA.length
          : 999;
      const baryB =
        neighborsB.length > 0
          ? neighborsB.reduce((acc, nb) => acc + (rankY.get(nb) || 0), 0) / neighborsB.length
          : 999;

      return baryA - baryB;
    });
    nonEmptyColumns[c].forEach((n, idx) => rankY.set(n, idx));
  }

  // Posicionamento final em coordenadas X/Y com corredores largos para etiquetas e curvas 90°
  const HORIZONTAL_GAP = 168;
  const VERTICAL_GAP = 56;
  const START_X = 72;
  const START_Y = 72;

  const tableMap = new Map(tables.map((t) => [t.name, t]));
  const colHeights: number[] = nonEmptyColumns.map((col) =>
    col.reduce((sum, tName, idx) => {
      const tbl = tableMap.get(tName)!;
      const h = estimateERCardHeight(tbl, relationships, tableMeta?.[tName]);
      return sum + h + (idx > 0 ? VERTICAL_GAP : 0);
    }, 0)
  );
  const maxColHeight = Math.max(...colHeights, 200);

  nonEmptyColumns.forEach((col, colIdx) => {
    const x = snapToGridCoord(
      START_X + colIdx * (ER_CARD_WIDTH + HORIZONTAL_GAP),
      snapToGrid
    );
    // Centraliza verticalmente colunas menores em relação à maior coluna
    let currentY = START_Y + Math.max(0, Math.round((maxColHeight - colHeights[colIdx]) / 2));

    for (const tName of col) {
      const tbl = tableMap.get(tName)!;
      const snappedY = snapToGridCoord(currentY, snapToGrid);
      result[tName] = { x, y: snappedY };
      currentY = snappedY + estimateERCardHeight(tbl, relationships, tableMeta?.[tName]) + VERTICAL_GAP;
    }
  });

  return result;
}

