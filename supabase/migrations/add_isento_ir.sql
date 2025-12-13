-- Adiciona coluna para identificar investimentos isentos de IR (LCI, LCA, CRI, CRA, Debêntures Incentivadas)
ALTER TABLE investimentos 
ADD COLUMN IF NOT EXISTS isento_ir BOOLEAN DEFAULT false;

-- Adiciona comentário explicativo
COMMENT ON COLUMN investimentos.isento_ir IS 'Indica se o investimento é isento de Imposto de Renda (ex: LCI, LCA, CRI, CRA, Debêntures Incentivadas)';
