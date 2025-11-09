-- Adicionar campo assinaturaId para integração com Asaas via N8N
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assinaturaId VARCHAR(255);

-- Criar índice para melhor performance nas consultas de assinatura
CREATE INDEX IF NOT EXISTS idx_profiles_assinatura_id ON profiles(assinaturaId);

-- Comentário explicativo
COMMENT ON COLUMN profiles.assinaturaId IS 'ID da assinatura no Asaas para integração via N8N';