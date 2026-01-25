#!/bin/bash
# Script para consertar Supabase no VPS via SSH

echo "🔍 Verificando containers do Supabase..."
docker ps -a | grep supabase

echo ""
echo "📋 Verificando logs recentes..."
docker logs --tail 50 $(docker ps -a | grep supabase | awk '{print $1}' | head -1)

echo ""
echo "🔄 Reiniciando container do Supabase..."
docker restart $(docker ps -a | grep supabase | awk '{print $1}' | head -1)

echo ""
echo "⏳ Aguardando 10 segundos..."
sleep 10

echo ""
echo "✅ Verificando se voltou..."
curl -I https://finance-app-supabase-finance-app.rcnehy.easypanel.host/auth/v1/health

echo ""
echo "🎉 Pronto! Se mostrar HTTP/2 200, está funcionando!"
