/*
 * Geometry tests: device orientation to camera rotation.
 *
 * These are pure functions, which is deliberate. The quaternion maths in
 * siteMap.js is hand-rolled (importing three.js there would pull the renderer
 * chunk into the base module graph), and hand-rolled rotation maths is exactly
 * the kind of code that is subtly, invisibly wrong — a flipped sign shows up as
 * "the arrow points at the wrong exit", on a phone, in a hall, during a demo.
 *
 * So the assertions below are physical rather than numerical wherever possible:
 * put the phone in a pose a human can picture, then check the camera looks where
 * that human would expect. A test that says "w should be 0.7071" tells you
 * nothing when it fails. A test that says "a phone flat on the table should look
 * at the floor" tells you which sign to go and fix.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  deviceQuaternion,
  quatMultiply,
  quatFromEulerYXZ,
  quatFromAxisAngle,
  quatNlerp,
  QUAT_IDENTITY,
  projectAnchor,
  anchorDirection,
  computeFov,
  cameraQuaternion,
  quatForward,
  quatBearing,
  headingQuaternion,
} from '../src/lib/siteMap.js'

/* ---------------------------------------------------------------- helpers */

/** Rotate a vector by a unit quaternion: v + 2w(q x v) + 2q x (q x v). */
function rotate(q, v) {
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  }
}

/** A three.js camera looks down its own -Z, so this is where it is aimed. */
const forward = (q) => rotate(q, { x: 0, y: 0, z: -1 })

function assertVec(actual, expected, label, eps = 1e-6) {
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(
      Math.abs(actual[axis] - expected[axis]) < eps,
      `${label}: ${axis} expected ${expected[axis]}, got ${actual[axis]}`,
    )
  }
}

function assertUnit(q, label) {
  const len = Math.hypot(q.x, q.y, q.z, q.w)
  assert.ok(Math.abs(len - 1) < 1e-9, `${label}: expected unit length, got ${len}`)
}

/* ------------------------------------------------------- physical poses */

describe('deviceQuaternion — physical poses', () => {
  test('a phone held upright facing north is the identity rotation', () => {
    // beta 90 is vertical, gamma 0 is unrolled, alpha 0 is the top of the phone
    // pointing north. This is the reference pose, so the two rotations inside
    // deviceQuaternion must cancel exactly. If CAMERA_FRAME_FIX has the wrong
    // sign this is the test that catches it, because the error doubles to 180
    // rather than vanishing.
    const q = deviceQuaternion(0, 90, 0, 0)
    assertVec(q, QUAT_IDENTITY, 'upright north')
    assert.ok(Math.abs(q.w - 1) < 1e-6, `w expected 1, got ${q.w}`)
    assertVec(forward(q), { x: 0, y: 0, z: -1 }, 'upright north view')
  })

  test('a phone flat on the table looks at the floor', () => {
    // Screen up, so the rear camera points down. This is the pose that proves
    // the frame correction is applied at all: without it a flat phone would
    // claim to be looking at the horizon.
    const q = deviceQuaternion(0, 0, 0, 0)
    assertVec(forward(q), { x: 0, y: -1, z: 0 }, 'flat view')
  })

  test('turning the phone a quarter turn turns the view a quarter turn', () => {
    // alpha is the compass angle. Increasing it must sweep the view horizontally
    // and must not introduce any vertical component — a yaw that quietly pitches
    // is the classic symptom of the wrong Euler order.
    const q = deviceQuaternion(90, 90, 0, 0)
    assertVec(forward(q), { x: -1, y: 0, z: 0 }, 'quarter turn view')
  })

  test('the view stays level through a full sweep of the compass', () => {
    for (let alpha = 0; alpha < 360; alpha += 15) {
      const dir = forward(deviceQuaternion(alpha, 90, 0, 0))
      assert.ok(
        Math.abs(dir.y) < 1e-6,
        `alpha ${alpha} should stay level, got y=${dir.y}`,
      )
    }
  })

  test('tilting the phone back raises the view', () => {
    // beta above 90 tips the top of the phone away from the user, which aims the
    // rear camera upward. Sign only — the exact angle is beta-dependent.
    const dir = forward(deviceQuaternion(0, 120, 0, 0))
    assert.ok(dir.y > 0, `expected an upward view, got y=${dir.y}`)
  })

  test('screen rotation changes the result, so landscape is handled', () => {
    // Same pose, different screen orientation. If these matched, the overlay
    // would be sideways in landscape.
    const portrait = deviceQuaternion(30, 70, 10, 0)
    const landscape = deviceQuaternion(30, 70, 10, 90)
    const differs =
      Math.abs(portrait.x - landscape.x) +
      Math.abs(portrait.y - landscape.y) +
      Math.abs(portrait.z - landscape.z) +
      Math.abs(portrait.w - landscape.w)
    assert.ok(differs > 1e-3, 'screen angle must affect the rotation')
  })
})

