// Structural integrity of the safety content, and the guards that make editing it
// safe.
//
// WHY THIS FILE IS THE PRECONDITION FOR ADDING MODULES
// scenarioTranslations.js maps onto scenarios.js POSITIONALLY — `tr.steps[i]` and
// `trStep.choices[j]`. That coupling has two consequences nobody notices until a
// worker is looking at the wrong text:
//
//   1. Add a step to a module and its Hindi translation silently runs one short.
//      The last step falls back to English with no warning anywhere.
//   2. INSERT a step in the middle and every following step shows the translation
//      belonging to a different step. A worker reading Hindi gets the prompt for
//      step 3 with the choices from step 2 — internally consistent, entirely wrong,
//      and impossible to spot without reading both files side by side.
//
// (2) is the dangerous one, because it is a silent corruption of safety
// instructions rather than a visible gap. The alignment test below turns both into
// a build failure, which is what makes deepening the modules a safe operation
// instead of a careful one.
//
// The other guards here protect claims rather than content: that guessing cannot
// beat the assessment, and that the certificate chain format is not altered by
// accident.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { SCENARIOS, CERTIFICATION_DOMAINS } from '../src/lib/scenarios.js'
import { SCENARIO_TRANSLATIONS, translateScenario } from '../src/lib/scenarioTranslations.js'
import { SCENARIO_META, enrichScenario, newAttemptSeed } from '../src/lib/scenarioMeta.js'
import { ANCHOR_TYPE } from '../src/lib/siteMap.js'
import { DOMAIN_ORDER, CHAIN_FORMAT_VERSION } from '../src/lib/chain.js'
import { LANGUAGES } from '../src/lib/i18n.js'

const ANCHOR_TYPES = new Set(Object.values(ANCHOR_TYPE))

/* ================================================================== */
describe('scenario structure', () => {
  test('there is at least one module and every module has the required shape', () => {
    assert.ok(SCENARIOS.length >= 2, 'the problem statement asks for at least two modules')
    for (const s of SCENARIOS) {
      assert.equal(typeof s.id, 'string', 'id')
      assert.ok(s.id.length > 0, `${s.id}: empty id`)
      assert.equal(typeof s.domain, 'string', `${s.id}: domain`)
      assert.ok(s.domain.length > 0, `${s.id}: empty domain`)
      assert.equal(typeof s.title, 'string', `${s.id}: title`)
      assert.equal(typeof s.intro, 'string', `${s.id}: intro`)
      assert.ok(Array.isArray(s.steps) && s.steps.length > 0, `${s.id}: steps`)
    }
  })

  test('module ids are unique', () => {
    const ids = SCENARIOS.map((s) => s.id)
    assert.equal(new Set(ids).size, ids.length, 'a duplicate id would make one module unreachable by route')
  })

  test('step ids are unique within a module', () => {
    for (const s of SCENARIOS) {
      const ids = s.steps.map((st) => st.id)
      assert.equal(new Set(ids).size, ids.length, `${s.id}: duplicate step id`)
    }
  })

  // Step ids key the per-step instrumentation (target times, pictograms) and are
  // written into the attempt record, so a collision across modules would blur two
  // different decisions together in the hesitation report.
  test('step ids are unique across all modules', () => {
    const all = SCENARIOS.flatMap((s) => s.steps.map((st) => st.id))
    const dupes = all.filter((id, i) => all.indexOf(id) !== i)
    assert.deepEqual([...new Set(dupes)], [], 'step ids collide across modules')
  })

  test('every step has a prompt and at least two choices', () => {
    for (const s of SCENARIOS) {
      for (const st of s.steps) {
        assert.equal(typeof st.prompt, 'string', `${s.id}/${st.id}: prompt`)
        assert.ok(st.prompt.trim().length > 0, `${s.id}/${st.id}: empty prompt`)
        assert.ok(Array.isArray(st.choices), `${s.id}/${st.id}: choices`)
        assert.ok(st.choices.length >= 2, `${s.id}/${st.id}: a step with one option is not a decision`)
      }
    }
  })

  /* Exactly one correct answer per step, and it must be the highest scoring one.
   * Two consequences if this drifts: accuracy stops being a percentage of a known
   * maximum, and `correct` in the attempt record (points >= maxPoints) starts
   * disagreeing with what a human would call correct — which would put the wrong
   * names on the hesitation list. */
  test('every step has exactly one positive-scoring choice, and it is the maximum', () => {
    for (const s of SCENARIOS) {
      for (const st of s.steps) {
        const points = st.choices.map((c) => c.points)
        for (const p of points) assert.equal(typeof p, 'number', `${s.id}/${st.id}: non-numeric points`)
        const positive = points.filter((p) => p > 0)
        assert.equal(positive.length, 1, `${s.id}/${st.id}: expected exactly one safe choice, got ${positive.length}`)
        assert.equal(Math.max(...points), positive[0], `${s.id}/${st.id}: the safe choice must score highest`)
      }
    }
  })

  test('every choice carries text and feedback, because feedback is the teaching', () => {
    for (const s of SCENARIOS) {
      for (const st of s.steps) {
        for (const [j, c] of st.choices.entries()) {
          assert.ok(typeof c.text === 'string' && c.text.trim(), `${s.id}/${st.id}[${j}]: text`)
          assert.ok(typeof c.feedback === 'string' && c.feedback.trim(), `${s.id}/${st.id}[${j}]: feedback`)
        }
      }
    }
  })

  test('every module maps to a domain, and the certifiable ones are all covered', () => {
    const covered = new Set(SCENARIOS.map((s) => s.domain))
    for (const d of CERTIFICATION_DOMAINS) {
      assert.ok(covered.has(d), `no module trains "${d}", so that domain can never be passed`)
    }
  })
})

