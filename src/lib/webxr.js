/*
 * WebXR immersive-AR: real tracking, real distance, real occlusion.
 *
 * WHAT THIS ADDS OVER THE COMPASS OVERLAY
 *
 * The existing AR view anchors markers to a magnetic bearing and an elevation. That
 * is honest and it works on almost any phone, but it has three hard limits: an
 * anchor is a direction with no distance, nothing occludes behind a real wall, and
 * walking twenty metres invalidates everything because the bearings were recorded
 * from where the supervisor stood.
 *
 * WebXR's immersive-ar session on Chrome for Android is backed by ARCore. That gives
 * six-degree-of-freedom tracking, `hit-test` against real surfaces so a tapped
 * anchor has a genuine position, and `depth-sensing` — the actual ARCore Depth API —
 * so virtual objects can be hidden behind real geometry. All three of the limits
 * above are addressable through a standard browser API with no plugin and no native
 * build.
 *
 * WHAT IT STILL CANNOT DO, AND THE HONEST SUBSTITUTE
 *
 * Persistence. ARCore Cloud Anchors are what let two phones agree on a point in a
 * room across sessions, and there is NO web binding for them — they are an Android,
 * NDK and Unity SDK service. WebXR's own `anchors` module is session-scoped: end the
 * session and the anchors are gone.
 *
 * Even natively they would be a poor fit here. A Cloud Anchor created with an API key
 * has a documented maximum lifetime of 24 hours, so a "one-time site setup" becomes a
 * hosted subscription; and the service works by uploading camera imagery and device
 * poses to Google, which is difficult to square with a product whose premise is that
 * nothing leaves the device.
 *
 * So persistence is done with a printed marker and two taps. A supervisor fixes a
 * QR plate at a known spot in the zone, taps it, then taps a second reference point
 * to establish which way is "forward". Every anchor is then stored in THAT frame
 * rather than in the session's arbitrary origin. A worker arriving later performs the
 * same two taps and their session lands on the same coordinates. Offline,
 * cross-device, no cloud, nothing uploaded — and the accuracy is bounded by how
 * carefully the two points are tapped, which a supervisor can see and correct.
 *
 * VERIFICATION STATUS, STATED PLAINLY
 *
 * The maths in this module is unit-tested. The session handling is NOT — it needs an
 * ARCore device, and module support varies per handset and must be feature-detected
 * at runtime. It is built behind a capability probe with the compass overlay intact
 * as the fallback, so a device that cannot run it loses nothing.
 */

/* ================================================================== */
/* Capability                                                          */
/* ================================================================== */

export const XR_BLOCK = {
  /** No navigator.xr at all: not Chromium, or an old build. */
  UNSUPPORTED: 'XR_UNSUPPORTED',
  /** WebXR requires a secure context, exactly as getUserMedia does. */
  INSECURE_CONTEXT: 'XR_INSECURE_CONTEXT',
  /** navigator.xr exists but immersive-ar is not offered — typically desktop. */
  NO_IMMERSIVE_AR: 'XR_NO_IMMERSIVE_AR',
  /** No WebGL, so nothing could be drawn even if a session started. */
  NO_WEBGL: 'XR_NO_WEBGL',
}

export const XR_BLOCK_KEYS = {
  [XR_BLOCK.UNSUPPORTED]: 'xr_block_unsupported',
  [XR_BLOCK.INSECURE_CONTEXT]: 'xr_block_insecure',
  [XR_BLOCK.NO_IMMERSIVE_AR]: 'xr_block_no_session',
  [XR_BLOCK.NO_WEBGL]: 'xr_block_no_webgl',
}

/**
 * Synchronous, cheap pre-check.
 *
 * Deliberately separate from the async probe: this is safe to call during render to
 * decide whether to show an "enter AR" control at all, whereas
 * `immersiveArSupported()` performs real work and must not run on every render.
 */
export function xrBlocker() {
  try {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return XR_BLOCK.UNSUPPORTED
    // Same requirement, same reason as the camera: no secure context, no sensors.
    if (typeof window.isSecureContext === 'boolean' && !window.isSecureContext) {
      return XR_BLOCK.INSECURE_CONTEXT
    }
    if (!navigator.xr || typeof navigator.xr.isSessionSupported !== 'function') {
      return XR_BLOCK.UNSUPPORTED
    }
    return null
  } catch {
    return XR_BLOCK.UNSUPPORTED
  }
}

