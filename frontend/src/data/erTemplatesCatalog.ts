// ============================================================================
// CATÁLOGO CURADO DE TEMPLATES DER E LABORATÓRIOS DE NORMALIZAÇÃO (1FN–3FN)
// ============================================================================

export interface ERTemplateCatalogItem {
  id: string;
  kind: 'template' | 'normalization-lab';
  title: string;
  subtitle: string;
  badge: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  dbName: string;
  pedagogicalGoal: string;
  ddlSql: string;
}

export const ER_TEMPLATES_CATALOG: ERTemplateCatalogItem[] = [
  {
    id: 'tpl-ecommerce-pro',
    kind: 'template',
    title: 'E-Commerce & Faturamento (3FN)',
    subtitle: 'Catálogo, clientes, pedidos N:N e pagamentos com integridade referencial completa.',
    badge: '3FN Padrão',
    difficulty: 'Iniciante',
    dbName: 'tpl_ecommerce_db',
    pedagogicalGoal:
      'Compreender entidades fortes (clientes, categorias), entidades dependentes (pedidos, pagamentos) e tabela associativa N:N (itens_pedido).',
    ddlSql: `CREATE DATABASE IF NOT EXISTS tpl_ecommerce_db;
USE tpl_ecommerce_db;

CREATE TABLE categorias (
  id INT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  ativa BOOLEAN
);

CREATE TABLE produtos (
  id INT PRIMARY KEY,
  categoria_id INT NOT NULL,
  sku VARCHAR(30) UNIQUE,
  nome VARCHAR(140) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  estoque INT NOT NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE clientes (
  id INT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE,
  cidade VARCHAR(80)
);

CREATE TABLE pedidos (
  id INT PRIMARY KEY,
  cliente_id INT NOT NULL,
  data_pedido DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  valor_total DECIMAL(10,2),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE itens_pedido (
  id INT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

CREATE TABLE pagamentos (
  id INT PRIMARY KEY,
  pedido_id INT NOT NULL,
  metodo VARCHAR(40) NOT NULL,
  confirmado BOOLEAN,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

INSERT INTO categorias VALUES (1, 'Hardware', true), (2, 'Periféricos', true);
INSERT INTO produtos VALUES (10, 1, 'SSD-1TB', 'SSD NVMe 1TB', 459.90, 35), (20, 2, 'TEC-MEC', 'Teclado Mecânico ABNT2', 329.00, 60);
INSERT INTO clientes VALUES (1, 'Beatriz Almeida', 'beatriz@senai.br', 'Ourinhos'), (2, 'Lucas Martins', 'lucas@senai.br', 'Bauru');
INSERT INTO pedidos VALUES (501, 1, '2026-10-12', 'aprovado', 788.90);
INSERT INTO itens_pedido VALUES (1, 501, 10, 1, 459.90), (2, 501, 20, 1, 329.00);
INSERT INTO pagamentos VALUES (9001, 501, 'PIX', true);`,
  },
  {
    id: 'tpl-clinica-medica',
    kind: 'template',
    title: 'Clínica Médica & Prontuário',
    subtitle: 'Especialidades, corpo clínico, pacientes, agendamento de consultas e prescrições.',
    badge: 'Saúde / 3FN',
    difficulty: 'Intermediário',
    dbName: 'tpl_clinica_db',
    pedagogicalGoal:
      'Praticar múltiplos relacionamentos 1:N convergindo para um evento transacional central (consultas).',
    ddlSql: `CREATE DATABASE IF NOT EXISTS tpl_clinica_db;
USE tpl_clinica_db;

CREATE TABLE especialidades (
  id INT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  sala_padrao VARCHAR(20)
);

CREATE TABLE medicos (
  id INT PRIMARY KEY,
  crm VARCHAR(20) UNIQUE,
  nome VARCHAR(120) NOT NULL,
  especialidade_id INT NOT NULL,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);

CREATE TABLE pacientes (
  id INT PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE,
  nome VARCHAR(120) NOT NULL,
  data_nascimento DATE,
  convenio VARCHAR(60)
);

CREATE TABLE consultas (
  id INT PRIMARY KEY,
  paciente_id INT NOT NULL,
  medico_id INT NOT NULL,
  data_hora DATETIME NOT NULL,
  diagnostico VARCHAR(255),
  status VARCHAR(30),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (medico_id) REFERENCES medicos(id)
);

CREATE TABLE prescricoes (
  id INT PRIMARY KEY,
  consulta_id INT NOT NULL,
  medicamento VARCHAR(120) NOT NULL,
  posologia VARCHAR(180) NOT NULL,
  FOREIGN KEY (consulta_id) REFERENCES consultas(id)
);

INSERT INTO especialidades VALUES (1, 'Cardiologia', 'Bloco A-12'), (2, 'Ortopedia', 'Bloco B-04');
INSERT INTO medicos VALUES (1, 'CRM-SP-44120', 'Dra. Helena Vasconcelos', 1), (2, 'CRM-SP-88310', 'Dr. Marcos Prado', 2);
INSERT INTO pacientes VALUES (1, '123.456.789-00', 'Roberto Nascimento', '1988-05-14', 'Unimed');
INSERT INTO consultas VALUES (100, 1, 1, '2026-10-20 09:30:00', 'Check-up preventivo normal', 'realizada');
INSERT INTO prescricoes VALUES (1, 100, 'Vitamina D 2000UI', '1 cápsula ao dia após almoço');`,
  },
  {
    id: 'tpl-gestao-academica',
    kind: 'template',
    title: 'Gestão Universitária & Matrículas (PK Composta)',
    subtitle: 'Cursos, disciplinas, professores, turmas semestrais e matrículas com chave composta.',
    badge: 'PK Composta',
    difficulty: 'Intermediário',
    dbName: 'tpl_academico_db',
    pedagogicalGoal:
      'Modelar chaves primárias compostas em tabelas associativas (aluno_id + turma_id) e atributos próprios do relacionamento (nota_final, frequencia).',
    ddlSql: `CREATE DATABASE IF NOT EXISTS tpl_academico_db;
USE tpl_academico_db;

CREATE TABLE cursos (
  id INT PRIMARY KEY,
  sigla VARCHAR(10) UNIQUE,
  nome VARCHAR(120) NOT NULL,
  carga_horaria INT
);

CREATE TABLE professores (
  id INT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  titulacao VARCHAR(40),
  email VARCHAR(140) UNIQUE
);

CREATE TABLE disciplinas (
  id INT PRIMARY KEY,
  curso_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  creditos INT NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

CREATE TABLE turmas (
  id INT PRIMARY KEY,
  disciplina_id INT NOT NULL,
  professor_id INT NOT NULL,
  semestre VARCHAR(10) NOT NULL,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  FOREIGN KEY (professor_id) REFERENCES professores(id)
);

CREATE TABLE alunos (
  id INT PRIMARY KEY,
  ra VARCHAR(20) UNIQUE,
  nome VARCHAR(120) NOT NULL,
  curso_id INT NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
);

CREATE TABLE matriculas (
  aluno_id INT NOT NULL,
  turma_id INT NOT NULL,
  nota_final DECIMAL(4,2),
  frequencia_pct INT,
  PRIMARY KEY (aluno_id, turma_id),
  FOREIGN KEY (aluno_id) REFERENCES alunos(id),
  FOREIGN KEY (turma_id) REFERENCES turmas(id)
);

INSERT INTO cursos VALUES (1, 'ADS', 'Análise e Desenvolvimento de Sistemas', 2400);
INSERT INTO professores VALUES (1, 'Prof. William Komel', 'Mestre', 'william@instituicao.edu.br');
INSERT INTO disciplinas VALUES (10, 1, 'Banco de Dados Relacional', 4);
INSERT INTO turmas VALUES (20261, 10, 1, '2026.2');
INSERT INTO alunos VALUES (101, 'RA2026001', 'Camila Ferreira', 1);
INSERT INTO matriculas VALUES (101, 20261, 9.50, 96);`,
  },
  {
    id: 'tpl-organograma-selfjoin',
    kind: 'template',
    title: 'Hierarquia Corporativa (Auto-Relacionamento & Trigger)',
    subtitle: 'Organograma recursivo gestor -> liderado com alça Self-Join "C" e auditoria via Trigger.',
    badge: 'Self-Join + Trigger',
    difficulty: 'Avançado',
    dbName: 'tpl_corporativo_db',
    pedagogicalGoal:
      'Visualizar auto-relacionamento recursivo (gestor_id apontando para a própria tabela colaboradores) e gatilhos de auditoria.',
    ddlSql: `CREATE DATABASE IF NOT EXISTS tpl_corporativo_db;
USE tpl_corporativo_db;

CREATE TABLE departamentos (
  id INT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  orcamento_anual DECIMAL(12,2)
);

CREATE TABLE colaboradores (
  id INT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cargo VARCHAR(80) NOT NULL,
  salario DECIMAL(10,2) NOT NULL,
  departamento_id INT NOT NULL,
  gestor_id INT,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (gestor_id) REFERENCES colaboradores(id)
);

CREATE TABLE log_auditoria_salarial (
  id INT PRIMARY KEY,
  colaborador_id INT NOT NULL,
  salario_anterior DECIMAL(10,2),
  salario_novo DECIMAL(10,2),
  registrado_em DATETIME,
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
);

INSERT INTO departamentos VALUES (1, 'Engenharia de Dados', 950000.00);
INSERT INTO colaboradores VALUES
  (1, 'Mariana Diretora', 'Head de Dados', 18500.00, 1, NULL),
  (2, 'Rafael Tech Lead', 'Arquiteto de BD', 13200.00, 1, 1),
  (3, 'Enzo Analista', 'Engenheiro SQL Jr', 6400.00, 1, 2);`,
  },
  // ==========================================================================
  // CENÁRIOS DE SALA DE AULA: VIOLAÇÕES DE 1FN, 2FN E 3FN PARA PRÁTICA DO ALUNO
  // ==========================================================================
  {
    id: 'norm-violacao-1fn',
    kind: 'normalization-lab',
    title: 'Cenário 1FN — Planilha com Grupos Repetitivos',
    subtitle: 'Tabela desnormalizada com telefone1, telefone2 e curso1, curso2 para decomposição em 1FN.',
    badge: 'Desafio 1FN',
    difficulty: 'Iniciante',
    dbName: 'lab_normalizacao_1fn',
    pedagogicalGoal:
      'Identificar atributos multivalorados e colunas numeradas repetidas (telefone1, telefone2) usando o Linter Pedagógico e extrair tabelas filhas atômicas.',
    ddlSql: `CREATE DATABASE IF NOT EXISTS lab_normalizacao_1fn;
USE lab_normalizacao_1fn;

-- ATENÇÃO PEDAGÓGICA: Esta tabela VIOLA a 1ª Forma Normal (1FN) propositalmente!
-- Abra a aba "Saúde" no Estúdio DER ou o Dicionário 1FN-3FN para ver o diagnóstico.
CREATE TABLE ficha_inscricao_aluno (
  id INT PRIMARY KEY,
  nome_completo VARCHAR(120) NOT NULL,
  telefone1 VARCHAR(20),
  telefone2 VARCHAR(20),
  telefone3 VARCHAR(20),
  telefones_lista VARCHAR(255)
);

INSERT INTO ficha_inscricao_aluno VALUES
  (1, 'João Pedro Souza', '(14) 99911-0001', '(14) 3322-1100', NULL, '99911-0001, 3322-1100');`,
  },
  {
    id: 'norm-violacao-2fn',
    kind: 'normalization-lab',
    title: 'Cenário 2FN — Dependência Parcial em Chave Composta',
    subtitle: 'Item de venda com PK composta (venda_id, produto_id) carregando nome_produto e descricao_produto.',
    badge: 'Desafio 2FN',
    difficulty: 'Intermediário',
    dbName: 'lab_normalizacao_2fn',
    pedagogicalGoal:
      'Perceber como nome_produto depende apenas de produto_id (parte da chave composta), gerando redundância e anomalia de atualização (Violação de 2FN).',
    ddlSql: `CREATE DATABASE IF NOT EXISTS lab_normalizacao_2fn;
USE lab_normalizacao_2fn;

-- ATENÇÃO PEDAGÓGICA: Esta tabela VIOLA a 2ª Forma Normal (2FN)!
-- A PK é composta por (venda_id, produto_id), mas nome_produto depende apenas de produto_id.
CREATE TABLE itens_venda_desnormalizado (
  venda_id INT NOT NULL,
  produto_id INT NOT NULL,
  nome_produto VARCHAR(120) NOT NULL,
  descricao_produto VARCHAR(200),
  quantidade INT NOT NULL,
  PRIMARY KEY (venda_id, produto_id)
);

INSERT INTO itens_venda_desnormalizado VALUES
  (10, 50, 'Mouse Sem Fio', 'Mouse óptico 2.4GHz', 2),
  (11, 50, 'Mouse Sem Fio', 'Mouse óptico 2.4GHz', 1);`,
  },
  {
    id: 'norm-violacao-3fn',
    kind: 'normalization-lab',
    title: 'Cenário 3FN — Dependência Transitiva (CEP e Departamento)',
    subtitle: 'Funcionários armazenando cep -> cidade/uf e departamento_id -> nome_departamento na mesma relação.',
    badge: 'Desafio 3FN',
    difficulty: 'Avançado',
    dbName: 'lab_normalizacao_3fn',
    pedagogicalGoal:
      'Eliminar dependências transitivas onde um atributo não-chave determina outro atributo não-chave (ex: departamento_id -> nome_departamento e cep -> cidade, uf).',
    ddlSql: `CREATE DATABASE IF NOT EXISTS lab_normalizacao_3fn;
USE lab_normalizacao_3fn;

-- ATENÇÃO PEDAGÓGICA: Esta tabela está em 1FN e 2FN, mas VIOLA a 3ª Forma Normal (3FN)!
CREATE TABLE funcionarios_transitivo (
  id INT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cep VARCHAR(10),
  logradouro VARCHAR(150),
  bairro VARCHAR(80),
  cidade VARCHAR(80),
  uf VARCHAR(2),
  departamento_id INT,
  nome_departamento VARCHAR(100)
);

INSERT INTO funcionarios_transitivo VALUES
  (1, 'Carla Mendes', '19900-000', 'Av. Rodrigues Alves, 100', 'Centro', 'Ourinhos', 'SP', 10, 'Tecnologia da Informação'),
  (2, 'Diego Rocha', '19900-000', 'Rua Paraná, 450', 'Centro', 'Ourinhos', 'SP', 10, 'Tecnologia da Informação');`,
  },
];

