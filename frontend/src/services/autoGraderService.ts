import alasql from 'alasql';
import { registerMySQLFunctions, preprocessSqlQuery } from './mysqlFunctions';
import { parseSqlStatementsWithRanges } from './sqlStatementParser';
import type { AutoGradeDetails, AutoGradeQueryDetail } from '../types';

/**
 * Remove eventuais blocos de abas auxiliares de exemplo em entregas legadas
 * quando houver pelo menos um bloco que não seja exemplo.
 */
function filterLegacyExampleTabBlocks(rawSql: string): string {
  const markerRegex = /^--\s*===\s*ABA:\s*(.+?)\s*===/gim;
  const matches = Array.from(rawSql.matchAll(markerRegex));
  if (matches.length <= 1) return rawSql;

  const blocks: { title: string; content: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? rawSql.length) : rawSql.length;
    blocks.push({
      title: (matches[i][1] || '').trim(),
      content: rawSql.slice(start, end),
    });
  }

  const nonExampleBlocks = blocks.filter((b) => !/exemplo/i.test(b.title));
  if (nonExampleBlocks.length > 0 && nonExampleBlocks.length < blocks.length) {
    return nonExampleBlocks.map((b) => b.content).join('\n\n');
  }
  return rawSql;
}

/**
 * Remove rigorosamente todos os comentários SQL (--, # e /* ... *\/) preservando
 * literais de string ('...', "...") e identificadores com crase (`...`).
 */
export function stripSqlComments(sql: string): string {
  if (!sql) return '';
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += '\n';
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        out += ' ';
      } else if (ch === '\n') {
        out += '\n';
      }
      continue;
    }

    if (inSingle) {
      out += ch;
      if (ch === '\\' && next) {
        out += next;
        i++;
        continue;
      }
      if (ch === "'") {
        if (next === "'") {
          out += next;
          i++;
          continue;
        }
        inSingle = false;
      }
      continue;
    }

    if (inDouble) {
      out += ch;
      if (ch === '\\' && next) {
        out += next;
        i++;
        continue;
      }
      if (ch === '"') {
        if (next === '"') {
          out += next;
          i++;
          continue;
        }
        inDouble = false;
      }
      continue;
    }

    if (inBacktick) {
      out += ch;
      if (ch === '`') {
        if (next === '`') {
          out += next;
          i++;
          continue;
        }
        inBacktick = false;
      }
      continue;
    }

    // Início de literais
    if (ch === "'") {
      inSingle = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      out += ch;
      continue;
    }
    if (ch === '`') {
      inBacktick = true;
      out += ch;
      continue;
    }

    // Início de comentários (--, #, /*)
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '#') {
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    out += ch;
  }

  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .join('\n')
    .trim();
}

interface IsolatedExecutionItem {
  statement: string;
  rows: Record<string, any>[];
  columns: string[];
  error?: string;
}

/**
 * Executa um bloco SQL limpo (sem comentários) dentro de uma instância isolada do AlaSQL,
 * retornando os resultados de cada instrução executada sem afetar o IndexedDB do navegador.
 */
