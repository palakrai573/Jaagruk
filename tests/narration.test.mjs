// What language a worker actually HEARS in a drill, and whether the app admits it.
//
// WHY THIS FILE EXISTS
// A Santali worker running any of the nine modules is shown and read Hindi, because
// SCENARIO_TRANSLATIONS has no `sat` key for any module and the fallback chain
// resolves sat -> hi. That is a defensible fallback: Hindi is the language of
// schooling in Jharkhand, and Devanagari is far more readable than Latin for that
// population, which is exactly why the chain was written that way.
//
// What was not defensible is that the app never said so. The only notice about drill
// language rendered behind scenarioContentIsEnglish(), which consults the fallback
// chain and therefore returns false for Santali the moment the Hindi fallback
// succeeds. So the one language in the app with a mid-chain fallback was the one
// language guaranteed to get no notice.
//
// Two failure modes are being locked down here, and they pull in opposite directions:
//
//   1. Silence. The notice must appear whenever the drill is not in the language the
//      worker chose. This is the bug that existed.
//   2. Crying wolf. The notice must name the language actually used. An earlier
//      version asserted "English" while the screen was Hindi, and a safety notice
//      that is wrong once is a safety notice nobody reads again. That is why
//      scenarioContentIsEnglish was made fallback-aware in the first place, and the
//      fix must not undo it.
//
// A test that only checked (1) would pass a notice that lies, and a test that only
// checked (2) would pass silence.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { SCENARIOS } from '../src/lib/scenarios.js'
import { SCENARIO_TRANSLATIONS, scenarioContentLanguage } from '../src/lib/scenarioTranslations.js'
import {
  LANGUAGES,
  LANGUAGE_FALLBACK,
  NARRATION,
  narrationStatus,
  narrationNotice,
  nativeLangName,
  scenarioContentIsEnglish,
} from '../src/lib/i18n.js'
import { NARRATION_NOTICE, CONTENT_NOTICE } from '../src/lib/i18nJaagruk.js'
import { SPEECH_LOCALE, SPEECH_IS_SUBSTITUTE } from '../src/lib/speech.js'

const CODES = LANGUAGES.map((l) => l.code)

/* ================================================================== */
describe('what language a drill actually resolves to', () => {
  test('no module has Santali scenario content, so every one resolves to Hindi', () => {
    // If this ever fails it is GOOD NEWS: someone filled in
    // docs/santali-scenario-worksheet.csv. Update the test with the count.
    const withSantali = Object.entries(SCENARIO_TRANSLATIONS).filter(([, langs]) => langs.sat)
    assert.equal(withSantali.length, 0, 'a module gained Santali content — see the note above')

    for (const s of SCENARIOS) {
      assert.equal(
        scenarioContentLanguage(s.id, 'sat'),
        'hi',
        `${s.id}: Santali should resolve to Hindi, not English`
      )
    }
  })

  test('the per-module asymmetry is real and is not smoothed over', () => {
    // warehouse-loading is the only module carried over from before the domain
    // restructure, so it alone has bn/or/ur. The other eight resolve to English for
    // those languages. A test that asserted uniformity would be asserting a fiction.
    assert.equal(scenarioContentLanguage('warehouse-loading', 'bn'), 'bn')
    assert.equal(scenarioContentLanguage('fire-explosion', 'bn'), 'en')
  })

  test('English asks for itself and gets itself', () => {
    for (const s of SCENARIOS) assert.equal(scenarioContentLanguage(s.id, 'en'), 'en')
  })
})

