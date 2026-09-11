// Site-scan AR: anchoring hazards to real directions in a real workplace.
//
// WHAT THIS IS, AND WHAT IT ISN'T.
//
// The native design for this used ARCore's Depth API plus Persistent Cloud
// Anchors to build a spatial mesh of a corridor. We do not have that in a
// browser. What we do have is the phone's magnetometer and accelerometer, which
// give us where the rear camera is *pointing* — heading and elevation.
//
// So an anchor here is a DIRECTION, not a 3D point: the supervisor aims the
// phone at the real exit and taps, and we store the compass bearing and
// elevation of that sighting. During a drill the marker is reprojected at that
// bearing, so as the worker turns, the exit marker stays over the real exit.
//
// That gets the property that actually matters for training — "the exit is to
// my left past the second pillar" is learned in the real corridor, against the
// real geometry. What it does not get: occlusion, depth, or survival across
// large translation. Those need ARCore. docs/ARCHITECTURE.md §9.1 says so.
//
// The magnetometer caveat is real and worth stating: steel plants and mine
// shafts distort magnetic heading. We detect when absolute heading is
// unavailable, fall back to gyro-relative mode with an explicit re-centre
// control, and tell the user which mode they're in rather than silently
// showing them markers in the wrong place.

import { STORE, idbGet, idbPut, idbGetAll, idbDelete } from './idb.js'
import { randomId } from './crypto.js'
import { getActiveSiteId, DEFAULT_SITE_ID } from './identity.js'
import { toFiniteNumber, toNumberOr, clamp } from './num.js'
import { secureContext } from './arSupport.js'

/* ================================================================== */
/* Anchor vocabulary                                                   */
/* ================================================================== */

export const ANCHOR_TYPE = {
  EXIT: 'EXIT',
  EXTINGUISHER: 'EXTINGUISHER',
  ASSEMBLY_POINT: 'ASSEMBLY_POINT',
  FIRST_AID: 'FIRST_AID',
  GAS_ZONE: 'GAS_ZONE',
  LOTO_PANEL: 'LOTO_PANEL',
  ELECTRICAL_PANEL: 'ELECTRICAL_PANEL',
  MACHINE: 'MACHINE',
  DUST_SOURCE: 'DUST_SOURCE',
  HAZARD: 'HAZARD',
}

/** Presentation metadata per anchor type: pictogram key, colour, i18n key. */
export const ANCHOR_META = {
  [ANCHOR_TYPE.EXIT]: { pictogram: 'exit', color: '#2E7D4F', labelKey: 'anchor_exit', safe: true },
  [ANCHOR_TYPE.EXTINGUISHER]: { pictogram: 'extinguisher', color: '#D93025', labelKey: 'anchor_extinguisher' },
  [ANCHOR_TYPE.ASSEMBLY_POINT]: { pictogram: 'assembly_point', color: '#2E7D4F', labelKey: 'anchor_assembly', safe: true },
  [ANCHOR_TYPE.FIRST_AID]: { pictogram: 'first_aid', color: '#2E7D4F', labelKey: 'anchor_first_aid', safe: true },
  [ANCHOR_TYPE.GAS_ZONE]: { pictogram: 'gas', color: '#FFB020', labelKey: 'anchor_gas_zone' },
  [ANCHOR_TYPE.LOTO_PANEL]: { pictogram: 'lockout', color: '#1565C0', labelKey: 'anchor_loto' },
  [ANCHOR_TYPE.ELECTRICAL_PANEL]: { pictogram: 'electric', color: '#FFB020', labelKey: 'anchor_electrical' },
  [ANCHOR_TYPE.MACHINE]: { pictogram: 'machinery', color: '#FFB020', labelKey: 'anchor_machine' },
  [ANCHOR_TYPE.DUST_SOURCE]: { pictogram: 'dust', color: '#FFB020', labelKey: 'anchor_dust' },
  [ANCHOR_TYPE.HAZARD]: { pictogram: 'warning', color: '#D93025', labelKey: 'anchor_hazard' },
}

export function anchorMeta(type) {
  return ANCHOR_META[type] || ANCHOR_META[ANCHOR_TYPE.HAZARD]
}

/* ================================================================== */
/* Angle maths                                                         */
/* ================================================================== */

/**
 * Strict numeric coercion. Re-exported here because bearings are the highest-risk
 * consumer: `Number(null)` is 0, so a dropped compass reading would otherwise be
 * stored as a perfectly valid heading of due north and put every AR marker in the
 * wrong place. The implementation lives in num.js because the same trap has since
 * bitten the chart code too.
 */
export { toFiniteNumber }

/** Wrap to [0, 360). Invalid input coerces to 0 — see normaliseHeadingStrict. */
export function normaliseHeading(deg) {
  const n = toFiniteNumber(deg)
  if (n === null) return 0
  return ((n % 360) + 360) % 360
}

/** Like normaliseHeading, but returns null instead of defaulting to north. */
export function normaliseHeadingStrict(deg) {
  const n = toFiniteNumber(deg)
  if (n === null) return null
  return ((n % 360) + 360) % 360
}

/**
 * Clamp a sighting's elevation to the only range a phone can physically report.
 * A missing reading becomes level (0) rather than straight down, which is what
 * an unclamped `Number(null)` used to give on the import path.
 */
export function normaliseElevation(deg) {
  return clamp(deg, -90, 90) ?? 0
}

