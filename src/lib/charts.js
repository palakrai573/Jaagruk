// Pure geometry and bucketing for the dashboard visualisations.
//
// Everything here is hand-rolled SVG maths rather than a charting library. Three
// reasons: the bundle is already 1.6 MB and a chart library would add hundreds of
// kilobytes for six small widgets; these render identically offline with no
// runtime dependency; and keeping the maths pure means it can be reasoned about
// and tested without a DOM.
//
// All functions are defensive about empty and malformed input, because a worker
// on their first day has no history and every one of these widgets will be handed
// an empty array.

import { finiteNumbers, toFiniteNumber, toNumberOr, clampPercent } from './num.js'

const DAY_MS = 86_400_000

/* ================================================================== */
/* Sparkline                                                           */
/* ================================================================== */

/**
 * SVG path for a trend line.
 *
 * A single data point produces a flat line across the full width rather than a
 * dot, so a worker with exactly one attempt still sees something meaningful.
 */
export function sparklinePath(values, width = 120, height = 32, padding = 2) {
  const nums = finiteNumbers(values)
  if (nums.length === 0) return ''

  const usableW = Math.max(1, width - padding * 2)
  const usableH = Math.max(1, height - padding * 2)

  if (nums.length === 1) {
    const y = padding + usableH / 2
    return `M ${padding} ${y} L ${width - padding} ${y}`
  }

  const min = Math.min(...nums)
  const max = Math.max(...nums)
  // A flat series would divide by zero; centre it instead.
  const span = max - min || 1

  return nums
    .map((v, i) => {
      const x = padding + (i / (nums.length - 1)) * usableW
      const y = padding + usableH - ((v - min) / span) * usableH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

/** Closed area under the same line, for a subtle fill. */
export function sparklineArea(values, width = 120, height = 32, padding = 2) {
  const line = sparklinePath(values, width, height, padding)
  if (!line) return ''
  return `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`
}

/**
 * Direction and size of the change between the first and last readings.
 * Returns null when there is not enough data to claim a trend.
 */
export function trend(values) {
  const nums = finiteNumbers(values)
  if (nums.length < 2) return null
  const delta = nums[nums.length - 1] - nums[0]
  return {
    delta: Math.round(delta),
    direction: delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat',
  }
}

/* ================================================================== */
/* Radar                                                               */
/* ================================================================== */

/**
 * Points for a radar polygon. Values are percentages, 0-100.
 *
 * Starts at 12 o'clock and goes clockwise, which is what people expect when
 * reading axis labels around a circle.
 */
export function radarPoints(values, cx, cy, radius) {
  const nums = (values || []).map((v) => clampPercent(v, 0))
  if (nums.length === 0) return ''

  return nums
    .map((v, i) => {
      const angle = (i / nums.length) * Math.PI * 2 - Math.PI / 2
      const r = (v / 100) * radius
      return `${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`
    })
    .join(' ')
}

/** Axis spoke endpoints plus a label anchor just outside the ring. */
export function radarAxes(count, cx, cy, radius, labelOffset = 16) {
  if (!count || count < 3) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x2: cx + cos * radius,
      y2: cy + sin * radius,
      labelX: cx + cos * (radius + labelOffset),
      labelY: cy + sin * (radius + labelOffset),
      // Keep labels from overlapping the shape on the left/right extremes.
      anchor: cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle',
    }
  })
}

/** Concentric guide rings, as fractions of the radius. */
export function radarRings(cx, cy, radius, steps = 4) {
  return Array.from({ length: steps }, (_, i) => ({
    r: (radius * (i + 1)) / steps,
    value: Math.round((100 * (i + 1)) / steps),
    cx,
    cy,
  }))
}

/* ================================================================== */
/* Activity heatmap                                                    */
/* ================================================================== */

/**
 * Bucket timestamps into days for a consistency heatmap.
 *
 * Consistency is the thing worth showing here. The whole retention argument is
 * that a short session every few days beats one long session, and a grid of days
 * makes a gap immediately visible in a way a number cannot.
 *
 * Returns columns of 7 days each, oldest first, ending today.
 */
export function activityHeatmap(timestamps, weeks = 12, now = Date.now()) {
  const counts = new Map()
  for (const ts of timestamps || []) {
    const n = toFiniteNumber(ts)
    if (n === null || n <= 0) continue
    const key = dayKey(n)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const totalDays = weeks * 7
  // Align the last column so today sits in it.
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const cells = []
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * DAY_MS)
    const key = dayKey(date.getTime())
    const count = counts.get(key) || 0
    cells.push({
      key,
      date,
      count,
      // Four levels is enough to read at a glance; more just adds noise.
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3,
      isToday: i === 0,
    })
  }

  // Split into week columns.
  const columns = []
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7))

  const activeDays = cells.filter((c) => c.count > 0).length

  return {
    columns,
    cells,
    activeDays,
    totalDays,
    currentStreak: streakFrom(cells),
    longestStreak: longestStreakFrom(cells),
  }
}

