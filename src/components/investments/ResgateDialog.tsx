import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '/src/components/ui/dialog'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { BankSelector } from '/src/components/accounts/BankAndCardSelector'
import { useInvestments, Investimento } from '/src/hooks/useInvestments'
import { toast } from '/src/hooks/use-toast'
import { formatCurrency, parseValorBR, formatarValorBR } from '/src/utils/currency'

interface ResgateDialogProps {
  open: boolean
  onClose: () => void
  selectedIds?: Set<string>
}

export const ResgateDialog = ({ open, onClose, selectedIds }: ResgateDialogProps) => {
  const {
    investimentos,
    atualizarInvestimento,
    registrarMovimentacaoFinanceiraInvestimento,
    removerMovimentacaoFinanceiraInvestimento,
  } = useInvestments()
  const [loading, setLoading] = useState(false)
  
  const [investimentoSelecionado, setInvestimentoSelecionado] = useState<string>('')
  const [contaDestinoId, setContaDestinoId] = useState('')
  const [valorResgate, setValorResgate] = useState('')
  const [dataResgate, setDataResgate] = useState(new Date().toISOString().split('T')[0])
  
  // Investimentos disponíveis para resgate (apenas ativos com saldo)
  // Se há IDs selecionados, filtrar apenas esses, senão mostrar todos disponíveis
  const investimentosDisponiveis = investimentos.filter(inv => 
    inv.ativo && inv.quantidade > 0 && Number(inv.valor_atual ?? inv.valor_total ?? 0) > 0 &&
    (!selectedIds || selectedIds.size === 0 || selectedIds.has(inv.id))
  )
  
  // Auto-selecionar o primeiro investimento disponível ao abrir o dialog
  useEffect(() => {
    if (open && investimentosDisponiveis.length > 0 && !investimentoSelecionado) {
      setInvestimentoSelecionado(investimentosDisponiveis[0].id)
    }
  }, [open, investimentosDisponiveis, investimentoSelecionado])
  
  // Resetar seleção ao fechar
  useEffect(() => {
    if (!open) {
      setInvestimentoSelecionado('')
      setContaDestinoId('')
      setValorResgate('')
    }
  }, [open])
  
  const investimentoAtual = investimentosDisponiveis.find(inv => inv.id === investimentoSelecionado)
  
  // Calcular informações do resgate
  const calcularResgate = () => {
    if (!investimentoAtual || !valorResgate) return null
    
    const valor = parseValorBR(valorResgate)
    const saldoAtual = investimentoAtual.valor_atual || 0
    const valorInvestido = investimentoAtual.valor_total || 0
    
    // Validar valor
    if (valor > saldoAtual) {
      return { erro: 'Valor de resgate maior que o saldo disponível' }
    }
    
    if (valor <= 0) {
      return { erro: 'Valor deve ser maior que zero' }
    }
    
    // Calcular dias investidos
    const dataBase =
      investimentoAtual.data_aplicacao ||
      investimentoAtual.data_primeira_compra ||
      investimentoAtual.created_at
    const dataAplicacao = new Date(dataBase || '')
    const dataResgateDate = new Date(dataResgate)
    const diasInvestido = Number.isNaN(dataAplicacao.getTime())
      ? 0
      : Math.max(
          0,
          Math.floor((dataResgateDate.getTime() - dataAplicacao.getTime()) / (1000 * 60 * 60 * 24))
        )
    
    // Calcular proporção do resgate
    const proporcao = Math.min(1, valor / saldoAtual)
    const valorInvestidoProporcional = valorInvestido * proporcao
    const valorInvestidoRestante = Math.max(0, valorInvestido - valorInvestidoProporcional)
    const quantidadeRestante = Math.max(0, investimentoAtual.quantidade * (1 - proporcao))
    
    // Calcular lucro
    const lucro = valor - valorInvestidoProporcional
    
    // Calcular retorno no período
    const retornoPeriodo = valorInvestidoProporcional > 0 
      ? ((valor - valorInvestidoProporcional) / valorInvestidoProporcional) * 100 
      : 0
    
    // Calcular retorno anualizado
    const anosInvestido = diasInvestido / 365
    const retornoAnualizado = anosInvestido > 0 
      ? (Math.pow(1 + (retornoPeriodo / 100), 1 / anosInvestido) - 1) * 100 
      : 0
    
    // Calcular IR (se não for isento)
    let aliquotaIR = 0
    let valorIR = 0
    
    if (!investimentoAtual.isento_ir && lucro > 0) {
      // Tabela regressiva de IR para renda fixa
      if (diasInvestido <= 180) {
        aliquotaIR = 22.5
      } else if (diasInvestido <= 360) {
        aliquotaIR = 20
      } else if (diasInvestido <= 720) {
        aliquotaIR = 17.5
      } else {
        aliquotaIR = 15
      }
      valorIR = lucro * (aliquotaIR / 100)
    }
    
    // Valor líquido após IR
    const valorLiquido = valor - valorIR
    
    // Novo saldo do investimento
    const novoSaldo = Math.max(0, saldoAtual - valor)
    const valorAtualManualRestante =
      investimentoAtual.tipo_marcacao === 'manual' && investimentoAtual.valor_atual_manual
        ? Math.max(0, investimentoAtual.valor_atual_manual * (1 - proporcao))
        : undefined
    
    return {
      valor,
      saldoAtual,
      valorInvestidoProporcional,
      lucro,
      retornoPeriodo,
      retornoAnualizado,
      diasInvestido,
      aliquotaIR,
      valorIR,
      valorLiquido,
      novoSaldo,
      isento: investimentoAtual.isento_ir || false,
      quantidadeRestante,
      valorInvestidoRestante,
      valorAtualManualRestante
    }
  }
  
  const resultado = calcularResgate()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!investimentoAtual || !resultado || resultado.erro) return
    if (!contaDestinoId) {
      toast({
        title: 'Selecione a conta de destino',
        description: 'O valor do resgate precisa voltar para uma conta para atualizar o saldo.',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)

    let lancamentoFinanceiroId: string | number | null = null
    
    try {
      const observacoesFinanceiras = [
        resultado.valorIR > 0 ? `IR retido: ${formatCurrency(resultado.valorIR)}` : '',
      ]
        .filter(Boolean)
        .join(' • ')

      const lancamentoFinanceiro = await registrarMovimentacaoFinanceiraInvestimento({
        tipo: 'resgate',
        contaId: contaDestinoId,
        data: dataResgate,
        valor: resultado.valorLiquido,
        codigo: investimentoAtual.codigo,
        nome: investimentoAtual.nome,
        instituicao: investimentoAtual.instituicao,
        observacoes: observacoesFinanceiras,
      })

      lancamentoFinanceiroId = lancamentoFinanceiro?.id ?? null

      const sucesso = await atualizarInvestimento(investimentoAtual.id, {
        quantidade: resultado.quantidadeRestante,
        preco_medio: investimentoAtual.preco_medio,
        valor_total: resultado.valorInvestidoRestante,
        valor_atual_manual:
          typeof resultado.valorAtualManualRestante === 'number'
            ? Number(resultado.valorAtualManualRestante.toFixed(2))
            : undefined,
        ativo: resultado.novoSaldo > 0.01,
      })
      
      if (sucesso) {
        resetForm()
        onClose()
      } else {
        await removerMovimentacaoFinanceiraInvestimento(lancamentoFinanceiroId)
      }
    } catch (error: any) {
      await removerMovimentacaoFinanceiraInvestimento(lancamentoFinanceiroId)
      toast({
        title: 'Erro ao registrar resgate',
        description: error?.message || 'Nao foi possivel registrar o resgate.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const resetForm = () => {
    setInvestimentoSelecionado('')
    setContaDestinoId('')
    setValorResgate('')
    setDataResgate(new Date().toISOString().split('T')[0])
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resgatar Investimento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleção do investimento */}
          <div>
            <Label htmlFor="investimento">Investimento *</Label>
            <Select value={investimentoSelecionado} onValueChange={setInvestimentoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o investimento" />
              </SelectTrigger>
              <SelectContent>
                {investimentosDisponiveis.map(inv => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.codigo} - {inv.nome} ({formatCurrency(inv.valor_atual ?? inv.valor_total ?? 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Valor do resgate */}
          {investimentoAtual && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorResgate">Valor do Resgate *</Label>
                  <Input
                    id="valorResgate"
                    type="text"
                    placeholder="0,00"
                    value={valorResgate}
                    onChange={(e) => setValorResgate(formatarValorBR(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Saldo disponível: {formatCurrency(investimentoAtual.valor_atual ?? investimentoAtual.valor_total ?? 0)}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="dataResgate">Data do Resgate *</Label>
                  <Input
                    id="dataResgate"
                    type="date"
                    value={dataResgate}
                    onChange={(e) => setDataResgate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contaDestino">Conta de destino *</Label>
                <BankSelector
                  value={contaDestinoId}
                  onValueChange={setContaDestinoId}
                  placeholder="Selecione a conta que vai receber o resgate"
                />
              </div>
              
              {/* Resumo do resgate */}
              {resultado && !resultado.erro && (
                <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 border-2 border-teal-200 dark:border-teal-800 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-teal-900 dark:text-teal-100 flex items-center gap-2">
                    📊 Resumo do Resgate
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">Dias Investido</p>
                      <p className="font-semibold">{resultado.diasInvestido} dias</p>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">Valor Investido</p>
                      <p className="font-semibold">{formatCurrency(resultado.valorInvestidoProporcional)}</p>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">Lucro</p>
                      <p className={`font-semibold ${resultado.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(resultado.lucro)}
                      </p>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">Retorno no Período</p>
                      <p className={`font-semibold ${resultado.retornoPeriodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {resultado.retornoPeriodo.toFixed(2)}%
                      </p>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">Retorno Anualizado</p>
                      <p className={`font-semibold ${resultado.retornoAnualizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {resultado.retornoAnualizado.toFixed(2)}% a.a.
                      </p>
                    </div>
                    
                    <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                      <p className="text-muted-foreground text-xs">
                        {resultado.isento ? 'Isento de IR ✓' : `IR (${resultado.aliquotaIR}%)`}
                      </p>
                      <p className="font-semibold text-red-600">
                        {resultado.isento ? formatCurrency(0) : `- ${formatCurrency(resultado.valorIR)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t-2 border-teal-300 dark:border-teal-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Líquido a Receber</p>
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                          {formatCurrency(resultado.valorLiquido)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Novo Saldo</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(resultado.novoSaldo)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {resultado?.erro && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">⚠️ {resultado.erro}</p>
                </div>
              )}
            </>
          )}
          
          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !investimentoAtual || !valorResgate || !!resultado?.erro}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? 'Processando...' : 'Confirmar Resgate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