/** Shortest signed difference a - b, in (-180, 180]. */
export function signedDelta(a, b) {
  let d = normaliseHeading(a) - normaliseHeading(b)
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

/** Absolute angular separation between two headings, 0..180. */
export function angularDistance(a, b) {
  return Math.abs(signedDelta(a, b))
}

/* ================================================================== */
/* Quaternions                                                         */
/* ================================================================== */

/*
 * WHY THESE ARE HAND-ROLLED AND NOT THREE.QUATERNION
 *
 * three.js has all of this, and siteMap.js must not import it. This module is
 * pulled in by identity, hazard reporting, Site Setup and the drill runner, so an
 * import of three here would drag the 830 KB renderer chunk into the base module
 * graph for every user including those who never open a 3D view. Four numbers and
 * three functions are cheaper than that trade.
 *
 * WHY A QUATERNION AT ALL, WHEN heading + elevation ALREADY EXIST
 *
 * heading and elevation come from alpha and beta and describe where the camera
 * points. They say nothing about ROLL — gamma was discarded entirely. That is
 * invisible while markers are flat DOM elements pinned to a screen percentage, but
 * the moment real geometry is placed in the world the omission shows: the video
 * rotates with the phone and the 3D objects do not, so they slide across the frame
 * whenever the worker tilts. A marker that drifts off the thing it labels is worse
 * than no marker, because it is confidently wrong about which exit to run for.
 *
 * heading and elevation are left exactly as they were. This is additive.
 */

/** Multiply two quaternions ({x,y,z,w}), returning a new one. */
export function quatMultiply(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

/**
 * Quaternion from intrinsic Euler angles in YXZ order, radians.
 *
 * YXZ is not a preference — it is the order the Device Orientation API defines its
 * angles in, so any other order silently mixes the axes.
 */
export function quatFromEulerYXZ(x, y, z) {
  const c1 = Math.cos(x / 2)
  const c2 = Math.cos(y / 2)
  const c3 = Math.cos(z / 2)
  const s1 = Math.sin(x / 2)
  const s2 = Math.sin(y / 2)
  const s3 = Math.sin(z / 2)
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 + s1 * s2 * s3,
  }
}

/** Quaternion for a rotation of `angle` radians about a unit axis. */
export function quatFromAxisAngle(ax, ay, az, angle) {
  const half = angle / 2
  const s = Math.sin(half)
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(half) }
}

function quatNormalise(q) {
  const len = Math.hypot(q.x, q.y, q.z, q.w)
  if (!len) return { x: 0, y: 0, z: 0, w: 1 }
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len }
}

/**
 * Normalised linear interpolation, taking the shortest arc.
 *
 * nlerp rather than slerp on purpose: at 60 Hz the angular step between samples is
 * tiny, where nlerp and slerp are indistinguishable, and nlerp has no trig. The
 * sign flip matters though — q and -q are the same rotation, so without it the
 * interpolation occasionally takes the long way round and the view snaps.
 */
export function quatNlerp(a, b, t) {
  let bx = b.x
  let by = b.y
  let bz = b.z
  let bw = b.w
  if (a.x * bx + a.y * by + a.z * bz + a.w * bw < 0) {
    bx = -bx
    by = -by
    bz = -bz
    bw = -bw
  }
  return quatNormalise({
    x: a.x + (bx - a.x) * t,
    y: a.y + (by - a.y) * t,
    z: a.z + (bz - a.z) * t,
    w: a.w + (bw - a.w) * t,
  })
}

/** Identity rotation. */
export const QUAT_IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, w: 1 })

/*
 * Camera-frame correction, precomputed because it never changes.
 *
 * The device frame has +Z out of the SCREEN, so a phone held upright has its rear
 * camera looking along -Z of the device. A three.js camera also looks along -Z, but
 * the device's resting frame is screen-up (lying on a table). This -90 degrees
 * about X is what turns "flat on the table" into "held up looking at the horizon".
 * It is the same correction the old THREE.DeviceOrientationControls applied.
 */
const CAMERA_FRAME_FIX = Object.freeze(quatFromAxisAngle(1, 0, 0, -Math.PI / 2))

/**
 * Device orientation angles to a camera-space quaternion.
 *
 * @param alphaDeg  Z rotation, 0..360, compass-ish
 * @param betaDeg   X rotation, -180..180, front-to-back tilt
 * @param gammaDeg  Y rotation, -90..90, left-to-right roll
 * @param screenDeg screen rotation from portrait (screenAngle())
 * @returns {x,y,z,w} or null when any angle is missing
 */
export function deviceQuaternion(alphaDeg, betaDeg, gammaDeg, screenDeg = 0) {
  const a = toFiniteNumber(alphaDeg)
  const b = toFiniteNumber(betaDeg)
  const g = toFiniteNumber(gammaDeg)
  // Roll is the whole reason this function exists, so a missing gamma is a null
  // result rather than a silent zero that would look level and be wrong.
  if (a === null || b === null || g === null) return null

  const rad = Math.PI / 180
  let q = quatFromEulerYXZ(b * rad, a * rad, -g * rad)
  q = quatMultiply(q, CAMERA_FRAME_FIX)
  // Screen rotation is applied last, in the already-rotated camera frame, so
  // landscape does not mirror the world.
  q = quatMultiply(q, quatFromAxisAngle(0, 0, 1, -(toNumberOr(screenDeg, 0) * rad)))
  return quatNormalise(q)
}

