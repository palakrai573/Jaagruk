// Offline-first sync: local write always wins, the network is optional.
//
// THE WRITE PATH, in order of preference:
//
//   1. Write to IndexedDB. This always happens first and never blocks. A worker
//      300 m underground gets the same behaviour as one at the site office.
//   2. Queue the record for outbound sync.
//   3. If the device has internet and an endpoint is configured, POST the batch.
//   4. If it doesn't, gossip the batch to a nearby supervisor's phone over the
//      same WebRTC channel the buddy drill uses. That phone carries it out of the
//      pit and uploads when it sees a network.
//
// Everything is content-addressed and idempotent, so replaying a batch is always
// safe. That matters because the realistic failure is a phone that uploaded
// successfully and then lost the response.
//
// NOTE ON THE ENDPOINT: there is no DGMS server in this submission. The client
// half is complete and a supervisor can point it at a URL in Settings, but the
// shipped path is the signed export bundle. See docs/ARCHITECTURE.md §9.11.
// Nothing is transmitted anywhere unless a supervisor explicitly enters a URL.

import { STORE, idbGet, idbPut, idbGetAll, idbDelete, idbCount } from './idb.js'
import { hashRecord, randomId } from './crypto.js'
import { LS, lsGet, lsSet, lsRemove } from './local.js'
import { getActiveSiteId } from './identity.js'
import {
  exportLedgerBundle,
  importLedgerBundle,
  getFullLedger,
  mergeRecords,
  CHAIN_FORMAT_VERSION,
} from './chain.js'
import { listHazards, mergeHazards, toTransport } from './hazards.js'
import { listAllAttempts } from './assessment.js'

export const SYNC_KIND = {
  CERT: 'cert',
  HAZARD: 'hazard',
  ATTEMPT: 'attempt',
}

export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  NO_ENDPOINT: 'no_endpoint',
  DONE: 'done',
  PARTIAL: 'partial',
  FAILED: 'failed',
}

const MAX_ATTEMPTS = 6
const BATCH_SIZE = 40
const REQUEST_TIMEOUT_MS = 20000

/* ================================================================== */
/* Endpoint configuration                                              */
/* ================================================================== */

export function getSyncEndpoint() {
  return lsGet(LS.SYNC_ENDPOINT, '') || ''
}

/**
 * Store the upload URL. Rejects anything that isn't https, because this is the
 * one place the app can be pointed at an external host and plain http would send
 * worker records over the wire in the clear.
 */
export function setSyncEndpoint(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) {
    lsRemove(LS.SYNC_ENDPOINT)
    return { ok: true, cleared: true }
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, error: 'ENDPOINT_INVALID' }
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !isLocal) return { ok: false, error: 'ENDPOINT_NOT_HTTPS' }

  lsSet(LS.SYNC_ENDPOINT, parsed.toString())
  return { ok: true, url: parsed.toString() }
}

export function isOnline() {
  try {
    return navigator.onLine !== false
  } catch {
    return true
  }
}

/* ================================================================== */
/* Queue                                                               */
/* ================================================================== */

/**
 * Add a record to the outbound queue.
 *
 * The queue id is derived from the content hash, so enqueuing the same record
 * twice collapses into one entry instead of double-sending it.
 */
export async function enqueue(kind, refId, payload) {
  if (!Object.values(SYNC_KIND).includes(kind)) throw new Error('BAD_SYNC_KIND')

  const contentHash = hashRecord({ kind, refId, payload })
  const entry = {
    id: `${kind}:${contentHash.slice(0, 24)}`,
    kind,
    refId: refId || '',
    contentHash,
    payload,
    at: Date.now(),
    attempts: 0,
    lastError: null,
  }

  const existing = await idbGet(STORE.SYNC_QUEUE, entry.id)
  if (existing) return existing

  try {
    await idbPut(STORE.SYNC_QUEUE, entry)
  } catch {
    // A full queue must not break the user action that produced it. The record
    // itself is already safely in its own store; rebuildQueue() can recover it.
    return { ...entry, persisted: false }
  }
  return entry
}

export async function listQueue() {
  const rows = await idbGetAll(STORE.SYNC_QUEUE)
  return rows.sort((a, b) => a.at - b.at)
}

