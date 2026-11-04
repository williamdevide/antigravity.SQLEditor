-- =========================================================================
-- GABARITO OFICIAL: 30 EXERCÍCIOS GERENCIAIS DQL (ESCOLA DE IDIOMAS)
-- SEMANA 08 - CONSULTAS ANALÍTICAS COM FILTROS E FUNÇÕES NATIVAS
-- Compatível com MySQL / MariaDB
-- =========================================================================

-- -------------------------------------------------------------------------
-- BLOCO 1: GESTÃO DE ALUNOS & RESPONSÁVEIS (tb_alunos e tb_responsaveis)
-- -------------------------------------------------------------------------

-- 1. [Emissão de Crachás de Alunos]
-- Enunciado: Nome em maiúsculas e e-mail em minúsculas para alunos ativos.
SELECT UPPER(nome_aluno) AS nome_maiusculo, 
       LOWER(email_aluno) AS email_minusculo 
FROM tb_alunos 
WHERE status_matricula = 'Ativo';


-- 2. [Levantamento da Idade dos Alunos]
-- Enunciado: Nome do aluno, data de nascimento e cálculo da idade atual em anos.
SELECT nome_aluno, 
       data_nascimento, 
       TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) AS idade_anos 
FROM tb_alunos;


-- 3. [Acompanhamento de Tempo de Casa do Aluno]
-- Enunciado: Nome do aluno, data de matrícula e quantidade de dias decorridos desde a matrícula.
SELECT nome_aluno, 
       data_matricula, 
       DATEDIFF(CURDATE(), data_matricula) AS dias_matriculado 
FROM tb_alunos;


-- 4. [Ficha do Responsável Financeiro]
-- Enunciado: Nome e profissão entre parênteses em coluna única e telefone principal para responsáveis fora de Ourinhos.
SELECT CONCAT(nome_responsavel, ' (', profissao, ')') AS responsavel_profissao, 
       telefone_principal 
FROM tb_responsaveis 
WHERE cidade <> 'Ourinhos';


-- 5. [Padronização de E-mails de Contato]
-- Enunciado: Nome do responsável e e-mail convertido para minúsculas filtrando provedores de e-mail.
SELECT nome_responsavel, 
       LOWER(email_responsavel) AS email_padronizado 
FROM tb_responsaveis 
WHERE email_responsavel LIKE '%@email.com%' 
   OR email_responsavel LIKE '%@gmail.com%';


-- 6. [Relatório de Alunos Mais Jovens do Ano]
-- Enunciado: Top 10 alunos mais novos com matrícula ativa cadastrados a partir de 2024.
SELECT * 
FROM tb_alunos 
WHERE data_matricula >= '2024-01-01' 
  AND status_matricula = 'Ativo' 
ORDER BY data_nascimento DESC 
LIMIT 10;


-- 7. [Auditoria de Documentos Pendentes]
-- Enunciado: Alunos sem CPF cadastrado (nulo) ou que possuem observações médicas cadastradas.
SELECT * 
FROM tb_alunos 
WHERE cpf_aluno IS NULL 
   OR observacoes_medicas IS NOT NULL;


-- 8. [Geração de Código de Matrícula Curto]
-- Enunciado: Três primeiras letras do nome do aluno em caixa alta e nível de escolaridade.
SELECT UPPER(SUBSTRING(nome_aluno, 1, 3)) AS prefixo_nome, 
       nivel_escolaridade 
FROM tb_alunos;


-- 9. [Relatório de Evasão com Datas Formatadas]
-- Enunciado: Nome do aluno e data de matrícula no padrão brasileiro (DD/MM/AAAA) para status Trancado ou Cancelado.
SELECT nome_aluno, 
       DATE_FORMAT(data_matricula, '%d/%m/%Y') AS data_matricula_br 
FROM tb_alunos 
WHERE status_matricula IN ('Trancado', 'Cancelado');


-- 10. [Cadastro de Mães e Pais]
-- Enunciado: Responsáveis cujo parentesco seja exatamente Mãe ou Pai, ordenados alfabeticamente.
SELECT * 
FROM tb_responsaveis 
WHERE parentesco IN ('Mãe', 'Pai') 
ORDER BY nome_responsavel ASC;


