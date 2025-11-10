
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PhoneInput } from '@/components/ui/phone-input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm'
import { SubscriptionInfo } from '@/components/profile/SubscriptionInfo'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Camera, User, Trash2, Settings, CreditCard, Shield } from 'lucide-react'
import { validateWhatsAppNumber } from '@/utils/whatsapp'
import { useNavigate } from 'react-router-dom'

interface Profile {
  nome: string
  phone: string
  whatsapp?: string
  avatar_url?: string
}

export default function Perfil() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({
    nome: '',
    phone: '',
  })
  const [currentCountryCode, setCurrentCountryCode] = useState('+55')
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, phone, whatsapp, avatar_url')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setProfile({
          nome: data.nome || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          avatar_url: data.avatar_url
        })

        // Parse the phone number to separate country code and number
        const phone = data.phone || ''
        if (phone) {
          // Check if phone starts with +
          if (phone.startsWith('+')) {
            // Extract country code and number for phones like "+5511999999999"
            const brazilMatch = phone.match(/^(\+55)(.*)$/)
            const usMatch = phone.match(/^(\+1)(.*)$/)
            const argMatch = phone.match(/^(\+54)(.*)$/)
            const generalMatch = phone.match(/^(\+\d{1,4})(.*)$/)
            
            if (brazilMatch) {
              setCurrentCountryCode('+55')
              setCurrentPhoneNumber(brazilMatch[2])
            } else if (usMatch) {
              setCurrentCountryCode('+1')
              setCurrentPhoneNumber(usMatch[2])
            } else if (argMatch) {
              setCurrentCountryCode('+54')
              setCurrentPhoneNumber(argMatch[2])
            } else if (generalMatch) {
              setCurrentCountryCode(generalMatch[1])
              setCurrentPhoneNumber(generalMatch[2])
            } else {
              setCurrentCountryCode('+55')
              setCurrentPhoneNumber(phone)
            }
          } else {
            // Se não tem +, verificar se já começa com código do país
            const cleanPhone = phone.replace(/\D/g, '')
            
            if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
              // Número brasileiro com código 55 já incluído
              setCurrentCountryCode('+55')
              setCurrentPhoneNumber(cleanPhone.substring(2)) // Remove os primeiros 2 dígitos (55)
            } else if (cleanPhone.startsWith('1') && cleanPhone.length >= 10) {
              // Número americano
              setCurrentCountryCode('+1')
              setCurrentPhoneNumber(cleanPhone.substring(1))
            } else {
              // Assumir Brasil por padrão
              setCurrentCountryCode('+55')
              setCurrentPhoneNumber(cleanPhone)
            }
          }
        } else {
          setCurrentCountryCode('+55')
          setCurrentPhoneNumber('')
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função de teste para debug
  const testSupabaseConnection = async () => {
    console.log('🧪 Testando conexão Supabase...')
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
      
      console.log('✅ Conexão Supabase OK:', { data, error })
      
      if (user) {
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        console.log('👤 Perfil do usuário atual:', { userProfile, userError })
      }
      
    } catch (err) {
      console.error('❌ Erro na conexão Supabase:', err)
    }
  }

  // Expor função de teste globalmente para debug
  ;(window as any).testSupabaseConnection = testSupabaseConnection

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Only combine if we have both country code and phone number
      let fullPhone = ''
      let whatsappId = profile.whatsapp
      
      if (currentPhoneNumber.trim()) {
        // Remove todos os caracteres não numéricos e o + do código do país
        const cleanNumber = currentPhoneNumber.replace(/\D/g, '')
        const cleanCountryCode = currentCountryCode.replace('+', '')
        
        // Se o número já começar com o código do país, não duplicar
        if (cleanNumber.startsWith(cleanCountryCode)) {
          fullPhone = '+' + cleanNumber
        } else {
          fullPhone = currentCountryCode + cleanNumber
        }
        
        // Tentar validar o WhatsApp para garantir que o sufixo esteja correto
        console.log('Validando WhatsApp para número:', fullPhone)
        console.log('Número limpo para validação:', fullPhone.replace('+', ''))
        
        try {
          const whatsappValidation = await validateWhatsAppNumber(fullPhone.replace('+', ''))
          
          if (whatsappValidation.exists) {
            whatsappId = whatsappValidation.whatsappId
            console.log('WhatsApp ID obtido:', whatsappId)
          } else {
            // Se WhatsApp não existe, criar ID genérico com sufixo
            whatsappId = fullPhone.replace('+', '') + '@s.whatsapp.net'
            console.log('WhatsApp não encontrado, usando ID genérico:', whatsappId)
            
            toast({
              title: "Aviso",
              description: "Número salvo, mas não foi possível validar WhatsApp. Você pode tentar novamente mais tarde.",
              variant: "default",
            })
          }
        } catch (error: any) {
          // Se a validação falhar, criar ID genérico com sufixo
          whatsappId = fullPhone.replace('+', '') + '@s.whatsapp.net'
          console.log('Erro na validação WhatsApp, usando ID genérico:', whatsappId)
          console.error('Erro na validação:', error)
          
          toast({
            title: "Aviso", 
            description: "Número salvo, mas houve problema na validação WhatsApp. Você pode tentar validar novamente mais tarde.",
            variant: "default",
          })
        }
      } else {
        // Se não há número de telefone, limpar o WhatsApp ID
        whatsappId = undefined
      }

      console.log('Saving profile with phone:', fullPhone)
      console.log('Saving profile with whatsapp:', whatsappId)
      console.log('User ID:', user?.id)

      const updateData = {
        id: user?.id,
        nome: profile.nome,
        phone: fullPhone,
        whatsapp: whatsappId,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      }
      
      console.log('Dados para atualização:', updateData)

      // Primeiro tentar verificar se o perfil existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single()
      
      console.log('Perfil existente:', existingProfile)
      
      let data, error
      
      if (existingProfile) {
        // Perfil existe, fazer UPDATE
        console.log('Fazendo UPDATE do perfil existente...')
        const result = await supabase
          .from('profiles')
          .update({
            nome: updateData.nome,
            phone: updateData.phone,
            whatsapp: updateData.whatsapp,
            avatar_url: updateData.avatar_url,
            updated_at: updateData.updated_at,
          })
          .eq('id', user?.id)
          .select()
        
        data = result.data
        error = result.error
      } else {
        // Perfil não existe, fazer INSERT
        console.log('Fazendo INSERT de novo perfil...')
        const result = await supabase
          .from('profiles')
          .insert(updateData)
          .select()
        
        data = result.data
        error = result.error
      }

      console.log('Resposta do Supabase - data:', data)
      console.log('Resposta do Supabase - error:', error)

      if (error) {
        console.error('Erro detalhado do Supabase:', error)
        console.error('Código do erro:', error.code)
        console.error('Mensagem do erro:', error.message)
        console.error('Detalhes do erro:', error.details)
        throw error
      }
      
      console.log('✅ Perfil salvo com sucesso no Supabase!')
      
      // Update local state
      setProfile(prev => ({ ...prev, phone: fullPhone, whatsapp: whatsappId }))
      
      toast({ 
        title: "Perfil atualizado com sucesso!",
        description: `Telefone: ${fullPhone} | WhatsApp: ${whatsappId}`
      })
    } catch (error: any) {
      console.error('❌ Erro completo ao atualizar perfil:', error)
      
      // Detectar tipo de erro específico
      let errorMessage = error.message || 'Erro desconhecido'
      let errorDetails = ''
      
      if (error.code === 'PGRST301') {
        errorMessage = 'Problema de permissão no banco de dados'
        errorDetails = 'Verifique se as políticas RLS estão configuradas corretamente'
      } else if (error.message?.includes('row-level security')) {
        errorMessage = 'Problema de segurança no banco de dados'
        errorDetails = 'Execute a migração SQL para corrigir as políticas RLS'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Problema de conexão'
        errorDetails = 'Verifique sua conexão com a internet'
      }
      
      toast({
        title: "Erro ao atualizar perfil",
        description: `${errorMessage}. ${errorDetails}`,
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
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user?.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      
      toast({ title: "Avatar atualizado com sucesso!" })
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePhoneChange = (phone: string) => {
    console.log('Phone changed to:', phone)
    setCurrentPhoneNumber(phone)
  }

  const handleCountryChange = (country_code: string) => {
    console.log('Country code changed to:', country_code)
    setCurrentCountryCode(country_code)
  }

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      toast({
        title: "Erro",
        description: "O email de confirmação não confere",
        variant: "destructive",
      })
      return
    }

    setDeleting(true)

    try {
      // First delete all user data from profiles table
      console.log('Deletando perfil do usuário...')
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id)

      if (profileError) {
        console.error('Erro ao deletar perfil:', profileError)
        throw profileError
      }

      // Delete all user transactions
      console.log('Deletando transações do usuário...')
      const { error: transacoesError } = await supabase
        .from('transacoes')
        .delete()
        .eq('userId', user?.id)

      if (transacoesError) {
        console.error('Erro ao deletar transações:', transacoesError)
        throw transacoesError
      }

      // Delete all user reminders
      console.log('Deletando lembretes do usuário...')
      const { error: lembretesError } = await supabase
        .from('lembretes')
        .delete()
        .eq('userId', user?.id)

      if (lembretesError) {
        console.error('Erro ao deletar lembretes:', lembretesError)
        throw lembretesError
      }

      console.log('Dados do usuário deletados com sucesso')

      toast({
        title: "Conta removida com sucesso",
        description: "Sua conta e todos os dados foram permanentemente removidos",
      })

      // Sign out and redirect
      await signOut()
      navigate('/auth')
    } catch (error: any) {
      console.error('Erro completo ao remover conta:', error)
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setConfirmEmail('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Gerencie suas informações pessoais, assinatura e configurações de segurança</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm lg:w-[400px]">
          <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Perfil</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Assinatura</span>
            <span className="sm:hidden">Plano</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Segurança</span>
            <span className="sm:hidden">Seg.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {profile.nome ? getInitials(profile.nome) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{profile.nome || 'Sem nome'}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {profile.whatsapp && (
                    <p className="text-sm text-green-600 mt-1">WhatsApp: {profile.whatsapp}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input
                      id="nome"
                      value={profile.nome}
                      onChange={(e) => setProfile(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <PhoneInput
                      id="phone"
                      value={currentPhoneNumber}
                      countryCode={currentCountryCode}
                      onValueChange={handlePhoneChange}
                      onCountryChange={handleCountryChange}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full md:w-auto"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionInfo />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ChangePasswordForm />

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A remoção da conta é permanente e não pode ser desfeita. Todos os seus dados, incluindo transações e lembretes, serão permanentemente apagados.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover Conta Permanentemente
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Remoção de Conta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é irreversível. Todos os seus dados serão permanentemente apagados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirm-email">
                          Digite seu email para confirmar: <span className="font-semibold">{user?.email}</span>
                        </Label>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder="Confirme seu email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel
                        onClick={() => setConfirmEmail('')}
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleting || confirmEmail !== user?.email}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? 'Removendo...' : 'Remover Conta'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
