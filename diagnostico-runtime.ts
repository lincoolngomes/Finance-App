import { supabase } from './src/lib/supabase'

async function diagnosticar() {
  console.log('🔍 Iniciando diagnóstico de Supabase...\n')

  // Teste 1: Verificar cliente Supabase
  console.log('✅ Cliente Supabase criado')
  console.log('   URL:', supabase.supabaseUrl)
  console.log('')

  try {
    // Teste 2: Consultar profiles
    console.log('⏳ Testando acesso à tabela profiles...')
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Erro ao acessar profiles:', error.message)
      console.error('   Details:', error)
    } else {
      console.log('✅ Acesso a profiles OK')
    }
    console.log('')

    // Teste 3: Verificar autenticação
    console.log('⏳ Verificando sessão de autenticação...')
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ Erro ao obter sessão:', authError.message)
    } else if (session) {
      console.log('✅ Sessão ativa:', session.user.email)
    } else {
      console.log('⚠️  Nenhuma sessão ativa (normal se não logado)')
    }
    console.log('')

    // Teste 4: Tentar upload de teste
    console.log('⏳ Testando simulação de upload de imagem...')
    try {
      // Criar uma imagem de teste (1x1 pixel PNG)
      const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      const response = await fetch(pngDataUrl)
      const blob = await response.blob()
      console.log('   Tamanho do teste:', (blob.size / 1024).toFixed(2), 'KB')
      
      // Simular conversão para base64
      const reader = new FileReader()
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string
          console.log('   Base64 gerado:', base64.substring(0, 50) + '...')
          resolve(null)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      
      console.log('✅ Simulação de upload OK')
    } catch (err) {
      console.error('❌ Erro na simulação:', err)
    }

    console.log('\n✅ Diagnóstico concluído com sucesso!')

  } catch (err) {
    console.error('\n❌ Erro geral:', err)
  }
}

diagnosticar()
