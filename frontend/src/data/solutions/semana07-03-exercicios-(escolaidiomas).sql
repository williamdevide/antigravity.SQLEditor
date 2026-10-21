-- =========================================================================
-- GABARITO OFICIAL (V2): 40 EXERCÍCIOS DQL — ESCOLA DE IDIOMAS
-- BANCO DE DADOS: semana07-03-dados-sqlite-exercicios.sql
-- =========================================================================

-- -------------------------------------------------------------------------
-- PARTE 1: Exercícios Guiados (Linguagem Natural Híbrida - 01 a 20)
-- -------------------------------------------------------------------------

-- 1. [Seleção Total]
SELECT * FROM tb_alunos;

-- 2. [Projeção de Colunas]
SELECT nome_curso, idioma, valor_mensalidade FROM tb_cursos;

-- 3. [Filtro de Texto Exato]
SELECT * FROM tb_alunos WHERE status_matricula = 'Ativo';

-- 4. [Filtro Numérico]
SELECT * FROM tb_cursos WHERE valor_mensalidade > 350.00;

-- 5. [Operador de Diferença]
SELECT * FROM tb_pagamentos WHERE forma_pagamento <> 'Pix';

-- 6. [Filtro Booleano]
SELECT * FROM tb_cursos WHERE ativo = TRUE;

-- 7. [Operador Lógico AND]
SELECT * FROM tb_turmas WHERE status_turma = 'Em Andamento' AND sala_aula = 'Sala 101';

-- 8. [Operador Lógico OR]
SELECT * FROM tb_responsaveis WHERE cidade = 'Ourinhos' OR cidade = 'Assis';

-- 9. [Precedência AND/OR]
SELECT * FROM tb_alunos 
WHERE status_matricula = 'Ativo' 
  AND (nivel_escolaridade = 'Ensino Médio' OR nivel_escolaridade = 'Ensino Superior');

-- 10. [Ordenação Crescente]
SELECT * FROM tb_responsaveis ORDER BY nome_responsavel ASC;

-- 11. [Ordenação Decrescente]
SELECT * FROM tb_pagamentos ORDER BY valor_pago DESC;

-- 12. [Cláusula LIMIT]
SELECT * FROM tb_aulas LIMIT 10;

-- 13. [Ranking com Ordenação e Limite]
SELECT * FROM tb_cursos ORDER BY valor_mensalidade DESC LIMIT 5;

-- 14. [Busca Parcial Contém - LIKE %...%]
SELECT * FROM tb_aulas WHERE conteudo_ministrado LIKE '%Grammar%';

-- 15. [Busca Parcial Inicia - LIKE ...%]
SELECT * FROM tb_alunos WHERE nome_aluno LIKE 'M%';

-- 16. [Operador de Lista IN]
SELECT * FROM tb_cursos WHERE idioma IN ('Inglês', 'Espanhol', 'Francês');

-- 17. [Operador de Intervalo BETWEEN]
SELECT * FROM tb_pagamentos WHERE data_vencimento BETWEEN '2025-01-01' AND '2025-03-31';

-- 18. [Tratamento de Nulos IS NULL]
SELECT * FROM tb_alunos WHERE observacoes_medicas IS NULL;

-- 19. [Tratamento de Nulos IS NOT NULL]
SELECT * FROM tb_pagamentos WHERE data_pagamento IS NOT NULL;

-- 20. [Coluna Calculada & Alias]
SELECT id_pagamento, 
       valor_original, 
       valor_multa_juros, 
       valor_desconto, 
       (valor_original + valor_multa_juros - valor_desconto) AS valor_final_calculado 
FROM tb_pagamentos;


-- -------------------------------------------------------------------------
-- PARTE 2: Desafios de Interpretação e Regras de Negócio (21 a 40)
-- -------------------------------------------------------------------------

-- 21. [Filtro de Cadastro]
SELECT nome_responsavel, email_responsavel, telefone_principal 
FROM tb_responsaveis 
WHERE profissao IN ('Engenheiro', 'Professor');

-- 22. [Análise de Capacidade]
SELECT codigo_turma, nome_professor, vagas_maximas 
FROM tb_turmas 
WHERE vagas_maximas >= 15;

