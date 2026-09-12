// Colour contrast gate.
//
// WHY THIS EXISTS
// The design tokens carried contrast promises in prose comments — "#2E7D4F green
// only reaches about 3:1", "7.71:1 dark, 5.15:1 light" — and nothing checked any of
// them. Prose cannot fail a build. Retuning one ramp, or adding a hover state a
// shade lighter than its base, silently regressed text that a worker has to read at
// a gate in daylight, and no gate noticed.
//
// It also catches the more specific trap this token set is shaped around. Every
// semantic colour exists twice: `--hazard` is the raw ISO 7010 hue, correct as a
// FILL behind a pictogram and identical in both themes because it has to match the
// sign painted on the wall, while `--hazard-text` is the same meaning corrected for
// legibility per theme. Using the fill as a text colour looks fine in whichever
// theme it was authored against and fails in the other. That is a source-level
// mistake, not a token value, so it is checked separately in section 4.
//
// WHAT IT CANNOT DO
// It reads token values, not rendered pixels. It cannot see a colour composed at
// runtime by an opacity modifier (`text-hazard/70`), text over a photograph or the
// camera feed, or a gradient. Those need eyes on a device — docs/DEPLOYMENT.md §10.
import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const resolvePath = (p) => join(ROOT, p)

const SELFTEST = process.argv.includes('--selftest')

let pass = 0
const findings = []
const ok = (label, cond, detail, severity = 'FAIL') => {
  if (cond) {
    pass += 1
    return
  }
  findings.push({ severity, label, detail })
  console.log(`${severity} ${label}${detail ? '\n     ' + detail : ''}`)
}

/* ------------------------------------------------------------------ */
/* WCAG 2.1 relative luminance and contrast ratio                      */
/* ------------------------------------------------------------------ */

/* Per WCAG 2.1 the channel is linearised before weighting. Using the raw 0-255
 * value — or worse, a naive average — gives numbers that look plausible and are
 * wrong by enough to pass failing pairs, which is the only outcome worse than
 * having no check. */
function channel(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

const ratio = (n) => `${n.toFixed(2)}:1`

/* ------------------------------------------------------------------ */
/* Token parsing                                                       */
/* ------------------------------------------------------------------ */

const TOKENS_PATH = 'src/styles/tokens.css'
const cssRaw = readFileSync(resolvePath(TOKENS_PATH), 'utf8')
// Comments carry example values and prose ratios; leaving them in would let a
// number inside a sentence be parsed as a declaration.
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every `selector { ... }` block, in source order. */
function blocks(source) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(source))) out.push({ selector: m[1].trim(), body: m[2] })
  return out
}

/** `--name: value;` pairs from one block body. */
function declarations(body) {
  const out = new Map()
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim())
  return out
}

const parsed = blocks(css)
const base = new Map()
const lightOverride = new Map()

for (const { selector, body } of parsed) {
  const target = selector.includes("[data-theme='light']") ? lightOverride : base
  for (const [k, v] of declarations(body)) target.set(k, v)
}

ok('tokens.css parsed', base.size > 40 && lightOverride.size > 20, `base ${base.size}, light ${lightOverride.size}`)

/* The planted token fault. It goes in here, after parsing, because that is the
 * data every ratio check reads — a fault planted anywhere else would prove the
 * parser works and say nothing about whether the comparisons run. A near-white
 * tertiary ink on a near-white page is roughly 1.4:1 and cannot be argued with. */
if (SELFTEST) lightOverride.set('--text-tertiary', '236 238 240')

/**
 * Resolve a token to an [r,g,b] triplet, following `var()` indirection within the
 * same theme. Returns null for anything that is not a colour triplet — shadows,
 * clamp() type scales, easings — so callers can skip them rather than crash.
 */
function rgb(name, theme) {
  const map = theme === 'light' ? lightOverride : base
  let value = map.get(name) ?? base.get(name)
  const seen = new Set()

  while (typeof value === 'string') {
    const trimmed = value.trim()
    const direct = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/)
    if (direct) return [Number(direct[1]), Number(direct[2]), Number(direct[3])]

    const indirect = trimmed.match(/^var\(\s*(--[\w-]+)\s*\)$/)
    if (!indirect) return null

    const next = indirect[1]
    if (seen.has(next)) return null // a var() cycle, rather than hanging
    seen.add(next)
    value = (theme === 'light' ? lightOverride.get(next) : undefined) ?? base.get(next)
  }
  return null
}

const THEMES = ['dark', 'light']

/* ------------------------------------------------------------------ */
/* 1. Text on surfaces — WCAG 1.4.3, 4.5:1                             */
/* ------------------------------------------------------------------ */

