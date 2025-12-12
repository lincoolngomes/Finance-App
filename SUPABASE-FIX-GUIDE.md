# Como Corrigir o Supabase no Easypanel

## Problema Identificado
O PostgreSQL está com **excesso de conexões** e reiniciando constantemente:
- `FATAL: sorry, too many clients already`
- `FATAL: terminating connection due to administrator command`

## Solução Rápida

### 1. Reiniciar o Serviço Supabase
No Easypanel:
1. Vá em **Projetos** → **finance-app** → **Supabase**
2. Clique em **"Reiniciar"** (botão de restart)
3. Aguarde 2-3 minutos até ficar verde

### 2. Verificar Se Voltou
Após reiniciar, teste a conexão:
```bash
curl -I https://finance-app-supabase-finance-app.rcnehy.easypanel.host
```

Deve retornar **HTTP/2 200** (não 502)

### 3. Voltar as Configurações Locais
Se o Supabase voltar, atualize o `.env.local`:

```env
# Configurações do Supabase (VPS - Easypanel)
VITE_SUPABASE_URL=https://finance-app-supabase-finance-app.rcnehy.easypanel.host
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

NODE_ENV=development
VITE_APP_URL=http://localhost:8080
```

## Solução Permanente (Prevenir o Problema)

### No Easypanel, ajuste as variáveis do Supabase:

1. Vá em **Supabase** → **Variáveis de Ambiente**
2. Adicione/edite:

```env
# Aumentar limite de conexões
POSTGRES_MAX_CONNECTIONS=200

# Pool de conexões
POSTGRES_POOL_SIZE=20
POSTGRES_POOL_TIMEOUT=30

# Idle timeout (fechar conexões inativas)
POSTGRES_IDLE_TIMEOUT=30000
```

3. Clique em **"Salvar e Reimplantar"**

## Se o Problema Persistir

### Verificar uso de memória:
No Easypanel → Supabase → **Recursos**:
- Memória deve estar abaixo de 80%
- Se estiver acima, aumente a memória alocada

### Verificar logs:
```bash
# Ver últimas 100 linhas do Supabase
# No Easypanel: Supabase → Visualizar Logs
```

Procure por:
- `too many clients`
- `out of memory`
- `connection refused`

## Testando a Correção

Após reiniciar, teste:
```bash
# 1. Verificar se responde
curl https://finance-app-supabase-finance-app.rcnehy.easypanel.host/rest/v1/

# 2. No localhost
npm run dev

# 3. Fazer login no Finance App
# Deve funcionar sem "Failed to fetch"
```
