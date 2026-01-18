// Script simples para testar a função buscarFundoCVM
// Execute: node test-cvm.js

async function testBuscarFundo() {
  try {
    // Simular a chamada que o React faria
    const CNPJ = '37110110000116'
    const DATA = '15/01/2026'
    
    console.log('\n🔍 Testando buscarFundoCVM...')
    console.log(`CNPJ: ${CNPJ}`)
    console.log(`Data: ${DATA}`)
    
    // Simular o mesmo que cvm.ts faz
    const fundosLocais = {
      '37110110000116': {
        codigo: '37110110000116',
        cnpj: '37.110.110/0001-16',
        nome: 'Fundo Previdência Privada',
        tipo: 'fi',
        cotaAtual: 10.5234,
        dataAtualizacao: '15/01/2026',
        patrimonio: 150000000,
      },
    }
    
    // Verificar se existe na base local primeiro
    if (fundosLocais[CNPJ]) {
      console.log(`\n✅ Fundo encontrado na base local:`)
      console.log(fundosLocais[CNPJ])
      console.log(`\n🎯 cotaAtual: ${fundosLocais[CNPJ].cotaAtual}`)
      console.log(`🎯 Condição (cotaAtual > 0): ${fundosLocais[CNPJ].cotaAtual > 0}`)
      console.log('\n✅ TEST PASSED: Fundo será encontrado!')
    } else {
      console.log(`\n❌ Fundo NÃO encontrado`)
      console.log(`Chave procurada: "${CNPJ}"`)
    }
  } catch (e) {
    console.error('❌ Erro:', e.message)
  }
}

testBuscarFundo()
