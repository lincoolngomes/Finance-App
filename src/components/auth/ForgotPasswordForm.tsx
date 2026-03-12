
import { useState } from 'react'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'

interface ForgotPasswordFormProps {
  onBack: () => void
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      })
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-start py-8">
        <h1 className="text-lg font-bold text-slate-800 mb-2 dark:text-slate-300">
          Recuperar Senha
        </h1>
        <p className="text-base text-muted-foreground">
          Digite seu email para receber as instruções de recuperação
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar instruções'
          )}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <Button
          variant="link"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Button>
      </div>
    </div>
  )
}
