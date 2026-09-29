import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { Badge, Button, Chevron, Progress, Skeleton } from '../components/ui/index.js'
import Pictogram from '../lib/pictograms.jsx'
import { getCurrentWorker } from '../lib/identity.js'
import { listAttempts, bestByDomain } from '../lib/assessment.js'
import { retentionOverview } from '../lib/spaced.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { SCENARIOS, CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import { translateScenario, scenarioContentLanguage } from '../lib/scenarioTranslations.js'
import { scenarioMeta } from '../lib/scenarioMeta.js'
import './WorkerHome.css'

/**
 * Worker home — the first screen of every shift.
 *
 * TWO HEROES, NOT ONE WITH BLANKS IN IT
 * A signed-out worker and a signed-in one need different things, and the page
 * used to serve the signed-out case by rendering the signed-in layout with the
 * figures replaced by "-". Three empty metrics filled the whole first viewport
 * and said nothing. Now the signed-out hero sells the two-minute setup and the
 * signed-in hero leads with the one number that decides whether they can work.
 *
 * The wordmark is deliberately NOT repeated here. The sticky app header already
 * renders it directly above, so an <h1> saying "Jaagruk" put the brand on screen
 * twice and pushed the actual content below the fold.
 */

const STEPS = [
  ['home_step1_e', 'home_step1_t'],
  ['home_step2_e', 'home_step2_t'],
  ['home_step3_e', 'home_step3_t'],
]

const EXPLORE = [
  ['/buddy', 'nav_buddy', 'buddy'],
  ['/report', 'nav_report', 'report_it'],
  ['/dashboard', 'nav_dashboard', 'machinery'],
  ['/site', 'nav_site', 'exit'],
]

