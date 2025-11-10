# Soluções para "Failed to pull changes" no Easypanel

## Problema: Easypanel não consegue fazer pull do repositório GitHub

### Solução 1: Configuração SSH (Recomendado)
1. No Easypanel, vá em Configurações do Serviço
2. Mude de HTTPS para SSH
3. Use: `git@github.com:lincoolngomes/Finance-App.git`
4. Adicione a chave SSH pública do Easypanel no GitHub (Settings > Deploy Keys)

### Solução 2: Token de Acesso Pessoal
1. GitHub: Settings > Developer Settings > Personal Access Tokens
2. Gere um token com permissões de repositório
3. No Easypanel, use: `https://[TOKEN]@github.com/lincoolngomes/Finance-App.git`

### Solução 3: Webhook Manual
1. GitHub: Settings > Webhooks
2. Adicione webhook do Easypanel
3. URL: [URL do trigger do Easypanel]
4. Events: Push events

### Solução 4: Forçar Refresh
1. Desconecte o repositório no Easypanel
2. Reconecte usando as mesmas credenciais
3. Isso força uma nova configuração

### Solução 5: Deploy via ZIP (Temporário)
1. Download do código local
2. Upload manual no Easypanel
3. Usar enquanto resolve a conectividade

## Status Atual
- Repositório: ✅ Funcionando
- Commits: ✅ Atualizados  
- Build local: ✅ Testado
- Problema: 🔴 Conectividade Easypanel-GitHub