import { supabase } from './src/lib/supabase'

async function corrigirTodosTipoMarcacao() {
  console.log('🔧 CORREÇÃO COMPLETA: Ajustando tipo_marcacao de TODOS os investimentos\n')
  
  try {
    // 1. FORÇAR renda_fixa para CURVA (CDB, LCI, LCA, LC genéricos)
    console.log('📊 Passo 1: Forçando renda_fixa genérica para CURVA...')
    const { data: rfData, error: rfError } = await supabase
      .from('investimentos')
      .update({ tipo_marcacao: 'curva' })
      .eq('tipo', 'renda_fixa')
      .eq('ativo', true)
      .select('codigo, nome')
    
    if (rfError) {
      console.error('❌ Erro:', rfError)
    } else {
      console.log(`✅ ${rfData?.length || 0} investimentos renda_fixa atualizados para CURVA`)
      rfData?.forEach(inv => console.log(`   - ${inv.codigo}: ${inv.nome}`))
    }
    
    // 2. DEFINIR tesouro_direto para MERCADO  
    console.log('\n🏛️ Passo 2: Definindo tesouro_direto para MERCADO...')
    const { data: tdData, error: tdError } = await supabase
      .from('investimentos')
      .update({ tipo_marcacao: 'mercado' })
      .eq('tipo', 'tesouro_direto')
      .eq('ativo', true)
      .select('codigo, nome')
    
    if (tdError) {
      console.error('❌ Erro:', tdError)
    } else {
      console.log(`✅ ${tdData?.length || 0} investimentos tesouro_direto atualizados para MERCADO`)
      tdData?.forEach(inv => console.log(`   - ${inv.codigo}: ${inv.nome}`))
    }
    
    // 3. DEFINIR CRI/CRA/Debêntures para MERCADO (se existirem)
    console.log('\n💼 Passo 3: Definindo CRI/CRA/Debêntures para MERCADO...')
    const { data: privData, error: privError } = await supabase
      .from('investimentos')
      .update({ tipo_marcacao: 'mercado' })
      .in('tipo', ['cri', 'cra', 'debenture'])
      .eq('ativo', true)
      .select('codigo, nome, tipo')
    
    if (privError) {
      console.error('❌ Erro:', privError)
    } else {
      console.log(`✅ ${privData?.length || 0} investimentos CRI/CRA/Debêntures atualizados para MERCADO`)
      privData?.forEach(inv => console.log(`   - ${inv.codigo} (${inv.tipo}): ${inv.nome}`))
    }
    
    // 4. VERIFICAR resultado final
    console.log('\n📋 Resultado Final:')
    console.log('=' .repeat(80))
    
    const { data: todos, error: todosError } = await supabase
      .from('investimentos')
      .select('tipo, codigo, nome, tipo_marcacao')
      .eq('ativo', true)
      .order('tipo')
      .order('codigo')
    
    if (todosError) {
      console.error('❌ Erro ao buscar resultado:', todosError)
    } else {
      const agrupado = todos?.reduce((acc: any, inv: any) => {
        const key = `${inv.tipo}_${inv.tipo_marcacao || 'null'}`
        if (!acc[key]) acc[key] = []
        acc[key].push(`${inv.codigo}: ${inv.nome}`)
        return acc
      }, {})
      
      for (const [key, investimentos] of Object.entries(agrupado) as any) {
        const [tipo, marcacao] = key.split('_')
        const icone = marcacao === 'mercado' ? '💹' : '📊'
        const status = 
          (tipo === 'renda_fixa' && marcacao === 'curva') ? '✅ CORRETO' :
          (['tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipo) && marcacao === 'mercado') ? '✅ CORRETO' :
          '❌ ERRADO'
        
        console.log(`\n${icone} ${tipo.toUpperCase()} | ${marcacao.toUpperCase()} ${status}`)
        investimentos.forEach((inv: string) => console.log(`   - ${inv}`))
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Correção concluída!')
    console.log('🔄 Recarregue a página no navegador (Cmd+Shift+R) para ver as mudanças')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
  
  process.exit(0)
}

corrigirTodosTipoMarcacao()
