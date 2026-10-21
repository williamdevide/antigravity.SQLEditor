import alasql from 'alasql';
import { dbStorage } from './storage';
import { getClassroomDatabases, splitSqlStatements } from './scriptsLoader';
import type { DatabaseSchema, TableSchema, ColumnSchema, QueryResult, QueryHistoryItem, DatabasePreset } from '../types';

import { registerMySQLFunctions, preprocessSqlQuery } from './mysqlFunctions';

export interface DatabaseLoadProgress {
  dbName: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  currentStatement: number;
  totalStatements: number;
  percentage: number;
  currentTable?: string;
  errorMessage?: string;
}

export type OnLoadProgressCallback = (
  progressMap: Record<string, DatabaseLoadProgress>,
  completedCount: number,
  totalCount: number,
  overallPercentage: number
) => void;

// Desabilita avisos de console desnecessários do alasql e registra dialeto MySQL
alasql.options.autocommit = true;
registerMySQLFunctions(alasql);

const DEFAULT_SEEDS = [
  // 1. ECOMMERCE_DB
  `CREATE DATABASE IF NOT EXISTS ecommerce_db;`,
  `USE ecommerce_db;`,
  `CREATE TABLE IF NOT EXISTS categorias (
    id INT PRIMARY KEY,
    nome VARCHAR(100),
    descricao VARCHAR(255)
  );`,
  `INSERT INTO categorias VALUES 
    (1, 'Eletrônicos', 'Smartphones, notebooks e acessórios'),
    (2, 'Hardware', 'Placas de vídeo, processadores e memórias'),
    (3, 'Periféricos', 'Teclados mecânicos, mouses e headsets'),
    (4, 'Móveis', 'Cadeiras ergonômicas e mesas gamer');`,

  `CREATE TABLE IF NOT EXISTS produtos (
    id INT PRIMARY KEY,
    nome VARCHAR(150),
    preco DECIMAL(10,2),
    estoque INT,
    categoria_id INT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );`,
  `INSERT INTO produtos VALUES 
    (1, 'Monitor UltraWide 29"', 1299.90, 42, 1),
    (2, 'Teclado Mecânico RGB', 349.50, 115, 3),
    (3, 'Mouse Óptico 16000 DPI', 199.00, 80, 3),
    (4, 'Placa de Vídeo RTX 4070', 4299.00, 15, 2),
    (5, 'Cadeira Gamer Ergonômica', 899.90, 28, 4),
    (6, 'SSD NVMe 1TB Gen4', 449.00, 95, 2);`,

  `CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY,
    nome VARCHAR(120),
    email VARCHAR(150),
    nivel VARCHAR(20),
    cidade VARCHAR(80),
    ativo INT
  );`,
  `INSERT INTO usuarios VALUES 
    (1, 'Ana Clara Silva', 'ana.silva@email.com', 'admin', 'São Paulo', 1),
    (2, 'Bruno Henrique Santos', 'bruno.santos@email.com', 'cliente', 'Campinas', 1),
    (3, 'Carlos Eduardo Lima', 'carlos.lima@email.com', 'cliente', 'Curitiba', 1),
    (4, 'Daniela Ribeiro', 'daniela.r@email.com', 'suporte', 'Rio de Janeiro', 1),
    (5, 'Eduardo Meireles', 'eduardo.m@email.com', 'cliente', 'Belo Horizonte', 0);`,

  `CREATE TABLE IF NOT EXISTS pedidos (
    id INT PRIMARY KEY,
    usuario_id INT,
    data_pedido DATE,
    valor_total DECIMAL(10,2),
    status VARCHAR(30),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );`,
  `INSERT INTO pedidos VALUES 
    (101, 2, '2026-09-15', 548.50, 'entregue'),
    (102, 3, '2026-09-20', 4299.00, 'processando'),
    (103, 1, '2026-10-01', 1299.90, 'enviado'),
    (104, 5, '2026-10-05', 199.00, 'cancelado'),
    (105, 2, '2026-10-10', 1348.90, 'entregue');`,

  `CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT PRIMARY KEY,
    pedido_id INT,
    produto_id INT,
    quantidade INT,
    preco_unitario DECIMAL(10,2),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
  );`,
  `INSERT INTO itens_pedido VALUES 
    (1, 101, 2, 1, 349.50),
    (2, 101, 3, 1, 199.00),
    (3, 102, 4, 1, 4299.00),
    (4, 103, 1, 1, 1299.90),
    (5, 105, 5, 1, 899.90),
    (6, 105, 6, 1, 449.00);`,

  // 2. UNIVERSIDADE_DB
  `CREATE DATABASE IF NOT EXISTS universidade_db;`,
  `USE universidade_db;`,
  `CREATE TABLE IF NOT EXISTS cursos (
    id INT PRIMARY KEY,
    nome_curso VARCHAR(100),
    departamento VARCHAR(80),
    duracao_anos INT
  );`,
  `INSERT INTO cursos VALUES 
    (1, 'Engenharia de Software', 'Computação', 4),
    (2, 'Ciência de Dados & IA', 'Computação', 4),
    (3, 'Sistemas de Informação', 'Tecnologia', 3),
    (4, 'Engenharia Mecatrônica', 'Engenharia', 5);`,

  `CREATE TABLE IF NOT EXISTS alunos (
    id INT PRIMARY KEY,
    nome VARCHAR(120),
    matricula VARCHAR(20),
    semestre INT,
    curso_id INT,
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
  );`,
  `INSERT INTO alunos VALUES 
    (1, 'Gabriel Castro', '2024ES001', 3, 1),
    (2, 'Juliana Mendes', '2023CD014', 5, 2),
    (3, 'Lucas Faria', '2025SI008', 1, 3),
    (4, 'Mariana Costa', '2022EM003', 7, 4),
    (5, 'Rafael Souza', '2024ES042', 3, 1);`,

  `USE ecommerce_db;`
];

