-- CONSOLIDAÇÃO: Migrar dados de transacoes_investimentos para investimentos
-- O objetivo é manter tudo em UMA ÚNICA TABELA: investimentos

-- ============================================
-- PASSO 1: Copiar dados das transações para investimentos
-- ============================================

UPDATE public.investimentos inv
SET
  -- Copiar quantidade (soma de todas as transações)
  quantidade = (
    SELECT COALESCE(SUM(quantidade), 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  -- Copiar preço médio (último preço unitário registrado)
  preco_medio = (
    SELECT COALESCE(preco_unitario, 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
    ORDER BY data_transacao DESC
    LIMIT 1
  ),
  -- Copiar valor total (soma de todas as transações)
  valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  -- Copiar data de aplicação (primeira transação)
  data_aplicacao = (
    SELECT COALESCE(MIN(data_transacao), inv.data_aplicacao)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  updated_at = NOW()
WHERE
  -- Apenas para investimentos que têm transações
  EXISTS (
    SELECT 1 FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  );

-- ============================================
-- PASSO 2: Verificar resultado
-- ============================================

SELECT 
  id,
  codigo,
  nome,
  tipo,
  quantidade,
  preco_medio,
  valor_total,
  data_aplicacao,
  data_vencimento,
  tipo_rentabilidade,
  taxa_percentual,
  indexador
FROM public.investimentos
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- Resultado esperado:
-- O CDB-DI deve ter:
-- - quantidade: 10000
-- - preco_medio: 1300.00
-- - valor_total: 13000000.00 (ou o valor correto de valor_total)
-- ============================================
