-- Migration para adicionar coluna de vínculo de conta/cartão em transações
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;