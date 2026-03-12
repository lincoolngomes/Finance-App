
import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { buildProfileFromUser, isGeneratedProfileName } from '../utils/profile-display'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const isLocalDevSupabase =
  import.meta.env.DEV &&
  /https?:\/\/(127\.0\.0\.1|localhost):55421/.test(import.meta.env.VITE_SUPABASE_URL || '')

const shouldAutoCreateLocalUser = (message: string) =>
  /invalid login credentials|email not confirmed|user not found|invalid email or password/i.test(message)

const normalizeAuthError = (err: unknown) => {
  if (err && typeof err === 'object' && 'message' in err) {
    return err
  }

  return {
    message: 'Falha de conexão com o Supabase. Verifique a URL e o proxy local.',
  }
}

const getLocalStorageSessionKey = () => {
  try {
    const host = new URL(import.meta.env.VITE_SUPABASE_URL || '').hostname
    return `sb-${host.split('.')[0]}-auth-token`
  } catch {
    return 'sb-127-auth-token'
  }
}

const readSessionFromStorage = (): Session | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getLocalStorageSessionKey())
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('access_token' in parsed)) {
      return null
    }

    return parsed as Session
  } catch (error) {
    console.error('Erro ao ler sessao do localStorage:', error)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const syncUserProfile = async (authUser: User | null) => {
    if (!authUser?.id) {
      return
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, email, phone, cpf, nascimento')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) {
        console.error('Erro ao sincronizar perfil do usuario:', profileError)
        return
      }

      const profilePatch = buildProfileFromUser(authUser, profile)
      const needsSync =
        !profile ||
        !profile.email ||
        !profile.nome ||
        isGeneratedProfileName(profile.nome, authUser.email) ||
        (!profile.phone && profilePatch.phone) ||
        (!profile.cpf && profilePatch.cpf) ||
        (!profile.nascimento && profilePatch.nascimento) ||
        profile.email !== profilePatch.email ||
        profile.nome !== profilePatch.nome

      if (!needsSync) {
        return
      }

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: profilePatch.email || authUser.email,
          nome: profilePatch.nome,
          phone: profilePatch.phone || null,
          cpf: profilePatch.cpf || null,
          nascimento: profilePatch.nascimento || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (upsertError) {
        console.error('Erro ao atualizar perfil sincronizado:', upsertError)
      }
    } catch (error) {
      console.error('Erro inesperado ao sincronizar perfil:', error)
    }
  }

  useEffect(() => {
    let isMounted = true
    const bootstrapTimeout = window.setTimeout(() => {
      console.warn('Bootstrap de sessao excedeu o tempo limite; liberando a interface.')
      finishBootstrap()
    }, 3000)

    const finishBootstrap = () => {
      if (isMounted) {
        setLoading(false)
      }
    }

    const bootstrapSession = async () => {
      try {
        const storageSession = readSessionFromStorage()
        if (storageSession?.user && isMounted) {
          setSession(storageSession)
          setUser(storageSession.user)
          finishBootstrap()
          void syncUserProfile(storageSession.user)
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        finishBootstrap()
        window.clearTimeout(bootstrapTimeout)

        // Perfil nao deve bloquear a entrada no app.
        void syncUserProfile(session?.user ?? null)
      } catch (error) {
        console.error('Erro ao carregar sessao inicial:', error)
        finishBootstrap()
        window.clearTimeout(bootstrapTimeout)
      }
    }

    // Get initial session
    void bootstrapSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) {
          return
        }

        setSession(session)
        setUser(session?.user ?? null)
        finishBootstrap()
        window.clearTimeout(bootstrapTimeout)
        void syncUserProfile(session?.user ?? null)
      }
    )

    return () => {
      isMounted = false
      window.clearTimeout(bootstrapTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      let res = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (res.error && isLocalDevSupabase && shouldAutoCreateLocalUser(res.error.message || '')) {
        const signup = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined,
          },
        })

        if (!signup.error) {
          if (signup.data.user?.id) {
            const profilePatch = buildProfileFromUser(
              {
                email,
                user_metadata: signup.data.user.user_metadata,
              },
              null
            )

            await supabase.from('profiles').upsert(
              {
                id: signup.data.user.id,
                email: profilePatch.email || email,
                nome: profilePatch.nome,
                phone: profilePatch.phone || null,
                cpf: profilePatch.cpf || null,
                nascimento: profilePatch.nascimento || null,
              },
              { onConflict: 'id' }
            )
          }

          if (!signup.data.session) {
            res = await supabase.auth.signInWithPassword({
              email,
              password,
            })
          } else {
            res = { data: signup.data, error: null }
          }
        }
      }

      // Log para depuração local — remova em produção
      // eslint-disable-next-line no-console
      console.debug('signIn response:', res)
      return { error: res.error }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('signIn exception:', err)
      return { error: normalizeAuthError(err) }
    }
  }


  const signUp = async (email: string, password: string) => {
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
      })
      return { error: res.error }
    } catch (err) {
      return { error: normalizeAuthError(err) }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