/* ================================================================== */
describe('scenario instrumentation', () => {
  test('every module has AR targets and they are real anchor types', () => {
    for (const s of SCENARIOS) {
      const meta = SCENARIO_META[s.id]
      assert.ok(meta, `${s.id}: no SCENARIO_META entry, so it gets no AR targets or pictogram`)
      assert.ok(Array.isArray(meta.arTargets) && meta.arTargets.length > 0, `${s.id}: arTargets`)
      for (const target of meta.arTargets) {
        assert.ok(ANCHOR_TYPES.has(target), `${s.id}: "${target}" is not an ANCHOR_TYPE, so it can never match an anchor`)
      }
      assert.ok(typeof meta.smoke === 'number' && meta.smoke >= 0 && meta.smoke <= 1, `${s.id}: smoke must be 0..1`)
    }
  })

  test('enrichScenario gives every step a positive target time', () => {
    for (const s of SCENARIOS) {
      const enriched = enrichScenario(s, newAttemptSeed())
      for (const st of enriched.steps) {
        assert.ok(Number.isFinite(st.targetMs) && st.targetMs > 0, `${s.id}/${st.id}: targetMs must be positive`)
      }
    }
  })

  /* The reason shuffling exists: in the base content the safe option is always
   * last, so a worker who noticed could score 100% without reading. This asserts
   * the shuffle actually moves it, and that scoring survives the move. */
  test('choice order varies across attempts, so the answer cannot be guessed by position', () => {
    const target = SCENARIOS.find((s) => s.steps.some((st) => st.choices.length >= 2))
    const step = target.steps[0]
    const positions = new Set()
    for (let i = 0; i < 40; i += 1) {
      const enriched = enrichScenario(target, newAttemptSeed())
      const st = enriched.steps.find((x) => x.id === step.id)
      positions.add(st.choices.findIndex((c) => c.points > 0))
    }
    assert.ok(positions.size > 1, 'the safe choice sat in the same position across 40 attempts')
  })

  /* Regression guard for the footgun this suite walked straight into. With an
   * options-only signature, `enrichScenario(s, seed)` destructured a string and
   * fell back to the default seed, so every attempt received an identical
   * permutation — silently reinstating guess-by-position while looking correct.
   * Both forms must now produce a live shuffle. */
  test('a bare string seed is honoured, not silently ignored', () => {
    const target = SCENARIOS[0]
    const positionsFor = (call) => {
      const seen = new Set()
      for (let i = 0; i < 40; i += 1) {
        const st = call(newAttemptSeed()).steps[0]
        seen.add(st.choices.findIndex((c) => c.points > 0))
      }
      return seen
    }
    const asObject = positionsFor((seed) => enrichScenario(target, { seed }))
    const asString = positionsFor((seed) => enrichScenario(target, seed))
    assert.ok(asObject.size > 1, 'object form must shuffle')
    assert.ok(asString.size > 1, 'bare string form must shuffle too')
  })

  test('the same seed reproduces the same order, so buttons do not move mid-decision', () => {
    const target = SCENARIOS[0]
    const seed = newAttemptSeed()
    const first = enrichScenario(target, { seed })
    const second = enrichScenario(target, { seed })
    for (const [i, st] of first.steps.entries()) {
      assert.deepEqual(
        st.choices.map((c) => c.text),
        second.steps[i].choices.map((c) => c.text),
        `${target.id} step ${i}: a stable seed must give a stable order`
      )
    }
  })

  test('shuffle can be turned off, and then the order is the source order', () => {
    const target = SCENARIOS[0]
    const out = enrichScenario(target, { shuffle: false, seed: newAttemptSeed() })
    for (const [i, st] of out.steps.entries()) {
      assert.deepEqual(
        st.choices.map((c) => c.sourceIndex),
        target.steps[i].choices.map((_, j) => j)
      )
    }
  })

  test('shuffling preserves the points on each choice', () => {
    for (const s of SCENARIOS) {
      const enriched = enrichScenario(s, newAttemptSeed())
      for (const st of enriched.steps) {
        const base = s.steps.find((x) => x.id === st.id)
        const sortNums = (a) => [...a].sort((x, y) => x - y)
        assert.deepEqual(
          sortNums(st.choices.map((c) => c.points)),
          sortNums(base.choices.map((c) => c.points)),
          `${s.id}/${st.id}: shuffling changed what a choice is worth`
        )
      }
    }
  })
})

