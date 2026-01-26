# 🚀 Integração Mercado Pago - Guia Completo

## 📋 Visão Geral

Sistema completo de pagamentos e assinaturas integrado ao Finance App usando Mercado Pago.

**Funcionalidades:**
- ✅ Pagamento via PIX (instantâneo)
- ✅ Cartão de crédito (parcelado)
- ✅ Assinaturas recorrentes
- ✅ Cadastros gratuitos pelo admin
- ✅ Trials de 7 dias
- ✅ Renovação automática
- ✅ Reembolsos automáticos
- ✅ Checkout integrado no app

---

## 🎯 Passo 1: Obter Credenciais do Mercado Pago

### 1.1 Acessar Painel

1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login com sua conta
3. Vá em **"Suas integrações"** → **"Criar aplicação"**
4. Preencha:
   - Nome: `Finance App`
   - Descrição: `Sistema de assinaturas`
5. Clique em **"Criar aplicação"**

### 1.2 Copiar Credenciais

Você vai precisar de **2 chaves**:

1. **Public Key** (começa com `APP_USR-...` ou `TEST-...`)
2. **Access Token** (começa com `APP_USR-...` ou `TEST-...`)

**⚠️ IMPORTANTE:**
- Use as credenciais de **TESTE** primeiro
- Depois mude para **PRODUÇÃO** quando estiver tudo funcionando

📝 **Anote essas chaves!** Vamos usar logo mais.

---

## 🗄️ Passo 2: Configurar Banco de Dados

### 2.1 Executar SQL no Supabase

1. Acesse: https://finance-app-supabase.rcnehy.easypanel.host (seu VPS)
   - Ou se estiver usando supabase.com: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Cole TODO o conteúdo do arquivo `SETUP-MERCADOPAGO-INTEGRATION.sql`
4. Clique em **"Run"**
5. Aguarde sucesso ✅

**O que isso cria:**
- Tabela `subscriptions` (assinaturas)
- Tabela `mercadopago_transactions` (histórico de pagamentos)
- Tabela `subscription_plans` (planos disponíveis)
- Funções SQL para verificar acesso
- 3 planos pré-configurados (Mensal R$ 29,90 / Anual R$ 249,90 / Vitalício R$ 597,00)

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### 3.1 No Projeto (Arquivo .env)

Crie/edite o arquivo `.env` na raiz do projeto:

```bash
# Mercado Pago - TESTE (use primeiro)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key-aqui
VITE_MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token-aqui

# Mercado Pago - PRODUÇÃO (use depois)
# VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-sua-public-key-aqui
# VITE_MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-access-token-aqui

# Supabase (já deve ter)
VITE_SUPABASE_URL=https://finance-app-supabase.rcnehy.easypanel.host
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 3.2 No Supabase (Edge Function)

As Edge Functions precisam do Access Token. Configure:

1. Acesse: Easypanel → Supabase → Environment Variables
2. Adicione:
   ```
   MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token-aqui
   ```
3. Salve e reinicie o serviço

---

## 🔧 Passo 4: Deploy da Edge Function

### 4.1 Instalar Supabase CLI (se não tiver)

```bash
# macOS
brew install supabase/tap/supabase
```

### 4.2 Login e Deploy

```bash
# Login (abre navegador)
supabase login

# Na pasta do projeto
cd /Users/lincoln/Programming/Finance-App

# Linkar projeto (use Project ID do Supabase)
supabase link --project-ref SEU_PROJECT_ID

# Deploy da function
supabase functions deploy mercadopago-webhook --no-verify-jwt

