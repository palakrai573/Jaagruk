import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  openRearCamera,
  stopStream,
  createOrientationTracker,
  computeFov,
  projectAnchor,
  anchorMeta,
  isPortrait,
  orientationNeedsPermission,
  ORIENTATION_STATUS,
  HEADING_SOURCE,
  CAMERA_ERROR,
} from '../lib/siteMap.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * COLOURS IN THIS FILE ARE DELIBERATELY NOT TOKENS.
 *
 * Everything drawn here sits on top of a LIVE CAMERA FEED, not on an app surface.
 * A theme-aware colour is meaningless there: the background is whatever the worker
 * is pointing the phone at, which might be a bright doorway or a dark shaft wall.
 * Marker outlines stay near-white and the aim reticle stays ISO amber in both
 * themes because they have to hold against the camera image, not against a
 * surface token. The Phase 3 token sweep skipped this file on purpose.
 */

/**
 * Live AR viewport: rear camera passthrough with hazard markers anchored to
 * real compass bearings.
 *
 * Two modes:
 *   'view' — markers are informational; the worker sees where the exit, the
 *            extinguisher and the gas zone actually are in this room.
 *   'aim'  — the worker must physically point the phone at the correct anchor
 *            and hold it there. This is the "pick the right exit" interaction,
 *            and because it requires turning the body it is what builds the
 *            spatial reflex the classroom cannot.
 *
 * Every failure path ends somewhere useful. No camera, no compass, denied
 * permission, landscape orientation, low frame rate — each surfaces a specific
 * message plus the "use the 3D view instead" escape hatch, which the parent
 * wires to the existing SafetyScene3D. AR is never the only way through.
 */

const CAMERA_ERROR_KEYS = {
  [CAMERA_ERROR.PERMISSION_DENIED]: 'ar_camera_denied',
  [CAMERA_ERROR.NOT_FOUND]: 'ar_camera_missing',
  [CAMERA_ERROR.IN_USE]: 'ar_camera_in_use',
  [CAMERA_ERROR.UNSUPPORTED]: 'ar_camera_unsupported',
  [CAMERA_ERROR.UNKNOWN]: 'ar_camera_unknown',
}

// ~30fps is smooth enough for marker tracking and stops orientation events
// (which fire at up to 60Hz) from triggering a React render each time.
const RENDER_INTERVAL_MS = 33

