import { supabase } from './src/lib/supabase'

async function corrigirTipoMarcacao() {
  console.log('🔧 Corrigindo tipo_marcacao dos investimentos...')
  
  try {
    // 1. Forçar renda_fixa genérica para sempre usar 'curva'
    const { data: rfGenerico, error: error1 } = await supabase
      .from('investimentos')
      .update({ tipo_marcacao: 'curva' })
      .eq('tipo', 'renda_fixa')
      .select('id, codigo, nome')
    
    if (error1) {
      console.error('❌ Erro ao atualizar renda_fixa:', error1)
    } else {
      console.log('✅ Renda Fixa genérica forçada para curva:', rfGenerico?.length || 0)
    }
    
    // 2. Verificar estado atual
    const { data: resumo, error: error2 } = await supabase
      .from('investimentos')
      .select('tipo, tipo_marcacao')
      .in('tipo', ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'])
    
    if (error2) {
      console.error('❌ Erro ao buscar resumo:', error2)
    } else {
      console.log('\n📊 Resumo por tipo:')
      const agrupado = resumo?.reduce((acc: any, inv: any) => {
        const key = `${inv.tipo}_${inv.tipo_marcacao || 'null'}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      console.table(agrupado)
    }
    
    console.log('\n✅ Correção concluída!')
    console.log('🔄 Recarregue a página no navegador para ver as mudanças')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  }
  
  process.exit(0)
}

corrigirTipoMarcacao()
