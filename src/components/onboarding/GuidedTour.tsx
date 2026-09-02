import { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '/src/components/ui/button'
import { useSidebar } from '/src/components/ui/sidebar'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GuidedTourProps {
  open: boolean
  onFinish: () => void
}

interface TourStep {
  target?: string
  title: string
  description: string
  action?: { label: string } & ({ kind: 'click' } | { kind: 'navigate'; path: string })
}

const STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao FinanceApp!',
    description:
      'Vamos te mostrar rapidinho onde ficam as principais funções do app. Você pode pular a qualquer momento.',
  },
  {
    target: 'transacoes',
    title: 'Transações',
    description: 'Aqui você lança e acompanha suas receitas e despesas.',
  },
  {
    target: 'importar-dados',
    title: 'Importar dados',
    description:
      'Já tem extrato do banco, fatura de cartão ou uma planilha de investimentos? Clique aqui pra trazer tudo de uma vez, sem digitar nada.',
    action: { label: 'Abrir agora', kind: 'click' },
  },
  {
    target: 'contas',
    title: 'Suas contas bancárias',
    description:
      'Já criamos uma conta de exemplo pra você. Abra aqui e ajuste o nome, o banco e o saldo com os dados reais.',
    action: { label: 'Configurar agora', kind: 'navigate', path: '/contas?configurarConta=1' },
  },
  {
    target: 'cartoes',
    title: 'Seus cartões de crédito',
    description:
      'Também já criamos um cartão de exemplo. Ajuste limite, bandeira e as datas de fechamento e vencimento.',
    action: { label: 'Configurar agora', kind: 'navigate', path: '/cartoes?configurarCartao=1' },
  },
  {
    target: 'categorias',
    title: 'Categorias',
    description: 'Já deixamos categorias comuns prontas. Adicione, renomeie ou remova o que fizer sentido pra você.',
  },
  {
    target: 'orcamentos',
    title: 'Orçamentos',
    description: 'Defina limites de gasto por categoria e acompanhe se está dentro do previsto.',
  },
  {
    target: 'investimentos',
    title: 'Investimentos',
    description: 'Acompanhe sua carteira e importe posições direto da B3.',
  },
  {
    target: 'relatorios',
    title: 'Relatórios',
    description: 'Veja gráficos e a evolução das suas finanças ao longo do tempo.',
  },
  {
    target: 'nova-transacao',
    title: 'Adicionar rapidamente',
    description: 'Esse botão fica sempre visível. Clique nele a qualquer momento pra lançar uma transação nova.',
  },
  {
    target: 'avatar',
    title: 'Seu perfil',
    description: 'Aqui você acessa seu perfil, categorias e pode assistir este tutorial de novo quando quiser.',
  },
  {
    title: 'Pronto!',
    description: 'Você já conhece o essencial do FinanceApp. Bora organizar suas finanças?',
  },
]

export function GuidedTour({ open, onFinish }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const navigate = useNavigate()
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar()

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onFinish])

  useEffect(() => {
    if (!open || !step.target) return
    const isSidebarTarget = ['transacoes', 'contas', 'cartoes', 'categorias', 'orcamentos', 'investimentos', 'relatorios'].includes(
      step.target
    )
    if (!isSidebarTarget) return

    if (isMobile) {
      setOpenMobile(true)
    } else if (state === 'collapsed') {
      setOpen(true)
    }
  }, [open, step.target, isMobile, state, setOpen, setOpenMobile])

  useLayoutEffect(() => {
    if (!open || !step.target) {
      setRect(null)
      return
    }

    const updateRect = () => {
      const candidates = Array.from(document.querySelectorAll(`[data-tour="${step.target}"]`))
      const visible = candidates.find((el) => {
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && (el as HTMLElement).offsetParent !== null
      })
      setRect(visible ? visible.getBoundingClientRect() : null)
    }

    updateRect()
    const timeout = window.setTimeout(updateRect, 250)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open, step.target, stepIndex])

  if (!open) return null

  const handleNext = () => {
    if (isLastStep) {
      onFinish()
      return
    }
    setStepIndex((current) => current + 1)
  }

  const handleBack = () => {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const handleAction = () => {
    if (!step.action) return

    if (step.action.kind === 'click') {
      const candidates = step.target
        ? Array.from(document.querySelectorAll(`[data-tour="${step.target}"]`))
        : []
      const target = candidates.find((el) => {
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && (el as HTMLElement).offsetParent !== null
      }) as HTMLElement | undefined

      target?.click()
      onFinish()
      return
    }

    onFinish()
    navigate(step.action.path)
  }

  const padding = 8
  const spotlightStyle = rect
    ? {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null

  const cardWidth = 320
  const cardHeightEstimate = 300
  const margin = 16

  const clampTop = (top: number) =>
    Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - cardHeightEstimate - margin))
  const clampLeft = (left: number) =>
    Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - cardWidth - margin))

  const cardStyle = (() => {
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const isSidebarTarget = rect.left < 260
    if (isSidebarTarget) {
      return { top: clampTop(rect.top - 20), left: clampLeft(rect.right + 20) }
    }

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const placeAbove = spaceBelow < cardHeightEstimate + margin && spaceAbove > spaceBelow

    const top = placeAbove ? rect.top - cardHeightEstimate - margin : rect.bottom + margin
    const left = rect.left - cardWidth + rect.width

    return { top: clampTop(top), left: clampLeft(left) }
  })()

  return (
    <div className="fixed inset-0 z-[100]">
      {spotlightStyle && (
        <div
          className="fixed rounded-xl border-2 border-primary transition-all duration-300"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
            pointerEvents: 'none',
          }}
        />
      )}
      {!rect && (
        <div className="fixed inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }} onClick={onFinish} />
      )}

      <div
        className="fixed w-80 rounded-xl border bg-background p-5 shadow-2xl"
        style={{ ...cardStyle, width: cardWidth, pointerEvents: 'auto' }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{step.title}</h3>
          <button
            type="button"
            onClick={onFinish}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{step.description}</p>

        <div className="mt-3 flex items-center gap-1.5">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        {step.action && (
          <Button type="button" className="mt-3 w-full" onClick={handleAction}>
            {step.action.label}
          </Button>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onFinish}>
            Pular tutorial
          </Button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={handleBack} aria-label="Passo anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleNext}>
              {isLastStep ? 'Concluir' : 'Próximo'}
              {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
