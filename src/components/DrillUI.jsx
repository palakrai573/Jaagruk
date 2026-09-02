import { useEffect, useRef, useState } from 'react'
import Pictogram from '../lib/pictograms.jsx'
import { GRADE, gradeColor, formatLatency, DEFAULT_TARGET_MS } from '../lib/assessment.js'
import { toNumberOr } from '../lib/num.js'
import { COMMAND, createCommandListener, ASR_ERROR, speechRecognitionSupported } from '../lib/speech.js'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Shared primitives for every drill surface: the solo modules, the spaced
 * refresher, and the buddy drill. Keeping them here means a change to how a
 * choice is presented lands everywhere at once, which matters because these
 * buttons are the one thing a low-literacy worker has to be able to operate
 * under stress.
 */

/* ================================================================== */
/* ChoiceCard                                                          */
/* ================================================================== */

/**
 * A single answer button.
 *
 * The number badge is not decoration. It is the anchor that ties together the
 * three ways a worker can answer — tap it, say "one"/"two", or point at it with
 * gesture control. In pictogram mode the text is hidden and the badge plus the
 * spoken narration carry the whole interaction, so it has to be large and
 * unambiguous.
 *
 * `data-gesture-target` is what gesture.js hit-tests against.
 */
export function ChoiceCard({
  index,
  text,
  pictogram,
  onSelect,
  disabled = false,
  pictogramMode = false,
  highlighted = false,
  dwellProgress = 0,
}) {
  const number = index + 1

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      data-gesture-target={disabled ? undefined : `choice-${index}`}
      aria-label={pictogramMode ? `${number}. ${text}` : undefined}
      className={`relative w-full text-left rounded-lg border transition-colors overflow-hidden ${
        pictogramMode ? 'p-5' : 'p-4'
      } ${
        highlighted
          ? 'bg-steel-lighter border-amber'
          : 'bg-steel-light border-steel-lighter hover:bg-steel-lighter hover:border-amber'
      } ${disabled ? 'opacity-60 cursor-default' : ''}`}
    >
      {/* Dwell fill for gesture selection — grows left to right behind the content */}
      {dwellProgress > 0 && (
        <span
          className="absolute inset-y-0 left-0 bg-amber/25 pointer-events-none"
          style={{ width: `${Math.min(100, dwellProgress * 100)}%` }}
          aria-hidden="true"
        />
      )}

      <span className={`relative flex items-center ${pictogramMode ? 'gap-5' : 'gap-4'}`}>
        <span
          className={`shrink-0 rounded-full bg-amber text-steel font-display font-bold flex items-center justify-center ${
            pictogramMode ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-base'
          }`}
          aria-hidden="true"
        >
          {number}
        </span>

        {pictogram && <Pictogram name={pictogram} size={pictogramMode ? 64 : 34} label={pictogramMode ? undefined : ''} />}

        {/* In pictogram mode the text is still in the DOM for screen readers,
            just visually hidden — removing it would break assistive tech. */}
        <span className={pictogramMode ? 'sr-only' : 'flex-1 leading-relaxed'}>{text}</span>
      </span>
    </button>
  )
}

/* ================================================================== */
/* LatencyBar                                                          */
/* ================================================================== */

/**
 * Live countdown against the step's reaction-time baseline.
 *
 * Deliberately shows time *elapsed* rather than a hard deadline, and never locks
 * the worker out. The point is to create the mild pressure a real incident
 * creates, not to fail somebody whose glove slipped. Past the target the bar
 * stays full and turns amber, then red — visible feedback without a cliff.
 */
