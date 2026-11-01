import {
  computeRelationshipRoute,
  ER_CARD_WIDTH,
  ER_COLUMN_PADDING_Y,
  ER_HEADER_HEIGHT,
  ER_ROW_HEIGHT,
  estimateERCardHeight,
  getVisibleColumnsForCard,
} from './erLayoutEngine';
import type { ERCardinalityNotation, ERLineStyle } from '../types/preferences';
import type {
  ERRelationshipEdge,
  ERStickyNote,
  ERSubjectArea,
  ERTableNode,
  ERTablePosition,
  ERTableVisualMeta,
  StoredDictionaryMeta,
} from '../types/erStudio';

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface DiagramExportContext {
  dbName: string;
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  positions: Record<string, ERTablePosition>;
  lineOffsets?: Record<string, { x: number; y: number }>;
  tableMeta?: Record<string, ERTableVisualMeta>;
  subjectAreas?: ERSubjectArea[];
  stickyNotes?: ERStickyNote[];
  lineStyle?: ERLineStyle;
  cardinalityNotation?: ERCardinalityNotation;
  isLightTheme?: boolean;
}

/**
 * 1. Gera um documento SVG Vetorial completo, nítido e autocontido do Diagrama ER.
 */
export function buildERDiagramSvgMarkup(ctx: DiagramExportContext): string {
  const {
    dbName,
    tables,
    relationships,
    positions,
    lineOffsets = {},
    tableMeta = {},
    subjectAreas = [],
    stickyNotes = [],
    lineStyle = 'orthogonal',
    cardinalityNotation = 'crowsfoot',
    isLightTheme = false,
  } = ctx;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const tbl of tables) {
    const pos = positions[tbl.name] || { x: 60, y: 60 };
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
    maxY = Math.max(maxY, area.y + (area.collapsed ? 40 : area.height));
  }
  for (const note of stickyNotes) {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + note.width);
    maxY = Math.max(maxY, note.y + note.height);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 760;
    maxY = 420;
  }

  const pad = 64;
  const bannerH = 74;
  const width = Math.max(820, Math.round(maxX - minX + pad * 2));
  const height = Math.max(520, Math.round(maxY - minY + pad * 2 + bannerH));
  const offX = pad - minX;
  const offY = pad + bannerH - minY;

  const palette = isLightTheme
    ? {
        bg: '#F4F6F9',
        banner: '#E9ECEF',
        cardBg: '#FFFFFF',
        cardHeader: '#F1F5F9',
        border: '#CBD5E1',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        accentYellow: '#B45309',
        accentOrange: '#EA580C',
        success: '#15803D',
      }
    : {
        bg: '#0F1117',
        banner: '#161922',
        cardBg: '#161922',
        cardHeader: '#1E222D',
        border: '#2E3445',
        textPrimary: '#F0F4F8',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        accentYellow: '#FFE600',
        accentOrange: '#FF6B00',
        success: '#00E676',
      };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${palette.bg}" />`
  );

  // Banner Acadêmico Superior
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${bannerH}" fill="${palette.banner}" />`,
    `<line x1="0" y1="${bannerH}" x2="${width}" y2="${bannerH}" stroke="${palette.border}" stroke-width="1.5" />`,
    `<text x="28" y="34" fill="${palette.textPrimary}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700">SQLEditor • Estúdio DER: ${escapeXml(
      dbName || 'Esquema'
    )}</text>`,
    `<text x="28" y="55" fill="${palette.accentYellow}" font-family="JetBrains Mono, Consolas, monospace" font-size="11.5" font-weight="600">Prof. William Devidé Komel • ${
      tables.length
    } entidade(s) • ${relationships.length} relacionamento(s) • Notação: ${
      cardinalityNotation === 'crowsfoot'
        ? "Crow's Foot"
        : cardinalityNotation === '1:N'
        ? '1:N'
        : 'Pinos'
    }</text>`
  );

  // Áreas Temáticas
  for (const area of subjectAreas) {
    const ax = area.x + offX;
    const ay = area.y + offY;
    const ah = area.collapsed ? 38 : area.height;
    parts.push(
      `<rect x="${ax}" y="${ay}" width="${area.width}" height="${ah}" rx="12" fill="${area.color}" fill-opacity="0.08" stroke="${area.color}" stroke-width="2" stroke-dasharray="7 5" />`,
      `<text x="${ax + 14}" y="${ay + 23}" fill="${palette.textPrimary}" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(
        area.title.toUpperCase()
      )}</text>`
    );
  }

  // Mapa de tabelas
  const tableMap = new Map(tables.map((t) => [t.name.toLowerCase(), t]));
  const shiftedPositions: Record<string, ERTablePosition> = {};
  for (const t of tables) {
    const p = positions[t.name] || { x: 60, y: 60 };
    shiftedPositions[t.name] = { x: p.x + offX, y: p.y + offY };
  }

  // Linhas de Relacionamento
  relationships.forEach((edge, idx) => {
    const src = tableMap.get(edge.sourceTable.toLowerCase());
    const tgt = tableMap.get(edge.targetTable.toLowerCase());
    if (!src || !tgt) return;

    const customOff = lineOffsets[edge.id]
      ? { x: lineOffsets[edge.id].x + offX, y: lineOffsets[edge.id].y + offY }
      : undefined;

    const route = computeRelationshipRoute({
      edge,
      sourceTable: src,
      targetTable: tgt,
      sourcePos: shiftedPositions[src.name],
      targetPos: shiftedPositions[tgt.name],
      allRelationships: relationships,
      sourceMeta: tableMeta[src.name],
      targetMeta: tableMeta[tgt.name],
      lineStyle,
      edgeIndex: idx,
      customOffset: customOff,
    });

    parts.push(
      `<path d="${route.path}" fill="none" stroke="${palette.bg}" stroke-width="5" stroke-linecap="round" />`,
      `<path d="${route.path}" fill="none" stroke="${palette.accentYellow}" stroke-width="2.2" ${
        !edge.isExplicit ? 'stroke-dasharray="8 4"' : ''
      } stroke-linecap="round" />`
    );

    const fkDir = route.fromSide === 'right' ? 1 : -1;
    const pkDir = route.toSide === 'right' ? 1 : -1;
    if (cardinalityNotation === 'crowsfoot') {
      const tipX = route.fromX + fkDir * 13;
      parts.push(
        `<path d="M ${route.fromX} ${route.fromY - 6} L ${tipX} ${route.fromY} L ${route.fromX} ${
          route.fromY + 6
        }" fill="none" stroke="${palette.accentOrange}" stroke-width="2" stroke-linecap="round" />`,
        `<line x1="${route.toX + pkDir * 7}" y1="${route.toY - 6}" x2="${
          route.toX + pkDir * 7
        }" y2="${route.toY + 6}" stroke="${palette.success}" stroke-width="2.2" />`,
        `<line x1="${route.toX + pkDir * 12}" y1="${route.toY - 6}" x2="${
          route.toX + pkDir * 12
        }" y2="${route.toY + 6}" stroke="${palette.success}" stroke-width="2.2" />`
      );
    } else {
      parts.push(
        `<circle cx="${route.fromX}" cy="${route.fromY}" r="4.5" fill="${palette.accentOrange}" />`,
        `<circle cx="${route.toX}" cy="${route.toY}" r="4.5" fill="${palette.success}" />`
      );
    }

    const labelText = `${edge.sourceColumn} -> ${edge.targetTable} (${edge.cardinality})`;
    const lw = Math.max(108, labelText.length * 6.5 + 20);
    parts.push(
      `<rect x="${route.labelX - lw / 2}" y="${route.labelY - 11}" width="${lw}" height="22" rx="5" fill="${
        palette.cardBg
      }" stroke="${palette.accentOrange}" stroke-width="1.2" />`,
      `<text x="${route.labelX}" y="${route.labelY + 3.5}" text-anchor="middle" fill="${
        palette.accentYellow
      }" font-family="JetBrains Mono, Consolas, monospace" font-size="10" font-weight="700">${escapeXml(
        labelText
      )}</text>`
    );
  });

  // Notas Adesivas
  for (const note of stickyNotes) {
    const nx = note.x + offX;
    const ny = note.y + offY;
    parts.push(
      `<rect x="${nx}" y="${ny}" width="${note.width}" height="${note.height}" rx="8" fill="${palette.cardBg}" stroke="${note.color}" stroke-width="1.5" />`,
      `<text x="${nx + 12}" y="${ny + 20}" fill="${palette.textPrimary}" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700">${escapeXml(
        note.title
      )}</text>`,
      `<text x="${nx + 12}" y="${ny + 38}" fill="${palette.textSecondary}" font-family="Inter, Arial, sans-serif" font-size="10">${escapeXml(
        note.content.slice(0, 72)
      )}</text>`
    );
  }

  // Cards das Tabelas
  for (const tbl of tables) {
    const pos = shiftedPositions[tbl.name];
    const meta = tableMeta[tbl.name];
    const strip = meta?.colorStrip || '#FF6B00';
    const { visibleColumns, hiddenCount } = getVisibleColumnsForCard(
      tbl,
      relationships,
      meta?.collapsed
    );
    const cardH =
      ER_HEADER_HEIGHT +
      ER_COLUMN_PADDING_Y * 2 +
      Math.max(1, visibleColumns.length) * ER_ROW_HEIGHT +
      (hiddenCount > 0 ? 26 : 0);

    parts.push(
      `<g>`,
      `<rect x="${pos.x}" y="${pos.y}" width="${ER_CARD_WIDTH}" height="${cardH}" rx="8" fill="${palette.cardBg}" stroke="${palette.border}" stroke-width="1.5" />`,
      `<rect x="${pos.x}" y="${pos.y}" width="${ER_CARD_WIDTH}" height="${ER_HEADER_HEIGHT}" rx="8" fill="${palette.cardHeader}" />`,
      `<rect x="${pos.x}" y="${pos.y}" width="${ER_CARD_WIDTH}" height="4" rx="2" fill="${strip}" />`,
      `<line x1="${pos.x}" y1="${pos.y + ER_HEADER_HEIGHT}" x2="${
        pos.x + ER_CARD_WIDTH
      }" y2="${pos.y + ER_HEADER_HEIGHT}" stroke="${palette.border}" stroke-width="1" />`,
      `<text x="${pos.x + 14}" y="${pos.y + 28}" fill="${
        palette.textPrimary
      }" font-family="JetBrains Mono, Consolas, monospace" font-size="12.5" font-weight="700">${escapeXml(
        tbl.name
      )}</text>`,
      `<text x="${pos.x + ER_CARD_WIDTH - 14}" y="${pos.y + 28}" text-anchor="end" fill="${
        palette.success
      }" font-family="JetBrains Mono, Consolas, monospace" font-size="10" font-weight="700">${
        tbl.rowCount
      } reg.</text>`
    );

    visibleColumns.forEach((col, cIdx) => {
      const cy =
        pos.y +
        ER_HEADER_HEIGHT +
        ER_COLUMN_PADDING_Y +
        cIdx * ER_ROW_HEIGHT +
        ER_ROW_HEIGHT / 2 +
        4;
      const colColor = col.isPrimary
        ? palette.accentYellow
        : col.isForeignKey
        ? palette.accentOrange
        : palette.textPrimary;
      const badge = col.isPrimary ? '[PK] ' : col.isForeignKey ? '[FK] ' : '';

      parts.push(
        `<text x="${pos.x + 12}" y="${cy}" fill="${colColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="11" font-weight="${
          col.isPrimary || col.isForeignKey ? '700' : '400'
        }">${escapeXml(badge + col.name)}</text>`,
        `<text x="${pos.x + ER_CARD_WIDTH - 12}" y="${cy}" text-anchor="end" fill="${
          palette.textMuted
        }" font-family="JetBrains Mono, Consolas, monospace" font-size="10">${escapeXml(
          col.type
        )}</text>`
      );
    });

    if (hiddenCount > 0) {
      parts.push(
        `<text x="${pos.x + 12}" y="${pos.y + cardH - 8}" fill="${
          palette.textSecondary
        }" font-family="JetBrains Mono, Consolas, monospace" font-size="9.5">+ ${hiddenCount} atributo(s) oculto(s)</text>`
      );
    }

    parts.push(`</g>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

/**
 * Faz download direto do arquivo SVG Vetorial.
 */
export function downloadERDiagramSvg(ctx: DiagramExportContext): void {
  const svg = buildERDiagramSvgMarkup(ctx);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerBrowserDownload(blob, `der_${ctx.dbName || 'esquema'}_${Date.now()}.svg`);
}

/**
 * 2. Faz download de imagem PNG HD (2x Retina) renderizada a partir do SVG vetorial fiel.
 */
export async function downloadERDiagramPngHd(ctx: DiagramExportContext): Promise<void> {
  const svg = buildERDiagramSvgMarkup(ctx);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const c2d = canvas.getContext('2d');
        if (!c2d) {
          URL.revokeObjectURL(url);
          reject(new Error('Contexto 2D indisponível'));
          return;
        }
        c2d.scale(scale, scale);
        c2d.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `der_${ctx.dbName || 'esquema'}_${Date.now()}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * 3. Abre janela limpa de impressão A4 Paisagem com o diagrama vetorial para salvar como PDF.
 */
export function printERDiagramAsPdfA4(ctx: DiagramExportContext): void {
  const svg = buildERDiagramSvgMarkup({ ...ctx, isLightTheme: true });
  const win = window.open('', '_blank', 'width=1120,height=780');
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Diagrama ER - ${escapeXml(ctx.dbName || 'SQLEditor')}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { margin: 0; padding: 0; background: #FFFFFF; display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
    svg { width: 100%; height: auto; max-height: 96vh; }
  </style>
</head>
<body>
  ${svg}
  <script>setTimeout(() => { window.print(); }, 250);</script>
</body>
</html>`);
  win.document.close();
}

/**
 * 4. Gera código Mermaid (erDiagram) compatível com GitHub, Notion, GitLab e documentação TCC.
 */
export function generateMermaidErDiagram(
  dbName: string,
  tables: ERTableNode[],
  relationships: ERRelationshipEdge[]
): string {
  const cleanIdent = (name: string) => String(name || '').replace(/[^A-Za-z0-9_]/g, '_');
  const lines: string[] = [
    `%% Diagrama ER gerado pelo SQLEditor — Banco: ${dbName || 'esquema'}`,
    `erDiagram`,
  ];

  for (const rel of relationships) {
    const parent = cleanIdent(rel.targetTable);
    const child = cleanIdent(rel.sourceTable);
    const connector = rel.cardinality === '1:1' ? '||--o|' : '||--o{';
    lines.push(`    ${parent} ${connector} ${child} : "${rel.sourceColumn}"`);
  }

  if (relationships.length > 0) lines.push('');

  for (const tbl of tables) {
    lines.push(`    ${cleanIdent(tbl.name)} {`);
    for (const col of tbl.columns) {
      const mType = (col.type || 'VARCHAR').replace(/\s+/g, '_').replace(/,/g, '_');
      const keyTag = col.isPrimary
        ? ' PK'
        : col.isForeignKey
        ? ' FK'
        : col.isUnique
        ? ' UK'
        : '';
      const comment = col.comment ? ` "${col.comment.replace(/"/g, "'")}"` : '';
      lines.push(`        ${mType} ${cleanIdent(col.name)}${keyTag}${comment}`);
    }
    lines.push(`    }`);
  }

  return lines.join('\n');
}

