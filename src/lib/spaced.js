// Spaced refreshers and decaying readiness.
//
// This exists to attack the number in the problem statement directly:
// classroom safety training retains under 20% after one week. A one-time AR
// module makes the first exposure better; it does not fix retention. So a
// Jaagruk certificate is not a date stamp — it is a live score that decays if
// the worker stops refreshing, and recovers when they do.

import { STORE, idbGet, idbPut, idbGetAll, idbQuery } from './idb.js'
import { CERTIFICATION_DOMAINS } from './scenarios.js'

/** Review intervals in days, mirroring the Anki/Duolingo progression. */
export const INTERVALS_DAYS = Object.freeze([2, 7, 21, 60])

const DAY_MS = 86_400_000

/** Readiness holds full value for this long after a pass. */
export const DECAY_GRACE_DAYS = 7
/** Beyond this many days, decay stops at the floor. */
export const DECAY_FLOOR_DAYS = 90
/** Readiness never decays below this fraction — training is not fully forgotten. */
export const DECAY_FLOOR = 0.55

/* ================================================================== */
/* Decay                                                               */
/* ================================================================== */

/**
 * Retention multiplier for a pass that happened `days` ago.
 * Flat for the grace window, then linear down to DECAY_FLOOR at 90 days.
 */
export function decayFactor(days) {
  const d = Number(days)
  if (!Number.isFinite(d) || d <= DECAY_GRACE_DAYS) return 1
  if (d >= DECAY_FLOOR_DAYS) return DECAY_FLOOR
  const span = DECAY_FLOOR_DAYS - DECAY_GRACE_DAYS
  return 1 - (1 - DECAY_FLOOR) * ((d - DECAY_GRACE_DAYS) / span)
}

export function daysSince(timestamp, now = Date.now()) {
  if (!timestamp) return Infinity
  return Math.max(0, (now - timestamp) / DAY_MS)
}

/**
 * Readiness as it stands today, not as it was on the day of the test.
 * This is the number shown on the dashboard and gated on for certification.
 */
export function effectiveReadiness(baseReadiness, lastPassAt, now = Date.now()) {
  const base = Math.max(0, Math.min(100, Math.round(Number(baseReadiness) || 0)))
  if (!lastPassAt) return base
  return Math.round(base * decayFactor(daysSince(lastPassAt, now)))
}

/* ================================================================== */
/* Schedule records                                                    */
/* ================================================================== */

function scheduleId(workerId, domain) {
  return `${workerId}::${domain}`
}

function blankSchedule(workerId, domain) {
  return {
    id: scheduleId(workerId, domain),
    workerId,
    domain,
    intervalIndex: -1, // -1 = never passed
    lastPassAt: 0,
    lastAttemptAt: 0,
    dueAt: 0,
    passStreak: 0,
    failCount: 0,
  }
}

export async function getSchedule(workerId, domain) {
  if (!workerId || !domain) return blankSchedule(workerId || '', domain || '')
  const existing = await idbGet(STORE.SCHEDULE, scheduleId(workerId, domain))
  return existing || blankSchedule(workerId, domain)
}

export async function listSchedules(workerId) {
  const rows = workerId ? await idbQuery(STORE.SCHEDULE, 'workerId', workerId) : await idbGetAll(STORE.SCHEDULE)
  return rows
}

/**
 * Record a refresher (or initial module) result and advance the schedule.
 * A pass moves to the next interval; a fail resets to the first one, because a
 * worker who just failed needs to see it again in two days, not in two months.
 */
export async function recordResult(workerId, domain, { passed, at = Date.now() }) {
  if (!workerId || !domain) return null
  const current = await getSchedule(workerId, domain)

  const next = { ...current, lastAttemptAt: at }

  if (passed) {
    next.intervalIndex = Math.min(current.intervalIndex + 1, INTERVALS_DAYS.length - 1)
    next.lastPassAt = at
    next.passStreak = (current.passStreak || 0) + 1
  } else {
    next.intervalIndex = 0
    next.passStreak = 0
    next.failCount = (current.failCount || 0) + 1
    // A fail does not reset lastPassAt — the earlier pass genuinely happened,
    // and its decay clock should keep running rather than restart.
  }

  next.dueAt = at + INTERVALS_DAYS[Math.max(0, next.intervalIndex)] * DAY_MS

  try {
    await idbPut(STORE.SCHEDULE, next)
  } catch {
    /* scheduling is advisory; never block the worker on a storage failure */
  }
  return next
}

/** Days until the next refresher, negative when overdue. */
export function daysUntilDue(schedule, now = Date.now()) {
  if (!schedule?.dueAt) return null
  return (schedule.dueAt - now) / DAY_MS
}

export function isDue(schedule, now = Date.now()) {
  if (!schedule?.dueAt) return false
  return schedule.dueAt <= now
}

