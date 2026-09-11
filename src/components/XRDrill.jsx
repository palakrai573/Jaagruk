/*
 * The immersive-AR shell: owns the session, the alignment flow, and the DOM overlay.
 *
 * WHY THE UI STAYS AS DOM
 *
 * The session is requested with `dom-overlay`, so this component's own markup renders
 * on top of the passthrough camera. That means the drill's buttons, labels, live
 * regions and translations work inside XR unchanged — everything the accessibility
 * gates already check keeps applying. Rebuilding the interface as 3D text would have
 * thrown away six languages, the pictogram mode and every screen-reader affordance in
 * exchange for looking more like a demo.
 *
 * Where dom-overlay is not granted the session still runs; the controls simply sit
 * behind it, which is why entering and exiting are also bound to the session's own
 * `end` event rather than only to a button.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  xrBlocker,
  immersiveArSupported,
  immersiveArSessionInit,
  grantedFeatures,
  siteFrameFrom,
  worldToSite,
  siteBearing,
  siteElevation,
  siteDistance,
  ALIGN_ERROR,
  MIN_ALIGNMENT_BASELINE_M,
  XR_BLOCK_KEYS,
} from '../lib/webxr.js'
import XRScene from './XRScene.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/** Where the worker is in the alignment sequence. */
const PHASE = {
  IDLE: 'idle',
  MARKER: 'marker',
  REFERENCE: 'reference',
  READY: 'ready',
}

