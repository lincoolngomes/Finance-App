import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, AlertCircle, CheckCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface ImportB3DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type CsvRow = Record<string, unknown>

const NORMALIZE_RE = /[^a-z0-9]/g

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

function inferTipo(nome: string, codigo: string, tipoTexto: string): 'acao' | 'fii' | 'etf' | 'renda_fixa' {
  const base = `${nome} ${codigo} ${tipoTexto}`.toLowerCase()

  if (base.includes('fii') || base.includes('fundo imobiliario')) return 'fii'
  if (base.includes('etf')) return 'etf'
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

export function ImportB3Dialog({ open, onOpenChange, onSuccess }: ImportB3DialogProps) {
  const { user } = useAuth()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  const fileLabel = useMemo(() => {
    if (!csvFile) return 'Nenhum arquivo selecionado'
    return `${csvFile.name} (${Math.round(csvFile.size / 1024)} KB)`
  }, [csvFile])

  const handleImportCsv = async () => {
    setError(null)
    setSuccess(null)
    setImportedCount(0)

    if (!user?.id) {
      setError('Usuário não autenticado.')
      return
    }

    if (!csvFile) {
      setError('Selecione um arquivo CSV para importar.')
      return
    }

    setLoading(true)
    try {
      const fileName = csvFile.name.toLowerCase()
      let rawRows: CsvRow[] = []

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await csvFile.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        rawRows = workbook.SheetNames.flatMap((sheetName) => {
          const ws = workbook.Sheets[sheetName]
          return XLSX.utils.sheet_to_json<CsvRow>(ws, {
            defval: '',
          })
        })
      } else {
        const parsed = await new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
          Papa.parse<CsvRow>(csvFile, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
            complete: resolve,
            error: reject,
          })
        })
        rawRows = parsed.data || []
      }

      if (!rawRows.length) {
        throw new Error('Arquivo vazio ou inválido.')
      }

      const payload = rawRows
        .map((row) => {
          const codigoRaw = String(
            getValue(row, ['codigo', 'codigo isin', 'codigo negociacao', 'ticker', 'ativo', 'papel']) || ''
          ).trim()
          const nomeRaw = String(
            getValue(row, ['nome', 'produto', 'descricao', 'titulo']) || ''
          ).trim()
          const tipoRaw = String(
            getValue(row, ['tipo', 'segmento', 'classe', 'tipodeativo']) || ''
          ).trim()
          const instituicaoRaw = String(
            getValue(row, ['instituicao', 'corretora', 'escriturador', 'custodiante']) || ''
          ).trim()

          const quantidade = Math.abs(
            parseNumberBR(getValue(row, ['quantidade', 'qtd', 'saldo', 'posicao']))
          )
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

          const vencimento = parseDateToISO(
            getValue(row, ['vencimento', 'data vencimento'])
          )
          const dataRef = parseDateToISO(
            getValue(row, ['data referencia', 'data', 'data posicao', 'data base'])
          )
          const taxaTexto = String(
            getValue(row, ['taxa', 'rentabilidade', 'taxa contratada', 'taxa a a']) || ''
          ).trim()
          const taxaPercentual = Math.abs(parseNumberBR(taxaTexto))

          const codigo = codigoRaw || nomeRaw
          const nome = nomeRaw || codigoRaw
          if (!codigo || !nome) return null

          const tipo = inferTipo(nome, codigo, tipoRaw)

          let quantidadeFinal = quantidade
          let precoMedioFinal = precoMedio

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

          if (!quantidadeFinal || !precoMedioFinal) return null

          return {
            user_id: user.id,
            tipo,
            codigo: codigo.toUpperCase().slice(0, 50),
            nome: nome.slice(0, 200),
            instituicao: instituicaoRaw || null,
            quantidade: quantidadeFinal,
            preco_medio: precoMedioFinal,
            valor_total: Number((quantidadeFinal * precoMedioFinal).toFixed(2)),
            data_primeira_compra:
              dataRef || parseDateToISO(getValue(row, ['data de emissao', 'data emissao'])) || null,
            data_aplicacao:
              dataRef || parseDateToISO(getValue(row, ['data de emissao', 'data emissao'])) || null,
            data_vencimento: vencimento || null,
            tipo_rentabilidade: inferRentabilidade(taxaTexto) || null,
            taxa_percentual: taxaPercentual || null,
            indexador: inferIndexador(taxaTexto) || null,
            valor_atual_manual: valorAtual > 0 ? valorAtual : null,
            ativo: true,
          }
        })
        .filter(Boolean)
        .filter((item: any) => {
          const nome = String(item?.nome || '').toLowerCase()
          return nome && nome !== 'total'
        })

      if (!payload.length) {
        throw new Error('Não encontrei linhas válidas para importar nesse CSV.')
      }

      const typedPayload = payload as any[]
      const chaves = typedPayload
        .map((item) => ({
          codigo: String(item.codigo || ''),
          tipo: String(item.tipo || ''),
        }))
        .filter((item) => item.codigo && item.tipo)

      const codigosUnicos = Array.from(new Set(chaves.map((k) => k.codigo)))

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
              valor_total: Number((Number(item.quantidade || 0) * Number(item.preco_medio || 0)).toFixed(2)),
              data_primeira_compra: item.data_primeira_compra,
              data_aplicacao: item.data_aplicacao,
              data_vencimento: item.data_vencimento,
              tipo_rentabilidade: item.tipo_rentabilidade,
              taxa_percentual: item.taxa_percentual,
              indexador: item.indexador,
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

        processados++
      }

      if (processados === 0 && erros.length > 0) {
        throw new Error(erros[0])
      }

      setImportedCount(processados)
      setSuccess(`Importação concluída com sucesso. ${processados} investimento(s) processado(s).`)

      if (onSuccess) await onSuccess()
    } catch (err: any) {
      console.error('Erro ao importar CSV da B3:', err)
      setError(err?.message || 'Erro ao importar arquivo CSV da B3.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-600" />
            Importar B3
          </DialogTitle>
          <DialogDescription>
            Importe suas posições via arquivo CSV/Excel exportado na Área do Investidor B3.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              Exporte o arquivo (CSV ou Excel) na <strong>Área do Investidor B3</strong> e importe aqui.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="b3-csv-file">Arquivo da B3 (CSV/XLSX)</Label>
            <Input
              id="b3-csv-file"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={loading}
              onChange={(e) => {
                setError(null)
                setSuccess(null)
                const file = e.target.files?.[0] || null
                setCsvFile(file)
              }}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {fileLabel}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-semibold">Passo a passo:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Acesse <a href="https://investidor.b3.com.br" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">investidor.b3.com.br</a></li>
              <li>Minha carteira {'>'} Investimentos {'>'} Baixar</li>
              <li>Exporte o arquivo em CSV ou Excel (.xlsx)</li>
              <li>Selecione o arquivo neste modal e clique em Importar</li>
            </ol>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                {success}
                {importedCount > 0 ? ` (${importedCount})` : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImportCsv} disabled={loading || !csvFile}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
