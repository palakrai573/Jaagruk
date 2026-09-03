// Tamper-evident hash-chained certificate ledger.
//
// TERMINOLOGY, deliberately: this is a hash-chain, NOT a blockchain. There is
// no consensus, no distributed agreement, no proof of work. Each record embeds
// the hash of the record before it, so any mutation or insertion breaks the
// linkage and is detectable offline. That is the property the problem statement
// actually needs ("physical certificates have no mechanism to verify
// comprehension") and it is achievable without a network.
//
// Record layout — the signed payload uses SHORT KEYS because this exact object
// is what travels inside the QR code, and every byte costs QR density:
//
//   v   format version
//   k   kind: 'g' genesis | 'c' certificate
//   st  site id
//   q   sequence number within the site (0 = genesis)
//   p   previous record hash ('0'*64 for genesis)
//   w   worker id
//   n   worker name
//   d   per-domain best score, fixed order (see DOMAIN_ORDER)
//   r   per-domain effective readiness, same order
//   f   hesitation bitmask over the same order
//   a   average readiness
//   t   issued-at (epoch ms)
//
// The stored record wraps that payload with its hash, signature, signer public
// key, and the denormalised fields IndexedDB indexes on.

import { STORE, idbGet, idbGetAll, idbPut, idbPutMany, idbQuery } from './idb.js'
import { hashRecord, canonicalJson, signHash, verifyHashSignature, SIG_ALG } from './crypto.js'
import { getDeviceKey, getTrustedKeys, getActiveSiteId, trustPublicKey, DEFAULT_SITE_ID } from './identity.js'
import { CERTIFICATION_DOMAINS } from './scenarios.js'
import { clampPercent } from './num.js'

export const CHAIN_FORMAT_VERSION = 1
export const GENESIS_PREV = '0'.repeat(64)

/**
 * The domain order baked into record format v1. Frozen on purpose: changing
 * the order would silently reinterpret every historical record, so a future
 * change must bump CHAIN_FORMAT_VERSION instead of editing this.
 */
export const DOMAIN_ORDER = Object.freeze([...CERTIFICATION_DOMAINS])

export const CHAIN_STATUS = {
  OK: 'OK',
  BAD_HASH: 'BAD_HASH',
  BROKEN_LINK: 'BROKEN_LINK',
  BAD_SIGNATURE: 'BAD_SIGNATURE',
  UNKNOWN_SIGNER: 'UNKNOWN_SIGNER',
  SEQ_GAP: 'SEQ_GAP',
  FORK: 'FORK',
  DOMAIN_MISMATCH: 'DOMAIN_MISMATCH',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
}

const ALG_CODE = { [SIG_ALG.ED25519]: 'e', [SIG_ALG.ECDSA_P256]: 'p', [SIG_ALG.HMAC_FALLBACK]: 'h' }
const CODE_ALG = { e: SIG_ALG.ED25519, p: SIG_ALG.ECDSA_P256, h: SIG_ALG.HMAC_FALLBACK }

/* ================================================================== */
/* Reading                                                             */
/* ================================================================== */

/** All records for a site, ordered by sequence then issue time. */
export async function getChain(siteId = getActiveSiteId()) {
  const rows = await idbQuery(STORE.CHAIN, 'siteId', siteId)
  return sortChain(rows)
}

export async function getFullLedger() {
  return sortChain(await idbGetAll(STORE.CHAIN))
}

function sortChain(rows) {
  return [...rows].sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq
    return (a.payload?.t || 0) - (b.payload?.t || 0)
  })
}

/** The newest record in a site's chain, or null if the chain is empty. */
export async function getTip(siteId = getActiveSiteId()) {
  const chain = await getChain(siteId)
  return chain.length ? chain[chain.length - 1] : null
}

export async function getRecordByHash(hash) {
  return idbGet(STORE.CHAIN, hash)
}

/** Look up by the human-facing certificate id (derived from the hash). */
export async function getRecordByCertId(certId) {
  if (!certId) return null
  const all = await idbGetAll(STORE.CHAIN)
  return all.find((r) => r.certId === certId) || null
}

export async function getCertificatesForWorker(workerId) {
  const rows = await idbQuery(STORE.CHAIN, 'workerId', workerId)
  return sortChain(rows.filter((r) => r.payload?.k === 'c'))
}

