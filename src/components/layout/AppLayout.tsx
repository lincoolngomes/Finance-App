
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Menu, X, Bell, Settings, User, LogOut, MessageSquare, Cog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import Categorias from '@/pages/Categorias'
import Contas from '@/pages/Contas'
import Cartoes from '@/pages/Cartoes'

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
  const [contasOpen, setContasOpen] = useState(false)
  const [cartoesOpen, setCartoesOpen] = useState(false)
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false)

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

  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="w-full">
          <header className="h-16 flex items-center justify-between px-3 sm:px-6 bg-card border-b shadow-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 sm:gap-4">
              <MenuTrigger />
              <h1 className="text-sm sm:text-lg font-semibold title-color">
                {getGreeting()}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Botão Notificações */}
              <div className="relative group">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-accent">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-popover border border-border rounded-lg shadow-lg z-50 w-80 p-4">
                  <h3 className="font-semibold text-foreground mb-3">Notificações</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                </div>
              </div>

              {/* Botão Configurações */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-accent"
                  onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
                {settingsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 w-56">
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent first:rounded-t-lg"
                      onClick={() => {
                        setCategoriasOpen(true)
                        setSettingsDropdownOpen(false)
                      }}
                    >
                      <Cog className="h-4 w-4" />
                      Cadastro de Categorias
                    </button>
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent"
                      onClick={() => {
                        setContasOpen(true)
                        setSettingsDropdownOpen(false)
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Cadastro de Contas
                    </button>
                    <button 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent last:rounded-b-lg"
                      onClick={() => {
                        setCartoesOpen(true)
                        setSettingsDropdownOpen(false)
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Cadastro de Cartões
                    </button>
                  </div>
                )}
              </div>

              {/* Botão Usuário */}
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-accent bg-blue-600 text-white hover:bg-blue-700"
                >
                  <User className="h-5 w-5" />
                </Button>
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-popover border border-border rounded-lg shadow-lg z-50 w-56">
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent first:rounded-t-lg"
                    onClick={() => navigate('/perfil')}
                  >
                    <Cog className="h-4 w-4" />
                    Perfil
                  </button>
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent"
                    onClick={() => window.open('mailto:contact@finance-app.com')}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Feedback
                  </button>
                  <button 
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-accent last:rounded-b-lg"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>

              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-x-hidden">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Modal Categorias */}
      <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Categorias />
        </DialogContent>
      </Dialog>

      {/* Modal Contas */}
      <Dialog open={contasOpen} onOpenChange={setContasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Contas />
        </DialogContent>
      </Dialog>

      {/* Modal Cartões */}
      <Dialog open={cartoesOpen} onOpenChange={setCartoesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <Cartoes />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
