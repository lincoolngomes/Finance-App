
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/hooks/useTheme'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Plano() {
  const { theme } = useTheme()
  const navigate = useNavigate()

  // Determine which logo to use based on theme
  const getLogoSrc = () => {
    if (theme === 'dark') {
      return '/lovable-uploads/bd48b065-36ce-4af8-926d-a1f05a2d43c5.png' // logo-black
    } else if (theme === 'light') {
      return '/lovable-uploads/b679a5ba-8a42-42cc-bc36-ccf4569fa05f.png' // logo-white
    } else {
      // System theme - check actual computed theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return isDark 
        ? '/lovable-uploads/bd48b065-36ce-4af8-926d-a1f05a2d43c5.png'
        : '/lovable-uploads/b679a5ba-8a42-42cc-bc36-ccf4569fa05f.png'
    }
  }

  const handleSubscribe = () => {
    window.open('https://www.asaas.com/c/vizvjmkoq90r80bc', '_blank')
  }

  const handleBackToLogin = () => {
    navigate('/auth')
  }

  const benefits = [
    'Registre gastos e receitas automaticamente',
    'Receba lembretes de contas e metas',
    'Tenha um assistente sempre pronto para ajudar'
  ]

  return (
    <div className="h-screen flex bg-background p-6">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-3xl">
        <img
          src="/lovable-uploads/7a9a766e-0b47-43d5-9605-b2ec2dcd0803.png"
          alt="Finance Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-8 left-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl font-bold text-white">Agora ficou fácil!</h2>
          </div>
          <p className="text-lg opacity-90">
            Gerencie suas finanças de forma simples e inteligente
          </p>
        </div>
      </div>

      {/* Right side - Plan Info */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Header with Logo and Theme Toggle */}
        <div className="absolute top-4 left-4 right-4 flex justify-end items-center">
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>

        <div className="grid w-full min-w-[480px] mt-16 justify-center gap-4">
          <div>
            <img 
              src={getLogoSrc()} 
              alt="FinanceFlow" 
              className="h-8 w-auto"
            />
          </div>
          
          <div className="w-full lg:min-w-[470px] mx-auto">
            <div className="text-start py-8">
              <h1 className="text-2xl font-bold text-slate-800 mb-2 dark:text-slate-300">
                Plano Agente Financeiro – R$29,99/mês
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Organize suas finanças de forma simples e inteligente!
              </p>

              {/* Benefits List */}
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-primary rounded-full p-1 mt-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-base text-foreground">{benefit}</p>
                  </div>
                ))}
              </div>

              {/* Impact Message */}
              <div className="bg-primary/10 rounded-lg p-4 mb-8">
                <p className="text-lg font-semibold text-primary text-center">
                  Invista no controle da sua vida financeira por menos de R$1 por dia!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={handleSubscribe}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-lg font-semibold"
                >
                  Assinar agora
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full h-11 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Voltar ao login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
