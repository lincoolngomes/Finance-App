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
            Importe automaticamente suas posições do CEI da B3 (Canal Eletrônico do Investidor)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={formatarCPF(cpf)}
              onChange={(e) => handleCPFChange(e.target.value)}
              disabled={loading}
              maxLength={14}
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="senha">Senha do B3 CEI</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showSenha ? 'text' : 'password'}
                placeholder="Sua senha do CEI"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Aviso de Segurança */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              🔒 Suas credenciais <strong>não são armazenadas</strong>. São usadas apenas para importar os dados diretamente do B3.
            </AlertDescription>
          </Alert>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sucesso */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Resultado da importação */}
          {resultado && (
            <div className="text-sm space-y-1 p-3 bg-secondary rounded-lg">
              <p className="font-semibold">Encontrado:</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {resultado.acoes.length > 0 && <li>{resultado.acoes.length} ações</li>}
                {resultado.fiis.length > 0 && <li>{resultado.fiis.length} FIIs</li>}
                {resultado.etfs.length > 0 && <li>{resultado.etfs.length} ETFs</li>}
                {resultado.rendaFixa.length > 0 && <li>{resultado.rendaFixa.length} Renda Fixa</li>}
                {resultado.tesouroDireto.length > 0 && <li>{resultado.tesouroDireto.length} Tesouro Direto</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={loading || !cpf || !senha}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
