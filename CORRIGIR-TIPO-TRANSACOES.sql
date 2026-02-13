-- ============================================
-- CORRIGIR TRANSAÇÕES IMPORTADAS COM TIPO ERRADO
-- Transações com valor negativo no CSV foram importadas como
-- tipo='despesa' com Math.abs(). Precisamos corrigir.
-- ============================================

-- Passo 1: Ver todas as transações do cartão na fatura 03/2026
SELECT id, descricao, valor, tipo, fatura_mes, fatura_ano, observacao
FROM transacoes 
WHERE cartao_id IS NOT NULL 
  AND fatura_mes = 3 AND fatura_ano = 2026
ORDER BY data DESC;

-- Passo 2: Corrigir "PAGAMENTO EFETUADO" - é um crédito/pagamento, não despesa
UPDATE transacoes 
SET tipo = 'receita'
WHERE cartao_id IS NOT NULL
  AND descricao ILIKE '%PAGAMENTO EFETUADO%'
  AND tipo = 'despesa';

-- Passo 3: Corrigir estornos (valores muito pequenos como 0.04 que eram negativos)
-- Transações que são estornos/devoluções de outras compras
UPDATE transacoes 
SET tipo = 'receita'
WHERE cartao_id IS NOT NULL
  AND valor <= 0.05
  AND tipo = 'despesa'
  AND (
    descricao ILIKE '%COBASI%' 
    OR descricao ILIKE '%EVO*HV%'
  )
  AND fatura_mes = 3 AND fatura_ano = 2026;

-- Passo 4: Verificar resultado
SELECT tipo, COUNT(*) as qtd, SUM(valor) as total
FROM transacoes 
WHERE cartao_id IS NOT NULL 
  AND fatura_mes = 3 AND fatura_ano = 2026
GROUP BY tipo;

-- Passo 5: Ver total líquido da fatura
SELECT 
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as creditos,
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE -valor END) as total_liquido
FROM transacoes 
WHERE cartao_id IS NOT NULL 
  AND fatura_mes = 3 AND fatura_ano = 2026;
