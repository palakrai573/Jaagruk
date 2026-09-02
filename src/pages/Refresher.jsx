import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SCENARIOS } from '../lib/scenarios.js'
import { translateScenario } from '../lib/scenarioTranslations.js'
import { enrichScenario, newAttemptSeed, pickRefresherSteps, hesitatedStepIds } from '../lib/scenarioMeta.js'
import {
  dueRefreshers,
  retentionOverview,
  recordResult,
  INTERVALS_DAYS,
  notificationPermission,
  requestNotificationPermission,
  maybeNotifyRefreshers,
  registerPeriodicRefresherCheck,
} from '../lib/spaced.js'
import { listAttempts, bestByDomain, saveAttempt, scoreRun, gradeLatency, TRAINING_MODE } from '../lib/assessment.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { getCurrentWorker } from '../lib/identity.js'
import { enqueue, SYNC_KIND } from '../lib/sync.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { LS, lsGetBool } from '../lib/local.js'
import Pictogram from '../lib/pictograms.jsx'
import { ChoiceCard, LatencyBar, FeedbackPanel, ReadinessRing } from '../components/DrillUI.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Spaced refreshers — the part that attacks the retention number in the problem
 * statement directly.
 *
 * Classroom safety training retains under 20% after a week. Making the first
 * exposure more engaging does not fix that; only repetition does. So a
 * certificate here is not a date stamp, it is a score that decays when a worker
 * stops refreshing and recovers when they start again.
 *
 * A refresher is deliberately tiny — two decisions, about ninety seconds. The
 * whole design assumes it happens at the start of a shift, standing up, and that
 * anything longer simply will not get done.
 */

const DOMAIN_TO_SCENARIO = SCENARIOS.reduce((acc, s) => {
  acc[s.domain] = s.id
  return acc
}, {})

