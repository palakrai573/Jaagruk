// Translation integrity gate.
//
// Coverage percentages are only worth reporting if they mean something. This
// checks the things that make them meaningless:
//
//  1. A translation that is really the English string, sitting in another
//     language's slot. The coverage audit counts any non-empty value, so a copied
//     English string reports as translated. Four nav labels did exactly this and
//     inflated Santali coverage while showing Latin script to a Santali reader.
//
//  2. A value written in the wrong script for its language. Santali must be Ol
//     Chiki, Hindi must be Devanagari, and so on. Loanwords and identifiers
//     legitimately contain Latin ("URL", "CSV", "https"), so the test is that the
//     value contains *some* of its own script, not that it is free of Latin.
//
//  3. A fallback chain that does not terminate in a language with full coverage,
//     which would let a screen fall through to a raw key name.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGUAGES, LANGUAGE_FALLBACK, t, allCoverage, fallbackLanguage } from '../src/lib/i18n.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

let failures = 0
const fail = (msg) => {
  failures += 1
  console.log('FAIL ' + msg)
}
const ok = (msg) => console.log('  ok   ' + msg)

/* Script ranges each language must show at least some of. */
const SCRIPT = {
  hi: { name: 'Devanagari', re: /[\u0900-\u097F]/ },
  sat: { name: 'Ol Chiki', re: /[\u1C50-\u1C7F]/ },
  bn: { name: 'Bengali', re: /[\u0980-\u09FF]/ },
  or: { name: 'Odia', re: /[\u0B00-\u0B7F]/ },
  ur: { name: 'Urdu', re: /[\u0600-\u06FF]/ },
}

// Collect every key from the dictionary sources so each can be inspected per
// language. Reading the source rather than importing the objects keeps the
// dictionaries private to their module.
const keys = new Set()
for (const rel of ['src/lib/i18n.js', 'src/lib/i18nJaagruk.js']) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
  for (const m of src.matchAll(/^\s{2}([a-zA-Z][\w]*):\s*\{/gm)) keys.add(m[1])
}

/* A bare acronym is script-neutral and correctly identical across languages.
 * "AR" is the one that matters here: transliterated to Ol Chiki it becomes ᱟᱨ,
 * which is the Santali word for "and" — so the faithful rendering is the confusing
 * one. Deliberately narrow: uppercase Latin and digits only, no spaces, 5 chars
 * max, so it cannot quietly cover a real English word. */
const ACRONYM = /^[A-Z0-9]{1,5}$/

console.log(`=== 1. NO ENGLISH TEXT IN A NON-ENGLISH SLOT (${keys.size} keys) ===`)
const copies = []
for (const key of keys) {
  const en = t(key, 'en')
  if (!en || en === key) continue
  if (ACRONYM.test(en)) continue
  for (const { code } of LANGUAGES) {
    if (code === 'en') continue
    // t() applies the fallback chain, so an identical result may simply be the
    // fallback working. Compare against the fallback's value to tell them apart.
    const value = t(key, code)
    if (value !== en) continue
    const viaFallback = t(key, fallbackLanguage(code)) === en
    if (viaFallback) continue
    copies.push(`${key} [${code}] = ${JSON.stringify(en.slice(0, 48))}`)
  }
}
if (copies.length === 0) ok('no English string is stored as another language')
else fail(`English text stored as a translation (${copies.length}):\n       ` + copies.slice(0, 15).join('\n       '))

console.log('\n=== 2. VALUES USE THEIR OWN SCRIPT ===')
const wrongScript = []
for (const key of keys) {
  const en = t(key, 'en')
  for (const [code, { name, re }] of Object.entries(SCRIPT)) {
    const value = t(key, code)
    // Only judge values that are genuinely authored for this language: if t()
    // returned the English or fallback string, that is a coverage gap, which
    // check 1 and the coverage report already cover.
    if (!value || value === en) continue
    if (value === t(key, fallbackLanguage(code))) continue
    // A value that is only digits, punctuation or an identifier is script-neutral.
    if (!/[a-zA-Z\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u1C50-\u1C7F]/.test(value)) continue
    if (!re.test(value)) wrongScript.push(`${key} [${code}] expected ${name}: ${JSON.stringify(value.slice(0, 48))}`)
  }
}
if (wrongScript.length === 0) ok('every authored value contains its own script')
else fail(`values in the wrong script (${wrongScript.length}):\n       ` + wrongScript.slice(0, 15).join('\n       '))

