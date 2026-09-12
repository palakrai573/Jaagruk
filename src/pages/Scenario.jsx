import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getScenario } from '../lib/scenarios.js'
import { translateScenario, SCENARIO_TRANSLATIONS } from '../lib/scenarioTranslations.js'
import { enrichScenario, newAttemptSeed } from '../lib/scenarioMeta.js'
import { askTrainer, getApiKey } from '../lib/api.js'
import { speak, stopSpeaking, COMMAND, shouldUseVoice } from '../lib/speech.js'
import { addLogEntry } from '../lib/store.js'
import { scoreRun, saveAttempt, gradeLatency, TRAINING_MODE } from '../lib/assessment.js'
import { recordResult } from '../lib/spaced.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { getCurrentWorker, getActiveSiteId } from '../lib/identity.js'
import { listZones, filterAnchors, GENERIC_ZONE_ID } from '../lib/siteMap.js'
import { shouldUseAr, arBlocker, AR_BLOCK_KEYS } from '../lib/arSupport.js'
import { enqueue, SYNC_KIND } from '../lib/sync.js'
import { LS, lsGetBool, lsGetBoolOrNull, lsSetBool } from '../lib/local.js'
import SafetyScene3D from '../components/SafetyScene3D.jsx'
import { actionForChoice } from '../lib/sceneAction.js'
import ARDrill from '../components/ARDrill.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { ChoiceCard, LatencyBar, FeedbackPanel, ReadinessRing, VoiceButton } from '../components/DrillUI.jsx'
import { Button, Card, Badge, EmptyState } from '../components/ui/index.js'
import { useLanguage } from '../context/LanguageContext.jsx'
import { langName, contentNotice, scenarioContentIsEnglish } from '../lib/i18n.js'

/*
 * Spoken option number to zero-based choice index.
 *
 * The numbering here has to match the numbering spokenPrompt() reads out, since
 * that narration is what tells the worker which number to say.
 */
const VOICE_OPTION_INDEX = {
  [COMMAND.ONE]: 0,
  [COMMAND.TWO]: 1,
  [COMMAND.THREE]: 2,
  [COMMAND.FOUR]: 3,
}

/**
 * What gets read aloud for a step: the situation, then every option, numbered.
 *
 * THE OPTIONS USED TO BE SPOKEN ONLY IN PICTOGRAM MODE. Outside it, the phone read
 * the situation and then went silent, so a worker who cannot read — or is wearing a
 * respirator and holding a torch, or is simply listening rather than staring at the
 * screen — was asked to choose between options they had never been told. Pictogram
 * mode is for workers who cannot read text at all; needing the choices read out is
 * not the same condition, and tying the two together meant most listeners got half
 * a question.
 *
 * The numbering matters as well as the words: it is what makes "one" and "two"
 * usable as spoken answers, so this is also the script for voice input.
 */
