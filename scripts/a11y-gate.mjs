// Phase 6: accessibility and responsive audit.
//
// WHAT THIS CAN AND CANNOT DO
// It is static analysis, so it catches structural faults — an icon button with no
// accessible name, an input with no label, a width that cannot fit 320px, an
// animation with no reduced-motion escape. It cannot tell you whether something
// LOOKS right. Actual rendered layout still needs a device, and the checklist for
// that is in docs/DEPLOYMENT.md.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGUAGES, t } from '../src/lib/i18n.js'

// Paths resolve from this file rather than the working directory, so the gate
// gives the same answer whether it runs via npm from the root or directly.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const resolve = (p) => join(ROOT, p)

let pass = 0
const findings = []
const report = (severity, label, detail) => {
  findings.push({ severity, label, detail })
  console.log(`${severity} ${label}${detail ? '\n     ' + detail : ''}`)
}
const ok = (label, cond, detail, severity = 'FAIL') => {
  if (cond) pass += 1
  else report(severity, label, detail)
}

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const files = []
;(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const full = join(dir, n)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.jsx$/.test(full)) files.push({ path: relative(ROOT, full).replace(/\\/g, '/'), src: strip(readFileSync(full, 'utf8')) })
  }
})(resolve('src'))

/* SELF-TEST
 * A gate that passes because its regex never matches anything is worse than no
 * gate, because it reports safety it never checked. With SELFTEST=1 a synthetic
 * file containing one known instance of each fault is appended to the set, and
 * every check is then expected to fail. If a check still passes under SELFTEST it
 * is not looking at what it claims to look at.
 */
// argv rather than an env var: `SELFTEST=1 node …` is not valid on PowerShell, and
// pulling in cross-env for one flag is not worth a dependency.
const SELFTEST = process.argv.includes('--selftest')
const SELFTEST_PATH = 'src/pages/__selftest.jsx'
if (SELFTEST) {
  files.push({
    path: SELFTEST_PATH,
    src: `
      <button type="button" onClick={() => x()} className="px-2 py-1 text-xs">\u2715</button>
      <input type="text" value={v} onChange={e => set(e)} />
      <svg viewBox="0 0 4 4"><path d="M0 0" /></svg>
      <div tabIndex={3} />
      <div className="min-w-[900px] ml-4 text-left left-2" />
      <span style={{ background: 'rgba(255,255,255,0.05)' }}>x</span>
      <h1>a</h1><h4>b</h4>
    `,
  })
}

/* Split a file into JSX element open-tags so attributes can be inspected together. */
function elements(src, tag) {
  const out = []
  const re = new RegExp(`<${tag}\\b`, 'g')
  let m
  while ((m = re.exec(src))) {
    // Walk to the matching '>' accounting for nested braces in expressions.
    let i = m.index + m[0].length
    let depth = 0
    let quote = null
    while (i < src.length) {
      const ch = src[i]
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch
      else if (ch === '{') depth += 1
      else if (ch === '}') depth -= 1
      else if (ch === '>' && depth === 0) break
      i += 1
    }
    out.push({ index: m.index, attrs: src.slice(m.index, i + 1) })
  }
  return out
}

/* Return only the text nodes of a JSX fragment, with tag markup removed.
 *
 * The obvious `frag.replace(/<[^>]*>/g, ' ')` is wrong, and wrong in the
 * direction that matters. An attribute such as `onClick={() => close()}`
 * contains a '>' inside the arrow, so the character class stops there and the
 * remainder of the open tag — `close()} className="...">` — survives as if it
 * were visible text. Any button with an arrow-function handler therefore looked
 * like it had a text label. That is exactly how a genuinely unnamed close
 * button passed this check.
 */
function textOf(frag) {
  let text = ''
  let i = 0
  while (i < frag.length) {
    if (frag[i] !== '<') {
      text += frag[i]
      i += 1
      continue
    }
    let depth = 0
    let quote = null
    let j = i + 1
    while (j < frag.length) {
      const ch = frag[j]
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch
      else if (ch === '{') depth += 1
      else if (ch === '}') depth -= 1
      else if (ch === '>' && depth === 0) {
        j += 1
        break
      }
      j += 1
    }
    i = j
  }
  return text
}