/**
 * Circular mean of headings, so smoothing doesn't break across the 359->0 seam.
 * A naive average of 359 and 1 gives 180, which would swing every marker across
 * the screen every time the user faced north.
 */
export function circularMean(headings) {
  const list = (headings || []).map(toFiniteNumber).filter((n) => n !== null)
  if (!list.length) return 0
  let sx = 0
  let sy = 0
  for (const h of list) {
    const r = (h * Math.PI) / 180
    sx += Math.cos(r)
    sy += Math.sin(r)
  }
  if (sx === 0 && sy === 0) return 0
  return normaliseHeading((Math.atan2(sy, sx) * 180) / Math.PI)
}

/* ================================================================== */
/* Field of view                                                       */
/* ================================================================== */

/**
 * Approximate camera field of view.
 *
 * Phone cameras vary and the browser will not tell us the real focal length, so
 * this is a calibrated estimate: assume ~65 degrees along the video's long axis
 * and derive the short axis from the aspect ratio. Users can trim it in
 * Settings if markers sit consistently wide or narrow on their device.
 */
export const DEFAULT_LONG_AXIS_FOV = 65

export function computeFov(videoWidth, videoHeight, longAxisFov = DEFAULT_LONG_AXIS_FOV) {
  // A zero or missing dimension means the video element has not reported its
  // intrinsic size yet, so we assume a common portrait frame rather than divide
  // by zero. A zero FOV is meaningless, so it falls back rather than clamping to
  // the 20-degree minimum.
  const rawW = toNumberOr(videoWidth, 0)
  const rawH = toNumberOr(videoHeight, 0)
  const w = rawW > 0 ? rawW : 480
  const h = rawH > 0 ? rawH : 640

  const rawFov = toNumberOr(longAxisFov, 0)
  const longFov = rawFov > 0 ? clamp(rawFov, 20, 120) : DEFAULT_LONG_AXIS_FOV

  const longSide = Math.max(w, h)
  const shortSide = Math.min(w, h)
  const halfLong = Math.tan((longFov / 2) * (Math.PI / 180))
  const shortFov = 2 * Math.atan(halfLong * (shortSide / longSide)) * (180 / Math.PI)

  // Portrait: the long axis is vertical.
  if (h >= w) return { hFov: shortFov, vFov: longFov }
  return { hFov: longFov, vFov: shortFov }
}

/**
 * Project an anchor onto the camera view.
 *
 * @returns {
 *   x, y            0..1 normalised screen position (may fall outside if off-view)
 *   visible         within the frame
 *   offScreen       outside the frame
 *   side            'left' | 'right' when off-screen horizontally
 *   relBearing      signed degrees from the view centre
 *   relElevation    signed degrees above the view centre
 *   angularError    total angular distance from view centre, for aim scoring
 * }
 */
/*
 * Depth below which the perspective divide is refused. An anchor at exactly 90
 * degrees from the view direction sits on the camera plane, where the divide is
 * infinite, and BEYOND 90 degrees it changes sign — which would silently fold an
 * anchor that is behind the worker back into the middle of the frame. A marker
 * pointing at an exit behind you, drawn as if it were in front, is the worst
 * failure this file could produce, so the sign flip is intercepted rather than
 * clamped after the fact.
 */
const MIN_VIEW_DEPTH = 1e-3
/* Where behind-camera anchors are parked: far enough outside the frame that no
   clamp or rounding can drag them back in, close enough to stay finite. */
const BEHIND_NDC = 3

export function projectAnchor(anchor, view) {
  const { heading = 0, elevation = 0, hFov = 50, vFov = 65 } = view || {}

  const relBearing = signedDelta(anchor?.bearing ?? 0, heading)
  const relElevation = toNumberOr(anchor?.elevation, 0) - toNumberOr(elevation, 0)

  const rad = Math.PI / 180
  const theta = relBearing * rad
  const phi = relElevation * rad

  /*
   * The camera-space ray to the anchor. Camera convention: +X right, +Y up,
   * looking down -Z, matching three.js so the DOM markers and the 3D overlay
   * cannot disagree.
   */
  const dirX = Math.sin(theta) * Math.cos(phi)
  const dirY = Math.sin(phi)
  const depth = Math.cos(theta) * Math.cos(phi) // = -dirZ

  // A degenerate FOV would divide by zero. computeFov already clamps, but this
  // function is called with caller-supplied viewports too.
  const halfW = Math.tan((clamp(toNumberOr(hFov, 50), 1, 179) / 2) * rad)
  const halfH = Math.tan((clamp(toNumberOr(vFov, 65), 1, 179) / 2) * rad)

  const behind = depth <= MIN_VIEW_DEPTH

  let ndcX
  let ndcY
  if (behind) {
    ndcX = relBearing < 0 ? -BEHIND_NDC : BEHIND_NDC
    ndcY = relElevation > 0 ? BEHIND_NDC : -BEHIND_NDC
  } else {
    /*
     * True perspective, replacing the previous linear angle-to-pixel mapping.
     * The linear version agreed at the centre and at the horizontal frame edge
     * but sagged in between, which is why labels used to drift off their object
     * as the worker turned.
     *
     * Note that ndcY divides by `depth`, which contains cos(theta): vertical
     * screen position genuinely depends on the HORIZONTAL angle. Treating the
     * two axes independently — the obvious approach, and the previous one — puts
     * high anchors near the frame edge measurably too low. This coupling is what
     * makes the overlay line up in the corners.
     */
    ndcX = dirX / depth / halfW
    ndcY = dirY / depth / halfH
  }

  /*
   * Framing is decided by the PROJECTED position, not by the raw angles. The two
   * agree on the horizontal axis, but off-axis vertical stretch means an anchor
   * can be within vFov/2 of centre and still fall outside the frame near a
   * corner. Testing the angle there would report `visible` for a marker drawn
   * outside the video — the label-not-on-the-object bug, one level up.
   */
  const withinX = !behind && Math.abs(ndcX) <= 1
  const withinY = !behind && Math.abs(ndcY) <= 1

  return {
    x: 0.5 + 0.5 * ndcX,
    // Screen y grows downward, so a marker above the centre gets a smaller y.
    y: 0.5 - 0.5 * ndcY,
    visible: withinX && withinY,
    offScreen: !withinX || !withinY,
    behind,
    side: relBearing < 0 ? 'left' : 'right',
    relBearing,
    relElevation,
    /* Purely angular, and deliberately unchanged by the projection rewrite:
       aim-hold tolerance is specified in degrees off-centre, so it must not
       inherit any lens model. isAimedAt and the drill's aim loop behave exactly
       as they did before. */
    angularError: Math.sqrt(relBearing * relBearing + relElevation * relElevation),
  }
}