# Setar variável de ambiente
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token-aqui
```

**URL do Webhook será:**
```
https://SEU_PROJECT_ID.supabase.co/functions/v1/mercadopago-webhook
```

OU se estiver usando VPS:
```
https://finance-app-supabase.rcnehy.easypanel.host/functions/v1/mercadopago-webhook
```

---

## 🔔 Passo 5: Configurar Webhook no Mercado Pago

### 5.1 Configurar Notificações

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Clique na sua aplicação **"Finance App"**
3. Vá em **"Webhooks"** (menu lateral)
4. Clique em **"Configurar notificações"**
5. Cole a URL:
   ```
   https://finance-app-supabase.rcnehy.easypanel.host/functions/v1/mercadopago-webhook
   ```
6. Eventos: Marque **"Pagamentos"** (payment)
7. Modo: **Produção** (ou Teste, conforme sua fase)
8. Clique em **"Salvar"**

### 5.2 Testar Webhook

1. Na mesma tela, clique em **"Simular notificação"**
2. Escolha evento: **"payment"**
3. Clique em **"Enviar"**
4. Verifique se retornou status 200 ✅

---

## 💻 Passo 6: Testar Pagamento

### 6.1 Cartões de Teste

Use estes cartões no **modo TESTE**:

| Cartão | Número | CVV | Validade | Resultado |
|--------|--------|-----|----------|-----------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | ✅ Aprovado |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Aprovado |
| Amex | 3711 803032 57522 | 1234 | 11/25 | ✅ Aprovado |

**CPF para teste**: 12345678909

### 6.2 Testar PIX

No modo teste, o Mercado Pago vai gerar um QR Code falso que você pode "pagar" clicando em "Simular pagamento".

### 6.3 Fluxo Completo de Teste

1. Acesse seu app em: https://finance-app-finance-app.rcnehy.easypanel.host
2. Faça logout (se estiver logado)
3. Clique em **"Assinar"** ou **"Planos"**
4. Escolha um plano (Mensal R$ 29,90)
5. Clique em **"Assinar com Mercado Pago"**
6. Preencha com dados de teste
7. Use cartão de teste acima
8. Confirme pagamento
9. Aguarde 3-5 segundos
10. Você deve ser redirecionado e ter acesso liberado!

---

## ✅ Verificar se Funcionou

### Verificar Transação

```sql
-- No Supabase SQL Editor
SELECT * FROM mercadopago_transactions ORDER BY created_at DESC LIMIT 1;
```

Deve mostrar sua transação de teste com status `approved`.

### Verificar Assinatura

```sql
SELECT 
  u.email,
  s.plan_type,
  s.status,
  s.start_date,
  s.end_date
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
ORDER BY s.created_at DESC
LIMIT 1;
```

Deve mostrar assinatura ativa!

### Ver Logs da Edge Function

```bash
supabase functions logs mercadopago-webhook --tail
```

---

## 🚀 Passo 7: Colocar em Produção

Quando tudo estiver funcionando em TESTE:

### 7.1 Trocar Credenciais

1. No arquivo `.env`:
   ```bash
   # Comentar TESTE
   # VITE_MERCADOPAGO_PUBLIC_KEY=TEST-...
   # VITE_MERCADOPAGO_ACCESS_TOKEN=TEST-...
   
   # Descomentar PRODUÇÃO
   VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-sua-public-key-producao
   VITE_MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-access-token-producao
   ```

2. Atualizar Edge Function:
   ```bash
   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu-access-token-producao
   ```

3. Rebuild do frontend:
   ```bash
   git add .env
   git commit -m "chore: switch to Mercado Pago production"
   git push origin main
   ```

### 7.2 Atualizar Webhook

No painel do Mercado Pago, atualize o webhook para modo **Produção**.

---

## 💰 Preços dos Planos

Configurados no SQL (pode editar):

| Plano | Preço | Parcelamento | Economia |
|-------|-------|--------------|----------|
| Mensal | R$ 29,90 | 1x | - |
| Anual | R$ 249,90 | até 12x | R$ 108,90 (30%) |
| Vitalício | R$ 597,00 | até 12x | Acesso eterno |

**Para alterar preços:**

```sql
UPDATE subscription_plans SET price = 49.90 WHERE plan_type = 'monthly';
```

---

## 🎨 Interface (Próximo Passo)

Vou criar agora:

1. **Modal de Checkout** - Bonito com opções PIX e Cartão
2. **Página de Planos** - Cards com preços e features
3. **Página "Minha Assinatura"** - Status, cancelar, renovar
4. **Botão "Assinar"** - Integrado no app

Quer que eu continue implementando a interface? 🚀

---

## 🆘 Troubleshooting

### Webhook não funciona

```bash
# Ver logs
supabase functions logs mercadopago-webhook

# Testar manualmente
curl -X POST https://SEU_URL/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

### Pagamento aprovado mas acesso não liberado

```sql
-- Verificar se transação foi registrada
SELECT * FROM mercadopago_transactions WHERE payment_id = 'ID_DO_PAGAMENTO';

-- Verificar se assinatura foi criada
SELECT * FROM subscriptions WHERE mp_payment_id = 'ID_DO_PAGAMENTO';

-- Forçar criação manual se necessário
-- (substitua user_id pelo UUID do usuário)
INSERT INTO subscriptions (user_id, plan_type, status, created_by, end_date)
VALUES ('UUID_DO_USUARIO', 'monthly', 'active', 'admin', NOW() + INTERVAL '1 month');
```

---

## 📊 Relatórios Úteis

### Faturamento do Mês

```sql
SELECT 
  COUNT(*) as total_vendas,
  SUM(amount) as faturamento_total,
  AVG(amount) as ticket_medio
FROM mercadopago_transactions
WHERE status = 'approved'
AND created_at >= DATE_TRUNC('month', NOW());
```

### Assinaturas Ativas por Plano

```sql
SELECT 
  plan_type,
  COUNT(*) as quantidade,
  COUNT(*) * (SELECT price FROM subscription_plans sp WHERE sp.plan_type = s.plan_type) as receita_mensal
FROM subscriptions s
WHERE status = 'active'
GROUP BY plan_type;
```

---

**Tudo pronto!** 🎉

Execute o SQL, configure as credenciais e teste! Precisa de ajuda em algum passo específico?