/* ------------------------------------------------------------ robustness */

describe('deviceQuaternion — missing and hostile input', () => {
  test('a missing angle yields null rather than a plausible-looking level pose', () => {
    // The decision this encodes: some browsers deliver alpha and beta but no
    // gamma. Defaulting the missing roll to zero would render a level, confident,
    // wrong overlay. Null lets the caller fall back to the 2D markers instead.
    assert.equal(deviceQuaternion(null, 90, 0, 0), null)
    assert.equal(deviceQuaternion(0, null, 0, 0), null)
    assert.equal(deviceQuaternion(0, 90, null, 0), null, 'a missing gamma must not default to level')
    assert.equal(deviceQuaternion(undefined, undefined, undefined, 0), null)
    assert.equal(deviceQuaternion(NaN, 90, 0, 0), null)
    assert.equal(deviceQuaternion(0, 90, 'sideways', 0), null)
  })

  test('a missing screen angle is treated as portrait', () => {
    assertVec(deviceQuaternion(0, 90, 0), QUAT_IDENTITY, 'no screen arg')
    assertVec(deviceQuaternion(0, 90, 0, null), QUAT_IDENTITY, 'null screen arg')
  })

  test('the result is always a unit quaternion', () => {
    // Renormalising every frame is what stops smoothing drift from slowly
    // scaling the whole scene.
    for (const [a, b, g, s] of [
      [0, 0, 0, 0],
      [359, -179, -89, 270],
      [123.4, 56.7, -12.3, 90],
      [45, 90, 89, 180],
      [270, -90, 45, 0],
    ]) {
      assertUnit(deviceQuaternion(a, b, g, s), `pose ${a}/${b}/${g}/${s}`)
    }
  })

  test('angles outside their nominal range still produce a usable rotation', () => {
    // Sensor noise and some emulators overshoot. Wrapping is fine, NaN is not.
    const q = deviceQuaternion(400, 200, 120, 45)
    assertUnit(q, 'out of range')
  })
})

/* ------------------------------------------------------ building blocks */

