-- ============================================
-- CORRIGIR STATUS DAS TRANSAÇÕES DE CARTÃO
-- Transações de cartão sem status definido devem ter 'pendente_fatura'
-- ============================================

-- Passo 1: Atualizar transações de cartão sem status → pendente_fatura
UPDATE transacoes 
SET status = 'pendente_fatura'
WHERE cartao_id IS NOT NULL 
  AND (status IS NULL OR status = '')
  AND pago = false;

-- Passo 2: Transações de cartão marcadas como pagas
UPDATE transacoes 
SET status = 'pago'
WHERE cartao_id IS NOT NULL 
  AND (status IS NULL OR status = '')
  AND pago = true;

-- Verificar resultado
SELECT 
  status, 
  COUNT(*) as total,
  CASE WHEN cartao_id IS NOT NULL THEN 'Cartão' ELSE 'Conta' END as tipo_pagamento
FROM transacoes 
GROUP BY status, (cartao_id IS NOT NULL)
ORDER BY tipo_pagamento, status;