-- 23. [Relatório de Aulas Ministradas]
SELECT numero_aula, data_aula, conteudo_ministrado 
FROM tb_aulas 
WHERE presenca_professor = TRUE AND duracao_minutos >= 60;

-- 24. [Controle de Adimplência]
SELECT * FROM tb_pagamentos 
WHERE status_pagamento IN ('Pendente', 'Atrasado') 
ORDER BY data_vencimento ASC;

-- 25. [Identificação de Alunos Menores]
SELECT nome_aluno, data_nascimento, email_aluno 
FROM tb_alunos 
WHERE data_nascimento >= '2010-01-01';

-- 26. [Lista de Pagamentos Liquidados]
SELECT * FROM tb_pagamentos 
WHERE status_pagamento = 'Pago';

-- 27. [Cursos Intensivos Ativos]
SELECT nome_curso, idioma, valor_mensalidade 
FROM tb_cursos 
WHERE ativo = TRUE AND duracao_meses <= 6;

-- 28. [Busca por Domínio de E-mail]
SELECT nome_responsavel, email_responsavel, telefone_principal 
FROM tb_responsaveis 
WHERE email_responsavel LIKE '%@gmail.com';

-- 29. [Ordenação Dupla de Turmas]
SELECT * FROM tb_turmas 
WHERE status_turma = 'Em Andamento' 
ORDER BY nome_professor ASC, horario_inicio ASC;

-- 30. [Custo de Investimento Inicial]
SELECT nome_curso, valor_mensalidade, valor_material_didatico, 
       (valor_mensalidade + valor_material_didatico) AS investimento_inicial 
FROM tb_cursos;

-- 31. [Filtragem por Forma de Pagamento]
SELECT * FROM tb_pagamentos 
WHERE data_pagamento IS NOT NULL 
  AND forma_pagamento NOT IN ('Dinheiro', 'Pix');

-- 32. [Alunos com Matrícula Inativa / Trancada]
SELECT nome_aluno, telefone_aluno, data_matricula 
FROM tb_alunos 
WHERE data_matricula >= '2023-01-01' 
  AND status_matricula IN ('Trancado', 'Cancelado');

-- 33. [Ranking das 5 Turmas com Mais Vagas]
SELECT codigo_turma, nome_professor, sala_aula, vagas_maximas 
FROM tb_turmas 
ORDER BY vagas_maximas DESC 
LIMIT 5;

-- 34. [Turmas Noturnas por Código]
SELECT * FROM tb_turmas 
WHERE codigo_turma LIKE 'TURMA%' 
  AND horario_inicio >= '18:00';

-- 35. [Simulação de Desconto Promocional]
SELECT id_pagamento, valor_original, 
       (valor_original - 20.00) AS valor_com_desconto_promocional 
FROM tb_pagamentos 
WHERE status_pagamento = 'Pendente';

-- 36. [Aulas com Tarefa e Recursos Multimídia]
SELECT data_aula, numero_aula, conteudo_ministrado 
FROM tb_aulas 
WHERE tarefa_casa_assinalada IS NOT NULL 
  AND recursos_utilizados IN ('Projetor e Audio', 'Lousa Digital');

-- 37. [Responsáveis de Outras Cidades]
SELECT nome_responsavel, parentesco, cidade, telefone_principal 
FROM tb_responsaveis 
WHERE cidade <> 'Ourinhos';

-- 38. [Pagamentos com Cobrança de Multa / Juros]
SELECT id_pagamento, data_vencimento, data_pagamento, valor_multa_juros, valor_pago 
FROM tb_pagamentos 
WHERE valor_multa_juros > 0 
ORDER BY valor_multa_juros DESC;

-- 39. [Cursos Avançados com Carga Horária Elevada]
SELECT * FROM tb_cursos 
WHERE nivel_quadro_comum IN ('B2', 'C1') 
  AND carga_horaria_total >= 120;

-- 40. [Alunos Mais Jovens do Ensino Fundamental / Médio]
SELECT nome_aluno, data_nascimento, nivel_escolaridade 
FROM tb_alunos 
WHERE nivel_escolaridade IN ('Ensino Fundamental', 'Ensino Médio') 
ORDER BY data_nascimento DESC 
LIMIT 10;
