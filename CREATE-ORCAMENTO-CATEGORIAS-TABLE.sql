-- Create orcamento_categorias table
CREATE TABLE IF NOT EXISTS public.orcamento_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  valor_planejado DECIMAL(15, 2) NOT NULL,
  valor_realizado DECIMAL(15, 2) DEFAULT 0,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, categoria_id, mes, ano)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_user_id ON public.orcamento_categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_categoria_id ON public.orcamento_categorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_mes_ano ON public.orcamento_categorias(mes, ano);
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_user_mes_ano ON public.orcamento_categorias(user_id, mes, ano);

-- Enable RLS (Row Level Security)
ALTER TABLE public.orcamento_categorias ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own orcamento_categorias
CREATE POLICY "Users can view their own orcamento_categorias"
ON public.orcamento_categorias FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own orcamento_categorias
CREATE POLICY "Users can insert orcamento_categorias"
ON public.orcamento_categorias FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own orcamento_categorias
CREATE POLICY "Users can update their orcamento_categorias"
ON public.orcamento_categorias FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own orcamento_categorias
CREATE POLICY "Users can delete their orcamento_categorias"
ON public.orcamento_categorias FOR DELETE
USING (auth.uid() = user_id);
