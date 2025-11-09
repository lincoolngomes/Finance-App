# 🚀 GUIA DE DEPLOY - Finance App VPS

## ✅ PREPARAÇÃO CONCLUÍDA:
- [x] Build da aplicação gerado (pasta `dist/`)
- [x] Configurações do Supabase prontas
- [x] Sistema de administração funcionando
- [x] Migrations do banco de dados criadas

## 📋 PRÓXIMOS PASSOS NO VPS:

### 1. 🏗️ CONFIGURAR SERVIDOR (Ubuntu/Debian):

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Nginx
sudo apt install nginx -y

# Instalar certbot para SSL
sudo apt install certbot python3-certbot-nginx -y

# Criar diretório da aplicação
sudo mkdir -p /var/www/finance-app
sudo chown -R $USER:$USER /var/www/finance-app
```

### 2. 📁 UPLOAD DOS ARQUIVOS:

**Opção A - Via SCP:**
```bash
# Na sua máquina local, execute:
scp -r dist/ usuario@seu-vps:/var/www/finance-app/
```

**Opção B - Via FTP/SFTP:**
- Use FileZilla ou WinSCP
- Faça upload da pasta `dist/` para `/var/www/finance-app/`

### 3. ⚙️ CONFIGURAR NGINX:

```bash
# Copiar configuração do Nginx
sudo cp finance-app-nginx.conf /etc/nginx/sites-available/finance-app

# Editar o arquivo e substituir "seu-dominio.com.br" pelo seu domínio real
sudo nano /etc/nginx/sites-available/finance-app

# Ativar o site
sudo ln -s /etc/nginx/sites-available/finance-app /etc/nginx/sites-enabled/

# Remover configuração padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 4. 🔒 CONFIGURAR SSL (Let's Encrypt):

```bash
# Gerar certificado SSL (substitua pelo seu domínio)
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Testar renovação automática
sudo certbot renew --dry-run
```

### 5. 🗄️ EXECUTAR MIGRATIONS NO SUPABASE:

1. **Acesse o Supabase Dashboard:** https://supabase.com/dashboard
2. **Vá para SQL Editor**
3. **Execute o conteúdo de:** `supabase/migrations/001_add_role_to_profiles.sql`
4. **Verifique se as tabelas foram criadas corretamente**

### 6. 🔧 CONFIGURAÇÕES FINAIS:

```bash
# Verificar se o Nginx está rodando
sudo systemctl status nginx

# Verificar logs em caso de erro
sudo tail -f /var/log/nginx/error.log

# Definir permissões corretas
sudo chown -R www-data:www-data /var/www/finance-app
sudo chmod -R 755 /var/www/finance-app
```

## 🌐 ACESSAR A APLICAÇÃO:

1. **Acesse:** https://seu-dominio.com.br
2. **Faça login** com suas credenciais do Supabase
3. **Teste o sistema admin:** https://seu-dominio.com.br/admin
4. **Verifique todas as funcionalidades**

## 🔍 VERIFICAÇÕES PÓS-DEPLOY:

### ✅ Checklist de Funcionamento:
- [ ] Site carrega na URL principal
- [ ] Login/logout funcionando
- [ ] Dashboard aparece corretamente
- [ ] Menu admin visível para admin
- [ ] CRUD de usuários funcionando
- [ ] Todas as páginas carregam sem erro
- [ ] SSL funcionando (🔒 no navegador)

### 🐛 Resolução de Problemas Comuns:

**Erro 404 nas rotas:**
```bash
# Verificar se o try_files está correto no Nginx
sudo nano /etc/nginx/sites-available/finance-app
# Deve ter: try_files $uri $uri/ /index.html;
```

**Erro de conexão com Supabase:**
- Verifique as URLs no arquivo .env.production
- Confirme se as migrations foram executadas

**CSS/JS não carrega:**
- Verificar permissões: `sudo chmod -R 755 /var/www/finance-app`
- Verificar configuração de cache do Nginx

## 📱 DOMÍNIO PERSONALIZADO:

1. **Configure DNS:** Aponte seu domínio para o IP do VPS
2. **Aguarde propagação:** Pode levar até 24h
3. **Atualize certificado SSL:** Execute certbot novamente se necessário

## 🎉 SISTEMA PRONTO!

Seu Finance App com sistema de administração completo está agora rodando no VPS com:
- ✅ Interface administrativa funcional
- ✅ CRUD completo de usuários
- ✅ Sistema de roles e permissões
- ✅ SSL/HTTPS configurado
- ✅ Performance otimizada com Nginx

---

**💡 Dica:** Mantenha backups regulares do banco Supabase e monitore os logs do servidor!