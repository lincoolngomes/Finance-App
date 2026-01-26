# 🚀 Integração Kiwify + Supabase - Guia Completo

## 📋 Visão Geral

Este sistema substitui completamente o fluxo Asaas + N8N + WhatsApp por uma solução mais simples e robusta:

**Antes:**
```
Compra → Asaas → N8N → WhatsApp → Verificação manual
```

**Agora:**
```
Compra → Kiwify → Webhook → Supabase → Acesso liberado automaticamente
```

---

## 🎯 Funcionalidades

✅ **Cadastros Gratuitos** - Admin cria usuários manualmente  
✅ **Compras Automáticas** - Kiwify cria conta e libera acesso  
✅ **Trials** - Períodos de teste configuráveis  
✅ **Assinaturas Recorrentes** - Mensal, anual ou vitalício  
✅ **Renovações Automáticas** - Via webhooks do Kiwify  
✅ **Histórico Completo** - Todas as transações registradas  
✅ **Reembolsos** - Cancela acesso automaticamente  
✅ **Painel Admin** - Gerenciar todos os usuários e assinaturas  

---

## 📦 Passo 1: Configurar Banco de Dados

### 1.1 Execute o SQL no Supabase

1. Acesse: https://supabase.com → Seu Projeto → SQL Editor
2. Copie todo conteúdo do arquivo `SETUP-KIWIFY-INTEGRATION.sql`
3. Cole e clique em **"Run"**
4. Aguarde confirmação de sucesso

**O que isso cria:**
- Tabela `subscriptions` - Assinaturas dos usuários
- Tabela `kiwify_transactions` - Histórico de transações
- Funções SQL - Verificação de acesso, expiração automática
- RLS Policies - Segurança de acesso aos dados

---

## 🔧 Passo 2: Deploy da Edge Function

### 2.1 Instalar Supabase CLI (se não tiver)

```bash
# macOS
brew install supabase/tap/supabase

# Ou via npm
npm install -g supabase
```

### 2.2 Login no Supabase

```bash
supabase login
```

### 2.3 Link com seu projeto

```bash
# Na pasta do projeto
cd /Users/lincoln/Programming/Finance-App

# Linkar projeto (use o Project ID do Supabase)
supabase link --project-ref SEU_PROJECT_ID
```

### 2.4 Deploy da Function

```bash
supabase functions deploy kiwify-webhook
```

### 2.5 Obter URL do Webhook

Após deploy, você receberá uma URL assim:
```
https://SEU_PROJECT_ID.supabase.co/functions/v1/kiwify-webhook
```

**Anote essa URL!** Você vai precisar configurar no Kiwify.

---

## 🎨 Passo 3: Configurar Kiwify

### 3.1 Criar Produto no Kiwify

1. Acesse: https://dashboard.kiwify.com.br
2. Produtos → Criar Novo Produto
3. Configure:
   - Nome do produto
   - Valor
   - Tipo de cobrança (única, recorrente)
4. Salve o produto

### 3.2 Configurar Webhook

1. No produto criado → Configurações → Webhooks
2. Clique em **"Adicionar Webhook"**
3. Cole a URL da Edge Function:
   ```
   https://SEU_PROJECT_ID.supabase.co/functions/v1/kiwify-webhook
   ```
4. Selecione os eventos:
   - ✅ Compra Aprovada (purchase.approved)
   - ✅ Reembolso (purchase.refunded)
   - ✅ Assinatura Cancelada (subscription.cancelled)
5. Salve

### 3.3 Testar Webhook

1. Faça uma compra de teste no Kiwify (modo sandbox se disponível)
2. Verifique os logs da Edge Function:
   ```bash
   supabase functions logs kiwify-webhook
   ```
3. Confirme que apareceu:
   - ✅ Transação em `kiwify_transactions`
   - ✅ Assinatura em `subscriptions`
   - ✅ Usuário criado em `auth.users`

---

## 👥 Passo 4: Cadastros Gratuitos (Admin)

### 4.1 Criar Usuário Gratuito via SQL

```sql
-- 1. Criar usuário no Auth (substitua EMAIL e NOME)
INSERT INTO auth.users (
  email,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  'usuario@example.com',
  NOW(),
  '{"name": "Nome do Usuário"}'::jsonb
) RETURNING id;

-- 2. Copie o ID retornado e crie a assinatura gratuita
INSERT INTO public.subscriptions (
  user_id,
  plan_type,
  status,
  created_by,
  end_date
) VALUES (
  'ID_DO_USUARIO_AQUI',
  'free',
  'active',
  'admin',
  NULL -- Sem expiração
);
```

### 4.2 Criar Trial de 7 Dias

```sql
INSERT INTO public.subscriptions (
  user_id,
  plan_type,
  status,
  created_by,
  end_date,
  trial_end_date
) VALUES (
  'ID_DO_USUARIO_AQUI',
  'trial',
  'active',
  'admin',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days'
);
```

---

## 🔍 Passo 5: Verificar Acesso no Código

### 5.1 Proteger Rotas

