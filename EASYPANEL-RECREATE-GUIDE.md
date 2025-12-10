# 📝 Configuração para Recriar Deployment no Easypanel

## 🔧 Informações do Projeto

### Repositório Git
- **URL:** `https://github.com/lincoolngomes/Finance-App.git`
- **Branch:** `main`
- **Commit atual:** `df03e50`

---

## ⚙️ Configurações de Build

### Build Settings
```
Build Command: npm install --legacy-peer-deps && npm run build
Start Command: npm run preview -- --host 0.0.0.0 --port $PORT
```

Ou alternativamente (usando serve):
```
Build Command: npm install --legacy-peer-deps && npm run build
Start Command: npm start
```

### Node Version
- **Node:** v24.11.1 (ou LTS mais recente)
- **Package Manager:** npm

---

## 🔐 Variáveis de Ambiente

Configure estas variáveis de ambiente no Easypanel:

```env
VITE_SUPABASE_URL=https://finance-app-supabase-finance-app.rcnehy.easypanel.host
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
NODE_ENV=production
PORT=8080
```

**⚠️ Importante:** Certifique-se de que `VITE_APP_URL` está configurada com a URL final do Easypanel após o deploy.

---

## 📋 Passo a Passo

### 1. Backup das Configurações Atuais
- [ ] Anote todas as variáveis de ambiente atuais
- [ ] Faça screenshot das configurações de build
- [ ] Salve URL do domínio customizado (se houver)

### 2. Deletar Projeto Antigo
1. No Easypanel, navegue até o projeto Finance-App
2. Vá em **Settings** → **Danger Zone**
3. Clique em **Delete Project**
4. Confirme a exclusão

### 3. Criar Novo Projeto
1. No dashboard do Easypanel, clique em **New Project**
2. Selecione **From Git Repository**
3. Configure:
   - **Repository URL:** `https://github.com/lincoolngomes/Finance-App.git`
   - **Branch:** `main`
   - **Auto Deploy:** ✅ Enabled (deploy automático em push)

### 4. Configurar Build
Na seção de Build Settings:

**Build Command:**
```bash
npm install --legacy-peer-deps && npm run build
```

**Start Command (Opção 1 - Recomendado):**
```bash
npm run preview -- --host 0.0.0.0 --port $PORT
```

**Start Command (Opção 2 - Alternativa):**
```bash
npm start
```

### 5. Configurar Variáveis de Ambiente
Na seção Environment Variables, adicione:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://finance-app-supabase-finance-app.rcnehy.easypanel.host` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

### 6. Deploy
1. Clique em **Create & Deploy**
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Verifique os logs para garantir que não há erros

### 7. Configurar Domínio (se necessário)
1. Vá em **Settings** → **Domains**
2. Adicione domínio customizado ou use o domínio do Easypanel
3. Configure SSL/HTTPS (geralmente automático)

---

## ✅ Checklist de Verificação Pós-Deploy

Após o deploy, teste:

- [ ] Aplicação carrega corretamente
- [ ] Login funciona
- [ ] Dashboard exibe dados
- [ ] Saldos estão corretos (incluindo saldos iniciais)
- [ ] Transações podem ser criadas
- [ ] Bulk operations funcionam
- [ ] Export para Excel funciona
- [ ] Gráfico de evolução mensal aparece
- [ ] Filtros de mês/ano funcionam
- [ ] Categorias carregam corretamente

---

## 🐛 Troubleshooting

### Build falha com "Cannot find module"
**Solução:** Certifique-se de usar `--legacy-peer-deps` no comando de build

### Aplicação não inicia
**Solução:** Verifique se o comando start está correto e se a variável `$PORT` é reconhecida

### "Failed to fetch" ou erro de CORS
**Solução:** Verifique se `VITE_SUPABASE_URL` está correta e acessível

### Página em branco
**Solução:** 
1. Verifique logs do build
2. Confirme que `dist/` foi gerado corretamente
3. Teste localmente com `npm run preview`

---

## 📞 Suporte

Se encontrar problemas:
1. Consulte logs do Easypanel
2. Verifique documentação: https://easypanel.io/docs
3. Entre em contato com suporte do Easypanel

---

## 📊 Melhorias Incluídas neste Deploy

Este deploy inclui as seguintes melhorias (commit `df03e50`):

✨ **Novas Features:**
- Seleção múltipla com checkboxes para operações em massa
- Edit/Delete em massa de transações
- Export para Excel (XLSX) com saldos iniciais
- Gráfico de evolução mensal no Dashboard
- Filtros de mês/ano em Transações
- Formulário de transação padronizado
- Páginas de Contas e Cartões

🐛 **Correções:**
- Cálculo de saldo agora inclui saldos iniciais das contas
- Resumo do Período sincronizado com Saldo Atual
- Normalização de datas em UTC
- Validação de UUIDs vazios
- Tipo "Cartão de Crédito" renomeado

🎨 **Melhorias de UI:**
- Cards de resumo consistentes
- Tooltips informativos nos gráficos
- Seletores de conta/cartão
- Interface mais intuitiva

---

**Data de criação:** 10/12/2025  
**Commit base:** df03e50  
**Branch:** main