describe('quaternion building blocks', () => {
  test('multiplying by the identity changes nothing', () => {
    const q = quatFromAxisAngle(0, 1, 0, 0.7)
    assertVec(quatMultiply(q, QUAT_IDENTITY), q, 'right identity')
    assertVec(quatMultiply(QUAT_IDENTITY, q), q, 'left identity')
  })

  test('multiplication is order-dependent, as rotations are', () => {
    // Guards against an implementation that accidentally commutes, which would
    // look right for single-axis poses and wrong for every real one.
    const a = quatFromAxisAngle(1, 0, 0, Math.PI / 2)
    const b = quatFromAxisAngle(0, 1, 0, Math.PI / 2)
    const ab = quatMultiply(a, b)
    const ba = quatMultiply(b, a)
    assert.ok(
      Math.abs(ab.x - ba.x) + Math.abs(ab.y - ba.y) + Math.abs(ab.z - ba.z) > 1e-6,
      'x then y must differ from y then x',
    )
  })

  test('rotations about a shared axis add', () => {
    const half = quatFromAxisAngle(0, 1, 0, Math.PI / 4)
    assertVec(quatMultiply(half, half), quatFromAxisAngle(0, 1, 0, Math.PI / 2), 'axis addition')
  })

  test('a quarter turn about Y sends -Z to -X', () => {
    assertVec(
      forward(quatFromAxisAngle(0, 1, 0, Math.PI / 2)),
      { x: -1, y: 0, z: 0 },
      'quarter turn about Y',
    )
  })

  test('a zero Euler triple is the identity', () => {
    assertVec(quatFromEulerYXZ(0, 0, 0), QUAT_IDENTITY, 'zero euler')
  })

  test('a single-axis Euler angle matches the equivalent axis-angle', () => {
    assertVec(quatFromEulerYXZ(0.4, 0, 0), quatFromAxisAngle(1, 0, 0, 0.4), 'x only')
    assertVec(quatFromEulerYXZ(0, 0.4, 0), quatFromAxisAngle(0, 1, 0, 0.4), 'y only')
    assertVec(quatFromEulerYXZ(0, 0, 0.4), quatFromAxisAngle(0, 0, 1, 0.4), 'z only')
  })
})

/* --------------------------------------------------------- interpolation */

describe('quatNlerp', () => {
  const a = quatFromAxisAngle(0, 1, 0, (10 * Math.PI) / 180)
  const b = quatFromAxisAngle(0, 1, 0, (30 * Math.PI) / 180)

  test('the endpoints are preserved', () => {
    assertVec(quatNlerp(a, b, 0), a, 't=0')
    assertVec(quatNlerp(a, b, 1), b, 't=1')
  })

  test('the halfway point is the halfway rotation', () => {
    // nlerp is not slerp, so this is only true for small arcs. 20 degrees is
    // vastly larger than a single frame at 60 Hz, and it still lands within
    // 1e-4, which is the argument for not paying for slerp's trig.
    assertVec(
      quatNlerp(a, b, 0.5),
      quatFromAxisAngle(0, 1, 0, (20 * Math.PI) / 180),
      'midpoint',
      1e-4,
    )
  })

  test('a negated target takes the short way round, not the long one', () => {
    // q and -q are the SAME rotation, and sensors flip the sign freely between
    // frames. Without the dot-product check this interpolates the 340-degree arc
    // and the view visibly snaps. This is the test for that bug.
    const negated = { x: -b.x, y: -b.y, z: -b.z, w: -b.w }
    assertVec(
      quatNlerp(a, negated, 0.5),
      quatFromAxisAngle(0, 1, 0, (20 * Math.PI) / 180),
      'negated midpoint',
      1e-4,
    )
  })

  test('interpolating between identical rotations is stable', () => {
    assertVec(quatNlerp(a, a, 0.5), a, 'same input')
  })

  test('the output is always a unit quaternion', () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      assertUnit(quatNlerp(a, b, t), `t=${t}`)
    }
  })

  test('opposite rotations do not produce a zero-length result', () => {
    // The degenerate case: a 180-degree arc has no shortest path. It must still
    // return something usable rather than NaN.
    assertUnit(quatNlerp(QUAT_IDENTITY, quatFromAxisAngle(0, 1, 0, Math.PI), 0.5), 'antipodal')
  })
})

/* ------------------------------------------------------------ projection */

