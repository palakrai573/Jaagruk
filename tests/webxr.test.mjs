/*
 * WebXR site-frame tests.
 *
 * WHAT IS AND IS NOT COVERED HERE, STATED UP FRONT
 *
 * The maths is tested. The session handling is not, and cannot be from a node
 * process: it needs an ARCore device, and WebXR module support varies per handset.
 * That is a real gap and it is why the XR mode ships behind a capability probe with
 * the compass overlay intact as the fallback.
 *
 * The maths is the part worth testing anyway, because it is the part that decides
 * whether a worker walking into a roadway sees the exit where the exit actually is.
 * A site frame built from two taps is what replaces Cloud Anchors here, so if the
 * round trip through it is not exact, every anchor in the zone is quietly wrong by
 * the same rotation — the most expensive kind of bug this file could contain, and the
 * hardest to notice on a phone.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  siteFrameFrom,
  worldToSite,
  siteToWorld,
  siteBearing,
  siteElevation,
  siteDistance,
  poseToPoint,
  grantedFeatures,
  immersiveArSessionInit,
  xrBlocker,
  MIN_ALIGNMENT_BASELINE_M,
  ALIGN_ERROR,
  XR_BLOCK,
  XR_BLOCK_KEYS,
  medianPoint,
  pointSpread,
  placementReadiness,
  trackingQuality,
  alignmentYawErrorDeg,
  alignmentErrorAtDistance,
  PLACEMENT_SAMPLES,
  PLACEMENT_STABLE_M,
  TRACKING,
} from '../src/lib/webxr.js'

const P = (x, y, z) => ({ x, y, z })

function assertPoint(actual, expected, label, eps = 1e-9) {
  assert.ok(actual, `${label}: got null`)
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(
      Math.abs(actual[axis] - expected[axis]) < eps,
      `${label}: ${axis} expected ${expected[axis]}, got ${actual[axis]}`,
    )
  }
}

/* ------------------------------------------------------------- alignment */

