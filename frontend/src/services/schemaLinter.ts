import type { LinterStrictness } from '../types/preferences';
import type {
  ERRelationshipEdge,
  ERTableNode,
  SchemaLintIssue,
} from '../types/erStudio';

function baseSqlTypeFamily(rawType: string): string {
  const t = (rawType || '').toUpperCase().trim();
  if (/INT|SERIAL|YEAR/.test(t)) return 'INTEGER';
  if (/DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL|MONEY/.test(t)) return 'DECIMAL';
  if (/CHAR|TEXT|STRING|UUID|ENUM/.test(t)) return 'TEXT';
  if (/DATE|TIME/.test(t)) return 'DATETIME';
  if (/BOOL|BIT/.test(t)) return 'BOOLEAN';
  return t.split('(')[0] || 'OTHER';
}

/**
 * Linter Pedagógico de Esquema Relacional em Português (PT-BR).
 * Avalia integridade estrutural, chaves primárias/estrangeiras, ciclos DFS e anomalias 1FN / 2FN / 3FN.
 */
export function runPedagogicalSchemaLinter(
  tables: ERTableNode[],
  relationships: ERRelationshipEdge[],
  strictness: LinterStrictness = 'strict'
): SchemaLintIssue[] {
  const issues: SchemaLintIssue[] = [];
  if (!tables || tables.length === 0) return issues;

  const tableMap = new Map(tables.map((t) => [t.name.toLowerCase(), t]));

  // 1. Checagem por tabela: tabela vazia, ausência de PK e anomalias de Normalização (1FN, 2FN, 3FN)
  for (const tbl of tables) {
    if (tbl.isView) continue;

    if (tbl.columns.length === 0) {
      issues.push({
        id: `empty-${tbl.name}`,
        severity: 'error',
        code: 'EMPTY_TABLE',
        tableName: tbl.name,
        title: `Tabela "${tbl.name}" sem atributos`,
        message: `A entidade "${tbl.name}" não possui nenhuma coluna declarada.`,
        pedagogicalTip:
          'Toda relação no modelo lógico deve possuir ao menos um atributo identificador (Chave Primária).',
      });
      continue;
    }

    const pkCols = tbl.columns.filter((c) => c.isPrimary);
    if (pkCols.length === 0) {
      issues.push({
        id: `missing-pk-${tbl.name}`,
        severity: strictness === 'strict' ? 'error' : 'warning',
        code: 'MISSING_PK',
        tableName: tbl.name,
        title: `Ausência de Chave Primária em "${tbl.name}"`,
        message: `A tabela "${tbl.name}" não declara nenhuma coluna como PRIMARY KEY.`,
        pedagogicalTip:
          'Pela Integridade de Entidade (Codd), toda tabela relacional precisa de uma Chave Primária única e não nula para identificar cada tupla sem ambiguidade.',
        suggestedFixSql: `ALTER TABLE \`${tbl.name}\` ADD COLUMN \`id\` INT PRIMARY KEY;`,
      });
    }

    // Regras Acadêmicas de Normalização (ativas no modo Estrito Acadêmico)
    if (strictness === 'strict') {
      // A. Detecção de Violação da 1ª Forma Normal (1FN): grupos repetitivos numerados (ex: telefone1, telefone2)
      const numberedStems = new Map<string, string[]>();
      for (const col of tbl.columns) {
        const m = col.name.toLowerCase().match(/^([a-z_]+?)_?([1-9])$/);
        if (m && m[1].length >= 3) {
          const list = numberedStems.get(m[1]) || [];
          list.push(col.name);
          numberedStems.set(m[1], list);
        }
        if (/(^lista_|_lista$|_csv$|_separados$|multivalorado|telefones|emails|itens_lista)/i.test(col.name)) {
          issues.push({
            id: `1nf-multi-${tbl.name}-${col.name}`,
            severity: 'warning',
            code: 'NORMALIZATION_1NF',
            tableName: tbl.name,
            columnName: col.name,
            title: `Possível atributo multivalorado em "${tbl.name}.${col.name}" (1FN)`,
            message: `O nome "${col.name}" sugere armazenamento de múltiplos valores na mesma célula.`,
            pedagogicalTip:
              'A 1ª Forma Normal (1FN) exige atributos atômicos (indivisíveis). Extraia atributos multivalorados para uma tabela filha relacionada via FOREIGN KEY.',
          });
        }
      }

      for (const [stem, cols] of numberedStems.entries()) {
        if (cols.length >= 2) {
          issues.push({
            id: `1nf-repeat-${tbl.name}-${stem}`,
            severity: 'warning',
            code: 'NORMALIZATION_1NF',
            tableName: tbl.name,
            title: `Grupo repetitivo detectado em "${tbl.name}": ${cols.join(', ')} (1FN)`,
            message: `Colunas numeradas (${cols.join(', ')}) indicam violação clássica da 1ª Forma Normal.`,
            pedagogicalTip:
              'Substitua colunas repetidas (ex: telefone1, telefone2) por uma tabela associativa/filha dedicada com chave estrangeira para a entidade principal.',
          });
        }
      }

      // B. Detecção de Violação da 2ª Forma Normal (2FN): dependência parcial em chave primária composta
      if (pkCols.length >= 2) {
        const nonKeyCols = tbl.columns.filter((c) => !c.isPrimary && !c.isForeignKey);
        const pkStems = pkCols
          .map((pk) =>
            pk.name
              .toLowerCase()
              .replace(/^id_|_id$|^cod_|^fk_/g, '')
              .trim()
          )
          .filter((s) => s.length >= 3);

        for (const nk of nonKeyCols) {
          const nkLow = nk.name.toLowerCase();
          const matchedStem = pkStems.find(
            (stem) => nkLow.includes(stem) && !nkLow.includes('preco_unitario') && !nkLow.includes('subtotal')
          );
          if (matchedStem) {
            issues.push({
              id: `2nf-${tbl.name}-${nk.name}`,
              severity: 'warning',
              code: 'NORMALIZATION_2NF',
              tableName: tbl.name,
              columnName: nk.name,
              title: `Suspeita de Dependência Parcial em "${tbl.name}.${nk.name}" (2FN)`,
              message: `A tabela possui PK composta (${pkCols.map((p) => p.name).join(', ')}), mas "${nk.name}" parece depender apenas de "${matchedStem}".`,
              pedagogicalTip:
                'A 2ª Forma Normal (2FN) determina que todo atributo não-chave deve depender da chave primária inteira, e não apenas de parte dela.',
            });
          }
        }
      }

      // C. Detecção de Violação da 3ª Forma Normal (3FN): dependência transitiva
      // Caso 1: Endereço clássico (ex: cep + cidade/uf/bairro na mesma tabela de pessoa/pedido)
      const colNamesLower = new Set(tbl.columns.map((c) => c.name.toLowerCase()));
      const hasAddressCluster =
        colNamesLower.has('cep') &&
        (colNamesLower.has('cidade') || colNamesLower.has('uf') || colNamesLower.has('estado')) &&
        tbl.name.toLowerCase() !== 'enderecos' &&
        tbl.name.toLowerCase() !== 'tb_enderecos' &&
        tbl.name.toLowerCase() !== 'ceps';

      if (hasAddressCluster) {
        issues.push({
          id: `3nf-cep-${tbl.name}`,
          severity: 'info',
          code: 'NORMALIZATION_3NF',
          tableName: tbl.name,
          title: `Oportunidade de 3ª Forma Normal (3FN) em "${tbl.name}" (CEP ➔ Cidade/UF)`,
          message: `Atributos de localização (CEP, Cidade/UF) coexistem como atributos não-chave em "${tbl.name}".`,
          pedagogicalTip:
            'Na 3ª Forma Normal (3FN), atributos não-chave não devem determinar outros atributos não-chave (dependência transitiva). Avalie extrair Endereços/Cidades se o domínio exigir normalização estrita.',
        });
      }

      // Caso 2: Dependência transitiva de Entidade Estrangeira / Secundária
      // (ex: id_cargo + nome_cargo, cargo_id + cargo_nome, cod_depto + nome_depto na mesma tabela tab1/funcionarios)
      const ownTblStem = tbl.name
        .toLowerCase()
        .replace(/^(tb_|tbl_|tab_)/, '')
        .replace(/s$/, '')
        .trim();

      const nonPkCols = tbl.columns.filter((c) => !c.isPrimary);

      for (const colA of nonPkCols) {
        const colALow = colA.name.toLowerCase();
        let foreignStem = '';

        const mPrefix = colALow.match(/^(?:id_|cod_|fk_)([a-zA-Z0-9_]+)$/);
        const mSuffix = colALow.match(/^([a-zA-Z0-9_]+)_(?:id|cod|codigo)$/);

        if (mPrefix) {
          foreignStem = mPrefix[1];
        } else if (mSuffix) {
          foreignStem = mSuffix[1];
        } else if (colA.isForeignKey && colA.fkTarget?.table) {
          foreignStem = colA.fkTarget.table.toLowerCase().replace(/^(tb_|tbl_|tab_)/, '').replace(/s$/, '');
        }

        foreignStem = foreignStem
          .replace(/^(tb_|tbl_|tab_)/, '')
          .replace(/s$/, '')
          .trim();

        if (foreignStem.length >= 3 && foreignStem !== ownTblStem) {
          for (const colB of nonPkCols) {
            if (colB.name.toLowerCase() === colALow) continue;
            const colBLow = colB.name.toLowerCase();

            // colB não deve ser ela mesma uma chave primária ou id
            if (colBLow.endsWith('_id') || colBLow.startsWith('id_') || colBLow.startsWith('cod_') || colBLow.startsWith('fk_')) {
              continue;
            }

            const containsStem = colBLow.includes(foreignStem);
            const isDescriptor =
              colBLow.includes('nome') ||
              colBLow.includes('desc') ||
              colBLow.includes('titulo') ||
              colBLow.includes('title') ||
              colBLow.includes('salario') ||
              colBLow.includes('sigla') ||
              colBLow.includes('tipo') ||
              colBLow.includes('valor');

            if (containsStem && (isDescriptor || colBLow.length <= foreignStem.length + 8)) {
              issues.push({
                id: `3nf-transitive-${tbl.name}-${colA.name}-${colB.name}`,
                severity: 'warning',
                code: 'NORMALIZATION_3NF',
                tableName: tbl.name,
                columnName: colB.name,
                title: `Suspeita de Dependência Transitiva em "${tbl.name}.${colB.name}" (3FN)`,
                message: `O atributo "${colB.name}" aparenta depender funcionalmente de "${colA.name}" (e não diretamente da chave primária). Há uma dependência transitiva: PK ➔ ${colA.name} ➔ ${colB.name}.`,
                pedagogicalTip: `A 3ª Forma Normal (3FN) exige que todo atributo não-chave dependa única e exclusivamente da chave primária. Crie uma tabela dedicada para "${foreignStem}" (ex: "${foreignStem}s") com PK "${colA.name}" e atributos descritivos como "${colB.name}", mantendo em "${tbl.name}" apenas a FOREIGN KEY "${colA.name}".`,
                suggestedFixSql: `CREATE TABLE IF NOT EXISTS \`${foreignStem}s\` (\n  \`${colA.name}\` INT PRIMARY KEY,\n  \`${colB.name}\` VARCHAR(100)\n);\nALTER TABLE \`${tbl.name}\` DROP COLUMN \`${colB.name}\`;`,
              });
            }
          }
        }
      }
    }
  }

  // 2. Checagem de integridade referencial das arestas (FK órfã, incompatibilidade FK != PK e FK apenas implícita)
  for (const rel of relationships) {
    const srcTbl = tableMap.get(rel.sourceTable.toLowerCase());
    const tgtTbl = tableMap.get(rel.targetTable.toLowerCase());

    if (!tgtTbl) {
      issues.push({
        id: `orphan-tbl-${rel.id}`,
        severity: 'error',
        code: 'ORPHAN_FK',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        title: `FK Órfã: tabela destino "${rel.targetTable}" inexistente`,
        message: `"${rel.sourceTable}.${rel.sourceColumn}" aponta para "${rel.targetTable}", que não existe no esquema.`,
        pedagogicalTip:
          'Crie primeiro a tabela pai (lado 1 / PK) antes de referenciá-la na tabela filha (lado N / FK).',
      });
      continue;
    }

    const srcCol = srcTbl?.columns.find(
      (c) => c.name.toLowerCase() === rel.sourceColumn.toLowerCase()
    );
    const tgtCol = tgtTbl.columns.find(
      (c) => c.name.toLowerCase() === rel.targetColumn.toLowerCase()
    );

    if (!tgtCol) {
      issues.push({
        id: `orphan-col-${rel.id}`,
        severity: 'error',
        code: 'ORPHAN_FK',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        title: `FK Órfã: coluna "${rel.targetTable}.${rel.targetColumn}" não encontrada`,
        message: `"${rel.sourceTable}.${rel.sourceColumn}" referencia uma coluna ausente em "${rel.targetTable}".`,
        pedagogicalTip:
          'Toda FOREIGN KEY deve apontar para uma coluna PRIMARY KEY ou UNIQUE existente na tabela referenciada.',
      });
      continue;
    }

    if (srcCol && tgtCol) {
      const famSrc = baseSqlTypeFamily(srcCol.type);
      const famTgt = baseSqlTypeFamily(tgtCol.type);
      if (famSrc !== famTgt) {
        issues.push({
          id: `type-mismatch-${rel.id}`,
          severity: 'warning',
          code: 'FK_TYPE_MISMATCH',
          tableName: rel.sourceTable,
          columnName: rel.sourceColumn,
          title: `Tipos incompatíveis entre FK e PK (${srcCol.type} ≠ ${tgtCol.type})`,
          message: `"${rel.sourceTable}.${srcCol.name}" é ${srcCol.type}, enquanto "${tgtTbl.name}.${tgtCol.name}" é ${tgtCol.type}.`,
          pedagogicalTip:
            'Em SGBDs relacionais (MySQL, PostgreSQL, SQL Server), a coluna FOREIGN KEY deve possuir exatamente o mesmo domínio/tipo da PRIMARY KEY referenciada.',
        });
      }
    }

    if (!rel.isExplicit && strictness === 'strict') {
      issues.push({
        id: `implicit-fk-${rel.id}`,
        severity: 'info',
        code: 'IMPLICIT_FK_ONLY',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        title: `Relacionamento apenas implícito em "${rel.sourceTable}.${rel.sourceColumn}"`,
        message: `A coluna segue a convenção de nome para "${tgtTbl.name}", mas não possui constraint FOREIGN KEY formal.`,
        pedagogicalTip:
          'Nomear uma coluna como *_id facilita a leitura, mas somente a cláusula FOREIGN KEY ... REFERENCES garante a Integridade Referencial no banco!',
        suggestedFixSql: `ALTER TABLE \`${rel.sourceTable}\` ADD CONSTRAINT \`fk_${rel.sourceTable}_${rel.sourceColumn}\` FOREIGN KEY (\`${rel.sourceColumn}\`) REFERENCES \`${tgtTbl.name}\`(\`${tgtCol.name}\`);`,
      });
    }
  }

  // 3. Detecção de Ciclos Referenciais Diretos entre Tabelas Distintas via DFS (A -> B -> C -> A)
  const adj = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.isSelfJoin || !rel.isExplicit) continue;
    const s = rel.sourceTable.toLowerCase();
    const t = rel.targetTable.toLowerCase();
    if (!tableMap.has(s) || !tableMap.has(t) || s === t) continue;
    const list = adj.get(s) || [];
    if (!list.includes(t)) list.push(t);
    adj.set(s, list);
  }

  const color = new Map<string, 0 | 1 | 2>();
  const pathStack: string[] = [];
  const reportedCycles = new Set<string>();

  const dfs = (u: string) => {
    color.set(u, 1);
    pathStack.push(u);
    for (const v of adj.get(u) || []) {
      const state = color.get(v) || 0;
      if (state === 0) {
        dfs(v);
      } else if (state === 1) {
        const idx = pathStack.indexOf(v);
        if (idx !== -1) {
          const cycleNodes = pathStack.slice(idx);
          const canonicalKey = [...cycleNodes].sort().join('->');
          if (!reportedCycles.has(canonicalKey)) {
            reportedCycles.add(canonicalKey);
            const displayChain = [...cycleNodes, v]
              .map((n) => tableMap.get(n)?.name || n)
              .join(' ➔ ');
            issues.push({
              id: `cycle-${canonicalKey}`,
              severity: 'warning',
              code: 'CIRCULAR_FK',
              tableName: tableMap.get(v)?.name,
              title: `Dependência Circular de Chaves Estrangeiras detectada`,
              message: `Ciclo referencial entre tabelas: ${displayChain}.`,
              pedagogicalTip:
                'Ciclos de FOREIGN KEY impedem INSERTs se todas as colunas forem NOT NULL ("problema do ovo e da galinha"). Garanta que ao menos uma FK do ciclo permita NULL para destravar a inserção inicial.',
            });
          }
        }
      }
    }
    pathStack.pop();
    color.set(u, 2);
  };

  for (const key of tableMap.keys()) {
    if ((color.get(key) || 0) === 0) {
      dfs(key);
    }
  }

  return issues;
}

