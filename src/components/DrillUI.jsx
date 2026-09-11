import { useEffect, useMemo, useRef, useState } from 'react'
import Pictogram from '../lib/pictograms.jsx'
import {
  GRADE,
  gradeColor,
  gradeTextColor,
  gradeTint,
  formatLatency,
  DEFAULT_TARGET_MS,
} from '../lib/assessment.js'
import { toNumberOr } from '../lib/num.js'
import { COMMAND, createCommandListener, ASR_ERROR, speechRecognitionSupported } from '../lib/speech.js'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Shared primitives for every drill surface: the solo modules, the spaced
 * refresher, and the buddy drill.
 *
 * THESE ARE FIELD-TIER COMPONENTS, AND THE RULES ARE DIFFERENT HERE.
 *
 * A worker operating these is wearing gloves, in bad light, possibly underground,
 * with a six-second timer running. So:
 *
 *   - Minimum 56px targets, not the 44px web default. That default assumes a bare
 *     fingertip on a lit screen.
 *   - No decorative motion. The only things that animate are the ones carrying
 *     information: the latency bar, and the dwell fill that shows a gesture
 *     selection landing.
 *   - Nothing is ever disabled in a way that hides why.
 *   - Text alternatives on everything, because pictogram mode hides the labels.
 *
 * Restyled in Phase 3 without touching the timing path. Latency is captured in
 * Scenario.jsx from startedAt to the click; nothing here participates in that
 * measurement, which is why this file could be reworked and that one barely
 * touched.
 */

/* ================================================================== */
/* ChoiceCard                                                          */
/* ================================================================== */

