import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '/src/components/ui/dialog'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Label } from '/src/components/ui/label'
import { Alert, AlertDescription } from '/src/components/ui/alert'
import { Download, AlertCircle, CheckCircle, Loader2, FileSpreadsheet, ExternalLink, ShieldCheck, Upload, PencilLine, Trash2 } from 'lucide-react'
import { supabase } from '/src/lib/supabase'
import { useAuth } from '/src/hooks/useAuth'
import { useToast } from '/src/hooks/use-toast'

interface ImportB3DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type CsvRow = Record<string, unknown>
type TipoInvestimento =
  | 'acao'
  | 'renda_fixa'
  | 'tesouro_direto'
  | 'cri'
  | 'cra'
  | 'debenture'
  | 'cripto'
  | 'fii'
  | 'etf'
  | 'fundo'
  | 'previdencia'
type StatusMessageType = 'info' | 'success' | 'error'

interface PreviewRow {
  id: string
  user_id: string
  tipo: TipoInvestimento
  codigo: string
  nome: string
  instituicao: string | null
  quantidade: number
  preco_medio: number
  valor_total: number
  data_primeira_compra: string | null
  data_aplicacao: string | null
  data_vencimento: string | null
  tipo_rentabilidade: 'pos' | 'pre' | 'ipca' | 'hibrido' | null
  taxa_percentual: number | null
  indexador: 'cdi' | 'ipca' | 'selic' | 'prefixado' | null
  liquidez: string | null
  isento_ir: boolean
  valor_atual_manual: number | null
  ativo: boolean
}

interface ParseResult {
  rows: PreviewRow[]
  ignored: number
}

const NORMALIZE_RE = /[^a-z0-9]/g
const INVESTMENT_TYPE_OPTIONS: Array<{ value: TipoInvestimento; label: string }> = [
  { value: 'acao', label: 'Ação' },
  { value: 'fii', label: 'FII (Fundo Imobiliário)' },
  { value: 'etf', label: 'ETF' },
  { value: 'renda_fixa', label: 'Renda Fixa (CDB, LCI, LCA)' },
  { value: 'tesouro_direto', label: 'Tesouro Direto' },
  { value: 'cri', label: 'CRI' },
  { value: 'cra', label: 'CRA' },
  { value: 'debenture', label: 'Debênture' },
  { value: 'cripto', label: 'Criptomoeda' },
  { value: 'fundo', label: 'Fundo de Investimento' },
  { value: 'previdencia', label: 'Previdência Privada' },
]

const RENTABILIDADE_OPTIONS = [
  { value: 'pos', label: 'Pós-fixado' },
  { value: 'pre', label: 'Pré-fixado' },
  { value: 'ipca', label: 'IPCA+' },
  { value: 'hibrido', label: 'Híbrido/Outro' },
] as const

const INDEXADOR_OPTIONS = [
  { value: 'cdi', label: 'CDI' },
  { value: 'ipca', label: 'IPCA' },
  { value: 'selic', label: 'SELIC' },
  { value: 'prefixado', label: 'Pré-fixado' },
] as const

const LIQUIDEZ_OPTIONS = [
  { value: 'diaria', label: 'Liquidez diária' },
  { value: 'no_vencimento', label: 'Apenas no vencimento' },
] as const

function getTipoLabel(tipo: TipoInvestimento): string {
  return INVESTMENT_TYPE_OPTIONS.find((option) => option.value === tipo)?.label || tipo
}

function getRowIssues(row: PreviewRow): string[] {
  const issues: string[] = []

  if (!row.codigo?.trim()) issues.push('Código vazio')
  if (!row.nome?.trim()) issues.push('Nome vazio')
  if (!row.quantidade || row.quantidade <= 0) issues.push('Quantidade inválida')
  if (!row.preco_medio || row.preco_medio <= 0) issues.push('Preço médio inválido')

  const isRendaFixa = ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(row.tipo)
  if (isRendaFixa) {
    if (!row.tipo_rentabilidade) issues.push('Rentabilidade não definida')
    if (row.tipo_rentabilidade && !row.indexador) issues.push('Indexador não definido')
  }

  return issues
}

function normalizeKey(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(NORMALIZE_RE, '')
}

function parseNumberBR(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (!value) return 0

  let str = String(value).trim()
  if (!str) return 0

  str = str.replace(/[R$\s]/gi, '')

  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  }

  str = str.replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(str)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseDateToISO(value: unknown): string | undefined {
  const raw = String(value || '').trim()
  if (!raw) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return undefined
  return dt.toISOString().slice(0, 10)
}

