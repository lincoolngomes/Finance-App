import { useEffect, useState, useCallback, useRef } from 'react'
import { useInvestments } from './useInvestments'
import {
  buscarCotaAtualizadaFundo,
  calcularValorAtualFundo,
  ConfiguracaoSincronizacaoFundo,
} from '../utils/cvm'

interface StatusSincronizacao {
  fundoId: string
  sincronizando: boolean
  ultimaSincronizacao?: string
  erro?: string
  cotaAtualizada?: number
}

export function useSincronizacaoFundos() {
  const { investimentos, atualizarInvestimento } = useInvestments()
  const [statusSincronizacoes, setStatusSincronizacoes] = useState<
    Map<string, StatusSincronizacao>
  >(new Map())
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Sincroniza um único fundo com a CVM
   */
  const sincronizarFundo = useCallback(
    async (investimento: any) => {
      if (investimento.tipo !== 'fundo' && investimento.tipo !== 'previdencia') {
        return
      }

      const fundoId = investimento.id

      setStatusSincronizacoes((prev) => {
        const mapa = new Map(prev)
        mapa.set(fundoId, {
          fundoId,
          sincronizando: true,
        })
        return mapa
      })

      try {
        // Busca a cota atualizada
        const resultado = await buscarCotaAtualizadaFundo(
          investimento.codigo,
          investimento.data_marcacao
        )

        if (!resultado) {
          setStatusSincronizacoes((prev) => {
            const mapa = new Map(prev)
            mapa.set(fundoId, {
              fundoId,
              sincronizando: false,
              erro: 'Não foi possível buscar dados da CVM',
            })
            return mapa
          })
          return
        }

        // Calcula novo valor
        const { valorAtual, rentabilidade, percentualRentabilidade } =
          calcularValorAtualFundo(
            investimento.quantidade,
            resultado.cota,
            investimento.preco_medio
          )

        // Atualiza o investimento
        await atualizarInvestimento(fundoId, {
          cotacao_atual: resultado.cota,
          valor_atual: valorAtual,
          rentabilidade,
          rentabilidade_percentual: percentualRentabilidade,
          data_marcacao: resultado.data,
          fonte_marcacao: 'estimado',
        })

        setStatusSincronizacoes((prev) => {
          const mapa = new Map(prev)
          mapa.set(fundoId, {
            fundoId,
            sincronizando: false,
            ultimaSincronizacao: new Date().toISOString(),
            cotaAtualizada: resultado.cota,
          })
          return mapa
        })
      } catch (erro) {
        console.error(`Erro ao sincronizar fundo ${fundoId}:`, erro)
        setStatusSincronizacoes((prev) => {
          const mapa = new Map(prev)
          mapa.set(fundoId, {
            fundoId,
            sincronizando: false,
            erro: erro instanceof Error ? erro.message : 'Erro desconhecido',
          })
          return mapa
        })
      }
    },
    [atualizarInvestimento]
  )

  /**
   * Sincroniza todos os fundos
   */
  const sincronizarTodosFundos = useCallback(async () => {
    const fundos = investimentos.filter(
      (inv) => inv.tipo === 'fundo' || inv.tipo === 'previdencia'
    )

    if (fundos.length === 0) {
      return
    }

    // Sincroniza com delay entre requisições para evitar rate limiting
    for (const fundo of fundos) {
      await sincronizarFundo(fundo)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }, [investimentos, sincronizarFundo])

  /**
   * Inicia sincronização automática periódica
   */
  const iniciarSincronizacaoAutomatica = useCallback(
    (intervaloMinutos = 60) => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
      }

      // Faz sincronização inicial
      sincronizarTodosFundos()

      // Configura sincronização periódica
      intervaloRef.current = setInterval(() => {
        sincronizarTodosFundos()
      }, intervaloMinutos * 60 * 1000)
    },
    [sincronizarTodosFundos]
  )

  /**
   * Para a sincronização automática
   */
  const pararSincronizacaoAutomatica = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current)
      intervaloRef.current = null
    }
  }, [])

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      pararSincronizacaoAutomatica()
    }
  }, [pararSincronizacaoAutomatica])

  return {
    statusSincronizacoes,
    sincronizarFundo,
    sincronizarTodosFundos,
    iniciarSincronizacaoAutomatica,
    pararSincronizacaoAutomatica,
  }
}
