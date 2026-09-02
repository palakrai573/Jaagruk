import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getScenario } from '../lib/scenarios.js'
import { translateScenario, SCENARIO_TRANSLATIONS } from '../lib/scenarioTranslations.js'
import { enrichScenario, newAttemptSeed } from '../lib/scenarioMeta.js'
import { askTrainer, getApiKey } from '../lib/api.js'
import { speak, stopSpeaking, COMMAND } from '../lib/speech.js'
import { addLogEntry } from '../lib/store.js'
import { scoreRun, saveAttempt, gradeLatency, TRAINING_MODE } from '../lib/assessment.js'
import { recordResult } from '../lib/spaced.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { getCurrentWorker, getActiveSiteId } from '../lib/identity.js'
import { getZone, filterAnchors, GENERIC_ZONE_ID } from '../lib/siteMap.js'
import { enqueue, SYNC_KIND } from '../lib/sync.js'
import { LS, lsGetBool, lsSetBool } from '../lib/local.js'
import SafetyScene3D from '../components/SafetyScene3D.jsx'
import ARDrill from '../components/ARDrill.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { ChoiceCard, LatencyBar, FeedbackPanel, ReadinessRing, VoiceButton } from '../components/DrillUI.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { langName, contentNotice, scenarioContentIsEnglish } from '../lib/i18n.js'

