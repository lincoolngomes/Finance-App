
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Menu, X, Bell, User, LogOut, Tag, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import Categorias from '@/pages/Categorias'

interface AppLayoutProps {
  children: React.ReactNode
  userName?: string
}

function MenuTrigger() {
  const { toggleSidebar, state } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-9 w-9 rounded-md hover:bg-accent"
    >
      {state === 'open' ? (
        <X className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Menu className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  )
}

export function AppLayout({ children, userName }: AppLayoutProps) {
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    const fetchAvatar = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
        
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url)
        }
      }
    }
    fetchAvatar()
  }, [user])

  const getGreeting = () => {
    const hour = new Date().getHours()
    let greeting = ''
    let emoji = ''
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Bom dia'
      emoji = '🌅'
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde'
      emoji = '☀️'
    } else {
      greeting = 'Boa noite'
      emoji = '🌙'
    }
    
    console.log('userName recebido:', userName) // Debug
    
    if (userName) {
      return `${emoji} ${greeting}, ${userName}!`
    }
    return `${emoji} ${greeting}!`
  }

  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  const handleOpenNovaTransacao = () => {
    navigate('/transacoes?nova=1')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="w-full">
          <header className="h-16 flex items-center justify-between px-3 sm:px-6 bg-card border-b shadow-sm sticky top-0 z-40">
            <div className="min-w-0 flex items-center gap-2 sm:gap-4">
              <MenuTrigger />
              <h1 className="max-w-[52vw] truncate text-sm font-semibold title-color sm:max-w-none sm:text-lg">
                {getGreeting()}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              {/* Botão Notificações */}
              <div className="relative group">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </Button>
                  <div className="absolute right-0 top-full mt-2 hidden w-72 sm:w-80 group-hover:block bg-popover border border-border rounded-lg shadow-lg z-50 p-4">
                  <h3 className="font-semibold text-foreground mb-3">Notificações</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                </div>
              </div>

              {/* Botão Usuário */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-accent p-0 overflow-hidden"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  onBlur={(e) => {
                    // Só fecha se o clique foi fora do dropdown
                    if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                      setTimeout(() => setUserDropdownOpen(false), 200)
                    }
                  }}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 w-56">
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent first:rounded-t-lg"
                      onClick={() => {
                        navigate('/perfil')
                        setUserDropdownOpen(false)
                      }}
                    >
                      <User className="h-4 w-4" />
                      Perfil
                    </button>
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent"
                      onClick={() => {
                        setCategoriasOpen(true)
                        setUserDropdownOpen(false)
                      }}
                    >
                      <Tag className="h-4 w-4" />
                      Categorias
                    </button>
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-accent last:rounded-b-lg"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 overflow-x-hidden bg-background p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-6">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>

      <Button
        type="button"
        onClick={handleOpenNovaTransacao}
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg sm:bottom-5 sm:right-5 sm:h-11 sm:w-auto sm:px-4"
        aria-label="Adicionar transação"
      >
        <Plus className="h-5 w-5 sm:mr-2" />
        <span className="hidden sm:inline">Nova Transação</span>
      </Button>

      {/* Modal Categorias */}
      <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Categorias />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