```typescript
import { useHasActiveSubscription } from '@/hooks/useSubscriptionManagement';

function MinhaRotaProtegida() {
  const { data: hasAccess, isLoading } = useHasActiveSubscription();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!hasAccess) {
    return <div>Você precisa de uma assinatura ativa!</div>;
  }

  return <div>Conteúdo protegido aqui...</div>;
}
```

### 5.2 Mostrar Informações da Assinatura

```typescript
import { useSubscriptionInfo } from '@/hooks/useSubscriptionManagement';
import { formatPlanName, formatSubscriptionStatus } from '@/utils/subscription-service';

function MinhaAssinatura() {
  const { data: subscription } = useSubscriptionInfo();

  if (!subscription) {
    return <div>Você não tem assinatura ativa</div>;
  }

  return (
    <div>
      <h2>Minha Assinatura</h2>
      <p>Plano: {formatPlanName(subscription.plan_type)}</p>
      <p>Status: {formatSubscriptionStatus(subscription.status)}</p>
      {subscription.days_remaining && (
        <p>Expira em: {subscription.days_remaining} dias</p>
      )}
    </div>
  );
}
```

---

## 🛠️ Comandos Úteis

### Verificar Assinaturas Ativas

```sql
SELECT 
  u.email,
  s.plan_type,
  s.status,
  s.start_date,
  s.end_date,
  s.created_by
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

### Expirar Assinaturas Vencidas

```sql
-- Execute manualmente ou agende via cron
SELECT public.expire_subscriptions();
```

### Ver Últimas Transações do Kiwify

```sql
SELECT 
  transaction_id,
  customer_email,
  product_name,
  amount,
  status,
  paid_at
FROM kiwify_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Cancelar Assinatura Manualmente

```sql
UPDATE subscriptions
SET 
  status = 'cancelled',
  cancelled_at = NOW()
WHERE user_id = 'ID_DO_USUARIO_AQUI';
```

---

## 🎯 Fluxos Completos

### Fluxo 1: Compra Nova no Kiwify

1. Cliente compra produto no Kiwify
2. Kiwify envia webhook → Edge Function
3. Edge Function:
   - Registra transação
   - Verifica se cliente já existe (por email)
   - Se não existe: cria usuário
   - Cria/atualiza assinatura
4. Cliente recebe email (configurar depois)
5. Cliente pode fazer login e acessar sistema

### Fluxo 2: Cadastro Gratuito pelo Admin

1. Admin acessa painel (TODO: criar interface)
2. Clica em "Criar Usuário Gratuito"
3. Preenche email e nome
4. Escolhe tipo: Gratuito ou Trial
5. Sistema cria usuário + assinatura
6. Usuário recebe email de boas-vindas

### Fluxo 3: Reembolso no Kiwify

1. Cliente solicita reembolso
2. Kiwify processa reembolso
3. Kiwify envia webhook → Edge Function
4. Edge Function cancela assinatura
5. Usuário perde acesso imediatamente

---

## ✅ Checklist de Implementação

- [x] SQL executado no Supabase
- [x] Edge Function criada
- [ ] Edge Function deployada (`supabase functions deploy kiwify-webhook`)
- [ ] Webhook configurado no Kiwify
- [ ] Teste de compra realizado
- [ ] Interface admin criada (próximo passo)
- [ ] Página de assinatura do usuário criada (próximo passo)
- [ ] Email de boas-vindas configurado (opcional)

---

## 🚨 Troubleshooting

### Webhook não está funcionando

```bash
# Ver logs da Edge Function
supabase functions logs kiwify-webhook --tail

# Testar localmente
supabase functions serve kiwify-webhook

# Enviar teste manual
curl -X POST https://SEU_PROJECT_ID.supabase.co/functions/v1/kiwify-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"purchase.approved","transaction_id":"test123",...}'
```

### Usuário criado mas sem acesso

```sql
-- Verificar se assinatura existe e está ativa
SELECT * FROM subscriptions WHERE user_id = 'ID_DO_USUARIO';

-- Verificar se função retorna true
SELECT has_active_subscription('ID_DO_USUARIO');
```

### Assinatura não expira

```sql
-- Rodar manualmente
SELECT expire_subscriptions();

-- Ver assinaturas expiradas
SELECT * FROM subscriptions WHERE end_date < NOW() AND status = 'active';
```

---

## 📚 Próximos Passos

1. **Interface Admin** - Criar/gerenciar usuários gratuitos
2. **Página Assinatura** - Usuário ver status e renovar
3. **Emails Automáticos** - Boas-vindas, expiração, renovação
4. **Cronjob** - Expirar assinaturas automaticamente
5. **Página de Checkout** - Link direto para Kiwify

---

## 💡 Dicas

- Configure um produto de teste no Kiwify com valor R$ 0,01
- Use o modo sandbox do Kiwify se disponível
- Monitore os logs da Edge Function nos primeiros dias
- Crie alerts no Supabase para erros na Edge Function
- Faça backup regular da tabela `subscriptions`

---

**Dúvidas?** Consulte a documentação:
- Kiwify: https://docs.kiwify.com.br
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Auth: https://supabase.com/docs/guides/auth
