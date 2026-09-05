// Generates the Santali review worksheet.
//
// WHAT CHANGED AND WHY IT MATTERS
// This script used to list the strings that had no Santali at all. There are none
// left — coverage is 100%. That does not mean the work is finished, it means the
// nature of the remaining work changed: from writing to checking. Every one of the
// 573 Santali strings is machine-authored and unreviewed, so the worksheet now
// covers all of them rather than a shrinking gap list.
//
// This is the same distinction the app itself now draws. SANTALI_VERIFIED in
// src/lib/i18nSantali.js is false, and the in-app notice keys off that flag rather
// than off the coverage percentage — otherwise reaching 100% would have silenced
// the warning and left the app quietly presenting unchecked safety text as a
// finished translation.
//
// Columns: the reviewer overwrites `santali_current` when it is wrong and uses
// `reviewer_note` for anything the English does not capture. English and Hindi are
// both provided as source, because a Jharkhand translator will usually find Hindi
// the more natural reference.
//
// Run: npm run santali:worksheet
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { t, SANTALI_VERIFIED } from '../src/lib/i18n.js'
import { SANTALI_STRINGS } from '../src/lib/i18nSantali.js'
import { SCENARIO_TRANSLATIONS } from '../src/lib/scenarioTranslations.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OL_CHIKI = /[\u1C50-\u1C7F]/

/* Ordered by consequence, not alphabetically. A wrong word in a live drill
   instruction or an AR prompt can put someone in the wrong place; a wrong word on
   the admin dashboard inconveniences a supervisor. Reviewers work top-down and run
   out of time at the bottom, so the bottom should be the cheap part. */
const PRIORITY = [
  ['1 · Drill and hazard instructions', ['buddy', 'sc', 'as', 'hz', 'scan', 'ar', 'gesture', 'bd', 'err']],
  ['2 · Worker-facing flows', ['ob', 'nav', 'home', 'st', 'set', 'site', 'rf', 'list', 'chat']],
  ['3 · Certification and records', ['cert', 'ch', 'chain', 'verify', 'vf']],
  ['4 · Supervisor surfaces', ['ad', 'admin', 'db', 'dash', 'anchor']],
]

const keys = new Set()
for (const rel of ['src/lib/i18n.js', 'src/lib/i18nJaagruk.js']) {
  const src = readFileSync(join(ROOT, rel), 'utf8')
  for (const m of src.matchAll(/^\s{2}([a-zA-Z][\w]*):\s*\{/gm)) keys.add(m[1])
}

const groupOf = (key) => {
  const prefix = key.split('_')[0]
  for (const [label, prefixes] of PRIORITY) {
    if (prefixes.includes(prefix)) return label
  }
  return '5 · Other'
}

const rows = [...keys]
  .map((key) => ({
    key,
    group: groupOf(key),
    en: t(key, 'en'),
    hi: t(key, 'hi'),
    sat: t(key, 'sat'),
    // Which file a correction belongs in, so a reviewer's edit lands in one place.
    file: SANTALI_STRINGS[key] !== undefined ? 'i18nSantali.js' : 'i18n.js / i18nJaagruk.js',
  }))
  .filter((r) => OL_CHIKI.test(r.sat))
  .sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key))

/* Excel opens a UTF-8 CSV as mojibake without a BOM, and a reviewer working in Ol
   Chiki would see nothing but boxes — which makes the worksheet useless for the one
   person it exists for. */
const BOM = '\uFEFF'
const cell = (v) => {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const header = ['group', 'key', 'english', 'hindi', 'santali_current', 'santali_corrected', 'reviewer_note', 'edit_in_file']
const lines = [header.join(',')]
for (const r of rows) lines.push([r.group, r.key, r.en, r.hi, r.sat, '', '', r.file].map(cell).join(','))

writeFileSync(join(ROOT, 'docs/santali-worksheet.csv'), BOM + lines.join('\r\n') + '\r\n', 'utf8')

const scenarioGaps = Object.entries(SCENARIO_TRANSLATIONS)
  .filter(([, langs]) => !langs.sat)
  .map(([id]) => id)

console.log(`docs/santali-worksheet.csv written — ${rows.length} strings for review`)
const counts = new Map()
for (const r of rows) counts.set(r.group, (counts.get(r.group) || 0) + 1)
for (const [group, n] of [...counts].sort()) console.log(`  ${String(n).padStart(3)}  ${group}`)

console.log(`\nVerified by a native speaker: ${SANTALI_VERIFIED ? 'yes' : 'NO — every row above is unchecked'}`)
console.log(`Scenario content with no Santali: ${scenarioGaps.length} of ${Object.keys(SCENARIO_TRANSLATIONS).length} modules`)
for (const id of scenarioGaps) console.log(`       ${id}`)
console.log(
  '\nScenario prose is not machine-authored. Drill content is where a wrong verb\n' +
    'changes what a worker does, so it resolves to Hindi and waits for a speaker.'
)
