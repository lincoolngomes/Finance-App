import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfphdjumclhsocebjxge.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcGhkanVtY2xoc29jZWJqeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc0MjI0MTcsImV4cCI6MjAxMzAwMjQxN30.bXX7O1HBt5dq6JXuJ1VWKhADZKrLQ6KQ8gUNUAyxHqA'
)

async function testQueries() {
  console.log('=== TESTANDO QUERIES ===\n')

  // Buscar transações sem filtro de user (para ver se há dados)
  const { data: transacoes, error: transError } = await supabase
    .from('transacoes')
    .select('*')
    .limit(10)

  console.log('Total de transações (sem filtro):')
  console.log('Count:', transacoes?.length || 0)
  console.log('Error:', transError)
  console.log('Dados:')
  console.table(transacoes?.slice(0, 3))
  console.log('')

  // Buscar com categorias (nova sintaxe)
  const { data: transWithCat, error: catError } = await supabase
    .from('transacoes')
    .select(`
      *,
      categorias(id, nome)
    `)
    .limit(5)

  console.log('Transações com categorias:')
  console.log('Error:', catError)
  console.table(transWithCat?.slice(0, 2))
}

testQueries()
