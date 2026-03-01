import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://finance-app-supabase-app.c7db8l.easypanel.host'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbmFuY2UtYXBwLXN1cGFiYXNlLWFwcCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzA5MjQwMDAwLCJleHAiOjIwMjQ4MTYwMDB9.placeholder'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('transacoes')
    .select('id, descricao, data, fatura_mes, fatura_ano, cartao_id')
    .not('cartao_id', 'is', null)
    .order('data', { ascending: false })
    .limit(20)
  
  console.log('Últimas 20 transações de cartão:')
  console.log(JSON.stringify(data, null, 2))
  if (error) console.error('Erro:', error)
}

check()
