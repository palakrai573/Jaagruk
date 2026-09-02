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
export function projectAnchor(anchor, view) {
  const { heading = 0, elevation = 0, hFov = 50, vFov = 65 } = view || {}

  const relBearing = signedDelta(anchor?.bearing ?? 0, heading)
  const relElevation = toNumberOr(anchor?.elevation, 0) - toNumberOr(elevation, 0)

  const x = 0.5 + relBearing / hFov
  // Screen y grows downward, so a marker above the centre gets a smaller y.
  const y = 0.5 - relElevation / vFov

  const withinX = Math.abs(relBearing) <= hFov / 2
  const withinY = Math.abs(relElevation) <= vFov / 2

  return {
    x,
    y,
    visible: withinX && withinY,
    offScreen: !withinX || !withinY,
    side: relBearing < 0 ? 'left' : 'right',
    relBearing,
    relElevation,
    angularError: Math.sqrt(relBearing * relBearing + relElevation * relElevation),
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
  let lastEventAt = 0
  let waitTimer = null
  let boundEvent = null

  const state = () => ({
    status,
    headingSource,
    heading: vec ? normaliseHeading((Math.atan2(vec.y, vec.x) * 180) / Math.PI + manualOffset) : 0,
    rawElevation: elevation,
    elevation,
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

    const r = (heading * Math.PI) / 180
    const target = { x: Math.cos(r), y: Math.sin(r) }
    if (!vec) vec = target
    else {
      const k = 1 - Math.max(0, Math.min(0.95, smoothing))
      vec = { x: vec.x + (target.x - vec.x) * k, y: vec.y + (target.y - vec.y) * k }
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
