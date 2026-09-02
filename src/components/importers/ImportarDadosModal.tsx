import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '/src/components/ui/dialog'
import { Landmark, CreditCard, TrendingUp, ChevronRight } from 'lucide-react'

interface ImportarDadosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ImportOption {
  icon: typeof Landmark
  title: string
  description: string
  formats: string
  path: string
}

const OPTIONS: ImportOption[] = [
  {
    icon: Landmark,
    title: 'Extrato bancário',
    description: 'Traga as transações da sua conta corrente ou poupança.',
    formats: 'CSV, OFX ou XLSX',
    path: '/transacoes?importarExtrato=1',
  },
  {
    icon: CreditCard,
    title: 'Fatura de cartão de crédito',
    description: 'Importe os lançamentos de uma fatura para lançar as despesas automaticamente.',
    formats: 'CSV, XLSX ou PDF',
    path: '/transacoes?importarFatura=1',
  },
  {
    icon: TrendingUp,
    title: 'Investimentos (B3)',
    description: 'Importe sua carteira de ativos negociados na bolsa.',
    formats: 'CSV ou XLSX',
    path: '/investimentos?importarB3=1',
  },
]

export function ImportarDadosModal({ open, onOpenChange }: ImportarDadosModalProps) {
  const navigate = useNavigate()

  const handleSelect = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar dados</DialogTitle>
          <DialogDescription>
            Escolha o que você quer importar. Você não precisa digitar nada, o app faz o resto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.title}
                type="button"
                onClick={() => handleSelect(option.path)}
                className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground/80">Formatos aceitos: {option.formats}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
