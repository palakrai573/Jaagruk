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

Automated as `npm run a11y` (`scripts/a11y-gate.mjs`), 20 checks over every `.jsx` file:
accessible names, form labelling, decorative SVG, focus order, reduced-motion escapes,
320 px width budget, RTL logical properties and mirrored glyphs, live regions, translation
length pressure, field-tier touch targets, theme-blind colour literals, heading order,
colour utilities that name a token which actually exists, focus rings that are replaced when
suppressed, and motion durations that come from the token scale.

The contrast half of this phase is `npm run contrast` (`scripts/contrast-gate.mjs`), which
computes WCAG relative luminance from `tokens.css` for both themes rather than asserting
ratios in prose. See "Contrast was never checked" below.

`npm run a11y:selftest` plants one instance of each fault in a synthetic file and asserts
every check catches it — 13/13 of the file-reading checks are confirmed live. This exists
because the first version of the accessible-name check passed on a button that had no name:
`/<[^>]*>/` stops at the `>` inside `onClick={() => …}`, leaking handler source into what
the check treated as visible label text. A gate that reports safety it never checked is
worse than no gate.

It has since earned its keep three more times, and all three were the same failure in
different clothes — a check whose regex could not see the syntax actually in use:

- The **reduced-motion** check built its haystack as everything after the first occurrence
  of `prefers-reduced-motion`. That occurrence is the global duration-zeroing block near the
  top of `index.css`, above every animated class in the file — so every class name matched
  its own definition, the missing-escape list was always empty, and the check had never
  tested anything. It brace-matches the `@media` block bodies now.
- The **physical-utility** check knew `pl-4` and `pl-px` but not `pl-[…]`, so the arbitrary
  value form walked straight past it.
- The **duration** check excluded quotes from its value pattern, so it stopped at the
  opening quote of every `style={{ transition: '…' }}` in the codebase and only ever read
  the stylesheet.

Each of those was found by adding the check to the selftest's expected list, not by reading
the code. That is the argument for the selftest in one sentence.

**What it found and fixed:** 20 unlabelled form controls (six `<label>`s with no `htmlFor`
beside `<input>`s with no `id`); a `<Field>` in the sign-in flow whose label pointed at an
id nothing carried, with a stray `)}` from an unfinished edit; an unnamed chat close button
and an unnamed marker-delete button; `hover:bg-white` on the chat launcher, which erased its
own white glyph on the light theme; three `rgba(255,255,255,0.05)` chip backgrounds invisible
on the light theme; four Onboarding fields sized 50 px on a tier that promises 56 px, plus a
20 px supervisor checkbox and a 38 px copy-code button.

**Contrast was never checked.** The phase listed "contrast audit" and the tokens carried
ratios in comments — "7.71:1 dark, 5.15:1 light", "ISO yellow on white is about 1.9:1" — and
nothing computed any of them. Prose cannot fail a build, so `npm run contrast` now does,
from `tokens.css`, resolving `var()` chains, for both themes. What it found on first run:

- **The light elevation ramp did not exist.** `--surface-1`, `-2` and `-3` were all pure
  white: four named steps, two actual values. A neutral `Badge` had no chip behind it,
  `CardActions`' `bg-surface-2/40` composited white onto white, and a `Card` inside a raised
  `Section` was an invisible card. Dark elevates by lightening and light cannot, because
  white is the ceiling — so 2 and 3 now tint *away* from the card in both themes, and
  overlays (Dialog, Toast, the nav sheet) use `--surface-1` plus a shadow instead, since on a
  light theme elevation is a shadow rather than a shade.
- **`--brand-hover` was lighter than `--brand`** in light — teal-600 over a teal-700 base.
  The primary button passed at rest and fell to 3.74:1 under the cursor, so it failed AA in
  the state a worker is looking at when they commit to the tap. `--brand-pressed` was also
  byte-identical to `--brand-text`.
- **`--border-subtle` was `--surface-3`** in dark, both steel-800, so a subtle border on a
  chip was not faint, it was mathematically invisible.
- **`--text-tertiary`** measured 4.42:1 on the page and 4.19:1 on an input in light, and it
  is the colour every caption and hint uses.
- **Placeholders were `--text-disabled`**, about 2.3:1 in both themes. 1.4.3 exempts inactive
  controls, not hints — a placeholder tells you what to type, so it is content. Hence
  `--text-placeholder`, and `--border-control` at 3:1 for 1.4.11, because inputs sit on
  `--surface-inset` which is within 1.06:1 of the page: the border is the only thing marking
  where the field is.
- **25 uses of a raw ISO fill as a text colour** across seven files. `text-hazard` is the red
  chosen to match a prohibition sign; `text-hazard-text` is the same meaning corrected per
  theme. Green confirmations and red error messages were failing contrast on dark.

