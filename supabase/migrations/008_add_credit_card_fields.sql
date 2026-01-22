-- Add credit card fields to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS limite DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_fechamento VARCHAR(2),
ADD COLUMN IF NOT EXISTS dia_vencimento VARCHAR(2),
ADD COLUMN IF NOT EXISTS cor VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'credito';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_banco ON accounts(banco);
