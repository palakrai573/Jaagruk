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
import {
  COMMAND,
  COMMAND_PHRASES,
  matchCommand,
  normaliseTranscript,
  asrRetryPolicy,
  asrLocaleChain,
  msSinceSpeech,
  ASR_ERROR,
  ASR_LOCALE_ESCALATE_AFTER,
  SELF_HEARING_GUARD_MS,
} from '../src/lib/speech.js'

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

/* ------------------------------------------------------- hands-free mode */

describe('hands-free retry policy', () => {
  test('silence is not a failure', () => {
    /*
     * The distinction the whole mode rests on. Under push-to-talk, "no speech" meant
     * the worker pressed a button and said nothing — worth reporting. With the mic
     * simply live, silence is the normal state and the engine reports it every few
     * seconds. Treating it as an error would paper the screen with warnings about a
     * worker who is reading the question.
     */
    const p = asrRetryPolicy(ASR_ERROR.NO_SPEECH)
    assert.equal(p.retry, true)
    assert.equal(p.fatal, false)
    assert.ok(p.delayMs <= 500, `should restart promptly, got ${p.delayMs}ms`)
  })

  test('unmatched audio and engine-closed sessions also just restart', () => {
    for (const code of [ASR_ERROR.NO_MATCH, ASR_ERROR.ABORTED]) {
      const p = asrRetryPolicy(code)
      assert.equal(p.retry, true, code)
      assert.equal(p.fatal, false, code)
    }
  })

  test('a denied microphone stops for good', () => {
    // Retrying would re-prompt in a loop, which is the worst possible response to
    // someone having just said no.
    const p = asrRetryPolicy(ASR_ERROR.PERMISSION_DENIED)
    assert.equal(p.retry, false)
    assert.equal(p.fatal, true)
  })

  test('a missing microphone stops for good', () => {
    // No hardware means no amount of retrying will help; it would spin forever.
    const p = asrRetryPolicy(ASR_ERROR.AUDIO)
    assert.equal(p.fatal, true)
    assert.equal(p.retry, false)
  })

  test('an unsupported engine stops for good', () => {
    assert.equal(asrRetryPolicy(ASR_ERROR.UNSUPPORTED).fatal, true)
  })

  test('network failures back off but never give up', () => {
    /*
     * Chrome's recogniser is network-backed on many builds, so this fires constantly
     * underground. It must not become a request loop, and it must not give up either —
     * the link returning should restore voice without the worker noticing it went.
     */
    const delays = [0, 1, 2, 3, 4, 5, 6].map((n) => asrRetryPolicy(ASR_ERROR.NETWORK, n))
    for (const p of delays) {
      assert.equal(p.retry, true)
      assert.equal(p.fatal, false)
    }
    for (let i = 1; i < 4; i += 1) {
      assert.ok(delays[i].delayMs > delays[i - 1].delayMs, `delay should grow at step ${i}`)
    }
    assert.ok(delays[6].delayMs <= 8000, `capped, got ${delays[6].delayMs}`)
  })

  test('unknown faults retry but are bounded', () => {
    // An unrecognised error repeating without limit is how a background loop quietly
    // eats a battery.
    assert.equal(asrRetryPolicy('something-new', 0).retry, true)
    assert.equal(asrRetryPolicy('something-new', 5).fatal, true, 'must eventually stop')
  })

  test('the failure count is clamped rather than trusted', () => {
    for (const n of [-5, NaN, undefined, null, 'many', 1e9]) {
      const p = asrRetryPolicy(ASR_ERROR.NETWORK, n)
      assert.ok(Number.isFinite(p.delayMs) && p.delayMs >= 0, `n=${n} gave ${p.delayMs}`)
    }
  })

  test('every policy result has the full shape', () => {
    for (const code of [...Object.values(ASR_ERROR), 'unmapped', undefined]) {
      const p = asrRetryPolicy(code)
      assert.equal(typeof p.retry, 'boolean', code)
      assert.equal(typeof p.fatal, 'boolean', code)
      assert.equal(typeof p.delayMs, 'number', code)
      assert.ok(!(p.retry && p.fatal), `${code}: cannot be both retryable and fatal`)
    }
  })
})

describe('the self-hearing guard', () => {
  test('there is a non-trivial guard window', () => {
    /*
     * The hazard this exists for: the drill reads every option aloud, numbered, and a
     * permanently live microphone hears "one, two, three" perfectly well. Without a
     * guard the phone answers its own question with whichever number it said last, and
     * the worker watches the drill play itself.
     *
     * Recognition results arrive AFTER the audio that produced them, so an is-speaking
     * check alone is not enough — a phrase captured during narration can be delivered
     * just after it stops. Hence a trailing window.
     */
    assert.ok(SELF_HEARING_GUARD_MS >= 300, `${SELF_HEARING_GUARD_MS}ms is too short to cover delivery lag`)
    assert.ok(
      SELF_HEARING_GUARD_MS <= 1200,
      `${SELF_HEARING_GUARD_MS}ms would ignore a worker who answers immediately, which is what the drill measures`,
    )
  })

  test('with no speech yet, nothing is suppressed', () => {
    // A fresh page has never spoken, so the guard must not block the first answer.
    assert.equal(msSinceSpeech(), Number.POSITIVE_INFINITY)
    assert.ok(msSinceSpeech() >= SELF_HEARING_GUARD_MS, 'the first answer must be accepted')
  })
})

/* ------------------------------------------- offline, in a second language */

