# 🔧 Correção: CDB-DI não estava calculando

## ❌ Problema Identificado

O CDB-DI aparecia no card mas com R$ 0,00 porque:

1. O código estava procurando `tipo_marcacao` ou `valor_atual_manual` primeiro
2. Só tentava calcular renda fixa se nenhuma das condições anteriores fosse verdadeira
3. Se o investimento tivesse qualquer campo de marcação vazio, pulava o cálculo

## ✅ Solução Implementada

Reordenei a lógica em `fetchInvestimentos()` para:

1. **PRIMEIRO**: Verificar se tem `valor_atual_manual` (valor informado manualmente)
2. **SEGUNDO**: Se tem `tipo_rentabilidade` definido (pos, pre, ipca) → **CALCULAR RENDA FIXA AGORA!**
3. **TERCEIRO**: Tentar marcação a mercado (tesouro direto)
4. **QUARTO**: Tentar marcação por % VU (CRI/CRA/Debêntures)
5. **FALLBACK**: Usar valor_total como está

## 📝 Código Modificado

**Arquivo**: `/src/hooks/useInvestments.ts` (linhas ~185-225)

**Antes**:
```typescript
else if (inv.tipo_marcacao === 'mercado' && inv.tipo === 'tesouro_direto') {
  // ... código de marcação a mercado
} else {
  // ... calcular renda fixa
}
```

**Depois**:
```typescript
else if (inv.tipo_rentabilidade && ['pos', 'pre', 'ipca'].includes(inv.tipo_rentabilidade)) {
  // ✅ AGORA: Calcula renda fixa se tipo_rentabilidade está definido!
  if (dataBase && inv.data_vencimento && inv.taxa_percentual) {
    dadosAdicionais = await calcularRendaFixa(...)
    valor_atual = dadosAdicionais.valor_atual
  }
}
else if (inv.tipo_marcacao === 'mercado' && inv.tipo === 'tesouro_direto') {
  // ... marcação a mercado (continua como era)
}
```

## 🎯 Resultado

Agora o fluxo é:

```
1. Investimento carregado do banco
2. Detecta: tipo_rentabilidade = 'pos' (Pós-fixado)
3. ✅ ENTRA NO BLOCO DE CÁLCULO
4. Verifica: data_aplicacao ✅, data_vencimento ✅, taxa_percentual ✅
5. Calcula: 25.000 × (1 + 0.064 × 1.01) = 26.616
6. Aplica IR: -363,60
7. Resultado: 26.252,40 ✅
```

## 🚀 Como Testar

### Passo 1: Recarregue a Página
Pressione **F5** no navegador

### Passo 2: Abra Console
Pressione **F12** → **Console**

### Passo 3: Procure pelos Logs

Você deve ver:
```
💰 Tentando calcular renda fixa por tipo_rentabilidade: {
  codigo: "CDB-DI",
  tipo_rentabilidade: "pos",
  dataBase: "2025-01-02",
  data_vencimento: "2028-02-24",
  taxa_percentual: 101
}
✅ Dados válidos, calculando renda fixa...
✅ Renda fixa calculada: {
  valor_atual: 26252.40,
  rentabilidade: 1252.40
}
```

### Passo 4: Verifique o Card

Deve mostrar:
```
CDB DI - Renda Fixa
━━━━━━━━━━━━━━━━━━━
Valor Investido: R$ 25.000,00
Valor Atual:     R$ 26.252,40 ✅ (mudou!)
Rentabilidade:   R$ 1.252,40
% Rentabilidade: 5.01%
```

## ✨ Build Status

✅ Compilado com sucesso (4.49 segundos)
✅ 0 erros de TypeScript
✅ Pronto para teste

## 📊 Arquivos Modificados

- `/src/hooks/useInvestments.ts` - Reordenação de lógica

**Nenhum outro arquivo foi modificado** - o `calcularRendaFixa()` continua funcionando igual!

## 🎉 Resumo

A correção força o app a **sempre tentar calcular renda fixa** se o investimento tiver `tipo_rentabilidade` definido, independente de outros campos vazios.

**Próximo passo**: Recarregue a página e veja o resultado! 🚀
