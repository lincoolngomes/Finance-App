# Configuração do Sistema de Cartões de Crédito

## 📋 O que foi feito?

O sistema de cartões foi completamente redesenhado para ser um gerenciador visual profissional de cartões de crédito, com interface moderna e campos específicos para cada cartão.

### ✨ Melhorias Implementadas

1. **Interface Premium de Cartões**
   - Cartão visual estilo premium com gradiente e blur effects
   - Display de limite, fechamento, vencimento e banco
   - Preview em tempo real das alterações

2. **Modal de Edição Melhorado**
   - Formulário completo com todos os campos
   - Preview visual do cartão enquanto edita
   - Seletor de cores interativo
   - Inputs para todos os dados do cartão

3. **Campos de Cartão**
   - `nome`: Nome do cartão (ex: Black IP, Platinum)
   - `banco`: Banco (ex: Itaú, Bradesco, Nubank)
   - `tipo`: Tipo de cartão (Crédito, Débito, Pré-pago)
   - `limite`: Limite de crédito em R$
   - `dia_fechamento`: Dia do mês de fechamento (1-31)
   - `dia_vencimento`: Dia do mês de vencimento (1-31)
   - `cor`: Cor do cartão em hexadecimal (ex: #3b82f6)

4. **Métricas Automáticas**
   - Saldo Total (calculado automaticamente)
   - Receitas e Despesas vinculadas
   - Total de Transações

## 🔧 Próximos Passos

### 1. Adicione os Campos no Banco de Dados

Execute o SQL abaixo no Supabase Dashboard:
- Vá em: **SQL Editor** → **Criar Nova Query**
- Cole o conteúdo do arquivo `SETUP-CREDIT-CARDS.sql`
- Execute a query

**SQL a executar:**
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

### 2. Teste a Interface

1. Abra a aplicação em `http://localhost:8084`
2. Vá para a página de "Cartões de Crédito"
3. Clique em "Adicionar Cartão" ou edite um cartão existente
4. A interface vai abrir um modal com:
   - Preview visual do cartão
   - Formulário com todos os campos
   - Seletor de cores
   - Botões Salvar/Cancelar

### 3. Integração com Transações

Os cartões agora funcionam como verdadeiros cartões de crédito:
- Transações podem ser vinculadas a cartões via `account_id`
- Métodos de pagamento incluem "Cartão Crédito"
- Sistema de parcelamento funciona apenas com cartões de crédito

## 📊 Estrutura de Dados

### Tabela: `accounts`
```
id: UUID
name: TEXT (nome do cartão)
user_id: UUID
saldo_inicial: DECIMAL
tipo: VARCHAR (credito | debito | pre-pago)
banco: TEXT
limite: DECIMAL
dia_fechamento: VARCHAR
dia_vencimento: VARCHAR
cor: VARCHAR
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## 🎨 Recursos Visuais

### Cartão Premium
- Gradiente de cor com blur effects
- Display de informações (limite, fechamento, vencimento, banco)
- Ícone decorativo (◆)
- Responsivo e moderno

### Modal de Edição
- Preview ao vivo do cartão com cor selecionada
- Inputs estruturados com labels claros
- Seletor de cores com picker visual
- Formulário com máximo 400px de altura (com scroll)

## ⚠️ Notas Importantes

1. **Compatibilidade**: Todos os campos têm valores padrão, então cartões existentes continuarão funcionando
2. **Cores**: Use formato hexadecimal (#RRGGBB)
3. **Dias**: Use números de 1 a 31
4. **Tipo**: Opções são: `credito`, `debito`, `pre-pago`

## 🔜 Próximos Passos Futuros

1. Sistema de Faturas (Invoice)
   - Criar tabela `faturas` vinculada a cartões
   - Sistema de ciclos mensais
   - Status de fatura (aberta, fechada, paga)

2. Dashboard de Cartões
   - Visualizar todas as faturas
   - Gráficos de gastos por cartão
   - Alertas de limite disponível

3. Automatização
   - Auto-criar faturas mensais
   - Categorização automática de transações
   - Notificações de vencimento

## 📞 Suporte

Se encontrar qualquer erro:
1. Verifique se os campos foram adicionados ao banco de dados
2. Recarregue a aplicação (F5)
3. Verifique o console do navegador (F12 → Console)
4. Verifique os logs do Supabase
