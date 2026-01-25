# 🔧 PROBLEMA: Hot Standby Mode Desabilitado

## 📋 Diagnóstico

Nos logs você vê:
```
FATAL: the database system is not accepting connections
DETAIL: Hot standby mode is disabled.
```

**Causa**: O PostgreSQL está configurado como réplica (standby) mas sem aceitar conexões.

---

## ✅ SOLUÇÃO RÁPIDA (Via Easypanel)

### Opção 1: Usar a Interface do Easypanel

1. **Acesse**: https://rcnehy.easypanel.host
2. **Vá em**: Projects → finance-app → Supabase
3. **Clique em**: "Settings" ou "Advanced"
4. **Procure por**: "Environment Variables"
5. **Adicione**:
   ```
   POSTGRES_INITDB_ARGS=--data-checksums
   ```
6. **Salve e Redeploy**

### Opção 2: Reconstruir do Zero (Mais Garantido)

1. **Acesse**: https://rcnehy.easypanel.host
2. **Vá em**: Projects → finance-app → Supabase
3. **Clique em**: "Advanced" ou "Danger Zone"
4. **Clique em**: "Destroy" ou "Remove"
5. **Crie novamente**: Add Service → Database → Supabase

⚠️ **ATENÇÃO**: Isso apaga o banco! Só faça se tiver backup.

---

## 🔧 SOLUÇÃO MANUAL (Via SSH)

### Passo 1: Conectar via SSH

```bash
ssh user@rcnehy.easypanel.host
```

### Passo 2: Encontrar o Container

```bash
docker ps -a | grep -E "(postgres|db|supabase)"
```

Procure algo como:
```
finance-app-supabase-db-1
```

### Passo 3: Remover Arquivo de Standby

```bash
# Substitua CONTAINER_NAME pelo nome real
CONTAINER_NAME="finance-app-supabase-db-1"

# Remover arquivo que força modo standby
docker exec $CONTAINER_NAME rm -f /var/lib/postgresql/data/standby.signal
docker exec $CONTAINER_NAME rm -f /var/lib/postgresql/data/recovery.signal

# Reiniciar
docker restart $CONTAINER_NAME
```

### Passo 4: Verificar

```bash
# Ver logs
docker logs --tail 50 $CONTAINER_NAME

# Testar conexão
docker exec $CONTAINER_NAME pg_isready -U postgres
```

**Resultado esperado:**
```
/var/run/postgresql:5432 - accepting connections
```

### Passo 5: Testar Endpoint

```bash
curl -I https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/health
```

**Resultado esperado:**
```
HTTP/2 200
```

---

## 🆘 SE AINDA NÃO FUNCIONAR

### Solução Drástica: Resetar Completamente

```bash
# Encontrar diretório do Supabase
cd /path/to/easypanel/projects/finance-app/supabase

# Parar tudo
docker-compose down

# APAGAR VOLUMES (⚠️ PERDE DADOS!)
docker-compose down -v

# Subir novamente
docker-compose up -d

# Aguardar 30 segundos
sleep 30

# Verificar
docker-compose logs db | tail -50
```

---

## 📱 ALTERNATIVA: Usar Supabase Cloud

Se você não consegue acessar o SSH ou a correção está muito complicada:

1. **Crie conta**: https://supabase.com
2. **Crie projeto**: Escolha região (Brazil ou US)
3. **Copie credenciais**:
   - URL: `https://xxx.supabase.co`
   - Anon Key: `eyJhbG...`

4. **Atualize `src/lib/supabase.ts`**:
```typescript
const supabaseUrl = 'https://xxx.supabase.co'
const supabaseAnonKey = 'eyJhbG...'
```

5. **Migre dados**:
   - Exporte do VPS: `pg_dump`
   - Importe no Cloud: SQL Editor

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após qualquer correção, execute:

- [ ] `docker ps` - Container rodando?
- [ ] `docker logs` - Sem erros FATAL?
- [ ] `pg_isready` - Postgres aceitando conexões?
- [ ] `curl /health` - Endpoint respondendo 200?
- [ ] Testar login no app

---

## 📞 PRÓXIMOS PASSOS

**Me avise qual opção você quer tentar:**

- **A** - Reconstruir via Easypanel (recomendado se não tem dados importantes)
- **B** - SSH manual (se você tem acesso SSH)
- **C** - Migrar para Supabase Cloud (mais fácil e estável)

**O que você prefere?**
