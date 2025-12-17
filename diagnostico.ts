import { supabase } from './src/lib/supabase'

async function diagnosticarBanco() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO BANCO DE DADOS\n')
  
  try {
    // 1. Buscar TODOS os investimentos (sem filtro de ativo)
    console.log('📊 Buscando TODOS os investimentos...')
    const { data: todos, error } = await supabase
      .from('investimentos')
      .select('id, tipo, codigo, nome, tipo_marcacao, ativo, user_id')
      .order('tipo')
    
    if (error) {
      console.error('❌ Erro:', error)
      process.exit(1)
    }
    
    if (!todos || todos.length === 0) {
      console.log('⚠️ NENHUM investimento encontrado no banco!')
      console.log('Possíveis causas:')
      console.log('1. Tabela vazia')
      console.log('2. Problema de autenticação (RLS)')
      console.log('3. URL do Supabase incorreta')
      process.exit(1)
    }
    
    console.log(`✅ Total de investimentos no banco: ${todos.length}\n`)
    
    // 2. Agrupar por tipo e tipo_marcacao
    console.log('📋 Análise por tipo:\n')
    const porTipo = todos.reduce((acc: any, inv: any) => {
      const key = `${inv.tipo}_${inv.tipo_marcacao || 'NULL'}_${inv.ativo ? 'ativo' : 'inativo'}`
      if (!acc[key]) acc[key] = []
      acc[key].push(inv)
      return acc
    }, {})
    
    for (const [key, investimentos] of Object.entries(porTipo) as any) {
      const [tipo, marcacao, status] = key.split('_')
      const icone = marcacao === 'mercado' ? '💹' : marcacao === 'curva' ? '📊' : '❓'
      const correto = 
        (tipo === 'renda_fixa' && marcacao === 'curva') ? '✅ CORRETO' :
        (['tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipo) && marcacao === 'mercado') ? '✅ CORRETO' :
        (tipo === 'renda_fixa' && marcacao === 'mercado') ? '❌ ERRADO - Deveria ser CURVA' :
        (['tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipo) && marcacao === 'curva') ? '⚠️ Pode ser MERCADO' :
        marcacao === 'NULL' ? '⚠️ SEM DEFINIÇÃO' : ''
      
      console.log(`${icone} ${tipo.toUpperCase()} | ${marcacao.toUpperCase()} | ${status.toUpperCase()} (${investimentos.length}) ${correto}`)
      investimentos.forEach((inv: any) => {
        console.log(`   - ${inv.codigo}: ${inv.nome.substring(0, 40)} [${inv.ativo ? 'ATIVO' : 'INATIVO'}]`)
      })
      console.log('')
    }
    
    // 3. Contar user_id único
    const userIds = [...new Set(todos.map(i => i.user_id))]
    console.log(`👤 User IDs encontrados: ${userIds.length}`)
    userIds.forEach(id => console.log(`   - ${id}`))
    
  } catch (error) {
    console.error('❌ Erro:', error)
  }
  
  process.exit(0)
}

diagnosticarBanco()
