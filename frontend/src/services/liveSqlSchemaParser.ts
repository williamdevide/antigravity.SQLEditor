import { categorizeSqlType } from './erLayoutEngine';
import type {
  ERColumnNode,
  ERRelationshipEdge,
  ERTableNode,
} from '../types/erStudio';

export interface LiveSqlParseResult {
  tables: ERTableNode[];
  relationships: ERRelationshipEdge[];
  errors: string[];
  detectedDatabase?: string;
}

const IDENT = String.raw`[\`"]?(?:\w+[\`"]?\.[\`"]?)?(\w+)[\`"]?`;

const CREATE_TABLE_RE = new RegExp(
  String.raw`CREATE\s+(?:TEMPORARY\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${IDENT}`,
  'gi'
);
const ALTER_TABLE_RE = new RegExp(
  String.raw`ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?${IDENT}\s+([\s\S]*?)(?=;|$)`,
  'gi'
);
const INSERT_RE = new RegExp(
  String.raw`INSERT\s+(?:IGNORE\s+)?INTO\s+${IDENT}\s*(?:\(([^)]*)\)\s*)?VALUES?\s*`,
  'gi'
);
const TABLE_FK_RE = new RegExp(
  String.raw`^(?:CONSTRAINT\s+[\`"]?\w+[\`"]?\s+)?FOREIGN\s+KEY\s*(?:[\`"]?\w+[\`"]?\s*)?\(([^)]+)\)\s*REFERENCES\s+${IDENT}(?:\s*\(([^)]+)\))?`,
  'i'
);
const INLINE_FK_RE = new RegExp(
  String.raw`\bREFERENCES\s+${IDENT}(?:\s*\(\s*[\`"]?(\w+)[\`"]?\s*\))?`,
  'i'
);
const TABLE_PK_RE = /^(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i;
const TABLE_UNIQUE_RE =
  /^(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?UNIQUE(?:\s+(?:KEY|INDEX))?\s*(?:[`"]?\w+[`"]?\s*)?\(([^)]+)\)/i;
const COLUMN_TYPE_RE =
  /^([A-Za-z_]\w*(?:\s+(?:PRECISION|VARYING|UNSIGNED|SIGNED|ZEROFILL))*)\s*(\([^)]*\))?(\s*\[\])?/i;
const ROUTINE_RE =
  /\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:DEFINER\s*=\s*\S+\s+)?(?:TRIGGER|PROCEDURE|FUNCTION|EVENT)\b/gi;
const TRIGGER_HEADER_RE = new RegExp(
  String.raw`^CREATE\s+(?:OR\s+REPLACE\s+)?(?:DEFINER\s*=\s*\S+\s+)?TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?${IDENT}\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+([\s\S]+?)\s+ON\s+${IDENT}`,
  'i'
);
const BODY_WRITE_RE = new RegExp(
  String.raw`\b(?:INSERT\s+(?:IGNORE\s+)?INTO|DELETE\s+FROM)\s+${IDENT}|\bUPDATE\s+${IDENT}\s+(?:\w+\s+)?SET\b`,
  'gi'
);

/**
 * Parser SQL reativo e tolerante a comandos incompletos (enquanto o aluno digita no editor).
 * Extrai CREATE TABLE, ALTER TABLE (ADD COLUMN / ADD FOREIGN KEY), INSERT INTO (amostra viva) e CREATE TRIGGER.
 */
export function parseLiveSqlSchema(
  sql: string,
  options?: { inferImplicitForeignKeys?: boolean }
): LiveSqlParseResult {
  const tables: ERTableNode[] = [];
  const rawEdges: Array<{
    sourceTable: string;
    sourceColumns: string[];
    targetTable: string;
    targetColumns: string[];
    isExplicit: boolean;
  }> = [];
  const errors: string[] = [];

  if (!sql || !sql.trim()) {
    return { tables: [], relationships: [], errors: [] };
  }

  const cleanedSql = stripSqlComments(sql);
  const useMatch = cleanedSql.match(/\b(?:USE|CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?)\s+[`'"]?([\w-]+)[`'"]?/i);
  const detectedDatabase = useMatch?.[1];

  const routines = findRoutineRanges(cleanedSql);
  const insideRoutine = (index: number) =>
    routines.some((r) => index > r.start && index < r.end);

  // 1. Extração de CREATE TABLE com balanceamento de parênteses tolerante
  const createRe = new RegExp(CREATE_TABLE_RE.source, CREATE_TABLE_RE.flags);
  let match: RegExpExecArray | null;
  const tableMapByLower = new Map<string, ERTableNode>();

  while ((match = createRe.exec(cleanedSql)) !== null) {
    const rawTableName = match[1];
    if (!rawTableName || insideRoutine(match.index)) continue;

    const tableLower = rawTableName.toLowerCase();
    const afterNameIndex = match.index + match[0].length;
    const openParenIndex = cleanedSql.indexOf('(', afterNameIndex);
    if (
      openParenIndex === -1 ||
      cleanedSql.slice(afterNameIndex, openParenIndex).trim() !== ''
    ) {
      continue;
    }

    let endIndex = findClosingParen(cleanedSql, openParenIndex);
    if (endIndex === -1) {
      errors.push(`Tabela "${rawTableName}": parêntese ")" pendente.`);
      const semi = cleanedSql.indexOf(';', openParenIndex);
      endIndex = semi === -1 ? cleanedSql.length : semi;
    }

    const body = cleanedSql.substring(openParenIndex + 1, endIndex);
    createRe.lastIndex = endIndex + 1;

    if (tableMapByLower.has(tableLower)) {
      errors.push(`Tabela "${rawTableName}" declarada em duplicidade no script.`);
      continue;
    }

    const columns: ERColumnNode[] = [];
    const findCol = (name: string) =>
      columns.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const pendingConstraints: Array<() => void> = [];

    for (const rawItem of splitByTopLevelCommas(body)) {
      const item = rawItem.trim().replace(/\s+/g, ' ');
      if (!item) continue;

      // Constraint FOREIGN KEY de nível de tabela (suporta simples e composta!)
      const tableFkMatch = item.match(TABLE_FK_RE);
      if (tableFkMatch) {
        const srcCols = splitIdentifierList(tableFkMatch[1]);
        const tgtTable = tableFkMatch[2];
        const tgtCols = tableFkMatch[3] ? splitIdentifierList(tableFkMatch[3]) : [];

        if (srcCols.length > 0) {
          rawEdges.push({
            sourceTable: rawTableName,
            sourceColumns: srcCols,
            targetTable: tgtTable,
            targetColumns: tgtCols,
            isExplicit: true,
          });
          pendingConstraints.push(() => {
            srcCols.forEach((sc, idx) => {
              const col = findCol(sc);
              if (!col) {
                errors.push(
                  `Tabela "${rawTableName}": FOREIGN KEY referencia coluna inexistente "${sc}".`
                );
                return;
              }
              col.isForeignKey = true;
              col.isExplicitForeignKey = true;
              col.category = 'key';
              col.fkTarget = {
                table: tgtTable,
                column: tgtCols[idx] || tgtCols[0] || '',
              };
            });
          });
        }
        continue;
      }

      // Constraint PRIMARY KEY de nível de tabela
      const tablePkMatch = item.match(TABLE_PK_RE);
      if (tablePkMatch) {
        for (const pkCol of splitIdentifierList(tablePkMatch[1])) {
          pendingConstraints.push(() => {
            const col = findCol(pkCol);
            if (!col) {
              errors.push(
                `Tabela "${rawTableName}": PRIMARY KEY referencia coluna inexistente "${pkCol}".`
              );
              return;
            }
            col.isPrimary = true;
            col.isNullable = false;
            col.category = 'key';
          });
        }
        continue;
      }

      // Constraint UNIQUE de nível de tabela
      const tableUniqueMatch = item.match(TABLE_UNIQUE_RE);
      if (tableUniqueMatch) {
        const uqCols = splitIdentifierList(tableUniqueMatch[1]);
        pendingConstraints.push(() => {
          if (uqCols.length === 1) {
            const col = findCol(uqCols[0]);
            if (col) col.isUnique = true;
          }
        });
        continue;
      }

      const parsedCol = parseColumnDefinitionLine(rawTableName, item);
      if (!parsedCol) continue;

      if (findCol(parsedCol.column.name)) {
        errors.push(
          `Tabela "${rawTableName}": coluna "${parsedCol.column.name}" repetida.`
        );
        continue;
      }

      columns.push(parsedCol.column);
      if (parsedCol.inlineFk) {
        rawEdges.push({
          sourceTable: rawTableName,
          sourceColumns: [parsedCol.column.name],
          targetTable: parsedCol.inlineFk.table,
          targetColumns: parsedCol.inlineFk.column ? [parsedCol.inlineFk.column] : [],
          isExplicit: true,
        });
      }
    }

    pendingConstraints.forEach((fn) => fn());

    const tableNode: ERTableNode = {
      id: rawTableName,
      name: rawTableName,
      columns,
      rowCount: 0,
      sampleRows: [],
      triggers: [],
    };
    tables.push(tableNode);
    tableMapByLower.set(tableLower, tableNode);
  }

  // 2. Suporte a ALTER TABLE (ADD COLUMN / ADD FOREIGN KEY / ADD PRIMARY KEY)
  const alterRe = new RegExp(ALTER_TABLE_RE.source, ALTER_TABLE_RE.flags);
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterRe.exec(cleanedSql)) !== null) {
    if (insideRoutine(alterMatch.index)) continue;
    const targetTblName = alterMatch[1];
    const opsRaw = alterMatch[2];
    const tbl = tableMapByLower.get(targetTblName.toLowerCase());
    if (!tbl || !opsRaw) continue;

    for (const opPart of splitByTopLevelCommas(opsRaw)) {
      const op = opPart.trim().replace(/\s+/g, ' ');
      const addFk = op.match(
        new RegExp(
          String.raw`^ADD\s+(?:CONSTRAINT\s+[\`"]?\w+[\`"]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+${IDENT}(?:\s*\(([^)]+)\))?`,
          'i'
        )
      );
      if (addFk) {
        const srcCols = splitIdentifierList(addFk[1]);
        const refTbl = addFk[2];
        const refCols = addFk[3] ? splitIdentifierList(addFk[3]) : [];
        rawEdges.push({
          sourceTable: tbl.name,
          sourceColumns: srcCols,
          targetTable: refTbl,
          targetColumns: refCols,
          isExplicit: true,
        });
        srcCols.forEach((sc, idx) => {
          const col = tbl.columns.find((c) => c.name.toLowerCase() === sc.toLowerCase());
          if (col) {
            col.isForeignKey = true;
            col.isExplicitForeignKey = true;
            col.category = 'key';
            col.fkTarget = { table: refTbl, column: refCols[idx] || refCols[0] || '' };
          }
        });
        continue;
      }

      const addPk = op.match(/^ADD\s+(?:CONSTRAINT\s+[`"]?\w+[`"]?\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (addPk) {
        for (const pkCol of splitIdentifierList(addPk[1])) {
          const col = tbl.columns.find((c) => c.name.toLowerCase() === pkCol.toLowerCase());
          if (col) {
            col.isPrimary = true;
            col.isNullable = false;
            col.category = 'key';
          }
        }
        continue;
      }

      const addCol = op.match(/^ADD\s+(?:COLUMN\s+)?([\s\S]+)$/i);
      if (addCol) {
        const parsedCol = parseColumnDefinitionLine(tbl.name, addCol[1].trim());
        if (
          parsedCol &&
          !tbl.columns.some(
            (c) => c.name.toLowerCase() === parsedCol.column.name.toLowerCase()
          )
        ) {
          tbl.columns.push(parsedCol.column);
          if (parsedCol.inlineFk) {
            rawEdges.push({
              sourceTable: tbl.name,
              sourceColumns: [parsedCol.column.name],
              targetTable: parsedCol.inlineFk.table,
              targetColumns: parsedCol.inlineFk.column ? [parsedCol.inlineFk.column] : [],
              isExplicit: true,
            });
          }
        }
      }
    }
  }

  // 3. Extração de Triggers associadas às tabelas
  const routineWrites = new Map<string, string[]>();
  for (const r of routines) {
    const text = cleanedSql.slice(r.start, r.end);
    const named = text.match(
      new RegExp(
        String.raw`^CREATE\s+(?:OR\s+REPLACE\s+)?(?:DEFINER\s*=\s*\S+\s+)?(?:PROCEDURE|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?${IDENT}`,
        'i'
      )
    );
    if (named) {
      routineWrites.set(named[1].toLowerCase(), extractTablesWrittenByBody(text.slice(named[0].length)));
    }
  }

  for (const r of routines) {
    const header = cleanedSql.slice(r.start, r.end).match(TRIGGER_HEADER_RE);
    if (!header) continue;
    const [, name, timing, eventText, onTable] = header;
    const tbl = tableMapByLower.get(onTable.toLowerCase());
    if (!tbl) continue;

    const body = cleanedSql.slice(r.start + header[0].length, r.end);
    const writesTo = new Set(extractTablesWrittenByBody(body));
    for (const call of body.matchAll(
      /\b(?:EXECUTE\s+(?:FUNCTION|PROCEDURE)|CALL)\s+(?:\w+\.)?(\w+)/gi
    )) {
      routineWrites.get(call[1].toLowerCase())?.forEach((t) => writesTo.add(t));
    }

    tbl.triggers.push({
      name,
      timing: timing.toUpperCase().replace(/\s+/g, ' '),
      events: Array.from(
        eventText.toUpperCase().matchAll(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/g),
        (m) => m[1]
      ),
      writesTo: Array.from(writesTo),
    });
  }

  // 4. Inferência opcional de FKs implícitas (id_*, *_id) quando habilitada nas preferências
  if (options?.inferImplicitForeignKeys) {
    for (const tbl of tables) {
      const ownStem = tbl.name.toLowerCase().replace(/^(tb_|tbl_|tab_)/, '').replace(/s$/, '');
      for (const col of tbl.columns) {
        if (col.isForeignKey || col.isPrimary) continue;
        const low = col.name.toLowerCase();
        let cand = '';
        if (low.endsWith('_id') && low.length > 3) cand = low.slice(0, -3);
        else if (low.startsWith('id_') && low.length > 3) cand = low.slice(3);
        else if (low.startsWith('fk_') && low.length > 3) cand = low.slice(3);
        if (!cand || cand === ownStem) continue;

        const cleanCand = cand.replace(/_(pai|mae|superior|chefe|origem|destino)$/, '');
        const target = tables.find((t) => {
          const tStem = t.name.toLowerCase().replace(/^(tb_|tbl_|tab_)/, '').replace(/s$/, '');
          return t.name.toLowerCase() === cand || tStem === cleanCand.replace(/s$/, '');
        });

        if (target) {
          const pkCol = target.columns.find((c) => c.isPrimary)?.name || target.columns[0]?.name || 'id';
          col.isForeignKey = true;
          col.isExplicitForeignKey = false;
          col.fkTarget = { table: target.name, column: pkCol };
          rawEdges.push({
            sourceTable: tbl.name,
            sourceColumns: [col.name],
            targetTable: target.name,
            targetColumns: [pkCol],
            isExplicit: false,
          });
        }
      }
    }
  }

  // 5. Resolução final das arestas de relacionamento (incluindo compostas e Self-Join)
  const relationships: ERRelationshipEdge[] = [];
  const seenEdgeIds = new Set<string>();

  for (const raw of rawEdges) {
    const srcTbl = tableMapByLower.get(raw.sourceTable.toLowerCase());
    const tgtTbl = tableMapByLower.get(raw.targetTable.toLowerCase());

    if (!tgtTbl) {
      errors.push(
        `"${raw.sourceTable}.${raw.sourceColumns.join(',')}" referencia tabela não encontrada "${raw.targetTable}".`
      );
    }

    const resolvedSourceTable = srcTbl ? srcTbl.name : raw.sourceTable;
    const resolvedTargetTable = tgtTbl ? tgtTbl.name : raw.targetTable;
    const primaryTargetCol =
      raw.targetColumns[0] ||
      tgtTbl?.columns.find((c) => c.isPrimary)?.name ||
      'id';

    if (
      tgtTbl &&
      raw.targetColumns[0] &&
      !tgtTbl.columns.some(
        (c) => c.name.toLowerCase() === raw.targetColumns[0].toLowerCase()
      )
    ) {
      errors.push(
        `"${resolvedSourceTable}.${raw.sourceColumns[0]}" referencia coluna inexistente "${resolvedTargetTable}.${raw.targetColumns[0]}".`
      );
    }

    // Atualiza fkTarget nas colunas quando REFERENCES omitiu o nome da coluna PK
    if (srcTbl) {
      raw.sourceColumns.forEach((sc, idx) => {
        const c = srcTbl.columns.find((col) => col.name.toLowerCase() === sc.toLowerCase());
        if (c && c.fkTarget && !c.fkTarget.column) {
          c.fkTarget = {
            table: resolvedTargetTable,
            column: raw.targetColumns[idx] || primaryTargetCol,
          };
        }
      });
    }

    const srcColObj = srcTbl?.columns.find(
      (c) => c.name.toLowerCase() === raw.sourceColumns[0].toLowerCase()
    );
    const isOneToOne = Boolean(
      raw.sourceColumns.length === 1 &&
        srcColObj &&
        (srcColObj.isUnique ||
          (srcColObj.isPrimary &&
            (srcTbl?.columns.filter((c) => c.isPrimary).length || 0) === 1))
    );

    const edgeId = `${resolvedSourceTable}.${raw.sourceColumns.join('+')}->${resolvedTargetTable}.${primaryTargetCol}`.toLowerCase();
    if (seenEdgeIds.has(edgeId)) continue;
    seenEdgeIds.add(edgeId);

    relationships.push({
      id: edgeId,
      sourceTable: resolvedSourceTable,
      sourceColumn: raw.sourceColumns[0],
      sourceColumns: raw.sourceColumns.length > 1 ? raw.sourceColumns : undefined,
      targetTable: resolvedTargetTable,
      targetColumn: primaryTargetCol,
      targetColumns: raw.targetColumns.length > 1 ? raw.targetColumns : undefined,
      cardinality: isOneToOne ? '1:1' : '1:N',
      isExplicit: raw.isExplicit,
      isSelfJoin: resolvedSourceTable.toLowerCase() === resolvedTargetTable.toLowerCase(),
    });
  }

  // 6. Extração de INSERT INTO ... VALUES (...) para amostra viva de dados nos cards!
  const insertRe = new RegExp(INSERT_RE.source, INSERT_RE.flags);
  let insMatch: RegExpExecArray | null;
  while ((insMatch = insertRe.exec(cleanedSql)) !== null) {
    if (insideRoutine(insMatch.index)) continue;
    const tbl = tableMapByLower.get(insMatch[1].toLowerCase());
    if (!tbl) continue;

    const targetCols =
      insMatch[2] !== undefined
        ? splitIdentifierList(insMatch[2]).map((colName) => {
            const found = tbl.columns.find(
              (c) => c.name.toLowerCase() === colName.toLowerCase()
            );
            return found?.name || colName;
          })
        : tbl.columns.map((c) => c.name);

    const tuples = extractValueTuples(cleanedSql, insMatch.index + insMatch[0].length);
    for (const tuple of tuples) {
      const vals = splitByTopLevelCommas(tuple);
      const rowObj: Record<string, unknown> = {};
      targetCols.forEach((colKey, idx) => {
        rowObj[colKey] = cleanSqlLiteralValue(vals[idx]?.trim() ?? 'NULL');
      });
      tbl.sampleRows.push(rowObj);
    }
    tbl.rowCount = tbl.sampleRows.length;
  }

  return {
    tables,
    relationships,
    errors,
    detectedDatabase,
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES DE LEXING / PARSING TOLERANTE
// ============================================================================

function parseColumnDefinitionLine(
  tableName: string,
  line: string
): {
  column: ERColumnNode;
  inlineFk?: { table: string; column: string };
} | null {
  const nameMatch = line.match(/^[`"]?(\w+)[`"]?\s*/);
  if (!nameMatch) return null;
  const colName = nameMatch[1];
  if (isReservedConstraintWord(colName)) return null;

  const rest = line.slice(nameMatch[0].length);
  const typeMatch = rest.match(COLUMN_TYPE_RE);
  const rawType = typeMatch
    ? `${typeMatch[1]}${(typeMatch[2] ?? '').replace(/\s+/g, '')}${typeMatch[3]?.trim() ?? ''}`
    : 'VARCHAR(100)';
  const modifiersRaw = typeMatch ? rest.slice(typeMatch[0].length) : rest;
  const modifiers = modifiersRaw.replace(/'(?:[^'\\]|\\.|'')*'/g, "''").toUpperCase();

  const isPk = /\bPRIMARY\s+KEY\b/.test(modifiers);
  const isUnique = /\bUNIQUE\b/.test(modifiers);
  const isNotNull = /\bNOT\s+NULL\b/.test(modifiers);
  const defaultMatch = modifiersRaw.match(
    /\bDEFAULT\s+('(?:[^'\\]|\\.|'')*'|\([^)]*\)|[^\s,]+)/i
  );

  let inlineFk: { table: string; column: string } | undefined;
  const inlineFkMatch = modifiersRaw.match(INLINE_FK_RE);
  if (inlineFkMatch) {
    inlineFk = {
      table: inlineFkMatch[1],
      column: inlineFkMatch[2] ?? '',
    };
  }

  const isFk = Boolean(inlineFk);

  return {
    column: {
      id: `${tableName}_${colName}`,
      name: colName,
      type: rawType.toUpperCase(),
      category: categorizeSqlType(rawType, isPk, isFk),
      isPrimary: isPk,
      isForeignKey: isFk,
      isExplicitForeignKey: isFk,
      fkTarget: inlineFk,
      isNullable: !isNotNull && !isPk,
      isUnique,
      defaultValue: defaultMatch?.[1],
    },
    inlineFk,
  };
}

function extractTablesWrittenByBody(body: string): string[] {
  const written = new Set<string>();
  for (const w of body.matchAll(new RegExp(BODY_WRITE_RE.source, BODY_WRITE_RE.flags))) {
    const tName = w[1] ?? w[2];
    if (tName) written.add(tName);
  }
  return Array.from(written);
}

function findRoutineRanges(sql: string): Array<{ start: number; end: number }> {
  const delimiterChanges = Array.from(
    sql.matchAll(/^\s*DELIMITER\s+(\S+)\s*$/gim),
    (d) => ({ at: d.index ?? 0, delimiter: d[1] })
  );
  const delimiterAt = (index: number) =>
    delimiterChanges.filter((d) => d.at < index).pop()?.delimiter ?? ';';

  const ranges: Array<{ start: number; end: number }> = [];
  const re = new RegExp(ROUTINE_RE.source, ROUTINE_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const end = findRoutineEnd(sql, m.index + m[0].length, delimiterAt(m.index));
    ranges.push({ start: m.index, end });
    re.lastIndex = end;
  }
  return ranges;
}

function findRoutineEnd(sql: string, from: number, delimiter: string): number {
  let depth = 0;
  for (let i = from; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = findQuoteEnd(sql, i);
      continue;
    }
    if (delimiter !== ';' && depth === 0 && sql.startsWith(delimiter, i)) return i;
    if (ch === '$' && delimiter === ';') {
      const tag = sql.slice(i).match(/^\$(\w*)\$/)?.[0];
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        if (close === -1) return sql.length;
        i = close + tag.length - 1;
        continue;
      }
    }
    if (ch === ';' && depth === 0) return i + 1;

    if (/[A-Za-z_]/.test(ch) && !/\w/.test(sql[i - 1] ?? '')) {
      const wordMatch = sql.slice(i).match(/^\w+/);
      if (!wordMatch) continue;
      const word = wordMatch[0].toUpperCase();
      if (word === 'BEGIN' || (word === 'CASE' && depth > 0)) {
        depth++;
      } else if (word === 'END' && depth > 0) {
        const nextMatch = sql.slice(i + 3).match(/^\s+(\w+)/);
        const next = nextMatch?.[1].toUpperCase();
        if (next && ['IF', 'LOOP', 'WHILE', 'REPEAT'].includes(next)) {
          i += 3 + nextMatch![0].length - 1;
          continue;
        }
        depth--;
        if (depth === 0) return i + 3;
        if (next === 'CASE' && nextMatch) {
          i += 3 + nextMatch[0].length - 1;
          continue;
        }
      }
      i += word.length - 1;
    }
  }
  return sql.length;
}

export function stripSqlComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = findQuoteEnd(sql, i);
      out += sql.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if ((ch === '-' && sql[i + 1] === '-') || ch === '#') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      out += ' ';
      i = close === -1 ? sql.length : close + 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function findQuoteEnd(sql: string, start: number): number {
  const quote = sql[start];
  for (let i = start + 1; i < sql.length; i++) {
    if (sql[i] === '\\') {
      i++;
      continue;
    }
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i++;
        continue;
      }
      return i;
    }
  }
  return sql.length - 1;
}

function findClosingParen(sql: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = findQuoteEnd(sql, i);
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

function extractValueTuples(sql: string, startIndex: number): string[] {
  const tuples: string[] = [];
  let i = startIndex;
  while (i < sql.length && /\s/.test(sql[i])) i++;
  while (i < sql.length && sql[i] === '(') {
    const close = findClosingParen(sql, i);
    const end = close === -1 ? sql.length : close;
    tuples.push(sql.substring(i + 1, end));
    i = end + 1;
    while (i < sql.length && /[\s,]/.test(sql[i])) i++;
  }
  return tuples;
}

function splitByTopLevelCommas(str: string): string[] {
  const results: string[] = [];
  let start = 0;
  let parenDepth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = findQuoteEnd(str, i);
      continue;
    }
    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === ',' && parenDepth === 0) {
      results.push(str.slice(start, i));
      start = i + 1;
    }
  }
  const last = str.slice(start);
  if (last.trim()) results.push(last);
  return results;
}

