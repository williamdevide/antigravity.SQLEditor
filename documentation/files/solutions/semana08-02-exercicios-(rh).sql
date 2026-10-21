-- =========================================================================
-- GABARITO OFICIAL: SEMANA 08 - FUNÇÕES NATIVAS (AULA 08)
-- Banco de Dados: tb_funcionarios_rh (semana08-01-base-rh-500.sql)
-- =========================================================================

-- -------------------------------------------------------------------------
-- ATIVIDADE 1: LIMPEZA EXPRESSA (Exercícios Atômicos Guiados)
-- -------------------------------------------------------------------------

-- Task 1.1: Selecionar os nomes dos funcionários e transformá-los em maiúsculas (UPPER)
SELECT id_funcionario, 
       nome_funcionario, 
       UPPER(nome_funcionario) AS nome_maiusculo 
FROM tb_funcionarios_rh;

-- Task 1.2: Selecionar salários com centavos quebrados e arredondá-los (ROUND)
SELECT id_funcionario, 
       nome_funcionario, 
       salario_base, 
       ROUND(salario_base, 0) AS salario_arredondado 
FROM tb_funcionarios_rh;

-- Task 1.3: Exibir uma coluna com o carimbo de data/hora atual (NOW)
SELECT id_funcionario, 
       nome_funcionario, 
       NOW() AS carimbo_data_hora 
FROM tb_funcionarios_rh;

-- Consulta Unificada da Atividade 1 (Limpeza Expressa):
SELECT id_funcionario,
       UPPER(nome_funcionario) AS nome_maiusculo,
       salario_base,
       ROUND(salario_base, 0) AS salario_arredondado,
       NOW() AS carimbo_data_hora
FROM tb_funcionarios_rh;


-- -------------------------------------------------------------------------
-- ATIVIDADE 2: O RELATÓRIO DO RH (Desafio de Sintaxe Avançada Aninhada)
-- Exigências:
-- 1. Nomes e sobrenomes unidos em uma única coluna 'nome_completo' (CONCAT)
-- 2. Todos os nomes rigorosamente em MAIÚSCULO (UPPER aninhado)
-- 3. Salários arredondados sempre para CIMA, sem centavos (CEIL)
-- 4. Data de contratação formatada no padrão brasileiro DD/MM/YYYY (DATE_FORMAT)
-- 5. Resultado final gerado por uma ÚNICA query SELECT otimizada
-- -------------------------------------------------------------------------

SELECT id_funcionario,
       UPPER(CONCAT(nome_funcionario, ' ', sobrenome_funcionario)) AS nome_completo,
       cargo,
       salario_base AS salario_original,
       CEIL(salario_base) AS salario_arredondado_cima,
       data_contratacao AS data_original,
       DATE_FORMAT(data_contratacao, '%d/%m/%Y') AS data_contratacao_br
FROM tb_funcionarios_rh;