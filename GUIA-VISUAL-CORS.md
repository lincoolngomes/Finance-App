# 🎯 GUIA VISUAL: Configurar CORS no Easypanel

## 🔍 O que você vai procurar no Easypanel

Quando abrir o serviço Supabase no Easypanel, procure por uma dessas opções:

### Opção 1: Aba "Environment" ou "Environment Variables"
- Ícone: geralmente um símbolo de engrenagem ⚙️ ou uma lista 📋
- Nome: "Environment", "Env", "Variables", "Environment Variables"

### Opção 2: Aba "Settings" ou "Configuration"  
- Ícone: geralmente uma engrenagem ⚙️
- Nome: "Settings", "Config", "Configuration"
- Dentro dessa aba, procure por "Environment Variables"

### Opção 3: Aba "Advanced"
- Ícone: geralmente um símbolo de alerta ⚠️ ou engrenagem avançada
- Nome: "Advanced", "Advanced Settings"

---

## 📝 Como Adicionar as Variáveis

### Formato 1: Campos "Name" e "Value" (Mais Comum)

Você verá algo assim:
```
┌─────────────────────────────────────────────┐
│  Environment Variables                       │
├─────────────────────────────────────────────┤
│  [+] Add Variable                           │
│                                             │
│  Name:  [___________________________]       │
│  Value: [___________________________]       │
│                                             │
│  [Save] [Cancel]                            │
└─────────────────────────────────────────────┘
```

**Passos:**
1. Clique em **"[+] Add Variable"**
2. No campo **Name**, digite: `ADDITIONAL_REDIRECT_URLS`
3. No campo **Value**, cole: `http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173`
4. Clique em **Save**
5. Repita para as outras 3 variáveis

---

### Formato 2: Editor de Texto Tipo ".env" (Menos Comum)

Você verá algo assim:
```
┌─────────────────────────────────────────────┐
│  Environment Variables                       │
├─────────────────────────────────────────────┤
│                                             │
│  KEY=value                                  │
│  ANOTHER_KEY=another_value                  │
│  [                                      ]   │
│  [                                      ]   │
│  [                                      ]   │
│                                             │
│  [Save Changes]                             │
└─────────────────────────────────────────────┘
```

**Passos:**
1. Role até o final do texto
2. Cole estas 4 linhas:
```
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
SITE_URL=http://localhost:8085
GOTRUE_SITE_URL=http://localhost:8085
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
```
3. Clique em **Save Changes**

---

## 🔄 Depois de Salvar: REINICIAR o Serviço

**IMPORTANTE:** Apenas salvar NÃO é suficiente! Você precisa reiniciar.

Procure por um botão:
- **"Restart"** (geralmente ícone de reload 🔄)
- **"Redeploy"** (ícone de deploy 🚀)
- **"Apply Changes"** (ícone de check ✅)

Clique e aguarde 30-60 segundos.

---

## ✅ Como Saber se Funcionou

### Teste no Terminal
```bash
curl -v -H "Origin: http://localhost:8085" -H "Access-Control-Request-Method: POST" -X OPTIONS https://finance-app-supabase.rcnehy.easypanel.host/auth/v1/signup 2>&1 | grep -i "access-control"
```

**Resultado esperado:**
```
< access-control-allow-origin: http://localhost:8085
```

Se aparecer, **CORS funcionando!** ✅

---

## 📊 Resumo das Variáveis

Copie tudo de uma vez:

```env
ADDITIONAL_REDIRECT_URLS=http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
SITE_URL=http://localhost:8085
GOTRUE_SITE_URL=http://localhost:8085
GOTRUE_URI_ALLOW_LIST=http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
```

---

## 🎯 Checklist

- [ ] Adicionei as 4 variáveis
- [ ] Salvei
- [ ] Reiniciei o serviço
- [ ] Aguardei 1 minuto
- [ ] Status "Running" (verde)

**Feito? Vá para http://localhost:8085/auth e teste!**
