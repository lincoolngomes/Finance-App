-- Adicionar campos para marcação a mercado em investimentos
ALTER TABLE investimentos 
ADD COLUMN IF NOT EXISTS tipo_marcacao VARCHAR(20) DEFAULT 'curva', -- 'curva', 'mercado', 'manual'
ADD COLUMN IF NOT EXISTS percentual_vu DECIMAL(8, 4), -- % do Valor Unitário (ex: 98.50 = 98.5% do VU)
ADD COLUMN IF NOT EXISTS preco_mercado DECIMAL(18, 2), -- Preço unitário de mercado (para Tesouro Direto)
ADD COLUMN IF NOT EXISTS data_marcacao TIMESTAMP WITH TIME ZONE, -- Data da última marcação
ADD COLUMN IF NOT EXISTS fonte_marcacao VARCHAR(50); -- 'tesouro_direto', 'manual', 'api_secundario', 'estimado'

COMMENT ON COLUMN investimentos.tipo_marcacao IS 'Tipo de marcação: curva (projeção), mercado (preço atual), manual (informado)';
COMMENT ON COLUMN investimentos.percentual_vu IS 'Percentual do Valor Unitário para marcação a mercado (CRI/CRA/Debêntures)';
COMMENT ON COLUMN investimentos.preco_mercado IS 'Preço unitário de mercado (usado para Tesouro Direto)';
COMMENT ON COLUMN investimentos.data_marcacao IS 'Data/hora da última atualização de marcação a mercado';
COMMENT ON COLUMN investimentos.fonte_marcacao IS 'Origem da marcação: tesouro_direto, manual, api_secundario, estimado';
