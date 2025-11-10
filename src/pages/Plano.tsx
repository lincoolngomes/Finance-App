
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
      return '/lovable-uploads/finance-logo-white.png' // logo branco para tema escuro
    }
    return '/lovable-uploads/finance-logo-full.png' // logo completo para tema claro
  }

  const handleSubscribe = () => {
    window.open('https://sandbox.asaas.com/c/wd9ab0oz9zwiorci', '_blank')
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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Image (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/lovable-uploads/7a9a766e-0b47-43d5-9605-b2ec2dcd0803.png"
          alt="Finance Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-3xl font-bold text-white mb-4">Agora ficou fácil!</h2>
          <p className="text-lg opacity-90">
            Gerencie suas finanças de forma simples e inteligente
          </p>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src={getLogoSrc()}
              alt="FinanceApp Logo"
              className="h-12 lg:h-16 mx-auto mb-6"
            />
          </div>

          {/* Content Card */}
          <Card className="shadow-xl">
            <CardContent className="p-6 lg:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
                  R$29,99/mês
                </h1>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Organize suas finanças de forma simples e inteligente!
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-3 mb-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-primary rounded-full p-1 mt-1 flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm lg:text-base text-foreground leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>

              {/* Impact Message */}
              <div className="bg-primary/10 rounded-lg p-4 mb-6">
                <p className="text-sm lg:text-base font-semibold text-primary text-center">
                  Invista no controle da sua vida financeira por menos de R$1 por dia!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubscribe}
                  className="w-full h-12 lg:h-11 bg-primary hover:bg-primary/90 text-base font-semibold"
                >
                  Assinar agora
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full h-12 lg:h-11 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Voltar ao login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
