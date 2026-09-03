import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  listAttempts,
  bestByDomain,
  formatLatency,
  TRAINING_MODE,
  GRADE,
  gradeColor,
  gradeTextColor,
} from '../lib/assessment.js'
import { getCurrentWorker, getActiveSiteId } from '../lib/identity.js'
import { loadDomainProgress, overallCompliance, PASS_THRESHOLD } from '../lib/certificate.js'
import { retentionOverview, decayFactor } from '../lib/spaced.js'
import { getLog, clearLog, computeStats } from '../lib/store.js'
import { storageStatus } from '../lib/idb.js'
import { pendingCount } from '../lib/sync.js'
import { hazardStats } from '../lib/hazards.js'
import { SCENARIOS } from '../lib/scenarios.js'
import {
  readinessSeries,
  gradeDistribution,
  activityHeatmap,
  decayProjection,
  trend,
  readinessColor,
  rollingMean,
} from '../lib/charts.js'
import {
  AnimatedNumber,
  Sparkline,
  TrendPill,
  RadarChart,
  Heatmap,
  StackedBar,
  DecayCurve,
  RelativeTime,
  Skeleton,
  SkeletonCard,
} from '../components/Charts.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { ReadinessRing } from '../components/DrillUI.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * The worker's own view.
 *
 * Leads with current readiness rather than a session count, because "you have
 * completed 12 sessions" says nothing about whether someone is ready today.
 *
 * Every widget answers a question a worker or supervisor would actually ask:
 *   radar     — which domain is holding me back?
 *   decay     — what happens if I do nothing?
 *   reaction  — is my problem knowledge, or speed?
 *   heatmap   — am I actually turning up?
 * Anything that did not answer one of those was left out.
 */

const MODE_LABEL = {
  [TRAINING_MODE.SOLO]: 'db_mode_solo',
  [TRAINING_MODE.AR]: 'db_mode_ar',
  [TRAINING_MODE.BUDDY]: 'db_mode_buddy',
  [TRAINING_MODE.REFRESHER]: 'db_mode_refresher',
}

const SCENARIO_TITLE = SCENARIOS.reduce((acc, s) => {
  acc[s.id] = s.title
  return acc
}, {})

// This was a local hex map duplicating what assessment.js already knows. It is
// used in two different positions — as bar fills and as text — which is exactly
// why the tokens come in pairs: gradeColor for fills keeps the ISO hue, while
// gradeTextColor is contrast-corrected, because ISO yellow as small text on a
// light surface reaches about 1.9:1.

