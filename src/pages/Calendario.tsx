import { useState, useEffect } from 'react'import { useState, useEffect, useMemo } from 'react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'import { Label } from '@/components/ui/label'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Textarea } from '@/components/ui/textarea'import { Textarea } from '@/components/ui/textarea'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { Badge } from '@/components/ui/badge'import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

import { CurrencyInput } from '@/components/ui/currency-input'import { Badge } from '@/components/ui/badge'

import { CategorySelector } from '@/components/transactions/CategorySelector'import { CurrencyInput } from '@/components/ui/currency-input'

import { supabase } from '@/lib/supabase'import { CategorySelector } from '@/components/transactions/CategorySelector'

import { useAuth } from '@/hooks/useAuth'import { supabase } from '@/lib/supabase'

import { useCategories } from '@/hooks/useCategories'import { useAuth } from '@/hooks/useAuth'

import { toast } from '@/hooks/use-toast'import { useCategories } from '@/hooks/useCategories'

import { Plus, Edit, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'import { toast } from '@/hooks/use-toast'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'import { Plus, Edit, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X } from 'lucide-react'

import { ptBR } from 'date-fns/locale'import { formatCurrency } from '@/utils/currency'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns'

interface Transacao {import { ptBR } from 'date-fns/locale'

  id: number

  estabelecimento: string | nullinterface Transacao {

  valor: number | null  id: number

  detalhes: string | null  created_at: string

  tipo: string | null  quando: string | null

  category_id: string | null  estabelecimento: string | null

  userid: string  valor: number | null

  quando: string | null  detalhes: string | null

  created_at: string  tipo: string | null

}  category_id: string

  userid: string | null

export default function Calendario() {  categorias?: {

  const { user } = useAuth()    id: string

  const { categories } = useCategories()    nome: string

  const [transacoes, setTransacoes] = useState<Transacao[]>([])  }

  const [loading, setLoading] = useState(true)}

  const [dialogOpen, setDialogOpen] = useState(false)

  const [currentDate, setCurrentDate] = useState(new Date())type ViewMode = 'month' | 'week' | 'day'

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)export default function Calendario() {

  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)  const { user } = useAuth()

  const [dragOverDay, setDragOverDay] = useState<string | null>(null)  const { categories } = useCategories()

  const [transacoes, setTransacoes] = useState<Transacao[]>([])

  const [formData, setFormData] = useState({  const [loading, setLoading] = useState(true)

    quando: '',  const [dialogOpen, setDialogOpen] = useState(false)

    estabelecimento: '',  const [editingTransaction, setEditingTransaction] = useState<Transacao | null>(null)

    valor: '',  

    detalhes: '',  // Calendar state

    tipo: 'despesa',  const [currentDate, setCurrentDate] = useState(new Date())

    category_id: ''  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  })  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  const fetchTransacoes = async () => {  

    if (!user) return  // Form state

  const [formData, setFormData] = useState({

    try {    quando: '',

      setLoading(true)    estabelecimento: '',

      const { data, error } = await supabase    valor: '',

        .from('transacoes')    detalhes: '',

        .select('*')    tipo: '',

        .eq('userid', user.id)    category_id: ''

        .order('quando', { ascending: false })  })



      if (error) {  // Buscar transações

        console.error('Erro ao buscar transações:', error)  const fetchTransacoes = async () => {

        return    if (!user) return

      }

    try {

      setTransacoes(data || [])      setLoading(true)

    } catch (error) {      const { data, error } = await supabase

      console.error('Erro ao buscar transações:', error)        .from('transacoes')

    } finally {        .select(`

      setLoading(false)          *,

    }          categorias (

  }            id,

            nome

  useEffect(() => {          )

    fetchTransacoes()        `)

  }, [user])        .eq('userid', user.id)

        .order('quando', { ascending: false })

  const getTransactionsForDate = (date: Date) => {

    const targetDateString = format(date, 'yyyy-MM-dd')      if (error) {

    return transacoes.filter(t => {        console.error('Erro ao buscar transações:', error)

      const transactionDateString = t.quando || format(new Date(t.created_at), 'yyyy-MM-dd')        toast({

      return transactionDateString === targetDateString          title: "Erro",

    })          description: "Erro ao carregar transações",

  }          variant: "destructive"

        })

  const getCalendarDays = () => {        return

    const monthStart = startOfMonth(currentDate)      }

    const monthEnd = endOfMonth(currentDate)

    const calendarStart = startOfWeek(monthStart, { locale: ptBR })      setTransacoes(data || [])

    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })    } catch (error) {

          console.error('Erro:', error)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })      toast({

  }        title: "Erro",

        description: "Erro ao carregar transações",

  const openNewTransaction = (date?: Date) => {        variant: "destructive"

    setEditingTransaction(null)      })

    setSelectedDate(date || new Date())    } finally {

    setFormData({      setLoading(false)

      quando: date ? format(date, 'yyyy-MM-dd') : '',    }

      estabelecimento: '',  }

      valor: '',

      detalhes: '',  useEffect(() => {

      tipo: 'despesa',    fetchTransacoes()

      category_id: ''  }, [user])

    })

    setDialogOpen(true)  // Filtrar transações por data

  }  const getTransactionsForDate = (date: Date) => {

    // Converter a data para string no formato YYYY-MM-DD para comparação direta

  const handleSave = async () => {    const targetDateString = format(date, 'yyyy-MM-dd')

    if (!user) {    

      toast({    const filteredTransactions = transacoes.filter(t => {

        title: "Erro",      // Comparar diretamente as strings de data para evitar problemas de timezone

        description: "Usuário não autenticado",      const transactionDateString = t.quando || format(new Date(t.created_at), 'yyyy-MM-dd')

        variant: "destructive"      const isMatch = transactionDateString === targetDateString

      })      

      return      // Log apenas para transações que têm 'quando' definido (movidas via drag & drop)

    }      if (t.quando && isMatch) {

        console.log('=== TRANSAÇÃO ENCONTRADA ===')

    try {        console.log('Data do calendário:', format(date, 'dd/MM/yyyy'))

      const transactionData = {        console.log('String de busca:', targetDateString)

        estabelecimento: formData.estabelecimento || null,        console.log('String da transação:', transactionDateString)

        valor: parseFloat(formData.valor) || null,        console.log('Match:', isMatch)

        detalhes: formData.detalhes || null,      }

        tipo: formData.tipo || null,      

        category_id: formData.category_id || null,      return isMatch

        userid: user.id,    })

        quando: formData.quando || null,    

      }    return filteredTransactions

  }

      if (editingTransaction) {

        const { error } = await supabase  // Obter período de visualização

          .from('transacoes')  const getViewPeriod = () => {

          .update(transactionData)    switch (viewMode) {

          .eq('id', editingTransaction.id)      case 'month':

          .eq('userid', user.id)        return {

          start: startOfMonth(currentDate),

        if (error) throw error          end: endOfMonth(currentDate)

        }

        toast({      case 'week':

          title: "Sucesso",        return {

          description: "Transação atualizada com sucesso!"          start: startOfWeek(currentDate, { locale: ptBR }),

        })          end: endOfWeek(currentDate, { locale: ptBR })

      } else {        }

        const { error } = await supabase      case 'day':

          .from('transacoes')        return {

          .insert([transactionData])          start: startOfDay(currentDate),

          end: endOfDay(currentDate)

        if (error) throw error        }

    }

        toast({  }

          title: "Sucesso",

          description: "Transação criada com sucesso!"  // Obter dias para exibição

        })  const getCalendarDays = () => {

      }    const period = getViewPeriod()

    

      setDialogOpen(false)    if (viewMode === 'month') {

      fetchTransacoes()      const monthStart = startOfMonth(currentDate)

    } catch (error: any) {      const monthEnd = endOfMonth(currentDate)

      console.error('Erro ao salvar transação:', error)      const calendarStart = startOfWeek(monthStart, { locale: ptBR })

      toast({      const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })

        title: "Erro",      

        description: `Erro ao salvar transação: ${error.message}`,      return eachDayOfInterval({ start: calendarStart, end: calendarEnd })

        variant: "destructive"    } else if (viewMode === 'week') {

      })      return eachDayOfInterval({ start: period.start, end: period.end })

    }    } else {

  }      return [currentDate]

    }

  if (loading) {  }

    return (

      <div className="flex items-center justify-center h-64">  // Navegação de data

        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>  const navigateDate = (direction: 'prev' | 'next') => {

      </div>    setCurrentDate(prev => {

    )      switch (viewMode) {

  }        case 'month':

          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)

  const daysToShow = getCalendarDays()        case 'week':

          return direction === 'prev' ? 

  return (            new Date(prev.setDate(prev.getDate() - 7)) : 

    <div className="space-y-6 p-6">            new Date(prev.setDate(prev.getDate() + 7))

      {/* Header */}        case 'day':

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">          return direction === 'prev' ?

        <div>            new Date(prev.setDate(prev.getDate() - 1)) :

          <h1 className="text-3xl font-bold tracking-tight">📅 Calendário</h1>            new Date(prev.setDate(prev.getDate() + 1))

          <p className="text-muted-foreground">        default:

            Visualize e gerencie suas transações por data          return prev

          </p>      }

        </div>    })

  }

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

          <DialogTrigger asChild>  // Resetar formulário

            <Button onClick={() => openNewTransaction()} className="gap-2">  const resetForm = () => {

              <Plus className="h-4 w-4" />    setFormData({

              Nova Transação      quando: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',

            </Button>      estabelecimento: '',

          </DialogTrigger>      valor: '',

          <DialogContent className="sm:max-w-md">      detalhes: '',

            <DialogHeader>      tipo: '',

              <DialogTitle>      category_id: ''

                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}    })

              </DialogTitle>  }

              <DialogDescription>

                {editingTransaction ? 'Edite os dados da transação' : 'Adicione uma nova transação'}  // Abrir diálogo para nova transação

              </DialogDescription>  const openNewTransaction = (date?: Date) => {

            </DialogHeader>    setEditingTransaction(null)

            <div className="space-y-4">    setSelectedDate(date || new Date())

              <div>    resetForm()

                <Label htmlFor="quando">Data</Label>    if (date) {

                <Input      setFormData(prev => ({ ...prev, quando: format(date, 'yyyy-MM-dd') }))

                  id="quando"    }

                  type="date"    setDialogOpen(true)

                  value={formData.quando}  }

                  onChange={(e) => setFormData(prev => ({ ...prev, quando: e.target.value }))}

                />  // Abrir diálogo para editar transação

              </div>  const openEditTransaction = (transacao: Transacao) => {

    setEditingTransaction(transacao)

              <div>    setFormData({

                <Label htmlFor="estabelecimento">Estabelecimento</Label>      quando: transacao.quando ? format(new Date(transacao.quando), 'yyyy-MM-dd') : '',

                <Input      estabelecimento: transacao.estabelecimento || '',

                  id="estabelecimento"      valor: transacao.valor?.toString() || '',

                  value={formData.estabelecimento}      detalhes: transacao.detalhes || '',

                  onChange={(e) => setFormData(prev => ({ ...prev, estabelecimento: e.target.value }))}      tipo: transacao.tipo || '',

                  placeholder="Nome do estabelecimento"      category_id: transacao.category_id || ''

                />    })

              </div>    setDialogOpen(true)

  }

              <div className="grid grid-cols-2 gap-4">

                <div>  // Salvar transação

                  <Label htmlFor="valor">Valor</Label>  const handleSave = async () => {

                  <CurrencyInput    if (!user) return

                    id="valor"

                    value={formData.valor}    try {

                    onChange={(value) => setFormData(prev => ({ ...prev, valor: String(value || 0) }))}      const transactionData = {

                    placeholder="0,00"        quando: formData.quando || null,

                  />        estabelecimento: formData.estabelecimento || null,

                </div>        valor: parseFloat(formData.valor) || null,

        detalhes: formData.detalhes || null,

                <div>        tipo: formData.tipo || null,

                  <Label htmlFor="tipo">Tipo</Label>        category_id: formData.category_id || null,

                  <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>        userid: user.id

                    <SelectTrigger>      }

                      <SelectValue placeholder="Selecione o tipo" />

                    </SelectTrigger>      if (editingTransaction) {

                    <SelectContent>        const { error } = await supabase

                      <SelectItem value="receita">Receita</SelectItem>          .from('transacoes')

                      <SelectItem value="despesa">Despesa</SelectItem>          .update(transactionData)

                    </SelectContent>          .eq('id', editingTransaction.id)

                  </Select>

                </div>        if (error) throw error

              </div>

        toast({

              <div>          title: "Sucesso",

                <Label htmlFor="category">Categoria</Label>          description: "Transação atualizada com sucesso!"

                <CategorySelector        })

                  value={formData.category_id}      } else {

                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}        const { error } = await supabase

                />          .from('transacoes')

              </div>          .insert([transactionData])



              <div>        if (error) throw error

                <Label htmlFor="detalhes">Detalhes</Label>

                <Textarea        toast({

                  id="detalhes"          title: "Sucesso", 

                  value={formData.detalhes}          description: "Transação criada com sucesso!"

                  onChange={(e) => setFormData(prev => ({ ...prev, detalhes: e.target.value }))}        })

                  placeholder="Observações adicionais"      }

                />

              </div>      setDialogOpen(false)

      fetchTransacoes()

              <div className="flex justify-end gap-2">      resetForm()

                <Button variant="outline" onClick={() => setDialogOpen(false)}>    } catch (error) {

                  Cancelar      console.error('Erro ao salvar:', error)

                </Button>      toast({

                <Button onClick={handleSave}>        title: "Erro",

                  {editingTransaction ? 'Atualizar' : 'Salvar'}        description: "Erro ao salvar transação",

                </Button>        variant: "destructive"

              </div>      })

            </div>    }

          </DialogContent>  }

        </Dialog>

      </div>  // Excluir transação

  const handleDelete = async (id: number, transactionName?: string) => {

      {/* Calendar */}    if (!user) {

      <Card>      toast({

        <CardHeader>        title: "Erro",

          <div className="flex items-center justify-between">        description: "Usuário não autenticado",

            <Button variant="outline" size="sm" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>        variant: "destructive"

              <ChevronLeft className="h-4 w-4" />      })

            </Button>      return

            <h3 className="text-lg font-semibold">    }

              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}

            </h3>    // Confirmar exclusão

            <Button variant="outline" size="sm" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>    const confirmDelete = window.confirm(

              <ChevronRight className="h-4 w-4" />      `Tem certeza que deseja excluir a transação "${transactionName || 'Sem nome'}"?`

            </Button>    )

          </div>    

        </CardHeader>    if (!confirmDelete) return

        <CardContent>

          {/* Calendar Grid */}    try {

          <div className="grid grid-cols-7 gap-2">      console.log('Excluindo transação:', { id, userId: user.id })

            {/* Days of week header */}

            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (      const { data, error } = await supabase

              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">        .from('transacoes')

                {day}        .delete()

              </div>        .eq('id', id)

            ))}        .eq('userid', user.id) // Garantir que só exclui transações do próprio usuário

                    .select()

            {/* Calendar Days */}

            {daysToShow.map((day) => {      if (error) {

              const dayTransactions = getTransactionsForDate(day)        console.error('Erro do Supabase:', error)

              const totalReceitas = dayTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + (t.valor || 0), 0)        throw error

              const totalDespesas = dayTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Math.abs(t.valor || 0), 0)      }

              const isToday = isSameDay(day, new Date())

              const isCurrentMonth = isSameMonth(day, currentDate)      console.log('Transação excluída:', data)



              return (      if (data && data.length > 0) {

                <Card         toast({

                  key={day.toString()}           title: "Sucesso",

                  className={`min-h-[120px] cursor-pointer hover:bg-accent/50 transition-all duration-200 ${          description: `Transação "${transactionName || 'Sem nome'}" excluída com sucesso!`

                    isToday ? 'ring-2 ring-primary' : ''        })

                  } ${        fetchTransacoes()

                    !isCurrentMonth ? 'opacity-50' : ''      } else {

                  }`}        console.warn('Nenhuma transação foi excluída')

                  onClick={() => openNewTransaction(day)}        toast({

                >          title: "Aviso",

                  <CardContent className="p-2">          description: "Nenhuma transação foi encontrada para excluir",

                    <div className="flex items-center justify-between mb-2">          variant: "destructive"

                      <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>        })

                        {format(day, 'd', { locale: ptBR })}      }

                      </span>    } catch (error) {

                      {dayTransactions.length > 0 && (      console.error('Erro ao excluir:', error)

                        <Badge variant="secondary" className="text-xs">      toast({

                          {dayTransactions.length}        title: "Erro",

                        </Badge>        description: `Erro ao excluir transação: ${error.message || 'Erro desconhecido'}`,

                      )}        variant: "destructive"

                    </div>      })

    }

                    {/* Transaction Summary */}  }

                    {(totalReceitas > 0 || totalDespesas > 0) && (

                      <div className="space-y-1 text-xs">  // Mover transação para nova data

                        {totalReceitas > 0 && (  const handleMoveTransaction = async (transactionId: number, newDate: Date) => {

                          <div className="flex items-center gap-1 text-green-600">    if (!user) {

                            <TrendingUp className="h-3 w-3" />      toast({

                            <span>R$ {totalReceitas.toFixed(2)}</span>        title: "Erro",

                          </div>        description: "Usuário não autenticado",

                        )}        variant: "destructive"

                        {totalDespesas > 0 && (      })

                          <div className="flex items-center gap-1 text-red-600">      return

                            <TrendingDown className="h-3 w-3" />    }

                            <span>R$ {totalDespesas.toFixed(2)}</span>

                          </div>    try {

                        )}      // CORREÇÃO DEFINITIVA: usar componentes diretos da data local

                      </div>      const year = newDate.getFullYear()

                    )}      const month = String(newDate.getMonth() + 1).padStart(2, '0')

      const day = String(newDate.getDate()).padStart(2, '0')

                    {/* Transaction List */}      const newDateString = `${year}-${month}-${day}`

                    <div className="mt-2 space-y-1">      

                      {dayTransactions.slice(0, 2).map((transaction) => (      console.log('=== MOVENDO TRANSAÇÃO (DIRETO) ===')

                        <div      console.log('Data original:', newDate.toString())

                          key={transaction.id}      console.log('Componentes extraídos:', { year, month, day })

                          className="text-xs p-1 rounded bg-muted/50 truncate"      console.log('String final para BD:', newDateString)

                          onClick={(e) => {      console.log('Data para exibição:', `${day}/${month}/${year}`)

                            e.stopPropagation()

                            setEditingTransaction(transaction)      const { data, error } = await supabase

                            setFormData({        .from('transacoes')

                              quando: transaction.quando ? format(new Date(transaction.quando), 'yyyy-MM-dd') : '',        .update({ quando: newDateString })

                              estabelecimento: transaction.estabelecimento || '',        .eq('id', transactionId)

                              valor: String(transaction.valor || ''),        .eq('userid', user.id) // Garantir que só move transações do próprio usuário

                              detalhes: transaction.detalhes || '',        .select()

                              tipo: transaction.tipo || 'despesa',

                              category_id: transaction.category_id || ''      if (error) {

                            })        console.error('Erro do Supabase:', error)

                            setDialogOpen(true)        throw error

                          }}      }

                        >

                          <div className="font-medium">{transaction.estabelecimento}</div>      console.log('Transação atualizada com sucesso!')

                          <div className={transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>

                            R$ {Math.abs(transaction.valor || 0).toFixed(2)}      if (data && data.length > 0) {

                          </div>        toast({

                        </div>          title: "Sucesso",

                      ))}          description: `Transação movida para ${day}/${month}/${year}!`

                      {dayTransactions.length > 2 && (        })

                        <div className="text-xs text-muted-foreground text-center">        fetchTransacoes()

                          +{dayTransactions.length - 2} mais      } else {

                        </div>        console.warn('Nenhuma transação foi atualizada')

                      )}        toast({

                    </div>          title: "Aviso",

                  </CardContent>          description: "Nenhuma transação foi encontrada para mover",

                </Card>          variant: "destructive"

              )        })

            })}      }

          </div>    } catch (error) {

        </CardContent>      console.error('Erro ao mover transação:', error)

      </Card>      toast({

    </div>        title: "Erro",

  )        description: `Erro ao mover transação: ${error.message || 'Erro desconhecido'}`,

}        variant: "destructive"
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingTransaction ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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