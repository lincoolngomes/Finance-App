/**
 * Integração com API da CVM para obter dados de fundos de investimento
 */

export interface FundoCVM {
  cnpj: string
  nome: string
  valorCota: number
  dataReferencia: string
  patrimonioLiquido: number
  rentabilidadeMes: number
  rentabilidadeAno: number
  classe: string
  tipo: string
}

export interface PrevidenciaCVM {
  cnpj: string
  nome: string
  valorCota: number
  dataReferencia: string
  plano: 'PGBL' | 'VGBL'
  rentabilidadeMes: number
  rentabilidadeAno: number
}

/**
 * Busca dados de um fundo de investimento pelo CNPJ na API da CVM
 */
export async function buscarFundoCVM(cnpj: string): Promise<FundoCVM | null> {
  try {
    // Remove formatação do CNPJ
    cnpj = cnpj.replace(/[^\d]/g, '')
    
    // API pública da CVM (dados abertos)
    // Endpoint: https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/
    
    // Por enquanto, vamos usar um proxy via Netlify Function
    const response = await fetch(`/.netlify/functions/cvm-fundos?cnpj=${cnpj}`)
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar fundo: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erro ao buscar fundo CVM:', error)
    return null
  }
}

/**
 * Busca dados de previdência privada pelo CNPJ
 */
export async function buscarPrevidenciaCVM(cnpj: string): Promise<PrevidenciaCVM | null> {
  try {
    cnpj = cnpj.replace(/[^\d]/g, '')
    
    const response = await fetch(`/.netlify/functions/cvm-previdencia?cnpj=${cnpj}`)
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar previdência: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erro ao buscar previdência CVM:', error)
    return null
  }
}

/**
 * Busca múltiplos fundos de uma vez
 */
export async function buscarMultiplosFundos(cnpjs: string[]): Promise<Map<string, FundoCVM>> {
  const resultados = new Map<string, FundoCVM>()
  
  // Buscar em paralelo (máximo 5 por vez para não sobrecarregar)
  const chunks = []
  for (let i = 0; i < cnpjs.length; i += 5) {
    chunks.push(cnpjs.slice(i, i + 5))
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(cnpj => buscarFundoCVM(cnpj))
    const results = await Promise.all(promises)
    
    results.forEach((fundo, index) => {
      if (fundo) {
        resultados.set(chunk[index], fundo)
      }
    })
  }
  
  return resultados
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '')

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  // Validação do primeiro dígito verificador
  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  // Validação do segundo dígito verificador
  length = length + 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

/**
 * Formata CNPJ para exibição
 */
export function formatarCNPJ(cnpj: string): string {
  cnpj = cnpj.replace(/[^\d]/g, '')
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}
