import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInvestments } from '@/hooks/useInvestments'
import { formatCurrency, parseValorBR, formatarValorBR } from '@/utils/currency'

interface AddTransactionDialogProps {
  open: boolean
  onClose: () => void
}

export const AddTransactionDialog = ({ open, onClose }: AddTransactionDialogProps) => {
  const { getOrCreateInvestimento, adicionarTransacao } = useInvestments()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'tipo' | 'investimento' | 'transacao'>('tipo')
  
  const [tipoTransacao, setTipoTransacao] = useState<'compra' | 'venda'>('compra')
  const [tipoAtivo, setTipoAtivo] = useState<'acao' | 'renda_fixa' | 'cripto' | 'fii' | 'etf' | 'fundo' | 'previdencia'>('acao')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [precoUnitario, setPrecoUnitario] = useState('')
  const [taxa, setTaxa] = useState('')
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')
  
  // Campos específicos de renda fixa
  const [tipoRentabilidade, setTipoRentabilidade] = useState<'pos' | 'pre' | 'ipca' | 'hibrido'>('pos')
  const [taxaPercentual, setTaxaPercentual] = useState('')
  const [indexador, setIndexador] = useState<'cdi' | 'ipca' | 'selic' | 'prefixado'>('cdi')
  const [dataVencimento, setDataVencimento] = useState('')
  const [liquidez, setLiquidez] = useState('no_vencimento')
  const [isentoIR, setIsentoIR] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Criar ou buscar investimento
      const dadosInvestimento: any = {
        tipo: tipoAtivo,
        codigo: codigo.toUpperCase(),
        nome,
        instituicao: instituicao || undefined
      }
      
      // Adicionar campos específicos de renda fixa (inclui Tesouro, CRI, CRA, Debêntures)
      if (['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipoAtivo)) {
        dadosInvestimento.tipo_rentabilidade = tipoRentabilidade
        dadosInvestimento.taxa_percentual = parseFloat(taxaPercentual)
        dadosInvestimento.indexador = indexador
        dadosInvestimento.data_vencimento = dataVencimento
        dadosInvestimento.liquidez = liquidez
        dadosInvestimento.data_aplicacao = dataTransacao // Usa data de transação como aplicação
        dadosInvestimento.isento_ir = isentoIR
      }
      
      const investimento = await getOrCreateInvestimento(dadosInvestimento)

      if (!investimento) {
        setLoading(false)
        return
      }

      // 2. Adicionar transação
      const qtd = parseFloat(quantidade)
      const preco = parseValorBR(precoUnitario)
      const valorTotal = qtd * preco
      const sucesso = await adicionarTransacao({
        investimento_id: investimento.id,
        tipo_transacao: tipoTransacao,
        quantidade: qtd,
        preco_unitario: preco,
        valor_total: valorTotal,
        taxa: parseValorBR(taxa) || 0,
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

  // Ajustar indexador automaticamente baseado no tipo de rentabilidade
  useEffect(() => {
    if (tipoRentabilidade === 'pos' && tipoAtivo === 'tesouro_direto') {
      setIndexador('selic')
    } else if (tipoRentabilidade === 'pos') {
      setIndexador('cdi')
    } else if (tipoRentabilidade === 'pre') {
      setIndexador('prefixado')
    } else if (tipoRentabilidade === 'ipca') {
      setIndexador('ipca')
    }
  }, [tipoRentabilidade, tipoAtivo])

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
    setTipoRentabilidade('pos')
    setTaxaPercentual('')
    setIndexador('cdi')
    setDataVencimento('')
    setLiquidez('no_vencimento')
    setIsentoIR(false)
  }

  const valorTotal = quantidade && precoUnitario 
    ? parseFloat(quantidade) * parseValorBR(precoUnitario) 
    : 0

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Aplicação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Tipo de Transação */}
          <div className="space-y-4">
            <div>
              <Label>Tipo de Operação</Label>
              <Select value={tipoTransacao} onValueChange={(v: any) => setTipoTransacao(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">💰 Aplicação</SelectItem>
                  <SelectItem value="venda">💵 Resgate</SelectItem>
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
                  <SelectItem value="renda_fixa">💰 Renda Fixa (CDB, LCI, LCA)</SelectItem>
                  <SelectItem value="tesouro_direto">🏛️ Tesouro Direto</SelectItem>
                  <SelectItem value="cri">📄 CRI (Certificado de Recebíveis Imobiliários)</SelectItem>
                  <SelectItem value="cra">🌾 CRA (Certificado de Recebíveis do Agronegócio)</SelectItem>
                  <SelectItem value="debenture">📜 Debênture</SelectItem>
                  <SelectItem value="cripto">₿ Criptomoeda</SelectItem>
                  <SelectItem value="fundo">🎯 Fundo de Investimento</SelectItem>
                  <SelectItem value="previdencia">🏦 Previdência Privada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 2: Dados do Ativo */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-teal-600">Dados do Ativo</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">
                  {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture', 'fundo', 'previdencia'].includes(tipoAtivo) ? 'Identificador *' : 'Código/Ticker *'}
                </Label>
                <div className="relative">
                  <Input
                    id="codigo"
                    placeholder={
                      tipoAtivo === 'acao' ? 'Ex: PETR4' : 
                      tipoAtivo === 'cripto' ? 'Ex: BTC' : 
                      tipoAtivo === 'fii' ? 'Ex: HGLG11' :
                      tipoAtivo === 'renda_fixa' ? 'Ex: CDB-2025' :
                      tipoAtivo === 'tesouro_direto' ? 'Ex: LFT1' :
                      ['cri', 'cra', 'debenture'].includes(tipoAtivo) ? 'Ex: CRI-123' :
                      tipoAtivo === 'fundo' ? 'Ex: FUNDO-XP' :
                      'Ex: PREV-BB'
                    }
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    required
                  />
                  {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture', 'fundo', 'previdencia'].includes(tipoAtivo) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-help" title="Use um código único para identificar este investimento (Ex: CDB-BTG-2025, FUNDO-XP-MULT, PGBL-BB)">
                      ℹ️
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="nome">Nome do Ativo *</Label>
                <Input
                  id="nome"
                  placeholder={
                    tipoAtivo === 'renda_fixa' ? 'Ex: CDB 120% CDI 2025' :
                    tipoAtivo === 'tesouro_direto' ? 'Ex: Tesouro Selic 2029' :
                    ['cri', 'cra'].includes(tipoAtivo) ? 'Ex: CRI Rodobens 2030' :
                    tipoAtivo === 'debenture' ? 'Ex: Debênture Eletrobras 2028' :
                    tipoAtivo === 'fundo' ? 'Ex: Fundo Multimercado XP' :
                    tipoAtivo === 'previdencia' ? 'Ex: PGBL Banco do Brasil' :
                    'Ex: Petrobras PN'
                  }
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

          {/* Campos específicos de Renda Fixa */}
          {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipoAtivo) && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-teal-600">Características da Renda Fixa</h3>
              
              <div>
                <Label htmlFor="tipoRentabilidade">Tipo de Rentabilidade *</Label>
                <Select value={tipoRentabilidade} onValueChange={(v: any) => setTipoRentabilidade(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoAtivo === 'tesouro_direto' ? (
                      <>
                        <SelectItem value="pos">🏛️ Tesouro Selic (pós-fixado SELIC)</SelectItem>
                        <SelectItem value="pre">📊 Tesouro Prefixado</SelectItem>
                        <SelectItem value="ipca">📈 Tesouro IPCA+ (IPCA + taxa fixa)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pos">📈 Pós-fixado (CDI)</SelectItem>
                        <SelectItem value="pre">📊 Pré-fixado (taxa fixa)</SelectItem>
                        <SelectItem value="ipca">📉 IPCA+ (IPCA + taxa fixa)</SelectItem>
                        <SelectItem value="hibrido">🔀 Híbrido/Outro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="taxaPercentual">
                  {tipoAtivo === 'tesouro_direto' && tipoRentabilidade === 'pos' ? 'Spread (% a.a. - ágio/deságio) *' :
                   tipoRentabilidade === 'pos' ? 'Taxa (% do CDI) *' : 
                   tipoRentabilidade === 'ipca' ? 'Taxa Prefixada (% a.a. + IPCA) *' : 
                   'Taxa (% ao ano) *'}
                </Label>
                <Input
                  id="taxaPercentual"
                  type="number"
                  step="0.01"
                  placeholder={
                    tipoAtivo === 'tesouro_direto' && tipoRentabilidade === 'pos' ? 'Ex: 0.15 ou -0.10 (SELIC + spread)' :
                    tipoRentabilidade === 'pos' ? 'Ex: 120.00 (120% do CDI)' :
                    tipoRentabilidade === 'ipca' ? 'Ex: 6.50 (IPCA + 6,5%)' : 
                    'Ex: 13.50'
                  }
                  value={taxaPercentual}
                  onChange={(e) => setTaxaPercentual(e.target.value)}
                  required
                />
                {tipoAtivo === 'tesouro_direto' && tipoRentabilidade === 'pos' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Informe o ágio/deságio em % a.a. (ex: 0.15 para SELIC+0.15%, -0.10 para SELIC-0.10%)
                  </p>
                )}
                {tipoRentabilidade === 'ipca' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Apenas a taxa prefixada (ex: IPCA + 6,5% → digite apenas 6.50)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataAplicacaoRF">Data de Aplicação *</Label>
                  <Input
                    id="dataAplicacaoRF"
                    type="date"
                    value={dataTransacao}
                    onChange={(e) => setDataTransacao(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
                  <Input
                    id="dataVencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="liquidez">Liquidez *</Label>
                <Select value={liquidez} onValueChange={setLiquidez}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Liquidez Diária</SelectItem>
                    <SelectItem value="no_vencimento">Apenas no Vencimento</SelectItem>
                    <SelectItem value="carencia_30">Carência de 30 dias</SelectItem>
                    <SelectItem value="carencia_90">Carência de 90 dias</SelectItem>
                    <SelectItem value="carencia_180">Carência de 180 dias</SelectItem>
                    <SelectItem value="carencia_360">Carência de 360 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-muted/30 border rounded-lg">
                <input
                  type="checkbox"
                  id="isentoIR"
                  checked={isentoIR}
                  onChange={(e) => setIsentoIR(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <Label htmlFor="isentoIR" className="text-sm cursor-pointer">
                  <span className="font-medium">✓ Isento de Imposto de Renda</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marque para LCI, LCA, CRI, CRA ou Debêntures Incentivadas (sem retenção de IR)
                  </p>
                </Label>
              </div>
            </div>
          )}

          {/* Step 3: Dados da Transação */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-teal-600">Dados da Transação</h3>
            
            {/* Para renda fixa, fundos e previdência: usar campo de valor ao invés de quantidade */}
            {['renda_fixa', 'fundo', 'previdencia'].includes(tipoAtivo) ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="valorAplicado">Valor {tipoTransacao === 'compra' ? 'Aplicado' : 'Resgatado'} *</Label>
                  <Input
                    id="valorAplicado"
                    type="text"
                    placeholder="0,00"
                    value={precoUnitario}
                    onChange={(e) => {
                      const formatted = formatarValorBR(e.target.value)
                      setPrecoUnitario(formatted)
                      setQuantidade('1') // Sempre 1 para estes tipos
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipoAtivo) && 'Valor total aplicado no investimento'}
                    {tipoAtivo === 'fundo' && 'Valor aplicado no fundo'}
                    {tipoAtivo === 'previdencia' && 'Valor da contribuição'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    step={tipoAtivo === 'cripto' ? '0.00000001' : '1'}
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
                    type="text"
                    placeholder="0,00"
                    value={precoUnitario}
                    onChange={(e) => setPrecoUnitario(formatarValorBR(e.target.value))}
                    required
                  />
                </div>
              </div>
            )}

            {tipoAtivo !== 'renda_fixa' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxa">Taxa/Corretagem</Label>
                  <Input
                    id="taxa"
                    type="text"
                    placeholder="0,00"
                    value={taxa}
                    onChange={(e) => setTaxa(formatarValorBR(e.target.value))}
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
            )}

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
