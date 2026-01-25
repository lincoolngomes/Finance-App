# 🚨 REBUILD SEM CACHE - URGENTE

## PROBLEMA ENCONTRADO

O bundle de produção **AINDA está usando a URL antiga**:
```
❌ ATUAL: https://finance-app-supabase-finance-app.rcnehy.easypanel.host
✅ DEVERIA SER: https://finance-app-supabase.rcnehy.easypanel.host
```

**Arquivo compilado**: `/assets/index-B9WjRccT.js` contém URL antiga

---

## SOLUÇÃO: REBUILD COMPLETO SEM CACHE

### OPÇÃO 1: Via Interface do Easypanel (RECOMENDADO)

1. **Acesse o Easypanel**: https://easypanel.rcnehy.easypanel.host

2. **Vá para o projeto finance-app**:
   - Projects → finance-app

3. **IMPORTANTE - Limpe o cache ANTES do rebuild**:
   - Procure por "Build Cache" ou "Clear Cache"
   - Clique em "Clear Build Cache" ou similar
   - OU delete e recrie o serviço

4. **Force o rebuild**:
   - Clique em "Rebuild" ou "Redeploy"
   - OU clique em "Deploy" → "Force Rebuild"
   - Aguarde 3-5 minutos

5. **Verifique o novo hash**:
   - Após rebuild, o arquivo JS terá um NOVO nome
   - Exemplo: `/assets/index-NOVO123.js` (diferente de B9WjRccT)

---

### OPÇÃO 2: Via SSH (SE TIVER ACESSO)

```bash
# Conecte no servidor
ssh usuario@seu-servidor

# Encontre o container do finance-app
docker ps | grep finance-app

# Remova o container antigo
docker stop finance-app-container
docker rm finance-app-container

# Remova a imagem antiga (força rebuild)
docker images | grep finance-app
docker rmi finance-app:latest --force

# Rebuild do zero
cd /caminho/do/projeto
docker build --no-cache -t finance-app:latest .

# Suba novamente
docker run -d --name finance-app-container -p 80:80 finance-app:latest
```

---

### OPÇÃO 3: Delete e Recrie o Serviço

**Se nada funcionar**, delete completamente o serviço finance-app no Easypanel e recrie:

1. Easypanel → Projects → finance-app
2. Settings → **Delete Project**
3. Crie NOVO projeto com as mesmas configurações:
   - Nome: finance-app
   - Repository: seu-repo
   - Build command: `npm run build` ou `bun run build`
   - Output directory: `dist`
   - Port: 80

---

## COMO CONFIRMAR QUE FUNCIONOU

Execute este comando para verificar a URL no bundle:

```bash
curl -s "https://finance-app-finance-app.rcnehy.easypanel.host" | grep -o 'src="/assets/[^"]*\.js"' | head -1
```

Copie o nome do arquivo (ex: `index-XXXXX.js`) e verifique:

```bash
curl -s "https://finance-app-finance-app.rcnehy.easypanel.host/assets/index-XXXXX.js" | grep -o 'https://[^"]*supabase[^"]*easypanel\.host'
```

**DEVE RETORNAR**:
```
https://finance-app-supabase.rcnehy.easypanel.host
```

Se retornar a URL antiga, o rebuild NÃO funcionou.

---

## POR QUE ISSO ACONTECE?

O Vite/Webpack faz "code splitting" e coloca as variáveis de ambiente **dentro dos arquivos compilados** durante o build. 

Quando você atualiza o código-fonte mas não faz rebuild, o navegador continua baixando os arquivos `.js` antigos com a URL antiga **hardcoded**.

O Easypanel pode ter cache de build ou cache de imagem Docker que impede o rebuild completo.

---

## PRÓXIMOS PASSOS APÓS REBUILD

1. ✅ Rebuild completo (sem cache)
2. ⏳ Configurar CORS no Supabase
3. ⏳ Executar SQL no banco
4. ⏳ Testar login

**NÃO ADIANTA** configurar CORS se o frontend ainda estiver usando URL antiga!
