-- Adicionar coluna linked_account_id para vincular cartão de crédito com conta corrente
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_accounts_linked ON accounts(linked_account_id);

-- Comentários
COMMENT ON COLUMN accounts.linked_account_id IS 'ID da conta corrente vinculada ao cartão de crédito. Ao pagar a fatura, o valor é debitado desta conta automaticamente.';
