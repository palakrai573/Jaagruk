// Scoring, timing and decay — the numbers the certificate actually rests on.
//
// WHY node:test AND NOT VITEST
// Node 18+ ships a test runner and assertion library. Adding vitest would mean a
// dependency, a config file and an npm install, for a project whose whole claim is
// that it runs with nothing installed and no network. `node --test` needs none of
// that, runs the real ES modules the app imports, and works offline. If a browser
// DOM is ever genuinely needed, that is the point to reconsider — none of the
// functions below touch the DOM.
//
// WHY THESE FUNCTIONS AND NOT THE UI
// This file covers the pure arithmetic behind the central claim: that a
// correct-but-slow answer is treated differently from a correct-and-fast one, and
// that a certificate reflects competence today rather than on the test date. Those
// are the two things a judge is entitled to challenge, and they are exactly the
// things a refactor can break silently because nothing on screen looks different.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  GRADE,
  gradeLatency,
  speedScoreForGrade,
  scoreRun,
  ACCURACY_WEIGHT,
  SPEED_WEIGHT,
  DEFAULT_TARGET_MS,
} from '../src/lib/assessment.js'

import {
  decayFactor,
  effectiveReadiness,
  daysSince,
  DECAY_GRACE_DAYS,
  DECAY_FLOOR_DAYS,
  DECAY_FLOOR,
} from '../src/lib/spaced.js'

import { PASS_THRESHOLD } from '../src/lib/certificate.js'

const DAY_MS = 86_400_000

/* ================================================================== */
describe('gradeLatency', () => {
  const target = 4000

  test('at or under target is fast, and the boundary is inclusive', () => {
    assert.equal(gradeLatency(1, target), GRADE.FAST)
    assert.equal(gradeLatency(target, target), GRADE.FAST, 'exactly on target must not be penalised')
  })

  test('between target and double target is normal, boundary inclusive', () => {
    assert.equal(gradeLatency(target + 1, target), GRADE.NORMAL)
    assert.equal(gradeLatency(target * 2, target), GRADE.NORMAL, 'exactly double is still normal')
  })

  test('past double target is slow', () => {
    assert.equal(gradeLatency(target * 2 + 1, target), GRADE.SLOW)
  })

  // The distinction that makes hesitation reporting trustworthy: a worker who
  // walked away mid-drill did not hesitate, and counting it as SLOW would put an
  // innocent name on the supervisor's retraining list.
  test('absurd latency is unknown, not slow', () => {
    assert.equal(gradeLatency(600_001, target), GRADE.UNKNOWN)
    assert.equal(gradeLatency(600_000, target), GRADE.SLOW, 'ten minutes exactly is still a real answer')
  })

  test('missing or nonsense latency is unknown rather than a guess', () => {
    for (const bad of [null, undefined, 0, -5, NaN, 'abc', {}]) {
      assert.equal(gradeLatency(bad, target), GRADE.UNKNOWN, `input ${String(bad)}`)
    }
  })

  test('a missing or invalid target falls back to the default rather than dividing by zero', () => {
    assert.equal(gradeLatency(DEFAULT_TARGET_MS, 0), GRADE.FAST)
    assert.equal(gradeLatency(DEFAULT_TARGET_MS, null), GRADE.FAST)
    assert.equal(gradeLatency(DEFAULT_TARGET_MS * 2 + 1, undefined), GRADE.SLOW)
  })

  test('unknown scores the same as normal, so a sensor glitch neither rewards nor punishes', () => {
    assert.equal(speedScoreForGrade(GRADE.UNKNOWN), speedScoreForGrade(GRADE.NORMAL))
  })
})

/* ================================================================== */
describe('scoreRun', () => {
  const step = (over) => ({ stepId: 's', points: 20, maxPoints: 20, latencyMs: 1000, targetMs: 4000, ...over })

  test('an empty run scores zero rather than throwing or reporting NaN', () => {
    for (const input of [[], null, undefined, 'nonsense']) {
      const r = scoreRun(input)
      assert.equal(r.readiness, 0)
      assert.equal(r.accuracyPct, 0)
      assert.equal(r.speedPct, 0)
      assert.deepEqual(r.steps, [])
    }
  })

  test('all correct and all fast is a perfect score', () => {
    const r = scoreRun([step(), step(), step()])
    assert.equal(r.accuracyPct, 100)
    assert.equal(r.speedPct, 100)
    assert.equal(r.readiness, 100)
  })

  // The central claim of the product. If this test ever fails, the pitch is wrong.
  test('correct but slow scores below correct and fast', () => {
    const fast = scoreRun([step({ latencyMs: 1000 })])
    const slow = scoreRun([step({ latencyMs: 20_000 })])
    assert.equal(fast.accuracyPct, slow.accuracyPct, 'same answer, so accuracy must be identical')
    assert.ok(slow.speedPct < fast.speedPct, 'speed must differ')
    assert.ok(slow.readiness < fast.readiness, 'and it must move the composite')
  })

  test('negative points from a wrong answer clamp accuracy at zero, never below', () => {
    const r = scoreRun([step({ points: -30 })])
    assert.equal(r.accuracyPct, 0, 'a negative percentage would poison every downstream average')
    assert.ok(r.readiness >= 0)
  })

  // Being fast and wrong must not read as competence.
  test('speed counts only on correct decisions', () => {
    const fastWrong = scoreRun([step({ points: -20, latencyMs: 10 })])
    assert.equal(fastWrong.speedPct, 0, 'no correct steps means no speed credit')
  })

  test('readiness is the documented weighting of accuracy and speed', () => {
    const r = scoreRun([step({ latencyMs: 6000, targetMs: 4000 })]) // NORMAL
    const expected = Math.round(r.accuracyPct * ACCURACY_WEIGHT + r.speedPct * SPEED_WEIGHT)
    assert.equal(r.readiness, expected)
    assert.equal(ACCURACY_WEIGHT + SPEED_WEIGHT, 1, 'the weights must sum to 1 or readiness is not a percentage')
  })

  test('readiness stays within 0..100 across hostile inputs', () => {
    const cases = [
      [step({ points: 999, maxPoints: 20 })],
      [step({ points: -999 })],
      [step({ maxPoints: 0, points: 5 })],
      [step({ latencyMs: NaN }), step({ targetMs: -1 })],
    ]
    for (const c of cases) {
      const r = scoreRun(c)
      assert.ok(r.readiness >= 0 && r.readiness <= 100, `readiness ${r.readiness}`)
      assert.ok(r.accuracyPct >= 0 && r.accuracyPct <= 100, `accuracy ${r.accuracyPct}`)
      assert.ok(r.speedPct >= 0 && r.speedPct <= 100, `speed ${r.speedPct}`)
    }
  })

  test('a step with no maxPoints is judged correct on positive points alone', () => {
    assert.equal(scoreRun([step({ maxPoints: 0, points: 5 })]).steps[0].correct, true)
    assert.equal(scoreRun([step({ maxPoints: 0, points: -5 })]).steps[0].correct, false)
  })
})

