# ✅ CONFIGURAÇÃO NOVO SUPABASE - PRÓXIMOS PASSOS

## 🎯 Status Atual

✅ **Supabase novo criado**: https://finance-app-supabase.rcnehy.easypanel.host  
✅ **Código atualizado**: `src/lib/supabase.ts` com nova URL  
✅ **Servidor funcionando**: http://localhost:8085  
✅ **API REST OK**: PostgREST respondendo  

---

## 📝 O QUE VOCÊ PRECISA FAZER AGORA

### 1️⃣ CONFIGURAR BANCO DE DADOS (URGENTE!)

Execute o SQL `CONFIGURAR-BANCO-COMPLETO.sql` no Supabase:

**Opção A - Via Easypanel (Recomendado):**

1. Acesse: https://rcnehy.easypanel.host
2. Vá em: Projects → finance-app → supabase
3. Procure por: **"Database"** ou **"SQL Editor"** ou **"Console"**
4. Se houver, abra o SQL Editor e cole TODO o conteúdo do arquivo `CONFIGURAR-BANCO-COMPLETO.sql`
5. Execute

**Opção B - Via SSH:**

```bash
# Conectar ao servidor
ssh user@rcnehy.easypanel.host

# Encontrar container do banco
docker ps | grep db

# Copiar SQL para o container
docker cp CONFIGURAR-BANCO-COMPLETO.sql <CONTAINER_ID>:/tmp/

# Executar SQL
docker exec -it <CONTAINER_ID> psql -U postgres -d postgres -f /tmp/CONFIGURAR-BANCO-COMPLETO.sql
```

**Opção C - Via pgAdmin/DBeaver:**

1. Conecte-se ao PostgreSQL:
   - Host: rcnehy.easypanel.host
   - Port: (verificar no Easypanel)
   - Database: postgres
   - User: postgres
   - Password: postgres (ou a que você configurou)

2. Abra o arquivo `CONFIGURAR-BANCO-COMPLETO.sql`
3. Execute todo o conteúdo

---

### 2️⃣ CONFIGURAR CORS NO EASYPANEL (IMPORTANTE!)

1. Acesse: https://rcnehy.easypanel.host
2. Vá em: Projects → finance-app → supabase
3. Clique em: **Environment** ou **Settings**
4. Adicione estas variáveis:

```bash
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,http://localhost:8083
SITE_URL=http://localhost:8085
GOTRUE_SITE_URL=http://localhost:8085
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,http://localhost:8083
```

5. Salve e aguarde reiniciar

---

### 3️⃣ TESTAR LOGIN

1. Abra: **http://localhost:8085/auth**
2. Clique em **"Criar Conta"**
3. Cadastre-se:
   - Email: seu@email.com
   - Senha: (mínimo 6 caracteres)
4. Faça login

---

## 🔍 VERIFICAR SE TUDO ESTÁ OK

Execute estes comandos para verificar:

```bash
# 1. Testar Health
curl https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/health

# 2. Testar API REST
curl https://finance-app-supabase.rcnehy.easypanel.host/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"

# 3. Listar tabelas (depois de executar o SQL)
curl https://finance-app-supabase.rcnehy.easypanel.host/rest/v1/profiles \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"
```

**Resultados esperados:**
- Health: `{"status":"ok"}` ou similar
- API REST: JSON com swagger/OpenAPI
- Profiles: `[]` (array vazio) ou erro de autenticação

---

## 🚨 POSSÍVEIS ERROS

### Erro: "relation profiles does not exist"
**Solução**: Execute o SQL `CONFIGURAR-BANCO-COMPLETO.sql`

### Erro: CORS blocked
**Solução**: Configure variáveis CORS no Easypanel

### Erro: 401 Unauthorized
**Solução**: Verifique se ANON_KEY está correta

### Erro: Cannot connect to database
**Solução**: Verifique se container DB está rodando no Easypanel

---

## 📁 ARQUIVOS IMPORTANTES

- ✅ **CONFIGURAR-BANCO-COMPLETO.sql** - SQL completo para executar
- ✅ **SETUP-NOVO-SUPABASE.md** - Guia detalhado
- ✅ **src/lib/supabase.ts** - Código atualizado
- ✅ **cors-proxy.js** - Proxy atualizado (caso precise)

---

## 🎯 CHECKLIST

- [ ] Executar `CONFIGURAR-BANCO-COMPLETO.sql` no banco
- [ ] Configurar variáveis CORS no Easypanel
- [ ] Abrir http://localhost:8085/auth
- [ ] Criar conta de teste
- [ ] Fazer login
- [ ] Testar criar conta bancária
- [ ] Testar criar categoria
- [ ] Testar criar transação

---

## 📞 ME AVISE QUANDO:

1. ✅ Executou o SQL (me diga se deu erro)
2. ✅ Configurou CORS (me diga se apareceu as opções)
3. ✅ Tentou fazer login (me diga o resultado)

**Qual passo você quer fazer primeiro? 1, 2 ou 3?**
