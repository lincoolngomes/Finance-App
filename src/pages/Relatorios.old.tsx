import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { useReports } from '@/hooks/useReports'
import { useAuth } from '@/hooks/useAuth'
import { ReportFiltersComponent } from '@/components/reports/ReportFilters'
import { ReportSummary } from '@/components/reports/ReportSummary'
import { ReportTable } from '@/components/reports/ReportTable'
import { ReportChart } from '@/components/reports/ReportChart'
import { PDFExportOptions, PDFExportOptions as PDFOptions } from '@/components/reports/PDFExportOptions'
import { toast } from '@/hooks/use-toast'
import { generatePDFReport } from '@/utils/pdfGenerator'

export default function Relatorios() {
  const { user } = useAuth()
  const { transactions, isLoading, filters, setFilters, summaryData } = useReports()
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      categoryId: '',
      period: 'month'
    })
  }

  const generatePDF = async (options: PDFOptions) => {
    setIsGeneratingPDF(true)
    try {
      const reportData = {
        transactions,
        summaryData,
        filters,
        userName: user?.user_metadata?.nome || user?.email || 'Usuário'
      }
      generatePDFReport(reportData, options)
      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi exportado em formato PDF.",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao exportar o relatório.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const getPeriodLabel = () => {
    switch (filters.period) {
      case 'day':
        return 'Hoje'
      case 'month':
        return 'Este Mês'
      case 'year':
        return 'Este Ano'
      case 'custom':
        return filters.startDate && filters.endDate 
          ? `${new Date(filters.startDate).toLocaleDateString('pt-BR')} - ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`
          : 'Período Personalizado'
      default:
        return 'Todos os Períodos'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight">Relatórios Financeiros</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Análises personalizadas das suas transações
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <PDFExportOptions
            onExport={generatePDF}
            isGenerating={isGeneratingPDF}
            disabled={transactions.length === 0}
          />
        </div>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {isLoading ? (
        <div className="space-y-4 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="h-16 sm:h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-base sm:text-base">Resumo: {getPeriodLabel()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ReportSummary
                receitas={summaryData.receitas}
                despesas={summaryData.despesas}
                saldo={summaryData.saldo}
                totalTransactions={summaryData.totalTransactions}
              />
            </CardContent>
          </Card>

          {transactions.length > 0 && (
            <>
              <ReportChart
                chartData={summaryData.chartData}
                categoryData={summaryData.byCategory}
              />

              <ReportTable transactions={transactions} />
            </>
          )}

          {transactions.length === 0 && (
            <Card>
              <CardContent className="p-4 sm:p-8 text-center">
                <p className="text-muted-foreground mb-3 sm:mb-4 text-xs sm:text-base">
                  Nenhuma transação encontrada para o período selecionado.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ajuste os filtros acima para visualizar diferentes períodos ou categorias.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
