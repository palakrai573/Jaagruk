import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createGestureController,
  hitTestGestureTargets,
  gestureStatusKey,
  GESTURE,
  GESTURE_STATUS,
} from '../lib/gesture.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Touchless control overlay.
 *
 * WHY THIS MATTERS HERE: the workers this is built for wear gloves and work in
 * dust. Small on-screen buttons are the point at which a demo-pretty UI stops
 * being usable at the actual job.
 *
 * HOW IT COMPOSES: this component does not know what it is selecting. It
 * hit-tests whatever carries `data-gesture-target` and dispatches a real click on
 * it, so any button anywhere in the app becomes gesture-operable just by having
 * that attribute. ChoiceCard already does.
 *
 * TWO WAYS TO CONFIRM, on purpose:
 *   - pinch, which is fast for anyone who can make the gesture cleanly
 *   - dwell (hold still ~1.2 s), because heavy gloves are exactly what takes
 *     pinch precision away
 *
 * Everything degrades to touch. The cursor never intercepts pointer events, and
 * if the model, camera or frame rate fails the overlay reports it and gets out of
 * the way.
 */

export default function GestureLayer({ enabled = false, onStatusChange }) {
  const { t } = useLanguage()

  const controllerRef = useRef(null)
  const hoveredRef = useRef(null)
  const pointerRef = useRef(null)

  const [pointer, setPointer] = useState(null)
  const [status, setStatus] = useState(GESTURE_STATUS.IDLE)
  const [gesture, setGesture] = useState(GESTURE.NONE)
  const [dismissedNotice, setDismissedNotice] = useState(false)

  /* ---------------- hover tracking ---------------- */

  const clearHover = useCallback(() => {
    if (hoveredRef.current) {
      hoveredRef.current.removeAttribute('data-gesture-hover')
      hoveredRef.current = null
    }
  }, [])

  const updateHover = useCallback(
    (next) => {
      if (hoveredRef.current === next) return
      clearHover()
      if (next) {
        next.setAttribute('data-gesture-hover', 'true')
        hoveredRef.current = next
      }
    },
    [clearHover]
  )

  /* ---------------- lifecycle ---------------- */

  useEffect(() => {
    if (!enabled) return undefined

    const controller = createGestureController({
      onPointer: (p) => {
        pointerRef.current = p
        setPointer(p)
        if (!p) {
          clearHover()
          return
        }
        updateHover(hitTestGestureTargets(p))
      },

      onSelect: () => {
        // Dispatch on the element itself rather than calling a callback, so this
        // layer stays agnostic about what it is activating.
        const target = hoveredRef.current
        if (!target || target.disabled) return
        try {
          target.click()
        } catch {
          /* the element went away between hit test and select */
        }
        clearHover()
      },

      onCancel: () => clearHover(),

      onGesture: (g) => setGesture(g),

      onStatus: (next) => {
        setStatus(next)
        onStatusChange?.(next)
      },
    })

    controllerRef.current = controller
    controller.start()

    return () => {
      controller.destroy()
      controllerRef.current = null
      clearHover()
      setPointer(null)
      pointerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Never leave a stray highlight behind on unmount.
  useEffect(() => clearHover, [clearHover])

  if (!enabled) return null

  const running = status === GESTURE_STATUS.RUNNING
  const failed = [
    GESTURE_STATUS.UNSUPPORTED,
    GESTURE_STATUS.NO_CAMERA,
    GESTURE_STATUS.PERMISSION_DENIED,
    GESTURE_STATUS.MODEL_FAILED,
    GESTURE_STATUS.ERROR,
  ].includes(status)

  return (
    <>
      {/* Cursor. pointer-events:none is essential — it must never eat a real tap. */}
      {running && pointer && (
        <div
          className="gesture-cursor"
          style={{ left: `${pointer.x * 100}vw`, top: `${pointer.y * 100}vh` }}
          aria-hidden="true"
        >
          <svg width="56" height="56" viewBox="0 0 56 56">
            {/*
              COLOURS HERE ARE FIXED, NOT TOKENISED — deliberately.
              The gesture cursor floats above every surface in the app, including
              the live camera feed during an AR drill. It has to hold against an
              unknown background rather than against a theme surface, so amber on
              near-white is correct in both themes.
            */}
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(242,241,237,0.28)" strokeWidth="3" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#FFB020"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(pointer.dwellProgress || 0) * 138.2} 138.2`}
              transform="rotate(-90 28 28)"
            />
            {/* Centre changes with the gesture, so the user can see it registered */}
            <circle
              cx="28"
              cy="28"
              r={gesture === GESTURE.PINCH ? 8 : 5}
              fill={gesture === GESTURE.PINCH ? '#FFB020' : '#F2F1ED'}
            />
          </svg>
        </div>
      )}

      {/* Status toast */}
      {!dismissedNotice && (status === GESTURE_STATUS.LOADING || status === GESTURE_STATUS.DEGRADED || failed) && (
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-steel-light border border-steel-lighter rounded-lg px-4 py-3 flex items-start gap-3 shadow-2xl fade-in"
          role="status"
        >
          <Pictogram name={failed ? 'warning' : status === GESTURE_STATUS.DEGRADED ? 'slow' : 'gloves'} size={22} />
          <p className="text-xs text-concrete leading-relaxed max-w-xs">{t(gestureStatusKey(status))}</p>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            aria-label={t('close_label')}
            className="text-concrete hover:text-chalk leading-none shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Live hint while tracking, so the user knows the two ways to confirm */}
      {running && (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-steel/85 border border-amber/40 rounded-full px-3 py-1.5 flex items-center gap-2 pointer-events-none fade-in"
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber live-dot" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber">{t('gesture_running')}</span>
        </div>
      )}
    </>
  )
}
