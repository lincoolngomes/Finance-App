-- Corrigir transações onde userid é null e user_id está preenchido
-- Isso já está OK, então vamos apenas verificar

-- Verificar estado das transações
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN userid IS NOT NULL THEN 1 END) as userid_preenchido,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_id_preenchido
FROM transacoes;

-- Ver algumas transações
SELECT id, userid, user_id, data, descricao 
FROM transacoes 
LIMIT 5;
