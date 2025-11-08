# Easypanel - Deploy como Aplicação Estática

## Configuração Simples (Recomendada):

### 1. No Easypanel:
- Clique em **"Novo Serviço"**
- Escolha **"Aplicação Estática"** (em vez de Docker Compose)

### 2. Configurações:
```
Nome: finance-app
Repositório: https://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@github.com/lincoolngomes/Finance-App.git
Branch: main
Build Command: npm install --legacy-peer-deps && npm run build
Output Directory: dist
Node Version: 18
```

### 3. Variáveis de Ambiente:
```
NODE_ENV=production
VITE_SUPABASE_URL=https://alqzqapccyclmffdfmlc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscXpxYXBjY3ljbG1mZmRmbWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMTY4OTIsImV4cCI6MjA2MTc5Mjg5Mn0.WAG002hANNqMuqN2BOnvAMG5SsM2T4Wttz9dKrTj2GY
```

## Vantagens:
- ✅ Mais simples de configurar
- ✅ Menos problemas de conflitos
- ✅ Build mais rápido
- ✅ Adequado para aplicações React/SPA