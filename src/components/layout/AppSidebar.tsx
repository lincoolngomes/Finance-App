import { NavLink, useLocation } from 'react-router-dom'
import { Home, CreditCard, Calendar, User, LogOut, Tag, FileText, Shield, TestTube } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { UserProfile } from './UserProfile'
import { useTheme } from '@/hooks/useTheme'



export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const { signOut } = useAuth()
  const { theme } = useTheme()
  const { isAdmin } = useAdmin()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path

  // Items do menu normal
  const normalItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Transações', url: '/transacoes', icon: CreditCard },
    { title: 'Categorias', url: '/categorias', icon: Tag },
    { title: 'Relatórios', url: '/relatorios', icon: FileText },
    { title: 'Lembretes', url: '/lembretes', icon: Calendar },
    { title: 'Perfil', url: '/perfil', icon: User },
  ]

  // Items apenas para admin
  const adminItems = [
    { title: 'Administração', url: '/admin', icon: Shield },
  ]

  // Items de desenvolvimento/teste
  const devItems = [
    { title: 'Teste Assinatura', url: '/teste', icon: TestTube },
  ]
  const isCollapsed = state === "collapsed"

  // Determine which logo to use based on theme
  const getLogoSrc = () => {
    if (theme === 'dark') {
      return '/lovable-uploads/finance-logo-white.png' // logo branco para tema escuro
    }
    return '/lovable-uploads/finance-logo-dark.png' // logo escuro para tema claro
  }

  const getIconSrc = () => {
    if (theme === 'dark') {
      return '/lovable-uploads/finance-logo-white.png' // ícone branco para tema escuro
    }
    return '/lovable-uploads/finance-logo-dark.png' // ícone escuro para tema claro
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 dark:bg-slate-950">
      <SidebarHeader className="p-4 dark:bg-slate-950">
        <div className="flex items-center justify-center">
          {isCollapsed ? (
            <div className="min-w-8">
              <img 
                src={getIconSrc()}
                alt="FinanceApp Icon" 
                className="h-10 w-10"
              />
            </div>
          ) : (
            <img 
              src={getLogoSrc()} 
              alt="FinanceApp" 
              className="h-10 w-auto"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="dark:bg-slate-950">
        <SidebarGroup className="dark:bg-slate-950">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground dark:text-slate-400">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="dark:bg-slate-950">
            <SidebarMenu className="dark:bg-slate-950">
              {normalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`${
                      isActive(item.url)
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-blue-600 dark:text-white'
                        : 'hover:bg-accent dark:hover:bg-slate-800'
                    }`}
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Menu Admin - só aparece se for admin */}
              {isAdmin && adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`${
                      isActive(item.url)
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Menu Dev/Teste - só em desenvolvimento */}
              {import.meta.env.DEV && devItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`${
                      isActive(item.url)
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4 dark:bg-slate-950">
        <UserProfile />
        
        <Button
          onClick={signOut}
          variant="outline"
          size={isCollapsed ? "icon" : "default"}
          className="w-full"
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden ml-2">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
