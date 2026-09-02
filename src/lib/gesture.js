// Glove-friendly touchless control via on-device hand tracking.
//
// WHY THIS EXISTS: a worker on a mine floor has dusty, wet or gloved hands.
// Small on-screen buttons are the point where a demo-pretty UI stops being
// usable at the actual job. Pointing and pinching in the air is not a garnish
// here, it is the difference between the app being used and being abandoned.
//
// LOADING STRATEGY: MediaPipe is fetched from CDN at runtime rather than
// bundled. Three reasons: the app bundle is already large, gesture control is
// strictly optional, and a missing/failed dependency must never be able to
// break the build or the core training path. The model bytes are cached in
// IndexedDB on first successful load, so it works offline from then on.
//
// EVERY failure degrades to touch input with an honest status message. Nothing
// in the app is reachable only by gesture.

import { STORE, idbGet, idbPut } from './idb.js'

const VISION_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const MODEL_CACHE_ID = 'hand_landmarker_float16_v1'

export const GESTURE_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  RUNNING: 'running',
  DEGRADED: 'degraded',
  UNSUPPORTED: 'unsupported',
  NO_CAMERA: 'no_camera',
  PERMISSION_DENIED: 'permission_denied',
  MODEL_FAILED: 'model_failed',
  ERROR: 'error',
}

export const GESTURE = {
  POINT: 'point',
  PINCH: 'pinch',
  OPEN_PALM: 'open_palm',
  FIST: 'fist',
  NONE: 'none',
}

/* ================================================================== */
/* Capability                                                          */
/* ================================================================== */

export function gestureCapable() {
  try {
    if (typeof window === 'undefined') return false
    if (typeof WebAssembly === 'undefined') return false
    if (!navigator.mediaDevices?.getUserMedia) return false
    return true
  } catch {
    return false
  }
}

/** Reason gesture control is unavailable, or null if it should work. */
export function gestureBlocker() {
  try {
    if (typeof window === 'undefined') return GESTURE_STATUS.UNSUPPORTED
    if (typeof WebAssembly === 'undefined') return GESTURE_STATUS.UNSUPPORTED
    if (!navigator.mediaDevices?.getUserMedia) return GESTURE_STATUS.NO_CAMERA
    return null
  } catch {
    return GESTURE_STATUS.UNSUPPORTED
  }
}

/* ================================================================== */
/* Model loading                                                       */
/* ================================================================== */

let visionModulePromise = null
let landmarkerPromise = null

function loadVisionModule() {
  if (visionModulePromise) return visionModulePromise
  // @vite-ignore keeps Vite from trying to resolve this at build time — it is
  // deliberately a runtime CDN URL, not a bundled dependency.
  visionModulePromise = import(/* @vite-ignore */ VISION_MODULE_URL).catch((err) => {
    visionModulePromise = null
    throw err
  })
  return visionModulePromise
}

/** Model bytes, from IndexedDB if we've fetched them before. */
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
    // Quota. Gesture control still works this session, just re-downloads later.
  }

  onProgress?.({ phase: 'downloaded', loaded: buffer.byteLength, total: buffer.byteLength })
  return new Uint8Array(buffer)
}

/**
 * Build (and memoise) the HandLandmarker.
 * Throws an Error whose message is one of the GESTURE_STATUS codes.
 */
export async function loadHandLandmarker({ onProgress } = {}) {
  const blocker = gestureBlocker()
  if (blocker) throw new Error(blocker)

  if (landmarkerPromise) return landmarkerPromise

  landmarkerPromise = (async () => {
    let vision
    try {
      vision = await loadVisionModule()
    } catch {
      throw new Error(GESTURE_STATUS.MODEL_FAILED)
    }

    const { FilesetResolver, HandLandmarker } = vision || {}
    if (!FilesetResolver || !HandLandmarker) throw new Error(GESTURE_STATUS.MODEL_FAILED)

    let fileset
    let modelBytes
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
      modelBytes = await loadModelBytes(onProgress)
    } catch {
      throw new Error(GESTURE_STATUS.MODEL_FAILED)
    }

    try {
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: modelBytes, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    } catch {
      // Some mid-range GPUs reject the GPU delegate. CPU is slower but works.
      try {
        return await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetBuffer: modelBytes, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        })
      } catch {
        throw new Error(GESTURE_STATUS.MODEL_FAILED)
      }
    }
  })()

  landmarkerPromise = landmarkerPromise.catch((err) => {
    landmarkerPromise = null
    throw err
  })

  return landmarkerPromise
}

