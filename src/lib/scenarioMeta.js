// Instrumentation for the training modules: reaction-time baselines, pictograms
// for zero-text mode, AR anchor hints, and choice shuffling.
//
// WHY THIS IS A SEPARATE FILE. scenarios.js holds the safety content, and
// scenarioTranslations.js maps onto it POSITIONALLY (steps by index, choices by
// index). Adding fields inline would work, but every future edit to the content
// risks silently desynchronising the translations. Keeping instrumentation
// keyed by step id means the two files can evolve independently and a typo here
// degrades to a default instead of corrupting a translation.
//
// ---------------------------------------------------------------------------
// THE CHOICE-ORDER PROBLEM, and why shuffling is not optional
// ---------------------------------------------------------------------------
// In the base content the unsafe option is always first and the safe option is
// always second — all 18 steps, all 6 modules. A worker who notices that can
// score 100% by always tapping the second button, without reading a word.
//
// That is not a cosmetic issue. It makes accuracy meaningless, and because
// readiness is 70% accuracy it makes the certificate meaningless too. So choices
// are shuffled per attempt here.
//
// Two constraints made this safe to do:
//   1. Scoring reads `points` off the chosen object, never the index, so
//      reordering cannot change what a choice is worth.
//   2. Shuffling must happen AFTER translation, because translations are
//      index-matched to the base content.
//
// The shuffle is seeded and stable for the life of an attempt. A random shuffle
// on every render would reorder the buttons under the worker's thumb mid-decision
// — which would be worse than the bug it fixes.

import { ANCHOR_TYPE } from './siteMap.js'
import { DEFAULT_TARGET_MS } from './assessment.js'

/* ================================================================== */
/* Per-scenario                                                        */
/* ================================================================== */

/**
 * `arTargets` are the anchor types worth surfacing during this module's AR
 * drill. A fire drill shows exits and extinguishers; it does not clutter the
 * view with every pin in the zone.
 *
 * `smoke` drives the low-visibility overlay, 0 to 1. Fire gets the heaviest
 * because reduced visibility is the actual hazard being trained.
 */
export const SCENARIO_META = {
  'fire-explosion': {
    pictogram: 'fire',
    smoke: 0.55,
    arTargets: [ANCHOR_TYPE.EXIT, ANCHOR_TYPE.EXTINGUISHER, ANCHOR_TYPE.ASSEMBLY_POINT],
  },
  'gas-leak-confined-space': {
    pictogram: 'gas',
    smoke: 0.22,
    arTargets: [ANCHOR_TYPE.GAS_ZONE, ANCHOR_TYPE.EXIT, ANCHOR_TYPE.FIRST_AID],
  },
  'machinery-safety': {
    pictogram: 'machinery',
    smoke: 0,
    arTargets: [ANCHOR_TYPE.MACHINE, ANCHOR_TYPE.LOTO_PANEL, ANCHOR_TYPE.EXIT],
  },
  'electrical-hazard': {
    pictogram: 'electric',
    smoke: 0,
    arTargets: [ANCHOR_TYPE.ELECTRICAL_PANEL, ANCHOR_TYPE.LOTO_PANEL, ANCHOR_TYPE.EXIT],
  },
  'dust-respiratory': {
    pictogram: 'dust',
    smoke: 0.35,
    arTargets: [ANCHOR_TYPE.DUST_SOURCE, ANCHOR_TYPE.EXIT],
  },
  'warehouse-loading': {
    pictogram: 'forklift',
    smoke: 0,
    arTargets: [ANCHOR_TYPE.EXIT, ANCHOR_TYPE.ASSEMBLY_POINT, ANCHOR_TYPE.HAZARD],
  },
}

export function scenarioMeta(scenarioId) {
  return SCENARIO_META[scenarioId] || { pictogram: 'warning', smoke: 0, arTargets: [] }
}

/* ================================================================== */
/* Per-step                                                            */
/* ================================================================== */

/**
 * `targetMs` is the reaction-time baseline the latency grader measures against.
 * Answer inside it and the decision reads as confident; take more than twice as
 * long and it is flagged as hesitation.
 *
 * These are graded by how much time the real situation actually allows, not by
 * how hard the question is to read. Escalating fire and a burning smell near a
 * panel get the tightest windows because in both cases delay is the hazard. A
 * colleague's persistent cough gets the loosest, because that is a judgement
 * call rather than an emergency and penalising thought would be wrong.
 *
 * CALIBRATION STATUS: these are reasoned defaults, not measured against a
 * worker cohort. Validating them against real DGMS drill timings is listed in
 * the architecture notes as outstanding work. They are deliberately generous —
 * over-flagging hesitation would erode trust in the flag.
 *
 * `pictogram` is the context icon for zero-text mode. `choicePictograms` is
 * index-matched to the BASE content order, and is reordered alongside the
 * choices when shuffling. Note that none of these icons signal correctness —
 * the two options in a step often share an icon on purpose. Zero-text mode
 * distinguishes them by audio narration plus the 1/2 number badge, which is also
 * what the voice commands map to. An icon that gave the answer away would defeat
 * the assessment.
 *
 * `aim` names anchor types the worker can be asked to physically point the phone
 * at during the AR drill. It is always optional — the tap choices stay live
 * regardless, so a device with no compass loses the spatial exercise but not the
 * module.
 */
