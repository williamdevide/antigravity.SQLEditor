// ============================================================================
// CATÁLOGO DE DESAFIOS PRÁTICOS AUTOCORRIGÍVEIS DA DISCIPLINA DE BANCO DE DADOS
// ============================================================================

export type ExerciseValidationMode = 'query-match' | 'schema-check';

export interface PracticeExerciseItem {
  id: string;
  stageNumber: 1 | 2 | 3 | 4 | 5;
  stageLabel: string;
  title: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  targetDatabase: string;
  recommendedModule: 'workspace' | 'er-diagram';
  prompt: string;
  hint: string;
  starterSql: string;
  /** Script de preparação automática caso o banco alvo ainda não esteja carregado no AlaSQL */
  setupSql?: string;
  validationMode: ExerciseValidationMode;
  /** Para desafios DQL: query gabarito cujas linhas/valores serão comparados */
  referenceSolutionSql?: string;
  /** Termos sintáticos obrigatórios na resposta (ex: ['JOIN'] para evitar respostas fixas) */
  requiredKeywords?: string[];
  /** Para desafios DDL / Modelagem: regras estruturais exigidas */
  schemaExpectations?: {
    minTables: number;
    requiredTableNames?: string[];
    minExplicitForeignKeys: number;
    mustPass1NF?: boolean;
    mustHaveAllPrimaryKeys?: boolean;
  };
}

const ECOMMERCE_SETUP_SQL = `
CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;
CREATE TABLE IF NOT EXISTS categorias (id INT PRIMARY KEY, nome VARCHAR(100), descricao VARCHAR(255));
DELETE FROM categorias;
INSERT INTO categorias VALUES
  (1, 'Eletrônicos', 'Smartphones, notebooks e acessórios'),
  (2, 'Hardware', 'Placas de vídeo, processadores e memórias'),
  (3, 'Periféricos', 'Teclados mecânicos, mouses e headsets'),
  (4, 'Móveis', 'Cadeiras ergonômicas e mesas gamer');

CREATE TABLE IF NOT EXISTS produtos (
  id INT PRIMARY KEY,
  nome VARCHAR(150),
  preco DECIMAL(10,2),
  estoque INT,
  categoria_id INT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);
DELETE FROM produtos;
INSERT INTO produtos VALUES
  (1, 'Monitor UltraWide 29"', 1299.90, 42, 1),
  (2, 'Teclado Mecânico RGB', 349.50, 115, 3),
  (3, 'Mouse Óptico 16000 DPI', 199.00, 80, 3),
  (4, 'Placa de Vídeo RTX 4070', 4299.00, 15, 2),
  (5, 'Cadeira Gamer Ergonômica', 899.90, 28, 4),
  (6, 'SSD NVMe 1TB Gen4', 449.00, 95, 2);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY,
  nome VARCHAR(120),
  email VARCHAR(150),
  nivel VARCHAR(20),
  cidade VARCHAR(80),
  ativo INT
);
DELETE FROM usuarios;
INSERT INTO usuarios VALUES
  (1, 'Ana Clara Silva', 'ana.silva@email.com', 'admin', 'São Paulo', 1),
  (2, 'Bruno Henrique Santos', 'bruno.santos@email.com', 'cliente', 'Campinas', 1),
  (3, 'Carlos Eduardo Lima', 'carlos.lima@email.com', 'cliente', 'Curitiba', 1),
  (4, 'Daniela Ribeiro', 'daniela.r@email.com', 'suporte', 'Rio de Janeiro', 1),
  (5, 'Eduardo Meireles', 'eduardo.m@email.com', 'cliente', 'Belo Horizonte', 0);

CREATE TABLE IF NOT EXISTS pedidos (
  id INT PRIMARY KEY,
  usuario_id INT,
  data_pedido DATE,
  valor_total DECIMAL(10,2),
  status VARCHAR(30),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
DELETE FROM pedidos;
INSERT INTO pedidos VALUES
  (101, 2, '2026-09-15', 548.50, 'entregue'),
  (102, 3, '2026-09-20', 4299.00, 'processando'),
  (103, 1, '2026-10-01', 1299.90, 'enviado'),
  (104, 5, '2026-10-05', 199.00, 'cancelado'),
  (105, 2, '2026-10-10', 1348.90, 'entregue');
`;

