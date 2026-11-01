USE db_pizzaria_express;

-- 1. [Transformação em Caixa Alta - UPPER]
SELECT UPPER(nome_produto) AS produto_maiusculo, categoria 
FROM tb_produtos;

-- 2. [Concatenação de Cliente e Bairro - CONCAT]
SELECT CONCAT(nome_cliente, ' - ', bairro_entrega) AS cliente_local 
FROM tb_pedidos;

-- 3. [Arredondamento Padrão - ROUND]
SELECT id_pedido, valor_total, ROUND(valor_total, 0) AS valor_arredondado 
FROM tb_pedidos;

-- 4. [Teto Financeiro de Taxa - CEIL]
SELECT id_pedido, taxa_entrega, CEIL(taxa_entrega) AS taxa_teto 
FROM tb_pedidos;

-- 5. [Carimbo de Data e Hora - NOW()]
SELECT id_pedido, status_pedido, NOW() AS carimbo_servidor 
FROM tb_pedidos;

-- 6. [Data em Padrão Brasileiro - DATE_FORMAT]
SELECT id_pedido, data_pedido, DATE_FORMAT(data_pedido, '%d/%m/%Y') AS data_formatada_br 
FROM tb_pedidos;

-- 7. [Tamanho do Nome do Produto - LENGTH]
SELECT nome_produto, LENGTH(nome_produto) AS tamanho_nome 
FROM tb_produtos;

-- 8. [Extração de Prefixo de Texto - SUBSTRING]
SELECT nome_produto, SUBSTRING(nome_produto, 1, 3) AS prefixo_codigo 
FROM tb_produtos;

-- 9. [Piso do Preço do Produto - FLOOR]
SELECT nome_produto, preco, FLOOR(preco) AS preco_piso 
FROM tb_produtos;

-- 10. [Cálculo de Dias Decorridos - DATEDIFF]
SELECT id_pedido, data_pedido, DATEDIFF(NOW(), data_pedido) AS dias_decorridos 
FROM tb_pedidos;

-- 🎬 PARTE 2: Streamflix & Cinema (db_streamflix)
USE db_streamflix;

-- 11. [Padronização em Caixa Baixa - LOWER]
SELECT nome_cliente, LOWER(email) AS email_padronizado 
FROM tb_assinantes;

-- 12. [Junção de Ficha com Separador - CONCAT_WS]
SELECT CONCAT_WS(' | ', nome_cliente, plano, cidade) AS ficha_assinante 
FROM tb_assinantes;

-- 13. [Conversão de Duração para Horas - ROUND]
SELECT titulo, duracao_minutos, ROUND(duracao_minutos / 60.0, 1) AS duracao_horas 
FROM tb_filmes;

-- 14. [Simulação de Mensalidade Teto - CEIL]
SELECT nome_cliente, mensalidade, CEIL(mensalidade) AS mensalidade_teto 
FROM tb_assinantes;

-- 15. [Custo Anual com Arredondamento - ROUND]
SELECT nome_cliente, mensalidade, ROUND(mensalidade * 12, 2) AS custo_anual 
FROM tb_assinantes;

-- 16. [Data de Cadastro em Padrão BR - DATE_FORMAT]
SELECT nome_cliente, data_cadastro, DATE_FORMAT(data_cadastro, '%d/%m/%Y') AS cadastro_br 
FROM tb_assinantes;

-- 17. [Cálculo de Anos de Lançamento - YEAR / CURDATE]
SELECT titulo, ano_lancamento, (YEAR(CURDATE()) - ano_lancamento) AS anos_de_lancamento 
FROM tb_filmes;

-- 18. [Tempo de Contrato em Anos - TIMESTAMPDIFF]
SELECT nome_cliente, data_cadastro, TIMESTAMPDIFF(YEAR, data_cadastro, CURDATE()) AS anos_de_assinatura 
FROM tb_assinantes;

-- 19. [Filtro por Tamanho de Título - LENGTH]
SELECT titulo, genero 
FROM tb_filmes 
WHERE LENGTH(titulo) > 15;

-- 20. [Relatório Unificado com Funções Aninhadas]
SELECT id_assinante,
       UPPER(CONCAT(nome_cliente, ' - ', plano)) AS assinante_plano,
       CEIL(mensalidade) AS mensalidade_fechada,
       DATE_FORMAT(data_cadastro, '%d/%m/%Y') AS data_cadastro_br
FROM tb_assinantes;