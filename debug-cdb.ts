import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCDB() {
  try {
    console.log('🔍 Buscando CDB-DI no banco...')

    const { data, error } = await supabase
      .from('investimentos')
      .select('*')
      .eq('codigo', 'CDB-DI')
      .limit(1)

    if (error) {
      console.error('❌ Erro ao buscar:', error)
      process.exit(1)
    }

    if (data && data.length > 0) {
      const inv = data[0]
      console.log('✅ CDB-DI encontrado!')
      console.log('\n📊 DADOS ATUAIS:')
      console.log(`  ID: ${inv.id}`)
      console.log(`  Código: ${inv.codigo}`)
      console.log(`  Nome: ${inv.nome}`)
      console.log(`  Tipo: ${inv.tipo}`)
      console.log(`  quantidade: ${inv.quantidade}`)
      console.log(`  preco_medio: ${inv.preco_medio}`)
      console.log(`  valor_total: ${inv.valor_total}`)
      console.log(`  data_aplicacao: ${inv.data_aplicacao}`)
      console.log(`  data_vencimento: ${inv.data_vencimento}`)
      console.log(`  taxa_percentual: ${inv.taxa_percentual}`)
      console.log(`  tipo_rentabilidade: ${inv.tipo_rentabilidade}`)
      console.log(`  indexador: ${inv.indexador}`)
      console.log(`  isento_ir: ${inv.isento_ir}`)
      console.log(`  liquidez: ${inv.liquidez}`)
      console.log(`  tipo_marcacao: ${inv.tipo_marcacao}`)

      // Verificar se os dados são suficientes para cálculo
      console.log('\n✅ VERIFICAÇÃO PARA CÁLCULO DE RENDA FIXA:')
      const dataBase = inv.data_aplicacao || inv.data_primeira_compra
      console.log(`  data_aplicacao: ${dataBase ? '✅' : '❌'} ${dataBase}`)
      console.log(`  data_vencimento: ${inv.data_vencimento ? '✅' : '❌'} ${inv.data_vencimento}`)
      console.log(`  taxa_percentual: ${inv.taxa_percentual ? '✅' : '❌'} ${inv.taxa_percentual}`)
      console.log(`  tipo_rentabilidade: ${inv.tipo_rentabilidade ? '✅' : '❌'} ${inv.tipo_rentabilidade}`)
      console.log(`  indexador: ${inv.indexador ? '✅' : '❌'} ${inv.indexador}`)

      if (dataBase && inv.data_vencimento && inv.taxa_percentual) {
        console.log('\n✅ DADOS SUFICIENTES PARA CALCULAR RENDA FIXA!')
      } else {
        console.log('\n❌ FALTAM DADOS PARA CALCULAR:')
        if (!dataBase) console.log('   - data_aplicacao (ou data_primeira_compra)')
        if (!inv.data_vencimento) console.log('   - data_vencimento')
        if (!inv.taxa_percentual) console.log('   - taxa_percentual')
      }
    } else {
      console.log('❌ CDB-DI não encontrado')
    }
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

debugCDB()
