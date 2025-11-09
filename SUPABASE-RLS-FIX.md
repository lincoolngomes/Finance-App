# 🔧 Correção RLS (Row Level Security) - Finance App

## ❌ **Problema Atual:**
```
new row violates row-level security policy for table "profiles"
```

## ✅ **Solução:**

### **1️⃣ Aplicar Migração SQL:**

**Acesse o Supabase Dashboard:**
1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto Finance App
3. Clique em **"SQL Editor"**
4. Execute o código abaixo:

```sql
-- Política RLS para permitir que usuários atualizem seus próprios perfis

-- Primeiro, vamos remover qualquer política existente que pode estar conflitando
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

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
```

### **2️⃣ Verificar Aplicação:**

Depois de executar o SQL, teste:

1. **Acesse:** `http://localhost:8080/perfil`
2. **Altere o telefone**
3. **Clique "Salvar Alterações"**
4. **Deve salvar com sucesso!**

### **3️⃣ Se ainda der erro:**

**Opção A - Desabilitar RLS temporariamente:**
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

**Opção B - Verificar políticas existentes:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## 🎯 **Resultado Esperado:**

- ✅ **Usuário pode salvar seu próprio perfil**
- ✅ **Admin pode gerenciar todos os perfis** 
- ✅ **Validação WhatsApp funcionando**
- ✅ **Sistema de fallback ativo**

## 📋 **Próximos Passos:**

1. **Execute o SQL no Supabase**
2. **Teste o salvamento do perfil**
3. **Deploy para produção no Easypanel**