# Implementação de Transparência Fiscal - Investimentos

## 📋 Resumo das Alterações

Implementação completa de funcionalidades para mostrar valores bruto e líquido de investimentos de renda fixa, com suporte a investimentos isentos de Imposto de Renda (LCI, LCA, CRI, CRA, Debêntures Incentivadas).

## ✅ Funcionalidades Implementadas

### 1. Coluna `isento_ir` no Banco de Dados
- **Arquivo**: `supabase/migrations/add_isento_ir.sql`
- **Descrição**: Adiciona coluna booleana para identificar investimentos isentos de IR
- **Default**: `false`
- **Para executar**: Aplicar migration no Supabase

### 2. Cálculo Diferenciado de IR
- **Arquivo**: `src/hooks/useInvestments.ts`
- **Mudanças**:
  - Função `calcularRendaFixa()` agora verifica `inv.isento_ir` antes de calcular IR
  - Se `isento_ir = true`: `ir_retido = 0` e `valor_liquido = valor_bruto`
  - Se `isento_ir = false`: Aplica tabela regressiva normal de IR
  - Retorna `valor_bruto` explicitamente no objeto de retorno
  - Projeção de vencimento também respeita isenção de IR

### 3. Interface Investimento Atualizada
- **Arquivo**: `src/hooks/useInvestments.ts`
- **Novos campos**:
  - `isento_ir?: boolean` - Indica se é isento de IR
  - `valor_bruto?: number` - Valor bruto do investimento (antes de IR)
  - `valor_atual_manual?: number` - Valor manual informado pelo usuário

### 4. Checkbox de Isenção de IR - Dialog de Edição
- **Arquivo**: `src/components/investments/EditInvestmentDialog.tsx`
- **Funcionalidade**:
  - Checkbox "Isento de Imposto de Renda"
  - Bordas verdes para destacar benefício fiscal
  - Explicação: "LCI, LCA, CRI, CRA ou Debêntures Incentivadas"
  - Salva automaticamente no banco quando alterado

### 5. Checkbox de Isenção de IR - Dialog de Adição
- **Arquivo**: `src/components/investments/AddTransactionDialog.tsx`
- **Funcionalidade**:
  - Checkbox disponível ao criar novo investimento de renda fixa
  - Mesmo estilo visual do dialog de edição
  - Campo resetado ao fechar dialog
  - Valor salvo no `getOrCreateInvestimento()`

### 6. Tabela com Colunas Bruto e Líquido
- **Arquivo**: `src/pages/Investimentos.tsx`
- **Mudanças**:
  - Coluna "Valor Atual" dividida em duas:
    1. **Valor Bruto**: Mostra `valor_bruto` ou fallback para `valor_atual`
    2. **Valor Líquido**: Mostra `valor_atual` (já com IR descontado)
  - Abaixo do valor líquido:
    - Se tiver IR: Mostra "IR: -R$ XX,XX" em laranja
    - Se isento: Mostra "✓ Isento IR" em verde
  - Projeção de rentabilidade mantida

### 7. Salvamento de `isento_ir` no Backend
- **Arquivo**: `src/hooks/useInvestments.ts`
- **Função**: `getOrCreateInvestimento()`
- **Mudança**: Campo `isento_ir` adicionado ao objeto de INSERT para renda fixa
- **Log**: Console mostra valor de `isento_ir` ao criar investimento

## 🎯 Casos de Uso

### Caso 1: CDB Tributado
```typescript
tipo: 'renda_fixa'
codigo: 'CDB-BTG-120CDI'
taxa_percentual: 120
tipo_rentabilidade: 'pos'
isento_ir: false  // ← Tributado
```
**Resultado na tabela:**
- Valor Bruto: R$ 1.804,34
- Valor Líquido: R$ 1.728,69
- Abaixo: "IR: -R$ 75,65" (laranja)

### Caso 2: LCI Isenta
```typescript
tipo: 'renda_fixa'
codigo: 'LCI-SANTANDER-95CDI'
taxa_percentual: 95
tipo_rentabilidade: 'pos'
isento_ir: true  // ← Isento
```
**Resultado na tabela:**
- Valor Bruto: R$ 1.728,69
- Valor Líquido: R$ 1.728,69
- Abaixo: "✓ Isento IR" (verde)

## 🔧 Integração com CDI Real

