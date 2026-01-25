# 🚀 DEPLOY E CONFIGURAÇÃO - PASSO A PASSO

## ⚠️ SITUAÇÃO ATUAL
- ✅ Código está correto (usa URL nova do Supabase)
- ❌ Build em produção está antigo (usa URL morta)
- ❌ CORS não configurado
- ❌ Banco de dados vazio (sem tabelas)

---

## 📋 CHECKLIST DE EXECUÇÃO

### ✅ PASSO 1: REBUILD DO FRONTEND (OBRIGATÓRIO)

1. Acesse: **https://rcnehy.easypanel.host**
2. Faça login
3. Vá em: **Projects** → **finance-app** (seu app frontend)
4. Clique no botão: **"Deploy"** ou **"Rebuild"**
5. Aguarde 2-3 minutos até completar
6. ✅ Pronto quando ver: "Running" ou "Deployed"

---

### ✅ PASSO 2: CONFIGURAR CORS NO SUPABASE

1. No Easypanel, vá em: **Projects** → **finance-app-supabase**
2. Clique em: **Environment** (ou **Settings**)
3. **Adicione estas 7 variáveis** (copie e cole):

```env
SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
```

```env
ADDITIONAL_REDIRECT_URLS=https://finance-app-finance-app.rcnehy.easypanel.host
```

```env
API_EXTERNAL_URL=https://finance-app-supabase.rcnehy.easypanel.host
```

```env
GOTRUE_SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
```

```env
GOTRUE_URI_ALLOW_LIST=https://finance-app-finance-app.rcnehy.easypanel.host,https://finance-app-supabase.rcnehy.easypanel.host
```

```env
GOTRUE_MAILER_AUTOCONFIRM=true
```

```env
ENABLE_EMAIL_AUTOCONFIRM=true
```

4. Clique em: **Save** ou **Salvar**
5. Clique em: **Restart** (reiniciar o serviço)
6. Aguarde 1-2 minutos

---

### ✅ PASSO 3: EXECUTAR SQL NO BANCO

**Opção A: Via Easypanel (se tiver SQL Editor)**

1. Vá em: **Projects** → **finance-app-supabase** → **SQL Editor**
2. Copie TODO o conteúdo do arquivo: `CONFIGURAR-BANCO-COMPLETO.sql`
3. Cole no editor
4. Clique em: **Run** ou **Executar**

**Opção B: Via SSH (se não tiver SQL Editor)**

```bash
# 1. Fazer upload do SQL para o servidor
scp CONFIGURAR-BANCO-COMPLETO.sql root@seu-servidor:/tmp/

# 2. Conectar no servidor
ssh root@seu-servidor

# 3. Descobrir o nome do container do PostgreSQL
docker ps | grep postgres

# 4. Executar o SQL (substitua <CONTAINER_ID> pelo ID do container)
docker exec -i <CONTAINER_ID> psql -U postgres -d postgres < /tmp/CONFIGURAR-BANCO-COMPLETO.sql
```

---

### ✅ PASSO 4: TESTAR

1. Acesse: **https://finance-app-finance-app.rcnehy.easypanel.host**
2. Vá para a página de login
3. Crie uma conta de teste
4. ✅ Deve funcionar SEM erros de CORS

---

## 🐛 SE DER ERRO

### Erro de CORS ainda aparece?
- Verifique se TODAS as 7 variáveis foram adicionadas
- Verifique se o Supabase foi RESTARTADO
- Aguarde 2 minutos após restart

### Erro de tabelas não existem?
- Verifique se o SQL foi executado com sucesso
- Execute este comando para verificar:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Frontend ainda usa URL antiga?
- Verifique se o REBUILD foi concluído
- Verifique na console do navegador qual URL está sendo usada
- Limpe o cache do navegador (Ctrl+Shift+R)

---

## 📞 VERIFICAÇÕES RÁPIDAS

```bash
# Testar se Supabase está respondendo
curl https://finance-app-supabase.rcnehy.easypanel.host/rest/v1/

# Testar se frontend está no ar
curl https://finance-app-finance-app.rcnehy.easypanel.host/
```

---

## ✅ TUDO CERTO QUANDO

- [ ] Frontend faz rebuild com sucesso
- [ ] CORS configurado no Supabase (7 variáveis)
- [ ] Supabase restartado
- [ ] SQL executado (tabelas criadas)
- [ ] Login funciona sem erro de CORS
- [ ] Console do navegador mostra: `🔧 Supabase URL: https://finance-app-supabase.rcnehy.easypanel.host`

---

**🎯 Ordem correta:**
1. REBUILD frontend
2. CORS no Supabase
3. SQL no banco
4. TESTAR

**Boa sorte! 🚀**
