import { Badge } from '/src/components/ui/badge'
import { Button } from '/src/components/ui/button'
import { RefreshCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SincronizacaoFundoProps {
  fundoId: string
  sincronizando: boolean
  ultimaSincronizacao?: string
  erro?: string
  cotaAtualizada?: number
  onSincronizar?: () => void
}

export function SincronizacaoFundo({
  fundoId,
  sincronizando,
  ultimaSincronizacao,
  erro,
  cotaAtualizada,
  onSincronizar,
}: SincronizacaoFundoProps) {
  return (
    <div className="flex items-center gap-2">
      {sincronizando ? (
        <>
          <Badge variant="outline" className="gap-1">
            <RefreshCcw className="h-3 w-3 animate-spin" />
            Sincronizando...
          </Badge>
        </>
      ) : erro ? (
        <>
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSincronizar}
            className="h-6 px-2 text-xs"
          >
            Tentar novamente
          </Button>
        </>
      ) : ultimaSincronizacao ? (
        <>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {formatDistanceToNow(new Date(ultimaSincronizacao), {
              locale: ptBR,
              addSuffix: true,
            })}
          </Badge>
          {cotaAtualizada && (
            <span className="text-xs text-muted-foreground">
              Cota: R$ {cotaAtualizada.toFixed(4)}
            </span>
          )}
          {onSincronizar && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSincronizar}
              className="h-6 px-2 text-xs"
            >
              <RefreshCcw className="h-3 w-3" />
            </Button>
          )}
        </>
      ) : (
        <>
          <Badge variant="outline">Aguardando sincronização</Badge>
          {onSincronizar && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSincronizar}
              className="h-6 px-2"
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Sincronizar agora
            </Button>
          )}
        </>
      )}
    </div>
  )
}

interface CardSincronizacaoFundosProps {
  fundos: Array<{
    id: string
    nome: string
    codigo: string
    sincronizando: boolean
    ultimaSincronizacao?: string
    erro?: string
    cotaAtualizada?: number
  }>
  onSincronizar?: (fundoId: string) => void
  onSincronizarTodos?: () => void
}

export function CardSincronizacaoFundos({
  fundos,
  onSincronizar,
  onSincronizarTodos,
}: CardSincronizacaoFundosProps) {
  const temErros = fundos.some((f) => f.erro)
  const todosAtualizados = fundos.every((f) => f.ultimaSincronizacao && !f.erro)

  return (
    <div className="space-y-2">
      {onSincronizarTodos && (
        <Button
          size="sm"
          onClick={onSincronizarTodos}
          variant={temErros ? 'destructive' : 'outline'}
          className="w-full"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          {todosAtualizados ? 'Atualizar todos' : 'Sincronizar fundos'}
        </Button>
      )}

      {fundos.map((fundo) => (
        <div
          key={fundo.id}
          className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{fundo.nome}</p>
              <p className="text-xs text-muted-foreground">{fundo.codigo}</p>
            </div>
          </div>

          <SincronizacaoFundo
            fundoId={fundo.id}
            sincronizando={fundo.sincronizando}
            ultimaSincronizacao={fundo.ultimaSincronizacao}
            erro={fundo.erro}
            cotaAtualizada={fundo.cotaAtualizada}
            onSincronizar={() => onSincronizar?.(fundo.id)}
          />
        </div>
      ))}
    </div>
  )
}
