-- ============================================================
-- CATEGORIZAR TRANSAÇÕES DE CARTÃO QUE NÃO TÊM CATEGORIA
-- Execute este SQL no Supabase SQL Editor para aplicar
-- categorias retroativamente a todas as transações do cartão
-- que foram importadas sem categoria_id.
-- ============================================================

-- 1) Verificar quantas transações de cartão estão sem categoria
SELECT COUNT(*) as total_sem_categoria 
FROM transacoes 
WHERE cartao_id IS NOT NULL 
  AND categoria_id IS NULL;

-- 2) Corrigir status das transações de cartão sem status
UPDATE transacoes 
SET status = CASE 
  WHEN pago = true THEN 'pago' 
  ELSE 'pendente_fatura' 
END
WHERE cartao_id IS NOT NULL 
  AND status IS NULL;

-- 3) A categorização retroativa será feita automaticamente pelo app
-- quando você abrir a página de Transações ou o Dashboard.
-- O app vai:
--   a) Detectar transações sem categoria_id
--   b) Usar as regras de categorização para determinar a categoria
--   c) Salvar a categoria_id no banco em background
-- 
-- Basta abrir o app e navegar para Transações ou Dashboard!
