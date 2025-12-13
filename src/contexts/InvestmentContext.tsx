import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import type { Investimento } from '@/hooks/useInvestments'

interface InvestmentContextType {
  investimentos: Investimento[]
  loading: boolean
  refreshInvestimentos: () => Promise<void>
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined)

export function InvestmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  const fetchInvestimentos = useCallback(async () => {
    if (!user || hasLoadedRef.current) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvestimentos(data || [])
      hasLoadedRef.current = true
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar investimentos',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const refreshInvestimentos = useCallback(async () => {
    hasLoadedRef.current = false
    await fetchInvestimentos()
  }, [fetchInvestimentos])

  useEffect(() => {
    if (user) {
      fetchInvestimentos()
    } else {
      setInvestimentos([])
      hasLoadedRef.current = false
    }
  }, [user, fetchInvestimentos])

  return (
    <InvestmentContext.Provider value={{ investimentos, loading, refreshInvestimentos }}>
      {children}
    </InvestmentContext.Provider>
  )
}

export function useInvestmentContext() {
  const context = useContext(InvestmentContext)
  if (context === undefined) {
    throw new Error('useInvestmentContext must be used within InvestmentProvider')
  }
  return context
}
