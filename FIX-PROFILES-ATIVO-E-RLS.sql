-- Corrige erro: "column profiles.ativo does not exist"
-- Execute no Supabase SQL Editor

BEGIN;

-- 1) Hotfix compatível com políticas antigas que usam profiles.ativo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

UPDATE public.profiles
SET ativo = true
WHERE ativo IS NULL;

COMMIT;

-- 2) Diagnóstico: listar políticas de RLS em profiles
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- 3) Diagnóstico: políticas que citam "ativo"
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND (
    COALESCE(qual, '') ILIKE '%ativo%'
    OR COALESCE(with_check, '') ILIKE '%ativo%'
  )
ORDER BY policyname;

-- Opcional (se quiser simplificar RLS depois):
-- manter apenas acesso do próprio usuário + service_role
--
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
-- DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
-- DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
-- DROP POLICY IF EXISTS "service_role_full_access" ON public.profiles;
--
-- CREATE POLICY "profiles_select_own"
--   ON public.profiles FOR SELECT
--   USING (auth.uid() = id);
--
-- CREATE POLICY "profiles_update_own"
--   ON public.profiles FOR UPDATE
--   USING (auth.uid() = id);
--
-- CREATE POLICY "profiles_insert_own"
--   ON public.profiles FOR INSERT
--   WITH CHECK (auth.uid() = id);
--
-- CREATE POLICY "service_role_full_access"
--   ON public.profiles FOR ALL
--   USING (auth.role() = 'service_role')
--   WITH CHECK (auth.role() = 'service_role');