describe('siteFrameFrom', () => {
  test('the direction point defines local -Z', () => {
    // The convention that matters: "forward" from the marker is -Z, matching
    // bearing 0 everywhere else in the codebase.
    const frame = siteFrameFrom(P(0, 0, 0), P(0, 0, -5))
    assert.equal(frame.error, undefined)
    assert.ok(Math.abs(frame.yaw) < 1e-9, `yaw should be 0, got ${frame.yaw}`)
    assertPoint(worldToSite(P(0, 0, -5), frame), P(0, 0, -5), 'direction point')
  })

  test('a direction point to the east yields a quarter-turn frame', () => {
    const frame = siteFrameFrom(P(0, 0, 0), P(5, 0, 0))
    assert.ok(Math.abs(frame.yaw - Math.PI / 2) < 1e-9, `yaw=${frame.yaw}`)
    // Whatever the yaw, the direction point must land on local -Z at its distance.
    assertPoint(worldToSite(P(5, 0, 0), frame), P(0, 0, -5), 'east direction point')
  })

  test('the direction point always lands on local -Z, from any bearing', () => {
    // The general invariant. If this holds, the frame is correctly oriented for
    // every possible pair of taps.
    for (let deg = 0; deg < 360; deg += 11) {
      const r = (deg * Math.PI) / 180
      const d = 3.5
      const dir = P(Math.sin(r) * d, 0, -Math.cos(r) * d)
      const frame = siteFrameFrom(P(0, 0, 0), dir)
      assert.equal(frame.error, undefined, `bearing ${deg} rejected`)
      assertPoint(worldToSite(dir, frame), P(0, 0, -d), `bearing ${deg}`, 1e-9)
    }
  })

  test('the origin is always local zero', () => {
    const frame = siteFrameFrom(P(7, -1.2, 3), P(9, -1.2, 6))
    assertPoint(worldToSite(P(7, -1.2, 3), frame), P(0, 0, 0), 'origin')
  })

  test('height difference between the taps does not tilt the frame', () => {
    /*
     * A supervisor tapping a marker at chest height and a reference on the floor
     * must not rotate the whole zone about the horizontal. Up stays world up —
     * ARCore knows gravity far better than two finger taps do.
     */
    const flat = siteFrameFrom(P(0, 0, 0), P(0, 0, -4))
    const tilted = siteFrameFrom(P(0, 1.4, 0), P(0, -0.2, -4))
    assert.ok(Math.abs(flat.yaw - tilted.yaw) < 1e-9, 'yaw must ignore height')
    // A point directly above the origin stays directly above it.
    assertPoint(worldToSite(P(0, 3, 0), tilted), P(0, 3 - 1.4, 0), 'vertical preserved')
  })

  test('taps that are too close together are refused', () => {
    // A short baseline turns a small tapping slip into a large rotation, so this is
    // refused rather than silently producing a skewed zone.
    for (const d of [0, 0.05, 0.5, 1.2, 1.99]) {
      const r = siteFrameFrom(P(0, 0, 0), P(0, 0, -d))
      assert.equal(r.error, ALIGN_ERROR.TOO_CLOSE, `${d}m should be refused`)
    }
    assert.equal(siteFrameFrom(P(0, 0, 0), P(0, 0, -2)).error, undefined, 'exactly the minimum is allowed')
    assert.equal(MIN_ALIGNMENT_BASELINE_M, 2)
  })

  test('vertical separation alone cannot satisfy the baseline', () => {
    // Two points on the same spot at different heights give no heading information.
    const r = siteFrameFrom(P(0, 0, 0), P(0, 5, 0))
    assert.equal(r.error, ALIGN_ERROR.TOO_CLOSE)
  })

  test('junk points are refused rather than producing NaN', () => {
    for (const [a, b] of [
      [null, P(0, 0, -3)],
      [P(0, 0, 0), null],
      [{}, P(0, 0, -3)],
      [P(0, 0, 0), { x: NaN, y: 0, z: -3 }],
      [P(0, 0, 0), { x: 0, y: 0 }],
      ['origin', 'dir'],
    ]) {
      assert.equal(siteFrameFrom(a, b).error, ALIGN_ERROR.INVALID, `${JSON.stringify([a, b])}`)
    }
  })
})

/* -------------------------------------------------------- round tripping */

