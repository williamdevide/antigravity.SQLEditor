-- =========================================================================
-- GABARITO OFICIAL: 30 EXERCÍCIOS GERENCIAIS DQL (ESCOLA DE IDIOMAS)
-- SEMANA 08 - CONSULTAS ANALÍTICAS COM FILTROS E FUNÇÕES NATIVAS
-- Compatível com MySQL / MariaDB e SQLite
-- =========================================================================

-- -------------------------------------------------------------------------
-- BLOCO 1: GESTÃO DE ALUNOS & RESPONSÁVEIS (tb_alunos e tb_responsaveis)
-- -------------------------------------------------------------------------

USE db_escolaidiomas;

-- 1. [Emissão de Crachás de Alunos]
-- Enunciado: Nome em maiúsculas e e-mail em minúsculas para alunos ativos.
SELECT UPPER(nome_aluno) AS nome_maiusculo, 
       LOWER(email_aluno) AS email_minusculo 
FROM tb_alunos 
WHERE status_matricula = 'Ativo';


-- 2. [Levantamento da Idade dos Alunos]
-- Enunciado: Nome, data de nascimento e idade calculada em anos.
-- MySQL: TIMESTAMPDIFF(YEAR, data_nascimento, CURDATE()) AS idade_anos
-- SQLite: CAST((strftime('%Y', 'now') - strftime('%Y', data_nascimento)) AS INT) AS idade_anos
SELECT nome_aluno, 
       data_nascimento, 
       CAST((strftime('%Y', 'now') - strftime('%Y', data_nascimento)) AS INT) AS idade_anos 
FROM tb_alunos;


-- 3. [Acompanhamento de Tempo de Casa do Aluno]
-- Enunciado: Nome, data de matrícula e quantidade de dias desde a matrícula.
-- MySQL: DATEDIFF(CURDATE(), data_matricula) AS dias_matriculado
-- SQLite: CAST(julianday('now') - julianday(data_matricula) AS INT) AS dias_matriculado
SELECT nome_aluno, 
       data_matricula, 
       CAST(julianday('now') - julianday(data_matricula) AS INT) AS dias_matriculado 
FROM tb_alunos;


-- 4. [Ficha do Responsável Financeiro]
-- Enunciado: Nome + profissão entre parênteses e telefone para responsáveis fora de Ourinhos.
-- MySQL: CONCAT(nome_responsavel, ' (', profissao, ')') AS responsavel_profissao
-- SQLite: (nome_responsavel || ' (' || profissao || ')') AS responsavel_profissao
SELECT (nome_responsavel || ' (' || profissao || ')') AS responsavel_profissao, 
       telefone_principal 
FROM tb_responsaveis 
WHERE cidade <> 'Ourinhos';


-- 5. [Padronização de E-mails de Contato]
-- Enunciado: Nome e e-mail em minúsculas para responsáveis com determinado domínio.
SELECT nome_responsavel, 
       LOWER(email_responsavel) AS email_padronizado 
FROM tb_responsaveis 
WHERE email_responsavel LIKE '%@email.com%' 
   OR email_responsavel LIKE '%@gmail.com%';


-- 6. [Relatório de Alunos Mais Jovens do Ano]
-- Enunciado: Top 10 alunos mais novos matriculados a partir de 2024 e com status 'Ativo'.
SELECT * 
FROM tb_alunos 
WHERE data_matricula >= '2024-01-01' 
  AND status_matricula = 'Ativo' 
ORDER BY data_nascimento DESC 
LIMIT 10;


-- 7. [Auditoria de Documentos Pendentes]
-- Enunciado: Alunos sem CPF cadastrado ou com observação médica registrada.
SELECT * 
FROM tb_alunos 
WHERE cpf_aluno IS NULL 
   OR observacoes_medicas IS NOT NULL;


-- 8. [Geração de Código de Matrícula Curto]
-- Enunciado: 3 primeiras letras do nome em caixa alta e nível de escolaridade.
SELECT UPPER(SUBSTRING(nome_aluno, 1, 3)) AS prefixo_nome, 
       nivel_escolaridade 
FROM tb_alunos;


-- 9. [Relatório de Evasão com Datas Formatadas]
-- Enunciado: Nome e data de matrícula no padrão brasileiro (DD/MM/AAAA) para alunos Trancados ou Cancelados.
-- MySQL: DATE_FORMAT(data_matricula, '%d/%m/%Y') AS data_matricula_br
-- SQLite: strftime('%d/%m/%Y', data_matricula) AS data_matricula_br
SELECT nome_aluno, 
       strftime('%d/%m/%Y', data_matricula) AS data_matricula_br 
