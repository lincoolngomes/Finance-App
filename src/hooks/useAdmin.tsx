import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface AdminData {
  isAdmin: boolean
  loading: boolean
  userRole: 'admin' | 'user' | 'premium' | null
}

export function useAdmin(): AdminData {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'premium' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false)
        setUserRole(null)
        setLoading(false)
        return
      }

      try {
        console.log('useAdmin: Checking role for user:', user.id)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        console.log('useAdmin: Profile data:', profile, 'Error:', error)

        if (error) {
          console.error('Erro ao verificar role do usuário:', error)
          setIsAdmin(false)
          setUserRole(null)
        } else {
          const role = profile?.role || 'user'
          console.log('useAdmin: Role found:', role)
          setUserRole(role)
          setIsAdmin(role === 'admin')
          console.log('useAdmin: Is admin?', role === 'admin')
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error)
        setIsAdmin(false)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  return { isAdmin, loading, userRole }
}