const UNIVERSIDADE_SETUP_SQL = `
CREATE DATABASE IF NOT EXISTS universidade_db;
USE universidade_db;
CREATE TABLE IF NOT EXISTS cursos (
  id INT PRIMARY KEY,
  nome_curso VARCHAR(100),
  departamento VARCHAR(80),
  duracao_anos INT
);
DELETE FROM cursos;
INSERT INTO cursos VALUES
  (1, 'Engenharia de Software', 'Computação', 4),
  (2, 'Ciência de Dados & IA', 'Computação', 4),
  (3, 'Sistemas de Informação', 'Tecnologia', 3),
  (4, 'Engenharia Mecatrônica', 'Engenharia', 5);

CREATE TABLE IF NOT EXISTS alunos (
  id INT PRIMARY KEY,
  nome VARCHAR(120),
  matricula VARCHAR(20),
  semestre INT,
  curso_id INT,
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
);
DELETE FROM alunos;
INSERT INTO alunos VALUES
  (1, 'Gabriel Castro', '2024ES001', 3, 1),
  (2, 'Juliana Mendes', '2023CD014', 5, 2),
  (3, 'Lucas Faria', '2025SI008', 1, 3),
  (4, 'Mariana Costa', '2022EM003', 7, 4),
  (5, 'Rafael Souza', '2024ES042', 3, 1);
`;

