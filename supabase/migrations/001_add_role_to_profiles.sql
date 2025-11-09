-- Criar tipos de role primeiro
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'premium');
    END IF;
END $$;

-- Adicionar coluna role na tabela profiles com tipo correto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Criar tipo para status de assinatura primeiro
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
        CREATE TYPE subscription_type AS ENUM ('free', 'premium', 'cancelled', 'expired');
    END IF;
END $$;

-- Adicionar coluna subscription_status se não existir com tipo correto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status subscription_type DEFAULT 'free';

-- Adicionar campos de informações pessoais e endereço
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS n_endereco VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pais VARCHAR(50);

-- Adicionar outras colunas úteis para administração
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Definir um usuário admin inicial (substitua pelo seu email)
UPDATE profiles SET role = 'admin' WHERE email = 'lincoolngomes@gmail.com';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_cidade ON profiles(cidade);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();