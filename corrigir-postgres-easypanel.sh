#!/bin/bash

echo "🔧 CORRIGINDO POSTGRESQL NO EASYPANEL"
echo "======================================"
echo ""

# Nome do container (pode variar, ajuste se necessário)
CONTAINER_NAME="finance-app-supabase-db-1"

echo "📋 Passo 1: Verificando containers..."
docker ps -a | grep -E "(postgres|db|supabase)" | head -5

echo ""
echo "⚠️  O problema: Hot Standby Mode está desabilitado"
echo ""
echo "🔧 Soluções possíveis:"
echo ""
echo "OPÇÃO 1 - REMOVER ARQUIVO DE STANDBY (Recomendado):"
echo "---------------------------------------------------"
echo "docker exec $CONTAINER_NAME rm -f /var/lib/postgresql/data/standby.signal"
echo "docker restart $CONTAINER_NAME"
echo ""
echo "OPÇÃO 2 - PARAR E LIMPAR VOLUME:"
echo "--------------------------------"
echo "cd /path/to/supabase && docker-compose down -v"
echo "cd /path/to/supabase && docker-compose up -d"
echo ""
echo "OPÇÃO 3 - CONFIGURAR HOT STANDBY:"
echo "---------------------------------"
echo "docker exec $CONTAINER_NAME psql -U postgres -c \"ALTER SYSTEM SET hot_standby = on;\""
echo "docker restart $CONTAINER_NAME"
echo ""

# Tentar encontrar o nome correto do container
echo "🔍 Procurando nome exato do container do banco..."
DB_CONTAINER=$(docker ps -a | grep -E "(postgres|db)" | grep -i supabase | head -1 | awk '{print $1}')

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Container não encontrado automaticamente"
    echo "Execute manualmente no SSH:"
    echo "  docker ps -a | grep db"
    echo ""
    exit 1
fi

echo "✅ Container encontrado: $DB_CONTAINER"
echo ""

# Executar correção
echo "🚀 Executando correção automática..."
echo ""
echo "1. Removendo arquivo standby.signal..."
docker exec $DB_CONTAINER rm -f /var/lib/postgresql/data/standby.signal 2>/dev/null && echo "✅ Arquivo removido" || echo "⚠️  Arquivo não existe (OK)"

echo ""
echo "2. Removendo arquivo recovery.signal (se existir)..."
docker exec $DB_CONTAINER rm -f /var/lib/postgresql/data/recovery.signal 2>/dev/null && echo "✅ Arquivo removido" || echo "⚠️  Arquivo não existe (OK)"

echo ""
echo "3. Reiniciando container..."
docker restart $DB_CONTAINER

echo ""
echo "⏳ Aguardando 10 segundos para o banco iniciar..."
sleep 10

echo ""
echo "4. Verificando logs..."
docker logs --tail 20 $DB_CONTAINER

echo ""
echo "5. Testando conexão..."
docker exec $DB_CONTAINER pg_isready -U postgres

echo ""
echo "✅ CONCLUÍDO!"
echo ""
echo "Agora teste:"
echo "curl -I https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/health"
