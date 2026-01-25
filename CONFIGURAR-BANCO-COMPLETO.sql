-- ============================================
-- CONFIGURAÇÃO COMPLETA DO NOVO SUPABASE
-- ============================================
-- Execute este SQL COMPLETO no SQL Editor do Easypanel
-- Ou via: docker exec -it <container-db> psql -U postgres -d postgres
-- ============================================

-- PASSO 1: Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- PASSO 2: Tabela PROFILES (Perfis de Usuários)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  telefone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  assinatura_ativa BOOLEAN DEFAULT false,
  assinatura_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON profiles;
CREATE POLICY "Usuários podem inserir próprio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASSO 3: Tabela ACCOUNTS (Contas Bancárias e Cartões)
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  saldo DECIMAL(15,2) DEFAULT 0,
  tipo VARCHAR(50) DEFAULT 'corrente',
  banco TEXT,
  limite DECIMAL(15,2) DEFAULT 0,
  dia_fechamento VARCHAR(2),
  dia_vencimento VARCHAR(2),
  cor VARCHAR(7) DEFAULT '#3b82f6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem próprias contas" ON accounts;
CREATE POLICY "Usuários veem próprias contas"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam próprias contas" ON accounts;
CREATE POLICY "Usuários criam próprias contas"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam próprias contas" ON accounts;
CREATE POLICY "Usuários atualizam próprias contas"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam próprias contas" ON accounts;
CREATE POLICY "Usuários deletam próprias contas"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_banco ON accounts(banco);

-- ============================================
-- PASSO 4: Tabela CATEGORIAS
-- ============================================

CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  icone TEXT,
  cor VARCHAR(7) DEFAULT '#3b82f6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem próprias categorias" ON categorias;
CREATE POLICY "Usuários veem próprias categorias"
  ON categorias FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam próprias categorias" ON categorias;
CREATE POLICY "Usuários criam próprias categorias"
  ON categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam próprias categorias" ON categorias;
CREATE POLICY "Usuários atualizam próprias categorias"
  ON categorias FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam próprias categorias" ON categorias;
CREATE POLICY "Usuários deletam próprias categorias"
  ON categorias FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);

-- ============================================
-- PASSO 5: Tabela TRANSAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  data DATE NOT NULL,
  pago BOOLEAN DEFAULT false,
  recorrente BOOLEAN DEFAULT false,
  recorrencia_tipo VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem próprias transações" ON transacoes;
CREATE POLICY "Usuários veem próprias transações"
  ON transacoes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam próprias transações" ON transacoes;
CREATE POLICY "Usuários criam próprias transações"
  ON transacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam próprias transações" ON transacoes;
CREATE POLICY "Usuários atualizam próprias transações"
  ON transacoes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam próprias transações" ON transacoes;
CREATE POLICY "Usuários deletam próprias transações"
  ON transacoes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_account_id ON transacoes(account_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria_id ON transacoes(categoria_id);

-- ============================================
-- PASSO 6: Tabela INVESTIMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS investimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  quantidade DECIMAL(18,8) DEFAULT 0,
  valor_investido DECIMAL(15,2) DEFAULT 0,
  valor_atual DECIMAL(15,2) DEFAULT 0,
  valor_atual_manual DECIMAL(15,2),
  rentabilidade_percentual DECIMAL(10,4),
  data_aplicacao DATE,
  data_vencimento DATE,
  indexador TEXT,
  taxa DECIMAL(10,4),
  tipo_marcacao VARCHAR(20) DEFAULT 'mercado',
  marcacao_mercado BOOLEAN DEFAULT true,
  isento_ir BOOLEAN DEFAULT false,
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem próprios investimentos" ON investimentos;
CREATE POLICY "Usuários veem próprios investimentos"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam próprios investimentos" ON investimentos;
CREATE POLICY "Usuários criam próprios investimentos"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam próprios investimentos" ON investimentos;
CREATE POLICY "Usuários atualizam próprios investimentos"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam próprios investimentos" ON investimentos;
CREATE POLICY "Usuários deletam próprios investimentos"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_investimentos_codigo ON investimentos(codigo);
CREATE INDEX IF NOT EXISTS idx_investimentos_linked_account ON investimentos(linked_account_id);

-- ============================================
-- PASSO 7: Tabela ORÇAMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  valor_planejado DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, categoria_id, mes, ano)
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem próprios orçamentos" ON orcamentos;
CREATE POLICY "Usuários veem próprios orçamentos"
  ON orcamentos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários criam próprios orçamentos" ON orcamentos;
CREATE POLICY "Usuários criam próprios orçamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam próprios orçamentos" ON orcamentos;
CREATE POLICY "Usuários atualizam próprios orçamentos"
  ON orcamentos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários deletam próprios orçamentos" ON orcamentos;
CREATE POLICY "Usuários deletam próprios orçamentos"
  ON orcamentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_categoria_id ON orcamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_mes_ano ON orcamentos(mes, ano);

-- ============================================
-- PASSO 8: Storage Bucket para Avatars
-- ============================================

-- Criar bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "Avatars públicos" ON storage.objects;
CREATE POLICY "Avatars públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuários fazem upload próprio avatar" ON storage.objects;
CREATE POLICY "Usuários fazem upload próprio avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Usuários atualizam próprio avatar" ON storage.objects;
CREATE POLICY "Usuários atualizam próprio avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Usuários deletam próprio avatar" ON storage.objects;
CREATE POLICY "Usuários deletam próprio avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- ✅ CONCLUÍDO!
-- ============================================

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
