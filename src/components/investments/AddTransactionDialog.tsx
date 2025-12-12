import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInvestments } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'

interface AddTransactionDialogProps {
  open: boolean
  onClose: () => void
}

export const AddTransactionDialog = ({ open, onClose }: AddTransactionDialogProps) => {
  const { getOrCreateInvestimento, adicionarTransacao } = useInvestments()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'tipo' | 'investimento' | 'transacao'>('tipo')
  
  const [tipoTransacao, setTipoTransacao] = useState<'compra' | 'venda'>('compra')
  const [tipoAtivo, setTipoAtivo] = useState<'acao' | 'renda_fixa' | 'cripto' | 'fii' | 'etf'>('acao')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [precoUnitario, setPrecoUnitario] = useState('')
  const [taxa, setTaxa] = useState('')
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Criar ou buscar investimento
      const investimento = await getOrCreateInvestimento({
        tipo: tipoAtivo,
        codigo: codigo.toUpperCase(),
        nome,
        instituicao: instituicao || undefined
      })

      if (!investimento) {
        setLoading(false)
        return
      }

      // 2. Adicionar transação
      const valorTotal = parseFloat(quantidade) * parseFloat(precoUnitario)
      const sucesso = await adicionarTransacao({
        investimento_id: investimento.id,
        tipo_transacao: tipoTransacao,
        quantidade: parseFloat(quantidade),
        preco_unitario: parseFloat(precoUnitario),
        valor_total: valorTotal,
        taxa: parseFloat(taxa) || 0,
        data_transacao: new Date(dataTransacao).toISOString(),
        observacoes
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
    setStep('tipo')
    setTipoTransacao('compra')
    setTipoAtivo('acao')
    setCodigo('')
    setNome('')
    setInstituicao('')
    setQuantidade('')
    setPrecoUnitario('')
    setTaxa('')
    setDataTransacao(new Date().toISOString().split('T')[0])
    setObservacoes('')
  }

  const valorTotal = quantidade && precoUnitario 
    ? parseFloat(quantidade) * parseFloat(precoUnitario) 
    : 0

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Transação de Investimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Tipo de Transação */}
          <div className="space-y-4">
            <div>
              <Label>Tipo de Transação</Label>
              <Select value={tipoTransacao} onValueChange={(v: any) => setTipoTransacao(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">💰 Compra</SelectItem>
                  <SelectItem value="venda">💵 Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Ativo</Label>
              <Select value={tipoAtivo} onValueChange={(v: any) => setTipoAtivo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acao">📈 Ação</SelectItem>
                  <SelectItem value="fii">🏢 FII (Fundo Imobiliário)</SelectItem>
                  <SelectItem value="etf">📊 ETF</SelectItem>
                  <SelectItem value="renda_fixa">💰 Renda Fixa</SelectItem>
                  <SelectItem value="cripto">₿ Criptomoeda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 2: Dados do Ativo */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-teal-600">Dados do Ativo</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">Código/Ticker *</Label>
                <Input
                  id="codigo"
                  placeholder={tipoAtivo === 'acao' ? 'Ex: PETR4' : tipoAtivo === 'cripto' ? 'Ex: BTC' : 'Ex: HGLG11'}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nome">Nome do Ativo *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Petrobras PN"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="instituicao">Instituição/Corretora</Label>
              <Input
                id="instituicao"
                placeholder="Ex: Clear, XP, Binance..."
                value={instituicao}
                onChange={(e) => setInstituicao(e.target.value)}
              />
            </div>
          </div>

          {/* Step 3: Dados da Transação */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-teal-600">Dados da Transação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="precoUnitario">Preço Unitário *</Label>
                <Input
                  id="precoUnitario"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precoUnitario}
                  onChange={(e) => setPrecoUnitario(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxa">Taxa/Corretagem</Label>
                <Input
                  id="taxa"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={taxa}
                  onChange={(e) => setTaxa(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dataTransacao">Data da Transação *</Label>
                <Input
                  id="dataTransacao"
                  type="date"
                  value={dataTransacao}
                  onChange={(e) => setDataTransacao(e.target.value)}
                  required
                />
              </div>
            </div>

            {valorTotal > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-teal-900">Valor Total:</span>
                  <span className="text-2xl font-bold text-teal-600">
                    {formatCurrency(valorTotal)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações sobre esta transação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {loading ? 'Salvando...' : tipoTransacao === 'compra' ? 'Registrar Compra' : 'Registrar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