export async function queueStats() {
  const rows = await listQueue()
  const byKind = { cert: 0, hazard: 0, attempt: 0 }
  let stuck = 0
  for (const row of rows) {
    if (byKind[row.kind] !== undefined) byKind[row.kind] += 1
    if (row.attempts >= MAX_ATTEMPTS) stuck += 1
  }
  return {
    total: rows.length,
    byKind,
    stuck,
    oldestAt: rows[0]?.at || 0,
    endpointConfigured: !!getSyncEndpoint(),
    online: isOnline(),
  }
}

export async function clearQueue() {
  const rows = await listQueue()
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await idbDelete(STORE.SYNC_QUEUE, row.id)
  }
  return rows.length
}

/**
 * Rebuild the queue from the source stores.
 *
 * Recovery path for a device whose queue was lost or which was seeded by
 * importing someone else's data. Because queue ids are content-derived, running
 * this repeatedly is safe.
 */
export async function rebuildQueue({ siteId = null } = {}) {
  const ledger = await getFullLedger()
  const hazards = await listHazards({ siteId })
  const attempts = await listAllAttempts()

  let queued = 0

  for (const record of ledger) {
    if (siteId && record.siteId !== siteId) continue
    // eslint-disable-next-line no-await-in-loop
    await enqueue(SYNC_KIND.CERT, record.hash, {
      hash: record.hash,
      payload: record.payload,
      sig: record.sig,
      sigAlg: record.sigAlg,
      signer: record.signer,
    })
    queued += 1
  }

  for (const hazard of hazards) {
    // eslint-disable-next-line no-await-in-loop
    await enqueue(SYNC_KIND.HAZARD, hazard.id, toTransport(hazard))
    queued += 1
  }

  for (const attempt of attempts) {
    // eslint-disable-next-line no-await-in-loop
    await enqueue(SYNC_KIND.ATTEMPT, attempt.id, attempt)
    queued += 1
  }

  return { queued }
}

/* ================================================================== */
/* Upload                                                              */
/* ================================================================== */

/**
 * POST queued records to the configured endpoint.
 *
 * Failure handling distinguishes the two cases that matter:
 *   - 4xx means the server rejected the content. Retrying will not help, so the
 *     entry is marked and dropped after the attempt cap rather than looping.
 *   - 5xx / network means try again later. The entry stays queued.
 */
export async function pushToEndpoint({ onProgress } = {}) {
  const endpoint = getSyncEndpoint()
  if (!endpoint) return { status: SYNC_STATUS.NO_ENDPOINT, sent: 0, remaining: (await queueStats()).total }
  if (!isOnline()) return { status: SYNC_STATUS.OFFLINE, sent: 0, remaining: (await queueStats()).total }

  const queue = (await listQueue()).filter((row) => row.attempts < MAX_ATTEMPTS)
  if (!queue.length) return { status: SYNC_STATUS.DONE, sent: 0, remaining: 0 }

  let sent = 0
  let failed = 0

  for (let offset = 0; offset < queue.length; offset += BATCH_SIZE) {
    const batch = queue.slice(offset, offset + BATCH_SIZE)
    const body = {
      format: 'jaagruk-sync',
      version: CHAIN_FORMAT_VERSION,
      siteId: getActiveSiteId(),
      sentAt: Date.now(),
      records: batch.map((row) => ({ kind: row.kind, refId: row.refId, hash: row.contentHash, payload: row.payload })),
    }
    // Derived from content, so a retry after a lost response is recognised as
    // the same batch rather than applied twice.
    const idempotencyKey = hashRecord(body.records)

    let response = null
    let networkError = false
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null

    try {
      // eslint-disable-next-line no-await-in-loop
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Jaagruk-Version': String(CHAIN_FORMAT_VERSION),
        },
        body: JSON.stringify(body),
        signal: controller?.signal,
      })
    } catch {
      networkError = true
    } finally {
      if (timer) clearTimeout(timer)
    }

    const ok = !networkError && response && response.ok
    const permanent = !networkError && response && response.status >= 400 && response.status < 500

    for (const row of batch) {
      if (ok) {
        // eslint-disable-next-line no-await-in-loop
        await idbDelete(STORE.SYNC_QUEUE, row.id)
        sent += 1
      } else {
        failed += 1
        const attempts = row.attempts + 1
        // eslint-disable-next-line no-await-in-loop
        await idbPut(STORE.SYNC_QUEUE, {
          ...row,
          attempts,
          lastError: networkError ? 'NETWORK' : `HTTP_${response?.status ?? 0}`,
          permanent: !!permanent,
          lastAttemptAt: Date.now(),
        })
      }
    }

    onProgress?.({ sent, failed, total: queue.length })

    // A network failure will hit every remaining batch the same way.
    if (networkError) break
  }

  const remaining = (await queueStats()).total
  let status = SYNC_STATUS.DONE
  if (failed && sent) status = SYNC_STATUS.PARTIAL
  else if (failed && !sent) status = SYNC_STATUS.FAILED

  return { status, sent, failed, remaining }
}

