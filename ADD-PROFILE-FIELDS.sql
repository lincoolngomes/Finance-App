-- Adicionar campos faltantes na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profissao TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS localizacao TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS renda_mensal DECIMAL(15, 2);
