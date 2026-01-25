import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LoginFormProps {
  onForgotPassword: () => void
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Verificar se é erro de CORS
        if (error.message.includes('fetch') || error.message.includes('CORS')) {
          toast({
            title: "⚠️ Erro de Conexão (CORS)",
            description: "O servidor Supabase não está configurado para aceitar conexões do localhost. Configure as variáveis de ambiente no Easypanel conforme o arquivo CORRECAO-CORS-SUPABASE.md",
            variant: "destructive",
            duration: 10000,
          })
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      // Verificar se é erro de CORS
      if (error.message?.includes('fetch') || error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        toast({
          title: "⚠️ Erro de Conexão (CORS)",
          description: "O servidor Supabase não está configurado para aceitar conexões do localhost. Solução: Configure CORS no Easypanel ou use um proxy local.",
          variant: "destructive",
          duration: 10000,
        })
      } else {
        toast({
          title: "Erro no login",
          description: error.message || "Ocorreu um erro ao fazer login",
          variant: "destructive",
        })
      }
    }

    setLoading(false)
  }

  const handleSubscribeClick = () => {
    navigate('/plano')
  }

  return (
    <div className="w-full lg:min-w-[470px] mx-auto">
      <div className="text-start py-8">
        <h1 className="text-lg font-bold text-slate-800 mb-2 dark:text-slate-300">
          Bem-vindo de volta
        </h1>
        <p className="text-base text-muted-foreground">
          Entre na sua conta para continuar
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
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>
      
      <div className="mt-6 space-y-4 text-center">
        <Button
          onClick={handleSubscribeClick}
          variant="outline"
          className="w-full h-11 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Adquira já
        </Button>
        
        <Button
          variant="link"
          onClick={onForgotPassword}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Esqueceu sua senha?
        </Button>
      </div>
    </div>
  )
}
