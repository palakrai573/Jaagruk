import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { createPeer, createLoopbackPeer, webrtcSupported, P2P_ROLE, P2P_STATE } from '../lib/p2p.js'
import { createBuddyDrill, BUDDY_PHASE, BUDDY_ROLE, CHECK_IN_ROUNDS } from '../lib/drills.js'
import QrScanner from '../components/QrScanner.jsx'
import { saveAttempt, TRAINING_MODE, formatLatency } from '../lib/assessment.js'
import { recordResult } from '../lib/spaced.js'
import { PASS_THRESHOLD } from '../lib/certificate.js'
import { getCurrentWorker } from '../lib/identity.js'
import { enqueue, SYNC_KIND } from '../lib/sync.js'
import { speak, stopSpeaking } from '../lib/speech.js'
import { CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import Pictogram from '../lib/pictograms.jsx'
import { ChoiceCard, LatencyBar, FeedbackPanel, ReadinessRing } from '../components/DrillUI.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import { LS, lsGetBool } from '../lib/local.js'

/**
 * The two-person buddy drill.
 *
 * Pairing works with no server and no internet: the host shows a QR code, the
 * buddy scans it, the buddy shows one back, the host scans that. Two scans and
 * they are on a direct WebRTC data channel over the local network or a hotspot.
 *
 * The drill itself scores coordination, not quiz knowledge — did you check on
 * each other at the expected intervals, how long did it take you to notice your
 * buddy go down, and did you resist going in after them unprotected. That last
 * one is the decision that turns one casualty into two, and it is the reason
 * simulating the buddy as an AI character teaches nothing useful.
 */

const STAGE = {
  CHOOSE: 'choose',
  HOST_SHOW: 'host_show',
  HOST_SCAN: 'host_scan',
  JOIN_SCAN: 'join_scan',
  JOIN_SHOW: 'join_show',
  DRILL: 'drill',
}

// The buddy drill exercises confined-space protocol, so its result is filed
// against that certification domain.
const BUDDY_DOMAIN = CERTIFICATION_DOMAINS[1]

export default function BuddyDrill() {
  const { t, lang } = useLanguage()
  const pictogramMode = lsGetBool(LS.MODE_PICTOGRAM, false)

  const peerRef = useRef(null)
  const drillRef = useRef(null)

  const [stage, setStage] = useState(STAGE.CHOOSE)
  const [myCode, setMyCode] = useState('')
  const [pasted, setPasted] = useState('')
  const [connState, setConnState] = useState(P2P_STATE.IDLE)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loopback, setLoopback] = useState(false)

  const [drill, setDrill] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [feedbackMeta, setFeedbackMeta] = useState(null)
  const [saved, setSaved] = useState(false)
  const [stepStartedAt, setStepStartedAt] = useState(0)

  /* ---------------- teardown ---------------- */

  useEffect(
    () => () => {
      drillRef.current?.destroy()
      peerRef.current?.close()
      stopSpeaking()
    },
    []
  )

  /* ---------------- drill wiring ---------------- */

  const attachDrill = useCallback(
    (peer, isHost) => {
      const engine = createBuddyDrill({
        peer,
        isHost,
        onUpdate: (state) => {
          setDrill(state)
          // A new decision resets the timer used for the pressure bar.
          if (state.currentStep) setStepStartedAt((prev) => (prev === 0 ? Date.now() : prev))
        },
        onFinish: async (finalResult) => {
          try {
            const worker = await getCurrentWorker()
            const attempt = await saveAttempt({
              workerId: worker?.id || '',
              scenarioId: 'buddy-confined-space',
              domain: BUDDY_DOMAIN,
              mode: TRAINING_MODE.BUDDY,
              result: finalResult,
              meta: {
                role: finalResult.role,
                completed: finalResult.completed,
                checkInsMade: finalResult.checkInsMade,
                noticeLatencyMs: finalResult.noticeLatencyMs,
                loopback,
              },
            })
            // An abandoned drill is recorded but must never advance the
            // refresher schedule as though it were a pass.
            if (worker?.id && finalResult.completed) {
              await recordResult(worker.id, BUDDY_DOMAIN, {
                passed: finalResult.readiness >= PASS_THRESHOLD,
              })
              await enqueue(SYNC_KIND.ATTEMPT, attempt.id, attempt)
            }
            setSaved(true)
          } catch {
            setSaved(false)
          }
        },
      })

      drillRef.current = engine
      engine.start()
    },
    [loopback]
  )

  const buildPeer = useCallback(
    (role) => {
      const peer = createPeer({
        role,
        onState: (state) => {
          setConnState(state)
          if (state === P2P_STATE.CONNECTED) setStage(STAGE.DRILL)
        },
        onMessage: (envelope) => drillRef.current?.onPeerMessage(envelope),
        onError: (code) => setError(code),
        onPeerLeft: () => drillRef.current?.peerLost(),
      })
      peerRef.current = peer
      return peer
    },
    []
  )

  /* ---------------- pairing ---------------- */

  const startHost = async () => {
    setError(null)
    if (!webrtcSupported()) {
      setError('bd_no_webrtc')
      return
    }
    const peer = buildPeer(P2P_ROLE.HOST)
    try {
      const offer = await peer.createOffer()
      setMyCode(offer)
      setStage(STAGE.HOST_SHOW)
    } catch {
      setError('bd_failed')
    }
  }

  const startJoin = () => {
    setError(null)
    if (!webrtcSupported()) {
      setError('bd_no_webrtc')
      return
    }
    buildPeer(P2P_ROLE.GUEST)
    setStage(STAGE.JOIN_SCAN)
  }

  const consumeOffer = async (text) => {
    setError(null)
    try {
      const answer = await peerRef.current.acceptOffer(text)
      setMyCode(answer)
      setPasted('')
      setStage(STAGE.JOIN_SHOW)
      attachDrill(peerRef.current, false)
    } catch {
      setError('bd_bad_code')
    }
  }

  const consumeAnswer = async (text) => {
    setError(null)
    try {
      await peerRef.current.acceptAnswer(text)
      setPasted('')
      attachDrill(peerRef.current, true)
    } catch {
      setError('bd_bad_code')
    }
  }

  const startLoopback = () => {
    setError(null)
    const peer = createLoopbackPeer({
      role: P2P_ROLE.HOST,
      onState: (state) => {
        setConnState(state)
        if (state === P2P_STATE.CONNECTED) setStage(STAGE.DRILL)
      },
      onMessage: (envelope) => drillRef.current?.onPeerMessage(envelope),
      onPeerLeft: () => drillRef.current?.peerLost(),
    })
    if (!peer) {
      setError('bd_no_webrtc')
      return
    }
    peerRef.current = peer
    setLoopback(true)
    // Whichever tab opens first drives the timeline.
    attachDrill(peer, true)
  }

  const reset = () => {
    drillRef.current?.destroy()
    peerRef.current?.close()
    drillRef.current = null
    peerRef.current = null
    setStage(STAGE.CHOOSE)
    setMyCode('')
    setPasted('')
    setDrill(null)
    setFeedback(null)
    setError(null)
    setConnState(P2P_STATE.IDLE)
    setSaved(false)
    setLoopback(false)
  }

  /* ---------------- drill actions ---------------- */

  const step = drill?.currentStep || null

  useEffect(() => {
    if (!step) return undefined
    setStepStartedAt(Date.now())
    setFeedback(null)
    const token = speak(t(step.promptKey), lang)
    return () => stopSpeaking(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, lang])

  const choose = (index) => {
    const outcome = drillRef.current?.choose(index)
    if (!outcome) return
    setFeedback(outcome.choice)
    setFeedbackMeta({ grade: outcome.grade, latencyMs: outcome.latencyMs, targetMs: step?.targetMs })
    speak(t(outcome.choice.feedbackKey), lang)
  }

  /* ---------------- render: pairing ---------------- */

  if (stage !== STAGE.DRILL) {
    return (
      <div className="max-w-md mx-auto px-5 py-10">
        <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('bd_eyebrow')}</p>
        <h1 className="font-display font-bold text-3xl uppercase mb-3">{t('bd_title')}</h1>
        <p className="text-concrete text-sm mb-8 leading-relaxed">{t('bd_desc')}</p>

        {error && (
          <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-6 flex items-start gap-3">
            <Pictogram name="warning" size={20} />
            <div>
              <p className="text-xs text-hazard">{t(error)}</p>
              {error === 'bd_failed' && <p className="text-[11px] text-concrete mt-1">{t('bd_failed_hint')}</p>}
            </div>
          </div>
        )}

        {stage === STAGE.CHOOSE && (
          <div className="grid gap-3">
            <RoleButton pictogram="alarm" label={t('bd_i_host')} hint={t('bd_host_step1')} onClick={startHost} />
            <RoleButton pictogram="buddy" label={t('bd_i_join')} hint={t('bd_join_step1')} onClick={startJoin} />

            <div className="border-t border-steel-lighter pt-5 mt-3">
              <button
                type="button"
                onClick={startLoopback}
                className="w-full border border-steel-lighter rounded-lg p-4 text-left hover:border-amber flex items-center gap-4"
              >
                <Pictogram name="report_it" size={32} />
                <span className="min-w-0">
                  <span className="block font-bold text-sm">{t('bd_same_device')}</span>
                  <span className="block text-[11px] text-concrete mt-1 leading-relaxed">
                    {t('bd_same_device_note')}
                  </span>
                </span>
              </button>
            </div>

            <p className="text-[11px] text-concrete mt-4 leading-relaxed text-center">{t('bd_failed_hint')}</p>
          </div>
        )}

        {(stage === STAGE.HOST_SHOW || stage === STAGE.JOIN_SHOW) && (
          <>
            <StepLabel
              index={stage === STAGE.HOST_SHOW ? 1 : 2}
              text={stage === STAGE.HOST_SHOW ? t('bd_host_step1') : t('bd_join_step2')}
            />

            <div className="bg-white rounded-lg p-4 flex justify-center mb-4">
              <QRCodeSVG value={myCode} size={232} level="L" />
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(myCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                } catch {
                  setCopied(false)
                }
              }}
              className="w-full border border-steel-lighter rounded px-4 py-2.5 font-mono text-xs text-concrete hover:border-amber hover:text-amber mb-6"
            >
              {copied ? t('bd_copied') : t('bd_copy_code')}
            </button>

            {stage === STAGE.HOST_SHOW && (
              <button
                type="button"
                onClick={() => setStage(STAGE.HOST_SCAN)}
                className="w-full bg-amber text-steel font-display font-bold uppercase py-3 rounded mb-4"
              >
                {t('bd_host_step2')}
              </button>
            )}

            {stage === STAGE.JOIN_SHOW && (
              <p className="font-mono text-xs text-concrete text-center mb-4" aria-live="polite">
                {/* ICE negotiation can take several seconds. Saying "waiting for
                    buddy" through it reads as nothing happening, so the handshake
                    gets its own state. */}
                {connState === P2P_STATE.CONNECTED
                  ? t('bd_connected')
                  : connState === P2P_STATE.CONNECTING || connState === P2P_STATE.CREATING_ANSWER
                    ? t('bd_connecting')
                    : t('bd_waiting_buddy')}
              </p>
            )}

            <button type="button" onClick={reset} className="w-full font-mono text-xs text-concrete underline">
              {t('cancel_label')}
            </button>
          </>
        )}

        {(stage === STAGE.HOST_SCAN || stage === STAGE.JOIN_SCAN) && (
          <>
            <StepLabel
              index={stage === STAGE.JOIN_SCAN ? 1 : 2}
              text={stage === STAGE.JOIN_SCAN ? t('bd_join_step1') : t('bd_host_step2')}
            />

            <QrScanner
              onResult={(value) => {
                if (stage === STAGE.JOIN_SCAN) consumeOffer(value)
                else consumeAnswer(value)
              }}
            />

            <div className="mt-5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-concrete block mb-2">
                {t('bd_paste_instead')}
              </label>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={t('bd_paste_placeholder')}
                rows={3}
                className="w-full bg-steel border border-steel-lighter rounded px-3 py-2 font-mono text-[11px] focus:border-amber outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (stage === STAGE.JOIN_SCAN) consumeOffer(pasted)
                  else consumeAnswer(pasted)
                }}
                disabled={pasted.trim().length < 20}
                className="w-full bg-amber text-steel font-bold text-xs uppercase py-3 rounded mt-3 disabled:opacity-40"
              >
                {t('bd_use_code')}
              </button>
            </div>

            <button type="button" onClick={reset} className="w-full font-mono text-xs text-concrete underline mt-5">
              {t('cancel_label')}
            </button>
          </>
        )}
      </div>
    )
  }

  /* ---------------- render: drill ---------------- */

  const phase = drill?.phase || BUDDY_PHASE.LOBBY
  const finished = phase === BUDDY_PHASE.DEBRIEF || phase === BUDDY_PHASE.ABORTED
  const result = drill?.result || null

  if (finished && result) {
    return (
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">
          {phase === BUDDY_PHASE.ABORTED ? t('bd_phase_aborted') : t('bd_phase_debrief')}
        </p>
        <h1 className="font-display font-bold text-2xl uppercase mb-8">{t('bd_your_score')}</h1>

        <div className="flex justify-center mb-8">
          <ReadinessRing
            readiness={result.readiness}
            accuracy={result.accuracyPct}
            speed={result.speedPct}
            size={150}
          />
        </div>

        <div className="border border-steel-lighter rounded-lg divide-y divide-steel-lighter text-left mb-6">
          <Row
            label={t('bd_you_are')}
            value={result.role === BUDDY_ROLE.CASUALTY ? t('bd_role_casualty') : t('bd_role_responder')}
          />
          <Row label={t('bd_checkins_label')} value={`${result.checkInsMade} /{CHECK_IN_ROUNDS}`} />
          {result.role === BUDDY_ROLE.RESPONDER && (
            <Row
              label={t('bd_notice_time')}
              value={result.noticeLatencyMs ? formatLatency(result.noticeLatencyMs) : '—'}
            />
          )}
        </div>

        {drill?.buddy?.result ? (
          <div className="bg-steel-light border border-steel-lighter rounded-lg p-4 mb-6 text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-concrete mb-2">{t('bd_buddy_score')}</p>
            <p className="font-display font-bold text-2xl text-amber">{drill.buddy.result.readiness}%</p>
          </div>
        ) : (
          <p className="font-mono text-[11px] text-concrete mb-6">{t('bd_waiting_score')}</p>
        )}

        {result.partial && (
          <div className="bg-amber/10 border border-amber/40 rounded p-4 mb-6 text-left flex items-start gap-3">
            <Pictogram name="warning" size={24} />
            <p className="text-xs text-concrete leading-relaxed">{t('bd_partial_note')}</p>
          </div>
        )}

        {saved && <p className="font-mono text-[11px] text-safe mb-6">{t('bd_saved')}</p>}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-amber text-steel font-display font-bold uppercase py-3 rounded"
          >
            {t('done_label')}
          </button>
          <Link to="/dashboard" className="font-mono text-xs text-concrete underline">
            {t('sc_dashboard')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      {/* Status strip */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase">{t(`bd_phase_${phase}`)}</p>
        <span className="flex items-center gap-3">
          {loopback && (
            <span className="font-mono text-[10px] uppercase text-amber border border-amber/50 rounded px-2 py-1">
              {t('bd_same_device')}
            </span>
          )}
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: drill?.connected ? '#2E7D4F' : '#D93025' }}
          >
            {drill?.connected ? t('bd_connected') : t('bd_disconnected')}
          </span>
        </span>
      </div>

      {/* Role */}
      {drill?.myRole && (
        <div className="bg-steel-light border border-steel-lighter rounded-lg p-4 mb-6 flex items-center gap-4">
          <Pictogram name={drill.myRole === BUDDY_ROLE.CASUALTY ? 'confined_space' : 'buddy'} size={38} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-concrete">{t('bd_you_are')}</p>
            <p className="font-bold">
              {drill.myRole === BUDDY_ROLE.CASUALTY ? t('bd_role_casualty') : t('bd_role_responder')}
            </p>
          </div>
        </div>
      )}

      {/* Buddy status */}
      <div className="flex items-center gap-3 mb-6">
        <Pictogram name={drill?.buddyDown ? 'warning' : drill?.buddyResponsive ? 'correct' : 'buddy'} size={26} />
        <span
          className="font-mono text-xs"
          style={{ color: drill?.buddyDown ? '#D93025' : drill?.buddyResponsive ? '#2E7D4F' : '#8B8F94' }}
        >
          {drill?.buddyDown ? t('bd_buddy_down') : drill?.buddyResponsive ? t('bd_buddy_responsive') : t('bd_buddy_quiet')}
        </span>
      </div>

      {/* Monitoring */}
      {phase === BUDDY_PHASE.MONITORING && (
        <div className="border border-steel-lighter rounded-lg p-6 mb-6">
          <p className="text-sm text-concrete mb-5 leading-relaxed">{t('bd_monitoring_note')}</p>

          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <span className="font-mono text-[11px] text-concrete">
              {t('bd_checkins_label')}: {drill?.checkIns?.made ?? 0} / {CHECK_IN_ROUNDS}
            </span>
            {(drill?.checkIns?.missed ?? 0) > 0 && (
              <span className="font-mono text-[11px] text-hazard">
                {t('bd_checkin_missed')}: {drill.checkIns.missed}
              </span>
            )}
          </div>

          {drill?.checkInPending ? (
            <>
              <p className="font-bold text-lg mb-4 flex items-center gap-3">
                <Pictogram name="alarm" size={30} />
                {t('bd_checkin_now')}
              </p>
              <button
                type="button"
                onClick={() => drillRef.current?.checkIn()}
                data-gesture-target="checkin"
                className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-4 rounded"
              >
                {t('bd_checkin_btn')}
              </button>
            </>
          ) : (
            <p className="font-mono text-xs text-safe flex items-center gap-2">
              <Pictogram name="correct" size={18} />
              {t('bd_checkin_done')}
            </p>
          )}
        </div>
      )}

      {/* Distress — responder must acknowledge, and this is what gets timed */}
      {phase === BUDDY_PHASE.DISTRESS && drill?.myRole === BUDDY_ROLE.RESPONDER && (
        <div className="border-2 border-hazard rounded-lg p-6 mb-6 text-center ar-pulse">
          <Pictogram name="warning" size={54} className="mx-auto mb-4" />
          <p className="font-display font-bold text-2xl uppercase text-hazard mb-5">{t('bd_buddy_down')}</p>
          <button
            type="button"
            onClick={() => drillRef.current?.acknowledgeDistress()}
            data-gesture-target="acknowledge"
            className="w-full bg-hazard text-white font-display font-bold text-lg uppercase py-4 rounded"
          >
            {t('bd_acknowledge')}
          </button>
        </div>
      )}

      {phase === BUDDY_PHASE.DISTRESS && drill?.myRole === BUDDY_ROLE.CASUALTY && !step && (
        <div className="border border-steel-lighter rounded-lg p-6 mb-6 text-center">
          <Pictogram name="gas" size={44} className="mx-auto mb-4" />
          <p className="text-sm text-concrete">{t('bd_phase_distress')}</p>
        </div>
      )}

      {/* Decision */}
      {step && (
        <>
          <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <Pictogram name={step.pictogram} size={pictogramMode ? 56 : 34} />
              <p className="leading-relaxed text-lg">{t(step.promptKey)}</p>
            </div>
          </div>

          {!feedback && <LatencyBar startedAt={stepStartedAt} targetMs={step.targetMs} />}

          {!feedback ? (
            <div className="grid gap-3">
              {step.choices.map((choice, i) => (
                <ChoiceCard
                  key={choice.key}
                  index={i}
                  text={t(choice.key)}
                  pictogram={choice.pictogram}
                  pictogramMode={pictogramMode}
                  onSelect={() => choose(i)}
                />
              ))}
            </div>
          ) : (
            <FeedbackPanel
              safe={!!feedback.correct}
              feedback={t(feedback.feedbackKey)}
              grade={feedbackMeta?.grade}
              latencyMs={feedbackMeta?.latencyMs}
              targetMs={feedbackMeta?.targetMs}
            >
              <p className="font-mono text-xs text-concrete text-center">{t('bd_waiting_buddy')}</p>
            </FeedbackPanel>
          )}
        </>
      )}

      {/* Waiting */}
      {!step && phase !== BUDDY_PHASE.MONITORING && phase !== BUDDY_PHASE.DISTRESS && (
        <p className="font-mono text-xs text-concrete text-center py-8">{t('bd_waiting_buddy')}</p>
      )}

      <button
        type="button"
        onClick={() => {
          drillRef.current?.abort('user')
        }}
        className="w-full font-mono text-xs text-concrete hover:text-hazard underline mt-8"
      >
        {t('bd_end_drill')}
      </button>
    </div>
  )
}

/* ================================================================== */
/* Local pieces                                                        */
/* ================================================================== */

function RoleButton({ pictogram, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-steel-lighter bg-steel-light p-5 flex items-center gap-4 hover:border-amber"
    >
      <Pictogram name={pictogram} size={42} />
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        <span className="block font-mono text-[11px] text-concrete mt-1">{hint}</span>
      </span>
    </button>
  )
}

function StepLabel({ index, text }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-8 h-8 rounded-full bg-amber text-steel font-display font-bold flex items-center justify-center shrink-0">
        {index}
      </span>
      <p className="font-bold text-sm">{text}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-concrete">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}


