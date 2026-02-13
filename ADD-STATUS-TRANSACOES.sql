-- Adicionar coluna 'status' na tabela transacoes
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT NULL;

-- Atualizar transações existentes de cartão
UPDATE transacoes 
SET status = CASE 
  WHEN pago = true THEN 'pago' 
  ELSE 'pendente_fatura' 
END
WHERE cartao_id IS NOT NULL AND status IS NULL;

-- Atualizar transações de conta
UPDATE transacoes 
SET status = CASE 
  WHEN pago = true THEN 'pago' 
  ELSE 'pendente' 
END
WHERE cartao_id IS NULL AND status IS NULL;
