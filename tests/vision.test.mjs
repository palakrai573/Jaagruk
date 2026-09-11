/*
 * Object detection tests.
 *
 * The interesting assertions here are the NEGATIVE ones. It is easy to write a
 * detector that reports whatever the model happens to emit, and the temptation in a
 * site-safety product is to let a caller read `door` or `helmet` out of it because
 * those are the words a judge wants to hear. COCO has neither class. The tests below
 * pin that down so nobody can quietly widen the vocabulary later: if someone adds
 * `door` to the allowlist, a test fails and says why.
 *
 * summariseDetections is also treated as hostile-input code, for the same reason
 * normaliseScanResult is. Its input comes from outside our codebase, it runs inside
 * a render path, and one malformed frame must not be able to blank the drill.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyLabel,
  summariseDetections,
  emptyDetections,
  visionStatusKey,
  CATEGORY_ALLOWLIST,
  DETECTED,
  VISION_STATUS,
  DETECT_INTERVAL_MS,
} from '../src/lib/vision.js'

/* ------------------------------------------------------------- honesty */

describe('what this model is allowed to claim', () => {
  test('people and vehicles are recognised', () => {
    assert.equal(classifyLabel('person'), DETECTED.PERSON)
    for (const v of ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train']) {
      assert.equal(classifyLabel(v), DETECTED.VEHICLE, `${v} should be a vehicle`)
    }
  })

  test('the things a safety demo is tempted to claim are NOT recognised', () => {
    /*
     * None of these are COCO classes, so no confidence threshold or model tuning
     * would ever produce them. If this test starts failing, either the model was
     * swapped for one with a different vocabulary — in which case the honesty
     * copy in the UI and the header comment both need rewriting — or someone
     * widened the allowlist without doing so.
     */
    for (const label of [
      'door',
      'fire exit',
      'exit sign',
      'fire extinguisher',
      'extinguisher',
      'helmet',
      'hard hat',
      'safety vest',
      'gas cylinder',
      'machinery',
      'forklift',
      'guard rail',
    ]) {
      assert.equal(classifyLabel(label), null, `${label} must not be claimed as detectable`)
    }
  })

  test('the allowlist contains nothing beyond those two groups', () => {
    // The allowlist is what is handed to MediaPipe, so it is the real boundary.
    for (const label of CATEGORY_ALLOWLIST) {
      assert.ok(classifyLabel(label) !== null, `${label} is allowlisted but unclassifiable`)
    }
    assert.equal(CATEGORY_ALLOWLIST.length, 7)
  })

  test('other COCO classes are dropped rather than mislabelled', () => {
    // These ARE in COCO but carry no safety meaning here. Reporting a chair as a
    // hazard would be worse than not reporting it.
    for (const label of ['chair', 'dog', 'bottle', 'tv', 'potted plant', 'sandwich']) {
      assert.equal(classifyLabel(label), null, `${label} should be dropped`)
    }
  })

  test('labels are matched robustly but not loosely', () => {
    assert.equal(classifyLabel('PERSON'), DETECTED.PERSON)
    assert.equal(classifyLabel('  Truck  '), DETECTED.VEHICLE)
    // Substring matching would turn "person" into a match for "salesperson".
    assert.equal(classifyLabel('salesperson'), null)
    assert.equal(classifyLabel('racecar'), null)
  })

  test('non-strings are rejected without throwing', () => {
    for (const bad of [null, undefined, 42, {}, [], true, NaN]) {
      assert.equal(classifyLabel(bad), null)
    }
  })
})

/* ------------------------------------------------------- summarisation */

const det = (name, score, box) => ({
  categories: [{ categoryName: name, score }],
  boundingBox: box,
  keypoints: [],
})

const box = (x, y, w, h) => ({ originX: x, originY: y, width: w, height: h, angle: 0 })

