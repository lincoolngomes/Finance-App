# Sistema de Assinatura Integrado - Finance App

## 📋 Visão Geral

O Finance App agora possui um sistema completo de assinatura integrado com N8N e Asaas API. Este sistema permite:

- Visualizar informações detalhadas da assinatura
- Integração automática com Asaas via N8N webhooks
- Gerenciamento de assinaturas pelo painel admin
- Sistema de fallback para maior confiabilidade

## 🛠️ Componentes Implementados

### 1. Backend/Database
- **Migração 004**: Campo `assinaturaId` adicionado à tabela `profiles`
- **Supabase RLS**: Políticas de segurança corrigidas

### 2. Serviços de Integração
- **`src/utils/subscription.ts`**: Serviço principal de assinatura
- **`src/utils/n8n-config.ts`**: Configurações do N8N atualizadas
- **`src/hooks/useSubscription.ts`**: Hook React para gerenciar estado

### 3. Interface de Usuário
- **`src/components/profile/SubscriptionInfo.tsx`**: Componente atualizado
- **`src/pages/Perfil.tsx`**: Página de perfil com aba de assinatura
- **`src/pages/Admin.tsx`**: Painel admin com campo de assinatura
- **`src/pages/Teste.tsx`**: Página de teste e debug

## 🔧 Como Usar

### Para Usuários
1. Acesse **Perfil → Aba Assinatura**
2. Clique em **"Adicionar Assinatura"**
3. Digite o ID da sua assinatura do Asaas (formato: `sub_xxxxxxxxxxxxxxxxxx`)
4. Clique em **"Salvar"**

### Para Administradores
1. Acesse **Administração**
2. Edite um usuário
3. Preencha o campo **"ID Assinatura"**
4. Salve as alterações

### Para Desenvolvedores/Teste
1. Acesse **Teste Assinatura** (só aparece em desenvolvimento)
2. Digite um ID de assinatura para testar
3. Clique em **"Testar Webhook"** para verificar a integração
4. Use **"Salvar no Perfil"** para associar ao usuário atual

## 📡 Endpoints N8N

O sistema usa os seguintes webhooks:

### Produção
- **Principal**: `https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook-test/assinatura/info`
- **Backup**: `https://finance-app-n8n-finance-app.rcnehy.easypanel.host/webhook/assinatura/info`

### Desenvolvimento
- **Principal**: `/api/webhook-test/assinatura/info` (proxy via Vite)
- **Backup**: `/api/webhook/assinatura/info` (proxy via Vite)

## 🔄 Fluxo de Funcionamento

1. **Usuário configura ID**: Via perfil ou admin
2. **Sistema busca dados**: Hook `useSubscription` busca automaticamente
3. **Chamada N8N**: Webhook POST com parâmetro `subscription`
4. **Fallback**: Se falhar, tenta URL backup automaticamente
5. **Exibição**: Dados formatados na interface do usuário

## 📊 Dados Retornados

O webhook N8N deve retornar:

```json
{
  "id": "sub_xxxxxxxxxxxxxxxxxx",
  "dataAssinatura": "2024-01-15",
  "valor": 29.90,
  "ciclo": "MONTHLY",
  "status": "ACTIVE",
  "proximoPagamento": "2024-12-15",
  "creditCard": {
    "creditCardNumber": "1234",
    "creditCardBrand": "VISA",
    "creditCardToken": "token_xxx"
  }
}
```

## 🔒 Autenticação

O sistema suporta três tipos de autenticação configuráveis em `n8n-config.ts`:

### 1. Sem Autenticação (atual)
```typescript
AUTH_TYPE: 'none'
```

### 2. Token Asaas
```typescript
AUTH_TYPE: 'asaas'
ASAAS_TOKEN: 'seu_token_aqui'
```

### 3. Basic Authentication
```typescript
AUTH_TYPE: 'basic'
USERNAME: 'usuario'
PASSWORD: 'senha'
```

## 🚀 Deploy

### Banco de Dados
Execute a migração no ambiente de produção:

```sql
-- supabase/migrations/004_add_assinatura_id.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assinaturaId VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_profiles_assinatura_id ON profiles(assinaturaId);
```

### Frontend
1. Build do projeto: `npm run build`
2. Deploy no Easypanel via GitHub
3. Configurar variáveis de ambiente se necessário

### N8N Workflow
Certifique-se que o workflow N8N está:
1. ✅ Ativo e funcionando
2. ✅ Endpoint `/assinatura/info` configurado
3. ✅ Integração com Asaas API funcionando
4. ✅ Retornando dados no formato esperado

## 🧪 Testes

### Teste Manual
1. Acesse `/teste` no ambiente de desenvolvimento
2. Digite um ID de assinatura válido
3. Clique em "Testar Webhook"
4. Verifique os dados retornados

### Logs de Debug
O sistema possui logs detalhados no console:
- 📧 Início da busca
- 🔄 Tentativas de webhook
- 📡 Status das respostas
- ✅/❌ Sucesso/falha das operações

## 📋 Checklist de Implementação

- [x] Migração database (`assinaturaId`)
- [x] Serviço de integração N8N
- [x] Hook React de assinatura
- [x] Interface usuário (perfil)
- [x] Painel administrativo
- [x] Página de teste/debug
- [x] Sistema de fallback
- [x] Logs e error handling
- [x] Documentação completa

## 🔧 Troubleshooting

### Problema: "Assinatura não encontrada"
- Verifique se o ID está correto
- Teste o webhook diretamente
- Verifique os logs do N8N

### Problema: "Erro de conexão"
- Verifique conectividade com N8N
- Teste URLs de fallback
- Verifique configurações de proxy (dev)

### Problema: "Dados inválidos"
- Verifique formato de resposta do N8N
- Confirme se todos os campos obrigatórios estão presentes
- Verifique logs de parsing JSON

## 📞 Suporte

Para problemas com o sistema de assinatura:
1. Consulte os logs do console do navegador
2. Verifique a página `/teste` para debug
3. Confirme se o N8N workflow está ativo
4. Teste os endpoints manualmente

---

**Status**: ✅ Implementado e Funcional
**Última atualização**: Novembro 2024
**Versão**: 2.1