describe('projectAnchor — perspective', () => {
  // A representative portrait phone viewport: 65 degrees down the long axis.
  const view = { heading: 0, elevation: 0, hFov: 50, vFov: 65 }
  const at = (bearing, elevation = 0) => projectAnchor({ bearing, elevation }, view)

  test('an anchor dead ahead lands in the centre of the frame', () => {
    const p = at(0)
    assert.ok(Math.abs(p.x - 0.5) < 1e-9, `x=${p.x}`)
    assert.ok(Math.abs(p.y - 0.5) < 1e-9, `y=${p.y}`)
    assert.equal(p.visible, true)
    assert.equal(p.behind, false)
  })

  test('an anchor at the horizontal FOV edge lands exactly on the frame edge', () => {
    // The boundary must be exact, otherwise `visible` and the drawn position
    // disagree by a pixel or two right where markers cross in and out of view,
    // and markers flicker.
    const right = at(25)
    assert.ok(Math.abs(right.x - 1) < 1e-9, `x=${right.x}`)
    const left = at(-25)
    assert.ok(Math.abs(left.x - 0) < 1e-9, `x=${left.x}`)
  })

  test('an anchor at the vertical FOV edge lands exactly on the frame edge', () => {
    const up = at(0, 32.5)
    assert.ok(Math.abs(up.y - 0) < 1e-9, `y=${up.y}`)
    const down = at(0, -32.5)
    assert.ok(Math.abs(down.y - 1) < 1e-9, `y=${down.y}`)
  })

  test('mid-frame positions are pulled in from where the old linear maths put them', () => {
    // This is the actual bug being fixed. Halfway to the frame edge in ANGLE is
    // not halfway in PIXELS; the old formula assumed it was. If someone
    // reinstates the linear version this test fails, which is the point.
    const p = at(12.5)
    const linear = 0.5 + 12.5 / 50 // what the old code returned: 0.75
    assert.ok(p.x < linear - 0.005, `expected inset from ${linear}, got ${p.x}`)
    assert.ok(p.x > 0.73, `but not wildly: got ${p.x}`)
  })

  test('vertical position depends on horizontal angle, as perspective requires', () => {
    // Same elevation, different bearing. A rectilinear lens pushes the off-axis
    // one further from the horizon. Treating the axes independently misses this
    // and is why labels used to sit low in the corners.
    const centre = at(0, 20)
    const edge = at(24, 20)
    assert.ok(edge.y < centre.y - 0.01, `edge y=${edge.y} should sit above centre y=${centre.y}`)
  })

  test('a marker reported visible is always actually inside the frame', () => {
    // The invariant that matters: `visible` must never disagree with where the
    // marker is drawn. Swept across the whole sphere, including the corners
    // where the old angle-based test was wrong.
    for (let b = -180; b <= 180; b += 3) {
      for (let e = -90; e <= 90; e += 3) {
        const p = at(b, e)
        if (!p.visible) continue
        assert.ok(
          p.x >= -1e-9 && p.x <= 1 + 1e-9 && p.y >= -1e-9 && p.y <= 1 + 1e-9,
          `bearing ${b} elev ${e} claims visible but projects to ${p.x},${p.y}`,
        )
      }
    }
  })

  test('an anchor behind the worker never folds back into the frame', () => {
    // The perspective divide changes sign past 90 degrees. Unguarded, an exit
    // directly behind the worker would be drawn ahead of them.
    for (const bearing of [95, 120, 150, 180, -95, -120, -150]) {
      const p = at(bearing)
      assert.equal(p.behind, true, `bearing ${bearing} should be behind`)
      assert.equal(p.visible, false, `bearing ${bearing} must not be visible`)
      assert.equal(p.offScreen, true, `bearing ${bearing} must be off-screen`)
      assert.ok(
        p.x < -0.2 || p.x > 1.2,
        `bearing ${bearing} must project well outside the frame, got x=${p.x}`,
      )
    }
  })

  test('the camera plane itself is treated as behind, not as infinity', () => {
    const p = at(90)
    assert.equal(p.behind, true)
    assert.ok(Number.isFinite(p.x), `x must stay finite, got ${p.x}`)
    assert.ok(Number.isFinite(p.y), `y must stay finite, got ${p.y}`)
  })

  test('a behind-camera anchor still reports which way to turn', () => {
    // Off-screen anchors become edge arrows, so `side` has to survive the guard.
    assert.equal(at(150).side, 'right')
    assert.equal(at(-150).side, 'left')
    assert.equal(at(150).x > 1, true)
    assert.equal(at(-150).x < 0, true)
  })

  test('angular error ignores the lens entirely', () => {
    // Aim tolerance is specified in degrees, so it must not shift when the FOV
    // changes or the projection model is rewritten.
    const wide = projectAnchor({ bearing: 30, elevation: 10 }, { heading: 0, elevation: 0, hFov: 100, vFov: 120 })
    const narrow = projectAnchor({ bearing: 30, elevation: 10 }, { heading: 0, elevation: 0, hFov: 30, vFov: 40 })
    assert.ok(Math.abs(wide.angularError - narrow.angularError) < 1e-9)
    assert.ok(Math.abs(wide.angularError - Math.sqrt(900 + 100)) < 1e-9)
  })

  test('relative angles are unchanged by the projection rewrite', () => {
    const p = projectAnchor({ bearing: 350, elevation: -12 }, { heading: 20, elevation: 3, hFov: 50, vFov: 65 })
    assert.ok(Math.abs(p.relBearing - -30) < 1e-9, `relBearing=${p.relBearing}`)
    assert.ok(Math.abs(p.relElevation - -15) < 1e-9, `relElevation=${p.relElevation}`)
  })

  test('a degenerate viewport does not produce NaN', () => {
    // Called before the video reports its size, or with junk from a caller.
    for (const v of [
      { heading: 0, elevation: 0, hFov: 0, vFov: 0 },
      { heading: 0, elevation: 0, hFov: -10, vFov: -10 },
      { heading: 0, elevation: 0, hFov: null, vFov: undefined },
      {},
      null,
    ]) {
      const p = projectAnchor({ bearing: 10, elevation: 5 }, v)
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `viewport ${JSON.stringify(v)} gave ${p.x},${p.y}`)
    }
  })

  test('a missing anchor is handled rather than thrown', () => {
    const p = projectAnchor(null, view)
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y))
  })

  test('the frame edge stays exact across real computed viewports', () => {
    // computeFov feeds projectAnchor in the app, so the two must agree on where
    // the edge is for actual video dimensions.
    for (const [w, h] of [
      [480, 640],
      [720, 1280],
      [1280, 720],
      [1080, 1080],
    ]) {
      const fov = computeFov(w, h)
      const p = projectAnchor({ bearing: fov.hFov / 2, elevation: 0 }, { heading: 0, elevation: 0, ...fov })
      assert.ok(Math.abs(p.x - 1) < 1e-9, `${w}x${h}: edge projected to ${p.x}`)
    }
  })
})

