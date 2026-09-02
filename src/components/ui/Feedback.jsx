// Loading, empty and error states, and Progress.
//
// WHY THESE ARE PRIMITIVES RATHER THAN AD-HOC MARKUP
// "It's a collection of screens" versus "it's a product" is largely decided by
// what happens when there is no data, when data is loading, and when something
// failed. Those three cases were previously handled in one page (Dashboard) and
// nowhere else, so every other screen either flashed empty or rendered a bare
// zero — which on a readiness dashboard is not merely ugly, it is wrong
// information.

/**
 * Skeleton block. Sized by the caller so the placeholder occupies the same space
 * as the content it stands in for; a skeleton that is the wrong size just moves
 * the layout shift rather than removing it.
 */
export function Skeleton({ className = '', rounded = 'md', style }) {
  const radius = rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded'
  return <div aria-hidden="true" style={style} className={`skeleton ${radius} ${className}`} />
}

/** Several lines of placeholder text, last line short as real text tends to be. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-surface-1 border border-line-subtle rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-11 h-11" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

/**
 * Empty state. `action` matters more than the illustration: an empty state that
 * only says "no data" leaves the user to work out what would create some.
 */
export function EmptyState({ icon = null, title, body, action = null, className = '' }) {
  return (
    <div className={`text-center py-12 px-5 ${className}`}>
      {icon ? <div className="mx-auto mb-4 opacity-60 w-fit">{icon}</div> : null}
      {title ? <p className="font-display font-bold text-xl uppercase text-ink mb-2">{title}</p> : null}
      {body ? <p className="text-sm text-ink-tertiary max-w-sm mx-auto leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}

/**
 * Error state.
 *
 * `role="alert"` so it is announced. Deliberately distinct from EmptyState:
 * conflating "nothing here yet" with "something broke" is how users stop trusting
 * either message.
 */
export function ErrorState({ icon = null, title, body, action = null, className = '' }) {
  return (
    <div
      role="alert"
      className={`text-center py-10 px-5 border border-hazard-border bg-hazard-subtle rounded-xl ${className}`}
    >
      {icon ? <div className="mx-auto mb-4 w-fit">{icon}</div> : null}
      {title ? <p className="font-display font-bold text-lg uppercase text-hazard-text mb-2">{title}</p> : null}
      {body ? <p className="text-sm text-ink-secondary max-w-sm mx-auto leading-relaxed">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

const PROGRESS_TONES = {
  brand: 'bg-brand',
  safe: 'bg-safe',
  warning: 'bg-warning',
  hazard: 'bg-hazard',
}

/**
 * Progress bar.
 *
 * Not used for the drill latency bar — that has its own `.latency-bar` class with
 * a 120ms linear transition, because a decelerating ease on a countdown would
 * misrepresent how much time is actually left.
 */
export function Progress({ value = 0, max = 100, tone = 'brand', size = 'md', label, showValue = false, className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const height = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2'

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="flex items-center justify-between gap-3 mb-1.5">
          {label ? (
            <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">{label}</span>
          ) : null}
          {showValue ? <span className="font-mono text-xs text-ink tabular-nums">{Math.round(pct)}%</span> : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || undefined}
        className={`${height} w-full bg-surface-inset rounded-full overflow-hidden`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-slow ease-out ${
            PROGRESS_TONES[tone] || PROGRESS_TONES.brand
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
