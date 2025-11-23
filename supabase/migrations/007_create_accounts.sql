-- Migration para criar tabela de contas bancárias e cartões
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('banco', 'cartao')) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Index para facilitar buscas por usuário
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
