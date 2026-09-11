/*
 * On-device object detection for the camera view.
 *
 * ================================================================
 * WHAT THIS CAN AND CANNOT DETECT — READ THIS FIRST
 * ================================================================
 *
 * This runs EfficientDet-Lite0, trained on COCO. COCO has eighty classes, and the
 * eighty are fixed. The following are NOT among them and therefore CANNOT be
 * detected by this model, at any confidence, ever:
 *
 *   door · fire exit · exit sign · fire extinguisher · hard hat · helmet ·
 *   safety vest · gas cylinder · guard rail · industrial machinery · forklift
 *
 * That list matters because those are exactly the things a site-safety demo is
 * tempted to claim. This module claims two things, both of which the model
 * genuinely does:
 *
 *   PERSON   — reliable, and the single most useful class on a site. It gives a
 *              headcount, which is what a muster-point roll call actually needs.
 *   VEHICLE  — car, truck, bus, motorcycle, bicycle, train. Pedestrian/vehicle
 *              interaction is a leading cause of death in warehouses and on mine
 *              haul roads, so "a vehicle is in frame and it is large" is a real
 *              warning with a real basis.
 *
 * A NOTE ON FORKLIFTS, because it is the obvious question: a forklift is not a
 * COCO class. Some are detected as `truck`, many are not detected at all. The UI
 * must never promise forklift detection. It says "vehicle", and it means it.
 *
 * WHY EXITS ARE HANDLED BY THE ANCHOR SCAN INSTEAD
 *
 * A supervisor walking the site and recording bearings produces exit positions
 * that are exact, work in darkness and smoke where no camera model would, need no
 * download, and cost no battery. For the one thing that matters most, the boring
 * method is the better method. Detection here supplements it; it does not replace
 * it.
 *
 * LOADING AND FAILURE
 *
 * Same strategy as gesture.js, for the same reasons: MediaPipe is fetched from CDN
 * at runtime rather than bundled, the model bytes are cached in IndexedDB so it
 * works offline from the second run onward, and every failure degrades to "no
 * detection" with an honest status. Nothing in the app is reachable only through
 * this module.
 */

import { STORE, idbGet, idbPut } from './idb.js'
import { clamp, toNumberOr } from './num.js'

const VISION_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'

/*
 * The int8 model, not float16: 4.4 MB against 6.9 MB. This is going to a phone on
 * a site link, possibly metered, and the accuracy difference between quantisations
 * is immaterial for "is there a person in frame". The smaller model also runs
 * faster on the CPU delegate, which is where mid-range Android ends up.
 */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite'

const MODEL_CACHE_ID = 'efficientdet_lite0_int8_v1'

export const VISION_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  UNSUPPORTED: 'unsupported',
  NO_CAMERA: 'no_camera',
  MODEL_FAILED: 'model_failed',
  ERROR: 'error',
}

/** The two things this module is willing to say it detects. */
export const DETECTED = {
  PERSON: 'person',
  VEHICLE: 'vehicle',
}

/*
 * Exact COCO label strings, split into the two groups we report. Anything not on
 * this list is discarded at the model level via categoryAllowlist, which is both
 * honest and cheaper than filtering afterwards — the model stops scoring classes
 * we would only throw away.
 */
const PERSON_LABELS = Object.freeze(['person'])
const VEHICLE_LABELS = Object.freeze(['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train'])

export const CATEGORY_ALLOWLIST = Object.freeze([...PERSON_LABELS, ...VEHICLE_LABELS])

/* Detections weaker than this are noise on a shaky handheld camera. */
const SCORE_THRESHOLD = 0.45

/* More than this in frame and the overlay is unreadable anyway. */
const MAX_RESULTS = 12

/*
 * Detection runs far slower than the display.
 *
 * Inference on a mid-range phone costs tens of milliseconds, and it is competing
 * with a live camera, the 3D overlay and possibly the hand tracker. Six times a
 * second is more than enough to count people standing at a muster point or to
 * notice a truck, and it leaves the frame budget for things the eye actually
 * tracks. Running it every frame would drain the battery to no benefit.
 */