describe('offline recognition in a language with no on-device model', () => {
  /*
   * THE REPORTED BUG, from a phone with the net off: English voice answers worked and
   * Hindi ones did not. Saying "ek" or "do" was never caught.
   *
   * Recognition on Chrome/Android is served by the Android speech service, which can
   * only work offline for languages whose pack has been downloaded. Devices ship an
   * English model; Hindi is an opt-in download most workers have never made. With no
   * pack and no network the engine reports `network` — and the listener retried the
   * same locale on a backoff, forever, while the live indicator kept saying
   * "listening" because a restart counts as listening.
   *
   * Two independent defects, and fixing either alone would have left it broken:
   *
   *   1. Nothing ever moved off the failing locale. No transcript was produced at all.
   *   2. Even with a transcript, `ek` and `do` are two characters, and editBudget
   *      requires an exact match at that length. Every other command had a longer
   *      form to fall back on; the two used on every single question had none, and no
   *      numeral form either — which is what engines most often return.
   */

  test('a Hindi request falls back to a locale a device is likely to have', () => {
    const chain = asrLocaleChain('hi')
    assert.equal(chain[0], 'hi-IN', 'the requested language must still be tried first')
    assert.ok(chain.length > 1, 'hi-IN with no offline pack must have somewhere to go')
    assert.equal(chain[chain.length - 1], 'en-IN')
  })

  test('Santali inherits the chain, because its recognition locale IS Hindi', () => {
    // sat maps to hi-IN for recognition, so it must not need its own entry — and must
    // not be left without a fallback because the table is keyed by locale not language.
    assert.deepEqual(asrLocaleChain('sat'), asrLocaleChain('hi'))
  })

  test('English has nowhere to fall back to, and needs nowhere', () => {
    const chain = asrLocaleChain('en')
    assert.deepEqual(chain, ['en-IN'], 'a fallback for English would be a downgrade to itself')
  })

  test('a chain never repeats a locale', () => {
    for (const code of ['en', 'hi', 'sat', 'bn', 'or', 'ur']) {
      const chain = asrLocaleChain(code)
      assert.equal(new Set(chain).size, chain.length, `${code}: ${chain.join(' -> ')}`)
    }
  })

  test('an explicit locale tag is passed through rather than re-resolved', () => {
    assert.equal(asrLocaleChain('hi-IN')[0], 'hi-IN')
  })

  test('the escalation threshold tolerates one blip but not a wall', () => {
    /*
     * One network error is also what a momentary drop looks like on a network-backed
     * recogniser, and downgrading the model on the first hiccup would quietly cost
     * accuracy for someone who is actually online. Two in a row is the offline
     * signature.
     */
    assert.ok(ASR_LOCALE_ESCALATE_AFTER >= 2, 'one failure is a blip, not a verdict')
    assert.ok(ASR_LOCALE_ESCALATE_AFTER <= 3, 'more than this and the worker is left waiting')
  })
})

describe('a spoken number is caught however the engine writes it down', () => {
  const expect = (spoken, command) => {
    const m = matchCommand(spoken, { allowed: OPTION_COMMANDS })
    assert.ok(m, `"${spoken}" matched nothing`)
    assert.equal(m.command, command, `"${spoken}" gave ${m.command}`)
  }

  test('digits, which is what most engines actually return', () => {
    // None of these was in the lexicon. "one" and "ek" both commonly transcribe as
    // "1", so on any engine that does that, the two most-used commands matched nothing.
    expect('1', COMMAND.ONE)
    expect('2', COMMAND.TWO)
    expect('3', COMMAND.THREE)
    expect('4', COMMAND.FOUR)
  })

  test('digits in Devanagari and Urdu script', () => {
    expect('१', COMMAND.ONE)
    expect('२', COMMAND.TWO)
    expect('۱', COMMAND.ONE)
    expect('۲', COMMAND.TWO)
  })

  test('a digit inside a sentence', () => {
    expect('option 2', COMMAND.TWO)
    expect('number 3 please', COMMAND.THREE)
  })

  test('a longer number is not mistaken for the digit it starts with', () => {
    // The exact-match rule for short phrases is what makes this safe: "10" is not "1".
    for (const spoken of ['10', '21', '100']) {
      const m = matchCommand(spoken, { allowed: OPTION_COMMANDS })
      assert.ok(!m, `"${spoken}" should not select an option, got ${m?.command}`)
    }
  })

  test('Hindi feminine ordinals, which a speaker may well use', () => {
    expect('पहली', COMMAND.ONE)
    expect('दूसरी', COMMAND.TWO)
    expect('तीसरी', COMMAND.THREE)
  })

  test('common romanisation variants of the Hindi numbers', () => {
    expect('ek', COMMAND.ONE)
    expect('do', COMMAND.TWO)
    expect('doh', COMMAND.TWO)
    expect('teen', COMMAND.THREE)
    expect('chaar', COMMAND.FOUR)
  })

  test('every option still has a path that survives one transcription slip', () => {
    /*
     * The property the reported bug violated. `ek` and `do` are two characters, so
     * editBudget gives them zero tolerance — correct in itself, since one edit on a
     * short word reaches too many unrelated ones. But it meant the two commands used
     * on every question had NO fuzzy path at all, while every other command did.
     *
     * So each option must own at least one phrase of four characters or more, which is
     * where editBudget starts allowing an edit. This does not assert that any
     * particular slip is absorbed — it asserts the option is not cornered into
     * requiring perfect transcription.
     */
    for (const command of OPTION_COMMANDS) {
      const forgiving = (COMMAND_PHRASES[command] || []).filter((p) => p.length >= 4)
      assert.ok(
        forgiving.length > 0,
        `${command} has no phrase long enough to tolerate a single ASR slip`,
      )
    }
  })
})
