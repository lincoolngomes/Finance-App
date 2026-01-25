# 🌍 CORS: Desenvolvimento vs Produção

## 📚 Entendendo o Problema

### ❌ ERRADO (Só localhost)
```env
ADDITIONAL_REDIRECT_URLS=http://localhost:8085
```
**Problema:** Funciona APENAS no seu computador. Quando alguém acessar pelo domínio do VPS, NÃO FUNCIONA!

### ✅ CORRETO (Localhost + Produção)
```env
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,https://seu-dominio.com
```
**Solução:** Funciona EM AMBOS os ambientes!

---

## 🎯 CONFIGURAÇÃO COMPLETA PARA EASYPANEL

### Cenário 1: Você TEM domínio próprio (ex: meuapp.com.br)

```env
SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,https://meuapp.com.br,https://www.meuapp.com.br
API_EXTERNAL_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,https://meuapp.com.br,https://www.meuapp.com.br,https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_MAILER_AUTOCONFIRM=true
ENABLE_EMAIL_AUTOCONFIRM=true
```

**Substitua:**
- `meuapp.com.br` → Seu domínio real
- `www.meuapp.com.br` → Versão com www (se usar)

---

### Cenário 2: Você USA o domínio do Easypanel (rcnehy.easypanel.host)

```env
SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,https://finance-app.rcnehy.easypanel.host
API_EXTERNAL_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,https://finance-app.rcnehy.easypanel.host,https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_MAILER_AUTOCONFIRM=true
ENABLE_EMAIL_AUTOCONFIRM=true
```

**Onde:**
- `finance-app.rcnehy.easypanel.host` → URL do seu **frontend** em produção
- `finance-app-supabase.rcnehy.easypanel.host` → URL do **Supabase**

---

## 🔍 Como Descobrir a URL do Frontend?

### Opção 1: Easypanel
1. Acesse: https://rcnehy.easypanel.host
2. Vá em: Projects → finance-app
3. Procure pelo serviço do **frontend** (não o supabase)
4. Veja a URL/domínio configurado

### Opção 2: Pergunte ao Easypanel
No terminal SSH:
```bash
curl -s https://rcnehy.easypanel.host | grep -i "finance-app"
```

---

## 📝 RESUMO: O Que Adicionar no Easypanel

### Para DESENVOLVIMENTO + PRODUÇÃO (Recomendado):

**Se você ainda não sabe a URL de produção**, adicione assim:

```env
SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173,https://finance-app.rcnehy.easypanel.host,https://*.rcnehy.easypanel.host
API_EXTERNAL_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_SITE_URL=https://finance-app-supabase.rcnehy.easypanel.host
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,https://finance-app.rcnehy.easypanel.host,https://*.rcnehy.easypanel.host
GOTRUE_MAILER_AUTOCONFIRM=true
ENABLE_EMAIL_AUTOCONFIRM=true
```

**Explicação:**
- `http://localhost:8085` → Para desenvolvimento local
- `https://finance-app.rcnehy.easypanel.host` → Para produção no VPS
- `https://*.rcnehy.easypanel.host` → Qualquer subdomínio do Easypanel

---

## ⚠️ IMPORTANTE: Atualizar o Frontend Também

Quando fizer deploy do frontend, você precisa:

### 1. Verificar variáveis de ambiente do FRONTEND

No Easypanel, serviço **finance-app** (frontend):

```env
VITE_SUPABASE_URL=https://finance-app-supabase.rcnehy.easypanel.host
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

---

## 🧪 TESTAR

### Desenvolvimento (localhost):
```bash
# Inicie o app localmente
npm run dev

# Acesse
http://localhost:8085/auth
```

### Produção (VPS):
```bash
# Faça deploy no Easypanel
# Depois acesse
https://finance-app.rcnehy.easypanel.host/auth
```

**Ambos devem funcionar!** ✅

---

## 💡 DICA: Como Funciona o CORS

```
┌─────────────────┐         ┌─────────────────────┐
│   Frontend      │ ───────▶│   Supabase         │
│   localhost     │ ◀─────── │   VPS              │
│   ou VPS        │         │                     │
└─────────────────┘         └─────────────────────┘
                               ↑
                               │
                    Precisa permitir AMBAS as URLs
                    na lista GOTRUE_URI_ALLOW_LIST
```

---

## ✅ CHECKLIST

- [ ] Adicionei localhost para desenvolvimento
- [ ] Adicionei domínio do VPS para produção
- [ ] Salvei no Easypanel
- [ ] Reiniciei o Supabase
- [ ] Testei login local (http://localhost:8085)
- [ ] Vou testar login em produção depois do deploy

---

## 🚀 PRÓXIMOS PASSOS

1. **AGORA:** Configure com localhost + VPS
2. **DEPOIS:** Quando fizer deploy do frontend, teste em produção
3. **FUTURO:** Se comprar domínio próprio, adicione também

**Qual é a URL do seu frontend em produção?** 
(Se não sabe, use: `https://finance-app.rcnehy.easypanel.host`)
