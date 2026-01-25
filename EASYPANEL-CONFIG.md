# ✅ CONFIGURAÇÃO DO SUPABASE NO EASYPANEL

## 🎯 URL do Novo Supabase
**https://finance-app-supabase.rcnehy.easypanel.host**

---

## 📝 VARIÁVEIS DE AMBIENTE PARA ADICIONAR/ATUALIZAR

### No Easypanel:
1. Acesse: **Projects → finance-app → supabase**
2. Clique em: **Environment** ou **Settings**
3. **ADICIONE ou ATUALIZE** estas variáveis:

---

### 🔴 VARIÁVEIS OBRIGATÓRIAS PARA CORS (ADICIONE ESTAS!)

**IMPORTANTE:** Estas configurações funcionam para:
- ✅ Desenvolvimento local (localhost)
- ✅ Produção no VPS (seu domínio)

```env
SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,https://SEU-DOMINIO-FRONTEND.com,https://finance-app.rcnehy.easypanel.host
API_EXTERNAL_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,https://SEU-DOMINIO-FRONTEND.com,https://finance-app.rcnehy.easypanel.host,https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
ENABLE_EMAIL_AUTOCONFIRM=true
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
```

**⚠️ SUBSTITUA:**
- `https://SEU-DOMINIO-FRONTEND.com` → URL do seu app frontend em produção
- Ou se o frontend também está no Easypanel: `https://finance-app.rcnehy.easypanel.host`

---

### ⚠️ NÃO MEXA NESTAS (Se já existem)

```env
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
```

---

## 🔄 DEPOIS DE SALVAR

1. **Salve** as alterações
2. **REINICIE** o serviço (botão "Restart")
3. **Aguarde** 1-2 minutos

---

## 🧪 TESTE

```bash
curl -v -H "Origin: http://localhost:8085" -X OPTIONS https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/signup 2>&1 | grep "access-control"
```

**Esperado:** `< access-control-allow-origin: http://localhost:8085`

---

## ✅ DEPOIS

Acesse: **http://localhost:8085/auth** e crie uma conta!
- O repositório é público, não precisa de chave SSH
- Certifique-se de adicionar as environment variables