-- Atualizar CDB DI com valores reais para testar cálculo de CDI acumulado
-- O app vai buscar o CDI acumulado do Banco Central e calcular a rentabilidade automaticamente

UPDATE public.investimentos
SET
  quantidade = 1,
  preco_medio = 25000.00,
  valor_total = 25000.00,
  data_aplicacao = '2025-01-02',  -- Data de início do período de CDI
  data_vencimento = '2028-02-24',
  tipo_rentabilidade = 'pos',      -- Pós-fixado (% do CDI)
  taxa_percentual = 101,            -- 101% do CDI
  indexador = 'cdi',                -- Indexado ao CDI
  isento_ir = false,                -- Sujeito a IR
  liquidez = 'diaria',              -- Resgate a qualquer momento
  ativo = true,
  updated_at = NOW()
WHERE id = 'fb4a3d94-ce1c-46fa-9a80-efc4e39b838d';

-- Verificar o resultado
SELECT 
  id,
  codigo,
  nome,
  quantidade,
  preco_medio,
  valor_total,
  data_aplicacao,
  data_vencimento,
  taxa_percentual,
  indexador,
  tipo_rentabilidade,
  isento_ir,
  liquidez
FROM public.investimentos
WHERE id = 'fb4a3d94-ce1c-46fa-9a80-efc4e39b838d';

-- EXPLICAÇÃO DO CÁLCULO:
-- O app vai:
-- 1. Buscar CDI acumulado de 2025-01-02 até hoje (02/02/2026)
-- 2. Calcular: rendimentoCDI = fatorCDI - 1
-- 3. Aplicar percentual: 101% do CDI = percentualContratado = 1.01
-- 4. Valor bruto = 25000 × (1 + (rendimentoCDI × 1.01))
-- 5. Calcular IR de acordo com a tabela regressiva (quanto mais dias, menor a alíquota)
-- 6. Valor líquido = valor bruto - IR
-- 7. Rentabilidade = valor líquido - 25000