**Not covered:** rendered layout, and colours composed at runtime. Static analysis cannot see
a wrapped heading, a clipped sticky bar, `text-hazard-text/70`, or ink over a photograph. The
device matrix in `docs/DEPLOYMENT.md` §10 is still required.

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

**Done — Santali UI to 100%, with verification tracked separately from coverage.** The 332
missing strings are written, in `src/lib/i18nSantali.js`, against the glossary already
established by the existing 241 so the terminology is at least internally consistent.

The part that took the thinking was not the writing. Filling the last slot would have taken
coverage to 100%, and `isPartiallyTranslated()` keyed off coverage — so the "translation in
progress" notice would have **disappeared**, leaving the app quietly presenting unchecked
machine-authored safety text as a finished translation. Coverage and correctness are
different claims. So `SANTALI_VERIFIED` now lives with the strings and the notice reads that
flag instead; 100% coverage with 0% verification shows a warning that says exactly that, and
tells the worker to follow the safety signs if the wording is unclear.

Four checks were added to `npm run i18n` for the failure modes a bulk authoring pass
actually has: figures silently dropped (compared across numeral systems, so Bengali ৪ counts
as 4), characters outside a shipped font subset (which render as a permanent box offline and
fail nothing in the build), English left in a translated slot, and values written in the
wrong script.

**Still not machine-authored, deliberately — scenario content.** None of the 6 modules has
Santali and they resolve to Hindi. Drill prose is where a wrong verb changes what a worker
physically does, which is a different risk from a mislabelled dashboard tab.

`npm run santali:worksheet` regenerates `docs/santali-worksheet.csv`: all 626 strings with
English and Hindi source, the current Santali, and which file to correct it in, ordered by
consequence.

### ☑ Phase 8 — AR discoverability and the Site Setup disconnect

Added after a phone test reported "there is no AR". AR was not missing — camera, compass
projection, anchor markers, aim-and-hold and the smoke overlay were all implemented. It was
unreachable, and on a phone it was also failing for a reason the error never named.

**AR is now on by default where the device can run it.** `LS.MODE_AR` defaulted to `false`,
so a capable phone got the 3D scene on first run. The only entry point was a 10px
tertiary-ink button at the far right of the drill title row — three taps deep and visually a
caption rather than a control. Nothing in the navigation, Home, or the module cards mentioned
AR, and the Settings label never used the word. `src/lib/arSupport.js` now computes capability
and `lsGetBoolOrNull` distinguishes "never chose" from "chose no", so the stored value is an
override rather than the source of truth. An explicit opt-out is still honoured, and a stored
`true` never survives a hard block.

**The failure that only happens on a phone.** `navigator.mediaDevices` does not exist outside
a secure context, so opening the dev server over `http://192.168.x.x:5173` reported "this
browser cannot open the camera" when the browser was fine and the scheme was the problem.
`localhost` is a secure context, so it is invisible on the developing machine and appears only
on the device that matters. There was no `isSecureContext` check anywhere in `src`.
`CAMERA_ERROR.INSECURE_CONTEXT` is now checked *before* the API test, because the insecure
context is why the API is absent — and it is the only camera failure the person holding the
phone can fix, so it is the only one with a second explanatory line.

**The bug that made Site Setup pointless.** `Scenario.jsx` called
`getZone(getActiveSiteId(), null)`, and `getZone` opens with
`if (!zoneId || zoneId === GENERIC_ZONE_ID) return genericZone()`. The hardcoded `null`
short-circuited on the first line every time, so the drill always projected the six generic
bearings and always showed the "site has not been scanned" chip — including on a fully
scanned site. A supervisor could mark every exit and extinguisher in a corridor and none of
it reached a drill; the one thing that makes this AR spatially real never ran. Now
`listZones()` with explicit precedence — scanned-with-anchors, then any scanned zone, then
generic as a deliberate fallback — matching the precedence `ReportHazard` already used, plus a
zone picker when more than one scanned zone exists.

**One hiccup no longer disables AR permanently.** `onFallback` fires when a worker taps "Use
3D view" on an error panel. That is an escape from a broken frame, not a preference, but it
wrote `false` to localStorage — so a single permission misfire disabled AR on every future
drill. Now session-only; the explicit switch still persists.

Also: the drill toggle became a real control (brand-tinted, pictogram, `min-h-touch`,
`aria-pressed`) that states the reason when the device cannot; Home layer 01 carries AR
readiness and the specific cause when blocked; the Settings toggle gained the capability guard
the gesture toggle beside it already had. No `PRIMARY_NAV` item — the header budget measured
in Phase 6 has ~219px headroom at worst, and AR is a mode rather than a destination.

The Phase 6 touch-target check caught the new zone chips at `py-1.5` on a field-tier screen,
which is exactly what it was written for.

**Not covered:** whether the camera actually opens. Static analysis cannot request a
permission or read a magnetometer. AR needs a real phone on https, and the device matrix in
`docs/DEPLOYMENT.md` §10 is still required.

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