const AA_TEXT = 4.5
const AA_NON_TEXT = 3.0

const SURFACES = ['--surface-0', '--surface-1', '--surface-2', '--surface-3', '--surface-inset']

/* --text-disabled is deliberately absent. WCAG 1.4.3 exempts "incidental" text,
 * which includes inactive controls, and a disabled control that reads at full
 * contrast is indistinguishable from an enabled one — the low contrast IS the
 * affordance. Placeholder text is NOT exempt, which is why --text-placeholder
 * exists separately and is checked at the full 4.5:1 below. */
const INK = ['--text-primary', '--text-secondary', '--text-tertiary']

console.log('=== 1. TEXT ON SURFACES (AA 4.5:1) ===')
const inkFails = []
for (const theme of THEMES) {
  for (const ink of INK) {
    for (const surface of SURFACES) {
      const a = rgb(ink, theme)
      const b = rgb(surface, theme)
      if (!a || !b) continue
      const c = contrast(a, b)
      if (c < AA_TEXT) inkFails.push(`${theme.padEnd(5)} ${ink} on ${surface} = ${ratio(c)}`)
    }
  }
}
ok(`ink tokens clear ${AA_TEXT}:1 on every surface`, inkFails.length === 0, inkFails.join('\n     '))

// Placeholder text is real content a user has to read to know what to type.
const placeholderFails = []
for (const theme of THEMES) {
  const a = rgb('--text-placeholder', theme)
  const b = rgb('--surface-inset', theme)
  if (!a || !b) {
    placeholderFails.push(`${theme}: --text-placeholder is not defined`)
    continue
  }
  const c = contrast(a, b)
  if (c < AA_TEXT) placeholderFails.push(`${theme.padEnd(5)} --text-placeholder on --surface-inset = ${ratio(c)}`)
}
ok(`--text-placeholder clears ${AA_TEXT}:1 on the input surface`, placeholderFails.length === 0, placeholderFails.join('\n     '))

/* ------------------------------------------------------------------ */
/* 2. Semantic and brand text                                          */
/* ------------------------------------------------------------------ */

console.log('\n=== 2. SEMANTIC AND BRAND TEXT (AA 4.5:1) ===')
const SEMANTIC = ['hazard', 'warning', 'safe', 'mandate', 'brand']

const semanticFails = []
for (const theme of THEMES) {
  for (const role of SEMANTIC) {
    const fg = rgb(`--${role}-text`, theme)
    if (!fg) continue
    // Its own tinted panel, and the two surfaces it is used as body text on.
    for (const bg of [`--${role}-subtle`, '--surface-0', '--surface-1']) {
      const back = rgb(bg, theme)
      if (!back) continue
      const c = contrast(fg, back)
      if (c < AA_TEXT) semanticFails.push(`${theme.padEnd(5)} --${role}-text on ${bg} = ${ratio(c)}`)
    }
  }
}
ok(`every *-text clears ${AA_TEXT}:1 on its panel and on the page`, semanticFails.length === 0, semanticFails.join('\n     '))

/* A primary button's label sits on --brand, and on --brand-hover and
 * --brand-pressed while it is being used. A hover shade lighter than the base is
 * the specific regression this catches: the resting state passes, the state the
 * user is actually looking at when they click does not. */
const onBrandFails = []
for (const theme of THEMES) {
  const fg = rgb('--text-on-brand', theme)
  if (!fg) continue
  for (const bg of ['--brand', '--brand-hover', '--brand-pressed']) {
    const back = rgb(bg, theme)
    if (!back) continue
    const c = contrast(fg, back)
    if (c < AA_TEXT) onBrandFails.push(`${theme.padEnd(5)} --text-on-brand on ${bg} = ${ratio(c)}`)
  }
}
ok(`--text-on-brand clears ${AA_TEXT}:1 on brand, hover and pressed`, onBrandFails.length === 0, onBrandFails.join('\n     '))

/* ------------------------------------------------------------------ */
/* 3. Non-text contrast — WCAG 1.4.11, 3:1                             */
/* ------------------------------------------------------------------ */

console.log('\n=== 3. BORDERS, FOCUS RING AND ELEVATION (AA 3:1) ===')

/* --border-subtle and --border-default are not here, and the distinction is the
 * whole point of --border-control existing. 1.4.11 applies to the boundary of a
 * component you have to perceive in order to operate it, not to decoration. A card
 * edge and a list divider are decoration; a text input's edge is the only thing
 * telling you where to tap, because inputs here sit on --surface-inset, which is
 * within 1.06:1 of the page. So --border-control carries the requirement and the
 * two decorative levels are free to stay quiet. Their measured values are printed
 * at the end rather than enforced.
 *
 * --focus-ring is a state indicator, which 1.4.11 covers explicitly. */
