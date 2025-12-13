import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInvestments, Investimento } from '@/hooks/useInvestments'
import { formatCurrency } from '@/utils/currency'

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
  
  // Campos específicos de renda fixa
  const [tipoRentabilidade, setTipoRentabilidade] = useState<'pos' | 'pre' | 'ipca' | 'hibrido'>('pos')
  const [taxaPercentual, setTaxaPercentual] = useState('')
  const [indexador, setIndexador] = useState<'cdi' | 'ipca' | 'selic' | 'prefixado'>('cdi')
  const [dataVencimento, setDataVencimento] = useState('')
  const [liquidez, setLiquidez] = useState('no_vencimento')
  const [dataAplicacao, setDataAplicacao] = useState('')

  // Carregar dados do investimento quando abrir o diálogo
  useEffect(() => {
    if (open && investimento) {
      setCodigo(investimento.codigo)
      setNome(investimento.nome)
      setInstituicao(investimento.instituicao || '')
      setObservacoes(investimento.observacoes || '')
      
      if (investimento.tipo === 'renda_fixa') {
        setTipoRentabilidade(investimento.tipo_rentabilidade || 'pos')
        setTaxaPercentual(investimento.taxa_percentual?.toString() || '')
        setIndexador(investimento.indexador || 'cdi')
        setDataVencimento(investimento.data_vencimento || '')
        setLiquidez(investimento.liquidez || 'no_vencimento')
        setDataAplicacao(investimento.data_aplicacao || '')
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
        dadosAtualizados.taxa_percentual = parseFloat(taxaPercentual) || undefined
        dadosAtualizados.indexador = indexador
        dadosAtualizados.data_vencimento = dataVencimento || undefined
        dadosAtualizados.liquidez = liquidez
        dadosAtualizados.data_aplicacao = dataAplicacao || undefined
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

  const isRendaFixa = investimento.tipo === 'renda_fixa'
  const tipoLabel = {
    acao: 'Ação',
    fii: 'FII',
    etf: 'ETF',
    renda_fixa: 'Renda Fixa',
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
                    type="number"
                    step="0.01"
                    value={taxaPercentual}
                    onChange={(e) => setTaxaPercentual(e.target.value)}
                    placeholder={tipoRentabilidade === 'pos' ? '110' : '12.5'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tipoRentabilidade === 'pos' && 'Ex: 110 para 110% do CDI'}
                    {tipoRentabilidade === 'pre' && 'Ex: 12.5 para 12,5% ao ano'}
                    {tipoRentabilidade === 'ipca' && 'Ex: 6.5 para IPCA + 6,5%'}
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
