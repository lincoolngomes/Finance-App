import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency, parseValorBR, formatarValorBR } from '@/utils/currency'

interface ResgateDialogProps {
  open: boolean
  onClose: () => void
  selectedIds?: Set<string>
}

export const ResgateDialog = ({ open, onClose, selectedIds }: ResgateDialogProps) => {
  const { investimentos, adicionarTransacao } = useInvestments()
  const [loading, setLoading] = useState(false)
  
  const [investimentoSelecionado, setInvestimentoSelecionado] = useState<string>('')
  const [valorResgate, setValorResgate] = useState('')
  const [dataResgate, setDataResgate] = useState(new Date().toISOString().split('T')[0])
  
  // Investimentos disponíveis para resgate (apenas ativos com saldo)
  // Se há IDs selecionados, filtrar apenas esses, senão mostrar todos disponíveis
  const investimentosDisponiveis = investimentos.filter(inv => 
    inv.ativo && inv.quantidade > 0 && inv.valor_atual > 0 &&
    (!selectedIds || selectedIds.size === 0 || selectedIds.has(inv.id))
  )
  
  // Auto-selecionar se houver apenas um investimento disponível
  useEffect(() => {
    if (investimentosDisponiveis.length === 1 && !investimentoSelecionado) {
      setInvestimentoSelecionado(investimentosDisponiveis[0].id)
    }
  }, [investimentosDisponiveis, investimentoSelecionado])
  
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
    const dataAplicacao = new Date(investimentoAtual.data_aplicacao || '')
    const dataResgateDate = new Date(dataResgate)
    const diasInvestido = Math.floor((dataResgateDate.getTime() - dataAplicacao.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calcular proporção do resgate
    const proporcao = valor / saldoAtual
    const valorInvestidoProporcional = valorInvestido * proporcao
    
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
    const novoSaldo = saldoAtual - valor
    
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
      isento: investimentoAtual.isento_ir || false
    }
  }
  
  const resultado = calcularResgate()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!investimentoAtual || !resultado || resultado.erro) return
    
    setLoading(true)
    
    try {
      // Adicionar transação de resgate (venda)
      const sucesso = await adicionarTransacao({
        investimento_id: investimentoAtual.id,
        tipo_transacao: 'venda',
        quantidade: investimentoAtual.quantidade * (resultado.valor / resultado.saldoAtual), // Quantidade proporcional
        preco_unitario: resultado.valor / (investimentoAtual.quantidade * (resultado.valor / resultado.saldoAtual)),
        valor_total: resultado.valor,
        taxa: 0,
        data_transacao: new Date(dataResgate).toISOString(),
        observacoes: `Resgate - IR: R$ ${resultado.valorIR.toFixed(2)} (${resultado.aliquotaIR}%)`
      })
      
      if (sucesso) {
        resetForm()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }
  
  const resetForm = () => {
    setInvestimentoSelecionado('')
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
                    {inv.codigo} - {inv.nome} ({formatCurrency(inv.valor_atual || 0)})
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
                    Saldo disponível: {formatCurrency(investimentoAtual.valor_atual || 0)}
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
