#!/bin/bash

# Script para sincronizar main → production (deploy)
echo "🚀 Sincronizando main → production para deploy..."

# Salvar branch atual
CURRENT_BRANCH=$(git branch --show-current)

# Ir para production
git checkout production

# Fazer merge da main
git merge main

# Push para production
git push origin production

# Voltar para a branch original
git checkout $CURRENT_BRANCH

echo "✅ Deploy sincronizado! Production atualizada."
echo "📱 Easypanel irá fazer deploy automaticamente da branch production"