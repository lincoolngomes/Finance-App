
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, Eye, EyeOff } from 'lucide-react'

interface DashboardFiltersProps {
  filterMonth: string
  filterYear: string
  setFilterMonth: (month: string) => void
  setFilterYear: (year: string) => void
  transactionCount: number
  hideValues?: boolean
  setHideValues?: (hide: boolean) => void
  showCardTransactions?: boolean
  setShowCardTransactions?: (show: boolean) => void
}

export function DashboardFilters({ 
  filterMonth, 
  filterYear, 
  setFilterMonth, 
  setFilterYear, 
  transactionCount,
  hideValues = false,
  setHideValues,
  showCardTransactions = false,
  setShowCardTransactions
}: DashboardFiltersProps) {

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral das suas finanças pessoais
          {transactionCount > 0 && ` • ${transactionCount} transações encontradas`}
        </p>
      </div>
      
      <div className="flex gap-2 items-center">
        {setHideValues && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setHideValues(!hideValues)}
            className="h-10 w-10"
            title={hideValues ? "Mostrar valores" : "Ocultar valores"}
          >
            {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        {setShowCardTransactions && (
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border/40">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Cartões</span>
            <button
              onClick={() => setShowCardTransactions(!showCardTransactions)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                showCardTransactions ? 'bg-blue-600' : 'bg-slate-600'
              }`}
              title={showCardTransactions ? 'Incluindo cartões' : 'Sem cartões'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  showCardTransactions ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>
        )}
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
