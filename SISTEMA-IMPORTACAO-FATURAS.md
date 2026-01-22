# 📤 Sistema de Importação de Faturas - Guia Completo

## 🎯 Visão Geral

Sistema completo para importar faturas de cartão de crédito em formato CSV ou PDF, com detecção automática de duplicatas, categorização inteligente, e histórico de auditoria.

---

## ✨ Funcionalidades Implementadas

### 1️⃣ **Importação de Arquivos**
- ✅ Suporte para **CSV** e **PDF**
- ✅ Validação de formato e tamanho (máx. 10MB)
- ✅ Detecção automática do formato do Itaú
- ✅ Barra de progresso em tempo real

### 2️⃣ **Detecção Inteligente de Duplicatas**
- ✅ Compara últimos 90 dias de transações
- ✅ Verifica: **data + valor + descrição**
- ✅ Destaque visual de duplicatas
- ✅ Botão para remover duplicatas automaticamente

### 3️⃣ **Categorização Automática**
- ✅ **9 categorias pré-configuradas**:
  - 🚕 Transporte (Uber, 99, Taxi)
  - 🍔 Alimentação (iFood, Rappi, restaurantes)
  - 🎬 Entretenimento (Netflix, Spotify, Disney+)
  - 💊 Saúde (farmácias, clínicas, hospitais)
  - 🛒 Supermercado (grandes redes)
  - ⛽ Combustível (postos)
  - 🛍️ Compras (lojas, shoppings)
  - 💡 Contas (luz, água, internet)
  - 🏋️ Academia (academias e fitness)
- ✅ Edição manual de categorias antes de importar
- ✅ Categoria "Outros" para não reconhecidos

### 4️⃣ **Preview e Edição**
- ✅ Tabela interativa de transações
- ✅ Editar **data, descrição e categoria** individualmente
- ✅ Remover transações indesejadas
- ✅ Estatísticas: Total, Válidas, Duplicatas
- ✅ Suporte a parcelas (detecta "2/12")

### 5️⃣ **Importação em Lote**
- ✅ Processamento em lotes de 50 transações
- ✅ Indicador de progresso
- ✅ Tratamento de erros robusto
- ✅ Rollback automático em caso de falha

### 6️⃣ **Histórico de Importações**
- ✅ Registro de todas as importações
- ✅ Visualização de: data, arquivo, cartão, quantidade
- ✅ Estatísticas totais
- ✅ Exclusão de registros do histórico
- ✅ Tabela `import_history` no Supabase

---

## 🚀 Como Usar

### **Opção 1: Importar do Header (sem cartão selecionado)**

1. Acesse a página **Cartões**
2. Clique em **"Importar Fatura"** (header superior)
3. Selecione o **cartão de destino**
4. Faça **upload do arquivo** CSV ou PDF
5. Clique em **"Processar Arquivo"**
6. Revise as transações na tabela:
   - ⚠️ Duplicatas aparecem com fundo amarelo
   - ✏️ Edite data, descrição ou categoria
   - 🗑️ Remova transações indesejadas
7. Clique em **"Remover Duplicatas"** (se houver)
8. Clique em **"Importar X Transações"**
9. ✅ Aguarde confirmação de sucesso

### **Opção 2: Importar Direto do Cartão (pré-selecionado)**

1. Na página **Cartões**, passe o mouse sobre um cartão
2. Clique no botão **"Importar"** (azul, overlay)
3. O cartão já estará pré-selecionado
4. Siga os passos 4-9 da Opção 1

### **Opção 3: Ver Histórico de Importações**

1. Clique em **"Histórico"** (header)
2. Visualize todas as importações realizadas
3. Veja estatísticas totais
4. Exclua registros antigos (opcional)

---

## 📋 Formatos de Arquivo Suportados

### **CSV do Itaú**

**Colunas esperadas** (aceita variações):
```csv
data,histórico,valor
12/01/2026,COMPRA IFOOD,45.90
13/01/2026,UBER *VIAGEM,28.50
```