describe('summariseDetections — counts', () => {
  test('people and vehicles are counted separately', () => {
    const r = summariseDetections(
      {
        detections: [
          det('person', 0.9, box(10, 10, 50, 200)),
          det('person', 0.8, box(80, 10, 50, 200)),
          det('truck', 0.7, box(200, 50, 300, 150)),
        ],
      },
      640,
      480,
    )
    assert.equal(r.people, 2)
    assert.equal(r.vehicles, 1)
    assert.equal(r.total, 3)
  })

  test('a clean frame reports zeroes rather than nothing', () => {
    const r = summariseDetections({ detections: [] }, 640, 480)
    assert.deepEqual(r, emptyDetections())
  })

  test('low-confidence detections are discarded', () => {
    const r = summariseDetections(
      { detections: [det('person', 0.9, box(0, 0, 10, 10)), det('person', 0.1, box(0, 0, 10, 10))] },
      640,
      480,
    )
    assert.equal(r.people, 1, 'the weak detection should not be counted')
  })

  test('the strongest category wins regardless of order', () => {
    // MediaPipe documents descending order, but a mislabelled box is not a nice
    // way to find out that changed.
    const r = summariseDetections(
      {
        detections: [
          { categories: [{ categoryName: 'chair', score: 0.5 }, { categoryName: 'person', score: 0.95 }], boundingBox: box(0, 0, 20, 20) },
        ],
      },
      640,
      480,
    )
    assert.equal(r.people, 1)
    assert.equal(r.objects[0].label, 'person')
  })

  test('unrecognised classes never reach the caller', () => {
    const r = summariseDetections(
      { detections: [det('door', 0.99, box(0, 0, 100, 300)), det('helmet', 0.99, box(0, 0, 50, 50))] },
      640,
      480,
    )
    assert.equal(r.total, 0, 'a confident non-class must still be dropped')
  })
})

describe('summariseDetections — geometry', () => {
  test('pixel boxes become 0..1 fractions of the frame', () => {
    const r = summariseDetections({ detections: [det('person', 0.9, box(160, 120, 320, 240))] }, 640, 480)
    const b = r.objects[0].bbox
    assert.ok(Math.abs(b.x - 0.25) < 1e-9, `x=${b.x}`)
    assert.ok(Math.abs(b.y - 0.25) < 1e-9, `y=${b.y}`)
    assert.ok(Math.abs(b.w - 0.5) < 1e-9, `w=${b.w}`)
    assert.ok(Math.abs(b.h - 0.5) < 1e-9, `h=${b.h}`)
  })

  test('a box running off the edge is trimmed, not moved', () => {
    // Keeping the origin is what keeps the box on the object it found.
    const r = summariseDetections({ detections: [det('person', 0.9, box(600, 400, 400, 400))] }, 640, 480)
    const b = r.objects[0].bbox
    assert.ok(Math.abs(b.x - 600 / 640) < 1e-9, 'origin must not move')
    assert.ok(b.x + b.w <= 1 + 1e-9, `right edge ${b.x + b.w} must stay in frame`)
    assert.ok(b.y + b.h <= 1 + 1e-9, `bottom edge ${b.y + b.h} must stay in frame`)
  })

  test('negative coordinates are clamped into the frame', () => {
    const r = summariseDetections({ detections: [det('person', 0.9, box(-50, -50, 200, 200))] }, 640, 480)
    const b = r.objects[0].bbox
    assert.ok(b.x >= 0 && b.y >= 0, `${b.x},${b.y}`)
  })

  test('a detection with no usable frame size is still counted, without a box', () => {
    // The object WAS detected. Dropping it because we cannot draw it would
    // undercount a muster-point headcount.
    const r = summariseDetections({ detections: [det('person', 0.9, box(10, 10, 50, 50))] }, 0, 0)
    assert.equal(r.people, 1)
    assert.equal(r.objects[0].bbox, null)
    assert.equal(r.objects[0].near, false, 'no box means no proximity claim')
  })

  test('a zero-area box is treated as unusable', () => {
    const r = summariseDetections({ detections: [det('person', 0.9, box(10, 10, 0, 0))] }, 640, 480)
    assert.equal(r.objects[0].bbox, null)
  })
})

describe('summariseDetections — the vehicle warning', () => {
  test('a large vehicle raises the warning', () => {
    const r = summariseDetections({ detections: [det('truck', 0.9, box(0, 0, 400, 300))] }, 640, 480)
    assert.equal(r.nearVehicle, true, 'a box filling 62% of frame height should warn')
  })

  test('a small vehicle does not', () => {
    const r = summariseDetections({ detections: [det('car', 0.9, box(0, 0, 60, 40))] }, 640, 480)
    assert.equal(r.vehicles, 1)
    assert.equal(r.nearVehicle, false)
  })

  test('a large PERSON does not raise the vehicle warning', () => {
    // The warning is specifically about vehicles. Someone standing close to the
    // camera must not trigger a keep-clear alert.
    const r = summariseDetections({ detections: [det('person', 0.95, box(0, 0, 400, 470))] }, 640, 480)
    assert.equal(r.nearVehicle, false)
    assert.equal(r.people, 1)
  })

  test('one distant vehicle does not cancel one close vehicle', () => {
    const r = summariseDetections(
      { detections: [det('car', 0.9, box(0, 0, 30, 20)), det('bus', 0.9, box(100, 0, 400, 400))] },
      640,
      480,
    )
    assert.equal(r.vehicles, 2)
    assert.equal(r.nearVehicle, true)
  })
})