describe('worldToSite and siteToWorld', () => {
  const frame = siteFrameFrom(P(2.5, -1.1, 4.25), P(-1.5, -1.1, 6.75))

  test('the round trip is exact', () => {
    /*
     * This is the test that matters most. Anchors are stored in site coordinates
     * and read back in a different session; any loss here rotates or shifts the
     * whole zone by a constant, which looks plausible and is entirely wrong.
     */
    for (const p of [
      P(0, 0, 0),
      P(1, 2, 3),
      P(-7.25, 0.5, 12.125),
      P(100, -3, -100),
      P(0.001, 0, -0.001),
    ]) {
      const local = worldToSite(p, frame)
      assertPoint(siteToWorld(local, frame), p, `round trip ${JSON.stringify(p)}`, 1e-9)
    }
  })

  test('the round trip holds across many frames', () => {
    for (let deg = 0; deg < 360; deg += 37) {
      const r = (deg * Math.PI) / 180
      const f = siteFrameFrom(P(3, 1, -2), P(3 + Math.sin(r) * 4, 1, -2 - Math.cos(r) * 4))
      assert.equal(f.error, undefined)
      const p = P(-5.5, 2.25, 8.75)
      assertPoint(siteToWorld(worldToSite(p, f), f), p, `frame at ${deg}`, 1e-9)
    }
  })

  test('distance between two points is preserved', () => {
    // A rigid transform must not scale. If it did, a six-metre roadway would render
    // as five and every placement would be subtly short.
    const a = P(1, 0, 1)
    const b = P(4, 2, -3)
    const worldGap = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
    const la = worldToSite(a, frame)
    const lb = worldToSite(b, frame)
    const localGap = Math.hypot(la.x - lb.x, la.y - lb.y, la.z - lb.z)
    assert.ok(Math.abs(worldGap - localGap) < 1e-9, `${worldGap} vs ${localGap}`)
  })

  test('two sessions with different world origins agree on the same real point', () => {
    /*
     * The whole purpose of the site frame, and the closest this can get to testing
     * cross-device persistence without two phones.
     *
     * Each XR session picks its own arbitrary world origin. Two workers standing in
     * the same roadway therefore have completely different world coordinates for the
     * same doorway. If both align against the same physical marker and reference
     * point, a site coordinate recorded by one must resolve to the correct real place
     * for the other.
     *
     * Modelled by taking one physical layout and expressing it in two world frames
     * related by an arbitrary translation and rotation.
     */
    const shift = { x: 13.4, y: -2.2, z: -8.1 }
    const spin = 1.05 // radians of session-origin yaw difference
    const toSessionB = (p) => ({
      x: shift.x + p.x * Math.cos(spin) - p.z * Math.sin(spin),
      y: shift.y + p.y,
      z: shift.z + p.x * Math.sin(spin) + p.z * Math.cos(spin),
    })

    // The physical layout, as session A happens to see it.
    const markerA = P(1, 0, 2)
    const referenceA = P(1, 0, -2)
    const doorwayA = P(-3.5, 1.1, 0.75)

    const frameA = siteFrameFrom(markerA, referenceA)
    const frameB = siteFrameFrom(toSessionB(markerA), toSessionB(referenceA))
    assert.equal(frameA.error, undefined)
    assert.equal(frameB.error, undefined)

    // The supervisor records the doorway in session A.
    const stored = worldToSite(doorwayA, frameA)

    // The worker resolves it in session B and must land on the same real point.
    const resolvedB = siteToWorld(stored, frameB)
    assertPoint(resolvedB, toSessionB(doorwayA), 'cross-session agreement', 1e-9)
  })

  test('a missing frame or point yields null rather than throwing', () => {
    assert.equal(worldToSite(null, frame), null)
    assert.equal(worldToSite(P(1, 1, 1), null), null)
    assert.equal(worldToSite(P(1, 1, 1), {}), null)
    assert.equal(siteToWorld(null, frame), null)
    assert.equal(siteToWorld(P(1, 1, 1), undefined), null)
  })
})

/* ------------------------------------------- bridge to the compass model */

describe('deriving the existing anchor fields', () => {
  const frame = siteFrameFrom(P(0, 0, 0), P(0, 0, -10))

  test('bearing matches the compass convention', () => {
    // With yaw 0 the site frame and the world agree, so local -Z is north.
    assert.ok(Math.abs(siteBearing(P(0, 0, -5), frame) - 0) < 1e-6, 'north')
    assert.ok(Math.abs(siteBearing(P(5, 0, 0), frame) - 90) < 1e-6, 'east')
    assert.ok(Math.abs(siteBearing(P(0, 0, 5), frame) - 180) < 1e-6, 'south')
    assert.ok(Math.abs(siteBearing(P(-5, 0, 0), frame) - 270) < 1e-6, 'west')
  })

  test('bearing is always inside 0..360', () => {
    for (let deg = 0; deg < 360; deg += 13) {
      const r = (deg * Math.PI) / 180
      const b = siteBearing(P(Math.sin(r) * 4, 0.5, -Math.cos(r) * 4), frame)
      assert.ok(b >= 0 && b < 360, `got ${b}`)
    }
  })

  test('a point directly overhead has no bearing', () => {
    // Reported as null rather than an invented 0, which would place a ceiling anchor
    // due north of the worker.
    assert.equal(siteBearing(P(0, 3, 0), frame), null)
  })

  test('elevation is signed and bounded', () => {
    assert.ok(Math.abs(siteElevation(P(0, 0, -5))) < 1e-9, 'level')
    assert.ok(Math.abs(siteElevation(P(0, 5, -5)) - 45) < 1e-6, 'up 45')
    assert.ok(Math.abs(siteElevation(P(0, -5, -5)) + 45) < 1e-6, 'down 45')
    assert.equal(siteElevation(P(0, 2, 0)), 90, 'straight up')
    assert.equal(siteElevation(P(0, -2, 0)), -90, 'straight down')
  })

  test('distance is the real straight-line distance', () => {
    // The thing the compass model could never provide.
    assert.ok(Math.abs(siteDistance(P(3, 4, 0)) - 5) < 1e-9)
    assert.ok(Math.abs(siteDistance(P(0, 0, -12)) - 12) < 1e-9)
    assert.equal(siteDistance(P(0, 0, 0)), 0)
  })

  test('junk gives null, not a plausible number', () => {
    for (const bad of [null, undefined, {}, { x: 1, y: 2 }, 'here']) {
      assert.equal(siteElevation(bad), null)
      assert.equal(siteDistance(bad), null)
      assert.equal(siteBearing(bad, frame), null)
    }
  })
})

