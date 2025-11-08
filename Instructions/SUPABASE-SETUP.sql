-- Script SQL para configurar o banco de dados do Finance App
-- Execute este script no SQL Editor do seu Supabase local

-- Habilitar Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    nome TEXT,
    email TEXT,
    avatar_url TEXT,
    phone TEXT,
    whatsapp TEXT,
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver próprio perfil" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir próprio perfil" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para categorias
CREATE POLICY "Usuários podem ver próprias categorias" ON public.categorias
    FOR SELECT USING (auth.uid() = userid);

CREATE POLICY "Usuários podem criar próprias categorias" ON public.categorias
    FOR INSERT WITH CHECK (auth.uid() = userid);

CREATE POLICY "Usuários podem atualizar próprias categorias" ON public.categorias
    FOR UPDATE USING (auth.uid() = userid);

CREATE POLICY "Usuários podem deletar próprias categorias" ON public.categorias
    FOR DELETE USING (auth.uid() = userid);

-- Políticas RLS para transações
CREATE POLICY "Usuários podem ver próprias transações" ON public.transacoes
    FOR SELECT USING (auth.uid() = userid);

CREATE POLICY "Usuários podem criar próprias transações" ON public.transacoes
    FOR INSERT WITH CHECK (auth.uid() = userid);

CREATE POLICY "Usuários podem atualizar próprias transações" ON public.transacoes
    FOR UPDATE USING (auth.uid() = userid);

CREATE POLICY "Usuários podem deletar próprias transações" ON public.transacoes
    FOR DELETE USING (auth.uid() = userid);

-- Políticas RLS para lembretes
CREATE POLICY "Usuários podem ver próprios lembretes" ON public.lembretes
    FOR SELECT USING (auth.uid() = userid);

CREATE POLICY "Usuários podem criar próprios lembretes" ON public.lembretes
    FOR INSERT WITH CHECK (auth.uid() = userid);

CREATE POLICY "Usuários podem atualizar próprios lembretes" ON public.lembretes
    FOR UPDATE USING (auth.uid() = userid);

CREATE POLICY "Usuários podem deletar próprios lembretes" ON public.lembretes
    FOR DELETE USING (auth.uid() = userid);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();