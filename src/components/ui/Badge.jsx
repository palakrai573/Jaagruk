// Badge and StatusDot.
//
// Tone maps to the ISO 7010 semantics, so a badge cannot accidentally borrow a
// safety colour for decoration: `warning` genuinely means caution, `hazard`
// genuinely means something is wrong. `neutral` and `brand` are the decorative
// options, and they are the only decorative options.
//
// Badges use the *-text token rather than the raw ISO hue, because a badge is
// small text on a tinted surface — ISO yellow on white is about 1.9:1, which is
// unreadable. The tinted background uses the *-subtle token so the pairing is
// contrast-checked in both themes.

const TONES = {
  neutral: 'bg-surface-3 text-ink-secondary border-line-subtle',
  brand: 'bg-brand-subtle text-brand-text border-brand-border',
  safe: 'bg-safe-subtle text-safe-text border-safe-border',
  warning: 'bg-warning-subtle text-warning-text border-warning-border',
  hazard: 'bg-hazard-subtle text-hazard-text border-hazard-border',
  mandate: 'bg-mandate-subtle text-mandate-text border-mandate-border',
}

const SIZES = {
  sm: 'text-2xs px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export function Badge({ tone = 'neutral', size = 'md', dot = false, icon = null, className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-widest whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        SIZES[size] || SIZES.md,
        className,
      ].join(' ')}
    >
      {dot ? <StatusDot tone={tone} /> : null}
      {icon}
      {children}
    </span>
  )
}

const DOT_TONES = {
  neutral: 'bg-ink-tertiary',
  brand: 'bg-brand',
  safe: 'bg-safe',
  warning: 'bg-warning',
  hazard: 'bg-hazard',
  mandate: 'bg-mandate',
}

/**
 * A coloured dot, optionally pulsing.
 *
 * `aria-hidden` always: a dot conveys nothing to a screen reader, so the meaning
 * has to be in adjacent text. The Dashboard live indicator learned this the hard
 * way — it pulsed for weeks with no text alternative at all.
 */
export function StatusDot({ tone = 'neutral', pulse = false, size = 8, className = '' }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={[
        'inline-block rounded-full shrink-0',
        DOT_TONES[tone] || DOT_TONES.neutral,
        pulse ? 'live-dot' : '',
        className,
      ].join(' ')}
    />
  )
}

export default Badge
