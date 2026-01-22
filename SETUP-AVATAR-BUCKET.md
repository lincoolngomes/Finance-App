# Setup do Bucket para Avatares

## 🔧 Configuração Necessária no Supabase

Para que o upload de avatares funcione corretamente, você precisa criar um bucket no Supabase Storage.

### Passo 1: Acessar Supabase Console
1. Vá para https://app.supabase.com
2. Selecione seu projeto
3. Vá para "Storage" no menu lateral esquerdo

### Passo 2: Criar o Bucket
1. Clique em "New bucket"
2. Nome do bucket: `profile-avatars`
3. Desmarque "Private bucket" (deixe público)
4. Clique em "Create bucket"

### Passo 3: Configurar Permissões (RLS)
Na seção "Policies" do bucket `profile-avatars`, adicione:

```sql
-- Permitir que usuários autenticados façam upload
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
);

-- Permitir que usuários vejam suas próprias imagens
CREATE POLICY "Allow users to select their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-avatars'
);

-- Permitir que usuários atualizem suas próprias imagens
CREATE POLICY "Allow users to update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
);

-- Permitir que anyone acesse imagens públicas
CREATE POLICY "Allow public access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'profile-avatars'
);
```

### Alternativas de Buckets
O sistema testará automaticamente estes buckets (em ordem):
1. `profile-avatars` (recomendado)
2. `avatars`
3. `uploads`
4. `images`

Se você tiver um destes buckets existentes, o sistema usará o primeiro disponível.

## ✅ Testando o Upload

Após criar o bucket:
1. Vá para a página de Perfil
2. Clique no ícone de câmera sobre o avatar
3. Selecione uma imagem
4. Ajuste zoom e posição no modal
5. Clique "Recortar foto"
6. A imagem deve ser enviada e atualizada automaticamente

## 🔍 Troubleshooting

Se receber erro "Bucket not found":
- ✅ Verifique se criou o bucket `profile-avatars`
- ✅ Verifique se o bucket está público
- ✅ Cheque os logs do DevTools (F12) para mais detalhes

Se receber erro de permissão:
- ✅ Verifique se está autenticado
- ✅ Verifique as políticas RLS do bucket
- ✅ Ensure as políticas estão ativas

## 📝 Campos do Banco de Dados

O campo `avatar_url` na tabela `profiles` deve ser do tipo `text` ou `varchar`.

Se precisar ajustar:
```sql
ALTER TABLE profiles 
ADD COLUMN avatar_url text;

-- Ou se já existe:
ALTER TABLE profiles 
ALTER COLUMN avatar_url TYPE text;
```
