// Hazard-scan result validation.
//
// WHY THIS IS TESTED AND THE NETWORK CALL IS NOT
// The fetch to Gemini or OpenAI is not interesting to test — it either returns
// text or it throws, and both paths are two lines. What matters is what happens to
// the text afterwards, because a vision model is a source of arbitrary,
// occasionally malformed data that gets rendered directly onto a photograph and
// written into a worker's activity log.
//
// The failure this file exists to prevent: a scan that could not be read being
// displayed as a scan that found nothing. HazardScan renders an empty hazards array
// as "No hazards detected." in safe green, so a parse failure used to present as a
// clean bill of health on a safety inspection.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { normaliseScanResult, SCAN_SEVERITY } from '../src/lib/api.js'

const hazard = (over = {}) => ({
  label: 'Missing helmet',
  severity: 'high',
  description: 'Worker in an active area with no head protection.',
  bbox: [0.1, 0.2, 0.3, 0.4],
  ppe: true,
  ...over,
})

/* ================================================================== */
describe('normaliseScanResult — shape', () => {
  test('a well-formed result passes through intact', () => {
    const out = normaliseScanResult({ hazards: [hazard()], summary: 'One issue.', riskScore: 80 })
    assert.equal(out.hazards.length, 1)
    assert.equal(out.riskScore, 80)
    assert.equal(out.summary, 'One issue.')
    assert.deepEqual(out.hazards[0].bbox, [0.1, 0.2, 0.3, 0.4])
    assert.equal(out.hazards[0].localised, true)
  })

  test('junk input yields an empty but valid result rather than throwing', () => {
    for (const bad of [null, undefined, 'text', 42, [], { hazards: 'nope' }]) {
      const out = normaliseScanResult(bad)
      assert.ok(Array.isArray(out.hazards), `input ${JSON.stringify(bad)}`)
      assert.equal(out.hazards.length, 0)
      assert.equal(out.riskScore, 0)
      assert.equal(typeof out.summary, 'string')
    }
  })

  test('non-object entries in the hazards array are dropped', () => {
    const out = normaliseScanResult({ hazards: [null, 'x', 5, hazard()] })
    assert.equal(out.hazards.length, 1)
  })

  test('a hazard with no usable label is dropped', () => {
    const out = normaliseScanResult({ hazards: [hazard({ label: '   ' }), hazard({ label: undefined }), hazard()] })
    assert.equal(out.hazards.length, 1, 'an unlabelled marker on a photo tells a worker nothing')
  })
})

/* ================================================================== */
describe('normaliseScanResult — bbox', () => {
  // HazardScan destructures bbox positionally into CSS percentages, so a wrong
  // length produced `undefined%` and an out-of-range value drew outside the photo.
  test('a bbox of the wrong length falls back to a default and is marked unlocalised', () => {
    for (const bad of [[0.1, 0.2], [0.1, 0.2, 0.3], [0.1, 0.2, 0.3, 0.4, 0.5], 'nope', null]) {
      const out = normaliseScanResult({ hazards: [hazard({ bbox: bad })] })
      const h = out.hazards[0]
      assert.equal(h.bbox.length, 4, `input ${JSON.stringify(bad)}`)
      assert.ok(h.bbox.every(Number.isFinite))
      assert.equal(h.localised, false, 'the caller must be able to tell this was not localised')
    }
  })

  test('a bbox with non-numeric members is treated as unusable', () => {
    const out = normaliseScanResult({ hazards: [hazard({ bbox: [0.1, 'a', 0.3, 0.4] })] })
    assert.equal(out.hazards[0].localised, false)
  })

  test('coordinates are clamped into the frame', () => {
    const out = normaliseScanResult({ hazards: [hazard({ bbox: [-5, -1, 2, 3] })] })
    const [x, y, w, h] = out.hazards[0].bbox
    assert.ok(x >= 0 && y >= 0)
    assert.ok(x + w <= 1 + 1e-9, 'box must not extend past the right edge')
    assert.ok(y + h <= 1 + 1e-9, 'box must not extend past the bottom edge')
  })

  test('a box starting near the edge has its size trimmed, not its origin moved', () => {
    const out = normaliseScanResult({ hazards: [hazard({ bbox: [0.9, 0.8, 0.5, 0.5] })] })
    const [x, y, w, h] = out.hazards[0].bbox
    assert.equal(x, 0.9, 'origin is where the model saw the hazard and must be preserved')
    assert.equal(y, 0.8)
    assert.ok(Math.abs(w - 0.1) < 1e-9)
    assert.ok(Math.abs(h - 0.2) < 1e-9)
  })
})

