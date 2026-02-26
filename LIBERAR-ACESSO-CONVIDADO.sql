-- Libera acesso gratuito para números convidados
-- Número informado: 5513991357933
-- Execute no Supabase SQL Editor

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acesso_liberado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_acesso text NOT NULL DEFAULT 'bloqueado';

-- Algumas bases antigas não possuem esta coluna
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp text;

UPDATE profiles
SET
  acesso_liberado = true,
  tipo_acesso = 'convidado'
WHERE
  regexp_replace(coalesce(phone, ''), '\D', '', 'g') IN ('5513991357933', '13991357933')
  OR regexp_replace(coalesce(telefone, ''), '\D', '', 'g') IN ('5513991357933', '13991357933')
  OR regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') IN ('5513991357933', '13991357933');

COMMIT;

-- Verificação
SELECT id, nome, phone, telefone, whatsapp, acesso_liberado, tipo_acesso
FROM profiles
WHERE
  regexp_replace(coalesce(phone, ''), '\D', '', 'g') IN ('5513991357933', '13991357933')
  OR regexp_replace(coalesce(telefone, ''), '\D', '', 'g') IN ('5513991357933', '13991357933')
  OR regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') IN ('5513991357933', '13991357933');
