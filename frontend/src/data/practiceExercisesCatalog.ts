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
  databaseOrigin?: 'streamflix' | 'escolaidiomas' | 'rh' | 'ecommerce' | 'universidade' | 'geral';
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

const STREAMFLIX_SETUP_SQL = `
CREATE DATABASE IF NOT EXISTS db_streamflix;
USE db_streamflix;
CREATE TABLE IF NOT EXISTS tb_filmes (
  id_filme INT PRIMARY KEY AUTO_INCREMENT,
  titulo VARCHAR(100) NOT NULL,
  genero VARCHAR(50) NOT NULL,
  ano_lancamento INT NOT NULL,
  duracao_minutos INT NOT NULL,
  nota_imdb DECIMAL(3,1) NOT NULL,
  classificacao_etaria VARCHAR(10) NOT NULL,
  no_catalogo BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS tb_assinantes (
  id_assinante INT PRIMARY KEY AUTO_INCREMENT,
  nome_cliente VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  plano VARCHAR(20) NOT NULL,
  mensalidade DECIMAL(10,2) NOT NULL,
  data_cadastro DATE NOT NULL,
  status_assinatura VARCHAR(20) NOT NULL,
  cidade VARCHAR(50) NOT NULL
);
DELETE FROM tb_filmes;
INSERT INTO tb_filmes (id_filme, titulo, genero, ano_lancamento, duracao_minutos, nota_imdb, classificacao_etaria, no_catalogo) VALUES
  (1, 'Horizonte Infinito', 'Ação', 2002, 106, 5.7, '18', 0),
  (2, 'Universo Mortal', 'Comédia', 2022, 129, 4.7, 'Livre', 1),
  (3, 'Sombra Invisível', 'Ação', 2020, 100, 8.3, '18', 1),
  (4, 'Império Estelar', 'Suspense', 2002, 178, 9.1, '10', 1),
  (5, 'Código Secreto', 'Drama', 1998, 172, 6.3, 'Livre', 1),
  (6, 'Odisseia Rápida', 'Aventura', 2002, 145, 8.5, '14', 1);

DELETE FROM tb_assinantes;
INSERT INTO tb_assinantes (id_assinante, nome_cliente, email, plano, mensalidade, data_cadastro, status_assinatura, cidade) VALUES
  (1, 'Lucas Silveira', 'lucas@email.com', 'Premium', 55.90, '2024-01-15', 'Ativo', 'Ourinhos'),
  (2, 'Beatriz Lima', 'beatriz@email.com', 'Básico', 25.90, '2024-02-10', 'Ativo', 'Assis'),
  (3, 'Guilherme Santos', 'gui@email.com', 'Premium', 55.90, '2023-11-20', 'Ativo', 'Marília'),
  (4, 'Camila Rocha', 'camila@email.com', 'Padrão', 39.90, '2024-03-05', 'Cancelado', 'Bauru');
`;

