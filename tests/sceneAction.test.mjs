/*
 * Scene action mapping tests.
 *
 * The load-bearing test here is the coverage one: every choice pictogram in the
 * content must map to an action. If a new module introduces an icon nobody added to
 * the table, the scene falls back to NONE and simply does not move — which is
 * exactly the "the simulation does nothing" complaint this work exists to fix, and
 * it would come back silently.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { SCENARIOS } from '../src/lib/scenarios.js'
import { enrichScenario } from '../src/lib/scenarioMeta.js'
import {
  SCENE_ACTION,
  ACTION_FOR_PICTOGRAM,
  actionForChoice,
  resolvesHazard,
  escalatesHazard,
} from '../src/lib/sceneAction.js'

/** Every (step, choice) pair in the shipped content, with metadata attached. */
const allPairs = SCENARIOS.flatMap((s) => {
  const enriched = enrichScenario(s, { shuffle: false })
  return (enriched.steps || []).flatMap((step) => (step.choices || []).map((choice) => ({ step, choice })))
})

describe('coverage against the real content', () => {
  test('there is content to check', () => {
    assert.ok(allPairs.length > 100, `expected the full choice set, got ${allPairs.length}`)
  })

  test('every choice pictogram in the content has an action', () => {
    const unmapped = new Set()
    for (const { choice } of allPairs) {
      if (!ACTION_FOR_PICTOGRAM[choice.pictogram]) unmapped.add(choice.pictogram)
    }
    assert.deepEqual(
      [...unmapped],
      [],
      `these pictograms would leave the scene motionless: ${[...unmapped].join(', ')}`,
    )
  })

  test('no choice resolves to NONE', () => {
    // NONE is the defensive fallback, not something the shipped content should hit.
    for (const { step, choice } of allPairs) {
      const action = actionForChoice(choice, step)
      assert.notEqual(action.kind, SCENE_ACTION.NONE, `${step.id}/${choice.pictogram} mapped to NONE`)
    }
  })

  test('the table contains no entries the content never uses', () => {
    // A stale entry is harmless but misleading about what the scene supports.
    const used = new Set(allPairs.map(({ choice }) => choice.pictogram))
    const unused = Object.keys(ACTION_FOR_PICTOGRAM).filter((p) => !used.has(p))
    assert.deepEqual(unused, [], `unused pictogram entries: ${unused.join(', ')}`)
  })

  test('every action in the vocabulary is reachable from real content', () => {
    // An action nothing can trigger is animation code that never runs.
    const reachable = new Set(allPairs.map(({ step, choice }) => actionForChoice(choice, step).kind))
    const unreachable = Object.values(SCENE_ACTION).filter(
      (k) => k !== SCENE_ACTION.NONE && !reachable.has(k),
    )
    assert.deepEqual(unreachable, [], `unreachable actions: ${unreachable.join(', ')}`)
  })
})

describe('actionForChoice', () => {
  const step = { maxPoints: 10 }

  test('a full-marks answer is safe', () => {
    const a = actionForChoice({ pictogram: 'extinguisher', points: 10 }, step)
    assert.equal(a.kind, SCENE_ACTION.EXTINGUISH)
    assert.equal(a.safe, true)
  })

  test('a partially correct answer is NOT treated as safe', () => {
    // Deliberate: the tidy animation is reserved for the fully correct decision.
    const a = actionForChoice({ pictogram: 'extinguisher', points: 6 }, step)
    assert.equal(a.safe, false)
  })

  test('a zero-mark answer is unsafe', () => {
    assert.equal(actionForChoice({ pictogram: 'fire', points: 0 }, step).safe, false)
  })

  test('the icon determines the action, the points determine safety', () => {
    // ENGAGE is not a synonym for wrong — a hazard icon can sit on a correct answer.
    const a = actionForChoice({ pictogram: 'machinery', points: 10 }, step)
    assert.equal(a.kind, SCENE_ACTION.ENGAGE)
    assert.equal(a.safe, true)
  })

  test('an unknown pictogram degrades to NONE rather than throwing', () => {
    const a = actionForChoice({ pictogram: 'nonexistent', points: 10 }, step)
    assert.equal(a.kind, SCENE_ACTION.NONE)
  })

  test('missing or junk input returns null or a safe default', () => {
    assert.equal(actionForChoice(null, step), null)
    assert.equal(actionForChoice(undefined, step), null)
    assert.equal(actionForChoice({}, step).kind, SCENE_ACTION.NONE)
    assert.equal(actionForChoice({ pictogram: 42 }, step).kind, SCENE_ACTION.NONE)
  })

  test('a step with no maxPoints cannot produce a false "safe"', () => {
    // Guards against 0 >= 0 reading as a correct answer.
    assert.equal(actionForChoice({ pictogram: 'exit', points: 0 }, { maxPoints: 0 }).safe, false)
    assert.equal(actionForChoice({ pictogram: 'exit', points: 0 }, {}).safe, false)
    assert.equal(actionForChoice({ pictogram: 'exit', points: 0 }, null).safe, false)
  })
})

describe('hazard outcome', () => {
  test('only a correct extinguish, isolate or suppress puts the hazard down', () => {
    for (const kind of [SCENE_ACTION.EXTINGUISH, SCENE_ACTION.ISOLATE, SCENE_ACTION.SUPPRESS]) {
      assert.equal(resolvesHazard({ kind, safe: true }), true, kind)
      assert.equal(resolvesHazard({ kind, safe: false }), false, `${kind} when unsafe`)
    }
  })

  test('evacuating correctly does not put the fire out', () => {
    // Leaving is the right answer and the fire keeps burning. Showing it die
    // because the worker left would teach that walking away solves it.
    assert.equal(resolvesHazard({ kind: SCENE_ACTION.EVACUATE, safe: true }), false)
    assert.equal(resolvesHazard({ kind: SCENE_ACTION.ALERT, safe: true }), false)
    assert.equal(resolvesHazard({ kind: SCENE_ACTION.PROTECT, safe: true }), false)
  })

  test('every unsafe answer escalates', () => {
    for (const kind of Object.values(SCENE_ACTION)) {
      assert.equal(escalatesHazard({ kind, safe: false }), true, kind)
    }
  })

  test('no correct answer escalates', () => {
    for (const kind of Object.values(SCENE_ACTION)) {
      assert.equal(escalatesHazard({ kind, safe: true }), false, kind)
    }
  })

  test('no action means neither outcome', () => {
    assert.equal(resolvesHazard(null), false)
    assert.equal(escalatesHazard(null), false)
  })
})
