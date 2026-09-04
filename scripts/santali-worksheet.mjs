// Generates the Santali translation worksheet.
//
// WHY THIS SCRIPT AND NOT 332 GENERATED STRINGS
// Santali UI coverage is 42%. Filling the other 332 slots with machine-produced
// Ol Chiki would take the coverage number to 100% and would be the wrong thing to
// do. This is safety training content: a mistranslated drill instruction teaches
// the wrong reaction, and a confident-looking wrong translation is harder to catch
// than a declared gap. The app already handles the gap correctly — Santali falls
// back to Hindi, which that population is far more likely to read than English,
// and the header says so in Ol Chiki.
//
// What was actually blocking a native speaker was not the writing, it was not
// having the list. This produces it: every missing key with its English and Hindi
// source, ordered so the highest-consequence surfaces come first, in a format a
// translator can open in a spreadsheet and hand back.
//
// Run: npm run santali:worksheet
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { t } from '../src/lib/i18n.js'
import { SCENARIO_TRANSLATIONS } from '../src/lib/scenarioTranslations.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OL_CHIKI = /[\u1C50-\u1C7F]/

/* Ordered by consequence, not alphabetically. A wrong word in a live drill
   instruction or an AR prompt can put someone in the wrong place; a wrong word on
   the admin dashboard inconveniences a supervisor. Translators work top-down and
   run out of time at the bottom, so the bottom should be the cheap part. */
const PRIORITY = [
  ['1 · Drill and hazard instructions', ['sc', 'as', 'hz', 'scan', 'ar', 'gesture', 'bd', 'buddy', 'err']],
  ['2 · Worker-facing flows', ['ob', 'nav', 'home', 'st', 'set', 'site', 'ref']],
  ['3 · Certification and records', ['cert', 'chain', 'verify']],
  ['4 · Supervisor surfaces', ['ad', 'admin', 'db']],
]

const keys = new Set()
for (const rel of ['src/lib/i18n.js', 'src/lib/i18nJaagruk.js']) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
  for (const m of src.matchAll(/^\s{2}([a-zA-Z][\w]*):\s*\{/gm)) keys.add(m[1])
}

const missing = [...keys].filter((k) => !OL_CHIKI.test(t(k, 'sat')))

const groupOf = (key) => {
  const prefix = key.split('_')[0]
  for (const [label, prefixes] of PRIORITY) {
    if (prefixes.includes(prefix)) return label
  }
  return '5 · Other'
}

const rows = missing
  .map((key) => ({ key, group: groupOf(key), en: t(key, 'en'), hi: t(key, 'hi') }))
  .sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key))

/* Excel opens a UTF-8 CSV as mojibake without a BOM, and a translator working in
   Ol Chiki would see nothing but boxes. */
const BOM = '\uFEFF'
const cell = (v) => {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const lines = [['group', 'key', 'english', 'hindi', 'santali_ol_chiki', 'reviewer_note'].join(',')]
for (const r of rows) lines.push([r.group, r.key, r.en, r.hi, '', ''].map(cell).join(','))

const csvPath = join(ROOT, 'docs/santali-worksheet.csv')
writeFileSync(csvPath, BOM + lines.join('\r\n') + '\r\n', 'utf8')

/* Scenario content is tracked separately because it is prose, not labels, and
   because it is the part with real safety consequences. */
const scenarioGaps = Object.entries(SCENARIO_TRANSLATIONS)
  .filter(([, langs]) => !langs.sat)
  .map(([id]) => id)

console.log(`docs/santali-worksheet.csv written — ${rows.length} strings`)
const counts = new Map()
for (const r of rows) counts.set(r.group, (counts.get(r.group) || 0) + 1)
for (const [group, n] of [...counts].sort()) console.log(`  ${String(n).padStart(3)}  ${group}`)
console.log(`\nScenario content with no Santali: ${scenarioGaps.length} modules`)
for (const id of scenarioGaps) console.log(`       ${id}`)
console.log(
  '\nThese resolve to Hindi at runtime, not English, so the gap degrades to the\n' +
    'most readable available language rather than the least.'
)