const ESCOLA_IDIOMAS_SETUP_SQL = `
CREATE DATABASE IF NOT EXISTS db_escolaidiomas;
USE db_escolaidiomas;
CREATE TABLE IF NOT EXISTS tb_cursos (
  id_curso INT PRIMARY KEY AUTO_INCREMENT,
  nome_curso VARCHAR(100) NOT NULL,
  idioma VARCHAR(50) NOT NULL,
  nivel VARCHAR(30) NOT NULL,
  carga_horaria INT NOT NULL,
  valor_mensalidade DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tb_alunos (
  id_aluno INT PRIMARY KEY AUTO_INCREMENT,
  nome_aluno VARCHAR(100) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  data_nascimento DATE NOT NULL,
  nivel_escolaridade VARCHAR(50) NOT NULL,
  status_matricula VARCHAR(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS tb_pagamentos (
  id_pagamento INT PRIMARY KEY AUTO_INCREMENT,
  id_aluno INT NOT NULL,
  valor_pago DECIMAL(10,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  forma_pagamento VARCHAR(30) NOT NULL,
  status_pagamento VARCHAR(20) NOT NULL
);
DELETE FROM tb_cursos;
INSERT INTO tb_cursos (id_curso, nome_curso, idioma, nivel, carga_horaria, valor_mensalidade, ativo) VALUES
  (1, 'Inglês Geral A1', 'Inglês', 'Básico', 80, 320.00, 1),
  (2, 'Inglês para Negócios', 'Inglês', 'Avançado', 120, 480.00, 1),
  (3, 'Espanhol Conversação', 'Espanhol', 'Intermediário', 90, 390.00, 1),
  (4, 'Francês Básico', 'Francês', 'Iniciante', 60, 310.00, 0),
  (5, 'Alemão Instrumental', 'Alemão', 'Avançado', 100, 520.00, 1);

DELETE FROM tb_alunos;
INSERT INTO tb_alunos (id_aluno, nome_aluno, cpf, data_nascimento, nivel_escolaridade, status_matricula) VALUES
  (1, 'Mariana Ferreira', '111.222.333-44', '2004-05-12', 'Ensino Superior', 'Ativo'),
  (2, 'Rodrigo Almeida', '222.333.444-55', '2005-08-22', 'Ensino Médio', 'Ativo'),
  (3, 'Sofia Nogueira', '333.444.555-66', '2003-12-01', 'Ensino Superior', 'Trancado'),
  (4, 'Matheus Silva', '444.555.666-77', '2006-03-18', 'Ensino Médio', 'Ativo');

DELETE FROM tb_pagamentos;
INSERT INTO tb_pagamentos (id_pagamento, id_aluno, valor_pago, data_pagamento, forma_pagamento, status_pagamento) VALUES
  (1, 1, 480.00, '2024-05-10', 'Pix', 'Confirmado'),
  (2, 2, 390.00, '2024-05-11', 'Boleto', 'Confirmado'),
  (3, 4, 320.00, '2024-05-12', 'Cartão de Crédito', 'Confirmado'),
  (4, 1, 480.00, '2024-06-10', 'Pix', 'Confirmado');
`;

const RH_SETUP_SQL = `
CREATE DATABASE IF NOT EXISTS db_rh;
USE db_rh;
CREATE TABLE IF NOT EXISTS tb_funcionarios_rh (
  id_funcionario INT PRIMARY KEY AUTO_INCREMENT,
  nome_funcionario VARCHAR(50) NOT NULL,
  sobrenome_funcionario VARCHAR(50) NOT NULL,
  cargo VARCHAR(50) NOT NULL,
  departamento VARCHAR(50) NOT NULL,
  salario_base DECIMAL(10,2) NOT NULL,
  data_contratacao DATE NOT NULL,
  cidade VARCHAR(50) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT 1
);
DELETE FROM tb_funcionarios_rh;
INSERT INTO tb_funcionarios_rh (id_funcionario, nome_funcionario, sobrenome_funcionario, cargo, departamento, salario_base, data_contratacao, cidade, ativo) VALUES
  (1, 'Helena', 'Silva', 'Especialista em DSN', 'Recursos Humanos', 8030.27, '2023-02-19', 'Ourinhos', 1),
  (2, 'Fernanda', 'Alves', 'Assistente Financeiro', 'Financeiro', 3188.45, '2023-07-08', 'Cambará', 1),
  (3, 'Carlos', 'Moreira', 'Desenvolvedor Senior', 'Tecnologia da Informação', 9777.58, '2020-02-03', 'Ourinhos', 1),
  (4, 'Leonardo', 'Barbosa', 'Assistente Financeiro', 'Financeiro', 3470.27, '2021-02-18', 'Marília', 1),
  (5, 'Nicolas', 'Nascimento', 'Coordenador Operacional', 'Operações', 9456.58, '2018-02-13', 'Jacarezinho', 1),
  (6, 'Larissa', 'Ferreira', 'Desenvolvedor Pleno', 'Tecnologia da Informação', 7445.27, '2017-09-24', 'Bauru', 1),
  (7, 'Vinicius', 'Lima', 'Gerente Comercial', 'Comercial', 13900.64, '2015-04-27', 'Bauru', 1);
`;

