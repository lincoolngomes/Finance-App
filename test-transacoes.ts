import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfphdjumclhsocebjxge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcGhkanVtY2xoc29jZWJqeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc0MjI0MTcsImV4cCI6MjAxMzAwMjQxN30.bXX7O1HBt5dq6JXuJ1VWKhADZKrLQ6KQ8gUNUAyxHqA'
)

async function testQueries() {
  console.log('=== TESTANDO QUERIES ===\n')

  // 1. Buscar user_id da tabela auth.users
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  console.log('User atual:', user?.id)
  console.log('Auth error:', authError)
  console.log('')

  // 2. Contar transações
  const { count: transCount, error: countError } = await supabase
    .from('transacoes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id || '')

  console.log('Total de transações:', transCount)
  console.log('Count error:', countError)
  console.log('')

  // 3. Buscar primeiras 5 transações
  const { data: transacoes, error: transError } = await supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', user?.id || '')
    .limit(5)

  console.log('Primeiras 5 transações:')
  console.table(transacoes)
  console.log('Error:', transError)
  console.log('')

  // 4. Testar foreign key com categorias
  const { data: transWithCat, error: catError } = await supabase
    .from('transacoes')
    .select(`
      *,
      categorias(id, nome)
    `)
    .eq('user_id', user?.id || '')
    .limit(5)

  console.log('Transações com categorias (nova sintaxe):')
  console.table(transWithCat)
  console.log('Error:', catError)
}

testQueries()
