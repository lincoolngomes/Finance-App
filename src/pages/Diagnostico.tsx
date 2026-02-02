import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function Diagnostico() {
  const { user } = useAuth()
  const [status, setStatus] = useState<any>({})

  useEffect(() => {
    if (!user) return

    const diagnose = async () => {
      try {
        // 1. Contar transações
        const { count: transCount, error: transCountError } = await supabase
          .from('transacoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // 2. Buscar primeiras transações
        const { data: transacoes, error: transError } = await supabase
          .from('transacoes')
          .select('*')
          .eq('user_id', user.id)
          .limit(5)

        // 3. Buscar com categorias
        const { data: transWithCat, error: catError } = await supabase
          .from('transacoes')
          .select('*, categorias(id, nome)')
          .eq('user_id', user.id)
          .limit(5)

        // 4. Contar categorias
        const { count: catCount, error: catCountError } = await supabase
          .from('categorias')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // 5. Contar accounts
        const { count: accountCount, error: accountCountError } = await supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        setStatus({
          userId: user.id,
          transCount: transCount,
          transError: transError?.message,
          firstTransacoes: transacoes?.slice(0, 2),
          transWithCat: transWithCat?.slice(0, 2),
          catError: catError?.message,
          catCount,
          accountCount,
        })
      } catch (error: any) {
        setStatus({ error: error.message })
      }
    }

    diagnose()
  }, [user])

  if (!user) return <div className="p-4">Faça login primeiro</div>

  return (
    <div className="p-4 bg-slate-100 rounded font-mono text-sm overflow-auto">
      <h1 className="font-bold mb-4">🔍 Diagnóstico de Transações</h1>
      <pre className="bg-white p-3 rounded overflow-auto max-h-96">
        {JSON.stringify(status, null, 2)}
      </pre>
    </div>
  )
}
