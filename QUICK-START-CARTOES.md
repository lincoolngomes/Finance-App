# ⚡ Quick Start - Cartões de Crédito

## 3 Passos em 5 Minutos

### 1️⃣ Executar SQL (2 min)

```
Abra: https://app.supabase.com
Menu: Database → SQL Editor → New Query
Cole o SQL abaixo e clique RUN ▶️
```

```sql
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS banco TEXT,
ADD COLUMN IF NOT EXISTS limite DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_fechamento VARCHAR(2),
ADD COLUMN IF NOT EXISTS dia_vencimento VARCHAR(2),
ADD COLUMN IF NOT EXISTS cor VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'credito';

CREATE INDEX IF NOT EXISTS idx_accounts_tipo ON accounts(tipo);
CREATE INDEX IF NOT EXISTS idx_accounts_banco ON accounts(banco);
```

### 2️⃣ Recarregar App (30 seg)

```
F5 no navegador para fazer refresh
```

### 3️⃣ Testar (2 min)

```
Vá em: Cartões de Crédito
Clique: Adicionar Cartão
Preencha e Salve
```

---

## 📸 Como Ficou

```
┌─────────────────────────────────────────┐
│         CARTÕES DE CRÉDITO              │
│    Gerencie seus cartões de crédito     │
│                       [+ Adicionar]     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  CARTÃO VISUAL PREMIUM              │ │
│ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│ │  Black IP               ◆            │ │
│ │  R$ 15.000,00                       │ │
│ │  Fechamento: 25 | Vencimento: 01   │ │
│ │                                     │ │
│ │  Saldo | Receita | Despesa | Trans  │ │
│ │  [Editar] [Excluir]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ (Mais cartões...)                       │
└─────────────────────────────────────────┘
```

---

## 🎯 Novos Campos

| Campo | Exemplo |
|-------|---------|
| Nome | Black IP |
| Banco | Itaú |
| Tipo | Crédito |
| Limite | R$ 15.000 |
| Fechamento | 25 |
| Vencimento | 01 |
| Cor | #3b82f6 |

---

## ✨ Funcionalidades

✅ Interface Premium com Gradiente
✅ Preview em Tempo Real
✅ Color Picker Interativo
✅ Métricas Automáticas
✅ Responsividade Total
✅ Dark Theme
✅ Editar/Deletar

---

## 📁 Documentação

- 📖 `CARTOES-RESUMO-FINAL.md` - Resumo completo
- 📖 `EXECUTE-CREDIT-CARDS-SQL.md` - Passo-a-passo
- 📖 `CREDIT-CARDS-SETUP.md` - Setup detalhado
- 📖 `CREDIT-CARDS-VISUAL-GUIDE.md` - Guia visual
- 📖 `CREDIT-CARDS-IMPLEMENTATION-SUMMARY.md` - Técnico

---

## ✅ Status

```
Build:        ✓ 3.42s
Erros:        0
Status:       ✅ PRONTO PARA PRODUÇÃO
```

---

## 🚀 Começar Agora

1. Execute o SQL acima
2. Recarregue (F5)
3. Vá em "Cartões de Crédito"
4. Clique "Adicionar Cartão"
5. Preencha e salve

**Pronto! Seu novo sistema de cartões está funcionando** 🎉