export function LatencyBar({ startedAt, targetMs, paused = false }) {
  const { t } = useLanguage()
  const [elapsed, setElapsed] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!startedAt || paused) return undefined

    const tick = () => {
      setElapsed(Date.now() - startedAt)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [startedAt, paused])

  const target = toNumberOr(targetMs, 0) > 0 ? toNumberOr(targetMs, 0) : DEFAULT_TARGET_MS
  const ratio = Math.min(1, elapsed / target)
  const over = elapsed > target
  const wayOver = elapsed > target * 2

  const color = wayOver ? '#D93025' : over ? '#FFB020' : '#2E7D4F'

  return (
    <div className="mb-4" aria-hidden="true">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-concrete">
          {over ? <span className="text-hazard">{t('as_decide_now')}</span> : t('as_time_pressure')}
        </span>
        {/* The elapsed number on its own means nothing without the target beside
            it. Showing both is what turns the bar into feedback. */}
        <span className="font-mono text-[11px] text-concrete">
          <span style={{ color }}>{formatLatency(elapsed)}</span>
          <span className="opacity-60"> / {formatLatency(target)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-steel-lighter rounded-full overflow-hidden">
        <div
          className="h-full latency-bar rounded-full"
          style={{ width: `${Math.max(2, ratio * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/* ================================================================== */
/* GradePill                                                           */
/* ================================================================== */

export function GradePill({ grade, latencyMs, targetMs }) {
  const { t } = useLanguage()

  const labelKey = {
    [GRADE.FAST]: 'as_grade_fast',
    [GRADE.NORMAL]: 'as_grade_normal',
    [GRADE.SLOW]: 'as_grade_slow',
    [GRADE.UNKNOWN]: 'as_grade_unknown',
  }[grade]

  const color = gradeColor(grade)

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span
        className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded"
        style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}66` }}
      >
        {t(labelKey)}
      </span>
      {latencyMs > 0 && (
        // "4.2s / 9s" is ambiguous on its own. The visible form stays compact;
        // the accessible name and the tooltip say which number is which.
        <span
          className="font-mono text-[10px] text-concrete"
          title={
            targetMs > 0
              ? `${t('as_your_time')} ${formatLatency(latencyMs)} · ${t('as_target_time')} ${formatLatency(targetMs)}`
              : `${t('as_your_time')} ${formatLatency(latencyMs)}`
          }
        >
          <span className="sr-only">{t('as_your_time')} </span>
          {formatLatency(latencyMs)}
          {targetMs > 0 && (
            <>
              <span aria-hidden="true"> / </span>
              <span className="sr-only">{t('as_target_time')} </span>
              {formatLatency(targetMs)}
            </>
          )}
        </span>
      )}
    </span>
  )
}

/* ================================================================== */
/* ReadinessRing                                                       */
/* ================================================================== */

/**
 * The composite readiness score. Shows the two inputs underneath, because
 * "82%" on its own tells a worker nothing about what to fix — knowing it was
 * full marks on accuracy but weak on speed points at a specific problem.
 */