const nonTextFails = []
for (const theme of THEMES) {
  for (const [token, against] of [
    ['--border-control', ['--surface-0', '--surface-1', '--surface-inset']],
    ['--focus-ring', ['--surface-0', '--surface-1', '--surface-2']],
  ]) {
    const a = rgb(token, theme)
    if (!a) {
      nonTextFails.push(`${theme}: ${token} is not defined`)
      continue
    }
    for (const bg of against) {
      const b = rgb(bg, theme)
      if (!b) continue
      const c = contrast(a, b)
      if (c < AA_NON_TEXT) nonTextFails.push(`${theme.padEnd(5)} ${token} on ${bg} = ${ratio(c)}`)
    }
  }
}
ok(`control borders and the focus ring clear ${AA_NON_TEXT}:1`, nonTextFails.length === 0, nonTextFails.join('\n     '))

/* The elevation ramp has to actually have steps. Light had --surface-1, -2 and -3
 * all at pure white, so a Card on a raised Section was an invisible card and
 * `bg-surface-2/40` composited to nothing — the whole ramp collapsed to two levels
 * in one theme while reading as four in the other. Identity is the failure; the
 * ratios are printed so a retune can be judged rather than guessed. */
const collapsed = []
for (const theme of THEMES) {
  const steps = ['--surface-0', '--surface-1', '--surface-2', '--surface-3']
  for (let i = 1; i < steps.length; i += 1) {
    const a = rgb(steps[i - 1], theme)
    const b = rgb(steps[i], theme)
    if (!a || !b) continue
    if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) {
      collapsed.push(`${theme.padEnd(5)} ${steps[i - 1]} and ${steps[i]} are the same colour`)
    }
  }
  // A border that matches the surface it sits on is invisible; dark had
  // --border-subtle and --surface-3 both at steel-800.
  const bs = rgb('--border-subtle', theme)
  const s3 = rgb('--surface-3', theme)
  if (bs && s3 && bs[0] === s3[0] && bs[1] === s3[1] && bs[2] === s3[2]) {
    collapsed.push(`${theme.padEnd(5)} --border-subtle is identical to --surface-3, so the border vanishes on it`)
  }
}
ok('the elevation ramp has distinct steps in both themes', collapsed.length === 0, collapsed.join('\n     '))

/* ------------------------------------------------------------------ */
/* 4. ISO fills must not be used as text colour                        */
/* ------------------------------------------------------------------ */

console.log('\n=== 4. ISO FILLS ARE NOT TEXT COLOURS ===')

/* `text-hazard` resolves to the raw ISO red, which is chosen to match a
 * prohibition sign, not to be read as 11px type. `text-hazard-text` is the same
 * meaning corrected per theme. The two differ by a suffix, so this is easy to get
 * wrong and invisible in review.
 *
 * Exempt: files that draw over the camera feed or a photograph with their own
 * fixed plate. The surface behind those pixels is video, not a themed surface, so
 * a per-theme token would be the wrong answer — they use the theme-invariant
 * --media-* tokens instead, which are checked against that plate below. */
const ISO_TEXT_EXEMPT = new Set([
  'src/components/ARDrill.jsx',
  'src/components/DetectionOverlay.jsx',
  'src/components/GestureLayer.jsx',
  'src/pages/HazardScan.jsx',
])

const files = []
;(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.jsx?$/.test(entry)) {
      files.push({ path: relative(ROOT, full).replace(/\\/g, '/'), src: readFileSync(full, 'utf8') })
    }
  }
})(resolvePath('src'))

if (SELFTEST) {
  files.push({
    path: 'src/pages/__selftest.jsx',
    src: '<p className="text-hazard">x</p><span className="text-safe" />',
  })
}

const rawAsText = []
for (const { path, src } of files) {
  if (ISO_TEXT_EXEMPT.has(path)) continue
  // Negative lookahead on `-` so `text-hazard-text` and `text-safe-text` pass, and
  // on `/` so an explicitly composited `text-hazard/70` is still reported (it is
  // lower contrast, not higher).
  for (const m of src.matchAll(/\btext-(hazard|warning|safe|mandate)(?![\w-])/g)) {
    rawAsText.push(`${path}: ${m[0]} — use text-${m[1]}-text`)
  }
}
ok(
  'no raw ISO fill used as a text colour',
  rawAsText.length === 0,
  [...new Set(rawAsText)].join('\n     ')
)

/* The camera-overlay tokens are theme-invariant by design, so they are checked
 * once, against the plate they are actually drawn on. */
