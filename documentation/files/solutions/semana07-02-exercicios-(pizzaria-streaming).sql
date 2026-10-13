-- =========================================================================
-- GABARITO OFICIAL: 20 EXERCÍCIOS DQL — STREAMFLIX
-- BANCO DE DADOS: db_streamflix
-- =========================================================================

USE db_streamflix;

-- -------------------------------------------------------------------------
-- Exercício 01: SELECT * (Seleção Total)
-- Liste todos os campos e registros da tabela tb_filmes.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes;

-- -------------------------------------------------------------------------
-- Exercício 02: SELECT colunas (Projeção)
-- Projete apenas os campos titulo, genero e nota_imdb da tabela tb_filmes.
-- -------------------------------------------------------------------------
SELECT titulo, genero, nota_imdb 
FROM tb_filmes;

-- -------------------------------------------------------------------------
-- Exercício 03: WHERE = (Filtro por Texto Exato)
-- Liste todos os assinantes da tabela tb_assinantes cujo plano seja exatamente 'Premium'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE plano = 'Premium';

-- -------------------------------------------------------------------------
-- Exercício 04: WHERE > (Filtro Numérico)
-- Selecione todos os filmes da tabela tb_filmes com duracao_minutos maior que 150 minutos (2h30).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE duracao_minutos > 150;

-- -------------------------------------------------------------------------
-- Exercício 05: WHERE <> (Operador de Diferença)
-- Liste todos os assinantes cujo status_assinatura seja diferente de 'Cancelado'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE status_assinatura <> 'Cancelado';

-- -------------------------------------------------------------------------
-- Exercício 06: WHERE Booleano
-- Selecione apenas os filmes que estão atualmente ativos no catálogo (no_catalogo = TRUE).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE no_catalogo = TRUE;

-- -------------------------------------------------------------------------
-- Exercício 07: Operador Lógico AND
-- Liste os filmes do gênero 'Ação' E que tenham nota_imdb maior ou igual a 8.0.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE genero = 'Ação' AND nota_imdb >= 8.0;

-- -------------------------------------------------------------------------
-- Exercício 08: Operador Lógico OR
-- Liste os assinantes que moram na cidade de 'Ourinhos' OU 'Assis'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE cidade = 'Ourinhos' OR cidade = 'Assis';

-- -------------------------------------------------------------------------
-- Exercício 09: Precedência AND + OR (Uso Obrigatório de Parênteses)
-- Liste os filmes em catálogo (no_catalogo = TRUE) das classificações etárias 'Livre' OU '10'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE no_catalogo = TRUE 
  AND (classificacao_etaria = 'Livre' OR classificacao_etaria = '10');

-- -------------------------------------------------------------------------
-- Exercício 10: ORDER BY ASC (Crescente)
-- Liste todos os filmes ordenados pelo ano_lancamento do mais antigo ao mais recente.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
ORDER BY ano_lancamento ASC;

-- -------------------------------------------------------------------------
-- Exercício 11: ORDER BY DESC (Decrescente)
-- Liste todos os assinantes ordenados pela mensalidade da mais alta para a mais baixa.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
ORDER BY mensalidade DESC;

-- -------------------------------------------------------------------------
-- Exercício 12: Cláusula LIMIT
-- Exiba apenas os 15 primeiros assinantes cadastrados na tabela tb_assinantes.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
LIMIT 15;

-- -------------------------------------------------------------------------
-- Exercício 13: Ranking (ORDER BY + LIMIT)
-- Selecione os 10 filmes melhor avaliados (nota_imdb) no catálogo.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
ORDER BY nota_imdb DESC 
LIMIT 10;

-- -------------------------------------------------------------------------
-- Exercício 14: LIKE '%texto%' (Busca por Conteúdo Parcial)
-- Encontre todos os filmes que contenham a palavra 'Código' OU 'Império' no titulo.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE titulo LIKE '%Código%' OR titulo LIKE '%Império%';

-- -------------------------------------------------------------------------
-- Exercício 15: LIKE 'texto%' (Busca por Início de Texto)
-- Selecione todos os assinantes da tabela tb_assinantes cujo email comece com a letra 'a'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE email LIKE 'a%';

-- -------------------------------------------------------------------------
-- Exercício 16: Operador IN (...)
-- Liste todos os filmes cujos gêneros sejam: 'Animação', 'Comédia' ou 'Ação'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE genero IN ('Animação', 'Comédia', 'Ação');

-- -------------------------------------------------------------------------
-- Exercício 17: Operador BETWEEN
-- Selecione os filmes lançados na década de 2000 (entre os anos 2000 e 2010 no ano_lancamento).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_filmes 
WHERE ano_lancamento BETWEEN 2000 AND 2010;

-- -------------------------------------------------------------------------
-- Exercício 18: Cláusula IS NULL
-- Faça uma consulta na tabela tb_assinantes buscando registros sem cidade preenchida (cidade IS NULL).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE cidade IS NULL;

-- -------------------------------------------------------------------------
-- Exercício 19: Cláusula IS NOT NULL
-- Liste todos os assinantes que possuem e-mail e cidade válidos e preenchidos.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_assinantes 
WHERE email IS NOT NULL AND cidade IS NOT NULL;

-- -------------------------------------------------------------------------
-- Exercício 20: Colunas Calculadas & AS (Alias)
-- Projete nome_cliente, mensalidade e crie a coluna calculada (mensalidade * 12) AS custo_anual.
-- -------------------------------------------------------------------------
SELECT nome_cliente, 
       mensalidade, 
       (mensalidade * 12) AS custo_anual 
FROM tb_assinantes;