// Buddy-system drill: a two-person confined-space exercise scored on
// coordination rather than on individual quiz knowledge.
//
// WHY IT IS BUILT THIS WAY. The buddy system exists because a worker overcome by
// gas cannot save themselves — someone outside has to notice and act. Simulating
// the buddy as an AI character trains none of that: there is no noticing, no
// interval discipline, and no cost to being slow. So this drill requires two real
// phones and scores the things that actually kill people underground:
//
//   1. Did you check on each other at the expected intervals, or drift apart?
//   2. When your buddy went down, how long did it take you to react?
//   3. Did you resist the instinct to rush in unprotected — the single most
//      common way a confined-space incident turns from one casualty into two?
//
// The host phone drives the timeline so both devices agree on when things
// happened, and so the casualty role is assigned once rather than rolled
// independently on each phone.

import { GRADE, gradeLatency, scoreRun, TRAINING_MODE } from './assessment.js'

export const BUDDY_PHASE = {
  LOBBY: 'lobby',
  BRIEFING: 'briefing',
  ENTRY: 'entry',
  MONITORING: 'monitoring',
  DISTRESS: 'distress',
  RESPONSE: 'response',
  DEBRIEF: 'debrief',
  ABORTED: 'aborted',
}

export const BUDDY_ROLE = { CASUALTY: 'casualty', RESPONDER: 'responder' }

export const MSG = {
  HELLO: 'hello',
  PHASE: 'phase',
  ACT: 'act',
  CHECKIN: 'checkin',
  CHECKIN_REQUEST: 'checkin_request',
  RESULT: 'result',
  ABORT: 'abort',
}

/* ================================================================== */
/* Drill definition                                                    */
/* ================================================================== */

export const CHECK_IN_ROUNDS = 3
export const CHECK_IN_INTERVAL_MS = 11000
export const CHECK_IN_WINDOW_MS = 6000
export const DISTRESS_NOTICE_TIMEOUT_MS = 45000

/**
 * Decisions, keyed by phase and by which role sees them.
 *
 * `targetMs` values are the calibrated baselines the latency grader uses. They
 * are tighter here than in the solo modules on purpose: this is an emergency
 * with a person on the floor, and deliberation time is the thing being tested.
 */
export const BUDDY_SCRIPT = {
  [BUDDY_PHASE.BRIEFING]: {
    both: {
      id: 'bd_ppe',
      pictogram: 'gas_mask',
      promptKey: 'buddy_step_ppe',
      targetMs: 9000,
      choices: [
        { key: 'buddy_ppe_dust', points: -25, correct: false, pictogram: 'dust_mask', feedbackKey: 'buddy_fb_ppe_wrong' },
        { key: 'buddy_ppe_scba', points: 25, correct: true, pictogram: 'gas_mask', feedbackKey: 'buddy_fb_ppe_right' },
      ],
    },
  },

  [BUDDY_PHASE.ENTRY]: {
    both: {
      id: 'bd_entry',
      pictogram: 'confined_space',
      promptKey: 'buddy_step_entry',
      targetMs: 8000,
      choices: [
        { key: 'buddy_entry_alone', points: -30, correct: false, pictogram: 'no_lone_entry', feedbackKey: 'buddy_fb_entry_wrong' },
        { key: 'buddy_entry_attendant', points: 30, correct: true, pictogram: 'buddy', feedbackKey: 'buddy_fb_entry_right' },
      ],
    },
  },

  [BUDDY_PHASE.RESPONSE]: {
    // The worker going down still has a few seconds of agency. What they do with
    // them decides whether their buddy even knows.
    [BUDDY_ROLE.CASUALTY]: {
      id: 'bd_casualty',
      pictogram: 'gas',
      promptKey: 'buddy_step_casualty',
      targetMs: 6000,
      choices: [
        { key: 'buddy_cas_continue', points: -30, correct: false, pictogram: 'incorrect', feedbackKey: 'buddy_fb_cas_wrong' },
        { key: 'buddy_cas_signal', points: 30, correct: true, pictogram: 'alarm', feedbackKey: 'buddy_fb_cas_right' },
      ],
    },
    // The responder faces the decision that turns one casualty into two.
    [BUDDY_ROLE.RESPONDER]: [
      {
        id: 'bd_resp_1',
        pictogram: 'buddy',
        promptKey: 'buddy_step_resp1',
        targetMs: 6000,
        choices: [
          { key: 'buddy_resp_rush', points: -30, correct: false, pictogram: 'do_not_enter', feedbackKey: 'buddy_fb_resp1_wrong' },
          { key: 'buddy_resp_alarm', points: 30, correct: true, pictogram: 'alarm', feedbackKey: 'buddy_fb_resp1_right' },
        ],
      },
      {
        id: 'bd_resp_2',
        pictogram: 'gas_mask',
        promptKey: 'buddy_step_resp2',
        targetMs: 8000,
        choices: [
          { key: 'buddy_resp_dustmask', points: -25, correct: false, pictogram: 'dust_mask', feedbackKey: 'buddy_fb_resp2_wrong' },
          { key: 'buddy_resp_wait', points: 25, correct: true, pictogram: 'first_aid', feedbackKey: 'buddy_fb_resp2_right' },
        ],
      },
    ],
  },
}

