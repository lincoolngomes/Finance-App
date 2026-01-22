# Executar SQL: Vinculação de Cartão com Conta

Execute este SQL no Supabase SQL Editor para adicionar a funcionalidade de vinculação:

```sql
-- Adicionar coluna linked_account_id
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_accounts_linked ON accounts(linked_account_id);
```

## Como usar:

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Cole o SQL acima
4. Clique em **Run**

## Funcionalidade:

- Ao criar/editar um cartão, você pode escolher uma conta para vincular
- Quando pagar a fatura, o valor será debitado automaticamente da conta vinculada
- Você pode deixar sem vinculação se preferir pagar manualmente
