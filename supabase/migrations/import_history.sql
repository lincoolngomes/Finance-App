-- ====================================
-- TABELA DE HISTÓRICO DE IMPORTAÇÕES
-- ====================================
-- Sistema de auditoria para rastrear importações de faturas

CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'pdf')),
  transactions_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_import_history_userid ON import_history(userid);
CREATE INDEX IF NOT EXISTS idx_import_history_account ON import_history(account_id);
CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history(imported_at DESC);

-- RLS (Row Level Security)
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas seu próprio histórico
CREATE POLICY "Usuários podem ver seu histórico de importações" 
  ON import_history 
  FOR SELECT 
  USING (auth.uid() = userid);

-- Policy: Usuários podem inserir em seu próprio histórico
CREATE POLICY "Usuários podem criar registros de importação" 
  ON import_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = userid);

-- Policy: Usuários podem deletar seu próprio histórico
CREATE POLICY "Usuários podem deletar seu histórico" 
  ON import_history 
  FOR DELETE 
  USING (auth.uid() = userid);

-- Comentários
COMMENT ON TABLE import_history IS 'Histórico de importações de faturas de cartão (auditoria)';
COMMENT ON COLUMN import_history.userid IS 'ID do usuário que fez a importação';
COMMENT ON COLUMN import_history.account_id IS 'ID do cartão onde as transações foram importadas';
COMMENT ON COLUMN import_history.file_name IS 'Nome do arquivo importado';
COMMENT ON COLUMN import_history.file_type IS 'Tipo do arquivo (csv ou pdf)';
COMMENT ON COLUMN import_history.transactions_count IS 'Quantidade de transações importadas';
COMMENT ON COLUMN import_history.imported_at IS 'Data e hora da importação';
