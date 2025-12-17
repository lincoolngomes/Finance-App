import { supabase } from './src/lib/supabase'

async function verificarInvestimentos() {
  console.log('🔍 Verificando investimentos...\n')
  
  try {
    const { data, error } = await supabase
      .from('investimentos')
      .select('id, tipo, codigo, nome, tipo_marcacao, ativo')
      .order('tipo')
    
    if (error) {
      console.error('❌ Erro:', error)
      return
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum investimento ativo encontrado')
      return
    }
    
    console.log(`📋 Total de investimentos ativos: ${data.length}\n`)
    
    // Agrupar por tipo
    const porTipo = data.reduce((acc: any, inv: any) => {
      if (!acc[inv.tipo]) acc[inv.tipo] = []
      acc[inv.tipo].push(inv)
      return acc
    }, {})
    
    for (const [tipo, investimentos] of Object.entries(porTipo) as any) {
      console.log(`\n📊 ${tipo.toUpperCase()} (${investimentos.length} investimentos):`)
      investimentos.forEach((inv: any) => {
        console.log(`  - ${inv.codigo} | ${inv.nome.substring(0, 30)} | tipo_marcacao: ${inv.tipo_marcacao || 'NULL'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  }
  
  process.exit(0)
}

verificarInvestimentos()