export default function XRDrill({
  anchors = [],
  aimedAnchorId = null,
  /** Called with a new anchor position when the supervisor places one. */
  onPlace,
  /** Called when the site frame is established, so the caller can persist it. */
  onAligned,
  /** A previously saved frame, to skip alignment when the session is re-entered. */
  savedFrame = null,
  zoneName = '',
  children,
}) {
  const { t } = useLanguage()
  const overlayRef = useRef(null)
  const sessionRef = useRef(null)
  const glRef = useRef(null)
  const reticleRef = useRef(null)

  const [supported, setSupported] = useState(null)
  const [active, setActive] = useState(false)
  const [features, setFeatures] = useState(null)
  const [phase, setPhase] = useState(savedFrame ? PHASE.READY : PHASE.IDLE)
  const [frame, setFrame] = useState(savedFrame)
  const [alignOrigin, setAlignOrigin] = useState(null)
  const [alignReference, setAlignReference] = useState(null)
  const [hasReticle, setHasReticle] = useState(false)
  const [note, setNote] = useState(null)
  const [error, setError] = useState(null)

  const block = useMemo(() => xrBlocker(), [])

  // Probed once. isSessionSupported is real work, so it must not run per render.
  useEffect(() => {
    let cancelled = false
    if (block) {
      setSupported(false)
      return () => {
        cancelled = true
      }
    }
    immersiveArSupported().then((ok) => {
      if (!cancelled) setSupported(ok)
    })
    return () => {
      cancelled = true
    }
  }, [block])

  /* ---------------- session lifecycle ---------------- */

  const endSession = useCallback(() => {
    try {
      sessionRef.current?.end?.()
    } catch {
      // Already ending. The `end` handler below does the state cleanup either way.
    }
  }, [])

  const enter = useCallback(async () => {
    setError(null)
    const gl = glRef.current
    if (!gl) {
      // The Canvas has not mounted its renderer yet. Nothing to attach a session to.
      setError('xr_enter_failed')
      return
    }
    try {
      const session = await navigator.xr.requestSession(
        'immersive-ar',
        immersiveArSessionInit({ domOverlayRoot: overlayRef.current }),
      )
      sessionRef.current = session
      setFeatures(grantedFeatures(session))

      /*
       * Bound before setSession, because a session can end during startup — a
       * permission refusal, or the user swiping away — and the listener has to be
       * live for that.
       */
      session.addEventListener('end', () => {
        sessionRef.current = null
        setActive(false)
        setHasReticle(false)
        // The frame is deliberately KEPT. Re-entering the same zone should not mean
        // walking back to the marker plate and aligning again.
      })

      gl.xr.enabled = true
      await gl.xr.setSession(session)
      setActive(true)
      if (!savedFrame) setPhase(PHASE.MARKER)
    } catch {
      /*
       * requestSession rejects for refused permission, an unsupported required
       * feature, or an already-running session. None is recoverable here and all
       * mean the same thing to the worker: the camera mode did not start, use the
       * other one.
       */
      setError('xr_enter_failed')
    }
  }, [savedFrame])

  // Tear the session down if this unmounts mid-session, or the camera stays live.
  useEffect(() => () => endSession(), [endSession])

  /* ---------------- alignment ---------------- */

  const onReticle = useCallback((point) => {
    reticleRef.current = point
    setHasReticle((prev) => (!!point === prev ? prev : !!point))
  }, [])

  const tap = useCallback(() => {
    const point = reticleRef.current
    if (!point) {
      setNote('xr_no_surface')
      return
    }
    setNote(null)

    if (phase === PHASE.MARKER) {
      setAlignOrigin(point)
      setPhase(PHASE.REFERENCE)
      return
    }

    if (phase === PHASE.REFERENCE) {
      const built = siteFrameFrom(alignOrigin, point)
      if (built.error) {
        // Chiefly TOO_CLOSE: a short baseline turns a small tap error into a large
        // rotation of the whole zone, so it is refused with an explanation rather
        // than accepted and quietly skewed.
        setNote(built.error === ALIGN_ERROR.TOO_CLOSE ? 'xr_align_too_close' : 'xr_align_invalid')
        return
      }
      setAlignReference(point)
      setFrame(built)
      setPhase(PHASE.READY)
      onAligned?.(built)
      return
    }

    if (phase === PHASE.READY && frame && onPlace) {
      /*
       * A placed anchor carries BOTH representations: the site-frame position, which
       * is what makes it real, and the bearing and elevation the compass overlay
       * already understands. So a zone scanned here is still usable on a phone that
       * cannot run XR — the two modes stay one product instead of splitting into two
       * incompatible halves.
       */
      const local = worldToSite(point, frame)
      onPlace({
        local,
        bearing: siteBearing(local, frame),
        elevation: siteElevation(local),
        distanceM: siteDistance(local),
      })
    }
  }, [phase, alignOrigin, frame, onPlace, onAligned])

  const restartAlignment = useCallback(() => {
    setAlignOrigin(null)
    setAlignReference(null)
    setFrame(null)
    setPhase(PHASE.MARKER)
    setNote(null)
  }, [])

  /* ---------------- render ---------------- */

  // Nothing to offer: the caller keeps whatever fallback it already had.
  if (supported === false) {
    return (
      <div className="border border-line-subtle rounded-lg p-4">
        <p className="font-mono text-[11px] text-ink-tertiary leading-relaxed">
          {t(XR_BLOCK_KEYS[block] || 'xr_block_no_session')}
        </p>
      </div>
    )
  }

  if (supported === null) return null

  const promptKey =
    phase === PHASE.MARKER
      ? 'xr_align_marker'
      : phase === PHASE.REFERENCE
        ? 'xr_align_reference'
        : 'xr_place_anchor'

  return (
    <div className="relative">
      {/*
        The Canvas is mounted before any session exists so its renderer is available
        to attach one to. Zero height until active: an inert WebGL canvas taking up
        the page would push the drill's own controls off screen.
      */}
      <div style={{ height: active ? 320 : 0, overflow: 'hidden' }}>
        <Canvas
          onCreated={({ gl }) => {
            glRef.current = gl
          }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          camera={{ fov: 65, near: 0.05, far: 60 }}
          flat
          dpr={[1, 1.5]}
        >
          <XRScene
            anchors={anchors}
            frame={frame}
            aimedAnchorId={aimedAnchorId}
            alignOrigin={alignOrigin}
            alignReference={alignReference}
            onReticle={onReticle}
          />
        </Canvas>
      </div>

      {/*
        The dom-overlay root. Rendered as normal page markup when no session is
        running, and composited over the passthrough camera once one is — so the same
        translated, screen-readable controls serve both.
      */}
      <div ref={overlayRef} className={active ? 'fixed inset-0 z-50 pointer-events-none' : ''}>
        <div className={active ? 'absolute inset-x-0 bottom-0 p-4 pointer-events-auto' : ''}>
          {!active ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={enter}
                className="bg-brand text-ink-onBrand font-display font-bold uppercase py-3 px-5 rounded min-h-[56px]"
              >
                {t('xr_enter')}
              </button>
              <p className="font-mono text-[10px] text-ink-tertiary leading-relaxed">{t('xr_intro')}</p>
              {error && <p className="font-mono text-[11px] text-hazard-text">{t(error)}</p>}
            </div>
          ) : (
            <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(16,19,21,0.82)' }}>
              {zoneName && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">{zoneName}</span>
              )}

              <p className="font-display font-bold text-sm uppercase text-white" role="status" aria-live="polite">
                {t(promptKey)}
              </p>

              {/* The baseline requirement, stated while it is being satisfied rather
                  than only when it is violated. */}
              {phase === PHASE.REFERENCE && (
                <p className="font-mono text-[10px] text-white/70">
                  {MIN_ALIGNMENT_BASELINE_M}m
                </p>
              )}

              {note && <p className="font-mono text-[11px] text-[#FFB020]">{t(note)}</p>}

              {/* Occlusion is reported, never assumed. `known: false` means the
                  browser did not say, and claiming it either way would be a guess. */}
              {features?.known && (
                <p className="font-mono text-[9px] text-white/50">
                  {t(features.depth ? 'xr_depth_on' : 'xr_depth_off')}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={tap}
                  disabled={!hasReticle}
                  className="flex-1 bg-[#FFB020] text-[#101315] font-display font-bold uppercase py-3 px-4 rounded min-h-[56px] disabled:opacity-40"
                >
                  {t(hasReticle ? 'xr_tap_here' : 'xr_scanning')}
                </button>
                {phase === PHASE.READY && (
                  <button
                    type="button"
                    onClick={restartAlignment}
                    className="border border-white/40 text-white font-mono text-xs uppercase px-3 rounded min-h-[56px]"
                  >
                    {t('xr_realign')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={endSession}
                  className="border border-white/40 text-white font-mono text-xs uppercase px-3 rounded min-h-[56px]"
                >
                  {t('xr_exit')}
                </button>
              </div>

              {children}
            </div>
          )}
        </div>
      </div>

      {!active && (
        <div className="mt-3 flex items-start gap-2">
          <Pictogram name="warning" size={18} />
          <p className="text-[11px] text-ink-tertiary leading-relaxed">{t('xr_note')}</p>
        </div>
      )}
    </div>
  )
}
