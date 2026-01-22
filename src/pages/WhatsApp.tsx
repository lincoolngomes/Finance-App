import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Zap, Sparkles, Send, CheckCircle2 } from 'lucide-react'

const WHATSAPP_NUMBER = '+5511919570594'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Oi%20Agente!%20Quero%20adicionar%20uma%20transação.`

export default function WhatsApp() {
  const openWhatsApp = () => {
    window.open(WHATSAPP_URL, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-6">
        <div className="flex gap-4">
          <Sparkles className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold">Agente IA WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Adicione transações de forma rápida e natural conversando com nosso agente IA via WhatsApp!
            </p>
            <p className="text-sm font-semibold text-green-600 mt-3 bg-green-500/20 rounded px-3 py-2 inline-block">
              📱 Número: +55 (11) 91957-0594
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30">
          <CardHeader>
            <Zap className="h-6 w-6 text-green-600 mb-2" />
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-semibold text-sm">Abra o WhatsApp</p>
                <p className="text-xs text-muted-foreground">Clique no botão abaixo</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-semibold text-sm">Converse Naturalmente</p>
                <p className="text-xs text-muted-foreground">Descreva sua transação</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="font-semibold text-sm">Pronto!</p>
                <p className="text-xs text-muted-foreground">IA adiciona automaticamente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border-blue-500/30">
          <CardHeader>
            <MessageCircle className="h-6 w-6 text-blue-600 mb-2" />
            <CardTitle>Exemplos de Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-blue-500/10 rounded p-2">
              <p className="text-xs font-mono">
                "Gastei 50 reais em café ontem"
              </p>
            </div>
            <div className="bg-blue-500/10 rounded p-2">
              <p className="text-xs font-mono">
                "Recebi 2000 de salário dia 5"
              </p>
            </div>
            <div className="bg-blue-500/10 rounded p-2">
              <p className="text-xs font-mono">
                "Compra de 150 no supermercado"
              </p>
            </div>
            <div className="bg-blue-500/10 rounded p-2">
              <p className="text-xs font-mono">
                "Transferência de 500 pro banco"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Pronto para começar?
          </CardTitle>
          <CardDescription>
            O agente IA entenderá sua mensagem e adicionará a transação automaticamente!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={openWhatsApp}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Iniciar Conversa com Agente IA
          </Button>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>100% Automático</strong> - Não precisa preencher formulários</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>Linguagem Natural</strong> - Fale como se fosse com um amigo</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span><strong>Instantâneo</strong> - Transação adicionada em segundos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que o Agente IA pode fazer?</CardTitle>
          <CardDescription>
            O agente entende diferentes tipos de contexto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">💰 Transações de Despesa</h4>
              <p className="text-xs text-muted-foreground">
                "Paguei 100 de pizzaria ontem"
              </p>
            </div>
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">💵 Transações de Receita</h4>
              <p className="text-xs text-muted-foreground">
                "Recebi 5000 do freelance"
              </p>
            </div>
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">📅 Datas Específicas</h4>
              <p className="text-xs text-muted-foreground">
                "Gasto de 200 no dia 15"
              </p>
            </div>
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">🏷️ Categorias</h4>
              <p className="text-xs text-muted-foreground">
                "Gasolina 80 reais"
              </p>
            </div>
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">🔄 Múltiplas Transações</h4>
              <p className="text-xs text-muted-foreground">
                "Gastei 50 no uber, 30 na comida"
              </p>
            </div>
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm">💳 Contas Diferentes</h4>
              <p className="text-xs text-muted-foreground">
                "Saques 500 do débito"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/30">
        <CardHeader>
          <CardTitle className="text-base">⚡ Dica Importante</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Quanto mais detalhes você fornecer, mais precisamente o agente IA classificará sua transação. Mas não se preocupe - ele aprende com suas transações anteriores!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
