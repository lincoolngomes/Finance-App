# 🔧 Como Executar a Migração SQL - Passo a Passo

## ⚡ Quick Setup (2 minutos)

### 1. Abra o Supabase Dashboard
- Vá em: https://app.supabase.com
- Faça login com sua conta
- Selecione o projeto "Finance App" (ID: alqzqapccyclmffdfmlc)

### 2. Acesse o SQL Editor
```
[Sidebar] → Database → SQL Editor → New Query
```

### 3. Cole o SQL Abaixo
```sql
-- Add credit card fields to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS limite DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_fechamento VARCHAR(2),
ADD COLUMN IF NOT EXISTS dia_vencimento VARCHAR(2),
ADD COLUMN IF NOT EXISTS cor VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'credito';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_banco ON accounts(banco);
```

### 4. Execute
- Clique no botão **"Run"** (▶️) ou pressione `Ctrl+Enter`
- Aguarde a conclusão (deve levar menos de 1 segundo)

### 5. Sucesso! ✅
Você verá uma mensagem como:
```
Query executed successfully in 0.5s
```

## 📋 Campos Adicionados

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `banco` | TEXT | NULL | Nome do banco (Itaú, Bradesco, etc) |
| `limite` | DECIMAL(15,2) | 0 | Limite de crédito em reais |
| `dia_fechamento` | VARCHAR(2) | NULL | Dia do mês (1-31) |
| `dia_vencimento` | VARCHAR(2) | NULL | Dia do mês (1-31) |
| `cor` | VARCHAR(7) | '#3b82f6' | Cor em hex (#RRGGBB) |
| `tipo` | VARCHAR(50) | 'credito' | Tipo: credito, debito, pre-pago |

## ✨ Índices Criados

Para melhorar performance:
- `idx_accounts_tipo` - indexa coluna `tipo`
- `idx_accounts_banco` - indexa coluna `banco`

## ⚠️ Importante

- Os campos têm valores padrão, então **não vai quebrar dados existentes**
- Se um campo já existe, será ignorado (por `IF NOT EXISTS`)
- A migração é **segura e idempotente** (pode rodar múltiplas vezes)

## 🔍 Verificar se Funcionou

Você pode listar os campos da tabela:

```sql
-- Ver estrutura da tabela accounts
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;
```

Procure pelos 6 campos novos na lista.

## 🆘 Se Algo der Errado

### Erro: "Column already exists"
- **Solução**: Isso significa que algum campo já foi adicionado. Apenas execute novamente e ignore.

### Erro: "Permission denied"
- **Solução**: Verifique se você tem permissões admin no Supabase

### Erro: "Table 'accounts' doesn't exist"
- **Solução**: Verifique o nome correto da tabela (deve ser `accounts` em lowercase)

## 📝 Próximos Passos

1. ✅ Execute a migração SQL (este passo)
2. ✅ Recarregue a aplicação (F5 no navegador)
3. 📖 Leia a documentação em `CREDIT-CARDS-SETUP.md`
4. 🎯 Teste editando um cartão existente
5. 🆕 Crie um novo cartão com os campos completos

## 🚀 Depois que Completar

A interface de cartões estará totalmente funcional com:
- ✨ Visual profissional e moderno
- 🎨 Cartões coloridos personalizáveis
- 💾 Todos os dados sendo salvos no banco
- 📊 Métricas automáticas de saldo/receitas/despesas

## 💡 Dica Extra

Se preferir criar uma nova query em vez de copiar/colar:

1. Vá para **SQL Editor**
2. Clique em **New Query**
3. Nomeia como "Add Credit Card Fields"
4. Cola o SQL
5. Clica em **Save** para reusar depois

---

**Status**: Pronto para executar! ✅
