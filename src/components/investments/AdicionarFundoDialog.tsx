import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validarCNPJ, buscarFundoCVM } from '@/utils/cvm'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface AdicionarFundoDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddFundo: (dados: {
    tipo: 'fundo' | 'previdencia'
    codigo: string
    nome: string
    quantidade: number
    preco_medio: number
    ativarSincronizacaoAutomatica: boolean
    frequencia: 'diaria' | 'semanal' | 'mensal'
  }) => Promise<void>
}

export function AdicionarFundoDialog({
  isOpen,
  onClose,
  onAddFundo,
}: AdicionarFundoDialogProps) {
  const [tipo, setTipo] = useState<'fundo' | 'previdencia'>('fundo')
  const [cnpj, setCnpj] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [cotaCompra, setCotaCompra] = useState('')
  const [ativarSincronizacao, setAtivarSincronizacao] = useState(true)
  const [frequencia, setFrequencia] = useState<'diaria' | 'semanal' | 'mensal'>(
    'diaria'
  )
  const [buscando, setBuscando] = useState(false)
  const [fundoEncontrado, setFundoEncontrado] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleBuscarFundo = async () => {
    setErro('')
    setFundoEncontrado(null)

    if (!cnpj.trim()) {
      setErro('Digite um CNPJ válido')
      return
    }

    if (!validarCNPJ(cnpj)) {
      setErro('CNPJ inválido')
      return
    }

    setBuscando(true)
    try {
      const fundo = await buscarFundoCVM(cnpj)
      if (fundo) {
        setFundoEncontrado(fundo)
      } else {
        setErro('Fundo não encontrado na base de dados da CVM')
      }
    } catch (err) {
      setErro('Erro ao buscar fundo. Tente novamente.')
      console.error(err)
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async () => {
    if (!fundoEncontrado) {
      setErro('Busque um fundo primeiro')
      return
    }

    if (!quantidade || !cotaCompra) {
      setErro('Preencha quantidade e cota de compra')
      return
    }

    setSalvando(true)
    try {
      await onAddFundo({
        tipo,
        codigo: fundoEncontrado.cnpj,
        nome: fundoEncontrado.nome,
        quantidade: parseFloat(quantidade),
        preco_medio: parseFloat(cotaCompra),
        ativarSincronizacaoAutomatica: ativarSincronizacao,
        frequencia,
      })

      // Reset form
      setCnpj('')
      setQuantidade('')
      setCotaCompra('')
      setFundoEncontrado(null)
      setErro('')
      onClose()
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : 'Erro ao adicionar fundo'
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Fundo de Investimento</DialogTitle>
          <DialogDescription>
            Busque fundos na base de dados da CVM e ative atualizações
            automáticas de cotas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de fundo */}
          <div>
            <Label>Tipo de Fundo</Label>
            <Select value={tipo} onValueChange={(val) => setTipo(val as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fundo">Fundo de Investimento</SelectItem>
                <SelectItem value="previdencia">Fundo de Previdência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CNPJ */}
          <div>
            <Label>CNPJ do Fundo</Label>
            <div className="flex gap-2">
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={buscando}
              />
              <Button
                onClick={handleBuscarFundo}
                disabled={buscando || !cnpj.trim()}
                variant="outline"
              >
                {buscando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Buscar'
                )}
              </Button>
            </div>
          </div>

          {/* Fundo encontrado */}
          {fundoEncontrado && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{fundoEncontrado.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Cota atual: R$ {fundoEncontrado.cotaAtual?.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atualização: {new Date(fundoEncontrado.dataAtualizacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quantidade */}
          <div>
            <Label>Quantidade de Cotas</Label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              disabled={!fundoEncontrado}
            />
          </div>

          {/* Cota de Compra */}
          <div>
            <Label>Cota de Compra (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.0001"
              value={cotaCompra}
              onChange={(e) => setCotaCompra(e.target.value)}
              disabled={!fundoEncontrado}
            />
          </div>

          {/* Sincronização automática */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync"
                  checked={ativarSincronizacao}
                  onCheckedChange={(checked) =>
                    setAtivarSincronizacao(checked as boolean)
                  }
                />
                <Label htmlFor="sync" className="text-sm font-medium cursor-pointer">
                  Atualizar cota automaticamente
                </Label>
              </div>

              {ativarSincronizacao && (
                <div>
                  <Label className="text-xs">Frequência de Atualização</Label>
                  <Select
                    value={frequencia}
                    onValueChange={(val) =>
                      setFrequencia(val as 'diaria' | 'semanal' | 'mensal')
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diariamente</SelectItem>
                      <SelectItem value="semanal">Semanalmente</SelectItem>
                      <SelectItem value="mensal">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Erro */}
          {erro && (
            <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!fundoEncontrado || !quantidade || !cotaCompra || salvando}
            >
              {salvando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar Fundo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
