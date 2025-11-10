
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Filter, X, ArrowUpDown } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'

interface TransactionFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  sortOrder: string
  onSortOrderChange: (value: string) => void
  onClearFilters: () => void
}

export function TransactionFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters
}: TransactionFiltersProps) {
  const { categories, isLoading } = useCategories()
  const hasFilters = searchTerm || typeFilter || categoryFilter || sortOrder !== 'created_desc'

  const handleTypeChange = (value: string) => {
    onTypeFilterChange(value === 'all' ? '' : value)
  }

  const handleCategoryChange = (value: string) => {
    onCategoryFilterChange(value === 'all' ? '' : value)
  }

  return (
    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
      {/* Linha superior - Busca e Ordenação */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
          <Input
            placeholder="Pesquisar transações..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 sm:pl-9 h-9 text-sm"
          />
        </div>

        <Select value={sortOrder} onValueChange={onSortOrderChange}>
          <SelectTrigger className="w-full sm:w-[220px] h-9 text-sm">
            <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Mais recentes primeiro</SelectItem>
            <SelectItem value="created_asc">Mais antigos primeiro</SelectItem>
            <SelectItem value="date_desc">Data da transação ↓</SelectItem>
            <SelectItem value="date_asc">Data da transação ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Linha inferior - Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 flex-1">
          <Select value={typeFilter || 'all'} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 text-sm">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter || 'all'} onValueChange={handleCategoryChange} disabled={isLoading}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isLoading ? "Carregando..." : "Categoria"} />
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

        {hasFilters && (
          <Button variant="outline" onClick={onClearFilters} className="h-9 text-sm w-full sm:w-auto">
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="hidden sm:inline">Limpar Filtros</span>
            <span className="sm:hidden">Limpar</span>
          </Button>
        )}
      </div>
    </div>
  )
}
