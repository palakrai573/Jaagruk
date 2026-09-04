# Jaagruk — Frontend Revamp Plan

Design system, phase specifications, and acceptance criteria for the full frontend rebuild.

**Status legend:** ☐ not started · ◐ in progress · ☑ done

---

## Decisions taken

| # | Decision | Choice |
|---|---|---|
| 1 | UI accent hue | **Teal** — the "Instrument" system. Rationale below. |
| 2 | Hazard-stripe motif | Used **once**, in the hero. Removed as a repeating divider. |
| 3 | Themes | **Both dark and light**, fully tokenised, no mismatch. |
| 4 | Fonts | **Self-hosted via Fontsource**, all six scripts, loaded per language. |
| 5 | Delivery | **Phase by phase**, each specified before it is built. |

---

## 1. Why teal, and why that is not an arbitrary choice

This is a safety product, and in safety design **colour carries meaning**. ISO 7010 — which the
existing 39 pictograms already follow correctly — assigns:

| Colour | ISO 7010 meaning |
|---|---|
| Red | Prohibition · fire equipment |
| **Yellow / amber** | **Warning · caution** |
| Green | Safe condition · escape |
| Blue | Mandatory action |

The current build uses amber `#FFB020` as the brand and UI accent, which means **the interface
chrome speaks the same visual language as a hazard warning**. Amber is simultaneously the
wordmark, the primary button, the active nav state, section eyebrows, stat numbers, link colour,
the focus ring and the stripe dividers — eight jobs. That is the actual reason it reads as "a
yellow site": one colour carrying everything produces no hierarchy, and a worker whose eye is
trained to read yellow as *caution* is spending that attention on button hovers.

**Teal is the only hue that carries no ISO 7010 meaning**, so it can never be mistaken for a
safety instruction. It also reads as instrumentation — sensors, gauges, HUD — which is the
correct register for a product whose core claim is measurement. And it is deliberately not the
indigo/violet gradient that signals "generated from a template."

Amber goes back to meaning *caution*. When something turns amber in the new system, it **means**
something.

---

## 2. The two-tier motion contract

Rich animation and a gloved worker making a decision under a six-second timer pull in opposite
directions. Resolving that badly is how safety software gets built that demos well and is
abandoned on site. So the system is split into two tiers sharing one token set, with different
rules.

| | **Showcase tier** | **Field tier** |
|---|---|---|
| Pages | Home, Certification, Verify, Dashboard, Admin, Settings | Scenario, AR drill, Buddy drill, Refresher, Report Hazard, Onboarding |
| Audience | Judges, safety officers, evaluators | Workers, mid-shift |
| Motion | Scroll reveal, staggered grids, counters, gradient depth, hover lift | **Functional only** — latency bar, state change, confirmation |
| Min touch target | 40 px | **56 px**, thumb-reachable |
| Contrast target | WCAG AA | **AAA** on any drill instruction |
| Density | Layered, rich | One decision per screen |
| Decorative motion | Allowed | **Forbidden** |

Judges see the Showcase tier and read a finished product. Workers only touch the Field tier and
get something that does not move under their thumb.

---

## 3. Token system

Everything is a CSS custom property so a theme switch is one attribute on `<html>` and SVG
charts follow automatically.

### 3.1 Colour

```
/* Brand / interaction — teal */
--brand-50 … --brand-950          dark: interactive #14B8A6, text #2DD4BF
                                  light: interactive #0F766E, pressed #115E59

/* Structure — cool slate, 11 steps */
--surface-0    page background
--surface-1    card
--surface-2    raised card / popover
--surface-3    overlay / sheet
--border-subtle / --border-default / --border-strong
--text-primary / --text-secondary / --text-tertiary / --text-inverse

/* Semantic — RESERVED. Never a hover state, never decoration. */
--hazard    #D93025   prohibition · fire · fail
--warning   #FFB020   caution · hesitation flag
--safe      #2E7D4F   safe condition · pass
--mandate   #1565C0   mandatory action

/* Showcase-only accent, used sparingly */
--ore       copper gradient stop, hero only — the mining/steel note
```