/** The direction a camera with this rotation is looking (its local -Z). */
export function quatForward(q) {
  const v = { x: 0, y: 0, z: -1 }
  const tx = 2 * (q.y * v.z - q.z * v.y)
  const ty = 2 * (q.z * v.x - q.x * v.z)
  const tz = 2 * (q.x * v.y - q.y * v.x)
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  }
}

/** The compass bearing a camera with this rotation is facing, or null if degenerate. */
export function quatBearing(q) {
  const f = quatForward(q)
  if (Math.hypot(f.x, f.z) < 1e-6) return null // looking straight up or down
  return normaliseHeading((Math.atan2(f.x, -f.z) * 180) / Math.PI)
}

/**
 * The rotation for the 3D overlay camera.
 *
 * WHY THIS EXISTS RATHER THAN USING THE DEVICE QUATERNION DIRECTLY
 *
 * The 2D markers are placed from `heading`: smoothed, compass-sourced, and
 * manually re-centrable. The device quaternion is an independent quantity derived
 * from the raw alpha/beta/gamma triple. Feed the quaternion straight to the camera
 * and the two layers become two separate estimates of where the worker is looking.
 * They will disagree — by a little when the compass is calibrated, by a lot when it
 * is not — and the visible result is a 3D exit sign floating beside its own label.
 * Every manual re-centre would widen the gap, because the offset is applied to
 * `heading` and cannot be applied to the quaternion.
 *
 * So the quaternion supplies what only it knows — pitch and, above all, ROLL — and
 * its yaw is overridden to match `heading` exactly. One source of truth for azimuth,
 * and the manual offset comes along for free because it already lives inside
 * `heading`. The two layers then cannot disagree horizontally.
 */
export function cameraQuaternion(deviceQuat, headingDeg) {
  if (!deviceQuat) return null
  const current = quatBearing(deviceQuat)
  // Straight up or down: azimuth is degenerate, and any correction invented here
  // would be an arbitrary spin about the view axis. Left alone, because yaw error
  // is not observable when there is no horizon in frame.
  if (current === null) return deviceQuat
  const delta = signedDelta(normaliseHeading(headingDeg), current)
  // Bearing runs north toward east, which is a NEGATIVE rotation about world +Y in
  // a right-handed, -Z-is-north frame. This sign mirrors the world if wrong, so the
  // tests assert it directly.
  const yaw = quatFromAxisAngle(0, 1, 0, -delta * (Math.PI / 180))
  // Pre-multiplied, so the correction is a world-space spin applied after the
  // device's own rotation and therefore leaves pitch and roll untouched.
  return quatNormalise(quatMultiply(yaw, deviceQuat))
}

/**
 * Camera rotation from heading and elevation alone, with no roll.
 *
 * The fallback for devices that report alpha and beta but no gamma. It is not a
 * guess: with no roll available the correct assumption is level, which is exactly
 * what the 2D marker layer already assumes, so the two layers still agree. The
 * overlay simply stops compensating for tilt on those devices rather than
 * inventing a tilt it cannot measure.
 */
export function headingQuaternion(headingDeg, elevationDeg = 0) {
  const rad = Math.PI / 180
  return quatFromEulerYXZ(
    clamp(toNumberOr(elevationDeg, 0), -90, 90) * rad,
    -normaliseHeading(headingDeg) * rad,
    0,
  )
}

/*
 * How far away a 3D anchor object is drawn, in metres.
 *
 * A LIMITATION, STATED PLAINLY: an anchor is a ray, not a point. Site Setup records
 * the bearing and elevation a supervisor was pointing at, and there is no way to
 * recover distance from a single direction — that would need stereo, a depth
 * sensor, or the supervisor pacing out every anchor. So every object is drawn on a
 * ring at one fixed radius.
 *
 * The consequence is honest and worth knowing: the DIRECTION to an object is
 * accurate and is what the worker needs in smoke, but the apparent SIZE carries no
 * distance information. An extinguisher three metres away and one twenty metres
 * away render identically. This is why the overlay leads with direction and the
 * label, and never implies proximity.
 *
 * Six metres is chosen so objects clear the near plane, sit at a plausible
 * indoor-industrial distance, and stay large enough to read on a phone.
 */
