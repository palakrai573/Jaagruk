import { useReveal, useCountUp } from './motion.js'

// Stat.
//
// Numbers are always mono and tabular. A readiness percentage or a latency figure
// should read as a measurement, not as prose — and `tabular-nums` stops the value
// jittering horizontally while a counter animates, which is the detail that makes
// an animated number look broken rather than alive.
//
// Counting up is gated on visibility, not on mount: a stat that finished animating
// while it was three screens below the fold has animated for nobody.

const TONES = {
  brand: 'text-brand-text',
  safe: 'text-safe-text',
  warning: 'text-warning-text',
  hazard: 'text-hazard-text',
  ink: 'text-ink',
}

/**
 * A single figure with a label.
 *
 * Pass `value` as a number to animate it, or as a string when the "figure" is a
 * word — some of these are qualitative ("Preventable"), and forcing those through
 * a counter would be nonsense.
 */
export function Stat({
  value,
  suffix = '',
  prefix = '',
  label,
  hint,
  tone = 'brand',
  size = 'md',
  animate = true,
  decimals = 0,
  icon = null,
  className = '',
}) {
  const [ref, visible] = useReveal({ threshold: 0.4 })
  const numeric = typeof value === 'number' && Number.isFinite(value)
  const counted = useCountUp(numeric ? value : 0, { start: visible && animate, decimals })
  const shown = numeric ? (animate ? counted : value) : value

  const valueSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-xl' : 'text-2xl'

  return (
    <div ref={ref} className={`min-w-0 ${className}`}>
      {/* A rule rather than a full border: it establishes the column without
          boxing every figure, which at three-across reads as a table. */}
      <div className="border-t-2 border-brand pt-4">
        {icon ? <div className="mb-3">{icon}</div> : null}

        <div
          className={`font-display font-bold ${valueSize} uppercase leading-none tabular-nums ${
            TONES[tone] || TONES.brand
          }`}
        >
          {prefix}
          {shown}
          {suffix}
        </div>

        {label ? <p className="text-ink-secondary text-sm leading-relaxed mt-3 text-pretty">{label}</p> : null}
        {hint ? <p className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mt-2">{hint}</p> : null}
      </div>
    </div>
  )
}

/** Compact figure for card metadata and dashboard headers. */
export function MiniStat({ value, label, unit, tone = 'ink', className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`font-mono text-lg font-bold tabular-nums leading-none ${TONES[tone] || TONES.ink}`}>
        {value}
        {unit ? <span className="text-ink-tertiary text-sm font-normal ms-1">{unit}</span> : null}
      </div>
      <p className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mt-1.5 truncate">{label}</p>
    </div>
  )
}

export default Stat
