import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '/src/components/ui/card'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Textarea } from '/src/components/ui/textarea'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { MessageSquare, Send } from 'lucide-react'

export default function Feedback() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    assunto: '',
    mensagem: '',
    tipo: 'sugestao' as 'sugestao' | 'bug' | 'elogio'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.assunto.trim() || !formData.mensagem.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id,
          assunto: formData.assunto,
          mensagem: formData.mensagem,
          tipo: formData.tipo,
          status: 'novo',
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Seu feedback foi enviado. Obrigado pela contribuição!",
      })

      setFormData({
        assunto: '',
        mensagem: '',
        tipo: 'sugestao'
      })
    } catch (error: any) {
      toast({
        title: "Erro ao enviar feedback",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Feedback
        </h1>
        <p className="text-muted-foreground mt-2">
          Sua opinião é importante para nós! Compartilhe sugestões, reporte bugs ou deixe um elogio.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-lg">💡 Sugestões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ideias para melhorar a plataforma
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-lg">🐛 Bugs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Relatar problemas que encontrou
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-lg">⭐ Elogios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deixe um elogio sobre a experiência
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enviar Feedback</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para nos contatar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Feedback *</Label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="sugestao">💡 Sugestão</option>
                <option value="bug">🐛 Bug/Problema</option>
                <option value="elogio">⭐ Elogio</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assunto">Assunto *</Label>
              <Input
                id="assunto"
                name="assunto"
                placeholder="Qual é o assunto do seu feedback?"
                value={formData.assunto}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem">Mensagem *</Label>
              <Textarea
                id="mensagem"
                name="mensagem"
                placeholder="Descreva detalhadamente seu feedback..."
                value={formData.mensagem}
                onChange={handleChange}
                disabled={loading}
                className="min-h-40"
              />
              <p className="text-xs text-muted-foreground">
                {formData.mensagem.length}/1000 caracteres
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">📧 Contato Direto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Para assuntos urgentes ou sensíveis, você também pode nos contatar através do email:
          </p>
          <a 
            href="mailto:contact@finance-app.com"
            className="text-primary hover:underline font-medium"
          >
            contact@finance-app.com
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
