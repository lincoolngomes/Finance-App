-- Verificar se existem transações de investimento
SELECT 
  COUNT(*) as total_transacoes,
  investimento_id,
  tipo,
  quantidade,
  valor_total,
  data_transacao
FROM public.transacoes_investimentos
GROUP BY investimento_id, tipo, quantidade, valor_total, data_transacao
ORDER BY data_transacao DESC;

-- Verificar o investimento CDB DI
SELECT 
  id,
  user_id,
  tipo,
  codigo,
  nome,
  quantidade,
  preco_medio,
  valor_total,
  created_at
FROM public.investimentos
WHERE codigo = 'CDB-DI'
ORDER BY created_at DESC;
