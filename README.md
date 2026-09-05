<div align="center">

# जागरुक · Jaagruk

**Safety training that happens where the accident would.**

AR-based vocational training and tamper-evident safety certification for Jharkhand's mining
and manufacturing workforce — on the phone a worker already owns, 200 m underground, with no
signal.

`Smart India Hackathon` · **Problem Statement 26041** · Government of Jharkhand,
Department of Higher & Technical Education

![React](https://img.shields.io/badge/React-18-1C2024?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-1C2024?style=flat-square)
![Capacitor](https://img.shields.io/badge/Capacitor-8-1C2024?style=flat-square)
![Offline](https://img.shields.io/badge/Offline-first-2E7D4F?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-none_required-2E7D4F?style=flat-square)
![Languages](https://img.shields.io/badge/Languages-6-FFB020?style=flat-square)

</div>

---

## Contents

| | |
|---|---|
| [The problem](#the-problem) · [Why a quiz app isn't enough](#why-the-obvious-build-isnt-enough) | The case |
| [How it works](#how-it-works) · [The four layers](#the-four-layers) | The system |
| [Efficiency and compression](#efficiency-and-compression) | **Measured numbers** |
| [Architecture](#architecture) · [Tech stack](#tech-stack) · [Data model](#data-model) | The build |
| [Offline model](#offline-model) · [Security](#security-and-integrity) | The guarantees |
| [Quick start](#quick-start) · [Deploy](#deploy) | Running it |
| [Verification](#verification) · [Limitations](#honest-limitations) · [Roadmap](#roadmap) | The honesty |

---

## The problem

Safety training in this sector is not missing. Inductions exist, posters exist, annual
refreshers exist. The problem is that it produces **a certificate rather than a reflex**.

> A worker passes a written test in March. In September a real gas alarm sounds, and he stands
> still for eleven seconds trying to remember what he read.
>
> **Nothing in the current system can even see those eleven seconds.**

Three failures cause this, and all three are invisible to conventional training:

| | |
|---|---|
| **Workers who know the right action still freeze** | Knowing the evacuation route and executing it in four seconds are different skills. |
| **Retention collapses within a week** | A one-time induction improves first exposure, not durability. |
| **The buddy system is two humans under stress** | You cannot train coordination alone with a phone. |

---

## Why the obvious build isn't enough

The baseline reading of this problem statement is *AR overlay → quiz → QR certificate →
dashboard*. That is correct scope. It is also what most submissions will be, and it leaves all
three failures untouched.

| The real problem | What a quiz-and-certificate app does | **What Jaagruk does** |
|---|---|---|
| Workers who *know* the right action still freeze | Nothing. Right/wrong scoring cannot see hesitation. | **Every decision is timed** against a per-step baseline. Correct-but-slow is flagged for retraining instead of quietly passed. |
| Retention falls sharply within a week | Nothing. A one-time module makes the first exposure better, not stickier. | **Readiness decays** with time and recovers on a 90-second refresher. Certification is gated on today's score, not the test date. |
| The buddy system is two humans coordinating | Simulates the buddy as an AI character — trains none of the coordination. | **Two real phones** paired over WebRTC, no server, no internet. Scored on check-in discipline and how long you took to notice your buddy collapse. |

Everything below is implementation detail. That table is the idea.

---

## How it works

```
SUPERVISOR · once per zone
  Site Setup ──► aim phone at exit, tap ──► aim at extinguisher, tap ──► …
       │              stores magnetic bearing + elevation + thumbnail
       └──► export zone bundle (JSON) ─────────────────┐
                                                       │ seeds every phone
WORKER · every shift                                   ▼
  Onboard (icon + voice + PIN) ──► import zone ──► pick a module
       │
       ├──► AR drill in the real corridor ──► decision ──► ⏱ LATENCY CAPTURED
       │                                            │
       │                              fast / normal / slow → hesitation flag
       │                                            ▼
       ├──► readiness = 0.7·accuracy + 0.3·speed
       │
       ├──► buddy drill (2nd phone, QR pairing) ──► coordination score
       │
       ├──► all 5 domains ≥ 70 effective? ──► CERTIFICATE signed + hash-chained
       │
       ├──► spot a real hazard ──► photo + voice + bearing ──► queued
       │
       └──► 2 / 7 / 21 / 60 days later ──► refresher due ──► readiness restored

INSPECTOR · at the pit head, no signal
  Scan QR ──► verify offline ──► 4 independent signals reported

SAFETY OFFICER · admin dashboard
  Hesitation-risk list · hazard triage · chain integrity · statutory CSV export
```

**The loop is the point.** Readiness decaying below 70 pushes the worker back to training. A
funnel produces certificates; a loop produces competence.

---

## The four layers

### 1 · Train — in the corridor you would actually run down

**Site-Scan AR.** An anchor is a **direction**, not a 3D point. A supervisor aims the phone at
the real exit and taps; the app stores the magnetic bearing and elevation of that sighting.
During a drill the marker reprojects at that bearing and stays over the real exit as the worker
turns. *"The exit is left past the second pillar"* gets learned against real geometry.

Steel plants and shafts distort magnetic heading, so absent or low-accuracy compass data is
**detected** — the app falls back to gyro-relative mode with an explicit re-centre control and
tells the worker which mode he is in, rather than showing markers confidently in the wrong
place. When every marker is more than 90° behind him, an explicit *turn around* prompt appears,
because a small edge chevron is not enough.

**Glove-friendly input.** Point-to-aim and pinch-to-select via MediaPipe hand tracking, with a
**1.2-second dwell ring** as the precision fallback — heavy gloves are exactly what removes
pinch precision. Voice answers run in parallel. Touch always works, and **nothing in the app is
reachable only by gesture**.

**Zero-text pictogram mode.** 39 inline-SVG glyphs using ISO 7010 shape and colour semantics —
the same signage already painted on a DGMS-regulated wall — plus audio narration. Onboarding
itself is icon-and-voice driven, so a worker who cannot read selects a language by hearing it
spoken and registers unaided. **No pictogram on a choice button reveals the answer.**

### 2 · Assess — scored the way an emergency scores you

```
readiness = round(0.7 × accuracy + 0.3 × speed)
```

Speed counts **only on decisions that were correct**. Fast and wrong is not a partial success,
it is the actual failure mode.

| Grade | Condition | Speed score |
|---|---|---|
| `fast` | within the step's target | 100 |
| `normal` | within 2× target | 70 |
| `slow` | beyond 2× target | 35 → **hesitation flag** |
| `unknown` | beyond 10 minutes | 70 — walked away, not hesitation |
| `incorrect` | any speed | retrain regardless |

**Targets are per step, set by how much time the real situation allows:**

| Step | Target | Why |
|---|---|---|
| Escalating fire, black smoke | **6 s** | Every second deciding is a second of smoke inhalation |
| Burning smell at an electrical panel | **6 s** | Delay is how a fault becomes a fire |
| Reversing forklift, alarm disabled | **7 s** | Immediate struck-by risk |
| Pre-entry gas detector check | **10 s** | Nobody is in danger yet; there is room to think |
| Colleague's persistent cough | **13 s** | Occupational health judgement — rewarding a snap answer trains the wrong instinct |

**Buddy drill.** Two phones pair by scanning each other's QR codes over a WebRTC data channel.
A confined-space entry runs as a shared state machine with a scripted distress event; the
responder is scored on whether they noticed, how fast, and **whether they resisted going in
unprotected** — the decision that turns one casualty into two.

### 3 · Certify — a record that cannot be quietly edited

```
payload ──► canonical JSON ──► SHA-256 ──► hash ──► signed by device key
                                                        │
        each record embeds the previous record's hash ───┘
                    per-site append-only chain
```

Verification reports **four independent signals**, never collapsed into one badge:

| # | Signal | Why it is separate |
|---|---|---|
| 1 | Payload intact and correctly signed | Detects mutation and forgery |
| 2 | Signer known to this device | A genuine record from an untrusted phone is *not* a forgery |
| 3 | Record present in this ledger | Distinguishes "unknown here" from "invalid" |
| 4 | Links correctly to its predecessor | Detects gaps and forks |

Detects **broken link · mutated payload · bad signature · unknown signer · sequence gap ·
fork**. Forks are stored rather than hidden — hiding one would defeat the purpose of the ledger.

> **Terminology.** This is a **tamper-evident hash-chained ledger**, not a blockchain. No
> consensus, no mining, no distributed agreement. Calling it a blockchain would be inaccurate —
> and consensus needs peers, which is exactly what a mine shaft does not have. **Choosing the
> weaker primitive is what buys the offline property.**

### 4 · Sustain — keeping it true after the certificate prints

**Spaced refreshers** at 2 / 7 / 21 / 60 days per domain. A pass advances the interval; a fail
resets it.

**Readiness decays** — full value for 7 days, then **linearly** to a 0.55 floor at day 90:

```
decayFactor(d) = 1                          for d ≤ 7
               = 1 − 0.45 × (d − 7) / 83    for 7 < d < 90
               = 0.55                       for d ≥ 90
```

From a base readiness of 88:

```
 88 ┤●───●
    │     ╲──●
 80 ┤         ╲──●
    │             ╲──●
 70 ┤─ ─ ─ ─ ─ ─ ─ ─ ─╲●─ ─ ─ ─ ─ pass mark ─ ─ ─ ─ ─ ─ ─ ─ ─
    │                   ╲──●
 60 ┤                        ╲──●
    │                             ╲──●
 48 ┤                                  ╲──●───── floor
    └──┬────┬────┬────┬────┬────┬────┬────┬────┬
       0    7   14   21   30   45   60   75   90   days
                                 ↑
                    certification lapses at day 46
                  90 s of refresher resets this
```

Linear rather than exponential **on purpose**. A real forgetting curve is closer to
exponential, but a linear slide is legible — a safety officer reads days-remaining off a roster
at a glance. The floor exists because training is degraded by disuse, not erased by it.

**Near-miss hazard reporting.** One photo, one tap, tagged by zone and compass bearing because
GPS does not work underground. Voice note instead of typing, because a worker who cannot
comfortably write Hindi can absolutely describe what he saw.

**Compliance dashboard.** Hesitation-risk list, hazard triage with bearing clusters, chain
integrity panel, QR verification, and CSV export shaped for **Mines Act 1952** and
**Factories Act 1948** record-keeping.

---

## Efficiency and compression

All figures below are **measured**, not estimated. Reproduce them by inspecting `dist/` after
`npm run build`.

### Shipped bundle

```
                          raw        gzip      brotli
three.js runtime      ████████████████████████████████████████  828.5 KB
        → brotli      █████████                                 183.3 KB   ▼ 78%

app + domain logic    ████████████████████████████              586.7 KB
        → brotli      ██████                                    132.5 KB   ▼ 77%

react + router        ███████                                   159.9 KB
        → brotli      ██                                         45.7 KB   ▼ 71%

tailwind css          █                                           23.8 KB
        → brotli      ▏                                            4.9 KB   ▼ 80%

workbox runtime       █                                           21.8 KB
        → brotli      ▏                                            6.7 KB   ▼ 69%
────────────────────────────────────────────────────────────────────────────────
TOTAL (12 files)      1643.2 KB  →  473.7 KB gzip  →  390.1 KB brotli  ▼ 76%
```

**First install over the wire** (brotli), and every launch after:

| Network | First install | Subsequent launches |
|---|---|---|
| 2G · 50 kbit/s | 62.4 s | **0 bytes** |
| 3G · 750 kbit/s | 4.2 s | **0 bytes** |
| 4G · 5 Mbit/s | 0.6 s | **0 bytes** |

Zero bytes after install because the whole shell is precached — 11 entries. **three.js is split
into its own chunk**, so a worker who never opens a 3D drill never downloads the renderer, and
the shell stays cacheable across releases.

### WebRTC signalling payload — fitting a session into a scannable QR

A raw WebRTC session description is too dense for a cheap phone camera to read reliably. The
obstacle is real and the fix is measurable:

```
raw SDP from the browser      ████████████████████████████████████  1054 chars   QR v19
 ↓ trimSdp — drop non-host ICE candidates and unused lines
trimmed                       ██████████████████████████████         882 chars   ▼ 16%
 ↓ deflate-raw + base64url
packed for the QR             ████████████████████                   663 chars   QR v14  ▼ 37%

no CompressionStream?         ████████████████████████████████████  1196 chars
 (trim + base64 only — still works, just a denser code)
```

Round-trip verified lossless, and the `srflx` candidate is correctly discarded — a
data-channel-only session on a shared LAN does not need it, and a smaller input deflates to a
smaller output.

**QR version 19 → 14** is the difference between a code a worker's phone struggles with and one
it reads first time.

### Certificate QR — the whole record, not a lookup

The payload uses **single-character keys** (`st`, `q`, `p`, `w`, `n`, `d`, `r`, `f`, `a`, `t`)
and encodes the signature algorithm as one letter. That is not obfuscation, it is budget:

```
self-describing keys          ██████████████████████████████████  343 chars
compact keys                  ███████████████████████             234 chars   ▼ 32%

full signed record in the QR  ███████████████████████████████████ 435 chars   QR v11
   └─ 192 of those 435 chars are the signature (128) + signer key (64)
      i.e. 44% of the payload is the crypto that makes it verifiable offline
```

A server-lookup URL would be ~60 characters — **and would need connectivity to mean anything.**
Carrying the entire signed record is what lets an inspector verify at the pit head with no
signal and no copy of the ledger. Round-trip verified lossless, including a worker name that
contains the `|` delimiter (the payload is deliberately last, and decoding splits on the first
four delimiters only).

### Media compression

| | |
|---|---|
| Photo longest edge | capped at **720 px**, JPEG quality **0.62** |
| Typical 12 MP phone photo | ~3500 KB → **45–70 KB** (**≈98% smaller**) |
| Voice note | hard-capped at **20 s**, so it cannot silently eat storage |
| Reports retained on device | **60** (ring buffer) |
| Oversize input | **> 40 MB is rejected**, not decoded — that is a broken or hostile file |

Storage pressure is handled rather than assumed: a quota failure surfaces as *"held for this
session only, ask your supervisor to sync"* instead of silently dropping a hazard report.

### Codebase

| | Files | Lines |
|---|---|---|
| `src/lib` — domain logic, pure, no DOM | 25 | 9,710 |
| `src/pages` | 14 | 5,774 |
| `src/components` | 10 | 2,722 |
| `src/context` | 1 | 21 |
| **Total** | **53** | **~18,700** |

Build: **690 modules**, no warnings, ~8 s.

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION      React 18 · React Router (hash) · Tailwind              │
│  13 routes · 14 pages · 10 components                                     │
│  ARDrill · DrillUI · Charts · GestureLayer · PeerSync · QrScanner          │
├───────────────────────────────────────────────────────────────────────────┤
│  DOMAIN LOGIC      src/lib — 25 modules, pure, no React and no DOM         │
│                                                                            │
│   TRAIN             ASSESS            CERTIFY          SUSTAIN            │
│   siteMap.js        assessment.js     chain.js         spaced.js          │
│   gesture.js        drills.js         certificate.js   hazards.js         │
│   speech.js         scenarioMeta.js   crypto.js        sync.js            │
│   pictograms.jsx    scenarios.js      identity.js      charts.js          │
│                                                                            │
│   SHARED            num.js · idb.js · local.js · i18n.js + i18nJaagruk.js  │
├───────────────────────────────────────────────────────────────────────────┤
│  PLATFORM          IndexedDB · Web Crypto · WebRTC · getUserMedia ·        │
│                    DeviceOrientation · Web Speech · MediaPipe WASM ·      │
│                    Service Worker + Workbox                                │
├───────────────────────────────────────────────────────────────────────────┤
│  PACKAGING         Capacitor 8 → Android APK (minSdk 29) · also a PWA      │
└───────────────────────────────────────────────────────────────────────────┘
                                        No backend. No account. No server.
```

**The load-bearing decision is the middle tier.** All domain logic — bearing maths, latency
grading, the hash chain, decay curves, chart geometry — is plain modules with no React and no
DOM. That is why it could be developed against executable checks, and why identical logic runs
in a browser, in the Android WebView, and in a Node script.

---

## Tech stack

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| UI | **React 18 + Vite 5 + Tailwind 3** | One codebase → APK, PWA and browser demo. ~8 s build, so iteration is not the bottleneck. |
| Routing | **HashRouter** | Every route is a fragment, so deep links work on any static host with **no rewrite rules**, and inside the Capacitor WebView with no native config. |
| Packaging | **Capacitor 8** · minSdk 29 | A real APK from the same build, no second codebase. |
| Local database | **IndexedDB** — `jaagruk` v1, 9 stores | The Room equivalent on web. Structured, indexed, quota-aware, holds blobs. |
| Crypto | **Web Crypto** — Ed25519 → ECDSA P-256 → HMAC ladder | Native audited primitives, with graceful fallback rather than failure on older WebViews. PIN hashing is PBKDF2, 210,000 iterations. |
| AR overlay | **getUserMedia + DeviceOrientationEvent** | Camera passthrough anchored to compass and pitch. No plugin, no ARCore dependency, any Android 10+ phone. |
| Hand tracking | **@mediapipe/tasks-vision** (WASM) | Same model family as native MediaPipe Hands. Fetched from CDN at runtime and cached to IndexedDB, so it never inflates the base bundle for the majority who will not enable it. |
| Peer-to-peer | **WebRTC `RTCDataChannel`** + QR signalling | No signalling server, no internet. See the compression figures above. |
| Voice | **Web Speech API** | Per-language locale mapping, fixed command lexicon, fuzzy matching. |
| Offline shell | **Workbox** via `vite-plugin-pwa` | 11 precached entries. Cold-boots with the network off. |
| 3D fallback | **three.js + React Three Fiber** | Phones with no usable camera or compass run the drill as a 3D scene rather than refusing to start. |
| Charts | **Hand-rolled inline SVG** | No charting library: the bundle already carries three.js, and these must render offline with zero runtime deps. Geometry (`charts.js`) is separated from rendering (`Charts.jsx`). |

**Deliberately not used:** any backend · auth provider · database service · charting library ·
state management library · component library · blockchain.

---

## Native reference vs this implementation

The reference design for this problem statement was **Kotlin + ARCore + Room + Nearby
Connections**. Every substitution and its honest cost:

| Component | Native design | Jaagruk | Fidelity |
|---|---|---|---|
| Site-Scan AR | ARCore Depth + Cloud Anchors | Camera + compass/pitch bearing anchors | **Functional for orientation-anchored overlay.** No depth mesh, no occlusion, no translational tracking. |
| Gesture input | MediaPipe Hands (TFLite) | `@mediapipe/tasks-vision` (WASM) | **Full** — same model family |
| Local database | Room / SQLite | IndexedDB, versioned, quota-aware | **Full** |
| Buddy pairing | Nearby Connections (Wi-Fi Direct + BT) | WebRTC + QR signalling | **Functional.** Needs a shared LAN or hotspot; Nearby brings its own radio. |
| Certificate signing | Ed25519 via Tink + Android Keystore | Web Crypto Ed25519, non-extractable key in IndexedDB | **Full crypto, weaker key isolation** — no hardware keystore. |
| Deferred sync | WorkManager | IndexedDB queue + `online` event + Background Sync | **Functional** |
| Hindi voice | Vosk offline model | Web Speech `hi-IN`, fixed lexicon | **Partial** — OEM WebView may use a network recogniser |
| Santali voice | Custom TFLite keyword spotter | Fixed lexicon on the `hi-IN` acoustic model | **Partial by design** — no production Santali ASR exists |
| Refresher alarms | AlarmManager exact alarms | Computed on device, surfaced on open + `periodicSync` | **Partial** — the web platform cannot wake a closed page |

**What the trade buys:** one codebase that ships as an Android APK, installs as a PWA on a
shared site tablet, and runs in a judge's browser with nothing to install. We do not write
"full" where it isn't.

---

## Data model

**IndexedDB `jaagruk` v1**

| Store | Key | Indexes | Contents |
|---|---|---|---|
| `workers` | `id` | `siteId`, `phone` | name, phone, pinHash, pinSalt, role, siteId |
| `chain` | `hash` | `siteId`, `seq`, `workerId` | signed certificate records |
| `keys` | `id` | — | device keypair handle, trusted site public keys |
| `attempts` | `id` | `workerId`, `domain`, `at` | per-step latency, grade, readiness |
| `schedule` | `id` (`workerId:domain`) | `workerId`, `dueAt` | interval index, lastPassAt, dueAt |
| `sites` | `id` | — | site, zones, anchors |
| `hazards` | `id` | `siteId`, `status`, `at` | report, thumbnail blob, voice blob |
| `syncQueue` | `id` | `kind` | pending outbound records |
| `blobs` | `id` | — | cached ML model, media |

Small synchronous settings (language, active session, toggles) live in `localStorage` under a
`jaagruk_*` namespace, with a one-time idempotent migration from the pre-rebrand keys.

---

## Offline model

```
UI action
  └─► write to IndexedDB            ← always succeeds first, never awaits network
        └─► append to syncQueue
              ├─ internet ─────────► POST batch (idempotency key)
              ├─ no internet ──────► gossip to a supervisor phone over WebRTC
              └─ never online ─────► signed export bundle (file hand-off)
```

Every write is **local-first, timestamped and additive**. Records are keyed by **content
hash**, so replaying a batch is always safe and two phones that diverged for a week converge by
set union with no reconciliation logic.

**What genuinely needs network** — only two things, and neither is a core path:

1. **AI hazard scan** — needs connectivity and a user-supplied Gemini or OpenAI key.
2. **Gesture control, on first use only** — the MediaPipe WASM runtime and model come from CDN,
   then the model is cached to IndexedDB. And nothing in the app is reachable *only* by gesture.

Everything else — onboarding, all six modules, AR overlay, latency scoring, buddy drill,
certificate issuance, chain verification, hazard reporting, refreshers, both dashboards — runs
with the network off.

---

## Security and integrity

| Concern | How it is handled | Honest boundary |
|---|---|---|
| Certificate forgery | SHA-256 over canonical JSON, signed by device key, chained by `prevHash` | — |
| Silent edit of a past record | Breaks every subsequent link; verification names the failing sequence number | — |
| Unknown issuer | Reported separately from "invalid"; trusting a new signer is an explicit supervisor prompt | Never a silent default |
| Worker identity | PIN, PBKDF2 210k iterations + per-worker salt, lockout after repeated failures | **Device-local identity, not an authorization boundary** |
| Supervisor access | Local PIN gate on `/admin` | **Not real authorization.** Production needs server-issued JWTs with RBAC |
| Key storage | Non-extractable Web Crypto handle in IndexedDB | **No hardware keystore.** Clearing site data destroys the device key — which is why records gossip to a second device |
| Data at rest | On-device only. No telemetry, no analytics | Photos and voice notes never leave the device until an explicit sync |

---

## Language and accessibility

**Six languages** — English · हिन्दी Hindi · ᱥᱟᱱᱛᱟᱲᱤ Santali (Ol Chiki) · বাংলা Bengali ·
ଓଡ଼ିଆ Odia · اردو Urdu. Around **430 UI keys**.

| Language | Coverage |
|---|---|
| English, Hindi, Bengali, Odia, Urdu | **100%** |
| Santali (Ol Chiki) | **~38%**, flagged in-app as unverified |

Coverage is **computed from the dictionaries at runtime and displayed in-app**, not asserted.
Santali was written by a non-native speaker as a starting point and needs native-speaker review
before deployment. Claiming full localisation would be one word on a slide and a real problem
in a pilot.

**Zero-literacy is a complete path, not a mode toggle** — onboarding itself works if you cannot
read. Every animation honours `prefers-reduced-motion`; charts carry text alternatives rather
than relying on colour.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm run preview
```

The AI hazard scan needs a free API key (Settings → Gemini or OpenAI). **Everything else works
without one, and without a network.**

### Checks

```bash
npm run verify       # every gate below, then the build
```

| Command | What it checks |
| --- | --- |
| `npm run a11y` | 16 structural accessibility and responsive checks over every `.jsx`: accessible names, form labelling, decorative SVG, focus order, reduced-motion escapes, the 320 px width budget, RTL logical properties and mirrored glyphs, live regions, field-tier touch targets, theme-blind colour literals, heading order. |
| `npm run a11y:selftest` | Plants one instance of each fault in a synthetic file and asserts every check catches it. Exists because the first version of the accessible-name check passed a button that had no name — `/<[^>]*>/` stops at the `>` inside `onClick={() => …}`, leaking handler source into what the check read as label text. |
| `npm run i18n` | English text stored in another language's slot; values written in the wrong script; figures dropped in translation (compared across numeral systems, so Bengali ৪ counts as 4); characters outside a shipped font subset, which render as a permanent box offline while failing nothing in the build; fallback chains that do not end in a fully covered language. Self-tests against the four nav labels that historically held English in the Santali slot. |
| `npm run translit` | Ol Chiki → Devanagari transliteration: 14 hand-derived words, then all 583 Ol Chiki strings in the app, asserting no Ol Chiki survives and no vowel sign is left unattached. |
| `npm run santali:worksheet` | Regenerates `docs/santali-worksheet.csv` — all 573 Santali strings with English and Hindi source, the current Ol Chiki, and which file to correct it in, ordered by consequence. |

**On Santali specifically:** coverage is 100%, verification is 0%. Those are tracked
separately on purpose — `SANTALI_VERIFIED` in `src/lib/i18nSantali.js` is what the in-app
notice reads, not the coverage percentage, so reaching 100% does not silence the warning.
Scenario prose is not machine-authored and resolves to Hindi.

These are static checks. They cannot see rendered layout, so the device matrix in
`docs/DEPLOYMENT.md` §10 is still required before a demo.

### Android

```bash
npm run android:sync   # vite build + cap sync android
npm run android:open   # opens Android Studio
```

Then **Build → Generate Signed Bundle / APK → APK → release**.

### Testing the buddy drill

Two phones on the same wifi or hotspot: one taps *Start a drill*, the other *Join my buddy*,
then they scan each other's QR codes. To see it on one machine use *Practise on one device* and
open a second tab — clearly labelled as practice, not the real two-person exercise.

---

## Deploy

> **HTTPS is a functional requirement, not a best practice.** `crypto.subtle` is `undefined` on
> insecure origins, so over plain HTTP certification cannot run at all. Camera, compass, WebRTC
> and the service worker are gated the same way. `localhost` is exempt; nothing else is.

Because routing is hash-based and the asset base is relative, **no rewrite rules are needed on
any host** and the same artefact deploys to a domain root, a sub-path, or the Capacitor WebView.

```bash
npm run build
wrangler pages deploy dist --project-name jaagruk
```

Recommended: **Cloudflare Pages** (free, unlimited bandwidth, strong India PoPs, reads
`public/_headers`) — or **Firebase Hosting** if you later add a Firebase backend.

Full guide, cache policy, CSP origins, APK signing and an 11-point post-deploy checklist:
**[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

---

## Project structure

```
src/
├── lib/                     domain logic — pure, no React, no DOM
│   ├── num.js               strict numeric coercion (see Verification)
│   ├── idb.js               IndexedDB wrapper, 9 stores, quota handling
│   ├── crypto.js            SHA-256, canonical JSON, signing ladder
│   ├── identity.js          device key, PIN hashing, trusted signers
│   ├── chain.js             hash-chained ledger, QR encode/decode
│   ├── certificate.js       eligibility on decayed readiness
│   ├── assessment.js        latency grading, readiness composite
│   ├── spaced.js            intervals, decay curve
│   ├── siteMap.js           bearing anchors, AR projection
│   ├── gesture.js           MediaPipe hand tracking
│   ├── speech.js            voice I/O, command lexicon
│   ├── pictograms.jsx       39 ISO 7010 glyphs
│   ├── scenarios.js         6 modules, 18 timed decisions
│   ├── scenarioMeta.js      per-step targets, seeded choice shuffle
│   ├── p2p.js               WebRTC + QR signalling codec
│   ├── drills.js            buddy drill state machine
│   ├── hazards.js           reporting, photo/voice compression, triage
│   ├── sync.js              queue, gossip, export bundle
│   ├── charts.js            chart geometry, pure
│   └── i18n*.js             6 languages, runtime coverage
├── components/              ARDrill · DrillUI · Charts · GestureLayer · PeerSync · QrScanner
├── pages/                   14 screens
└── context/                 language provider

docs/
├── ARCHITECTURE.md          four layers, native mapping, data model, limitations
├── DEPLOYMENT.md            hosting, HTTPS requirement, APK, checklists
└── PRESENTATION.md          slide content, demo script, Q&A prep, fact sheet
```

---

## Verification

Domain logic was developed against executable checks covering SHA-256 (cross-checked against
Node's own implementation including multi-byte UTF-8), RFC 4231 HMAC vectors, chain
tamper/fork/link detection, QR round-tripping with separator-containing names, latency grading
boundaries, decay curve boundaries, WebRTC signal compression, buddy-drill state divergence,
hazard triage transitions, gossip idempotency, and bearing maths across the 359°/0° seam.

**Three bugs it found are worth naming, because all three silently corrupted data:**

| Bug | Effect | Fix |
|---|---|---|
| `Number(null) === 0` | A dropped compass reading was stored as a valid bearing of **due north**, putting AR markers in the wrong place | `src/lib/num.js` **allowlists** `number` and `string` rather than blocklisting traps — `Number([])` is also `0` and `Number(true)` is `1`, so the blocklist kept growing |
| The safe answer was `choices[1]` in **all 18 steps** | A worker who noticed could score 100% without reading, making every readiness figure meaningless | Seeded, render-stable per-attempt shuffle — seeded so buttons never reorder under a worker's thumb mid-decision |
| `translateScenario` returned a new object each render | Non-English users had feedback narration **silently cancelled** — an effect keyed on it re-ran and cleaned up the speech it had just started | Memoised |

### Reachability

Features that exist but cannot be reached are worse than features that do not exist, so the
codebase was audited for them. **Two subsystems were built and never wired up**, and both are
now live: gesture control is mounted in the app shell, and peer-to-peer gossip sync is reachable
from the Admin panel.

The same audit against the translation dictionary found **six strings defined but never
rendered — each marking a real gap**, not dead text:

| String | Gap it revealed |
|---|---|
| `bd_connecting` | WebRTC negotiation showed "waiting for buddy" for seconds, reading as nothing happening |
| `as_your_time` / `as_target_time` | The grade pill showed `4.2s / 9s` with no indication which was which |
| `as_decide_now` | The latency bar changed colour past target but never said so in words |
| `db_live` | The pulsing refresh indicator had no text alternative |
| `db_showing` | Filtering the attempt list silently hid rows without saying how many |
| `ar_turn_around` | Facing entirely the wrong way in AR produced only a small edge chevron |

Twenty-three genuinely dead strings from the pre-rebrand UI were removed. The dictionary now has
**no unreachable key and no missing reachable key, in any of the six languages.**

---

## Honest limitations

Stated here rather than buried, because a judge will ask — and because a system whose weaknesses
you can name is easier to trust.

1. **No depth or SLAM.** Markers anchor to bearing and elevation, not a 3D mesh. They hold
   direction as you turn but do not occlude behind real geometry or survive large translation.
   *ARCore Depth + Cloud Anchors is the upgrade path.*
2. **Magnetometer drift.** Steel plants and shafts distort magnetic heading. Detected, with
   manual re-centring offered — but a sensor limit, not a software one.
3. **No production Santali ASR exists.** Santali text and audio output are real; Santali voice
   *input* matches a fixed lexicon against a Hindi acoustic model.
4. **Santali translations are unverified** and need native-speaker review. Flagged in-app.
5. **PIN is device-local identity, not authorization.** Same for the `/admin` gate. Production
   needs server-issued credentials with RBAC.
6. **No hardware keystore.** Keys are non-extractable Web Crypto handles. Clearing site data
   destroys the device key — hence gossip to a second device.
7. **Reaction-time baselines are reasoned, not yet measured** against a worker cohort.
   Deliberately generous, because over-flagging hesitation would erode trust in the flag.
8. **The web platform cannot wake a closed page on a schedule.** Refreshers surface on app open.
9. **The buddy drill needs a shared LAN or hotspot.** Nearby Connections can bring up its own
   radio transport; a browser cannot.
10. **No DGMS server in this submission.** The client sync half is complete and configurable;
    the shipped path is a signed export bundle.

---

## Roadmap

| Phase | Work | Unlocks |
|---|---|---|
| **Pilot** · 0–3 mo | One site, one ITI. Native-speaker Santali review. Measure real reaction times across a cohort. | Calibrated baselines, verified translations |
| **Harden** · 3–6 mo | DGMS sync server, server-issued credentials with RBAC, hardware-backed keystore | Real authorization, audit-grade key custody |
| **Anchor** · 6–9 mo | Merkle-root anchoring of the chain to a public or permissioned ledger — hashes only, no PII, one transaction per batch | Public non-repudiation without breaking offline issuance |
| **Native AR** · 9–12 mo | ARCore Depth + Persistent Cloud Anchors; Nearby Connections pairing | Occlusion, translational tracking, radio-independent pairing |

Calibration and translation review come **first**, deliberately — they are the two things
currently flagged as unverified, and you cannot harden a system whose baselines you have not
measured.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | The four layers, native→web mapping with an honest fidelity column, data model, offline write path, §9 limitations |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Why HTTPS is functional not optional, host comparison, cache policy, CSP origins, APK signing, post-deploy checklist, failure table |
| [`docs/PRESENTATION.md`](docs/PRESENTATION.md) | Slide-by-slide deck with speaker notes, 12-step demo script, prepared Q&A, diagram sources, fact sheet |

---

<div align="center">

**Not "trained in March." Aware today.**

*A certificate says a worker was trained. Jaagruk says whether he is ready — and it can tell
you that this morning, on a phone, with no signal.*

</div>
