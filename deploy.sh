#!/bin/bash

# Script de Deploy para Easypanel
echo "🚀 Iniciando deploy do Agente Financeiro..."

# Fazer build da aplicação
echo "📦 Fazendo build da aplicação..."
npm run build

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build realizado com sucesso!"
else
    echo "❌ Erro no build. Abortando deploy."
    exit 1
fi

# Fazer build da imagem Docker
echo "🐳 Fazendo build da imagem Docker..."
docker build -t agente-financeiro:latest .

if [ $? -eq 0 ]; then
    echo "✅ Imagem Docker criada com sucesso!"
else
    echo "❌ Erro ao criar imagem Docker."
    exit 1
fi

echo "🎉 Deploy preparado! Agora você pode:"
echo "1. Fazer push do código para seu repositório Git"
echo "2. Configurar no Easypanel para fazer deploy automático"
echo "3. Ou usar: docker-compose up -d"