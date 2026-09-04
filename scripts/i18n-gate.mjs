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

console.log(`=== 1. NO ENGLISH TEXT IN A NON-ENGLISH SLOT (${keys.size} keys) ===`)
const copies = []
for (const key of keys) {
  const en = t(key, 'en')
  if (!en || en === key) continue
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

console.log('\n=== 3. FALLBACK CHAINS TERMINATE IN FULL COVERAGE ===')
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

console.log('\n=== 4. COVERAGE REPORT ===')
for (const c of allCoverage()) {
  const flag = c.percent === 100 ? '   ' : c.percent >= 92 ? ' · ' : ' ! '
  console.log(
    `${flag}${c.code.padEnd(4)} ${String(c.percent).padStart(3)}%  ` +
      `${String(c.translated).padStart(3)}/${c.total}` +
      (c.missing ? `  ${c.missing} missing -> shown in ${fallbackLanguage(c.code)}` : '')
  )
}

console.log('\n=== 5. SELF-TEST ===')
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

console.log(failures === 0 ? '\nI18N GATE PASSED' : `\n${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