/* ================================================================== */
/* Gossip over the peer channel                                        */
/* ================================================================== */

export const GOSSIP_MSG = {
  MANIFEST: 'sync_manifest',
  WANT: 'sync_want',
  DATA: 'sync_data',
  DONE: 'sync_done',
}

const GOSSIP_CHUNK = 12
const GOSSIP_TIMEOUT_MS = 25000

/**
 * Exchange ledger records and hazard reports with a connected peer.
 *
 * Three-step protocol, run symmetrically by both sides:
 *   1. MANIFEST — "here is what I hold" (ids and timestamps only, tiny)
 *   2. WANT     — "send me these, I'm missing them or mine is older"
 *   3. DATA     — the actual records, chunked to stay under the channel's
 *                 message size limit
 *
 * Media is excluded. A batch of hazard photos would exceed the data channel's
 * 256 KB frame limit and is not what a supervisor needs in order to triage.
 *
 * @returns { start, handleMessage, cancel } — the caller routes peer messages in
 */
export function createGossipSession({ peer, siteId = null, onProgress, onComplete } = {}) {
  let active = false
  let done = false
  let timeoutTimer = null
  const received = { certs: 0, hazards: 0 }
  const sentCounts = { certs: 0, hazards: 0 }
  let localIndex = null

  const finish = (reason) => {
    if (done) return
    done = true
    active = false
    if (timeoutTimer) clearTimeout(timeoutTimer)
    onComplete?.({ ...received, sent: { ...sentCounts }, reason })
  }

  const armTimeout = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    // A peer that stops replying mid-exchange must not leave the UI spinning.
    timeoutTimer = setTimeout(() => finish('timeout'), GOSSIP_TIMEOUT_MS)
  }

  const buildIndex = async () => {
    const ledger = await getFullLedger()
    const hazards = await listHazards({ siteId })
    return {
      certs: ledger
        .filter((r) => !siteId || r.siteId === siteId)
        .map((r) => ({ hash: r.hash, siteId: r.siteId, seq: r.seq })),
      hazards: hazards.map((h) => ({ id: h.id, updatedAt: h.updatedAt || h.at })),
      ledgerByHash: new Map(ledger.map((r) => [r.hash, r])),
      hazardsById: new Map(hazards.map((h) => [h.id, h])),
    }
  }

  const sendData = (certHashes, hazardIds) => {
    const certs = certHashes
      .map((hash) => localIndex.ledgerByHash.get(hash))
      .filter(Boolean)
      .map(({ hash, payload, sig, sigAlg, signer }) => ({ hash, payload, sig, sigAlg, signer }))

    const hazards = hazardIds
      .map((id) => localIndex.hazardsById.get(id))
      .filter(Boolean)
      .map((h) => toTransport(h, { includeMedia: false }))

    // Chunk so no single frame approaches the channel's size limit.
    for (let i = 0; i < certs.length; i += GOSSIP_CHUNK) {
      peer?.send(GOSSIP_MSG.DATA, { certs: certs.slice(i, i + GOSSIP_CHUNK), hazards: [] })
    }
    for (let i = 0; i < hazards.length; i += GOSSIP_CHUNK) {
      peer?.send(GOSSIP_MSG.DATA, { certs: [], hazards: hazards.slice(i, i + GOSSIP_CHUNK) })
    }

    sentCounts.certs += certs.length
    sentCounts.hazards += hazards.length
    peer?.send(GOSSIP_MSG.DONE, { certs: certs.length, hazards: hazards.length })
    onProgress?.({ phase: 'sent', ...sentCounts })
  }

  return {
    get active() {
      return active
    },

    async start() {
      if (!peer?.connected) {
        finish('not_connected')
        return
      }
      active = true
      done = false
      localIndex = await buildIndex()
      peer.send(GOSSIP_MSG.MANIFEST, {
        certs: localIndex.certs,
        hazards: localIndex.hazards,
      })
      onProgress?.({ phase: 'manifest_sent' })
      armTimeout()
    },

    /** Route every inbound peer message here; non-gossip kinds are ignored. */
    async handleMessage(envelope) {
      if (!envelope?.kind?.startsWith('sync_')) return
      // DATA is still processed after the session has completed. Frames can
      // arrive out of order, and a peer's DONE only means it has finished
      // sending — dropping a late batch would silently lose records. Merges are
      // idempotent, so a late frame can only ever help.
      if (done && envelope.kind !== GOSSIP_MSG.DATA) return
      armTimeout()

      if (!localIndex) localIndex = await buildIndex()

      switch (envelope.kind) {
        case GOSSIP_MSG.MANIFEST: {
          const theirCerts = new Set((envelope.payload?.certs || []).map((c) => c.hash))
          const theirHazards = new Map((envelope.payload?.hazards || []).map((h) => [h.id, h.updatedAt || 0]))

          // What do we have that they don't?
          const certsToSend = localIndex.certs.filter((c) => !theirCerts.has(c.hash)).map((c) => c.hash)
          const hazardsToSend = localIndex.hazards
            .filter((h) => !theirHazards.has(h.id) || (theirHazards.get(h.id) || 0) < h.updatedAt)
            .map((h) => h.id)

          // What do they have that we want?
          const ourCerts = new Set(localIndex.certs.map((c) => c.hash))
          const ourHazards = new Map(localIndex.hazards.map((h) => [h.id, h.updatedAt || 0]))
          const wantCerts = (envelope.payload?.certs || []).filter((c) => !ourCerts.has(c.hash)).map((c) => c.hash)
          const wantHazards = (envelope.payload?.hazards || [])
            .filter((h) => !ourHazards.has(h.id) || (ourHazards.get(h.id) || 0) < (h.updatedAt || 0))
            .map((h) => h.id)

          if (wantCerts.length || wantHazards.length) {
            peer?.send(GOSSIP_MSG.WANT, { certs: wantCerts, hazards: wantHazards })
          }

          // Push proactively rather than waiting to be asked, so a one-sided
          // peer (already-synced supervisor) still receives our new records.
          if (certsToSend.length || hazardsToSend.length) sendData(certsToSend, hazardsToSend)
          else peer?.send(GOSSIP_MSG.DONE, { certs: 0, hazards: 0 })
          break
        }

        case GOSSIP_MSG.WANT: {
          sendData(envelope.payload?.certs || [], envelope.payload?.hazards || [])
          break
        }

        case GOSSIP_MSG.DATA: {
          const certs = envelope.payload?.certs || []
          const hazards = envelope.payload?.hazards || []

          if (certs.length) {
            // Signatures are verified inside mergeRecords; nothing unverified
            // ever enters the ledger, even from a peer we just paired with.
            const result = await mergeRecords(certs, { trustSigners: false })
            received.certs += result.added
          }
          if (hazards.length) {
            const result = await mergeHazards(hazards)
            received.hazards += result.added + result.updated
          }
          // Our local view changed, so the cached index is stale.
          localIndex = await buildIndex()
          onProgress?.({ phase: 'received', ...received })
          break
        }

        case GOSSIP_MSG.DONE:
          finish('complete')
          break

        default:
          break
      }
    },

    cancel() {
      finish('cancelled')
    },
  }
}

