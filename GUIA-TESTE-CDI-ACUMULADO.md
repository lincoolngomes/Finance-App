# 📊 Guia: Testar Cálculo de CDI Acumulado

## ✅ Status Atual

O app **JÁ ESTÁ** buscando o CDI acumulado da API do Banco Central! 

- ✅ Função `buscarCDIAcumulado()` implementada em `/src/utils/cdi.ts`
- ✅ Integrada ao cálculo de renda fixa (`tipo_rentabilidade: 'pos'`)
- ✅ Usa API oficial do Banco Central (série 12 - CDI)
- ✅ Aplica corretamente: `rendimento = CDI acumulado × percentual do CDI`
- ✅ Calcula IR de acordo com tabela regressiva
- ✅ Retorna valor líquido (bruto - IR)

## 🎯 Como Funciona

### 1️⃣ Busca de CDI
```
API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados
Período: data_aplicacao até hoje
Retorna: Fator acumulado (ex: 1.384160 = 38.416% de rendimento)
```

### 2️⃣ Cálculo da Rentabilidade
```
Para CDB DI com 101% do CDI:

1. Buscar CDI acumulado de 2025-01-02 até 02/02/2026
   → Fator = ~1.0640 (exemplo, valor real vem da API)

2. Calcular rendimento:
   rendimentoCDI = fatorCDI - 1 = 0.0640 (6.40%)
   
3. Aplicar percentual contratado:
   percentualContratado = 101% = 1.01
   rendimento = 0.0640 × 1.01 = 0.06464 (6.464%)

4. Valor bruto:
   valorBruto = 25000 × (1 + 0.06464) = 26616.00

5. Calcular IR (tabela regressiva por dias):
   - 0-180 dias: 22.5%
   - 181-360 dias: 20%
   - 361-720 dias: 17.5%
   - 720+ dias: 15%
   
   Dias investido = ~32 dias → alíquota = 22.5%
   irRetido = (26616 - 25000) × 0.225 = 363.60
   
6. Valor líquido:
   valorLiquido = 26616 - 363.60 = 26252.40

7. Rentabilidade:
   rentabilidade = 26252.40 - 25000 = 1252.40
   rentabilidade% = 1252.40 / 25000 = 5.01%
```

## 🔧 Como Testar

### Opção 1: Via Supabase Console (RECOMENDADO)

1. Acesse: https://app.supabase.com → Seu Projeto
2. Vá para: "SQL Editor"
3. Cole o SQL abaixo:

```sql
-- Atualizar CDB-DI com valores para teste
UPDATE public.investimentos
SET
  quantidade = 1,
  preco_medio = 25000.00,
  valor_total = 25000.00,
  data_aplicacao = '2025-01-02',      -- Data inicial (período de CDI)
  data_vencimento = '2028-02-24',     -- Data final
  tipo_rentabilidade = 'pos',          -- Pós-fixado
  taxa_percentual = 101,               -- 101% do CDI
  indexador = 'cdi',                   -- Indexado ao CDI
  tipo_marcacao = NULL,                -- Sem marcação a mercado
  isento_ir = false,                   -- Sujeito a IR
  liquidez = 'diaria',                 -- Resgate a qualquer momento
  ativo = true,
  updated_at = NOW()
WHERE codigo = 'CDB-DI'                -- Usar o código como filtro
  AND user_id = auth.uid();
```

4. Clique em "Run" (▶️)
5. Verifique: "0 rows affected" (se não encontrou) ou "1 row updated" (sucesso)

### Opção 2: Buscar ID Correto Primeiro

Se não souber o user_id, execute primeiro:

```sql
-- Listar todos os investimentos
SELECT 
  id,
  user_id,
  codigo,
  nome,
  quantidade,
  valor_total,
  tipo_rentabilidade,
  indexador,
  taxa_percentual
FROM public.investimentos
WHERE codigo = 'CDB-DI'
ORDER BY created_at DESC
LIMIT 5;
```

Depois atualize com o ID específico:

```sql
UPDATE public.investimentos
SET
  quantidade = 1,
  preco_medio = 25000.00,
  valor_total = 25000.00,
  data_aplicacao = '2025-01-02',
  data_vencimento = '2028-02-24',
  tipo_rentabilidade = 'pos',
  taxa_percentual = 101,
  indexador = 'cdi',
  isento_ir = false,
  liquidez = 'diaria',
  ativo = true,
  updated_at = NOW()
WHERE id = 'YOUR_ID_HERE'  -- Substituir pelo ID encontrado
  AND user_id = auth.uid();
```

## 📲 Após Executar a SQL

1. **Recarregue a página** (F5)
2. **Abra o Console do Navegador** (F12 → Console)
3. **Procure pelos logs** do cálculo:

