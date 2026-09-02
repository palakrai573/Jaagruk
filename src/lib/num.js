// Strict numeric coercion.
//
// This exists because `Number(null)` is 0 and `Number(true)` is 1, and that has
// now caused two separate real bugs in this codebase:
//
//   1. A dropped compass reading was stored as a valid bearing of due north,
//      putting AR hazard markers in the wrong place.
//   2. A missing readiness value was plotted as 0 on the trend sparkline, making
//      a worker's progress look worse than it was.
//
// Both came from `Number(x)` followed by `Number.isFinite`, which passes null
// straight through as a legitimate zero. Anything that takes a number from
// sensor data, storage or a record goes through here instead.

/**
 * Returns the number, or null for anything that is not genuinely numeric.
 *
 * This allowlists number and string rather than blocklisting the known traps,
 * because the blocklist kept growing: `Number([])` is also 0 and `Number([7])`
 * is 7, so a `bearing: []` from a malformed synced record would have read as due
 * north. `Number(Symbol())` throws outright. An allowlist ends that whole class.
 *
 * BigInt is deliberately rejected: converting it to a Number can silently lose
 * precision, and nothing here should be producing one.
 */
export function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/** Coerce with an explicit fallback, for cases where a default is correct. */
export function toNumberOr(value, fallback = 0) {
  const n = toFiniteNumber(value)
  return n === null ? fallback : n
}

/** Drop every non-numeric entry from a list rather than zeroing it. */
export function finiteNumbers(values) {
  return (values || []).map(toFiniteNumber).filter((n) => n !== null)
}

/** Clamp into a range, rejecting garbage instead of treating it as the minimum. */
export function clamp(value, min, max) {
  const n = toFiniteNumber(value)
  if (n === null) return null
  return Math.max(min, Math.min(max, n))
}

/** Percentage clamp, the most common case in this app. */
export function clampPercent(value, fallback = 0) {
  const n = clamp(value, 0, 100)
  return n === null ? fallback : Math.round(n)
}