/**
 * Does this device actually offer an immersive-ar session?
 *
 * Cached, because `isSessionSupported` is not free and the answer cannot change
 * within a page load.
 */
let immersiveArCache = null

export async function immersiveArSupported() {
  if (immersiveArCache !== null) return immersiveArCache
  if (xrBlocker()) {
    immersiveArCache = false
    return immersiveArCache
  }
  try {
    immersiveArCache = await navigator.xr.isSessionSupported('immersive-ar')
  } catch {
    // Some builds throw rather than resolving false.
    immersiveArCache = false
  }
  return immersiveArCache
}

/* ================================================================== */
/* Session configuration                                               */
/* ================================================================== */

/**
 * Options for requestSession('immersive-ar').
 *
 * `hit-test` is the only REQUIRED feature, because without it nothing can be placed
 * and the mode has no purpose. Everything else is optional and probed at runtime:
 *
 *   anchors        lets ARCore keep a placed point stable as its understanding of
 *                  the room improves. Without it we hold a plain position, which
 *                  drifts slightly but still works.
 *   depth-sensing  the occlusion win. Widely unavailable, so never required.
 *   dom-overlay    lets the existing DOM UI render over the session, which is what
 *                  keeps the drill controls, labels and live regions usable inside
 *                  XR instead of having to rebuild them as geometry.
 *   light-estimation  matches scene lighting to the room.
 *
 * Requiring any of these would turn a device that supports three of the four into a
 * device that supports none.
 */
export function immersiveArSessionInit({ domOverlayRoot = null } = {}) {
  const init = {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['anchors', 'depth-sensing', 'light-estimation', 'local-floor'],
    // Requested even though it is optional: preference order matters when a device
    // supports more than one representation.
    depthSensing: {
      usagePreference: ['gpu-optimized', 'cpu-optimized'],
      dataFormatPreference: ['luminance-alpha', 'float32'],
    },
  }
  if (domOverlayRoot) {
    init.optionalFeatures.push('dom-overlay')
    init.domOverlay = { root: domOverlayRoot }
  }
  return init
}

/** Which optional features a live session actually granted. */
export function grantedFeatures(session) {
  const enabled = session?.enabledFeatures
  if (!Array.isArray(enabled)) {
    /*
     * enabledFeatures is not universally implemented. Reporting "unknown" rather
     * than "none" matters: the caller must not disable occlusion just because it
     * could not confirm it, nor claim it because it asked for it.
     */
    return { known: false, hitTest: true, anchors: false, depth: false, domOverlay: false, light: false }
  }
  return {
    known: true,
    hitTest: enabled.includes('hit-test'),
    anchors: enabled.includes('anchors'),
    depth: enabled.includes('depth-sensing'),
    domOverlay: enabled.includes('dom-overlay'),
    light: enabled.includes('light-estimation'),
  }
}

/* ================================================================== */
/* The site frame — how anchors survive a session ending               */
/* ================================================================== */

/*
 * Minimum separation between the two alignment taps, in metres.
 *
 * The direction tap defines the frame's heading, and the shorter the baseline the
 * more a small tapping error rotates the whole zone. At half a metre a two-centimetre
 * slip is over two degrees of yaw, which is metres of error at the far end of a
 * roadway. Two metres keeps the same slip under a degree.
 */
export const MIN_ALIGNMENT_BASELINE_M = 2

export const ALIGN_ERROR = {
  TOO_CLOSE: 'ALIGN_TOO_CLOSE',
  INVALID: 'ALIGN_INVALID',
}

const finite = (n) => typeof n === 'number' && Number.isFinite(n)
const isPoint = (p) => !!p && finite(p.x) && finite(p.y) && finite(p.z)

/**
 * Build a persistent site frame from two tapped points.
 *
 * `origin` is the marker plate. `direction` is any second point the supervisor can
 * find again — the far corner of the same doorway, a painted floor mark, the next
 * roof bolt. The frame's -Z axis points from origin toward direction, matching the
 * convention used everywhere else in this codebase (bearing 0 is -Z, so a local
 * -Z offset reads as "straight ahead down the roadway").
 *
 * Only yaw is derived. Pitch and roll are deliberately NOT taken from the two
 * points: the frame's up axis is world up, which ARCore already knows from gravity
 * far more accurately than two finger taps could establish it.
 *
 * @returns { origin, yaw, baseline } or { error }
 */
