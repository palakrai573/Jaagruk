// Certification eligibility and issuance.
//
// This module answers one question — is this worker currently competent across
// all five required domains — and if so, hands the record to chain.js to be
// signed and linked.
//
// TWO THINGS CHANGED FROM THE EARLIER VERSION, both of which affect what a
// certificate means:
//
// 1. Progress is computed from READINESS, not raw score. Readiness folds in
//    reaction time, so a worker who knows every answer but freezes on half of
//    them no longer certifies as though they were ready.
//
// 2. Eligibility uses DECAYED readiness. A pass from four months ago is not
//    evidence of present competence, and the problem statement's whole complaint
//    is that existing certificates have no mechanism to verify comprehension.
//    A certificate here is a snapshot of current standing, and re-issuing takes a
//    fresh one.
//
// Legacy history still counts. Sessions recorded before latency existed are
// treated as having unknown timing rather than being thrown away.

import { CERTIFICATION_DOMAINS } from './scenarios.js'
import { bestByDomain, domainForScenario } from './assessment.js'
import { effectiveReadiness, listSchedules } from './spaced.js'
import {
  appendCertificate,
  listCertificates,
  getCertificatesForWorker,
  getRecordByCertId,
  describeRecord,
  verifyRecord,
  verifyChain,
} from './chain.js'
import { getTrustedKeys, getActiveSiteId } from './identity.js'
import { getLog } from './store.js'

/** Per-domain effective readiness needed to count as passed. */
export const PASS_THRESHOLD = 70

/* ================================================================== */
/* Domain progress                                                     */
/* ================================================================== */

function blankDomain(domain) {
  return {
    domain,
    readiness: 0,
    effectiveReadiness: 0,
    accuracyPct: 0,
    speedPct: 0,
    attempts: 0,
    hesitation: false,
    everHesitated: false,
    lastPassAt: 0,
    at: 0,
    decayFactor: 1,
    legacyOnly: false,
    passed: false,
  }
}

/**
 * Fold attempt records and any pre-existing local history into a per-domain view.
 *
 * @param attempts    records from assessment.listAttempts
 * @param schedules   records from spaced.listSchedules (for the decay anchor)
 * @param legacyLog   optional store.getLog() entries from before attempts existed
 * @param now         injectable for testing
 */
export function computeDomainProgress(attempts = [], schedules = [], legacyLog = null, now = Date.now()) {
  const byDomain = {}
  for (const domain of CERTIFICATION_DOMAINS) byDomain[domain] = blankDomain(domain)

  // Modern attempts, which carry readiness and timing.
  const best = bestByDomain(attempts)
  for (const [domain, entry] of Object.entries(best)) {
    if (!byDomain[domain]) continue
    byDomain[domain] = {
      ...byDomain[domain],
      readiness: entry.readiness,
      accuracyPct: entry.accuracyPct ?? 0,
      speedPct: entry.speedPct ?? 0,
      attempts: entry.attempts || 0,
      hesitation: !!entry.hesitation,
      everHesitated: !!entry.everHesitated,
      at: entry.at || 0,
    }
  }

  // Legacy sessions. These predate latency measurement, so their score stands in
  // for readiness — generous, but discarding a worker's real history would be
  // worse than treating their timing as unknown.
  for (const entry of legacyLog || []) {
    if (entry?.type !== 'scenario') continue
    const domain = entry.domain || domainForScenario(entry.scenarioId)
    if (!domain || !byDomain[domain]) continue

    const legacyReadiness = Math.max(0, Math.min(100, Math.round(entry.readiness ?? entry.score ?? 0)))
    const current = byDomain[domain]
    current.attempts += 1
    if (legacyReadiness > current.readiness) {
      current.readiness = legacyReadiness
      current.at = entry.timestamp || current.at
      current.legacyOnly = true
    }
    if (entry.hesitation) current.everHesitated = true
  }

  // Decay against the most recent pass we know about.
  const scheduleByDomain = new Map((schedules || []).map((s) => [s.domain, s]))
  for (const domain of CERTIFICATION_DOMAINS) {
    const row = byDomain[domain]
    const schedule = scheduleByDomain.get(domain)
    const anchor = schedule?.lastPassAt || row.at || 0

    row.lastPassAt = anchor
    row.effectiveReadiness = effectiveReadiness(row.readiness, anchor, now)
    row.decayFactor = row.readiness > 0 ? row.effectiveReadiness / row.readiness : 1
    row.passed = row.effectiveReadiness >= PASS_THRESHOLD
  }

  return byDomain
}

