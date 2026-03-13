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

export function extractImportedInvoiceReference(
  observacao?: string | null,
): { mes: number; ano: number } | null {
  const match = String(observacao || '').match(/^\s*Fatura\s+(\d{1,2})\/(\d{4})\s*$/i)
  if (!match) return null

  const mes = Number(match[1])
  const ano = Number(match[2])

  if (!Number.isFinite(mes) || !Number.isFinite(ano) || mes < 1 || mes > 12 || ano < 1) {
    return null
  }

  return { mes, ano }
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
 * O mês/ano retornado representa a referência da fatura pelo VENCIMENTO,
 * como já é tratado em GerenciarFaturasModal.
 *
 * Regras:
 * - Se fechamento < vencimento: compras até o fechamento entram na fatura do mês atual;
 *   compras após o fechamento entram na fatura do mês seguinte.
 * - Se fechamento >= vencimento: a referência já anda um mês à frente;
 *   compras até o fechamento entram na fatura do mês seguinte e compras após o fechamento
 *   entram na fatura do mês subsequente.
 * 
 * @param dataCompra - Data da compra (UTC)
 * @param diaFechamento - Dia de fechamento do cartão (1-31)
 * @param diaVencimento - Dia de vencimento do cartão (1-31)
 * @returns { fatura_mes: 1-12, fatura_ano: number }
 */
export function calcularMesFatura(
  dataCompra: Date,
  diaFechamento: number,
  diaVencimento?: number | null,
): { fatura_mes: number; fatura_ano: number } {
  const dia = dataCompra.getUTCDate()
  let mes = dataCompra.getUTCMonth() + 1 // 1-12
  let ano = dataCompra.getUTCFullYear()
  const fechamento = Number.isFinite(Number(diaFechamento)) ? Number(diaFechamento) : 1
  const vencimento = Number.isFinite(Number(diaVencimento)) ? Number(diaVencimento) : null

  let mesesParaSomar = 0

  if (vencimento != null && fechamento >= vencimento) {
    mesesParaSomar = dia > fechamento ? 2 : 1
  } else {
    mesesParaSomar = dia > fechamento ? 1 : 0
  }

  while (mesesParaSomar > 0) {
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
    mesesParaSomar -= 1
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
    observacao?: string | null
    [key: string]: any
  }>,
  cartoes: Array<{
    id: string
    dia_fechamento?: string | number | null
    dia_vencimento?: string | number | null
    [key: string]: any
  }>
): void {
  // Criar mapa de cartão_id → configuração de fechamento/vencimento
  const cartaoMap = new Map<string, { fechamento: number; vencimento: number | null }>()
  for (const c of cartoes) {
    const fechamento = parseInt(String(c.dia_fechamento || '1'))
    const vencimento = parseInt(String(c.dia_vencimento || ''))
    cartaoMap.set(c.id, {
      fechamento: Number.isNaN(fechamento) ? 1 : fechamento,
      vencimento: Number.isNaN(vencimento) ? null : vencimento,
    })
  }

  for (const t of transacoes) {
    // Só processar transações de cartão SEM fatura_mes/fatura_ano
    if (!t.cartao_id || (t.fatura_mes != null && t.fatura_ano != null)) continue

    const referenciaImportada = extractImportedInvoiceReference(t.observacao)
    if (referenciaImportada) {
      t.fatura_mes = referenciaImportada.mes
      t.fatura_ano = referenciaImportada.ano
      continue
    }

    const configCartao = cartaoMap.get(t.cartao_id) ?? { fechamento: 1, vencimento: null }
    const dt = parseToDateUTC(t.data || t.created_at)
    if (!dt) continue

    const { fatura_mes, fatura_ano } = calcularMesFatura(
      dt,
      configCartao.fechamento,
      configCartao.vencimento,
    )
    t.fatura_mes = fatura_mes
    t.fatura_ano = fatura_ano
  }
}
