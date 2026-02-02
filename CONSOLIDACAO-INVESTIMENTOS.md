# 🔧 Consolidação: Usar Apenas Tabela "investimentos"

## ✅ Solução

Os dados estão divididos entre:
- `transacoes_investimentos` ← Tem os dados CORRETOS (quantidade, preço)
- `investimentos` ← Está VAZIO

**Vamos consolidar TUDO em `investimentos`!**

## 🚀 Como Fazer (3 passos)

### Passo 1: Abra Supabase Console
https://app.supabase.com → SQL Editor

### Passo 2: Cole Esta SQL

```sql
UPDATE public.investimentos inv
SET
  quantidade = (
    SELECT COALESCE(SUM(quantidade), 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  preco_medio = (
    SELECT COALESCE(preco_unitario, 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
    ORDER BY data_transacao DESC LIMIT 1
  ),
  valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  data_aplicacao = (
    SELECT COALESCE(MIN(data_transacao), inv.data_aplicacao)
    FROM public.transacoes_investimentos
    WHERE investimento_id = inv.id
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.transacoes_investimentos
  WHERE investimento_id = inv.id
);
```

### Passo 3: Execute
Clique em **Run** ▶️

### Passo 4: Recarregue Página
Pressione **F5** no navegador

---

## 📊 O Que Vai Acontecer

**Antes:**
```
investimentos (vazio):
  quantidade: 0
  preco_medio: 0
  valor_total: 0

transacoes_investimentos (com dados):
  quantidade: 10000
  preco_unitario: 1300.00
  valor_total: 13.000.000
```

**Depois:**
```
investimentos (POPULADO):
  quantidade: 10000
  preco_medio: 1300.00
  valor_total: 13.000.000

transacoes_investimentos (ignorado):
  (continua ali, mas o app não usa mais)
```

---

## ✅ Resultado Esperado

**No card do CDB-DI você verá:**
```
CDB DI - Renda Fixa
━━━━━━━━━━━━━━━━━━━
Valor Investido:  R$ 13.000.000,00
Valor Atual:      R$ ~13.826.462,40  (com CDI)
Rentabilidade:    R$ ~826.462,40
% Rentabilidade:  ~6.36%  (6.4% CDI × 101%)
```

---

## 🔍 Como Confirmar

Após executar a SQL, execute esta query para verificar:

```sql
SELECT 
  codigo,
  quantidade,
  preco_medio,
  valor_total,
  tipo_rentabilidade,
  taxa_percentual
FROM public.investimentos
WHERE codigo = 'CDB-DI';
```

Deve retornar:
```
codigo    | quantidade | preco_medio | valor_total | tipo_rentabilidade | taxa_percentual
CDB-DI    | 10000      | 1300.00     | 13000000    | pos                | 101
```

---

## 🎉 Pronto!

Após executar, recarregue a página e **os valores vão aparecer corrigidos!** 🚀