function getValue(row: CsvRow, aliases: string[]): unknown {
  const entries = Object.entries(row)
  const wanted = aliases.map(normalizeKey)

  for (const [key, value] of entries) {
    if (wanted.includes(normalizeKey(key))) return value
  }

  return undefined
}

function inferTipo(nome: string, codigo: string, tipoTexto: string): TipoInvestimento {
  const base = `${nome} ${codigo} ${tipoTexto}`.toLowerCase()

  if (base.includes('tesouro')) return 'tesouro_direto'
  if (base.includes('cri')) return 'cri'
  if (base.includes('cra')) return 'cra'
  if (base.includes('debenture')) return 'debenture'
  if (base.includes('fii') || base.includes('fundo imobiliario')) return 'fii'
  if (base.includes('etf')) return 'etf'
  if (base.includes('previdencia') || base.includes('pgbl') || base.includes('vgbl')) return 'previdencia'
  if (base.includes('fundo') && !base.includes('fundo imobiliario')) return 'fundo'
  if (base.includes('btc') || base.includes('eth') || base.includes('cripto')) return 'cripto'
  if (
    base.includes('cdb') ||
    base.includes('lci') ||
    base.includes('lca') ||
    base.includes('debenture') ||
    base.includes('tesouro') ||
    base.includes('renda fixa') ||
    base.includes('cri') ||
    base.includes('cra')
  ) {
    return 'renda_fixa'
  }

  return 'acao'
}

function inferRentabilidade(texto: string): 'pos' | 'pre' | 'ipca' | undefined {
  const base = texto.toLowerCase()
  if (base.includes('ipca')) return 'ipca'
  if (base.includes('pre')) return 'pre'
  if (base.includes('cdi') || base.includes('pos')) return 'pos'
  return undefined
}

function inferIndexador(texto: string): 'cdi' | 'ipca' | 'selic' | 'prefixado' | undefined {
  const base = texto.toLowerCase()
  if (base.includes('ipca')) return 'ipca'
  if (base.includes('selic')) return 'selic'
  if (base.includes('cdi')) return 'cdi'
  if (base.includes('pre') || base.includes('prefix')) return 'prefixado'
  return undefined
}

function inferIsentoIR(nome: string, codigo: string, tipo: TipoInvestimento): boolean {
  const base = `${nome} ${codigo}`.toLowerCase()

  if (tipo === 'cri' || tipo === 'cra') return true
  if (base.includes('lci') || base.includes('lca')) return true
  if (base.includes('debenture') && base.includes('incentiv')) return true

  return false
}

async function readRawRows(file: File): Promise<CsvRow[]> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    return workbook.SheetNames.flatMap((sheetName) => {
      const ws = workbook.Sheets[sheetName]
      return XLSX.utils.sheet_to_json<CsvRow>(ws, { defval: '' })
    })
  }

  const parsed = await new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: resolve,
      error: reject,
    })
  })

  return parsed.data || []
}