/* ================================================================== */
describe('normaliseScanResult — severity and score', () => {
  test('every declared severity survives', () => {
    for (const s of SCAN_SEVERITY) {
      assert.equal(normaliseScanResult({ hazards: [hazard({ severity: s })] }).hazards[0].severity, s)
    }
  })

  // Erring downward on a hazard the model described but mislabelled would be the
  // wrong direction on a safety tool, and HazardScan's colour lookup returns
  // undefined for an unknown key.
  test('an unrecognised severity becomes medium, never low', () => {
    for (const bad of ['critical', 'HIGH', '', null, 7, undefined]) {
      const out = normaliseScanResult({ hazards: [hazard({ severity: bad })] })
      assert.equal(out.hazards[0].severity, 'medium', `input ${String(bad)}`)
    }
  })

  test('riskScore is clamped to 0..100 and rounded', () => {
    for (const [input, expected] of [[-20, 0], [0, 0], [55.4, 55], [100, 100], [900, 100]]) {
      assert.equal(normaliseScanResult({ hazards: [hazard()], riskScore: input }).riskScore, expected)
    }
  })

  /* A model that lists hazards but omits the score would otherwise show a
   * reassuring zero on the gauge next to a list of things that are wrong. */
  test('a missing score is derived from the worst severity present', () => {
    for (const bad of [undefined, null, 'high', NaN]) {
      const out = normaliseScanResult({ hazards: [hazard({ severity: 'high' })], riskScore: bad })
      assert.ok(out.riskScore > 0, `a listed hazard must not read as zero risk (input ${String(bad)})`)
    }
    const low = normaliseScanResult({ hazards: [hazard({ severity: 'low' })], riskScore: undefined })
    const high = normaliseScanResult({ hazards: [hazard({ severity: 'high' })], riskScore: undefined })
    assert.ok(high.riskScore > low.riskScore, 'the derived score must track severity')
  })

  test('a genuinely clean photo scores zero', () => {
    const out = normaliseScanResult({ hazards: [], summary: 'Nothing visible.', riskScore: 0 })
    assert.equal(out.riskScore, 0)
    assert.equal(out.hazards.length, 0)
  })
})

/* ================================================================== */
describe('normaliseScanResult — derived counts', () => {
  test('PPE and high-severity hazards are counted', () => {
    const out = normaliseScanResult({
      hazards: [
        hazard({ severity: 'high', ppe: true }),
        hazard({ label: 'No goggles', severity: 'medium', ppe: true }),
        hazard({ label: 'Unguarded nip', severity: 'high', ppe: false }),
        hazard({ label: 'Cable on floor', severity: 'low', ppe: false }),
      ],
    })
    assert.equal(out.hazards.length, 4)
    assert.equal(out.ppeCount, 2)
    assert.equal(out.highCount, 2)
  })

  test('ppe is strictly boolean, so a truthy string does not count as PPE', () => {
    const out = normaliseScanResult({ hazards: [hazard({ ppe: 'yes' }), hazard({ label: 'b', ppe: 1 })] })
    assert.equal(out.ppeCount, 0, 'only an explicit true counts')
  })

  test('long strings are truncated so one bad response cannot break the layout', () => {
    const out = normaliseScanResult({
      hazards: [hazard({ label: 'x'.repeat(500), description: 'y'.repeat(2000) })],
    })
    assert.ok(out.hazards[0].label.length <= 80)
    assert.ok(out.hazards[0].description.length <= 300)
  })
})
