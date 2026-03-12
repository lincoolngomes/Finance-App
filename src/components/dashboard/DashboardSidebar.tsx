
import { Card, CardContent, CardHeader, CardTitle } from '/src/components/ui/card'
import { Calendar, Lightbulb } from 'lucide-react'
import { formatCurrency } from '/src/utils/currency'

interface Lembrete {
  id: number
  created_at: string
  userid: string | null
  descricao: string | null
  data: string | null
  valor: number | null
}

interface DashboardSidebarProps {
  lembretes: Lembrete[]
}

const dicas = [
  "💡 Sempre registre suas despesas no mesmo dia para não esquecer",
  "💡 Defina metas mensais de economia e acompanhe seu progresso",
  "💡 Categorize suas despesas para identificar onde gasta mais",
  "💡 Configure lembretes para não perder datas de pagamento",
  "💡 Revise seus gastos semanalmente para manter o controle",
  "💡 Separe uma quantia fixa para emergências todo mês"
]

export function DashboardSidebar({ lembretes }: DashboardSidebarProps) {
  const proximoLembrete = lembretes
    .filter(l => l.data && new Date(l.data) >= new Date())
    .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime())[0]

  const dicaDoDia = dicas[new Date().getDate() % dicas.length]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximo Lembrete
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximoLembrete ? (
            <div className="space-y-2">
              <p className="font-medium">{proximoLembrete.descricao}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(proximoLembrete.data!).toLocaleDateString('pt-BR')}
              </p>
              {proximoLembrete.valor && (
                <p className="text-sm font-medium text-primary">
                  {formatCurrency(proximoLembrete.valor)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum lembrete próximo</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Dica do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{dicaDoDia}</p>
        </CardContent>
      </Card>
    </div>
  )
}
