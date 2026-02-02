-- ============================================
-- UPDATE: CDB DI com dados corretos
-- ============================================
-- AJUSTE ESTES VALORES CONFORME NECESSÁRIO:
-- 1. quantidade: 1 (número de unidades)
-- 2. preco_medio: 10000 (preço por unidade)
-- 3. valor_total: 10000 (quantidade × preco_medio)

UPDATE public.investimentos
SET
  quantidade = 1,  -- ← AJUSTE AQUI
  preco_medio = 10000,  -- ← AJUSTE AQUI
  valor_total = 10000,  -- ← AJUSTE AQUI (deve ser quantidade × preco_medio)
  data_aplicacao = '2026-02-02',
  data_vencimento = '2028-02-24',
  taxa_percentual = 101,
  indexador = 'cdi',
  tipo_rentabilidade = 'pos',
  isento_ir = false,
  liquidez = 'diaria'
WHERE id = 'fb4a3d94-ce1c-46fa-9a80-efc4e39b838d';

-- Verificar resultado
SELECT 
  codigo,
  nome,
  quantidade,
  preco_medio,
  valor_total,
  data_aplicacao,
  data_vencimento,
  taxa_percentual
FROM public.investimentos
WHERE codigo = 'CDB-DI';
