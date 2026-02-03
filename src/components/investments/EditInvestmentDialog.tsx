import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency, parseValorBR, formatarValorBR } from '@/utils/currency'

interface EditInvestmentDialogProps {
  open: boolean
  onClose: () => void
  investimento: Investimento | null
}

export const EditInvestmentDialog = ({ open, onClose, investimento }: EditInvestmentDialogProps) => {
  const { atualizarInvestimento } = useInvestments()
  const [loading, setLoading] = useState(false)
  
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [valorAplicado, setValorAplicado] = useState('')
  
  // Campos específicos de renda fixa
  const [tipoRentabilidade, setTipoRentabilidade] = useState<'pos' | 'pre' | 'ipca' | 'hibrido'>('pos')
  const [taxaPercentual, setTaxaPercentual] = useState('')
  const [indexador, setIndexador] = useState<'cdi' | 'ipca' | 'selic' | 'prefixado'>('cdi')
  const [dataVencimento, setDataVencimento] = useState('')
  const [liquidez, setLiquidez] = useState('no_vencimento')
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [valorAtualManual, setValorAtualManual] = useState('')
  const [usarValorManual, setUsarValorManual] = useState(false)
  const [isentoIR, setIsentoIR] = useState(false)

  // Carregar dados do investimento quando abrir o diálogo
  useEffect(() => {
    if (open && investimento) {
      setCodigo(investimento.codigo)
      setNome(investimento.nome)
      setInstituicao(investimento.instituicao || '')
      setObservacoes(investimento.observacoes || '')
      setValorAplicado(investimento.valor_total?.toString() || '0')
      
      if (investimento.tipo === 'renda_fixa') {
        setTipoRentabilidade(investimento.tipo_rentabilidade || 'pos')
        setTaxaPercentual(investimento.taxa_percentual?.toString() || '')
        setIndexador(investimento.indexador || 'cdi')
        setDataVencimento(investimento.data_vencimento || '')
        setLiquidez(investimento.liquidez || 'no_vencimento')
        setDataAplicacao(investimento.data_aplicacao || '')
        
        // @ts-ignore - campo customizado
        if (investimento.valor_atual_manual) {
          // @ts-ignore
          setValorAtualManual(investimento.valor_atual_manual.toString())
          setUsarValorManual(true)
        }
        
        // @ts-ignore - campo customizado
        setIsentoIR(investimento.isento_ir || false)
      }
    }
  }, [open, investimento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!investimento) return
    
    setLoading(true)

    try {
      const dadosAtualizados: Partial<Investimento> = {
        codigo: codigo.toUpperCase(),
        nome,
        instituicao: instituicao || undefined,
        observacoes: observacoes || undefined
      }

      // Adicionar campos de renda fixa se aplicável
      if (investimento.tipo === 'renda_fixa') {
        dadosAtualizados.tipo_rentabilidade = tipoRentabilidade
        dadosAtualizados.taxa_percentual = parseValorBR(taxaPercentual) || undefined
        dadosAtualizados.indexador = indexador
        // Converter para ISO considerando o timezone local
        dadosAtualizados.data_vencimento = dataVencimento ? new Date(dataVencimento + 'T00:00:00').toISOString() : undefined
        dadosAtualizados.liquidez = liquidez
        // Converter para ISO considerando o timezone local
        dadosAtualizados.data_aplicacao = dataAplicacao ? new Date(dataAplicacao + 'T00:00:00').toISOString() : undefined
        
        // Valor atual manual (se informado)
        if (usarValorManual && valorAtualManual) {
          // @ts-ignore - campo customizado
          dadosAtualizados.valor_atual_manual = parseValorBR(valorAtualManual)
        } else {
          // @ts-ignore
          dadosAtualizados.valor_atual_manual = null
        }
        
        // Isenção de IR
        // @ts-ignore - campo customizado
        dadosAtualizados.isento_ir = isentoIR
      }
      
      const sucesso = await atualizarInvestimento(investimento.id, dadosAtualizados)
      
      if (sucesso) {
        handleClose()
      }
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Limpar formulário
    setCodigo('')
    setNome('')
    setInstituicao('')
    setObservacoes('')
    setTipoRentabilidade('pos')
    setTaxaPercentual('')
    setIndexador('cdi')
    setDataVencimento('')
    setLiquidez('no_vencimento')
    setDataAplicacao('')
    
    onClose()
  }

  if (!investimento) return null

  const isRendaFixa = ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(investimento.tipo)
  const tipoLabel = {
    acao: 'Ação',
    fii: 'FII',
    etf: 'ETF',
    renda_fixa: 'Renda Fixa',
    tesouro_direto: 'Tesouro Direto',
    cri: 'CRI',
    cra: 'CRA',
    debenture: 'Debênture',
    cripto: 'Criptomoeda',
    fundo: 'Fundo',
    previdencia: 'Previdência'
  }[investimento.tipo]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {tipoLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
              Informações Básicas
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">
                  {isRendaFixa ? 'Identificador' : 'Código/Ticker'}
                </Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder={isRendaFixa ? 'CDB-DI' : 'PETR4'}
                  required
                />
                {isRendaFixa && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use um identificador único como CDB-DI, LCI-BANCO, etc.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={isRendaFixa ? 'CDB Itaú' : 'Petrobras'}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="instituicao">Instituição/Corretora</Label>
              <Input
                id="instituicao"
                value={instituicao}
                onChange={(e) => setInstituicao(e.target.value)}
                placeholder="Itaú"
              />
            </div>
            
            <div>
              <Label htmlFor="valorAplicado">Valor Aplicado (R$)</Label>
              <Input
                id="valorAplicado"
                type="text"
                value={formatCurrency(investimento?.valor_total || 0)}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Para alterar o valor, adicione uma nova transação ou exclua o investimento
              </p>
            </div>
          </div>

          {/* Campos de Renda Fixa */}
          {isRendaFixa && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Detalhes da Renda Fixa
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipoRentabilidade">Tipo de Rentabilidade</Label>
                  <Select value={tipoRentabilidade} onValueChange={(value: any) => setTipoRentabilidade(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pos">Pós-fixado</SelectItem>
                      <SelectItem value="pre">Pré-fixado</SelectItem>
                      <SelectItem value="ipca">IPCA+</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoRentabilidade !== 'pre' && (
                  <div>
                    <Label htmlFor="indexador">Indexador</Label>
                    <Select value={indexador} onValueChange={(value: any) => setIndexador(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cdi">CDI</SelectItem>
                        <SelectItem value="ipca">IPCA</SelectItem>
                        <SelectItem value="selic">SELIC</SelectItem>
                        <SelectItem value="prefixado">Pré-fixado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="taxaPercentual">
                    Taxa (%)
                    {tipoRentabilidade === 'pos' && ' do CDI'}
                    {tipoRentabilidade === 'ipca' && ' + IPCA'}
                  </Label>
                  <Input
                    id="taxaPercentual"
                    type="text"
                    value={taxaPercentual}
                    onChange={(e) => setTaxaPercentual(formatarValorBR(e.target.value))}
                    placeholder={tipoRentabilidade === 'pos' ? '110' : '12,5'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipoRentabilidade === 'pos' && 'Ex: 110 para 110% do CDI'}
                    {tipoRentabilidade === 'pre' && 'Ex: 12,5 para 12,5% ao ano'}
                    {tipoRentabilidade === 'ipca' && 'Ex: 6,5 para IPCA + 6,5%'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="liquidez">Liquidez</Label>
                  <Select value={liquidez} onValueChange={setLiquidez}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="no_vencimento">No vencimento</SelectItem>
                      <SelectItem value="carencia_90">Carência 90 dias</SelectItem>
                      <SelectItem value="carencia_180">Carência 180 dias</SelectItem>
                      <SelectItem value="carencia_360">Carência 360 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Isenção de IR */}
              <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-lg">
                <input
                  type="checkbox"
                  id="isentoIR"
                  checked={isentoIR}
                  onChange={(e) => setIsentoIR(e.target.checked)}
                  className="w-4 h-4 text-purple-600"
                />
                <Label htmlFor="isentoIR" className="cursor-pointer flex-1">
                  <span className="font-medium">✓ Isento de Imposto de Renda</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    LCI, LCA, CRI, CRA, Debêntures Incentivadas
                  </p>
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataAplicacao">Data de Aplicação</Label>
                  <Input
                    id="dataAplicacao"
                    type="date"
                    value={dataAplicacao}
                    onChange={(e) => setDataAplicacao(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dataVencimento">Data de Vencimento</Label>
                  <Input
                    id="dataVencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>

              {/* Valor Atual Manual */}
              <div className="space-y-3 border-t pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usarValorManual"
                    checked={usarValorManual}
                    onChange={(e) => setUsarValorManual(e.target.checked)}
                    className="w-4 h-4 text-teal-600"
                  />
                  <Label htmlFor="usarValorManual" className="cursor-pointer">
                    Informar valor atual manualmente (sobrescreve cálculo automático)
                  </Label>
                </div>

                {usarValorManual && (
                  <div>
                    <Label htmlFor="valorAtualManual">Valor Atual (R$)</Label>
                    <Input
                      id="valorAtualManual"
                      type="text"
                      value={valorAtualManual}
                      onChange={(e) => setValorAtualManual(formatarValorBR(e.target.value))}
                      placeholder="1728,69"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Use o valor líquido que aparece no app do banco
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações adicionais sobre este investimento..."
              rows={3}
            />
          </div>

          {/* Informações de Contexto */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">{tipoLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-medium">{investimento.quantidade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço Médio:</span>
              <span className="font-medium">{formatCurrency(investimento.preco_medio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-medium">{formatCurrency(investimento.valor_total)}</span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