function mapRowsToPreviewRows(rawRows: CsvRow[], userId: string): ParseResult {
  let ignored = 0

  const rows = rawRows
    .map((row, index): PreviewRow | null => {
      const codigoRaw = String(
        getValue(row, ['codigo', 'codigo isin', 'codigo negociacao', 'ticker', 'ativo', 'papel']) || ''
      ).trim()
      const nomeRaw = String(getValue(row, ['nome', 'produto', 'descricao', 'titulo']) || '').trim()
      const tipoRaw = String(getValue(row, ['tipo', 'segmento', 'classe', 'tipodeativo']) || '').trim()
      const instituicaoRaw = String(
        getValue(row, ['instituicao', 'corretora', 'escriturador', 'custodiante']) || ''
      ).trim()

      const quantidade = Math.abs(parseNumberBR(getValue(row, ['quantidade', 'qtd', 'saldo', 'posicao'])))
      const precoMedio = Math.abs(
        parseNumberBR(getValue(row, ['preco medio', 'precomedio', 'preco', 'preco unitario']))
      )
      const valorAtual = Math.abs(
        parseNumberBR(
          getValue(row, [
            'valor atualizado',
            'valor atualizado curva',
            'valor atualizado fechamento',
            'valor atual',
            'valor mercado',
            'valor liquido',
            'financeiro',
            'valor',
          ])
        )
      )
      const valorInvestido = Math.abs(
        parseNumberBR(getValue(row, ['valor investido', 'valor aplicado', 'principal']))
      )

      const vencimento = parseDateToISO(getValue(row, ['vencimento', 'data vencimento']))
      const dataRef = parseDateToISO(getValue(row, ['data referencia', 'data posicao', 'data base']))
      const dataAplicacaoImportada = parseDateToISO(
        getValue(row, ['data aplicacao', 'data de aplicacao', 'data emissao', 'data de emissao'])
      )
      const taxaTexto = String(
        getValue(row, ['taxa', 'rentabilidade', 'taxa contratada', 'taxa a a']) || ''
      ).trim()
      const taxaPercentual = Math.abs(parseNumberBR(taxaTexto))

      const codigo = (codigoRaw || nomeRaw).toUpperCase().slice(0, 50)
      const nome = (nomeRaw || codigoRaw).slice(0, 200)

      if (!codigo || !nome || nome.toLowerCase() === 'total') {
        ignored += 1
        return null
      }

      const tipo = inferTipo(nome, codigo, tipoRaw)
      const isFixedIncomeLike = ['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(tipo)
      const rentabilidadeInferida = inferRentabilidade(`${taxaTexto} ${nome} ${tipoRaw}`)
      const indexadorInferido = inferIndexador(`${taxaTexto} ${nome} ${tipoRaw}`)

      let quantidadeFinal = quantidade
      let precoMedioFinal = precoMedio

      if (isFixedIncomeLike) {
        // Na B3 (renda fixa), a "quantidade" costuma representar o principal aplicado em R$.
        // O app já calcula curva/rentabilidade internamente, então não devemos usar "valor a curva"
        // como preço médio.
        if (!quantidadeFinal && valorInvestido > 0) {
          quantidadeFinal = valorInvestido
        }
        if (quantidadeFinal > 0 && !precoMedioFinal) {
          precoMedioFinal = 1
        }
      } else {
        if (!precoMedioFinal && quantidadeFinal > 0 && valorInvestido > 0) {
          precoMedioFinal = valorInvestido / quantidadeFinal
        }

        if ((!quantidadeFinal || !precoMedioFinal) && valorInvestido > 0) {
          quantidadeFinal = 1
          precoMedioFinal = valorInvestido
        }

        if ((!quantidadeFinal || !precoMedioFinal) && valorAtual > 0) {
          quantidadeFinal = 1
          precoMedioFinal = valorAtual
        }
      }

      if (!quantidadeFinal || !precoMedioFinal) {
        ignored += 1
        return null
      }

          return {
            id: `${index}-${codigo}`,
            user_id: userId,
            tipo,
        codigo,
        nome,
        instituicao: instituicaoRaw || null,
        quantidade: Number(quantidadeFinal.toFixed(8)),
        preco_medio: Number(precoMedioFinal.toFixed(8)),
        valor_total: Number((quantidadeFinal * precoMedioFinal).toFixed(2)),
        data_primeira_compra: dataAplicacaoImportada || dataRef || null,
        data_aplicacao: dataAplicacaoImportada || null,
            data_vencimento: vencimento || null,
            tipo_rentabilidade: isFixedIncomeLike ? (rentabilidadeInferida || 'pos') : (rentabilidadeInferida || null),
            taxa_percentual: isFixedIncomeLike ? (taxaPercentual || 100) : (taxaPercentual || null),
            indexador: isFixedIncomeLike ? (indexadorInferido || 'cdi') : (indexadorInferido || null),
            liquidez: isFixedIncomeLike ? 'no_vencimento' : null,
            isento_ir: inferIsentoIR(nome, codigo, tipo),
            // Para renda fixa, deixamos o app recalcular diariamente (evita "congelar" no
            // valor da data de posição do arquivo exportado).
            valor_atual_manual: isFixedIncomeLike ? null : valorAtual > 0 ? Number(valorAtual.toFixed(2)) : null,
            ativo: true,
          }
    })
    .filter(Boolean) as PreviewRow[]

  return { rows, ignored }
}

export function ImportB3Dialog({ open, onOpenChange, onSuccess }: ImportB3DialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null)
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<TipoInvestimento | 'all'>('all')
  const [searchPreview, setSearchPreview] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [ignoredCount, setIgnoredCount] = useState(0)
  const [statusMessage, setStatusMessage] = useState<{ type: StatusMessageType; text: string } | null>(null)

  const fileLabel = useMemo(() => {
    if (!csvFile) return 'Nenhum arquivo selecionado'
    return `${csvFile.name} (${Math.round(csvFile.size / 1024)} KB)`
  }, [csvFile])

  const tipoCounts = useMemo(() => {
    return previewRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.tipo] = (acc[row.tipo] || 0) + 1
      return acc
    }, {})
  }, [previewRows])

  const filteredPreviewRows = useMemo(() => {
    const baseRows =
      selectedTipoFilter === 'all' ? previewRows : previewRows.filter((row) => row.tipo === selectedTipoFilter)

    const q = searchPreview.trim().toLowerCase()
    if (!q) return baseRows

    return baseRows.filter((row) => {
      return row.nome.toLowerCase().includes(q) || row.codigo.toLowerCase().includes(q)
    })
  }, [previewRows, selectedTipoFilter, searchPreview])

  const selectedPreviewRow = useMemo(() => {
    if (!filteredPreviewRows.length) return null
    const byId = filteredPreviewRows.find((row) => row.id === selectedPreviewId)
    return byId || filteredPreviewRows[0]
  }, [filteredPreviewRows, selectedPreviewId])

  const selectedRowIssues = useMemo(() => {
    return selectedPreviewRow ? getRowIssues(selectedPreviewRow) : []
  }, [selectedPreviewRow])

  const selectedRowsCount = useMemo(() => {
    return previewRows.filter((row) => selectedRowIds.has(row.id)).length
  }, [previewRows, selectedRowIds])

  const areAllFilteredSelected = useMemo(() => {
    if (!filteredPreviewRows.length) return false
    return filteredPreviewRows.every((row) => selectedRowIds.has(row.id))
  }, [filteredPreviewRows, selectedRowIds])

  const reviewStats = useMemo(() => {
    const withIssues = previewRows.filter((row) => getRowIssues(row).length > 0).length
    return {
      total: previewRows.length,
      withIssues,
      ready: Math.max(0, previewRows.length - withIssues),
    }
  }, [previewRows])

  const resetMessages = () => {
    setError(null)
    setSuccess(null)
    setImportedCount(0)
    setStatusMessage(null)
  }

  const handlePreviewFile = async () => {
    resetMessages()

    if (!user?.id) {
      const msg = 'Usuário não autenticado.'
      setError(msg)
      setStatusMessage({ type: 'error', text: msg })
      toast({ title: 'Importação não realizada', description: msg, variant: 'destructive', duration: 6000 })
      return
    }

    if (!csvFile) {
      const msg = 'Selecione um arquivo CSV, XLSX ou XLS para visualizar.'
      setError(msg)
      setStatusMessage({ type: 'error', text: msg })
      toast({ title: 'Selecione um arquivo', description: msg, variant: 'destructive', duration: 6000 })
      return
    }

    setLoading(true)
    setStatusMessage({ type: 'info', text: 'Lendo arquivo para pré-visualização...' })

    try {
      const rawRows = await readRawRows(csvFile)
      if (!rawRows.length) {
        throw new Error('Arquivo vazio ou inválido.')
      }

      const result = mapRowsToPreviewRows(rawRows, user.id)
      if (!result.rows.length) {
        throw new Error('Não encontrei linhas válidas para importar nesse arquivo.')
      }

      setPreviewRows(result.rows)
      setSelectedRowIds(new Set(result.rows.map((row) => row.id)))
      setSelectedTipoFilter('all')
      setSearchPreview('')
      setSelectedPreviewId(result.rows[0]?.id || null)
      setIgnoredCount(result.ignored)
      setStep('preview')

      const msg = `Pré-visualização pronta: ${result.rows.length} linha(s) carregada(s).`
      setStatusMessage({ type: 'success', text: msg })
      toast({ title: 'Pré-visualização carregada', description: msg, duration: 5000 })
    } catch (err: any) {
      const mensagemErro = err?.message || 'Erro ao processar arquivo da B3.'
      setError(mensagemErro)
      setStatusMessage({ type: 'error', text: mensagemErro })
      toast({ title: 'Erro ao processar arquivo', description: mensagemErro, variant: 'destructive', duration: 7000 })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePreviewField = (rowId: string, field: keyof PreviewRow, value: string) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row

        if (field === 'quantidade') {
          const quantidade = Math.max(0, parseNumberBR(value))
          return {
            ...row,
            quantidade,
            valor_total: Number((quantidade * row.preco_medio).toFixed(2)),
          }
        }

        if (field === 'preco_medio') {
          const preco = Math.max(0, parseNumberBR(value))
          return {
            ...row,
            preco_medio: preco,
            valor_total: Number((row.quantidade * preco).toFixed(2)),
          }
        }

        if (field === 'tipo') {
          return {
            ...row,
            tipo: (value as TipoInvestimento) || 'acao',
          }
        }

        if (field === 'tipo_rentabilidade') {
          return {
            ...row,
            tipo_rentabilidade: (value as PreviewRow['tipo_rentabilidade']) || null,
          }
        }

        if (field === 'indexador') {
          return {
            ...row,
            indexador: (value as PreviewRow['indexador']) || null,
          }
        }

        if (field === 'liquidez') {
          return {
            ...row,
            liquidez: value || null,
          }
        }

        if (field === 'taxa_percentual') {
          return {
            ...row,
            taxa_percentual: value.trim() ? parseNumberBR(value) : null,
          }
        }

        if (field === 'data_vencimento') {
          return {
            ...row,
            data_vencimento: value || null,
          }
        }

        if (field === 'data_aplicacao') {
          return {
            ...row,
            data_aplicacao: value || null,
          }
        }

        if (field === 'codigo') {
          return {
            ...row,
            codigo: value.toUpperCase().slice(0, 50),
          }
        }

        if (field === 'nome') {
          return {
            ...row,
            nome: value.slice(0, 200),
          }
        }

        if (field === 'instituicao') {
          return {
            ...row,
            instituicao: value.trim() ? value : null,
          }
        }

        return row
      })
    )
  }

  const handleRemovePreviewRow = (rowId: string) => {
    setPreviewRows((prev) => {
      const updated = prev.filter((row) => row.id !== rowId)
      if (selectedPreviewId === rowId) {
        setSelectedPreviewId(updated[0]?.id || null)
      }
      return updated
    })
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })
  }

  const handleImportPreview = async () => {
    resetMessages()

    if (!user?.id) {
      const msg = 'Usuário não autenticado.'
      setError(msg)
      setStatusMessage({ type: 'error', text: msg })
      toast({ title: 'Importação não realizada', description: msg, variant: 'destructive', duration: 6000 })
      return
    }

    if (!previewRows.length) {
      const msg = 'Não há linhas para importar.'
      setError(msg)
      setStatusMessage({ type: 'error', text: msg })
      toast({ title: 'Nada para importar', description: msg, variant: 'destructive', duration: 6000 })
      return
    }

    const typedPayload = previewRows
      .filter((item) => selectedRowIds.has(item.id))
      .filter((item) => item.codigo && item.nome && item.quantidade > 0 && item.preco_medio > 0)
      .map((item) => ({
        user_id: user.id,
        tipo: item.tipo,
        codigo: item.codigo,
        nome: item.nome,
        instituicao: item.instituicao,
        quantidade: item.quantidade,
        preco_medio: item.preco_medio,
        valor_total: Number((item.quantidade * item.preco_medio).toFixed(2)),
        data_primeira_compra: item.data_primeira_compra,
        data_aplicacao: item.data_aplicacao,
        data_vencimento: item.data_vencimento,
        tipo_rentabilidade: item.tipo_rentabilidade,
        taxa_percentual: item.taxa_percentual,
        indexador: item.indexador,
        liquidez: item.liquidez,
        isento_ir: item.isento_ir,
        valor_atual_manual: item.valor_atual_manual,
        ativo: true,
      }))

    if (!typedPayload.length) {
      const msg =
        selectedRowsCount === 0
          ? 'Selecione ao menos um investimento para importar.'
          : 'As linhas selecionadas estão inválidas. Revise código, nome, quantidade e preço médio.'
      setError(msg)
      setStatusMessage({ type: 'error', text: msg })
      toast({ title: 'Dados inválidos', description: msg, variant: 'destructive', duration: 7000 })
      return
    }

    setLoading(true)
    setStatusMessage({ type: 'info', text: 'Importação em andamento. Aguarde...' })

    try {
      const codigosUnicos = Array.from(new Set(typedPayload.map((k) => k.codigo)))

      const { data: existentes, error: existentesError } = await supabase
        .from('investimentos')
        .select('id,codigo,tipo,user_id')
        .eq('user_id', user.id)
        .in('codigo', codigosUnicos)

      if (existentesError) throw existentesError

      const existentesMap = new Map<string, { id: string }>()
      ;(existentes || []).forEach((item: any) => {
        const key = `${String(item.codigo)}__${String(item.tipo)}`
        existentesMap.set(key, { id: item.id })
      })

      let processados = 0
      const erros: string[] = []

      for (const item of typedPayload) {
        const key = `${String(item.codigo)}__${String(item.tipo)}`
        const existente = existentesMap.get(key)

        if (existente) {
          const { error: updateError } = await supabase
            .from('investimentos')
            .update({
              nome: item.nome,
              instituicao: item.instituicao,
              quantidade: item.quantidade,
              preco_medio: item.preco_medio,
              valor_total: item.valor_total,
              data_primeira_compra: item.data_primeira_compra,
              data_aplicacao: item.data_aplicacao,
              data_vencimento: item.data_vencimento,
              tipo_rentabilidade: item.tipo_rentabilidade,
              taxa_percentual: item.taxa_percentual,
              indexador: item.indexador,
              liquidez: item.liquidez,
              isento_ir: item.isento_ir,
              valor_atual_manual: item.valor_atual_manual,
              ativo: true,
            })
            .eq('id', existente.id)
            .eq('user_id', user.id)

          if (updateError) {
            erros.push(updateError.message)
            continue
          }
        } else {
          const { error: insertError } = await supabase.from('investimentos').insert(item)
          if (insertError) {
            erros.push(insertError.message)
            continue
          }
        }

        processados += 1
      }

      if (processados === 0 && erros.length > 0) {
        throw new Error(erros[0])
      }

      const teveErros = erros.length > 0
      const mensagem = teveErros
        ? `Importação concluída parcialmente: ${processados} processado(s), ${erros.length} com erro.`
        : `Importação concluída com sucesso. ${processados} investimento(s) processado(s).`

      setImportedCount(processados)
      setSuccess(mensagem)
      setStatusMessage({ type: teveErros ? 'error' : 'success', text: mensagem })

      toast({
        title: teveErros ? 'Importação parcial da B3' : 'Importação B3 concluída',
        description: mensagem,
        variant: teveErros ? 'destructive' : undefined,
        duration: 7000,
      })

      if (onSuccess) await onSuccess()
    } catch (err: any) {
      const mensagemErro = err?.message || 'Erro ao importar arquivo da B3.'
      setError(mensagemErro)
      setStatusMessage({ type: 'error', text: mensagemErro })
      toast({ title: 'Erro ao importar B3', description: mensagemErro, variant: 'destructive', duration: 7000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[980px] p-0 overflow-hidden border-slate-800 bg-slate-950 max-h-[92vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-slate-200" />
            </div>
            <div>
              <DialogTitle className="text-xl text-slate-100 leading-tight">Importar B3</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm mt-1">
                Primeiro visualize e edite os dados. Depois confirme a importação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {step === 'upload' && (
            <>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm text-slate-300 font-medium mb-3">Passos para exportar na B3</div>
                <div className="space-y-2 text-sm">
                  <div className="text-slate-300">
                    <span className="text-slate-500 mr-2">1.</span>
                    Acesse{' '}
                    <a
                      href="https://investidor.b3.com.br"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
                    >
                      investidor.b3.com.br <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 mr-2">2.</span>
                    Minha carteira {'>'} Investimentos
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 mr-2">3.</span>
                    Clique em Baixar e exporte em Excel (.xlsx) ou CSV
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 mr-2">4.</span>
                    Selecione o arquivo abaixo e clique em Pré-visualizar
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-100">
                  <Upload className="w-4 h-4 text-cyan-300" />
                  <Label htmlFor="b3-csv-file" className="font-semibold">
                    Arquivo da B3
                  </Label>
                </div>
                <div className="text-xs text-slate-400 -mt-1">Formatos aceitos: CSV, XLSX, XLS</div>

                <Input
                  id="b3-csv-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  disabled={loading}
                  className="h-11 bg-slate-950/70 border-slate-700 text-slate-200 file:bg-blue-600/90 file:text-white file:border-0 file:rounded-md file:px-3 file:py-2 file:mr-3 hover:file:bg-blue-500"
                  onChange={(e) => {
                    resetMessages()
                    setStep('upload')
                    setPreviewRows([])
                    setSelectedRowIds(new Set())
                    setSelectedPreviewId(null)
                    setSelectedTipoFilter('all')
                    setSearchPreview('')
                    setIgnoredCount(0)
                    const file = e.target.files?.[0] || null
                    setCsvFile(file)
                  }}
                />

                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                  {fileLabel}
                </div>
              </div>

              {!error && !success && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  Dica: prefira arquivo Excel (.xlsx) para melhor compatibilidade.
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-slate-100 font-semibold flex items-center gap-2">
                    <PencilLine className="w-4 h-4 text-cyan-300" />
                    Revise e edite antes de importar
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {previewRows.length} linha(s) pronta(s) para importação
                    {ignoredCount > 0 ? ` • ${ignoredCount} linha(s) ignorada(s)` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-200"
                    disabled={loading}
                    onClick={() => {
                      setStep('upload')
                      setPreviewRows([])
                      setSelectedRowIds(new Set())
                      setSelectedPreviewId(null)
                      setSelectedTipoFilter('all')
                      setSearchPreview('')
                      setIgnoredCount(0)
                      resetMessages()
                    }}
                  >
                    Trocar arquivo
                  </Button>
                  <Button
                    onClick={handleImportPreview}
                    disabled={loading || previewRows.length === 0 || selectedRowsCount === 0}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      'Importar selecionados'
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Total</div>
                  <div className="text-xl font-semibold text-slate-100">{reviewStats.total}</div>
                </div>
                <div className="rounded-md border border-emerald-800/60 bg-emerald-950/20 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-emerald-400/80">Prontos</div>
                  <div className="text-xl font-semibold text-emerald-300">{reviewStats.ready}</div>
                </div>
                <div className="rounded-md border border-amber-800/60 bg-amber-950/20 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-amber-400/80">Com pendências</div>
                  <div className="text-xl font-semibold text-amber-300">{reviewStats.withIssues}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 p-3 space-y-3">
                <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={areAllFilteredSelected}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedRowIds((prev) => {
                          const next = new Set(prev)
                          if (checked) {
                            filteredPreviewRows.forEach((row) => next.add(row.id))
                          } else {
                            filteredPreviewRows.forEach((row) => next.delete(row.id))
                          }
                          return next
                        })
                      }}
                    />
                    Selecionar todos do filtro
                  </label>
                  <div className="text-xs text-slate-400">
                    Selecionados: <span className="text-slate-200 font-medium">{selectedRowsCount}</span> de {previewRows.length}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedTipoFilter === 'all' ? 'default' : 'outline'}
                    className={selectedTipoFilter === 'all' ? 'bg-blue-600 hover:bg-blue-500' : 'border-slate-700 text-slate-200'}
                    onClick={() => setSelectedTipoFilter('all')}
                  >
                    Todos ({previewRows.length})
                  </Button>
                  {Object.entries(tipoCounts).map(([tipo, count]) => (
                    <Button
                      key={tipo}
                      size="sm"
                      variant={selectedTipoFilter === tipo ? 'default' : 'outline'}
                      className={selectedTipoFilter === tipo ? 'bg-blue-600 hover:bg-blue-500' : 'border-slate-700 text-slate-200'}
                      onClick={() => setSelectedTipoFilter(tipo as TipoInvestimento)}
                    >
                      {getTipoLabel(tipo as TipoInvestimento)} ({count})
                    </Button>
                  ))}
                </div>

                <Input
                  value={searchPreview}
                  onChange={(e) => setSearchPreview(e.target.value)}
                  placeholder="Buscar por nome ou código..."
                  className="h-9 bg-slate-950 border-slate-700 text-slate-100"
                />

                <div className="grid grid-cols-12 gap-3 min-h-[360px]">
                  <div className="col-span-4 rounded-md border border-slate-800 bg-slate-950/40 p-2 max-h-[420px] overflow-auto space-y-2">
                    {filteredPreviewRows.map((row) => {
                      const issues = getRowIssues(row)
                      return (
                        <button
                          key={row.id}
                          className={`w-full text-left rounded-md border p-3 transition ${
                            selectedPreviewRow?.id === row.id
                              ? 'border-blue-500 bg-blue-950/30'
                              : issues.length > 0
                                ? 'border-amber-800/50 bg-amber-950/10 hover:border-amber-700/60'
                                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                          onClick={() => setSelectedPreviewId(row.id)}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(row.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedRowIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(row.id)
                                  else next.delete(row.id)
                                  return next
                                })
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="text-sm text-slate-100 truncate">{row.nome}</div>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{row.codigo}</div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">{getTipoLabel(row.tipo)}</span>
                            <span className="text-slate-200 font-medium">R$ {row.valor_total.toFixed(2)}</span>
                          </div>
                          {issues.length > 0 && (
                            <div className="mt-2 text-[11px] text-amber-300 truncate">
                              Pendência: {issues[0]}
                            </div>
                          )}
                        </button>
                      )
                    })}
                    {filteredPreviewRows.length === 0 && (
                      <div className="h-full min-h-[120px] flex items-center justify-center text-sm text-slate-500">
                        Nenhum item encontrado.
                      </div>
                    )}
                  </div>

                  <div className="col-span-8 rounded-md border border-slate-800 bg-slate-950/40 p-3 max-h-[420px] overflow-auto">
                    {!selectedPreviewRow ? (
                      <div className="h-full flex items-center justify-center text-sm text-slate-500">
                        Nenhum item no filtro atual.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-slate-100">{selectedPreviewRow.nome}</div>
                            <div className="text-xs text-slate-400">
                              {selectedPreviewRow.codigo} • {getTipoLabel(selectedPreviewRow.tipo)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-950/40"
                            onClick={() => handleRemovePreviewRow(selectedPreviewRow.id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {selectedRowIssues.length > 0 && (
                          <Alert className="border-amber-600/40 bg-amber-950/20">
                            <AlertCircle className="w-4 h-4 text-amber-300" />
                            <AlertDescription className="text-amber-200 text-sm">
                              {selectedRowIssues.join(' • ')}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="rounded-md border border-slate-800 p-3 space-y-2">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Campos essenciais</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-400">Ativo</Label>
                              <Input value={selectedPreviewRow.nome} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'nome', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Instituição</Label>
                              <Input value={selectedPreviewRow.instituicao || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'instituicao', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-400">Código</Label>
                              <Input value={selectedPreviewRow.codigo} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'codigo', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Qtd</Label>
                              <Input value={String(selectedPreviewRow.quantidade)} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'quantidade', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Preço Médio</Label>
                              <Input value={String(selectedPreviewRow.preco_medio)} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'preco_medio', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Valor Total</Label>
                              <div className="h-8 px-2 flex items-center rounded-md border border-slate-700 bg-slate-950 text-slate-100 text-sm">R$ {selectedPreviewRow.valor_total.toFixed(2)}</div>
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Tipo</Label>
                              <select value={selectedPreviewRow.tipo} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'tipo', e.target.value)} className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100">
                                {INVESTMENT_TYPE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {['renda_fixa', 'tesouro_direto', 'cri', 'cra', 'debenture'].includes(selectedPreviewRow.tipo) && (
                          <div className="rounded-md border border-slate-800 p-3 space-y-2">
                            <div className="text-xs uppercase tracking-wide text-slate-400">Campos de renda fixa</div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-[11px] text-slate-400">Rentabilidade</Label>
                                <select value={selectedPreviewRow.tipo_rentabilidade || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'tipo_rentabilidade', e.target.value)} className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100">
                                  <option value="">-</option>
                                  {RENTABILIDADE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[11px] text-slate-400">Taxa %</Label>
                                <Input value={selectedPreviewRow.taxa_percentual == null ? '' : String(selectedPreviewRow.taxa_percentual)} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'taxa_percentual', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                              </div>
                              <div>
                                <Label className="text-[11px] text-slate-400">Indexador</Label>
                                <select value={selectedPreviewRow.indexador || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'indexador', e.target.value)} className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100">
                                  <option value="">-</option>
                                  {INDEXADOR_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[11px] text-slate-400">Liquidez</Label>
                                <select value={selectedPreviewRow.liquidez || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'liquidez', e.target.value)} className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-slate-100">
                                  <option value="">-</option>
                                  {LIQUIDEZ_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-md border border-slate-800 p-3 space-y-2">
                          <div className="text-xs uppercase tracking-wide text-slate-400">Datas</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[11px] text-slate-400">Aplicação</Label>
                              <Input type="date" value={selectedPreviewRow.data_aplicacao || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'data_aplicacao', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                            <div>
                              <Label className="text-[11px] text-slate-400">Vencimento</Label>
                              <Input type="date" value={selectedPreviewRow.data_vencimento || ''} onChange={(e) => handleChangePreviewField(selectedPreviewRow.id, 'data_vencimento', e.target.value)} className="h-8 bg-slate-950 border-slate-700 text-slate-100" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {previewRows.length === 0 && (
                <Alert variant="destructive" className="border-red-500/40 bg-red-950/30">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    Todas as linhas foram removidas. Adicione um novo arquivo para continuar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {statusMessage && (
            <Alert
              className={
                statusMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-950/30'
                  : statusMessage.type === 'error'
                    ? 'border-red-500/40 bg-red-950/30'
                    : 'border-blue-500/40 bg-blue-950/30'
              }
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-300" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
              )}
              <AlertDescription
                className={
                  statusMessage.type === 'success'
                    ? 'text-emerald-100 text-sm'
                    : statusMessage.type === 'error'
                      ? 'text-red-100 text-sm'
                      : 'text-blue-100 text-sm'
                }
              >
                {statusMessage.text}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="border-red-500/40 bg-red-950/30">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-500/40 bg-emerald-950/30">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <AlertDescription className="text-emerald-100 text-sm">
                {success}
                {importedCount > 0 ? ` (${importedCount})` : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {step === 'preview' ? (
              <>
                <span className="text-emerald-300 font-medium">{selectedRowsCount}</span> selecionado(s) para importar
                {reviewStats.withIssues > 0 && (
                  <>
                    {' • '}
                    <span className="text-amber-300 font-medium">{reviewStats.withIssues}</span> com pendência
                  </>
                )}
              </>
            ) : (
              'Importe um arquivo da B3 para iniciar a pré-visualização.'
            )}
          </div>
          <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-700 text-slate-200"
          >
            Cancelar
          </Button>

          {step === 'upload' ? (
            <Button onClick={handlePreviewFile} disabled={loading} className="min-w-36 bg-blue-600 hover:bg-blue-500 text-white">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Pré-visualizar'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleImportPreview}
              disabled={loading || previewRows.length === 0 || selectedRowsCount === 0}
              className="min-w-28 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                'Importar'
              )}
            </Button>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
