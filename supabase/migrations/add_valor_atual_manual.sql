-- Adicionar coluna para valor atual manual em investimentos
ALTER TABLE investimentos 
ADD COLUMN IF NOT EXISTS valor_atual_manual NUMERIC;

COMMENT ON COLUMN investimentos.valor_atual_manual IS 'Valor atual informado manualmente pelo usuário (sobrescreve cálculo automático)';
