import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, CheckCircle2, ListChecks, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'

const WHATSAPP_NUMBER = '+5511919570594'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Oi%20Agente!%20Quero%20adicionar%20uma%20transação.`

export default function WhatsApp() {
  const openWhatsApp = () => {
    window.open(WHATSAPP_URL, '_blank')
  }

  const exemplos = [
    '"Gastei 50 reais em café ontem"',
    '"Recebi 2000 de salário dia 5"',
    '"Compra de 150 no supermercado"',
    '"Transferência de 500 pro banco"',
  ]

  const recursos = [
    { titulo: 'Transações de Despesa', texto: '"Paguei 100 de pizzaria ontem"' },
    { titulo: 'Transações de Receita', texto: '"Recebi 5000 do freelance"' },
    { titulo: 'Datas Específicas', texto: '"Gasto de 200 no dia 15"' },
    { titulo: 'Categorias', texto: '"Gasolina 80 reais"' },
    { titulo: 'Múltiplas Transações', texto: '"Gastei 50 no uber e 30 na comida"' },
    { titulo: 'Contas Diferentes', texto: '"Saquei 500 no débito"' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
            <Bot className="h-6 w-6 text-slate-200" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Agente IA no WhatsApp</h1>
            <p className="mt-2 text-muted-foreground">
              Cadastre transações por mensagem de forma rápida e padronizada.
            </p>
            <p className="mt-3 inline-flex rounded-md border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-200">
              Número: +55 (11) 91957-0594
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-700/60 bg-slate-900/30">
          <CardHeader>
            <ListChecks className="mb-2 h-6 w-6 text-slate-300" />
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Abra o WhatsApp', 'Clique no botão abaixo'],
              ['Converse naturalmente', 'Descreva sua transação'],
              ['Pronto', 'A IA adiciona automaticamente'],
            ].map((item, idx) => (
              <div key={item[0]} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-100">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item[0]}</p>
                  <p className="text-xs text-muted-foreground">{item[1]}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-700/60 bg-slate-900/30">
          <CardHeader>
            <MessageCircle className="mb-2 h-6 w-6 text-slate-300" />
            <CardTitle>Exemplos de Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exemplos.map((exemplo) => (
              <div key={exemplo} className="rounded p-2 bg-slate-800/70">
                <p className="font-mono text-xs">{exemplo}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700/60 bg-slate-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5" />
            Pronto para começar?
          </CardTitle>
          <CardDescription>
            O agente entende linguagem natural e cadastra as transações para você.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={openWhatsApp} className="h-12 w-full gap-2 bg-blue-600 text-lg text-white hover:bg-blue-700">
            <MessageCircle className="h-5 w-5" />
            Iniciar conversa com o agente
          </Button>

          <div className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span><strong>Automático:</strong> sem formulário manual.</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span><strong>Linguagem natural:</strong> escreva como conversa normal.</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span><strong>Rápido:</strong> lançamento em segundos.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O que o agente pode fazer</CardTitle>
          <CardDescription>Principais cenários suportados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {recursos.map((recurso) => (
              <div key={recurso.titulo} className="space-y-2 rounded-lg bg-muted/50 p-3">
                <h4 className="text-sm font-semibold">{recurso.titulo}</h4>
                <p className="text-xs text-muted-foreground">{recurso.texto}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700/60 bg-slate-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-slate-300" />
            Dica Importante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Quanto mais detalhes você enviar, melhor a classificação da transação.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
