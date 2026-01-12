import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { importarPosicoes, validarCPF, formatarCPF, type B3ImportResult } from '@/utils/b3-cei'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface ImportB3DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportB3Dialog({ open, onOpenChange, onSuccess }: ImportB3DialogProps) {
  const { user } = useAuth()
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resultado, setResultado] = useState<B3ImportResult | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)

  const handleCPFChange = (value: string) => {
    // Remove tudo que não é número
    const numeros = value.replace(/\D/g, '')
    // Limita a 11 dígitos
    const limitado = numeros.slice(0, 11)
    setCpf(limitado)
  }

  const handleImportar = async () => {
    setError(null)
    setSuccess(null)
    setResultado(null)

    // Validações
    if (!cpf || !senha) {
      setError('Por favor, preencha CPF e senha')
      return
    }

    if (!validarCPF(cpf)) {
      setError('CPF inválido')
      return
    }

    setLoading(true)

    try {
      // Importar posições do B3
      const result = await importarPosicoes({ cpf, senha })

      if (!result.success) {
        throw new Error(result.message)
      }

      setResultado(result)

      // Processar e salvar investimentos
      let totalImportados = 0

      // Processar ações
      for (const acao of result.acoes) {
        const { error } = await supabase.from('investimentos').upsert({
          usuario_id: user?.id,
          tipo: acao.tipo,
          codigo: acao.codigo,
          nome: acao.nome,
          quantidade: acao.quantidade,
          preco_medio: acao.precoMedio,
          valor_atual: acao.valorAtual,
          instituicao: acao.instituicao,
          data_referencia: acao.dataReferencia,
        }, {
          onConflict: 'usuario_id,codigo',
        })

        if (!error) totalImportados++
      }

      // Processar FIIs
      for (const fii of result.fiis) {
        const { error } = await supabase.from('investimentos').upsert({
          usuario_id: user?.id,
          tipo: fii.tipo,
          codigo: fii.codigo,
          nome: fii.nome,
          quantidade: fii.quantidade,
          preco_medio: fii.precoMedio,
          valor_atual: fii.valorAtual,
          instituicao: fii.instituicao,
          data_referencia: fii.dataReferencia,
        }, {
          onConflict: 'usuario_id,codigo',
        })

        if (!error) totalImportados++
      }

      // Processar ETFs
      for (const etf of result.etfs) {
        const { error } = await supabase.from('investimentos').upsert({
          usuario_id: user?.id,
          tipo: etf.tipo,
          codigo: etf.codigo,
          nome: etf.nome,
          quantidade: etf.quantidade,
          preco_medio: etf.precoMedio,
          valor_atual: etf.valorAtual,
          instituicao: etf.instituicao,
          data_referencia: etf.dataReferencia,
        }, {
          onConflict: 'usuario_id,codigo',
        })

        if (!error) totalImportados++
      }

      // Processar Renda Fixa
      for (const rf of result.rendaFixa) {
        const { error } = await supabase.from('investimentos').upsert({
          usuario_id: user?.id,
          tipo: rf.tipo,
          codigo: rf.codigo,
          nome: rf.nome,
          valor_investido: rf.valorInvestido,
          valor_atual: rf.valorAtual,
          data_vencimento: rf.vencimento,
          taxa_percentual: parseFloat(rf.taxa.replace(/[^\d.,]/g, '').replace(',', '.')),
          tipo_rentabilidade: rf.tipoRentabilidade,
          instituicao: rf.instituicao,
          isento_ir: rf.isento_ir,
          data_referencia: result.dataImportacao.split('T')[0],
        }, {
          onConflict: 'usuario_id,codigo',
        })

        if (!error) totalImportados++
      }

      // Processar Tesouro Direto
      for (const td of result.tesouroDireto) {
        const { error } = await supabase.from('investimentos').upsert({
          usuario_id: user?.id,
          tipo: td.tipo,
          codigo: td.codigo,
          nome: td.nome,
          valor_investido: td.valorInvestido,
          valor_atual: td.valorAtual,
          data_vencimento: td.vencimento,
          taxa_percentual: parseFloat(td.taxa.replace(/[^\d.,]/g, '').replace(',', '.')),
          tipo_rentabilidade: td.tipoRentabilidade,
          instituicao: td.instituicao,
          isento_ir: td.isento_ir,
          data_referencia: result.dataImportacao.split('T')[0],
        }, {
          onConflict: 'usuario_id,codigo',
        })

        if (!error) totalImportados++
      }

      setSuccess(`✅ Importação concluída! ${totalImportados} investimento(s) importado(s).`)
      
      // Limpar campos
      setCpf('')
      setSenha('')

      // Chamar callback de sucesso
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
          onOpenChange(false)
        }, 2000)
      }

    } catch (err) {
      console.error('Erro ao importar:', err)
      setError(err instanceof Error ? err.message : 'Erro ao importar posições do B3')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-600" />
            Importar do B3 Investidor
          </DialogTitle>
          <DialogDescription>
            Importe automaticamente suas posições ou importe manualmente via CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta importante */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>⚠️ Importador automático indisponível</strong><br/>
              O acesso direto ao CEI da B3 requer configurações adicionais de segurança. Use a opção de importação manual exportando seus dados do CEI.
            </AlertDescription>
          </Alert>

          {!showManualInput ? (
            <>
              {/* Credenciais (desabilitadas) */}
              <div className="space-y-2 opacity-50 pointer-events-none">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formatarCPF(cpf)}
                  disabled={true}
                  maxLength={14}
                />
              </div>

              <div className="space-y-2 opacity-50 pointer-events-none">
                <Label htmlFor="senha">Senha do B3 CEI</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Sua senha do CEI"
                    disabled={true}
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Instruções */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-3 text-sm">
                <p className="font-semibold">Como importar seus investimentos:</p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Acesse <a href="https://cei.b3.com.br" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">cei.b3.com.br</a></li>
                  <li>Faça login com suas credenciais</li>
                  <li>Vá para "Consultas" → "Posição da Carteira"</li>
                  <li>Clique em "Exportar" e escolha "CSV"</li>
                  <li>Volte aqui e clique em "Importar CSV"</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cole os dados do seu arquivo CSV do CEI abaixo. Você pode copiar e colar o conteúdo do arquivo exportado.
              </p>
              <Input
                type="file"
                accept=".csv"
                disabled={loading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const content = event.target?.result as string
                      // Aqui você poderia processar o CSV
                      console.log('CSV carregado:', content)
                    }
                    reader.readAsText(file)
                  }
                }}
              />
            </div>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Sucesso */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm">
                {success}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (showManualInput) {
                setShowManualInput(false)
              } else {
                onOpenChange(false)
              }
            }}
            disabled={loading}
          >
            {showManualInput ? '← Voltar' : 'Cancelar'}
          </Button>
          <Button
            onClick={() => setShowManualInput(!showManualInput)}
            variant={showManualInput ? 'default' : 'outline'}
            disabled={loading}
          >
            {showManualInput ? '✓ Usar outro método' : 'Importar CSV'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
