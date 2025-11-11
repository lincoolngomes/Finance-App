import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Calendar as CalendarIcon, TrendingUp, TrendingDown } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/ui/currency-input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { useCategories } from "@/hooks/useCategories"
import { formatCurrency } from '@/utils/currency'

type ViewMode = 'month' | 'week' | 'day'

interface Transacao {
  id: number
  userid?: string
  userId: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  created_at: string
  tipo: string | null
  category_id: string | null
  categorias?: {
    id: string
    nome: string
  } | null
}

export default function Calendario() {
  const { user } = useAuth()
  const { categories } = useCategories()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    quando: '',
    estabelecimento: '',
    valor: '',
    detalhes: '',
    tipo: 'despesa',
    category_id: ''
  })

  const { toast } = useToast()

  const fetchTransacoes = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const { data, error } = await (supabase as any)
        .from('transacoes')
        .select(`
          *,
          categorias!transacoes_category_id_fkey (
            id,
            nome
          )
        `)
        .eq('userid', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar transações:', error)
        return
      }

      console.log('=== DEBUG TRANSAÇÕES ===')
      console.log('User ID:', user.id)
      console.log('Transações encontradas:', data?.length || 0)
      console.log('Dados completos:', data)

      setTransacoes(data as Transacao[] || [])
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchTransacoes()
    }
  }, [user])

  const resetForm = () => {
    setFormData({
      quando: '',
      estabelecimento: '',
      valor: '',
      detalhes: '',
      tipo: 'despesa',
      category_id: ''
    })
    setEditingTransaction(null)
    setSelectedDate(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    try {
      const transactionData = {
        userid: user.id,
        quando: formData.quando || null,
        estabelecimento: formData.estabelecimento || null,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        detalhes: formData.detalhes || null,
        tipo: formData.tipo || null,
        category_id: formData.category_id || null
      }

      if (editingTransaction) {
        const { error } = await (supabase as any)
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .eq('userid', user.id)

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Transação atualizada com sucesso."
        })
      } else {
        const { error } = await (supabase as any)
          .from('transacoes')
          .insert([transactionData])

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Transação criada com sucesso."
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchTransacoes()
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar transação",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (transacao: Transacao) => {
    setEditingTransaction(transacao)
    setFormData({
      quando: transacao.quando || '',
      estabelecimento: transacao.estabelecimento || '',
      valor: transacao.valor?.toString() || '',
      detalhes: transacao.detalhes || '',
      tipo: transacao.tipo || 'despesa',
      category_id: transacao.category_id || ''
    })
    setDialogOpen(true)
  }

  const openNewDialog = (date?: Date) => {
    resetForm()
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd')
      setFormData(prev => ({ ...prev, quando: formattedDate }))
      setSelectedDate(date)
    }
    setDialogOpen(true)
  }

  // Obter período de visualização
  const getViewPeriod = () => {
    switch (viewMode) {
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        }
      case 'week':
        return {
          start: startOfWeek(currentDate, { locale: ptBR }),
          end: endOfWeek(currentDate, { locale: ptBR })
        }
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        }
    }
  }

  // Obter dias para exibição
  const getCalendarDays = () => {
    const period = getViewPeriod()
    
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart, { locale: ptBR })
      const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })
      
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    } else if (viewMode === 'week') {
      return eachDayOfInterval({ start: period.start, end: period.end })
    } else {
      return [currentDate]
    }
  }

  // Obter dias para renderização
  const calendarDays = getCalendarDays()

  // Função para obter título da visualização
  const getViewTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: ptBR })
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ptBR })
        const weekEnd = endOfWeek(currentDate, { locale: ptBR })
        return `${format(weekStart, 'd MMM', { locale: ptBR })} - ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`
      case 'day':
        return format(currentDate, 'dd MMMM yyyy', { locale: ptBR })
    }
  }

  const getTransactionsForDay = (day: Date) => {
    const targetDateString = format(day, 'yyyy-MM-dd')
    
    const filteredTransactions = transacoes.filter(transacao => {
      const transactionDateString = transacao.quando || format(new Date(transacao.created_at), 'yyyy-MM-dd')
      const match = transactionDateString === targetDateString
      
      // Debug apenas para hoje para não poluir o console
      if (isSameDay(day, new Date()) && transacoes.length > 0) {
        console.log('=== DEBUG DIA HOJE ===')
        console.log('Data buscada:', targetDateString)
        console.log('Total transações:', transacoes.length)
        console.log('Transações hoje:', filteredTransactions.length)
        console.log('Primeira transação exemplo:', transacoes[0])
      }
      
      return match
    })
    
    return filteredTransactions
  }

  // Funções de drag & drop
  const handleDragStart = (e: React.DragEvent, transacao: Transacao) => {
    e.dataTransfer.setData('transaction', JSON.stringify(transacao))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent, dayString: string) => {
    e.preventDefault()
    setDragOverDay(dayString)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDay(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault()
    setDragOverDay(null)
    
    try {
      const transactionData: Transacao = JSON.parse(e.dataTransfer.getData('transaction'))
      const newDate = format(targetDay, 'yyyy-MM-dd')
      
      if (!user) return

      const { error } = await (supabase as any)
        .from('transacoes')
        .update({ quando: newDate })
        .eq('id', transactionData.id)
        .eq('userid', user.id)

      if (error) throw error

      await fetchTransacoes()
      
      toast({
        title: "Sucesso!",
        description: `Transação movida para ${format(targetDay, 'dd/MM/yyyy', { locale: ptBR })}`
      })
    } catch (error: any) {
      console.error('Erro ao mover transação:', error)
      toast({
        title: "Erro",
        description: "Erro ao mover transação",
        variant: "destructive"
      })
    }
  }

  // Função para deletar transação
  const handleDeleteTransaction = async (transactionId: number) => {
    if (!user) return

    try {
      const { error } = await (supabase as any)
        .from('transacoes')
        .delete()
        .eq('id', transactionId)
        .eq('userid', user.id)

      if (error) throw error

      await fetchTransacoes()
      
      toast({
        title: "Sucesso!",
        description: "Transação excluída com sucesso"
      })
    } catch (error: any) {
      console.error('Erro ao excluir transação:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir transação",
        variant: "destructive"
      })
    }
  }

  // Navegação de data
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'month':
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
        case 'week':
          const weekChange = direction === 'prev' ? -7 : 7
          return new Date(prev.getTime() + weekChange * 24 * 60 * 60 * 1000)
        case 'day':
          const dayChange = direction === 'prev' ? -1 : 1
          return new Date(prev.getTime() + dayChange * 24 * 60 * 60 * 1000)
        default:
          return prev
      }
    })
  }

  const getTypeColor = (tipo: string | null) => {
    switch (tipo) {
      case 'receita':
        return 'bg-green-500'
      case 'despesa':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header do Calendário */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Controles de Visualização */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'month' && 'Mês'}
                  {mode === 'week' && 'Semana'}
                  {mode === 'day' && 'Dia'}
                </Button>
              ))}
            </div>
            
            <Button onClick={() => openNewDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transação
            </Button>
          </div>

          {/* Navegação de Data */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold">
                {getViewTitle()}
              </h2>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoje
            </Button>
          </div>
        </div>

        {/* Grid do Calendário */}
        <div className={`grid gap-1 mt-6 ${viewMode === 'month' ? 'grid-cols-7' : viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
        </div>

        {/* Grid do Calendário */}
        <div className={`grid gap-1 ${viewMode === 'month' ? 'grid-cols-7' : viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
          {/* Cabeçalhos dos dias da semana (apenas para mês e semana) */}
          {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Dias do calendário */}
          {calendarDays.map((day) => {
            const dayTransactions = getTransactionsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())
            const dayString = format(day, 'yyyy-MM-dd')
            const isDragOver = dragOverDay === dayString

            return (
              <div
                key={day.toString()}
                className={`
                  ${viewMode === 'day' ? 'min-h-[400px]' : 'min-h-[120px]'} 
                  p-3 border border-border cursor-pointer hover:bg-accent/50 transition-all duration-200
                  ${!isCurrentMonth && viewMode === 'month' ? 'opacity-50 bg-muted/30' : 'bg-white'}
                  ${isToday ? 'bg-primary/10 border-primary ring-1 ring-primary/20' : ''}
                  ${isDragOver ? 'bg-blue-50 border-blue-300 border-2 shadow-lg' : ''}
                `}
                onClick={() => openNewDialog(day)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, dayString)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : ''}`}>
                  {viewMode === 'day' ? format(day, 'EEEE, dd MMMM', { locale: ptBR }) : format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayTransactions.map((transacao, index) => {
                    // Mostrar mais transações em visualização diária
                    const maxVisible = viewMode === 'day' ? 10 : 3
                    if (index >= maxVisible) return null
                    
                    return (
                      <div
                        key={transacao.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, transacao)}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(transacao)
                        }}
                        className="group relative text-xs p-2 rounded cursor-move hover:opacity-80 hover:shadow-md transition-all duration-200 bg-white shadow-sm border hover:border-primary/50 active:scale-95"
                        title="Clique para editar ou arraste para outra data"
                      >
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={`${getTypeColor(transacao.tipo)} text-white text-xs mr-2`}
                          >
                            {transacao.tipo === 'receita' ? '+' : '-'}
                            {formatCurrency(transacao.valor || 0)}
                          </Badge>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTransaction(transacao.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {transacao.estabelecimento || 'Sem título'}
                        </div>
                        
                        {viewMode === 'day' && transacao.detalhes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {transacao.detalhes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {dayTransactions.length > (viewMode === 'day' ? 10 : 3) && (
                    <div className="text-xs text-muted-foreground">
                      +{dayTransactions.length - (viewMode === 'day' ? 10 : 3)} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Dialog de Transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="quando">Data</Label>
              <Input
                id="quando"
                type="date"
                value={formData.quando}
                onChange={(e) => setFormData(prev => ({ ...prev, quando: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="estabelecimento">Estabelecimento</Label>
              <Input
                id="estabelecimento"
                value={formData.estabelecimento}
                onChange={(e) => setFormData(prev => ({ ...prev, estabelecimento: e.target.value }))}
                placeholder="Nome do estabelecimento"
              />
            </div>

            <div>
              <Label htmlFor="valor">Valor</Label>
              <CurrencyInput
                id="valor"
                value={formData.valor}
                onChange={(value) => setFormData(prev => ({ ...prev, valor: value.toString() }))}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category_id">Categoria</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="detalhes">Detalhes</Label>
              <Textarea
                id="detalhes"
                value={formData.detalhes}
                onChange={(e) => setFormData(prev => ({ ...prev, detalhes: e.target.value }))}
                placeholder="Detalhes da transação"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingTransaction ? 'Atualizar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              {editingTransaction && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => {
                          handleDeleteTransaction(editingTransaction.id)
                          setDialogOpen(false)
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
