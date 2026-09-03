import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardMeta,
  CardActions,
  Badge,
  StatusDot,
  Stat,
  Section,
  SectionHeader,
  Reveal,
  Skeleton,
} from '../components/ui/index.js'
import { getCurrentWorker } from '../lib/identity.js'
import { listAttempts, bestByDomain } from '../lib/assessment.js'
import { loadDomainProgress, isEligibleForCertificate, overallCompliance } from '../lib/certificate.js'
import { dueRefreshers } from '../lib/spaced.js'
import { listSites } from '../lib/siteMap.js'
import { hazardStats } from '../lib/hazards.js'
import { SCENARIOS, CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import { LANGUAGES } from '../lib/i18n.js'

/**
 * Home.
 *
 * WHY THIS IS NOT A MARKETING PAGE
 * The previous version was a static pitch: headline, three qualitative stats,
 * four cards of prose. It told a first-time visitor what the product claims and
 * told a returning worker nothing at all — the person most likely to open it.
 *
 * So it adapts. Signed out, it argues the case. Signed in, the hero carries the
 * worker's actual decayed readiness, which domains have passed, what is due, and
 * what is queued to sync. Same page, and the numbers are real rather than
 * illustrative.
 *
 * WHY THE CARDS CARRY METADATA
 * A card that is an icon, a heading and a paragraph is a bullet point with a
 * border. Each layer card here shows concrete figures — anchors placed, modules
 * available, domains passed — plus a status chip and a real action, so the page is
 * navigable rather than merely readable.
 */

/* Derived from the content itself, so these cannot drift from what ships. */
const MODULE_COUNT = SCENARIOS.length
const DECISION_COUNT = SCENARIOS.reduce((sum, s) => sum + (s.steps?.length || 0), 0)
const DOMAIN_COUNT = CERTIFICATION_DOMAINS.length
const LANGUAGE_COUNT = LANGUAGES.length

export default function Home() {
  const { t } = useLanguage()
  const [state, setState] = useState({ loading: true, worker: null })

  const load = useCallback(async () => {
    try {
      const worker = await getCurrentWorker()

      // A signed-out visitor gets the capability figures only. Querying a worker's
      // history before there is a worker would just return empty rows.
      if (!worker?.id) {
        setState({ loading: false, worker: null })
        return
      }

      const attempts = await listAttempts(worker.id)
      const best = bestByDomain(attempts)

      const [progress, due, sites, hazards] = await Promise.all([
        loadDomainProgress(worker.id, attempts),
        dueRefreshers(worker.id, best),
        listSites(),
        hazardStats(),
      ])

      // overallCompliance returns an object, not a percentage. avgReadiness is the
      // right figure here: mean CURRENT readiness, so it reflects decay. `percent`
      // is the share of domains passed, which is a different question and is
      // already shown by the domains metric.
      const compliance = overallCompliance(progress)
      const zones = (sites || []).reduce((sum, s) => sum + (s.zones?.length || 0), 0)
      const anchors = (sites || []).reduce(
        (sum, s) => sum + (s.zones || []).reduce((n, z) => n + (z.anchors?.length || 0), 0),
        0
      )

      setState({
        loading: false,
        worker,
        readiness: compliance.avgReadiness,
        eligible: isEligibleForCertificate(progress),
        passedDomains: compliance.passedCount,
        totalDomains: compliance.totalDomains || DOMAIN_COUNT,
        hesitationDomains: compliance.hesitationDomains.length,
        dueCount: (due || []).length,
        // byStatus, not a flat `open` — hazardStats groups by status. Reading
        // `hazards.open` silently returned undefined and rendered a permanent 0.
        openHazards: hazards?.byStatus?.open ?? 0,
        openHighHazards: hazards?.openHighCount ?? 0,
        zones,
        anchors,
        attempts: attempts.length,
      })
    } catch {
      // Storage unavailable, private mode, quota. The page must still render its
      // case — a broken database is not a reason to show a blank screen.
      setState({ loading: false, worker: null })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const signedIn = !!state.worker

  return (
    <div>
      <Hero t={t} state={state} signedIn={signedIn} />
      <Layers t={t} state={state} signedIn={signedIn} />
      <Why t={t} />
      <How t={t} />
      <Explore t={t} state={state} />
      <FooterNote t={t} />
    </div>
  )
}

/* ================================================================== */
/* Hero                                                                */
/* ================================================================== */

function Hero({ t, state, signedIn }) {
  return (
    <header className="relative overflow-hidden">
      {/* The hazard stripe, spent ONCE. The previous page used it five times as a
          section divider, and a strong industrial motif repeated five times stops
          reading as a motif. */}
      <div className="stripe-divider" />

      <div className="absolute inset-0 grid-surface grid-fade opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 hero-bloom" aria-hidden="true" />

      <div className="relative max-w-5xl mx-auto px-5 pt-12 pb-14 md:pt-20 md:pb-20">
        <Reveal>
          <p className="font-mono text-2xs md:text-xs tracking-[0.24em] uppercase text-brand-text mb-5">
            {t('home_eyebrow')}
          </p>
        </Reveal>

        <Reveal index={1}>
          {/* text-hero is a clamp(), so this scales continuously from 320px rather
              than jumping at breakpoints. */}
          <h1 className="font-display font-bold text-hero leading-[0.92] uppercase tracking-tight text-balance mb-6">
            {t('home_title_1')}
            <br />
            <span className="text-brand-text">{t('home_title_2')}</span>
            <br />
            {t('home_title_3')}
          </h1>
        </Reveal>

        <Reveal index={2}>
          <p className="text-ink-secondary text-lg max-w-2xl leading-relaxed text-pretty mb-7">{t('home_desc')}</p>
        </Reveal>

        <Reveal index={3}>
          <div className="flex flex-wrap items-center gap-3 mb-9">
            <Badge tone="safe" dot icon={<Pictogram name="correct" size={13} />}>
              {t('home_offline_badge')}
            </Badge>
            <Badge tone="neutral">
              {MODULE_COUNT} {t('m_modules')}
            </Badge>
            <Badge tone="neutral">
              {LANGUAGE_COUNT} {t('m_languages')}
            </Badge>
          </div>
        </Reveal>

        <Reveal index={4}>
          {/* Stacks full-width on a phone. Two side-by-side buttons at 320px give
              two cramped targets instead of one comfortable one. */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button to="/train" size="lg" icon={<Pictogram name="ppe" size={20} />}>
              {t('home_cta_train')}
            </Button>
            <Button to={signedIn ? '/dashboard' : '/start'} variant="secondary" size="lg">
              {signedIn ? t('nav_dashboard') : t('nav_start')}
            </Button>
          </div>
        </Reveal>

        <StatusPanel t={t} state={state} signedIn={signedIn} />
      </div>
    </header>
  )
}

/**
 * The live panel. This is what makes the page dynamic in the way that matters:
 * every figure is read from this device, and it changes as the worker trains.
 */
function StatusPanel({ t, state, signedIn }) {
  if (state.loading) {
    return (
      <div className="mt-12 border border-line-subtle rounded-xl bg-surface-1/70 p-5">
        <Skeleton className="h-2.5 w-32 mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-7 w-16 mb-2" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!signedIn) {
    return (
      <Reveal index={5}>
        <div className="mt-12 border border-line-subtle rounded-xl bg-surface-1/70 backdrop-blur-sm p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 max-w-md">
              <p className="font-display font-bold text-xl uppercase tracking-tight mb-2">
                {t('home_signed_out_title')}
              </p>
              <p className="text-sm text-ink-secondary leading-relaxed">{t('home_signed_out_body')}</p>
            </div>
            <Button to="/start" variant="secondary" icon={<Pictogram name="buddy" size={18} />}>
              {t('nav_start')}
            </Button>
          </div>

          {/* Capability figures, derived from the shipped content rather than
              written by hand, so they cannot go stale. */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6 pt-5 border-t border-line-subtle">
            <HeroMetric value={MODULE_COUNT} label={t('m_modules')} />
            <HeroMetric value={DECISION_COUNT} label={t('m_decisions')} />
            <HeroMetric value={DOMAIN_COUNT} label={t('m_domains')} />
            <HeroMetric value={LANGUAGE_COUNT} label={t('m_languages')} />
          </dl>
        </div>
      </Reveal>
    )
  }

  const tone = state.readiness >= 70 ? 'safe' : state.readiness >= 45 ? 'warning' : 'hazard'

  return (
    <Reveal index={5}>
      <div className="mt-12 border border-line-subtle rounded-xl bg-surface-1/70 backdrop-blur-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-line-subtle">
          <div className="min-w-0">
            <p className="font-display font-bold text-lg uppercase tracking-tight truncate">
              {t('home_your_status')}
            </p>
            <p className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mt-1 truncate">
              {state.worker.name}
            </p>
          </div>

          <Badge tone={state.eligible ? 'safe' : tone} dot>
            {state.eligible ? t('home_ready_now') : t('home_not_certified')}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5 p-5">
          <HeroMetric value={state.readiness} suffix="%" label={t('m_readiness')} tone={tone} />
          <HeroMetric
            value={`${state.passedDomains}/${state.totalDomains}`}
            label={t('m_domains')}
            tone={state.passedDomains === state.totalDomains ? 'safe' : 'ink'}
          />
          <HeroMetric
            value={state.dueCount}
            label={t('m_due')}
            tone={state.dueCount > 0 ? 'warning' : 'safe'}
            to={state.dueCount > 0 ? '/refresher' : undefined}
          />
          <HeroMetric
            value={state.openHazards}
            label={t('m_reports')}
            // A high-severity report outstanding is a different situation from a
            // low one, so it escalates the colour rather than being averaged in.
            tone={state.openHighHazards > 0 ? 'hazard' : state.openHazards > 0 ? 'warning' : 'ink'}
            to="/report"
          />
        </dl>

        <p className="px-5 pb-4 font-mono text-2xs text-ink-tertiary leading-relaxed">{t('home_status_hint')}</p>
      </div>
    </Reveal>
  )
}

const METRIC_TONES = {
  ink: 'text-ink',
  safe: 'text-safe-text',
  warning: 'text-warning-text',
  hazard: 'text-hazard-text',
  brand: 'text-brand-text',
}

/** A figure with its label. Becomes a link when there is somewhere to act. */
function HeroMetric({ value, suffix = '', label, tone = 'ink', to }) {
  const body = (
    <>
      <dd
        className={`font-mono text-2xl font-bold tabular-nums leading-none ${METRIC_TONES[tone] || METRIC_TONES.ink}`}
      >
        {value}
        {suffix}
      </dd>
      <dt className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mt-2">{label}</dt>
    </>
  )

  if (!to) return <div className="min-w-0">{body}</div>

  return (
    <Link
      to={to}
      className="min-w-0 group rounded-md -m-1 p-1 transition-colors duration-fast hover:bg-surface-2"
    >
      {body}
    </Link>
  )
}

/* ================================================================== */
/* The four layers                                                     */
/* ================================================================== */

function Layers({ t, state, signedIn }) {
  // Metadata per card differs by whether we know anything about this worker: real
  // history when signed in, capability figures otherwise. Never a placeholder
  // zero, which on a readiness figure would be actively misleading.
  const layers = [
    {
      n: '01',
      pictogram: 'exit',
      title: t('home_l1_title'),
      body: t('home_l1_body'),
      to: '/site',
      cta: t('nav_site'),
      accent: 'safe',
      meta: signedIn
        ? [
            { label: t('m_zones'), value: state.zones ?? 0 },
            { label: t('m_anchors'), value: state.anchors ?? 0 },
          ]
        : [{ label: t('m_modules'), value: MODULE_COUNT }],
      status:
        signedIn && state.zones > 0 ? (
          <Badge tone="safe" size="sm" dot>
            {state.zones}
          </Badge>
        ) : null,
    },
    {
      n: '02',
      pictogram: 'slow',
      title: t('home_l2_title'),
      body: t('home_l2_body'),
      to: '/train',
      cta: t('nav_train'),
      accent: 'warning',
      meta: [
        { label: t('m_modules'), value: MODULE_COUNT },
        { label: t('m_decisions'), value: DECISION_COUNT },
      ],
      status: signedIn ? (
        <Badge tone="neutral" size="sm">
          {state.attempts ?? 0}
        </Badge>
      ) : null,
    },
    {
      n: '03',
      pictogram: 'lockout',
      title: t('home_l3_title'),
      body: t('home_l3_body'),
      to: '/certification',
      cta: t('nav_cert'),
      accent: 'mandate',
      meta: signedIn
        ? [
            { label: t('m_domains'), value: `${state.passedDomains ?? 0}/${state.totalDomains ?? DOMAIN_COUNT}` },
            { label: t('m_readiness'), value: state.readiness ?? 0, unit: '%' },
          ]
        : [{ label: t('m_domains'), value: DOMAIN_COUNT }],
      status: signedIn ? (
        <Badge tone={state.eligible ? 'safe' : 'neutral'} size="sm" dot>
          {state.eligible ? t('home_ready_now') : t('home_not_certified')}
        </Badge>
      ) : null,
    },
    {
      n: '04',
      pictogram: 'report_it',
      title: t('home_l4_title'),
      body: t('home_l4_body'),
      to: '/report',
      cta: t('nav_report'),
      accent: 'hazard',
      meta: signedIn
        ? [
            { label: t('m_reports'), value: state.openHazards ?? 0 },
            { label: t('m_due'), value: state.dueCount ?? 0 },
          ]
        : [{ label: t('m_languages'), value: LANGUAGE_COUNT }],
      status:
        signedIn && state.openHazards > 0 ? (
          <Badge tone={state.openHighHazards > 0 ? 'hazard' : 'warning'} size="sm" dot>
            {state.openHazards}
          </Badge>
        ) : null,
    },
  ]

  return (
    <Section tone="raised">
      <SectionHeader eyebrow={`${DOMAIN_COUNT} · ${MODULE_COUNT} · ${LANGUAGE_COUNT}`} title={t('home_layers_title')} />

      <div className="grid md:grid-cols-2 gap-4">
        {layers.map((layer, i) => (
          <Reveal key={layer.n} index={i} className="flex">
            <Card interactive accent={layer.accent} className="flex flex-col w-full">
              <CardHeader
                eyebrow={layer.n}
                title={layer.title}
                status={layer.status}
                icon={<Pictogram name={layer.pictogram} size={40} />}
              />
              <CardBody className="flex-1">{layer.body}</CardBody>
              <CardMeta items={layer.meta} />
              <CardActions>
                <Button to={layer.to} variant="ghost" size="sm" iconEnd={<Chevron />}>
                  {layer.cta}
                </Button>
              </CardActions>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

/* ================================================================== */
/* Why / How / Explore                                                 */
/* ================================================================== */

function Why({ t }) {
  return (
    <Section>
      <div className="grid md:grid-cols-3 gap-8">
        {[1, 2, 3].map((n, i) => (
          <Reveal key={n} index={i}>
            {/* These three are qualitative ("Preventable"), so they are not run
                through a counter — animating a word is nonsense. */}
            <Stat value={t(`home_stat${n}_n`)} label={t(`home_stat${n}_l`)} animate={false} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

function How({ t }) {
  const steps = [
    { pictogram: 'warning', e: t('home_step1_e'), title: t('home_step1_t'), body: t('home_step1_b') },
    { pictogram: 'listen', e: t('home_step2_e'), title: t('home_step2_t'), body: t('home_step2_b') },
    { pictogram: 'ppe', e: t('home_step3_e'), title: t('home_step3_t'), body: t('home_step3_b') },
  ]

  return (
    <Section tone="raised">
      <SectionHeader title={t('home_how')} />

      <ol className="grid md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.e} index={i} className="flex">
            <Card className="flex flex-col w-full p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Pictogram name={step.pictogram} size={32} />
                <span
                  className="font-display font-bold text-2xl text-ink-disabled tabular-nums leading-none"
                  aria-hidden="true"
                >
                  0{i + 1}
                </span>
              </div>
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-brand-text mb-2">{step.e}</p>
              <h3 className="font-display font-bold text-xl uppercase leading-tight mb-3">{step.title}</h3>
              <p className="text-sm text-ink-secondary leading-relaxed">{step.body}</p>
            </Card>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}

function Explore({ t, state }) {
  const links = [
    { to: '/buddy', pictogram: 'buddy', label: t('home_cta_buddy') },
    { to: '/refresher', pictogram: 'alarm', label: t('nav_refresher'), count: state.dueCount },
    { to: '/scan', pictogram: 'warning', label: t('nav_scan') },
    { to: '/verify', pictogram: 'correct', label: t('vf_check_now') },
    { to: '/dashboard', pictogram: 'machinery', label: t('nav_dashboard') },
    { to: '/settings', pictogram: 'lockout', label: t('nav_settings') },
  ]

  return (
    <Section>
      <SectionHeader title={t('home_explore')} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {links.map((link, i) => (
          <Reveal key={link.to} index={i} step={40}>
            <Link
              to={link.to}
              className="group flex items-center gap-3 border border-line-subtle rounded-lg p-4 bg-surface-1
                         transition-all duration-base ease-out
                         hover:border-brand-border hover:-translate-y-0.5 hover:shadow-2
                         min-h-[64px]"
            >
              <Pictogram name={link.pictogram} size={26} />
              <span className="font-mono text-xs uppercase tracking-widest text-ink-secondary min-w-0 flex-1 leading-tight">
                {link.label}
              </span>
              {link.count > 0 ? <StatusDot tone="warning" pulse /> : null}
              <span
                className="text-ink-disabled transition-transform duration-base group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                <Chevron />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

function FooterNote({ t }) {
  return (
    <Section tone="inset" containerClassName="py-10 md:py-12">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-sm text-ink-secondary leading-relaxed mb-4">{t('home_footer_note')}</p>
        <p className="font-mono text-2xs text-ink-tertiary leading-relaxed">{t('home_problem_ref')}</p>
      </div>
    </Section>
  )
}

/**
 * Inline chevron. Flipped for RTL with a CSS transform rather than a different
 * glyph, because the character itself carries a direction and logical properties
 * cannot help with that.
 */
function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="rtl:-scale-x-100 shrink-0"
    >
      <path d="M6 3l5 5-5 5" />
    </svg>
  )
}
