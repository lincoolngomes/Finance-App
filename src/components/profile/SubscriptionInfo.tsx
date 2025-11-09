
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSubscription } from '@/hooks/useSubscription'
import { formatCurrency, formatDate, getCycleLabel, isSubscriptionActive } from '@/utils/subscription'
import { CreditCard, Calendar, DollarSign, RefreshCw, Clock } from 'lucide-react'

export function SubscriptionInfo() {
  const { 
    subscriptionData, 
    loading, 
    error, 
    hasSubscription, 
    isActive,
    refreshSubscription
  } = useSubscription()

  const getStatusBadge = (status: string) => {
    const isActiveStatus = isSubscriptionActive(status)
    
    if (isActiveStatus) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600 font-semibold">✓ Ativo</Badge>
    }

    switch (status.toLowerCase()) {
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">Inativo</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500 text-white hover:bg-red-600">✗ Cancelado</Badge>
      case 'suspended':
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">⚠ Suspenso</Badge>
      case 'overdue':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">⏰ Em Atraso</Badge>
      case 'pending':
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">⏳ Pendente</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">{status}</Badge>
    }
  }

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase()
    if (brandLower.includes('visa')) return '💳'
    if (brandLower.includes('master')) return '💳'
    if (brandLower.includes('american')) return '💳'
    return '💳'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações da Assinatura
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshSubscription}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando informações da assinatura...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasSubscription || error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações da Assinatura
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshSubscription}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {error ? 'Erro ao carregar assinatura' : 'Assinatura não encontrada'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {error || 'Não foi possível localizar sua assinatura. Entre em contato com o suporte se você possui uma assinatura ativa.'}
            </p>
            <Button onClick={refreshSubscription} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Informações da Assinatura
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshSubscription}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className={`p-6 rounded-xl ${isActive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${isActive ? 'bg-green-500 shadow-green-200 shadow-lg' : 'bg-red-500 shadow-red-200 shadow-lg'}`}></div>
              <div>
                <p className="text-xl font-semibold">
                  {isActive ? 'Plano Ativo' : 'Plano Inativo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionData && `${formatCurrency(subscriptionData.valor)} • Cobrança ${getCycleLabel(subscriptionData?.ciclo || '').toLowerCase()}`}
                </p>
              </div>
            </div>
            {getStatusBadge(subscriptionData?.status || '')}
          </div>
          
          {/* Próximo pagamento destacado */}
          {subscriptionData?.proximoPagamento && isActive && (
            <div className="bg-white/50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Próxima cobrança em {formatDate(subscriptionData.proximoPagamento)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detalhes da Assinatura em Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Valor do Plano */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-400">Valor do Plano</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {subscriptionData && formatCurrency(subscriptionData.valor)}
            </p>
          </div>

          {/* Frequência */}
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-400">Cobrança</span>
            </div>
            <p className="text-lg font-semibold text-purple-900 dark:text-purple-300">
              {subscriptionData && getCycleLabel(subscriptionData.ciclo)}
            </p>
          </div>

          {/* Data de Início */}
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-400">Início</span>
            </div>
            <p className="text-lg font-semibold text-orange-900 dark:text-orange-300">
              {subscriptionData && formatDate(subscriptionData.dataAssinatura)}
            </p>
          </div>

          {/* Status */}
          <div className={`rounded-lg p-4 border ${isActive ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isActive ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>Status</span>
            </div>
            {subscriptionData && getStatusBadge(subscriptionData.status)}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Método de Pagamento
          </h4>
          {subscriptionData?.creditCard ? (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getBrandIcon(subscriptionData.creditCard.creditCardBrand)}</span>
                <div>
                  <p className="font-medium">
                    {subscriptionData.creditCard.creditCardBrand} •••• {subscriptionData.creditCard.creditCardNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cartão terminado em {subscriptionData.creditCard.creditCardNumber}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-muted-foreground">Informações de pagamento não disponíveis</p>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          ID da Assinatura: {subscriptionData?.id}
        </div>
      </CardContent>
    </Card>
  )
}