export default function ARDrill({
  anchors = [],
  mode = 'view',
  targetTypes = null,
  aimToleranceDeg = 14,
  aimHoldMs = 1200,
  onAimComplete,
  onFallback,
  // Exposes the live camera bearing/elevation to the parent. Site Setup needs it
  // to record where the supervisor is pointing when they drop an anchor, and
  // sharing this viewport means the camera, permission and fallback handling
  // exist in exactly one place.
  onView,
  smoke = 0,
  zoneName = '',
  isGenericZone = false,
  height = 420,
  children,
}) {
  const { t } = useLanguage()

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const trackerRef = useRef(null)
  const viewRef = useRef({ heading: 0, elevation: 0 })
  const rafRef = useRef(null)
  const lastRenderRef = useRef(0)
  const aimStartRef = useRef(0)
  const aimFiredRef = useRef(false)
  const mountedRef = useRef(true)
  // Held in a ref so a parent passing an inline arrow function does not restart
  // the render loop on every one of its own renders.
  const onViewRef = useRef(onView)
  onViewRef.current = onView

  const [cameraError, setCameraError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [orientationStatus, setOrientationStatus] = useState(ORIENTATION_STATUS.IDLE)
  const [headingSource, setHeadingSource] = useState(HEADING_SOURCE.NONE)
  const [needsGesture, setNeedsGesture] = useState(orientationNeedsPermission())
  const [videoSize, setVideoSize] = useState({ width: 480, height: 640 })
  const [portrait, setPortrait] = useState(isPortrait())
  const [view, setView] = useState({ heading: 0, elevation: 0 })
  const [aimProgress, setAimProgress] = useState(0)
  const [aimedAnchorId, setAimedAnchorId] = useState(null)

  const fov = useMemo(() => computeFov(videoSize.width, videoSize.height), [videoSize])

  const visibleAnchors = useMemo(() => {
    if (!Array.isArray(anchors)) return []
    if (!targetTypes || !targetTypes.length) return anchors
    return anchors.filter((a) => targetTypes.includes(a.type))
  }, [anchors, targetTypes])

  /* ---------------- camera ---------------- */

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await openRearCamera()
      if (!mountedRef.current) {
        stopStream(stream)
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stopStream(stream)
        return
      }
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        // Autoplay refused. The stream is live but nothing will render, so this
        // is a real failure rather than something to ignore.
        if (mountedRef.current) setCameraError(CAMERA_ERROR.UNKNOWN)
        return
      }
      if (mountedRef.current) setCameraReady(true)
    } catch (err) {
      if (mountedRef.current) setCameraError(err?.message || CAMERA_ERROR.UNKNOWN)
    }
  }, [])

  /* ---------------- orientation ---------------- */

  const startOrientation = useCallback(async () => {
    if (trackerRef.current) return
    const tracker = createOrientationTracker({
      onUpdate: (state) => {
        viewRef.current = { heading: state.heading, elevation: state.elevation }
        if (mountedRef.current) setHeadingSource(state.headingSource)
      },
      onStatus: (status) => {
        if (mountedRef.current) setOrientationStatus(status)
      },
    })
    trackerRef.current = tracker
    await tracker.start()
  }, [])

  /* ---------------- lifecycle ---------------- */

  useEffect(() => {
    mountedRef.current = true
    startCamera()
    // iOS needs a user gesture before it will hand over orientation data, so we
    // only auto-start where no gesture is required.
    if (!orientationNeedsPermission()) startOrientation()

    return () => {
      mountedRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      trackerRef.current?.stop()
      trackerRef.current = null
      stopStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) {
        try {
          video.pause()
          video.srcObject = null
        } catch {
          /* already torn down */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Orientation changes flip the projection maths, so track it.
  useEffect(() => {
    const onOrientationChange = () => {
      if (mountedRef.current) setPortrait(isPortrait())
    }
    window.addEventListener('orientationchange', onOrientationChange)
    try {
      screen.orientation?.addEventListener?.('change', onOrientationChange)
    } catch {
      /* not supported */
    }
    return () => {
      window.removeEventListener('orientationchange', onOrientationChange)
      try {
        screen.orientation?.removeEventListener?.('change', onOrientationChange)
      } catch {
        /* not supported */
      }
    }
  }, [])

  // Pause the camera while the tab is hidden — it saves battery and stops
  // Android from killing the stream in a way we can't recover from.
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) {
        try {
          video.pause()
        } catch {
          /* ignore */
        }
      } else {
        video.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  /* ---------------- render + aim loop ---------------- */

  const targetAnchors = useMemo(
    () => visibleAnchors.filter((a) => !targetTypes || targetTypes.includes(a.type)),
    [visibleAnchors, targetTypes]
  )

  useEffect(() => {
    // Reset aim state whenever the task changes, so a new step doesn't inherit
    // a partially-completed hold from the previous one.
    aimStartRef.current = 0
    aimFiredRef.current = false
    setAimProgress(0)
    setAimedAnchorId(null)
  }, [mode, targetTypes])

  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const now = performance.now()
      if (now - lastRenderRef.current < RENDER_INTERVAL_MS) return
      lastRenderRef.current = now

      const current = viewRef.current
      setView(current)
      onViewRef.current?.({ ...current, headingSource, hFov: fov.hFov, vFov: fov.vFov })

      if (mode !== 'aim' || aimFiredRef.current) return

      const viewport = { ...current, hFov: fov.hFov, vFov: fov.vFov }
      let closest = null
      for (const anchor of targetAnchors) {
        const projected = projectAnchor(anchor, viewport)
        if (projected.angularError <= aimToleranceDeg && (!closest || projected.angularError < closest.error)) {
          closest = { anchor, error: projected.angularError }
        }
      }

      if (!closest) {
        aimStartRef.current = 0
        setAimProgress(0)
        setAimedAnchorId(null)
        return
      }

      setAimedAnchorId(closest.anchor.id)
      if (!aimStartRef.current) aimStartRef.current = now

      const held = now - aimStartRef.current
      const progress = Math.min(1, held / Math.max(1, aimHoldMs))
      setAimProgress(progress)

      if (progress >= 1) {
        aimFiredRef.current = true
        onAimComplete?.(closest.anchor)
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetAnchors, fov.hFov, fov.vFov, aimToleranceDeg, aimHoldMs, onAimComplete])

  /* ---------------- derived ---------------- */

  const viewport = { ...view, hFov: fov.hFov, vFov: fov.vFov }
  const orientationDead =
    orientationStatus === ORIENTATION_STATUS.UNSUPPORTED || orientationStatus === ORIENTATION_STATUS.DENIED
  const showFallbackOffer = !!cameraError || orientationDead

  const projected = visibleAnchors.map((anchor) => ({
    anchor,
    p: projectAnchor(anchor, viewport),
  }))

  // When every marker is more than 90 degrees off, a small edge chevron is not
  // enough — the worker is facing the wrong way entirely and needs to be told
  // so, not left to infer it from an arrow. `projected` is already narrowed to
  // targetTypes by visibleAnchors, so no second filter is needed here.
  const facingAway = projected.length > 0 && projected.every(({ p }) => Math.abs(p.relBearing) > 90)

  /* ---------------- error state ---------------- */

  if (cameraError) {
    return (
      <ARShell height={height}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
          <Pictogram name="warning" size={44} />
          <p className="font-display font-bold text-xl uppercase">{t('ar_unavailable')}</p>
          <p className="text-concrete text-sm max-w-sm">{t(CAMERA_ERROR_KEYS[cameraError] || 'ar_camera_unknown')}</p>
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <button
              onClick={startCamera}
              className="border border-concrete rounded px-4 py-2 font-mono text-xs hover:border-amber hover:text-amber"
            >
              {t('ar_retry')}
            </button>
            {onFallback && (
              <button onClick={onFallback} className="bg-amber text-steel font-bold text-xs uppercase px-4 py-2 rounded">
                {t('ar_use_3d')}
              </button>
            )}
          </div>
        </div>
      </ARShell>
    )
  }

  /* ---------------- live view ---------------- */

  return (
    <ARShell height={height}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          if (el.videoWidth && el.videoHeight) setVideoSize({ width: el.videoWidth, height: el.videoHeight })
        }}
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-steel">
          <p className="font-mono text-xs text-concrete uppercase tracking-widest">{t('ar_starting')}</p>
        </div>
      )}

      {/* Smoke / low-visibility effect for fire and gas drills */}
      {smoke > 0 && (
        <div
          className="absolute inset-0 pointer-events-none ar-smoke"
          style={{ opacity: Math.max(0, Math.min(1, smoke)) }}
          aria-hidden="true"
        />
      )}

      {/* Facing the wrong way entirely */}
      {cameraReady && !orientationDead && facingAway && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none px-5 py-4 rounded-lg bg-steel/85 border border-amber"
          role="status"
          aria-live="polite"
        >
          <Pictogram name="rotate" size={34} />
          <p className="font-display font-bold text-sm uppercase tracking-wide text-amber text-center">
            {t('ar_turn_around')}
          </p>
        </div>
      )}

      {/* Markers */}
      {cameraReady &&
        !orientationDead &&
        projected.map(({ anchor, p }) => {
          const meta = anchorMeta(anchor.type)
          if (p.offScreen) {
            // Off-screen anchors become an edge arrow, so the worker knows
            // which way to turn instead of hunting blindly.
            const verticalOnly = Math.abs(p.relBearing) <= fov.hFov / 2
            if (verticalOnly) return null
            return (
              <div
                key={anchor.id}
                className="absolute flex items-center gap-1 pointer-events-none"
                style={{
                  top: '50%',
                  [p.side === 'left' ? 'left' : 'right']: 6,
                  transform: 'translateY(-50%)',
                }}
                aria-hidden="true"
              >
                {p.side === 'right' && <Pictogram name={meta.pictogram} size={22} />}
                <span className="font-display font-bold text-lg" style={{ color: meta.color }}>
                  {p.side === 'left' ? '‹' : '›'}
                </span>
                {p.side === 'left' && <Pictogram name={meta.pictogram} size={22} />}
              </div>
            )
          }

          const isAimed = aimedAnchorId === anchor.id
          return (
            <div
              key={anchor.id}
              className="absolute pointer-events-none flex flex-col items-center"
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                // Fade markers that sit far from the centre so the view doesn't
                // become a wall of icons in a densely scanned zone.
                opacity: Math.max(0.45, 1 - p.angularError / 90),
              }}
            >
              <div
                className="rounded-lg p-1.5 flex items-center justify-center transition-transform"
                style={{
                  background: 'rgba(28,31,34,0.72)',
                  border: `2px solid ${isAimed ? '#F2F1ED' : meta.color}`,
                  transform: isAimed ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                <Pictogram name={meta.pictogram} size={30} label={anchor.label || meta.labelKey} />
              </div>
              <span
                className="mt-1 font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap"
                // Fixed dark ink on a fixed ISO-coloured chip. Not a token: the
              // background is an ISO safety hue that is identical in both themes,
              // so the text on it must be too.
              style={{ background: meta.color, color: '#1C1F22' }}
              >
                {anchor.label || t(meta.labelKey)}
              </span>
            </div>
          )
        })}

      {/* Aim reticle */}
      {mode === 'aim' && cameraReady && !orientationDead && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
            <circle cx="43" cy="43" r="38" fill="none" stroke="rgba(242,241,237,0.35)" strokeWidth="2" />
            <circle
              cx="43"
              cy="43"
              r="38"
              fill="none"
              stroke="#FFB020"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${aimProgress * 238.8} 238.8`}
              transform="rotate(-90 43 43)"
            />
            <circle cx="43" cy="43" r="3" fill="#F2F1ED" />
          </svg>
        </div>
      )}

      {/* Status chrome */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col gap-1">
          {zoneName && (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-steel/80 text-chalk px-2 py-1 rounded">
              {zoneName}
            </span>
          )}
          {isGenericZone && (
            <span className="font-mono text-[10px] bg-amber/90 text-steel px-2 py-1 rounded max-w-[220px] leading-snug">
              {t('ar_generic_zone')}
            </span>
          )}
        </div>
        {headingSource === HEADING_SOURCE.COMPASS && (
          <span className="font-mono text-[10px] uppercase tracking-widest bg-steel/80 text-safe px-2 py-1 rounded">
            {Math.round(view.heading)}°
          </span>
        )}
      </div>

      {/* iOS orientation permission gate */}
      {needsGesture && orientationStatus !== ORIENTATION_STATUS.ACTIVE && !orientationDead && (
        <div className="absolute inset-0 bg-steel/85 flex flex-col items-center justify-center text-center px-6 gap-3">
          <Pictogram name="listen" size={40} />
          <p className="font-display font-bold text-lg uppercase">{t('ar_permission_title')}</p>
          <p className="text-concrete text-sm max-w-xs">{t('ar_permission_body')}</p>
          <button
            onClick={async () => {
              setNeedsGesture(false)
              await startOrientation()
            }}
            className="bg-amber text-steel font-display font-bold uppercase px-6 py-2.5 rounded"
          >
            {t('ar_enable_motion')}
          </button>
        </div>
      )}

      {/* Landscape warning — the projection maths is only correct in portrait */}
      {!portrait && cameraReady && (
        <div className="absolute inset-x-0 bottom-0 bg-hazard/90 px-3 py-2 text-center">
          <p className="font-mono text-[11px] text-white">{t('ar_rotate_portrait')}</p>
        </div>
      )}

      {/* Compass warnings */}
      {portrait && headingSource === HEADING_SOURCE.RELATIVE && (
        <div className="absolute inset-x-0 bottom-0 bg-amber/90 px-3 py-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-steel leading-snug flex-1">{t('ar_relative_heading')}</p>
          <button
            onClick={() => trackerRef.current?.recentre(0)}
            className="bg-steel text-amber font-mono text-[10px] uppercase px-2.5 py-1 rounded shrink-0"
          >
            {t('ar_recentre')}
          </button>
        </div>
      )}

      {portrait && orientationDead && (
        <div className="absolute inset-0 bg-steel/88 flex flex-col items-center justify-center text-center px-6 gap-3">
          <Pictogram name="warning" size={40} />
          <p className="font-display font-bold text-lg uppercase">{t('ar_no_compass_title')}</p>
          <p className="text-concrete text-sm max-w-sm">{t('ar_no_compass_body')}</p>
          {onFallback && (
            <button onClick={onFallback} className="bg-amber text-steel font-bold text-xs uppercase px-4 py-2 rounded mt-1">
              {t('ar_use_3d')}
            </button>
          )}
        </div>
      )}

      {/* Caller-supplied overlay (prompts, choices) */}
      {children}

      {showFallbackOffer && onFallback && !orientationDead && (
        <button
          onClick={onFallback}
          className="absolute bottom-2 right-2 bg-steel/85 border border-concrete rounded px-2.5 py-1 font-mono text-[10px] uppercase text-chalk"
        >
          {t('ar_use_3d')}
        </button>
      )}
    </ARShell>
  )
}

function ARShell({ height, children }) {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-steel-lighter bg-steel mb-6"
      style={{ height }}
    >
      {children}
    </div>
  )
}
