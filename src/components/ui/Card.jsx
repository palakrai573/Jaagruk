import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

// Card, as a composition rather than a single component.
//
// WHY IT IS SPLIT INTO PARTS
// The previous cards were all `icon + heading + paragraph`, which is not a product
// component — it is a bullet point with a border. A real card has an anatomy:
// eyebrow, title, status, body, metadata, actions. Exposing those as separate
// pieces means a card can carry a live status chip or three metadata figures
// without every card growing another eight props.
//
//   <Card interactive>
//     <CardHeader eyebrow="01" title="Site-Scan AR" status={<Badge/>} icon={…} />
//     <CardBody>…</CardBody>
//     <CardMeta items={[{ label, value }, …]} />
//     <CardActions primary={…} secondary={…} />
//   </Card>

const SURFACE = 'bg-surface-1 border border-line-subtle rounded-xl'

const INTERACTIVE =
  'transition-all duration-base ease-out ' +
  'hover:border-brand-border hover:shadow-3 hover:-translate-y-0.5 ' +
  'focus-within:border-brand-border focus-within:shadow-3'

/**
 * `accent` draws a semantic rule along the inline-start edge. Uses a border so it
 * mirrors automatically in RTL, rather than an absolutely positioned bar which
 * would need a direction override.
 */
const ACCENTS = {
  none: '',
  brand: 'border-s-2 border-s-brand',
  safe: 'border-s-2 border-s-safe',
  warning: 'border-s-2 border-s-warning',
  hazard: 'border-s-2 border-s-hazard',
  mandate: 'border-s-2 border-s-mandate',
}

export const Card = forwardRef(function Card(
  { interactive = false, accent = 'none', to, className = '', children, ...rest },
  ref
) {
  const classes = [SURFACE, interactive ? INTERACTIVE : '', ACCENTS[accent] || '', 'overflow-hidden', className]
    .filter(Boolean)
    .join(' ')

  // A card that navigates should be one link, not a div wrapping a link — so the
  // whole surface is the target and it appears once in the tab order.
  if (to) {
    return (
      <Link ref={ref} to={to} className={`${classes} block`} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  )
})

export function CardHeader({ eyebrow, title, subtitle, status, icon, className = '' }) {
  return (
    <div className={`flex items-start gap-4 p-5 pb-3 ${className}`}>
      {icon ? <div className="shrink-0 mt-0.5">{icon}</div> : null}

      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="font-mono text-2xs uppercase tracking-[0.18em] text-brand-text mb-1.5">{eyebrow}</p>
        ) : null}
        {title ? (
          <h3 className="font-display font-bold text-xl uppercase leading-tight text-ink text-balance">{title}</h3>
        ) : null}
        {subtitle ? <p className="text-sm text-ink-tertiary mt-1">{subtitle}</p> : null}
      </div>

      {status ? <div className="shrink-0">{status}</div> : null}
    </div>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={`px-5 pb-4 text-sm text-ink-secondary leading-relaxed ${className}`}>{children}</div>
}

/**
 * Metadata strip. This is most of what separates a product card from a bullet
 * point: concrete figures a reader can act on.
 *
 * Wraps rather than scrolls, because a horizontally scrolling row of three
 * numbers on a 320px phone hides information with no affordance saying so.
 */
export function CardMeta({ items = [], className = '' }) {
  const shown = items.filter((i) => i && i.value !== null && i.value !== undefined && i.value !== '')
  if (shown.length === 0) return null

  return (
    <dl className={`flex flex-wrap gap-x-6 gap-y-2 px-5 pb-4 ${className}`}>
      {shown.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">{item.label}</dt>
          <dd className="font-mono text-sm font-bold text-ink mt-0.5 tabular-nums">
            {item.value}
            {item.unit ? <span className="text-ink-tertiary font-normal ms-1">{item.unit}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function CardActions({ children, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-5 py-3 border-t border-line-subtle bg-surface-2/40 ${className}`}
    >
      {children}
    </div>
  )
}

/** Fills remaining height so cards in a grid row align their action bars. */
export function CardSpacer() {
  return <div className="flex-1" aria-hidden="true" />
}

export default Card