As mudanças são totalmente compatíveis com a integração do CDI real do Banco Central:

```typescript
// buscarCDIAcumulado() retorna taxa real
const taxaAnual = await buscarCDIAcumulado(dataAplicacao, hoje)
const taxaDiaria = Math.pow(1 + taxaAnual, 1 / 365) - 1

// Cálculo do valor bruto
const valorBruto = valorInicial * Math.pow(1 + taxaDiaria, diasAplicado)

// Cálculo do IR (apenas se não for isento)
if (!inv.isento_ir) {
  const rendimento = valorBruto - valorInicial
  const aliquotaIR = calcularAliquotaIR(diasAplicado)
  const irRetido = rendimento * aliquotaIR
  const valorLiquido = valorBruto - irRetido
} else {
  const valorLiquido = valorBruto // Sem desconto de IR
}
```

## 📊 Tabela Regressiva de IR

Aplicada apenas quando `isento_ir = false`:

| Prazo | Alíquota |
|-------|----------|
| Até 180 dias | 22.5% |
| 181 a 360 dias | 20% |
| 361 a 720 dias | 17.5% |
| Acima de 720 dias | 15% |

## 🎨 Indicadores Visuais

### Checkbox Isenção de IR
- Fundo verde claro (`bg-green-50 dark:bg-green-950`)
- Borda verde (`border-green-200 dark:border-green-800`)
- Texto verde (`text-green-700 dark:text-green-300`)
- Ícone: ✓

### Tabela - IR Retido
- Cor: Laranja (`text-orange-600 dark:text-orange-400`)
- Formato: "IR: -R$ XX,XX"
- Tamanho: `text-xs`

### Tabela - Isento IR
- Cor: Verde (`text-green-600 dark:text-green-400`)
- Formato: "✓ Isento IR"
- Tamanho: `text-xs`

## 🚀 Como Testar

### 1. Aplicar Migration
```sql
-- Execute no Supabase SQL Editor:
ALTER TABLE investimentos 
ADD COLUMN IF NOT EXISTS isento_ir BOOLEAN DEFAULT false;
```

### 2. Criar Investimento Isento (LCI)
1. Clicar em "Nova Aplicação"
2. Selecionar "Renda Fixa"
3. Preencher:
   - Código: LCI-SANTANDER-95CDI
   - Nome: LCI 95% CDI Santander
   - Taxa: 95%
   - Tipo: Pós-fixado
   - Data Aplicação: 22/03/2023
   - Data Vencimento: 22/03/2026
4. **Marcar checkbox "Isento de Imposto de Renda"**
5. Informar quantidade e valor
6. Salvar

### 3. Verificar Tabela
- Coluna "Valor Bruto" = Coluna "Valor Líquido"
- Abaixo de "Valor Líquido": "✓ Isento IR" em verde
- Nenhum desconto de IR aplicado

### 4. Criar Investimento Tributado (CDB)
1. Mesmos passos acima
2. **NÃO marcar** checkbox de isenção
3. Verificar:
   - Valor Bruto > Valor Líquido
   - Abaixo: "IR: -R$ XX,XX" em laranja

## 📝 Arquivos Modificados

1. `supabase/migrations/add_isento_ir.sql` - Nova migration
2. `src/hooks/useInvestments.ts` - Interface + cálculo + salvamento
3. `src/components/investments/EditInvestmentDialog.tsx` - Checkbox edição
4. `src/components/investments/AddTransactionDialog.tsx` - Checkbox criação
5. `src/pages/Investimentos.tsx` - Tabela com colunas bruto/líquido

## 🎯 Benefícios

1. **Transparência Fiscal**: Usuário vê quanto paga de IR
2. **Comparação Justa**: LCI 95% CDI pode render mais que CDB 120% CDI após IR
3. **Planejamento Tributário**: Fácil identificar investimentos isentos
4. **Cálculo Preciso**: CDI real + tabela regressiva correta
5. **UX Clara**: Cores indicam status fiscal (verde = isento, laranja = tributado)

## 🔮 Melhorias Futuras

- [ ] Filtro por "Isento IR" / "Tributado"
- [ ] Relatório de IR retido no ano (para declaração)
- [ ] Gráfico comparativo: Bruto vs Líquido
- [ ] Alerta quando investimento mudar de alíquota IR
- [ ] Exportar dados para IRPF
