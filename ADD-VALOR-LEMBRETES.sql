-- Add valor column to lembretes table
ALTER TABLE lembretes ADD COLUMN valor DECIMAL(10, 2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN lembretes.valor IS 'Valor associado ao lembrete (ex: valor de uma conta a pagar)';
