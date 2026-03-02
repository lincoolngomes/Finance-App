import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Filter, Eye, EyeOff, Clock3, Landmark, FileText, Settings2, CreditCard } from 'lucide-react'

interface DashboardFiltersProps {
  filterMonth: string
  filterYear: string
  setFilterMonth: (month: string) => void
  setFilterYear: (year: string) => void
  hideValues?: boolean
  setHideValues?: (hide: boolean) => void
  showCardTransactions?: boolean
  setShowCardTransactions?: (show: boolean) => void
  useCardInvoicePayments?: boolean
  setUseCardInvoicePayments?: (show: boolean) => void
  showPendingInMonthlyChart?: boolean
  setShowPendingInMonthlyChart?: (show: boolean) => void
  showInvestmentsSeparately?: boolean
  setShowInvestmentsSeparately?: (show: boolean) => void
}

export function DashboardFilters({ 
  filterMonth, 
  filterYear, 
  setFilterMonth, 
  setFilterYear, 
  hideValues = false,
  setHideValues,
  showCardTransactions = false,
  setShowCardTransactions,
  useCardInvoicePayments = false,
  setUseCardInvoicePayments,
  showPendingInMonthlyChart = false,
  setShowPendingInMonthlyChart,
  showInvestmentsSeparately = false,
  setShowInvestmentsSeparately
}: DashboardFiltersProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const renderToggle = (
    checked: boolean,
    onToggle?: (next: boolean) => void,
    disabled = false
  ) => (
    <button
      type="button"
      onClick={() => !disabled && onToggle?.(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )

  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h2>
          <p className="text-muted-foreground">
            Acompanhe saldos, fluxo e compromissos do período
          </p>
        </div>
        
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          {setHideValues && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setHideValues(!hideValues)}
              className="h-10 w-10"
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="h-10 flex-1 gap-2 sm:flex-none"
            title="Configurações de exibição do dashboard"
          >
            <Settings2 className="h-4 w-4" />
            <span>Configurações</span>
          </Button>
          <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-10 flex-1 sm:w-32 sm:flex-none">
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
            <SelectTrigger className="h-10 w-[112px]">
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

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl border-border/60 bg-slate-950/95 p-0 text-slate-100">
          <DialogHeader className="border-b border-border/60 bg-gradient-to-r from-blue-500/10 via-slate-900 to-transparent px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings2 className="h-5 w-5 text-blue-400" />
              Configurações do Dashboard
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Ajuste como o dashboard interpreta cartões, pendências e investimentos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            {setShowCardTransactions && (
              <div className="rounded-xl border border-border/50 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <CreditCard className="h-4 w-4 text-blue-400" />
                      Considerar cartões
                    </div>
                    <p className="text-sm text-slate-400">
                      Inclui compras lançadas diretamente no cartão de crédito em cards, gráficos e categorias.
                    </p>
                  </div>
                  {renderToggle(showCardTransactions, setShowCardTransactions)}
                </div>
              </div>
            )}

            {setUseCardInvoicePayments && (
              <div className="rounded-xl border border-border/50 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <FileText className="h-4 w-4 text-blue-400" />
                      Usar lancamentos do cartao
                    </div>
                    <p className="text-sm text-slate-400">
                      Troca o modo de leitura dos cartões: ligado usa as compras do cartão e ignora o pagamento da fatura; desligado usa o pagamento da fatura e ignora os itens do cartão.
                    </p>
                  </div>
                  {renderToggle(
                    !useCardInvoicePayments,
                    (nextChecked) => setUseCardInvoicePayments?.(!nextChecked),
                    !showCardTransactions
                  )}
                </div>
                {!showCardTransactions && (
                  <p className="mt-3 text-xs text-amber-400">
                    Ative “Considerar cartões” para escolher entre lancamentos do cartão e pagamento de fatura.
                  </p>
                )}
              </div>
            )}

            {setShowPendingInMonthlyChart && (
              <div className="rounded-xl border border-border/50 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Clock3 className="h-4 w-4 text-blue-400" />
                      Pendentes e faturas
                    </div>
                    <p className="text-sm text-slate-400">
                      Faz a evolução mensal e os detalhes do mês considerarem também lançamentos pendentes e despesas ainda abertas em fatura.
                    </p>
                  </div>
                  {renderToggle(showPendingInMonthlyChart, setShowPendingInMonthlyChart)}
                </div>
              </div>
            )}

            {setShowInvestmentsSeparately && (
              <div className="rounded-xl border border-border/50 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Landmark className="h-4 w-4 text-blue-400" />
                      Separar investimentos
                    </div>
                    <p className="text-sm text-slate-400">
                      Move aplicações, resgates e rendimentos para um bloco próprio de investimentos, sem misturar com receitas e despesas normais.
                    </p>
                  </div>
                  {renderToggle(showInvestmentsSeparately, setShowInvestmentsSeparately)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
