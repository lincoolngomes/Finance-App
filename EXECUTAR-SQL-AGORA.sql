-- ============================================
-- CORREÇÃO DEFINITIVA - Execute AGORA no Supabase
-- ============================================
-- 1. Abra: https://supabase.com/dashboard
-- 2. SQL Editor → New Query
-- 3. Cole TUDO abaixo
-- 4. Clique RUN
-- ============================================

-- REGRA DEFINITIVA:
-- ✅ MERCADO: Tesouro IPCA+, Tesouro Pré, Tesouro Selic, CRI, CRA, Debêntures
-- ❌ CURVA: CDB, LCI, LCA, LC (renda_fixa genérica)

-- 1. FORÇAR todos 'renda_fixa' para CURVA
UPDATE investimentos
SET tipo_marcacao = 'curva'
WHERE tipo = 'renda_fixa';

-- 2. FORÇAR todos 'tesouro_direto' para MERCADO
UPDATE investimentos
SET tipo_marcacao = 'mercado'
WHERE tipo = 'tesouro_direto';

-- 3. FORÇAR CRI/CRA/Debêntures para MERCADO
UPDATE investimentos
SET tipo_marcacao = 'mercado'
WHERE tipo IN ('cri', 'cra', 'debenture');

-- 4. Verificar resultado
SELECT 
  tipo,
  codigo,
  nome,
  tipo_marcacao,
  CASE 
    WHEN tipo = 'renda_fixa' AND tipo_marcacao = 'curva' THEN '✅ CORRETO'
    WHEN tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture') AND tipo_marcacao = 'mercado' THEN '✅ CORRETO'
    ELSE '❌ ERRADO'
  END as status
FROM investimentos
ORDER BY tipo, codigo;