export const DETECT_INTERVAL_MS = 165

/* ================================================================== */
/* Capability                                                          */
/* ================================================================== */

export function visionCapable() {
  return visionBlocker() === null
}

/** Reason detection is unavailable, or null if it should work. */
export function visionBlocker() {
  try {
    if (typeof window === 'undefined') return VISION_STATUS.UNSUPPORTED
    if (typeof WebAssembly === 'undefined') return VISION_STATUS.UNSUPPORTED
    if (!navigator.mediaDevices?.getUserMedia) return VISION_STATUS.NO_CAMERA
    return null
  } catch {
    return VISION_STATUS.UNSUPPORTED
  }
}

/* ================================================================== */
/* Model loading                                                       */
/* ================================================================== */

let visionModulePromise = null
let detectorPromise = null

function loadVisionModule() {
  if (visionModulePromise) return visionModulePromise
  // @vite-ignore: deliberately a runtime CDN URL, not a bundled dependency.
  visionModulePromise = import(/* @vite-ignore */ VISION_MODULE_URL).catch((err) => {
    visionModulePromise = null
    throw err
  })
  return visionModulePromise
}

/** Model bytes, from IndexedDB if they have been fetched before. */
async function loadModelBytes(onProgress) {
  const cached = await idbGet(STORE.BLOBS, MODEL_CACHE_ID)
  if (cached?.bytes) {
    const bytes = cached.bytes instanceof ArrayBuffer ? cached.bytes : cached.bytes?.buffer
    if (bytes && bytes.byteLength > 0) {
      onProgress?.({ phase: 'cache', loaded: bytes.byteLength, total: bytes.byteLength })
      return new Uint8Array(bytes)
    }
  }

  onProgress?.({ phase: 'download', loaded: 0, total: 0 })
  const res = await fetch(MODEL_URL, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`MODEL_HTTP_${res.status}`)

  const buffer = await res.arrayBuffer()
  if (!buffer.byteLength) throw new Error('MODEL_EMPTY')

  try {
    await idbPut(STORE.BLOBS, { id: MODEL_CACHE_ID, bytes: buffer, cachedAt: Date.now() })
  } catch {
    // Quota exceeded. Detection still works this session, it just re-downloads.
  }

  onProgress?.({ phase: 'downloaded', loaded: buffer.byteLength, total: buffer.byteLength })
  return new Uint8Array(buffer)
}

/**
 * Build (and memoise) the ObjectDetector.
 * Throws an Error whose message is one of the VISION_STATUS codes.
 */
export async function loadObjectDetector({ onProgress } = {}) {
  const blocker = visionBlocker()
  if (blocker) throw new Error(blocker)

  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    let vision
    try {
      vision = await loadVisionModule()
    } catch {
      throw new Error(VISION_STATUS.MODEL_FAILED)
    }

    const { FilesetResolver, ObjectDetector } = vision || {}
    if (!FilesetResolver || !ObjectDetector) throw new Error(VISION_STATUS.MODEL_FAILED)

    let fileset
    let modelBytes
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
      modelBytes = await loadModelBytes(onProgress)
    } catch {
      throw new Error(VISION_STATUS.MODEL_FAILED)
    }

    const options = (delegate) => ({
      baseOptions: { modelAssetBuffer: modelBytes, delegate },
      runningMode: 'VIDEO',
      scoreThreshold: SCORE_THRESHOLD,
      maxResults: MAX_RESULTS,
      // The allowlist is the honesty guarantee, enforced by the model rather than
      // by a filter someone could later remove.
      categoryAllowlist: [...CATEGORY_ALLOWLIST],
    })

    try {
      return await ObjectDetector.createFromOptions(fileset, options('GPU'))
    } catch {
      // Plenty of mid-range GPUs reject the GPU delegate. CPU is slower but works,
      // and at six detections a second it is comfortably fast enough.
      try {
        return await ObjectDetector.createFromOptions(fileset, options('CPU'))
      } catch {
        throw new Error(VISION_STATUS.MODEL_FAILED)
      }
    }
  })()

  detectorPromise = detectorPromise.catch((err) => {
    detectorPromise = null
    throw err
  })

  return detectorPromise
}

