# 🔑 CONFIGURAÇÃO ASAAS - N8N WEBHOOK

## 🎯 **PROBLEMA IDENTIFICADO:**
O webhook N8N está configurado com **credenciais do Asaas** mas o Finance App estava usando autenticação básica.

## ✅ **SOLUÇÃO:**

### **1. Obter Token do Asaas:**

1. **Acesse o Asaas:** https://sandbox.asaas.com (ou https://asaas.com para produção)
2. **Vá em Integrações** → **API Keys**  
3. **Copie o Token de API**

### **2. Configurar no Finance App:**

No arquivo `src/utils/n8n-config.ts`, substitua:

```typescript
export const N8N_CONFIG = {
  // URL do seu webhook N8N
  WEBHOOK_URL: 'https://n8n.tidi.com.br/webhook/verifica-zap',
  
  // ⚡ SUBSTITUA pelo seu token real do Asaas:
  ASAAS_TOKEN: 'SEU_TOKEN_ASAAS_REAL_AQUI',
  
  // Usar autenticação do Asaas
  AUTH_TYPE: 'asaas' as 'asaas' | 'basic',
  
  // ... resto da configuração
};
```

### **3. Alternativa - Remover Autenticação do N8N:**

Se preferir **não usar** autenticação do Asaas no webhook:

**No N8N:**
1. Edite o nó **Webhook**
2. **Remova** a autenticação ("Authentication: None")
3. **Salve** o workflow

**No Finance App:**
```typescript
// Altere para autenticação básica ou nenhuma
AUTH_TYPE: 'basic' // ou remova completamente
```

### **4. Testar a Configuração:**

**Teste manual do webhook:**
```bash
# Com token Asaas:
curl -X POST "https://n8n.tidi.com.br/webhook/verifica-zap" \
  -H "Content-Type: application/json" \
  -H "access_token: SEU_TOKEN_ASAAS" \
  -d '{"whatsapp": "5511999999999"}'

# Ou sem autenticação:
curl -X POST "https://n8n.tidi.com.br/webhook/verifica-zap" \
  -H "Content-Type: application/json" \
  -d '{"whatsapp": "5511999999999"}'
```

## 🔧 **CONFIGURAÇÕES POSSÍVEIS:**

### **Opção A - Com Token Asaas:**
```typescript
AUTH_TYPE: 'asaas',
ASAAS_TOKEN: 'seu_token_real_aqui'
```

### **Opção B - Sem Autenticação:**
```typescript
AUTH_TYPE: 'basic', // ou remova
// Remove autenticação do webhook N8N também
```

### **Opção C - Autenticação Básica:**
```typescript
AUTH_TYPE: 'basic',
USERNAME: 'seu_usuario',
PASSWORD: 'sua_senha'
```

## 🚀 **DEPLOY:**

Depois de configurar:

1. **Salve** as alterações
2. **Commit e push** para GitHub
3. **Deploy** no Easypanel
4. **Teste** no Finance App

---

**💡 Qual opção você prefere usar?**
- ✅ **Token Asaas** (mais seguro)
- ✅ **Sem autenticação** (mais simples)
- ✅ **Autenticação básica** (compatível)