/* ------------------------------------------------------------- plumbing */

describe('session configuration', () => {
  test('only hit-test is required', () => {
    // Requiring anchors or depth would exclude devices that support most of what
    // this needs. Everything beyond placement degrades.
    const init = immersiveArSessionInit()
    assert.deepEqual(init.requiredFeatures, ['hit-test'])
    for (const f of ['anchors', 'depth-sensing', 'light-estimation']) {
      assert.ok(init.optionalFeatures.includes(f), `${f} should be optional`)
    }
  })

  test('dom-overlay is only requested when a root is supplied', () => {
    assert.ok(!immersiveArSessionInit().optionalFeatures.includes('dom-overlay'))
    const withRoot = immersiveArSessionInit({ domOverlayRoot: { nodeType: 1 } })
    assert.ok(withRoot.optionalFeatures.includes('dom-overlay'))
    assert.ok(withRoot.domOverlay?.root)
  })

  test('depth sensing preferences are declared', () => {
    const init = immersiveArSessionInit()
    assert.ok(Array.isArray(init.depthSensing?.usagePreference))
    assert.ok(Array.isArray(init.depthSensing?.dataFormatPreference))
  })
})

describe('grantedFeatures', () => {
  test('a session reporting its features is read accurately', () => {
    const g = grantedFeatures({ enabledFeatures: ['hit-test', 'anchors', 'dom-overlay'] })
    assert.equal(g.known, true)
    assert.equal(g.anchors, true)
    assert.equal(g.domOverlay, true)
    assert.equal(g.depth, false, 'depth was not granted and must not be claimed')
  })

  test('a session that does not report features is marked unknown', () => {
    /*
     * enabledFeatures is not universally implemented. "Unknown" is distinct from
     * "none" on purpose: the caller must not claim occlusion it cannot confirm, nor
     * disable a feature merely because the browser is quiet about it.
     */
    for (const s of [{}, null, { enabledFeatures: undefined }, { enabledFeatures: 'hit-test' }]) {
      const g = grantedFeatures(s)
      assert.equal(g.known, false)
      assert.equal(g.depth, false, 'never assume depth')
    }
  })
})

describe('poseToPoint', () => {
  test('a valid pose becomes a plain point', () => {
    assertPoint(poseToPoint({ transform: { position: { x: 1, y: 2, z: 3 } } }), P(1, 2, 3), 'pose')
  })

  test('lost tracking yields null instead of throwing', () => {
    // getPose returns null constantly in practice, every time tracking blips.
    for (const bad of [null, undefined, {}, { transform: null }, { transform: {} }, { transform: { position: { x: NaN, y: 0, z: 0 } } }]) {
      assert.equal(poseToPoint(bad), null)
    }
  })
})

