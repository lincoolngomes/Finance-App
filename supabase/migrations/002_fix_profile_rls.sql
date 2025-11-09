-- Política RLS para permitir que usuários atualizem seus próprios perfis

-- Primeiro, vamos remover qualquer política existente que pode estar conflitando
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Política para permitir SELECT do próprio perfil
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Política para permitir UPDATE do próprio perfil
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para permitir INSERT do próprio perfil (caso não exista)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Habilitar RLS na tabela profiles (se não estiver habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Também vamos garantir que admins possam ver/editar todos os perfis
CREATE POLICY "Admins can manage all profiles" 
ON profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);