/**
 * Infere o tipo SQL apropriado a partir de convenções de nomenclatura e valor de amostra.
 */
function inferSqlType(colName: string, val: any): string {
  const lower = colName.toLowerCase();

  // 1. Checagem por valor
  if (val !== undefined && val !== null) {
    if (typeof val === 'boolean') return 'BOOLEAN';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'INT' : 'DECIMAL(10,2)';
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'DATE';
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(trimmed)) return 'DATETIME';
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return 'TIME';
      if (/^(true|false)$/i.test(trimmed)) return 'BOOLEAN';
      if (/^-?\d+$/.test(trimmed) && trimmed.length <= 10) return 'INT';
      if (/^-?\d+\.\d+$/.test(trimmed)) return 'DECIMAL(10,2)';
    }
  }

  // 2. Checagem por nome de coluna convencional
  if (lower === 'id' || lower.endsWith('_id') || lower.startsWith('id_') || lower.includes('ano') || lower.includes('idade') || lower.includes('quantidade') || lower.includes('duracao') || lower.includes('estoque')) {
    return 'INT';
  }
  if (lower.includes('preco') || lower.includes('valor') || lower.includes('salario') || lower.includes('taxa') || lower.includes('mensalidade') || lower.includes('nota') || lower.includes('custo')) {
    return 'DECIMAL(10,2)';
  }
  if (lower.includes('data') || lower.includes('_em') || lower.endsWith('_at') || lower.includes('nascimento') || lower.includes('cadastro')) {
    return 'DATE';
  }
  if (lower.startsWith('is_') || lower.startsWith('tem_') || lower.startsWith('no_') || lower.includes('ativo') || lower.includes('disponivel')) {
    return 'BOOLEAN';
  }
  if (lower.includes('email') || lower.includes('descricao') || lower.includes('endereco') || lower.includes('titulo') || lower.includes('nome')) {
    return 'VARCHAR(150)';
  }

  return 'VARCHAR(100)';
}

class DatabaseEngine {
  private activeDatabase: string = '';
  private currentPreset: DatabasePreset = 'empty';
  private hideSystemDatabases: boolean = true;
  private isInitialized: boolean = false;

  public getPreset(): DatabasePreset {
    return this.currentPreset;
  }

  public isHidingSystemDatabases(): boolean {
    return this.hideSystemDatabases;
  }

