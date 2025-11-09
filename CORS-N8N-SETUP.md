# 🔧 Configuração CORS para N8N Webhook

## ❌ Problema Atual
```
Access to fetch at 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

## ✅ Soluções para CORS no N8N

### **Opção 1: Configurar CORS no N8N (Recomendado)**

1. **Acesse as configurações do N8N**
2. **Adicione variáveis de ambiente:**
   ```env
   N8N_CORS_ORIGIN=*
   N8N_CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
   N8N_CORS_HEADERS=Content-Type,Authorization,access_token
   ```

3. **OU configure no docker-compose.yml:**
   ```yaml
   environment:
     - N8N_CORS_ORIGIN=*
     - N8N_CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
     - N8N_CORS_HEADERS=Content-Type,Authorization,access_token
   ```

### **Opção 2: Adicionar Node de Response no N8N**

1. **No seu workflow N8N, após o webhook:**
2. **Adicione um node "Set" com headers:**
   ```json
   {
     "headers": {
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
       "Access-Control-Allow-Headers": "Content-Type, Authorization"
     }
   }
   ```

### **Opção 3: Proxy no Vite (Para desenvolvimento)**

1. **Edite `vite.config.ts`:**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     server: {
       proxy: {
         '/api/webhook': {
           target: 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api\/webhook/, '/webhook')
         }
       }
     }
   })
   ```

2. **Altere a URL no `n8n-config.ts` para desenvolvimento:**
   ```typescript
   WEBHOOK_URL: import.meta.env.DEV 
     ? '/api/webhook/verifica-zap' 
     : 'https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap'
   ```

## 🎯 **Ação Recomendada:**

1. **Configure CORS no N8N** (Opção 1)
2. **Reinicie o N8N**
3. **Teste novamente no localhost**

## 📞 **URLs para Teste:**

- **Webhook Principal:** `https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap`
- **Webhook Teste:** `https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook-test/verifica-zap`

## 🧪 **Teste Manual via Curl:**
```bash
curl -X POST "https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/verifica-zap" \
  -H "Content-Type: application/json" \
  -d '{"whatsapp":"5511999999999"}' \
  -i
```

## 🔍 **Verificar Headers de Resposta:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Content-Type: application/json
```