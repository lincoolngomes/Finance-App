-- Atualizar o investimento CDB DI com valores reais
-- Este é um exemplo - AJUSTE OS VALORES CONFORME NECESSÁRIO

UPDATE public.investimentos
SET
  quantidade = 1,
  preco_medio = 25000,
  valor_total = 25000,
  data_aplicacao = '2026-02-01',
  data_vencimento = '2028-02-24',
  data_primeira_compra = '2026-02-01'
WHERE id = 'fb4a3d94-ce1c-46fa-9a80-efc4e39b838d'
  AND codigo = 'CDB-DI';

-- Verificar o resultado
SELECT 
  codigo,
  nome,
  quantidade,
  preco_medio,
  valor_total,
  data_aplicacao,
  data_vencimento,
  taxa_percentual,
  indexador
FROM public.investimentos
WHERE codigo = 'CDB-DI';
