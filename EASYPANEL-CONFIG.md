# Easypanel Configuration Guide
# Use estas configurações exatas no painel do Easypanel

## Repository Settings (Origem)
URL do Repositório: https://github.com/lincoolngomes/Finance-App.git
Branch: main
Caminho de Build: /

## Build Settings
Builder: heroku/builder:24 (ou use Dockerfile)
Build Command: npm run build
Output Directory: dist

## Environment Variables (Variables de Ambiente)
VITE_SUPABASE_URL=https://alqzqapccyclmffdfmlc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscXpxYXBjY3ljbG1mZmRmbWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMTY4OTIsImV4cCI6MjA2MTc5Mjg5Mn0.WAG002hANNqMuqN2BOnvAMG5SsM2T4Wttz9dKrTj2GY

## IMPORTANT NOTES:
- Remove o token (ghp_...) da URL do repositório
- Use apenas: https://github.com/lincoolngomes/Finance-App.git
- O repositório é público, não precisa de chave SSH
- Certifique-se de adicionar as environment variables