-- Create investimentos table
CREATE TABLE IF NOT EXISTS public.investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('acao', 'renda_fixa', 'cripto', 'fii', 'etf', 'fundo', 'previdencia')),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  instituicao TEXT,
  quantidade DECIMAL(15, 4) NOT NULL,
  preco_medio DECIMAL(15, 2) NOT NULL,
  valor_total DECIMAL(15, 2) NOT NULL,
  data_primeira_compra DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  -- Campos específicos para Renda Fixa
  tipo_rentabilidade TEXT CHECK (tipo_rentabilidade IN ('pos', 'pre', 'ipca', 'hibrido')),
  taxa_percentual DECIMAL(5, 2),
  indexador TEXT CHECK (indexador IN ('cdi', 'ipca', 'selic', 'prefixado')),
  data_vencimento DATE,
  liquidez TEXT,
  data_aplicacao DATE,
  valor_bruto_resgate DECIMAL(15, 2),
  ir_retido DECIMAL(15, 2),
  isento_ir BOOLEAN DEFAULT false,
  valor_atual_manual DECIMAL(15, 2),
  aliquota_ir DECIMAL(5, 2),
  -- Marcação a Mercado
  tipo_marcacao TEXT CHECK (tipo_marcacao IN ('curva', 'mercado', 'manual')),
  percentual_vu DECIMAL(5, 2),
  preco_mercado DECIMAL(15, 2),
  data_marcacao DATE,
  fonte_marcacao TEXT CHECK (fonte_marcacao IN ('tesouro_direto', 'manual', 'api_secundario', 'estimado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tipo, codigo)
);

-- Create transacoes_investimentos table
CREATE TABLE IF NOT EXISTS public.transacoes_investimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investimento_id UUID NOT NULL REFERENCES public.investimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda', 'resgate')),
  quantidade DECIMAL(15, 4) NOT NULL,
  preco_unitario DECIMAL(15, 2) NOT NULL,
  valor_total DECIMAL(15, 2) NOT NULL,
  data_transacao DATE NOT NULL,
  taxa DECIMAL(15, 2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cotacoes_historico table
CREATE TABLE IF NOT EXISTS public.cotacoes_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investimento_id UUID NOT NULL REFERENCES public.investimentos(id) ON DELETE CASCADE,
  cotacao DECIMAL(15, 2) NOT NULL,
  data DATE NOT NULL,
  fonte TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(investimento_id, data)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON public.investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON public.investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_investimentos_user_id ON public.transacoes_investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_investimentos_investimento_id ON public.transacoes_investimentos(investimento_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_historico_investimento_id ON public.cotacoes_historico(investimento_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_historico_data ON public.cotacoes_historico(data);

-- Create RLS (Row Level Security) policies
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_historico ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own investimentos
CREATE POLICY "Users can view their own investimentos"
ON public.investimentos FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own investimentos
CREATE POLICY "Users can insert investimentos"
ON public.investimentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own investimentos
CREATE POLICY "Users can update their investimentos"
ON public.investimentos FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own investimentos
CREATE POLICY "Users can delete their investimentos"
ON public.investimentos FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Users can only see their own transacoes_investimentos
CREATE POLICY "Users can view their own transacoes_investimentos"
ON public.transacoes_investimentos FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own transacoes_investimentos
CREATE POLICY "Users can insert transacoes_investimentos"
ON public.transacoes_investimentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transacoes_investimentos
CREATE POLICY "Users can update their transacoes_investimentos"
ON public.transacoes_investimentos FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own transacoes_investimentos
CREATE POLICY "Users can delete their transacoes_investimentos"
ON public.transacoes_investimentos FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Users can view cotacoes for their investimentos
CREATE POLICY "Users can view cotacoes for their investimentos"
ON public.cotacoes_historico FOR SELECT
USING (
  investimento_id IN (
    SELECT id FROM public.investimentos WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert cotacoes for their investimentos
CREATE POLICY "Users can insert cotacoes"
ON public.cotacoes_historico FOR INSERT
WITH CHECK (
  investimento_id IN (
    SELECT id FROM public.investimentos WHERE user_id = auth.uid()
  )
);