/* ================================================================== */
/* Hand-off bundle                                                     */
/* ================================================================== */

export const DGMS_BUNDLE_FORMAT = 'jaagruk-dgms'
export const DGMS_BUNDLE_VERSION = 1

/**
 * The shipped upload path: a single signed JSON file a supervisor can carry out
 * of the pit on a phone and hand to an inspector or attach to an email.
 *
 * Media is excluded by default for size; a compliance record needs the facts and
 * the signatures, not the photographs.
 */
export async function exportDgmsBundle({ siteId = null, includeMedia = false, includeAttempts = true } = {}) {
  const ledger = await exportLedgerBundle(siteId)
  const hazards = await listHazards({ siteId })
  const attempts = includeAttempts ? await listAllAttempts() : []

  return {
    format: DGMS_BUNDLE_FORMAT,
    version: DGMS_BUNDLE_VERSION,
    exportedAt: Date.now(),
    siteId: siteId || 'all',
    ledger,
    hazards: hazards.map((h) => toTransport(h, { includeMedia })),
    attempts: attempts.map((a) => ({
      id: a.id,
      workerId: a.workerId,
      scenarioId: a.scenarioId,
      domain: a.domain,
      mode: a.mode,
      at: a.at,
      accuracyPct: a.accuracyPct,
      speedPct: a.speedPct,
      readiness: a.readiness,
      hesitation: a.hesitation,
      totalLatencyMs: a.totalLatencyMs,
    })),
    counts: {
      ledgerRecords: ledger.records.length,
      hazards: hazards.length,
      attempts: attempts.length,
    },
  }
}

