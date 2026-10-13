-- =========================================================================
-- GABARITO OFICIAL: 20 EXERCÍCIOS DQL — PIZZARIA EXPRESS
-- BANCO DE DADOS: db_pizzaria_express
-- =========================================================================

USE db_pizzaria_express;

-- -------------------------------------------------------------------------
-- Exercício 01: SELECT * (Seleção Total)
-- Liste todos os campos e registros da tabela tb_produtos.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos;

-- -------------------------------------------------------------------------
-- Exercício 02: SELECT colunas (Projeção)
-- Projete apenas os campos nome_produto, categoria e preco da tabela tb_produtos.
-- -------------------------------------------------------------------------
SELECT nome_produto, categoria, preco 
FROM tb_produtos;

-- -------------------------------------------------------------------------
-- Exercício 03: WHERE = (Filtro por Texto Exato)
-- Liste todos os pedidos da tabela tb_pedidos onde o status_pedido seja exatamente 'Entregue'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE status_pedido = 'Entregue';

-- -------------------------------------------------------------------------
-- Exercício 04: WHERE > (Filtro Numérico)
-- Selecione todos os produtos da tabela tb_produtos que custem mais de R$ 45,00.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
WHERE preco > 45.00;

-- -------------------------------------------------------------------------
-- Exercício 05: WHERE <> (Operador de Diferença)
-- Liste todos os pedidos onde a forma_pagamento seja diferente de 'Dinheiro'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE forma_pagamento <> 'Dinheiro';

-- -------------------------------------------------------------------------
-- Exercício 06: WHERE Booleano
-- Selecione apenas os produtos que estão atualmente disponíveis (disponivel = TRUE).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
WHERE disponivel = TRUE;

-- -------------------------------------------------------------------------
-- Exercício 07: Operador Lógico AND
-- Liste os produtos da categoria 'Pizza Salgada' E que custem menos de R$ 50,00.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
WHERE categoria = 'Pizza Salgada' AND preco < 50.00;

-- -------------------------------------------------------------------------
-- Exercício 08: Operador Lógico OR
-- Liste os pedidos com entrega realizada nos bairros 'Centro' OU 'Vila Perino'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE bairro_entrega = 'Centro' OR bairro_entrega = 'Vila Perino';

-- -------------------------------------------------------------------------
-- Exercício 09: Precedência AND + OR (Uso Obrigatório de Parênteses)
-- Liste os pedidos com status 'Entregue' E pagos em 'Pix' OU 'Cartão de Crédito'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE status_pedido = 'Entregue' 
  AND (forma_pagamento = 'Pix' OR forma_pagamento = 'Cartão de Crédito');

-- -------------------------------------------------------------------------
-- Exercício 10: ORDER BY ASC (Crescente)
-- Liste todos os produtos ordenados pelo preco do mais barato ao mais caro.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
ORDER BY preco ASC;

-- -------------------------------------------------------------------------
-- Exercício 11: ORDER BY DESC (Decrescente)
-- Liste todos os pedidos ordenados pelo valor_total do maior para o menor valor.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
ORDER BY valor_total DESC;

-- -------------------------------------------------------------------------
-- Exercício 12: Cláusula LIMIT
-- Exiba apenas os 10 primeiros pedidos cadastrados na tabela tb_pedidos.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
LIMIT 10;

-- -------------------------------------------------------------------------
-- Exercício 13: Ranking (ORDER BY + LIMIT)
-- Selecione o Top 5 produtos mais caros do cardápio (tb_produtos).
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
ORDER BY preco DESC 
LIMIT 5;

-- -------------------------------------------------------------------------
-- Exercício 14: LIKE '%texto%' (Busca por Conteúdo Parcial)
-- Encontre os produtos que contenham a palavra 'Mussarela' nos ingredientes_principais.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_produtos 
WHERE ingredientes_principais LIKE '%Mussarela%';

-- -------------------------------------------------------------------------
-- Exercício 15: LIKE 'texto%' (Busca por Início de Texto)
-- Selecione todos os clientes da tabela tb_pedidos cujo nome comece com a letra 'M'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE nome_cliente LIKE 'M%';

-- -------------------------------------------------------------------------
-- Exercício 16: Operador IN (...)
-- Selecione os pedidos entregues nos bairros: 'Jardim Matilde', 'Vila Brasil' e 'Jardim Ipê'.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE bairro_entrega IN ('Jardim Matilde', 'Vila Brasil', 'Jardim Ipê');

-- -------------------------------------------------------------------------
-- Exercício 17: Operador BETWEEN
-- Liste os pedidos cujo valor_total esteja na faixa entre R$ 50,00 e R$ 100,00.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE valor_total BETWEEN 50.00 AND 100.00;

-- -------------------------------------------------------------------------
-- Exercício 18: Cláusula IS NULL
-- Encontre todos os pedidos que NÃO possuem nenhuma observação cadastrada.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE observacao IS NULL;

-- -------------------------------------------------------------------------
-- Exercício 19: Cláusula IS NOT NULL
-- Liste todos os pedidos que possuem observações registradas pelo cliente.
-- -------------------------------------------------------------------------
SELECT * 
FROM tb_pedidos 
WHERE observacao IS NOT NULL;

-- -------------------------------------------------------------------------
-- Exercício 20: Colunas Calculadas & AS (Alias)
-- Projete nome_cliente, valor_total, taxa_entrega e crie a coluna calculada (valor_total + taxa_entrega) AS valor_final.
-- -------------------------------------------------------------------------
SELECT nome_cliente, 
       valor_total, 
       taxa_entrega, 
       (valor_total + taxa_entrega) AS valor_final 
FROM tb_pedidos;