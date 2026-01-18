// Script para testar a busca de fundos na CVM
// Execute com: npx ts-node diagnostico-cvm.ts

import { buscarFundoCVM, validarCNPJ } from './src/utils/cvm'

async function testarBuscaCVM() {
  console.log('🔍 Testando busca de fundos na CVM...\n')

  // Testando alguns CNPJs conhecidos
  const testeCNPJs = [
    {
      cnpj: '03.378.147/0001-88',
      descricao: 'Bradesco FI Ações',
    },
    {
      cnpj: '37.110.110/0001-16',
      descricao: 'Fundo de Previdência (do seu exemplo)',
    },
    {
      cnpj: '17.366.239/0001-05',
      descricao: 'Itaú Personnalité Ações',
    },
  ]

  for (const teste of testeCNPJs) {
    console.log(`\n📌 Testando: ${teste.descricao}`)
    console.log(`   CNPJ: ${teste.cnpj}`)

    // Validar CNPJ
    const cnjpValido = validarCNPJ(teste.cnpj)
    console.log(`   ✓ Validação CNPJ: ${cnjpValido ? '✅ Válido' : '❌ Inválido'}`)

    if (cnjpValido) {
      try {
        const resultado = await buscarFundoCVM(teste.cnpj)
        if (resultado) {
          console.log(`   ✓ Encontrado na CVM!`)
          console.log(`     - Nome: ${resultado.nome}`)
          console.log(`     - Cota: R$ ${resultado.cotaAtual.toFixed(4)}`)
          console.log(`     - Data: ${resultado.dataAtualizacao}`)
        } else {
          console.log(`   ❌ Não encontrado na CVM`)
          console.log(`      (Pode ser privado, previdência ou CNPJ incorreto)`)
        }
      } catch (erro) {
        console.log(`   ⚠️ Erro na busca: ${erro instanceof Error ? erro.message : String(erro)}`)
      }
    }
  }

  console.log('\n\n📝 Resumo:')
  console.log('- A CVM só tem fundos de investimento **regulados**')
  console.log('- Previdência privada (PGBL, VGBL) não está na CVM')
  console.log('- Se não encontrar, use preenchimento manual com a cota do seu extrato')
}

testarBuscaCVM().catch(console.error)
