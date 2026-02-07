-- Create dividas table
CREATE TABLE IF NOT EXISTS public.dividas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cartao', 'emprestimo', 'financiamento', 'consignado', 'pessoal', 'outro')),
  credor TEXT,
  valor_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(15, 2) NOT NULL DEFAULT 0,
  taxa_juros DECIMAL(6, 2),
  parcelas_total INTEGER,
  parcelas_pagas INTEGER,
  valor_parcela DECIMAL(15, 2),
  vencimento_dia INTEGER CHECK (vencimento_dia BETWEEN 1 AND 31),
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pago', 'atrasado', 'renegociado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bens table
CREATE TABLE IF NOT EXISTS public.bens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('imovel', 'veiculo', 'eletronico', 'mobiliario', 'equipamento', 'investimento', 'outro')),
  localizacao TEXT,
  numero_serie TEXT,
  valor_compra DECIMAL(15, 2) NOT NULL DEFAULT 0,
  valor_atual DECIMAL(15, 2) NOT NULL DEFAULT 0,
  data_aquisicao DATE,
  garantia_ate DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vendido', 'perdido', 'doado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dividas_user_id ON public.dividas(user_id);
CREATE INDEX IF NOT EXISTS idx_dividas_status ON public.dividas(status);
CREATE INDEX IF NOT EXISTS idx_bens_user_id ON public.bens(user_id);
CREATE INDEX IF NOT EXISTS idx_bens_status ON public.bens(status);

-- Enable RLS
ALTER TABLE public.dividas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bens ENABLE ROW LEVEL SECURITY;

-- Policies for dividas
CREATE POLICY "Users can view their own dividas"
ON public.dividas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert dividas"
ON public.dividas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their dividas"
ON public.dividas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their dividas"
ON public.dividas FOR DELETE
USING (auth.uid() = user_id);

-- Policies for bens
CREATE POLICY "Users can view their own bens"
ON public.bens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert bens"
ON public.bens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bens"
ON public.bens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their bens"
ON public.bens FOR DELETE
USING (auth.uid() = user_id);
