
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
      <DialogContent className="mx-4 sm:mx-0 sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Opções de Exportação PDF</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm">Tipo de Transações</Label>
            <Select 
              value={options.transactionType} 
              onValueChange={(value: 'all' | 'receita' | 'despesa') => 
                setOptions({ ...options, transactionType: value })
              }
            >
              <SelectTrigger className="h-9 text-sm">
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
            <Label className="text-sm">Conteúdo do Relatório</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="summary"
                checked={options.includeSummary}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeSummary: checked as boolean })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="summary" className="text-sm line-clamp-1">Incluir resumo financeiro</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="details"
                checked={options.includeDetails}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeDetails: checked as boolean })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="details" className="text-sm line-clamp-1">Incluir detalhes das transações</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="charts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeCharts: checked as boolean })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="charts" className="text-sm line-clamp-1">Incluir gráficos</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto h-9 text-sm">
            Cancelar
          </Button>
          <Button onClick={handleExport} className="w-full sm:w-auto h-9 text-sm">
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