FROM tb_alunos 
WHERE status_matricula IN ('Trancado', 'Cancelado');


-- 10. [Cadastro de Mães e Pais]
-- Enunciado: Responsáveis cujo parentesco seja 'Mãe' ou 'Pai', ordenados alfabeticamente.
SELECT * 
FROM tb_responsaveis 
WHERE parentesco IN ('Mãe', 'Pai') 
ORDER BY nome_responsavel ASC;


-- -------------------------------------------------------------------------
-- BLOCO 2: GESTÃO FINANCEIRA E COBRANÇA (tb_pagamentos)
-- -------------------------------------------------------------------------

-- 11. [Cobranças Pendentes com Juros Arredondados]
-- Enunciado: Boletos pendentes ou atrasados, com valor original e multa/juros arredondado para cima.
SELECT id_pagamento, 
       valor_original, 
       CEIL(valor_multa_juros) AS juros_teto 
FROM tb_pagamentos 
WHERE status_pagamento IN ('Pendente', 'Atrasado');


-- 12. [Simulação de Quitação de Boletos]
-- Enunciado: Simulação da fórmula (valor_original + valor_multa_juros - valor_desconto) arredondada com 2 casas.
SELECT id_pagamento, 
       valor_original, 
       valor_multa_juros, 
       valor_desconto, 
       ROUND(valor_original + valor_multa_juros - valor_desconto, 2) AS valor_final_simulado 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 13. [Histórico Contábil em Padrão Brasileiro]
-- Enunciado: Cobranças pagas exibindo vencimento e pagamento formatados no padrão BR (DD/MM/AAAA).
SELECT id_pagamento, 
       strftime('%d/%m/%Y', data_vencimento) AS vencimento_br, 
       strftime('%d/%m/%Y', data_pagamento) AS pagamento_br 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 14. [Dias de Atraso de Inadimplentes]
-- Enunciado: Dias decorridos entre o vencimento e hoje para pagamentos 'Atrasado'.
SELECT id_pagamento, 
       data_vencimento, 
       CAST(julianday('now') - julianday(data_vencimento) AS INT) AS dias_atraso 
FROM tb_pagamentos 
WHERE status_pagamento = 'Atrasado';


-- 15. [Ranking de Maiores Pagamentos no Pix ou Cartão]
-- Enunciado: Top 15 maiores pagamentos com valor > R$ 300,00 pagos no Pix ou Cartão.
SELECT * 
FROM tb_pagamentos 
WHERE valor_pago > 300.00 
  AND forma_pagamento IN ('Pix', 'Cartão de Crédito') 
ORDER BY valor_pago DESC 
LIMIT 15;


-- 16. [Auditoria de Boletos Sem Observação / Comprovante]
-- Enunciado: Cobranças do primeiro trimestre de 2025 sem comprovante registrado (IS NULL).
SELECT * 
FROM tb_pagamentos 
WHERE data_vencimento BETWEEN '2025-01-01' AND '2025-03-31' 
  AND numero_comprovante IS NULL;


-- 17. [Carimbo de Emissão de Relatório de Caixa]
-- Enunciado: Cobranças quitadas adicionando coluna virtual com data/hora do servidor.
-- MySQL: NOW() AS carimbo_extracao
-- SQLite: datetime('now') AS carimbo_extracao
SELECT id_pagamento, 
       valor_pago, 
       forma_pagamento, 
       datetime('now') AS carimbo_extracao 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';


-- 18. [Simulação de Reajuste em Cobranças Atrasadas / Pendentes]
-- Enunciado: Simular 10% de acréscimo sobre valor original arredondado para inteiro em cobranças pendentes.
SELECT id_pagamento, 
       valor_original, 
       ROUND(valor_original * 1.10, 0) AS valor_reajustado 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pendente';


-- -------------------------------------------------------------------------
-- BLOCO 3: CATÁLOGO DE CURSOS & TURMAS (tb_cursos e tb_turmas)
-- -------------------------------------------------------------------------

-- 19. [Catálogo de Investimento Inicial]
-- Enunciado: Nome do curso em maiúsculas e soma (mensalidade + material) ordenada do menor ao maior.
SELECT UPPER(nome_curso) AS curso_maiusculo, 
       (valor_mensalidade + valor_material_didatico) AS investimento_inicial 
FROM tb_cursos 
ORDER BY investimento_inicial ASC;


