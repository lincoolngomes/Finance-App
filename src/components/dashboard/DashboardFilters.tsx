
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter } from 'lucide-react'

interface DashboardFiltersProps {
  filterMonth: string
  filterYear: string
  setFilterMonth: (month: string) => void
  setFilterYear: (year: string) => void
  transactionCount: number
  userName?: string
}

export function DashboardFilters({ 
  filterMonth, 
  filterYear, 
  setFilterMonth, 
  setFilterYear, 
  transactionCount,
  userName 
}: DashboardFiltersProps) {
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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{getGreeting()}</h2>
        <p className="text-muted-foreground">
          Bem-vindo ao seu painel financeiro do FinanceApp
          {transactionCount > 0 && ` • ${transactionCount} transações encontradas`}
        </p>
      </div>
      
      <div className="flex gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