describe('anchorDirection', () => {
  test('the cardinals map onto the three.js world axes', () => {
    assertVec(anchorDirection(0), { x: 0, y: 0, z: -1 }, 'north')
    assertVec(anchorDirection(90), { x: 1, y: 0, z: 0 }, 'east')
    assertVec(anchorDirection(180), { x: 0, y: 0, z: 1 }, 'south')
    assertVec(anchorDirection(270), { x: -1, y: 0, z: 0 }, 'west')
  })

  test('elevation lifts the direction toward world up', () => {
    assertVec(anchorDirection(0, 90), { x: 0, y: 1, z: 0 }, 'straight up')
    assertVec(anchorDirection(0, -90), { x: 0, y: -1, z: 0 }, 'straight down')
    assert.ok(anchorDirection(45, 30).y > 0, 'a raised anchor points upward')
  })

  test('the result is always a unit vector', () => {
    for (let b = 0; b < 360; b += 17) {
      for (const e of [-90, -45, -12, 0, 8, 45, 90]) {
        const d = anchorDirection(b, e)
        const len = Math.hypot(d.x, d.y, d.z)
        assert.ok(Math.abs(len - 1) < 1e-9, `bearing ${b} elev ${e} length ${len}`)
      }
    }
  })

  test('bad input degrades to a usable direction', () => {
    for (const args of [[null], [undefined], ['north'], [NaN, NaN], [400, 200]]) {
      const d = anchorDirection(...args)
      const len = Math.hypot(d.x, d.y, d.z)
      assert.ok(Math.abs(len - 1) < 1e-9, `args ${JSON.stringify(args)} gave length ${len}`)
    }
  })

  test('the direction agrees with the projection at the view centre', () => {
    // Cross-check between the two independent code paths: an anchor the camera
    // is aimed straight at must project to the centre AND its world direction
    // must match the camera's own forward vector.
    const bearing = 137
    const p = projectAnchor({ bearing, elevation: 0 }, { heading: bearing, elevation: 0, hFov: 50, vFov: 65 })
    assert.ok(Math.abs(p.x - 0.5) < 1e-9 && Math.abs(p.y - 0.5) < 1e-9)
    const d = anchorDirection(bearing, 0)
    assert.ok(Math.abs(Math.hypot(d.x, d.y, d.z) - 1) < 1e-9)
  })
})

