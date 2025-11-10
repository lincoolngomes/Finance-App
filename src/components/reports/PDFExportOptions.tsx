
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'

interface PDFExportOptionsProps {
  onExport: (options: PDFExportOptions) => void
  isGenerating: boolean
  disabled: boolean
}

export interface PDFExportOptions {
  includeCharts: boolean
  transactionType: 'all' | 'receita' | 'despesa'
  includeSummary: boolean
  includeDetails: boolean
}

export function PDFExportOptions({ onExport, isGenerating, disabled }: PDFExportOptionsProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<PDFExportOptions>({
    includeCharts: true,
    transactionType: 'all',
    includeSummary: true,
    includeDetails: true,
  })

  const handleExport = () => {
    onExport(options)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          disabled={disabled || isGenerating}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span className="hidden sm:inline">Gerando...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Gerar PDF</span>
              <span className="sm:hidden">PDF</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Opções de Exportação PDF</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Transações</Label>
            <Select 
              value={options.transactionType} 
              onValueChange={(value: 'all' | 'receita' | 'despesa') => 
                setOptions({ ...options, transactionType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as transações</SelectItem>
                <SelectItem value="receita">Somente receitas</SelectItem>
                <SelectItem value="despesa">Somente despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Conteúdo do Relatório</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="summary"
                checked={options.includeSummary}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeSummary: checked as boolean })
                }
              />
              <Label htmlFor="summary">Incluir resumo financeiro</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="details"
                checked={options.includeDetails}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeDetails: checked as boolean })
                }
              />
              <Label htmlFor="details">Incluir detalhes das transações</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="charts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeCharts: checked as boolean })
                }
              />
              <Label htmlFor="charts">Incluir gráficos</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleExport} className="w-full sm:w-auto">
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