export const ANCHOR_RING_RADIUS_M = 6

/**
 * Unit direction to an anchor in world space, for placing 3D objects.
 *
 * World convention is three.js's: +Y up, -Z north, +X east. Anchors are rays with
 * no distance, so callers supply their own radius — see ANCHOR_RING_RADIUS_M.
 */
export function anchorDirection(bearingDeg, elevationDeg = 0) {
  const rad = Math.PI / 180
  const b = normaliseHeading(bearingDeg) * rad
  const e = clamp(toNumberOr(elevationDeg, 0), -90, 90) * rad
  const cosE = Math.cos(e)
  return {
    x: Math.sin(b) * cosE,
    y: Math.sin(e),
    z: -Math.cos(b) * cosE,
  }
}

/** Is the camera aimed at this anchor, within a tolerance in degrees? */
export function isAimedAt(anchor, view, toleranceDeg = 14) {
  return projectAnchor(anchor, view).angularError <= toleranceDeg
}

/* ================================================================== */
/* Orientation tracking                                                */
/* ================================================================== */

export const HEADING_SOURCE = {
  COMPASS: 'compass', // absolute, magnetometer-backed
  RELATIVE: 'relative', // gyro only, arbitrary zero, needs re-centring
  NONE: 'none', // no orientation sensor at all
}

export const ORIENTATION_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  WAITING: 'waiting',
  ACTIVE: 'active',
}

export function orientationSupported() {
  try {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  } catch {
    return false
  }
}

/** iOS 13+ gates orientation behind an explicit user gesture. */
export function orientationNeedsPermission() {
  try {
    return typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'
  } catch {
    return false
  }
}