-- -------------------------------------------------------------------------
-- BLOCO 2: GESTÃO FINANCEIRA E COBRANÇA (tb_pagamentos)
-- -------------------------------------------------------------------------

-- 11. [Cobranças Pendentes com Juros Arredondados]
-- Enunciado: Boletos pendentes ou atrasados com código, valor original e juros arredondados para cima.
SELECT id_pagamento, 
       valor_original, 
       CEIL(valor_multa_juros) AS juros_teto 
FROM tb_pagamentos 
WHERE status_pagamento IN ('Pendente', 'Atrasado');


-- 12. [Simulação de Quitação de Boletos]
-- Enunciado: Simulação do valor final calculado com fórmula e arredondado para 2 casas decimais.
SELECT id_pagamento, 
       valor_original, 
       valor_multa_juros, 
       valor_desconto, 
       ROUND(valor_original + valor_multa_juros - valor_desconto, 2) AS valor_final_simulado 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 13. [Histórico Contábil em Padrão Brasileiro]
-- Enunciado: Cobranças pagas com data de vencimento e pagamento formatadas no padrão brasileiro.
SELECT id_pagamento, 
       DATE_FORMAT(data_vencimento, '%d/%m/%Y') AS vencimento_br, 
       DATE_FORMAT(data_pagamento, '%d/%m/%Y') AS pagamento_br 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 14. [Dias de Atraso de Inadimplentes]
-- Enunciado: Cálculo da quantidade de dias de atraso entre o vencimento e a data atual.
SELECT id_pagamento, 
       data_vencimento, 
       DATEDIFF(CURDATE(), data_vencimento) AS dias_atraso 
FROM tb_pagamentos 
WHERE status_pagamento = 'Atrasado';


-- 15. [Ranking de Maiores Pagamentos no Pix ou Cartão]
-- Enunciado: Top 15 maiores pagamentos efetuados acima de R$ 300,00 via Pix ou Cartão de Crédito.
SELECT * 
FROM tb_pagamentos 
WHERE valor_pago > 300.00 
  AND forma_pagamento IN ('Pix', 'Cartão de Crédito') 
ORDER BY valor_pago DESC 
LIMIT 15;


-- 16. [Auditoria de Boletos Sem Observação]
-- Enunciado: Cobranças do primeiro trimestre de 2025 sem número de comprovante cadastrado.
SELECT * 
FROM tb_pagamentos 
WHERE data_vencimento BETWEEN '2025-01-01' AND '2025-03-31' 
  AND numero_comprovante IS NULL;


-- 17. [Carimbo de Emissão de Relatório de Caixa]
-- Enunciado: Cobranças quitadas exibindo dados do pagamento e carimbo de data/hora atual do servidor.
SELECT id_pagamento, 
       valor_pago, 
       forma_pagamento, 
       NOW() AS carimbo_extracao 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 18. [Simulação de Reajuste em Cobranças Atrasadas]
-- Enunciado: Simulação de acréscimo de 10% sobre valor original de cobranças pendentes arredondado sem centavos.
SELECT id_pagamento, 
       valor_original, 
       ROUND(valor_original * 1.10, 0) AS valor_reajustado 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pendente';


-- -------------------------------------------------------------------------
-- BLOCO 3: CATÁLOGO DE CURSOS & TURMAS (tb_cursos e tb_turmas)
-- -------------------------------------------------------------------------

-- 19. [Catálogo de Investimento Inicial]
-- Enunciado: Nome do curso em maiúsculas e investimento inicial somado (mensalidade + material) em ordem crescente.
SELECT UPPER(nome_curso) AS curso_maiusculo, 
       (valor_mensalidade + valor_material_didatico) AS investimento_inicial 
FROM tb_cursos 
ORDER BY investimento_inicial ASC;


-- 20. [Cursos Intensivos de Curta Duração]
-- Enunciado: Cursos ativos de curta duração (até 6 meses) com nome, idioma e mensalidade.
SELECT nome_curso, 
       idioma, 
       valor_mensalidade 
FROM tb_cursos 
WHERE ativo = 1 
  AND duracao_meses <= 6;