export const STEP_META = {
  // --- Fire & Explosion Response ---
  fe1: {
    targetMs: 7000,
    pictogram: 'fire',
    choicePictograms: ['fire', 'exit'],
    aim: { types: [ANCHOR_TYPE.EXIT] },
  },
  fe2: {
    targetMs: 9000,
    pictogram: 'extinguisher',
    choicePictograms: ['extinguisher', 'extinguisher'],
    aim: { types: [ANCHOR_TYPE.EXTINGUISHER] },
  },
  fe3: {
    // Escalating fire with black smoke. Every second spent deciding is a second
    // of smoke inhalation, so this is the tightest window in the module.
    targetMs: 6000,
    pictogram: 'fire',
    choicePictograms: ['extinguisher', 'assembly_point'],
    aim: { types: [ANCHOR_TYPE.ASSEMBLY_POINT, ANCHOR_TYPE.EXIT] },
  },

  // --- Gas Leak & Confined Space Protocol ---
  gc1: {
    // Pre-entry equipment check. Nobody is in danger yet, so there is room to think.
    targetMs: 10000,
    pictogram: 'gas_detector',
    choicePictograms: ['confined_space', 'gas_detector'],
    aim: { types: [ANCHOR_TYPE.GAS_ZONE] },
  },
  gc2: {
    targetMs: 9000,
    pictogram: 'gas_mask',
    choicePictograms: ['dust_mask', 'gas_mask'],
  },
  gc3: {
    targetMs: 8000,
    pictogram: 'confined_space',
    choicePictograms: ['confined_space', 'buddy'],
  },

  // --- Machinery Safety & Lockout-Tagout ---
  ms1: {
    targetMs: 9000,
    pictogram: 'machinery',
    choicePictograms: ['machinery', 'do_not_operate'],
    aim: { types: [ANCHOR_TYPE.MACHINE] },
  },
  ms2: {
    targetMs: 8000,
    pictogram: 'machinery',
    choicePictograms: ['machinery', 'lockout'],
    aim: { types: [ANCHOR_TYPE.LOTO_PANEL] },
  },
  ms3: {
    targetMs: 10000,
    pictogram: 'proper_lift',
    choicePictograms: ['proper_lift', 'proper_lift'],
  },

  // --- Electrical Hazard Response ---
  eh1: {
    targetMs: 9000,
    pictogram: 'electric',
    choicePictograms: ['electric', 'report_it'],
    aim: { types: [ANCHOR_TYPE.ELECTRICAL_PANEL] },
  },
  eh2: {
    targetMs: 9000,
    pictogram: 'lockout',
    choicePictograms: ['electric', 'lockout'],
    aim: { types: [ANCHOR_TYPE.LOTO_PANEL] },
  },
  eh3: {
    // A burning smell is an early fire warning. Delay here is how a fault
    // becomes a fire, so the window is tight.
    targetMs: 6000,
    pictogram: 'electric',
    choicePictograms: ['electric', 'alarm'],
    aim: { types: [ANCHOR_TYPE.EXIT] },
  },

  // --- Dust & Respiratory Hazard Protection ---
  dr1: {
    targetMs: 10000,
    pictogram: 'dust_mask',
    choicePictograms: ['dust_mask', 'dust_mask'],
  },
  dr2: {
    targetMs: 9000,
    pictogram: 'dust',
    choicePictograms: ['dust', 'wet_suppression'],
    aim: { types: [ANCHOR_TYPE.DUST_SOURCE] },
  },
  dr3: {
    // A colleague's persistent cough is a judgement call about occupational
    // health, not an emergency. Rewarding a snap answer here would train the
    // wrong instinct, so this gets the loosest window in the whole set.
    targetMs: 13000,
    pictogram: 'medical_check',
    choicePictograms: ['dust', 'medical_check'],
  },

  // --- Manual Handling & Site Housekeeping ---
  w1: {
    // A reversing forklift with no alarm is an immediate struck-by risk.
    targetMs: 7000,
    pictogram: 'forklift',
    choicePictograms: ['forklift', 'report_it'],
  },
  w2: {
    targetMs: 9000,
    pictogram: 'unstable_load',
    choicePictograms: ['unstable_load', 'report_it'],
  },
  w3: {
    targetMs: 9000,
    pictogram: 'damaged_ladder',
    choicePictograms: ['damaged_ladder', 'report_it'],
  },
}

