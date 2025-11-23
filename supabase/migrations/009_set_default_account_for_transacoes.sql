-- Atualiza todas as transações para vincular à conta padrão
UPDATE transacoes SET account_id = '74005cb9-33c7-4ce2-8291-ad8772906717' WHERE account_id IS NULL;