/* ================================================================== */
/* Interpretation — pure, so it can be tested                          */
/* ================================================================== */

/**
 * Which of our two groups a raw COCO label belongs to, or null to discard it.
 *
 * The allowlist already runs at the model level; this is the second gate, and it
 * exists because a model swap or a loosened allowlist must not silently start
 * reporting classes the UI has no honest words for.
 */
export function classifyLabel(label) {
  if (typeof label !== 'string') return null
  const name = label.trim().toLowerCase()
  if (PERSON_LABELS.includes(name)) return DETECTED.PERSON
  if (VEHICLE_LABELS.includes(name)) return DETECTED.VEHICLE
  return null
}

/*
 * Fraction of frame height a bounding box must fill before we call a vehicle
 * "close".
 *
 * THIS IS A HEURISTIC, NOT A DISTANCE. Apparent size depends on the real size of
 * the object and the lens, neither of which we know: a distant bus and a nearby
 * hatchback can fill the same box. It is a usable proxy for "big enough in frame
 * to be worth flagging" and is deliberately described in those terms in the UI,
 * never in metres.
 */
const NEAR_FRAME_FRACTION = 0.38

/**
 * Turn a raw MediaPipe DetectionResult into something the UI can render.
 *
 * Defensive throughout, and for the same reason normaliseScanResult is: this data
 * originates outside our code, and one malformed frame must not be able to blank
 * the drill or throw inside a render.
 *
 * Bounding boxes come back in PIXELS relative to the video's intrinsic size, and
 * are converted to 0..1 fractions here so the overlay can position them without
 * knowing the video dimensions.
 */
export function summariseDetections(raw, frameWidth, frameHeight) {
  const w = toNumberOr(frameWidth, 0)
  const h = toNumberOr(frameHeight, 0)
  const list = Array.isArray(raw?.detections) ? raw.detections : []

  const objects = []
  let people = 0
  let vehicles = 0
  let nearVehicle = false

  for (const det of list) {
    if (!det || typeof det !== 'object') continue

    const categories = Array.isArray(det.categories) ? det.categories : []
    // MediaPipe orders categories by descending score, but that is not something
    // to rely on when the cost of being wrong is a mislabelled box.
    let best = null
    for (const c of categories) {
      const score = toNumberOr(c?.score, 0)
      if (!best || score > best.score) best = { score, name: c?.categoryName }
    }
    if (!best) continue

    const kind = classifyLabel(best.name)
    if (!kind) continue
    if (best.score < SCORE_THRESHOLD) continue

    const box = det.boundingBox
    // Without usable frame dimensions a pixel box cannot be normalised, so the
    // detection is still counted but carries no position. Counting it is the
    // honest choice: the object was detected, we just cannot draw it.
    let bbox = null
    if (box && w > 0 && h > 0) {
      const x = clamp(toNumberOr(box.originX, 0) / w, 0, 1)
      const y = clamp(toNumberOr(box.originY, 0) / h, 0, 1)
      // Trim the size rather than move the origin, so a box that starts in frame
      // and runs off the edge stays anchored to the thing it found.
      const bw = clamp(toNumberOr(box.width, 0) / w, 0, 1 - x)
      const bh = clamp(toNumberOr(box.height, 0) / h, 0, 1 - y)
      if (bw > 0 && bh > 0) bbox = { x, y, w: bw, h: bh }
    }

    const near = !!bbox && bbox.h >= NEAR_FRAME_FRACTION

    if (kind === DETECTED.PERSON) people += 1
    else {
      vehicles += 1
      if (near) nearVehicle = true
    }

    objects.push({
      kind,
      /* The raw COCO label is kept so the UI can say "truck" rather than only
         "vehicle" when it is confident, and so nothing about what the model
         actually said is hidden from the operator. */
      label: typeof best.name === 'string' ? best.name.slice(0, 32) : '',
      score: clamp(best.score, 0, 1),
      bbox,
      near,
    })
  }

  return {
    objects,
    people,
    vehicles,
    /* The one actionable signal: a large vehicle in frame. Surfaced separately
       because it is the only detection here that warrants interrupting the
       worker. */
    nearVehicle,
    total: objects.length,
  }
}