Semantic colours get a **per-theme adjusted pair**: the raw ISO hue for icons and fills, and a
contrast-corrected variant for text, because `#2E7D4F` on a light background fails AA as body
text while being correct as a pictogram fill.

### 3.2 Type

Fluid `clamp()` scale, seven steps, continuous from 320 px to 1440 px so there are no breakpoint
jumps:

```
--text-2xs  10 → 11    mono labels, metadata
--text-xs   12 → 13
--text-sm   14 → 15    body small
--text-base 15 → 17    body
--text-lg   18 → 21    lead paragraph
--text-xl   22 → 28    card titles
--text-2xl  28 → 40    section headings
--text-3xl  36 → 64    hero (display)
```

Families: **Barlow Condensed** display · **Inter** body · **JetBrains Mono** numbers and labels.
Numbers are always mono — a latency or readiness figure should read as a measurement.

### 3.3 Space, radius, elevation, motion

```
--space-1…8      4px base grid
--radius-sm 4 · md 8 · lg 12 · xl 16 · full
--elev-0…4       shadow + border tint + optional backdrop-blur, theme-aware
--dur-fast 120 · --dur-base 240 · --dur-slow 520
--ease-out cubic-bezier(0.22, 1, 0.36, 1)
--ease-in-out cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 4. Fonts — six scripts, self-hosted, loaded per language

Currently three Latin families load from the Google Fonts CDN. Two consequences: first run needs
network, which contradicts offline-first; and **Barlow Condensed and Inter cover Latin only**, so
Hindi, Santali, Bengali, Odia and Urdu are all falling back to whatever the OS supplies. Five of
six languages are effectively unstyled.

Fix — all via `@fontsource` (verified available at 5.3.0), bundled by Vite and precached:

| Script | Package | Loaded |
|---|---|---|
| Latin | `barlow-condensed`, `inter`, `jetbrains-mono` | Always — UI baseline |
| Devanagari (Hindi) | `noto-sans-devanagari` | On demand |
| Ol Chiki (Santali) | `noto-sans-ol-chiki` | On demand |
| Bengali | `noto-sans-bengali` | On demand |
| Odia | `noto-sans-oriya` | On demand |
| Urdu | `noto-nastaliq-urdu` | On demand |

On-demand means a Hindi user never downloads Ol Chiki. Selecting a language dynamically imports
its stylesheet once, then it is cached.

---

## 5. Santali — closing the loose ends honestly

Three separate problems, currently conflated:

### 5.1 Font — **broken, fixable**
Ol Chiki (U+1C50–1C7F) has no font loaded, so it renders as OS fallback or tofu boxes.
**Fix:** `@fontsource/noto-sans-ol-chiki`. Fully solvable.

### 5.2 Voice output — **broken, fixable, and this is a real bug**
`speak()` maps `sat` → `hi-IN` and then hands the engine **raw Ol Chiki text**. A Hindi TTS
engine does not know that script, so it emits nothing useful. The locale fallback was designed
correctly; the script conversion was never done.

**Fix:** Santali is officially written in both Ol Chiki and Devanagari. Transliterate Ol Chiki →
Devanagari before synthesis, so a Hindi engine produces approximately correct Santali phonetics.
Ol Chiki is an alphabet of ~30 letters plus diacritics, so this is a tractable character-level
map. The worker sees Ol Chiki; the engine speaks Devanagari.

### 5.3 Voice input — **not fully solvable, and we will not pretend otherwise**
No production-quality Santali ASR exists. Current approach — fixed command lexicon matched
against the Hindi acoustic model with romanised and Devanagari variants — is the correct
engineering response.
**Improvement:** widen the lexicon, add Ol Chiki→Devanagari→romanised variants for every command,
and keep the in-app disclosure. **This limitation stays documented.**

### 5.4 UI coverage — 38% → 100%
Every key gets a Santali string so no English leaks into a Santali session. **The in-app notice
changes from "38% translated" to "complete, pending native-speaker review"** — because completing
coverage is not the same as verifying quality, and claiming otherwise would be dishonest. The
honest flag stays.

---

## 6. Phases

### ☑ Phase 0 — Foundation
**Goal:** tokens, themes, fonts, RTL. Nothing visual changes yet; everything becomes themeable.

- `src/styles/tokens.css` — all custom properties, `:root` (dark) + `[data-theme="light"]`
- `tailwind.config.js` — colours/spacing/radius/shadow/type reference `var(--…)`
- `src/lib/theme.js` — get/set/toggle, `prefers-color-scheme` default, persisted, no FOUC
- `src/lib/fonts.js` — per-script dynamic import, idempotent
- `src/lib/rtl.js` — `dir` on `<html>` from language; logical properties
- `index.html` — remove CDN font links, add inline pre-paint theme script
- Replace ~40 hardcoded hex values across components with tokens
- `charts.js` / `Charts.jsx` — SVG colours become `var(--…)`

**Acceptance:** theme toggles with zero flicker and zero mismatched colour; all six languages
render in a real font; Urdu lays out RTL; existing build stays clean; no visual regression.

### ☑ Phase 1 — Primitives
**Goal:** the component vocabulary everything else is built from.

`Button` (5 variants × 3 sizes, loading/disabled) · `Card` (+ `CardHeader/Body/Meta/Actions`) ·
`Badge` · `Stat` · `Section` · `Toast` (provider + queue) · `Dialog` (focus-trapped, replaces 4×
`window.confirm`) · `Skeleton` · `EmptyState` · `ErrorState` · `Field` (label/hint/error/counter) ·
`Tabs` · `Progress` · `ThemeToggle`
Hooks: `useReveal` (IntersectionObserver), `useCountUp`, `usePrefersReducedMotion` (lift from
`Charts.jsx`), `useMediaQuery`, `useFocusTrap`

**No animation library.** CSS transitions + one ~40-line observer hook. Framer Motion would add
~40 KB gzipped for capability not needed here, and JS-driven animation bypasses the existing
`prefers-reduced-motion` CSS overrides unless every call site opts in.

**Acceptance:** every primitive works in both themes, both directions, at 320 px, keyboard
navigable, reduced-motion safe.

### ☑ Phase 2 — Showcase tier
**Goal:** the surface judges see.

- **Home rebuilt** — real hero (layered gradient, hazard stripe used *once*, live status),
  four-layer cards as product components with metadata/status/actions, animated counters,
  scroll-reveal with stagger, section rhythm, proper footer
- Certification, Verify — polished onto primitives
- Copy rewritten where vague

**Acceptance:** no card is icon+heading+paragraph. Every section reveals on scroll. Reduced-motion
renders everything static and complete.

### ☑ Phase 3 — Field tier
**Goal:** worker surfaces. Highest risk — these are working safety flows.

Scenario · ARDrill · DrillUI · BuddyDrill · Refresher · ReportHazard · Onboarding
56 px minimum targets · AAA contrast on instructions · one decision per screen · no decorative
motion · pictogram mode audited so no icon reveals an answer

**Acceptance:** every drill completes end to end on a 320 px viewport; latency capture unchanged;
gesture targets still resolve; timing logic untouched.

### ☑ Phase 4 — Data surfaces
Dashboard + Admin onto tokens. Tables collapse to cards below 640 px. Charts theme-aware.
**Acceptance:** no horizontal overflow at any width in either theme.

### ☑ Phase 5 — States
Toasts replace `window.confirm`. Loading, skeleton, empty, error, offline, validation, success
states everywhere. Optimistic UI where safe.

### ☑ Phase 6 — Responsive & a11y QA
320 / 360 / 390 / 430 / 768 / 1024 / 1440 × 2 themes × 6 languages × RTL × reduced-motion.
Overflow, sticky, touch targets, focus order, contrast audit.

Automated as `npm run a11y` (`scripts/a11y-gate.mjs`), 16 checks over every `.jsx` file:
accessible names, form labelling, decorative SVG, focus order, reduced-motion escapes,
320 px width budget, RTL logical properties and mirrored glyphs, live regions, translation
length pressure, field-tier touch targets, theme-blind colour literals, heading order.

`npm run a11y:selftest` plants one instance of each fault in a synthetic file and asserts
every check catches it — 9/9 of the file-reading checks are confirmed live. This exists
because the first version of the accessible-name check passed on a button that had no name:
`/<[^>]*>/` stops at the `>` inside `onClick={() => …}`, leaking handler source into what
the check treated as visible label text. A gate that reports safety it never checked is
worse than no gate.

**What it found and fixed:** 20 unlabelled form controls (six `<label>`s with no `htmlFor`
beside `<input>`s with no `id`); a `<Field>` in the sign-in flow whose label pointed at an
id nothing carried, with a stray `)}` from an unfinished edit; an unnamed chat close button
and an unnamed marker-delete button; `hover:bg-white` on the chat launcher, which erased its
own white glyph on the light theme; three `rgba(255,255,255,0.05)` chip backgrounds invisible
on the light theme; four Onboarding fields sized 50 px on a tier that promises 56 px, plus a
20 px supervisor checkbox and a 38 px copy-code button.

**Not covered:** rendered layout. Static analysis cannot see a wrapped heading or a clipped
sticky bar. The device matrix in `docs/DEPLOYMENT.md` §10 is still required.

### ☑ Phase 7 — Copy & i18n completion

**Done — Ol Chiki→Devanagari transliteration for TTS.** This was the item on the list that
turned out to be a live bug rather than a nicety. `speak()` maps `sat` to `hi-IN` because no
engine ships a Santali voice, but it then handed the Hindi voice raw Ol Chiki codepoints,
which a Hindi acoustic model has no entry for — so Santali narration produced silence or
"unknown character", not accented Santali. `src/lib/olchiki.js` syllabifies Ol Chiki into
Devanagari; it is not a character map, because Ol Chiki is an alphabet and Devanagari an
abugida, so letter-for-letter turns `ᱦᱟᱸ` ("hã") into `हआं` ("ha-aa-n"). Verified by
`npm run translit`: 14 hand-derived words plus all 246 Ol Chiki strings in the app.

**Done — widened command lexicon.** The mirror of the same fault on the input side: Santali
recognition runs on the Hindi model, a Hindi recogniser returns Devanagari, and it cannot
return Ol Chiki — so every Ol Chiki entry in the lexicon was unreachable. The lexicon is now
derived, adding the Devanagari transliteration of each Ol Chiki phrase using the same
converter, so input and output agree and nothing is authored twice.

**Done — the fallback is Hindi, not English.** Applies to UI strings and to scenario
content, where 5 of 6 modules have Hindi and none has Santali. Devanagari is in the
precached font subset, so this costs nothing to render.

**Done — the coverage number is now honest.** Four nav labels held English text in the `sat`
slot; the audit counts any non-empty value, so they reported coverage that did not exist.
`npm run i18n` now fails on English-in-another-slot, values written in the wrong script, and
fallback chains that do not end in a fully covered language.

**Not done, deliberately — Santali to 100%.** Coverage is 42% (241/573 strings, no scenario
content). Filling the remaining 332 slots with machine-produced Ol Chiki would show 100% and
would be the wrong thing to ship: this is safety training content, and a confident-looking
wrong instruction is more dangerous than a declared gap, because the gap falls back to a
language the worker can read while the wrong instruction teaches the wrong reaction.

`npm run santali:worksheet` generates `docs/santali-worksheet.csv` — all 332 keys with
English and Hindi source, ordered by consequence (drill and hazard instructions first,
supervisor dashboards last) for native-speaker review.

---

## 7. Non-negotiable constraints

1. **Do not break the drill timing path.** Latency capture is the core claim.
2. **Do not replace ISO 7010 pictograms** with decorative icons on any safety surface.
3. **No icon library, no animation library, no CDN at runtime** — must work offline.
4. **`prefers-reduced-motion` must render every screen complete and static.**
5. **Bundle budget:** +60 KB brotli maximum excluding fonts.
6. **No new APIs, keys, or accounts.** This is presentation-layer work.
7. **Every string through `t()`.** No hardcoded English.
8. **Semantic colours never used decoratively.**