describe('capability reporting', () => {
  test('a node process is correctly reported as unsupported', () => {
    // There is no navigator.xr here, which is exactly what the guard is for.
    assert.equal(xrBlocker(), XR_BLOCK.UNSUPPORTED)
  })

  test('every block reason has a translation key', () => {
    for (const reason of Object.values(XR_BLOCK)) {
      const key = XR_BLOCK_KEYS[reason]
      assert.ok(typeof key === 'string' && key.startsWith('xr_'), `${reason} -> ${key}`)
    }
  })
})

/* ------------------------------------------ the bridge to stored anchors */

describe('an XR-placed anchor is usable by the compass overlay', () => {
  /*
   * The compatibility guarantee that keeps this from splitting the product in two.
   *
   * A supervisor with a modern phone scans a zone in tracked AR and gets measured
   * positions. A worker with an older phone opens the same zone and has only the
   * compass overlay. That has to work, which means every XR placement must also
   * produce the bearing and elevation the old path already understands — derived from
   * the measurement rather than typed in twice.
   */
  const frame = siteFrameFrom(P(4, -1, -2), P(4, -1, -8))

  test('a placement yields bearing, elevation and distance together', () => {
    const tapped = P(9, 0.5, -5)
    const local = worldToSite(tapped, frame)

    const bearing = siteBearing(local, frame)
    const elevation = siteElevation(local)
    const distance = siteDistance(local)

    assert.ok(bearing !== null && bearing >= 0 && bearing < 360, `bearing ${bearing}`)
    assert.ok(elevation !== null && elevation > -90 && elevation < 90, `elevation ${elevation}`)
    assert.ok(distance > 0, `distance ${distance}`)

    // And the site coordinate still round-trips, so the measured position is intact.
    assertPoint(siteToWorld(local, frame), tapped, 'placement round trip', 1e-9)
  })

  test('bearing and elevation agree with the geometry they came from', () => {
    // A point straight ahead along the frame and level with the origin.
    const local = P(0, 0, -6)
    assert.ok(Math.abs(siteBearing(local, frame)) < 1e-6, 'straight ahead is the frame heading')
    assert.ok(Math.abs(siteElevation(local)) < 1e-9, 'level')
    assert.ok(Math.abs(siteDistance(local) - 6) < 1e-9, 'six metres')

    // Directly right of the frame's forward direction is ninety degrees round from it.
    const right = P(6, 0, 0)
    const delta = Math.abs(((siteBearing(right, frame) - siteBearing(P(0, 0, -6), frame)) % 360))
    assert.ok(Math.abs(delta - 90) < 1e-6, `expected a quarter turn, got ${delta}`)
  })

  test('distance is the field the compass model could never supply', () => {
    // Two anchors on the same bearing at different ranges must be distinguishable,
    // which is the entire practical gain of the tracked mode.
    const near = worldToSite(P(4, -1, -5), frame)
    const far = worldToSite(P(4, -1, -20), frame)
    assert.ok(Math.abs(siteBearing(near, frame) - siteBearing(far, frame)) < 1e-6, 'same bearing')
    assert.ok(siteDistance(far) > siteDistance(near) + 10, 'different distance')
  })
})

/* ------------------------------------------------------------- accuracy */

