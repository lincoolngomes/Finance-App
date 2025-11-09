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
  id: number
  created_at: string
  userid: string | null
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
        descricao: formData.descricao,
        data: formData.data,
        valor: formData.valor ? parseFloat(formData.valor) : null,
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
      descricao: lembrete.descricao || '',
      data: lembrete.data || '',
      valor: lembrete.valor?.toString() || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lembretes</h2>
          <p className="text-muted-foreground">Gerencie seus lembretes de pagamentos e compromissos</p>
        </div>
        <div className="flex gap-2">
          {lembretes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover Todos
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
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lembrete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingLembrete ? 'Editar Lembrete' : 'Novo Lembrete'}
                </DialogTitle>
                <DialogDescription>
                  {editingLembrete 
                    ? 'Faça as alterações necessárias no lembrete.' 
                    : 'Adicione um novo lembrete para não esquecer pagamentos importantes.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Ex: Pagar conta de luz, Aniversário da Maria..."
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data">Data</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({...formData, data: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (opcional)</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                  {editingLembrete ? 'Atualizar' : 'Adicionar'} Lembrete
                </Button>
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
            return (
              <Card key={lembrete.id} className={`hover:shadow-md transition-shadow ${
                lembrete.data && isOverdue(lembrete.data) ? 'border-destructive/50 bg-destructive/5 dark:border-destructive/30 dark:bg-destructive/10' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{lembrete.descricao}</h3>
                        {dateStatus && (
                          <Badge variant={dateStatus.variant}>
                            {dateStatus.label}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {lembrete.data && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Data: {formatDate(lembrete.data)}</span>
                          </div>
                        )}
                        {lembrete.valor && (
                          <p>Valor: {formatCurrency(lembrete.valor)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(lembrete)}
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(lembrete.id)}
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
