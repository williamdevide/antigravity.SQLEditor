import alasql from 'alasql';
import { registerMySQLFunctions, preprocessSqlQuery } from './mysqlFunctions';
import { parseSqlStatementsWithRanges } from './sqlStatementParser';
import type { AutoGradeDetails, AutoGradeQueryDetail } from '../types';

/**
 * Executa um bloco SQL inteiro dentro de uma instância isolada do AlaSQL
 * Retornando os resultados de cada instrução executada sem afetar o IndexedDB do navegador.
 */
function executeSqlScriptIsolated(
  setupScriptsSql: string[],
  targetSql: string
): Array<{
  statement: string;
  rows: Record<string, any>[];
  columns: string[];
  error?: string;
}> {
  const dbId = `autograde_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const isoDb = new (alasql as any).Database(dbId);
  registerMySQLFunctions(alasql);

  try {
    // 1. Executa scripts de base de dados (DDL + Carga inicial de dados da aula/prova)
    for (const rawSetup of setupScriptsSql) {
      if (!rawSetup || !rawSetup.trim()) continue;
      const setupParsed = parseSqlStatementsWithRanges(rawSetup);
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

    // 2. Executa as instruções alvo (gabarito ou resposta do aluno)
    const parsedTarget = parseSqlStatementsWithRanges(targetSql || '');
    const results: Array<{
      statement: string;
      rows: Record<string, any>[];
      columns: string[];
      error?: string;
    }> = [];

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
 * Normaliza um conjunto de linhas para comparação semântica independente de nomes de colunas/aliases menores
 * (compara valores ordenados por linha de forma tolerante a casas decimais e tipos numéricos vs string).
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

  // Primeiro checa na mesma ordem
  if (normExp.every((v, i) => v === normAct[i])) return true;

  // Fallback tolerante à ordem (caso a questão não exija ORDER BY estrito)
  const sortedExp = [...normExp].sort();
  const sortedAct = [...normAct].sort();
  return sortedExp.every((v, i) => v === sortedAct[i]);
}

/**
 * Corrige automaticamente o código SQL do aluno comparando-o com o Gabarito SQL oficial,
 * executando ambos sobre um snapshot limpo dos bancos de dados da turma/avaliação.
 */
export function autoGradeStudentSubmission(params: {
  studentSql: string;
  answerKeySql: string;
  setupDatabaseScripts: string[];
}): AutoGradeDetails {
  const keySql = (params.answerKeySql || '').trim();
  const studSql = (params.studentSql || '').trim();

  if (!keySql) {
    // Sem gabarito: avalia apenas se o código do aluno executa sem erros de sintaxe/execução
    const studRes = executeSqlScriptIsolated(params.setupDatabaseScripts, studSql);
    if (studRes.length === 0) {
      return {
        totalQueries: 1,
        passedQueries: 0,
        score: 0,
        items: [
          {
            label: 'Execução Geral',
            passed: false,
            expectedSummary: 'Instruções SQL válidas',
            actualSummary: 'Nenhum comando SQL encontrado',
          },
        ],
      };
    }

    const items: AutoGradeQueryDetail[] = studRes.map((r, idx) => ({
      label: `Comando #${idx + 1}`,
      passed: !r.error,
      expectedSummary: 'Execução sem erros (sem gabarito oficial)',
      actualSummary: r.error
        ? `Erro: ${r.error}`
        : `${r.rows.length} registro(s) retornado(s)`,
      error: r.error,
    }));

    const passedCount = items.filter((i) => i.passed).length;
    const rawScore = (passedCount / items.length) * 10;
    const score = Math.round(rawScore * 2) / 2;
    return {
      totalQueries: items.length,
      passedQueries: passedCount,
      score,
      items,
    };
  }

  const expectedResults = executeSqlScriptIsolated(params.setupDatabaseScripts, keySql);
  const studentResults = executeSqlScriptIsolated(params.setupDatabaseScripts, studSql);

  if (expectedResults.length === 0) {
    return {
      totalQueries: 0,
      passedQueries: 0,
      score: 0,
      items: [],
    };
  }

  const items: AutoGradeQueryDetail[] = expectedResults.map((exp, idx) => {
    const act = studentResults[idx];
    const label = `Questão / Comando #${idx + 1}`;
    const expectedSummary = exp.error
      ? `Erro no gabarito: ${exp.error}`
      : `${exp.rows.length} linha(s), ${exp.columns.length} coluna(s)`;

    if (!act) {
      return {
        label,
        passed: false,
        expectedSummary,
        actualSummary: 'Não respondido pelo aluno',
      };
    }

    if (act.error) {
      return {
        label,
        passed: false,
        expectedSummary,
        actualSummary: `Erro de execução: ${act.error}`,
        error: act.error,
      };
    }

    const actualSummary = `${act.rows.length} linha(s), ${act.columns.length} coluna(s)`;
    const directMatch = !exp.error && areResultSetsEquivalent(exp.rows, act.rows);

    // Fallback: procura algum outro comando na resposta do aluno que produza resultado idêntico caso tenha pulado/reordenado uma questão
    const anyMatch =
      directMatch ||
      (!exp.error &&
        studentResults.some((cand) => !cand.error && areResultSetsEquivalent(exp.rows, cand.rows)));

    return {
      label,
      passed: anyMatch,
      expectedSummary,
      actualSummary: directMatch
        ? actualSummary
        : anyMatch
        ? `${actualSummary} (correspondência encontrada em outra instrução)`
        : actualSummary,
    };
  });

  const passedQueries = items.filter((i) => i.passed).length;
  const rawScore = items.length > 0 ? (passedQueries / items.length) * 10 : 0;
  // Arredonda para múltiplos de 0.5 mais próximos (padrão escolar SENAI)
  const score = Math.round(rawScore * 2) / 2;

  return {
    totalQueries: items.length,
    passedQueries,
    score,
    items,
  };
}