export function siteFrameFrom(origin, direction) {
  if (!isPoint(origin) || !isPoint(direction)) return { error: ALIGN_ERROR.INVALID }

  const dx = direction.x - origin.x
  const dz = direction.z - origin.z
  // Horizontal separation only: a direction point on a wall above the marker says
  // nothing about heading, and including dy would let it pretend it did.
  const baseline = Math.hypot(dx, dz)
  if (!(baseline >= MIN_ALIGNMENT_BASELINE_M)) return { error: ALIGN_ERROR.TOO_CLOSE, baseline }

  return {
    origin: { x: origin.x, y: origin.y, z: origin.z },
    // atan2(x, -z): the same expression as quatBearing, so a frame yaw and a compass
    // bearing mean the same thing and can be compared directly.
    yaw: Math.atan2(dx / baseline, -dz / baseline),
    baseline,
  }
}

/** A world point expressed in the site frame. Safe to persist. */
export function worldToSite(point, frame) {
  if (!isPoint(point) || !frame?.origin) return null
  const vx = point.x - frame.origin.x
  const vy = point.y - frame.origin.y
  const vz = point.z - frame.origin.z
  const c = Math.cos(frame.yaw)
  const s = Math.sin(frame.yaw)
  return {
    x: vx * c + vz * s,
    y: vy,
    z: -vx * s + vz * c,
  }
}

/** The inverse: a stored site coordinate back into this session's world. */
export function siteToWorld(local, frame) {
  if (!isPoint(local) || !frame?.origin) return null
  const c = Math.cos(frame.yaw)
  const s = Math.sin(frame.yaw)
  return {
    x: frame.origin.x + local.x * c - local.z * s,
    y: frame.origin.y + local.y,
    z: frame.origin.z + local.x * s + local.z * c,
  }
}

/**
 * Compass bearing of a site-frame point, 0..360.
 *
 * The bridge to the existing anchor model: an anchor placed by hit-test has a real
 * position, and this derives the bearing field the compass overlay and every existing
 * test already understand. So a zone scanned in XR still works on a phone that cannot
 * run XR, which is what keeps the two modes from splitting the product in half.
 */
export function siteBearing(local, frame) {
  if (!isPoint(local)) return null
  const world = siteToWorld(local, frame || { origin: { x: 0, y: 0, z: 0 }, yaw: 0 })
  if (!world) return null
  const dx = world.x - (frame?.origin?.x || 0)
  const dz = world.z - (frame?.origin?.z || 0)
  if (Math.hypot(dx, dz) < 1e-6) return null
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI
  return ((deg % 360) + 360) % 360
}

/** Elevation of a site-frame point as seen from the frame origin, in degrees. */
export function siteElevation(local) {
  if (!isPoint(local)) return null
  const horizontal = Math.hypot(local.x, local.z)
  if (horizontal < 1e-6) return local.y >= 0 ? 90 : -90
  return (Math.atan2(local.y, horizontal) * 180) / Math.PI
}

/* ================================================================== */
/* Placement accuracy                                                  */
/* ================================================================== */

/*
 * How many recent hit-test samples are considered before a placement is allowed.
 *
 * A hit-test pose is not a measurement, it is an estimate that is re-derived every
 * frame, and it visibly jitters and snaps between surfaces. The first version of this
 * captured whichever single frame happened to coincide with the worker's finger, which
 * means the accuracy of every anchor was decided by a coin toss. Twelve samples is
 * roughly two thirds of a second of evidence at the rate results arrive.
 */
export const PLACEMENT_SAMPLES = 12

/*
 * How far the samples may wander and still count as a stable aim, in metres.
 *
 * Three centimetres is comfortably inside what a well-lit textured floor produces and
 * comfortably outside what a blank wall or a dark roadway produces — which is the
 * distinction worth enforcing, because a featureless surface is exactly where a
 * confident-looking reticle is least trustworthy.
 */
export const PLACEMENT_STABLE_M = 0.03

/**
 * Component-wise median of a set of points.
 *
 * Median rather than mean, deliberately. Hit-testing does not fail by adding noise
 * evenly around the truth; it fails by occasionally snapping to a completely different
 * surface — the far wall behind a doorway, or the floor beyond a machine. A mean drags
 * the result toward those outliers, a median ignores them until they are the majority.
 *
 * This is the component-wise median rather than the geometric median, which is not the
 * same thing. For a tight cluster of samples the difference is far below the tracking
 * error, and the geometric median needs iteration this does not justify.
 */
