# Integração com CVM - Guia de Implementação

## 📋 Visão Geral

Esta integração permite que usuários adicionem fundos de investimento e previdência ao seu sistema, com sincronização automática de cotas em tempo real (ou próximo) usando dados públicos da CVM.

## 🎯 Funcionalidades

- ✅ Busca de fundos na base de dados da CVM por CNPJ
- ✅ Validação de CNPJ
- ✅ Sincronização automática de cotas
- ✅ Cálculo automático de rentabilidade
- ✅ Cache local para evitar rate limiting
- ✅ Suporte a múltiplos fundos simultâneos
- ✅ Histórico de sincronização

## 📁 Arquivos Criados

### 1. `src/utils/cvm.ts`
Funções utilitárias para integração com a API da CVM:
- `buscarFundoCVM()` - Busca fundo pelo CNPJ
- `buscarCotaAtualizadaFundo()` - Obtém cota atual com cache
- `calcularValorAtualFundo()` - Calcula rentabilidade
- `validarCNPJ()` - Valida formato de CNPJ

### 2. `src/hooks/useSincronizacaoFundos.ts`
Hook React para gerenciar sincronizações:
- `sincronizarFundo()` - Sincroniza um fundo específico
- `sincronizarTodosFundos()` - Sincroniza todos os fundos
- `iniciarSincronizacaoAutomatica()` - Ativa atualização periódica
- `pararSincronizacaoAutomatica()` - Desativa atualizações

### 3. `src/components/investments/AdicionarFundoDialog.tsx`
Dialog para adicionar novo fundo com busca na CVM

### 4. `src/components/investments/SincronizacaoFundo.tsx`
Componentes visuais para mostrar status de sincronização

## 🚀 Como Integrar no Sistema

### Passo 1: Adicionar Botão de Novo Fundo

No arquivo `src/pages/Investimentos.tsx`, adicione o import:

```typescript
import { AdicionarFundoDialog } from '@/components/investments/AdicionarFundoDialog'
import { useSincronizacaoFundos } from '@/hooks/useSincronizacaoFundos'
```

No componente:

```typescript
const [addFundoDialogOpen, setAddFundoDialogOpen] = useState(false)
const { statusSincronizacoes, sincronizarFundo, iniciarSincronizacaoAutomatica } = useSincronizacaoFundos()

// Ao montar o componente, inicia sincronização automática
useEffect(() => {
  iniciarSincronizacaoAutomatica(60) // 60 minutos
}, [iniciarSincronizacaoAutomatica])

const handleAddFundo = async (dados) => {
  await adicionarInvestimento({
    ...dados,
    data_aplicacao: new Date().toISOString(),
  })
  setAddFundoDialogOpen(false)
}
```

### Passo 2: Adicionar Dialog ao JSX

```typescript
<AdicionarFundoDialog
  isOpen={addFundoDialogOpen}
  onClose={() => setAddFundoDialogOpen(false)}
  onAddFundo={handleAddFundo}
/>
```

### Passo 3: Mostrar Status de Sincronização

Use o componente `SincronizacaoFundo` em cada card de fundo:

```typescript
import { SincronizacaoFundo } from '@/components/investments/SincronizacaoFundo'

// No card do fundo:
<SincronizacaoFundo
  fundoId={fundo.id}
  sincronizando={statusSincronizacoes.get(fundo.id)?.sincronizando || false}
  ultimaSincronizacao={statusSincronizacoes.get(fundo.id)?.ultimaSincronizacao}
  erro={statusSincronizacoes.get(fundo.id)?.erro}
  cotaAtualizada={statusSincronizacoes.get(fundo.id)?.cotaAtualizada}
  onSincronizar={() => sincronizarFundo(fundo)}
/>
```

## 🔌 Integração com Banco de Dados

Você precisará adicionar estes campos à tabela de investimentos (se ainda não existem):

```sql
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS cotacao_atual DECIMAL(15,6);
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS fonte_marcacao VARCHAR(50);
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS data_marcacao TIMESTAMP;

-- Índice para melhor performance
CREATE INDEX idx_investimentos_tipo_codigo ON investimentos(tipo, codigo);
```

## 📊 Fluxo de Dados

```
Usuario adiciona fundo
    ↓
Busca CNPJ na CVM
    ↓
API retorna dados do fundo
    ↓
Salva no banco com cota inicial
    ↓
Sincronizador automático roda a cada X minutos
    ↓
Busca cota atualizada na CVM
    ↓
Atualiza valor_atual e rentabilidade
    ↓
UI mostra status da última sincronização
```

## ⚙️ Configuração Avançada

### Intervalo de Sincronização

No seu componente principal:

```typescript
// Sincronizar a cada 30 minutos
iniciarSincronizacaoAutomatica(30)

// Sincronizar a cada 1 hora (padrão)
iniciarSincronizacaoAutomatica(60)

// Sincronizar a cada 4 horas
iniciarSincronizacaoAutomatica(240)
```

### Cache Local

A função `buscarCotaAtualizadaFundo()` usa `localStorage` para cache de até 1 hora:

```typescript
// Limpar cache manualmente
localStorage.removeItem(`fundo_cota_${cnpj}`)

// Limpar todo o cache de fundos
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('fundo_cota_')) {
    localStorage.removeItem(key)
  }
})
```

## 🌐 API da CVM Utilizada

A integração usa a API pública de dados abertos da CVM:

- **Endpoint**: `https://dados.cvm.gov.br/api/3/action/datastore_search_sql`
- **Dataset**: Fundos de Investimento (dataset ID: 4c4771d4-53c4-4a87-ba47-6b292ac34e84)
- **Limite de requisições**: ~1000 por hora (compatível com sincronização periódica)
- **Frequência de atualização**: Diária (dados de cotas são publicados ao fim de cada dia útil)

## ⚠️ Limitações Conhecidas

1. **Atraso de dados**: CVM publica cotas ao final do dia útil (~16h-18h)
2. **Fundos extintos**: Fundos fechados podem não ser encontrados
3. **Taxa limite**: Até ~1000 requisições/hora (suficiente para sincronização)
4. **Cobertura**: Apenas fundos registrados na CVM

## 🔐 Segurança

- Nenhuma credencial necessária (API pública)
- CNPJs são validados antes de requisições
- Dados são cacheados localmente para reduzir requisições
- Requisições agrupadas em batches com delays

## 📈 Próximas Melhorias Sugeridas

1. Armazenar histórico de cotas para gráficos de evolução
2. Adicionar alertas de rentabilidade (positiva/negativa)
3. Exportar relatório de fundos para PDF
4. Comparação com benchmark (Ibovespa, CDI, etc)
5. Integração com sistema de imposto de renda
6. Webhook para notificação de mudanças significativas

## 🧪 Teste Manual

Para testar a integração sem implementação completa:

```typescript
import { buscarFundoCVM, validarCNPJ } from '@/utils/cvm'

// Teste de validação CNPJ
console.log(validarCNPJ('00.000.000/0000-00')) // false
console.log(validarCNPJ('07.526.847/0001-20')) // true (exemplo válido)

// Teste de busca (use um CNPJ real)
const fundo = await buscarFundoCVM('07.526.847/0001-20')
console.log(fundo)
```

## 📞 Suporte

Dúvidas sobre a API da CVM:
- Documentação: https://dados.cvm.gov.br/
- Dataset explorador: https://dados.cvm.gov.br/dataset/if-doc-fi

Dúvidas sobre a implementação:
- Verifique o console do navegador para logs de erro
- Validar CNPJ em https://www.cnpj.com.br/
