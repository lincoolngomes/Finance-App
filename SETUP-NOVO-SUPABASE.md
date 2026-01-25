# 🚀 CONFIGURAÇÃO COMPLETA DO NOVO SUPABASE

## 📋 Informações do Novo Supabase

**URL**: https://finance-app-supabase.rcnehy.easypanel.host
**Status**: ✅ Funcionando (Kong respondendo)

---

## 🔧 PASSO 1: Configurar Variáveis de Ambiente no Easypanel

### 1.1 - Acessar Configurações

1. Abra: **https://rcnehy.easypanel.host**
2. Vá em: **Projects** → **finance-app** → **supabase**
3. Clique em: **Environment** ou **Settings**

### 1.2 - Adicionar Variáveis CORS

Cole estas variáveis (ou edite se já existirem):

```bash
# CORS - Permitir localhost
ADDITIONAL_REDIRECT_URLS=http://localhost:8082,http://localhost:8083,http://localhost:5173
SITE_URL=http://localhost:8082
GOTRUE_SITE_URL=http://localhost:8082
GOTRUE_URI_ALLOW_LIST=http://localhost:8082,http://localhost:8083,http://localhost:5173

# Configurações JWT (use as padrões do Supabase)
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q

# PostgreSQL
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres

# GoTrue (Auth)
GOTRUE_DB_DRIVER=postgres
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_SMTP_ADMIN_EMAIL=noreply@yourdomain.com
GOTRUE_SMTP_HOST=smtp.gmail.com
GOTRUE_SMTP_PORT=587
```

### 1.3 - Salvar e Reiniciar

1. Clique em **Save** ou **Update**
2. Aguarde reiniciar automaticamente (1-2 min)

---

## 🗄️ PASSO 2: Criar Estrutura do Banco de Dados

### 2.1 - Acessar SQL Editor no Easypanel

**Opção A - Via Interface Web (se disponível):**
1. Easypanel → Supabase → SQL Editor

**Opção B - Via Terminal:**
Execute os comandos SQL através do proxy ou diretamente no container.

### 2.2 - Executar SQLs na Ordem

Execute estes arquivos SQL **na ordem exata**:

#### 1️⃣ **Tabelas Base e RLS**
```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Perfis (conectada ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  telefone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  assinatura_ativa BOOLEAN DEFAULT false,
  assinatura_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON profiles;
CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir próprio perfil" ON profiles;
CREATE POLICY "Usuários podem inserir próprio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2️⃣ **Contas (Accounts)**
```sql
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  saldo DECIMAL(15,2) DEFAULT 0,
  tipo VARCHAR(50) DEFAULT 'corrente',
  banco TEXT,
  limite DECIMAL(15,2) DEFAULT 0,
  dia_fechamento VARCHAR(2),
  dia_vencimento VARCHAR(2),
  cor VARCHAR(7) DEFAULT '#3b82f6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias contas"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprias contas"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprias contas"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprias contas"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
```

#### 3️⃣ **Categorias**
```sql
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  icone TEXT,
  cor VARCHAR(7) DEFAULT '#3b82f6',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias categorias"
  ON categorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprias categorias"
  ON categorias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprias categorias"
  ON categorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
```

#### 4️⃣ **Transações**
```sql
CREATE TABLE IF NOT EXISTS transacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  data DATE NOT NULL,
  pago BOOLEAN DEFAULT false,
  recorrente BOOLEAN DEFAULT false,
  recorrencia_tipo VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias transações"
  ON transacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprias transações"
  ON transacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprias transações"
  ON transacoes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprias transações"
  ON transacoes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_account_id ON transacoes(account_id);
```

#### 5️⃣ **Investimentos**
```sql
CREATE TABLE IF NOT EXISTS investimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  quantidade DECIMAL(18,8) DEFAULT 0,
  valor_investido DECIMAL(15,2) DEFAULT 0,
  valor_atual DECIMAL(15,2) DEFAULT 0,
  valor_atual_manual DECIMAL(15,2),
  rentabilidade_percentual DECIMAL(10,4),
  data_aplicacao DATE,
  data_vencimento DATE,
  indexador TEXT,
  taxa DECIMAL(10,4),
  tipo_marcacao VARCHAR(20) DEFAULT 'mercado',
  marcacao_mercado BOOLEAN DEFAULT true,
  isento_ir BOOLEAN DEFAULT false,
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios investimentos"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprios investimentos"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprios investimentos"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprios investimentos"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_investimentos_codigo ON investimentos(codigo);
```

#### 6️⃣ **Orçamentos**
```sql
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  valor_planejado DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, categoria_id, mes, ano)
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios orçamentos"
  ON orcamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprios orçamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprios orçamentos"
  ON orcamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprios orçamentos"
  ON orcamentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_mes_ano ON orcamentos(mes, ano);
```

#### 7️⃣ **Storage para Avatars**
```sql
-- Criar bucket para avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para avatars
CREATE POLICY "Avatars públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Usuários fazem upload próprio avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Usuários atualizam próprio avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 💻 PASSO 3: Atualizar Código da Aplicação

Seus arquivos serão atualizados automaticamente para usar a nova URL.

---

## 🧪 PASSO 4: Testar Configuração

Execute estes testes na ordem:

### 4.1 - Testar Health Endpoint
```bash
curl https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/health
```
**Esperado**: `{"status":"ok"}` ou 401

### 4.2 - Testar CORS
```bash
curl -H "Origin: http://localhost:8082" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/signup
```
**Esperado**: Headers CORS presentes

### 4.3 - Criar Usuário de Teste
```bash
curl -X POST \
  https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/signup \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@teste.com","password":"teste123"}'
```

---

## ✅ CHECKLIST FINAL

- [ ] Variáveis CORS configuradas no Easypanel
- [ ] SQLs executados (tabelas criadas)
- [ ] Código atualizado com nova URL
- [ ] Health endpoint respondendo
- [ ] CORS funcionando
- [ ] Usuário de teste criado
- [ ] Login funcionando no app

---

## 🆘 Troubleshooting

### Erro: "relation does not exist"
**Solução**: Execute os SQLs novamente na ordem correta

### Erro: CORS
**Solução**: Verifique variáveis CORS no Easypanel

### Erro: 401 Unauthorized
**Solução**: Verifique se ANON_KEY está correta

---

## 📞 Próximos Passos

Depois de configurar:
1. Importar dados antigos (se houver backup)
2. Configurar SMTP para emails
3. Adicionar domínio customizado (opcional)