export default function WorkerHome() {
  const { t, lang } = useLanguage()
  const [state, setState] = useState({ loading: true, worker: null, retention: [], error: false })
  const load = useCallback(async () => {
    setState(previous => ({ ...previous, loading: true, error: false }))
    try {
      const worker = await getCurrentWorker()
      const attempts = worker ? await listAttempts(worker.id) : []
      const retention = worker ? await retentionOverview(worker.id, bestByDomain(attempts)) : []
      setState({ loading: false, worker, retention, error: false })
    } catch {
      setState({ loading: false, worker: null, retention: [], error: true })
    }
  }, [])
  useEffect(() => { load() }, [load])

  const rows = new Map(state.retention.map(row => [row.domain, row]))
  const certification = state.retention.filter(row => CERTIFICATION_DOMAINS.includes(row.domain))
  const passed = certification.filter(row => row.effectiveReadiness >= PASS_THRESHOLD).length
  const due = certification.filter(row => row.attempted && row.due).length
  const ready = Math.round(certification.reduce((sum, row) => sum + row.effectiveReadiness, 0) / CERTIFICATION_DOMAINS.length)
  const modules = SCENARIOS.map(scenario => translateScenario(scenario, lang))

  const certified = passed === CERTIFICATION_DOMAINS.length

  return (
    <div className="worker-home">
      {/*
        HERO
        bg-hero-glow and bg-brand-sheen were defined in the Tailwind config and
        used by nothing. They are the one place the palette is allowed to bloom,
        and a flat page of hairline dividers was exactly what they were for.
        Both are aria-hidden decoration layered under the content.
      */}
      <section className="relative isolate overflow-hidden border-b border-line-subtle">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-hero-glow" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-sheen" />

        <div className="max-w-5xl mx-auto px-5 pt-9 pb-8 md:pt-14 md:pb-12">
          {state.error ? (
            <div role="alert" className="flex flex-wrap items-center gap-4 text-hazard-text">
              <Pictogram name="warning" size={26} />
              <p className="font-semibold">{t('error_label')}</p>
              <Button onClick={load} variant="secondary" size="sm">{t('retry_label')}</Button>
            </div>
          ) : state.worker ? (
            /* ---------- signed in: lead with today's readiness ---------- */
            <>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                <div className="min-w-0">
                  <p className="font-mono text-2xs uppercase tracking-[0.22em] text-brand-text mb-2">
                    {t('home_your_status')}
                  </p>
                  <h1 className="font-display font-bold text-3xl text-ink leading-none break-words">
                    {state.worker.name}
                  </h1>
                </div>
                <Badge tone={certified ? 'safe' : 'warning'} dot>
                  {t(certified ? 'home_ready_now' : 'home_not_certified')}
                </Badge>
              </div>

              {/* The readiness figure is the headline number: it is the one value
                  that decides whether this worker may be on the floor today. */}
              <dl aria-busy={state.loading} className="mt-7 grid grid-cols-3 gap-x-4 gap-y-2">
                {[
                  {
                    label: t('m_readiness'),
                    value: `${ready}%`,
                    tone: certified ? 'text-safe-text' : ready > 0 ? 'text-warning-text' : 'text-ink',
                  },
                  {
                    label: t('m_domains'),
                    value: `${passed}/${CERTIFICATION_DOMAINS.length}`,
                    tone: 'text-ink',
                  },
                  {
                    label: t('m_due'),
                    value: String(due),
                    tone: due ? 'text-warning-text' : 'text-ink',
                  },
                ].map(stat => (
                  <div key={stat.label} className="min-w-0">
                    {/* Fixed two-line label box so a long translation wrapping to a
                        second line cannot push its own figure below the others. */}
                    <dt className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary
                                   leading-tight min-h-[2.4em] flex items-start">
                      {stat.label}
                    </dt>
                    <dd className={`font-display font-bold text-3xl leading-none tabular-nums ${stat.tone}`}>
                      {state.loading ? <Skeleton className="h-8 w-16" /> : stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {!state.loading && (
                <Progress
                  className="mt-5"
                  size="sm"
                  value={ready}
                  max={100}
                  tone={certified ? 'safe' : ready > 0 ? 'warning' : 'brand'}
                />
              )}

              <p className="text-sm text-ink-secondary leading-relaxed mt-5 max-w-prose text-pretty">
                {t('home_status_hint')}
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <Button to="/train" icon={<Pictogram name="ppe" size={20} />}>{t('home_cta_train')}</Button>
                <Button to="/certification" variant="secondary" icon={<Pictogram name="correct" size={20} />}>
                  {t('nav_cert')}
                </Button>
              </div>
            </>
          ) : (
            /* ---------- signed out: what this is and how long it takes ---------- */
            <>
              <Badge tone="brand" dot className="mb-5">{t('home_offline_badge')}</Badge>

              <p className="font-mono text-2xs uppercase tracking-[0.22em] text-brand-text mb-3">
                {t('home_eyebrow')}
              </p>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-ink leading-[1.05] text-balance max-w-2xl">
                {t('home_signed_out_title')}
              </h1>
              <p className="text-base text-ink-secondary leading-relaxed mt-4 max-w-prose text-pretty">
                {t('home_signed_out_body')}
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <Button to="/start" icon={<Pictogram name="buddy" size={20} />}>{t('ob_sign_in')}</Button>
                <Button to="/train" variant="secondary" icon={<Pictogram name="ppe" size={20} />}>
                  {t('home_cta_train')}
                </Button>
              </div>

              <ol className="mt-9 grid gap-4 sm:grid-cols-3 border-t border-line-subtle pt-7">
                {STEPS.map(([eyebrow, title], index) => (
                  <li key={eyebrow} className="min-w-0 flex gap-3">
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-2xs tabular-nums text-brand-text
                                 border border-brand-border rounded-full w-7 h-7
                                 flex items-center justify-center"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="sr-only">{t(eyebrow)}. </span>
                      <span className="block font-semibold text-sm leading-snug text-ink text-pretty">
                        {t(title)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5 pb-10">
        {due > 0 && !state.error && (
          <Link
            to="/refresher"
            className="flex items-center gap-3 mt-6 p-4 rounded-lg border border-warning-border bg-warning-subtle
                       text-warning-text hover:border-warning transition-colors duration-base"
          >
            <Pictogram name="alarm" size={26} />
            <span className="flex-1 font-semibold">
              {t('rf_due_now')} <span className="font-mono tabular-nums">({due})</span>
            </span>
            <Chevron />
          </Link>
        )}

        {/* ---------- training ---------- */}
        <section aria-labelledby="worker-training" className="pt-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 id="worker-training" className="font-display font-bold text-2xl tracking-tight leading-none">
              {t('nav_train')}
            </h2>
            <Link
              to="/train"
              className="font-mono text-2xs uppercase tracking-widest text-brand-text inline-flex items-center gap-1.5
                         min-h-[44px] hover:underline"
            >
              {t('list_title')} <Chevron size={11} />
            </Link>
          </div>

          {/*
            A rounded, bordered group rather than nine free-floating rows on the
            page background. The dividers now sit INSIDE a container, so the list
            reads as one object with nine entries instead of nine unrelated links,
            and the hover fill has an edge to stop against.
          */}
          <ul className="rounded-xl border border-line-subtle bg-surface-1 overflow-hidden divide-y divide-line-subtle">
            {modules.map((scenario, index) => {
              const row = rows.get(scenario.domain)
              const contentLanguage = scenarioContentLanguage(scenario.id, lang)
              const attempted = row?.attempted
              const domainPassed = row?.effectiveReadiness >= PASS_THRESHOLD

              return (
                <li key={scenario.id}>
                  <Link
                    to={`/train/${scenario.id}`}
                    className={`group flex items-center gap-4 ps-3 pe-4 py-4 min-h-[76px] border-s-4
                               hover:bg-surface-2 transition-colors duration-fast
                               focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                                 row?.due ? 'border-warning' : domainPassed ? 'border-safe' : 'border-transparent'
                               }`}
                  >
                    <span className="shrink-0 relative" aria-hidden="true">
                      <Pictogram name={scenarioMeta(scenario.id).pictogram} size={30} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-2xs tabular-nums text-ink-tertiary shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary truncate">
                          {scenario.sector}
                        </span>
                      </span>
                      <span className="block font-semibold text-base leading-snug mt-1
                                       group-hover:text-brand-text transition-colors duration-fast">
                        {scenario.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5 text-ink-tertiary">
                        <span className="tabular-nums">{scenario.steps.length} {t('list_points')}</span>
                        {state.loading ? (
                          <Skeleton className="h-4 w-14" />
                        ) : attempted ? (
                          <span className={`font-mono font-bold tabular-nums ${
                            domainPassed ? 'text-safe-text' : 'text-warning-text'
                          }`}>
                            {row.effectiveReadiness}%
                          </span>
                        ) : (
                          <span className="text-ink-tertiary">{t('cert_not_attempted')}</span>
                        )}
                        {contentLanguage !== lang && (
                          <span className="text-warning-text">
                            {t('sl_shown_in')} {contentLanguage.toUpperCase()}
                          </span>
                        )}
                      </span>
                    </span>


                    <Chevron size={14} className="shrink-0 text-ink-tertiary
                                                  group-hover:text-brand-text transition-colors duration-fast" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ---------- everything else ---------- */}
        <section aria-labelledby="worker-explore" className="pt-10">
          <h2 id="worker-explore" className="font-display font-bold text-2xl tracking-tight leading-none mb-5">
            {t('home_explore')}
          </h2>

          {/* Two across on a phone, four on a desktop. Real tap targets with a
              surface and an edge, rather than four bare text links in a column. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXPLORE.map(([to, label, icon]) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-start gap-3 p-4 min-h-touch rounded-lg
                           border border-line-subtle bg-surface-1
                           hover:border-brand hover:bg-surface-2 hover:-translate-y-px
                           active:translate-y-0 transition-all duration-base ease-out
                           focus-visible:outline-2 focus-visible:outline-offset-2 group"
              >
                <span
                  aria-hidden="true"
                  className="rounded-lg bg-surface-2 border border-line-subtle p-2
                             group-hover:border-brand-border transition-colors duration-base"
                >
                  <Pictogram name={icon} size={24} />
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold leading-snug
                                 group-hover:text-brand-text transition-colors duration-fast">
                  {t(label)}
                  <Chevron
                    size={12}
                    className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0
                               transition-all duration-base ease-out"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t border-line-subtle flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-ink-tertiary leading-relaxed max-w-prose text-pretty">
            {t('home_footer_note')}
          </p>
          <Link
            to="/about"
            className="font-mono text-2xs uppercase tracking-widest text-brand-text inline-flex items-center gap-1.5
                       min-h-[44px] hover:underline shrink-0"
          >
            {t('home_how')} <Chevron size={11} />
          </Link>
        </footer>
      </div>
    </div>
  )
}
