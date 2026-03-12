import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '/src/components/ui/card'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '/src/components/ui/avatar'
import { PhoneInput } from '/src/components/ui/phone-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '/src/components/ui/tabs'
import { ImageCropper } from '/src/components/profile/ImageCropper'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { Camera, User, Save } from 'lucide-react'
import { deriveDisplayName, deriveInitials } from '/src/utils/profile-display'

interface Profile {
  nome: string
  phone: string
  whatsapp?: string
  avatar_url?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>({
    nome: '',
    phone: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Estados para o crop de imagem
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [imageToEdit, setImageToEdit] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, phone, whatsapp, avatar_url')
        .eq('id', user?.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          nome: deriveDisplayName({ profile: data, user }),
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          avatar_url: data.avatar_url || '',
        })
      } else {
        setProfile({
          nome: deriveDisplayName({ user }),
          phone: '',
          whatsapp: '',
          avatar_url: '',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validações
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive'
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive'
      })
      return
    }

    // Ler arquivo como base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      if (typeof base64 === 'string') {
        setImageToEdit(base64)
        setShowImageCropper(true)
      }
    }
    reader.onerror = () => {
      toast({
        title: 'Erro',
        description: 'Erro ao ler a imagem',
        variant: 'destructive'
      })
    }
    reader.readAsDataURL(file)
  }

  const handleImageCropped = async (croppedBase64: string) => {
    try {
      setUploading(true)

      if (!croppedBase64) {
        throw new Error('Imagem inválida')
      }

      // Validar tamanho
      const MAX_SIZE = 6 * 1024 * 1024
      if (croppedBase64.length > MAX_SIZE) {
        throw new Error(`Imagem muito grande (${(croppedBase64.length / 1024 / 1024).toFixed(2)}MB). Limite: 6MB`)
      }

      // Salvar no banco de dados
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: croppedBase64 })
        .eq('id', user?.id)

      if (error) throw error

      // Atualizar estado local
      setProfile(prev => ({ ...prev, avatar_url: croppedBase64 }))
      setShowImageCropper(false)

      toast({
        title: 'Sucesso!',
        description: 'Avatar atualizado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar avatar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          nome: profile.nome,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
        })
        .eq('id', user?.id)

      if (error) throw error

      toast({
        title: 'Sucesso!',
        description: 'Perfil atualizado com sucesso',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar perfil',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return deriveInitials(name)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ImageCropper
        open={showImageCropper}
        imageSrc={imageToEdit}
        onCrop={handleImageCropped}
        onClose={() => setShowImageCropper(false)}
      />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Informações Pessoais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
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
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-primary"
                      disabled={uploading}
                      onClick={() => document.getElementById('photo-input')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{profile.nome || 'Sem nome'}</h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={profile.nome}
                      onChange={(e) => setProfile({ ...profile, nome: e.target.value })}
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <PhoneInput
                      value={profile.phone}
                      onChange={(value) => setProfile({ ...profile, phone: value })}
                      defaultCountry="BR"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <PhoneInput
                      value={profile.whatsapp || ''}
                      onChange={(value) => setProfile({ ...profile, whatsapp: value })}
                      defaultCountry="BR"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
