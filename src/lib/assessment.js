// Assessment engine — the part that separates "knows the answer" from
// "would act on it in time".
//
// The premise, straight from the problem statement's accident data: workers who
// freeze during an evacuation often *do* know the correct action. A quiz that
// scores only right/wrong cannot see that. So every decision is timed against a
// calibrated baseline, and a correct-but-slow answer is flagged for targeted
// retraining rather than passed silently.

import { STORE, idbPut, idbQuery, idbGetAll } from './idb.js'
import { randomId } from './crypto.js'
import { SCENARIOS } from './scenarios.js'
import { clampPercent, toFiniteNumber, toNumberOr } from './num.js'

export const GRADE = { FAST: 'fast', NORMAL: 'normal', SLOW: 'slow', UNKNOWN: 'unknown' }

export const TRAINING_MODE = {
  SOLO: 'solo',
  AR: 'ar',
  BUDDY: 'buddy',
  REFRESHER: 'refresher',
}

/** Weighting between knowing the answer and producing it under pressure. */
export const ACCURACY_WEIGHT = 0.7
export const SPEED_WEIGHT = 0.3

const SPEED_SCORE = { [GRADE.FAST]: 100, [GRADE.NORMAL]: 70, [GRADE.SLOW]: 35, [GRADE.UNKNOWN]: 70 }

/** Fallback baseline for steps that predate calibrated targets. */
export const DEFAULT_TARGET_MS = 9000

/**
 * Grade a single decision.
 * Within target = confident. Up to 2x = acceptable. Beyond 2x = hesitation.
 * A missing/absurd measurement grades UNKNOWN rather than punishing the worker
 * for a sensor or focus glitch.
 */
export function gradeLatency(latencyMs, targetMs = DEFAULT_TARGET_MS) {
  const rawTarget = toNumberOr(targetMs, 0)
  const target = rawTarget > 0 ? rawTarget : DEFAULT_TARGET_MS
  const latency = toFiniteNumber(latencyMs)

  if (latency === null || latency <= 0) return GRADE.UNKNOWN
  // Anything past 10 minutes means they walked away, not that they hesitated.
  if (latency > 600_000) return GRADE.UNKNOWN

  if (latency <= target) return GRADE.FAST
  if (latency <= target * 2) return GRADE.NORMAL
  return GRADE.SLOW
}

export function speedScoreForGrade(grade) {
  return SPEED_SCORE[grade] ?? SPEED_SCORE[GRADE.NORMAL]
}

/**
 * Score a completed run.
 *
 * decisions: [{ stepId, points, maxPoints, latencyMs, targetMs }]
 * Returns accuracy, speed, composite readiness, and the hesitation flag.
 */
export function scoreRun(decisions) {
  const rows = Array.isArray(decisions) ? decisions : []

  if (rows.length === 0) {
    return {
      accuracyPct: 0,
      speedPct: 0,
      readiness: 0,
      hesitation: false,
      hesitationSteps: [],
      steps: [],
      totalLatencyMs: 0,
    }
  }

  const steps = rows.map((d) => {
    const maxPoints = toNumberOr(d.maxPoints, 0)
    const points = toNumberOr(d.points, 0)
    const grade = gradeLatency(d.latencyMs, d.targetMs)
    const rawTarget = toNumberOr(d.targetMs, 0)
    return {
      stepId: d.stepId ?? null,
      points,
      maxPoints,
      correct: maxPoints > 0 ? points >= maxPoints : points > 0,
      latencyMs: toFiniteNumber(d.latencyMs),
      targetMs: rawTarget > 0 ? rawTarget : DEFAULT_TARGET_MS,
      grade,
      speedScore: speedScoreForGrade(grade),
    }
  })

  const earned = steps.reduce((s, x) => s + x.points, 0)
  const possible = steps.reduce((s, x) => s + x.maxPoints, 0)

  // Wrong answers carry negative points, so clamp at zero — a worker cannot
  // have "less than no" competence, and a negative percentage would poison
  // every average downstream.
  const accuracyPct = possible > 0 ? clampPercent((earned / possible) * 100, 0) : 0

  // Speed only counts on decisions that were actually correct. Being fast and
  // wrong is not a virtue, and letting it raise the score would be misleading.
  const correctSteps = steps.filter((s) => s.correct)
  const speedPct = correctSteps.length
    ? clampPercent(correctSteps.reduce((s, x) => s + x.speedScore, 0) / correctSteps.length, 0)
    : 0

  const hesitationSteps = steps.filter((s) => s.correct && s.grade === GRADE.SLOW).map((s) => s.stepId)

  return {
    accuracyPct,
    speedPct,
    readiness: clampPercent(ACCURACY_WEIGHT * accuracyPct + SPEED_WEIGHT * speedPct, 0),
    hesitation: hesitationSteps.length > 0,
    hesitationSteps,
    steps,
    totalLatencyMs: steps.reduce((s, x) => s + (x.latencyMs || 0), 0),
  }
}

/* ================================================================== */
/* Persistence                                                         */
/* ================================================================== */

/**
 * Store a scored run. Never throws on storage failure — losing an attempt
 * record must not lose the worker's session or block their next module.
 * Returns the record, with `persisted: false` if it only made it to memory.
 */
