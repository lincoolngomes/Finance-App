// Teste de integração para verificar se buscarFundoCVM funciona
// Cole no console do navegador: 
// $ const { buscarFundoCVM } = await import('/src/utils/cvm.ts')
// $ await buscarFundoCVM('37.110.110/0001-16', '15/01/2026')

console.log("Test CVM integration ready!")
console.log("In the browser console, run:")
console.log(`
import { buscarFundoCVM } from '/src/utils/cvm.ts'
await buscarFundoCVM('37.110.110/0001-16', '15/01/2026')
`)
