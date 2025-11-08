# 🚀 Deploy Automático com GitHub Actions

## 📋 **Configuração completa para deploy direto no VPS**

### **1. 🔧 Configurar Secrets no GitHub:**

1. **Vá ao GitHub**: https://github.com/lincoolngomes/Finance-App/settings/secrets/actions
2. **Adicione os seguintes secrets:**

```
VPS_HOST = IP_DO_SEU_VPS (ex: 72.61.134.197)
VPS_USER = root (ou seu usuário SSH)
VPS_SSH_KEY = SUA_CHAVE_SSH_PRIVADA
```

### **2. 🗝️ Como obter a chave SSH:**

**No seu computador local:**
```bash
# Gerar chave SSH (se não tiver)
ssh-keygen -t rsa -b 4096 -C "finance-app-deploy"

# Copiar chave pública para o VPS
ssh-copy-id root@72.61.134.197

# Mostrar chave privada (copie todo o conteúdo)
cat ~/.ssh/id_rsa
```

**Copie TODO o conteúdo da chave privada** (incluindo `-----BEGIN` e `-----END`)

### **3. 🌐 Configurar nginx no VPS:**

**Conecte no VPS via SSH:**
```bash
ssh root@72.61.134.197
```

**Instalar nginx (se não tiver):**
```bash
apt update
apt install nginx -y
```

**Configurar o site:**
```bash
# Criar diretório
mkdir -p /var/www/finance-app

# Copiar configuração nginx
nano /etc/nginx/sites-available/finance-app
# Cole o conteúdo do arquivo Instructions/nginx-config.conf
# IMPORTANTE: Substitua SEU_DOMINIO.com pelo seu domínio real

# Ativar site
ln -s /etc/nginx/sites-available/finance-app /etc/nginx/sites-enabled/
nginx -t  # Testar configuração
systemctl restart nginx
```

### **4. 🔒 Configurar SSL (Opcional mas recomendado):**

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
certbot --nginx -d SEU_DOMINIO.com

# Renovação automática
crontab -e
# Adicione: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **5. 🚀 Como funciona:**

1. **Push no GitHub** → Trigger automático
2. **GitHub Actions** → Build da aplicação
3. **Deploy SSH** → Transfere arquivos para VPS
4. **Nginx serve** → Aplicação online

### **6. 📊 Monitoramento:**

- **Logs do GitHub**: https://github.com/lincoolngomes/Finance-App/actions
- **Logs do nginx**: `tail -f /var/log/nginx/finance-app.access.log`
- **Status do serviço**: `systemctl status nginx`

### **7. 🎯 Vantagens desta abordagem:**

- ✅ **Deploy automático** a cada push
- ✅ **Controle total** do servidor
- ✅ **Performance máxima** 
- ✅ **Sem dependência** de terceiros
- ✅ **SSL gratuito** com Let's Encrypt
- ✅ **Logs completos** e monitoring

### **8. 🔧 Troubleshooting:**

**Se der erro no deploy:**
1. Verifique os secrets do GitHub
2. Teste conexão SSH manual
3. Verifique permissões do diretório
4. Veja logs do nginx

**Comandos úteis no VPS:**
```bash
# Ver logs em tempo real
tail -f /var/log/nginx/finance-app.error.log

# Reiniciar nginx
systemctl restart nginx

# Testar configuração
nginx -t

# Ver status
systemctl status nginx
```

## 🎉 **Resultado final:**

- **Deploy automático** ✅
- **SSL habilitado** ✅
- **Performance máxima** ✅
- **Monitoramento completo** ✅

**Muito melhor que qualquer plataforma! 🚀**