function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Consecutive active days counting back from today. */
function streakFrom(cells) {
  let streak = 0
  for (let i = cells.length - 1; i >= 0; i -= 1) {
    if (cells[i].count > 0) streak += 1
    // Today not yet trained shouldn't break a streak that is still live.
    else if (i === cells.length - 1) continue
    else break
  }
  return streak
}

function longestStreakFrom(cells) {
  let best = 0
  let run = 0
  for (const cell of cells) {
    if (cell.count > 0) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

/* ================================================================== */
/* Reaction-time distribution                                          */
/* ================================================================== */

/**
 * Count decisions by reaction grade across attempts.
 *
 * This is the shape of a worker's hesitation problem. Someone with 80% accuracy
 * and mostly-slow timings needs a very different intervention from someone with
 * 60% accuracy and fast timings, and a single readiness number hides that.
 */
export function gradeDistribution(attempts) {
  const buckets = { fast: 0, normal: 0, slow: 0, unknown: 0 }

  for (const attempt of attempts || []) {
    for (const step of attempt?.steps || []) {
      const grade = step?.grade
      if (grade && buckets[grade] !== undefined) buckets[grade] += 1
      else buckets.unknown += 1
    }
  }

  const total = buckets.fast + buckets.normal + buckets.slow + buckets.unknown

  return {
    ...buckets,
    total,
    percent: {
      fast: total ? (buckets.fast / total) * 100 : 0,
      normal: total ? (buckets.normal / total) * 100 : 0,
      slow: total ? (buckets.slow / total) * 100 : 0,
      unknown: total ? (buckets.unknown / total) * 100 : 0,
    },
  }
}

/* ================================================================== */
/* Decay projection                                                    */
/* ================================================================== */

/**
 * Where readiness is heading if the worker does nothing.
 *
 * Shown as a forward-looking curve because that is far more motivating than the
 * current number alone — "71% today, 58% by March" is an argument for doing a
 * 90-second refresher in a way that "71%" is not.
 *
 * `decay` is injected rather than imported to keep this module free of
 * dependencies on the scheduling logic.
 */
export function decayProjection(readiness, lastPassAt, decay, { days = 90, step = 5, now = Date.now() } = {}) {
  const base = clampPercent(readiness, 0)
  if (!base || !lastPassAt) return []

  const elapsedDays = Math.max(0, (now - lastPassAt) / DAY_MS)
  const points = []

  for (let d = 0; d <= days; d += step) {
    const value = base * decay(elapsedDays + d)
    points.push({ day: d, value: Math.round(value) })
  }
  return points
}

/* ================================================================== */
/* Relative time                                                       */
/* ================================================================== */

/**
 * Relative timestamp broken into a number and a unit key, so the caller can
 * translate the unit instead of receiving a pre-built English string.
 */
export function relativeTime(timestamp, now = Date.now()) {
  const ts = toFiniteNumber(timestamp)
  if (ts === null || ts <= 0) return null

  const diff = now - ts
  const abs = Math.abs(diff)
  const future = diff < 0

  if (abs < 45_000) return { value: 0, unit: 'now', future }
  if (abs < 3_600_000) return { value: Math.round(abs / 60_000), unit: 'min', future }
  if (abs < 86_400_000) return { value: Math.round(abs / 3_600_000), unit: 'hour', future }
  if (abs < 2_592_000_000) return { value: Math.round(abs / 86_400_000), unit: 'day', future }
  return { value: Math.round(abs / 2_592_000_000), unit: 'month', future }
}

/* ================================================================== */
/* Series extraction                                                   */
/* ================================================================== */

/**
 * Readiness over time, oldest first, for the trend sparkline.
 * Attempts arrive newest-first from storage, so this reverses them.
 */
export function readinessSeries(attempts, limit = 20) {
  return (attempts || [])
    .slice(0, limit)
    // A record with no readiness is dropped rather than plotted as zero — a
    // missing reading is not the same as a failed one.
    .filter((a) => toFiniteNumber(a?.readiness) !== null)
    .map((a) => ({ at: a.at, value: clampPercent(a.readiness) }))
    .reverse()
}

/** Rolling mean, to smooth a noisy series without hiding the shape. */
export function rollingMean(values, window = 3) {
  const nums = finiteNumbers(values)
  if (nums.length === 0) return []
  return nums.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = nums.slice(start, i + 1)
    return Math.round(slice.reduce((s, v) => s + v, 0) / slice.length)
  })
}

/** Colour ramp shared by every readiness display, so they never disagree. */
export function readinessColor(value) {
  const v = toNumberOr(value, 0)
  if (v >= 70) return '#2E7D4F'
  if (v >= 45) return '#FFB020'
  return '#D93025'
}