/** Every decision this role will face, in order. Used for progress display. */
export function stepsForRole(role) {
  const steps = [BUDDY_SCRIPT[BUDDY_PHASE.BRIEFING].both, BUDDY_SCRIPT[BUDDY_PHASE.ENTRY].both]
  const response = BUDDY_SCRIPT[BUDDY_PHASE.RESPONSE][role]
  if (Array.isArray(response)) steps.push(...response)
  else if (response) steps.push(response)
  return steps
}

/* ================================================================== */
/* Coordination scoring                                                */
/* ================================================================== */

/** Points available for interval discipline, separate from the decisions. */
export const CHECK_IN_POINTS = 10

/**
 * Turn a completed drill into the same shape as any other attempt, so buddy
 * results feed the ledger, the dashboard and certification through exactly one
 * scoring path.
 *
 * Coordination is folded in as extra pseudo-steps: each missed check-in is a
 * lost opportunity, and the notice latency is graded like any other decision.
 */
export function scoreBuddyDrill({ decisions, checkIns, noticeLatencyMs, role, completed }) {
  const steps = [...(decisions || [])]

  // Check-in discipline: one scored item per required round.
  const rounds = CHECK_IN_ROUNDS
  const made = Math.min(rounds, Math.max(0, checkIns?.made ?? 0))
  for (let i = 0; i < rounds; i += 1) {
    const onTime = i < made
    steps.push({
      stepId: `bd_checkin_${i + 1}`,
      points: onTime ? CHECK_IN_POINTS : -CHECK_IN_POINTS,
      maxPoints: CHECK_IN_POINTS,
      latencyMs: onTime ? checkIns?.latencies?.[i] ?? null : null,
      targetMs: CHECK_IN_WINDOW_MS / 2,
    })
  }

  // Noticing the collapse is only the responder's task to be scored on.
  if (role === BUDDY_ROLE.RESPONDER) {
    const noticed = Number.isFinite(noticeLatencyMs) && noticeLatencyMs > 0
    steps.push({
      stepId: 'bd_notice',
      points: noticed ? 20 : -20,
      maxPoints: 20,
      latencyMs: noticed ? noticeLatencyMs : null,
      targetMs: 8000,
    })
  }

  const result = scoreRun(steps)

  return {
    ...result,
    mode: TRAINING_MODE.BUDDY,
    role,
    completed: !!completed,
    checkInsMade: made,
    checkInsRequired: rounds,
    noticeLatencyMs: Number.isFinite(noticeLatencyMs) ? noticeLatencyMs : null,
    noticeGrade: Number.isFinite(noticeLatencyMs) ? gradeLatency(noticeLatencyMs, 8000) : GRADE.UNKNOWN,
    // A drill abandoned partway is reported, never silently scored as a pass.
    partial: !completed,
  }
}

/* ================================================================== */
/* Engine                                                              */
/* ================================================================== */

/**
 * Run one side of the drill.
 *
 * The host owns the timeline: it assigns roles, emits check-in requests, and
 * triggers the collapse. Both sides record their own decisions locally and
 * mirror them to the peer, so each phone can render an accurate view of the pair
 * even if the final result message is lost.
 *
 * @param peer     a peer from p2p.js (real or loopback)
 * @param isHost   whether this device drives the timeline
 * @param onUpdate (state) => void
 */
