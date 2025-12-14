
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
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="w-full">
          <header className="h-16 flex items-center justify-between px-3 sm:px-6 bg-card border-b shadow-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger />
              <h1 className="text-sm sm:text-lg font-semibold title-color">
                {getGreeting()}
              </h1>
            </div>
            <ThemeToggle />
          </header>
          <div className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-x-hidden">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
