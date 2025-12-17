-- ============================================
-- CORREÇÃO COMPLETA: Configurar tipo_marcacao corretamente
-- ============================================
-- Execute este SQL DIRETAMENTE no Supabase Dashboard
-- 1. Abra: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em: SQL Editor
-- 4. Cole TODO este código
-- 5. Clique em RUN
-- ============================================

-- PASSO 1: Ver estado ATUAL (ANTES da correção)
SELECT 
  tipo,
  codigo,
  nome,
  tipo_marcacao,
  CASE 
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'curva' THEN '✅ CORRETO'
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'mercado' THEN '❌ ERRADO'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'mercado' THEN '✅ CORRETO'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'curva' THEN '⚠️ Pode ser mercado'
    ELSE '❓ Indefinido'
  END as status
FROM investimentos
WHERE ativo = true
ORDER BY tipo, codigo;

-- PASSO 2: FORÇAR renda_fixa genérica (CDB, LCI, LCA) para CURVA
UPDATE investimentos
SET tipo_marcacao = 'curva'
WHERE tipo = 'renda_fixa' 
  AND ativo = true;

-- PASSO 3: FORÇAR tesouro_direto para MERCADO
UPDATE investimentos
SET tipo_marcacao = 'mercado'
WHERE tipo = 'tesouro_direto'
  AND ativo = true;

-- PASSO 4: FORÇAR CRI/CRA/Debêntures para MERCADO (se existirem)
UPDATE investimentos
SET tipo_marcacao = 'mercado'
WHERE tipo IN ('cri', 'cra', 'debenture')
  AND ativo = true;

-- PASSO 5: Ver estado FINAL (DEPOIS da correção)
SELECT 
  tipo,
  codigo,
  nome,
  tipo_marcacao,
  CASE 
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'curva' THEN '✅ CORRETO'
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'mercado' THEN '❌ ERRADO'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'mercado' THEN '✅ CORRETO'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'curva' THEN '⚠️ Pode ser mercado'
    ELSE '❓ Indefinido'
  END as status
FROM investimentos
WHERE ativo = true
ORDER BY tipo, codigo;

-- PASSO 6: Resumo final por tipo
SELECT 
  tipo,
  tipo_marcacao,
  COUNT(*) as quantidade,
  CASE 
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'curva' THEN '✅'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'mercado' THEN '✅'
    ELSE '❌'
  END as correto
FROM investimentos
WHERE ativo = true
GROUP BY tipo, tipo_marcacao
ORDER BY tipo, tipo_marcacao;
