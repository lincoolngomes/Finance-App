
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { useCategories } from '/src/hooks/useCategories'

interface CategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  tipo?: 'receita' | 'despesa' | '' // Tipo para filtrar categorias
}

export function CategorySelector({ value, onValueChange, placeholder = "Selecione a categoria", tipo = '' }: CategorySelectorProps) {
  const { categories, isLoading } = useCategories()

  // Filtra categorias por tipo se especificado
  const filteredCategories = tipo && tipo !== '' 
    ? categories.filter(cat => cat.tipo === tipo)
    : categories

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando categorias..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (!filteredCategories || filteredCategories.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Nenhuma categoria encontrada" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas categorias</SelectItem>
        {filteredCategories.map((categoria) => (
          <SelectItem key={categoria.id} value={categoria.id}>
            {categoria.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