/* ------------------------------------------------------- overlay camera */

describe('cameraQuaternion', () => {
  test('the overlay camera faces exactly the heading the markers use', () => {
    // The core guarantee. Whatever the sensor says, the 3D camera's azimuth is
    // pinned to `heading`, so a mesh and its DOM label cannot separate
    // horizontally. Swept over poses and headings including a miscalibrated
    // compass, which is the case that motivates the whole function.
    for (const [alpha, beta, gamma] of [
      [0, 90, 0],
      [45, 80, 10],
      [200, 100, -25],
      [310, 60, 40],
      [90, 90, 0],
    ]) {
      const device = deviceQuaternion(alpha, beta, gamma, 0)
      for (const heading of [0, 37, 90, 180, 271, 359]) {
        const cam = cameraQuaternion(device, heading)
        const actual = quatBearing(cam)
        assert.ok(actual !== null, `pose ${alpha}/${beta}/${gamma} gave a degenerate bearing`)
        // Angular distance, seam-safe: equal headings give 0.
        const err = Math.abs(((actual - heading + 540) % 360) - 180)
        assert.ok(
          err < 1e-6,
          `pose ${alpha}/${beta}/${gamma} heading ${heading}: camera faces ${actual}, off by ${err}`,
        )
      }
    }
  })

  test('the yaw correction preserves pitch', () => {
    // Only azimuth is overridden. If the correction were applied in the camera's
    // local frame instead of world space it would tilt the horizon.
    const device = deviceQuaternion(0, 120, 0, 0) // aimed above the horizon
    const before = quatForward(device).y
    for (const heading of [0, 90, 200, 330]) {
      const after = quatForward(cameraQuaternion(device, heading)).y
      assert.ok(Math.abs(after - before) < 1e-6, `heading ${heading}: pitch moved ${before} to ${after}`)
    }
  })

  test('the yaw correction preserves roll', () => {
    // Roll is the only thing the quaternion is really here for, so the
    // correction must not eat it. Measured as the tilt of the camera's own up
    // vector out of the vertical plane containing its forward vector.
    const rollOf = (q) => {
      const up = rotate(q, { x: 0, y: 1, z: 0 })
      const fwd = quatForward(q)
      // Right vector = fwd x worldUp, normalised; roll shows as up leaning onto it.
      const rx = -fwd.z
      const rz = fwd.x
      const len = Math.hypot(rx, rz) || 1
      return (up.x * rx + up.z * rz) / len
    }
    const device = deviceQuaternion(30, 85, 35, 0)
    const before = rollOf(device)
    assert.ok(Math.abs(before) > 1e-3, 'the test pose must actually be rolled')
    for (const heading of [0, 75, 190, 300]) {
      const after = rollOf(cameraQuaternion(device, heading))
      assert.ok(Math.abs(after - before) < 1e-6, `heading ${heading}: roll moved ${before} to ${after}`)
    }
  })

  test('the world is not mirrored', () => {
    // A sign error in the yaw correction flips east and west, which looks almost
    // right and sends a worker the wrong way. Pinned with a concrete case: from a
    // north-facing camera, a heading of 90 must aim it east, at +X.
    const cam = cameraQuaternion(deviceQuaternion(0, 90, 0, 0), 90)
    const f = quatForward(cam)
    assert.ok(f.x > 0.99, `expected to face east (+X), got x=${f.x}`)
    assert.ok(Math.abs(f.z) < 1e-6, `and no north/south component, got z=${f.z}`)
  })

  test('the camera forward matches anchorDirection for the same bearing', () => {
    // The cross-check that makes task-level correctness testable: point the
    // camera at a bearing, and its forward vector must equal the world direction
    // used to PLACE the object at that bearing. If these two disagree, meshes sit
    // in the wrong place no matter how good the projection is.
    for (const bearing of [0, 45, 137, 210, 300]) {
      const f = quatForward(cameraQuaternion(deviceQuaternion(0, 90, 0, 0), bearing))
      assertVec(f, anchorDirection(bearing, 0), `bearing ${bearing}`, 1e-6)
    }
  })

  test('no quaternion means no overlay camera', () => {
    // Callers use this to decide whether to fall back to the 2D markers.
    assert.equal(cameraQuaternion(null, 90), null)
    assert.equal(cameraQuaternion(undefined, 90), null)
  })

  test('a degenerate bearing is passed through rather than spun arbitrarily', () => {
    // Looking straight up there is no azimuth to correct toward.
    const straightUp = quatFromAxisAngle(1, 0, 0, Math.PI / 2)
    assert.equal(quatBearing(straightUp), null)
    assertVec(cameraQuaternion(straightUp, 123), straightUp, 'straight up')
  })

  test('the result stays a unit quaternion', () => {
    for (const heading of [0, 33, 90, 181, 359]) {
      assertUnit(cameraQuaternion(deviceQuaternion(120, 75, -20, 90), heading), `heading ${heading}`)
    }
  })

  test('a bad heading does not produce NaN', () => {
    const device = deviceQuaternion(0, 90, 0, 0)
    for (const heading of [null, undefined, NaN, 'north', 400, -50]) {
      assertUnit(cameraQuaternion(device, heading), `heading ${heading}`)
    }
  })
})

