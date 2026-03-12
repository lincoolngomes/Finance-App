import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '/src/components/ui/dialog'
import { Button } from '/src/components/ui/button'
import { Label } from '/src/components/ui/label'
import { Input } from '/src/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { Card } from '/src/components/ui/card'
import { Badge } from '/src/components/ui/badge'
import { Progress } from '/src/components/ui/progress'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { toast } from '/src/hooks/use-toast'
import { Upload, FileText, FileSpreadsheet, AlertTriangle, Trash2 } from 'lucide-react'
import Papa from 'papaparse'

interface Transacao {
  id: string
  quando: string
  estabelecimento: string
  valor: number
  tipo: string
  categoria: string
  parcela_atual?: number
  total_parcelas?: number
  isDuplicate?: boolean
}

interface ImportarFaturaModalProps {
  open: boolean
  onClose: () => void
  cardId?: string
}

// Regras de categorização automática
const CATEGORIZATION_RULES = [
  { keywords: ['uber', 'taxi', '99', 'cabify'], category: 'Transporte' },
  { keywords: ['ifood', 'rappi', 'restaurant', 'lanche', 'pizz', 'burguer', 'mc donald'], category: 'Alimentação' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'youtube'], category: 'Entretenimento' },
  { keywords: ['farmacia', 'drogaria', 'hospital', 'clinica', 'medic'], category: 'Saúde' },
  { keywords: ['mercado', 'supermercado', 'atacadao', 'carrefour', 'pao de acucar'], category: 'Supermercado' },
  { keywords: ['posto', 'gasolina', 'combustivel', 'ipiranga', 'shell'], category: 'Combustível' },
  { keywords: ['shopping', 'loja', 'magazine', 'renner', 'c&a', 'zara'], category: 'Compras' },
  { keywords: ['luz', 'energia', 'agua', 'internet', 'telefone', 'celular'], category: 'Contas' },
  { keywords: ['academia', 'gym', 'fitness'], category: 'Saúde' },
]

function categorizarAutomaticamente(estabelecimento: string): string {
  const termo = estabelecimento.toLowerCase()
  
  for (const rule of CATEGORIZATION_RULES) {
    if (rule.keywords.some(keyword => termo.includes(keyword))) {
      return rule.category
    }
  }
  
  return 'Outros'
}

