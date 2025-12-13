
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return 'R$ 0,00'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue)
}

export const parseCurrency = (value: string): number => {
  // Remove caracteres não numéricos, exceto vírgula e ponto
  const cleaned = value.replace(/[^\d,-]/g, '')
  // Substitui vírgula por ponto para conversão
  const normalized = cleaned.replace(',', '.')
  return parseFloat(normalized) || 0
}

// Converter valor de input BR (1.000,00 ou 1000,00) para número
export const parseValorBR = (value: string): number => {
  if (!value) return 0
  
  // Remove espaços e R$
  let cleaned = value.replace(/R\$|\s/g, '')
  
  // Verificar se tem ponto E vírgula (ex: 1.000,00)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Formato brasileiro: remover pontos (milhares) e trocar vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } 
  // Se tem apenas vírgula (ex: 1000,50)
  else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }
  // Se tem apenas ponto, converter para vírgula e depois ponto (ex: 1000.50 -> 1000,50 -> 1000.50)
  else if (cleaned.includes('.')) {
    cleaned = cleaned.replace('.', ',').replace(',', '.')
  }
  
  return parseFloat(cleaned) || 0
}

// Formatar input para formato BR enquanto digita
export const formatarValorBR = (value: string): string => {
  // Remove tudo exceto números, vírgula e ponto
  let cleaned = value.replace(/[^\d,]/g, '')
  
  // Limitar a apenas uma vírgula
  const parts = cleaned.split(',')
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('')
  }
  
  return cleaned
}

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Converte para centavos
  const cents = parseInt(numbers)
  const reais = cents / 100
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais)
}