/* ================================================================== */
/* Landmark interpretation                                             */
/* ================================================================== */

const LM = { WRIST: 0, THUMB_TIP: 4, INDEX_MCP: 5, INDEX_PIP: 6, INDEX_TIP: 8, MIDDLE_PIP: 10, MIDDLE_TIP: 12, RING_PIP: 14, RING_TIP: 16, PINKY_PIP: 18, PINKY_TIP: 20 }

function dist(a, b) {
  if (!a || !b) return Infinity
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = (a.z || 0) - (b.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function dist2d(a, b) {
  if (!a || !b) return Infinity
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** A finger counts as extended when its tip is further from the wrist than its PIP joint. */
function isExtended(landmarks, tipIndex, pipIndex) {
  const wrist = landmarks[LM.WRIST]
  return dist2d(landmarks[tipIndex], wrist) > dist2d(landmarks[pipIndex], wrist) * 1.08
}

/**
 * Classify a hand into one of our four gestures.
 *
 * Pinch distance is normalised against the wrist-to-index-knuckle span so it
 * behaves the same whether the hand is near the lens or at arm's length.
 */
export function classifyHand(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) {
    return { gesture: GESTURE.NONE, pinchRatio: null, extended: 0 }
  }

  const handScale = dist2d(landmarks[LM.WRIST], landmarks[LM.INDEX_MCP])
  const pinchDistance = dist(landmarks[LM.THUMB_TIP], landmarks[LM.INDEX_TIP])
  const pinchRatio = handScale > 0 ? pinchDistance / handScale : null

  const index = isExtended(landmarks, LM.INDEX_TIP, LM.INDEX_PIP)
  const middle = isExtended(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_PIP)
  const ring = isExtended(landmarks, LM.RING_TIP, LM.RING_PIP)
  const pinky = isExtended(landmarks, LM.PINKY_TIP, LM.PINKY_PIP)
  const extended = [index, middle, ring, pinky].filter(Boolean).length

  if (pinchRatio !== null && pinchRatio < 0.55) {
    return { gesture: GESTURE.PINCH, pinchRatio, extended }
  }
  if (extended >= 4) return { gesture: GESTURE.OPEN_PALM, pinchRatio, extended }
  if (extended === 0) return { gesture: GESTURE.FIST, pinchRatio, extended }
  if (index) return { gesture: GESTURE.POINT, pinchRatio, extended }

  return { gesture: GESTURE.NONE, pinchRatio, extended }
}

/* ================================================================== */
/* Controller                                                          */
/* ================================================================== */

const DEFAULTS = {
  dwellMs: 1200,
  dwellRadius: 0.08, // in normalised video coordinates
  pinchCooldownMs: 700,
  smoothing: 0.35, // 0 = no smoothing, 1 = frozen
  minFps: 7,
  mirror: true, // front camera is mirrored
}

/**
 * Drive a pointer from the user's hand.
 *
 * Emits a normalised pointer (0..1, origin top-left, already un-mirrored) plus
 * two independent ways to confirm:
 *   - pinch: fast, for users who can make the gesture cleanly
 *   - dwell: hold still on a target for dwellMs, for gloved or imprecise hands
 *
 * Dwell exists because pinch precision is exactly what heavy gloves take away.
 *
 * @returns { start, stop, destroy, setOptions, status }
 */
export function createGestureController({
  onPointer,
  onSelect,
  onCancel,
  onStatus,
  onGesture,
  options = {},
} = {}) {
  const opts = { ...DEFAULTS, ...options }

  let landmarker = null
  let video = null
  let stream = null
  let rafId = null
  let running = false
  let destroyed = false

  let status = GESTURE_STATUS.IDLE
  let smoothed = null
  let dwellAnchor = null
  let dwellStart = 0
  let lastPinchAt = 0
  let pinchLatched = false
  let lastVideoTime = -1

  // FPS tracking, so we can tell the user their phone can't keep up instead of
  // leaving them poking at an unresponsive pointer.
  let frameTimes = []
  let degradedReported = false

  const setStatus = (next) => {
    if (destroyed || status === next) return
    status = next
    onStatus?.(next)
  }

  const teardownStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          /* already stopped */
        }
      })
      stream = null
    }
    if (video) {
      try {
        video.pause()
        video.srcObject = null
      } catch {
        /* ignore */
      }
      video = null
    }
  }

  const resetInteraction = () => {
    smoothed = null
    dwellAnchor = null
    dwellStart = 0
    pinchLatched = false
  }

  const loop = () => {
    if (!running || destroyed) return
    rafId = requestAnimationFrame(loop)

    if (!video || !landmarker) return
    if (video.readyState < 2 || video.videoWidth === 0) return
    // MediaPipe throws if handed the same timestamp twice.
    if (video.currentTime === lastVideoTime) return
    lastVideoTime = video.currentTime

    const now = performance.now()
    frameTimes.push(now)
    if (frameTimes.length > 30) frameTimes.shift()
    if (frameTimes.length === 30) {
      const fps = 29000 / (frameTimes[29] - frameTimes[0])
      if (fps < opts.minFps && !degradedReported) {
        degradedReported = true
        setStatus(GESTURE_STATUS.DEGRADED)
      }
    }

    let result
    try {
      result = landmarker.detectForVideo(video, now)
    } catch {
      // A single bad frame is not fatal; a persistent failure shows up as
      // "no hand detected", which the UI already communicates.
      return
    }

    const landmarks = result?.landmarks?.[0]
    if (!landmarks) {
      if (smoothed) {
        resetInteraction()
        onPointer?.(null)
        onGesture?.(GESTURE.NONE)
      }
      return
    }

    const { gesture, pinchRatio } = classifyHand(landmarks)
    onGesture?.(gesture, { pinchRatio })

    const tip = landmarks[LM.INDEX_TIP]
    const rawX = opts.mirror ? 1 - tip.x : tip.x
    const rawY = tip.y

    // Exponential smoothing — raw landmarks jitter too much to aim with.
    if (!smoothed) smoothed = { x: rawX, y: rawY }
    else {
      smoothed = {
        x: smoothed.x + (rawX - smoothed.x) * (1 - opts.smoothing),
        y: smoothed.y + (rawY - smoothed.y) * (1 - opts.smoothing),
      }
    }

    const pointer = {
      x: Math.max(0, Math.min(1, smoothed.x)),
      y: Math.max(0, Math.min(1, smoothed.y)),
      gesture,
    }

    // --- Open palm cancels, and clears any dwell in progress ---
    if (gesture === GESTURE.OPEN_PALM) {
      dwellAnchor = null
      onPointer?.({ ...pointer, dwellProgress: 0 })
      onCancel?.()
      return
    }

    // --- Pinch selects, latched so one squeeze fires once ---
    if (gesture === GESTURE.PINCH) {
      dwellAnchor = null
      if (!pinchLatched && now - lastPinchAt > opts.pinchCooldownMs) {
        pinchLatched = true
        lastPinchAt = now
        onPointer?.({ ...pointer, dwellProgress: 0 })
        onSelect?.({ ...pointer, via: GESTURE.PINCH })
        return
      }
      onPointer?.({ ...pointer, dwellProgress: 0 })
      return
    }
    pinchLatched = false

    // --- Dwell: hold inside a small radius long enough ---
    let dwellProgress = 0
    if (gesture === GESTURE.POINT) {
      if (!dwellAnchor || dist2d(pointer, dwellAnchor) > opts.dwellRadius) {
        dwellAnchor = { x: pointer.x, y: pointer.y }
        dwellStart = now
      } else {
        dwellProgress = Math.min(1, (now - dwellStart) / opts.dwellMs)
        if (dwellProgress >= 1) {
          dwellAnchor = null
          onPointer?.({ ...pointer, dwellProgress: 1 })
          onSelect?.({ ...pointer, via: 'dwell' })
          return
        }
      }
    } else {
      dwellAnchor = null
    }

    onPointer?.({ ...pointer, dwellProgress })
  }

  return {
    get status() {
      return status
    },
    get running() {
      return running
    },

    setOptions(next = {}) {
      Object.assign(opts, next)
    },

    async start() {
      if (destroyed || running) return status

      const blocker = gestureBlocker()
      if (blocker) {
        setStatus(blocker)
        return status
      }

      setStatus(GESTURE_STATUS.LOADING)

      try {
        landmarker = await loadHandLandmarker()
      } catch (err) {
        setStatus(err?.message === GESTURE_STATUS.MODEL_FAILED ? GESTURE_STATUS.MODEL_FAILED : GESTURE_STATUS.ERROR)
        return status
      }
      if (destroyed) return status

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
      } catch (err) {
        const name = err?.name || ''
        if (name === 'NotAllowedError' || name === 'SecurityError') setStatus(GESTURE_STATUS.PERMISSION_DENIED)
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus(GESTURE_STATUS.NO_CAMERA)
        else setStatus(GESTURE_STATUS.ERROR)
        return status
      }
      if (destroyed) {
        teardownStream()
        return status
      }

      video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.srcObject = stream

      try {
        await video.play()
      } catch {
        // Autoplay refusal — without a playing element there are no frames.
        teardownStream()
        setStatus(GESTURE_STATUS.ERROR)
        return status
      }

      frameTimes = []
      degradedReported = false
      lastVideoTime = -1
      resetInteraction()

      running = true
      setStatus(GESTURE_STATUS.RUNNING)
      rafId = requestAnimationFrame(loop)
      return status
    },

    stop() {
      running = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      teardownStream()
      resetInteraction()
      onPointer?.(null)
      setStatus(GESTURE_STATUS.IDLE)
    },

    destroy() {
      destroyed = true
      running = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      teardownStream()
      // The landmarker itself is memoised across mounts on purpose — reloading
      // a 7 MB model every time the user opens a drill would be wasteful.
      landmarker = null
    },
  }
}

