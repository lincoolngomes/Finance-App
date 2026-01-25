# 🔧 GUIA: Consertar Supabase no Easypanel

## 📋 Problema Atual
O Supabase no Easypanel está retornando erro **502 Bad Gateway**.

---

## ✅ SOLUÇÃO: Reiniciar Serviço Supabase

### Passo 1: Acessar o Easypanel

1. Abra no navegador: **https://rcnehy.easypanel.host**
2. Faça login com suas credenciais

### Passo 2: Localizar o Serviço Supabase

1. No menu lateral, clique em **"Projects"** ou **"Projetos"**
2. Procure pelo projeto: **finance-app**
3. Clique no projeto para abrir
4. Procure pelo serviço: **finance-app-supabase** ou **supabase**

### Passo 3: Verificar Logs (Opcional)

Antes de reiniciar, veja o que está acontecendo:

1. Clique no serviço **finance-app-supabase**
2. Vá para a aba **"Logs"** ou **"Runtime"**
3. Verifique se há erros nos logs
4. Tire um print se houver erros (pode me mostrar depois)

### Passo 4: Reiniciar o Serviço

**Opção A - Restart (Recomendado):**
1. Clique no serviço **finance-app-supabase**
2. Procure pelo botão **"Restart"** ou **"Reiniciar"**
3. Clique e aguarde 1-2 minutos
4. Verifique se o status mudou para **"Running"** ou **"Ativo"**

**Opção B - Redeploy (se Restart não funcionar):**
1. Clique no serviço **finance-app-supabase**
2. Procure pelo botão **"Redeploy"** ou **"Deploy"**
3. Clique e aguarde 2-3 minutos
4. Verifique se o status mudou para **"Running"**

### Passo 5: Verificar se Voltou

Execute no terminal:

```bash
curl -I https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/health
```

**Resultado esperado:**
```
HTTP/2 200
```

**Se ainda der erro 502:**
```
HTTP/2 502
```

---

## 🔍 Se Ainda Não Funcionar

### Verificar Containers Docker

Se você tem acesso SSH ao servidor:

1. **Ver containers rodando:**
```bash
docker ps | grep supabase
```

2. **Ver logs do container:**
```bash
docker logs finance-app-supabase
```

3. **Reiniciar manualmente:**
```bash
docker restart finance-app-supabase
```

### Verificar Recursos do Servidor

1. No Easypanel, vá em **"Server"** ou **"Servidor"**
2. Verifique:
   - **CPU:** Não deve estar em 100%
   - **RAM:** Não deve estar totalmente cheia
   - **Disk:** Deve ter espaço livre

Se estiver sem recursos:
- Reinicie o servidor inteiro
- Ou aumente os recursos (upgrade)

---

## 🆘 Problemas Comuns

### Erro: "Out of Memory"
**Solução:** Reinicie o servidor ou aumente a RAM

### Erro: "Port already in use"
**Solução:** Remova o serviço e crie novamente

### Erro: "Database not found"
**Solução:** Restaure o backup do banco de dados

---

## ✅ Depois de Consertar

1. **Volte ao terminal e execute:**
```bash
node /Users/lincoln/Programming/Finance-App/cors-proxy.js
```

2. **Em outro terminal:**
```bash
cd /Users/lincoln/Programming/Finance-App && npm run dev
```

3. **Acesse:** http://localhost:8082/auth

4. **Faça login** com suas credenciais do Easypanel

---

## 📞 Precisa de Ajuda?

Me avise:
- ✅ Se conseguiu reiniciar
- ❌ Se deu algum erro
- 📸 Mande print dos logs se houver erros

Estou aqui para ajudar!