export const PRACTICE_EXERCISES_CATALOG: PracticeExerciseItem[] = [
  // --- ETAPA 1: MODELAGEM CONCEITUAL & DDL ---
  {
    id: 'ex-01-ddl-biblioteca',
    stageNumber: 1,
    stageLabel: 'Etapa 1 • Modelagem & DDL',
    title: 'Modelando Autores e Livros com Integridade Referencial',
    difficulty: 'Iniciante',
    targetDatabase: 'pratica_biblioteca_db',
    databaseOrigin: 'geral',
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

  // --- ETAPA 2: NORMALIZAÇÃO 1FN–3FN ---
  {
    id: 'ex-02-norm-1fn',
    stageNumber: 2,
    stageLabel: 'Etapa 2 • Normalização (1FN)',
    title: 'Eliminando Grupos Repetitivos (telefone1, telefone2 ➔ 1FN)',
    difficulty: 'Intermediário',
    targetDatabase: 'pratica_1fn_db',
    databaseOrigin: 'geral',
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

  // --- ETAPA 3: CONSULTAS, FILTROS & DQL (AULAS STREAMFLIX, ESCOLA IDIOMAS, RH, E-COMMERCE) ---
  {
    id: 'ex-sf-01-duracao',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Streamflix)',
    title: 'Streamflix • Filmes Longos em Catálogo (> 120min)',
    difficulty: 'Iniciante',
    targetDatabase: 'db_streamflix',
    databaseOrigin: 'streamflix',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_streamflix`, consulte as colunas `titulo`, `genero` e `duracao_minutos` da tabela `tb_filmes` filtrando apenas os filmes em catálogo (`no_catalogo = 1`) com duração superior a 120 minutos, ordenados da maior para a menor duração.',
    hint: 'Filtre com `WHERE no_catalogo = 1 AND duracao_minutos > 120` e ordene com `ORDER BY duracao_minutos DESC`.',
    starterSql: `USE db_streamflix;

-- Projete titulo, genero e duracao_minutos para filmes no catalogo com duracao > 120:
SELECT `,
    setupSql: STREAMFLIX_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'FROM', 'WHERE', 'ORDER'],
    referenceSolutionSql: `SELECT titulo, genero, duracao_minutos FROM tb_filmes WHERE no_catalogo = 1 AND duracao_minutos > 120 ORDER BY duracao_minutos DESC;`,
  },
  {
    id: 'ex-sf-02-assinantes-premium',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Streamflix)',
    title: 'Streamflix • Assinantes do Plano Premium',
    difficulty: 'Iniciante',
    targetDatabase: 'db_streamflix',
    databaseOrigin: 'streamflix',
    prompt:
      'No banco `db_streamflix`, liste `nome_cliente`, `email`, `mensalidade` e `cidade` da tabela `tb_assinantes` apenas para os clientes com `plano = \'Premium\'` E `status_assinatura = \'Ativo\'`, ordenados alfabeticamente por `nome_cliente`.',
    hint: 'Utilize `WHERE plano = \'Premium\' AND status_assinatura = \'Ativo\' ORDER BY nome_cliente ASC;`.',
    starterSql: `USE db_streamflix;

-- Liste nome_cliente, email, mensalidade e cidade dos assinantes Premium ativos:
`,
    setupSql: STREAMFLIX_SETUP_SQL,
    validationMode: 'query-match',
    recommendedModule: 'workspace',
    requiredKeywords: ['SELECT', 'WHERE', 'AND', 'ORDER'],
    referenceSolutionSql: `SELECT nome_cliente, email, mensalidade, cidade FROM tb_assinantes WHERE plano = 'Premium' AND status_assinatura = 'Ativo' ORDER BY nome_cliente ASC;`,
  },
  {
    id: 'ex-sf-03-acao-aclamados',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Streamflix)',
    title: 'Streamflix • Filmes de Ação Aclamados (Nota >= 8.0)',
    difficulty: 'Iniciante',
    targetDatabase: 'db_streamflix',
    databaseOrigin: 'streamflix',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_streamflix`, consulte `titulo`, `ano_lancamento` e `nota_imdb` da tabela `tb_filmes` apenas para obras do gênero `\'Ação\'` que tenham `nota_imdb >= 8.0`, ordenados pela `nota_imdb DESC`.',
    hint: 'Filtre `WHERE genero = \'Ação\' AND nota_imdb >= 8.0 ORDER BY nota_imdb DESC;`.',
    starterSql: `USE db_streamflix;

-- Projete titulo, ano_lancamento e nota_imdb dos filmes de Ação com nota >= 8.0:
`,
    setupSql: STREAMFLIX_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'AND'],
    referenceSolutionSql: `SELECT titulo, ano_lancamento, nota_imdb FROM tb_filmes WHERE genero = 'Ação' AND nota_imdb >= 8.0 ORDER BY nota_imdb DESC;`,
  },
  {
    id: 'ex-ei-01-mensalidade',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Escola de Idiomas)',
    title: 'Escola de Idiomas • Cursos com Mensalidade > R$ 350',
    difficulty: 'Iniciante',
    targetDatabase: 'db_escolaidiomas',
    databaseOrigin: 'escolaidiomas',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_escolaidiomas`, selecione `nome_curso`, `idioma` e `valor_mensalidade` da tabela `tb_cursos` apenas para cursos ativos (`ativo = 1`) com `valor_mensalidade > 350.00`, ordenados do maior para o menor valor.',
    hint: 'Use `SELECT nome_curso, idioma, valor_mensalidade FROM tb_cursos WHERE ativo = 1 AND valor_mensalidade > 350.00 ORDER BY valor_mensalidade DESC;`.',
    starterSql: `USE db_escolaidiomas;

