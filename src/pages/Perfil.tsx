import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '/src/components/ui/card'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '/src/components/ui/avatar'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { Camera, Mail, MapPin, Briefcase, DollarSign } from 'lucide-react'
import { deriveDisplayName, deriveInitials } from '/src/utils/profile-display'

interface Profile {
  nome: string
  email: string
  phone?: string
  avatar_url?: string
  profissao?: string
  localizacao?: string
  renda_mensal?: number
}

export default function Perfil() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>({
    nome: '',
    email: user?.email || '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#3B82F6')
  const [stats, setStats] = useState({
    transacoes: 0,
    categorias: 0
  })

  const colors = [
    '#3B82F6', '#A855F7', '#22C55E', '#EF4444', 
    '#EC4899', '#06B6D4', '#EAB308', '#475569', 
    '#F97316', '#8B5CF6', '#14B8A6', '#10B981',
  ]

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchStats()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, phone, avatar_url, profissao, localizacao, renda_mensal')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error)
      }
      
      if (data) {
        setProfile({
          nome: deriveDisplayName({ profile: data, user }),
          email: user?.email || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url,
          profissao: data.profissao || '',
          localizacao: data.localizacao || '',
          renda_mensal: data.renda_mensal || 0
        })
      } else {
        // Se não existe perfil, usar dados do user
        setProfile({
          nome: deriveDisplayName({ user }),
          email: user?.email || '',
          phone: '',
          avatar_url: undefined,
          profissao: '',
          localizacao: '',
          renda_mensal: 0
        })
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Buscar total de transações do mês atual
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      
      const fimMes = new Date()
      fimMes.setMonth(fimMes.getMonth() + 1)
      fimMes.setDate(0)
      fimMes.setHours(23, 59, 59, 999)

      const { count: transacoesCount } = await supabase
        .from('transacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('data', inicioMes.toISOString())
        .lte('data', fimMes.toISOString())

      const { count: categoriasCount } = await supabase
        .from('categorias')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      setStats({
        transacoes: transacoesCount || 0,
        categorias: categoriasCount || 0
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Usar upsert para criar ou atualizar
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          nome: profile.nome,
          phone: profile.phone,
          profissao: profile.profissao,
          localizacao: profile.localizacao,
          renda_mensal: profile.renda_mensal,
          email: user?.email,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })

      if (error) throw error
      
      toast({ title: "Perfil atualizado com sucesso!" })
      await fetchProfile() // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer upload.')
      }

      const file = event.target.files[0]
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        if (e.target?.result) {
          const base64 = e.target.result as string
          
          // Usar upsert para garantir que salva
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: user?.id,
              avatar_url: base64,
              email: user?.email,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (error) throw error

          setProfile(prev => ({ ...prev, avatar_url: base64 }))
          toast({ title: "Foto atualizada com sucesso!" })
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Erro ao atualizar foto:', error)
      toast({
        title: "Erro ao atualizar foto",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return deriveInitials(name)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback 
                      className="text-2xl font-bold"
                      style={{ backgroundColor: selectedColor, color: 'white' }}
                    >
                      {getInitials(profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="default"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                </div>
                
                <div className="space-y-1 w-full">
                  <h2 className="text-xl font-bold uppercase tracking-wide">
                    {profile.nome || 'SEM NOME'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.profissao || 'Profissão não informada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Renda Mensal</span>
                <span className="font-medium text-green-600">
                  {profile.renda_mensal ? `R$ ${profile.renda_mensal.toLocaleString('pt-BR')}` : 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Transações este mês</span>
                <span className="font-medium">{stats.transacoes}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Categorias ativas</span>
                <span className="font-medium">{stats.categorias}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={profile.nome}
                      onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Não informado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="localizacao" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localização
                    </Label>
                    <Input
                      id="localizacao"
                      value={profile.localizacao || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, localizacao: e.target.value }))}
                      placeholder="Não informado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profissao" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Profissão
                    </Label>
                    <Input
                      id="profissao"
                      value={profile.profissao || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, profissao: e.target.value }))}
                      placeholder="Não informado"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renda_mensal" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Renda Mensal
                    </Label>
                    <Input
                      id="renda_mensal"
                      type="number"
                      step="0.01"
                      value={profile.renda_mensal || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, renda_mensal: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
