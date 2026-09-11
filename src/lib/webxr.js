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
