-- CONSOLIDAÇÃO: Mover dados de transacoes_investimentos para investimentos
-- Objetivo: Manter tudo em uma única tabela "investimentos"

-- Passo 1: Verificar dados em ambas as tabelas
SELECT 'TRANSACOES_INVESTIMENTOS' as tabela, id, quantidade, preco_unitario, valor_total, data_transacao FROM public.transacoes_investimentos LIMIT 5;

SELECT 'INVESTIMENTOS' as tabela, id, quantidade, preco_medio, valor_total FROM public.investimentos WHERE codigo = 'CDB-DI' LIMIT 5;

-- Passo 2: COPIAR DADOS de transacoes_investimentos para investimentos
-- Para cada transação do CDB-DI, atualizar o investimento com os dados corretos

UPDATE public.investimentos
SET
  quantidade = COALESCE(
    (SELECT SUM(quantidade) FROM public.transacoes_investimentos 
     WHERE investimento_id = public.investimentos.id),
    0
  ),
  preco_medio = COALESCE(
    (SELECT preco_unitario FROM public.transacoes_investimentos 
     WHERE investimento_id = public.investimentos.id
     ORDER BY data_transacao DESC LIMIT 1),
    0
  ),
  valor_total = COALESCE(
    (SELECT SUM(valor_total) FROM public.transacoes_investimentos 
     WHERE investimento_id = public.investimentos.id),
    0
  ),
  data_aplicacao = COALESCE(
    (SELECT MIN(data_transacao) FROM public.transacoes_investimentos 
     WHERE investimento_id = public.investimentos.id),
    data_aplicacao
  )
WHERE id IN (
  SELECT DISTINCT investimento_id FROM public.transacoes_investimentos
);

-- Passo 3: Verificar resultado
SELECT 
  codigo,
  nome,
  tipo,
  quantidade,
  preco_medio,
  valor_total,
  data_aplicacao,
  tipo_rentabilidade,
  taxa_percentual,
  indexador
FROM public.investimentos
WHERE codigo = 'CDB-DI';

-- Passo 4: OPCIONAL - Se tudo correu bem, podemos deletar a tabela transacoes_investimentos
-- CUIDADO: Execute apenas após confirmar que os dados foram copiados!
-- DROP TABLE public.transacoes_investimentos;

-- Ou apenas desabilitar RLS para não interferir
-- ALTER TABLE public.transacoes_investimentos DISABLE ROW LEVEL SECURITY;