const SCRIPTS = 'A-Za-z\u0900-\u097F\u1C50-\u1C7F\u0980-\u09FF\u0B00-\u0B7F\u0600-\u06FF'

console.log('=== 1. ACCESSIBLE NAMES ON ICON-ONLY CONTROLS ===')
// A button whose only child is an icon needs aria-label or visually-hidden text,
// otherwise a screen reader announces "button" and nothing else.
// The Button primitive's name comes from `children` supplied by each caller, so it
// cannot carry one itself. Callers are checked; the primitive is exempt.
const NAME_EXEMPT = new Set(['src/components/ui/Button.jsx'])

// A local wrapper such as `RoleButton({ label })` or `FilterChip({ label })` is
// named by whatever the caller passes. Rendering a name-bearing prop counts, and
// so does a member expression like `{l.native}` in the language picker, where the
// visible text comes off an item in a mapped list.
const NAME_PROP = /\{\s*[\w.]*\b(?:label|children|title|text|name|native|value)\b/

const unnamed = []
for (const { path, src } of files) {
  if (NAME_EXEMPT.has(path)) continue
  for (const el of elements(src, 'button')) {
    const a = el.attrs
    if (/aria-label|aria-labelledby|title=/.test(a)) continue
    const close = src.indexOf('</button>', el.index)
    // Body starts after the open tag, using the length the brace-aware scanner
    // already measured rather than re-parsing it.
    const body = close === -1 ? '' : src.slice(el.index + a.length, close)
    const text = textOf(body)
    const hasSrOnly = /sr-only/.test(body)
    // `t(` anywhere in the text, not `{t(` — a ternary like
    // `{saved ? t('a') : t('b')}` is still a translated accessible name, and
    // requiring the brace immediately before produced a dozen false positives.
    const hasTranslatedChild = /\bt\(/.test(text)
    const hasNameProp = NAME_PROP.test(text)
    // Literal words, once JSX expressions are removed.
    const hasLiteralText = new RegExp(`[${SCRIPTS}]{2,}`).test(text.replace(/\{[^{}]*\}/g, ' '))
    if (!hasSrOnly && !hasTranslatedChild && !hasNameProp && !hasLiteralText) {
      unnamed.push(`${path}: ${a.slice(0, 78).replace(/\s+/g, ' ')}`)
    }
  }
}
ok('every button has an accessible name', unnamed.length === 0, unnamed.join('\n     '))

console.log('\n=== 2. FORM CONTROLS ARE LABELLED ===')
/* A control is labelled if any of these hold:
 *   - aria-label / aria-labelledby
 *   - it spreads the Field primitive's wiring, which supplies id + describedby
 *   - it carries an id that some <label htmlFor> points at
 *   - it is nested inside a <label>, which associates implicitly
 * Everything else is announced as an unnamed edit box.
 */
const unlabelled = []
for (const { path, src } of files) {
  // Every id a label in this file points at.
  const labelled = new Set([...src.matchAll(/htmlFor=\{([A-Za-z_$][\w$]*)\}/g)].map((m) => m[1]))

  for (const tag of ['input', 'textarea', 'select']) {
    for (const el of elements(src, tag)) {
      const a = el.attrs
      if (/type=["']hidden["']/.test(a)) continue

      // A file input styled `hidden` is display:none, so it is absent from both
      // the accessibility tree and the tab order. It is reached only by the
      // visible button that calls .click() on it, and that button carries the
      // name. Labelling the input itself would announce a control nobody can
      // focus.
      if (/type=["']file["']/.test(a) && /className="hidden"/.test(a)) continue

      if (/aria-label|aria-labelledby|\{\.\.\.wiring\}|\{\.\.\.rest\}|\{\.\.\.inputProps\}|\{\.\.\.props\}/.test(a)) continue

      const idMatch = a.match(/\bid=\{([A-Za-z_$][\w$]*)\}/)
      if (idMatch && labelled.has(idMatch[1])) continue

      // Implicit association: <label>…<input/>…</label>. True when the closest
      // <label before the control is not yet closed.
      const before = src.slice(0, el.index)
      const openAt = before.lastIndexOf('<label')
      const closeAt = before.lastIndexOf('</label>')
      if (openAt !== -1 && openAt > closeAt) continue

      unlabelled.push(`${path}: <${tag} ${a.slice(tag.length + 2, 78).replace(/\s+/g, ' ')}`)
    }
  }
}
ok('every form control is labelled', unlabelled.length === 0, unlabelled.join('\n     '))

console.log('\n=== 3. DECORATIVE SVG IS HIDDEN FROM ASSISTIVE TECH ===')
const nakedSvg = []
for (const { path, src } of files) {
  for (const el of elements(src, 'svg')) {
    const a = el.attrs
    if (/aria-hidden|role=["']img["']|aria-label/.test(a)) continue
    const close = src.indexOf('</svg>', el.index)
    const body = close === -1 ? '' : src.slice(el.index, close)
    if (/<title/.test(body)) continue
    nakedSvg.push(`${path}: ${a.slice(0, 70).replace(/\s+/g, ' ')}`)
  }
}
ok('every svg is aria-hidden or has a name', nakedSvg.length === 0, nakedSvg.join('\n     '))

console.log('\n=== 4. NO POSITIVE tabIndex ===')
const badTab = []
for (const { path, src } of files) {
  for (const m of src.matchAll(/tabIndex=\{(\d+)\}/g)) {
    if (Number(m[1]) > 0) badTab.push(`${path}: tabIndex={${m[1]}}`)
  }
}
ok('no positive tabIndex (would break focus order)', badTab.length === 0, badTab.join('\n     '))

console.log('\n=== 5. REDUCED MOTION ESCAPE FOR EVERY ANIMATION ===')
const css = readFileSync(resolve('src/index.css'), 'utf8')
const reducedSections = css.split('prefers-reduced-motion').slice(1).join('\n')
// Animation classes the app defines and uses.
const animClasses = [...css.matchAll(/^\.([a-z-]+)\s*\{[^}]*animation:/gm)].map((m) => m[1])
const missingEscape = animClasses.filter((c) => !reducedSections.includes(c))
ok(
  `all ${animClasses.length} animated classes are disabled under reduced motion`,
  missingEscape.length === 0,
  missingEscape.join(', ')
)
ok('reveal is reset to visible, not left hidden', /opacity:\s*1\s*!important/.test(reducedSections))

console.log('\n=== 6. WIDTH BUDGET AT 320px ===')
// Page container 280px after px-5; a p-5 card leaves ~240px, a p-6 card ~232px.
const NARROW = 232
const tooWide = []
for (const { path, src } of files) {
  for (const m of src.matchAll(/\bmin-w-\[(\d+)px\]/g)) {
    if (Number(m[1]) > NARROW) tooWide.push(`${path}: ${m[0]}`)
  }
}
ok(`no min-width above ${NARROW}px`, tooWide.length === 0, tooWide.join('\n     '))

console.log('\n=== 7. RTL ===')
// ARDrill draws over a live camera feed. A marker on the physical left of the
// frame stays on the left whatever the reading direction of the UI — camera space
// is not text space — so its positional classes are correct as physical.
const RTL_EXEMPT = new Set(['src/components/ARDrill.jsx'])

const physical = []
for (const { path, src } of files) {
  if (RTL_EXEMPT.has(path)) continue
  // `left-1/2` paired with `-translate-x-1/2` is the horizontal-centring idiom.
  // Transforms are unaffected by `dir`, so it behaves identically in RTL and is
  // not a bug — strip those pairs before checking.
  const cleaned = src.replace(/left-1\/2(\s+[-\w:[\]/]+)*\s+-translate-x-1\/2/g, ' ')

  const hits = [
    ...(cleaned.match(/\b(?:ml|mr|pl|pr)-(?:\d|px|auto)/g) || []),
    ...(cleaned.match(/\btext-(?:left|right)\b/g) || []),
    ...(cleaned.match(/\b(?:left|right)-(?:\d|px|\[)/g) || []),
    ...(cleaned.match(/\b(?:rounded-[lr]|border-[lr])-\d/g) || []),
  ]
  if (hits.length) physical.push(`${path}: ${[...new Set(hits)].join(', ')}`)
}
ok('no physical directional utilities', physical.length === 0, physical.join('\n     '))

// Directional glyphs must be mirrored, since the character carries a direction
// that logical properties cannot fix.
const glyphs = []
for (const { path, src } of files) {
  // ARDrill's chevrons point at the physical edge of the camera frame where an
  // off-screen marker lies. That is a real-world direction, not a reading
  // direction, so mirroring them would point at the wrong wall.
  if (RTL_EXEMPT.has(path)) continue
  for (const m of src.matchAll(/[^\w]([→←›‹»«])[^\w]/g)) {
    const line = src.slice(Math.max(0, m.index - 200), m.index + 60)
    if (!/rtl:|flipForDir|-scale-x/.test(line)) glyphs.push(`${path}: ${m[1]}`)
  }
}
ok('directional glyphs are mirrored for RTL', glyphs.length === 0, glyphs.join('\n     '), 'WARN')

console.log('\n=== 8. LIVE REGIONS ON ASYNC STATUS ===')
const statusFiles = ['src/App.jsx', 'src/pages/Dashboard.jsx', 'src/components/ui/Toast.jsx']
for (const path of statusFiles) {
  const src = files.find((f) => f.path === path)?.src || ''
  ok(`${path}: has an aria-live region`, /aria-live=/.test(src))
}

console.log('\n=== 9. TRANSLATION LENGTH PRESSURE ===')
// Six languages, and the same key can be twice as long in one of them. A label in
// a narrow fixed column is where that shows up as a broken layout.
const LONGEST = []
for (const key of ['m_readiness', 'm_domains', 'm_due', 'm_reports', 'm_zones', 'nav_report', 'nav_refresher', 'as_time_pressure']) {
  const lengths = LANGUAGES.map(({ code }) => ({ code, len: String(t(key, code) || '').length }))
  const max = lengths.reduce((a, b) => (b.len > a.len ? b : a))
  const en = lengths.find((l) => l.code === 'en').len
  LONGEST.push(`${key.padEnd(18)} en ${String(en).padStart(2)}  worst ${max.code} ${String(max.len).padStart(2)}  (${Math.round((max.len / Math.max(1, en)) * 100)}%)`)
}
console.log('     ' + LONGEST.join('\n     '))
ok('translation length pressure recorded', true)

console.log('\n=== 10. FIELD-TIER TOUCH TARGETS ===')
/* Field tier promises a 56px minimum (--touch-min) because these screens are used
 * at the gate and underground with gloves on. A button with small vertical padding
 * and small type cannot reach that on its own, so it must say min-h-touch
 * explicitly. Only <button> is checked — a padded <span> badge is not a target.
 */
const FIELD_TIER = [
  'src/pages/Onboarding.jsx',
  'src/pages/BuddyDrill.jsx',
  'src/pages/Scenario.jsx',
  'src/pages/ReportHazard.jsx',
  'src/pages/HazardScan.jsx',
  'src/components/DrillUI.jsx',
  ...(SELFTEST ? [SELFTEST_PATH] : []),
]
const SMALL_PAD = /\bpy-(?:0\.5|1|1\.5|2|2\.5)\b/
const smallTargets = []
for (const path of FIELD_TIER) {
  const src = files.find((f) => f.path === path)?.src
  if (src === undefined) {
    smallTargets.push(`${path}: not found — the tier list is stale`)
    continue
  }
  for (const el of elements(src, 'button')) {
    const a = el.attrs
    if (!SMALL_PAD.test(a)) continue
    if (/min-h-touch|min-h-\[|\bh-1[0-9]\b|\bh-touch\b/.test(a)) continue
    smallTargets.push(`${path}: ${(a.match(/className=(?:"[^"]*"|\{[^]*)/) || [a])[0].slice(0, 96).replace(/\s+/g, ' ')}`)
  }
}
ok(`field-tier buttons reach the ${'56px'} minimum`, smallTargets.length === 0, smallTargets.join('\n     '))

console.log('\n=== 11. NO THEME-BLIND COLOUR LITERALS ===')
/* A hardcoded white overlay is invisible on the light theme and a hardcoded black
 * one is invisible on the dark theme, so either one means a surface that only
 * works in the theme it was authored against.
 *
 * The allowlist is small and each entry has a reason: these draw over a live
 * camera feed or a photograph, where the theme surface is not what is behind the
 * pixel, so a token would be the wrong answer.
 */
const LITERAL_EXEMPT = new Map([
  ['src/components/ARDrill.jsx', 'fixed dark panel over the camera in both themes'],
  ['src/components/GestureLayer.jsx', 'draws over the camera feed'],
  ['src/pages/HazardScan.jsx', 'ink over a photograph, not over a themed surface'],
  ['src/pages/Scenario.jsx', 'overlay sits on the 3D scene'],
  ['src/components/SafetyScene3D.jsx', 'a fire is orange in both themes'],
])
const literals = []
for (const { path, src } of files) {
  if (LITERAL_EXEMPT.has(path)) continue
  for (const m of src.matchAll(/rgba?\(\s*(?:255,\s*255,\s*255|0,\s*0,\s*0)[^)]*\)/g)) {
    literals.push(`${path}: ${m[0]}`)
  }
}
ok('no white/black colour literals outside the allowlist', literals.length === 0, literals.join('\n     '))

console.log('\n=== 12. HEADING ORDER ===')
// Per-file analysis cannot see across composition: Home renders h1 directly and
// h3 inside a card, while the intervening h2 comes from the shared SectionHeader.
// So a file that composes those primitives is skipped rather than reported as a
// skip — this check can only speak about headings written literally in one file.
const HEADING_PROVIDERS = /SectionHeader|CardHeader/
const headingIssues = []
for (const { path, src } of files) {
  if (HEADING_PROVIDERS.test(src)) continue
  const levels = [...src.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]))
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) headingIssues.push(`${path}: h${levels[i - 1]} -> h${levels[i]}`)
  }
}
ok('heading levels do not skip within a file', headingIssues.length === 0, headingIssues.join('\n     '), 'WARN')

const hard = findings.filter((f) => f.severity === 'FAIL')
const warn = findings.filter((f) => f.severity === 'WARN')

if (SELFTEST) {
  // Every check that reads the file set must have flagged the synthetic file.
  const EXPECTED = [
    'every button has an accessible name',
    'every form control is labelled',
    'every svg is aria-hidden or has a name',
    'no positive tabIndex (would break focus order)',
    'no min-width above 232px',
    'no physical directional utilities',
    'field-tier buttons reach the 56px minimum',
    'no white/black colour literals outside the allowlist',
    'heading levels do not skip within a file',
  ]
  const flagged = new Set(findings.map((f) => f.label))
  const vacuous = EXPECTED.filter((l) => !flagged.has(l))
  console.log(
    `\nSELFTEST · ${EXPECTED.length - vacuous.length}/${EXPECTED.length} checks detected their planted fault`
  )
  if (vacuous.length) {
    console.log('VACUOUS CHECKS (they pass without looking):\n     ' + vacuous.join('\n     '))
    process.exit(1)
  }
  console.log('SELFTEST PASSED — every check is live')
  process.exit(0)
}

console.log(
  `\n${pass} checks passed · ${hard.length} failures · ${warn.length} warnings` +
    (hard.length === 0 ? '\nA11Y GATE PASSED' : '')
)
process.exit(hard.length === 0 ? 0 : 1)
