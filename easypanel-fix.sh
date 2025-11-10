#!/bin/bash

# Script para resolver "Failed to pull changes"
echo "=== Easypanel Deploy Fix ==="
echo "Timestamp: $(date)"
echo "Current commit: $(git rev-parse --short HEAD)"
echo "Branch: $(git branch --show-current)"
echo ""

# Verificar se git está funcionando
echo "Testing git connectivity..."
git ls-remote origin main > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Git connectivity: OK"
else
    echo "❌ Git connectivity: FAILED"
    exit 1
fi

# Verificar se build funciona
echo "Testing build process..."
npm ci > /dev/null 2>&1
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build process: OK"
else
    echo "❌ Build process: FAILED"
    exit 1
fi

echo ""
echo "All checks passed! Deploy should work now."
echo "If Easypanel still fails, try:"
echo "1. SSH instead of HTTPS"
echo "2. Personal Access Token"
echo "3. Reconnect repository in Easypanel"