/** An empty result, shaped identically, for the not-yet-running state. */
export function emptyDetections() {
  return { objects: [], people: 0, vehicles: 0, nearVehicle: false, total: 0 }
}

/* ================================================================== */
/* Controller                                                          */
/* ================================================================== */

/**
 * Drive the detector against a video element.
 *
 * Owns its own timing loop rather than piggybacking on the caller's: inference is
 * throttled to DETECT_INTERVAL_MS, and the caller gets results through onResult
 * whenever a new one is ready.
 *
 * @returns { start, stop, status }
 */
export function createObjectDetectorController({ video, onResult, onStatus, onProgress } = {}) {
  let detector = null
  let status = VISION_STATUS.IDLE
  let rafId = null
  let stopped = false
  let lastRunAt = 0
  /*
   * detectForVideo REQUIRES strictly increasing timestamps and throws if it ever
   * sees one repeat or go backwards. A paused and resumed video, or two calls
   * inside the same millisecond, will do exactly that, so the timestamp handed to
   * MediaPipe is forced forward independently of the clock.
   */
  let lastTimestamp = -1

  const setStatus = (next) => {
    if (stopped || status === next) return
    status = next
    onStatus?.(next)
  }

  const tick = () => {
    if (stopped) return
    rafId = requestAnimationFrame(tick)

    const now = performance.now()
    if (now - lastRunAt < DETECT_INTERVAL_MS) return
    lastRunAt = now

    if (!detector || !video) return
    // HAVE_CURRENT_DATA. Detecting against a video with no frame yet either throws
    // or returns nonsense depending on the browser.
    if (video.readyState < 2) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    const timestamp = Math.max(lastTimestamp + 1, Math.round(now))
    lastTimestamp = timestamp

    try {
      const result = detector.detectForVideo(video, timestamp)
      onResult?.(summariseDetections(result, vw, vh))
      setStatus(VISION_STATUS.RUNNING)
    } catch {
      /*
       * A single failed inference is not a reason to tear everything down — it
       * happens on tab switches and on GPU context loss recovery. The loop keeps
       * going; if the detector is genuinely dead every subsequent call fails and
       * the caller simply never sees another result.
       */
    }
  }

  return {
    getStatus: () => status,

    async start() {
      if (stopped || detector) return status
      setStatus(VISION_STATUS.LOADING)
      try {
        detector = await loadObjectDetector({ onProgress })
      } catch (err) {
        setStatus(err?.message === VISION_STATUS.NO_CAMERA ? VISION_STATUS.NO_CAMERA : VISION_STATUS.MODEL_FAILED)
        return status
      }
      if (stopped) {
        // Unmounted while the model was downloading. The memoised detector is
        // left in place deliberately — the next mount reuses it instantly.
        return status
      }
      setStatus(VISION_STATUS.READY)
      rafId = requestAnimationFrame(tick)
      return status
    },

    stop() {
      stopped = true
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      /*
       * The detector itself is NOT closed. It is memoised at module level and
       * reused across mounts, which is what makes reopening the drill instant
       * instead of a second four-megabyte load. Closing it here would also race
       * any in-flight detectForVideo.
       */
      detector = null
    },
  }
}

/** i18n key for a status, for the UI to explain itself. */
export function visionStatusKey(status) {
  switch (status) {
    case VISION_STATUS.LOADING:
      return 'vision_loading'
    case VISION_STATUS.READY:
    case VISION_STATUS.RUNNING:
      return 'vision_running'
    case VISION_STATUS.NO_CAMERA:
      return 'vision_no_camera'
    case VISION_STATUS.MODEL_FAILED:
      return 'vision_model_failed'
    case VISION_STATUS.UNSUPPORTED:
      return 'vision_unsupported'
    default:
      return 'vision_idle'
  }
}
