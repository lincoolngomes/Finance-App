# 📱 CONFIGURAÇÃO N8N - VALIDAÇÃO WHATSAPP

## 🔧 **Problema Identificado:**
O Finance App não está conseguindo se conectar com o webhook N8N para validar números do WhatsApp.

## ⚡ **SOLUÇÃO PASSO-A-PASSO:**

### 1. 🌐 **Verificar URL do Webhook N8N**

No seu N8N, vá para o workflow "Valida WhatsApp":
- Clique no nó **Webhook**
- Copie a **URL de Produção** que aparece
- Deve ser algo como: `https://seu-n8n.com.br/webhook/verifica-zap`

### 2. 🔑 **Configurar Credenciais**

No arquivo `src/utils/n8n-config.ts`, atualize:

```typescript
export const N8N_CONFIG = {
  // SUBSTITUA pela URL real do seu webhook N8N
  WEBHOOK_URL: 'https://SEU-DOMINIO-N8N.com.br/webhook/verifica-zap',
  
  // SUBSTITUA pelas credenciais corretas
  USERNAME: 'seu-usuario',
  PASSWORD: 'sua-senha',
  
  TIMEOUT: 10000,
  
  EVOLUTION_API: {
    INSTANCE_NAME: 'FinanceApp' // Nome da sua instância Evolution API
  }
};
```

### 3. 🔧 **Testar Webhook N8N**

Teste se o webhook está funcionando:

```bash
curl -X POST "https://seu-n8n.com.br/webhook/verifica-zap" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [BASE64-ENCODED-CREDENTIALS]" \
  -d '{"whatsapp": "5511999999999"}'
```

**Resposta esperada:**
```json
{
  "exists": true,
  "whatsapp": "5511999999999@c.us"
}
```

### 4. 🛠️ **Verificar Evolution API**

Certifique-se de que:
- ✅ Evolution API está rodando
- ✅ Instância "FinanceApp" está conectada
- ✅ Credenciais da Evolution API estão corretas no N8N

### 5. 🔍 **Debug no Finance App**

Para debugar, verifique no console do navegador:
1. Vá para **Perfil** no Finance App
2. Tente alterar o telefone
3. Abra **F12** → **Console**
4. Veja os logs de erro

### 6. 🚨 **Possíveis Problemas:**

#### **A) URL Incorreta:**
- Verifique se a URL do webhook está correta
- Confirme se o N8N está acessível pela internet

#### **B) Credenciais Inválidas:**
- Teste as credenciais diretamente no N8N
- Verifique se a autenticação está configurada corretamente

#### **C) CORS (Cross-Origin):**
- O N8N pode estar bloqueando requisições do domínio
- Configure o CORS no N8N se necessário

#### **D) Evolution API:**
- Verifique se a instância está conectada
- Teste a API Evolution manualmente

### 7. 🔧 **Configuração Temporária (Para Teste):**

Se quiser **desabilitar temporariamente** a validação para testar:

No arquivo `src/utils/whatsapp.ts`, comente a linha de erro e descomente a linha de teste:

```typescript
// throw new Error('Não foi possível validar o número do WhatsApp...');

// APENAS PARA TESTE - REMOVA EM PRODUÇÃO:
return { exists: true, whatsappId: phoneNumber + '@c.us' };
```

### 8. ✅ **Teste Final:**

1. Configure as URLs e credenciais corretas
2. Faça push para o GitHub
3. Execute deploy no Easypanel
4. Teste alteração de telefone no perfil
5. Verifique se a validação funciona

## 📋 **Checklist de Configuração:**

- [ ] URL do webhook N8N está correta
- [ ] Credenciais de autenticação configuradas
- [ ] N8N acessível pela internet
- [ ] Evolution API rodando e conectada
- [ ] Instância "FinanceApp" configurada
- [ ] Workflow N8N ativo e funcionando
- [ ] Teste manual do webhook funcionando

## 🎯 **URLs Importantes:**

- **N8N Webhook:** `https://seu-n8n.com.br/webhook/verifica-zap`
- **Finance App:** `https://seu-dominio.com.br/perfil`
- **Evolution API:** Verificar no painel da Evolution

---

**💡 Dica:** Sempre teste o webhook manualmente antes de configurar no Finance App!