/**
 * A single answer button. The most important control in the product.
 *
 * The number badge is not decoration. It is the anchor tying together the three
 * ways to answer — tap it, say "one"/"two", or point at it with gesture control.
 * In pictogram mode the text is visually hidden and the badge plus spoken
 * narration carry the entire interaction, so it has to be large and unambiguous.
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
      className={[
        // text-start, not text-left: mirrors for Urdu.
        'relative w-full text-start rounded-xl border-2 overflow-hidden',
        'transition-colors duration-fast',
        // Comfortably past the 56px token. This is the primary target under time
        // pressure and there is no reason to be economical with it.
        pictogramMode ? 'p-5 min-h-[96px]' : 'p-4 min-h-touch',
        highlighted
          ? 'bg-brand-subtle border-brand'
          : 'bg-surface-1 border-line hover:border-brand hover:bg-surface-2 active:bg-surface-3',
        disabled ? 'opacity-60 cursor-default' : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Dwell fill for gesture selection. start-0, not left-0, so it grows from
          the correct edge in RTL. This animates because it is information: it is
          the feedback that a hands-free selection is landing. */}
      {dwellProgress > 0 && (
        <span
          className="absolute inset-y-0 start-0 bg-brand/25 pointer-events-none"
          style={{ width: `${Math.min(100, dwellProgress * 100)}%` }}
          aria-hidden="true"
        />
      )}

      <span className={`relative flex items-center ${pictogramMode ? 'gap-5' : 'gap-4'}`}>
        <span
          className={`shrink-0 rounded-full bg-brand text-ink-onBrand font-display font-bold flex items-center justify-center tabular-nums ${
            pictogramMode ? 'w-14 h-14 text-2xl' : 'w-10 h-10 text-lg'
          }`}
          aria-hidden="true"
        >
          {number}
        </span>

        {pictogram && (
          <Pictogram name={pictogram} size={pictogramMode ? 64 : 34} label={pictogramMode ? undefined : ''} />
        )}

        {/* In pictogram mode the text stays in the DOM for screen readers, only
            visually hidden. Removing it would break assistive technology for the
            users this mode exists to serve. */}
        <span className={pictogramMode ? 'sr-only' : 'flex-1 leading-relaxed text-ink'}>{text}</span>
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
 * Shows time ELAPSED rather than a hard deadline, and never locks the worker out.
 * The point is to create the mild pressure a real incident creates, not to fail
 * somebody whose glove slipped. Past target the bar stays full and turns amber,
 * then red — feedback without a cliff.
 *
 * The 120ms LINEAR transition in `.latency-bar` is deliberate and must stay
 * linear: an easing curve on a countdown misrepresents how much time is left.
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

  // Fill uses the ISO hue; the numeral beside it uses the text variant, which is
  // the pair that survives both themes.
  const fill = wayOver ? 'rgb(var(--hazard))' : over ? 'rgb(var(--warning))' : 'rgb(var(--safe))'
  const textColor = wayOver ? 'rgb(var(--hazard-text))' : over ? 'rgb(var(--warning-text))' : 'rgb(var(--safe-text))'

  return (
    <div className="mb-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">
          {over ? <span className="text-hazard-text font-bold">{t('as_decide_now')}</span> : t('as_time_pressure')}
        </span>
        {/* The elapsed number means nothing without the target beside it. Showing
            both is what turns the bar into feedback rather than a stopwatch. */}
        <span className="font-mono text-xs text-ink-tertiary tabular-nums whitespace-nowrap">
          <span style={{ color: textColor }} className="font-bold">
            {formatLatency(elapsed)}
          </span>
          <span className="opacity-60"> / {formatLatency(target)}</span>
        </span>
      </div>
      <div className="h-2 bg-surface-inset rounded-full overflow-hidden">
        <div
          className="h-full latency-bar rounded-full"
          style={{ width: `${Math.max(2, ratio * 100)}%`, backgroundColor: fill }}
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

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span
        className="font-mono text-2xs uppercase tracking-widest px-2 py-0.5 rounded-full border"
        style={{
          backgroundColor: gradeTint(grade),
          color: gradeTextColor(grade),
          borderColor: gradeColor(grade),
        }}
      >
        {t(labelKey)}
      </span>

      {latencyMs > 0 && (
        // "4.2s / 9s" is ambiguous alone. The visible form stays compact; the
        // accessible name and the tooltip say which number is which.
        <span
          className="font-mono text-2xs text-ink-tertiary tabular-nums"
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
 * The composite readiness score, with its two inputs underneath — because "82%"
 * alone tells a worker nothing about what to fix, while "full marks on accuracy,
 * weak on speed" points at a specific problem.
 */
export function ReadinessRing({ readiness = 0, accuracy = null, speed = null, size = 168, showBreakdown = true }) {
  const { t } = useLanguage()

  const clamped = Math.max(0, Math.min(100, Math.round(readiness)))
  const stroke = 12
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius

  const arc = clamped >= 70 ? 'rgb(var(--safe))' : clamped >= 45 ? 'rgb(var(--warning))' : 'rgb(var(--hazard))'
  const label =
    clamped >= 70 ? 'rgb(var(--safe-text))' : clamped >= 45 ? 'rgb(var(--warning-text))' : 'rgb(var(--hazard-text))'

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${t('as_readiness')} ${clamped}%`}
      >
        {/* aria-hidden: the wrapper already carries role="img" and the readiness
            value as its accessible name. Without this a screen reader announces
            the image and then walks into two unlabelled circles. */}
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgb(var(--surface-inset))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-3xl tabular-nums leading-none" style={{ color: label }}>
            {clamped}
          </span>
          <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mt-1.5">
            {t('as_readiness')}
          </span>
        </div>
      </div>

      {showBreakdown && accuracy !== null && speed !== null && (
        <dl className="flex gap-6 mt-4 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <dt className="text-ink-tertiary">{t('as_accuracy')}</dt>
            <dd className="text-ink font-bold tabular-nums">{Math.round(accuracy)}%</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-ink-tertiary">{t('as_speed')}</dt>
            <dd className="text-ink font-bold tabular-nums">{Math.round(speed)}%</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

/* ================================================================== */
/* VoiceButton                                                         */
/* ================================================================== */

/**
 * Hands-free answer input. The worker speaks or taps, whichever they prefer.
 *
 * WHY THIS IS NO LONGER PUSH-TO-TALK
 *
 * It used to require a tap on the microphone before every single answer, which
 * removed most of the point. The reason voice exists here is that a worker on a mine
 * floor has dusty, wet or gloved hands and a respirator on — someone in that state
 * pressing a button to say "two" may as well have pressed "two". Now the microphone
 * stays live for the whole step and the choice buttons stay live alongside it, so
 * either input works at any moment and the worker never has to decide in advance
 * which one they are going to use.
 *
 * WHAT MAKES THIS SAFE TO LEAVE RUNNING
 *
 * The drill reads every option aloud, numbered. A live microphone hears that, so
 * without a guard the phone answers its own question. Two things prevent it: matches
 * are ignored while the app is speaking and for a short window afterwards, and the
 * caller supplies a `ready` gate which the drill ties to "the question has finished".
 * See createCommandListener.
 *
 * Restricted to the commands the current screen can act on, so "left" cannot fire
 * where there is no left option. A real failure still produces a specific message —
 * but silence no longer counts as one, because with the mic simply on, silence is the
 * normal state rather than a worker who pressed a button and said nothing.
 */
export function VoiceButton({
  choiceCount = 2,
  onCommand,
  /** False while the question is still being read out. Gates acceptance, not listening. */
  ready = true,
  disabled = false,
  className = '',
}) {
  const { t, lang } = useLanguage()
  const listenerRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  /*
   * Whether the worker wants the microphone at all. Starts on, because voice mode
   * being enabled IS the opt-in — but it is muteable, since a permanently live
   * microphone is a real cost in battery and in privacy and nobody should be stuck
   * with one they cannot switch off from the screen they are looking at.
   */
  const [muted, setMuted] = useState(false)
  const supported = speechRecognitionSupported()

  /*
   * Read through a ref so the listener, which outlives any single render, always sees
   * the current value. Passing `ready` in directly would freeze it at whatever it was
   * when the listener was built — which is always false, because the question starts
   * being read the moment the step appears.
   */
  const readyRef = useRef(ready)
  readyRef.current = ready && !disabled

  /*
   * Only the option numbers that actually exist on screen are live, so "three"
   * cannot fire on a two-option question and pick nothing.
   *
   * This replaces `[ONE, TWO, REPEAT, HELP].slice(0, choiceCount === 1 ? 3 : 4)`,
   * which was wrong in both directions: it still allowed TWO on a single-option
   * step, and it never allowed THREE on the 22 steps that have three options.
   */
  const allowed = useMemo(() => {
    const numbers = [COMMAND.ONE, COMMAND.TWO, COMMAND.THREE, COMMAND.FOUR]
    const n = Math.max(0, Math.min(numbers.length, toNumberOr(choiceCount, 0)))
    return [...numbers.slice(0, n), COMMAND.REPEAT, COMMAND.HELP]
  }, [choiceCount])

  useEffect(() => {
    if (!supported) return undefined

    const listener = createCommandListener({
      lang,
      allowed,
      handsFree: true,
      // Checked at the moment a phrase is recognised, not when the listener is built.
      shouldAccept: () => readyRef.current,
      onCommand: (match) => {
        setError(null)
        onCommand?.(match.command)
      },
      onError: (code) => {
        /*
         * Silence and unmatched audio are not reported in hands-free mode — the
         * listener already filters those, since with the mic simply on they describe a
         * worker reading the question rather than anything going wrong. What reaches
         * here is worth showing.
         */
        if (code === ASR_ERROR.ABORTED) return
        setError(code)
      },
      onStateChange: (state) =>
        // 'restarting' counts as listening: the loop is between utterances, which is
        // continuous from the worker's point of view and should not flicker the dot.
        setListening(state === 'listening' || state === 'starting' || state === 'restarting'),
    })

    listenerRef.current = listener
    // Starts itself. Not gated on a tap — that gate was the thing being removed.
    if (!muted) listener.start()

    return () => {
      listener.destroy()
      listenerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, choiceCount, muted])

  if (!supported) return null

  const errorKey = error ? `as_${error}` : null
  /*
   * A denied permission or a missing microphone is permanent for this page, so the
   * row must stop claiming to be starting up. The listener has already given up
   * retrying by this point; this is the visible half of that decision.
   */
  const dead = error === ASR_ERROR.PERMISSION_DENIED || error === ASR_ERROR.AUDIO
  const live = listening && !muted && !dead

  return (
    <div className={className}>
      {/*
        A status row, not a trigger. There is nothing to press to speak — the mute
        control is the only button, and it is deliberately the smaller half of the row
        so it is not mistaken for the way to answer.
      */}
      <div
        className={`w-full rounded-xl border-2 min-h-touch px-4 py-2 font-mono text-sm flex items-center gap-3
                    transition-colors duration-fast ${
                      live
                        ? 'border-brand bg-brand-subtle text-brand-text'
                        : 'border-line text-ink-secondary'
                    }`}
      >
        {/* Pulses only while the mic is actually open. That is state, not decoration —
            it is how a worker knows the phone is hearing them, which is the single
            thing voice input most needs to communicate, and doubly so now that
            nothing was pressed to begin with. */}
        {live && <span className="w-2 h-2 rounded-full bg-hazard live-dot shrink-0" aria-hidden="true" />}
        <Pictogram name="listen" size={22} />

        <span className="flex-1 text-start" role="status" aria-live="polite">
          {muted ? t('as_voice_muted') : live ? t('as_listening') : t('as_voice_starting')}
        </span>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setMuted((m) => !m)
          }}
          aria-pressed={muted}
          className="shrink-0 border border-line rounded px-3 py-2 min-h-[44px] font-mono text-2xs uppercase hover:border-brand hover:text-brand-text"
        >
          {t(muted ? 'as_voice_unmute' : 'as_voice_mute')}
        </button>
      </div>

      {/* Says both inputs are available, because the whole change here is that the
          worker no longer has to choose one in advance. */}
      <p className="font-mono text-2xs text-ink-tertiary text-center mt-2">
        {muted ? t('as_say_one_or_two') : t('as_speak_or_tap')}
      </p>

      {errorKey && (
        <p className="font-mono text-2xs text-hazard-text text-center mt-1.5" role="status">
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
 * correct-but-slow explicitly. That case is the entire reason the latency
 * measurement exists, so burying it would waste the signal.
 */
export function FeedbackPanel({ safe, feedback, grade, latencyMs, targetMs, aiCoaching, aiLoading, children }) {
  const { t } = useLanguage()
  const hesitated = safe && grade === GRADE.SLOW

  return (
    <div className="space-y-4">
      {/* border-s-4, not border-l-4: the accent rule mirrors for RTL. */}
      <div
        className={`rounded-xl p-5 border border-s-4 ${
          safe ? 'border-safe-border border-s-safe bg-safe-subtle' : 'border-hazard-border border-s-hazard bg-hazard-subtle'
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <span className="flex items-center gap-2">
            <Pictogram name={safe ? 'correct' : 'incorrect'} size={22} />
            <span
              className={`font-display font-bold text-sm uppercase tracking-widest ${
                safe ? 'text-safe-text' : 'text-hazard-text'
              }`}
            >
              {safe ? t('sc_safe') : t('sc_unsafe')}
            </span>
          </span>
          <GradePill grade={grade} latencyMs={latencyMs} targetMs={targetMs} />
        </div>

        <p className="text-sm leading-relaxed text-ink">{feedback}</p>

        {hesitated && (
          <div className="mt-4 pt-3.5 border-t border-warning-border/60 flex items-start gap-3">
            <Pictogram name="slow" size={30} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm uppercase tracking-wide text-warning-text mb-1">
                {t('as_hesitation_title')}
              </p>
              <p className="text-xs text-ink-secondary leading-relaxed">{t('as_hesitation_body')}</p>
            </div>
          </div>
        )}

        {aiLoading && (
          <p className="text-xs text-ink-tertiary mt-3 font-mono flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border-2 border-current border-e-transparent animate-spin"
              aria-hidden="true"
            />
            {t('sc_trainer_thinking')}
          </p>
        )}
        {aiCoaching && (
          <p className="text-xs text-brand-text mt-3 border-t border-line-subtle pt-3 leading-relaxed">
            {aiCoaching}
          </p>
        )}
      </div>

      {children}
    </div>
  )
}
