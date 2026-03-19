type ContaLike = {
  id?: string | null
  tipo?: string | null
  type?: string | null
  saldo_inicial?: number | string | null
  saldoInicial?: number | string | null
  saldo?: number | string | null
}

type TransacaoLike = {
  valor?: number | string | null
  tipo?: string | null
  pago?: boolean | null
  cartao_id?: string | null
  conta_id?: string | null
  account_id?: string | null
  accountId?: string | null
  data?: string | null
  descricao?: string | null
  created_at?: string | null
  status?: string | null
}

export function isTransacaoPaga(transacao: { pago?: boolean | null }) {
  return transacao.pago === true
}

export function parseSaldoValue(raw: unknown) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (raw === null || raw === undefined) return 0

  const texto = String(raw).trim()
  if (!texto) return 0

  if (texto.includes(',')) {
    const normalizado = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
    const numero = Number.parseFloat(normalizado)
    return Number.isFinite(numero) ? numero : 0
  }

  const numero = Number.parseFloat(texto.replace(/[^\d.-]/g, ''))
  return Number.isFinite(numero) ? numero : 0
}

export function normalizeTipoConta(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function isContaImportavel(conta: Pick<ContaLike, 'tipo' | 'type'>) {
  const tipo = normalizeTipoConta(conta.tipo ?? conta.type ?? '')
  if (!tipo) return true
  if (tipo.includes('credit') || tipo.includes('cartao') || tipo.includes('card')) return false
  return true
}

export function getContaSaldoInicial(conta: ContaLike) {
  return parseSaldoValue(conta.saldo_inicial ?? conta.saldoInicial ?? conta.saldo ?? 0)
}

export function getImpactoSaldoTransacao(transacao: Pick<TransacaoLike, 'valor' | 'tipo'>) {
  const valorNumerico = parseSaldoValue(transacao.valor)
  const tipo = String(transacao.tipo || '').toLowerCase()

  if (valorNumerico < 0) return valorNumerico
  if (tipo === 'despesa') return -Math.abs(valorNumerico)
  if (tipo === 'receita') return Math.abs(valorNumerico)

  return valorNumerico
}

function isLancamentoRecorrenteContaMarcadoComoPago(transacao: TransacaoLike) {
  const descricao = String(transacao.descricao || '').trim()
  const data = String(transacao.data || '').trim()
  const valorNumerico = parseSaldoValue(transacao.valor)
  const tipo = String(transacao.tipo || '').toLowerCase()

  if (!descricao || !data) return false
  if (!/parcela\s+\d+\s+de\s+\d+/i.test(descricao)) return false
  if (tipo !== 'despesa') return false
  if (valorNumerico <= 0) return false

  // Ignora apenas recorrencias futuras salvas como pagas por engano.
  // Se a parcela ja chegou no extrato e a data nao esta no futuro, ela
  // precisa compor o saldo normalmente.
  const hoje = new Date()
  const hojeIso = new Date(
    Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
  )
    .toISOString()
    .slice(0, 10)

  return data > hojeIso
}

export function isTransacaoDeContaLiquidada(
  transacao: TransacaoLike,
  contaId?: string | null,
) {
  if (transacao.cartao_id) return false
  if (!isTransacaoPaga(transacao)) return false
  if (isLancamentoRecorrenteContaMarcadoComoPago(transacao)) return false

  if (!contaId) return true

  return (
    transacao.conta_id === contaId ||
    transacao.account_id === contaId ||
    transacao.accountId === contaId
  )
}

export function calculateContaBalance(
  conta: ContaLike,
  transacoes: TransacaoLike[],
) {
  const saldoInicial = getContaSaldoInicial(conta)
  const movimentacaoAplicada = (transacoes || [])
    .filter((transacao) => isTransacaoDeContaLiquidada(transacao, conta.id))
    .reduce((acc, transacao) => acc + getImpactoSaldoTransacao(transacao), 0)

  return {
    saldoInicial,
    movimentacaoAplicada,
    saldoTotal: saldoInicial + movimentacaoAplicada,
  }
}

export function calculateSaldoGlobalContas(
  contas: ContaLike[],
  transacoes: TransacaoLike[],
) {
  const contasImportaveis = (contas || []).filter(isContaImportavel)
  const contaIds = new Set(
    contasImportaveis
      .map((conta) => conta.id)
      .filter(Boolean),
  )

  const totalSaldoInicial = contasImportaveis.reduce(
    (acc, conta) => acc + getContaSaldoInicial(conta),
    0,
  )

  const movimentacaoAplicada = (transacoes || [])
    .filter((transacao) => {
      if (!isTransacaoDeContaLiquidada(transacao)) return false

      const contaIdTransacao =
        transacao.conta_id ||
        transacao.account_id ||
        transacao.accountId ||
        null

      // Lancamentos de conta antigos ou criados sem conta vinculada ainda
      // precisam impactar o saldo global, mesmo sem compor o saldo individual
      // de uma conta especifica.
      if (!contaIdTransacao) return true
      return contaIds.has(contaIdTransacao)
    })
    .reduce((acc, transacao) => acc + getImpactoSaldoTransacao(transacao), 0)

  return totalSaldoInicial + movimentacaoAplicada
}