function executeSqlScriptIsolated(
  setupScriptsSql: string[],
  cleanTargetSql: string
): IsolatedExecutionItem[] {
  const dbId = `autograde_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const isoDb = new (alasql as any).Database(dbId);
  registerMySQLFunctions(alasql);

  try {
    // 1. Executa scripts de base de dados (DDL + Carga inicial de dados da aula/prova)
    for (const rawSetup of setupScriptsSql) {
      const cleanSetup = stripSqlComments(rawSetup || '');
      if (!cleanSetup) continue;
      const setupParsed = parseSqlStatementsWithRanges(cleanSetup);
      for (const item of setupParsed) {
        const cleanStmt = item.text.trim();
        if (!cleanStmt) continue;
        // Ignora CREATE DATABASE / USE dentro da instância isolada para manter tudo no mesmo namespace
        if (/^(?:CREATE|DROP)\s+(?:DATABASE|SCHEMA)\b/i.test(cleanStmt) || /^USE\s+/i.test(cleanStmt)) {
          continue;
        }
        try {
          isoDb.exec(preprocessSqlQuery(cleanStmt));
        } catch (_) {
          // Segue mesmo em comandos DDL opcionais (ex: DROP IF EXISTS)
        }
      }
    }

    // 2. Executa as instruções alvo já livres de comentários
    const parsedTarget = parseSqlStatementsWithRanges(cleanTargetSql || '');
    const results: IsolatedExecutionItem[] = [];

    for (const item of parsedTarget) {
      const cleanStmt = item.text.trim();
      if (!cleanStmt) continue;
      if (/^(?:CREATE|DROP)\s+(?:DATABASE|SCHEMA)\b/i.test(cleanStmt) || /^USE\s+/i.test(cleanStmt)) {
        continue;
      }

      try {
        const res = isoDb.exec(preprocessSqlQuery(cleanStmt));
        if (Array.isArray(res)) {
          const rows = res.filter((r) => r && typeof r === 'object');
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          results.push({ statement: cleanStmt, rows, columns });
        } else {
          results.push({
            statement: cleanStmt,
            rows: [{ affectedRows: Number(res) || 0 }],
            columns: ['affectedRows'],
          });
        }
      } catch (err: any) {
        results.push({
          statement: cleanStmt,
          rows: [],
          columns: [],
          error: err?.message || 'Erro de execução SQL',
        });
      }
    }

    return results;
  } finally {
    try {
      delete (alasql as any).databases?.[dbId];
    } catch (_) {}
  }
}

/**
 * Normaliza um conjunto de linhas para comparação semântica independente de nomes de colunas/aliases menores.
 */
function normalizeRowsForComparison(rows: Record<string, any>[]): string[] {
  return rows.map((row) => {
    const vals = Object.values(row).map((v) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') {
        return Number.isInteger(v) ? String(v) : Number(v).toFixed(2);
      }
      if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
        const num = Number(v.trim());
        return Number.isInteger(num) ? String(num) : num.toFixed(2);
      }
      return String(v).trim().toLowerCase();
    });
    return vals.join(' | ');
  });
}

function areResultSetsEquivalent(
  expectedRows: Record<string, any>[],
  actualRows: Record<string, any>[]
): boolean {
  if (expectedRows.length !== actualRows.length) return false;
  if (expectedRows.length === 0) return true;

  const normExp = normalizeRowsForComparison(expectedRows);
  const normAct = normalizeRowsForComparison(actualRows);

  if (normExp.every((v, i) => v === normAct[i])) return true;

  const sortedExp = [...normExp].sort();
  const sortedAct = [...normAct].sort();
  return sortedExp.every((v, i) => v === sortedAct[i]);
}

interface SqlStructuralFeatures {
  verb: string;
  tables: Set<string>;
  joinCount: number;
  selectItems: Set<string>;
  aggregates: Set<string>;
  clauses: Set<string>;
}

/**
 * Extrai elementos estruturais da instrução SQL limpa para avaliação parcial proporcional.
 */
export function extractSqlFeatures(cleanStmt: string): SqlStructuralFeatures {
  const normalized = cleanStmt.replace(/\s+/g, ' ').trim();
  const upper = normalized.toUpperCase();

  const verbMatch = upper.match(/^([A-Z]+)/);
  const verb = verbMatch ? verbMatch[1] : '';

  // Tabelas referenciadas em FROM, JOIN, INTO, UPDATE, TABLE
  const tables = new Set<string>();
  const tableRegex = /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+`?([a-zA-Z_][a-zA-Z0-9_.]*)`?/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tableRegex.exec(normalized)) !== null) {
    const rawName = (tm[1] || '').toLowerCase();
    const shortName = rawName.includes('.') ? rawName.split('.').pop() || rawName : rawName;
    if (shortName && !['select', 'where', 'set', 'values'].includes(shortName)) {
      tables.add(shortName);
    }
  }

  // Contagem de JOINs
  const joinMatches = upper.match(/\bJOIN\b/g);
  const joinCount = joinMatches ? joinMatches.length : 0;

  // Projeções do SELECT
  const selectItems = new Set<string>();
  if (verb === 'SELECT') {
    const selMatch = normalized.match(/^SELECT\s+(?:DISTINCT\s+)?([\s\S]+?)(?:\bFROM\b|$)/i);
    if (selMatch && selMatch[1]) {
      const cols = selMatch[1].split(',').map((c) =>
        c
          .replace(/\s+AS\s+[`"\wÀ-ú]+$/i, '')
          .replace(/[`\s]/g, '')
          .toLowerCase()
      );
      cols.forEach((c) => {
        if (c) selectItems.add(c);
      });
    }
  }

  // Funções de agregação / DISTINCT
  const aggregates = new Set<string>();
  const aggRegex = /\b(COUNT|SUM|AVG|MIN|MAX|DISTINCT)\b/gi;
  let am: RegExpExecArray | null;
  while ((am = aggRegex.exec(upper)) !== null) {
    aggregates.add(am[1].toUpperCase());
  }

  // Cláusulas estruturais
  const clauses = new Set<string>();
  if (/\bWHERE\b/.test(upper)) clauses.add('WHERE');
  if (/\bGROUP\s+BY\b/.test(upper)) clauses.add('GROUP BY');
  if (/\bHAVING\b/.test(upper)) clauses.add('HAVING');
  if (/\bORDER\s+BY\b/.test(upper)) clauses.add('ORDER BY');
  if (/\bLIMIT\b/.test(upper)) clauses.add('LIMIT');
  if (/\bUNION\b/.test(upper)) clauses.add('UNION');

  return { verb, tables, joinCount, selectItems, aggregates, clauses };
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((v) => {
    if (b.has(v)) intersection++;
  });
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

function multisetRowOverlapRatio(
  expectedRows: Record<string, any>[],
  actualRows: Record<string, any>[]
): { ratio: number; matchedCount: number; expectedCount: number } {
  const normExp = normalizeRowsForComparison(expectedRows);
  const normAct = normalizeRowsForComparison(actualRows);
  if (normExp.length === 0 && normAct.length === 0) {
    return { ratio: 1, matchedCount: 0, expectedCount: 0 };
  }
  if (normExp.length === 0 || normAct.length === 0) {
    return { ratio: 0, matchedCount: 0, expectedCount: normExp.length };
  }

  const counts = new Map<string, number>();
  normExp.forEach((r) => counts.set(r, (counts.get(r) || 0) + 1));

  let matchedCount = 0;
  normAct.forEach((r) => {
    const cur = counts.get(r) || 0;
    if (cur > 0) {
      matchedCount++;
      counts.set(r, cur - 1);
    }
  });

  const denom = Math.max(normExp.length, normAct.length, 1);
  return {
    ratio: matchedCount / denom,
    matchedCount,
    expectedCount: normExp.length,
  };
}

function roundPoints(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Avalia proporcionalmente uma questão individual comparando a resposta do aluno com o gabarito.
 * Combina: Verbo (15%) + Execução sem erro (15%) + Estrutura SQL (40%) + Sobreposição de resultado (30%).
 */
function evaluateQuestionProportional(
  label: string,
  exp: IsolatedExecutionItem,
  act: IsolatedExecutionItem | undefined,
  maxPoints: number,
  matchNote?: string
): AutoGradeQueryDetail {
  const expectedSummary = exp.error
    ? `Erro no gabarito: ${exp.error}`
    : `${exp.rows.length} linha(s), ${exp.columns.length} coluna(s)`;

  if (!act) {
    return {
      label,
      passed: false,
      status: 'wrong',
      maxPoints: roundPoints(maxPoints),
      earnedPoints: 0,
      studentSqlClean: '',
      expectedSqlClean: exp.statement,
      expectedSummary,
      actualSummary: 'Não respondido pelo aluno',
      breakdown: ['✗ Questão não respondida pelo aluno'],
    };
  }

  const actualSummaryBase = act.error
    ? `Erro de execução: ${act.error}`
    : `${act.rows.length} linha(s), ${act.columns.length} coluna(s)`;
  const actualSummary = matchNote ? `${actualSummaryBase} (${matchNote})` : actualSummaryBase;

  // Caso 100% equivalente no resultado da execução
  if (!exp.error && !act.error && areResultSetsEquivalent(exp.rows, act.rows)) {
    return {
      label,
      passed: true,
      status: 'correct',
      maxPoints: roundPoints(maxPoints),
      earnedPoints: roundPoints(maxPoints),
      studentSqlClean: act.statement,
      expectedSqlClean: exp.statement,
      expectedSummary,
      actualSummary,
      breakdown: ['✓ Resultado exato compatível com o gabarito (100% da questão)'],
    };
  }

  // Avaliação parcial proporcional por pedaços corretos
  const expFeat = extractSqlFeatures(exp.statement);
  const actFeat = extractSqlFeatures(act.statement);
  const breakdown: string[] = [];
  let ratio = 0;

  // 1. Verbo SQL principal (15%)
  if (expFeat.verb && expFeat.verb === actFeat.verb) {
    ratio += 0.15;
    breakdown.push(`✓ Comando ${actFeat.verb} correto`);
  } else {
    breakdown.push(`✗ Comando esperado: ${expFeat.verb || 'SQL'} (aluno usou ${actFeat.verb || 'desconhecido'})`);
  }

  // 2. Execução sem erros de sintaxe (15%)
  if (!act.error) {
    ratio += 0.15;
    breakdown.push('✓ Executou sem erros de sintaxe');
  } else {
    breakdown.push(`✗ Erro de execução: ${act.error}`);
  }

  // 3. Estrutura SQL (40% distribuídos proporcionalmente entre os elementos presentes no gabarito)
  const structureScores: number[] = [];

  if (expFeat.tables.size > 0) {
    const tblSim = jaccardSimilarity(expFeat.tables, actFeat.tables);
    structureScores.push(tblSim);
    if (tblSim === 1) {
      breakdown.push(`✓ Tabela(s) correta(s): ${Array.from(expFeat.tables).join(', ')}`);
    } else if (tblSim > 0) {
      breakdown.push(`⚠ Tabela(s) parcialmente corretas (${Math.round(tblSim * 100)}%)`);
    } else {
      breakdown.push(`✗ Tabela(s) esperada(s): ${Array.from(expFeat.tables).join(', ')}`);
    }
  }

  if (expFeat.selectItems.size > 0) {
    const colSim = jaccardSimilarity(expFeat.selectItems, actFeat.selectItems);
    structureScores.push(colSim);
    if (colSim >= 0.8) {
      breakdown.push('✓ Colunas/expressões projetadas compatíveis');
    } else if (colSim > 0) {
      breakdown.push(`⚠ Colunas/expressões parcialmente compatíveis (${Math.round(colSim * 100)}%)`);
    } else {
      breakdown.push('✗ Colunas projetadas diferem do gabarito');
    }
  }

  if (expFeat.joinCount > 0) {
    const joinScore = actFeat.joinCount > 0 ? Math.min(actFeat.joinCount, expFeat.joinCount) / expFeat.joinCount : 0;
    structureScores.push(joinScore);
    if (joinScore === 1) {
      breakdown.push(`✓ Junção (JOIN) aplicada (${actFeat.joinCount})`);
    } else if (joinScore > 0) {
      breakdown.push(`⚠ Faltou parte dos JOINs (${actFeat.joinCount}/${expFeat.joinCount})`);
    } else {
      breakdown.push('✗ Faltou cláusula JOIN esperada');
    }
  }

  if (expFeat.aggregates.size > 0) {
    const aggSim = jaccardSimilarity(expFeat.aggregates, actFeat.aggregates);
    structureScores.push(aggSim);
    if (aggSim === 1) {
      breakdown.push(`✓ Agregação/Modificador (${Array.from(expFeat.aggregates).join(', ')}) correto`);
    } else if (aggSim > 0) {
      breakdown.push('⚠ Agregações parcialmente corretas');
    } else {
      breakdown.push(`✗ Faltou função esperada (${Array.from(expFeat.aggregates).join(', ')})`);
    }
  }

  expFeat.clauses.forEach((cl) => {
    const hasClause = actFeat.clauses.has(cl);
    structureScores.push(hasClause ? 1 : 0);
    if (hasClause) {
      breakdown.push(`✓ Cláusula ${cl} presente`);
    } else {
      breakdown.push(`✗ Faltou cláusula ${cl}`);
    }
  });

  if (structureScores.length > 0) {
    const avgStructure = structureScores.reduce((acc, s) => acc + s, 0) / structureScores.length;
    ratio += 0.4 * avgStructure;
  } else if (actFeat.verb === expFeat.verb) {
    ratio += 0.2;
  }

  // 4. Sobreposição de resultado (30%: 10% colunas + 20% linhas coincidentes)
  if (!exp.error && !act.error) {
    const expCols = exp.columns.length;
    const actCols = act.columns.length;
    const colCountScore =
      expCols === 0 && actCols === 0
        ? 1
        : 1 - Math.abs(expCols - actCols) / Math.max(expCols, actCols, 1);
    ratio += 0.1 * Math.max(0, colCountScore);

    const overlap = multisetRowOverlapRatio(exp.rows, act.rows);
    ratio += 0.2 * overlap.ratio;
    if (overlap.matchedCount > 0) {
      breakdown.push(
        `⚠ ${overlap.matchedCount} de ${overlap.expectedCount} linha(s) de saída coincidem com o gabarito`
      );
    }
  }

  const clampedRatio = Math.min(0.95, Math.max(0, ratio));
  const earnedPoints = roundPoints(maxPoints * clampedRatio);

  return {
    label,
    passed: false,
    status: earnedPoints > 0 ? 'partial' : 'wrong',
    maxPoints: roundPoints(maxPoints),
    earnedPoints,
    studentSqlClean: act.statement,
    expectedSqlClean: exp.statement,
    expectedSummary,
    actualSummary,
    breakdown,
    error: act.error,
  };
}

/**
 * Corrige automaticamente o código SQL do aluno comparando-o com o Gabarito SQL oficial,
 * eliminando todos os comentários de ambos antes de executar e pontuando de 0 a 100
 * com pesos iguais por questão e análise proporcional de acertos parciais.
 */
export function autoGradeStudentSubmission(params: {
  studentSql: string;
  answerKeySql: string;
  setupDatabaseScripts: string[];
}): AutoGradeDetails {
  const rawStud = filterLegacyExampleTabBlocks(params.studentSql || '');
  const cleanKeySql = stripSqlComments(params.answerKeySql || '');
  const cleanStudSql = stripSqlComments(rawStud);

  // Sem gabarito oficial: valida execução sem erro com escala 0–100 e pesos iguais por comando
  if (!cleanKeySql) {
    const studRes = executeSqlScriptIsolated(params.setupDatabaseScripts, cleanStudSql);
    if (studRes.length === 0) {
      return {
        totalQueries: 1,
        passedQueries: 0,
        partialQueries: 0,
        maxScore: 100,
        score: 0,
        items: [
          {
            label: 'Questão #1',
            passed: false,
            status: 'wrong',
            maxPoints: 100,
            earnedPoints: 0,
            studentSqlClean: '',
            expectedSqlClean: '',
            expectedSummary: 'Instruções SQL válidas (sem gabarito vinculado)',
            actualSummary: 'Nenhum comando SQL encontrado após remoção de comentários',
            breakdown: ['✗ Nenhum comando SQL encontrado'],
          },
        ],
      };
    }

    const weight = 100 / studRes.length;
    const items: AutoGradeQueryDetail[] = studRes.map((r, idx) => {
      const ok = !r.error;
      const earned = ok ? roundPoints(weight) : 0;
      return {
        label: `Questão #${idx + 1}`,
        passed: ok,
        status: ok ? 'correct' : 'wrong',
        maxPoints: roundPoints(weight),
        earnedPoints: earned,
        studentSqlClean: r.statement,
        expectedSqlClean: '',
        expectedSummary: 'Execução sem erros (sem gabarito oficial)',
        actualSummary: r.error
          ? `Erro: ${r.error}`
          : `${r.rows.length} registro(s) retornado(s)`,
        breakdown: [ok ? '✓ Executou sem erros' : `✗ Erro: ${r.error}`],
        error: r.error,
      };
    });

    const passedCount = items.filter((i) => i.passed).length;
    const totalScore = Math.min(
      100,
      roundPoints(items.reduce((acc, it) => acc + (it.earnedPoints || 0), 0))
    );

    return {
      totalQueries: items.length,
      passedQueries: passedCount,
      partialQueries: 0,
      maxScore: 100,
      score: totalScore,
      items,
    };
  }

  const expectedResults = executeSqlScriptIsolated(params.setupDatabaseScripts, cleanKeySql);
  const studentResults = executeSqlScriptIsolated(params.setupDatabaseScripts, cleanStudSql);

  if (expectedResults.length === 0) {
    return {
      totalQueries: 0,
      passedQueries: 0,
      partialQueries: 0,
      maxScore: 100,
      score: 0,
      items: [],
    };
  }

  const totalQuestions = expectedResults.length;
  const questionWeight = 100 / totalQuestions;
  const usedStudentIndices = new Set<number>();

  // 1ª passada: tenta pareamento direto por índice ou por equivalência exata de resultado
  const pairedStudentIndex: Array<number | undefined> = expectedResults.map((exp, idx) => {
    const direct = studentResults[idx];
    if (
      direct &&
      !usedStudentIndices.has(idx) &&
      !exp.error &&
      !direct.error &&
      areResultSetsEquivalent(exp.rows, direct.rows)
    ) {
      usedStudentIndices.add(idx);
      return idx;
    }

    const matchIdx = studentResults.findIndex(
      (cand, cIdx) =>
        !usedStudentIndices.has(cIdx) &&
        !exp.error &&
        !cand.error &&
        areResultSetsEquivalent(exp.rows, cand.rows)
    );
    if (matchIdx !== -1) {
      usedStudentIndices.add(matchIdx);
      return matchIdx;
    }

    return undefined;
  });

  // 2ª passada: para questões sem match exato, usa o índice posicional (se livre) ou o melhor candidato estrutural restante
  expectedResults.forEach((exp, idx) => {
    if (pairedStudentIndex[idx] !== undefined) return;
    if (studentResults[idx] && !usedStudentIndices.has(idx)) {
      usedStudentIndices.add(idx);
      pairedStudentIndex[idx] = idx;
      return;
    }

    // Busca candidato restante com maior afinidade de tabelas/verbo (caso aluno tenha pulado uma questão)
    const expFeat = extractSqlFeatures(exp.statement);
    let bestIdx: number | undefined;
    let bestAffinity = -1;
    studentResults.forEach((cand, cIdx) => {
      if (usedStudentIndices.has(cIdx)) return;
      const candFeat = extractSqlFeatures(cand.statement);
      const tblScore = jaccardSimilarity(expFeat.tables, candFeat.tables);
      const verbScore = expFeat.verb === candFeat.verb ? 0.3 : 0;
      const affinity = tblScore + verbScore;
      if (affinity > bestAffinity) {
        bestAffinity = affinity;
        bestIdx = cIdx;
      }
    });

    if (bestIdx !== undefined && bestAffinity > 0.2) {
      usedStudentIndices.add(bestIdx);
      pairedStudentIndex[idx] = bestIdx;
    }
  });

  const items: AutoGradeQueryDetail[] = expectedResults.map((exp, idx) => {
    const mappedIdx = pairedStudentIndex[idx];
    const act = mappedIdx !== undefined ? studentResults[mappedIdx] : undefined;
    const matchNote =
      mappedIdx !== undefined && mappedIdx !== idx
        ? `pareado com instrução #${mappedIdx + 1}`
        : undefined;

    return evaluateQuestionProportional(
      `Questão #${idx + 1}`,
      exp,
      act,
      questionWeight,
      matchNote
    );
  });

  const passedQueries = items.filter((i) => i.status === 'correct' || i.passed).length;
  const partialQueries = items.filter((i) => i.status === 'partial').length;
  const rawTotal = items.reduce((acc, item) => acc + (item.earnedPoints || 0), 0);
  // Se todas as questões passaram exatamente, garante exatos 100.0 (evita arredondamento 99.9 em dízimas tipo 100/3)
  const score =
    passedQueries === totalQuestions
      ? 100
      : Math.min(100, roundPoints(rawTotal));

  return {
    totalQueries: totalQuestions,
    passedQueries,
    partialQueries,
    maxScore: 100,
    score,
    items,
  };
}
