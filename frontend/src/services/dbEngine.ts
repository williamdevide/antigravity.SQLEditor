import alasql from 'alasql';
import { dbStorage } from './storage';
import type { DatabaseSchema, TableSchema, ColumnSchema, QueryResult, QueryHistoryItem } from '../types';

import { registerMySQLFunctions } from './mysqlFunctions';

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

class DatabaseEngine {
  private activeDatabase: string = 'ecommerce_db';
  private isInitialized: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storedDbs = await dbStorage.databasesState.toArray();

      if (storedDbs.length > 0) {
        // Restaura bancos salvos no IndexedDB para o motor AlaSQL
        for (const item of storedDbs) {
          try {
            alasql(`CREATE DATABASE IF NOT EXISTS ${item.dbName};`);
            alasql(`USE ${item.dbName};`);

            for (const [tableName, tableInfo] of Object.entries(item.tables)) {
              if (tableInfo.data && Array.isArray(tableInfo.data)) {
                // Cria tabela
                const colDefs = tableInfo.columns.map(c => `\`${c}\``).join(', ');
                alasql(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${colDefs});`);
                // Limpa e reinsere
                alasql(`DELETE FROM \`${tableName}\`;`);
                if (tableInfo.data.length > 0) {
                  alasql.tables[tableName].data = JSON.parse(JSON.stringify(tableInfo.data));
                }
              }
            }
          } catch (dbErr) {
            console.warn(`Erro ao restaurar banco ${item.dbName}:`, dbErr);
          }
        }

        // Tenta usar o primeiro banco disponível
        const firstDb = storedDbs[0]?.dbName || 'ecommerce_db';
        this.activeDatabase = firstDb;
        alasql(`USE ${firstDb};`);
      } else {
        // Inicializa com dados semente padrão
        for (const sql of DEFAULT_SEEDS) {
          try {
            alasql(sql);
          } catch (seedErr) {
            console.error('Erro ao executar seed:', sql, seedErr);
          }
        }
        this.activeDatabase = 'ecommerce_db';
        await this.persistAllDatabases();
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Falha na inicialização do DB Engine:', err);
      // Fallback
      for (const sql of DEFAULT_SEEDS) {
        try { alasql(sql); } catch (_) {}
      }
      this.isInitialized = true;
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
      alasql(`CREATE DATABASE IF NOT EXISTS \`${cleanName}\`;`);
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
        const res = alasql(stmt);
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
      const dbs = Object.keys(alasql.databases).filter(d => d !== 'alasql');

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
              const isPk = col.pk === true || col.primary === true || colName.toLowerCase() === 'id';
              const fkObj = col.foreignkey || (tObj.xcolumns && tObj.xcolumns[colName]?.foreignkey);
              columns.push({
                name: colName,
                type: col.dbtypeid || 'VARCHAR',
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
              const inferredType = typeof val === 'number' ? 'INT' : 'VARCHAR';
              columns.push({
                name: key,
                type: inferredType,
                isPrimary: key.toLowerCase() === 'id'
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

  public async persistAllDatabases(): Promise<void> {
    try {
      const dbs = Object.keys(alasql.databases).filter(d => d !== 'alasql');

      for (const dbName of dbs) {
        const dbObj = alasql.databases[dbName];
        if (!dbObj) continue;

        const tablesSnapshot: Record<string, { columns: string[]; data: any[] }> = {};
        for (const tableName of Object.keys(dbObj.tables || {})) {
          const t = dbObj.tables[tableName] as any;
          const cols = (t.columns || []).map((c: any) => c.columnid || c.name);
          const data = t.data || [];
          tablesSnapshot[tableName] = {
            columns: cols.length > 0 ? cols : (data.length > 0 && data[0] ? Object.keys(data[0] as object) : []),
            data: JSON.parse(JSON.stringify(data))
          };
        }

        await dbStorage.databasesState.put({
          dbName,
          tables: tablesSnapshot,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao persistir bancos no IndexedDB:', err);
    }
  }

  public async resetDatabase(): Promise<void> {
    await dbStorage.databasesState.clear();

    // Limpa bancos em memória
    for (const d of Object.keys(alasql.databases)) {
      if (d !== 'alasql') {
        try { alasql(`DROP DATABASE ${d};`); } catch (_) {}
      }
    }

    this.isInitialized = false;
    await this.initialize();
  }

  public async exportSQL(): Promise<string> {
    const tree = await this.getSchemaTree();
    let sqlDump = `-- ========================================================\n`;
    sqlDump += `-- SQLEditor Dump Export - ${new Date().toLocaleString('pt-BR')}\n`;
    sqlDump += `-- Google Antigravity - SENAI Ourinhos Edition\n`;
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
    sqlDump += `-- Professor William Devidé Komel - SENAI Ourinhos\n`;
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
    sqlDump += `-- Professor William Devidé Komel - SENAI Ourinhos\n`;
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
    const statements: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prev = i > 0 ? sql[i - 1] : '';

      if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      }

      if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements;
  }
}

export const dbEngine = new DatabaseEngine();