/** Convenience wrapper that pulls everything this device knows about a worker. */
export async function loadDomainProgress(workerId, attempts) {
  const [schedules] = await Promise.all([listSchedules(workerId || '')])
  // Legacy entries were never worker-scoped, so they only apply to the device's
  // own history rather than being attributed to a named worker.
  const legacy = getLog()
  return computeDomainProgress(attempts, schedules, legacy)
}

export function isEligibleForCertificate(domainProgress) {
  const values = Object.values(domainProgress || {})
  if (values.length === 0) return false
  return values.every((d) => d.passed)
}

export function overallCompliance(domainProgress) {
  const values = Object.values(domainProgress || {})
  const passedCount = values.filter((d) => d.passed).length
  const total = values.length || 1

  return {
    passedCount,
    totalDomains: values.length,
    percent: Math.round((passedCount / total) * 100),
    // Mean current readiness, which is the number worth putting on a dashboard —
    // an average of historical bests would flatter a worker who has stopped
    // refreshing.
    avgReadiness: Math.round(values.reduce((sum, d) => sum + d.effectiveReadiness, 0) / total),
    hesitationDomains: values.filter((d) => d.everHesitated).map((d) => d.domain),
  }
}

/* ================================================================== */
/* Issuance                                                            */
/* ================================================================== */

/**
 * Mint a certificate into the site's hash-chain.
 * Returns the stored record, or null when the worker is not eligible.
 */
export async function issueCertificate(domainProgress, worker, siteId = getActiveSiteId()) {
  if (!isEligibleForCertificate(domainProgress)) return null
  if (!worker?.id) throw new Error('WORKER_REQUIRED')

  const domainResults = CERTIFICATION_DOMAINS.map((domain) => {
    const row = domainProgress[domain] || blankDomain(domain)
    return {
      domain,
      score: row.accuracyPct || row.readiness,
      readiness: row.effectiveReadiness,
      hesitation: row.everHesitated,
    }
  })

  return appendCertificate({
    workerId: worker.id,
    workerName: worker.name,
    domainResults,
    siteId,
  })
}

/* ================================================================== */
/* Reading                                                             */
/* ================================================================== */

/** Every certificate on this device, newest first, in display shape. */
export async function getCertificates() {
  const records = await listCertificates()
  return records.map((record) => ({ record, ...describeRecord(record) }))
}

export async function getCertificatesFor(workerId) {
  if (!workerId) return []
  const records = await getCertificatesForWorker(workerId)
  return records.reverse().map((record) => ({ record, ...describeRecord(record) }))
}

/** The worker's most recent certificate, or null. */
export async function latestCertificateFor(workerId) {
  const list = await getCertificatesFor(workerId)
  return list[0] || null
}

/**
 * Verify by certificate id against this device's ledger.
 *
 * Reports the specific failure rather than a bare valid/invalid, because
 * "signed by a device we don't know" and "the payload was edited" mean very
 * different things to an inspector.
 */
export async function verifyCertificate(certId) {
  const record = await getRecordByCertId(certId)
  if (!record) return { found: false, valid: false, issues: [], cert: null }

  const trusted = await getTrustedKeys()
  const { ok, issues } = await verifyRecord(record, trusted)

  // Signature intact is one question; correctly linked into the chain is another.
  const chainResult = await verifyChain(record.siteId)
  const entry = chainResult.results.find((r) => r.record.hash === record.hash)

  return {
    found: true,
    valid: ok && !!entry?.ok,
    selfValid: ok,
    chainLinked: !!entry?.ok,
    issues: [...new Set([...issues, ...(entry?.issues || [])])],
    record,
    cert: describeRecord(record),
  }
}
