/**
 * Integração com B3 CEI (Canal Eletrônico do Investidor)
 * Para importar posições de investimentos automaticamente
 */

export interface B3Credentials {
  cpf: string
  senha: string
}

export interface B3Position {
  tipo: 'acao' | 'fii' | 'etf' | 'renda_fixa' | 'tesouro_direto' | 'cri' | 'cra' | 'debenture'
  codigo: string
  nome: string
  quantidade: number
  precoMedio: number
  valorAtual: number
  instituicao: string
  dataReferencia: string
}

export interface B3RendaFixa {
  tipo: 'renda_fixa' | 'tesouro_direto' | 'cri' | 'cra' | 'debenture'
  codigo: string
  nome: string
  valorInvestido: number
  valorAtual: number
  vencimento: string
  taxa: string
  tipoRentabilidade: 'pos' | 'pre' | 'ipca'
  instituicao: string
  isento_ir: boolean
}

export interface B3ImportResult {
  acoes: B3Position[]
  fiis: B3Position[]
  etfs: B3Position[]
  rendaFixa: B3RendaFixa[]
  tesouroDireto: B3RendaFixa[]
  success: boolean
  message: string
  dataImportacao: string
}

/**
 * Importa posições do B3 CEI
 * Esta função faz uma chamada para a Netlify Function que faz o scraping
 */
export async function importarPosicoes(credentials: B3Credentials): Promise<B3ImportResult> {
  try {
    const response = await fetch('/.netlify/functions/b3-cei-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      throw new Error(`Erro ao importar: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Erro ao importar posições B3:', error)
    return {
      acoes: [],
      fiis: [],
      etfs: [],
      rendaFixa: [],
      tesouroDireto: [],
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      dataImportacao: new Date().toISOString(),
    }
  }
}

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(10))) return false

  return true
}

/**
 * Formata CPF para exibição
 */
export function formatarCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '')
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