describe('medianPoint', () => {
  test('the median of a tight cluster is inside it', () => {
    const pts = [P(1, 1, 1), P(1.01, 1.02, 0.99), P(0.99, 0.98, 1.01)]
    const m = medianPoint(pts)
    assert.ok(Math.abs(m.x - 1) < 0.02 && Math.abs(m.y - 1) < 0.03 && Math.abs(m.z - 1) < 0.02)
  })

  test('an outlier does NOT drag the result, which is the whole reason for a median', () => {
    /*
     * Hit-testing does not fail by adding even noise. It fails by occasionally
     * snapping to a completely different surface — the wall behind a doorway, the
     * floor beyond a machine. A mean would be pulled metres toward that; a median
     * ignores it until it is the majority.
     */
    const cluster = [P(0, 0, -3), P(0.01, 0, -3.01), P(-0.01, 0.01, -2.99), P(0, -0.01, -3)]
    const withOutlier = [...cluster, P(0, 0, -14)]
    const m = medianPoint(withOutlier)
    assert.ok(Math.abs(m.z + 3) < 0.05, `median z should stay near -3, got ${m.z}`)

    // Demonstrate the contrast: the mean is pulled more than two metres away.
    const meanZ = withOutlier.reduce((s, p) => s + p.z, 0) / withOutlier.length
    assert.ok(Math.abs(meanZ + 3) > 2, `the mean should be badly pulled, got ${meanZ}`)
  })

  test('an even sample count averages the middle pair', () => {
    assert.deepEqual(medianPoint([P(0, 0, 0), P(2, 4, 6)]), { x: 1, y: 2, z: 3 })
  })

  test('unusable input yields null rather than a plausible point', () => {
    for (const bad of [null, undefined, [], [null], ['x'], [{ x: 1 }], [{ x: NaN, y: 0, z: 0 }]]) {
      assert.equal(medianPoint(bad), null, JSON.stringify(bad))
    }
  })

  test('junk mixed with real samples is discarded, not counted', () => {
    const m = medianPoint([null, P(1, 1, 1), { x: NaN, y: 1, z: 1 }, P(1, 1, 1), 'nope'])
    assert.deepEqual(m, { x: 1, y: 1, z: 1 })
  })
})

describe('pointSpread', () => {
  test('identical samples have no spread', () => {
    assert.equal(pointSpread([P(1, 2, 3), P(1, 2, 3), P(1, 2, 3)]), 0)
  })

  test('spread is the worst deviation, not the average', () => {
    // One bad sample must be visible in the number, or the steadiness gate would
    // average away exactly the evidence it exists to catch.
    const spread = pointSpread([P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0.5)])
    assert.ok(spread > 0.2, `expected the outlier to show, got ${spread}`)
  })

  test('no usable samples means infinite spread, never zero', () => {
    // Zero would read as "perfectly steady" and permit a placement from nothing.
    assert.equal(pointSpread([]), Number.POSITIVE_INFINITY)
    assert.equal(pointSpread(null), Number.POSITIVE_INFINITY)
  })
})

describe('placementReadiness', () => {
  const steady = (n) => Array.from({ length: n }, (_, i) => P(0.001 * (i % 3), 0, -2 + 0.001 * (i % 2)))

  test('too few samples is reported as sampling, not as unsteady', () => {
    // The distinction is what lets the UI say "hold on" rather than "you are shaking",
    // which would be a lie and would make the worker change the wrong thing.
    const r = placementReadiness(steady(PLACEMENT_SAMPLES - 1))
    assert.equal(r.ready, false)
    assert.equal(r.reason, 'SAMPLING')
    assert.equal(r.point, null)
  })

  test('a steady aim with enough samples is ready and returns the median', () => {
    const r = placementReadiness(steady(PLACEMENT_SAMPLES))
    assert.equal(r.ready, true, `spread was ${r.spread}`)
    assert.equal(r.reason, null)
    assert.ok(isFinite(r.point.x) && isFinite(r.point.z))
    assert.ok(r.spread <= PLACEMENT_STABLE_M)
  })

  test('a wandering aim is refused even with plenty of samples', () => {
    const wandering = Array.from({ length: PLACEMENT_SAMPLES + 6 }, (_, i) => P(i * 0.05, 0, -2))
    const r = placementReadiness(wandering)
    assert.equal(r.ready, false)
    assert.equal(r.reason, 'UNSTEADY')
    assert.ok(r.spread > PLACEMENT_STABLE_M)
    assert.equal(r.point, null, 'an unsteady aim must not yield a point at all')
  })

  test('the steadiness threshold is a realistic one', () => {
    // Loose enough for a handheld phone, tight enough to reject a blank wall — which
    // is where a confident-looking reticle is least trustworthy.
    assert.ok(PLACEMENT_STABLE_M >= 0.01, 'no phone is steadier than a centimetre handheld')
    assert.ok(PLACEMENT_STABLE_M <= 0.08, 'looser than 8cm stops being a measurement')
    assert.ok(PLACEMENT_SAMPLES >= 6, 'too few samples to judge steadiness')
  })

  test('junk input is refused rather than throwing', () => {
    for (const bad of [null, undefined, [], ['x', null]]) {
      const r = placementReadiness(bad)
      assert.equal(r.ready, false)
      assert.equal(r.point, null)
    }
  })
})

