import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext.jsx'

// Toasts.
//
// WHY A QUEUE AND NOT A SINGLE SLOT
// Sync finishing, a hazard report saving and a certificate issuing can land within
// a second of each other. A single slot means the last one wins and the worker
// never learns their report was stored. Capped at three visible so a burst cannot
// cover the bottom navigation.
//
// ACCESSIBILITY
// The region is aria-live="polite" and never steals focus, because a toast
// appearing mid-drill must not pull focus off the choice the worker is about to
// press. Anything that genuinely needs acknowledgement is a Dialog, not a toast.
//
// PLACEMENT
// Bottom on mobile but lifted clear of the 4-item bottom nav; top-end on desktop.
// A toast over the nav bar on a phone is a toast that blocks the thing the user
// reaches for next.

const ToastContext = createContext(null)

const DEFAULT_MS = 4000
const MAX_VISIBLE = 3

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    ({ tone = 'neutral', title, body, duration = DEFAULT_MS, action = null } = {}) => {
      const id = nextId
      nextId += 1

      setToasts((list) => {
        const next = [...list, { id, tone, title, body, action }]
        // Drop the oldest rather than the newest: the most recent event is the one
        // the user is most likely waiting to hear about.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })

      // duration 0 means it stays until dismissed — used for failures, which
      // should not disappear before the user has read them.
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        )
      }

      return id
    },
    [dismiss]
  )

  // Clear every pending timer on unmount so a navigation mid-toast cannot fire a
  // setState into an unmounted tree.
  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer)
      timers.current.clear()
    },
    []
  )

  const api = useRef(null)
  if (!api.current) api.current = {}
  api.current.push = push
  api.current.dismiss = dismiss
  api.current.success = (title, body, opts) => push({ tone: 'safe', title, body, ...opts })
  api.current.error = (title, body, opts) => push({ tone: 'hazard', title, body, duration: 0, ...opts })
  api.current.warn = (title, body, opts) => push({ tone: 'warning', title, body, ...opts })
  api.current.info = (title, body, opts) => push({ tone: 'brand', title, body, ...opts })

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const TONES = {
  neutral: 'bg-surface-2 border-line text-ink',
  brand: 'bg-surface-2 border-brand-border text-ink',
  safe: 'bg-surface-2 border-safe-border text-ink',
  warning: 'bg-surface-2 border-warning-border text-ink',
  hazard: 'bg-surface-2 border-hazard-border text-ink',
}

const BARS = {
  neutral: 'bg-ink-tertiary',
  brand: 'bg-brand',
  safe: 'bg-safe',
  warning: 'bg-warning',
  hazard: 'bg-hazard',
}

function ToastViewport({ toasts, onDismiss }) {
  // Translated here rather than passed in, so no call site can forget it and
  // leave an English screen-reader label in a Santali session.
  const { t } = useLanguage()
  const dismissLabel = t('dismiss_label')

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed z-toast pointer-events-none
                 inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]
                 md:inset-x-auto md:bottom-auto md:top-4 md:end-4 md:w-[380px]
                 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border shadow-3 overflow-hidden rise-in flex ${
            TONES[toast.tone] || TONES.neutral
          }`}
        >
          {/* Colour is carried by a rule, not by the whole surface: a fully
              tinted toast over a dark page is hard to read at small sizes. */}
          <span aria-hidden="true" className={`w-1 shrink-0 ${BARS[toast.tone] || BARS.neutral}`} />

          <div className="flex-1 min-w-0 px-4 py-3">
            {toast.title ? (
              <p className="font-display font-bold text-sm uppercase tracking-wide leading-tight">{toast.title}</p>
            ) : null}
            {toast.body ? <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{toast.body}</p> : null}
            {toast.action ? <div className="mt-2">{toast.action}</div> : null}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 px-3 text-ink-tertiary hover:text-ink transition-colors duration-fast
                       min-w-[44px] flex items-center justify-center"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
            <span className="sr-only">{dismissLabel}</span>
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Returns the toast API, or a no-op shim when no provider is mounted.
 *
 * The shim is deliberate: a missing provider must never crash a drill. A worker
 * losing the whole screen because a confirmation could not be displayed would be
 * a far worse failure than a silent toast.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  const noop = () => 0
  return { push: noop, dismiss: noop, success: noop, error: noop, warn: noop, info: noop }
}