```
🔍 Buscando CDI do Banco Central: 02/01/2025 a 02/02/2026
📦 CDI encontrado no cache [ou]
✅ CDI acumulado: Fator 1.064000 (32 dias úteis)
🔍 DADOS DO INVESTIMENTO: {
  codigo: "CDB-DI",
  indexador: "cdi",
  taxa_percentual_bruto: 101,
  ...
}
💸 Imposto de Renda: {
  diasAplicado: 32,
  aliquota: "22.50%",
  rendimentoBruto: "1616.00",
  irRetido: "363.60",
  valorBruto: "26616.00",
  valorLiquido: "26252.40"
}
✅ INVESTIMENTOS PROCESSADOS COM COTAÇÕES: [...]
```

## ✅ O Que Verificar na Página

Após recarregar, você deve ver:

### Card do CDB-DI
```
┌─────────────────────────────┐
│ CDB DI - Renda Fixa         │
├─────────────────────────────┤
│ Total Investido:  R$ 25.000,00
│ Valor Atual:      R$ 26.252,40  ← Calculado com CDI
│ Rentabilidade:    R$ 1.252,40   ← Diferença
│ % Rentabilidade:  5.01%          ← % com CDI
└─────────────────────────────┘
```

### Dashboard - Cards de Resumo
```
┌──────────────────────────────────┐
│ Patrimônio Total:  R$ 26.252,40  │ ← Somado
│ Rentabilidade:     R$ 1.252,40   │ ← Com CDI
│ Rentabilidade %:   5.01%         │ ← Com CDI
│ Liquidez Diária:   R$ 26.252,40  │ ← CDB tem liquidez diária
└──────────────────────────────────┘
```

## 🐛 Se Não Funcionar

### Problema: "Valor ainda é R$ 0,00"
**Causa**: SQL não executou corretamente
**Solução**: 
1. Verifique se o investimento foi realmente atualizado (execute SELECT)
2. Recarregue a página (F5)
3. Limpe o cache: F12 → Application → Clear Site Data

### Problema: "Erro ao buscar CDI"
**Causa**: API do Banco Central pode estar indisponível
**Solução**: 
1. Abra F12 → Console
2. Procure por: `❌ Erro ao buscar CDI:`
3. A app usa fallback com taxa fixa de 13.65% a.a.

### Problema: "IR incorreto"
**Causa**: Dias investido calculado errado
**Solução**: 
1. Verifique se `data_aplicacao` está correta
2. Hoje é 02/02/2026, então 32 dias desde 01/01/2026

## 📝 Campos Importante para o Cálculo

| Campo | Valor | Descrição |
|-------|-------|-----------|
| `quantidade` | 1 | Unidades investidas |
| `preco_medio` | 25000 | Preço unitário na compra |
| `valor_total` | 25000 | Valor aplicado |
| `data_aplicacao` | 2025-01-02 | Quando aplicou |
| `data_vencimento` | 2028-02-24 | Quando vence |
| `tipo_rentabilidade` | pos | Pós-fixado (%) |
| `taxa_percentual` | 101 | 101% do CDI |
| `indexador` | cdi | Indexador (CDI, SELIC, etc) |
| `isento_ir` | false | Sujeito a imposto |
| `liquidez` | diaria | Resgate a qualquer momento |

## 🎓 Compreendendo a Fórmula

### CDI Acumulado
- API do BC retorna: `Fator = 1.064` (6.4% acumulado)
- Isso significa: R$ 100 virou R$ 106,40

### Percentual do CDI
- 100% do CDI = você ganha exatamente o CDI
- 101% do CDI = você ganha CDI + 1% (spread do banco)
- 95% do CDI = você ganha 95% do rendimento do CDI

### Imposto de Renda (Renda Fixa)
Tabela regressiva por dias de investimento:
- 0-180 dias: **22,5%** de alíquota ← Seu caso (32 dias)
- 181-360 dias: **20%**
- 361-720 dias: **17,5%**
- 720+ dias: **15%**

Quanto mais tempo investido, menor o IR! Por isso investimentos longos são mais lucrativos.

## 🚀 Próximos Testes

Após confirmar que funciona com 101% CDI:

1. **Testar com IPCA+**: 
   - `tipo_rentabilidade = 'ipca'`
   - `taxa_percentual = 6.5` (taxa prefixada)
   - `indexador = 'ipca'`
   - App calcula: IPCA real + taxa prefixada

2. **Testar com Tesouro SELIC**:
   - `tipo = 'tesouro_direto'`
   - `indexador = 'selic'`
   - `taxa_percentual = 0.15` (spread de 0,15% a.a.)
   - App calcula: SELIC × (1 + spread)

3. **Testar com Valor Manual**:
   - `valor_atual_manual = 30000`
   - App prioriza esse valor (não calcula via CDI)

## 📞 Dúvidas?

Revisar a documentação no código:
- `/src/utils/cdi.ts` - Busca CDI do BC
- `/src/hooks/useInvestments.ts` (linhas 754-870) - Cálculo de renda fixa
- `/src/pages/Investimentos.tsx` - Exibição dos valores