export async function requestOrientationPermission() {
  if (!orientationNeedsPermission()) return 'granted'
  try {
    const result = await DeviceOrientationEvent.requestPermission()
    return result === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** Portrait vs landscape — the AR view only claims correct maths in portrait. */
export function screenAngle() {
  try {
    if (typeof screen !== 'undefined' && screen.orientation && Number.isFinite(screen.orientation.angle)) {
      return screen.orientation.angle
    }
    if (typeof window !== 'undefined' && Number.isFinite(window.orientation)) return window.orientation
  } catch {
    /* ignore */
  }
  return 0
}

export function isPortrait() {
  const angle = Math.abs(normaliseHeading(screenAngle()))
  return angle === 0 || angle === 180 || angle === 360
}

/**
 * Track where the rear camera is pointing.
 *
 * Heading resolution order:
 *   1. iOS `webkitCompassHeading` — already clockwise from north
 *   2. `deviceorientationabsolute` / `absolute: true` — alpha is
 *      counter-clockwise from north, so heading = 360 - alpha
 *   3. plain `deviceorientation` — relative only; we zero it on first reading
 *      and expose recentre()
 *
 * Elevation is derived from beta: held upright in portrait beta is ~90 and the
 * rear camera looks at the horizon, so elevation = 90 - beta.
 *
 * @returns { start, stop, recentre, getState }
 */
export function createOrientationTracker({ onUpdate, onStatus, smoothing = 0.25, waitMs = 2000 } = {}) {
  let status = ORIENTATION_STATUS.IDLE
  let headingSource = HEADING_SOURCE.NONE
  let listening = false
  let destroyed = false

  let relativeZero = null
  let manualOffset = 0

  // Smoothed heading held as a unit vector to survive the 0/360 seam.
  let vec = null
  let elevation = 0
  let roll = 0
  // Smoothed full device rotation, for the 3D overlay. Null until a sample with a
  // usable gamma arrives — see deviceQuaternion for why a missing roll must not
  // default to level.
  let quat = null
  let lastEventAt = 0
  let waitTimer = null
  let boundEvent = null

  const state = () => ({
    status,
    headingSource,
    heading: vec ? normaliseHeading((Math.atan2(vec.y, vec.x) * 180) / Math.PI + manualOffset) : 0,
    rawElevation: elevation,
    elevation,
    /* Roll, and the full rotation it belongs to. Additive: heading and elevation
       above are unchanged, so projectAnchor, Site Setup and the aim loop behave
       exactly as before and only the 3D overlay reads these. */
    roll,
    quaternion: quat,
    hasQuaternion: !!quat,
    /* Exposed for diagnostics only. The 3D overlay does NOT need to apply this
       itself: cameraQuaternion pins the camera's yaw to `heading` above, which
       already includes the offset, so a re-centre moves both layers together. */
    headingOffset: manualOffset,
    portrait: isPortrait(),
    hasReading: !!vec,
    lastEventAt,
  })

  const setStatus = (next) => {
    if (destroyed || status === next) return
    status = next
    onStatus?.(next, state())
  }

  const handle = (event) => {
    if (destroyed) return
    lastEventAt = Date.now()

    let heading = null
    let source = headingSource

    // 1. iOS true-north heading
    if (Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
      heading = normaliseHeading(event.webkitCompassHeading)
      source = HEADING_SOURCE.COMPASS
    } else if (Number.isFinite(event.alpha)) {
      if (event.absolute === true || boundEvent === 'deviceorientationabsolute') {
        heading = normaliseHeading(360 - event.alpha)
        source = HEADING_SOURCE.COMPASS
      } else {
        // Relative: zero on the first sample so "straight ahead" starts at 0.
        if (relativeZero === null) relativeZero = event.alpha
        heading = normaliseHeading(relativeZero - event.alpha)
        source = HEADING_SOURCE.RELATIVE
      }
    }

    if (heading === null) return
    headingSource = source

    if (Number.isFinite(event.beta)) {
      // Clamp: beyond +-90 of level the phone is pointing at the floor or
      // ceiling and the projection stops being meaningful.
      const raw = 90 - event.beta
      elevation = Math.max(-90, Math.min(90, raw))
    }

    const k = 1 - Math.max(0, Math.min(0.95, smoothing))

    const r = (heading * Math.PI) / 180
    const target = { x: Math.cos(r), y: Math.sin(r) }
    if (!vec) vec = target
    else {
      vec = { x: vec.x + (target.x - vec.x) * k, y: vec.y + (target.y - vec.y) * k }
    }

    /* Full rotation for the 3D overlay, smoothed with the same constant so the
       meshes and the DOM markers settle together rather than one lagging the
       other — a visible mismatch when both are on screen at once. */
    if (Number.isFinite(event.gamma)) {
      roll = event.gamma
      const targetQuat = deviceQuaternion(event.alpha, event.beta, event.gamma, screenAngle())
      if (targetQuat) quat = quat ? quatNlerp(quat, targetQuat, k) : targetQuat
    }

    if (status !== ORIENTATION_STATUS.ACTIVE) setStatus(ORIENTATION_STATUS.ACTIVE)
    onUpdate?.(state())
  }

  return {
    getState: state,

    async start() {
      if (destroyed || listening) return state()

      if (!orientationSupported()) {
        setStatus(ORIENTATION_STATUS.UNSUPPORTED)
        return state()
      }

      if (orientationNeedsPermission()) {
        setStatus(ORIENTATION_STATUS.REQUESTING)
        const permission = await requestOrientationPermission()
        if (permission !== 'granted') {
          setStatus(ORIENTATION_STATUS.DENIED)
          return state()
        }
      }
      if (destroyed) return state()

      // Absolute events give us true north; prefer them when present.
      boundEvent = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
      window.addEventListener(boundEvent, handle, true)
      listening = true
      setStatus(ORIENTATION_STATUS.WAITING)

      // Some devices register the listener happily and then never fire. Give up
      // after a moment so the UI can offer the 3D fallback instead of hanging.
      waitTimer = setTimeout(() => {
        if (!destroyed && status === ORIENTATION_STATUS.WAITING && !vec) {
          headingSource = HEADING_SOURCE.NONE
          setStatus(ORIENTATION_STATUS.UNSUPPORTED)
        }
      }, waitMs)

      return state()
    },

    /**
     * Treat the current facing as the given bearing. This is the mitigation for
     * both magnetic distortion near heavy steel and gyro-only devices: the
     * supervisor stands at a known landmark and re-centres.
     */
    recentre(targetHeading = 0) {
      if (!vec) return
      const current = normaliseHeading((Math.atan2(vec.y, vec.x) * 180) / Math.PI)
      manualOffset = signedDelta(targetHeading, current)
      onUpdate?.(state())
    },

    stop() {
      if (waitTimer) {
        clearTimeout(waitTimer)
        waitTimer = null
      }
      if (listening && boundEvent) {
        window.removeEventListener(boundEvent, handle, true)
        listening = false
      }
      destroyed = true
      setStatus(ORIENTATION_STATUS.IDLE)
    },
  }
}

/* ================================================================== */
/* Camera                                                              */
/* ================================================================== */

export const CAMERA_ERROR = {
  UNSUPPORTED: 'CAMERA_UNSUPPORTED',
  // Distinct from UNSUPPORTED, and the distinction is the whole point. Outside a
  // secure context `navigator.mediaDevices` is simply absent, so this used to
  // report as UNSUPPORTED — "this browser cannot open the camera" — when the
  // browser is fine and the page is on http. It is the one camera failure the
  // person holding the phone can actually fix, and it only ever appears on a
  // phone: localhost is a secure context, so the dev machine never sees it.
  INSECURE_CONTEXT: 'CAMERA_INSECURE_CONTEXT',
  PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  NOT_FOUND: 'CAMERA_NOT_FOUND',
  IN_USE: 'CAMERA_IN_USE',
  UNKNOWN: 'CAMERA_UNKNOWN',
}

function mapCameraError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return CAMERA_ERROR.PERMISSION_DENIED
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return CAMERA_ERROR.NOT_FOUND
  if (name === 'NotReadableError' || name === 'TrackStartError') return CAMERA_ERROR.IN_USE
  if (name === 'OverconstrainedError') return CAMERA_ERROR.NOT_FOUND
  return CAMERA_ERROR.UNKNOWN
}

/**
 * Open the rear camera. Falls back to a relaxed constraint set, then to any
 * camera at all, because `facingMode: environment` is advisory on some devices
 * and outright rejected on a few desktop browsers.
 *
 * Throws an Error whose message is a CAMERA_ERROR code.
 */
export async function openRearCamera() {
  // Checked before the API test, because an insecure context is why the API is
  // missing. Reporting the absent API first sends someone hunting a browser bug.
  if (!secureContext()) throw new Error(CAMERA_ERROR.INSECURE_CONTEXT)
  if (!navigator.mediaDevices?.getUserMedia) throw new Error(CAMERA_ERROR.UNSUPPORTED)

  const attempts = [
    { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: true, audio: false },
  ]

  let lastError = null
  for (const constraints of attempts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastError = err
      // A denial won't be fixed by relaxing constraints, so stop asking.
      if (mapCameraError(err) === CAMERA_ERROR.PERMISSION_DENIED) break
    }
  }
  throw new Error(mapCameraError(lastError))
}