export function createBuddyDrill({ peer, isHost, onUpdate, onFinish } = {}) {
  let phase = BUDDY_PHASE.LOBBY
  let myRole = null
  let destroyed = false

  const timers = new Set()
  const decisions = []
  const checkIns = { made: 0, latencies: [], missed: 0 }

  let currentStep = null
  let stepShownAt = 0
  let stepIndex = 0

  let checkInRound = 0
  let checkInRequestedAt = 0
  let checkInSatisfied = true

  let distressAt = 0
  let noticeLatencyMs = null
  let buddyDown = false
  let buddyAcknowledged = false

  // Mirrored view of the other phone, for the "is my buddy okay" indicator.
  const buddy = { ready: false, decisions: 0, checkIns: 0, lastSeenAt: 0, down: false }

  let finalResult = null

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (!destroyed) fn()
    }, ms)
    timers.add(id)
    return id
  }

  const clearTimers = () => {
    timers.forEach((id) => clearTimeout(id))
    timers.clear()
  }

  const state = () => ({
    phase,
    myRole,
    buddyRole: myRole === BUDDY_ROLE.CASUALTY ? BUDDY_ROLE.RESPONDER : BUDDY_ROLE.CASUALTY,
    currentStep,
    stepIndex,
    totalSteps: myRole ? stepsForRole(myRole).length : 0,
    checkIns: { ...checkIns },
    checkInPending: !checkInSatisfied,
    checkInRound,
    checkInDeadline: checkInSatisfied ? 0 : checkInRequestedAt + CHECK_IN_WINDOW_MS,
    buddy: { ...buddy },
    // Whether the buddy has ever answered a check-in — drives the "buddy is
    // responsive" indicator, which is the thing that goes quiet when they go down.
    buddyResponsive: buddyAcknowledged,
    buddyDown,
    noticeLatencyMs,
    distressAt,
    result: finalResult,
    isHost: !!isHost,
    connected: !!peer?.connected,
  })

  const emit = () => {
    if (!destroyed) onUpdate?.(state())
  }

  const send = (kind, payload) => {
    try {
      peer?.send(kind, payload)
    } catch {
      // A dropped frame is handled by the peer's own disconnect detection.
    }
  }

  /* ---------------- phase transitions (host) ---------------- */

  /**
   * Move this device into a phase.
   *
   * `broadcast` matters: up to the collapse, both phones are in lockstep and the
   * host announces every transition. After the collapse the two roles diverge on
   * purpose — the casualty is done in one decision while the responder still has
   * two — so each side finishes on its own clock. Broadcasting a terminal phase
   * would yank the responder out of a drill they are still running.
   */
  const setPhase = (next, payload = {}, { broadcast = true } = {}) => {
    phase = next
    if (isHost && broadcast) send(MSG.PHASE, { phase: next, ...payload })
    onEnterPhase(next, payload)
  }

  /** Terminal transition — always local to this device. */
  const finishLocally = (payload = {}) => setPhase(BUDDY_PHASE.DEBRIEF, payload, { broadcast: false })

  const presentStep = (step) => {
    currentStep = step
    stepShownAt = Date.now()
    emit()
  }

  const onEnterPhase = (next, payload) => {
    switch (next) {
      case BUDDY_PHASE.BRIEFING:
        if (payload.role) myRole = payload.role
        stepIndex = 0
        presentStep(BUDDY_SCRIPT[BUDDY_PHASE.BRIEFING].both)
        break

      case BUDDY_PHASE.ENTRY:
        stepIndex = 1
        presentStep(BUDDY_SCRIPT[BUDDY_PHASE.ENTRY].both)
        break

      case BUDDY_PHASE.MONITORING:
        currentStep = null
        checkInRound = 0
        checkInSatisfied = true
        emit()
        if (isHost) later(runCheckInRound, CHECK_IN_INTERVAL_MS)
        break

      case BUDDY_PHASE.DISTRESS:
        currentStep = null
        distressAt = payload.at || Date.now()
        if (myRole === BUDDY_ROLE.RESPONDER) {
          buddyDown = true
          buddy.down = true
        }
        emit()
        // The casualty's own decision opens immediately; the responder's opens
        // when they acknowledge seeing it, which is what we time.
        if (myRole === BUDDY_ROLE.CASUALTY) {
          stepIndex = 2
          presentStep(BUDDY_SCRIPT[BUDDY_PHASE.RESPONSE][BUDDY_ROLE.CASUALTY])
        }
        // If the responder never notices, the drill still has to end.
        if (isHost) later(forceDebriefIfStalled, DISTRESS_NOTICE_TIMEOUT_MS)
        break

      case BUDDY_PHASE.RESPONSE:
        emit()
        break

      case BUDDY_PHASE.DEBRIEF: {
        currentStep = null
        clearTimers()
        finalResult = scoreBuddyDrill({
          decisions,
          checkIns,
          noticeLatencyMs,
          role: myRole,
          completed: !payload.aborted,
        })
        // Push our score across so the other phone can show both sides. This is
        // a drill about a pair, so the debrief should be about the pair.
        send(MSG.RESULT, {
          role: myRole,
          readiness: finalResult.readiness,
          accuracyPct: finalResult.accuracyPct,
          speedPct: finalResult.speedPct,
          checkInsMade: finalResult.checkInsMade,
          noticeLatencyMs: finalResult.noticeLatencyMs,
          completed: finalResult.completed,
        })
        emit()
        onFinish?.(finalResult)
        break
      }

      case BUDDY_PHASE.ABORTED:
        currentStep = null
        clearTimers()
        finalResult = scoreBuddyDrill({
          decisions,
          checkIns,
          noticeLatencyMs,
          role: myRole,
          completed: false,
        })
        emit()
        onFinish?.(finalResult)
        break

      default:
        emit()
    }
  }

  /* ---------------- check-ins ---------------- */

  const runCheckInRound = () => {
    if (destroyed || phase !== BUDDY_PHASE.MONITORING) return

    checkInRound += 1
    checkInRequestedAt = Date.now()
    checkInSatisfied = false
    send(MSG.CHECKIN_REQUEST, { round: checkInRound, at: checkInRequestedAt })
    emit()

    later(() => {
      // Window closed. An unanswered check-in is the drift the drill is looking
      // for, so record it rather than quietly extending the window.
      if (!checkInSatisfied && phase === BUDDY_PHASE.MONITORING) {
        checkIns.missed += 1
        checkInSatisfied = true
        emit()
      }
      if (!isHost) return
      if (checkInRound >= CHECK_IN_ROUNDS) later(() => triggerDistress(), 1500)
      else later(runCheckInRound, CHECK_IN_INTERVAL_MS - CHECK_IN_WINDOW_MS)
    }, CHECK_IN_WINDOW_MS)
  }

  const triggerDistress = () => {
    if (destroyed || phase !== BUDDY_PHASE.MONITORING) return
    setPhase(BUDDY_PHASE.DISTRESS, { at: Date.now() })
  }

  /**
   * Safety net for the worst case: the responder never notices their buddy is
   * down. The drill still has to end and still has to be scored — a responder
   * who never reacted is exactly the outcome a safety officer needs to see.
   */
  const forceDebriefIfStalled = () => {
    if (destroyed) return
    if (phase === BUDDY_PHASE.DISTRESS || phase === BUDDY_PHASE.RESPONSE) finishLocally({})
  }

  /* ---------------- incoming messages ---------------- */

  const handleMessage = (envelope) => {
    if (destroyed || !envelope) return
    buddy.lastSeenAt = Date.now()

    switch (envelope.kind) {
      case MSG.HELLO:
        buddy.ready = true
        emit()
        break

      case MSG.PHASE:
        // Only the host is authoritative about phase, so a guest applies these
        // and a host ignores them.
        if (!isHost && envelope.payload?.phase) {
          phase = envelope.payload.phase
          onEnterPhase(envelope.payload.phase, envelope.payload)
        }
        break

      case MSG.CHECKIN_REQUEST:
        if (!isHost && phase === BUDDY_PHASE.MONITORING) {
          checkInRound = envelope.payload?.round || checkInRound + 1
          checkInRequestedAt = envelope.payload?.at || Date.now()
          checkInSatisfied = false
          emit()
          later(() => {
            if (!checkInSatisfied && phase === BUDDY_PHASE.MONITORING) {
              checkIns.missed += 1
              checkInSatisfied = true
              emit()
            }
          }, CHECK_IN_WINDOW_MS)
        }
        break

      case MSG.CHECKIN:
        buddy.checkIns += 1
        buddyAcknowledged = true
        emit()
        break

      case MSG.ACT:
        buddy.decisions += 1
        emit()
        break

      case MSG.RESULT:
        // The peer's own score, for the side-by-side debrief.
        buddy.result = envelope.payload
        emit()
        break

      case MSG.ABORT:
        if (phase !== BUDDY_PHASE.DEBRIEF && phase !== BUDDY_PHASE.ABORTED) {
          phase = BUDDY_PHASE.ABORTED
          onEnterPhase(BUDDY_PHASE.ABORTED, {})
        }
        break

      default:
        break
    }
  }

  /* ---------------- public actions ---------------- */

  const recordDecision = (step, choiceIndex) => {
    const choice = step?.choices?.[choiceIndex]
    if (!choice) return null

    const latencyMs = stepShownAt ? Date.now() - stepShownAt : null
    const maxPoints = Math.max(...step.choices.map((c) => c.points))

    decisions.push({
      stepId: step.id,
      points: choice.points,
      maxPoints,
      latencyMs,
      targetMs: step.targetMs,
    })

    send(MSG.ACT, { stepId: step.id, correct: !!choice.correct })
    return { choice, latencyMs, grade: gradeLatency(latencyMs, step.targetMs) }
  }

  return {
    getState: state,

    start() {
      send(MSG.HELLO, null)
      if (isHost) {
        // Host assigns the casualty role once, so both phones agree.
        const hostIsCasualty = Math.random() < 0.5
        myRole = hostIsCasualty ? BUDDY_ROLE.CASUALTY : BUDDY_ROLE.RESPONDER
        const guestRole = hostIsCasualty ? BUDDY_ROLE.RESPONDER : BUDDY_ROLE.CASUALTY
        setPhase(BUDDY_PHASE.BRIEFING, { role: guestRole })
        // setPhase told the guest its role; re-apply ours locally.
        myRole = hostIsCasualty ? BUDDY_ROLE.CASUALTY : BUDDY_ROLE.RESPONDER
        emit()
      } else {
        emit()
      }
    },

    /** Called by the page for every inbound peer message. */
    onPeerMessage: handleMessage,

    /** Answer the current decision. Returns feedback for immediate display. */
    choose(choiceIndex) {
      if (!currentStep) return null
      const outcome = recordDecision(currentStep, choiceIndex)
      if (!outcome) return null

      const answered = currentStep
      currentStep = null
      emit()

      // Advance. Only the host moves the shared phase forward; both sides
      // advance their own private step queue.
      if (answered.id === 'bd_ppe') {
        if (isHost) later(() => setPhase(BUDDY_PHASE.ENTRY, {}), 1400)
      } else if (answered.id === 'bd_entry') {
        if (isHost) later(() => setPhase(BUDDY_PHASE.MONITORING, {}), 1400)
      } else if (answered.id === 'bd_casualty') {
        // The casualty's part ends here — they are on the floor. They finish on
        // their own clock while the responder is still working the incident.
        later(() => finishLocally({}), 1400)
      } else if (answered.id === 'bd_resp_1') {
        stepIndex = 3
        later(() => presentStep(BUDDY_SCRIPT[BUDDY_PHASE.RESPONSE][BUDDY_ROLE.RESPONDER][1]), 1400)
      } else if (answered.id === 'bd_resp_2') {
        later(() => finishLocally({}), 1200)
      }

      return outcome
    },

    /** Respond to a check-in request. */
    checkIn() {
      if (checkInSatisfied || phase !== BUDDY_PHASE.MONITORING) return false
      const latency = Date.now() - checkInRequestedAt
      checkIns.made += 1
      checkIns.latencies.push(latency)
      checkInSatisfied = true
      send(MSG.CHECKIN, { round: checkInRound, latencyMs: latency })
      emit()
      return true
    },

    /**
     * Responder acknowledges seeing the collapse. This timestamp is the whole
     * point of the drill — it is the gap between a buddy going down and anyone
     * noticing.
     */
    acknowledgeDistress() {
      if (myRole !== BUDDY_ROLE.RESPONDER || noticeLatencyMs !== null) return false
      noticeLatencyMs = distressAt ? Date.now() - distressAt : null
      stepIndex = 2
      phase = BUDDY_PHASE.RESPONSE
      presentStep(BUDDY_SCRIPT[BUDDY_PHASE.RESPONSE][BUDDY_ROLE.RESPONDER][0])
      return true
    },

    /** Share this device's final score for the side-by-side debrief. */
    shareResult(result) {
      send(MSG.RESULT, result)
    },

    abort(reason = 'local') {
      if (phase === BUDDY_PHASE.DEBRIEF || phase === BUDDY_PHASE.ABORTED) return
      send(MSG.ABORT, { reason })
      phase = BUDDY_PHASE.ABORTED
      onEnterPhase(BUDDY_PHASE.ABORTED, {})
    },

    /** Peer vanished mid-drill. Score what we have and say so. */
    peerLost() {
      if (phase === BUDDY_PHASE.DEBRIEF || phase === BUDDY_PHASE.ABORTED) return
      phase = BUDDY_PHASE.ABORTED
      onEnterPhase(BUDDY_PHASE.ABORTED, {})
    },

    destroy() {
      destroyed = true
      clearTimers()
    },
  }
}
