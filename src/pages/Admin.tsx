import { useState, useEffect } from 'react'
import { useAdmin } from '@/hooks/useAdmin'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Users,
  Shield, 
  Calendar, 
  Filter, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  UserPlus
} from "lucide-react"
import { useToast } from '@/hooks/use-toast'
import { Navigate } from 'react-router-dom'

interface User {
  id: string
  nome: string
  email: string
  cpf?: string
  endereco?: string
  n_endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  pais?: string
  assinaturaId?: string
  role: 'admin' | 'user' | 'premium'
  subscription_status: 'free' | 'premium' | 'cancelled' | 'expired'
  created_at: string
  last_login: string
  is_active: boolean
}

interface UserFormData extends User {
  password?: string
}

export default function Admin() {
  const { isAdmin, loading: adminLoading, userRole } = useAdmin()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserFormData | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    if (selectedUser) {
      setSelectedUser({...selectedUser, cpf: formatted})
    }
  }

  // Debug - vamos ver o que está acontecendo
  console.log('Admin Debug:', { isAdmin, adminLoading, userRole })

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  // Verificação de permissões após todos os hooks
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para acessar esta área.
          </p>
          <p className="text-sm text-muted-foreground">
            Role atual: {userRole || 'não definido'}
          </p>
          <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const createUser = async (userData: UserFormData) => {
    try {
      // Usar senha fornecida ou gerar temporária
      const password = userData.password || Math.random().toString(36).slice(-8) + 'A1!'
      
      // Criar usuário no Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nome: userData.nome
        }
      })
      
      if (authError) throw authError
      
      // Atualizar o perfil com as informações adicionais
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nome: userData.nome,
          cpf: userData.cpf,
          endereco: userData.endereco,
          n_endereco: userData.n_endereco,
          bairro: userData.bairro,
          cidade: userData.cidade,
          estado: userData.estado,
          pais: userData.pais,
          assinaturaId: userData.assinaturaId,
          role: userData.role,
          subscription_status: userData.subscription_status,
          is_active: userData.is_active
        })
        .eq('id', authUser.user.id)
      
      if (profileError) throw profileError
      
      toast({
        title: 'Usuário criado',
        description: userData.password 
          ? 'Novo usuário criado com sucesso!'
          : 'Novo usuário criado com sucesso! Uma senha temporária foi gerada.'
      })
      
      loadUsers()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const updateUser = async (userId: string, updates: UserFormData) => {
    try {
      // Se uma nova senha foi fornecida, atualize no Auth
      if (updates.password) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: updates.password }
        )
        if (authError) throw authError
      }
      
      // Atualizar dados do perfil (remover password antes de enviar)
      const { password, ...profileUpdates } = updates
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId)

      if (error) throw error

      toast({
        title: 'Usuário atualizado',
        description: updates.password 
          ? 'Usuário e senha atualizados com sucesso!'
          : 'Usuário atualizado com sucesso!'
      })

      loadUsers()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.'
      })

      loadUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.subscription_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'premium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'premium': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'cancelled': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - Mesmo padrão das outras páginas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Administração</h2>
          <p className="text-muted-foreground">
            Gerencie usuários e configurações do sistema
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="free">Gratuito</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          
          <Button 
            onClick={() => {
              setSelectedUser({
                id: '',
                nome: '',
                email: '',
                cpf: '',
                endereco: '',
                n_endereco: '',
                bairro: '',
                cidade: '',
                estado: '',
                pais: '',
                role: 'user',
                subscription_status: 'free',
                created_at: new Date().toISOString(),
                last_login: '',
                is_active: true,
                password: ''
              })
              setIsEditDialogOpen(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compacto */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Usuários</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Premium</p>
              <p className="text-2xl font-bold">{users.filter(u => u.subscription_status === 'premium').length}</p>
            </div>
            <Shield className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Ativos</p>
              <p className="text-2xl font-bold">{users.filter(u => u.is_active).length}</p>
            </div>
            <Users className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Admins</p>
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <Shield className="h-8 w-8 text-red-200" />
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-semibold">
                            {(user.nome || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{user.nome || 'Nome não informado'}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'premium' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : user.role === 'premium' ? 'Premium' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscription_status === 'premium' ? 'default' : 'outline'}>
                          {user.subscription_status === 'premium' ? 'Premium' : 'Gratuito'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <span className={user.is_active ? 'text-green-600' : 'text-gray-500'}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsEditDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.id ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {selectedUser?.id 
                ? 'Faça as alterações necessárias no usuário selecionado.'
                : 'Preencha as informações para criar um novo usuário no sistema.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4 overflow-y-auto">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedUser.email || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    className="col-span-3"
                    disabled={!!selectedUser.id}
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right font-medium">Nome</Label>
                  <Input
                    id="name"
                    value={selectedUser.nome || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, nome: e.target.value})}
                    className="col-span-3"
                    placeholder="Nome completo do usuário"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right font-medium">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={selectedUser.password || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, password: e.target.value})}
                    className="col-span-3"
                    placeholder={selectedUser.id ? "Nova senha (deixe vazio para manter atual)" : "Digite uma senha"}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cpf" className="text-right font-medium">CPF</Label>
                  <Input
                    id="cpf"
                    value={selectedUser.cpf || ''}
                    onChange={handleCPFChange}
                    className="col-span-3"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endereco" className="text-right font-medium">Endereço</Label>
                  <Input
                    id="endereco"
                    value={selectedUser.endereco || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, endereco: e.target.value})}
                    className="col-span-3"
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="n_endereco" className="text-right font-medium">Nº</Label>
                  <Input
                    id="n_endereco"
                    value={selectedUser.n_endereco || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, n_endereco: e.target.value})}
                    className="col-span-3"
                    placeholder="Número do endereço"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bairro" className="text-right font-medium">Bairro</Label>
                  <Input
                    id="bairro"
                    value={selectedUser.bairro || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, bairro: e.target.value})}
                    className="col-span-3"
                    placeholder="Bairro"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cidade" className="text-right font-medium">Cidade</Label>
                  <Input
                    id="cidade"
                    value={selectedUser.cidade || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, cidade: e.target.value})}
                    className="col-span-3"
                    placeholder="Cidade"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="estado" className="text-right font-medium">Estado</Label>
                  <Input
                    id="estado"
                    value={selectedUser.estado || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, estado: e.target.value})}
                    className="col-span-3"
                    placeholder="SP, RJ, MG..."
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pais" className="text-right font-medium">País</Label>
                  <Input
                    id="pais"
                    value={selectedUser.pais || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, pais: e.target.value})}
                    className="col-span-3"
                    placeholder="Brasil"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assinaturaId" className="text-right font-medium">ID Assinatura</Label>
                  <Input
                    id="assinaturaId"
                    value={selectedUser.assinaturaId || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, assinaturaId: e.target.value})}
                    className="col-span-3"
                    placeholder="sub_xxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value: any) => setSelectedUser({...selectedUser, role: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subscription" className="text-right">Assinatura</Label>
                <Select 
                  value={selectedUser.subscription_status} 
                  onValueChange={(value: any) => setSelectedUser({...selectedUser, subscription_status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">Status</Label>
                <Select 
                  value={selectedUser.is_active ? 'true' : 'false'} 
                  onValueChange={(value) => setSelectedUser({...selectedUser, is_active: value === 'true'})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedUser.id) {
                      updateUser(selectedUser.id, selectedUser)
                    } else {
                      createUser(selectedUser)
                    }
                  }}
                >
                  {selectedUser.id ? 'Salvar Alterações' : 'Criar Usuário'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}