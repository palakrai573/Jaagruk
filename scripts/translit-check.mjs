// Verifies the Ol Chiki -> Devanagari transliteration used for Santali speech.
//
// Two things are checked, and they are different questions:
//
//  1. KNOWN WORDS. A table of Santali words whose expected Devanagari form was
//     worked out by hand. This is the correctness test. If the syllabification
//     logic breaks, these fail.
//
//  2. EVERY Ol Chiki STRING IN THE APP. Not against an expected value — nobody
//     hand-checks 240 strings — but against the property that must hold for the
//     output to be speakable at all: no Ol Chiki codepoint may survive into the
//     result, and no Devanagari matra may be left floating without a consonant
//     to attach to. A leftover Ol Chiki character is exactly the bug this module
//     exists to fix, so it must be impossible to reintroduce quietly.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { olChikiToDevanagari, hasOlChiki } from '../src/lib/olchiki.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

let failures = 0
const fail = (msg) => {
  failures += 1
  console.log('FAIL ' + msg)
}

/* ================================================================== */
/* 1. Known words                                                      */
/* ================================================================== */

// Hand-derived. The romanisation column is what a Hindi voice should produce.
const CASES = [
  ['\u1C66\u1C5F\u1C78', '\u0939\u093E\u0901', 'hã — yes. The case that proves syllabification: a character map gives हआं.'],
  ['\u1C75\u1C5F\u1C5D', '\u092C\u093E\u0902', 'baŋ — no. Final ᱝ becomes anusvara, not a ङ cluster.'],
  ['\u1C62\u1C64\u1C6B', '\u092E\u093F\u0926', 'mit — one.'],
  ['\u1C75\u1C5F\u1C68', '\u092C\u093E\u0930', 'bar — two.'],
  ['\u1C5A\u1C70\u1C5A\u1C60', '\u0905\u0921\u0915', 'odok — exit. Word-initial ᱚ is independent अ; the second is inherent.'],
  ['\u1C5C\u1C5A\u1C72\u1C5A', '\u0917\u0921\u093C', 'goṛo — help.'],
  ['\u1C61\u1C5F\u1C5C\u1C68\u1C69\u1C60', '\u091C\u093E\u0917\u094D\u0930\u0941\u0915', 'Jaagruk — the brand name. गर cluster needs virama.'],
  ['\u1C66\u1C64\u1C71\u1C6B\u1C64', '\u0939\u093F\u0928\u094D\u0926\u093F', 'hindi — the clearest cluster case: हिन्दि, not हिनदि.'],
  ['\u1C65\u1C5F\u1C71\u1C5B\u1C5F\u1C72\u1C64', '\u0938\u093E\u0928\u094D\u0924\u093E\u0921\u093C\u093F', 'Santali, the language name.'],
  ['\u1C60\u1C5F\u1C79\u1C62\u1C64', '\u0915\u093E\u092E\u093F', 'kami — work. ᱹ lengthens the preceding ा.'],
  ['\u1C5E\u1C5F\u1C79\u1C60\u1C5B\u1C64', '\u0932\u093E\u0915\u094D\u0924\u093F', 'lakti — needed.'],
  ['\u1C61\u1C5A\u1C60\u1C77\u1C5A\u1C62', '\u091C\u0916\u092E', 'jokhom — hazard. ᱷ folds क into ख rather than adding a syllable.'],
  ['\u1C5A\u1C72\u1C5F\u1C5C', '\u0905\u0921\u093C\u093E\u0917', 'oṛak — home.'],
  ['\u1C66\u1C69\u1C6D\u1C69\u1C5C\u1C7C\u1C5F', '\u0939\u0941\u092F\u0941\u0917\u093E', 'huyug-a — happens. PHAARKAA is silent and must not break the syllable.'],
]

console.log('=== 1. KNOWN WORDS ===')
for (const [ol, expected, note] of CASES) {
  const got = olChikiToDevanagari(ol)
  if (got === expected) {
    console.log(`  ok   ${ol}  ->  ${got}    ${note}`)
  } else {
    fail(`${ol}\n       expected ${expected}  ${[...expected].map((c) => c.codePointAt(0).toString(16)).join(' ')}\n       got      ${got}  ${[...got].map((c) => c.codePointAt(0).toString(16)).join(' ')}\n       ${note}`)
  }
}

/* ================================================================== */
/* 2. Every Ol Chiki string in the app                                 */
/* ================================================================== */

console.log('\n=== 2. EVERY Ol Chiki STRING IN THE APP ===')

const MATRAS = /[\u093E-\u094C\u0962\u0963]/
const sources = [
  'src/lib/i18n.js',
  'src/lib/i18nJaagruk.js',
  'src/lib/i18nSantali.js',
  'src/lib/scenarioTranslations.js',
  'src/lib/speech.js',
]

const strings = []
for (const rel of sources) {
  let text
  try {
    text = readFileSync(join(ROOT, rel), 'utf8')
  } catch {
    continue
  }
  // Every single- or double-quoted literal that contains Ol Chiki.
  for (const m of text.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
    const value = m[1] ?? m[2]
    if (value && hasOlChiki(value)) strings.push({ rel, value })
  }
}

let leftover = 0
let floating = 0
for (const { rel, value } of strings) {
  const got = olChikiToDevanagari(value)

  // The whole point: nothing Ol Chiki may reach the speech engine.
  if (hasOlChiki(got)) {
    leftover += 1
    if (leftover <= 5) {
      const chars = [...got].filter((c) => hasOlChiki(c))
      fail(`${rel}: Ol Chiki survived conversion: ${[...new Set(chars)].join(' ')}\n       in ${value.slice(0, 60)}`)
    }
  }

  // A matra with no consonant before it is an unattached vowel sign, which
  // renders as a dotted circle and is read as noise.
  for (let i = 0; i < got.length; i += 1) {
    if (!MATRAS.test(got[i])) continue
    const prev = got[i - 1]
    const isDevanagariLetter = prev && prev >= '\u0915' && prev <= '\u0939'
    const isNukta = prev === '\u093C'
    if (!isDevanagariLetter && !isNukta) {
      floating += 1
      if (floating <= 5) {
        fail(`${rel}: matra with nothing to attach to at index ${i}\n       ${got.slice(Math.max(0, i - 12), i + 12)}`)
      }
      break
    }
  }
}

console.log(`  ${strings.length} Ol Chiki strings converted`)
console.log(`  ${leftover} with Ol Chiki surviving`)
console.log(`  ${floating} with a floating matra`)

// A sample, so the output is reviewable by eye rather than purely assertional.
console.log('\n  sample:')
for (const { value } of strings.slice(0, 6)) {
  console.log(`    ${value.slice(0, 44)}\n      -> ${olChikiToDevanagari(value).slice(0, 60)}`)
}

console.log(
  failures === 0
    ? `\n${CASES.length} known words correct · ${strings.length} app strings clean\nTRANSLITERATION CHECK PASSED`
    : `\n${failures} failures`
)
process.exit(failures === 0 ? 0 : 1)
