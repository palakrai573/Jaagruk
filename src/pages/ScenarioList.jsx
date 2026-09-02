import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { SCENARIOS, CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import { translateScenario, SCENARIO_TRANSLATIONS } from '../lib/scenarioTranslations.js'
import { scenarioMeta } from '../lib/scenarioMeta.js'
import { listAttempts, bestByDomain } from '../lib/assessment.js'
import { retentionOverview } from '../lib/spaced.js'
import { getCurrentWorker } from '../lib/identity.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { scenarioContentIsEnglish } from '../lib/i18n.js'

/**
 * Module list.
 *
 * Each card shows the worker's current standing in that domain rather than just
 * a title, so the list doubles as a to-do list. Modules that do not count toward
 * certification are labelled as such — a worker should not discover that after
 * completing one.
 */

export default function ScenarioList() {
  const { t, lang } = useLanguage()

  const [retention, setRetention] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const worker = await getCurrentWorker()
      const attempts = await listAttempts(worker?.id || '')
      setRetention(await retentionOverview(worker?.id || '', bestByDomain(attempts)))
    } catch {
      setRetention([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const byDomain = new Map(retention.map((r) => [r.domain, r]))
  const scenarios = SCENARIOS.map((s) => translateScenario(s, lang))

  const passed = retention.filter((r) => r.effectiveReadiness >= PASS_THRESHOLD).length

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('list_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-2">{t('list_title')}</h1>
      <p className="text-concrete mb-8 max-w-xl leading-relaxed">{t('list_desc')}</p>

      {/* Progress toward certification */}
      {!loading && (
        <div className="bg-steel-light border border-steel-lighter rounded-lg p-5 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Pictogram name={passed === CERTIFICATION_DOMAINS.length ? 'correct' : 'ppe'} size={36} />
            <div>
              <p className="font-display font-bold text-2xl">
                {passed}/{CERTIFICATION_DOMAINS.length}
              </p>
              <p className="font-mono text-[10px] text-concrete uppercase tracking-widest">
                {t('cert_domains_passed')}
              </p>
            </div>
          </div>
          <Link to="/certification" className="font-mono text-xs text-amber underline shrink-0">
            {t('nav_cert')} →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {scenarios.map((s) => {
          const meta = scenarioMeta(s.id)
          const row = byDomain.get(s.domain)
          const counts = CERTIFICATION_DOMAINS.includes(s.domain)
          const untranslated = scenarioContentIsEnglish(lang, s.id, SCENARIO_TRANSLATIONS)

          return (
            <Link
              key={s.id}
              to={`/train/${s.id}`}
              className="bg-steel-light border border-steel-lighter rounded-lg p-6 hover:border-amber transition-colors group flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <Pictogram name={meta.pictogram} size={46} />

                {row?.attempted && (
                  <span className="text-right shrink-0">
                    <span
                      className="font-display font-bold text-2xl"
                      style={{
                        color:
                          row.effectiveReadiness >= PASS_THRESHOLD
                            ? '#2E7D4F'
                            : row.effectiveReadiness > 0
                              ? '#FFB020'
                              : '#8B8F94',
                      }}
                    >
                      {row.effectiveReadiness}%
                    </span>
                    <span className="block font-mono text-[9px] text-concrete uppercase tracking-widest">
                      {t('as_readiness')}
                    </span>
                  </span>
                )}
              </div>

              <p className="font-mono text-amber text-xs uppercase tracking-widest mb-2">{s.sector}</p>
              <h2 className="font-display font-bold text-2xl uppercase mb-3 group-hover:text-amber leading-tight">
                {s.title}
              </h2>
              <p className="text-concrete text-sm leading-relaxed mb-4 flex-1">{s.intro}</p>

              {/* Status line */}
              <div className="flex items-center gap-3 flex-wrap font-mono text-[10px] uppercase tracking-widest">
                <span className="text-concrete">
                  {s.steps.length} {t('list_points')}
                </span>

                {row?.due && <span className="text-hazard">· {t('rf_due_now')}</span>}
                {row?.hesitation && (
                  <span className="text-amber flex items-center gap-1">
                    · <Pictogram name="slow" size={12} /> {t('as_grade_slow')}
                  </span>
                )}
                {!counts && <span className="text-concrete">· {t('as_grade_unknown')}</span>}
                {meta.smoke > 0 && (
                  <span className="text-concrete flex items-center gap-1">
                    · <Pictogram name="dust" size={12} />
                  </span>
                )}
              </div>

              {untranslated && (
                <p className="font-mono text-[10px] text-hazard mt-3 flex items-center gap-1.5">
                  <Pictogram name="warning" size={12} />
                  EN
                </p>
              )}
            </Link>
          )
        })}
      </div>

      {/* Buddy drill as a peer entry point */}
      <Link
        to="/buddy"
        className="mt-6 block bg-steel-light border border-steel-lighter rounded-lg p-6 hover:border-amber transition-colors"
      >
        <div className="flex items-center gap-5">
          <Pictogram name="buddy" size={48} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-2xl uppercase mb-1">{t('bd_title')}</h2>
            <p className="text-concrete text-sm leading-relaxed">{t('bd_desc')}</p>
          </div>
        </div>
      </Link>
    </div>
  )
}