/* ================================================================== */
describe('translation alignment', () => {
  /* THE GUARD. See the header of this file for why a misalignment is a silent
   * corruption of safety instructions rather than a visible gap. */
  test('every translated module matches the base step and choice counts', () => {
    for (const s of SCENARIOS) {
      const byLang = SCENARIO_TRANSLATIONS[s.id] || {}
      for (const [lang, tr] of Object.entries(byLang)) {
        const where = `${s.id} [${lang}]`
        assert.ok(Array.isArray(tr.steps), `${where}: steps must be an array`)
        assert.equal(
          tr.steps.length,
          s.steps.length,
          `${where}: ${tr.steps.length} translated steps against ${s.steps.length} real ones — ` +
            'positional mapping means the surplus or shortfall silently shifts every following step'
        )
        for (const [i, baseStep] of s.steps.entries()) {
          const trStep = tr.steps[i]
          assert.ok(trStep, `${where}: step ${i} (${baseStep.id}) missing`)
          assert.ok(typeof trStep.prompt === 'string' && trStep.prompt.trim(), `${where}: step ${i} prompt`)
          assert.ok(Array.isArray(trStep.choices), `${where}: step ${i} choices`)
          assert.equal(
            trStep.choices.length,
            baseStep.choices.length,
            `${where}: step ${i} (${baseStep.id}) has ${trStep.choices.length} translated choices ` +
              `against ${baseStep.choices.length} real ones`
          )
        }
      }
    }
  })

  test('a translated language declares a title and intro', () => {
    for (const s of SCENARIOS) {
      for (const [lang, tr] of Object.entries(SCENARIO_TRANSLATIONS[s.id] || {})) {
        assert.ok(typeof tr.title === 'string' && tr.title.trim(), `${s.id} [${lang}]: title`)
        assert.ok(typeof tr.intro === 'string' && tr.intro.trim(), `${s.id} [${lang}]: intro`)
      }
    }
  })

  test('translateScenario never changes the shape of a module, in any language', () => {
    for (const s of SCENARIOS) {
      for (const { code } of LANGUAGES) {
        const out = translateScenario(s, code)
        assert.equal(out.steps.length, s.steps.length, `${s.id} [${code}]: step count changed`)
        for (const [i, st] of out.steps.entries()) {
          assert.equal(st.choices.length, s.steps[i].choices.length, `${s.id} [${code}]: step ${i} choice count changed`)
          assert.equal(st.id, s.steps[i].id, `${s.id} [${code}]: step ${i} id changed`)
          // Points must survive translation or a translated drill scores differently.
          assert.deepEqual(
            st.choices.map((c) => c.points),
            s.steps[i].choices.map((c) => c.points),
            `${s.id} [${code}]: step ${i} points changed`
          )
        }
      }
    }
  })

  test('an unknown language falls back to the base module rather than throwing', () => {
    for (const s of SCENARIOS) {
      const out = translateScenario(s, 'zz-not-a-language')
      assert.equal(out.steps.length, s.steps.length)
      assert.equal(out.title, s.title)
    }
  })

  // Hindi is the fallback for Santali and the second language the problem
  // statement names, so a gap here is felt by more readers than any other.
  test('Hindi covers every module', () => {
    for (const s of SCENARIOS) {
      assert.ok(SCENARIO_TRANSLATIONS[s.id]?.hi, `${s.id}: no Hindi scenario content`)
    }
  })
})

/* ================================================================== */
describe('certificate chain compatibility', () => {
  /* DOMAIN_ORDER is baked into the signed payload of every certificate ever
   * issued. Reordering or extending it changes what a signature covers, so an
   * existing certificate would stop verifying — on a device that may be the only
   * copy. chain.js says to bump CHAIN_FORMAT_VERSION instead; this makes the
   * accidental version of that edit fail here first.
   *
   * The practical consequence, and the reason this test exists: new training
   * modules must use a NON-certifiable domain unless a format bump is genuinely
   * intended. `warehouse-loading` already does exactly that. */
  test('DOMAIN_ORDER still matches CERTIFICATION_DOMAINS exactly', () => {
    assert.deepEqual([...DOMAIN_ORDER], [...CERTIFICATION_DOMAINS])
  })

  test('the certifiable domain set is frozen at the five the problem statement names', () => {
    assert.equal(
      CERTIFICATION_DOMAINS.length,
      5,
      'adding a certifiable domain invalidates every issued certificate — add the module under a ' +
        'non-certifiable domain, or bump CHAIN_FORMAT_VERSION deliberately and migrate'
    )
    assert.equal(new Set(CERTIFICATION_DOMAINS).size, 5, 'duplicate domain')
  })

  test('DOMAIN_ORDER is frozen so it cannot be mutated at runtime', () => {
    assert.ok(Object.isFrozen(DOMAIN_ORDER))
  })

  test('the chain format version is a positive integer', () => {
    assert.ok(Number.isInteger(CHAIN_FORMAT_VERSION) && CHAIN_FORMAT_VERSION > 0)
  })
})