-- 20. [Cursos Intensivos de Curta Duração]
-- Enunciado: Cursos ativos, faixa etária Adultos/Geral/Teen e duração até 6 meses.
SELECT nome_curso, 
       idioma, 
       valor_mensalidade 
FROM tb_cursos 
WHERE ativo = 1 
  AND duracao_meses <= 6;


-- 21. [Resumo Didático dos Cursos de Idiomas]
-- Enunciado: Nome, nível CEFR e os primeiros 30 caracteres da descrição para Inglês ou Espanhol.
SELECT nome_curso, 
       nivel_quadro_comum, 
       SUBSTRING(descricao_curso, 1, 30) AS resumo_descricao 
FROM tb_cursos 
WHERE idioma IN ('Inglês', 'Espanhol');


-- 22. [Simulação de Mensalidade Inteira]
-- Enunciado: Nome, idioma e mensalidade arredondada sempre para CIMA (CEIL).
SELECT nome_curso, 
       idioma, 
       valor_mensalidade, 
       CEIL(valor_mensalidade) AS mensalidade_teto 
FROM tb_cursos;


-- 23. [Filtro de Nomes Extensos de Cursos]
-- Enunciado: Nome e contagem de caracteres para cursos com nomes maiores que 25 caracteres.
SELECT nome_curso, 
       LENGTH(nome_curso) AS tamanho_nome 
FROM tb_cursos 
WHERE LENGTH(nome_curso) > 25;


-- 24. [Grade Horária de Professores Específicos]
-- Enunciado: Código da turma, sala e horário unificado no formato 'HH:MM - HH:MM' para professores específicos.
-- MySQL: CONCAT(horario_inicio, ' - ', horario_fim) AS grade_horaria
-- SQLite: (horario_inicio || ' - ' || horario_fim) AS grade_horaria
SELECT codigo_turma, 
       sala_aula, 
       (horario_inicio || ' - ' || horario_fim) AS grade_horaria 
FROM tb_turmas 
WHERE nome_professor LIKE '%Smith%' 
   OR nome_professor LIKE '%Garcia%' 
   OR nome_professor LIKE '%Dubois%';


-- 25. [Top 5 Turmas com Maior Capacidade]
-- Enunciado: Código da turma em maiúsculas, professor e vagas máximas (Top 5).
SELECT UPPER(codigo_turma) AS turma_maiuscula, 
       nome_professor, 
       vagas_maximas 
FROM tb_turmas 
ORDER BY vagas_maximas DESC 
LIMIT 5;


-- -------------------------------------------------------------------------
-- BLOCO 4: AULAS & DIÁRIO DE CLASSE (tb_aulas)
-- -------------------------------------------------------------------------

-- 26. [Pesquisa de Aulas de Gramática e Vocabulário / Conversação]
-- Enunciado: Número da aula, data formatada no padrão BR e conteúdo contendo 'Gramática', 'Grammar' ou 'Conversação'.
SELECT numero_aula, 
       strftime('%d/%m/%Y', data_aula) AS data_aula_br, 
       conteudo_ministrado 
FROM tb_aulas 
WHERE conteudo_ministrado LIKE '%Gram%' 
   OR conteudo_ministrado LIKE '%Conversa%';


-- 27. [Investigação de Aulas Longas Sem Tarefa / Com Observação]
-- Enunciado: Número da aula, data e duração de aulas com 90 min ou mais sem tarefa ou observação.
SELECT numero_aula, 
       data_aula, 
       duracao_minutos 
FROM tb_aulas 
WHERE duracao_minutos >= 90;


-- 28. [Relatório de Ausências do Professor]
-- Enunciado: Data da aula, sala utilizada e observações para aulas em que o professor faltou (presenca = 0).
SELECT data_aula, 
       sala_utilizada, 
       observacoes_disciplina 
FROM tb_aulas 
WHERE presenca_professor = 0;


-- 29. [Duração de Aulas Convertida para Horas]
-- Enunciado: Primeiras 20 aulas exibindo número, conteúdo e duração em horas arredondada com 1 casa decimal.
SELECT numero_aula, 
       conteudo_ministrado, 
       ROUND(duracao_minutos / 60.0, 1) AS duracao_horas 
FROM tb_aulas 
LIMIT 20;


-- 30. [Ficha de Alocação de Turmas Noturnas]
-- Enunciado: Turmas noturnas (início >= 18:00) combinando dias da semana e sala no formato 'Dias - Sala'.
SELECT codigo_turma, 
       nome_professor, 
       (dias_semana || ' - ' || sala_aula) AS alocacao 
FROM tb_turmas 
WHERE horario_inicio >= '18:00';