**Variações aceitas:**
- `data`, `Data`, `date`, `Date`, `quando`
- `histórico`, `Histórico`, `descricao`, `Descricao`, `estabelecimento`
- `valor`, `Valor`, `amount`, `Amount`, `total`

**Formato de valores:**
- `1.234,56` (BR - com ponto e vírgula)
- `1234,56` (BR - só vírgula)
- `1234.56` (US - ponto decimal)

### **PDF do Itaú**

**Padrão extraído:**
```
12/01  COMPRA LOJA XYZ  R$ 123,45
13/01  PAGAMENTO MENSALIDADE  R$ 299,00
```

**Regex utilizado:**
```regex
/(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+R?\$?\s*([\d.,]+)/g
```

**Nota:** Se a data não incluir ano, o sistema adiciona o ano atual automaticamente.

---

## 🗄️ Estrutura do Banco de Dados

### **Tabela: `import_history`**

```sql
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'pdf')),
  transactions_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Índices:**
- `idx_import_history_userid` - Busca por usuário
- `idx_import_history_account` - Busca por cartão
- `idx_import_history_date` - Ordenação por data

**RLS (Row Level Security):**
- ✅ Usuários veem apenas seu próprio histórico
- ✅ Usuários podem inserir registros próprios
- ✅ Usuários podem deletar registros próprios

---

## 🎨 Interface do Usuário

### **Botões na Página Cartões**

| Botão | Cor | Localização | Função |
|-------|-----|-------------|--------|
| 🕐 Histórico | Outline | Header | Abre modal de histórico |
| 📤 Importar Fatura | Outline | Header | Abre importador (escolhe cartão) |
| ➕ Adicionar Cartão | Azul | Header | Cria novo cartão |
| 📋 Faturas | Verde | Hover do cartão | Visualiza faturas do cartão |
| 📤 Importar | Azul | Hover do cartão | Importa para este cartão |
| ✏️ Editar | Branco | Hover do cartão | Edita dados do cartão |
| 🗑️ Excluir | Vermelho | Hover do cartão | Remove cartão |

### **Fluxo de Importação (3 Steps)**

**Step 1: Upload**
- Seletor de cartão
- Área de upload drag-and-drop
- Validação de formato e tamanho
- Barra de progresso ao processar

**Step 2: Preview**
- Cards com estatísticas (Total, Válidas, Duplicatas)
- Alerta de duplicatas com botão "Remover Duplicatas"
- Tabela editável com todas as transações
- Campos editáveis: data, descrição, categoria
- Botão de remover por linha

**Step 3: Importando**
- Ícone animado de upload
- Barra de progresso
- Percentual em tempo real
- Mensagem de conclusão

---

## 🔧 Tecnologias Utilizadas

| Tecnologia | Uso |
|------------|-----|
| **React 18+** | Interface do usuário |
| **TypeScript** | Tipagem estática |
| **Supabase** | Banco de dados + RLS |
| **papaparse** | Parsing de CSV |
| **pdf-parse** | Extração de texto de PDF |
| **date-fns** | Formatação de datas |
| **Tailwind CSS** | Estilização |
| **shadcn/ui** | Componentes UI |
| **Lucide React** | Ícones |

---

## 📦 Instalação

### **1. Biblioteca pdf-parse**

```bash
npm install pdf-parse
```

### **2. Criar tabela no Supabase**

Execute o SQL em `/supabase/migrations/import_history.sql`:

```bash
# No Supabase Dashboard > SQL Editor
# Cole o conteúdo do arquivo import_history.sql
# Execute
```

**Ou via CLI:**
```bash
supabase db push
```

---

## 🧪 Testando o Sistema

### **Teste 1: CSV Simples**

Crie um arquivo `teste.csv`:
```csv
data,histórico,valor
22/01/2026,IFOOD PEDIDO,89.90
22/01/2026,UBER VIAGEM,35.50
22/01/2026,NETFLIX ASSINATURA,55.90
```

**Resultado esperado:**
- ✅ 3 transações detectadas
- ✅ Categorias: Alimentação, Transporte, Entretenimento
- ✅ 0 duplicatas (primeira importação)

### **Teste 2: Importação Duplicada**

1. Importe o `teste.csv`
2. Importe **novamente** o mesmo arquivo
3. **Resultado esperado:**
   - ⚠️ 3 duplicatas detectadas
   - 🟡 Linhas com fundo amarelo
   - 🔘 Botão "Remover Duplicatas" visível

### **Teste 3: PDF**

Crie um PDF com conteúdo:
```
Fatura Itaú - Janeiro/2026

