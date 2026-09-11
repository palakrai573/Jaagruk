/*
 * Voice answering tests.
 *
 * The fault these lock down: the command lexicon named option ONE and TWO only,
 * while 22 of the 54 drill decisions offer three choices. A worker answering by
 * voice said "three", it matched nothing, and the drill sat there — a valid answer
 * to a question the app had just read out, silently discarded, on 40% of the
 * content. Nothing logged it because "no match" is a normal outcome for speech.
 *
 * So the interesting test here is the one that compares the lexicon against the
 * actual content, and fails if content ever grows more options than there are words
 * to name them.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { SCENARIOS } from '../src/lib/scenarios.js'
import { COMMAND, COMMAND_PHRASES, matchCommand, normaliseTranscript } from '../src/lib/speech.js'

/** Commands that name an option position, in order. */
const OPTION_COMMANDS = [COMMAND.ONE, COMMAND.TWO, COMMAND.THREE, COMMAND.FOUR]

describe('every option can be answered by voice', () => {
  test('the lexicon names at least as many options as any step offers', () => {
    let worst = 0
    let worstStep = null
    for (const scenario of SCENARIOS) {
      for (const step of scenario.steps || []) {
        const n = (step.choices || []).length
        if (n > worst) {
          worst = n
          worstStep = `${scenario.id}/${step.id}`
        }
      }
    }
    assert.ok(
      worst <= OPTION_COMMANDS.length,
      `${worstStep} offers ${worst} options but only ${OPTION_COMMANDS.length} can be spoken`,
    )
  })

  test('three-option steps exist, so THREE is not speculative', () => {
    // Guards against someone removing THREE as unused.
    const threes = SCENARIOS.flatMap((s) => s.steps || []).filter((st) => (st.choices || []).length >= 3)
    assert.ok(threes.length > 0, 'expected steps with three options')
  })

  test('every option command has phrases in the lexicon', () => {
    for (const command of OPTION_COMMANDS) {
      const phrases = COMMAND_PHRASES[command]
      assert.ok(Array.isArray(phrases) && phrases.length > 0, `${command} has no phrases`)
    }
  })
})

describe('spoken numbers resolve to the right option', () => {
  const expect = (spoken, command) => {
    const m = matchCommand(spoken, { allowed: OPTION_COMMANDS })
    assert.ok(m, `"${spoken}" matched nothing`)
    assert.equal(m.command, command, `"${spoken}" gave ${m.command}`)
  }

  test('English ordinals and cardinals', () => {
    expect('one', COMMAND.ONE)
    expect('first', COMMAND.ONE)
    expect('two', COMMAND.TWO)
    expect('second', COMMAND.TWO)
    expect('three', COMMAND.THREE)
    expect('third', COMMAND.THREE)
    expect('option three', COMMAND.THREE)
    expect('number three', COMMAND.THREE)
  })

  test('Hindi, in Devanagari and romanised', () => {
    expect('एक', COMMAND.ONE)
    expect('दो', COMMAND.TWO)
    expect('तीन', COMMAND.THREE)
    expect('तीसरा', COMMAND.THREE)
    expect('teen', COMMAND.THREE)
    expect('tisra', COMMAND.THREE)
  })

  test('Santali in Ol Chiki', () => {
    expect('ᱢᱤᱫ', COMMAND.ONE)
    expect('ᱵᱟᱨ', COMMAND.TWO)
    expect('ᱯᱮ', COMMAND.THREE)
  })

  test('a number is still found inside a longer utterance', () => {
    // Recognisers return sentences, not single words.
    expect('I choose option three', COMMAND.THREE)
    expect('number three please', COMMAND.THREE)
  })
})

describe('the allowed filter keeps voice honest', () => {
  test('an option that is not on screen cannot be selected', () => {
    /*
     * This is what stops "three" picking nothing on a two-option question. The
     * drill passes only the commands matching the options actually rendered.
     */
    const twoOnly = [COMMAND.ONE, COMMAND.TWO, COMMAND.REPEAT]
    const m = matchCommand('three', { allowed: twoOnly })
    assert.ok(!m || m.command !== COMMAND.THREE, 'THREE must not match when not allowed')
  })

  test('the option in scope still matches with a restricted list', () => {
    const m = matchCommand('two', { allowed: [COMMAND.ONE, COMMAND.TWO, COMMAND.REPEAT] })
    assert.equal(m?.command, COMMAND.TWO)
  })

  test('repeat and help remain available alongside the numbers', () => {
    const allowed = [COMMAND.ONE, COMMAND.TWO, COMMAND.THREE, COMMAND.REPEAT, COMMAND.HELP]
    assert.equal(matchCommand('repeat', { allowed })?.command, COMMAND.REPEAT)
    assert.equal(matchCommand('again', { allowed })?.command, COMMAND.REPEAT)
    assert.equal(matchCommand('help', { allowed })?.command, COMMAND.HELP)
  })
})

describe('the new phrases do not collide with the old ones', () => {
  test('no phrase is claimed by two different option commands', () => {
    // "char" for four and "chautha" both had to avoid colliding with existing
    // entries. A duplicate would make one option unreachable at random.
    const seen = new Map()
    for (const command of OPTION_COMMANDS) {
      for (const phrase of COMMAND_PHRASES[command] || []) {
        const key = normaliseTranscript(phrase)
        if (!key) continue
        const prior = seen.get(key)
        assert.ok(
          prior === undefined || prior === command,
          `"${phrase}" is claimed by both ${prior} and ${command}`,
        )
        seen.set(key, command)
      }
    }
  })

  test('each option command round-trips every one of its own phrases', () => {
    // A phrase that does not match its own command is dead weight that looks live.
    for (const command of OPTION_COMMANDS) {
      for (const phrase of COMMAND_PHRASES[command] || []) {
        const m = matchCommand(phrase, { allowed: OPTION_COMMANDS })
        assert.equal(m?.command, command, `"${phrase}" should map to ${command}, got ${m?.command}`)
      }
    }
  })

  test('very short romanisations were left out on purpose', () => {
    // "pe" (Santali three) is two characters; with fuzzy matching it would swallow
    // unrelated speech. The Ol Chiki form is exact and safe, so only that ships.
    const three = COMMAND_PHRASES[COMMAND.THREE] || []
    for (const phrase of three) {
      const latin = /^[a-z]+$/.test(phrase)
      if (latin) assert.ok(phrase.length >= 3, `"${phrase}" is too short to match safely`)
    }
  })
})
