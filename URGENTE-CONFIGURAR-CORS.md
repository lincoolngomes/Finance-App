# 🔴 URGENTE - Configure CORS no NOVO Supabase

## 🆕 Novo Supabase
**URL**: https://finance-app-supabase.rcnehy.easypanel.host  
**Status**: ✅ Funcionando, mas precisa configurar CORS

## ✅ Solução em 5 Minutos

### 📝 Passo a Passo no Easypanel:

1. **Acesse:** https://rcnehy.easypanel.host

2. **Faça login** com suas credenciais do Easypanel

3. **Localize o projeto:**
   - Procure por: `finance-app`
   - Clique no projeto

4. **Localize o serviço Supabase:**
   - Procure por: `supabase` (sem prefixo finance-app-supabase)
   - Clique no serviço

5. **Adicione as variáveis de ambiente:**
   - Clique em **"Environment"** ou **"Variables"** ou **"Settings"**
   - Clique em **"Add Variable"** ou **"+"**
   
   **Adicione ESTAS 4 variáveis:**
   
   ```
   Nome: ADDITIONAL_REDIRECT_URLS
   Valor: http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
   ```
   
   ```
   Nome: SITE_URL
   Valor: http://localhost:8085
   ```
   
   ```
   Nome: GOTRUE_SITE_URL
   Valor: http://localhost:8085
   ```
   
   ```
   Nome: GOTRUE_URI_ALLOW_LIST
   Valor: http://localhost:8085,http://localhost:8082,http://localhost:8083,http://localhost:5173
   ```

6. **Salve as alterações:**
   - Clique em **"Save"** ou **"Update"**

7. **Reinicie o serviço:**
   - Clique em **"Restart"** ou **"Redeploy"**
   - Aguarde 30-60 segundos

8. **Teste novamente:**
   - Volte para http://localhost:8082/auth
   - Tente fazer login novamente
   - Deve funcionar! ✅

---

## 🔍 Como Verificar se Funcionou

No Console do navegador (F12), você deve ver:

✅ **ANTES (com erro):**
```
Access to fetch... has been blocked by CORS policy
```

✅ **DEPOIS (funcionando):**
```
(sem erros de CORS)
```

---

## 💡 Dica Visual - Onde Encontrar no Easypanel

```
Easypanel Dashboard
  └── Projects
       └── finance-app
            └── Services
                 └── finance-app-supabase (ou "supabase")
                      └── Environment Variables
                           └── [Adicione as 4 variáveis aqui]
                           └── Save
                      └── Actions
                           └── Restart
```

---

## ⚠️ Se Não Conseguir Acessar o Easypanel

### Opção Alternativa: Use o Supabase Cloud (Grátis)

1. Acesse: https://supabase.com/dashboard
2. Crie uma conta (grátis até 500MB)
3. Crie um novo projeto
4. Copie a URL e Anon Key
5. Substitua em `src/lib/supabase.ts`

**Vantagem:** CORS já vem configurado por padrão!

---

## 🆘 Precisa de Ajuda?

Se tiver dificuldade, me avise qual passo está travado!