export function ImportarFaturaModal({ open, onClose, cardId }: ImportarFaturaModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState(1) // 1: upload, 2: preview, 3: confirmação
  const [file, setFile] = useState<File | null>(null)
  const [cartoes, setCartoes] = useState<any[]>([])
  const [selectedCard, setSelectedCard] = useState<string>(cardId || '')
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [transacoesExistentes, setTransacoesExistentes] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [categorias, setCategorias] = useState<any[]>([])
  const [criarParcelasFuturas, setCriarParcelasFuturas] = useState(true)
  const [modoImportacao, setModoImportacao] = useState<'ambas' | 'somente_parceladas' | 'somente_nao_parceladas'>('ambas')

  useEffect(() => {
    if (open && user) {
      fetchCartoes()
      fetchCategorias()
      if (selectedCard) {
        fetchTransacoesExistentes()
      }
    }
  }, [open, user, selectedCard])

  useEffect(() => {
    if (cardId) {
      setSelectedCard(cardId)
    }
  }, [cardId])

  const fetchCartoes = async () => {
    const { data, error } = await supabase
      .from('cartoes')
      .select('id, nome')
      .eq('user_id', user?.id)
    
    if (error) {
      console.error('Erro ao buscar cartões:', error)
      toast({
        title: 'Erro ao carregar cartões',
        description: error.message,
        variant: 'destructive'
      })
    } else if (data) {
      console.log('Cartões encontrados:', data)
      setCartoes(data)
    }
  }

  const fetchTransacoesExistentes = async () => {
    if (!selectedCard) return

    const dataLimite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('transacoes')
      .select('data, descricao, valor')
      .eq('cartao_id', selectedCard)
      .gte('data', dataLimite)
    
    if (data) setTransacoesExistentes(data)
  }

  const fetchCategorias = async () => {
    const { data } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('user_id', user?.id)
    
    if (data) setCategorias(data)
  }

  const getCategoryId = async (nomeCategoria: string): Promise<string> => {
    // Primeiro tenta encontrar categoria existente
    let categoria = categorias.find(c => 
      c.nome.toLowerCase() === nomeCategoria.toLowerCase()
    )
    
    // Se não existir, cria
    if (!categoria) {
      const { data, error } = await supabase
        .from('categorias')
        .insert({ user_id: user?.id, nome: nomeCategoria })
        .select()
        .single()
      
      if (data && !error) {
        categoria = data
        setCategorias(prev => [...prev, data])
      }
    }
    
    return categoria?.id || null
  }

  const isDuplicate = (transacao: Transacao): boolean => {
    return transacoesExistentes.some(existing => {
      const sameDate = new Date(existing.data).toDateString() === new Date(transacao.quando).toDateString()
      const sameValue = Math.abs(existing.valor - transacao.valor) < 0.01
      const similarDescription = (existing.descricao || '').toLowerCase().includes(transacao.estabelecimento.toLowerCase().substring(0, 10))
      
      return sameDate && sameValue && similarDescription
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fileType = selectedFile.name.toLowerCase()
    
    if (!fileType.endsWith('.csv') && !fileType.endsWith('.pdf')) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos CSV ou PDF são aceitos',
        variant: 'destructive'
      })
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB',
        variant: 'destructive'
      })
      return
    }

    setFile(selectedFile)
  }

  const processarCSV = async () => {
    if (!file || !selectedCard) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione um cartão e arquivo',
        variant: 'destructive'
      })
      return
    }

    setProgress(10)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setProgress(50)
        
        const dados: Transacao[] = results.data.map((row: any, index) => {
          // Itaú CSV format: detecta várias colunas possíveis
          const data = row.data || row.Data || row.date || row.Date || row.quando || ''
          const descricao = (
            row.descricao || row.Descricao || 
            row.description || row.Description || 
            row.lançamento || row.Lançamento ||
            row.estabelecimento || row.Estabelecimento ||
            row.historico || row.Histórico || 
            row['histórico'] || ''
          ).trim()
          
          const valorStr = row.valor || row.Valor || row.amount || row.Amount || row.total || row.Total || '0'
          
          // Converter valor (formato BR: 1.234,56 ou US: 1234.56)
          let valorRaw = 0
          if (typeof valorStr === 'string') {
            let cleanValue = valorStr.replace(/[R$\s]/g, '')
            
            if (cleanValue.includes('.') && cleanValue.includes(',')) {
              cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
            } else if (cleanValue.includes(',')) {
              cleanValue = cleanValue.replace(',', '.')
            }
            
            valorRaw = parseFloat(cleanValue) || 0
          } else {
            valorRaw = Number(valorStr) || 0
          }

          // Valores negativos = pagamentos/estornos (receita)
          const tipo = valorRaw < 0 ? 'receita' : 'despesa'
          const valor = Math.abs(valorRaw)

          // Detectar parcelas
          let parcela_atual: number | undefined
          let total_parcelas: number | undefined
          const parcelaMatch = descricao.match(/(\d+)\s*\/\s*(\d+)/)
          if (parcelaMatch) {
            parcela_atual = parseInt(parcelaMatch[1])
            total_parcelas = parseInt(parcelaMatch[2])
          }

          // Categorização automática
          const categoria = categorizarAutomaticamente(descricao)

          const transacao: Transacao = {
            id: `temp-${index}`,
            quando: data,
            estabelecimento: descricao,
            valor,
            tipo,
            categoria,
            parcela_atual,
            total_parcelas
          }

          // Detectar duplicatas
          transacao.isDuplicate = isDuplicate(transacao)

          return transacao
        }).filter(t => t.estabelecimento && t.valor > 0)

        setTransacoes(dados)
        setProgress(100)
        setStep(2)
        
        const duplicates = dados.filter(t => t.isDuplicate).length
        if (duplicates > 0) {
          toast({
            title: 'Duplicatas detectadas',
            description: `${duplicates} transação(ões) parecem duplicadas. Revise antes de importar.`,
            variant: 'default'
          })
        }
      },
      error: (error) => {
        toast({
          title: 'Erro ao processar CSV',
          description: error.message,
          variant: 'destructive'
        })
        setProgress(0)
      }
    })
  }

  const processarPDF = async () => {
    if (!file || !selectedCard) return

    setProgress(10)

    try {
      // @ts-ignore - pdf-parse não tem tipos corretos
      const pdfParse = (await import('pdf-parse')).default
      const arrayBuffer = await file.arrayBuffer()
      
      setProgress(30)
      
      const data = await pdfParse(Buffer.from(arrayBuffer))
      const text = data.text
      
      setProgress(60)

      // Regex para extrair transações do Itaú
      // Formato: 12/01  COMPRA LOJA XYZ  R$ 123,45
      const regex = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+R?\$?\s*([\d.,]+)/g
      
      const dados: Transacao[] = []
      let match
      let index = 0

      while ((match = regex.exec(text)) !== null) {
        let [_, date, desc, valueStr] = match
        
        // Adicionar ano se não tiver
        if (!date.includes('/202') && !date.includes('/20')) {
          const currentYear = new Date().getFullYear()
          date = `${date}/${currentYear}`
        }

        const valor = Math.abs(parseFloat(
          valueStr.replace(/\./g, '').replace(',', '.')
        ))

        if (valor > 0 && desc.trim()) {
          // Detectar parcelas
          let parcela_atual: number | undefined
          let total_parcelas: number | undefined
          const parcelaMatch = desc.match(/(\d+)\s*\/\s*(\d+)/)
          if (parcelaMatch) {
            parcela_atual = parseInt(parcelaMatch[1])
            total_parcelas = parseInt(parcelaMatch[2])
          }

          const categoria = categorizarAutomaticamente(desc.trim())

          const transacao: Transacao = {
            id: `temp-${index}`,
            quando: date,
            estabelecimento: desc.trim(),
            valor,
            tipo: 'despesa',
            categoria,
            parcela_atual,
            total_parcelas
          }

          transacao.isDuplicate = isDuplicate(transacao)
          dados.push(transacao)
          index++
        }
      }

      setTransacoes(dados)
      setProgress(100)
      setStep(2)
      
      const duplicates = dados.filter(t => t.isDuplicate).length
      if (duplicates > 0) {
        toast({
          title: 'Duplicatas detectadas',
          description: `${duplicates} transação(ões) parecem duplicadas.`,
        })
      }

    } catch (error: any) {
      console.error('Erro ao processar PDF:', error)
      toast({
        title: 'Erro ao processar PDF',
        description: error.message || 'Verifique se o arquivo está correto',
        variant: 'destructive'
      })
      setProgress(0)
    }
  }

  const removerTransacao = (id: string) => {
    setTransacoes(prev => prev.filter(t => t.id !== id))
  }

  const editarTransacao = (id: string, field: keyof Transacao, value: any) => {
    setTransacoes(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  const removerDuplicatas = () => {
    setTransacoes(prev => prev.filter(t => !t.isDuplicate))
    toast({
      title: 'Duplicatas removidas',
      description: 'Transações duplicadas foram removidas da lista'
    })
  }

  const handleImport = async () => {
    const isParcelada = (t: Transacao) => {
      if (t.total_parcelas && Number(t.total_parcelas) > 1) return true
      return /(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.test((t.estabelecimento || '').trim())
    }
    const transacoesSelecionadas = transacoes.filter(t => {
      if (modoImportacao === 'somente_parceladas') return isParcelada(t)
      if (modoImportacao === 'somente_nao_parceladas') return !isParcelada(t)
      return true
    })

    if (!selectedCard || transacoesSelecionadas.length === 0) {
      if (selectedCard) {
        toast({
          title: 'Nenhuma transação para importar',
          description: 'Nenhuma transação atende ao filtro de importação selecionado.',
          variant: 'destructive'
        })
      }
      return
    }

    setImporting(true)
    setStep(3)
    
    try {
      const total = transacoesSelecionadas.length
      let processed = 0
      let imported = 0
      let futurasCriadas = 0

      // Importar em lotes de 50
      const batchSize = 50
      for (let i = 0; i < transacoesSelecionadas.length; i += batchSize) {
        const batch = transacoesSelecionadas.slice(i, i + batchSize)
        
        const toInsertNested = await Promise.all(batch.map(async (t) => {
          const dataValida = t.quando && !isNaN(new Date(t.quando).getTime())
          const dataObjBase = dataValida ? new Date(t.quando) : new Date()
          const dataISO = dataObjBase.toISOString()
          const categoryId = await getCategoryId(t.categoria)
          
          // Determinar mês/ano da fatura baseado na data da transação
          const faturaMes = dataObjBase.getMonth() + 1
          const faturaAno = dataObjBase.getFullYear()

          const descricaoParcela = (descricao: string, atual: number, totalParcelas: number) => {
            if (/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.test(descricao)) {
              return descricao.replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/, `${atual}/${totalParcelas}`)
            }
            return `${descricao} ${atual}/${totalParcelas}`.trim()
          }

          const baseRecord = {
            user_id: user?.id,
            data: dataISO,
            descricao: t.estabelecimento,
            valor: t.valor,
            tipo: t.tipo,
            observacao: t.parcela_atual && t.total_parcelas 
              ? `Parcela ${t.parcela_atual}/${t.total_parcelas}` 
              : null,
            categoria_id: categoryId,
            cartao_id: selectedCard,
            pago: false,
            fatura_mes: faturaMes,
            fatura_ano: faturaAno,
          }
          
          const records = [baseRecord]

          if (
            criarParcelasFuturas &&
            t.tipo === 'despesa' &&
            t.parcela_atual &&
            t.total_parcelas &&
            t.total_parcelas > t.parcela_atual
          ) {
            for (let prox = t.parcela_atual + 1; prox <= t.total_parcelas; prox++) {
              const offset = prox - t.parcela_atual
              const dataFutura = new Date(faturaAno, faturaMes - 1 + offset, 1)
              const faturaMesFutura = dataFutura.getMonth() + 1
              const faturaAnoFutura = dataFutura.getFullYear()

              records.push({
                user_id: user?.id,
                data: dataFutura.toISOString(),
                descricao: descricaoParcela(t.estabelecimento, prox, t.total_parcelas),
                valor: t.valor,
                tipo: 'despesa',
                observacao: `Parcela ${prox}/${t.total_parcelas}`,
                categoria_id: categoryId,
                cartao_id: selectedCard,
                pago: false,
                fatura_mes: faturaMesFutura,
                fatura_ano: faturaAnoFutura,
              })
              futurasCriadas += 1
            }
          }

          return records
        }))
        const toInsert = toInsertNested.flat()

        const { error } = await supabase
          .from('transacoes')
          .insert(toInsert)

        if (error) throw error

        processed += batch.length
        imported += toInsert.length
        setProgress((processed / total) * 100)
      }

      // Registrar no histórico de importações
      await supabase.from('import_history').insert({
        user_id: user?.id,
        cartao_id: selectedCard,
        file_name: file?.name,
        file_type: file?.name.endsWith('.csv') ? 'csv' : 'pdf',
        transactions_count: transacoesSelecionadas.length,
        imported_at: new Date().toISOString()
      })

      toast({
        title: 'Importação concluída! ✅',
        description: `${transacoesSelecionadas.length} transações importadas${futurasCriadas > 0 ? ` e ${futurasCriadas} parcelas futuras criadas` : ''}.`,
      })

      resetModal()

    } catch (error: any) {
      console.error('Erro ao importar:', error)
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive'
      })
      setStep(2) // Volta para preview
    } finally {
      setImporting(false)
      setProgress(0)
    }
  }

  const resetModal = () => {
    setFile(null)
    setTransacoes([])
    setStep(1)
    setProgress(0)
    setCriarParcelasFuturas(true)
    setModoImportacao('ambas')
    if (!cardId) setSelectedCard('') // Só limpa se não foi passado cardId
    onClose()
  }

  const duplicateCount = transacoes.filter(t => t.isDuplicate).length
  const validCount = transacoes.filter(t => !t.isDuplicate).length

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Fatura de Cartão
          </DialogTitle>
          <DialogDescription>
            Importe transações em formato CSV ou PDF do Itaú
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Seleção de Cartão */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Cartão de destino *</Label>
                {cartoes.length === 0 ? (
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-sm">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">Nenhum cartão encontrado</p>
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                      Crie um cartão de crédito primeiro na página Cartões
                    </p>
                  </div>
                ) : (
                  <Select value={selectedCard} onValueChange={setSelectedCard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {cartoes.map(cartao => (
                        <SelectItem key={cartao.id} value={cartao.id}>
                          {cartao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Upload */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Arquivo da fatura *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Input
                    type="file"
                    accept=".csv,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      {file ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            {file.name.endsWith('.csv') ? (
                              <FileSpreadsheet className="h-8 w-8 text-green-600" />
                            ) : (
                              <FileText className="h-8 w-8 text-green-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Badge variant="secondary">Arquivo selecionado</Badge>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Clique para selecionar arquivo</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              CSV ou PDF (máx. 10MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {progress > 0 && progress < 100 && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Processando arquivo... {progress}%
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={resetModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={file?.name.endsWith('.csv') ? processarCSV : processarPDF}
                  disabled={!file || !selectedCard}
                >
                  Processar Arquivo
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de transações</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{transacoes.length}</p>
                </Card>
                <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Válidas</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{validCount}</p>
                </Card>
                <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Duplicatas</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{duplicateCount}</p>
                </Card>
              </div>

              <div className="p-3 rounded-lg border bg-muted/30">
                <Label className="text-sm font-medium mb-2 block">Filtro de importação</Label>
                <Select value={modoImportacao} onValueChange={(v) => setModoImportacao(v as 'ambas' | 'somente_parceladas' | 'somente_nao_parceladas')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambas">Tudo (parceladas + não parceladas)</SelectItem>
                    <SelectItem value="somente_parceladas">Somente compras parceladas (ex: 3/12)</SelectItem>
                    <SelectItem value="somente_nao_parceladas">Somente compras não parceladas (à vista)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Isso filtra o que será salvo no sistema.
                </p>
              </div>

              {modoImportacao !== 'somente_nao_parceladas' && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={criarParcelasFuturas}
                      onChange={(e) => setCriarParcelasFuturas(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    Gerar lançamentos das próximas parcelas automaticamente
                  </label>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Marcado: uma compra 3/12 gera também 4/12 até 12/12. Desmarcado: importa só o que veio no arquivo.
                  </p>
                </div>
              )}

              {duplicateCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {duplicateCount} duplicata(s) detectada(s)
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={removerDuplicatas}>
                    Remover Duplicatas
                  </Button>
                </div>
              )}

              {/* Tabela de transações */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr className="text-xs">
                        <th className="text-left p-3 font-semibold">Data</th>
                        <th className="text-left p-3 font-semibold">Estabelecimento</th>
                        <th className="text-left p-3 font-semibold">Categoria</th>
                        <th className="text-right p-3 font-semibold">Valor</th>
                        <th className="text-center p-3 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transacoes.map((t) => {
                        const dataValida = t.quando && !isNaN(new Date(t.quando).getTime())
                        const dataFormatada = dataValida 
                          ? new Date(t.quando).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]
                        
                        return (
                        <tr 
                          key={t.id} 
                          className={`border-t ${t.isDuplicate ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                        >
                          <td className="p-3 text-sm">
                            <Input
                              type="date"
                              value={dataFormatada}
                              onChange={(e) => editarTransacao(t.id, 'quando', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-3 text-sm">
                            <Input
                              value={t.estabelecimento}
                              onChange={(e) => editarTransacao(t.id, 'estabelecimento', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-3 text-sm">
                            <Input
                              value={t.categoria}
                              onChange={(e) => editarTransacao(t.id, 'categoria', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-3 text-sm text-right font-medium">
                            R$ {t.valor.toFixed(2).replace('.', ',')}
                            {t.parcela_atual && t.total_parcelas && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({t.parcela_atual}/{t.total_parcelas})
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removerTransacao(t.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={resetModal}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={transacoes.length === 0}
                >
                  Importar {validCount} Transações
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTANDO */}
          {step === 3 && (
            <div className="space-y-6 py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Upload className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Importando transações...</h3>
                <p className="text-sm text-muted-foreground">
                  Por favor aguarde, estamos processando suas transações
                </p>
              </div>
              <Progress value={progress} className="w-2/3 mx-auto" />
              <p className="text-sm font-medium">{Math.round(progress)}%</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
