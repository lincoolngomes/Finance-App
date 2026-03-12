import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { Button } from '/src/components/ui/button'
import { Card, CardContent } from '/src/components/ui/card'
import { Calendar } from 'lucide-react'
import { ReportFilters } from '/src/hooks/useReports'

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onClearFilters: () => void
}

const PERIOD_OPTIONS: Array<{ value: ReportFilters['period']; label: string }> = [
  { value: 'day', label: 'Hoje' },
  { value: 'month', label: 'Por mês' },
  { value: 'year', label: 'Por ano' },
  { value: 'custom', label: 'Personalizado' },
]

const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

const padNumber = (value: number) => String(value).padStart(2, '0')

const buildMonthRange = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate()

  return {
    startDate: `${year}-${padNumber(month)}-01`,
    endDate: `${year}-${padNumber(month)}-${padNumber(daysInMonth)}`,
  }
}

const buildYearRange = (year: number) => ({
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
})

export function ReportFiltersComponent({ filters, onFiltersChange, onClearFilters }: ReportFiltersProps) {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 8 }, (_, index) => String(currentYear - 5 + index))

  const handlePeriodChange = (period: ReportFilters['period']) => {
    const now = new Date()
    const activeYear = Number(filters.year || now.getFullYear())
    const activeMonth = Number(filters.month || padNumber(now.getMonth() + 1))

    switch (period) {
      case 'day':
        onFiltersChange({
          ...filters,
          period,
          startDate: now.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0],
          month: padNumber(now.getMonth() + 1),
          year: String(now.getFullYear()),
        })
        return
      case 'month':
        onFiltersChange({
          ...filters,
          period,
          ...buildMonthRange(activeYear, activeMonth),
        })
        return
      case 'year':
        onFiltersChange({
          ...filters,
          period,
          ...buildYearRange(activeYear),
        })
        return
      case 'custom':
        onFiltersChange({
          ...filters,
          period,
        })
        return
    }
  }

  const handleMonthChange = (month: string) => {
    const nextYear = Number(filters.year)
    onFiltersChange({
      ...filters,
      month,
      period: 'month',
      ...buildMonthRange(nextYear, Number(month)),
    })
  }

  const handleYearChange = (year: string) => {
    const nextYear = Number(year)
    onFiltersChange({
      ...filters,
      year,
      ...(filters.period === 'year'
        ? buildYearRange(nextYear)
        : filters.period === 'month'
          ? buildMonthRange(nextYear, Number(filters.month))
          : {}),
    })
  }

  return (
    <Card className="border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))]">
      <CardContent className="space-y-4 p-4 lg:p-5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-slate-200">
            <Calendar className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-semibold">Período de análise</span>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                onClick={() => handlePeriodChange(option.value)}
                className={`h-10 justify-start border-slate-700 px-3 text-sm ${
                  filters.period === option.value
                    ? 'bg-blue-600 text-white hover:bg-blue-600'
                    : 'bg-slate-950/70 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {filters.period === 'month' && (
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3.5 lg:grid-cols-[1fr,180px]">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Mês</Label>
              <Select value={filters.month} onValueChange={handleMonthChange}>
                <SelectTrigger className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Ano</Label>
              <Select value={filters.year} onValueChange={handleYearChange}>
                <SelectTrigger className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions
                    .slice()
                    .reverse()
                    .map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {filters.period === 'year' && (
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3.5 lg:grid-cols-[180px,1fr]">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Ano</Label>
              <Select value={filters.year} onValueChange={handleYearChange}>
                <SelectTrigger className="border-slate-700 bg-slate-950/70 text-slate-100">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions
                    .slice()
                    .reverse()
                    .map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center">
              <p className="text-sm text-slate-400">
                Visão agregada de janeiro a dezembro do ano selecionado.
              </p>
            </div>
          </div>
        )}

        {filters.period === 'custom' && (
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3.5 lg:grid-cols-[1fr,1fr,auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm text-slate-300">Data inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm text-slate-300">Data final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </div>

            <Button
              variant="outline"
              onClick={onClearFilters}
              className="border-slate-700 bg-slate-950/70 text-slate-100 hover:bg-slate-900"
            >
              Limpar período
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