export const PRACTICE_EXERCISES_CATALOG: PracticeExerciseItem[] = [
  {
    id: 'ex-01-ddl-biblioteca',
    stageNumber: 1,
    stageLabel: 'Etapa 1 • Modelagem & DDL',
    title: 'Modelando Autores e Livros com Integridade Referencial',
    difficulty: 'Iniciante',
    targetDatabase: 'pratica_biblioteca_db',
    recommendedModule: 'workspace',
    prompt:
      'Crie as tabelas `autores` (com `id INT PRIMARY KEY` e `nome`) e `livros` (com `id INT PRIMARY KEY`, `titulo`, `autor_id INT` e uma constraint explícita `FOREIGN KEY (autor_id) REFERENCES autores(id)`). Ative o modo Dividido (SQL ↔ DER) para ver a linha surgir ao vivo!',
    hint: 'Declare `PRIMARY KEY` em ambas as tabelas e inclua `FOREIGN KEY (autor_id) REFERENCES autores(id)` dentro de `CREATE TABLE livros (...)`.',
    starterSql: `CREATE DATABASE IF NOT EXISTS pratica_biblioteca_db;
USE pratica_biblioteca_db;

-- 1. Crie a tabela autores com Chave Primária:


-- 2. Crie a tabela livros referenciando autores(id) via FOREIGN KEY:
`,
    validationMode: 'schema-check',
    schemaExpectations: {
      minTables: 2,
      requiredTableNames: ['autores', 'livros'],
      minExplicitForeignKeys: 1,
      mustHaveAllPrimaryKeys: true,
    },
  },
  {
    id: 'ex-02-norm-1fn',
    stageNumber: 2,
    stageLabel: 'Etapa 2 • Normalização (1FN)',
    title: 'Eliminando Grupos Repetitivos (telefone1, telefone2 ➔ 1FN)',
    difficulty: 'Intermediário',
    targetDatabase: 'pratica_1fn_db',
    recommendedModule: 'workspace',
    prompt:
      'Refatore o esquema abaixo que viola a 1ª Forma Normal (`telefone1`, `telefone2`) decompondo-o em duas tabelas atômicas: `clientes` (PK `id`, `nome`) e `cliente_telefones` (PK `id`, `cliente_id`, `numero`, com `FOREIGN KEY (cliente_id) REFERENCES clientes(id)`), removendo as colunas numeradas repetidas.',
    hint: 'Remova `telefone1` e `telefone2` de `clientes` e crie a tabela filha `cliente_telefones` apontando para `clientes(id)`.',
    starterSql: `CREATE DATABASE IF NOT EXISTS pratica_1fn_db;
USE pratica_1fn_db;

-- Substitua esta estrutura desnormalizada pelas tabelas clientes e cliente_telefones em 1FN:
CREATE TABLE clientes (
  id INT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone1 VARCHAR(20),
  telefone2 VARCHAR(20)
);
`,
    validationMode: 'schema-check',
    schemaExpectations: {
      minTables: 2,
      requiredTableNames: ['clientes', 'cliente_telefones'],
      minExplicitForeignKeys: 1,
      mustPass1NF: true,
      mustHaveAllPrimaryKeys: true,
    },
  },
  {
    id: 'ex-03-dql-filtro-ordenacao',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros',
    title: 'Produtos Premium Ordenados por Preço',
    difficulty: 'Iniciante',
    targetDatabase: 'ecommerce_db',
    recommendedModule: 'workspace',
    prompt:
      'No banco `ecommerce_db`, escreva uma consulta `SELECT` que retorne as colunas `nome`, `preco` e `estoque` da tabela `produtos` apenas para itens com `preco > 400`, ordenados do maior para o menor preço (`ORDER BY preco DESC`).',
    hint: 'Use `SELECT nome, preco, estoque FROM produtos WHERE preco > 400 ORDER BY preco DESC;`.',
    starterSql: `USE ecommerce_db;

-- Liste nome, preco e estoque dos produtos com preco > 400 em ordem decrescente de preco:
SELECT `,
    setupSql: ECOMMERCE_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'FROM', 'WHERE', 'ORDER'],
    referenceSolutionSql: `SELECT nome, preco, estoque FROM produtos WHERE preco > 400 ORDER BY preco DESC;`,
  },
  {
    id: 'ex-04-dql-clientes-ativos',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros',
    title: 'Auditoria de Clientes Ativos',
    difficulty: 'Iniciante',
    targetDatabase: 'ecommerce_db',
    recommendedModule: 'workspace',
    prompt:
      'No banco `ecommerce_db`, consulte `nome`, `email` e `cidade` da tabela `usuarios` filtrando apenas registros onde `nivel = \'cliente\'` E `ativo = 1`, ordenados alfabeticamente por `nome`.',
    hint: 'Combine as duas condições com `WHERE nivel = \'cliente\' AND ativo = 1 ORDER BY nome ASC;`.',
    starterSql: `USE ecommerce_db;

-- Consulte nome, email e cidade dos usuários clientes e ativos:
`,
    setupSql: ECOMMERCE_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'AND'],
    referenceSolutionSql: `SELECT nome, email, cidade FROM usuarios WHERE nivel = 'cliente' AND ativo = 1 ORDER BY nome ASC;`,
  },
  {
    id: 'ex-05-join-catalogo',
    stageNumber: 4,
    stageLabel: 'Etapa 4 • Junções Relacionais (JOIN)',
    title: 'Relatório de Produtos com Nome da Categoria',
    difficulty: 'Intermediário',
    targetDatabase: 'ecommerce_db',
    recommendedModule: 'workspace',
    prompt:
      'No banco `ecommerce_db`, utilize `INNER JOIN` entre `produtos` e `categorias` para exibir o nome do produto (`produto`), o nome da categoria (`categoria`) e o `preco`, ordenado por `preco DESC`.',
    hint: 'Una `produtos p INNER JOIN categorias c ON p.categoria_id = c.id` selecionando `p.nome, c.nome, p.preco`.',
    starterSql: `USE ecommerce_db;

-- Exiba o nome do produto, nome da categoria e preco usando INNER JOIN:
`,
    setupSql: ECOMMERCE_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'JOIN', 'ON'],
    referenceSolutionSql: `SELECT p.nome AS produto, c.nome AS categoria, p.preco FROM produtos p INNER JOIN categorias c ON p.categoria_id = c.id ORDER BY p.preco DESC;`,
  },
  {
    id: 'ex-06-join-universidade',
    stageNumber: 4,
    stageLabel: 'Etapa 4 • Junções Relacionais (JOIN)',
    title: 'Alunos do Departamento de Computação',
    difficulty: 'Intermediário',
    targetDatabase: 'universidade_db',
    recommendedModule: 'workspace',
    prompt:
      'No banco `universidade_db`, faça um `INNER JOIN` entre `alunos` e `cursos` para retornar `alunos.nome`, `alunos.semestre` e `cursos.nome_curso` apenas dos cursos cujo `departamento` seja `\'Computação\'`, ordenados pelo nome do aluno.',
    hint: 'Filtre `WHERE c.departamento = \'Computação\'` após o `INNER JOIN cursos c ON a.curso_id = c.id` e ordene com `ORDER BY a.nome`.',
    starterSql: `USE universidade_db;

-- Liste nome do aluno, semestre e nome_curso para o departamento 'Computação':
`,
    setupSql: UNIVERSIDADE_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'JOIN', 'WHERE'],
    referenceSolutionSql: `SELECT a.nome, a.semestre, c.nome_curso FROM alunos a INNER JOIN cursos c ON a.curso_id = c.id WHERE c.departamento = 'Computação' ORDER BY a.nome ASC;`,
  },
  {
    id: 'ex-07-agg-pedidos-status',
    stageNumber: 5,
    stageLabel: 'Etapa 5 • Agregações & GROUP BY',
    title: 'Resumo Financeiro de Pedidos por Status',
    difficulty: 'Avançado',
    targetDatabase: 'ecommerce_db',
    recommendedModule: 'workspace',
    prompt:
      'No banco `ecommerce_db`, agrupe a tabela `pedidos` por `status`, retornando 3 colunas nesta ordem: `status`, contagem de pedidos (`COUNT(*)`) e soma do valor (`SUM(valor_total)`), ordenado por `status ASC`.',
    hint: 'Use `SELECT status, COUNT(*) AS total_pedidos, SUM(valor_total) AS receita FROM pedidos GROUP BY status ORDER BY status ASC;`.',
    starterSql: `USE ecommerce_db;

-- Agrupe pedidos por status exibindo status, COUNT(*) e SUM(valor_total):
`,
    setupSql: ECOMMERCE_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'GROUP', 'COUNT', 'SUM'],
    referenceSolutionSql: `SELECT status, COUNT(*) AS total_pedidos, SUM(valor_total) AS receita FROM pedidos GROUP BY status ORDER BY status ASC;`,
  },
];

