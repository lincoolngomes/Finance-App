# 🔧 Como Configurar o Supabase no Easypanel

## Problema Atual
❌ Erro: "invalid login credentials" no VPS

## Causa
O Supabase está funcionando, mas **não tem as tabelas criadas** (profiles, transacoes, categorias, lembretes).

---

## ✅ Solução: Executar SQL Setup

### Passo 1: Acessar o Supabase Studio

No **Easypanel**:
1. Vá em **Projetos** → **finance-app** → **Supabase**
2. Procure por **"Studio URL"** ou **"Admin Panel"**
3. Ou acesse diretamente: `https://finance-app-supabase-finance-app.rcnehy.easypanel.host/project/default`

**Credenciais de acesso:**
- URL: `https://finance-app-supabase-finance-app.rcnehy.easypanel.host`
- Email: Verifique nas variáveis de ambiente do Supabase (procure por `DASHBOARD_USERNAME`)
- Senha: Verifique nas variáveis de ambiente do Supabase (procure por `DASHBOARD_PASSWORD`)

### Passo 2: Abrir SQL Editor

No Supabase Studio:
1. Clique em **"SQL Editor"** no menu lateral
2. Clique em **"New Query"**

### Passo 3: Executar o Script de Setup

Cole e execute este SQL:

```sql
-- ============================================
-- FINANCE APP - SETUP INICIAL DO BANCO
-- ============================================

-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    nome TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    whatsapp TEXT,
    role TEXT DEFAULT 'user',
    assinatura_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    userid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    tags TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS public.transacoes (
    id BIGSERIAL PRIMARY KEY,
    userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quando TIMESTAMPTZ,
    estabelecimento TEXT,
    valor NUMERIC,
    detalhes TEXT,
    tipo TEXT,
    categoria TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de lembretes
CREATE TABLE IF NOT EXISTS public.lembretes (
    id BIGSERIAL PRIMARY KEY,
    userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    descricao TEXT,
    data TIMESTAMPTZ,
    valor NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver próprio perfil" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem inserir próprio perfil" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- POLÍTICAS RLS - CATEGORIAS
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver próprias categorias" ON public.categorias;
CREATE POLICY "Usuários podem ver próprias categorias" ON public.categorias
    FOR SELECT USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem criar próprias categorias" ON public.categorias;
CREATE POLICY "Usuários podem criar próprias categorias" ON public.categorias
    FOR INSERT WITH CHECK (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem atualizar próprias categorias" ON public.categorias;
CREATE POLICY "Usuários podem atualizar próprias categorias" ON public.categorias
    FOR UPDATE USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem deletar próprias categorias" ON public.categorias;
CREATE POLICY "Usuários podem deletar próprias categorias" ON public.categorias
    FOR DELETE USING (auth.uid() = userid);

-- ============================================
-- POLÍTICAS RLS - TRANSAÇÕES
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver próprias transações" ON public.transacoes;
CREATE POLICY "Usuários podem ver próprias transações" ON public.transacoes
    FOR SELECT USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem criar próprias transações" ON public.transacoes;
CREATE POLICY "Usuários podem criar próprias transações" ON public.transacoes
    FOR INSERT WITH CHECK (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem atualizar próprias transações" ON public.transacoes;
CREATE POLICY "Usuários podem atualizar próprias transações" ON public.transacoes
    FOR UPDATE USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem deletar próprias transações" ON public.transacoes;
CREATE POLICY "Usuários podem deletar próprias transações" ON public.transacoes
    FOR DELETE USING (auth.uid() = userid);

-- ============================================
-- POLÍTICAS RLS - LEMBRETES
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver próprios lembretes" ON public.lembretes;
CREATE POLICY "Usuários podem ver próprios lembretes" ON public.lembretes
    FOR SELECT USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem criar próprios lembretes" ON public.lembretes;
CREATE POLICY "Usuários podem criar próprios lembretes" ON public.lembretes
    FOR INSERT WITH CHECK (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem atualizar próprios lembretes" ON public.lembretes;
CREATE POLICY "Usuários podem atualizar próprios lembretes" ON public.lembretes
    FOR UPDATE USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Usuários podem deletar próprios lembretes" ON public.lembretes;
CREATE POLICY "Usuários podem deletar próprios lembretes" ON public.lembretes
    FOR DELETE USING (auth.uid() = userid);

-- ============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CONCLUÍDO!
-- ============================================
```

### Passo 4: Verificar Se Funcionou

No SQL Editor, execute:

```sql
-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver políticas RLS
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

Deve mostrar:
- ✅ Tabelas: `profiles`, `categorias`, `transacoes`, `lembretes`
- ✅ Políticas: várias políticas para cada tabela

---

## Passo 5: Criar Sua Conta

Agora você pode:

1. **No Finance App (VPS):**
   - Vá em `https://finance-app-finance-app.rcnehy.easypanel.host`
   - Clique em **"Adquira já"** (cadastro)
   - Crie sua conta com email e senha

2. **Ou no Localhost:**
   - Vá em `http://localhost:8080`
   - Clique em **"Adquira já"**
   - Crie sua conta

**O perfil será criado automaticamente** pelo trigger!

---

## 🔍 Se Ainda Der Erro

### Erro: "Email rate limit exceeded"
- Aguarde 1 hora
- Ou desabilite confirmação de email nas configurações do Supabase

### Erro: "User already exists"
- Use outro email
- Ou resete a senha no Supabase Studio → Authentication → Users

### Erro: "Failed to fetch"
- Supabase caiu de novo
- Reinicie o serviço no Easypanel

---

## 📋 Checklist Rápido

- [ ] Acessei o Supabase Studio
- [ ] Executei o SQL de setup completo
- [ ] Verifiquei que as tabelas foram criadas
- [ ] Criei uma conta nova no Finance App
- [ ] Consegui fazer login com sucesso
