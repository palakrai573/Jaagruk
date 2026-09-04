import { useEffect, useRef, useState, useMemo } from 'react'
import {
  sparklinePath,
  sparklineArea,
  radarPoints,
  radarAxes,
  radarRings,
  readinessColor,
  relativeTime,
  CHART_COLOR,
  chartAlpha,
} from '../lib/charts.js'
import { toNumberOr, clampPercent } from '../lib/num.js'
import { useLanguage } from '../context/LanguageContext.jsx'
// One implementation, in ui/motion.js. This module had its own copy, and any
// component that needed the same thing would have grown a third.
import { usePrefersReducedMotion } from './ui/motion.js'

/**
 * Dashboard visualisation primitives.
 *
 * Every one of these is inline SVG or CSS with no charting dependency. They all
 * honour `prefers-reduced-motion`: animation here is there to draw the eye to a
 * changing number, and for anyone who has asked the OS to stop moving things it
 * is pure cost.
 */

/* ================================================================== */
/* AnimatedNumber                                                      */
/* ================================================================== */

/**
 * Counts up to its value.
 *
 * Uses an ease-out curve so the number lands rather than stopping dead, and
 * snaps immediately when motion is reduced or the value is small enough that
 * animating it would just look like a glitch.
 */
export function AnimatedNumber({ value, duration = 900, suffix = '', className = '', decimals = 0 }) {
  const reduced = usePrefersReducedMotion()
  const target = toNumberOr(value, 0)
  const [shown, setShown] = useState(reduced ? target : 0)
  const frameRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      setShown(target)
      return undefined
    }

    const from = fromRef.current
    const start = performance.now()

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - (1 - t) ** 3
      setShown(from + (target - from) * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      fromRef.current = target
    }
  }, [target, duration, reduced])

  return (
    <span className={className}>
      {decimals > 0 ? shown.toFixed(decimals) : Math.round(shown)}
      {suffix}
    </span>
  )
}

/* ================================================================== */
/* Sparkline                                                           */
/* ================================================================== */