export function ReadinessRing({ readiness = 0, accuracy = null, speed = null, size = 168, showBreakdown = true }) {
  const { t } = useLanguage()

  const clamped = Math.max(0, Math.min(100, Math.round(readiness)))
  const stroke = 12
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius
  const color = clamped >= 70 ? '#2E7D4F' : clamped >= 45 ? '#FFB020' : '#D93025'

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${t('as_readiness')} ${clamped}%`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#3A3F45" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-5xl" style={{ color }}>
            {clamped}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-concrete mt-0.5">
            {t('as_readiness')}
          </span>
        </div>
      </div>

      {showBreakdown && accuracy !== null && speed !== null && (
        <div className="flex gap-6 mt-4 font-mono text-[11px]">
          <span className="text-concrete">
            {t('as_accuracy')} <span className="text-chalk font-bold">{Math.round(accuracy)}%</span>
          </span>
          <span className="text-concrete">
            {t('as_speed')} <span className="text-chalk font-bold">{Math.round(speed)}%</span>
          </span>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* VoiceButton                                                         */
/* ================================================================== */

/**
 * Push-to-talk answer input.
 *
 * Restricted to the commands the current screen can actually act on, so "left"
 * cannot fire where there is no left option. Every recognition failure produces
 * a specific message rather than silence — a worker who speaks and gets no
 * reaction assumes the feature is broken and stops using it.
 */
export function VoiceButton({ choiceCount = 2, onCommand, disabled = false, className = '' }) {
  const { t, lang } = useLanguage()
  const listenerRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const supported = speechRecognitionSupported()

  const allowed = [COMMAND.ONE, COMMAND.TWO, COMMAND.REPEAT, COMMAND.HELP].slice(0, choiceCount === 1 ? 3 : 4)

  useEffect(() => {
    if (!supported) return undefined

    const listener = createCommandListener({
      lang,
      allowed,
      onCommand: (match) => {
        setError(null)
        onCommand?.(match.command)
      },
      onError: (code) => {
        // A deliberate stop is not worth reporting to the user.
        if (code === ASR_ERROR.ABORTED) return
        setError(code)
      },
      onStateChange: (state) => setListening(state === 'listening' || state === 'starting'),
    })

    listenerRef.current = listener
    return () => {
      listener.destroy()
      listenerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, choiceCount])

  if (!supported) return null

  const errorKey = error ? `as_${error}` : null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setError(null)
          if (listening) listenerRef.current?.stop()
          else listenerRef.current?.start()
        }}
        disabled={disabled}
        className={`w-full rounded-lg border py-3 px-4 font-mono text-sm flex items-center justify-center gap-3 transition-colors ${
          listening ? 'border-amber bg-amber/10 text-amber' : 'border-steel-lighter text-concrete hover:border-amber hover:text-amber'
        } disabled:opacity-50`}
      >
        <Pictogram name="listen" size={22} />
        {listening ? t('as_listening') : t('as_speak_answer')}
      </button>

      <p className="font-mono text-[10px] text-concrete text-center mt-2">{t('as_say_one_or_two')}</p>

      {errorKey && (
        <p className="font-mono text-[10px] text-hazard text-center mt-1.5" role="status">
          {t(errorKey)}
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* FeedbackPanel                                                       */
/* ================================================================== */

/**
 * Post-decision feedback.
 *
 * Shows the reaction-time grade alongside the safe/unsafe verdict, and calls out
 * correct-but-slow explicitly. That case is the whole reason the latency
 * measurement exists, so burying it would waste the signal.
 */
export function FeedbackPanel({ safe, feedback, grade, latencyMs, targetMs, aiCoaching, aiLoading, children }) {
  const { t } = useLanguage()
  const hesitated = safe && grade === GRADE.SLOW

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-5 border-l-4"
        style={{ borderColor: safe ? '#2E7D4F' : '#D93025', background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <span className="flex items-center gap-2">
            <Pictogram name={safe ? 'correct' : 'incorrect'} size={22} />
            <span
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: safe ? '#2E7D4F' : '#D93025' }}
            >
              {safe ? t('sc_safe') : t('sc_unsafe')}
            </span>
          </span>
          <GradePill grade={grade} latencyMs={latencyMs} targetMs={targetMs} />
        </div>

        <p className="text-sm leading-relaxed">{feedback}</p>

        {hesitated && (
          <div className="mt-4 pt-3 border-t border-steel-lighter flex items-start gap-3">
            <Pictogram name="slow" size={30} />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-amber mb-1">{t('as_hesitation_title')}</p>
              <p className="text-xs text-concrete leading-relaxed">{t('as_hesitation_body')}</p>
            </div>
          </div>
        )}

        {aiLoading && <p className="text-xs text-concrete mt-3 font-mono">{t('sc_trainer_thinking')}</p>}
        {aiCoaching && (
          <p className="text-xs text-amber mt-3 border-t border-steel-lighter pt-3 leading-relaxed">{aiCoaching}</p>
        )}
      </div>

      {children}
    </div>
  )
}