export async function saveAttempt({ workerId, scenarioId, domain, mode = TRAINING_MODE.SOLO, result, meta = {} }) {
  const record = {
    id: `a_${randomId(9)}`,
    workerId: workerId || '',
    scenarioId: scenarioId || '',
    domain: domain || '',
    mode,
    at: Date.now(),
    accuracyPct: result?.accuracyPct ?? 0,
    speedPct: result?.speedPct ?? 0,
    readiness: result?.readiness ?? 0,
    hesitation: !!result?.hesitation,
    hesitationSteps: result?.hesitationSteps || [],
    totalLatencyMs: result?.totalLatencyMs ?? 0,
    steps: (result?.steps || []).map((s) => ({
      stepId: s.stepId,
      correct: s.correct,
      latencyMs: s.latencyMs,
      targetMs: s.targetMs,
      grade: s.grade,
    })),
    meta,
  }

  try {
    await idbPut(STORE.ATTEMPTS, record)
    return { ...record, persisted: true }
  } catch {
    return { ...record, persisted: false }
  }
}

export async function listAttempts(workerId) {
  const rows = workerId ? await idbQuery(STORE.ATTEMPTS, 'workerId', workerId) : await idbGetAll(STORE.ATTEMPTS)
  return rows.sort((a, b) => b.at - a.at)
}

export async function listAllAttempts() {
  return listAttempts(null)
}

/* ================================================================== */
/* Domain rollup                                                       */
/* ================================================================== */

const DOMAIN_BY_SCENARIO = Object.freeze(
  SCENARIOS.reduce((acc, s) => {
    acc[s.id] = s.domain
    return acc
  }, {})
)

export function domainForScenario(scenarioId) {
  return DOMAIN_BY_SCENARIO[scenarioId] || null
}

/**
 * Best result per domain from a list of attempts.
 * "Best" is by readiness, not raw score — a slower correct run should not
 * outrank a fast correct one just because the points matched.
 */
export function bestByDomain(attempts) {
  const out = {}
  for (const a of attempts || []) {
    const domain = a.domain || domainForScenario(a.scenarioId)
    if (!domain) continue
    const current = out[domain]
    if (!current || a.readiness > current.readiness) {
      out[domain] = {
        domain,
        readiness: a.readiness,
        accuracyPct: a.accuracyPct,
        speedPct: a.speedPct,
        hesitation: a.hesitation,
        at: a.at,
        attemptId: a.id,
        mode: a.mode,
      }
    }
  }
  // Attempt count and "ever hesitated" are separate questions from "best run".
  for (const a of attempts || []) {
    const domain = a.domain || domainForScenario(a.scenarioId)
    if (!domain || !out[domain]) continue
    out[domain].attempts = (out[domain].attempts || 0) + 1
    if (a.hesitation) out[domain].everHesitated = true
    out[domain].lastAttemptAt = Math.max(out[domain].lastAttemptAt || 0, a.at)
  }
  return out
}

/**
 * Workers whose best run was correct but slow — the list a safety officer
 * should actually act on, because these people passed on paper.
 */
export function hesitationRisks(attempts) {
  const byWorker = new Map()
  for (const a of attempts || []) {
    if (!a.hesitation) continue
    const entry = byWorker.get(a.workerId) || { workerId: a.workerId, domains: new Set(), worstLatencyMs: 0, at: 0 }
    entry.domains.add(a.domain || domainForScenario(a.scenarioId) || 'Unknown')
    const slowest = (a.steps || [])
      .filter((s) => s.grade === GRADE.SLOW)
      .reduce((m, s) => Math.max(m, s.latencyMs || 0), 0)
    entry.worstLatencyMs = Math.max(entry.worstLatencyMs, slowest)
    entry.at = Math.max(entry.at, a.at)
    byWorker.set(a.workerId, entry)
  }
  return [...byWorker.values()]
    .map((e) => ({ ...e, domains: [...e.domains] }))
    .sort((a, b) => b.worstLatencyMs - a.worstLatencyMs)
}

/* ================================================================== */
/* Display helpers                                                     */
/* ================================================================== */

export function formatLatency(ms) {
  const value = toFiniteNumber(ms)
  if (value === null || value <= 0) return '—'
  const s = value / 1000
  if (s < 10) return `${s.toFixed(1)}s`
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s - m * 60)}s`
}

/**
 * Grade colour, as a token reference rather than a hex literal, so a theme switch
 * repaints it along with the page instead of leaving it on the previous theme.
 *
 * Two variants for the same reason charts have them: the ISO hues are correct as
 * fills in either theme because they must match the signage on the wall, but ISO
 * yellow as small text on white reaches about 1.9:1 and is unreadable. Anything
 * rendering a grade as TEXT uses gradeTextColor.
 */
export function gradeColor(grade) {
  if (grade === GRADE.FAST) return 'rgb(var(--safe))'
  if (grade === GRADE.NORMAL) return 'rgb(var(--warning))'
  if (grade === GRADE.SLOW) return 'rgb(var(--hazard))'
  return 'rgb(var(--text-tertiary))'
}

export function gradeTextColor(grade) {
  if (grade === GRADE.FAST) return 'rgb(var(--safe-text))'
  if (grade === GRADE.NORMAL) return 'rgb(var(--warning-text))'
  if (grade === GRADE.SLOW) return 'rgb(var(--hazard-text))'
  return 'rgb(var(--text-tertiary))'
}

/** Translucent variant, for the tinted background behind a grade pill. */
export function gradeTint(grade, alpha = 0.14) {
  if (grade === GRADE.FAST) return `rgb(var(--safe) / ${alpha})`
  if (grade === GRADE.NORMAL) return `rgb(var(--warning) / ${alpha})`
  if (grade === GRADE.SLOW) return `rgb(var(--hazard) / ${alpha})`
  return `rgb(var(--text-tertiary) / ${alpha})`
}
