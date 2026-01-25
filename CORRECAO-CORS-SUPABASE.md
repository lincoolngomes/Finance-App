# 🔴 CORREÇÃO DEFINITIVA - CORS Supabase Bloqueando Localhost

## ❌ Problema Atual

```
Access to fetch at 'https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/token?grant_type=refresh_token' 
from origin 'http://localhost:8082' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Causa:** O Supabase no Easypanel não está configurado para aceitar requisições de `http://localhost:8082`.

---

## ✅ SOLUÇÃO 1: Configurar CORS no Supabase (RECOMENDADO)

### 📋 Passo a Passo no Easypanel

1. **Acesse o Easypanel** em `https://rcnehy.easypanel.host`

2. **Localize o serviço Supabase:**
   - Projeto: `finance-app`
   - Serviço: `finance-app-supabase` (ou similar)

3. **Adicione as variáveis de ambiente:**

   Clique em **Environment Variables** e adicione:

   ```bash
   # URLs permitidas para autenticação
   ADDITIONAL_REDIRECT_URLS=http://localhost:8082,http://localhost:8083,http://localhost:5173,http://localhost:3000
   
   # URL principal do site (usada para CORS)
   SITE_URL=http://localhost:8082
   
   # Configuração de CORS para GoTrue (Auth)
   GOTRUE_SITE_URL=http://localhost:8082
   GOTRUE_URI_ALLOW_LIST=http://localhost:8082,http://localhost:8083,http://localhost:5173,http://localhost:3000
   
   # CORS para Kong Gateway
   KONG_CORS_ORIGINS=http://localhost:8082,http://localhost:8083,http://localhost:5173,http://localhost:3000
   KONG_CORS_CREDENTIALS=true
   ```

4. **Reinicie o serviço Supabase:**
   - Clique em **Restart** no serviço
   - Aguarde 30-60 segundos para aplicar as mudanças

5. **Teste novamente:**
   - Abra o navegador em `http://localhost:8082`
   - Abra o Console (F12)
   - Execute: `localStorage.clear()`
   - Recarregue a página (F5)
   - Faça login novamente

---

## ✅ SOLUÇÃO 2: Limpar Cache e Fazer Novo Login (TEMPORÁRIO)

Se você não tem acesso ao Easypanel ou quer testar rapidamente:

### No Navegador (Chrome/Edge/Brave):

1. **Abra o Console:**
   - Pressione `F12` ou `Cmd+Option+I` (Mac)
   - Vá para a aba **Console**

2. **Limpe o localStorage:**
   ```javascript
   localStorage.clear()
   ```

3. **Limpe os cookies do site:**
   ```javascript
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```

4. **Recarregue a página:**
   - Pressione `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows/Linux)

5. **Faça login novamente**

**⚠️ Atenção:** Esta solução é temporária. O erro voltará quando o token expirar (1 hora).

---

## ✅ SOLUÇÃO 3: Usar um Proxy Local (ALTERNATIVA)

Se as soluções acima não funcionarem, você pode usar um proxy:

### Instalar e Configurar:

1. **Instale o `local-cors-proxy`:**
   ```bash
   npm install -g local-cors-proxy
   ```

2. **Inicie o proxy:**
   ```bash
   lcp --proxyUrl https://finance-app-supabase-finance-app.rcnehy.easypanel.host --port 8084
   ```

3. **Modifique o arquivo `src/lib/supabase.ts`:**
   ```typescript
   // TEMPORÁRIO - Usar proxy local para desenvolvimento
   const supabaseUrl = 'http://localhost:8084'
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
   ```

4. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 🔍 Verificar se o CORS foi Corrigido

Execute no Console do navegador:

```javascript
fetch('https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/health', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:8082',
    'Access-Control-Request-Method': 'POST'
  }
})
.then(res => {
  console.log('✅ CORS OK:', res.headers.get('access-control-allow-origin'))
})
.catch(err => {
  console.error('❌ CORS BLOQUEADO:', err)
})
```

**Resultado esperado:**
```
✅ CORS OK: http://localhost:8082
```

---

## 📝 Checklist de Resolução

- [ ] Tentou **Solução 1** (Configurar CORS no Easypanel)?
- [ ] Adicionou as variáveis `ADDITIONAL_REDIRECT_URLS` e `SITE_URL`?
- [ ] Reiniciou o serviço Supabase?
- [ ] Limpou o `localStorage` no navegador?
- [ ] Fez novo login?
- [ ] Testou com o script de verificação de CORS?

---

## 🆘 Se Nada Funcionar

Entre em contato com suporte do Easypanel ou considere:

1. **Migrar para Supabase Cloud** (grátis até 500MB):
   - https://supabase.com/dashboard
   - CORS já vem configurado por padrão

2. **Usar Docker Compose local** para desenvolvimento:
   ```bash
   cd /Users/lincoln/Programming/Finance-App
   docker-compose up -d
   ```

---

## 📚 Referências

- [Supabase CORS Configuration](https://supabase.com/docs/guides/api/cors)
- [Easypanel Environment Variables](https://easypanel.io/docs/templates/supabase)
- [Kong Gateway CORS Plugin](https://docs.konghq.com/hub/kong-inc/cors/)
