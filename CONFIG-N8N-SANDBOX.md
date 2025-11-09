# 🔧 Configuração N8N para Asaas Sandbox

## ⚠️ **ATENÇÃO: Modificações Necessárias no N8N**

### 1. **Alterar URL da API (CRÍTICO)**

**No nó "RecuperadadosAssinatura":**

**❌ URL atual (Produção):**
```
https://api.asaas.com/v3/subscriptions/{{ $json.subscriptionId }}
```

**✅ URL correta (Sandbox):**
```
https://api-sandbox.asaas.com/v3/subscriptions/{{ $json.subscriptionId }}
```

### 2. **Atualizar Credenciais**

- Use o **token de API do ambiente sandbox**
- Não o token de produção

### 3. **Testar no N8N**

1. Execute o workflow manualmente
2. Use o ID: `sub_vpcse0r36xqq8dk1`
3. Deve retornar dados da assinatura

### 4. **Verificar Resposta**

O N8N deve retornar:
```json
{
  "id": "sub_vpcse0r36xqq8dk1",
  "dataAssinatura": "2024-XX-XX",
  "valor": XX.XX,
  "ciclo": "MONTHLY",
  "status": "ACTIVE",
  "proimoPagamento": "2024-XX-XX",
  "creditCard": { ... }
}
```

---

## 🚀 **Após Corrigir o N8N**

O Finance App irá:
1. ✅ Buscar automaticamente sua assinatura real
2. ✅ Exibir dados reais do Asaas  
3. ✅ Mostrar status de pagamento correto
4. ✅ Funcionar para qualquer usuário

---

**📞 Status atual: Aguardando correção da URL no N8N**