/**
 * Domains needing a refresher right now, most overdue first.
 * `progressByDomain` is the best-run rollup from assessment.bestByDomain, used
 * to skip domains the worker has never attempted — you cannot refresh training
 * that never happened.
 */
export async function dueRefreshers(workerId, progressByDomain = {}, now = Date.now()) {
  const schedules = await listSchedules(workerId)
  const byDomain = new Map(schedules.map((s) => [s.domain, s]))

  return CERTIFICATION_DOMAINS.map((domain) => {
    const schedule = byDomain.get(domain) || blankSchedule(workerId, domain)
    const attempted = !!progressByDomain[domain]?.attempts || schedule.lastAttemptAt > 0
    return {
      domain,
      schedule,
      attempted,
      due: attempted && isDue(schedule, now),
      overdueDays: schedule.dueAt ? Math.max(0, (now - schedule.dueAt) / DAY_MS) : 0,
      daysUntil: daysUntilDue(schedule, now),
    }
  })
    .filter((r) => r.due)
    .sort((a, b) => b.overdueDays - a.overdueDays)
}

/** Full per-domain retention view for the dashboard, including not-yet-due. */
export async function retentionOverview(workerId, progressByDomain = {}, now = Date.now()) {
  const schedules = await listSchedules(workerId)
  const byDomain = new Map(schedules.map((s) => [s.domain, s]))

  return CERTIFICATION_DOMAINS.map((domain) => {
    const schedule = byDomain.get(domain) || blankSchedule(workerId, domain)
    const progress = progressByDomain[domain] || null
    const base = progress?.readiness ?? 0
    const anchor = schedule.lastPassAt || progress?.at || 0
    return {
      domain,
      attempted: !!progress?.attempts || schedule.lastAttemptAt > 0,
      baseReadiness: base,
      effectiveReadiness: effectiveReadiness(base, anchor, now),
      decayFactor: anchor ? decayFactor(daysSince(anchor, now)) : 1,
      lastPassAt: schedule.lastPassAt || 0,
      dueAt: schedule.dueAt || 0,
      due: isDue(schedule, now),
      daysUntil: daysUntilDue(schedule, now),
      intervalDays: schedule.intervalIndex >= 0 ? INTERVALS_DAYS[schedule.intervalIndex] : null,
      hesitation: !!progress?.hesitation,
    }
  })
}

/* ================================================================== */
/* Notifications                                                       */
/* ================================================================== */

// HONEST LIMITATION: the web platform cannot wake a closed page on a schedule
// the way Android's AlarmManager can. What we can do reliably is compute the
// due list on device (fully offline) and notify when the app is opened or when
// the browser grants us a periodic background sync. Both are implemented; the
// exact-alarm behaviour is a native-build upgrade.

export function notificationsSupported() {
  try {
    return typeof Notification !== 'undefined'
  } catch {
    return false
  }
}

export function notificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return Notification.permission
  } catch {
    return 'unsupported'
  }
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

const NOTIFIED_KEY = 'jaagruk_last_refresher_notice'

/**
 * Show one refresher reminder per day at most, so opening the app six times
 * doesn't produce six notifications.
 */
export async function maybeNotifyRefreshers(dueList) {
  if (!Array.isArray(dueList) || dueList.length === 0) return false
  if (notificationPermission() !== 'granted') return false

  try {
    const last = Number(localStorage.getItem(NOTIFIED_KEY) || 0)
    if (Date.now() - last < DAY_MS) return false

    const body =
      dueList.length === 1
        ? dueList[0].domain
        : `${dueList.length} modules — ${dueList
            .slice(0, 2)
            .map((d) => d.domain)
            .join(', ')}${dueList.length > 2 ? '…' : ''}`

    // Prefer the service worker so the notification survives navigation.
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg?.showNotification) {
      await reg.showNotification('Jaagruk — safety refresher due', {
        body,
        icon: 'pwa-192.png',
        badge: 'pwa-192.png',
        tag: 'jaagruk-refresher',
        data: { url: '#/refresher' },
      })
    } else {
      // eslint-disable-next-line no-new
      new Notification('Jaagruk — safety refresher due', { body, icon: 'pwa-192.png', tag: 'jaagruk-refresher' })
    }

    localStorage.setItem(NOTIFIED_KEY, String(Date.now()))
    return true
  } catch {
    return false
  }
}

/** Opportunistically register periodic sync where the browser allows it. */
export async function registerPeriodicRefresherCheck() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (!reg || !('periodicSync' in reg)) return { supported: false }
    const status = await navigator.permissions?.query?.({ name: 'periodic-background-sync' })
    if (status && status.state !== 'granted') return { supported: true, granted: false }
    await reg.periodicSync.register('jaagruk-refresher', { minInterval: DAY_MS })
    return { supported: true, granted: true }
  } catch {
    return { supported: false }
  }
}