describe('trackingQuality', () => {
  test('a real pose is good', () => {
    assert.equal(trackingQuality({ emulatedPosition: false }), TRACKING.GOOD)
    assert.equal(trackingQuality({}), TRACKING.GOOD)
  })

  test('an emulated position is LIMITED, not good', () => {
    /*
     * The flag that is easy to miss and expensive to ignore. emulatedPosition means
     * the runtime reports orientation but INVENTS position. The reticle still draws,
     * the tap still works, and the anchor is fiction. Placement must be refused in
     * that state rather than recording a number that looks like a measurement.
     */
    assert.equal(trackingQuality({ emulatedPosition: true }), TRACKING.LIMITED)
  })

  test('no pose at all is NONE', () => {
    // getViewerPose returns null whenever tracking is lost, which is routine.
    for (const bad of [null, undefined]) {
      assert.equal(trackingQuality(bad), TRACKING.NONE)
    }
  })

  test('only an explicit true counts as emulated', () => {
    // A truthy-but-not-true value must not silently downgrade a good session.
    assert.equal(trackingQuality({ emulatedPosition: 'yes' }), TRACKING.GOOD)
  })
})

describe('alignment error reporting', () => {
  test('a longer baseline gives a smaller yaw error', () => {
    // The trade the two-tap alignment makes, stated as a number instead of implied.
    const short = alignmentYawErrorDeg(2)
    const long = alignmentYawErrorDeg(8)
    assert.ok(short > long, `${short} should exceed ${long}`)
    assert.ok(short < 2, `even the minimum baseline should be under 2 degrees, got ${short}`)
  })

  test('the error at distance is the number a supervisor can act on', () => {
    /*
     * "Half a degree" means nothing to anyone. "Your markers could be twenty
     * centimetres out at the far end of the roadway" is something they can either
     * accept or walk further apart to improve.
     */
    const atTwenty = alignmentErrorAtDistance(2, 20)
    assert.ok(atTwenty > 0.1 && atTwenty < 0.5, `expected a few tens of cm, got ${atTwenty}`)

    // Doubling the baseline should roughly halve it.
    const better = alignmentErrorAtDistance(4, 20)
    assert.ok(better < atTwenty * 0.6, `${better} should be well under ${atTwenty}`)
  })

  test('error grows with distance from the origin', () => {
    const near = alignmentErrorAtDistance(3, 5)
    const far = alignmentErrorAtDistance(3, 40)
    assert.ok(far > near * 5, 'error is proportional to distance')
  })

  test('zero distance has zero error', () => {
    assert.equal(alignmentErrorAtDistance(3, 0), 0)
  })

  test('nonsense inputs give null rather than a confident number', () => {
    for (const b of [0, -1, null, undefined, NaN, 'far']) {
      assert.equal(alignmentYawErrorDeg(b), null, `baseline ${b}`)
    }
    assert.equal(alignmentErrorAtDistance(3, -1), null)
    assert.equal(alignmentErrorAtDistance(null, 10), null)
  })
})
