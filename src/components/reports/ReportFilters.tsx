import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Filter, Calendar } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { ReportFilters } from '@/hooks/useReports'

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onClearFilters: () => void
}

export function ReportFiltersComponent({ filters, onFiltersChange, onClearFilters }: ReportFiltersProps) {
  const { categories, isLoading } = useCategories()

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

  const hasFilters = filters.startDate || filters.endDate || filters.type || filters.categoryId

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="line-clamp-1">Filtros de Relatório</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Período</Label>
            <Select value={filters.period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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

          {filters.period === 'custom' && (
            <>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="startDate" className="text-sm">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="endDate" className="text-sm">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Tipo</Label>
            <Select 
              value={filters.type} 
              onValueChange={(value) => onFiltersChange({ ...filters, type: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Categoria</Label>
            <Select 
              value={filters.categoryId} 
              onValueChange={(value) => onFiltersChange({ ...filters, categoryId: value === 'all' ? '' : value })}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={isLoading ? "Carregando..." : "Todas categorias"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories?.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-center sm:justify-end pt-2">
            <Button variant="outline" onClick={onClearFilters} className="w-full sm:w-auto h-9 text-sm">
              Limpar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