export default function Scenario() {
  const { id } = useParams()
  const { t, lang } = useLanguage()

  /* ---------------- attempt setup ---------------- */

  // One seed for the whole attempt. Regenerating it per render would reshuffle
  // the answer buttons under the worker's thumb mid-decision.
  const [attemptSeed] = useState(() => newAttemptSeed())

  /**
   * Built once per (module, language, attempt).
   *
   * The stable reference here is what fixes the speech bug in the previous
   * build: translateScenario returns a NEW object on every call for any
   * non-English language, so an effect keyed on the scenario re-ran on every
   * render and its cleanup cancelled the narration that had just started. Hindi
   * and Santali users effectively had feedback audio switched off.
   */
  const scenario = useMemo(() => {
    const base = getScenario(id)
    if (!base) return null
    return enrichScenario(translateScenario(base, lang), { seed: attemptSeed })
  }, [id, lang, attemptSeed])

  const [stepIndex, setStepIndex] = useState(0)
  const [decisions, setDecisions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [feedbackGrade, setFeedbackGrade] = useState(null)
  const [feedbackLatency, setFeedbackLatency] = useState(0)
  const [aiCoaching, setAiCoaching] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null)
  const [saveNote, setSaveNote] = useState(null)

  const [stepStartedAt, setStepStartedAt] = useState(() => Date.now())
  const [aimedThisStep, setAimedThisStep] = useState(false)

  /* ---------------- presentation modes ---------------- */

  const [pictogramMode, setPictogramMode] = useState(() => lsGetBool(LS.MODE_PICTOGRAM, false))
  const [voiceMode, setVoiceMode] = useState(() => lsGetBool(LS.MODE_VOICE, false))
  const [arMode, setArMode] = useState(() => lsGetBool(LS.MODE_AR, false))
  const [zone, setZone] = useState(null)

  const step = scenario?.steps?.[stepIndex] || null
  const totalSteps = scenario?.steps?.length || 0

  /* ---------------- AR zone ---------------- */

  useEffect(() => {
    if (!arMode || !scenario) return
    let cancelled = false
    ;(async () => {
      try {
        const active = await getZone(getActiveSiteId(), null)
        if (!cancelled) setZone(active)
      } catch {
        if (!cancelled) setZone(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [arMode, scenario])

  const arAnchors = useMemo(() => {
    if (!zone || !scenario) return []
    return filterAnchors(zone, scenario.arTargets)
  }, [zone, scenario])

  /* ---------------- narration ---------------- */

  const introSpokenRef = useRef(false)

  // Intro narration. Depends on the memoised scenario, so it fires once per
  // module rather than once per render.
  useEffect(() => {
    if (!scenario || introSpokenRef.current) return undefined
    introSpokenRef.current = true
    const token = speak(scenario.intro, lang)
    // Cancel by token: a later speak() supersedes this one, and this cleanup
    // will not cancel narration it did not start.
    return () => stopSpeaking(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  // Read each new prompt aloud. In pictogram mode this is the primary channel,
  // not an enhancement, so it always runs.
  useEffect(() => {
    if (!step || finished) return undefined
    setStepStartedAt(Date.now())
    setAimedThisStep(false)

    const spoken = pictogramMode
      ? `${step.prompt} ${step.choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}`
      : step.prompt

    const token = speak(spoken, lang, { interrupt: true })
    return () => stopSpeaking(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, pictogramMode, lang])

  // Stop any audio when leaving the page entirely.
  useEffect(() => () => stopSpeaking(), [])

  const repeatPrompt = useCallback(() => {
    if (!step) return
    const spoken = pictogramMode
      ? `${step.prompt} ${step.choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}`
      : step.prompt
    speak(spoken, lang)
  }, [step, pictogramMode, lang])

  /* ---------------- answering ---------------- */

  const choose = useCallback(
    async (choice) => {
      if (!step || feedback) return

      const latencyMs = Date.now() - stepStartedAt
      const grade = gradeLatency(latencyMs, step.targetMs)
      const safe = choice.points >= step.maxPoints

      setDecisions((prev) => [
        ...prev,
        {
          stepId: step.id,
          points: choice.points,
          maxPoints: step.maxPoints,
          latencyMs,
          targetMs: step.targetMs,
        },
      ])

      setFeedback(choice)
      setFeedbackGrade(grade)
      setFeedbackLatency(latencyMs)
      speak(choice.feedback, lang)

      if (getApiKey()) {
        setAiLoading(true)
        try {
          const context = `You are a firm but encouraging industrial safety trainer for mining and manufacturing workers in India. Keep responses to 2 short sentences, plain language, practical tone. Respond in ${langName(lang)}.`
          const timing = safe
            ? `They answered correctly in ${(latencyMs / 1000).toFixed(1)}s against a ${(step.targetMs / 1000).toFixed(0)}s target.`
            : 'They answered incorrectly.'
          const msg = `Scenario: ${scenario.title}. Situation: "${step.prompt}" Worker chose: "${choice.text}" (${safe ? 'a safe choice' : 'an unsafe choice'}). ${timing} Give one short additional coaching tip specific to this situation.`
          const aiText = await askTrainer(context, [{ role: 'user', content: msg }])
          setAiCoaching(aiText)
        } catch {
          // Coaching is a bonus layer. A failed call must not interrupt the drill.
          setAiCoaching('')
        } finally {
          setAiLoading(false)
        }
      }
    },
    [step, feedback, stepStartedAt, lang, scenario]
  )

  /* ---------------- finishing ---------------- */

  const finish = useCallback(
    async (allDecisions) => {
      const scored = scoreRun(allDecisions)
      setResult(scored)
      setFinished(true)

      const passed = scored.readiness >= PASS_THRESHOLD

      // Kept for continuity with any history a user already had on this device.
      // Note the clamp: the previous build wrote an unclamped percentage here
      // while displaying a clamped one, so a worker who answered everything
      // wrongly stored a negative score that then dragged down every average.
      addLogEntry({
        type: 'scenario',
        scenarioId: scenario.id,
        score: scored.accuracyPct,
        readiness: scored.readiness,
        hesitation: scored.hesitation,
      })

      try {
        const worker = await getCurrentWorker()
        const attempt = await saveAttempt({
          workerId: worker?.id || '',
          scenarioId: scenario.id,
          domain: scenario.domain,
          mode: arMode ? TRAINING_MODE.AR : TRAINING_MODE.SOLO,
          result: scored,
          meta: { lang, pictogramMode, zoneId: zone?.id || null },
        })

        if (!attempt.persisted) setSaveNote('temp')

        if (worker?.id) {
          await recordResult(worker.id, scenario.domain, { passed })
          await enqueue(SYNC_KIND.ATTEMPT, attempt.id, attempt)
        } else {
          setSaveNote('guest')
        }
      } catch {
        setSaveNote('temp')
      }
    },
    [scenario, arMode, lang, pictogramMode, zone]
  )

  const next = useCallback(() => {
    setFeedback(null)
    setFeedbackGrade(null)
    setFeedbackLatency(0)
    setAiCoaching('')

    if (stepIndex + 1 < totalSteps) {
      setStepIndex((i) => i + 1)
    } else {
      finish(decisions)
    }
  }, [stepIndex, totalSteps, decisions, finish])

  /* ---------------- voice ---------------- */

  const onVoiceCommand = useCallback(
    (command) => {
      if (command === COMMAND.REPEAT || command === COMMAND.HELP) {
        repeatPrompt()
        return
      }
      if (feedback) {
        if (command === COMMAND.ONE || command === COMMAND.TWO) next()
        return
      }
      const index = command === COMMAND.ONE ? 0 : command === COMMAND.TWO ? 1 : -1
      if (index >= 0 && step?.choices?.[index]) choose(step.choices[index])
    },
    [feedback, step, choose, next, repeatPrompt]
  )

  /* ---------------- not found ---------------- */

  if (!scenario) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center">
        <Pictogram name="warning" size={44} className="mx-auto mb-4" />
        <p className="text-concrete mb-4">Module not found.</p>
        <Link to="/train" className="text-amber underline">
          {t('sc_more')}
        </Link>
      </div>
    )
  }

  const contentUntranslated = scenarioContentIsEnglish(lang, scenario.id, SCENARIO_TRANSLATIONS)

  /* ---------------- results ---------------- */

  if (finished && result) {
    const passed = result.readiness >= PASS_THRESHOLD

    return (
      <div className="max-w-2xl mx-auto px-5 py-14 text-center">
        <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('sc_complete')}</p>
        <h1 className="font-display font-bold text-4xl uppercase mb-8">{scenario.title}</h1>

        <div className="flex justify-center mb-8">
          <ReadinessRing readiness={result.readiness} accuracy={result.accuracyPct} speed={result.speedPct} />
        </div>

        <div
          className="inline-flex items-center gap-3 rounded-lg px-5 py-3 mb-8"
          style={{
            background: passed ? 'rgba(46,125,79,0.12)' : 'rgba(217,48,37,0.12)',
            border: `1px solid ${passed ? '#2E7D4F' : '#D93025'}66`,
          }}
        >
          <Pictogram name={passed ? 'correct' : 'incorrect'} size={28} />
          <span className="font-mono text-sm" style={{ color: passed ? '#2E7D4F' : '#D93025' }}>
            {passed ? t('rf_passed') : t('rf_failed')}
          </span>
        </div>

        {result.hesitation && (
          <div className="bg-amber/10 border border-amber/40 rounded-lg p-5 mb-8 text-left flex items-start gap-4">
            <Pictogram name="slow" size={34} />
            <div>
              <p className="font-bold text-sm text-amber mb-1">{t('as_hesitation_title')}</p>
              <p className="text-xs text-concrete leading-relaxed">{t('as_hesitation_body')}</p>
            </div>
          </div>
        )}

        {/* Per-step timing, so the worker can see exactly where they slowed down */}
        <div className="text-left border border-steel-lighter rounded-lg divide-y divide-steel-lighter mb-8">
          {result.steps.map((s, i) => (
            <div key={s.stepId || i} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-3 min-w-0">
                <Pictogram name={s.correct ? 'correct' : 'incorrect'} size={22} />
                <span className="font-mono text-xs text-concrete">
                  {t('sc_decision')} {i + 1}
                </span>
              </span>
              <span
                className="font-mono text-[11px] shrink-0"
                style={{ color: s.grade === 'fast' ? '#2E7D4F' : s.grade === 'slow' ? '#D93025' : '#FFB020' }}
              >
                {s.latencyMs ? `${(s.latencyMs / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
          ))}
        </div>

        {saveNote === 'guest' && (
          <p className="font-mono text-[11px] text-concrete mb-6">
            {t('cert_sign_in_why')}{' '}
            <Link to="/start" className="text-amber underline">
              {t('ob_sign_in')}
            </Link>
          </p>
        )}
        {saveNote === 'temp' && (
          <p className="font-mono text-[11px] text-hazard mb-6">{t('db_storage_temp')}</p>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/train"
            className="border border-concrete rounded px-6 py-3 font-mono text-sm hover:border-amber hover:text-amber"
          >
            {t('sc_more')}
          </Link>
          <Link to="/dashboard" className="bg-amber text-steel font-display font-bold uppercase px-6 py-3 rounded">
            {t('sc_dashboard')}
          </Link>
        </div>
      </div>
    )
  }

  /* ---------------- drill ---------------- */

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">
        {scenario.sector} · {t('sc_decision')} {stepIndex + 1} {t('sc_of')} {totalSteps}
      </p>

      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <h1 className="font-display font-bold text-3xl uppercase flex items-center gap-3">
          <Pictogram name={scenario.pictogram} size={34} />
          {scenario.title}
        </h1>

        <button
          type="button"
          onClick={() => {
            const nextValue = !arMode
            setArMode(nextValue)
            lsSetBool(LS.MODE_AR, nextValue)
          }}
          className="font-mono text-[10px] uppercase tracking-widest border border-steel-lighter rounded px-3 py-2 text-concrete hover:border-amber hover:text-amber shrink-0"
        >
          {arMode ? t('ar_use_3d') : t('ar_use_ar')}
        </button>
      </div>

      {contentUntranslated && (
        <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-5 flex items-start gap-3">
          <Pictogram name="warning" size={24} />
          <p className="text-xs text-concrete leading-relaxed">{contentNotice(lang)}</p>
        </div>
      )}

      {/* Visual stage: real camera when AR is on, hand-built 3D scene otherwise */}
      {arMode ? (
        <ARDrill
          anchors={arAnchors}
          mode={step?.aim && !feedback ? 'aim' : 'view'}
          targetTypes={step?.aim?.types || scenario.arTargets}
          smoke={scenario.smoke}
          zoneName={zone?.name || ''}
          isGenericZone={!zone || zone.id === GENERIC_ZONE_ID}
          onAimComplete={() => setAimedThisStep(true)}
          onFallback={() => {
            setArMode(false)
            lsSetBool(LS.MODE_AR, false)
          }}
        >
          {step?.aim && !feedback && (
            <div className="absolute bottom-3 inset-x-3 pointer-events-none">
              <div className="bg-steel/85 rounded px-3 py-2 text-center">
                <p className="font-mono text-[11px] text-chalk">
                  {aimedThisStep ? t('site_marked') : t('ar_aim_prompt')}
                </p>
              </div>
            </div>
          )}
        </ARDrill>
      ) : (
        <SafetyScene3D scenarioId={scenario.id} />
      )}

      {stepIndex === 0 && !feedback && (
        <p className="text-concrete mb-8 leading-relaxed border-l-2 border-amber pl-4">{scenario.intro}</p>
      )}

      {/* Prompt */}
      <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          {pictogramMode && <Pictogram name={step.pictogram} size={56} />}
          <p className={`leading-relaxed ${pictogramMode ? 'text-base' : 'text-lg'}`}>{step.prompt}</p>
        </div>
        <button
          type="button"
          onClick={repeatPrompt}
          className="mt-4 font-mono text-[10px] uppercase tracking-widest text-concrete hover:text-amber flex items-center gap-2"
        >
          <Pictogram name="listen" size={18} />
          {t('as_listen_again')}
        </button>
      </div>

      {!feedback && <LatencyBar startedAt={stepStartedAt} targetMs={step.targetMs} />}

      {/* Choices */}
      {!feedback && (
        <>
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

          {voiceMode && (
            <VoiceButton choiceCount={step.choices.length} onCommand={onVoiceCommand} className="mt-4" />
          )}

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={() => {
                const nextValue = !pictogramMode
                setPictogramMode(nextValue)
                lsSetBool(LS.MODE_PICTOGRAM, nextValue)
              }}
              className="font-mono text-[10px] uppercase tracking-widest text-concrete hover:text-amber"
            >
              {t('st_pictogram_mode')}: {pictogramMode ? t('st_on') : t('st_off')}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextValue = !voiceMode
                setVoiceMode(nextValue)
                lsSetBool(LS.MODE_VOICE, nextValue)
              }}
              className="font-mono text-[10px] uppercase tracking-widest text-concrete hover:text-amber"
            >
              {t('st_voice_mode')}: {voiceMode ? t('st_on') : t('st_off')}
            </button>
          </div>
        </>
      )}

      {/* Feedback */}
      {feedback && (
        <FeedbackPanel
          safe={feedback.points >= step.maxPoints}
          feedback={feedback.feedback}
          grade={feedbackGrade}
          latencyMs={feedbackLatency}
          targetMs={step.targetMs}
          aiCoaching={aiCoaching}
          aiLoading={aiLoading}
        >
          <button
            onClick={next}
            data-gesture-target="continue"
            className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-3 rounded"
          >
            {stepIndex + 1 < totalSteps ? t('sc_continue') : t('sc_finish')}
          </button>
        </FeedbackPanel>
      )}
    </div>
  )
}
