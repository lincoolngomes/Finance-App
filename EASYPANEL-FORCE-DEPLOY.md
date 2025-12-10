# 🚀 Guia de Deploy Forçado - Easypanel

## ⚠️ Problema Atual
**Erro:** "Failed to pull changes" ao tentar deploy no Easypanel

**Causa:** O servidor Easypanel tem mudanças locais conflitantes com o Git remoto

---

## ✅ Soluções (em ordem de prioridade)

### **Solução 1: Force Deploy via Easypanel UI** ⭐ RECOMENDADO

1. Acesse o dashboard do Easypanel
2. Navegue até o projeto Finance-App
3. Vá em **Settings** → **Git**
4. Procure por opção "Force Deploy" ou "Clean Deploy"
5. Se disponível, marque a opção **"Reset local changes"** ou **"Force pull"**
6. Clique em **Deploy**

**Vantagem:** Mais seguro, usa interface oficial do Easypanel

---

### **Solução 2: Recriar Deployment**

1. No Easypanel, vá até o projeto Finance-App
2. Clique em **Settings** → **Delete Project** (salve configurações antes!)
3. Crie um novo projeto:
   - Repository: `https://github.com/lincoolngomes/Finance-App.git`
   - Branch: `main`
   - Build Command: `npm install --legacy-peer-deps && npm run build`
   - Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
4. Configure as mesmas variáveis de ambiente do `.env.local`
5. Deploy

**Vantagem:** Garante ambiente limpo

---

### **Solução 3: SSH Manual no Servidor** (Avançado)

Se você tem acesso SSH ao servidor Easypanel:

```bash
# Conectar ao servidor
ssh usuario@servidor-easypanel

# Navegar para o diretório do projeto (normalmente em /home/easypanel/projects/)
cd /home/easypanel/projects/finance-app

# Limpar mudanças locais
git reset --hard HEAD
git clean -fd

# Forçar pull do remoto
git fetch origin
git reset --hard origin/main

# Reinstalar dependências e rebuild
npm install --legacy-peer-deps
npm run build

# Reiniciar aplicação
pm2 restart finance-app
# ou
systemctl restart finance-app
```

---

### **Solução 4: Webhook de Deploy**

Configure um webhook do GitHub para forçar deploy:

1. No GitHub, vá em **Settings** → **Webhooks** → **Add webhook**
2. Payload URL: `https://api.easypanel.io/webhooks/YOUR_WEBHOOK_ID`
3. Content type: `application/json`
4. Events: `Just the push event`
5. Ative o webhook
6. Teste fazendo um push

---

## 🔍 Verificar Estado Atual

Execute estes comandos localmente para ver o estado do repositório:

```bash
# Ver últimos commits
git log --oneline -5

# Ver status do repositório remoto
git fetch origin
git status

# Ver diferença entre local e remoto
git diff origin/main
```

**Resultado esperado:**
- Commit atual: `df03e50` (feat: Implementa melhorias no sistema financeiro)
- Branch: `main`
- Remoto: `origin/main` sincronizado

---

## 📋 Checklist Pós-Deploy

Após resolver o problema de pull, verifique:

- [ ] Build completa sem erros
- [ ] Aplicação inicia corretamente
- [ ] Variáveis de ambiente configuradas
- [ ] Conexão com Supabase funcionando
- [ ] Dashboard carrega com saldos corretos
- [ ] Transações podem ser criadas/editadas/excluídas
- [ ] Export para Excel funciona
- [ ] Gráfico de evolução mensal aparece
- [ ] Bulk operations funcionam

---

## 🆘 Se Nada Funcionar

Entre em contato com suporte do Easypanel:
- Documentação: https://easypanel.io/docs
- Discord: https://discord.gg/easypanel
- Email: support@easypanel.io

**Informações para fornecer:**
- Erro: "Failed to pull changes"
- Repositório: https://github.com/lincoolngomes/Finance-App.git
- Branch: main
- Commit: df03e50
- Framework: Vite + React + TypeScript
