import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { ReportFilters } from '@/hooks/useReports'

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onClearFilters: () => void
}

export function ReportFiltersComponent({ filters, onFiltersChange, onClearFilters }: ReportFiltersProps) {

  const handlePeriodChange = (period: 'day' | 'month' | 'year' | 'custom') => {
    const now = new Date()
    let startDate = ''
    let endDate = ''

    switch (period) {
      case 'day':
        startDate = now.toISOString().split('T')[0]
        endDate = startDate
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        break
      case 'custom':
        // Keep current dates or clear them
        break
    }

    onFiltersChange({
      ...filters,
      period,
      ...(period !== 'custom' && { startDate, endDate })
    })
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          <span>Período de Análise</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Período */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Período de Análise</Label>
          <Select value={filters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="h-10 text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datas Personalizadas */}
        {filters.period === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                className="h-10 text-sm"
                placeholder="Selecione a data inicial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                className="h-10 text-sm"
                placeholder="Selecione a data final"
              />
            </div>
          </div>
        )}

        {(filters.startDate || filters.endDate) && filters.period === 'custom' && (
          <div className="flex justify-center sm:justify-end">
            <Button variant="outline" onClick={onClearFilters} className="w-full sm:w-auto h-10 text-sm">
              Limpar Período
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
