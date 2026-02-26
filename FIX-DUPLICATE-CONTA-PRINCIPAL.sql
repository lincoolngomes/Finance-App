-- Corrige contas duplicadas "Conta Principal" por usuário
-- e evita que novas duplicatas desse nome sejam criadas.
-- Execute no Supabase SQL Editor.

BEGIN;

-- 1) Mapeia contas duplicadas: mantém a mais antiga por usuário
CREATE TEMP TABLE _dup_conta_principal AS
WITH ranked AS (
  SELECT
    id,
    user_id,
    nome,
    created_at,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id
      ORDER BY created_at NULLS FIRST, id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at NULLS FIRST, id
    ) AS rn
  FROM public.accounts
  WHERE lower(nome) = 'conta principal'
)
SELECT user_id, keep_id, id AS remove_id
FROM ranked
WHERE rn > 1;

-- 2) Reaponta transações para a conta que foi mantida (quando coluna existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transacoes'
      AND column_name = 'conta_id'
  ) THEN
    EXECUTE '
      UPDATE public.transacoes t
      SET conta_id = d.keep_id
      FROM _dup_conta_principal d
      WHERE t.conta_id = d.remove_id
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transacoes'
      AND column_name = 'account_id'
  ) THEN
    EXECUTE '
      UPDATE public.transacoes t
      SET account_id = d.keep_id
      FROM _dup_conta_principal d
      WHERE t.account_id = d.remove_id
    ';
  END IF;
END $$;

-- 3) Remove duplicadas
DELETE FROM public.accounts a
USING _dup_conta_principal d
WHERE a.id = d.remove_id;

-- 4) Prevenção: no máximo uma "Conta Principal" por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_one_conta_principal_per_user
ON public.accounts (user_id)
WHERE lower(nome) = 'conta principal';

COMMIT;

-- 5) Diagnóstico final
SELECT
  user_id,
  nome,
  COUNT(*) AS qtd
FROM public.accounts
WHERE lower(nome) = 'conta principal'
GROUP BY user_id, nome
ORDER BY qtd DESC;
