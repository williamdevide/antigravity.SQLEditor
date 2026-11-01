import type { ERColumnNode, ERRelationshipEdge, ERTableNode } from '../types/erStudio';

export interface SurgicalSqlPatch {
  startOffset: number;
  endOffset: number;
  replacementText: string;
  newFullSql: string;
  executedDdlStatement: string;
}

export interface VisualColumnDraft {
  name: string;
  type: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
}

function sanitizeIdent(raw: string): string {
  return raw.trim().replace(/[`"';]/g, '').replace(/\s+/g, '_');
}

/**
 * Formata uma linha individual de definição de coluna SQL.
 */
export function formatColumnDdlLine(col: VisualColumnDraft): string {
  const cleanName = sanitizeIdent(col.name) || 'coluna';
  const cleanType = (col.type || 'VARCHAR(100)').trim().toUpperCase();
  const mods: string[] = [];
  if (col.isPrimary) {
    mods.push('PRIMARY KEY');
  } else {
    if (col.isNullable === false) mods.push('NOT NULL');
    if (col.isUnique) mods.push('UNIQUE');
  }
  return `  \`${cleanName}\` ${cleanType}${mods.length > 0 ? ' ' + mods.join(' ') : ''}`;
}

/**
 * Gera um bloco CREATE TABLE limpo e indentado para uma nova entidade criada visualmente no DER.
 */
export function buildCreateTableDdl(
  tableName: string,
  columns: VisualColumnDraft[] = [
    { name: 'id', type: 'INT', isPrimary: true, isNullable: false },
    { name: 'nome', type: 'VARCHAR(120)', isNullable: false },
  ]
): string {
  const cleanTable = sanitizeIdent(tableName) || 'nova_tabela';
  const colLines = columns.map(formatColumnDdlLine);
  return `CREATE TABLE IF NOT EXISTS \`${cleanTable}\` (\n${colLines.join(',\n')}\n);`;
}

/**
 * Localiza o intervalo do parêntese de fechamento ')' de um CREATE TABLE <tableName> no script,
 * permitindo inserção cirúrgica de colunas ou FOREIGN KEYs sem perder outros comandos nem o Ctrl+Z!
 */
function findCreateTableClosingParenOffset(sql: string, tableName: string): number {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    String.raw`CREATE\s+(?:TEMPORARY\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\`"]?${escaped}[\`"]?\s*\(`,
    'gi'
  );
  const m = re.exec(sql);
  if (!m) return -1;

  const openIdx = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = openIdx; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      i++;
      while (i < sql.length && sql[i] !== q) {
        if (sql[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Anexa um novo CREATE TABLE ao final do script SQL de forma cirúrgica.
 */
export function buildAppendTablePatch(currentSql: string, tableName: string, columns?: VisualColumnDraft[]): SurgicalSqlPatch {
  const ddl = buildCreateTableDdl(tableName, columns);
  const trimmedEnd = currentSql.trimEnd();
  const prefix = trimmedEnd.length > 0 ? '\n\n' : '';
  const startOffset = currentSql.length;
  const replacementText = `${prefix}${ddl}\n`;
  return {
    startOffset,
    endOffset: startOffset,
    replacementText,
    newFullSql: currentSql + replacementText,
    executedDdlStatement: ddl,
  };
}

/**
 * Adiciona uma coluna cirurgicamente dentro do CREATE TABLE existente no script (ou via ALTER TABLE).
 */
export function buildAddColumnPatch(
  currentSql: string,
  tableName: string,
  col: VisualColumnDraft
): SurgicalSqlPatch {
  const cleanTable = sanitizeIdent(tableName);
  const cleanColName = sanitizeIdent(col.name);
  const colType = (col.type || 'VARCHAR(100)').trim().toUpperCase();
  const alterStmt = `ALTER TABLE \`${cleanTable}\` ADD COLUMN \`${cleanColName}\` ${colType}${
    col.isPrimary ? ' PRIMARY KEY' : col.isNullable === false ? ' NOT NULL' : ''
  };`;

  const closeParen = findCreateTableClosingParenOffset(currentSql, cleanTable);
  if (closeParen !== -1) {
    let insertAt = closeParen;
    while (insertAt > 0 && /\s/.test(currentSql[insertAt - 1])) {
      insertAt--;
    }
    const lineToInsert = `,\n${formatColumnDdlLine(col)}`;
    const newFullSql =
      currentSql.slice(0, insertAt) + lineToInsert + currentSql.slice(insertAt);
    return {
      startOffset: insertAt,
      endOffset: insertAt,
      replacementText: lineToInsert,
      newFullSql,
      executedDdlStatement: alterStmt,
    };
  }

  const prefix = currentSql.trimEnd().length > 0 ? '\n' : '';
  const replacementText = `${prefix}${alterStmt}\n`;
  return {
    startOffset: currentSql.length,
    endOffset: currentSql.length,
    replacementText,
    newFullSql: currentSql + replacementText,
    executedDdlStatement: alterStmt,
  };
}

/**
 * Gera a constraint FOREIGN KEY cirúrgica ao conectar duas colunas visualmente (Drag-to-Connect FK).
 */
export function buildAddForeignKeyPatch(
  currentSql: string,
  sourceTable: string,
  sourceColumn: string,
  targetTable: string,
  targetColumn: string
): SurgicalSqlPatch {
  const sTbl = sanitizeIdent(sourceTable);
  const sCol = sanitizeIdent(sourceColumn);
  const tTbl = sanitizeIdent(targetTable);
  const tCol = sanitizeIdent(targetColumn);
  const constraintName = `fk_${sTbl}_${sCol}`.toLowerCase();

  const alterStmt = `ALTER TABLE \`${sTbl}\` ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${sCol}\`) REFERENCES \`${tTbl}\`(\`${tCol}\`);`;

  const closeParen = findCreateTableClosingParenOffset(currentSql, sTbl);
  if (closeParen !== -1) {
    let insertAt = closeParen;
    while (insertAt > 0 && /\s/.test(currentSql[insertAt - 1])) {
      insertAt--;
    }
    const fkLine = `,\n  CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${sCol}\`) REFERENCES \`${tTbl}\`(\`${tCol}\`)`;
    const newFullSql =
      currentSql.slice(0, insertAt) + fkLine + currentSql.slice(insertAt);
    return {
      startOffset: insertAt,
      endOffset: insertAt,
      replacementText: fkLine,
      newFullSql,
      executedDdlStatement: alterStmt,
    };
  }

  const prefix = currentSql.trimEnd().length > 0 ? '\n' : '';
  const replacementText = `${prefix}${alterStmt}\n`;
  return {
    startOffset: currentSql.length,
    endOffset: currentSql.length,
    replacementText,
    newFullSql: currentSql + replacementText,
    executedDdlStatement: alterStmt,
  };
}

/**
 * Localiza o bloco do CREATE TABLE <tableName> no script e remove a linha da coluna especificada,
 * ajustando pontuação e vírgulas finais com precisão cirúrgica.
 */
function removeColumnFromSql(sql: string, tableName: string, colName: string): string | null {
  const tableRegex = new RegExp(
    '(CREATE\\s+(?:TEMPORARY\\s+|TEMP\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\\`"\']?' +
      tableName +
      '[\\`"\']?\\s*\\()([\\s\\S]*?)(\\);)',
    'i'
  );
  const m = tableRegex.exec(sql);
  if (!m) return null;
  const before = sql.slice(0, m.index + m[1].length);
  const body = m[2];
  const after = sql.slice(m.index + m[0].length - m[3].length);

  const lines = body.split('\n');
  const colRegex = new RegExp('^\\s*[\\`"\']?' + colName + '[\\`"\']?\\s+', 'i');
  const lineIdx = lines.findIndex((l) => colRegex.test(l.trim()));
  if (lineIdx === -1) return null;

  lines.splice(lineIdx, 1);
  const validIndices = lines.map((l, i) => (l.trim() ? i : -1)).filter((i) => i !== -1);
  for (let k = 0; k < validIndices.length; k++) {
    const idx = validIndices[k];
    let trimmed = lines[idx].trimEnd();
    if (k < validIndices.length - 1) {
      if (!trimmed.endsWith(',')) lines[idx] = trimmed + ',';
    } else {
      if (trimmed.endsWith(',')) lines[idx] = trimmed.slice(0, -1);
    }
  }
  return before + lines.join('\n') + after;
}

/**
 * Localiza a definição da coluna no CREATE TABLE e a substitui cirurgicamente in-place.
 */
function modifyColumnInSql(
  sql: string,
  tableName: string,
  oldColName: string,
  newColLine: string
): string | null {
  const tableRegex = new RegExp(
    '(CREATE\\s+(?:TEMPORARY\\s+|TEMP\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\\`"\']?' +
      tableName +
      '[\\`"\']?\\s*\\()([\\s\\S]*?)(\\);)',
    'i'
  );
  const m = tableRegex.exec(sql);
  if (!m) return null;
  const before = sql.slice(0, m.index + m[1].length);
  const body = m[2];
  const after = sql.slice(m.index + m[0].length - m[3].length);

  const lines = body.split('\n');
  const colRegex = new RegExp('^\\s*[\\`"\']?' + oldColName + '[\\`"\']?\\s+', 'i');
  const lineIdx = lines.findIndex((l) => colRegex.test(l.trim()));
  if (lineIdx === -1) return null;

  const hadComma = lines[lineIdx].trimEnd().endsWith(',');
  lines[lineIdx] = newColLine + (hadComma ? ',' : '');

  return before + lines.join('\n') + after;
}

/**
 * Modifica ou renomeia um atributo existente na tabela de forma cirúrgica.
 */
export function buildModifyColumnPatch(
  currentSql: string,
  tableName: string,
  oldColName: string,
  newCol: VisualColumnDraft
): SurgicalSqlPatch {
  const cleanTable = sanitizeIdent(tableName);
  const cleanOldName = sanitizeIdent(oldColName);
  const cleanNewName = sanitizeIdent(newCol.name);
  const colDef = formatColumnDdlLine(newCol).trim();

  let executedDdlStatement = '';
  if (cleanOldName.toLowerCase() !== cleanNewName.toLowerCase()) {
    executedDdlStatement = `ALTER TABLE \`${cleanTable}\` RENAME COLUMN \`${cleanOldName}\` TO \`${cleanNewName}\`; ALTER TABLE \`${cleanTable}\` MODIFY COLUMN ${colDef};`;
  } else {
    executedDdlStatement = `ALTER TABLE \`${cleanTable}\` MODIFY COLUMN ${colDef};`;
  }

  const inPlace = modifyColumnInSql(currentSql, cleanTable, cleanOldName, `  ${colDef}`);
  if (inPlace) {
    return {
      startOffset: 0,
      endOffset: currentSql.length,
      replacementText: inPlace,
      newFullSql: inPlace,
      executedDdlStatement,
    };
  }

  const fallbackDdl =
    cleanOldName.toLowerCase() !== cleanNewName.toLowerCase()
      ? `ALTER TABLE \`${cleanTable}\` CHANGE COLUMN \`${cleanOldName}\` ${colDef};`
      : `ALTER TABLE \`${cleanTable}\` MODIFY COLUMN ${colDef};`;
  const prefix = currentSql.trimEnd().length > 0 ? '\n\n' : '';
  const replacementText = `${prefix}${fallbackDdl}\n`;
  return {
    startOffset: currentSql.length,
    endOffset: currentSql.length,
    replacementText,
    newFullSql: currentSql + replacementText,
    executedDdlStatement,
  };
}

/**
 * Remove um atributo de uma tabela de forma cirúrgica (DROP COLUMN).
 */
export function buildDropColumnPatch(
  currentSql: string,
  tableName: string,
  colName: string
): SurgicalSqlPatch {
  const cleanTable = sanitizeIdent(tableName);
  const cleanColName = sanitizeIdent(colName);
  const dropStmt = `ALTER TABLE \`${cleanTable}\` DROP COLUMN \`${cleanColName}\`;`;

  const inPlace = removeColumnFromSql(currentSql, cleanTable, cleanColName);
  if (inPlace) {
    return {
      startOffset: 0,
      endOffset: currentSql.length,
      replacementText: inPlace,
      newFullSql: inPlace,
      executedDdlStatement: dropStmt,
    };
  }

  const prefix = currentSql.trimEnd().length > 0 ? '\n\n' : '';
  const replacementText = `${prefix}${dropStmt}\n`;
  return {
    startOffset: currentSql.length,
    endOffset: currentSql.length,
    replacementText,
    newFullSql: currentSql + replacementText,
    executedDdlStatement: dropStmt,
  };
}

/**
 * Gera o script DDL completo e padronizado a partir de um grafo ERTableNode[] + ERRelationshipEdge[].
 */
export function generateFullDdlFromERGraph(
  dbName: string,
  tables: ERTableNode[],
  relationships: ERRelationshipEdge[]
): string {
  const cleanDb = sanitizeIdent(dbName || 'modelo_bd');
  const lines: string[] = [
    `-- ============================================================================`,
    `-- Script DDL Gerado pelo Estúdio DER — SQLEditor`,
    `-- Banco / Modelo: ${cleanDb}`,
    `-- ============================================================================`,
    `CREATE DATABASE IF NOT EXISTS \`${cleanDb}\`;`,
    `USE \`${cleanDb}\`;`,
    '',
  ];

  for (const tbl of tables) {
    const itemLines: string[] = tbl.columns.map((c: ERColumnNode) => {
      const mods: string[] = [];
      if (c.isPrimary) mods.push('PRIMARY KEY');
      else {
        if (!c.isNullable) mods.push('NOT NULL');
        if (c.isUnique) mods.push('UNIQUE');
      }
      if (c.defaultValue) mods.push(`DEFAULT ${c.defaultValue}`);
      return `  \`${c.name}\` ${c.type}${mods.length > 0 ? ' ' + mods.join(' ') : ''}`;
    });

    const explicitFks = relationships.filter(
      (r) => r.sourceTable.toLowerCase() === tbl.name.toLowerCase() && r.isExplicit
    );
    for (const fk of explicitFks) {
      const srcCols = (fk.sourceColumns || [fk.sourceColumn])
        .map((c) => `\`${c}\``)
        .join(', ');
      const tgtCols = (fk.targetColumns || [fk.targetColumn])
        .map((c) => `\`${c}\``)
        .join(', ');
      itemLines.push(
        `  FOREIGN KEY (${srcCols}) REFERENCES \`${fk.targetTable}\`(${tgtCols})`
      );
    }

    lines.push(`CREATE TABLE IF NOT EXISTS \`${tbl.name}\` (`);
    lines.push(itemLines.join(',\n'));
    lines.push(`);\n`);
  }

  return lines.join('\n');
}

