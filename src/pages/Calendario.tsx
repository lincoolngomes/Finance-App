import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { CurrencyInput } from '@/components/ui/currency-input'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Transacao {
  id: number
  created_at: string
  quando: string | null
  estabelecimento: string | null
  valor: number | null
  detalhes: string | null
  tipo: string | null
  category_id: string
  userid: string | null
  categorias?: {
    id: string
    nome: string
  }
}

type ViewMode = 'month' | 'week' | 'day'

export default function Calendario() {
  const { user } = useAuth()
  const { categories } = useCategories()
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    quando: '',
    estabelecimento: '',
    valor: '',
    detalhes: '',
    tipo: '',
    category_id: ''
  })

  // Buscar transações
  const fetchTransacoes = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias (
            id,
            nome
          )
        `)
        .eq('userid', user.id)
        .order('quando', { ascending: false })

      if (error) {
        console.error('Erro ao buscar transações:', error)
        toast({
          title: "Erro",
          description: "Erro ao carregar transações",
          variant: "destructive"
        })
        return
      }

      setTransacoes(data || [])
    } catch (error) {
      console.error('Erro:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransacoes()
  }, [user])

  // Filtrar transações por data
  const getTransactionsForDate = (date: Date) => {
    // Converter a data para string no formato YYYY-MM-DD para comparação direta
    const targetDateString = format(date, 'yyyy-MM-dd')
    
    const filteredTransactions = transacoes.filter(t => {
      // Comparar diretamente as strings de data para evitar problemas de timezone
      const transactionDateString = t.quando || format(new Date(t.created_at), 'yyyy-MM-dd')
      const isMatch = transactionDateString === targetDateString
      
      // Log apenas para transações que têm 'quando' definido (movidas via drag & drop)
      if (t.quando && isMatch) {
        console.log('=== TRANSAÇÃO ENCONTRADA ===')
        console.log('Data do calendário:', format(date, 'dd/MM/yyyy'))
        console.log('String de busca:', targetDateString)
        console.log('String da transação:', transactionDateString)
        console.log('Match:', isMatch)
      }
      
      return isMatch
    })
    
    return filteredTransactions
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

  // Navegação de data
  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'month':
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
        case 'week':
          return direction === 'prev' ? 
            new Date(prev.setDate(prev.getDate() - 7)) : 
            new Date(prev.setDate(prev.getDate() + 7))
        case 'day':
          return direction === 'prev' ?
            new Date(prev.setDate(prev.getDate() - 1)) :
            new Date(prev.setDate(prev.getDate() + 1))
        default:
          return prev
      }
    })
  }

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      quando: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      estabelecimento: '',
      valor: '',
      detalhes: '',
      tipo: '',
      category_id: ''
    })
  }

  // Abrir diálogo para nova transação
  const openNewTransaction = (date?: Date) => {
    setEditingTransaction(null)
    setSelectedDate(date || new Date())
    resetForm()
    if (date) {
      setFormData(prev => ({ ...prev, quando: format(date, 'yyyy-MM-dd') }))
    }
    setDialogOpen(true)
  }

  // Abrir diálogo para editar transação
  const openEditTransaction = (transacao: Transacao) => {
    setEditingTransaction(transacao)
    setFormData({
      quando: transacao.quando ? format(new Date(transacao.quando), 'yyyy-MM-dd') : '',
      estabelecimento: transacao.estabelecimento || '',
      valor: transacao.valor?.toString() || '',
      detalhes: transacao.detalhes || '',
      tipo: transacao.tipo || '',
      category_id: transacao.category_id || ''
    })
    setDialogOpen(true)
  }

  // Salvar transação
  const handleSave = async () => {
    if (!user) return

    try {
      const transactionData = {
        quando: formData.quando || null,
        estabelecimento: formData.estabelecimento || null,
        valor: parseFloat(formData.valor) || null,
        detalhes: formData.detalhes || null,
        tipo: formData.tipo || null,
        category_id: formData.category_id || null,
        userid: user.id
      }

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Transação atualizada com sucesso!"
        })
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert([transactionData])

        if (error) throw error

        toast({
          title: "Sucesso", 
          description: "Transação criada com sucesso!"
        })
      }

      setDialogOpen(false)
      fetchTransacoes()
      resetForm()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar transação",
        variant: "destructive"
      })
    }
  }

  // Excluir transação
  const handleDelete = async (id: number, transactionName?: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      })
      return
    }

    // Confirmar exclusão
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a transação "${transactionName || 'Sem nome'}"?`
    )
    
    if (!confirmDelete) return

    try {
      console.log('Excluindo transação:', { id, userId: user.id })

      const { data, error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)
        .eq('userid', user.id) // Garantir que só exclui transações do próprio usuário
        .select()

      if (error) {
        console.error('Erro do Supabase:', error)
        throw error
      }

      console.log('Transação excluída:', data)

      if (data && data.length > 0) {
        toast({
          title: "Sucesso",
          description: `Transação "${transactionName || 'Sem nome'}" excluída com sucesso!`
        })
        fetchTransacoes()
      } else {
        console.warn('Nenhuma transação foi excluída')
        toast({
          title: "Aviso",
          description: "Nenhuma transação foi encontrada para excluir",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast({
        title: "Erro",
        description: `Erro ao excluir transação: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      })
    }
  }

  // Mover transação para nova data
  const handleMoveTransaction = async (transactionId: number, newDate: Date) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      })
      return
    }

    try {
      // CORREÇÃO DEFINITIVA: usar componentes diretos da data local
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, '0')
      const day = String(newDate.getDate()).padStart(2, '0')
      const newDateString = `${year}-${month}-${day}`
      
      console.log('=== MOVENDO TRANSAÇÃO (DIRETO) ===')
      console.log('Data original:', newDate.toString())
      console.log('Componentes extraídos:', { year, month, day })
      console.log('String final para BD:', newDateString)
      console.log('Data para exibição:', `${day}/${month}/${year}`)

      const { data, error } = await supabase
        .from('transacoes')
        .update({ quando: newDateString })
        .eq('id', transactionId)
        .eq('userid', user.id) // Garantir que só move transações do próprio usuário
        .select()

      if (error) {
        console.error('Erro do Supabase:', error)
        throw error
      }

      console.log('Transação atualizada com sucesso!')

      if (data && data.length > 0) {
        toast({
          title: "Sucesso",
          description: `Transação movida para ${day}/${month}/${year}!`
        })
        fetchTransacoes()
      } else {
        console.warn('Nenhuma transação foi atualizada')
        toast({
          title: "Aviso",
          description: "Nenhuma transação foi encontrada para mover",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao mover transação:', error)
      toast({
        title: "Erro",
        description: `Erro ao mover transação: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      })
    }
  }

  // Handlers para drag and drop
  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(format(day, 'yyyy-MM-dd'))
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDay(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverDay(null)
    
    try {
      const dataString = e.dataTransfer.getData('application/json')
      console.log('=== HANDLE DROP ===')
      console.log('Dados recebidos:', dataString)
      
      if (!dataString) {
        console.warn('Nenhum dado foi transferido')
        return
      }

      const data = JSON.parse(dataString)
      const { transactionId, sourceDate } = data
      
      console.log('targetDate no handleDrop:', {
        toString: targetDate.toString(),
        toISOString: targetDate.toISOString(),
        toDateString: targetDate.toDateString(),
        getDate: targetDate.getDate(),
        getMonth: targetDate.getMonth(),
        getFullYear: targetDate.getFullYear(),
        format_dd_MM_yyyy: format(targetDate, 'dd/MM/yyyy', { locale: ptBR }),
        format_yyyy_MM_dd: format(targetDate, 'yyyy-MM-dd'),
        timezone: targetDate.getTimezoneOffset()
      })
      
      if (transactionId && !isNaN(transactionId)) {
        await handleMoveTransaction(parseInt(transactionId), targetDate)
      } else {
        console.warn('ID da transação inválido:', transactionId)
        toast({
          title: "Erro",
          description: "ID da transação inválido",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro no drop:', error)
      toast({
        title: "Erro", 
        description: "Erro ao processar movimento da transação",
        variant: "destructive"
      })
    }
  }

  const daysToShow = getCalendarDays()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📅 Calendário</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas transações por data
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openNewTransaction()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Edite os dados da transação' : 'Adicione uma nova transação'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quando">Data</Label>
                <Input
                  id="quando"
                  type="date"
                  value={formData.quando}
                  onChange={(e) => setFormData(prev => ({ ...prev, quando: e.target.value }))}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <CurrencyInput
                    id="valor"
                    value={formData.valor}
                    onChange={(value) => setFormData(prev => ({ ...prev, valor: String(value || 0) }))}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <CategorySelector
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                />
              </div>

              <div>
                <Label htmlFor="detalhes">Detalhes</Label>
                <Textarea
                  id="detalhes"
                  value={formData.detalhes}
                  onChange={(e) => setFormData(prev => ({ ...prev, detalhes: e.target.value }))}
                  placeholder="Observações adicionais"
                />
              </div>

              <div className="flex justify-between gap-2">
                <div>
                  {editingTransaction && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleDelete(editingTransaction.id, editingTransaction.estabelecimento)
                        setDialogOpen(false)
                      }}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  {/* Botão de excluir - só aparece quando editando */}
                  {editingTransaction && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleDelete(editingTransaction.id, editingTransaction.estabelecimento)
                        setDialogOpen(false)
                      }}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                  
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      {editingTransaction ? 'Atualizar' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                {viewMode === 'week' && `Semana de ${format(getViewPeriod().start, 'dd/MM')} - ${format(getViewPeriod().end, 'dd/MM/yyyy')}`}
                {viewMode === 'day' && format(currentDate, 'dd/MM/yyyy', { locale: ptBR })}
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button 
                variant={viewMode === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className={`grid gap-2 ${
            viewMode === 'month' ? 'grid-cols-7' : 
            viewMode === 'week' ? 'grid-cols-7' : 
            'grid-cols-1'
          }`}>
            {/* Headers */}
            {(viewMode === 'month' || viewMode === 'week') && (
              <>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </>
            )}
            
            {/* Calendar Days */}
            {daysToShow.map(day => {
              const dayTransactions = getTransactionsForDate(day)
              const totalReceitas = dayTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0)
              const totalDespesas = dayTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = viewMode !== 'month' || isSameMonth(day, currentDate)
              const isDragOver = dragOverDay === format(day, 'yyyy-MM-dd')

              return (
                <Card 
                  key={day.toString()} 
                  className={`min-h-[120px] cursor-pointer hover:bg-accent/50 transition-all duration-200 ${
                    isToday ? 'ring-2 ring-primary' : ''
                  } ${
                    !isCurrentMonth ? 'opacity-50' : ''
                  } ${
                    isDragOver ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => openNewTransaction(day)}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    console.log('=== DROP EVENT ===')
                    console.log('Dia do calendário (day):', {
                      toString: day.toString(),
                      toISOString: day.toISOString(),
                      toDateString: day.toDateString(),
                      getDate: day.getDate(),
                      getMonth: day.getMonth(),
                      getFullYear: day.getFullYear(),
                      format_dd_MM_yyyy: format(day, 'dd/MM/yyyy', { locale: ptBR }),
                      format_yyyy_MM_dd: format(day, 'yyyy-MM-dd')
                    })
                    handleDrop(e, day)
                  }}
                >
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                        {format(day, viewMode === 'day' ? 'EEEE, dd/MM/yyyy' : 'd', { locale: ptBR })}
                      </span>
                      {dayTransactions.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {dayTransactions.length}
                        </Badge>
                      )}
                    </div>

                    {/* Totals */}
                    {(totalReceitas > 0 || totalDespesas > 0) && (
                      <div className="space-y-1 mb-2">
                        {totalReceitas > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">{formatCurrency(totalReceitas)}</span>
                          </div>
                        )}
                        {totalDespesas > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <TrendingDown className="h-3 w-3 text-red-500" />
                            <span className="text-red-600">{formatCurrency(totalDespesas)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transactions List */}
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {dayTransactions.map(transaction => (
                        <div 
                          key={transaction.id}
                          className="group flex items-center gap-2 p-1 rounded text-xs hover:bg-background select-none border border-transparent hover:border-primary/20 transition-all duration-200"
                          title="Clique para editar, arraste para mover"
                        >
                          <div 
                            className="flex-1 flex items-center justify-between cursor-move"
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation()
                              const dragData = {
                                transactionId: transaction.id,
                                sourceDate: format(day, 'yyyy-MM-dd')
                              }
                              console.log('Iniciando drag:', dragData)
                              e.dataTransfer.setData('application/json', JSON.stringify(dragData))
                              e.dataTransfer.effectAllowed = 'move'
                              // Adiciona classe visual durante drag
                              e.currentTarget.parentElement.style.opacity = '0.5'
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.parentElement.style.opacity = '1'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditTransaction(transaction)
                            }}
                          >
                            <div className="flex-1 truncate">
                              <div className="font-medium truncate">
                                {transaction.estabelecimento || 'Sem nome'}
                              </div>
                              <div className="text-muted-foreground truncate">
                                {transaction.categorias?.nome}
                              </div>
                            </div>
                            <div className={`font-bold ${
                              transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.tipo === 'receita' ? '+' : '-'}
                              {formatCurrency(Math.abs(transaction.valor || 0))}
                            </div>
                          </div>
                          
                          {/* Botão de exclusão */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(transaction.id, transaction.estabelecimento)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 hover:text-red-700 transition-all duration-200"
                            title="Excluir transação"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}