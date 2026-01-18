# 💡 Guia: Adicionando Previdência e Fundos Privados

## ❓ O fundo não foi encontrado na CVM

Isso pode acontecer por alguns motivos:

### 1. **CNPJ Incorreto**
- Verifique o CNPJ no seu extrato bancário ou aplicativo
- O formato correto é: `XX.XXX.XXX/XXXX-XX`
- A base de dados da CVM é **pública** e pode não ter fundos privados ou previdência

### 2. **Fundo Privado ou Previdência Complementar**
A CVM não mantém registro de:
- ✅ Fundos de Investimento **regulados** (CNPJ começa com 17 ou 18)
- ❌ Produtos de **previdência privada** (PGBL, VGBL) - geralmente não têm CNPJ público
- ❌ **Fundos fechados** de algumas instituições financeiras
- ❌ Aplicações em bancos privados (CDB, Poupança)

### 3. **Como Adicionar Manualmente?**

Quando o sistema não encontrar o fundo, você pode:

1. **Deixe o CNPJ em branco** ou clique em "Buscar" mesmo com erro
2. O sistema permite **preenchimento manual**:
   - **Nome do Fundo**: Digite como aparece em seu extrato
   - **Cota no dia da aplicação**: Digite o valor que a cota valia naquele dia
   - **Valor Aplicado**: Quanto você investiu em reais
   - **Data da Aplicação**: Quando você fez a aplicação

3. O sistema **calcula automaticamente** a quantidade de cotas:
   ```
   Cotas = Valor Aplicado ÷ Cota no dia
   ```

### 4. **Onde Encontrar a Cota do Dia?**

#### Para **Fundos de Investimento Regulados**:
- Site da **CVM**: https://sistemas.cvm.gov.br/sim/
- Site da **B3**: https://www.b3.com.br/
- Extrato ou aplicativo do seu **banco/corretora**

#### Para **Previdência Complementar (PGBL/VGBL)**:
- Extrato do seu banco
- Aplicativo da instituição financeira
- Email periódico com informações da aplicação
- Busque por "valor da unidade" ou "cota" no extrato

#### Para **CDB e outros produtos**:
- Seu banco/corretora informará o valor unitário
- Geralmente não muda após a aplicação (taxa fixa)

### 5. **Exemplo Prático**

**Scenario**: Você tem um PGBL no Banco do Brasil

```
1. Tipo de Ativo → Previdência
2. Nome → PGBL Banco do Brasil
3. Instituição → Banco do Brasil
4. CNPJ → 12.345.678/0001-90 (ou deixe em branco)
5. Cota → 2,5647 (valor que aparece no seu extrato)
6. Valor Aplicado → R$ 5.000,00
7. Data → 15/01/2026

Resultado:
- Cotas calculadas: 5.000,00 ÷ 2,5647 = 1.948,68 cotas
```

### 6. **Sincronização com CVM**

- ✅ Se encontrar na CVM → Sincroniza automaticamente a cada 60 minutos
- ❌ Se for privado/PGBL → Sincronização não funciona
  - Você pode **atualizar manualmente** o valor na tela "Investimentos"

### 7. **Dúvidas Frequentes**

**P: Posso deixar o CNPJ em branco?**
R: Sim, o campo é opcional. O sistema permite preencher tudo manualmente.

**P: Preciso inserir o CNPJ?**
R: Não obrigatoriamente. Se o fundo é privado ou previdência, deixe em branco.

**P: A cota muda?**
R: Sim! Fundos de investimento têm cotas que variam. Use o valor do dia em que você aplicou.

**P: E para ações, FII, ETF?**
R: Para esses, o sistema busca cotações em tempo real na CVM/B3. Fundos são especiais porque podem ser privados.

---

## 📞 Precisa de Ajuda?

Se o CNPJ não é encontrado:
1. Procure verificar se está correto em seu extrato
2. Se for PGBL/VGBL/CDB, deixe em branco e preencha manualmente
3. Use o valor da cota que aparece no seu extrato ou aplicativo
