#!/bin/bash
# Script para rodar no servidor Easypanel via SSH ou console

echo "🧹 Limpando repositório Git no servidor..."

# Resetar para o estado limpo
git fetch origin
git reset --hard origin/production
git clean -fd

echo "✅ Repositório limpo e sincronizado com origin/production"
echo "📍 Commit atual: $(git log -1 --oneline)"