/* ================================================================== */
describe('the notice tells the truth, and tells it at all', () => {
  test('a drill in the chosen language says nothing', () => {
    assert.equal(narrationStatus('hi', 'hi'), NARRATION.OWN)
    assert.equal(narrationNotice('hi', 'hi'), null)
    assert.equal(narrationNotice('en', 'en'), null)
  })

  test('Santali gets a notice on every module — the bug this fixes', () => {
    for (const s of SCENARIOS) {
      const resolved = scenarioContentLanguage(s.id, 'sat')
      assert.equal(narrationStatus('sat', resolved), NARRATION.FALLBACK, s.id)

      const notice = narrationNotice('sat', resolved)
      assert.ok(notice && notice.length > 0, `${s.id}: Santali got no notice`)

      // The old notice was suppressed for exactly this reason, so assert the
      // suppression condition still holds and that we are no longer relying on it.
      assert.equal(
        scenarioContentIsEnglish('sat', s.id, SCENARIO_TRANSLATIONS),
        false,
        `${s.id}: content is not English, so the English notice must stay suppressed`
      )
    }
  })

  test('the notice names the language actually used, not English', () => {
    const notice = narrationNotice('sat', 'hi')
    assert.ok(notice.includes(nativeLangName('hi')), 'the notice must name Hindi')
    assert.ok(!notice.includes('{language}'), 'the placeholder was not substituted')
    // The whole point of the fallback-aware fix: do not claim English.
    assert.notEqual(notice, CONTENT_NOTICE.sat)
  })

  test('a genuine English fallback still gets the stronger notice', () => {
    const resolved = scenarioContentLanguage('fire-explosion', 'bn')
    assert.equal(resolved, 'en')
    assert.equal(narrationStatus('bn', resolved), NARRATION.ENGLISH)
    assert.equal(narrationNotice('bn', resolved), CONTENT_NOTICE.bn)
  })

  test('every language can render both notices', () => {
    for (const code of CODES) {
      assert.equal(typeof NARRATION_NOTICE[code], 'string', `NARRATION_NOTICE.${code}`)
      assert.ok(NARRATION_NOTICE[code].length > 0, `NARRATION_NOTICE.${code} empty`)
      assert.ok(
        NARRATION_NOTICE[code].includes('{language}'),
        `NARRATION_NOTICE.${code} must carry the {language} placeholder or it cannot name a language`
      )
      assert.equal(typeof CONTENT_NOTICE[code], 'string', `CONTENT_NOTICE.${code}`)
    }
  })

  test('an unknown language falls back to English copy rather than throwing', () => {
    const notice = narrationNotice('zz', 'hi')
    assert.ok(notice.includes(nativeLangName('hi')))
  })
})

/* ================================================================== */
describe('the fallback chain and the notice cannot drift apart', () => {
  test('every fallback target is a language the app actually has', () => {
    for (const [from, chain] of Object.entries(LANGUAGE_FALLBACK)) {
      assert.ok(CODES.includes(from), `${from} is not a shipped language`)
      for (const to of chain) {
        assert.ok(CODES.includes(to), `${from} -> ${to}: target is not a shipped language`)
        assert.ok(nativeLangName(to) !== 'English' || to === 'en', `${to} has no native name to show`)
      }
    }
  })

  test('a new mid-chain fallback would be named correctly without new copy', () => {
    // The notice is a template rather than a hardcoded "Hindi", so adding e.g.
    // bn: ['hi'] needs no new strings. Proven rather than assumed, because the
    // alternative is discovering it when the notice reads "{language}".
    for (const code of CODES) {
      const rendered = (NARRATION_NOTICE[code] || NARRATION_NOTICE.en).replace(
        '{language}',
        nativeLangName('bn')
      )
      assert.ok(rendered.includes(nativeLangName('bn')), code)
      assert.ok(!rendered.includes('{language}'), code)
    }
  })
})

/* ================================================================== */
describe('the spoken side matches the shown side', () => {
  test('Santali speech is a documented substitute, not a claim of Santali TTS', () => {
    assert.equal(SPEECH_LOCALE.sat, 'hi-IN')
    assert.equal(SPEECH_IS_SUBSTITUTE.sat, 'hi')
  })

  test('every shipped language has a speech locale', () => {
    for (const code of CODES) {
      assert.equal(typeof SPEECH_LOCALE[code], 'string', `no speech locale for ${code}`)
    }
  })

  test('the language a drill is spoken in is the language its text is in', () => {
    /*
     * Scenario.jsx passes `spokenIn` to speak(), not `lang`. It used to pass `lang`,
     * which told the engine "this is Santali" while handing it Hindi text. Harmless
     * only because both map to hi-IN — so this asserts the property that makes it
     * harmless, and will fail the day a real Santali voice is added without also
     * fixing the call sites.
     */
    for (const s of SCENARIOS) {
      const resolved = scenarioContentLanguage(s.id, 'sat')
      assert.equal(
        SPEECH_LOCALE[resolved],
        SPEECH_LOCALE.sat,
        `${s.id}: content resolves to ${resolved}, whose voice differs from Santali's — ` +
          'Scenario.jsx must pass the resolved language to speak()'
      )
    }
  })
})
