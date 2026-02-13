-- ============================================
-- ADICIONAR COLUNAS fatura_mes E fatura_ano NA TABELA transacoes
-- Isso permite associar transações à fatura correta,
-- independente da data real da compra (ex: compras parceladas)
-- ============================================

-- Passo 1: Adicionar as colunas
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS fatura_mes INTEGER;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS fatura_ano INTEGER;

-- Passo 2: Criar índice para buscas rápidas por fatura
CREATE INDEX IF NOT EXISTS idx_transacoes_fatura ON transacoes(cartao_id, fatura_ano, fatura_mes);

-- Passo 3: Preencher fatura_mes/fatura_ano para transações existentes
-- que já têm observacao com "Fatura MM/YYYY"
UPDATE transacoes 
SET 
  fatura_mes = CAST(SPLIT_PART(REPLACE(observacao, 'Fatura ', ''), '/', 1) AS INTEGER),
  fatura_ano = CAST(SPLIT_PART(REPLACE(observacao, 'Fatura ', ''), '/', 2) AS INTEGER)
WHERE 
  observacao LIKE 'Fatura %/%'
  AND fatura_mes IS NULL;

-- Passo 4: Para transações de cartão que NÃO têm referência de fatura,
-- preencher com base na data da transação (comportamento antigo)
UPDATE transacoes 
SET 
  fatura_mes = EXTRACT(MONTH FROM data::date),
  fatura_ano = EXTRACT(YEAR FROM data::date)
WHERE 
  cartao_id IS NOT NULL 
  AND fatura_mes IS NULL
  AND data IS NOT NULL;

-- Verificar resultado
SELECT fatura_mes, fatura_ano, COUNT(*) as total, 
       STRING_AGG(descricao, ', ' ORDER BY data) as exemplos
FROM transacoes 
WHERE cartao_id IS NOT NULL 
GROUP BY fatura_mes, fatura_ano
ORDER BY fatura_ano, fatura_mes;
