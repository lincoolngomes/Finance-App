import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function atualizarCDB() {
  try {
    console.log('🔄 Atualizando CDB-DI com valores para teste de CDI acumulado...')

    const { data, error } = await supabase
      .from('investimentos')
      .update({
        quantidade: 1,
        preco_medio: 25000.00,
        valor_total: 25000.00,
        data_aplicacao: '2025-01-02',
        data_vencimento: '2028-02-24',
        tipo_rentabilidade: 'pos',
        taxa_percentual: 101,
        indexador: 'cdi',
        isento_ir: false,
        liquidez: 'diaria',
        ativo: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'fb4a3d94-ce1c-46fa-9a80-efc4e39b838d')

    if (error) {
      console.error('❌ Erro ao atualizar:', error)
      process.exit(1)
    }

    console.log('✅ CDB-DI atualizado com sucesso!')
    console.log('📊 Dados atualizados:', data)
    
    console.log('\n📋 Próximos passos:')
    console.log('1. Recarregue a página no navegador (F5)')
    console.log('2. Abra o console (F12) para ver os logs do cálculo de CDI acumulado')
    console.log('3. Verifique se o valor_atual está sendo calculado corretamente')
    console.log('4. Valide se a rentabilidade está sendo exibida')

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

atualizarCDB()
