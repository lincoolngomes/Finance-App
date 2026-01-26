-- ============================================
-- SISTEMA DE ASSINATURAS COM KIWIFY
-- ============================================
-- Este script cria toda estrutura necessária para:
-- 1. Gerenciar assinaturas (gratuitas e pagas)
-- 2. Receber webhooks do Kiwify
-- 3. Controlar acesso ao sistema
-- ============================================

-- 1. TABELA DE ASSINATURAS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo e status da assinatura
    plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'trial', 'monthly', 'yearly', 'lifetime')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    
    -- Informações do Kiwify (null se for cadastro gratuito/manual)
    kiwify_transaction_id TEXT UNIQUE,
    kiwify_subscription_id TEXT,
    kiwify_product_id TEXT,
    kiwify_customer_email TEXT,
    
    -- Datas importantes
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    trial_end_date TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Informações de criação
    created_by TEXT NOT NULL DEFAULT 'self' CHECK (created_by IN ('kiwify', 'admin', 'self')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraint: usuário só pode ter uma assinatura ativa
    CONSTRAINT unique_active_subscription UNIQUE (user_id)
);

-- 2. TABELA DE TRANSAÇÕES DO KIWIFY
CREATE TABLE IF NOT EXISTS public.kiwify_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Dados da transação
    transaction_id TEXT NOT NULL UNIQUE,
    order_id TEXT,
    product_id TEXT NOT NULL,
    product_name TEXT,
    
    -- Informações do cliente
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    
    -- Valores
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    -- Status da transação
    status TEXT NOT NULL CHECK (status IN ('paid', 'refunded', 'cancelled', 'pending')),
    payment_method TEXT,
    
    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Payload completo do webhook
    webhook_payload JSONB NOT NULL,
    
    -- Metadados
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_kiwify_transaction ON public.subscriptions(kiwify_transaction_id);

CREATE INDEX IF NOT EXISTS idx_kiwify_transactions_email ON public.kiwify_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_kiwify_transactions_transaction_id ON public.kiwify_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_kiwify_transactions_status ON public.kiwify_transactions(status);

-- 4. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
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
CREATE OR REPLACE FUNCTION public.get_subscription_info(user_uuid UUID)
RETURNS TABLE (
    plan_type TEXT,
    status TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    days_remaining INTEGER,
    is_trial BOOLEAN,
    created_by TEXT
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
        s.created_by
    FROM public.subscriptions s
    WHERE s.user_id = user_uuid
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS (ROW LEVEL SECURITY)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiwify_transactions ENABLE ROW LEVEL SECURITY;

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
    ON public.kiwify_transactions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Política: Admins podem ver todas as transações
CREATE POLICY "Admins can view all transactions"
    ON public.kiwify_transactions
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

-- 9. INSERIR DADOS EXEMPLO (OPCIONAL - COMENTADO)
-- Descomente para criar assinaturas de teste

/*
-- Exemplo: Assinatura gratuita criada pelo admin
INSERT INTO public.subscriptions (user_id, plan_type, status, created_by, end_date)
VALUES (
    'USER_UUID_AQUI',
    'free',
    'active',
    'admin',
    NULL -- Sem data de expiração
);

-- Exemplo: Trial de 7 dias
INSERT INTO public.subscriptions (user_id, plan_type, status, created_by, end_date, trial_end_date)
VALUES (
    'USER_UUID_AQUI',
    'trial',
    'active',
    'admin',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days'
);
*/

-- ============================================
-- COMANDOS ÚTEIS
-- ============================================

-- Ver todas as assinaturas ativas
-- SELECT * FROM public.subscriptions WHERE status = 'active';

-- Ver assinaturas que expiram em breve (próximos 7 dias)
-- SELECT * FROM public.subscriptions WHERE end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days';

-- Verificar se usuário tem acesso
-- SELECT public.has_active_subscription('USER_UUID_AQUI');

-- Obter informações da assinatura
-- SELECT * FROM public.get_subscription_info('USER_UUID_AQUI');

-- Expirar assinaturas vencidas
-- SELECT public.expire_subscriptions();

-- Ver histórico de transações de um email
-- SELECT * FROM public.kiwify_transactions WHERE customer_email = 'email@example.com';

-- ============================================
-- CONCLUÍDO! ✅
-- ============================================
-- Próximos passos:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Configure a Edge Function para webhook do Kiwify
-- 3. Configure o webhook no painel do Kiwify
-- ============================================
