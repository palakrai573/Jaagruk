import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

// Button.
//
// FIVE VARIANTS, AND WHY THERE IS NO SIXTH
// primary / secondary / ghost / danger / quiet. Adding more would mean two
// variants competing for the same job, which is how a design system stops being
// one. `danger` uses the ISO hazard token because destructive actions and safety
// hazards genuinely are the same signal to a worker.
//
// THE `field` SIZE IS THE IMPORTANT ONE
// 56px minimum, from --touch-min. The 44px web default assumes a bare fingertip
// on a lit screen. A drill control is pressed by a gloved thumb underground, and
// a missed tap during a six-second timer is a failed decision, not an annoyance.
//
// RTL
// Uses logical properties throughout (ms/me, text-start) so the layout mirrors
// itself for Urdu without a single [dir='rtl'] override.

const BASE =
  'relative inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wide ' +
  'rounded-lg border transition-all duration-base ease-out select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none'

const VARIANTS = {
  primary:
    'bg-brand text-ink-onBrand border-brand shadow-1 ' +
    'hover:bg-brand-hover hover:border-brand-hover hover:shadow-2 hover:-translate-y-px ' +
    'active:bg-brand-pressed active:translate-y-0 active:shadow-1',
  secondary:
    'bg-surface-2 text-ink border-line hover:border-brand hover:text-brand-text ' +
    'hover:-translate-y-px hover:shadow-2 active:translate-y-0',
  ghost:
    'bg-transparent text-ink-secondary border-line-subtle ' +
    'hover:border-brand hover:text-brand-text hover:bg-brand-subtle active:bg-transparent',
  danger:
    'bg-hazard text-white border-hazard shadow-1 ' +
    'hover:brightness-110 hover:shadow-2 hover:-translate-y-px active:translate-y-0 active:brightness-95',
  quiet:
    'bg-transparent text-ink-tertiary border-transparent ' +
    'hover:text-brand-text hover:bg-surface-2 active:bg-surface-3',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5 min-h-[32px]',
  md: 'text-sm px-4 py-2.5 min-h-[40px]',
  lg: 'text-lg px-6 py-3 min-h-[48px]',
  // Field tier. Explicit min-height AND generous padding, because a short label
  // must not produce a smaller target than a long one.
  field: 'text-lg px-6 py-4 min-h-touch w-full',
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="w-4 h-4 rounded-full border-2 border-current border-e-transparent animate-spin shrink-0"
    />
  )
}

/**
 * Renders as <button>, <Link> (when `to` is set) or <a> (when `href` is set).
 *
 * Loading keeps the label mounted and only swaps the icon slot, so the button
 * does not change width mid-action and shift the layout under the user's thumb.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    to,
    href,
    type = 'button',
    loading = false,
    disabled = false,
    icon = null,
    iconEnd = null,
    fullWidth = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    BASE,
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {loading ? <Spinner /> : icon}
      {children ? <span className="truncate">{children}</span> : null}
      {!loading && iconEnd ? iconEnd : null}
    </>
  )

  if (to && !disabled && !loading) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  if (href && !disabled && !loading) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  )
})

export default Button