/** Every certificate across every site, newest first. */
export async function listCertificates() {
  const all = await idbGetAll(STORE.CHAIN)
  return all.filter((r) => r.payload?.k === 'c').sort((a, b) => (b.payload?.t || 0) - (a.payload?.t || 0))
}

/* ================================================================== */
/* Identifiers                                                         */
/* ================================================================== */

/**
 * Certificate id derived from the record hash, so it is reproducible from the
 * record alone and cannot be chosen by whoever issues it.
 */
export function certIdFromHash(hash, seq) {
  const short = String(hash || '').slice(0, 10).toUpperCase()
  return `JGK-${String(seq ?? 0).padStart(4, '0')}-${short}`
}

/* ================================================================== */
/* Writing                                                             */
/* ================================================================== */

async function buildAndSign(payload) {
  const hash = hashRecord(payload)
  const key = await getDeviceKey()
  const sig = await signHash(key, hash)
  return {
    hash,
    payload,
    sig,
    sigAlg: key.alg,
    signer: key.publicKey,
    certId: certIdFromHash(hash, payload.q),
    // Denormalised for IndexedDB indexes
    siteId: payload.st,
    seq: payload.q,
    workerId: payload.w,
    storedAt: Date.now(),
  }
}

/** Create the site's first record. Idempotent — returns the existing genesis. */
export async function ensureGenesis(siteId = getActiveSiteId()) {
  const chain = await getChain(siteId)
  const existing = chain.find((r) => r.payload?.k === 'g')
  if (existing) return existing

  const payload = {
    v: CHAIN_FORMAT_VERSION,
    k: 'g',
    st: siteId || DEFAULT_SITE_ID,
    q: 0,
    p: GENESIS_PREV,
    w: '',
    n: '',
    d: [],
    r: [],
    f: 0,
    a: 0,
    t: Date.now(),
  }

  const record = await buildAndSign(payload)
  await idbPut(STORE.CHAIN, record)
  return record
}

/**
 * Append a certificate. Caller supplies the already-computed per-domain
 * results; this module owns hashing, linking and signing only.
 *
 * domainResults: [{ domain, score, readiness, hesitation }]
 * Throws DOMAIN_MISMATCH if the results don't cover DOMAIN_ORDER exactly.
 */
export async function appendCertificate({ workerId, workerName, domainResults, siteId = getActiveSiteId() }) {
  if (!workerId) throw new Error('WORKER_REQUIRED')

  const byDomain = new Map((domainResults || []).map((d) => [d.domain, d]))
  if (DOMAIN_ORDER.some((d) => !byDomain.has(d))) throw new Error('DOMAIN_MISMATCH')

  await ensureGenesis(siteId)
  const tip = await getTip(siteId)

  const scores = DOMAIN_ORDER.map((d) => clampPercent(byDomain.get(d).score, 0))
  const readiness = DOMAIN_ORDER.map((d) => clampPercent(byDomain.get(d).readiness, 0))
  let flags = 0
  DOMAIN_ORDER.forEach((d, i) => {
    if (byDomain.get(d).hesitation) flags |= 1 << i
  })

  const payload = {
    v: CHAIN_FORMAT_VERSION,
    k: 'c',
    st: siteId || DEFAULT_SITE_ID,
    q: (tip?.seq ?? -1) + 1,
    p: tip?.hash || GENESIS_PREV,
    w: workerId,
    n: String(workerName || '').trim().slice(0, 60) || 'Unnamed Worker',
    d: scores,
    r: readiness,
    f: flags,
    a: Math.round(readiness.reduce((s, x) => s + x, 0) / (readiness.length || 1)),
    t: Date.now(),
  }

  const record = await buildAndSign(payload)
  await idbPut(STORE.CHAIN, record)
  return record
}

/* ================================================================== */
/* Reading a record back into friendly shape                           */
/* ================================================================== */