-- 21. [Resumo Didático dos Cursos de Idiomas]
-- Enunciado: Nome do curso, nível e extração dos primeiros 30 caracteres da descrição para Inglês e Espanhol.
SELECT nome_curso, 
       nivel_quadro_comum, 
       SUBSTRING(descricao_curso, 1, 30) AS resumo_descricao 
FROM tb_cursos 
WHERE idioma IN ('Inglês', 'Espanhol');


-- 22. [Simulação de Mensalidade Inteira]
-- Enunciado: Nome do curso, idioma e mensalidade arredondada sempre para o inteiro superior (CEIL).
SELECT nome_curso, 
       idioma, 
       valor_mensalidade, 
       CEIL(valor_mensalidade) AS mensalidade_teto 
FROM tb_cursos;


-- 23. [Filtro de Nomes Extensos de Cursos]
-- Enunciado: Nome do curso e quantidade total de caracteres apenas para cursos com nomes maiores que 25 caracteres.
SELECT nome_curso, 
       LENGTH(nome_curso) AS tamanho_nome 
FROM tb_cursos 
WHERE LENGTH(nome_curso) > 25;


-- 24. [Grade Horária de Professores Específicos]
-- Enunciado: Código da turma, sala e horário unificado em coluna única no formato HH:MM - HH:MM.
SELECT codigo_turma, 
       sala_aula, 
       CONCAT(horario_inicio, ' - ', horario_fim) AS grade_horaria 
FROM tb_turmas 
WHERE nome_professor LIKE '%Smith%' 
   OR nome_professor LIKE '%Garcia%' 
   OR nome_professor LIKE '%Dubois%';


-- 25. [Top 5 Turmas com Maior Capacidade]
-- Enunciado: Top 5 turmas com maior quantidade de vagas máximas, exibindo código em maiúsculas e professor.
SELECT UPPER(codigo_turma) AS turma_maiuscula, 
       nome_professor, 
       vagas_maximas 
FROM tb_turmas 
ORDER BY vagas_maximas DESC 
LIMIT 5;


-- -------------------------------------------------------------------------
-- BLOCO 4: AULAS & DIÁRIO DE CLASSE (tb_aulas)
-- -------------------------------------------------------------------------

-- 26. [Pesquisa de Aulas de Gramática e Vocabulário]
-- Enunciado: Número da aula, data formatada no padrão brasileiro e conteúdo com busca por palavras-chave.
SELECT numero_aula, 
       DATE_FORMAT(data_aula, '%d/%m/%Y') AS data_aula_br, 
       conteudo_ministrado 
FROM tb_aulas 
WHERE conteudo_ministrado LIKE '%Gram%' 
   OR conteudo_ministrado LIKE '%Conversa%';


-- 27. [Investigação de Aulas Longas Sem Tarefa]
-- Enunciado: Número da aula, data e duração de todas as aulas com duração igual ou superior a 90 minutos.
SELECT numero_aula, 
       data_aula, 
       duracao_minutos 
FROM tb_aulas 
WHERE duracao_minutos >= 90;


-- 28. [Relatório de Ausências do Professor]
-- Enunciado: Data da aula, sala utilizada e observações para registros onde o professor esteve ausente.
SELECT data_aula, 
       sala_utilizada, 
       observacoes_disciplina 
FROM tb_aulas 
WHERE presenca_professor = 0;


-- 29. [Duração de Aulas Convertida para Horas]
-- Enunciado: Primeiras 20 aulas exibindo número, conteúdo e duração convertida em horas com 1 casa decimal.
SELECT numero_aula, 
       conteudo_ministrado, 
       ROUND(duracao_minutos / 60.0, 1) AS duracao_horas 
FROM tb_aulas 
LIMIT 20;


-- 30. [Ficha de Alocação de Turmas Noturnas]
-- Enunciado: Turmas do horário noturno (início a partir das 18:00) combinando dias da semana e sala de aula.
SELECT codigo_turma, 
       nome_professor, 
       CONCAT(dias_semana, ' - ', sala_aula) AS alocacao 
FROM tb_turmas 
WHERE horario_inicio >= '18:00';
