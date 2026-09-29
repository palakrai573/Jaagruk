import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { Button, Chevron, Skeleton } from '../components/ui/index.js'
import Pictogram from '../lib/pictograms.jsx'
import { getCurrentWorker } from '../lib/identity.js'
import { listAttempts, bestByDomain } from '../lib/assessment.js'
import { retentionOverview } from '../lib/spaced.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { SCENARIOS, CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import { translateScenario, scenarioContentLanguage } from '../lib/scenarioTranslations.js'
import { scenarioMeta } from '../lib/scenarioMeta.js'
import './WorkerHome.css'

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

  return (
    <div className="worker-home max-w-5xl mx-auto px-5 py-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-5 pb-7 border-b border-line-subtle">
        <div className="flex items-center gap-4 min-w-0">
          <span className="shrink-0" aria-hidden="true"><Pictogram name="ppe" size={44} /></span>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-3xl text-ink">Jaagruk</h1>
            <p className="text-sm text-ink-secondary break-words">{state.worker?.name || t('home_eyebrow')}</p>
          </div>
        </div>
        <Button to={state.worker ? '/certification' : '/start'} variant="secondary" icon={<Pictogram name={state.worker ? 'correct' : 'buddy'} size={20} />}>
          {t(state.worker ? 'nav_cert' : 'ob_sign_in')}
        </Button>
      </header>

      {state.error ? (
        <div role="alert" className="py-6 flex flex-wrap items-center gap-4 text-hazard-text">
          <Pictogram name="warning" size={24} />
          <p>{t('error_label')}</p>
          <Button onClick={load} variant="secondary">{t('retry_label')}</Button>
        </div>
      ) : (
        <dl aria-busy={state.loading} className="grid grid-cols-3 gap-3 py-6 border-b border-line-subtle">
          {[
            ['m_readiness', state.worker ? `${ready}%` : '-', 'text-ink'],
            ['m_domains', state.worker ? `${passed}/${CERTIFICATION_DOMAINS.length}` : '-', 'text-safe-text'],
            ['m_due', state.worker ? due : '-', due ? 'text-warning-text' : 'text-ink'],
          ].map(([label, value, tone]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-ink-secondary mb-2 break-words">{t(label)}</dt>
              <dd className={`font-mono font-bold text-2xl tabular-nums ${tone}`}>
                {state.loading ? <Skeleton className="h-8 w-16" /> : value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {due > 0 && !state.error && (
        <Link to="/refresher" className="flex items-center gap-3 py-5 border-b border-line-subtle text-warning-text">
          <Pictogram name="alarm" size={26} />
          <span className="flex-1 font-semibold">{t('rf_due_now')} <span className="font-mono">({due})</span></span>
          <Chevron />
        </Link>
      )}

      <section aria-labelledby="worker-training" className="pt-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="worker-training" className="font-display font-bold text-2xl">{t('nav_train')}</h2>
          <Link to="/train" className="inline-flex items-center gap-2 text-sm text-brand-text min-h-[44px]">
            {t('list_title')} <Chevron size={14} />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-x-8">
          {modules.map((scenario, index) => {
            const row = rows.get(scenario.domain)
            const contentLanguage = scenarioContentLanguage(scenario.id, lang)
            const status = row?.attempted ? `${row.effectiveReadiness}%` : t('cert_not_attempted')
            return (
              <Link key={scenario.id} to={`/train/${scenario.id}`} className="group flex items-center gap-4 min-h-[112px] py-5 border-b border-line-subtle hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-offset-2">
                <div className="shrink-0 w-12 flex flex-col items-center gap-2" aria-hidden="true">
                  <Pictogram name={scenarioMeta(scenario.id).pictogram} size={34} />
                  <span className="font-mono text-2xs text-ink-tertiary">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-secondary mb-1">{scenario.sector}</p>
                  <h3 className="font-semibold text-base leading-snug group-hover:text-brand-text break-words">{scenario.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2 text-ink-secondary">
                    <span>{scenario.steps.length} {t('list_points')}</span>
                    {!state.loading && !state.error && <span className={row?.effectiveReadiness >= PASS_THRESHOLD ? 'text-safe-text' : ''}>{status}</span>}
                    {contentLanguage !== lang && <span className="text-warning-text">{t('sl_shown_in')} {contentLanguage.toUpperCase()}</span>}
                  </div>
                </div>
                <Chevron size={16} className="shrink-0 text-ink-tertiary" />
              </Link>
            )
          })}
        </div>
      </section>

      <nav aria-label={t('more_label')} className="grid grid-cols-2 md:grid-cols-4 gap-x-6 mt-8 border-t border-line-subtle">
        {[
          ['/buddy', 'nav_buddy', 'buddy'], ['/report', 'nav_report', 'report_it'],
          ['/dashboard', 'nav_dashboard', 'machinery'], ['/site', 'nav_site', 'exit'],
        ].map(([to, label, icon]) => (
          <Link key={to} to={to} className="flex items-center gap-3 min-h-touch py-4 text-sm hover:text-brand-text">
            <Pictogram name={icon} size={22} /><span>{t(label)}</span>
          </Link>
        ))}
      </nav>
      <footer className="pt-6 border-t border-line-subtle">
        <Link to="/about" className="text-sm text-ink-secondary underline min-h-[44px] inline-flex items-center">{t('home_how')}</Link>
      </footer>
    </div>
  )
}