export function stepMeta(stepId) {
  return STEP_META[stepId] || { targetMs: DEFAULT_TARGET_MS, pictogram: 'warning', choicePictograms: [] }
}

/* ================================================================== */
/* Seeded shuffle                                                      */
/* ================================================================== */

/**
 * mulberry32 — small, fast, good enough for shuffling two options.
 * Seeded so an attempt's ordering is stable across React re-renders.
 */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable 32-bit hash, so a string seed produces a repeatable ordering. */
function hashSeed(value) {
  const str = String(value ?? '')
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Fisher-Yates over a copy, driven by the seeded generator. */
function shuffled(list, rand) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** A fresh seed for one attempt. Callers hold this for the attempt's lifetime. */
export function newAttemptSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/* ================================================================== */
/* Enrichment                                                          */
/* ================================================================== */

/**
 * Merge instrumentation into a (possibly already translated) scenario.
 *
 * Call this AFTER translateScenario, because choice shuffling would otherwise
 * break the positional translation mapping.
 *
 * @param scenario  base or translated scenario object
 * @param opts.shuffle  reorder choices (default true — see the note at the top
 *                      of this file for why this matters)
 * @param opts.seed     attempt seed; keep it stable for the whole attempt
 */
export function enrichScenario(scenario, { shuffle = true, seed = 'static' } = {}) {
  if (!scenario) return null
  const meta = scenarioMeta(scenario.id)

  const steps = (scenario.steps || []).map((step, stepIndex) => {
    const sm = stepMeta(step.id)

    // Pair each choice with its icon before any reordering, so the icon travels
    // with the choice rather than with the position.
    const paired = (step.choices || []).map((choice, choiceIndex) => ({
      ...choice,
      pictogram: sm.choicePictograms?.[choiceIndex] || meta.pictogram,
      // Preserve where this choice sat in the source content. Useful for
      // debugging a translation mismatch, and harmless to ship.
      sourceIndex: choiceIndex,
    }))

    // Distinct seed per step: one seed for the whole scenario would apply the
    // same permutation to every step, which is just a different fixed pattern.
    const choices = shuffle
      ? shuffled(paired, mulberry32(hashSeed(`${seed}:${scenario.id}:${step.id}:${stepIndex}`)))
      : paired

    const maxPoints = choices.length ? Math.max(...choices.map((c) => Number(c.points) || 0)) : 0

    return {
      ...step,
      choices,
      maxPoints,
      targetMs: sm.targetMs,
      pictogram: sm.pictogram,
      aim: sm.aim || null,
    }
  })

  return {
    ...scenario,
    steps,
    pictogram: meta.pictogram,
    smoke: meta.smoke,
    arTargets: meta.arTargets,
    // Highest achievable score for the run, so the results screen never has to
    // recompute it from a partially-answered list.
    maxScore: steps.reduce((sum, s) => sum + s.maxPoints, 0),
  }
}

/* ================================================================== */
/* Refresher selection                                                 */
/* ================================================================== */

/**
 * Pick a couple of steps for a 90-second refresher.
 *
 * Weighted toward the steps that matter most under pressure: anything with a
 * tight reaction window, and anything the worker previously hesitated on. A
 * refresher that re-asked the easy questions would waste the one interaction
 * we get every few days.
 *
 * @param scenario       an enriched scenario
 * @param count          how many steps to ask
 * @param hesitatedIds   step ids this worker was previously flagged slow on
 */
export function pickRefresherSteps(scenario, count = 2, hesitatedIds = [], seed = newAttemptSeed()) {
  const steps = scenario?.steps || []
  if (steps.length === 0) return []
  if (steps.length <= count) return steps

  const flagged = new Set(hesitatedIds || [])
  const rand = mulberry32(hashSeed(seed))

  const scored = steps.map((step) => {
    // Tighter window means more time-critical, so weight it higher.
    const urgency = 1 / Math.max(1, step.targetMs || DEFAULT_TARGET_MS)
    const hesitationBoost = flagged.has(step.id) ? 3 : 1
    // A small random term keeps a worker from seeing the identical two steps
    // every single time.
    return { step, weight: urgency * hesitationBoost * (0.75 + rand() * 0.5) }
  })

  return scored
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((s) => s.step)
}

/** Which step ids in this scenario the worker has been flagged slow on. */
export function hesitatedStepIds(attempts, scenarioId) {
  const ids = new Set()
  for (const attempt of attempts || []) {
    if (scenarioId && attempt.scenarioId !== scenarioId) continue
    for (const id of attempt.hesitationSteps || []) ids.add(id)
  }
  return [...ids]
}