export default function Refresher() {
  const { t, lang } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState(null)
  const [due, setDue] = useState([])
  const [overview, setOverview] = useState([])
  const [attempts, setAttempts] = useState([])
  const [notifyState, setNotifyState] = useState(() => notificationPermission())

  // active quiz
  const [active, setActive] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [decisions, setDecisions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [grade, setGrade] = useState(null)
  const [latency, setLatency] = useState(0)
  const [startedAt, setStartedAt] = useState(0)
  const [outcome, setOutcome] = useState(null)

  const pictogramMode = lsGetBool(LS.MODE_PICTOGRAM, false)

  /* ---------------- load ---------------- */

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const current = await getCurrentWorker()
      setWorker(current)

      const list = await listAttempts(current?.id || '')
      setAttempts(list)
      const progress = bestByDomain(list)

      const [dueList, retention] = await Promise.all([
        dueRefreshers(current?.id || '', progress),
        retentionOverview(current?.id || '', progress),
      ])
      setDue(dueList)
      setOverview(retention)

      // At most one reminder a day, handled inside the helper.
      if (dueList.length) maybeNotifyRefreshers(dueList)
    } catch {
      setDue([])
      setOverview([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => () => stopSpeaking(), [])

  /* ---------------- quiz ---------------- */

  const step = active?.steps?.[stepIndex] || null

  useEffect(() => {
    if (!step) return undefined
    setStartedAt(Date.now())
    const spoken = pictogramMode
      ? `${step.prompt} ${step.choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}`
      : step.prompt
    const token = speak(spoken, lang)
    return () => stopSpeaking(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, lang])

  const startQuiz = (domain) => {
    const scenarioId = DOMAIN_TO_SCENARIO[domain]
    const base = SCENARIOS.find((s) => s.id === scenarioId)
    if (!base) return

    const enriched = enrichScenario(translateScenario(base, lang), { seed: newAttemptSeed() })
    // Weight selection toward whatever this worker previously hesitated on —
    // re-asking the questions they already answer fast wastes the interaction.
    const flagged = hesitatedStepIds(attempts, scenarioId)
    const steps = pickRefresherSteps(enriched, 2, flagged)

    setActive({ ...enriched, steps, domain })
    setStepIndex(0)
    setDecisions([])
    setFeedback(null)
    setGrade(null)
    setOutcome(null)
  }

  const choose = (choice) => {
    if (!step || feedback) return
    const latencyMs = Date.now() - startedAt
    setDecisions((prev) => [
      ...prev,
      { stepId: step.id, points: choice.points, maxPoints: step.maxPoints, latencyMs, targetMs: step.targetMs },
    ])
    setFeedback(choice)
    setGrade(gradeLatency(latencyMs, step.targetMs))
    setLatency(latencyMs)
    speak(choice.feedback, lang)
  }

  const advance = async () => {
    const collected = decisions
    setFeedback(null)
    setGrade(null)

    if (stepIndex + 1 < active.steps.length) {
      setStepIndex((i) => i + 1)
      return
    }

    const scored = scoreRun(collected)
    const passed = scored.readiness >= PASS_THRESHOLD
    setOutcome({ ...scored, passed })

    try {
      const attempt = await saveAttempt({
        workerId: worker?.id || '',
        scenarioId: active.id,
        domain: active.domain,
        mode: TRAINING_MODE.REFRESHER,
        result: scored,
        meta: { lang, refresher: true },
      })
      if (worker?.id) {
        // A pass advances to the next interval; a fail resets to two days.
        await recordResult(worker.id, active.domain, { passed })
        await enqueue(SYNC_KIND.ATTEMPT, attempt.id, attempt)
      }
    } catch {
      /* the score is already on screen; a storage failure must not hide it */
    }
  }

  const closeQuiz = () => {
    setActive(null)
    setOutcome(null)
    stopSpeaking()
    refresh()
  }

  const enableReminders = async () => {
    const state = await requestNotificationPermission()
    setNotifyState(state)
    if (state === 'granted') {
      await registerPeriodicRefresherCheck()
      if (due.length) maybeNotifyRefreshers(due)
    }
  }

  /* ---------------- derived ---------------- */

  const attemptedCount = useMemo(() => overview.filter((o) => o.attempted).length, [overview])

  /* ---------------- quiz view ---------------- */

  if (active && !outcome) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase">
            {t('rf_eyebrow')} · {stepIndex + 1}/{active.steps.length}
          </p>
          <button
            type="button"
            onClick={closeQuiz}
            className="font-mono text-[10px] uppercase tracking-widest text-concrete hover:text-hazard"
          >
            {t('cancel_label')}
          </button>
        </div>

        <h1 className="font-display font-bold text-2xl uppercase mb-6 flex items-center gap-3">
          <Pictogram name={active.pictogram} size={30} />
          {active.domain}
        </h1>

        <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {pictogramMode && <Pictogram name={step.pictogram} size={54} />}
            <p className="leading-relaxed text-lg">{step.prompt}</p>
          </div>
        </div>

        {!feedback && <LatencyBar startedAt={startedAt} targetMs={step.targetMs} />}

        {!feedback ? (
          <div className="grid gap-3">
            {step.choices.map((choice, i) => (
              <ChoiceCard
                key={`${step.id}-${choice.sourceIndex}`}
                index={i}
                text={choice.text}
                pictogram={choice.pictogram}
                pictogramMode={pictogramMode}
                onSelect={() => choose(choice)}
              />
            ))}
          </div>
        ) : (
          <FeedbackPanel
            safe={feedback.points >= step.maxPoints}
            feedback={feedback.feedback}
            grade={grade}
            latencyMs={latency}
            targetMs={step.targetMs}
          >
            <button
              onClick={advance}
              data-gesture-target="continue"
              className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-3 rounded"
            >
              {stepIndex + 1 < active.steps.length ? t('sc_continue') : t('done_label')}
            </button>
          </FeedbackPanel>
        )}
      </div>
    )
  }

  /* ---------------- quiz result ---------------- */

  if (outcome) {
    return (
      <div className="max-w-md mx-auto px-5 py-14 text-center">
        <Pictogram name={outcome.passed ? 'correct' : 'incorrect'} size={58} className="mx-auto mb-5" />
        <h1 className="font-display font-bold text-2xl uppercase mb-2">
          {outcome.passed ? t('rf_passed') : t('rf_failed')}
        </h1>
        <p className="text-concrete text-sm mb-8">{active.domain}</p>

        <div className="flex justify-center mb-8">
          <ReadinessRing
            readiness={outcome.readiness}
            accuracy={outcome.accuracyPct}
            speed={outcome.speedPct}
            size={140}
          />
        </div>

        {outcome.hesitation && (
          <div className="bg-amber/10 border border-amber/40 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
            <Pictogram name="slow" size={28} />
            <p className="text-xs text-concrete leading-relaxed">{t('as_hesitation_body')}</p>
          </div>
        )}

        <button
          type="button"
          onClick={closeQuiz}
          className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-3 rounded"
        >
          {t('done_label')}
        </button>
      </div>
    )
  }

  /* ---------------- overview ---------------- */

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('rf_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-3">{t('rf_title')}</h1>
      <p className="text-concrete mb-8 max-w-xl leading-relaxed">{t('rf_desc')}</p>

      {loading && <p className="font-mono text-xs text-concrete uppercase tracking-widest">{t('loading_label')}</p>}

      {!loading && !worker && (
        <div className="border border-steel-lighter rounded-lg p-6 mb-8 flex items-start gap-4">
          <Pictogram name="warning" size={32} />
          <div>
            <p className="text-sm mb-2">{t('cert_sign_in_first')}</p>
            <p className="text-xs text-concrete mb-3 leading-relaxed">{t('cert_sign_in_why')}</p>
            <Link to="/start" className="font-mono text-xs text-amber underline">
              {t('ob_sign_in')}
            </Link>
          </div>
        </div>
      )}

      {!loading && worker && attemptedCount === 0 && (
        <div className="border border-steel-lighter rounded-lg p-8 text-center mb-8">
          <Pictogram name="ppe" size={40} className="mx-auto mb-4" />
          <p className="text-sm text-concrete mb-4">{t('rf_never_trained')}</p>
          <Link
            to="/train"
            className="inline-block bg-amber text-steel font-display font-bold uppercase px-6 py-3 rounded"
          >
            {t('home_cta_train')}
          </Link>
        </div>
      )}

      {/* Due now */}
      {!loading && due.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-2xl uppercase mb-4 flex items-center gap-3">
            <Pictogram name="alarm" size={26} />
            {t('rf_due_now')} ({due.length})
          </h2>
          <div className="grid gap-3">
            {due.map((entry) => (
              <div
                key={entry.domain}
                className="bg-steel-light border border-amber/50 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm">{entry.domain}</p>
                  {entry.overdueDays >= 1 && (
                    <p className="font-mono text-[11px] text-hazard mt-0.5">
                      {t('rf_overdue_by')} {Math.floor(entry.overdueDays)} {t('rf_days')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startQuiz(entry.domain)}
                  className="bg-amber text-steel font-bold text-xs uppercase px-4 py-2.5 rounded shrink-0"
                >
                  {t('rf_start')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && worker && attemptedCount > 0 && due.length === 0 && (
        <div className="bg-safe/10 border border-safe/40 rounded-lg p-5 mb-10 flex items-center gap-4">
          <Pictogram name="correct" size={32} />
          <p className="text-sm">{t('rf_none_due')}</p>
        </div>
      )}

      {/* Retention table */}
      {!loading && attemptedCount > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-bold text-2xl uppercase mb-2">{t('db_by_domain')}</h2>
          <p className="text-xs text-concrete mb-4 leading-relaxed max-w-xl">{t('cert_decay_note')}</p>

          <div className="border border-steel-lighter rounded-lg divide-y divide-steel-lighter">
            {overview.map((row) => (
              <RetentionRow key={row.domain} row={row} t={t} onStart={() => startQuiz(row.domain)} />
            ))}
          </div>

          <p className="font-mono text-[10px] text-concrete mt-3">
            {t('rf_next_in')}: {INTERVALS_DAYS.join(' / ')} {t('rf_days')}
          </p>
        </section>
      )}

      {/* Reminders */}
      <section className="border-t border-steel-lighter pt-8">
        <h2 className="font-display font-bold text-xl uppercase mb-3">{t('rf_enable_reminders')}</h2>

        {notifyState === 'granted' && (
          <p className="font-mono text-xs text-safe flex items-center gap-2 mb-3">
            <Pictogram name="correct" size={18} />
            {t('rf_reminders_on')}
          </p>
        )}
        {notifyState === 'denied' && <p className="font-mono text-xs text-hazard mb-3">{t('rf_reminders_blocked')}</p>}
        {notifyState === 'unsupported' && (
          <p className="font-mono text-xs text-concrete mb-3">{t('rf_reminders_unsupported')}</p>
        )}
        {notifyState === 'default' && (
          <button
            type="button"
            onClick={enableReminders}
            className="border border-concrete rounded px-5 py-2.5 font-mono text-xs hover:border-amber hover:text-amber mb-3"
          >
            {t('rf_enable_reminders')}
          </button>
        )}

        <p className="text-[11px] text-concrete leading-relaxed max-w-xl">{t('rf_web_limit')}</p>
      </section>
    </div>
  )
}

/* ================================================================== */

function RetentionRow({ row, t, onStart }) {
  const effective = row.effectiveReadiness
  const decayed = row.attempted && effective < row.baseReadiness
  const color = effective >= 70 ? '#2E7D4F' : effective >= 45 ? '#FFB020' : '#D93025'

  return (
    <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm truncate">{row.domain}</p>
        <p className="font-mono text-[10px] text-concrete mt-1">
          {!row.attempted && t('rf_never_trained')}
          {row.attempted && row.due && <span className="text-hazard">{t('rf_due_now')}</span>}
          {row.attempted && !row.due && row.daysUntil !== null && (
            <span>
              {t('rf_next_in')} {Math.max(0, Math.ceil(row.daysUntil))} {t('rf_days')}
            </span>
          )}
          {row.hesitation && <span className="text-amber"> · {t('db_flagged_slow')}</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <span className="font-display font-bold text-2xl" style={{ color }}>
          {row.attempted ? `${effective}%` : '—'}
        </span>
        {decayed && (
          <p className="font-mono text-[10px] text-concrete">
            {t('db_decayed_from')} {row.baseReadiness}%
          </p>
        )}
      </div>

      {row.attempted && (
        <button
          type="button"
          onClick={onStart}
          className="font-mono text-[10px] uppercase tracking-widest border border-steel-lighter rounded px-3 py-2 text-concrete hover:border-amber hover:text-amber shrink-0"
        >
          {t('rf_start')}
        </button>
      )}
    </div>
  )
}