function splitIdentifierList(list: string): string[] {
  return list
    .split(',')
    .map((s) =>
      s
        .replace(/\(.*\)/, '')
        .replace(/\s+(ASC|DESC)$/i, '')
        .replace(/[`"']/g, '')
        .trim()
    )
    .filter(Boolean);
}

function cleanSqlLiteralValue(val: string): string | number | boolean | null {
  const trimmed = val.trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'NULL' || upper === '') return null;
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  if (/^(CURRENT_TIMESTAMP|NOW\(\)|SYSDATE\(\))$/.test(upper)) return '(agora)';
  if (/^(CURRENT_DATE|CURDATE\(\))$/.test(upper)) return '(hoje)';
  if (upper === 'DEFAULT') return '(padrão)';
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmed)) {
    const fn = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? 'expr';
    return `⟨${fn}(…)⟩`;
  }
  const quoted = trimmed.match(/^(['"`])([\s\S]*)\1$/);
  if (quoted) {
    const q = quoted[1];
    return quoted[2].split(q + q).join(q).replace(/\\(.)/g, '$1');
  }
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;
  return trimmed;
}

function isReservedConstraintWord(word: string): boolean {
  return [
    'primary',
    'foreign',
    'key',
    'constraint',
    'check',
    'unique',
    'index',
    'fulltext',
    'spatial',
    'exclude',
  ].includes(word.toLowerCase());
}