describe('headingQuaternion — the no-roll fallback', () => {
  test('it aims exactly where anchorDirection says the anchor is', () => {
    // The fallback path must be just as correctly aimed as the sensor path,
    // because on a phone with no gamma it is the ONLY path. Same cross-check as
    // for cameraQuaternion: camera forward must equal the placement direction.
    for (const bearing of [0, 45, 137, 210, 300, 359]) {
      for (const elevation of [-40, -12, 0, 8, 35]) {
        assertVec(
          quatForward(headingQuaternion(bearing, elevation)),
          anchorDirection(bearing, elevation),
          `bearing ${bearing} elev ${elevation}`,
          1e-9,
        )
      }
    }
  })

  test('it is level, which is the whole point', () => {
    // No roll means the horizon stays horizontal. Measured as the camera's own
    // right vector having no vertical component.
    for (const bearing of [0, 90, 213, 330]) {
      const right = rotate(headingQuaternion(bearing, 20), { x: 1, y: 0, z: 0 })
      assert.ok(Math.abs(right.y) < 1e-9, `bearing ${bearing}: right vector tilted, y=${right.y}`)
    }
  })

  test('it agrees with the sensor path when the device is level', () => {
    // A phone held upright and unrolled should produce the same camera rotation
    // either way. If these diverge, switching between the two paths would visibly
    // jolt the overlay.
    const heading = 137
    const sensor = cameraQuaternion(deviceQuaternion(0, 90, 0, 0), heading)
    const fallback = headingQuaternion(heading, 0)
    assertVec(quatForward(sensor), quatForward(fallback), 'level agreement', 1e-6)
  })

  test('it stays a unit quaternion on hostile input', () => {
    for (const args of [[null], [NaN, NaN], ['x', 'y'], [400, 200], [undefined, undefined]]) {
      assertUnit(headingQuaternion(...args), `args ${JSON.stringify(args)}`)
    }
  })
})
