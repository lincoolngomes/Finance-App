import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface DashboardPreferences {
  showCardTransactions: boolean
  useCardInvoicePayments: boolean
  showPendingInMonthlyChart: boolean
  showInvestmentsSeparately: boolean
  hideValues: boolean
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  showCardTransactions: true,
  useCardInvoicePayments: false,
  showPendingInMonthlyChart: false,
  showInvestmentsSeparately: true,
  hideValues: false,
}

const LOCAL_STORAGE_KEY = 'dashboard:preferences:v2'

export function useDashboardPreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  // Carregar preferências do Supabase ou localStorage
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true)
      
      // Primeiro tenta carregar do localStorage (cache local)
      try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (localData) {
          const parsed = JSON.parse(localData)
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
        }
      } catch (e) {
        console.error('Erro ao carregar preferências do localStorage:', e)
      }

      // Se usuário logado, busca do Supabase
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('dashboard_preferences')
            .eq('id', user.id)
            .single()

          if (!error && data?.dashboard_preferences) {
            const serverPrefs = data.dashboard_preferences as DashboardPreferences
            const merged = { ...DEFAULT_PREFERENCES, ...serverPrefs }
            setPreferences(merged)
            // Atualiza cache local
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))
          }
        } catch (e) {
          console.error('Erro ao carregar preferências do Supabase:', e)
        }
      }
      
      setLoading(false)
    }

    loadPreferences()
  }, [user?.id])

  // Salvar preferências no Supabase e localStorage
  const savePreferences = useCallback(async (newPreferences: Partial<DashboardPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    
    // Salva no localStorage imediatamente (cache local)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))

    // Se usuário logado, salva no Supabase
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ dashboard_preferences: updated })
          .eq('id', user.id)
      } catch (e) {
        console.error('Erro ao salvar preferências no Supabase:', e)
      }
    }
  }, [preferences, user?.id])

  // Funções individuais para cada preferência
  const setShowCardTransactions = useCallback((value: boolean) => {
    savePreferences({ showCardTransactions: value })
  }, [savePreferences])

  const setUseCardInvoicePayments = useCallback((value: boolean) => {
    savePreferences({ useCardInvoicePayments: value })
  }, [savePreferences])

  const setShowPendingInMonthlyChart = useCallback((value: boolean) => {
    savePreferences({ showPendingInMonthlyChart: value })
  }, [savePreferences])

  const setShowInvestmentsSeparately = useCallback((value: boolean) => {
    savePreferences({ showInvestmentsSeparately: value })
  }, [savePreferences])

  const setHideValues = useCallback((value: boolean) => {
    savePreferences({ hideValues: value })
  }, [savePreferences])

  return {
    preferences,
    loading,
    setShowCardTransactions,
    setUseCardInvoicePayments,
    setShowPendingInMonthlyChart,
    setShowInvestmentsSeparately,
    setHideValues,
    savePreferences,
  }
}