/** Expand a stored record into labelled fields for display. */
export function describeRecord(record) {
  const p = record?.payload
  if (!p) return null
  const domains = DOMAIN_ORDER.map((domain, i) => ({
    domain,
    score: p.d?.[i] ?? 0,
    readiness: p.r?.[i] ?? 0,
    hesitation: !!(p.f & (1 << i)),
  }))
  return {
    certId: record.certId,
    hash: record.hash,
    kind: p.k === 'g' ? 'genesis' : 'certificate',
    siteId: p.st,
    seq: p.q,
    prevHash: p.p,
    workerId: p.w,
    workerName: p.n,
    domains,
    avgReadiness: p.a ?? 0,
    avgScore: domains.length ? Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length) : 0,
    hesitationCount: domains.filter((d) => d.hesitation).length,
    issuedAt: p.t,
    sigAlg: record.sigAlg,
    signer: record.signer,
    imported: !!record.importedAt,
  }
}

/* ================================================================== */
/* Verification                                                        */
/* ================================================================== */

/**
 * Verify a single record in isolation: does its payload still hash to its
 * stored hash, and does the signature check out?
 *
 * `trusted` is the list from identity.getTrustedKeys(). Pass null to skip the
 * signer-trust check (used when verifying a stranger's QR on a fresh device).
 */
