import type { PracticeExerciseItem } from '../data/practiceExercisesCatalog';
import { dbEngine } from './dbEngine';
import { parseLiveSqlSchema } from './liveSqlSchemaParser';
import { runPedagogicalSchemaLinter } from './schemaLinter';
import { dbStorage } from './storage';

export interface ExerciseValidationResult {
  passed: boolean;
  title: string;
  feedback: string;
  details?: string[];
}

function normalizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }
  const str = String(val).trim();
  if (/^-?\d+\.\d+$/.test(str)) {
    return Number(str).toFixed(2);
  }
  return str.toLowerCase();
}

function stripSqlCommentsSimple(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

/**
 * Validador local determinístico para os desafios práticos da Central de Banco de Dados.
 */
export async function validatePracticeExercise(
  exercise: PracticeExerciseItem,
  studentSql: string
): Promise<ExerciseValidationResult> {
  const cleanSql = stripSqlCommentsSimple(studentSql || '');
  if (!cleanSql) {
    return {
      passed: false,
      title: 'Script SQL Vazio',
      feedback:
        'Escreva sua solução SQL no editor antes de clicar em Validar Resposta.',
    };
  }

  // Registro de tentativas anteriores no Dexie
  const existingProgress = await dbStorage.exerciseProgress
    .get(exercise.id)
    .catch(() => undefined);
  const attempts = (existingProgress?.attempts || 0) + 1;

  // ==========================================================================
  // MODO 1: VALIDAÇÃO DE MODELAGEM / DDL & NORMALIZAÇÃO (schema-check)
  // ==========================================================================
  if (exercise.validationMode === 'schema-check') {
    const parsed = parseLiveSqlSchema(studentSql, {
      inferImplicitForeignKeys: false,
    });
    const exp = exercise.schemaExpectations;

    if (!exp) {
      return {
        passed: false,
        title: 'Configuração de desafio ausente',
        feedback: 'Critérios de validação estrutural não definidos.',
      };
    }

    const failures: string[] = [];

    if (parsed.tables.length < exp.minTables) {
      failures.push(
        `Foram encontradas ${parsed.tables.length} tabela(s), mas o desafio exige ao menos ${exp.minTables}.`
      );
    }

    if (exp.requiredTableNames && exp.requiredTableNames.length > 0) {
      const presentNames = new Set(parsed.tables.map((t) => t.name.toLowerCase()));
      for (const reqName of exp.requiredTableNames) {
        if (!presentNames.has(reqName.toLowerCase())) {
          failures.push(`A tabela obrigatória \`${reqName}\` ainda não foi declarada.`);
        }
      }
    }

    const explicitFkCount = parsed.relationships.filter((r) => r.isExplicit).length;
    if (explicitFkCount < exp.minExplicitForeignKeys) {
      failures.push(
        `Declare ao menos ${exp.minExplicitForeignKeys} chave(s) estrangeira(s) explícita(s) usando \`FOREIGN KEY (...) REFERENCES ...\`.`
      );
    }

    const lintIssues = runPedagogicalSchemaLinter(
      parsed.tables,
      parsed.relationships,
      'strict'
    );

    if (exp.mustHaveAllPrimaryKeys) {
      const missingPks = lintIssues.filter((i) => i.code === 'MISSING_PK');
      if (missingPks.length > 0) {
        failures.push(
          `Toda entidade deve possuir \`PRIMARY KEY\` (${missingPks
            .map((m) => m.tableName)
            .join(', ')}).`
        );
      }
    }

    if (exp.mustPass1NF) {
      const fn1Violations = lintIssues.filter((i) => i.code === 'NORMALIZATION_1NF');
      if (fn1Violations.length > 0) {
        failures.push(
          `Ainda há violação da 1ª Forma Normal (1FN): ${fn1Violations[0].message}`
        );
      }
    }

    const orphanIssues = lintIssues.filter((i) => i.code === 'ORPHAN_FK');
    if (orphanIssues.length > 0) {
      failures.push(orphanIssues[0].message);
    }

    if (failures.length > 0) {
      return {
        passed: false,
        title: 'Quase lá! Ajuste a estrutura do esquema:',
        feedback: failures[0],
        details: failures,
      };
    }

    // Executa o DDL válido no motor AlaSQL para materializar o modelo do aluno
    await dbEngine.executeScript(studentSql);

    await dbStorage.exerciseProgress.put({
      exerciseId: exercise.id,
      completedAt: new Date().toISOString(),
      submittedSql: studentSql,
      attempts,
    });

    return {
      passed: true,
      title: 'Desafio de Modelagem Concluído!',
      feedback: `Excelente! As ${parsed.tables.length} tabelas e ${explicitFkCount} chave(s) estrangeira(s) atendem aos critérios de integridade e normalização.`,
    };
  }

  // ==========================================================================
  // MODO 2: VALIDAÇÃO DE CONSULTA DQL / JOIN / AGREGAÇÃO (query-match)
  // ==========================================================================
  if (exercise.requiredKeywords && exercise.requiredKeywords.length > 0) {
    const upperSql = cleanSql.toUpperCase();
    for (const kw of exercise.requiredKeywords) {
      const kwRe = new RegExp(`\\b${kw.toUpperCase()}\\b`);
      if (!kwRe.test(upperSql)) {
        return {
          passed: false,
          title: `Cláusula esperada ausente: ${kw}`,
          feedback: `Sua consulta precisa utilizar a estrutura SQL \`${kw}\` conforme solicitado no enunciado.`,
        };
      }
    }
  }

  // Garante que o banco alvo esteja provisionado com os registros de referência
  if (exercise.setupSql) {
    const tree = await dbEngine.getSchemaTree();
    const hasTargetDb = tree.some(
      (d) =>
        d.name.toLowerCase() === exercise.targetDatabase.toLowerCase() &&
        d.tables.length > 0
    );
    if (!hasTargetDb) {
      await dbEngine.executeScript(exercise.setupSql);
    }
  }

  const studentExec = await dbEngine.executeScript(
    `USE \`${exercise.targetDatabase}\`;\n${studentSql}`
  );
  const lastStudentResult = studentExec[studentExec.length - 1];

  if (!lastStudentResult || lastStudentResult.status === 'error') {
    return {
      passed: false,
      title: 'Erro de Sintaxe ou Execução SQL',
      feedback:
        lastStudentResult?.errorMessage ||
        'Não foi possível obter um conjunto de resultados da sua consulta.',
    };
  }

  const expectedExec = await dbEngine.executeScript(
    `USE \`${exercise.targetDatabase}\`;\n${exercise.referenceSolutionSql || ''}`
  );
  const expectedResult = expectedExec[expectedExec.length - 1];

  if (!expectedResult || expectedResult.status === 'error') {
    return {
      passed: false,
      title: 'Falha ao executar gabarito interno',
      feedback: 'Verifique se o banco de dados de referência não foi alterado.',
    };
  }

  const studentRows = lastStudentResult.rows || [];
  const expectedRows = expectedResult.rows || [];

  if (studentRows.length !== expectedRows.length) {
    return {
      passed: false,
      title: 'Quantidade de registros divergente',
      feedback: `Sua consulta retornou ${studentRows.length} linha(s), mas o resultado esperado possui ${expectedRows.length} linha(s). Confira seus filtros WHERE / GROUP BY.`,
    };
  }

  const expectedColCount = expectedResult.columns.length;
  const studentColCount = lastStudentResult.columns.length;
  if (expectedColCount > 0 && studentColCount !== expectedColCount) {
    return {
      passed: false,
      title: 'Colunas selecionadas divergentes',
      feedback: `Sua consulta retornou ${studentColCount} coluna(s), mas o desafio solicita ${expectedColCount} coluna(s).`,
    };
  }

  // Compara tupla a tupla normalizando valores (independente do alias escolhido pelo aluno)
  for (let r = 0; r < expectedRows.length; r++) {
    const expTuple = expectedResult.columns.map((c) =>
      normalizeCellValue(expectedRows[r][c])
    );
    const stuTuple = lastStudentResult.columns.map((c) =>
      normalizeCellValue(studentRows[r][c])
    );

    for (let c = 0; c < expTuple.length; c++) {
      if (expTuple[c] !== stuTuple[c]) {
        return {
          passed: false,
          title: `Divergência na linha ${r + 1}`,
          feedback: `Na linha ${r + 1}, coluna ${c + 1}, esperava-se "${expTuple[c]}", mas sua consulta retornou "${stuTuple[c]}". Verifique os campos projetados e a ordenação ORDER BY.`,
        };
      }
    }
  }

  await dbStorage.exerciseProgress.put({
    exerciseId: exercise.id,
    completedAt: new Date().toISOString(),
    submittedSql: studentSql,
    attempts,
  });

  return {
    passed: true,
    title: 'Resposta Correta! Desafio Superado!',
    feedback: `Parabéns! Todos os ${expectedRows.length} registro(s) e ${expectedColCount} coluna(s) conferem exatamente com o gabarito da disciplina.`,
  };
}

