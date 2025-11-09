-- Migração para corrigir WhatsApp IDs que podem estar sem o sufixo @s.whatsapp.net
-- Este problema ocorreu porque anteriormente o sistema removeu os sufixos do WhatsApp ID

-- Corrigir WhatsApp IDs que não possuem o sufixo @s.whatsapp.net ou @c.us
UPDATE profiles 
SET whatsapp = whatsapp || '@s.whatsapp.net'
WHERE whatsapp IS NOT NULL 
  AND whatsapp != '' 
  AND whatsapp NOT LIKE '%@%'
  AND LENGTH(whatsapp) > 8; -- Garantir que não é uma string vazia ou muito pequena

-- Comentário explicativo
COMMENT ON COLUMN profiles.whatsapp IS 'WhatsApp ID completo incluindo sufixo (@s.whatsapp.net ou @c.us) para identificação em mensagens';

-- Criar índice para melhor performance nas consultas de WhatsApp
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp);