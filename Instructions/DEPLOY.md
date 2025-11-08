# 🚀 Deploy do Agente Financeiro no Easypanel

Este guia te ajudará a fazer o deploy da aplicação no seu VPS usando o Easypanel.

## 📋 Pré-requisitos

- VPS com Easypanel instalado
- Docker instalado no VPS
- Repositório Git (GitHub, GitLab, etc.)

## 🛠️ Preparação Local

1. **Clone/Baixe o projeto** (se ainda não tiver)
2. **Configure as variáveis de ambiente**:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

## 🐳 Deploy com Easypanel

### Opção 1: Deploy via Git (Recomendado)

1. **Faça push do código para seu repositório Git**
2. **No Easypanel**:
   - Acesse seu painel
   - Clique em "New Project"
   - Selecione "Git Repository"
   - Cole a URL do seu repositório
   - Configure:
     - **Framework**: Static Site / SPA
     - **Build Command**: `npm install --legacy-peer-deps && npm run build`
     - **Output Directory**: `dist`
     - **Port**: `80`

3. **Configurar variáveis de ambiente no Easypanel**:
   - Vá em Environment Variables
   - Adicione as variáveis do arquivo `.env.example`

### Opção 2: Deploy via Docker

1. **No Easypanel**:
   - Clique em "New Project"
   - Selecione "Docker"
   - Configure:
     - **Repository**: Seu repositório Git
     - **Dockerfile**: O arquivo `Dockerfile` já está configurado
     - **Port**: `80`

## 🌍 Configuração de Domínio

1. **No Easypanel**:
   - Vá em "Domains"
   - Adicione seu domínio personalizado
   - Configure SSL automático

## 🔧 Configurações Importantes

### Supabase
- As configurações do Supabase já estão no código
- Verifique se as URLs estão corretas no arquivo `src/lib/supabase.ts`

### CORS (se necessário)
- Configure o CORS no Supabase para aceitar requisições do seu domínio

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview da build
npm run preview

# Deploy local (Docker)
chmod +x deploy.sh
./deploy.sh
```

## 📊 Monitoramento

Após o deploy, você pode:
- Acessar logs no Easypanel
- Monitorar performance
- Configurar backups automáticos

## 🔍 Troubleshooting

### Erro de Build
- Verifique as versões do Node.js (recomendado: 18+)
- Rode `npm install --legacy-peer-deps` para resolver conflitos

### Erro 404 em rotas
- O nginx.conf já está configurado para SPA
- Verifique se o arquivo foi copiado corretamente

### Problemas de CORS
- Configure o domínio no Supabase
- Verifique as variáveis de ambiente

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no Easypanel
2. Teste localmente com `npm run build && npm run preview`
3. Verifique as configurações do Supabase

---

**Estrutura de arquivos importantes para deploy:**
```
├── Dockerfile          # Configuração Docker
├── nginx.conf          # Configuração Nginx
├── docker-compose.yml  # Docker Compose
├── deploy.sh           # Script de deploy
├── .env.example        # Variáveis de ambiente
└── .dockerignore       # Arquivos ignorados no Docker
```