export function stopStream(stream) {
  if (!stream) return
  try {
    stream.getTracks().forEach((track) => track.stop())
  } catch {
    /* already stopped */
  }
}

/* ================================================================== */
/* Site / zone / anchor records                                        */
/* ================================================================== */

export const GENERIC_ZONE_ID = 'zone-generic'

/**
 * The fallback zone used when a site has never been scanned — a contractor
 * visiting a new mine for a day still gets a working drill, just without the
 * spatial fidelity of a real scan.
 */
export function genericZone() {
  return {
    id: GENERIC_ZONE_ID,
    name: 'Generic training area',
    generic: true,
    createdAt: 0,
    anchors: [
      { id: 'g-exit', type: ANCHOR_TYPE.EXIT, label: 'Exit', bearing: 300, elevation: 0, generic: true },
      { id: 'g-exit-2', type: ANCHOR_TYPE.EXIT, label: 'Secondary exit', bearing: 70, elevation: 0, generic: true },
      { id: 'g-ext', type: ANCHOR_TYPE.EXTINGUISHER, label: 'Extinguisher', bearing: 15, elevation: -8, generic: true },
      { id: 'g-assembly', type: ANCHOR_TYPE.ASSEMBLY_POINT, label: 'Assembly point', bearing: 190, elevation: 0, generic: true },
      { id: 'g-aid', type: ANCHOR_TYPE.FIRST_AID, label: 'First aid', bearing: 140, elevation: -5, generic: true },
      { id: 'g-hazard', type: ANCHOR_TYPE.HAZARD, label: 'Hazard', bearing: 345, elevation: -12, generic: true },
    ],
  }
}