export default function Dashboard() {
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedAt, setLoadedAt] = useState(0)
  const [worker, setWorker] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [retention, setRetention] = useState([])
  const [compliance, setCompliance] = useState(null)
  const [storage, setStorage] = useState(null)
  const [pending, setPending] = useState(0)
  const [hazards, setHazards] = useState(null)
  const [legacyLog, setLegacyLog] = useState([])
  const [modeFilter, setModeFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  /* ---------------- load ---------------- */

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const current = await getCurrentWorker()
      setWorker(current)

      const list = await listAttempts(current?.id || '')
      setAttempts(list)
      setLegacyLog(getLog())

      const progress = await loadDomainProgress(current?.id || '', list)
      setCompliance(overallCompliance(progress))
      setRetention(await retentionOverview(current?.id || '', bestByDomain(list)))

      const [status, queued, hz] = await Promise.all([storageStatus(), pendingCount(), hazardStats(getActiveSiteId())])
      setStorage(status)
      setPending(queued)
      setHazards(hz)
      setLoadedAt(Date.now())
    } catch {
      setAttempts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Re-read when the tab is brought back, so a drill finished elsewhere on the
  // device shows up without a manual reload.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) load(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  /* ---------------- derived ---------------- */

  const series = useMemo(() => readinessSeries(attempts, 24), [attempts])
  const seriesValues = useMemo(() => series.map((s) => s.value), [series])
  const smoothed = useMemo(() => rollingMean(seriesValues, 3), [seriesValues])
  const readinessTrend = useMemo(() => trend(seriesValues), [seriesValues])

  const distribution = useMemo(() => gradeDistribution(attempts), [attempts])
  const heatmap = useMemo(() => activityHeatmap(attempts.map((a) => a.at), 12), [attempts])

  const radarAxesData = useMemo(
    () => retention.map((r) => ({ label: r.domain, value: r.attempted ? r.effectiveReadiness : 0 })),
    [retention]
  )

  const weakest = useMemo(() => {
    const attempted = retention.filter((r) => r.attempted)
    if (attempted.length === 0) return null
    return attempted.reduce((min, r) => (r.effectiveReadiness < min.effectiveReadiness ? r : min))
  }, [retention])

  // Project whichever domain is closest to falling below the pass mark — that is
  // where ninety seconds of refresher buys the most.
  const decayTarget = useMemo(() => {
    const candidates = retention.filter((r) => r.attempted && r.lastPassAt > 0 && r.baseReadiness > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((min, r) => (r.effectiveReadiness < min.effectiveReadiness ? r : min))
  }, [retention])

  const decayPoints = useMemo(() => {
    if (!decayTarget) return []
    return decayProjection(decayTarget.baseReadiness, decayTarget.lastPassAt, decayFactor, { days: 120, step: 6 })
  }, [decayTarget])

  const perDomainSeries = useMemo(() => {
    const map = new Map()
    // Attempts arrive newest-first; reverse so each series reads left to right.
    for (const a of [...attempts].reverse()) {
      if (!a.domain) continue
      if (!map.has(a.domain)) map.set(a.domain, [])
      map.get(a.domain).push(Math.max(0, Math.min(100, a.readiness || 0)))
    }
    return map
  }, [attempts])

  const legacyStats = computeStats()
  const hesitationCount = attempts.filter((a) => a.hesitation).length
  const totalSessions = attempts.length + legacyStats.scenarios
  const dueCount = retention.filter((r) => r.due).length

  const filteredAttempts = useMemo(
    () => (modeFilter === 'all' ? attempts : attempts.filter((a) => a.mode === modeFilter)),
    [attempts, modeFilter]
  )

  const modeCounts = useMemo(() => {
    const counts = { all: attempts.length }
    for (const mode of Object.values(TRAINING_MODE)) counts[mode] = attempts.filter((a) => a.mode === mode).length
    return counts
  }, [attempts])

  const hasData = attempts.length > 0 || legacyLog.length > 0

  /* ---------------- loading ---------------- */

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-10">
        <Skeleton height={14} width={140} className="mb-4" />
        <Skeleton height={48} width="60%" className="mb-8" />
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      </div>
    )
  }

  /* ---------------- render ---------------- */

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-2">{t('dash_eyebrow')}</p>
          <h1 className="font-display font-bold text-4xl md:text-5xl uppercase leading-none">
            {t('db_readiness_title')}
          </h1>
          {worker ? (
            <p className="text-concrete mt-2">{worker.name}</p>
          ) : (
            <p className="text-concrete mt-2 text-sm">
              {t('cert_sign_in_why')}{' '}
              <Link to="/start" className="text-amber underline">
                {t('ob_sign_in')}
              </Link>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {loadedAt > 0 && (
            <span
              className="font-mono text-[10px] text-concrete flex items-center gap-1.5"
              aria-live="polite"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full bg-safe ${refreshing ? 'live-dot' : ''}`}
                aria-hidden="true"
              />
              {/* The pulsing dot alone says nothing to a screen reader. */}
              <span className="sr-only">{t('db_live')}: </span>
              <RelativeTime timestamp={loadedAt} />
            </span>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="font-mono text-[10px] uppercase tracking-widest border border-steel-lighter rounded px-3 py-2 text-concrete hover:border-amber hover:text-amber disabled:opacity-50"
          >
            {t('db_refresh')}
          </button>
        </div>
      </div>

      {storage && !storage.persistent && (
        <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-6 flex items-start gap-3 fade-in">
          <Pictogram name="warning" size={22} />
          <p className="text-xs text-concrete leading-relaxed">{t('db_storage_temp')}</p>
        </div>
      )}

      {!hasData ? (
        <EmptyState t={t} />
      ) : (
        <>
          {/* Hero */}
          <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 mb-5 flex items-center gap-8 flex-wrap rise-in">
            <ReadinessRing readiness={compliance?.avgReadiness ?? 0} size={148} showBreakdown={false} />

            <div className="flex-1 min-w-[260px]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Metric
                  label={t('cert_domains_passed')}
                  value={compliance?.passedCount ?? 0}
                  suffix={`/${compliance?.totalDomains ?? 5}`}
                  accent
                />
                <Metric label={t('dash_sessions')} value={totalSessions} />
                <Metric label={t('db_flagged_slow')} value={hesitationCount} warn={hesitationCount > 0} />
                <Metric label={t('rf_due_now')} value={dueCount} warn={dueCount > 0} />
              </div>

              {seriesValues.length > 1 && (
                <div className="mt-5 pt-5 border-t border-steel-lighter flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-concrete mb-1">{t('db_trend')}</p>
                    <TrendPill trend={readinessTrend} />
                  </div>
                  <Sparkline values={smoothed} width={160} height={38} label={t('db_trend')} />
                </div>
              )}
            </div>
          </div>

          {/* Radar + decay */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <Panel title={t('db_radar_title')} hint={t('db_radar_hint')} delay={80}>
              {retention.some((r) => r.attempted) ? (
                <>
                  <div className="flex justify-center">
                    <RadarChart axes={radarAxesData} size={272} />
                  </div>
                  {weakest && weakest.effectiveReadiness < PASS_THRESHOLD && (
                    <div className="mt-4 pt-4 border-t border-steel-lighter flex items-center justify-between gap-3 flex-wrap">
                      <span className="flex items-center gap-2 min-w-0">
                        <Pictogram name="warning" size={20} />
                        <span className="min-w-0">
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-concrete">
                            {t('db_weakest')}
                          </span>
                          <span className="block text-xs font-bold truncate">{weakest.domain}</span>
                        </span>
                      </span>
                      <Link
                        to="/train"
                        className="font-mono text-[10px] uppercase tracking-widest text-amber underline shrink-0"
                      >
                        {t('nav_train')} →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <NoData t={t} />
              )}
            </Panel>

            <Panel title={t('db_decay_title')} hint={t('ch_decay_label')} delay={140}>
              {decayPoints.length > 1 ? (
                <>
                  <p className="text-xs font-bold mb-3 truncate">{decayTarget.domain}</p>
                  <DecayCurve points={decayPoints} width={276} height={110} threshold={PASS_THRESHOLD} />
                  <Link
                    to="/refresher"
                    className="inline-block mt-4 bg-amber text-steel font-bold text-[11px] uppercase px-4 py-2 rounded"
                  >
                    {t('rf_start')}
                  </Link>
                </>
              ) : (
                <NoData t={t} />
              )}
            </Panel>
          </div>

          {/* Reaction mix + consistency */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <Panel title={t('db_reaction_mix')} hint={t('db_reaction_hint')} delay={200}>
              {distribution.total > 0 ? (
                <>
                  <StackedBar
                    height={14}
                    segments={[
                      { label: t('as_grade_fast'), value: distribution.fast, color: gradeColor(GRADE.FAST) },
                      { label: t('as_grade_normal'), value: distribution.normal, color: gradeColor(GRADE.NORMAL) },
                      { label: t('as_grade_slow'), value: distribution.slow, color: gradeColor(GRADE.SLOW) },
                      { label: t('as_grade_unknown'), value: distribution.unknown, color: gradeColor(GRADE.UNKNOWN) },
                    ]}
                  />
                  {distribution.slow > 0 && (
                    <p className="text-[11px] text-concrete mt-4 leading-relaxed">{t('as_hesitation_body')}</p>
                  )}
                </>
              ) : (
                <NoData t={t} />
              )}
            </Panel>

            <Panel title={t('db_consistency')} hint={t('db_consistency_hint')} delay={260}>
              <Heatmap heatmap={heatmap} />
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-steel-lighter">
                <Metric label={t('db_streak')} value={heatmap.currentStreak} suffix="d" accent />
                <Metric label={t('db_longest_streak')} value={heatmap.longestStreak} suffix="d" />
              </div>
            </Panel>
          </div>

          {/* Per-domain retention */}
          <Panel title={t('db_by_domain')} hint={t('cert_decay_note')} delay={320} className="mb-5">
            <div className="-mx-5 divide-y divide-steel-lighter border-t border-steel-lighter">
              {retention.map((row) => (
                <DomainRow key={row.domain} row={row} series={perDomainSeries.get(row.domain) || []} t={t} />
              ))}
            </div>
          </Panel>

          {/* Hazard contribution */}
          {hazards && hazards.total > 0 && (
            <Panel title={t('hz_my_reports')} delay={380} className="mb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Metric label={t('hz_eyebrow')} value={hazards.total} />
                <Metric label={t('hz_status_open')} value={hazards.byStatus.open} warn={hazards.byStatus.open > 0} />
                <Metric label={t('hz_status_resolved')} value={hazards.byStatus.resolved} accent />
                <Metric
                  label={t('ad_open_high')}
                  value={hazards.openHighCount}
                  warn={hazards.openHighCount > 0}
                />
              </div>
            </Panel>
          )}

          {/* Activity */}
          <section className="rise-in" style={{ animationDelay: '440ms' }}>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="font-display font-bold text-2xl uppercase">{t('db_recent')}</h2>
              {legacyLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t('dash_clear'))) return
                    clearLog()
                    load(true)
                  }}
                  className="font-mono text-xs text-concrete hover:text-hazard underline"
                >
                  {t('dash_clear')}
                </button>
              )}
            </div>

            {/* Mode filter */}
            {attempts.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                <FilterChip
                  active={modeFilter === 'all'}
                  onClick={() => setModeFilter('all')}
                  label={t('db_filter_all')}
                  count={modeCounts.all}
                />
                {Object.values(TRAINING_MODE)
                  .filter((mode) => modeCounts[mode] > 0)
                  .map((mode) => (
                    <FilterChip
                      key={mode}
                      active={modeFilter === mode}
                      onClick={() => setModeFilter(mode)}
                      label={t(MODE_LABEL[mode])}
                      count={modeCounts[mode]}
                    />
                  ))}
              </div>
            )}

            {/* Without this, filtering silently hides rows with no explanation of
                how many were dropped. */}
            {modeFilter !== 'all' && attempts.length > 0 && (
              <p className="font-mono text-[10px] text-concrete mb-3" aria-live="polite">
                {t('db_showing')} {filteredAttempts.length} / {attempts.length}
              </p>
            )}

            <div className="space-y-2">
              {filteredAttempts.map((attempt) => (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  t={t}
                  expanded={expanded === attempt.id}
                  onToggle={() => setExpanded(expanded === attempt.id ? null : attempt.id)}
                />
              ))}

              {/* Pre-upgrade history, marked as lacking timing data */}
              {modeFilter === 'all' &&
                legacyLog
                  .filter((e) => e.type === 'scenario' || e.type === 'scan')
                  .map((entry, i) => (
                    <div
                      key={`legacy-${i}`}
                      className="bg-steel-light/40 border border-steel-lighter rounded p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm">
                          {entry.type === 'scan' ? t('dash_hazard_scan') : t('dash_scenario_training')}
                        </p>
                        <p className="font-mono text-[10px] text-concrete">
                          <RelativeTime timestamp={entry.timestamp} /> · {t('as_grade_unknown')}
                        </p>
                      </div>
                      <span className="font-mono text-concrete text-sm shrink-0">
                        {entry.type === 'scan' ? `${entry.riskScore}/100` : `${Math.max(0, entry.score ?? 0)}%`}
                      </span>
                    </div>
                  ))}

              {filteredAttempts.length === 0 && modeFilter !== 'all' && (
                <p className="font-mono text-xs text-concrete text-center py-8">{t('db_no_data')}</p>
              )}
            </div>
          </section>
        </>
      )}

      <p className="font-mono text-[10px] text-concrete text-center mt-12 leading-relaxed">
        {t('db_all_local')}
        {pending > 0 && ` · ${pending} ${t('db_pending_sync')}`}
      </p>
    </div>
  )
}

/* ================================================================== */
/* Layout pieces                                                       */
/* ================================================================== */

function Panel({ title, hint, children, delay = 0, className = '' }) {
  return (
    <section
      className={`bg-steel-light border border-steel-lighter rounded-lg p-5 rise-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="font-display font-bold text-lg uppercase leading-tight mb-1">{title}</h2>
      {hint && <p className="text-[11px] text-concrete mb-4 leading-relaxed">{hint}</p>}
      {children}
    </section>
  )
}

function Metric({ label, value, suffix = '', accent, warn }) {
  const color = warn ? 'text-hazard' : accent ? 'text-amber' : 'text-chalk'
  return (
    <div>
      <p className={`font-display font-bold text-3xl leading-none ${color}`}>
        <AnimatedNumber value={value} />
        {suffix}
      </p>
      <p className="font-mono text-[9px] text-concrete uppercase tracking-widest mt-1.5 leading-tight">{label}</p>
    </div>
  )
}

function NoData({ t }) {
  return (
    <div className="py-10 text-center">
      <Pictogram name="warning" size={30} className="mx-auto mb-3 opacity-40" />
      <p className="font-mono text-[11px] text-concrete">{t('db_no_data')}</p>
    </div>
  )
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 font-mono text-[10px] uppercase tracking-widest rounded-full px-3 py-1.5 border transition-colors ${
        active ? 'border-amber bg-amber/10 text-amber' : 'border-steel-lighter text-concrete hover:border-amber'
      }`}
    >
      {label}
      <span className="ms-1.5 opacity-60">{count}</span>
    </button>
  )
}

/* ================================================================== */
/* Domain row                                                          */
/* ================================================================== */

function DomainRow({ row, series, t }) {
  const value = row.attempted ? row.effectiveReadiness : 0
  const color = readinessColor(value)
  const decayed = row.attempted && row.effectiveReadiness < row.baseReadiness

  return (
    <div className="px-5 py-4 flex items-center gap-4 flex-wrap row-hover">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm truncate">{row.domain}</p>
        <p className="font-mono text-[10px] text-concrete mt-1">
          {!row.attempted && t('rf_never_trained')}
          {row.attempted && row.lastPassAt > 0 && (
            <>
              {t('db_last_passed')} <RelativeTime timestamp={row.lastPassAt} />
            </>
          )}
          {row.attempted && row.lastPassAt === 0 && t('db_never')}
          {row.due && <span className="text-hazard"> · {t('rf_due_now')}</span>}
          {row.hesitation && <span className="text-amber"> · {t('db_flagged_slow')}</span>}
        </p>
      </div>

      {/* Per-domain trend, only where there is more than one reading */}
      {series.length > 1 && <Sparkline values={series} width={72} height={24} color={color} showArea={false} />}

      {/* Progress toward the pass mark */}
      <div className="w-20 shrink-0">
        <div className="h-1.5 bg-steel rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${value}%`, background: color, transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </div>
      </div>

      <div className="text-end shrink-0 w-16">
        <span className="font-display font-bold text-xl" style={{ color }}>
          {row.attempted ? (
            <>
              <AnimatedNumber value={value} />%
            </>
          ) : (
            '—'
          )}
        </span>
        {decayed && (
          <p className="font-mono text-[9px] text-concrete leading-none">
            {t('db_decayed_from')} {row.baseReadiness}%
          </p>
        )}
      </div>
    </div>
  )
}

/* ================================================================== */
/* Attempt row                                                         */
/* ================================================================== */

function AttemptRow({ attempt, t, expanded, onToggle }) {
  const slowSteps = (attempt.steps || []).filter((s) => s.grade === GRADE.SLOW).length
  const color = readinessColor(attempt.readiness)
  const hasDetail = (attempt.steps || []).length > 0

  return (
    <div className="bg-steel-light border border-steel-lighter rounded overflow-hidden row-hover">
      <button
        type="button"
        onClick={hasDetail ? onToggle : undefined}
        aria-expanded={hasDetail ? expanded : undefined}
        className={`w-full text-start p-4 flex items-center justify-between gap-3 flex-wrap ${
          hasDetail ? '' : 'cursor-default'
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm flex items-center gap-2">
            {attempt.hesitation && <Pictogram name="slow" size={16} />}
            <span className="truncate">
              {SCENARIO_TITLE[attempt.scenarioId] || attempt.domain || attempt.scenarioId}
            </span>
          </p>
          <p className="font-mono text-[10px] text-concrete mt-0.5">
            <RelativeTime timestamp={attempt.at} />
            {' · '}
            {t(MODE_LABEL[attempt.mode] || 'db_mode_solo')}
            {attempt.totalLatencyMs > 0 && ` · ${formatLatency(attempt.totalLatencyMs)}`}
            {slowSteps > 0 && (
              <span style={{ color: gradeTextColor(GRADE.SLOW) }}>
                {' · '}
                {slowSteps} {t('as_grade_slow')}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <span className="font-mono font-bold text-lg" style={{ color }}>
              {attempt.readiness}%
            </span>
            <p className="font-mono text-[9px] text-concrete leading-none">
              {attempt.accuracyPct}% / {attempt.speedPct}%
            </p>
          </div>
          {hasDetail && (
            <span
              className="text-concrete text-xs transition-transform"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
              aria-hidden="true"
            >
              ▸
            </span>
          )}
        </div>
      </button>

      {/* Per-decision timing. This is where a worker sees exactly which decision
          slowed them down, which a single percentage cannot tell them. */}
      {expanded && hasDetail && (
        <div className="px-4 pb-4 fade-in">
          <div className="border-t border-steel-lighter pt-3 space-y-2">
            {attempt.steps.map((step, i) => (
              <div key={step.stepId || i} className="flex items-center gap-3">
                <Pictogram name={step.correct ? 'correct' : 'incorrect'} size={16} />
                <span className="font-mono text-[10px] text-concrete w-16 shrink-0">
                  {t('sc_decision')} {i + 1}
                </span>

                {/* Reaction time against that step's own target */}
                <div className="flex-1 h-1.5 bg-steel rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, ((step.latencyMs || 0) / Math.max(1, (step.targetMs || 9000) * 2)) * 100)}%`,
                      background: gradeColor(step.grade),
                    }}
                  />
                </div>

                <span
                  className="font-mono text-[10px] shrink-0 w-20 text-end"
                  style={{ color: gradeTextColor(step.grade) }}
                >
                  {step.latencyMs ? formatLatency(step.latencyMs) : '—'}
                  {step.targetMs ? <span className="text-concrete"> /{Math.round(step.targetMs / 1000)}s</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Empty state                                                         */
/* ================================================================== */

function EmptyState({ t }) {
  return (
    <div className="border border-steel-lighter rounded-lg p-12 text-center rise-in">
      <Pictogram name="ppe" size={54} className="mx-auto mb-5" />
      <h2 className="font-display font-bold text-2xl uppercase mb-2">{t('dash_empty')}</h2>
      <p className="text-concrete text-sm max-w-sm mx-auto mb-7 leading-relaxed">{t('list_desc')}</p>

      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/train" className="bg-amber text-steel font-display font-bold uppercase px-6 py-3 rounded">
          {t('home_cta_train')}
        </Link>
        <Link
          to="/buddy"
          className="border border-concrete rounded px-6 py-3 font-mono text-sm hover:border-amber hover:text-amber"
        >
          {t('nav_buddy')}
        </Link>
      </div>
    </div>
  )
}
