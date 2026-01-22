# 🔍 Diagnóstico de Conectividade - Finance App

## Status do Servidor

✅ **Supabase está ONLINE e respondendo corretamente!**
✅ **Servidor Vite está ONLINE na porta 8080**

## Problema Identificado

Os erros `net::ERR_INTERNET_DISCONNECTED` que você viu no console do navegador **NÃO** indicam que a internet está desconectada. Este é um erro que o Chrome/Firefox exibe quando:

1. **CORS está bloqueado** (requisição bloqueada antes de chegar ao servidor)
2. **Certificado SSL/TLS inválido** (conexão HTTPS com certificado não confiável)
3. **Firewall ou proxy bloqueando** a requisição
4. **Configuração de rede local** impedindo a conexão

## Como Diagnosticar

### 1️⃣ Teste Rápido no Navegador

Abra este arquivo no navegador:
```
http://localhost:8080/diagnostico-supabase.html
```

Este teste verifica:
- ✅ Conectividade com Supabase
- ✅ CORS headers
- ✅ Autenticação
- ✅ Acesso à tabela profiles

### 2️⃣ Verificar Console do Navegador

Abra DevTools (F12 → Console) e procure por:

```javascript
// Testes manuais
const url = 'https://finance-app-supabase-finance-app.rcnehy.easypanel.host/rest/v1/'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

// Teste 1: CORS Preflight
fetch(url, {
  method: 'OPTIONS',
  headers: { 'Access-Control-Request-Method': 'GET' }
}).then(r => {
  console.log('Status:', r.status)
  console.log('CORS Header:', r.headers.get('access-control-allow-origin'))
})

// Teste 2: GET com autenticação
fetch(url, {
  headers: { 'apikey': key }
}).then(r => r.json()).then(console.log)
```

### 3️⃣ Verificar Certificado SSL

O Supabase está usando um domínio customizado. Verificar se o certificado é confiável:

```bash
# Terminal
curl -v https://finance-app-supabase-finance-app.rcnehy.easypanel.host/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" | head -50
```

Se funcionar no terminal mas não no navegador, o problema é **certificado auto-assinado** ou **CORS**.

## Soluções Possíveis

### ⚠️ Problema: Certificado SSL Inválido

**Solução 1: Aceitar o certificado no navegador**
1. Abra `https://finance-app-supabase-finance-app.rcnehy.easypanel.host` direto no navegador
2. Clique em "Avançado" → "Prosseguir mesmo assim"
3. Volte para a aplicação e recarregue

**Solução 2: Usar HTTP em desenvolvimento (não recomendado)**
- Editar `/src/lib/supabase.ts`
- Mudar URL para `http://...` (sem HTTPS)

### ⚠️ Problema: CORS Bloqueado

**Solução: Adicionar headers CORS**
- Verificar se o Supabase tem CORS habilitado
- Se não, adicionar configuração em `easypanel.yml`

### ⚠️ Problema: Firewall/Proxy Local

**Solução:**
- Verificar se há proxy corporativo configurado
- Desabilitar VPN temporariamente
- Usar ferramenta de diagnóstico de rede

## Próximos Passos

1. **Execute o teste no navegador**: `http://localhost:8080/diagnostico-supabase.html`
2. **Compartilhe os resultados** (print ou log)
3. **Com base nos resultados**, aplicaremos a solução apropriada

## Checklist de Diagnóstico Rápido

- [ ] Supabase URL está acessível no terminal (✅ Confirmado)
- [ ] Servidor Vite está rodando (✅ Confirmado na porta 8080)
- [ ] Navegador consegue acessar http://localhost:8080
- [ ] Teste CORS está passando
- [ ] Certificado SSL é confiável

## Arquivo de Teste Criado

📄 **`/diagnostico-supabase.html`** - Abra no navegador para testar
📄 **`/diagnostico-runtime.ts`** - Script para testar em tempo de execução

---

**Próximo passo:** Abra http://localhost:8080/diagnostico-supabase.html no navegador e compartilhe os resultados!