function spokenPrompt(step) {
  if (!step) return ''
  const choices = Array.isArray(step.choices) ? step.choices : []
  if (!choices.length) return step.prompt || ''
  return `${step.prompt}. ${choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}`
}

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

  /*
   * TWO timestamps, because a reader and a listener receive the question at
   * different moments and neither should be penalised for the other's channel.
   *
   *   stepShownAt    the step appeared and could be READ
   *   clockStartedAt narration of the prompt and every option FINISHED, so a
   *                  listener now knows the situation. Null until then.
   *
   * Latency measures from clockStartedAt when it exists, and from stepShownAt when
   * the worker answers before narration finished — which a literate worker legitimately
   * can. Measuring from clockStartedAt only would have handed anyone who read ahead a
   * latency of zero; measuring from stepShownAt only is the old bug, where every
   * worker was charged for the seconds the phone spent talking.
   */
  const [stepShownAt, setStepShownAt] = useState(() => Date.now())
  const [clockStartedAt, setClockStartedAt] = useState(null)
  const [aimedThisStep, setAimedThisStep] = useState(false)

  /* ---------------- presentation modes ---------------- */

  const [pictogramMode, setPictogramMode] = useState(() => lsGetBool(LS.MODE_PICTOGRAM, false))
  /*
   * Voice answering is ON by default where the browser can hear, for the same reason AR
   * is: it exists for workers who cannot reliably tap a small button with gloved or wet
   * hands, and those are precisely the workers least likely to go and find a settings
   * toggle. `lsGetBoolOrNull` keeps "never chose" distinct from "chose no", and
   * shouldUseVoice resolves the former against whether an engine exists at all.
   */
  const [voiceMode, setVoiceMode] = useState(() => shouldUseVoice(lsGetBoolOrNull(LS.MODE_VOICE)))
  /**
   * AR is ON by default on a device that can run it.
   *
   * This used to be `lsGetBool(LS.MODE_AR, false)`, which meant the camera view —
   * the headline of an AR submission — was off out of the box and mentioned
   * nowhere a first-time user would look. `lsGetBoolOrNull` distinguishes "never
   * chose" from "chose no", and `shouldUseAr` resolves the former against actual
   * device capability rather than a guess. An explicit false is still respected,
   * and a stored true never survives a hard block, so enabling AR on a phone and
   * then opening the same app on a laptop yields the 3D scene rather than an
   * error panel.
   */
  const [arMode, setArMode] = useState(() => shouldUseAr(lsGetBoolOrNull(LS.MODE_AR)))
  const [zone, setZone] = useState(null)
  const [zones, setZones] = useState([])

  // Why AR is unavailable, if it is. Held so the toggle can explain itself
  // instead of simply not working.
  const arBlock = useMemo(() => arBlocker(), [])

  const step = scenario?.steps?.[stepIndex] || null
  const totalSteps = scenario?.steps?.length || 0

  /* ---------------- AR zone ---------------- */

  /**
   * Resolve which zone's anchors this drill should project.
   *
   * THE BUG THIS REPLACES
   * The previous version called `getZone(getActiveSiteId(), null)`. `getZone`
   * opens with `if (!zoneId || zoneId === GENERIC_ZONE_ID) return genericZone()`,
   * so passing a hardcoded null short-circuited on the first line, every time.
   * The drill therefore ALWAYS showed the six hardcoded generic bearings and
   * always displayed the amber "this site has not been scanned" chip — even on a
   * fully scanned site. Site Setup was a feature that fed nothing, and the one
   * thing that makes this AR spatially real (markers over the actual exit in the
   * actual corridor) never ran.
   *
   * Now the real zones are listed and the first scanned one is preferred, with the
   * generic zone as the deliberate fallback rather than the only outcome. Same
   * precedence ReportHazard already used, so the two agree about which zone a
   * worker is standing in.
   */
  useEffect(() => {
    if (!arMode || !scenario) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await listZones(getActiveSiteId())
        if (cancelled) return
        setZones(list)
        // A zone with anchors beats an empty one; a real zone beats the generic.
        const scanned = list.filter((z) => z.id !== GENERIC_ZONE_ID)
        const withAnchors = scanned.find((z) => (z.anchors?.length || 0) > 0)
        setZone(withAnchors || scanned[0] || list[list.length - 1] || null)
      } catch {
        if (!cancelled) {
          setZones([])
          setZone(null)
        }
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
    setStepShownAt(Date.now())
    setClockStartedAt(null)
    setAimedThisStep(false)

    const spoken = spokenPrompt(step)

    /*
     * The clock starts when the reading finishes, not when the step appears.
     *
     * `speak` returns 0 when speech synthesis is unavailable — no voice installed,
     * an unsupported browser, a muted-by-policy WebView. In that case nothing will
     * ever call onEnd, so the clock has to start immediately or the worker would
     * face a timer that never runs and a bar that never moves.
     */
    const token = speak(spoken, lang, {
      interrupt: true,
      onEnd: () => setClockStartedAt(Date.now()),
    })
    if (!token) setClockStartedAt(Date.now())

    return () => stopSpeaking(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, lang])

  // Stop any audio when leaving the page entirely.
  useEffect(() => () => stopSpeaking(), [])

  const repeatPrompt = useCallback(() => {
    if (!step) return
    // Repeating does not restart the clock. A worker who asks to hear it again has
    // already had the situation described once; resetting the timer would make
    // "say that again" a way to buy unlimited thinking time.
    speak(spokenPrompt(step), lang)
  }, [step, lang])

  /* ---------------- answering ---------------- */

  const choose = useCallback(
    async (choice) => {
      if (!step || feedback) return

      // See the note on the two timestamps above: whichever moment the worker
      // actually received the question from.
      const latencyMs = Date.now() - (clockStartedAt || stepShownAt)
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
    [step, feedback, clockStartedAt, stepShownAt, lang, scenario]
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

  /* ---------------- scene reaction ---------------- */

  /*
   * What the 3D scene should play. Derived from the answer just given, so it is null
   * while the worker is still deciding and the scene sits at rest.
   *
   * Keyed off `feedback` — the chosen choice — which means it clears automatically
   * when `next()` clears the feedback, and the next step starts from a neutral
   * scene without any separate reset.
   */
  const sceneAction = useMemo(() => actionForChoice(feedback, step), [feedback, step])

  /* ---------------- voice ---------------- */

  const onVoiceCommand = useCallback(
    (command) => {
      if (command === COMMAND.REPEAT || command === COMMAND.HELP) {
        repeatPrompt()
        return
      }
      /*
       * Spoken option number to choice index, table-driven. The chain of ternaries
       * this replaces stopped at TWO, so "three" was silently ignored on the 22
       * steps that offer a third option — the worker said a valid answer and
       * nothing happened.
       */
      const index = VOICE_OPTION_INDEX[command]

      if (feedback) {
        // On the feedback screen any option number, or "next", means carry on.
        if (index !== undefined || command === COMMAND.NEXT) next()
        return
      }

      if (index !== undefined && step?.choices?.[index]) choose(step.choices[index])
    },
    [feedback, step, choose, next, repeatPrompt]
  )

  /* ---------------- not found ---------------- */

  if (!scenario) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        {/* Was a hardcoded English "Module not found." — the one string in this
            file that never went through t(), so a Santali user hit English here. */}
        <EmptyState
          icon={<Pictogram name="warning" size={44} />}
          title={t('not_found_label')}
          action={
            <Button to="/train" variant="secondary" size="md">
              {t('sc_more')}
            </Button>
          }
        />
      </div>
    )
  }

  const contentUntranslated = scenarioContentIsEnglish(lang, scenario.id, SCENARIO_TRANSLATIONS)

  /* ---------------- results ---------------- */

  if (finished && result) {
    const passed = result.readiness >= PASS_THRESHOLD

    return (
      <div className="max-w-2xl mx-auto px-5 py-12 md:py-14 text-center">
        <p className="font-mono text-2xs tracking-[0.22em] uppercase text-brand-text mb-3">{t('sc_complete')}</p>
        <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-balance mb-8">
          {scenario.title}
        </h1>

        <div className="flex justify-center mb-8">
          <ReadinessRing readiness={result.readiness} accuracy={result.accuracyPct} speed={result.speedPct} />
        </div>

        {/* Pass/fail verdict. Was two inline rgba() literals plus a hex with a
            concatenated alpha suffix; now tokens, so it follows the theme. */}
        <div
          className={`inline-flex items-center gap-3 rounded-xl px-5 py-3 mb-8 border ${
            passed ? 'bg-safe-subtle border-safe-border' : 'bg-hazard-subtle border-hazard-border'
          }`}
        >
          <Pictogram name={passed ? 'correct' : 'incorrect'} size={28} />
          <span
            className={`font-display font-bold text-sm uppercase tracking-widest ${
              passed ? 'text-safe-text' : 'text-hazard-text'
            }`}
          >
            {passed ? t('rf_passed') : t('rf_failed')}
          </span>
        </div>

        {result.hesitation && (
          <div className="bg-warning-subtle border border-warning-border rounded-xl p-5 mb-8 text-start flex items-start gap-4">
            <Pictogram name="slow" size={34} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm uppercase tracking-wide text-warning-text mb-1">
                {t('as_hesitation_title')}
              </p>
              <p className="text-xs text-ink-secondary leading-relaxed">{t('as_hesitation_body')}</p>
            </div>
          </div>
        )}

        {/* Per-step timing, so the worker can see exactly where they slowed down.
            Grade now drives a Badge rather than an inline hex, and the timing
            figure sits next to it — the number alone did not say whether it was
            good. */}
        <ol className="text-start border border-line-subtle rounded-xl divide-y divide-line-subtle mb-8 overflow-hidden">
          {result.steps.map((s, i) => (
            <li key={s.stepId || i} className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-1">
              <span className="flex items-center gap-3 min-w-0">
                <Pictogram name={s.correct ? 'correct' : 'incorrect'} size={22} className="shrink-0" />
                <span className="font-mono text-xs text-ink-secondary">
                  {t('sc_decision')} {i + 1}
                </span>
              </span>

              <span className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-ink tabular-nums">
                  {s.latencyMs ? `${(s.latencyMs / 1000).toFixed(1)}s` : '—'}
                </span>
                <Badge
                  tone={s.grade === 'fast' ? 'safe' : s.grade === 'slow' ? 'hazard' : 'warning'}
                  size="sm"
                >
                  {t(`as_grade_${s.grade}`)}
                </Badge>
              </span>
            </li>
          ))}
        </ol>

        {saveNote === 'guest' && (
          <p className="font-mono text-xs text-ink-tertiary mb-6 leading-relaxed">
            {t('cert_sign_in_why')}{' '}
            <Link to="/start" className="text-brand-text underline">
              {t('ob_sign_in')}
            </Link>
          </p>
        )}
        {saveNote === 'temp' && <p className="font-mono text-xs text-hazard-text mb-6">{t('db_storage_temp')}</p>}

        {/* Stacks on a phone. Two side-by-side buttons at 320px give two cramped
            targets instead of one comfortable one. */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button to="/train" variant="secondary" size="lg">
            {t('sc_more')}
          </Button>
          <Button to="/dashboard" size="lg">
            {t('sc_dashboard')}
          </Button>
        </div>
      </div>
    )
  }

  /* ---------------- drill ---------------- */

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 md:py-10">
      {/* Step progress. A worker mid-drill needs to know how much is left, and a
          bar communicates that faster than "2 of 3" alone. */}
      <div className="mb-4">
        <p className="font-mono text-2xs tracking-[0.22em] uppercase text-brand-text mb-2">
          {scenario.sector} · {t('sc_decision')} {stepIndex + 1} {t('sc_of')} {totalSteps}
        </p>
        <div
          className="h-1 bg-surface-inset rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          <div className="bar-fill bg-brand" style={{ '--fill': (stepIndex + 1) / totalSteps }} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 mb-5">
        <h1 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tight flex items-center gap-3 min-w-0">
          <Pictogram name={scenario.pictogram} size={34} className="shrink-0" />
          <span className="min-w-0">{scenario.title}</span>
        </h1>

        {/* The mode switch was a 10px tertiary-ink caption at the far right of the
            title row — indistinguishable from a label, on the one control that
            decides whether this is an AR product or a 3D one. It now reads as a
            control: brand-tinted when AR is live, with a pictogram, and it states
            the reason instead of silently doing nothing when the device cannot. */}
        {arBlock ? (
          <span
            className="font-mono text-2xs uppercase tracking-widest border border-line-subtle rounded-lg px-3 py-2
                       max-w-[10rem] text-center leading-snug text-ink-tertiary shrink-0"
            title={t(AR_BLOCK_KEYS[arBlock] || 'ar_camera_unknown')}
          >
            {t('ar_unavailable')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              const nextValue = !arMode
              setArMode(nextValue)
              // Only an explicit tap persists. See onFallback below.
              lsSetBool(LS.MODE_AR, nextValue)
            }}
            aria-pressed={arMode}
            className={`font-mono text-2xs uppercase tracking-widest rounded-lg border px-3 min-h-touch
                        inline-flex items-center gap-2 shrink-0 transition-colors duration-fast ${
                          arMode
                            ? 'border-brand bg-brand-subtle text-brand-text'
                            : 'border-line text-ink-secondary hover:border-brand hover:text-brand-text'
                        }`}
          >
            <Pictogram name={arMode ? 'exit_arrow' : 'warning'} size={16} />
            {arMode ? t('ar_use_3d') : t('ar_use_ar')}
          </button>
        )}
      </div>

      {/* Zone picker. Only worth showing when a supervisor has actually scanned
          something — with one zone there is nothing to choose, and the generic
          fallback is not a place a worker would recognise the name of. */}
      {arMode && zones.filter((z) => z.id !== GENERIC_ZONE_ID).length > 1 && (
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary shrink-0">
            {t('hz_zone_label')}
          </span>
          {zones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setZone(z)}
              aria-pressed={zone?.id === z.id}
              /* min-h-touch, not the 32px a chip would naturally be: this is a
                 field-tier screen and the worker picking a zone may be gloved. */
              className={`shrink-0 font-mono text-2xs uppercase tracking-widest rounded-full px-4 min-h-touch border
                          inline-flex items-center transition-colors duration-fast ${
                            zone?.id === z.id
                              ? 'border-brand bg-brand-subtle text-brand-text'
                              : 'border-line-subtle text-ink-tertiary hover:border-brand'
                          }`}
            >
              {z.id === GENERIC_ZONE_ID ? t('ar_generic_zone_short') : z.name}
            </button>
          ))}
        </div>
      )}

      {/* Untranslated drill CONTENT is a safety problem, not an inconvenience —
          a hazard instruction in a language the worker does not read. Hence
          hazard tokens rather than the softer warning used for menu coverage. */}
      {contentUntranslated && (
        <div className="bg-hazard-subtle border border-hazard-border rounded-xl p-3.5 mb-5 flex items-start gap-3">
          <Pictogram name="warning" size={24} className="shrink-0" />
          <p className="text-xs text-ink-secondary leading-relaxed">{contentNotice(lang)}</p>
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
          /* Session-only, deliberately NOT persisted.
             This fires when the worker taps "Use 3D view" on a camera or compass
             error panel. That is an escape from a broken frame, not a statement of
             preference — but the previous version wrote false to localStorage, so a
             single permission misfire or one accidental tap disabled AR on every
             future drill until the worker rediscovered a 10px toggle. The explicit
             switch above still persists; this does not. */
          onFallback={() => {
            setArMode(false)
          }}
        >
          {step?.aim && !feedback && (
            <div className="absolute bottom-3 inset-x-3 pointer-events-none">
              {/* Fixed dark plate regardless of theme: this sits over a live
                  camera feed, so it needs to stay legible against whatever the
                  worker happens to be pointing at. */}
              <div className="bg-black/75 backdrop-blur-sm rounded-lg px-3 py-2.5 text-center">
                <p className="font-mono text-xs text-white">
                  {aimedThisStep ? t('site_marked') : t('ar_aim_prompt')}
                </p>
              </div>
            </div>
          )}
        </ARDrill>
      ) : (
        <SafetyScene3D scenarioId={scenario.id} action={sceneAction} />
      )}

      {/* border-s / ps, not border-l / pl — the rule mirrors for Urdu. */}
      {stepIndex === 0 && !feedback && (
        <p className="text-ink-secondary mb-8 leading-relaxed border-s-2 border-brand ps-4 text-pretty">
          {scenario.intro}
        </p>
      )}

      {/* The prompt. Deliberately the largest text on the screen: it is the thing
          being read under time pressure. */}
      <div className="bg-surface-1 border border-line-subtle rounded-xl p-5 md:p-6 mb-6">
        <div className="flex items-start gap-4">
          {pictogramMode && <Pictogram name={step.pictogram} size={56} className="shrink-0" />}
          <p className={`leading-relaxed text-ink ${pictogramMode ? 'text-base' : 'text-lg'}`}>{step.prompt}</p>
        </div>

        {/* 44px target: a worker who cannot read relies on this, so it cannot be
            a text link sized for a mouse. */}
        <button
          type="button"
          onClick={repeatPrompt}
          className="mt-4 font-mono text-2xs uppercase tracking-widest text-ink-tertiary hover:text-brand-text
                     transition-colors duration-fast flex items-center gap-2 min-h-[44px] -mb-1"
        >
          <Pictogram name="listen" size={18} />
          {t('as_listen_again')}
        </button>
      </div>

      {/* startedAt is null until narration ends, and LatencyBar already renders a
          still, zeroed bar in that case — so the worker sees the timer waiting for
          the question to finish rather than already running against them. */}
      {!feedback && <LatencyBar startedAt={clockStartedAt} targetMs={step.targetMs} />}

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
            /*
             * `ready` is the same signal the reaction clock starts on: narration of the
             * prompt and every option has finished. Reusing it is deliberate — it means
             * voice input becomes live at exactly the moment the worker has been told
             * what the options are, and never while the phone is still saying "one,
             * two, three" into its own microphone.
             */
            <VoiceButton
              choiceCount={step.choices.length}
              onCommand={onVoiceCommand}
              ready={clockStartedAt !== null}
              className="mt-4"
            />
          )}

          {/* Accessibility toggles, reachable mid-drill on purpose: a worker who
              finds they cannot read the text should not have to abandon the drill
              and go to Settings. aria-pressed so the state is announced rather
              than only rendered as a word. */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-5 border-t border-line-subtle">
            <ModeToggle
              on={pictogramMode}
              label={t('st_pictogram_mode')}
              onLabel={t('st_on')}
              offLabel={t('st_off')}
              onClick={() => {
                const nextValue = !pictogramMode
                setPictogramMode(nextValue)
                lsSetBool(LS.MODE_PICTOGRAM, nextValue)
              }}
            />
            <ModeToggle
              on={voiceMode}
              label={t('st_voice_mode')}
              onLabel={t('st_on')}
              offLabel={t('st_off')}
              onClick={() => {
                const nextValue = !voiceMode
                setVoiceMode(nextValue)
                lsSetBool(LS.MODE_VOICE, nextValue)
              }}
            />
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
          {/* Field size: 56px. data-gesture-target is preserved so this stays
              operable hands-free — it is the one control a gloved worker has to
              hit between every decision. */}
          <Button onClick={next} data-gesture-target="continue" size="field">
            {stepIndex + 1 < totalSteps ? t('sc_continue') : t('sc_finish')}
          </Button>
        </FeedbackPanel>
      )}
    </div>
  )
}

/* ================================================================== */

/**
 * An in-drill accessibility toggle.
 *
 * 44px and bordered rather than a bare text link, because these are pressed with
 * gloves on, and because the previous version gave no visual indication of which
 * state was active beyond the word beside it.
 */
function ModeToggle({ on, label, onLabel, offLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`font-mono text-2xs uppercase tracking-widest rounded-lg border px-3 min-h-[44px]
                  flex items-center gap-2 transition-colors duration-fast ${
                    on
                      ? 'border-brand bg-brand-subtle text-brand-text'
                      : 'border-line-subtle text-ink-tertiary hover:border-brand hover:text-brand-text'
                  }`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-brand' : 'bg-ink-disabled'}`}
      />
      {label}: {on ? onLabel : offLabel}
    </button>
  )
}
