-- Adicionar novos tipos de investimentos: Tesouro Direto, CRI, CRA, Debêntures
-- Comentário: A coluna 'tipo' em investimentos já é VARCHAR(50), então aceita qualquer string
-- Esta migration é apenas documentação dos novos tipos aceitos:
-- 'tesouro_direto', 'cri', 'cra', 'debenture'

-- Os tipos já existentes são:
-- 'acao', 'renda_fixa', 'cripto', 'fii', 'etf', 'fundo', 'previdencia'

-- Nenhuma alteração estrutural necessária, pois o campo já é VARCHAR(50)
-- Esta migration serve como documentação e pode ser usada para validação futura

-- Comentário informativo sobre os novos tipos:
COMMENT ON COLUMN investimentos.tipo IS 
'Tipos aceitos: acao, fii, etf, renda_fixa, tesouro_direto, cri, cra, debenture, cripto, fundo, previdencia';

-- Para Tesouro Direto, CRI, CRA e Debêntures, usar os campos de renda fixa:
-- - tipo_rentabilidade: pos, pre, ipca
-- - taxa_percentual: taxa anual
-- - indexador: cdi, ipca, selic, prefixado
-- - data_vencimento: data de vencimento
-- - liquidez: diaria (Tesouro), no_vencimento (CRI/CRA/Debênture)