describe('summariseDetections — hostile input', () => {
  test('junk never throws and always returns the full shape', () => {
    const shape = (r) => {
      assert.ok(Array.isArray(r.objects))
      assert.equal(typeof r.people, 'number')
      assert.equal(typeof r.vehicles, 'number')
      assert.equal(typeof r.nearVehicle, 'boolean')
      assert.equal(typeof r.total, 'number')
      assert.ok(Number.isFinite(r.people) && Number.isFinite(r.vehicles))
    }
    for (const bad of [null, undefined, {}, [], 'detections', 42, { detections: null }, { detections: 'x' }]) {
      shape(summariseDetections(bad, 640, 480))
    }
  })

  test('malformed entries are skipped, valid ones survive alongside them', () => {
    const r = summariseDetections(
      {
        detections: [
          null,
          undefined,
          'person',
          42,
          {},
          { categories: null },
          { categories: [] },
          { categories: [{}] },
          det('person', 0.9, box(0, 0, 20, 20)),
        ],
      },
      640,
      480,
    )
    assert.equal(r.people, 1, 'the one good detection must still be reported')
    assert.equal(r.total, 1)
  })

  test('a non-numeric score or box does not corrupt the result', () => {
    const r = summariseDetections(
      {
        detections: [
          { categories: [{ categoryName: 'person', score: 'high' }], boundingBox: box(0, 0, 20, 20) },
          { categories: [{ categoryName: 'person', score: 0.9 }], boundingBox: { originX: 'a', originY: null, width: NaN, height: undefined } },
        ],
      },
      640,
      480,
    )
    // The first has an unusable score and falls below threshold; the second is a
    // real detection whose box cannot be used.
    assert.equal(r.people, 1)
    assert.equal(r.objects[0].bbox, null)
  })

  test('an absurd label is truncated rather than passed through', () => {
    const long = 'person'.repeat(50)
    const r = summariseDetections({ detections: [det(long, 0.9, box(0, 0, 20, 20))] }, 640, 480)
    // It is not a valid class, so it is dropped entirely — the truncation guard
    // exists for the case where a model does emit a long valid-looking name.
    assert.equal(r.total, 0)
  })

  test('scores are reported inside 0..1', () => {
    const r = summariseDetections(
      { detections: [det('person', 5, box(0, 0, 20, 20)), det('car', 0.7, box(0, 0, 20, 20))] },
      640,
      480,
    )
    for (const o of r.objects) assert.ok(o.score >= 0 && o.score <= 1, `score ${o.score}`)
  })
})

/* -------------------------------------------------------------- config */

describe('configuration', () => {
  test('detection is throttled well below display rate', () => {
    // Inference competes with the camera, the 3D overlay and the hand tracker.
    assert.ok(DETECT_INTERVAL_MS >= 100, `${DETECT_INTERVAL_MS}ms is too aggressive`)
    assert.ok(DETECT_INTERVAL_MS <= 500, `${DETECT_INTERVAL_MS}ms is too sluggish to be useful`)
  })

  test('every status maps to a distinct i18n key', () => {
    const keys = new Set()
    for (const status of Object.values(VISION_STATUS)) {
      const key = visionStatusKey(status)
      assert.ok(typeof key === 'string' && key.startsWith('vision_'), `${status} -> ${key}`)
      keys.add(key)
    }
    // READY and RUNNING deliberately share one key; everything else is distinct.
    assert.ok(keys.size >= 5, `expected distinct keys, got ${[...keys].join(',')}`)
  })

  test('an unknown status falls back rather than returning undefined', () => {
    assert.equal(visionStatusKey('nonsense'), 'vision_idle')
    assert.equal(visionStatusKey(undefined), 'vision_idle')
  })
})
