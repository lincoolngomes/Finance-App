
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_EXTERNAL_URL = 'https://finance-app-supabase-app.rcnehy.easypanel.host'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

const SUPABASE_EXTERNAL_URL =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_EXTERNAL_URL
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

const getSupabaseProjectRef = (value: string) => {
  try {
    const hostname = new URL(value).hostname
    return hostname.split('.')[0] || 'financeapp'
  } catch {
    return 'financeapp'
  }
}

const isSupabaseCloudUrl = (value: string) => {
  try {
    return new URL(value).hostname.endsWith('.supabase.co')
  } catch {
    return value.includes('.supabase.co')
  }
}

const getSupabaseRuntimeConfig = () => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const hostname = window.location.hostname
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'

    if (isLocalHost) {
      const useProxyFlag = import.meta.env.VITE_USE_SUPABASE_PROXY
      const forceProxyForSelfHosted = !isSupabaseCloudUrl(SUPABASE_EXTERNAL_URL)
      const useProxy =
        forceProxyForSelfHosted || useProxyFlag === 'true' || useProxyFlag !== 'false'

      if (useProxy) {
        return {
          mode: 'proxy' as const,
          url: `${window.location.origin}/supabase`,
        }
      }
    }
  }

  return {
    mode: 'direct' as const,
    url: SUPABASE_EXTERNAL_URL,
  }
}

const runtimeConfig = getSupabaseRuntimeConfig()
const supabaseUrl = runtimeConfig.url

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_RUNTIME_MODE = runtimeConfig.mode
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${getSupabaseProjectRef(SUPABASE_EXTERNAL_URL)}-auth-token`

const isLocalHostRuntime =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const canUseProxyFallback =
  import.meta.env.DEV && isLocalHostRuntime && SUPABASE_RUNTIME_MODE === 'direct'

const isNetworkFetchError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '')
  return /failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|fetch/i.test(
    message,
  )
}

const resolveRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  if ('url' in input) {
    return input.url
  }

  return ''
}

const getProxyFallbackUrl = (input: RequestInfo | URL) => {
  if (!canUseProxyFallback || typeof window === 'undefined') {
    return null
  }

  const requestUrl = resolveRequestUrl(input)
  if (!requestUrl) {
    return null
  }

  try {
    const parsedRequestUrl = new URL(requestUrl, window.location.origin)
    const externalBaseUrl = new URL(SUPABASE_EXTERNAL_URL)

    // Faz fallback apenas para chamadas do Supabase externo configurado.
    if (parsedRequestUrl.origin !== externalBaseUrl.origin) {
      return null
    }

    return `${window.location.origin}/supabase${parsedRequestUrl.pathname}${parsedRequestUrl.search}`
  } catch {
    return null
  }
}

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    const proxyFallbackUrl = getProxyFallbackUrl(input)
    if (!proxyFallbackUrl || !isNetworkFetchError(error)) {
      throw error
    }

    // Em desenvolvimento local, tenta novamente via proxy do Vite.
    return fetch(proxyFallbackUrl, init)
  }
}

export const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
  global: {
    fetch: supabaseFetch,
    headers: {
      'x-application-name': 'finance-app',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          nome: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          id: string
          username?: string | null
          nome?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          nome?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          phone?: string | null
          whatsapp?: string | null
        }
      }
      transacoes: {
        Row: {
          id: number
          created_at: string
          quando: string | null
          estabelecimento: string | null
          valor: number | null
          detalhes: string | null
          tipo: string | null
          categoria: string | null
          userid: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          quando?: string | null
          estabelecimento?: string | null
          valor?: number | null
          detalhes?: string | null
          tipo?: string | null
          categoria?: string | null
          userid?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          quando?: string | null
          estabelecimento?: string | null
          valor?: number | null
          detalhes?: string | null
          tipo?: string | null
          categoria?: string | null
          userid?: string | null
        }
      }
      lembretes: {
        Row: {
          id: number
          created_at: string
          userid: string | null
          descricao: string | null
          data: string | null
          valor: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          userid?: string | null
          descricao?: string | null
          data?: string | null
          valor?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          userid?: string | null
          descricao?: string | null
          data?: string | null
          valor?: number | null
        }
      }
      categorias: {
        Row: {
          id: string
          userid: string
          nome: string
          tags: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          userid: string
          nome: string
          tags?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          userid?: string
          nome?: string
          tags?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cartoes: {
        Row: {
          id: string
          user_id: string
          nome: string
          bandeira: string | null
          limite: number
          dia_fechamento: string | null
          dia_vencimento: string | null
          cor: string | null
          banco: string | null
          linked_account_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          bandeira?: string | null
          limite?: number
          dia_fechamento?: string | null
          dia_vencimento?: string | null
          cor?: string | null
          banco?: string | null
          linked_account_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          bandeira?: string | null
          limite?: number
          dia_fechamento?: string | null
          dia_vencimento?: string | null
          cor?: string | null
          banco?: string | null
          linked_account_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
