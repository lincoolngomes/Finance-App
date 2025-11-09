#!/bin/bash

# 🚀 Script de Deploy Automatizado - Finance App
# Execute este script no seu VPS após fazer upload dos arquivos

echo "🚀 Iniciando deploy do Finance App..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para mostrar status
show_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

show_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   show_error "Este script não deve ser executado como root"
   exit 1
fi

# Variáveis (EDITE CONFORME SEU SETUP)
DOMAIN="seu-dominio.com.br"
APP_DIR="/var/www/finance-app"
USER_EMAIL="seu-email@gmail.com"

show_status "Configurando Finance App para domínio: $DOMAIN"

# 1. Atualizar sistema
show_status "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y
show_success "Sistema atualizado"

# 2. Instalar dependências
show_status "Instalando Nginx e Certbot..."
sudo apt install nginx certbot python3-certbot-nginx -y
show_success "Dependências instaladas"

# 3. Criar estrutura de diretórios
show_status "Criando diretórios..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
show_success "Diretórios criados"

# 4. Configurar Nginx
show_status "Configurando Nginx..."

# Criar configuração do Nginx
sudo tee /etc/nginx/sites-available/finance-app > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    root $APP_DIR/dist;
    index index.html;

    # Handle React Router (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/finance-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
if sudo nginx -t; then
    show_success "Configuração Nginx OK"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    show_error "Erro na configuração do Nginx"
    exit 1
fi

# 5. Configurar SSL
show_status "Configurando SSL com Let's Encrypt..."
if sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $USER_EMAIL; then
    show_success "SSL configurado com sucesso"
else
    show_error "Falha ao configurar SSL. Você pode tentar manualmente mais tarde."
fi

# 6. Configurar renovação automática SSL
show_status "Configurando renovação automática do SSL..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
show_success "Renovação automática configurada"

# 7. Configurar permissões
show_status "Configurando permissões..."
sudo chown -R www-data:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR
show_success "Permissões configuradas"

# 8. Habilitar firewall (opcional)
show_status "Configurando firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
show_success "Firewall configurado"

# 9. Mostrar status dos serviços
show_status "Verificando status dos serviços..."
echo ""
echo "Status do Nginx:"
sudo systemctl status nginx --no-pager -l
echo ""

# 10. Instruções finais
echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Faça upload dos arquivos da pasta 'dist/' para: $APP_DIR/dist/"
echo "2. Execute as migrations do Supabase no dashboard"
echo "3. Acesse: https://$DOMAIN"
echo "4. Teste o admin em: https://$DOMAIN/admin"
echo ""
echo "📁 Estrutura de arquivos necessária:"
echo "$APP_DIR/"
echo "├── dist/"
echo "│   ├── index.html"
echo "│   ├── assets/"
echo "│   └── ..."
echo ""
echo "🔍 Logs importantes:"
echo "- Nginx: sudo tail -f /var/log/nginx/error.log"
echo "- Access: sudo tail -f /var/log/nginx/access.log"
echo ""
echo "🚀 Seu Finance App está pronto para uso!"