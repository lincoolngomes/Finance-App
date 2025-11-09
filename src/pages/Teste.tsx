import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/useSubscription';
import { fetchSubscriptionInfo } from '@/utils/subscription';
import { toast } from '@/hooks/use-toast';
import { CreditCard, TestTube, RefreshCw, Calendar, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function TestePage() {
  const { 
    subscriptionData, 
    loading, 
    error, 
    hasSubscription, 
    isActive,
    refreshSubscription
  } = useSubscription();

  const [testSubscriptionId, setTestSubscriptionId] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestWebhook = async () => {
    if (!testSubscriptionId.trim()) {
      toast({
        title: "Erro",
        description: "Digite um ID de assinatura para testar",
        variant: "destructive",
      });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      console.log('🧪 Testando webhook com ID:', testSubscriptionId);
      const result = await fetchSubscriptionInfo(testSubscriptionId.trim());
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Teste bem-sucedido!",
          description: "Webhook do N8N funcionou corretamente",
        });
      } else {
        toast({
          title: "Teste falhou",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Erro no teste:', error);
      setTestResult({
        success: false,
        error: error.message
      });
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSetSubscription = async () => {
    toast({
      title: "Funcionalidade Removida",
      description: "O sistema agora busca automaticamente a assinatura baseada no seu email.",
      variant: "default",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
          <TestTube className="h-10 w-10" />
          Página de Teste - Sistema de Assinatura
        </h1>
        <p className="text-muted-foreground mt-2">
          Teste a integração com N8N e visualize informações de assinatura do Asaas
        </p>
      </div>

      {/* Seção de Teste do Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testar Webhook N8N
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="test-subscription">ID da Assinatura</Label>
              <Input
                id="test-subscription"
                placeholder="sub_xxxxxxxxxxxxxxxxxx"
                value={testSubscriptionId}
                onChange={(e) => setTestSubscriptionId(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleTestWebhook} disabled={testLoading}>
                {testLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Testar Webhook
              </Button>
              <Button onClick={handleSetSubscription} variant="outline" disabled>
                <CreditCard className="h-4 w-4 mr-2" />
                Busca Automática
              </Button>
            </div>
          </div>

          {testResult && (
            <div className="mt-4">
              <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">
                    {testResult.success ? 'Sucesso!' : 'Falha no teste'}
                  </h3>
                </div>
                
                {testResult.success && testResult.data ? (
                  <div className="space-y-2 text-sm">
                    <p><strong>ID:</strong> {testResult.data.id}</p>
                    <p><strong>Valor:</strong> R$ {testResult.data.valor?.toFixed(2)}</p>
                    <p><strong>Status:</strong> <Badge variant="outline">{testResult.data.status}</Badge></p>
                    <p><strong>Ciclo:</strong> {testResult.data.ciclo}</p>
                    <p><strong>Data Assinatura:</strong> {testResult.data.dataAssinatura}</p>
                    <p><strong>Próximo Pagamento:</strong> {testResult.data.proximoPagamento}</p>
                    {testResult.data.creditCard && (
                      <p><strong>Cartão:</strong> {testResult.data.creditCard.creditCardBrand} •••• {testResult.data.creditCard.creditCardNumber}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{testResult.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Status da Assinatura Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status da Assinatura do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : !hasSubscription ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma assinatura configurada</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button onClick={refreshSubscription} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          ) : subscriptionData ? (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg ${isActive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium">
                        {isActive ? 'Assinatura Ativa' : 'Assinatura Inativa'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {subscriptionData.valor?.toFixed(2)} por mês
                      </p>
                    </div>
                  </div>
                  <Badge variant={isActive ? 'default' : 'destructive'}>
                    {subscriptionData.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Assinatura</p>
                    <p className="font-medium">{new Date(subscriptionData.dataAssinatura).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium">R$ {subscriptionData.valor?.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Pagamento</p>
                    <p className="font-medium">
                      {subscriptionData.proximoPagamento && new Date(subscriptionData.proximoPagamento).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Informações de Debug */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <p><strong>Has Subscription:</strong> {hasSubscription.toString()}</p>
            <p><strong>Is Active:</strong> {isActive.toString()}</p>
            <p><strong>Loading:</strong> {loading.toString()}</p>
            <p><strong>Error:</strong> {error || 'null'}</p>
            <p><strong>Subscription Data:</strong> {subscriptionData ? 'Loaded' : 'null'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}