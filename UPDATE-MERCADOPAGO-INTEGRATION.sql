-- ============================================
-- ATUALIZAÇÃO: SISTEMA DE ASSINATURAS COM MERCADO PAGO
-- ============================================
-- Este script atualiza a tabela subscriptions existente
-- e cria as novas estruturas para Mercado Pago
-- ============================================

-- 1. ADICIONAR NOVAS COLUNAS À TABELA SUBSCRIPTIONS EXISTENTE
DO $$ 
BEGIN
    -- Adicionar colunas do Mercado Pago se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_payment_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN mp_payment_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_subscription_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN mp_subscription_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_preapproval_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN mp_preapproval_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_payer_email') THEN
        ALTER TABLE public.subscriptions ADD COLUMN mp_payer_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_payer_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN mp_payer_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'created_by') THEN
        ALTER TABLE public.subscriptions ADD COLUMN created_by TEXT NOT NULL DEFAULT 'self' CHECK (created_by IN ('mercadopago', 'admin', 'self'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'trial_end_date') THEN
        ALTER TABLE public.subscriptions ADD COLUMN trial_end_date TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'metadata') THEN
        ALTER TABLE public.subscriptions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. TABELA DE TRANSAÇÕES DO MERCADO PAGO
CREATE TABLE IF NOT EXISTS public.mercadopago_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- IDs do Mercado Pago
    payment_id TEXT NOT NULL UNIQUE,
    preference_id TEXT,
    merchant_order_id TEXT,
    
    -- Informações do pagador
    payer_email TEXT NOT NULL,
    payer_name TEXT,
    payer_id TEXT,
    
    -- Detalhes do pagamento
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'rejected', 'refunded', 'cancelled')),
    status_detail TEXT,
    payment_method TEXT, -- pix, credit_card, debit_card, etc
    payment_type TEXT,
    
    -- Informações do produto/plano
    plan_type TEXT,
    description TEXT,
    
    -- Timestamps
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Payload completo do webhook
    webhook_payload JSONB NOT NULL,
    
    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_payment ON public.subscriptions(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_subscription ON public.subscriptions(mp_subscription_id);

CREATE INDEX IF NOT EXISTS idx_mp_transactions_email ON public.mercadopago_transactions(payer_email);
CREATE INDEX IF NOT EXISTS idx_mp_transactions_payment_id ON public.mercadopago_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_transactions_status ON public.mercadopago_transactions(status);

-- 4. TRIGGER PARA UPDATED_AT (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mp_transactions_updated_at ON public.mercadopago_transactions;
CREATE TRIGGER update_mp_transactions_updated_at
    BEFORE UPDATE ON public.mercadopago_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. FUNÇÃO PARA VERIFICAR ACESSO ATIVO
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.subscriptions
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (
            end_date IS NULL -- Assinatura vitalícia/sem fim
            OR end_date > NOW() -- Assinatura ainda válida
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA OBTER INFORMAÇÕES DA ASSINATURA
DROP FUNCTION IF EXISTS public.get_subscription_info(uuid);

CREATE OR REPLACE FUNCTION public.get_subscription_info(user_uuid UUID)
RETURNS TABLE (
    plan_type TEXT,
    status TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    days_remaining INTEGER,
    is_trial BOOLEAN,
    created_by TEXT,
    payment_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan_type,
        s.status,
        s.start_date,
        s.end_date,
        CASE 
            WHEN s.end_date IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER
        END as days_remaining,
        s.plan_type = 'trial' as is_trial,
        s.created_by,
        (s.metadata->>'payment_method')::TEXT
    FROM public.subscriptions s
    WHERE s.user_id = user_uuid
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercadopago_transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access transactions" ON public.mercadopago_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.mercadopago_transactions;

-- Política: Usuários podem ver apenas suas próprias assinaturas
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Política: Apenas admins podem inserir/atualizar assinaturas manualmente
CREATE POLICY "Admins can manage subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Política: Service role pode fazer tudo (para Edge Functions)
CREATE POLICY "Service role full access subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access transactions"
    ON public.mercadopago_transactions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Política: Admins podem ver todas as transações
CREATE POLICY "Admins can view all transactions"
    ON public.mercadopago_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 8. FUNÇÃO PARA EXPIRAR ASSINATURAS AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. TABELA DE PLANOS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly', 'lifetime')),
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    trial_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir planos padrão (só se não existirem)
INSERT INTO public.subscription_plans (name, description, plan_type, price, trial_days, features) 
VALUES
('Mensal', 'Acesso completo ao Finance App', 'monthly', 29.90, 7, 
 '["Controle financeiro completo", "Gestão de investimentos", "Relatórios e gráficos", "Importação de extratos", "Suporte prioritário"]'::jsonb),
('Anual', 'Acesso completo ao Finance App - Economize 30%', 'yearly', 249.90, 7,
 '["Controle financeiro completo", "Gestão de investimentos", "Relatórios e gráficos", "Importação de extratos", "Suporte prioritário", "2 meses grátis"]'::jsonb),
('Vitalício', 'Acesso completo para sempre', 'lifetime', 597.00, 0,
 '["Controle financeiro completo", "Gestão de investimentos", "Relatórios e gráficos", "Importação de extratos", "Suporte prioritário", "Atualizações vitalícias", "Acesso antecipado a novos recursos"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver estrutura da tabela subscriptions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- ============================================
-- CONCLUÍDO! ✅
-- ============================================
-- A tabela subscriptions foi atualizada com sucesso!
-- Execute este script no lugar do anterior.
-- ============================================