/**
 * Hit-test a normalised pointer against DOM elements carrying
 * `data-gesture-target`. Returns the element under the pointer, or null.
 *
 * Screen-space hit testing rather than maintaining a parallel geometry model,
 * so gesture targets stay in sync with whatever the layout actually did.
 */
export function hitTestGestureTargets(pointer, container) {
  if (!pointer || typeof document === 'undefined') return null
  const root = container || document
  const targets = root.querySelectorAll('[data-gesture-target]')
  if (!targets.length) return null

  const x = pointer.x * window.innerWidth
  const y = pointer.y * window.innerHeight

  for (const el of targets) {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return el
  }
  return null
}

/** Human-readable explanation for a status code, keyed for i18n lookup. */
export function gestureStatusKey(status) {
  switch (status) {
    case GESTURE_STATUS.LOADING:
      return 'gesture_loading'
    case GESTURE_STATUS.RUNNING:
      return 'gesture_running'
    case GESTURE_STATUS.DEGRADED:
      return 'gesture_degraded'
    case GESTURE_STATUS.UNSUPPORTED:
      return 'gesture_unsupported'
    case GESTURE_STATUS.NO_CAMERA:
      return 'gesture_no_camera'
    case GESTURE_STATUS.PERMISSION_DENIED:
      return 'gesture_permission_denied'
    case GESTURE_STATUS.MODEL_FAILED:
      return 'gesture_model_failed'
    case GESTURE_STATUS.ERROR:
      return 'gesture_error'
    default:
      return 'gesture_idle'
  }
}
