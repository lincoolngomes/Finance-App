
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency } from './currency'
import { ReportTransaction } from '/src/hooks/useReports'
import { PDFExportOptions } from '/src/components/reports/PDFExportOptions'

// Estendendo o tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface PDFReportData {
  transactions: ReportTransaction[]
  summaryData: {
    receitas: number
    despesas: number
    saldo: number
    totalTransactions: number
    byCategory: Record<string, { receitas: number; despesas: number; total: number }>
    chartData: Array<{ name: string; value: number; color: string }>
  }
  filters: {
    startDate: string
    endDate: string
    type: string
    categoryId: string
    period: string
  }
  userName: string
  analytics?: {
    saudeFinanceira: number
    taxaPoupanca: number
    taxaGasto: number
    mediaDiaria: number
    mediaSemanal: number
    mediaMensal: number
    ticketMedio: number
    maiorDespesa: number
    maiorDespesaItem?: { estabelecimento: string }
    categoriaMaisGasta?: [string, { total: number }]
    projecaoMes: number
    tendencia: number
    insights: string[]
  }
}

export const generatePDFReport = (data: PDFReportData, options: PDFExportOptions) => {
  const doc = new jsPDF()
  
  // Configurações
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  let yPosition = margin
  let currentPage = 1
  const primaryColor = [66, 139, 202] // Azul da plataforma
  const successColor = [34, 197, 94] // Verde para receitas
  const dangerColor = [239, 68, 68] // Vermelho para despesas

  // Função para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      currentPage++
      yPosition = margin
      return true
    }
    return false
  }

  // Função para adicionar rodapé
  const addFooter = () => {
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Página ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 10)
  }

  // Cabeçalho personalizado
  const addHeader = () => {
    // Título principal
    doc.setFontSize(24)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Linha decorativa
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 15

    // Informações do cabeçalho
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    
    const headerInfo = [
      `Usuário: ${data.userName}`,
      `Data de geração: ${new Date().toLocaleString('pt-BR')}`,
      `Período: ${getPeriodText()}`,
      `Tipo: ${getTransactionTypeText()}`
    ]

    headerInfo.forEach(info => {
      doc.text(info, margin, yPosition)
      yPosition += 8
    })

    yPosition += 10
  }

  // Função para obter texto do período
  const getPeriodText = () => {
    switch (data.filters.period) {
      case 'day': return 'Hoje'
      case 'month': return 'Este Mês'
      case 'year': return 'Este Ano'
      case 'custom':
        return data.filters.startDate && data.filters.endDate 
          ? `${new Date(data.filters.startDate).toLocaleDateString('pt-BR')} - ${new Date(data.filters.endDate).toLocaleDateString('pt-BR')}`
          : 'Período Personalizado'
      default: return 'Todos os Períodos'
    }
  }

  // Função para obter texto do tipo de transação
  const getTransactionTypeText = () => {
    switch (options.transactionType) {
      case 'receita': return 'Somente Receitas'
      case 'despesa': return 'Somente Despesas'
      default: return 'Todas as Transações'
    }
  }

  // Filtrar transações baseado nas opções
  const filteredTransactions = data.transactions.filter(transaction => {
    if (options.transactionType === 'all') return true
    return transaction.tipo === options.transactionType
  })

  // Recalcular dados do resumo baseado nas transações filtradas
  const getFilteredSummary = () => {
    const receitas = filteredTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    const despesas = filteredTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + (t.valor || 0), 0)
    
    return { receitas, despesas, saldo: receitas - despesas }
  }

  const filteredSummary = getFilteredSummary()

  // Adicionar cabeçalho
  addHeader()

  // Score de Saúde Financeira (novo)
  if (options.includeAnalytics && data.analytics) {
    checkPageBreak(70)
    
    doc.setFontSize(18)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('ANÁLISE FINANCEIRA AVANÇADA', margin, yPosition)
    yPosition += 12

    // Score de Saúde
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Score de Saúde Financeira', margin, yPosition)
    yPosition += 15

    const scoreColor = data.analytics.saudeFinanceira >= 80 ? [34, 197, 94] : 
                       data.analytics.saudeFinanceira >= 60 ? [59, 130, 246] :
                       data.analytics.saudeFinanceira >= 40 ? [234, 179, 8] : [239, 68, 68]
    
    // Score grande centralizado
    doc.setFontSize(48)
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
    const scoreText = data.analytics.saudeFinanceira.toFixed(0)
    doc.text(scoreText, margin + 15, yPosition)
    
    // Texto abaixo do score
    yPosition += 8
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    const classificacao = data.analytics.saudeFinanceira >= 80 ? 'Excelente' :
                          data.analytics.saudeFinanceira >= 60 ? 'Bom' :
                          data.analytics.saudeFinanceira >= 40 ? 'Regular' : 'Crítico'
    doc.text(`/ 100 (${classificacao})`, margin + 15, yPosition)
    yPosition += 15

    // Métricas Principais
    const metricsData = [
      ['Taxa de Poupança', `${data.analytics.taxaPoupanca.toFixed(1)}%`],
      ['Taxa de Gasto', `${data.analytics.taxaGasto.toFixed(1)}%`],
      ['Média Diária', formatCurrency(data.analytics.mediaDiaria)],
      ['Média Semanal', formatCurrency(data.analytics.mediaSemanal)],
      ['Média Mensal', formatCurrency(data.analytics.mediaMensal)],
      ['Ticket Médio', formatCurrency(data.analytics.ticketMedio)],
      ['Tendência (7 dias)', `${data.analytics.tendencia > 0 ? '+' : ''}${data.analytics.tendencia.toFixed(1)}%`]
    ]

    doc.autoTable({
      head: [['Métrica', 'Valor']],
      body: metricsData,
      startY: yPosition,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { 
        fillColor: [20, 184, 166], // Teal
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Resumo financeiro
  if (options.includeSummary) {
    checkPageBreak(60)
    
    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RESUMO FINANCEIRO', margin, yPosition)
    yPosition += 15

    // Criar tabela de resumo
    const summaryData = []
    
    if (options.transactionType === 'all' || options.transactionType === 'receita') {
      summaryData.push(['Total de Receitas', formatCurrency(filteredSummary.receitas)])
    }
    
    if (options.transactionType === 'all' || options.transactionType === 'despesa') {
      summaryData.push(['Total de Despesas', formatCurrency(filteredSummary.despesas)])
    }
    
    if (options.transactionType === 'all') {
      summaryData.push(['Saldo Final', formatCurrency(filteredSummary.saldo)])
    }
    
    summaryData.push(['Total de Transações', filteredTransactions.length.toString()])

    // Adiciona informações extras se analytics disponível
    if (data.analytics) {
      summaryData.push(['Maior Despesa', formatCurrency(data.analytics.maiorDespesa)])
      if (data.analytics.maiorDespesaItem) {
        summaryData.push(['  Local', data.analytics.maiorDespesaItem.estabelecimento])
      }
      if (data.analytics.categoriaMaisGasta) {
        summaryData.push(['Categoria Top', data.analytics.categoriaMaisGasta[0]])
        summaryData.push(['  Valor', formatCurrency(data.analytics.categoriaMaisGasta[1].total)])
      }
      summaryData.push(['Projeção Fim do Mês', formatCurrency(data.analytics.projecaoMes)])
    }

    doc.autoTable({
      head: [['Descrição', 'Valor']],
      body: summaryData,
      startY: yPosition,
      styles: { fontSize: 11, cellPadding: 5 },
      headStyles: { 
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      tableWidth: 'wrap'
    })

    yPosition = (doc as any).lastAutoTable.finalY + 20
  }

  // Resumo por categoria
  if (options.includeSummary && Object.keys(data.summaryData.byCategory).length > 0) {
    checkPageBreak(80)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('RESUMO POR CATEGORIA', margin, yPosition)
    yPosition += 15

    const categoryData = Object.entries(data.summaryData.byCategory)
      .filter(([_, categoryData]) => {
        if (options.transactionType === 'receita') return categoryData.receitas > 0
        if (options.transactionType === 'despesa') return categoryData.despesas > 0
        return categoryData.receitas > 0 || categoryData.despesas > 0
      })
      .map(([name, categoryData]) => {
        const row = [name]
        if (options.transactionType === 'all' || options.transactionType === 'receita') {
          row.push(formatCurrency(categoryData.receitas))
        }
        if (options.transactionType === 'all' || options.transactionType === 'despesa') {
          row.push(formatCurrency(categoryData.despesas))
        }
        if (options.transactionType === 'all') {
          row.push(formatCurrency(categoryData.total))
        }
        return row
      })

    if (categoryData.length > 0) {
      const headers = ['Categoria']
      if (options.transactionType === 'all' || options.transactionType === 'receita') {
        headers.push('Receitas')
      }
      if (options.transactionType === 'all' || options.transactionType === 'despesa') {
        headers.push('Despesas')
      }
      if (options.transactionType === 'all') {
        headers.push('Saldo')
      }

      doc.autoTable({
        head: [headers],
        body: categoryData,
        startY: yPosition,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { 
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        margin: { left: margin, right: margin }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 20
    }
  }

  // Insights Inteligentes (novo)
  if (options.includeAnalytics && data.analytics && data.analytics.insights.length > 0) {
    checkPageBreak(80)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('INSIGHTS INTELIGENTES', margin, yPosition)
    yPosition += 12

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    data.analytics.insights.forEach((insight, index) => {
      checkPageBreak(15)
      
      // Desenha círculo de bullet
      doc.setFillColor(20, 184, 166) // Teal
      doc.circle(margin + 2, yPosition - 1, 1.5, 'F')
      
      // Texto do insight (remove emojis para PDF)
      const cleanInsight = insight.replace(/[^\w\s\u00C0-\u017F:.,!?%()/-]/g, '')
      const lines = doc.splitTextToSize(cleanInsight, pageWidth - margin * 2 - 10)
      doc.text(lines, margin + 7, yPosition)
      yPosition += lines.length * 5 + 3
    })

    yPosition += 10
  }

  // Detalhes das transações
  if (options.includeDetails && filteredTransactions.length > 0) {
    checkPageBreak(60)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('DETALHES DAS TRANSAÇÕES', margin, yPosition)
    yPosition += 15

    const tableData = filteredTransactions.map(transaction => [
      transaction.quando ? new Date(transaction.quando).toLocaleDateString('pt-BR') : '-',
      transaction.estabelecimento || 'Sem estabelecimento',
      transaction.categorias?.nome || 'Sem categoria',
      transaction.tipo || '-',
      `${transaction.tipo === 'receita' ? '+' : '-'}${formatCurrency(Math.abs(transaction.valor || 0))}`
    ])

    doc.autoTable({
      head: [['Data', 'Estabelecimento', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        4: { halign: 'right' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        currentPage++
        addFooter()
      }
    })
  } else {
    addFooter()
  }

  // Salvar o PDF
  const typeText = options.transactionType === 'all' ? 'completo' : options.transactionType
  const fileName = `relatorio-financeiro-${typeText}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
