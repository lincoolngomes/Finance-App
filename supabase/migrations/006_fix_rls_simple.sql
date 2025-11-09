-- Correção RLS para permitir atualização de perfil
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Primeiro, vamos limpar todas as políticas existentes
DROP POLICY IF EXISTS "profile_access_policy" ON profiles;
DROP POLICY IF EXISTS "admin_full_access" ON profiles;  
DROP POLICY IF EXISTS "service_role_access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política SIMPLES: usuários autenticados podem fazer tudo com seus próprios perfis
CREATE POLICY "own_profile_access" 
ON profiles FOR ALL
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para service_role (necessária para operações administrativas)
CREATE POLICY "service_role_full_access" 
ON profiles FOR ALL
TO service_role 
USING (true)
WITH CHECK (true);

-- Política para admins (se necessário)
CREATE POLICY "admin_access" 
ON profiles FOR ALL
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);