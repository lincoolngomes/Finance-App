type ImportTransactionLike = {
  id?: string | null
  conta_id?: string | null
  account_id?: string | null
  accountId?: string | null
  cartao_id?: string | null
  categoria_id?: string | null
  data?: string | null
  descricao?: string | null
  valor?: number | string | null
  tipo?: string | null
  pago?: boolean | null
  status?: string | null
}

function normalizeDescription(value?: string | null) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function normalizeSignedValue(
  value?: number | string | null,
  tipo?: string | null,
) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '0.00'

  const tipoNormalizado = String(tipo || '').trim().toLowerCase()
  if (numeric < 0) return numeric.toFixed(2)
  if (tipoNormalizado === 'despesa') return (-Math.abs(numeric)).toFixed(2)
  if (tipoNormalizado === 'receita') return Math.abs(numeric).toFixed(2)

  return numeric.toFixed(2)
}

function getContaId(transacao: ImportTransactionLike) {
  return transacao.conta_id || transacao.account_id || transacao.accountId || ''
}

function buildLooseImportTransactionKey(transacao: ImportTransactionLike) {
  return [
    transacao.data || '',
    normalizeSignedValue(transacao.valor, transacao.tipo),
    String(transacao.tipo || '').trim().toLowerCase(),
  ].join('|')
}

export function buildImportTransactionKey(transacao: ImportTransactionLike) {
  return [
    getContaId(transacao),
    transacao.data || '',
    normalizeDescription(transacao.descricao),
    normalizeSignedValue(transacao.valor, transacao.tipo),
    String(transacao.tipo || '').trim().toLowerCase(),
    transacao.pago === true ? '1' : '0',
  ].join('|')
}

export function dedupeImportTransactions<T extends ImportTransactionLike>(
  candidatas: T[],
  existentes: ImportTransactionLike[] = [],
) {
  const keysConhecidas = new Set((existentes || []).map(buildImportTransactionKey))
  const unicas: T[] = []
  let skippedDuplicates = 0

  for (const transacao of candidatas || []) {
    const key = buildImportTransactionKey(transacao)
    if (keysConhecidas.has(key)) {
      skippedDuplicates += 1
      continue
    }

    keysConhecidas.add(key)
    unicas.push(transacao)
  }

  return {
    unicas,
    skippedDuplicates,
  }
}

type ReconciledImportUpdate = {
  id: string
  changes: Record<string, unknown>
}

export function reconcileImportTransactions<T extends ImportTransactionLike>(
  candidatas: T[],
  existentes: ImportTransactionLike[] = [],
  contaId: string,
) {
  const paidKeysConhecidas = new Set(
    (existentes || [])
      .filter((transacao) => getContaId(transacao) === contaId && transacao.pago === true)
      .map(buildImportTransactionKey),
  )

  const orphanByLooseKey = new Map<string, ImportTransactionLike[]>()
  const pendingByLooseKey = new Map<string, ImportTransactionLike[]>()

  for (const transacao of existentes || []) {
    if (transacao.cartao_id) continue

    const looseKey = buildLooseImportTransactionKey(transacao)
    const contaAssociada = getContaId(transacao)

    if (!contaAssociada && transacao.pago === true) {
      const rows = orphanByLooseKey.get(looseKey) || []
      rows.push(transacao)
      orphanByLooseKey.set(looseKey, rows)
      continue
    }

    if (contaAssociada === contaId && transacao.pago !== true) {
      const rows = pendingByLooseKey.get(looseKey) || []
      rows.push(transacao)
      pendingByLooseKey.set(looseKey, rows)
    }
  }

  const usedIds = new Set<string>()
  const unicas: T[] = []
  const updates: ReconciledImportUpdate[] = []
  let skippedDuplicates = 0
  let adoptedOrphans = 0
  let reactivatedPending = 0

  for (const transacao of candidatas || []) {
    const strictKey = buildImportTransactionKey(transacao)
    if (paidKeysConhecidas.has(strictKey)) {
      skippedDuplicates += 1
      continue
    }

    const looseKey = buildLooseImportTransactionKey(transacao)

    const orphanCandidates = (orphanByLooseKey.get(looseKey) || []).filter(
      (row) => row.id && !usedIds.has(row.id),
    )
    if (orphanCandidates.length === 1 && orphanCandidates[0].id) {
      const orphan = orphanCandidates[0]
      const changes: Record<string, unknown> = {
        conta_id: contaId,
        descricao: transacao.descricao,
        valor: transacao.valor,
        tipo: transacao.tipo,
        data: transacao.data,
        pago: true,
        status: 'pago',
      }
      if (transacao.categoria_id) {
        changes.categoria_id = transacao.categoria_id
      }

      updates.push({ id: orphan.id, changes })
      usedIds.add(orphan.id)
      adoptedOrphans += 1
      paidKeysConhecidas.add(strictKey)
      continue
    }

    const pendingCandidates = (pendingByLooseKey.get(looseKey) || []).filter(
      (row) => row.id && !usedIds.has(row.id),
    )
    if (pendingCandidates.length === 1 && pendingCandidates[0].id) {
      const pending = pendingCandidates[0]
      const changes: Record<string, unknown> = {
        descricao: transacao.descricao,
        valor: transacao.valor,
        tipo: transacao.tipo,
        data: transacao.data,
        pago: true,
        status: 'pago',
      }
      if (transacao.categoria_id) {
        changes.categoria_id = transacao.categoria_id
      }

      updates.push({ id: pending.id, changes })
      usedIds.add(pending.id)
      reactivatedPending += 1
      paidKeysConhecidas.add(strictKey)
      continue
    }

    if (paidKeysConhecidas.has(strictKey)) {
      skippedDuplicates += 1
      continue
    }

    paidKeysConhecidas.add(strictKey)
    unicas.push(transacao)
  }

  return {
    unicas,
    updates,
    skippedDuplicates,
    adoptedOrphans,
    reactivatedPending,
  }
}