/* ================================================================== */
describe('decay', () => {
  test('full value through the grace window, and the boundary does not decay', () => {
    assert.equal(decayFactor(0), 1)
    assert.equal(decayFactor(DECAY_GRACE_DAYS), 1, 'the last grace day must still be worth full value')
    assert.ok(decayFactor(DECAY_GRACE_DAYS + 1) < 1, 'and the next day must start to fall')
  })

  test('decay is monotonic and bottoms out at the floor', () => {
    let previous = 1
    for (let d = DECAY_GRACE_DAYS; d <= DECAY_FLOOR_DAYS + 30; d += 1) {
      const f = decayFactor(d)
      assert.ok(f <= previous, `decay must never rise: day ${d}`)
      assert.ok(f >= DECAY_FLOOR - 1e-9, `must not fall through the floor: day ${d}`)
      previous = f
    }
    assert.equal(decayFactor(DECAY_FLOOR_DAYS), DECAY_FLOOR)
    assert.equal(decayFactor(DECAY_FLOOR_DAYS + 1000), DECAY_FLOOR, 'training is never fully forgotten')
  })

  test('nonsense day counts do not decay', () => {
    for (const bad of [NaN, undefined, null, 'x', -10]) assert.equal(decayFactor(bad), 1)
  })

  /* These boundaries are quoted in the README and the presentation, so they are
   * pinned here. Writing this test immediately corrected one of them: the figure
   * being repeated for a perfect score was day 63, but day 63 still evaluates to
   * exactly 70, which passes a `>= 70` gate. Day 64 is the first day that fails.
   *
   * Both bounds are asserted rather than just the crossing, because "crosses on
   * day N" is ambiguous about whether day N passes — which is precisely how the
   * off-by-one got into the docs. A number nobody can misread is worth two lines. */
  test('the documented pass-threshold boundaries hold exactly', () => {
    const readingOn = (base, day) => Math.round(base * decayFactor(day))
    const firstFailingDay = (base) => {
      for (let d = 0; d <= DECAY_FLOOR_DAYS; d += 1) {
        if (readingOn(base, d) < PASS_THRESHOLD) return d
      }
      return null
    }

    // From a perfect score: day 63 is the last passing day, day 64 the first fail.
    assert.equal(readingOn(100, 63), PASS_THRESHOLD, 'day 63 sits exactly on the gate and still passes')
    assert.equal(firstFailingDay(100), 64)

    // From 88: day 45 is the last passing day, day 46 the first fail.
    assert.equal(readingOn(88, 45), PASS_THRESHOLD)
    assert.equal(firstFailingDay(88), 46)
  })

  test('effectiveReadiness ignores decay when there is no recorded pass', () => {
    assert.equal(effectiveReadiness(90, null), 90)
    assert.equal(effectiveReadiness(90, 0), 90)
  })

  test('effectiveReadiness applies the curve against a real pass date', () => {
    const now = Date.UTC(2026, 0, 100)
    assert.equal(effectiveReadiness(100, now - 3 * DAY_MS, now), 100, 'inside grace')
    assert.ok(effectiveReadiness(100, now - 60 * DAY_MS, now) < 100, 'well past grace')
  })

  test('effectiveReadiness clamps a hostile base into 0..100', () => {
    const now = Date.now()
    assert.equal(effectiveReadiness(999, null, now), 100)
    assert.equal(effectiveReadiness(-50, null, now), 0)
    assert.equal(effectiveReadiness('nonsense', null, now), 0)
  })

  test('daysSince treats a missing timestamp as infinitely old and never returns negative', () => {
    const now = Date.now()
    assert.equal(daysSince(null, now), Infinity)
    assert.equal(daysSince(now + 10 * DAY_MS, now), 0, 'a future pass date must not produce negative age')
  })
})
