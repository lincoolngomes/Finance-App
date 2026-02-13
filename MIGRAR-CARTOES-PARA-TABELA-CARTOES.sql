-- =====================================================
-- MIGRAÇÃO: Mover cartões de crédito de accounts → cartoes
-- =====================================================
-- Este script migra os cartões de crédito que estão armazenados
-- na tabela "accounts" para a tabela dedicada "cartoes".
-- 
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- =====================================================

-- 1) Garantir que a tabela cartoes tem todas as colunas necessárias
-- (A tabela já existe, mas pode estar incompleta)
DO $$
BEGIN
  -- Adicionar colunas que podem não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='nome') THEN
    ALTER TABLE cartoes ADD COLUMN nome TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='bandeira') THEN
    ALTER TABLE cartoes ADD COLUMN bandeira TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='limite') THEN
    ALTER TABLE cartoes ADD COLUMN limite NUMERIC(15,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='dia_fechamento') THEN
    ALTER TABLE cartoes ADD COLUMN dia_fechamento INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='dia_vencimento') THEN
    ALTER TABLE cartoes ADD COLUMN dia_vencimento INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='cor') THEN
    ALTER TABLE cartoes ADD COLUMN cor VARCHAR(7) DEFAULT '#3b82f6';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='banco') THEN
    ALTER TABLE cartoes ADD COLUMN banco TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='linked_account_id') THEN
    ALTER TABLE cartoes ADD COLUMN linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='ativo') THEN
    ALTER TABLE cartoes ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='created_at') THEN
    ALTER TABLE cartoes ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cartoes' AND column_name='updated_at') THEN
    ALTER TABLE cartoes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2) Adicionar colunas faltantes na tabela accounts (se não existirem)
-- para que o SELECT não falhe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='limite') THEN
    ALTER TABLE accounts ADD COLUMN limite NUMERIC(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='dia_fechamento') THEN
    ALTER TABLE accounts ADD COLUMN dia_fechamento VARCHAR(2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='dia_vencimento') THEN
    ALTER TABLE accounts ADD COLUMN dia_vencimento VARCHAR(2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='linked_account_id') THEN
    ALTER TABLE accounts ADD COLUMN linked_account_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='ativo') THEN
    ALTER TABLE accounts ADD COLUMN ativo BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='cor') THEN
    ALTER TABLE accounts ADD COLUMN cor VARCHAR(7) DEFAULT '#3b82f6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='banco') THEN
    ALTER TABLE accounts ADD COLUMN banco TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='created_at') THEN
    ALTER TABLE accounts ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='updated_at') THEN
    ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 3) Migrar dados: copiar cartões de accounts → cartoes
-- Usa o id original da accounts para manter as referências de transações
INSERT INTO cartoes (id, user_id, nome, limite, dia_fechamento, dia_vencimento, cor, banco, linked_account_id, ativo, created_at, updated_at)
SELECT 
  a.id,
  a.user_id,
  COALESCE(a.nome, 'Cartão sem nome'),
  COALESCE(a.limite, 0),
  CAST(a.dia_fechamento AS INTEGER),
  CAST(a.dia_vencimento AS INTEGER),
  COALESCE(a.cor, '#3b82f6'),
  a.banco,
  a.linked_account_id,
  COALESCE(a.ativo, true),
  COALESCE(a.created_at, NOW()),
  COALESCE(a.updated_at, NOW())
FROM accounts a
WHERE a.tipo = 'credit_card'
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  limite = EXCLUDED.limite,
  dia_fechamento = EXCLUDED.dia_fechamento,
  dia_vencimento = EXCLUDED.dia_vencimento,
  cor = EXCLUDED.cor,
  banco = EXCLUDED.banco,
  linked_account_id = EXCLUDED.linked_account_id,
  updated_at = NOW();

-- 4) Atualizar transações: garantir que cartao_id aponta para o cartão correto
-- (como mantemos o mesmo UUID, as referências em cartao_id continuam válidas)
-- Mas precisamos garantir que transações de cartão tenham cartao_id preenchido
UPDATE transacoes t
SET cartao_id = t.conta_id
WHERE t.conta_id IN (SELECT id FROM cartoes)
  AND (t.cartao_id IS NULL OR t.cartao_id != t.conta_id);

-- 5) Limpar conta_id das transações que são de cartão
-- (para que não fiquem referenciando accounts)
UPDATE transacoes t
SET conta_id = NULL
WHERE t.cartao_id IS NOT NULL
  AND t.conta_id = t.cartao_id;

-- 6) Remover cartões da tabela accounts (DEPOIS de migrar)
DELETE FROM accounts WHERE tipo = 'credit_card';

-- 7) Atualizar o trigger de novo usuário para usar a tabela cartoes
CREATE OR REPLACE FUNCTION public.handle_new_user_accounts()
RETURNS trigger AS $$
BEGIN
  -- Conta bancária principal (na tabela accounts)
  INSERT INTO public.accounts (user_id, nome, tipo, cor)
  VALUES (new.id, 'Conta Principal', 'bank', '#2563eb');

  -- Cartão de crédito principal (na tabela cartoes - NÃO mais em accounts)
  INSERT INTO public.cartoes (user_id, nome, cor, limite, dia_fechamento, dia_vencimento)
  VALUES (new.id, 'Cartão de Crédito Principal', '#eab308', 0, 1, 10);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8) Habilitar RLS na tabela cartoes (segurança)
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cartoes
DROP POLICY IF EXISTS "Users can view own cartoes" ON cartoes;
CREATE POLICY "Users can view own cartoes" ON cartoes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cartoes" ON cartoes;
CREATE POLICY "Users can insert own cartoes" ON cartoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cartoes" ON cartoes;
CREATE POLICY "Users can update own cartoes" ON cartoes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cartoes" ON cartoes;
CREATE POLICY "Users can delete own cartoes" ON cartoes
  FOR DELETE USING (auth.uid() = user_id);

-- 9) Verificação final
DO $$
DECLARE
  cartoes_count INTEGER;
  accounts_credit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cartoes_count FROM cartoes;
  SELECT COUNT(*) INTO accounts_credit_count FROM accounts WHERE tipo = 'credit_card';
  
  RAISE NOTICE '✅ Migração concluída!';
  RAISE NOTICE '📋 Cartões na tabela cartoes: %', cartoes_count;
  RAISE NOTICE '📋 Cartões restantes em accounts (deve ser 0): %', accounts_credit_count;
END $$;
