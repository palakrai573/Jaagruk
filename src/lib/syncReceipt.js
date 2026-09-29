// Only a receipt for the exact uploaded content authorizes queue deletion.
export function acceptedSyncHashes(receipt, batch) {
  if (receipt?.format !== 'jaagruk-sync-receipt' || receipt.version !== 1 || !Array.isArray(receipt.results)) return new Set()
  const sent = new Map(batch.map(row => [row.contentHash, row]))
  const grouped = new Map()
  for (const result of receipt.results) {
    const row = sent.get(result?.hash)
    if (!row || result.kind !== row.kind || result.refId !== row.refId) continue
    const previous = grouped.get(result.hash)
    grouped.set(result.hash, previous ? { conflict: true } : result)
  }
  return new Set([...grouped].filter(([, result]) =>
    !result.conflict && ['accepted', 'duplicate'].includes(result.status)).map(([hash]) => hash))
}

export function retryableSyncStatus(status) {
  return status === 401 || status === 403 || status === 408 || status === 425 || status === 429 || status >= 500
}

export function syncRetryDelay(attempts) {
  return Math.min(300000, 1000 * 2 ** Math.min(8, Math.max(0, attempts - 1)))
}
