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
import { SCENARIOS } from '../src/lib/scenarios.js'

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

/* ================================================================== */
/* Scenario content — a second worksheet, and a different kind of task */
/* ================================================================== */

/*
 * WHY THIS IS SEPARATE, AND WHY IT IS EMPTY RATHER THAN MACHINE-FILLED
 *
 * The worksheet above is a CHECKING task: every row already has Santali in it and
 * the reviewer's job is to correct what is wrong. This one is a WRITING task: there
 * is no Santali to correct, because none was ever authored.
 *
 * That was a deliberate decision and it still holds. A UI label that reads oddly is
 * a papercut. A drill instruction is the thing a worker acts on — "leave the
 * extinguisher and evacuate" and "use the extinguisher then evacuate" differ by one
 * word and by a life — and it is READ ALOUD, so a worker who cannot check it against
 * the screen has no way to notice it is wrong. Machine-authoring 300-odd lines of
 * that and shipping it unreviewed would be worse than the current Hindi fallback,
 * which is at least correct Hindi in the language of schooling in Jharkhand.
 *
 * But "waits for a speaker" was not a plan, it was a sentence. Until now this script
 * only PRINTED that nine modules had no Santali; it never produced anything a
 * speaker could work from. This does: every translatable string, in order, with both
 * source languages and an addressable path so a filled-in column can be imported
 * back without anyone matching prose by eye.
 */
const scenarioRows = []
for (const scenario of SCENARIOS) {
  const hi = SCENARIO_TRANSLATIONS[scenario.id]?.hi
  const push = (path, field, en, hindi) => {
    if (!en) return
    scenarioRows.push({ module: scenario.id, path, field, en, hi: hindi || '' })
  }

  push(`${scenario.id}.title`, 'title', scenario.title, hi?.title)
  push(`${scenario.id}.intro`, 'intro', scenario.intro, hi?.intro)

  scenario.steps.forEach((step, i) => {
    push(`${scenario.id}.steps[${i}].prompt`, 'prompt', step.prompt, hi?.steps?.[i]?.prompt)
    step.choices.forEach((choice, j) => {
      push(
        `${scenario.id}.steps[${i}].choices[${j}].text`,
        'option',
        choice.text,
        hi?.steps?.[i]?.choices?.[j]?.text
      )
      push(
        `${scenario.id}.steps[${i}].choices[${j}].feedback`,
        'feedback',
        choice.feedback,
        hi?.steps?.[i]?.choices?.[j]?.feedback
      )
    })
  })
}

const scenarioHeader = ['module', 'path', 'field', 'english', 'hindi', 'santali_new', 'translator_note']
const scenarioLines = [scenarioHeader.join(',')]
for (const r of scenarioRows) {
  scenarioLines.push([r.module, r.path, r.field, r.en, r.hi, '', ''].map(cell).join(','))
}
writeFileSync(
  join(ROOT, 'docs/santali-scenario-worksheet.csv'),
  BOM + scenarioLines.join('\r\n') + '\r\n',
  'utf8'
)

const byField = new Map()
for (const r of scenarioRows) byField.set(r.field, (byField.get(r.field) || 0) + 1)

console.log(
  `\ndocs/santali-scenario-worksheet.csv written — ${scenarioRows.length} strings to TRANSLATE (not check)`
)
for (const [field, n] of [...byField].sort()) console.log(`  ${String(n).padStart(3)}  ${field}`)
console.log(`\nScenario content with no Santali: ${scenarioGaps.length} of ${Object.keys(SCENARIO_TRANSLATIONS).length} modules`)
for (const id of scenarioGaps) console.log(`       ${id}`)
console.log(
  '\nUntil that column is filled by a Santali speaker, a worker who picks Santali is\n' +
    'shown and read these drills in Hindi. The app now says so on the module list and\n' +
    'again at the start of every drill, in Santali — see narrationNotice() in i18n.js.'
)