console.log('\n=== 5. CAMERA OVERLAY INK ON ITS PLATE (AA 4.5:1) ===')
const MEDIA_PLATE = [0, 0, 0] // bg-black/75 over video; the video can be anything
const mediaFails = []
for (const token of ['--media-ink', '--media-safe-text', '--media-hazard-text', '--media-warning-text']) {
  const a = rgb(token, 'dark')
  if (!a) {
    mediaFails.push(`${token} is not defined`)
    continue
  }
  const c = contrast(a, MEDIA_PLATE)
  if (c < AA_TEXT) mediaFails.push(`${token} on the black camera plate = ${ratio(c)}`)
}
ok(`camera overlay ink clears ${AA_TEXT}:1 on its plate`, mediaFails.length === 0, mediaFails.join('\n     '))

/* ------------------------------------------------------------------ */
/* Report                                                             */
/* ------------------------------------------------------------------ */

console.log('\n=== MEASURED (for the record, not a pass condition) ===')
const rows = []
for (const theme of THEMES) {
  const p = rgb('--text-primary', theme)
  const s = rgb('--surface-0', theme)
  const b = rgb('--brand-text', theme)
  const ob = rgb('--text-on-brand', theme)
  const br = rgb('--brand', theme)
  const d = rgb('--text-disabled', theme)
  if (p && s) rows.push(`${theme.padEnd(5)} body text on page      ${ratio(contrast(p, s))}`)
  if (b && s) rows.push(`${theme.padEnd(5)} brand text on page     ${ratio(contrast(b, s))}`)
  if (ob && br) rows.push(`${theme.padEnd(5)} button label on brand  ${ratio(contrast(ob, br))}`)
  // Printed, not enforced: 1.4.3 exempts inactive controls.
  if (d && s) rows.push(`${theme.padEnd(5)} disabled text on page  ${ratio(contrast(d, s))}  (exempt, informational)`)
  // Printed, not enforced: decoration, not a control boundary. Here so a retune
  // that flattens the border ramp is visible rather than silent.
  for (const border of ['--border-subtle', '--border-default', '--border-control']) {
    const bd = rgb(border, theme)
    const card = rgb('--surface-1', theme)
    if (bd && card) rows.push(`${theme.padEnd(5)} ${border.padEnd(17)} on card ${ratio(contrast(bd, card))}`)
  }
}
console.log('     ' + rows.join('\n     '))

if (SELFTEST) {
  /* A contrast gate that cannot fail is a comment with a build step attached. The
   * planted faults are a real failing pair and a raw ISO fill used as text; if
   * either check has gone quiet — a broken parser returning null for everything
   * would do it — this reports which one. */
  console.log('\nSELFTEST')
  const expected = [
    `ink tokens clear ${AA_TEXT}:1 on every surface`,
    'no raw ISO fill used as a text colour',
  ]
  const flagged = new Set(findings.map((f) => f.label))
  const vacuous = expected.filter((l) => !flagged.has(l))

  // Arithmetic, checked against values that are not open to interpretation.
  const cases = [
    [[0, 0, 0], [255, 255, 255], 21],
    [[255, 255, 255], [255, 255, 255], 1],
    [[0, 0, 0], [0, 0, 0], 1],
  ]
  let mathFails = 0
  for (const [a, b, want] of cases) {
    const got = contrast(a, b)
    if (Math.abs(got - want) > 0.01) {
      mathFails += 1
      console.log(`  FAIL contrast(${a}, ${b}) = ${ratio(got)}, expected ${want}:1`)
    } else console.log(`  ok   contrast(${a}, ${b}) = ${ratio(got)}`)
  }
  // A var() chain must resolve, or every check silently skips its pair.
  const resolved = rgb('--surface-0', 'dark')
  if (!resolved) {
    mathFails += 1
    console.log('  FAIL --surface-0 did not resolve through var(--steel-950)')
  } else console.log(`  ok   var() indirection resolves: --surface-0 dark = ${resolved.join(' ')}`)

  if (vacuous.length || mathFails) {
    console.log(`\nSELFTEST FAILED — vacuous: ${vacuous.join(', ') || 'none'}, arithmetic failures: ${mathFails}`)
    process.exit(1)
  }
  console.log(`\nSELFTEST PASSED — ${expected.length} checks detected their planted fault, arithmetic exact`)
  process.exit(0)
}

const hard = findings.filter((f) => f.severity === 'FAIL')
console.log(`\n${pass} checks passed · ${hard.length} failures`)
if (hard.length) {
  console.log('CONTRAST GATE FAILED')
  process.exit(1)
}
console.log('CONTRAST GATE PASSED')
