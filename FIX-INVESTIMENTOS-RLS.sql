-- Verify and fix RLS policies for investimentos table
-- These policies should allow users to see only their own investimentos

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own investimentos" ON public.investimentos;
DROP POLICY IF EXISTS "Users can insert investimentos" ON public.investimentos;
DROP POLICY IF EXISTS "Users can insert their investimentos" ON public.investimentos;
DROP POLICY IF EXISTS "Users can update their investimentos" ON public.investimentos;
DROP POLICY IF EXISTS "Users can delete their investimentos" ON public.investimentos;

-- Recreate policies with correct syntax
CREATE POLICY "Users can view their own investimentos"
ON public.investimentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert investimentos"
ON public.investimentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their investimentos"
ON public.investimentos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their investimentos"
ON public.investimentos FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on investimentos
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;

-- Do the same for transacoes_investimentos
DROP POLICY IF EXISTS "Users can view their own transacoes_investimentos" ON public.transacoes_investimentos;
DROP POLICY IF EXISTS "Users can insert transacoes_investimentos" ON public.transacoes_investimentos;
DROP POLICY IF EXISTS "Users can insert their transacoes_investimentos" ON public.transacoes_investimentos;
DROP POLICY IF EXISTS "Users can update their transacoes_investimentos" ON public.transacoes_investimentos;
DROP POLICY IF EXISTS "Users can delete their transacoes_investimentos" ON public.transacoes_investimentos;

CREATE POLICY "Users can view their own transacoes_investimentos"
ON public.transacoes_investimentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transacoes_investimentos"
ON public.transacoes_investimentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their transacoes_investimentos"
ON public.transacoes_investimentos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their transacoes_investimentos"
ON public.transacoes_investimentos FOR DELETE
USING (auth.uid() = user_id);

ALTER TABLE public.transacoes_investimentos ENABLE ROW LEVEL SECURITY;

-- Do the same for cotacoes_historico
DROP POLICY IF EXISTS "Users can view cotacoes for their investimentos" ON public.cotacoes_historico;
DROP POLICY IF EXISTS "Users can insert cotacoes" ON public.cotacoes_historico;

CREATE POLICY "Users can view cotacoes for their investimentos"
ON public.cotacoes_historico FOR SELECT
USING (
  investimento_id IN (
    SELECT id FROM public.investimentos WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert cotacoes"
ON public.cotacoes_historico FOR INSERT
WITH CHECK (
  investimento_id IN (
    SELECT id FROM public.investimentos WHERE user_id = auth.uid()
  )
);

ALTER TABLE public.cotacoes_historico ENABLE ROW LEVEL SECURITY;
