#!/bin/bash
# Script de força deploy para Easypanel
# Este script resolve problemas de "Failed to pull changes"

echo "Forçando novo deployment..."
echo "Timestamp: $(date)"
echo "Commit: $(git rev-parse HEAD)"
echo "Branch: $(git branch --show-current)"