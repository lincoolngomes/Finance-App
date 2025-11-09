-- CORREÇÃO URGENTE: Remover recursão infinita nas políticas RLS

-- Remover TODAS as políticas que estão causando recursão
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Desabilitar RLS temporariamente para parar os erros
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Recriar políticas SIMPLES sem recursão
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política básica: usuários podem acessar seus próprios perfis
CREATE POLICY "profile_access_policy" 
ON profiles FOR ALL
TO authenticated 
USING (auth.uid() = id);

-- Política separada para admins (usando função de segurança)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para admins usando função externa (sem recursão)
CREATE POLICY "admin_full_access" 
ON profiles FOR ALL
TO authenticated 
USING (is_admin(auth.uid()));

-- Garantir que service_role sempre tem acesso
CREATE POLICY "service_role_access" 
ON profiles FOR ALL
TO service_role 
USING (true);