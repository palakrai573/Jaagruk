import { useReveal, stagger } from './motion.js'

// Section, SectionHeader and Reveal.
//
// SECTION RHYTHM
// The previous Home page separated every section with the same hazard-stripe
// divider, five times. A strong industrial motif used five times stops reading as
// a motif and starts reading as wallpaper. Rhythm here comes from consistent
// vertical space and alternating surface tone instead, and the stripe is spent
// once, in the hero.

const TONES = {
  base: '',
  raised: 'bg-surface-1',
  inset: 'bg-surface-inset',
}

export function Section({ tone = 'base', id, className = '', containerClassName = '', children }) {
  return (
    <section id={id} className={`${TONES[tone] || ''} ${className}`}>
      <div className={`max-w-5xl mx-auto px-5 py-14 md:py-20 ${containerClassName}`}>{children}</div>
    </section>
  )
}

/**
 * Section heading. `align` exists because a centred heading on a data-dense page
 * fights the left-aligned content beneath it; start-aligned is the default.
 */
export function SectionHeader({ eyebrow, title, lead, align = 'start', actions = null, className = '' }) {
  const centred = align === 'center'

  return (
    <div
      className={[
        'mb-10 md:mb-12',
        centred ? 'text-center mx-auto max-w-2xl' : 'flex flex-wrap items-end justify-between gap-6',
        className,
      ].join(' ')}
    >
      <div className={centred ? '' : 'min-w-0 max-w-2xl'}>
        {eyebrow ? (
          <p className="font-mono text-2xs uppercase tracking-[0.22em] text-brand-text mb-3">{eyebrow}</p>
        ) : null}
        {title ? (
          <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-ink leading-[1.05] text-balance">
            {title}
          </h2>
        ) : null}
        {lead ? <p className="text-ink-secondary text-lg leading-relaxed mt-4 text-pretty">{lead}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

/**
 * Wraps children in a scroll-reveal.
 *
 * The transition is CSS (`.reveal` / `.is-visible`), so `prefers-reduced-motion`
 * disables it centrally in index.css. The hook returns visible=true immediately
 * under reduced motion, so the content is rendered complete and static rather
 * than stuck at opacity 0 waiting for an animation that will never run.
 *
 * `as` lets a reveal wrap a list item or table row without introducing an
 * invalid extra div into the markup.
 */
export function Reveal({ as: Tag = 'div', index = 0, step = 60, className = '', children, ...rest }) {
  const [ref, visible] = useReveal()

  return (
    <Tag
      ref={ref}
      style={index > 0 ? stagger(index, step) : undefined}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Section
