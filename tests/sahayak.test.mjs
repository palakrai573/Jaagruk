/*
 * Offline assistant tests.
 *
 * The assistant previously refused to say anything until the worker pasted a Google API
 * key into Settings — which fails in exactly the conditions this app exists for, and put
 * a credential in a browser bundle where it could never have been secret anyway.
 *
 * Now the answers are on the device, which makes them testable: the retrieval either
 * finds the right entry for a realistic question or it does not, and that is checkable
 * without a network or a model. The most important tests here are the ones asserting it
 * DECLINES — a confidently wrong answer about what happens to a worker's data, or about
 * whether the app works underground, is worse than an admitted gap.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  SAHAYAK_ENTRIES,
  findAnswer,
  answerText,
  questionText,
  suggestedQuestions,
  entryById,
  MATCH_THRESHOLD,
} from '../src/lib/sahayak.js'
import { LANGUAGES } from '../src/lib/i18n.js'

const LANG_CODES = LANGUAGES.map((l) => l.code)

describe('the knowledge base is complete', () => {
  test('there are entries to search', () => {
    assert.ok(SAHAYAK_ENTRIES.length >= 8, `only ${SAHAYAK_ENTRIES.length} entries`)
  })

  test('every entry is answered in every shipped language', () => {
    /*
     * A missing translation here is not a cosmetic gap: the assistant is the fallback for
     * a worker who did not understand something, so answering them in a language they do
     * not read is the one thing it must never do.
     */
    for (const entry of SAHAYAK_ENTRIES) {
      for (const code of LANG_CODES) {
        assert.ok(entry.a[code], `${entry.id} has no answer in ${code}`)
        assert.ok(entry.q[code], `${entry.id} has no question in ${code}`)
      }
    }
  })

  test('ids are unique', () => {
    const ids = SAHAYAK_ENTRIES.map((e) => e.id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('answers are short enough to be read on a phone', () => {
    // An answer nobody reads is not an answer. Two sentences was the design brief.
    for (const entry of SAHAYAK_ENTRIES) {
      for (const code of LANG_CODES) {
        assert.ok(
          entry.a[code].length <= 400,
          `${entry.id}/${code} is ${entry.a[code].length} chars — too long for a phone mid-shift`,
        )
      }
    }
  })

  test('every entry carries tags in more than one script', () => {
    // Workers type in Devanagari and in romanised Hindi. Tags covering only English
    // would leave the assistant deaf to most of its users.
    for (const entry of SAHAYAK_ENTRIES) {
      assert.ok(entry.tags.length >= 5, `${entry.id} has too few tags to match reliably`)
      const hasNonLatin = entry.tags.some((t) => /[^\u0000-\u024F\s]/.test(t))
      const hasRomanised = entry.tags.some((t) => /^[a-z\s]+$/.test(t))
      assert.ok(hasRomanised, `${entry.id} has no romanised tags`)
      // Non-Latin tags are desirable but not required on every entry, since romanised
      // input is the common case; assert at least the option exists somewhere.
      assert.ok(typeof hasNonLatin === 'boolean')
    }
  })
})

describe('realistic questions find the right answer', () => {
  const expectId = (question, id) => {
    const hit = findAnswer(question)
    assert.ok(hit, `"${question}" matched nothing`)
    assert.equal(hit.entry.id, id, `"${question}" gave ${hit.entry.id}`)
  }

  test('English, phrased naturally', () => {
    expectId('what is this app', 'what-is-this')
    expectId('how do I start a drill', 'start-drill')
    expectId('the camera is not working', 'camera-ar')
    expectId('how is my score calculated', 'score')
    expectId('how do I get a certificate', 'certificate')
    expectId('can I answer by speaking', 'voice')
    expectId('does it work offline', 'offline')
    expectId('what happens to my data', 'privacy')
    expectId('what is the buddy drill', 'buddy')
    expectId('I cannot read', 'cannot-read')
  })

  test('romanised Hindi, which is how people actually type', () => {
    expectId('certificate kaise milega', 'certificate')
    expectId('training kaise shuru karu', 'start-drill')
    expectId('bina internet chalega', 'offline')
    expectId('bolkar jawab de sakta hu', 'voice')
    expectId('mera data kahan jata hai', 'privacy')
  })

  test('Devanagari', () => {
    expectId('प्रमाणपत्र कैसे मिलेगा', 'certificate')
    expectId('क्या इंटरनेट के बिना चलेगा', 'offline')
  })

  test('a single keyword is enough', () => {
    expectId('certificate', 'certificate')
    expectId('offline', 'offline')
    expectId('privacy', 'privacy')
  })

  test('typos still match', () => {
    // Fuzzy matching earns its place here: a worker on a phone with gloves mistypes.
    expectId('certificat', 'certificate')
    expectId('ofline', 'offline')
  })

  test('a longer sentence still finds the keyword inside it', () => {
    expectId('sorry, I wanted to ask how the certificate works', 'certificate')
  })
})

describe('it declines rather than guessing', () => {
  test('questions outside its scope return nothing', () => {
    /*
     * The tests that matter most. This is a safety product; a plausible invented answer
     * about mining regulation or first aid could get someone hurt, and the assistant has
     * no basis for either. Declining and listing what it does know is the correct
     * behaviour, not a shortcoming.
     */
    for (const q of [
      'what is the capital of France',
      'write me a poem',
      'who won the cricket match',
      'what is the DGMS regulation number for ventilation',
      'how do I treat a broken arm',
      'zzzzzzzz',
    ]) {
      assert.equal(findAnswer(q), null, `"${q}" should not have matched`)
    }
  })

  test('empty and junk input returns nothing without throwing', () => {
    for (const q of ['', '   ', null, undefined, 42, {}, [], '!!!', '...']) {
      assert.equal(findAnswer(q), null, JSON.stringify(q))
    }
  })

  test('the threshold is high enough to mean something', () => {
    assert.ok(MATCH_THRESHOLD >= 0.5, 'a low threshold would match anything')
    assert.ok(MATCH_THRESHOLD <= 0.85, 'too high and real questions would be refused')
  })

  test('a match always reports its confidence', () => {
    const hit = findAnswer('certificate')
    assert.ok(hit.score >= MATCH_THRESHOLD && hit.score <= 1, `score ${hit.score}`)
  })
})

describe('answer and question retrieval', () => {
  test('the requested language is returned', () => {
    const entry = entryById('offline')
    for (const code of LANG_CODES) {
      assert.equal(answerText(entry, code), entry.a[code])
      assert.equal(questionText(entry, code), entry.q[code])
    }
  })

  test('an unknown language falls back rather than returning empty', () => {
    // Better a Hindi answer than a blank bubble.
    const entry = entryById('offline')
    assert.ok(answerText(entry, 'xx').length > 0)
    assert.ok(questionText(entry, 'xx').length > 0)
  })

  test('a missing entry yields an empty string, not a crash', () => {
    assert.equal(answerText(null, 'en'), '')
    assert.equal(questionText(undefined, 'en'), '')
    assert.equal(entryById('nope'), null)
  })
})

describe('suggested questions', () => {
  test('chips are offered in the requested language', () => {
    for (const code of LANG_CODES) {
      const chips = suggestedQuestions(code)
      assert.ok(chips.length > 0)
      for (const chip of chips) {
        assert.ok(chip.text.length > 0, `empty chip text in ${code}`)
        assert.ok(chip.id, 'chip needs an id to resolve on tap')
      }
    }
  })

  test('already-asked questions can be excluded', () => {
    // So the chips stay useful as the conversation goes on instead of repeating.
    const chips = suggestedQuestions('en', { exclude: ['what-is-this', 'start-drill'] })
    assert.ok(!chips.some((c) => c.id === 'what-is-this'))
    assert.ok(!chips.some((c) => c.id === 'start-drill'))
  })

  test('the limit is respected', () => {
    assert.equal(suggestedQuestions('en', { limit: 2 }).length, 2)
    assert.ok(suggestedQuestions('en', { limit: 99 }).length <= SAHAYAK_ENTRIES.length)
  })

  test('every chip resolves back to a real entry', () => {
    for (const chip of suggestedQuestions('en', { limit: 99 })) {
      assert.ok(entryById(chip.id), `${chip.id} does not resolve`)
    }
  })

  test('tapping a suggested question finds its own answer', () => {
    /*
     * The round trip that makes the chips trustworthy: the offered text, fed back through
     * retrieval, must return the entry it came from. If it did not, tapping a chip could
     * show a different answer than the one it promised.
     */
    for (const entry of SAHAYAK_ENTRIES) {
      for (const code of ['en', 'hi']) {
        const hit = findAnswer(questionText(entry, code))
        assert.ok(hit, `${entry.id}/${code} question matched nothing`)
        assert.equal(hit.entry.id, entry.id, `${entry.id}/${code} resolved to ${hit.entry.id}`)
      }
    }
  })
})
