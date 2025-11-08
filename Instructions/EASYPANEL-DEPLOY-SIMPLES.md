# 🚀 Deploy Simples - Easypanel + GitHub

## ⚡ **Workflow Super Simples**

### **Para o desenvolvedor (você):**
```bash
# 1. Fazer mudanças no código
# 2. Commit e push
git add .
git commit -m "feat: descrição da mudança"
git push origin main

# 3. No Easypanel: apertar "Implantar"
# 4. Pronto! ✅
```

### **Configuração no Easypanel:**

#### **🔧 Aplicativo > Git:**
```
URL: https://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@github.com/lincoolngomes/Finance-App.git
Branch: main
Build Command: npm install --legacy-peer-deps && npm run build
Output Directory: dist
```

#### **🌍 Variáveis de Ambiente:**
```
NODE_ENV=production
VITE_SUPABASE_URL=https://finance-app-supabase-finance-app.rcnehy.easypanel.host
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

## 🎯 **Fluxo de trabalho:**

1. **Desenvolvimento** → Código local
2. **Git push** → GitHub atualizado  
3. **Easypanel "Implantar"** → Deploy automático
4. **Site online** → Mudanças no ar

## ✅ **Vantagens:**
- 🚀 **1 clique** para deploy
- 🔄 **Sempre sincronizado** com GitHub
- 💻 **Build automático** 
- 🌐 **Site estático** otimizado
- 🛠️ **Zero configuração** adicional

## 🔧 **Comandos úteis para desenvolvimento:**

```bash
# Desenvolvimento local
npm run dev

# Build local (teste)
npm run build

# Deploy para produção
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# Depois: Easypanel > Implantar
```

**Simples assim! 🎉**