export async function verifyRecord(record, trusted) {
  const issues = []
  if (!record?.payload || !record?.hash) {
    return { ok: false, issues: [CHAIN_STATUS.BAD_HASH] }
  }

  if (record.payload.v !== CHAIN_FORMAT_VERSION) issues.push(CHAIN_STATUS.UNSUPPORTED_VERSION)

  if (record.payload.k === 'c') {
    const dLen = Array.isArray(record.payload.d) ? record.payload.d.length : -1
    if (dLen !== DOMAIN_ORDER.length) issues.push(CHAIN_STATUS.DOMAIN_MISMATCH)
  }

  if (hashRecord(record.payload) !== record.hash) issues.push(CHAIN_STATUS.BAD_HASH)

  const sigOk = await verifyHashSignature(record.sigAlg, record.signer, record.hash, record.sig)
  if (!sigOk) issues.push(CHAIN_STATUS.BAD_SIGNATURE)

  if (Array.isArray(trusted) && sigOk) {
    const known = trusted.some((k) => k.publicKey === record.signer && k.alg === record.sigAlg)
    if (!known) issues.push(CHAIN_STATUS.UNKNOWN_SIGNER)
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Walk a whole site chain. Reports per-record issues and a summary so the
 * dashboard can show exactly what failed and where, rather than a bare
 * valid/invalid.
 */
export async function verifyChain(siteId = getActiveSiteId()) {
  const chain = await getChain(siteId)
  const trusted = await getTrustedKeys()

  const results = []
  const seqSeen = new Map()
  let previous = null

  for (const record of chain) {
    // eslint-disable-next-line no-await-in-loop
    const { issues } = await verifyRecord(record, trusted)
    const recordIssues = [...issues]

    // Linkage
    const expectedPrev = previous ? previous.hash : GENESIS_PREV
    if (record.payload?.p !== expectedPrev) recordIssues.push(CHAIN_STATUS.BROKEN_LINK)

    // Sequence continuity
    const expectedSeq = previous ? previous.seq + 1 : 0
    if (record.seq !== expectedSeq) recordIssues.push(CHAIN_STATUS.SEQ_GAP)

    // Two records claiming the same slot = fork
    if (seqSeen.has(record.seq)) recordIssues.push(CHAIN_STATUS.FORK)
    else seqSeen.set(record.seq, record.hash)

    results.push({
      record,
      described: describeRecord(record),
      issues: [...new Set(recordIssues)],
      ok: recordIssues.length === 0,
    })

    previous = record
  }

  const broken = results.filter((r) => !r.ok)
  const allIssues = [...new Set(broken.flatMap((r) => r.issues))]

  return {
    siteId,
    length: chain.length,
    ok: broken.length === 0,
    verifiedCount: results.length - broken.length,
    brokenCount: broken.length,
    issues: allIssues,
    // Index of the first bad record, so the UI can say "chain intact up to #N"
    firstBrokenIndex: results.findIndex((r) => !r.ok),
    results,
  }
}

/* ================================================================== */
/* QR payload — self-contained, offline-verifiable                     */
/* ================================================================== */

const QR_PREFIX = 'JGK1'
const QR_SEP = '|'

/**
 * Encode a record for a QR code. The payload travels whole, so any device can
 * recompute the hash and check the signature with no network and no local copy
 * of the chain.
 *
 * Format: JGK1|<algCode>|<signerKey>|<signature>|<canonicalPayloadJson>
 * The payload goes last precisely because it may contain the separator inside
 * a worker's name; decoding splits on the first four delimiters only.
 */
export function encodeCertQr(record) {
  if (!record?.payload) throw new Error('INVALID_RECORD')
  const alg = ALG_CODE[record.sigAlg] || '?'
  return [QR_PREFIX, alg, record.signer, record.sig, canonicalJson(record.payload)].join(QR_SEP)
}

/**
 * Parse a scanned/pasted QR string back into a record.
 * Returns null when the string clearly isn't a Jaagruk certificate.
 */
export function decodeCertQr(text) {
  const raw = String(text || '').trim()
  if (!raw.startsWith(`${QR_PREFIX}${QR_SEP}`)) return null

  // Split into exactly 5 fields, keeping any separators inside the JSON tail.
  const parts = []
  let rest = raw
  for (let i = 0; i < 4; i += 1) {
    const idx = rest.indexOf(QR_SEP)
    if (idx === -1) return null
    parts.push(rest.slice(0, idx))
    rest = rest.slice(idx + 1)
  }
  parts.push(rest)

  const [, algCode, signer, sig, json] = parts
  const sigAlg = CODE_ALG[algCode]
  if (!sigAlg || !signer || !sig || !json) return null

  let payload
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object' || typeof payload.q !== 'number') return null

  const hash = hashRecord(payload)
  return {
    hash,
    payload,
    sig,
    sigAlg,
    signer,
    certId: certIdFromHash(hash, payload.q),
    siteId: payload.st,
    seq: payload.q,
    workerId: payload.w,
    fromQr: true,
  }
}

/**
 * Full offline verification of a scanned certificate.
 *
 * Reports four independent things, because they mean different things to an
 * inspector and the Verify screen surfaces them as four separate rows:
 *   selfValid     — payload is intact and correctly signed
 *   signerKnown   — the signing device is one this phone already trusts
 *   presentLocally— the record exists in this phone's ledger at all
 *   chainLinked   — and, if present, links correctly to its predecessor
 *                and links correctly
 */
export async function verifyScannedCertificate(text) {
  const record = decodeCertQr(text)
  if (!record) return { found: false, reason: 'UNREADABLE' }

  const trusted = await getTrustedKeys()
  const { issues } = await verifyRecord(record, trusted)

  const selfIssues = issues.filter((i) => i !== CHAIN_STATUS.UNKNOWN_SIGNER)
  const signerKnown = !issues.includes(CHAIN_STATUS.UNKNOWN_SIGNER)

  // Does our local ledger agree?
  const local = await getRecordByHash(record.hash)
  let chainLinked = false
  let chainIssues = []
  if (local) {
    const chainResult = await verifyChain(record.siteId)
    const entry = chainResult.results.find((r) => r.record.hash === record.hash)
    chainLinked = !!entry?.ok
    chainIssues = entry?.issues || []
  }

  return {
    found: true,
    record,
    described: describeRecord(record),
    selfValid: selfIssues.length === 0,
    selfIssues,
    signerKnown,
    presentLocally: !!local,
    chainLinked,
    chainIssues,
  }
}

/* ================================================================== */
/* Merge (gossip / import)                                             */
/* ================================================================== */

/**
 * Additively merge records from another device. Records are content-addressed,
 * so replaying the same batch is always safe.
 *
 * Returns counts plus any forks detected, which is the interesting signal:
 * two different records claiming the same site+seq means one device issued
 * against a stale tip, or someone tampered.
 */
export async function mergeRecords(incoming, { trustSigners = false } = {}) {
  const rows = Array.isArray(incoming) ? incoming : []
  if (!rows.length) return { added: 0, duplicates: 0, rejected: 0, forks: [], rejectedDetail: [] }

  const existing = await idbGetAll(STORE.CHAIN)
  const byHash = new Map(existing.map((r) => [r.hash, r]))
  const bySiteSeq = new Map(existing.map((r) => [`${r.siteId}#${r.seq}`, r]))

  const toAdd = []
  const forks = []
  const rejectedDetail = []
  let duplicates = 0

  for (const candidate of rows) {
    const normalised = normaliseIncoming(candidate)
    if (!normalised) {
      rejectedDetail.push({ reason: 'MALFORMED' })
      continue
    }

    if (byHash.has(normalised.hash)) {
      duplicates += 1
      continue
    }

    // Signature and self-hash must hold before anything enters the ledger.
    // eslint-disable-next-line no-await-in-loop
    const { issues } = await verifyRecord(normalised, null)
    const fatal = issues.filter(
      (i) => i === CHAIN_STATUS.BAD_HASH || i === CHAIN_STATUS.BAD_SIGNATURE || i === CHAIN_STATUS.UNSUPPORTED_VERSION
    )
    if (fatal.length) {
      rejectedDetail.push({ hash: normalised.hash, reason: fatal[0] })
      continue
    }

    const slot = `${normalised.siteId}#${normalised.seq}`
    const clash = bySiteSeq.get(slot)
    if (clash && clash.hash !== normalised.hash) {
      forks.push({ siteId: normalised.siteId, seq: normalised.seq, hashes: [clash.hash, normalised.hash] })
      // Still store it. Hiding a fork would defeat the point of the ledger —
      // verifyChain() surfaces it as FORK for a human to adjudicate.
    }

    const record = { ...normalised, importedAt: Date.now() }
    toAdd.push(record)
    byHash.set(record.hash, record)
    if (!clash) bySiteSeq.set(slot, record)

    if (trustSigners) {
      // eslint-disable-next-line no-await-in-loop
      await trustPublicKey(record.sigAlg, record.signer, 'Peer device')
    }
  }

  if (toAdd.length) await idbPutMany(STORE.CHAIN, toAdd)

  return { added: toAdd.length, duplicates, rejected: rejectedDetail.length, forks, rejectedDetail }
}

function normaliseIncoming(candidate) {
  if (!candidate || typeof candidate !== 'object') return null
  const payload = candidate.payload
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.q !== 'number' || typeof payload.st !== 'string') return null
  if (!candidate.sig || !candidate.signer || !candidate.sigAlg) return null

  const hash = hashRecord(payload)
  return {
    hash,
    payload,
    sig: candidate.sig,
    sigAlg: candidate.sigAlg,
    signer: candidate.signer,
    certId: certIdFromHash(hash, payload.q),
    siteId: payload.st,
    seq: payload.q,
    workerId: payload.w || '',
    storedAt: candidate.storedAt || Date.now(),
  }
}

/** Serialise the ledger for hand-off to a supervisor phone or DGMS upload. */
export async function exportLedgerBundle(siteId) {
  const records = siteId ? await getChain(siteId) : await getFullLedger()
  const trusted = await getTrustedKeys()
  return {
    format: 'jaagruk-ledger',
    version: CHAIN_FORMAT_VERSION,
    domainOrder: DOMAIN_ORDER,
    exportedAt: Date.now(),
    siteId: siteId || 'all',
    signers: trusted.map(({ alg, publicKey, label }) => ({ alg, publicKey, label })),
    records: records.map(({ hash, payload, sig, sigAlg, signer }) => ({ hash, payload, sig, sigAlg, signer })),
  }
}

/**
 * Import a bundle produced by exportLedgerBundle.
 * Signer keys in the bundle are recorded as trusted only when the caller opts
 * in, because trusting an unknown signer is a real decision, not a default.
 */
export async function importLedgerBundle(bundle, { trustSigners = false } = {}) {
  if (!bundle || bundle.format !== 'jaagruk-ledger') throw new Error('NOT_A_LEDGER_BUNDLE')
  if (bundle.version !== CHAIN_FORMAT_VERSION) throw new Error('LEDGER_VERSION_MISMATCH')
  if (
    Array.isArray(bundle.domainOrder) &&
    canonicalJson(bundle.domainOrder) !== canonicalJson(DOMAIN_ORDER)
  ) {
    throw new Error('LEDGER_DOMAIN_MISMATCH')
  }

  if (trustSigners && Array.isArray(bundle.signers)) {
    for (const s of bundle.signers) {
      // eslint-disable-next-line no-await-in-loop
      await trustPublicKey(s.alg, s.publicKey, s.label || 'Imported signer')
    }
  }

  return mergeRecords(bundle.records, { trustSigners })
}
