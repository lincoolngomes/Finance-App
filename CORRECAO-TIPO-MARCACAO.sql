-- ============================================
-- CORREÇÃO: Tipo de Marcação para Investimentos
-- ============================================
-- Data: 14/12/2025
-- 
-- Este script corrige o tipo_marcacao dos investimentos
-- para respeitar as regras de marcação a mercado:
--
-- PODEM usar 'mercado':
--   - tesouro_direto (Tesouro IPCA+, Pré, Selic)
--   - cri (Certificados de Recebíveis Imobiliários)
--   - cra (Certificados de Recebíveis do Agronegócio)
--   - debenture (Debêntures)
--
-- SEMPRE usam 'curva':
--   - renda_fixa (CDB, LCI, LCA, LC genéricos)
--   - Qualquer outro tipo
-- ============================================

-- 1. FORÇAR todos os investimentos de renda_fixa genérica para 'curva'
UPDATE investimentos
SET tipo_marcacao = 'curva'
WHERE tipo = 'renda_fixa';

-- 2. Verificar quantos foram atualizados
SELECT 
  tipo,
  tipo_marcacao,
  COUNT(*) as quantidade
FROM investimentos
WHERE tipo IN ('renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture')
GROUP BY tipo, tipo_marcacao
ORDER BY tipo, tipo_marcacao;

-- 3. Mostrar investimentos que podem usar marcação a mercado
SELECT 
  id,
  tipo,
  codigo,
  nome,
  tipo_marcacao,
  created_at
FROM investimentos
WHERE tipo IN ('tesouro_direto', 'cri', 'cra', 'debenture')
ORDER BY tipo, codigo;