console.log('\n=== 3. FIGURES SURVIVE TRANSLATION ===')
/* A translation may reword anything, but it must not drop a figure, because a
 * figure is the part that cannot be paraphrased: "4 to 6 digits" without the 4 and
 * the 6 is not a rule, "Mines Act 1952" without 1952 cites nothing, and "all 5
 * domains" without the 5 is not a threshold. These are exactly what a bulk
 * authoring pass loses quietly, and every language in this app writes numerals the
 * same way, so the comparison is sound.
 *
 * Acronyms are deliberately NOT checked. Indic scripts transliterate them —
 * Hindi writes AI as एआई and API as एपीआई — so requiring the Latin form would fail
 * 158 correct translations and teach everyone to ignore this check. */
const NUMBER = /\d+/g

/* Bengali writes 4 as ৪ and Odia as ୪, which is correct and idiomatic — a naive
 * substring test reads that as a dropped figure and flagged 15 perfectly good
 * translations. Digits are folded to Latin before comparing, so the check asks
 * whether the FIGURE is present, not which numeral system renders it. */
const DIGIT_BASES = [0x0966, 0x09e6, 0x0b66, 0x0660, 0x06f0, 0x0a66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x1c50]
const foldDigits = (s) =>
  [...String(s)]
    .map((ch) => {
      const code = ch.codePointAt(0)
      for (const base of DIGIT_BASES) {
        if (code >= base && code <= base + 9) return String(code - base)
      }
      return ch
    })
    .join('')

const dropped = []
for (const key of keys) {
  const en = t(key, 'en')
  if (!en) continue
  const wanted = [...new Set(en.match(NUMBER) || [])]
  if (!wanted.length) continue
  for (const { code } of LANGUAGES) {
    if (code === 'en') continue
    const value = t(key, code)
    // Only judge an authored value; a fallback is a coverage matter, not this.
    if (!value || value === en || value === t(key, fallbackLanguage(code))) continue
    const folded = foldDigits(value)
    const missing = wanted.filter((tok) => !folded.includes(tok))
    if (missing.length) dropped.push(`${key} [${code}] lost ${missing.join(', ')}`)
  }
}
if (dropped.length === 0) ok('every figure is carried through')
else fail(`dropped figures (${dropped.length}):\n       ` + dropped.slice(0, 20).join('\n       '))

console.log('\n=== 4. FALLBACK CHAINS TERMINATE IN FULL COVERAGE ===')
const coverage = Object.fromEntries(allCoverage().map((c) => [c.code, c.percent]))
for (const [lang, chain] of Object.entries(LANGUAGE_FALLBACK)) {
  const last = chain[chain.length - 1]
  const pct = coverage[last]
  if (pct === 100) ok(`${lang} -> ${chain.join(' -> ')} -> en   (${last} is at ${pct}%)`)
  else
    fail(
      `${lang} falls back to ${last}, which is only ${pct}% covered. ` +
        `The notice shown to a ${lang} user names ${last}, so any gap there is a screen ` +
        `that silently reaches a third language or a raw key.`
    )
}

console.log('\n=== 5. EVERY GLYPH IS IN A SHIPPED FONT SUBSET ===')
/* The app self-hosts one subset per script and precaches only some of them, so a
 * character outside those subsets renders as a box — on a device with no network,
 * permanently. Nothing in static review shows that, and nothing in the build fails,
 * which makes it exactly the kind of fault worth a gate.
 *
 * Checked per language against the subset that language ships, plus ASCII and the
 * handful of shared punctuation marks the Latin subset carries. */
const SUBSET = {
  hi: [[0x0900, 0x097f]],
  sat: [[0x1c50, 0x1c7f]],
  bn: [[0x0980, 0x09ff]],
  or: [[0x0b00, 0x0b7f]],
  ur: [[0x0600, 0x06ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff]],
}
// Punctuation and marks that come with the Latin subset.
const SHARED = new Set([
  0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2713, 0x00b7, 0x00a0,
  0x0964, 0x0965, // danda and double danda, used by several Indic scripts
  0x200c, 0x200d, // ZWNJ / ZWJ, needed for correct Indic shaping
])