/**
 * Import a hand-off bundle. The ledger half is verified record by record; the
 * hazard half merges last-write-wins.
 *
 * `trustSigners` is opt-in and surfaced as an explicit choice in the UI, because
 * accepting a new certificate signer is a real decision, not a default.
 */
export async function importDgmsBundle(bundle, { trustSigners = false } = {}) {
  if (!bundle || bundle.format !== DGMS_BUNDLE_FORMAT) throw new Error('NOT_A_DGMS_BUNDLE')
  if (bundle.version !== DGMS_BUNDLE_VERSION) throw new Error('DGMS_VERSION_MISMATCH')

  const result = { ledger: null, hazards: null, attempts: 0 }

  if (bundle.ledger) result.ledger = await importLedgerBundle(bundle.ledger, { trustSigners })
  if (Array.isArray(bundle.hazards)) result.hazards = await mergeHazards(bundle.hazards)

  if (Array.isArray(bundle.attempts)) {
    for (const attempt of bundle.attempts) {
      if (!attempt?.id) continue
      // eslint-disable-next-line no-await-in-loop
      const existing = await idbGet(STORE.ATTEMPTS, attempt.id)
      if (existing) continue
      // eslint-disable-next-line no-await-in-loop
      await idbPut(STORE.ATTEMPTS, { ...attempt, steps: attempt.steps || [], imported: true })
      result.attempts += 1
    }
  }

  return result
}

/** Download the bundle as a file. */
export function downloadBundle(bundle, filename) {
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `jaagruk-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Read a bundle back from a user-selected file, with a clear parse failure. */
export function readBundleFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('NO_FILE'))
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      reject(new Error('FILE_TOO_LARGE'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('BAD_JSON'))
      }
    }
    reader.onerror = () => reject(new Error('READ_FAILED'))
    reader.readAsText(file)
  })
}

/* ================================================================== */
/* Automatic sync                                                      */
/* ================================================================== */

let autoSyncBound = false

/**
 * Try to flush the queue whenever the device regains connectivity or the app is
 * brought back to the foreground. This is the browser equivalent of
 * WorkManager's constraint-based scheduling: opportunistic rather than exact.
 *
 * @returns an unsubscribe function
 */
export function registerAutoSync({ onResult } = {}) {
  if (autoSyncBound) return () => {}
  autoSyncBound = true

  let running = false

  const attempt = async () => {
    if (running || !isOnline() || !getSyncEndpoint()) return
    running = true
    try {
      const result = await pushToEndpoint()
      if (result.sent > 0 || result.status === SYNC_STATUS.FAILED) onResult?.(result)
    } catch {
      /* nothing useful to do; the queue keeps the records */
    } finally {
      running = false
    }
  }

  const onOnline = () => {
    // Give the connection a moment to actually be usable.
    setTimeout(attempt, 1500)
  }
  const onVisible = () => {
    if (!document.hidden) attempt()
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  setTimeout(attempt, 3000)

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    autoSyncBound = false
  }
}

/** Queue depth without loading every payload — used by the header indicator. */
export async function pendingCount() {
  return idbCount(STORE.SYNC_QUEUE)
}

/** One-shot id for correlating a manual sync run in logs. */
export function newSyncRunId() {
  return `run_${randomId(6)}`
}
