-- Tabela para cache de CDI no banco de dados
CREATE TABLE IF NOT EXISTS public.cdi_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia DATE NOT NULL UNIQUE,
  taxa_diaria DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_cdi_cache_data ON public.cdi_cache(data_referencia DESC);

-- Função para buscar CDI do BC e cachear
CREATE OR REPLACE FUNCTION buscar_e_cachear_cdi(p_data_inicio DATE, p_data_fim DATE)
RETURNS DECIMAL AS $$
DECLARE
  v_fator DECIMAL := 1;
  v_taxa DECIMAL;
  v_data_atual DATE;
BEGIN
  -- Iterar por cada dia no período
  v_data_atual := p_data_inicio;
  
  WHILE v_data_atual <= p_data_fim LOOP
    -- Tentar buscar do cache
    SELECT taxa_diaria INTO v_taxa
    FROM public.cdi_cache
    WHERE data_referencia = v_data_atual;
    
    -- Se não estiver no cache, usar valor padrão (0.02% ao dia = 6.2% a.a.)
    IF v_taxa IS NULL THEN
      v_taxa := 0.000218;
    END IF;
    
    -- Acumular o fator
    v_fator := v_fator * (1 + v_taxa);
    v_data_atual := v_data_atual + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_fator;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Permissões
GRANT EXECUTE ON FUNCTION buscar_e_cachear_cdi(DATE, DATE) TO authenticated;
