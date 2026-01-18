// Script auxiliar para extrair cota de fundo do site da CVM
// Use este script no console do navegador quando estiver na página de fundos da CVM

/**
 * Extrai a cota do fundo da página da CVM
 * Execute no console do navegador quando a tabela do fundo estiver visível
 */
function extrairCotaFundo(cnpj = null) {
  // Se não passou CNPJ, tenta pegar da URL ou do formulário
  if (!cnpj) {
    const urlParams = new URLSearchParams(window.location.search)
    cnpj = urlParams.get('cnpj') || prompt('Digite o CNPJ do fundo:')
  }

  if (!cnpj) return

  const cnpjNormalizado = cnpj.replace(/\D/g, '')
  console.log(`🔍 Procurando CNPJ: ${cnpjNormalizado}`)

  // Procura em todas as células da tabela
  const celulas = document.querySelectorAll('td, th')
  let encontrou = false

  for (let i = 0; i < celulas.length; i++) {
    const texto = celulas[i].textContent.replace(/\D/g, '')
    
    if (texto.includes(cnpjNormalizado)) {
      console.log('✅ CNPJ encontrado!')
      
      // Procura a próxima célula com número que parece ser cota
      // Tipicamente: 2.081.671,58 (formato brasileiro)
      const regex = /(\d{1,3}(?:\.\d{3})*,\d{2})/
      
      // Procura nas próximas células
      for (let j = i + 1; j < Math.min(i + 20, celulas.length); j++) {
        const proximoTexto = celulas[j].textContent.trim()
        const match = proximoTexto.match(regex)
        
        if (match) {
          const cota = match[1]
          console.log(`📊 Cota encontrada: ${cota}`)
          console.log(`💾 Copiar este valor: ${cota}`)
          
          // Copia para clipboard
          navigator.clipboard.writeText(cota).then(() => {
            console.log('✓ Cota copiada para clipboard!')
            alert(`Cota: ${cota}\n\n(Copiada para clipboard)`)
          })
          
          encontrou = true
          break
        }
      }
      
      if (!encontrou) {
        console.log('⚠️ CNPJ encontrado mas cota não localizada')
      }
      break
    }
  }

  if (!encontrou) {
    console.log('❌ CNPJ não encontrado na página')
    console.log('💡 Certifique-se de que a tabela está carregada corretamente')
  }
}

// Exporta a função globalmente
window.extrairCotaFundo = extrairCotaFundo

console.log('✅ Script de extração de cota carregado!')
console.log('📝 Use: extrairCotaFundo("37.110.110/0001-16")')
console.log('   ou: extrairCotaFundo() para ser solicitado o CNPJ')