  public setHideSystemDatabases(hide: boolean): void {
    this.hideSystemDatabases = hide;
    try {
      localStorage.setItem('sqleditor_hide_system_dbs', hide ? 'true' : 'false');
    } catch (_) {}
    if (hide && this.activeDatabase.toLowerCase() === 'dbo') {
      this.activeDatabase = '';
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const savedPreset = (localStorage.getItem('sqleditor_db_preset') as DatabasePreset) || 'empty';
      this.currentPreset = savedPreset;

      const savedHideSystem = localStorage.getItem('sqleditor_hide_system_dbs');
      this.hideSystemDatabases = savedHideSystem === null ? true : savedHideSystem === 'true';

      const storedDbs = await dbStorage.databasesState.toArray();

      if (storedDbs.length > 0) {
        // Restaura bancos salvos no IndexedDB para o motor AlaSQL
        for (const item of storedDbs) {
          try {
            if (!alasql.databases[item.dbName]) {
              alasql(`CREATE DATABASE \`${item.dbName}\`;`);
            }
            alasql(`USE \`${item.dbName}\`;`);

            for (const [tableName, tableInfo] of Object.entries(item.tables)) {
              if (tableInfo.data && Array.isArray(tableInfo.data)) {
                // Cria tabela preservando tipos reais
                const colDefs = tableInfo.columns.map((c: any) => {
                  if (typeof c === 'string') {
                    const inferred = inferSqlType(c, tableInfo.data[0]?.[c]);
                    const isPk = c.toLowerCase() === 'id' || c.toLowerCase().startsWith('id_');
                    return `\`${c}\` ${inferred}${isPk ? ' PRIMARY KEY' : ''}`;
                  }
                  return `\`${c.name}\` ${c.type || 'VARCHAR(100)'}${c.isPrimary ? ' PRIMARY KEY' : ''}`;
                }).join(', ');

                alasql(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs});`);
                // Limpa e reinsere
                alasql(`DELETE FROM \`${tableName}\`;`);
                if (tableInfo.data.length > 0) {
                  const clonedData = JSON.parse(JSON.stringify(tableInfo.data));
                  if (alasql.databases[item.dbName]?.tables?.[tableName]) {
                    alasql.databases[item.dbName].tables[tableName].data = clonedData;
                  }
                  if (alasql.tables && alasql.tables[tableName]) {
                    alasql.tables[tableName].data = clonedData;
                  }
                }
              }
            }
          } catch (dbErr) {
            console.warn(`Erro ao restaurar banco ${item.dbName}:`, dbErr);
          }
        }

        // Tenta usar o primeiro banco disponível
        const firstDb = storedDbs[0]?.dbName || '';
        this.activeDatabase = firstDb;
        if (firstDb) {
          try { alasql(`USE ${firstDb};`); } catch (_) {}
        }
      } else {
        // Na primeira vez ou sem dados salvos no IndexedDB:
        if (savedPreset === 'samples') {
          await this.loadPreset('samples');
        } else if (savedPreset === 'class') {
          await this.loadPreset('class');
        } else {
          // 'empty' (padrão absoluto): NÃO carrega nenhum banco!
          this.activeDatabase = '';
          this.currentPreset = 'empty';
        }
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Falha na inicialização do DB Engine:', err);
      this.activeDatabase = '';
      this.isInitialized = true;
    }
  }

  public async loadPreset(preset: DatabasePreset, onProgress?: OnLoadProgressCallback): Promise<void> {
    this.currentPreset = preset;
    try {
      localStorage.setItem('sqleditor_db_preset', preset);
    } catch (_) {}

    // 1. Limpa bancos existentes em memória no AlaSQL
    const currentDbs = Object.keys(alasql.databases).filter(d => d !== 'alasql');
    for (const d of currentDbs) {
      try {
        alasql(`DROP DATABASE ${d};`);
      } catch (_) {}
    }

    // 2. Limpa IndexedDB
    await dbStorage.databasesState.clear();

    if (preset === 'empty') {
      this.activeDatabase = '';
      return;
    }

    if (preset === 'samples') {
      for (const sql of DEFAULT_SEEDS) {
        try {
          alasql(sql);
        } catch (seedErr) {
          console.error('Erro ao executar seed:', sql, seedErr);
        }
      }
      this.activeDatabase = 'ecommerce_db';
      try {
        alasql(`USE ecommerce_db;`);
      } catch (_) {}
      await this.persistAllDatabases();
      return;
    }

    if (preset === 'class') {
      const classDbs = getClassroomDatabases();
      const progressMap: Record<string, DatabaseLoadProgress> = {};

      for (const group of classDbs) {
        progressMap[group.dbName] = {
          dbName: group.dbName,
          status: 'pending',
          currentStatement: 0,
          totalStatements: group.statements.length,
          percentage: 0,
        };
      }

      onProgress?.({ ...progressMap }, 0, classDbs.length, 0);

      const BATCH_SIZE = 20;

      for (let gIndex = 0; gIndex < classDbs.length; gIndex++) {
        const group = classDbs[gIndex];
        progressMap[group.dbName].status = 'loading';

        const initialCompleted = Object.values(progressMap).filter(p => p.status === 'completed').length;
        const initialSumPct = Object.values(progressMap).reduce((acc, p) => acc + p.percentage, 0);
        onProgress?.({ ...progressMap }, initialCompleted, classDbs.length, Math.round(initialSumPct / classDbs.length));

        // Cria e seleciona banco no AlaSQL com verificação prévia
        try {
          if (!alasql.databases[group.dbName]) {
            alasql(`CREATE DATABASE \`${group.dbName}\`;`);
          }
          alasql(`USE \`${group.dbName}\`;`);
          this.activeDatabase = group.dbName;
        } catch (e) {
          console.warn(`Aviso ao criar/usar banco ${group.dbName}:`, e);
        }

        // Executa statements em blocos assíncronos (chunks)
        for (let i = 0; i < group.statements.length; i++) {
          const stmt = group.statements[i];
          if (!stmt.trim()) continue;

          // Detecta CREATE DATABASE para não lançar erro se já existir no AlaSQL
          const createDbMatch = stmt.match(/^CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+[`'"]?([a-zA-Z0-9_]+)[`'"]?/i);
          if (createDbMatch) {
            const dbN = createDbMatch[1];
            if (!alasql.databases[dbN]) {
              try { alasql(`CREATE DATABASE \`${dbN}\`;`); } catch (_) {}
            }
            continue;
          }

          // Detecta nome da tabela para feedback visual do progresso
          const tableMatch = stmt.match(/(?:INSERT\s+INTO|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+[`'"]?([a-zA-Z0-9_]+)[`'"]?/i);
          if (tableMatch) {
            progressMap[group.dbName].currentTable = tableMatch[1];
          }

          try {
            alasql(stmt);
          } catch (e: any) {
            console.warn(`Aviso no banco ${group.dbName} (stmt ${i}):`, e);
          }

          // Atualiza progresso e cede controle para a interface do navegador
          if (i % BATCH_SIZE === 0 || i === group.statements.length - 1) {
            const dbPct = Math.round(((i + 1) / group.statements.length) * 100);
            progressMap[group.dbName].currentStatement = i + 1;
            progressMap[group.dbName].percentage = dbPct;

            const completedDbs = Object.values(progressMap).filter(p => p.status === 'completed').length;
            const sumPercentages = Object.values(progressMap).reduce((acc, p) => acc + p.percentage, 0);
            const overallPct = Math.round(sumPercentages / classDbs.length);

            onProgress?.({ ...progressMap }, completedDbs, classDbs.length, overallPct);

            // Yield para liberar o loop de eventos e permitir renderização a 60fps
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        // Ao concluir o banco, persiste-o imediatamente no IndexedDB
        await this.persistDatabase(group.dbName);

        progressMap[group.dbName].status = 'completed';
        progressMap[group.dbName].percentage = 100;
        delete progressMap[group.dbName].currentTable;

        const completedDbs = Object.values(progressMap).filter(p => p.status === 'completed').length;
        const sumPercentages = Object.values(progressMap).reduce((acc, p) => acc + p.percentage, 0);
        const overallPct = Math.round(sumPercentages / classDbs.length);

        onProgress?.({ ...progressMap }, completedDbs, classDbs.length, overallPct);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Define o primeiro banco como ativo
      const firstDb = classDbs[0]?.dbName || '';
      this.activeDatabase = firstDb;
      if (firstDb) {
        try {
          alasql(`USE \`${firstDb}\`;`);
        } catch (_) {}
      }

      await this.persistAllDatabases();
      return;
    }
  }

  public getActiveDatabase(): string {
    return this.activeDatabase;
  }

  public setActiveDatabase(name: string): void {
    try {
      alasql(`USE \`${name}\`;`);
      this.activeDatabase = name;
    } catch (e) {
      console.error(`Erro ao selecionar banco ${name}:`, e);
    }
  }

  public async createDatabase(dbName: string): Promise<void> {
    await this.initialize();
    const cleanName = dbName.trim().replace(/[`'";]/g, '');
    if (!cleanName) return;
    try {
      if (!alasql.databases[cleanName]) {
        alasql(`CREATE DATABASE \`${cleanName}\`;`);
      }
      alasql(`USE \`${cleanName}\`;`);
      this.activeDatabase = cleanName;
      await this.persistAllDatabases();
    } catch (e) {
      console.error(`Erro ao criar banco ${dbName}:`, e);
      throw e;
    }
  }

  public async executeScript(script: string): Promise<QueryResult[]> {
    await this.initialize();

    // Divide em statements separados por ; (ignorando dentro de strings)
    const statements = this.splitSqlStatements(script);
    const results: QueryResult[] = [];

    for (const stmt of statements) {
      if (!stmt.trim()) continue;

      const startTime = performance.now();
      const timestamp = new Date().toLocaleTimeString('pt-BR');

      // Detecta USE db
      const useMatch = stmt.match(/^\s*USE\s+([`'"]?[\w-]+[`'"]?)/i);
      if (useMatch) {
        const targetDb = useMatch[1].replace(/[`'"]/g, '');
        try {
          alasql(`USE ${targetDb};`);
          this.activeDatabase = targetDb;
          const execTime = Math.round(performance.now() - startTime);

          results.push({
            statement: stmt,
            columns: ['Resultado'],
            rows: [{ 'Resultado': `Banco de dados alterado para '${targetDb}'` }],
            affectedRows: 0,
            executionTimeMs: execTime,
            status: 'success',
            timestamp,
            database: this.activeDatabase
          });

          await this.saveHistory(stmt, 'success', execTime, 0);
          continue;
        } catch (err: any) {
          const execTime = Math.round(performance.now() - startTime);
          const errMsg = err?.message || String(err);
          results.push({
            statement: stmt,
            columns: ['Erro'],
            rows: [],
            executionTimeMs: execTime,
            status: 'error',
            errorMessage: errMsg,
            timestamp,
            database: this.activeDatabase
          });
          await this.saveHistory(stmt, 'error', execTime, 0, errMsg);
          continue;
        }
      }

      // Garante que o AlaSQL use o banco de dados ativo atual
      try {
        if (this.activeDatabase) {
          alasql(`USE \`${this.activeDatabase}\`;`);
        }
      } catch (_) {}

      // Executa consulta normal
      try {
        const processedStmt = preprocessSqlQuery(stmt);
        const res = alasql(processedStmt);
        const execTime = Math.round(performance.now() - startTime);

        // Se criou novo banco, sincroniza banco ativo
        const createDbMatch = stmt.match(/^\s*CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`'"]?[\w-]+[`'"]?)/i);
        if (createDbMatch) {
          const newDb = createDbMatch[1].replace(/[`'"]/g, '');
          this.activeDatabase = newDb;
          try { alasql(`USE \`${newDb}\`;`); } catch (_) {}
        }

        let columns: string[] = [];
        let rows: Record<string, any>[] = [];
        let affectedRows = 0;

        if (Array.isArray(res)) {
          rows = res;
          if (rows.length > 0 && typeof rows[0] === 'object') {
            columns = Object.keys(rows[0]);
          }
          affectedRows = rows.length;
        } else if (typeof res === 'number') {
          affectedRows = res;
          columns = ['Linhas Afetadas'];
          rows = [{ 'Linhas Afetadas': res }];
        } else {
          columns = ['Status'];
          rows = [{ 'Status': 'Comando executado com sucesso' }];
        }

        results.push({
          statement: stmt,
          columns,
          rows,
          affectedRows,
          executionTimeMs: execTime,
          status: 'success',
          timestamp,
          database: this.activeDatabase
        });

        await this.saveHistory(stmt, 'success', execTime, affectedRows);

        // Se for DDL/DML que altera estrutura ou dados, persiste no IndexedDB
        if (/^\s*(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)/i.test(stmt)) {
          await this.persistAllDatabases();
        }
      } catch (err: any) {
        const execTime = Math.round(performance.now() - startTime);
        const errMsg = err?.message || String(err);

        results.push({
          statement: stmt,
          columns: ['Erro'],
          rows: [],
          executionTimeMs: execTime,
          status: 'error',
          errorMessage: errMsg,
          timestamp,
          database: this.activeDatabase
        });

        await this.saveHistory(stmt, 'error', execTime, 0, errMsg);
      }
    }

    return results;
  }

  public async getSchemaTree(): Promise<DatabaseSchema[]> {
    await this.initialize();
    const tree: DatabaseSchema[] = [];

    try {
      const dbs = Object.keys(alasql.databases).filter(d => {
        if (d === 'alasql') return false;
        if (this.hideSystemDatabases && d.toLowerCase() === 'dbo') return false;
        return true;
      });

      for (const dbName of dbs) {
        const dbObj = alasql.databases[dbName];
        if (!dbObj) continue;

        const tables: TableSchema[] = [];
        const tableNames = Object.keys(dbObj.tables || {});

        for (const tableName of tableNames) {
          const tObj = dbObj.tables[tableName] as any;
          const data: any[] = tObj?.data || [];
          const columns: ColumnSchema[] = [];

          // Colunas declaradas ou inferidas
          if (tObj?.columns && tObj.columns.length > 0) {
            for (const col of tObj.columns) {
              const colName = col.columnid || col.name;
              const isPk = col.pk === true || col.primary === true || colName.toLowerCase() === 'id' || colName.toLowerCase().startsWith('id_');
              const fkObj = col.foreignkey || (tObj.xcolumns && tObj.xcolumns[colName]?.foreignkey);

              // Detecta tipo formal registrado no AlaSQL
              let rawType = col.dbtypeid || col.type || '';
              if (rawType && col.dbsize && col.dbprecision !== undefined) {
                rawType += `(${col.dbsize},${col.dbprecision})`;
              } else if (rawType && col.dbsize) {
                rawType += `(${col.dbsize})`;
              }

              // Se não houver tipo declarado ou for genérico VARCHAR sem tamanho, infere pelos dados/nome
              let finalType = rawType;
              if (!finalType || finalType === 'VARCHAR') {
                const sampleVal = data.length > 0 && data[0] ? data[0][colName] : undefined;
                const inferred = inferSqlType(colName, sampleVal);
                if (inferred && inferred !== 'VARCHAR(100)') {
                  finalType = inferred;
                } else if (!finalType) {
                  finalType = 'VARCHAR(100)';
                }
              }

              columns.push({
                name: colName,
                type: finalType,
                isPrimary: isPk,
                isForeignKey: !!fkObj,
                foreignKeyRef: fkObj ? {
                  table: fkObj.tableid,
                  column: fkObj.columnid || 'id'
                } : undefined
              });
            }
          } else if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
            const firstRow = data[0] as Record<string, any>;
            for (const key of Object.keys(firstRow)) {
              const val = firstRow[key];
              const inferredType = inferSqlType(key, val);
              columns.push({
                name: key,
                type: inferredType,
                isPrimary: key.toLowerCase() === 'id' || key.toLowerCase().startsWith('id_')
              });
            }
          }

          tables.push({
            name: tableName,
            rowCount: data.length,
            columns,
            isView: tObj?.view === true
          });
        }

        tree.push({
          name: dbName,
          tables,
          isActive: dbName === this.activeDatabase
        });
      }
    } catch (err) {
      console.error('Erro ao inspecionar schemas:', err);
    }

    return tree;
  }

  public async persistDatabase(dbName: string): Promise<void> {
    try {
      if (this.hideSystemDatabases && dbName.toLowerCase() === 'dbo') return;
      const dbObj = alasql.databases[dbName];
      if (!dbObj) return;

      const tablesSnapshot: Record<string, { columns: Array<{ name: string; type: string; isPrimary?: boolean }>; data: any[] }> = {};
      for (const tableName of Object.keys(dbObj.tables || {})) {
        const t = dbObj.tables[tableName] as any;
        const data = t.data || [];

        let colDefsToSave: Array<{ name: string; type: string; isPrimary?: boolean }> = [];
        if (t.columns && t.columns.length > 0) {
          colDefsToSave = t.columns.map((c: any) => {
            const colName = c.columnid || c.name;
            let tName = c.dbtypeid || c.type || '';
            if (tName && c.dbsize && c.dbprecision !== undefined) {
              tName += `(${c.dbsize},${c.dbprecision})`;
            } else if (tName && c.dbsize) {
              tName += `(${c.dbsize})`;
            }
            if (!tName || tName === 'VARCHAR') {
              const sampleVal = data.length > 0 && data[0] ? data[0][colName] : undefined;
              tName = inferSqlType(colName, sampleVal);
            }
            const isPk = c.pk === true || c.primary === true || colName.toLowerCase() === 'id' || colName.toLowerCase().startsWith('id_');
            return { name: colName, type: tName, isPrimary: isPk };
          });
        } else if (data.length > 0 && data[0]) {
          colDefsToSave = Object.keys(data[0] as object).map(k => {
            const tName = inferSqlType(k, data[0][k]);
            const isPk = k.toLowerCase() === 'id' || k.toLowerCase().startsWith('id_');
            return { name: k, type: tName, isPrimary: isPk };
          });
        }

        tablesSnapshot[tableName] = {
          columns: colDefsToSave,
          data: JSON.parse(JSON.stringify(data))
        };
      }

      await dbStorage.databasesState.put({
        dbName,
        tables: tablesSnapshot,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Erro ao persistir banco ${dbName} no IndexedDB:`, err);
    }
  }

  public async persistAllDatabases(): Promise<void> {
    try {
      const dbs = Object.keys(alasql.databases).filter(d => {
        if (d === 'alasql') return false;
        if (this.hideSystemDatabases && d.toLowerCase() === 'dbo') return false;
        return true;
      });

      for (const dbName of dbs) {
        await this.persistDatabase(dbName);
      }
    } catch (err) {
      console.error('Erro ao persistir todos os bancos no IndexedDB:', err);
    }
  }

  public async resetDatabase(onProgress?: OnLoadProgressCallback): Promise<void> {
    await this.loadPreset(this.currentPreset, onProgress);
  }

  public async exportSQL(): Promise<string> {
    const tree = await this.getSchemaTree();
    let sqlDump = `-- ========================================================\n`;
    sqlDump += `-- SQLEditor Dump Export - ${new Date().toLocaleString('pt-BR')}\n`;
    sqlDump += `-- Google Antigravity SQLEditor\n`;
    sqlDump += `-- ========================================================\n\n`;

    for (const db of tree) {
      sqlDump += `CREATE DATABASE IF NOT EXISTS \`${db.name}\`;\n`;
      sqlDump += `USE \`${db.name}\`;\n\n`;

      const dbObj = alasql.databases[db.name];
      if (!dbObj) continue;

      for (const table of db.tables) {
        const colDefs = table.columns.map(c => `  \`${c.name}\` ${c.type}${c.isPrimary ? ' PRIMARY KEY' : ''}`).join(',\n');
        sqlDump += `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n${colDefs || '  id INT PRIMARY KEY'}\n);\n\n`;

        const data = (dbObj.tables[table.name] as any)?.data || [];
        if (data.length > 0 && data[0]) {
          const cols = Object.keys(data[0] as object);
          for (const row of (data as Record<string, any>[])) {
            const vals = cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number') return v;
              return `'${String(v).replace(/'/g, "''")}'`;
            }).join(', ');
            sqlDump += `INSERT INTO \`${table.name}\` (\`${cols.join('`, `')}\`) VALUES (${vals});\n`;
          }
          sqlDump += `\n`;
        }
      }
    }

    return sqlDump;
  }

  public async exportDatabaseSQL(dbName: string): Promise<string> {
    const tree = await this.getSchemaTree();
    const db = tree.find(d => d.name.toLowerCase() === dbName.toLowerCase());
    let sqlDump = `-- ========================================================\n`;
    sqlDump += `-- SQLEditor Dump - Banco: ${dbName}\n`;
    sqlDump += `-- Data: ${new Date().toLocaleString('pt-BR')}\n`;
    sqlDump += `-- Professor William Devidé Komel\n`;
    sqlDump += `-- ========================================================\n\n`;

    sqlDump += `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;\n`;
    sqlDump += `USE \`${dbName}\`;\n\n`;

    const dbObj = alasql.databases[dbName];
    if (db && dbObj) {
      for (const table of db.tables) {
        const colDefs = table.columns.map(c => `  \`${c.name}\` ${c.type}${c.isPrimary ? ' PRIMARY KEY' : ''}`).join(',\n');
        sqlDump += `-- Estrutura da tabela: ${table.name}\n`;
        sqlDump += `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n${colDefs || '  id INT PRIMARY KEY'}\n);\n\n`;

        const data = (dbObj.tables[table.name] as any)?.data || [];
        if (data.length > 0 && data[0]) {
          const cols = Object.keys(data[0] as object);
          sqlDump += `-- Dados da tabela: ${table.name}\n`;
          for (const row of (data as Record<string, any>[])) {
            const vals = cols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number') return v;
              return `'${String(v).replace(/'/g, "''")}'`;
            }).join(', ');
            sqlDump += `INSERT INTO \`${table.name}\` (\`${cols.join('`, `')}\`) VALUES (${vals});\n`;
          }
          sqlDump += `\n`;
        }
      }
    }

    return sqlDump;
  }

  public async exportTableSQL(dbName: string, tableName: string): Promise<string> {
    const tree = await this.getSchemaTree();
    const db = tree.find(d => d.name.toLowerCase() === dbName.toLowerCase());
    const table = db?.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

    let sqlDump = `-- ========================================================\n`;
    sqlDump += `-- SQLEditor Dump - Tabela: ${dbName}.${tableName}\n`;
    sqlDump += `-- Data: ${new Date().toLocaleString('pt-BR')}\n`;
    sqlDump += `-- Professor William Devidé Komel\n`;
    sqlDump += `-- ========================================================\n\n`;

    sqlDump += `USE \`${dbName}\`;\n\n`;

    if (table) {
      const colDefs = table.columns.map(c => `  \`${c.name}\` ${c.type}${c.isPrimary ? ' PRIMARY KEY' : ''}`).join(',\n');
      sqlDump += `-- Estrutura da tabela: ${tableName}\n`;
      sqlDump += `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n${colDefs || '  id INT PRIMARY KEY'}\n);\n\n`;

      const dbObj = alasql.databases[dbName];
      const data = (dbObj?.tables[tableName] as any)?.data || [];
      if (data.length > 0 && data[0]) {
        const cols = Object.keys(data[0] as object);
        sqlDump += `-- Registros da tabela: ${tableName}\n`;
        for (const row of (data as Record<string, any>[])) {
          const vals = cols.map(c => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          sqlDump += `INSERT INTO \`${tableName}\` (\`${cols.join('`, `')}\`) VALUES (${vals});\n`;
        }
        sqlDump += `\n`;
      }
    }

    return sqlDump;
  }

  public async getTablePreviewData(
    dbName: string,
    tableName: string,
    limit: number = 30
  ): Promise<{ columns: string[]; rows: Record<string, any>[]; totalRows: number }> {
    await this.initialize();
    try {
      if (!dbName || !tableName || !alasql.databases[dbName]) {
        return { columns: [], rows: [], totalRows: 0 };
      }

      const prevDb = this.activeDatabase;
      try {
        alasql(`USE \`${dbName}\`;`);
      } catch (_) {}

      let rows: Record<string, any>[] = [];
      let columns: string[] = [];
      let totalRows = 0;

      const dbObj = alasql.databases[dbName];
      const tableObj = dbObj?.tables?.[tableName];

      // Busca dados via query SQL com LIMIT
      try {
        const queryRes = alasql(`SELECT * FROM \`${tableName}\` LIMIT ${limit};`);
        if (Array.isArray(queryRes)) {
          rows = queryRes;
          if (rows.length > 0 && typeof rows[0] === 'object') {
            columns = Object.keys(rows[0]);
          }
        }
      } catch (sqlErr) {
        // Fallback para ler direto dos dados do objeto da tabela caso SELECT falhe
        if (tableObj && Array.isArray((tableObj as any).data)) {
          const allData = (tableObj as any).data;
          rows = allData.slice(0, limit);
          if (rows.length > 0 && typeof rows[0] === 'object') {
            columns = Object.keys(rows[0]);
          }
        }
      }

      // Se a tabela estiver sem linhas, obtém a lista de colunas a partir das definições de colunas
      if (columns.length === 0 && tableObj) {
        const tableCols = (tableObj as any)?.columns;
        if (Array.isArray(tableCols) && tableCols.length > 0) {
          columns = tableCols.map((c: any) => c.name || c.columnid).filter(Boolean);
        } else if ((tableObj as any).data && (tableObj as any).data.length > 0) {
          columns = Object.keys((tableObj as any).data[0]);
        }
      }

      // Total real de linhas na tabela
      if (tableObj && Array.isArray((tableObj as any).data)) {
        totalRows = (tableObj as any).data.length;
      } else {
        totalRows = rows.length;
      }

      // Restaura banco ativo anterior se diferente
      if (prevDb && prevDb !== dbName && alasql.databases[prevDb]) {
        try {
          alasql(`USE \`${prevDb}\`;`);
        } catch (_) {}
      }

      return { columns, rows, totalRows };
    } catch (err) {
      console.warn(`Erro ao carregar preview da tabela ${dbName}.${tableName}:`, err);
      return { columns: [], rows: [], totalRows: 0 };
    }
  }

  public async exportJSON(): Promise<string> {
    const records = await dbStorage.databasesState.toArray();
    return JSON.stringify(records, null, 2);
  }

  public async importJSON(jsonStr: string): Promise<void> {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.dbName && item.tables) {
          await dbStorage.databasesState.put(item);
        }
      }
      this.isInitialized = false;
      await this.initialize();
    }
  }

  private async saveHistory(
    query: string,
    status: 'success' | 'error',
    executionTimeMs: number,
    affectedRows?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const item: QueryHistoryItem = {
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        query,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        status,
        executionTimeMs,
        database: this.activeDatabase,
        affectedRows,
        errorMessage
      };
      await dbStorage.history.add(item);
    } catch (_) {}
  }

  private splitSqlStatements(sql: string): string[] {
    return splitSqlStatements(sql);
  }
}

export const dbEngine = new DatabaseEngine();