/**
 * 5. Gera o Dicionário de Dados completo em Markdown (.md) com descrições, 1FN-3FN e diagrama Mermaid embutido.
 */
export function generateMarkdownDataDictionary(
  dbName: string,
  tables: ERTableNode[],
  relationships: ERRelationshipEdge[],
  dictionaryMeta?: StoredDictionaryMeta | null
): string {
  const timestamp = new Date().toLocaleString('pt-BR');
  const lines: string[] = [
    `# Dicionário de Dados & Modelo Lógico — \`${dbName || 'esquema'}\``,
    '',
    `> **Gerado em:** ${timestamp} | **Ferramenta:** SQLEditor — Central da Disciplina de Banco de Dados`,
    `> **Resumo:** ${tables.length} entidade(s) • ${relationships.length} relacionamento(s)`,
    '',
    `## 1. Diagrama Entidade-Relacionamento (Mermaid)`,
    '',
    '```mermaid',
    generateMermaidErDiagram(dbName, tables, relationships),
    '```',
    '',
    `## 2. Especificação das Entidades e Atributos`,
    '',
  ];

  for (const tbl of tables) {
    const tblDesc =
      dictionaryMeta?.tableComments?.[tbl.name] ||
      tbl.comment ||
      '_Sem descrição cadastrada._';
    const norm = dictionaryMeta?.normalizationChecks?.[tbl.name];

    lines.push(`### Tabela \`${tbl.name}\` (${tbl.rowCount} registros)`);
    lines.push(`- **Descrição:** ${tblDesc}`);
    if (norm) {
      lines.push(
        `- **Auditoria de Normalização:** 1FN [${norm.fn1 ? 'x' : ' '}] • 2FN [${
          norm.fn2 ? 'x' : ' '
        }] • 3FN [${norm.fn3 ? 'x' : ' '}]${norm.notes ? ` — _${norm.notes}_` : ''}`
      );
    }
    lines.push('');
    lines.push(`| Atributo | Tipo SQL | Chave | Nulo? | Único? | Referência (FK) | Descrição Semântica |`);
    lines.push(`| :--- | :--- | :---: | :---: | :---: | :--- | :--- |`);

    for (const col of tbl.columns) {
      const colKey = `${tbl.name}.${col.name}`;
      const colDesc =
        dictionaryMeta?.columnComments?.[colKey] || col.comment || '—';
      const keyLabel = col.isPrimary
        ? '**PK**'
        : col.isForeignKey
        ? col.isExplicitForeignKey
          ? '**FK**'
          : '_FK (Inferida)_'
        : '—';
      const fkLabel = col.fkTarget
        ? `\`${col.fkTarget.table}(${col.fkTarget.column})\``
        : '—';

      lines.push(
        `| \`${col.name}\` | \`${col.type}\` | ${keyLabel} | ${
          col.isNullable ? 'Sim' : 'Não'
        } | ${col.isUnique || col.isPrimary ? 'Sim' : 'Não'} | ${fkLabel} | ${colDesc.replace(
          /\|/g,
          '\\|'
        )} |`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

