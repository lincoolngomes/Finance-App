#!/bin/bash
# Build script para Easypanel

echo "🚀 Iniciando build da aplicação Finance App..."
echo "📁 Diretório atual: $(pwd)"
echo "📋 Listando arquivos:"
ls -la

echo "📦 Instalando dependências..."
npm install

echo "🔨 Building aplicação..."
npm run build

echo "✅ Build concluído!"
echo "📁 Conteúdo da pasta dist:"
ls -la dist/

echo "🎉 Deploy pronto!"