/**
 * Parser de data universal — converte qualquer formato de data para Date UTC midnight.
 * Use esta função em TODOS os componentes para garantir consistência.
 * 
 * Formatos suportados:
 * - dd/mm/yyyy ou d/m/yyyy
 * - yyyy-mm-dd (ISO date-only)
 * - yyyy-mm-ddTHH:mm:ss (ISO com hora)
 * - yyyy-mm-ddTHH:mm:ssZ (ISO UTC)
 * - yyyy-mm-ddTHH:mm:ss±HH:MM (ISO com timezone)
 * 
 * Sempre retorna Date em UTC midnight do dia.
 */
export function parseToDateUTC(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  if (!s) return null

  // dd/mm/yyyy ou d/m/yyyy (verificar primeiro para evitar confusão com ISO)
  const dmYMatch = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
  if (dmYMatch) {
    const d = Number(dmYMatch[1])
    const m = Number(dmYMatch[2])
    const y = Number(dmYMatch[3])
    const fullYear = y < 100 ? 2000 + y : y
    const dt = new Date(Date.UTC(fullYear, m - 1, d))
    return isNaN(dt.getTime()) ? null : dt
  }

  // Qualquer outro formato parseável por new Date()
  // Inclui ISO date-only (yyyy-mm-dd), ISO com hora, timestamps, etc.
  const dt = new Date(s)
  if (isNaN(dt.getTime())) return null
  // Normalizar para UTC midnight
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
}

/**
 * Determina o mês/ano de uma transação para fins de filtragem.
 * - Transações de cartão com fatura_mes/fatura_ano: usa esses campos
 * - Outras transações: usa a data (ou created_at como fallback)
 * 
 * Retorna { month: 0-11, year: number } ou null se não conseguir determinar.
 */
export function getTransactionMonth(t: {
  cartao_id?: string | null
  fatura_mes?: number | null
  fatura_ano?: number | null
  data?: string | null
  created_at?: string | null
}): { month: number; year: number } | null {
  // Transações de cartão com fatura_mes/fatura_ano
  if (t.cartao_id && t.fatura_mes && t.fatura_ano) {
    return { month: t.fatura_mes - 1, year: t.fatura_ano } // fatura_mes é 1-12, converter para 0-11
  }

  // Usar data (ou created_at como fallback)
  const dt = parseToDateUTC(t.data || t.created_at)
  if (!dt) return null
  return { month: dt.getUTCMonth(), year: dt.getUTCFullYear() }
}

/**
 * Calcula o mês/ano da fatura para uma transação de cartão baseado no dia de fechamento.
 * 
 * Lógica (consistente com GerenciarFaturasModal):
 * A fatura de um mês M contém compras do dia_fechamento do mês M-2 até o dia_fechamento do mês M-1.
 * 
 * Regra simplificada:
 * - Se dia_compra < dia_fechamento → fatura do mês atual da compra
 * - Se dia_compra >= dia_fechamento → fatura do mês seguinte ao da compra
 * 
 * Exemplo: dia_fechamento = 7
 * - Compra em 05/01 (dia < 7) → fatura de Janeiro
 * - Compra em 07/01 (dia >= 7) → fatura de Fevereiro
 * - Compra em 08/01 (dia >= 7) → fatura de Fevereiro
 * - Compra em 15/02 (dia >= 7) → fatura de Março
 * 
 * @param dataCompra - Data da compra (UTC)
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @returns { fatura_mes: 1-12, fatura_ano: number }
 */
export function calcularMesFatura(
  dataCompra: Date,
  diaFechamento: number
): { fatura_mes: number; fatura_ano: number } {
  const dia = dataCompra.getUTCDate()
  let mes = dataCompra.getUTCMonth() + 1 // 1-12
  let ano = dataCompra.getUTCFullYear()

  // Se dia da compra >= dia de fechamento, a compra vai para a fatura do mês seguinte
  if (dia >= diaFechamento) {
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }

  return { fatura_mes: mes, fatura_ano: ano }
}

/**
 * Enriquece transações de cartão que não possuem fatura_mes/fatura_ano,
 * calculando esses valores com base no dia_fechamento do cartão.
 * Modifica as transações IN-PLACE.
 * 
 * @param transacoes - Array de transações (será modificado in-place)
 * @param cartoes - Array de cartões com id e dia_fechamento
 */
export function enrichCardTransactions(
  transacoes: Array<{
    cartao_id?: string | null
    fatura_mes?: number | null
    fatura_ano?: number | null
    data?: string | null
    created_at?: string | null
    [key: string]: any
  }>,
  cartoes: Array<{
    id: string
    dia_fechamento?: string | number | null
    [key: string]: any
  }>
): void {
  // Criar mapa de cartão_id → dia_fechamento
  const cartaoMap = new Map<string, number>()
  for (const c of cartoes) {
    const dia = parseInt(String(c.dia_fechamento || '1'))
    cartaoMap.set(c.id, isNaN(dia) ? 1 : dia)
  }

  for (const t of transacoes) {
    // Só processar transações de cartão SEM fatura_mes/fatura_ano
    if (!t.cartao_id || (t.fatura_mes != null && t.fatura_ano != null)) continue

    const diaFechamento = cartaoMap.get(t.cartao_id) ?? 1
    const dt = parseToDateUTC(t.data || t.created_at)
    if (!dt) continue

    const { fatura_mes, fatura_ano } = calcularMesFatura(dt, diaFechamento)
    t.fatura_mes = fatura_mes
    t.fatura_ano = fatura_ano
  }
}
