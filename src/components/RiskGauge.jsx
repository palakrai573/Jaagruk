// A dial-style risk gauge — the app's signature visual element.
// Score 0 (safe) -> 100 (critical), rendered as an arc sweep with a needle.

import { useLanguage } from '../context/LanguageContext.jsx'

export default function RiskGauge({ score = 0, size = 180 }) {
  const { t } = useLanguage()

  const clamped = Math.max(0, Math.min(100, score))
  const angle = -90 + (clamped / 100) * 180 // -90deg (left) to +90deg (right)
  const color = clamped < 34 ? '#2E7D4F' : clamped < 67 ? '#FFB020' : '#D93025'
  // Previously hardcoded English, so a Hindi or Santali speaker saw "MODERATE
  // RISK" on an otherwise translated screen.
  const label = clamped < 34 ? t('gauge_low') : clamped < 67 ? t('gauge_moderate') : t('gauge_high')

  const radius = size / 2 - 10
  const cx = size / 2
  const cy = size / 2

  const arcPath = describeArc(cx, cy, radius, -90, 90)

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${clamped}/100 — ${label}`}>
      <svg width={size} height={size / 1.7} viewBox={`0 0 ${size} ${size / 1.7}`}>
        <path d={arcPath} fill="none" stroke="#3A3F45" strokeWidth="14" strokeLinecap="round" />
        <path
          d={describeArc(cx, cy, radius, -90, angle)}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={cx + radius * 0.8 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={cy + radius * 0.8 * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="#F2F1ED"
          strokeWidth="3"
        />
        <circle cx={cx} cy={cy} r="6" fill="#F2F1ED" />
      </svg>
      <div className="font-display font-bold text-4xl -mt-2" style={{ color }}>
        {clamped}
      </div>
      <div className="font-mono text-xs tracking-widest uppercase" style={{ color }}>
        {label}
      </div>
    </div>
  )
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}