22/01  COMPRA MERCADO  R$ 156,80
23/01  POSTO SHELL  R$ 250,00
24/01  FARMACIA  R$ 45,90
```

**Resultado esperado:**
- ✅ 3 transações extraídas
- ✅ Categorias: Supermercado, Combustível, Saúde

### **Teste 4: Edição e Remoção**

1. Importe qualquer arquivo
2. No preview:
   - ✏️ Altere uma categoria manualmente
   - 🗑️ Remova uma transação
   - 📅 Altere uma data
3. **Importe**
4. Verifique na página Transações se as alterações foram aplicadas

### **Teste 5: Histórico**

1. Importe 2-3 arquivos diferentes
2. Clique em **"Histórico"**
3. **Resultado esperado:**
   - 📊 Total de importações: 2-3
   - 📊 Total de transações: soma de todas
   - 📋 Lista com arquivo, cartão, data, quantidade
   - 🗑️ Botão de excluir funcional

---

## 🐛 Troubleshooting

### **Erro: "Não é possível localizar módulo pdf-parse"**

**Solução:**
```bash
npm install pdf-parse
```

### **Erro: "permission denied for table import_history"**

**Causa:** RLS não configurado corretamente

**Solução:**
```sql
-- No Supabase SQL Editor:
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu histórico" 
  ON import_history FOR SELECT 
  USING (auth.uid() = userid);

CREATE POLICY "Usuários podem inserir registros" 
  ON import_history FOR INSERT 
  WITH CHECK (auth.uid() = userid);
```

### **Erro: "Arquivo muito grande"**

**Causa:** Limite de 10MB atingido

**Solução:**
- Divida o arquivo em partes menores
- Ou altere o limite em `ImportarFaturaModal.tsx`:
```typescript
if (selectedFile.size > 20 * 1024 * 1024) { // 20MB
```

### **PDF não está sendo parseado corretamente**

**Causa:** Formato do PDF diferente do Itaú

**Solução:** Ajuste o regex em `processarPDF()`:
```typescript
// Linha 269
const regex = /SEU_NOVO_PADRAO/g
```

### **Duplicatas não estão sendo detectadas**

**Causa:** Transações muito antigas (>90 dias)

**Solução:** Aumente o período em `fetchTransacoesExistentes()`:
```typescript
.gte('quando', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // 180 dias
```

---

## 🔮 Melhorias Futuras Possíveis

- [ ] Suporte para outros bancos (Nubank, Inter, C6)
- [ ] Detecção de formato automática (AI/ML)
- [ ] Import via OCR de fotos
- [ ] Agendamento de importações recorrentes
- [ ] Notificações de importação concluída
- [ ] Export de transações para Excel
- [ ] Integração com Open Banking
- [ ] Detecção de fraudes
- [ ] Sugestões de economia baseadas em categorias

---

## 📝 Changelog

### v1.0.0 - 22/01/2026
- ✅ Importação de CSV e PDF
- ✅ Detecção de duplicatas
- ✅ Categorização automática (9 categorias)
- ✅ Preview e edição
- ✅ Histórico de importações
- ✅ Botão de importar no hover do cartão
- ✅ Indicador de progresso
- ✅ Importação em lotes
- ✅ RLS no Supabase

---

## 📄 Licença

Este sistema faz parte do Finance-App e segue a mesma licença do projeto principal.

---

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Consulte a seção Troubleshooting
3. Abra uma issue no repositório

---

**Desenvolvido com ❤️ para facilitar a gestão financeira**
