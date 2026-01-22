-- =====================================================
-- EXECUTAR NO SUPABASE - SISTEMA DE IMPORTAÇÃO DE FATURAS
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- PASSO 1: Criar tabela de histórico de importações
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

-- PASSO 2: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_import_history_userid ON import_history(userid);
CREATE INDEX IF NOT EXISTS idx_import_history_account ON import_history(account_id);
CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history(imported_at DESC);

-- PASSO 3: Ativar Row Level Security (RLS)
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar policies de segurança

-- Policy: Usuários podem ver apenas seu próprio histórico
DROP POLICY IF EXISTS "Usuários podem ver seu histórico de importações" ON import_history;
CREATE POLICY "Usuários podem ver seu histórico de importações" 
  ON import_history 
  FOR SELECT 
  USING (auth.uid() = userid);

-- Policy: Usuários podem inserir em seu próprio histórico
DROP POLICY IF EXISTS "Usuários podem criar registros de importação" ON import_history;
CREATE POLICY "Usuários podem criar registros de importação" 
  ON import_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = userid);

-- Policy: Usuários podem deletar seu próprio histórico
DROP POLICY IF EXISTS "Usuários podem deletar seu histórico" ON import_history;
CREATE POLICY "Usuários podem deletar seu histórico" 
  ON import_history 
  FOR DELETE 
  USING (auth.uid() = userid);

-- PASSO 5: Adicionar comentários para documentação
COMMENT ON TABLE import_history IS 'Histórico de importações de faturas de cartão (auditoria)';
COMMENT ON COLUMN import_history.userid IS 'ID do usuário que fez a importação';
COMMENT ON COLUMN import_history.account_id IS 'ID do cartão onde as transações foram importadas';
COMMENT ON COLUMN import_history.file_name IS 'Nome do arquivo importado';
COMMENT ON COLUMN import_history.file_type IS 'Tipo do arquivo (csv ou pdf)';
COMMENT ON COLUMN import_history.transactions_count IS 'Quantidade de transações importadas';
COMMENT ON COLUMN import_history.imported_at IS 'Data e hora da importação';

-- =====================================================
-- VERIFICAÇÃO (opcional - execute para testar)
-- =====================================================

-- Verificar se a tabela foi criada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'import_history' 
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'import_history';

-- Verificar policies RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'import_history';

-- =====================================================
-- SUCESSO! ✅
-- =====================================================
-- Agora você pode usar o sistema de importação de faturas
-- Volte para a aplicação e teste a importação
