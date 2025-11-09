
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface AppLayoutProps {
  children: React.ReactNode
  userName?: string
}

export function AppLayout({ children, userName }: AppLayoutProps) {
  const getGreeting = () => {
    const hour = new Date().getHours()
    let greeting = ''
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Bom dia'
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Boa tarde'
    } else {
      greeting = 'Boa noite'
    }
    
    if (userName) {
      return `${greeting}, ${userName}!`
    }
    return `${greeting}!`
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b shadow-sm sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold title-color hidden sm:block">
                {getGreeting()}
              </h1>
            </div>
            <ThemeToggle />
          </header>
          <div className="flex-1 p-6 bg-background">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