export function medianPoint(points) {
  const usable = (points || []).filter(isPoint)
  if (!usable.length) return null

  const pick = (axis) => {
    const sorted = usable.map((p) => p[axis]).sort((a, b) => a - b)
    const mid = sorted.length >> 1
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  return { x: pick('x'), y: pick('y'), z: pick('z') }
}

/** Largest distance from any sample to the median, in metres. */
export function pointSpread(points) {
  const centre = medianPoint(points)
  if (!centre) return Number.POSITIVE_INFINITY
  let worst = 0
  for (const p of points) {
    if (!isPoint(p)) continue
    const d = Math.hypot(p.x - centre.x, p.y - centre.y, p.z - centre.z)
    if (d > worst) worst = d
  }
  return worst
}

/**
 * Is the aim steady enough to place an anchor, and where would it land?
 *
 * Reported rather than merely enforced, so the interface can say "hold still" instead
 * of leaving a disabled button with no explanation. A worker who cannot tell the
 * difference between "not ready yet" and "broken" assumes broken.
 */
export function placementReadiness(points) {
  const samples = (points || []).filter(isPoint)
  if (samples.length < PLACEMENT_SAMPLES) {
    return { ready: false, reason: 'SAMPLING', point: null, spread: null, samples: samples.length }
  }
  const spread = pointSpread(samples)
  if (spread > PLACEMENT_STABLE_M) {
    return { ready: false, reason: 'UNSTEADY', point: null, spread, samples: samples.length }
  }
  return { ready: true, reason: null, point: medianPoint(samples), spread, samples: samples.length }
}

export const TRACKING = {
  /** No viewer pose at all: the session cannot say where the device is. */
  NONE: 'NONE',
  /** Rotation only. The position is guessed, so any placement would be fiction. */
  LIMITED: 'LIMITED',
  GOOD: 'GOOD',
}

/**
 * How much the session actually knows about where the device is.
 *
 * `emulatedPosition` is the flag that matters and it is easy to miss: it means the
 * runtime is reporting orientation but INVENTING position. A reticle still draws, a
 * tap still works, and the resulting anchor is meaningless. Placement is refused in
 * that state rather than recording a number that looks like a measurement.
 */
export function trackingQuality(viewerPose) {
  if (!viewerPose) return TRACKING.NONE
  if (viewerPose.emulatedPosition === true) return TRACKING.LIMITED
  return TRACKING.GOOD
}

/**
 * Yaw error the site frame inherits from an imprecise second tap, in degrees.
 *
 * The two-tap alignment converts a tapping error into a ROTATION of the entire zone,
 * and the shorter the baseline the worse the conversion. This makes that trade
 * explicit so the interface can quote it rather than implying the alignment is exact.
 *
 * @param baseline  horizontal separation of the two taps, metres
 * @param tapError  assumed positional error of a tap, metres
 */
export function alignmentYawErrorDeg(baseline, tapError = PLACEMENT_STABLE_M) {
  const b = toFinite(baseline)
  const e = toFinite(tapError)
  if (b === null || e === null || b <= 0) return null
  return (Math.atan2(Math.abs(e), b) * 180) / Math.PI
}

/**
 * Worst-case lateral error at a given distance, in metres, from that yaw error.
 *
 * The number a supervisor can act on. "Half a degree" means nothing; "your markers
 * could be twenty centimetres out at the far end of the roadway" means they should
 * either accept it or walk further apart and re-align.
 */
export function alignmentErrorAtDistance(baseline, distanceM, tapError = PLACEMENT_STABLE_M) {
  const yaw = alignmentYawErrorDeg(baseline, tapError)
  const d = toFinite(distanceM)
  if (yaw === null || d === null || d < 0) return null
  return d * Math.tan((yaw * Math.PI) / 180)
}

const toFinite = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null)

/** Straight-line distance from the frame origin, in metres. */
export function siteDistance(local) {
  if (!isPoint(local)) return null
  return Math.hypot(local.x, local.y, local.z)
}

/**
 * Read a hit-test result's position out of an XRPose.
 *
 * Kept here rather than inline so the component does not need to know the shape of
 * the WebXR objects, and so the null handling is in one place: getPose returns null
 * whenever tracking is momentarily lost, which happens constantly in practice and
 * must never throw.
 */
export function poseToPoint(pose) {
  const p = pose?.transform?.position
  if (!p || !finite(p.x) || !finite(p.y) || !finite(p.z)) return null
  return { x: p.x, y: p.y, z: p.z }
}