export function Sparkline({ values = [], width = 128, height = 34, color, showArea = true, label }) {
  const nums = useMemo(() => values.map(Number).filter(Number.isFinite), [values])
  const stroke = color || readinessColor(nums[nums.length - 1] ?? 0)

  if (nums.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1="2"
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke={CHART_COLOR.grid}
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const path = sparklinePath(nums, width, height)
  const area = showArea ? sparklineArea(nums, width, height) : ''
  const gradientId = `spark-${stroke.replace('#', '')}-${width}`

  return (
    <svg width={width} height={height} role="img" aria-label={label || undefined} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {area && <path d={area} fill={`url(#${gradientId})`} />}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-draw"
      />
      {/* Latest reading gets a dot, so the current value is unambiguous */}
      {nums.length > 1 && (
        <circle
          cx={width - 2}
          cy={(() => {
            const min = Math.min(...nums)
            const max = Math.max(...nums)
            const span = max - min || 1
            return 2 + (height - 4) - ((nums[nums.length - 1] - min) / span) * (height - 4)
          })()}
          r="2.5"
          fill={stroke}
        />
      )}
    </svg>
  )
}

/* ================================================================== */
/* TrendPill                                                           */
/* ================================================================== */

export function TrendPill({ trend }) {
  const { t } = useLanguage()
  if (!trend) return null

  const { direction, delta } = trend
  const color = direction === 'up' ? CHART_COLOR.safeText : direction === 'down' ? CHART_COLOR.hazardText : CHART_COLOR.axisText
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→'

  return (
    <span className="font-mono text-[10px] inline-flex items-center gap-1" style={{ color }}>
      <span aria-hidden="true">{arrow}</span>
      {Math.abs(delta)}
      <span className="sr-only">{direction === 'up' ? t('ch_trend_up') : t('ch_trend_down')}</span>
    </span>
  )
}

/* ================================================================== */
/* RadarChart                                                          */
/* ================================================================== */

/**
 * Five-axis readiness radar, one axis per certification domain.
 *
 * This is the single most useful view of "am I ready", because certification
 * requires ALL five domains and a radar makes a single weak axis obvious in a way
 * a list of five percentages does not — the shape is visibly dented.
 */
export function RadarChart({ axes = [], size = 260, showLabels = true }) {
  const reduced = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(reduced)

  useEffect(() => {
    if (reduced) return undefined
    const timer = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(timer)
  }, [reduced])

  if (axes.length < 3) return null

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - (showLabels ? 46 : 12)

  const values = axes.map((a) => clampPercent(a.value, 0))
  const points = radarPoints(mounted ? values : values.map(() => 0), cx, cy, radius)
  const spokes = radarAxes(axes.length, cx, cy, radius)
  const rings = radarRings(cx, cy, radius, 4)

  const mean = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
  const fill = readinessColor(mean)
  const weakest = values.indexOf(Math.min(...values))

  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label={axes.map((a) => `${a.label} ${Math.round(a.value)}%`).join(', ')}
      className="shrink-0"
    >
      {/* Guide rings */}
      {rings.map((ring) => (
        <circle
          key={ring.r}
          cx={ring.cx}
          cy={ring.cy}
          r={ring.r}
          fill="none"
          stroke={CHART_COLOR.grid}
          strokeWidth="1"
          strokeDasharray={ring.value === 100 ? undefined : '2 3'}
        />
      ))}

      {/* The 70% pass threshold, drawn distinctly — it is the line that matters */}
      <circle cx={cx} cy={cy} r={radius * 0.7} fill="none" stroke={CHART_COLOR.warning} strokeWidth="1" strokeOpacity="0.45" />

      {/* Spokes */}
      {spokes.map((axis, i) => (
        <line key={i} x1={cx} y1={cy} x2={axis.x2} y2={axis.y2} stroke={CHART_COLOR.grid} strokeWidth="1" />
      ))}

      {/* Value polygon */}
      <polygon
        points={points}
        fill={fill}
        fillOpacity="0.22"
        stroke={fill}
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: reduced ? undefined : 'all 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      />

      {/* Vertex dots, with the weakest domain called out */}
      {values.map((v, i) => {
        const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2
        const r = ((mounted ? v : 0) / 100) * radius
        const isWeak = i === weakest && v < 70
        return (
          <circle
            key={i}
            cx={cx + Math.cos(angle) * r}
            cy={cy + Math.sin(angle) * r}
            r={isWeak ? 4.5 : 3}
            fill={isWeak ? CHART_COLOR.hazard : fill}
            stroke={CHART_COLOR.surface}
            strokeWidth="1.5"
            style={{ transition: reduced ? undefined : 'all 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        )
      })}

      {/* Labels */}
      {showLabels &&
        spokes.map((axis, i) => (
          <text
            key={`label-${i}`}
            x={axis.labelX}
            y={axis.labelY}
            textAnchor={axis.anchor}
            dominantBaseline="middle"
            className="font-mono"
            fontSize="8.5"
            fill={values[i] >= 70 ? CHART_COLOR.axisText : CHART_COLOR.hazardText}
          >
            {shortLabel(axes[i].label)}
          </text>
        ))}
    </svg>
  )
}

/** Domain names are long; keep the first two significant words for the radar. */
function shortLabel(label) {
  const clean = String(label || '').replace(/&/g, '')
  const words = clean.split(/\s+/).filter((w) => w.length > 2)
  return words.slice(0, 2).join(' ').slice(0, 18)
}

/* ================================================================== */
/* Heatmap                                                             */
/* ================================================================== */

const HEAT_LEVELS = [CHART_COLOR.surfaceInset, chartAlpha('safe', 0.35), chartAlpha('safe', 0.68), CHART_COLOR.safe]

/**
 * Training-consistency grid, one cell per day.
 *
 * A gap is the point. The retention argument in the problem statement is that
 * short frequent sessions beat one long one, and a run of empty cells says that
 * far more directly than an average.
 */
export function Heatmap({ heatmap, cellSize = 10, gap = 2 }) {
  const { t } = useLanguage()
  if (!heatmap?.columns?.length) return null

  const width = heatmap.columns.length * (cellSize + gap)
  const height = 7 * (cellSize + gap)

  return (
    <div>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${heatmap.activeDays} ${t('ch_active_days')}`}
        className="overflow-visible"
      >
        {heatmap.columns.map((column, ci) =>
          column.map((cell, ri) => (
            <rect
              key={cell.key}
              x={ci * (cellSize + gap)}
              y={ri * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx="2"
              fill={HEAT_LEVELS[cell.level]}
              stroke={cell.isToday ? CHART_COLOR.warning : 'none'}
              strokeWidth={cell.isToday ? 1.5 : 0}
            >
              <title>
                {cell.date.toLocaleDateString()} — {cell.count}
              </title>
            </rect>
          ))
        )}
      </svg>

      <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
        <span className="font-mono text-[10px] text-ink-tertiary">
          {heatmap.activeDays} / {heatmap.totalDays} {t('ch_active_days')}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {HEAT_LEVELS.map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
        </span>
      </div>
    </div>
  )
}

/* ================================================================== */
/* StackedBar                                                          */
/* ================================================================== */

/**
 * Horizontal proportion bar. Used for the reaction-time distribution, where the
 * useful information is the ratio of decisive to hesitant decisions rather than
 * absolute counts.
 */
export function StackedBar({ segments = [], height = 12, showLegend = true }) {
  const reduced = usePrefersReducedMotion()

  // Normalise once. Coercing at each use site meant the bar widths, the legend
  // percentages and the aria-label could each round a bad value differently and
  // disagree with one another.
  const parts = (segments || [])
    .filter((seg) => seg && seg.label)
    .map((seg) => ({ ...seg, value: Math.max(0, toNumberOr(seg.value, 0)) }))
  const total = parts.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return <div className="rounded-full bg-surface-3" aria-hidden="true" style={{ height }} />
  }

  const shown = parts
    .map((seg) => ({ ...seg, pct: (seg.value / total) * 100 }))
    .filter((seg) => seg.pct > 0)

  const label = shown.map((seg) => `${seg.label} ${Math.round(seg.pct)}%`).join(', ')

  return (
    <div>
      <div className="flex rounded-full overflow-hidden" style={{ height }} role="img" aria-label={label}>
        {shown.map((seg) => (
          <span
            key={seg.label}
            style={{
              width: `${seg.pct}%`,
              background: seg.color,
              transition: reduced ? undefined : 'width 800ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            title={`${seg.label}: ${Math.round(seg.pct)}%`}
          />
        ))}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {shown.map((seg) => (
            <span key={seg.label} className="font-mono text-[10px] flex items-center gap-1.5 text-ink-tertiary">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: seg.color }} />
              {seg.label}
              <span className="text-ink">{Math.round(seg.pct)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* DecayCurve                                                          */
/* ================================================================== */

/**
 * Forward projection of readiness if no refresher is taken.
 *
 * Deliberately forward-looking. "71% today" is a fact; "71% today, 58% in three
 * months" is an argument for spending ninety seconds now, which is the behaviour
 * the whole spaced-repetition layer is trying to produce.
 */
export function DecayCurve({ points = [], width = 260, height = 96, threshold = 70 }) {
  const { t } = useLanguage()
  if (points.length < 2) return null

  const pad = { left: 4, right: 4, top: 8, bottom: 18 }
  const usableW = width - pad.left - pad.right
  const usableH = height - pad.top - pad.bottom

  const maxDay = points[points.length - 1].day || 1
  const toX = (day) => pad.left + (day / maxDay) * usableW
  const toY = (value) => pad.top + usableH - (Math.max(0, Math.min(100, value)) / 100) * usableH

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.day).toFixed(1)} ${toY(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L ${toX(maxDay).toFixed(1)} ${(pad.top + usableH).toFixed(1)} L ${pad.left} ${(
    pad.top + usableH
  ).toFixed(1)} Z`

  // Where the curve crosses below the pass threshold — the date that matters.
  const crossing = points.find((p) => p.value < threshold)

  return (
    <div>
      <svg width={width} height={height} role="img" aria-label={t('ch_decay_label')} className="overflow-visible">
        <defs>
          <linearGradient id="decay-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLOR.warning} stopOpacity="0.25" />
            <stop offset="100%" stopColor={CHART_COLOR.warning} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Pass threshold */}
        <line
          x1={pad.left}
          y1={toY(threshold)}
          x2={width - pad.right}
          y2={toY(threshold)}
          stroke={CHART_COLOR.safe}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text x={pad.left} y={toY(threshold) - 4} fontSize="8" className="font-mono" fill={CHART_COLOR.safeText}>
          {threshold}%
        </text>

        <path d={area} fill="url(#decay-fill)" />
        <path d={line} fill="none" stroke={CHART_COLOR.warning} strokeWidth="2" strokeLinecap="round" className="spark-draw" />

        {/* Today */}
        <circle cx={toX(0)} cy={toY(points[0].value)} r="3.5" fill={CHART_COLOR.ink} />

        {/* The point it stops counting as competent */}
        {crossing && (
          <>
            <line
              x1={toX(crossing.day)}
              y1={pad.top}
              x2={toX(crossing.day)}
              y2={pad.top + usableH}
              stroke={CHART_COLOR.hazard}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle cx={toX(crossing.day)} cy={toY(crossing.value)} r="3" fill={CHART_COLOR.hazard} />
          </>
        )}

        <text x={pad.left} y={height - 4} fontSize="8" className="font-mono" fill={CHART_COLOR.axisText}>
          {t('ch_today')}
        </text>
        <text x={width - pad.right} y={height - 4} fontSize="8" textAnchor="end" className="font-mono" fill={CHART_COLOR.axisText}>
          +{maxDay}d
        </text>
      </svg>

      {crossing && (
        <p className="font-mono text-[10px] text-hazard mt-1">
          {t('ch_falls_below')} {crossing.day} {t('rf_days')}
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* RelativeTime                                                        */
/* ================================================================== */

/**
 * Self-updating relative timestamp. Ticks so "2 minutes ago" does not sit there
 * saying that an hour later.
 */
export function RelativeTime({ timestamp, className = '' }) {
  const { t } = useLanguage()
  const [, setTick] = useState(0)

  useEffect(() => {
    // A minute is fine: nothing here needs second-level precision, and a faster
    // interval would wake the device for no benefit.
    const timer = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  const rel = relativeTime(timestamp)
  if (!rel) return null

  const label =
    rel.unit === 'now'
      ? t('ch_just_now')
      : `${rel.value} ${t(`ch_unit_${rel.unit}`)} ${rel.future ? t('ch_from_now') : t('ch_ago')}`

  return (
    <span className={className} title={new Date(timestamp).toLocaleString()}>
      {label}
    </span>
  )
}

// NOTE: Skeleton and SkeletonCard used to be defined here as well as in
// ui/Feedback.jsx — two implementations of the same thing with different prop
// shapes (height/width vs className), which is how a codebase ends up with two
// visual languages for "loading". Removed; every consumer imports the ui
// primitives instead.

/* ================================================================== */
/* StatCard                                                            */
/* ================================================================== */

/** Number + label + optional sparkline and trend, animated on mount. */
export function StatCard({ label, value, suffix = '', series, trend: trendValue, accent, warn, pictogram, delay = 0 }) {
  return (
    <div
      className="bg-surface-1 border border-line-subtle rounded-lg p-4 rise-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className={`font-display font-bold text-3xl leading-none ${
            warn ? 'text-hazard' : accent ? 'text-brand-text' : 'text-ink'
          }`}
        >
          <AnimatedNumber value={value} suffix={suffix} />
        </span>
        {trendValue && <TrendPill trend={trendValue} />}
      </div>

      <p className="font-mono text-[9px] text-ink-tertiary uppercase tracking-widest leading-tight mb-2">{label}</p>

      {series && series.length > 0 && <Sparkline values={series} width={100} height={26} />}
      {pictogram}
    </div>
  )
}
