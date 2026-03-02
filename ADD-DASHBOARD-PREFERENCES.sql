-- Adicionar campo de preferências do dashboard na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{
  "showCardTransactions": true,
  "useCardInvoicePayments": false,
  "showPendingInMonthlyChart": false,
  "showInvestmentsSeparately": true,
  "hideValues": false
}'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN profiles.dashboard_preferences IS 'Preferências do dashboard do usuário (JSON)';
