# 🆘 CORREÇÃO SEM PERDER DADOS

## 🎯 Estratégia: Preservar Dados + Resolver Problema

---

## ✅ OPÇÃO 1: Reiniciar Serviço via Easypanel (MAIS SEGURO)

### Passo 1: Acessar Easypanel
1. Abra: **https://rcnehy.easypanel.host**
2. Faça login
3. Vá em: **Projects** → **finance-app**

### Passo 2: Reiniciar TODOS os Serviços do Supabase

**⚠️ IMPORTANTE: Reinicie na ordem correta!**

1. **Primeiro - Reinicie o DB:**
   - Clique em: **finance-app-supabase-db** (ou similar)
   - Clique em: **Restart** (NÃO clique em Destroy/Remove)
   - Aguarde 30 segundos

2. **Depois - Reinicie o Auth:**
   - Clique em: **finance-app-supabase-auth** (ou similar)
   - Clique em: **Restart**
   - Aguarde 20 segundos

3. **Por último - Reinicie o Kong/Gateway:**
   - Clique em: **finance-app-supabase-kong** (ou similar)
   - Clique em: **Restart**
   - Aguarde 20 segundos

### Passo 3: Verificar Logs

Para cada serviço reiniciado:
- Clique em **"Logs"** ou **"Runtime"**
- Procure por:
  - ✅ `accepting connections` (DB)
  - ✅ `GoTrue API started` (Auth)
  - ❌ `FATAL` ou `ERROR`

---

## ✅ OPÇÃO 2: Configurar Variáveis de Ambiente (Preserva Dados)

### No Easypanel:

1. **Vá em**: finance-app → Supabase → **Settings** ou **Environment**

2. **Adicione/Edite estas variáveis**:

```bash
# PostgreSQL
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Desabilitar modo standby
POSTGRES_INITDB_ARGS=--data-checksums

# Auth
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_DATABASE_URL=postgresql://supabase_auth_admin:postgres@db:5432/postgres
```

3. **Salve** e clique em **Redeploy** (NÃO Destroy)

---

## ✅ OPÇÃO 3: Backup + Migração Segura para Cloud

### Passo 1: Fazer Backup dos Dados (Via Easypanel)

1. **Acesse**: Easypanel → finance-app → Supabase DB
2. **Clique em**: "Backups" ou "Export"
3. **Ou execute via terminal**:

```bash
# Conectar ao container
docker exec -it finance-app-supabase-db-1 bash

# Fazer backup
pg_dump -U postgres -d postgres > /tmp/backup.sql

# Copiar para fora
exit
docker cp finance-app-supabase-db-1:/tmp/backup.sql ./backup-$(date +%Y%m%d).sql
```

### Passo 2: Criar Supabase Cloud (Grátis)

1. **Acesse**: https://supabase.com
2. **Cadastre-se** (grátis)
3. **Crie projeto**:
   - Nome: Finance-App
   - Região: **Brazil** (ou US East)
   - Senha: (escolha uma forte)

### Passo 3: Importar Dados

1. **No Supabase Cloud**:
   - Vá em: **SQL Editor**
   - Cole o conteúdo do `backup.sql`
   - Execute

2. **Atualize seu app**:

Abra `src/lib/supabase.ts` e atualize:

```typescript
const supabaseUrl = 'https://SEU-PROJETO.supabase.co'
const supabaseAnonKey = 'SUA-ANON-KEY-AQUI'
```

---

## ✅ OPÇÃO 4: Investigar Logs no Easypanel (Sem Mexer em Nada)

### Passo 1: Ver Logs Completos

1. **Easypanel** → Projects → finance-app → Supabase
2. **Clique em cada serviço** e veja os logs:
   - **DB**: Procure por erros diferentes de "hot standby"
   - **Auth**: Veja se consegue conectar no DB
   - **Kong/Gateway**: Veja se está roteando corretamente

### Passo 2: Verificar Saúde dos Containers

Veja se todos estão **"Running"** (verde):
- ✅ finance-app-supabase-db
- ✅ finance-app-supabase-auth
- ✅ finance-app-supabase-kong
- ✅ finance-app-supabase-rest
- ✅ finance-app-supabase-storage

**Se algum estiver vermelho/parado**: Clique nele e veja o erro nos logs.

---

## ✅ OPÇÃO 5: Testar Localmente com Docker

### Rode Supabase Local (Seus Dados Ficam no VPS)

```bash
cd /Users/lincoln/Programming/Finance-App

# Instalar Supabase CLI
brew install supabase/tap/supabase

# Iniciar Supabase local
supabase init
supabase start

# Pegar credenciais locais
supabase status
```

Isso cria um Supabase novo localmente (SEM afetar o VPS).

Depois você pode:
1. Testar seu app com o Supabase local
2. Quando funcionar, migrar dados do VPS para local
3. Ou migrar do VPS para Cloud

---

## 🔍 DIAGNÓSTICO: O Que Pode Estar Errado?

### Possibilidade 1: Apenas o Gateway está quebrado
- ✅ DB está OK
- ✅ Auth está OK
- ❌ Kong/Nginx está retornando 502

**Solução**: Reinicie apenas o Kong/Gateway.

### Possibilidade 2: DB está travado em Recovery Mode
- ❌ DB não aceita conexões
- ✅ Mas dados estão intactos

**Solução**: Remover `standby.signal` (via SSH ou Easypanel console).

### Possibilidade 3: Falta de Recursos (CPU/RAM)
- Server do Easypanel está sem recursos
- DB não consegue subir

**Solução**: Aumentar recursos ou reiniciar o servidor inteiro.

---

## 📞 ME DIGA:

**Qual dessas opções você prefere tentar primeiro?**

1. **Opção 1** - Reiniciar todos os serviços na ordem correta (RÁPIDO - 2 min)
2. **Opção 2** - Adicionar variáveis de ambiente (MÉDIO - 5 min)
3. **Opção 3** - Backup + Migrar para Cloud (SEGURO - 15 min)
4. **Opção 4** - Investigar logs sem mexer em nada (DIAGNÓSTICO - 5 min)
5. **Opção 5** - Rodar Supabase local temporariamente (TESTE - 10 min)

**OU me mande prints dos logs do Easypanel** que eu analiso melhor o problema!

---

## ⚠️ IMPORTANTE: SEUS DADOS ESTÃO SEGUROS

O banco de dados PostgreSQL armazena os dados em disco (volume Docker).

Mesmo com erro "not accepting connections", os dados **ainda estão lá**.

Só seriam perdidos se você:
- ❌ Clicar em "Destroy" e "Remove Volumes"
- ❌ Executar `docker-compose down -v`
- ❌ Deletar o volume manualmente

**Apenas reiniciar/redeploar = SEGURO** ✅