const boxes = new Map()
for (const key of keys) {
  for (const [code, ranges] of Object.entries(SUBSET)) {
    const value = t(key, code)
    if (!value || value === t(key, 'en')) continue
    for (const ch of value) {
      const c = ch.codePointAt(0)
      if (c < 0x80 || SHARED.has(c)) continue
      if (ranges.some(([lo, hi]) => c >= lo && c <= hi)) continue
      const label = `[${code}] U+${c.toString(16).toUpperCase().padStart(4, '0')} ${ch}`
      boxes.set(label, (boxes.get(label) || 0) + 1)
    }
  }
}
if (boxes.size === 0) ok('no character falls outside its language\u2019s shipped subset')
else fail(`characters with no glyph in the shipped fonts (${boxes.size}):\n       ` + [...boxes].map(([l, n]) => `${l} \u00d7${n}`).slice(0, 15).join('\n       '))

console.log('\n=== 6. COVERAGE REPORT ===')
for (const c of allCoverage()) {
  const flag = c.percent === 100 ? '   ' : c.percent >= 92 ? ' · ' : ' ! '
  console.log(
    `${flag}${c.code.padEnd(4)} ${String(c.percent).padStart(3)}%  ` +
      `${String(c.translated).padStart(3)}/${c.total}` +
      (c.missing ? `  ${c.missing} missing -> shown in ${fallbackLanguage(c.code)}` : '')
  )
}

console.log('\n=== 7. SELF-TEST ===')
/* Checks 1 and 2 pass because the faults they look for were fixed. That is not
 * the same as the checks working. These are the four values that actually sat in
 * the `sat` slot before this gate existed, plus a wrong-script case, run through
 * the same predicates. If a check stops firing on them it has gone blind. */
const HISTORICAL_BAD = [
  ['nav_scan', 'sat', 'Hazard Scan'],
  ['nav_train', 'sat', 'Simulator'],
  ['nav_dashboard', 'sat', 'Dashboard'],
  ['nav_settings', 'sat', 'Settings'],
]

const isEnglishCopy = (key, value) => value === t(key, 'en')
const isWrongScript = (lang, value) => {
  const spec = SCRIPT[lang]
  if (!spec) return false
  if (!/[a-zA-Z\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u1C50-\u1C7F]/.test(value)) return false
  return !spec.re.test(value)
}

let caught = 0
for (const [key, lang, value] of HISTORICAL_BAD) {
  const byCopy = isEnglishCopy(key, value)
  const byScript = isWrongScript(lang, value)
  if (byCopy || byScript) {
    caught += 1
    ok(`${key} [${lang}] = ${JSON.stringify(value)} — caught by ${[byCopy && 'check 1', byScript && 'check 2'].filter(Boolean).join(' and ')}`)
  } else {
    fail(`${key} [${lang}] = ${JSON.stringify(value)} would now pass unnoticed`)
  }
}
// A correct value must NOT be flagged, or the checks are just noise.
const goodSamples = [
  ['nav_scan', 'sat', t('nav_scan', 'sat')],
  ['nav_home', 'hi', t('nav_home', 'hi')],
]
for (const [key, lang, value] of goodSamples) {
  if (isEnglishCopy(key, value) || isWrongScript(lang, value)) {
    fail(`${key} [${lang}] = ${JSON.stringify(value)} is correct but was flagged`)
  } else {
    ok(`${key} [${lang}] = ${JSON.stringify(value)} — correctly not flagged`)
  }
}
console.log(`  ${caught}/${HISTORICAL_BAD.length} historical faults still detected`)

/* Check 3 needs its own proof, because it passes only after digit folding was
 * added — and a folding bug that folded too eagerly would also make it pass. */
const figureCases = [
  ['4 to 6 digits', 'ᱯᱤᱱ 4 ᱠᱷᱚᱱ 6', false, 'Latin figures present'],
  ['4 to 6 digits', '৪ থেকে ৬ সংখ্যা', false, 'Bengali numerals count as the same figures'],
  ['4 to 6 digits', 'ᱯᱤᱱ ᱚᱞ ᱢᱮ', true, 'figures genuinely missing'],
  ['Mines Act 1952', 'ᱠᱷᱟᱰ ᱠᱟᱱᱩᱱ 1952', false, 'statute year preserved'],
  ['Mines Act 1952', 'ᱠᱷᱟᱰ ᱠᱟᱱᱩᱱ', true, 'statute year dropped'],
]
for (const [en, translated, shouldFail, note] of figureCases) {
  const wanted = [...new Set(en.match(NUMBER) || [])]
  const folded = foldDigits(translated)
  const missing = wanted.filter((tok) => !folded.includes(tok))
  const didFail = missing.length > 0
  if (didFail === shouldFail) ok(`figures: ${note}`)
  else fail(`figure check wrong on "${translated}" — ${note}`)
}

console.log(failures === 0 ? '\nI18N GATE PASSED' : `\n${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
