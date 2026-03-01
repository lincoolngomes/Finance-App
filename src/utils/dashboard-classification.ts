type DashboardClassifiableTransaction = {
  tipo?: string | null
  valor?: number | string | null
  descricao?: string | null
  pago?: boolean | null
  cartao_id?: string | null
  categorias?: {
    nome?: string | null
  } | null
}

const normalizeText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export function isInvestmentApplicationCategoryName(categoryName?: string | null) {
  const normalized = normalizeText(categoryName)
  if (!normalized) return false
  return normalized.includes('investimento')
}

export function isCardInvoiceCategoryName(categoryName?: string | null) {
  const normalized = normalizeText(categoryName)
  if (!normalized) return false
  return normalized.includes('fatura') && normalized.includes('cartao')
}

export function isCardInvoicePaymentDescription(description?: string | null) {
  const normalized = normalizeText(description)
  if (!normalized) return false

  return (
    normalized.includes('pagamento fatura') ||
    normalized.includes('pag fatura') ||
    normalized.includes('pagto fatura') ||
    normalized.includes('pgto fatura') ||
    (normalized.includes('fatura') &&
      (normalized.includes('pagamento') || normalized.includes('pagto') || normalized.includes('pgto')))
  )
}

export function isCardInvoicePaymentTransaction(transaction: DashboardClassifiableTransaction) {
  if (transaction.cartao_id) return false
  if (transaction.tipo !== 'despesa') return false

  return (
    isCardInvoiceCategoryName(transaction.categorias?.nome) ||
    isCardInvoicePaymentDescription(transaction.descricao)
  )
}

export function shouldIncludeTransactionByCardExpenseMode(
  transaction: DashboardClassifiableTransaction,
  showCardTransactions: boolean,
  useCardInvoicePayments: boolean
) {
  if (!showCardTransactions) {
    return !transaction.cartao_id && !isCardInvoicePaymentTransaction(transaction)
  }

  if (useCardInvoicePayments) {
    return !transaction.cartao_id || isCardInvoicePaymentTransaction(transaction)
  }

  return !isCardInvoicePaymentTransaction(transaction)
}

export function isInvestmentTransaction(transaction: DashboardClassifiableTransaction) {
  return isInvestmentApplicationCategoryName(transaction.categorias?.nome)
}

export function isInvestmentApplicationTransaction(transaction: DashboardClassifiableTransaction) {
  return transaction.tipo === 'despesa' && isInvestmentTransaction(transaction)
}

export function isInvestmentRedemptionTransaction(transaction: DashboardClassifiableTransaction) {
  if (!isInvestmentTransaction(transaction)) return false

  const categoryName = normalizeText(transaction.categorias?.nome)
  const description = normalizeText(transaction.descricao)

  return categoryName.includes('resgate') || description.includes('resgate')
}

export function getTransactionAbsoluteAmount(transaction: DashboardClassifiableTransaction) {
  const value = Number(transaction.valor)
  return Number.isFinite(value) ? Math.abs(value) : 0
}

export function getInvestmentImpact(transaction: DashboardClassifiableTransaction) {
  if (!isInvestmentTransaction(transaction)) return 0

  const value = getTransactionAbsoluteAmount(transaction)
  if (transaction.tipo === 'despesa') return value
  if (transaction.tipo === 'receita') {
    return isInvestmentRedemptionTransaction(transaction) ? -value : value
  }

  return 0
}

export function shouldIncludeTransactionInDashboardView(
  transaction: DashboardClassifiableTransaction,
  includePending: boolean
) {
  if (transaction.tipo === 'receita') {
    if (transaction.cartao_id) return false
    return includePending ? true : transaction.pago === true
  }

  if (transaction.tipo === 'despesa') {
    return includePending ? true : transaction.pago === true
  }

  return false
}
