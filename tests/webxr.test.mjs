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
