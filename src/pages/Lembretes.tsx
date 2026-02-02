import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react'

interface Lembrete {
  id: string
  created_at: string
  userid: string | null
  titulo: string | null
  descricao: string | null
  data: string | null
  valor: number | null
}

export default function Lembretes() {
  const { user } = useAuth()
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLembrete, setEditingLembrete] = useState<Lembrete | null>(null)
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: '',
    valor: '',
  })

  useEffect(() => {
    if (user) {
      fetchLembretes()
    }
  }, [user])

  const fetchLembretes = async () => {
    try {
      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('userid', user?.id)
        .order('data', { ascending: true })

      if (error) throw error
      setLembretes(data || [])
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lembretes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const lembreteData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        data: formData.data,
        valor: formData.valor ? parseFloat(formData.valor) : 0,
        userid: user?.id,
      }

      if (editingLembrete) {
        const { error } = await supabase
          .from('lembretes')
          .update(lembreteData)
          .eq('id', editingLembrete.id)

        if (error) throw error
        toast({ title: "Lembrete atualizado com sucesso!" })
      } else {
        const { error } = await supabase
          .from('lembretes')
          .insert([lembreteData])

        if (error) throw error
        toast({ title: "Lembrete adicionado com sucesso!" })
      }

      setDialogOpen(false)
      setEditingLembrete(null)
      setFormData({
        titulo: '',
        descricao: '',
        data: '',
        valor: '',
      })
      fetchLembretes()
    } catch (error: any) {
      toast({
        title: "Erro ao salvar lembrete",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (lembrete: Lembrete) => {
    setEditingLembrete(lembrete)
    setFormData({
      titulo: lembrete.titulo || '',
      descricao: lembrete.descricao || '',
      data: lembrete.data ? lembrete.data.split('T')[0] : '',
      valor: lembrete.valor ? lembrete.valor.toString() : '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return

    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: "Lembrete excluído com sucesso!" })
      fetchLembretes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lembrete",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('userid', user?.id)

      if (error) throw error
      toast({ title: "Todos os lembretes foram excluídos com sucesso!" })
      fetchLembretes()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lembretes",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const isToday = (dateString: string) => {
    const today = new Date()
    const date = new Date(dateString)
    return date.toDateString() === today.toDateString()
  }

  const getDateStatus = (dateString: string) => {
    if (isOverdue(dateString)) {
      return { variant: 'destructive' as const, label: 'Vencido' }
    }
    if (isToday(dateString)) {
      return { variant: 'default' as const, label: 'Hoje' }
    }
    const daysDiff = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      return { variant: 'secondary' as const, label: `${daysDiff} dias` }
    }
    return { variant: 'outline' as const, label: formatDate(dateString) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Lembretes</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie seus lembretes de pagamentos e compromissos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {lembretes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Remover Todos</span>
                  <span className="sm:hidden">Remover</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover todos os lembretes</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá remover permanentemente todos os seus lembretes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover Todos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Novo Lembrete</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-black/70 backdrop-blur-sm border-primary/20">
              {/* Header com gradiente */}
              <DialogHeader className="bg-gradient-to-r from-primary/10 to-transparent p-4 -m-6 mb-4 border-b border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {editingLembrete ? 'Editar Lembrete' : 'Novo Lembrete'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {editingLembrete 
                        ? 'Faça as alterações necessárias no lembrete.' 
                        : 'Adicione um novo lembrete importante.'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="titulo" className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Título
                  </Label>
                  <Input
                    id="titulo"
                    type="text"
                    placeholder="Ex: Pagar conta de luz, Aniversário da Maria..."
                    className="bg-background/50"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao" className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descrição
                  </Label>
                  <Textarea
                    id="descricao"
                    placeholder="Adicione mais detalhes sobre o lembrete..."
                    className="bg-background/50"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Data
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    className="bg-background/50"
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor" className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Valor (opcional)
                  </Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="bg-background/50"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  />
                </div>
                
                <div className="bg-secondary/30 -mx-6 -mb-6 p-4 border-t border-border/50">
                  <Button type="submit" className="w-full gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingLembrete ? 'Atualizar' : 'Adicionar'} Lembrete
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lembretes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum lembrete encontrado</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                Adicionar primeiro lembrete
              </Button>
            </CardContent>
          </Card>
        ) : (
          lembretes.map((lembrete) => {
            const dateStatus = lembrete.data ? getDateStatus(lembrete.data) : null
            const isLate = lembrete.data && isOverdue(lembrete.data)
            return (
              <Card key={lembrete.id} className={`overflow-hidden border-l-4 hover:shadow-lg transition-all ${
                isLate ? 'border-l-red-500' : 'border-l-primary'
              }`}>
                <CardContent className="p-0">
                  {/* Header com gradiente */}
                  <div className={`bg-gradient-to-r p-4 border-b border-border/50 ${
                    isLate ? 'from-red-500/20 to-red-500/5' : 'from-primary/10 to-transparent'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isLate ? 'bg-red-500/20' : 'bg-primary/20'
                      }`}>
                        <Calendar className={`h-6 w-6 ${isLate ? 'text-red-500' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base">{lembrete.titulo}</h3>
                          {dateStatus && (
                            <Badge variant={dateStatus.variant} className="text-xs">
                              {dateStatus.label}
                            </Badge>
                          )}
                        </div>
                        {lembrete.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{lembrete.descricao}</p>
                        )}
                        {lembrete.valor && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Valor: <span className="font-semibold text-foreground">{formatCurrency(lembrete.valor)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      {lembrete.data && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(lembrete.data)}</span>
                        </div>
                      )}
                      
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(lembrete)}
                          className="h-8 gap-2"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(lembrete.id)}
                          className="h-8 gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