-- Consulte nome_curso, idioma e valor_mensalidade dos cursos ativos com mensalidade > 350:
`,
    setupSql: ESCOLA_IDIOMAS_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'AND', 'ORDER'],
    referenceSolutionSql: `SELECT nome_curso, idioma, valor_mensalidade FROM tb_cursos WHERE ativo = 1 AND valor_mensalidade > 350.00 ORDER BY valor_mensalidade DESC;`,
  },
  {
    id: 'ex-ei-02-alunos-ativos',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Escola de Idiomas)',
    title: 'Escola de Idiomas • Alunos com Matrícula Ativa',
    difficulty: 'Iniciante',
    targetDatabase: 'db_escolaidiomas',
    databaseOrigin: 'escolaidiomas',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_escolaidiomas`, consulte `id_aluno`, `nome_aluno`, `data_nascimento` e `nivel_escolaridade` da tabela `tb_alunos` onde `status_matricula = \'Ativo\'`, ordenados alfabeticamente por `nome_aluno`.',
    hint: 'Aplique `WHERE status_matricula = \'Ativo\' ORDER BY nome_aluno ASC;`.',
    starterSql: `USE db_escolaidiomas;

-- Consulte alunos com status_matricula Ativo:
`,
    setupSql: ESCOLA_IDIOMAS_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'ORDER'],
    referenceSolutionSql: `SELECT id_aluno, nome_aluno, data_nascimento, nivel_escolaridade FROM tb_alunos WHERE status_matricula = 'Ativo' ORDER BY nome_aluno ASC;`,
  },
  {
    id: 'ex-ei-03-pagamentos-pix',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (Escola de Idiomas)',
    title: 'Escola de Idiomas • Pagamentos com Pix ou Cartão',
    difficulty: 'Intermediário',
    targetDatabase: 'db_escolaidiomas',
    databaseOrigin: 'escolaidiomas',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_escolaidiomas`, liste `id_pagamento`, `valor_pago`, `forma_pagamento` e `data_pagamento` da tabela `tb_pagamentos` apenas para transações com `status_pagamento = \'Confirmado\'` pagas via `\'Pix\'` ou `\'Cartão de Crédito\'`, ordenadas pelo `valor_pago DESC`.',
    hint: 'Combine com `WHERE status_pagamento = \'Confirmado\' AND forma_pagamento IN (\'Pix\', \'Cartão de Crédito\') ORDER BY valor_pago DESC;`.',
    starterSql: `USE db_escolaidiomas;

-- Projete id_pagamento, valor_pago, forma_pagamento e data_pagamento:
`,
    setupSql: ESCOLA_IDIOMAS_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'IN', 'ORDER'],
    referenceSolutionSql: `SELECT id_pagamento, valor_pago, forma_pagamento, data_pagamento FROM tb_pagamentos WHERE status_pagamento = 'Confirmado' AND forma_pagamento IN ('Pix', 'Cartão de Crédito') ORDER BY valor_pago DESC;`,
  },
  {
    id: 'ex-rh-01-salario',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (RH)',
    title: 'Recursos Humanos • Funcionários com Salário >= R$ 4.000',
    difficulty: 'Iniciante',
    targetDatabase: 'db_rh',
    databaseOrigin: 'rh',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_rh`, consulte `nome_funcionario`, `cargo`, `departamento` e `salario_base` da tabela `tb_funcionarios_rh` apenas para colaboradores ativos (`ativo = 1`) com `salario_base >= 4000.00`, ordenados pelo `salario_base DESC`.',
    hint: 'Aplique `WHERE ativo = 1 AND salario_base >= 4000.00 ORDER BY salario_base DESC;`.',
    starterSql: `USE db_rh;

-- Liste nome_funcionario, cargo, departamento e salario_base com salario >= 4000:
`,
    setupSql: RH_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'WHERE', 'AND', 'ORDER'],
    referenceSolutionSql: `SELECT nome_funcionario, cargo, departamento, salario_base FROM tb_funcionarios_rh WHERE ativo = 1 AND salario_base >= 4000.00 ORDER BY salario_base DESC;`,
  },
  {
    id: 'ex-03-dql-filtro-ordenacao',
    stageNumber: 3,
    stageLabel: 'Etapa 3 • Consultas & Filtros (E-Commerce)',
    title: 'E-Commerce • Produtos Premium Ordenados por Preço',
    difficulty: 'Iniciante',
    targetDatabase: 'ecommerce_db',
    databaseOrigin: 'ecommerce',
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
    stageLabel: 'Etapa 3 • Consultas & Filtros (E-Commerce)',
    title: 'E-Commerce • Auditoria de Clientes Ativos',
    difficulty: 'Iniciante',
    targetDatabase: 'ecommerce_db',
    databaseOrigin: 'ecommerce',
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

  // --- ETAPA 4: JUNÇÕES RELACIONAIS (JOIN) ---
  {
    id: 'ex-05-join-catalogo',
    stageNumber: 4,
    stageLabel: 'Etapa 4 • Junções Relacionais (JOIN)',
    title: 'E-Commerce • Produtos com Nome da Categoria (INNER JOIN)',
    difficulty: 'Intermediário',
    targetDatabase: 'ecommerce_db',
    databaseOrigin: 'ecommerce',
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
    title: 'Universidade • Alunos do Departamento de Computação',
    difficulty: 'Intermediário',
    targetDatabase: 'universidade_db',
    databaseOrigin: 'universidade',
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

  // --- ETAPA 5: AGREGAÇÕES & GROUP BY ---
  {
    id: 'ex-rh-02-media-departamento',
    stageNumber: 5,
    stageLabel: 'Etapa 5 • Agregações (RH)',
    title: 'Recursos Humanos • Média Salarial por Departamento (GROUP BY)',
    difficulty: 'Avançado',
    targetDatabase: 'db_rh',
    databaseOrigin: 'rh',
    recommendedModule: 'workspace',
    prompt:
      'No banco `db_rh`, agrupe a tabela `tb_funcionarios_rh` por `departamento`, retornando 3 colunas: o `departamento`, a contagem de funcionários (`COUNT(*) AS total_colaboradores`) e a média salarial (`AVG(salario_base) AS media_salarial`), ordenados alfabeticamente por `departamento`.',
    hint: 'Use `SELECT departamento, COUNT(*) AS total_colaboradores, AVG(salario_base) AS media_salarial FROM tb_funcionarios_rh GROUP BY departamento ORDER BY departamento ASC;`.',
    starterSql: `USE db_rh;

-- Agrupe por departamento retornando departamento, total_colaboradores e media_salarial:
`,
    setupSql: RH_SETUP_SQL,
    validationMode: 'query-match',
    requiredKeywords: ['SELECT', 'GROUP', 'COUNT', 'AVG'],
    referenceSolutionSql: `SELECT departamento, COUNT(*) AS total_colaboradores, AVG(salario_base) AS media_salarial FROM tb_funcionarios_rh GROUP BY departamento ORDER BY departamento ASC;`,
  },
  {
    id: 'ex-07-agg-pedidos-status',
    stageNumber: 5,
    stageLabel: 'Etapa 5 • Agregações & GROUP BY',
    title: 'E-Commerce • Resumo Financeiro de Pedidos por Status',
    difficulty: 'Avançado',
    targetDatabase: 'ecommerce_db',
    databaseOrigin: 'ecommerce',
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