function blankSite(siteId, name) {
  return {
    id: siteId,
    name: name || 'My Site',
    sector: '',
    zones: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export async function getSite(siteId = getActiveSiteId()) {
  const existing = await idbGet(STORE.SITES, siteId)
  return existing || blankSite(siteId || DEFAULT_SITE_ID)
}

export async function listSites() {
  const rows = await idbGetAll(STORE.SITES)
  return rows.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export async function saveSite(site) {
  const next = { ...site, updatedAt: Date.now() }
  if (!next.id) next.id = `site_${randomId(6)}`
  if (!Array.isArray(next.zones)) next.zones = []
  await idbPut(STORE.SITES, next)
  return next
}

export async function deleteSite(siteId) {
  await idbDelete(STORE.SITES, siteId)
}

/**
 * Zones for a site, always including the generic fallback last so the drill
 * runner always has something to work with.
 */
export async function listZones(siteId = getActiveSiteId()) {
  const site = await getSite(siteId)
  const zones = Array.isArray(site.zones) ? site.zones : []
  return [...zones, genericZone()]
}

export async function getZone(siteId, zoneId) {
  if (!zoneId || zoneId === GENERIC_ZONE_ID) return genericZone()
  const site = await getSite(siteId)
  return (site.zones || []).find((z) => z.id === zoneId) || genericZone()
}

export async function createZone(siteId, name) {
  const site = await getSite(siteId)
  const zone = {
    id: `zone_${randomId(6)}`,
    name: String(name || '').trim() || `Zone ${(site.zones?.length || 0) + 1}`,
    anchors: [],
    createdAt: Date.now(),
  }
  site.zones = [...(site.zones || []), zone]
  await saveSite(site)
  return zone
}

export async function renameZone(siteId, zoneId, name) {
  const site = await getSite(siteId)
  site.zones = (site.zones || []).map((z) => (z.id === zoneId ? { ...z, name: String(name || '').trim() || z.name } : z))
  await saveSite(site)
  return site
}

export async function deleteZone(siteId, zoneId) {
  const site = await getSite(siteId)
  site.zones = (site.zones || []).filter((z) => z.id !== zoneId)
  await saveSite(site)
  return site
}

/**
 * Record a sighting. `bearing` and `elevation` come from the live orientation
 * tracker at the moment the supervisor taps.
 */
export async function addAnchor(siteId, zoneId, { type, label, bearing, elevation = 0, thumbnail = null, note = '' }) {
  if (!ANCHOR_TYPE[type]) throw new Error('UNKNOWN_ANCHOR_TYPE')
  // Strict, so a dropped compass reading can't be stored as due north.
  if (normaliseHeadingStrict(bearing) === null) throw new Error('BEARING_REQUIRED')

  const site = await getSite(siteId)
  const zones = Array.isArray(site.zones) ? site.zones : []
  const zone = zones.find((z) => z.id === zoneId)
  if (!zone) throw new Error('ZONE_NOT_FOUND')

  const anchor = {
    id: `a_${randomId(6)}`,
    type,
    label: String(label || '').trim().slice(0, 40) || type.replace(/_/g, ' ').toLowerCase(),
    bearing: normaliseHeading(bearing),
    elevation: normaliseElevation(elevation),
    thumbnail: thumbnail || null,
    note: String(note || '').slice(0, 200),
    createdAt: Date.now(),
  }

  zone.anchors = [...(zone.anchors || []), anchor]
  site.zones = zones.map((z) => (z.id === zoneId ? zone : z))
  await saveSite(site)
  return anchor
}

export async function deleteAnchor(siteId, zoneId, anchorId) {
  const site = await getSite(siteId)
  site.zones = (site.zones || []).map((z) =>
    z.id === zoneId ? { ...z, anchors: (z.anchors || []).filter((a) => a.id !== anchorId) } : z
  )
  await saveSite(site)
  return site
}

/**
 * Anchors matching a drill's requested types, so a fire drill shows exits and
 * extinguishers rather than every pin in the zone.
 */
export function filterAnchors(zone, types) {
  const anchors = zone?.anchors || []
  if (!Array.isArray(types) || !types.length) return anchors
  return anchors.filter((a) => types.includes(a.type))
}

/* ================================================================== */
/* Sharing a scan                                                      */
/* ================================================================== */

export const SITE_BUNDLE_FORMAT = 'jaagruk-site'
export const SITE_BUNDLE_VERSION = 1

/**
 * Export a site scan so one supervisor's walkthrough seeds every worker's
 * phone. This is the stand-in for ARCore's Cloud Anchors: instead of a hosted
 * anchor service, the scan is a small JSON file handed around by file, QR or
 * the same peer channel the ledger uses.
 *
 * Thumbnails are dropped by default — they are the bulk of the payload and are
 * only a convenience for the supervisor reviewing their own scan.
 */
export async function exportSiteBundle(siteId, { includeThumbnails = false } = {}) {
  const site = await getSite(siteId)
  return {
    format: SITE_BUNDLE_FORMAT,
    version: SITE_BUNDLE_VERSION,
    exportedAt: Date.now(),
    site: {
      id: site.id,
      name: site.name,
      sector: site.sector || '',
      zones: (site.zones || []).map((z) => ({
        id: z.id,
        name: z.name,
        createdAt: z.createdAt,
        anchors: (z.anchors || []).map((a) => ({
          id: a.id,
          type: a.type,
          label: a.label,
          bearing: a.bearing,
          elevation: a.elevation,
          note: a.note || '',
          thumbnail: includeThumbnails ? a.thumbnail || null : null,
        })),
      })),
    },
  }
}

/**
 * Import a scan. Merges by zone id and anchor id so re-importing an updated
 * bundle tops up rather than duplicating.
 */
export async function importSiteBundle(bundle, { siteId = null } = {}) {
  if (!bundle || bundle.format !== SITE_BUNDLE_FORMAT) throw new Error('NOT_A_SITE_BUNDLE')
  if (bundle.version !== SITE_BUNDLE_VERSION) throw new Error('SITE_VERSION_MISMATCH')
  if (!bundle.site || typeof bundle.site !== 'object') throw new Error('NOT_A_SITE_BUNDLE')

  const targetId = siteId || bundle.site.id || DEFAULT_SITE_ID
  const existing = await getSite(targetId)

  const zoneById = new Map((existing.zones || []).map((z) => [z.id, z]))
  let zonesAdded = 0
  let anchorsAdded = 0

  for (const incoming of bundle.site.zones || []) {
    if (!incoming?.id) continue

    const current = zoneById.get(incoming.id)
    const validAnchors = (incoming.anchors || []).filter(
      (a) => a?.id && ANCHOR_TYPE[a.type] && normaliseHeadingStrict(a.bearing) !== null
    )
    const normalised = validAnchors.map((a) => ({
      id: a.id,
      type: a.type,
      label: String(a.label || '').slice(0, 40),
      bearing: normaliseHeading(a.bearing),
      elevation: normaliseElevation(a.elevation),
      note: String(a.note || '').slice(0, 200),
      thumbnail: a.thumbnail || null,
      createdAt: a.createdAt || Date.now(),
    }))

    if (!current) {
      zoneById.set(incoming.id, {
        id: incoming.id,
        name: String(incoming.name || 'Imported zone').slice(0, 60),
        anchors: normalised,
        createdAt: incoming.createdAt || Date.now(),
        imported: true,
      })
      zonesAdded += 1
      anchorsAdded += normalised.length
    } else {
      const anchorIds = new Set((current.anchors || []).map((a) => a.id))
      const fresh = normalised.filter((a) => !anchorIds.has(a.id))
      current.anchors = [...(current.anchors || []), ...fresh]
      anchorsAdded += fresh.length
    }
  }

  const site = {
    ...existing,
    id: targetId,
    name: existing.name && existing.name !== 'My Site' ? existing.name : bundle.site.name || existing.name,
    sector: existing.sector || bundle.site.sector || '',
    zones: [...zoneById.values()],
  }

  await saveSite(site)
  return { site, zonesAdded, anchorsAdded }
}

/** Count real (non-generic) anchors, used to decide whether a site is scanned. */
export async function siteScanSummary(siteId = getActiveSiteId()) {
  const site = await getSite(siteId)
  const zones = site.zones || []
  const anchorCount = zones.reduce((sum, z) => sum + (z.anchors?.length || 0), 0)
  return {
    siteId: site.id,
    siteName: site.name,
    zoneCount: zones.length,
    anchorCount,
    scanned: anchorCount > 0,
    lastUpdated: site.updatedAt || 0,
  }
}
