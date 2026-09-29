# Jaagruk — jury scripts

Two scripts and a reconciliation table.

| Part | What it is |
|---|---|
| [Part 1](#part-1--the-web-platform-8-minute-script) | This repository's 8-minute script |
| [Part 2](#part-2--merged-script-native--web-8-minute) | Merged script — native app + web platform as one submission |
| [Part 3](#part-3--reconciliation-where-the-two-scripts-contradict-each-other) | Where the two projects contradict each other, and which claim survives |
| [Part 4](#part-4--number-provenance) | Every number, and the command that produces it |

**On timing.** 8 minutes at 135 wpm is about 1,080 spoken words. Counted:

| Script | Spoken words | At 135 wpm |
|---|---|---|
| Part 1 — web platform | 1,111 | 8.2 min |
| Part 2 — merged | 1,144 (1,099 with the marked optional cut) | 8.5 min (8.1 min) |
| Mobile script as supplied | **1,573** | **11.7 min** |

The mobile script is labelled "roughly 1,050 words." It is 1,573. To fit 8 minutes it needs to lose
about 490 words — roughly a third. Part 3 marks what to cut, in order.

**Read the bracketed stage directions, do not say them.**

---

## Part 1 — the web platform, 8-minute script

### 0:00 – 0:45 · The gap between trained and ready

"Good morning. Jaagruk, problem statement 26041.

Safety training here isn't missing. Inductions and annual refreshers exist. It produces a
certificate rather than a reflex.

A worker passes a written test in March. In September a gas alarm sounds and he stands still for
eleven seconds. Nothing in the current system can see those eleven seconds.

The baseline reading of this problem statement — AR overlay, quiz, QR certificate, dashboard — is
correct scope, and it leaves three failures untouched. Workers who know the right action still
freeze. Retention collapses within a week. And the buddy system is two humans under stress, which
you can't train alone with a phone.

We built against those three. The AR is delivery, not the point."

### 0:45 – 1:20 · What it is

"Offline-first, on the phone the worker already owns. Nine modules, fifty-four individually timed
decisions, covering all five certification domains the problem statement names plus four more.

One codebase. It ships as an Android APK through Capacitor, installs as a PWA on a shared tablet,
and runs in your browser with nothing installed.

No backend, no account, no connectivity requirement. A system that needs a server to certify a
worker can't certify a worker two hundred metres underground."

### 1:20 – 2:35 · Measuring the decision, not the answer

"When a gas alarm fires in our drill, we don't only record which valve he isolates. We record how
long he took to decide, against a target set for that step.

Readiness is seven-tenths accuracy, three-tenths speed — and speed counts only on correct
decisions, because fast and wrong isn't partial success, it's the failure mode.

Within target is fast. Within twice target is normal. Beyond that is slow, and slow raises a
hesitation flag.

That flag is why this project exists. A worker who answers everything correctly but takes three
times the window on two steps passes a conventional quiz, and appears on our dashboard as a
retraining candidate. That's the man who freezes in September.

Targets aren't one global number. An escalating fire with black smoke gets six seconds — every
second deciding is a second of smoke in the lungs. A colleague's persistent cough gets thirteen,
because that's an occupational health judgement, and a snap answer is the wrong instinct.

And past ten minutes we grade unknown, not slow. He walked away; he didn't hesitate."

### 2:35 – 3:35 · The certificate verifies with nothing

[Put a phone in airplane mode on the projector here.]

"The QR isn't a lookup key. The QR is the certificate.

Three hundred and seventy-nine characters — site, sequence number, worker, per-domain scores and
readiness, hesitation flags as a bitfield, the previous record's hash, and an Ed25519 signature. A
hundred and forty-five of those characters — thirty-eight per cent — are the signer key and the
signature. That's the cryptography that makes it verifiable with no signal.

Every record embeds the hash of the one before it. Edit any field and every subsequent link fails.

Verification reports four independent signals, never one badge: intact and correctly signed, signer
known to this phone, present in this ledger, links correctly to its predecessor. A genuine record
from a phone this device has never trusted is not a forgery, and an inspector has to tell those
apart.

To be exact: a tamper-evident hash-chained ledger. Not a blockchain. Consensus needs peers, and a
mine shaft is the absence of peers."

### 3:35 – 4:30 · Statutory validity is not readiness

"Readiness decays. Full value for seven days, then linearly to a floor of fifty-five per cent at
day ninety. Linear deliberately — a real forgetting curve is closer to exponential, but a safety
officer reads days-remaining off a roster at a glance.

Certification is gated on decayed readiness of seventy in each of the five domains — competence
today, not a date stamp from March.

Take a worker who passes at eighty-eight. Day forty-five he's at seventy — last day still
certified. Day forty-six, sixty-nine, and it lapses. The app shows him that date before it
arrives.

Ninety seconds of refresher resets it, on a schedule of two, seven, twenty-one and sixty days.

A conventional certificate rewards passing once. This one rewards staying sharp, and names who's
drifting before the audit."

### 4:30 – 5:25 · Built for the actual worker

"Six languages — English, Hindi, Santali in Ol Chiki, Bengali, Odia, Urdu. Six hundred and one
keys each, and a gate that fails the build if a language drops a key, holds English in another
language's slot, or loses a figure in translation.

Santali coverage is a hundred per cent. Santali verification is zero. Tracked separately on
purpose: the in-app notice reads the verified flag, not the coverage number.

Thirty-nine ISO 7010 pictograms, the shapes already painted on a DGMS-regulated wall. And no
pictogram on a choice button reveals the answer, enforced by a check, because a green tick on the
safe option turns a safety assessment into colour matching.

Field controls are fifty-six pixels, not the forty-four-pixel web default. That default assumes a
bare fingertip on a lit screen; a missed tap during a six-second timer is a failed decision.

And the buddy drill is two real phones over WebRTC, no server. An AI buddy trains none of the
coordination, which is the part that fails."

### 5:25 – 6:15 · The bet, and what it costs

"The reference design here is Kotlin and ARCore, so let me answer why this isn't native before you
ask.

An anchor here is a direction, not a 3D point. The supervisor aims the phone at the real exit and
taps; we store the magnetic bearing and elevation. The marker holds over that exit as the worker
turns. What we give up is occlusion and the hardware keystore.

Steel distorts magnetic heading, so we detect low-confidence compass data, fall back to
gyro-relative, and tell the worker which mode he's in. A marker shown confidently in the wrong
place is worse than an admitted degraded sensor.

What the trade buys: the same build is an APK, a PWA, and this browser."

### 6:15 – 7:05 · Verified, and what we won't claim

"One command runs it — a hundred and seventy-one tests, sixteen accessibility checks, two
translation gates, then the build. Zero failures.

Those checks found three bugs I'd rather name than have you find. In JavaScript, Number of null is
zero, so a dropped compass reading was stored as a bearing of due north. The safe answer sat in
the same position in every step, so anyone who noticed could score a hundred per cent without
reading. And a translation helper returned a fresh object each render, silently cancelling
feedback narration for every non-English user.

Our reaction-time baselines are reasoned, not measured against a cohort. That's the weakest part
of this submission."

### 7:05 – 8:00 · Close

"No headset. No server. No connectivity. One supervisor walkthrough per zone, and after that it
runs on the phone the worker already carries, two hundred metres underground, in Santali if that's
what he speaks.

A certificate says a worker was trained. Jaagruk says whether he's ready — this morning, on a
phone, with the radio off.

Not trained in March. Aware today. Thank you."

---

## Part 2 — merged script, native + web, 8-minute

Use this if both builds are presented as one submission. The organising claim is **one platform,
two runtimes, one measurement standard** — and the certificate records which runtime produced it.
Where a number belongs to only one build, the script says so out loud. That is what makes the merge
credible instead of a superset of two brochures.

### 0:00 – 0:45 · The four failures

"Good morning. Team DRAGSAFE, problem statement 26041.

Classroom safety training retains under twenty per cent after one week — that figure is in the
problem statement. We spent our time on why, and found four things.

Training is delivered where there is signal. It's needed four hundred metres underground, where
there is none.

A certificate says a worker passed a test once. It says nothing about today.

A quiz measures whether he knows the answer. It doesn't catch the four-second freeze that kills
people.

And a text-heavy app is unusable by a low-literacy Santali speaker, which describes a large part of
this workforce.

We built against those four. The AR is delivery, not the point."

### 0:45 – 1:30 · One platform, two runtimes

"Jaagruk ships as two builds from one design.

A native Android app — ARCore where the handset supports it, an on-device language model, Nearby
Connections for the buddy drill. And a web platform that installs as an APK, as a PWA on a shared
tablet, or runs in your browser with nothing installed.

Both are offline-first, with the same scoring rule, baselines and certificate format.

The reason for two is reach. About a third of mid-range Android stock here isn't ARCore-certified —
disproportionately the handsets a contract worker owns. Marking ARCore required would make us
invisible on Play to exactly the people this PS is about.

So there are fidelity tiers, and the tier is recorded on the certificate. A run that fell back can
never claim it happened in a site-scanned scene."

### 1:30 – 2:45 · Measuring the decision, not the answer

"When a gas alarm fires, we don't only record which valve he isolates. We record how long he took to
decide, per step, against a baseline authored from DGMS circulars.

Readiness is seven-tenths accuracy, three-tenths speed, and speed counts only on correct decisions
— fast and wrong is the failure mode, not partial success.

Correct-but-slow is why this project exists. A quiz marks that worker passed. We mark him passed,
flag his certificate, and put him on a list a safety officer can act on — because a man who takes
nine seconds to find an exit in training is the man who freezes in smoke.

Two guards, both on the native build.

Timing is off a monotonic clock, never the wall clock. On a shared phone whose clock is corrected
mid-shift, a wall-clock delta can go negative — and a negative latency corrupts the one measurement
this platform rests on.

And interruption isn't hesitation: if tracking drops, the clock stops, and the overlay says paused
time isn't counted."

### 2:45 – 3:40 · The certificate verifies with nothing

[Put a phone in airplane mode on the projector here.]

"The QR isn't a lookup key. The QR is the certificate.

Two hundred and sixteen characters on native, three hundred and seventy-nine on web. Mostly
cryptographic material, and a hash of the worker ID rather than the ID itself.

Each record hashes the payload plus the signature of the one before it. Hashing the payload alone
would let a record be re-signed under another key and spliced in undetected.

An inspector scans with the radio off and gets one of nine verdicts, not two — sequence gap, broken
link, bad signature, unknown site key, malformed. Collapsing those into valid or invalid would
either cry wolf on every fresh handset or hide real tampering, and inspectors stop trusting the
tool.

And we show tampering rather than describe it — our seed data plants a broken link at sequence
four."

### 3:40 – 4:30 · Statutory validity is not readiness

"Our strongest finding is one line on the dashboard.

Readiness is computed on read, never stored — so there's no nightly job that could have failed
silently, and a handset back from six weeks underground reports correctly the instant it powers on.

Take a worker who passes at eight hundred and fifty. Day thirteen he drops below ready. Day
thirty-five, stale. Day sixty-eight, expired.

Day three hundred and sixty-five: his readiness is three out of a thousand, and his statutory
certificate is still valid. He is legally cleared to enter a confined space and retains almost
nothing.

We report both and never merge them: the cohort that is statutorily valid and operationally stale is
exactly the one a blended score hides. A refresher renews readiness and never renews the legal
clock, and the button says so."

### 4:30 – 5:25 · Built for the actual worker

"Three languages on native, six on web — English, Hindi, Santali in Ol Chiki, Bengali, Odia, Urdu.
Around six hundred keys each, verified equal — and the gate fails the build on a glyph outside its
shipped font subset, which renders as a permanent box offline while failing nothing else.

Santali coverage is complete; Santali verification is zero, and the in-app notice reads the
verification flag, not the coverage number.

Up to seventy-three ISO 7010 pictograms, zero text.

Santali has around seven million speakers in these districts, and no speech engine supports it. So
native fixes a nineteen-word vocabulary, a supervisor records it once per site, and we match with
MFCC and dynamic time warping on device.

Touch targets are sixty-four dp on native and fifty-six pixels on web, against platform defaults of
forty-eight and forty-four — because a glove slip at the default gets recorded as a wrong decision,
which is measurement error presented as a training result."

[Optional cut: that last paragraph is 45 words. Drop it and Part 2 lands at 8.1 minutes.
Keep it if you are not being hard-timed — it is one of the strongest concrete details in the script.]

### 5:25 – 6:15 · The on-device model, and where we refused to put it

"Native runs a language model on the handset — Gemma 3, one billion parameters, four-bit quantised,
through llama.cpp on the CPU. Offline.

It can't answer from itself. Every response is retrieved from a corpus we authored against the
Mines Act, Factories Act, Mines Rules 1955 and DGMS methane action levels, and carries its citation.
If retrieval finds nothing, no model runs and the worker is told to ask a supervisor.

And it's unloaded the moment a drill starts, by interlock — because latency measured on a throttled
frame loop measures the phone, not the worker.

So the model never scores anyone, never signs anything, and never decides who is certified. On a
safety product, that boundary is the engineering."

### 6:15 – 7:05 · Cost, compliance, verification

"Built around the statutory training duties in the Mines Act 1952 and the Factories Act 1948.

Zero capital cost per site. No headsets, no server. The native APK is twenty-seven megabytes; the
web shell is seven hundred and eighty-two kilobytes on first install and zero bytes on every launch
after.

Verification is one command: on web, a hundred and seventy-one tests, sixteen accessibility checks
and two translation gates; on native, over nine hundred and fifty tests and fifty-six live HTTP
checks.

Our baselines are authored, not yet empirical. Pilot scope is one mining site plus one ITI, which is
what replaces them with measured times. And our repository ships a capability matrix separating what
is built from what is partial from what is designed."

### 7:05 – 8:00 · Close

"Safety training shouldn't depend on a lecture once a year, and it shouldn't fail because there's
no signal in a shaft.

Jaagruk measures the decision instead of the answer. It reports that a valid certificate and a
ready worker are two different things. And it verifies that certificate at the mine gate with the
radio off.

Jaagruk means alert. Watchful. Not trained once.

Thank you."

---

## Part 3 — reconciliation: where the two scripts contradict each other

Everything in this table is a claim one build supports and the other does not. A judge who hears
both scripts unreconciled will catch these. Fix them before the demo, not during it.

### Claims that are native-only — do not say them about the web build

| Claim | Native | This repository | Status |
|---|---|---|---|
| Monotonic decision clock | Yes | **No — `Date.now()`** in `Scenario.jsx:189` and `Refresher.jsx:138` | **Real gap.** A mid-shift clock correction can produce a negative latency. Roughly a five-line fix to `performance.now()`. |
| Clock pauses on interruption | Yes | No | Not implemented |
| Sub-250 ms answers void a run as a guess pattern | Yes | No | Not implemented. Web has the inverse guard: >10 min → `unknown`. |
| Five outcomes including `TIMED_OUT` / `SKIPPED` | Yes | Four grades plus incorrect | Close, not identical |
| Fidelity tier signed into the certificate | Yes | **No** — payload is `v k st q p w n d r f a t`, no tier field | **Real gap**, and the strongest single idea to port over |
| Chain hashes payload **plus previous signature** | Yes | Payload only, with `prevHash` inside it | Native is stronger. Web would catch a re-sign as `UNKNOWN_SIGNER`, not as a broken link. |
| On-device Gemma 3 with an authored RAG corpus | Yes | No — optional cloud hazard scan, user-supplied key | Native-only |
| Santali voice via MFCC + DTW, 19-word vocabulary | Yes | Fixed lexicon on the `hi-IN` acoustic model | Native is genuinely stronger here |
| 950+ tests, 56 live HTTP checks | Yes | 317 tests, 4 gates, no server to check | Native-only |
| 27 MB APK | Yes | Not measured in this repo — do **not** quote it for web | Unverified here |

### Claims that are web-only — do not say them about the native build

| Claim | Where it comes from |
|---|---|
| Six languages, 628 keys, all at 100% (native script says three at 603) | `npm run i18n` |
| Runs in a judge's browser with nothing installed | HashRouter plus relative asset base, no rewrite rules on any host |
| Nine chain verdict codes | `chain_OK BAD_HASH BROKEN_LINK BAD_SIGNATURE UNKNOWN_SIGNER SEQ_GAP FORK DOMAIN_MISMATCH UNSUPPORTED_VERSION` |
| 9 modules, 54 timed decisions | `SCENARIOS` — native script says 5 modules, 11 scenarios |
| Transliteration gate: 639 Ol Chiki strings, 0 floating matra | `npm run translit` |
| Gyro-relative fallback with explicit re-centre when the magnetometer is unreliable | `src/lib/siteMap.js` |

### Numbers that differ and cannot be averaged

- **Decay model.** Native: 45-day half-life, extending 50% per completed refresher, capped at 180
  days, on a 0–1000 scale. Web: flat for 7 days then linear to a 0.55 floor at day 90, on a 0–100
  scale with a pass mark of 70. Different curves on different scales. Pick one per build and never
  blend them in a sentence.
- **QR payload.** Native 216 chars / 81% crypto. Web 379 chars / 38% crypto. The gap is real and
  explainable — the web record carries five per-domain scores, five readiness values and the
  worker's name. Always say which build you are quoting.
- **Pictograms.** Native 73, web 39.
- **Touch targets.** Native 64 dp, web 56 px field tier (44 px elsewhere, the WCAG minimum).

### Two claims in the mobile script that this repository cannot back

1. **"DGMS Dhanbad recorded 48 fatal mine accidents in Jharkhand in 2022-23."** Not in this repo.
   It is an external citation — have the source in hand, because it is the first number a panel will
   test.
2. **"A large share involved workers with under thirty days of orientation."** Same. Either cite it
   or soften it to what the problem statement itself says.

### If the mobile script must fit 8 minutes

It is 1,573 words against a 1,080 budget — about 490 to lose. Cut in this order and it survives:

1. The second half of the on-device-model section — keep the interlock and the "never scores
   anyone" boundary, drop the six-outcome guard detail.
2. The QR byte-budget arithmetic — keep "the QR is the certificate" and the chain-splice reasoning,
   drop the 81%.
3. The acoustic-separation-profile test detail — keep "we fixed a 19-word vocabulary and match on
   device."
4. The 250 ms guess-pattern paragraph. It is excellent, and it is the third example in a row about
   timing honesty. Two is enough.

Never cut: correct-but-slow, statutorily-valid-but-stale, the airplane-mode verification, or the
capability matrix.

---

## Part 4 — number provenance

Every figure in Part 1, and the command that produces it. Re-run before the demo — several numbers
in `docs/PRESENTATION.md` and `README.md` have drifted from the code and are listed at the bottom.

### Measured live

| Figure | Value | Source |
|---|---|---|
| Tests | 317 tests, 63 suites, 0 failures | `npm test` — this number moved from 163 during one working session, so re-run it on the day |
| Accessibility checks | 20 passed, 0 failures, 0 warnings | `npm run a11y` — 13/13 confirmed live by `a11y:selftest` |
| Contrast | 9 checks, both themes, 0 failures | `npm run contrast` — WCAG luminance computed from the tokens, not asserted in a comment |
| Translation keys | 628, six languages, all 100% | `npm run i18n` |
| Transliteration | 14 hand-derived words + 639 Ol Chiki strings, 0 surviving, 0 floating matra | `npm run translit` |
| Modules / timed decisions | 9 modules, 54 steps, 5 certification domains | `SCENARIOS` in `src/lib/scenarios.js` |
| Certificate QR | 379 chars, Ed25519, QR version 11 | `encodeCertQr` — signer 59 + signature 86 = 145 chars = 38% |
| Compact keys saving | 225 chars vs 306 self-describing (26% smaller) | `canonicalJson` on both shapes |
| Chain verdicts | 9 codes plus `vf_unreadable` | `src/lib/i18nJaagruk.js` |
| Pictograms | 39 | `PICTOGRAMS` in `src/lib/pictograms.jsx` |
| Readiness formula | `0.7 × accuracy + 0.3 × speed` | `ACCURACY_WEIGHT` / `SPEED_WEIGHT` in `assessment.js` |
| Speed scores | fast 100 · normal 70 · slow 35 · unknown 70 | `SPEED_SCORE` |
| Grade thresholds | ≤ target · ≤ 2× target · > 2× target · > 10 min = unknown | `gradeLatency` |
| Step targets | 6 s → 13 s, default 9 s | `src/lib/scenarioMeta.js` |
| Refresher intervals | 2 / 7 / 21 / 60 days | `INTERVALS_DAYS` in `spaced.js` |
| Decay | flat 7 days, linear to a 0.55 floor at day 90 | `DECAY_GRACE_DAYS` / `DECAY_FLOOR_DAYS` / `DECAY_FLOOR` |
| Certification gate | 70 effective readiness in each of 5 domains | `PASS_THRESHOLD` in `certificate.js` |
| Lapse from base 88 | day 46 | `decayFactor(45) = 0.794 → 70`; `decayFactor(46) = 0.789 → 69` |
| PIN hashing | PBKDF2, 210,000 iterations, per-worker salt | `hashPin` in `crypto.js` |
| Touch targets | 56 px field tier, 44 px minimum, 96 px pictogram choices | `Button.jsx`, `DrillUI.jsx` |
| Bundle chunks | index 913.2 kB · three 853.6 kB · react 163.7 kB · css 49.9 kB | bytes on disk in `dist/assets` |
| Code over the wire | 1,959 KiB raw → 442 KiB brotli (77% smaller) | measured with `node:zlib` at quality 11 |
| Precached shell | 37 entries, 2,310 KiB raw → 786 KiB brotli | `dist/sw.js` plus brotli |
| First install | 2G ≈ 129 s · 3G ≈ 8.6 s · 4G ≈ 1.3 s · **0 bytes after** | 786 KiB at 50 kbit/s, 750 kbit/s, 5 Mbit/s |
| Build | ~10 s, no warnings | `npm run build` |
| Source | 14 pages · 14 components · 36 modules in `src/lib` | file count |

Read the chunk sizes off disk, not off the Vite console. Vite and Workbox report the
character length of a chunk, and the index chunk carries the six-language string tables where
one Devanagari or Ol Chiki character is three UTF-8 bytes. Vite prints 690.49 kB for a file
that is 913,206 bytes on disk. Quoting the console figure would claim a lighter download than
the phone actually makes, because the service worker stores bytes, not characters.

### Documented but not reproducible outside a browser

Say these only if you are willing to be asked how they were measured. They come from an in-browser
session and cannot be recomputed in Node.

- WebRTC signalling: raw SDP 1054 → `trimSdp` 882 → `deflate-raw` + base64url 663 chars,
  QR v19 → v14; 1196-char fallback without `CompressionStream`.
- Hazard photo: 12 MP ≈ 3500 KB → 45–70 KB at 720 px / q0.62.

### Stale numbers in the existing docs — do not read these off the deck

| Doc says | Code says |
|---|---|
| 6 modules, 18 timed decisions | **9 modules, 54 decisions** |
| ~430 UI keys | **628** |
| Santali ~38%, "flagged as partial" | **100% coverage, 0% verified** — the notice reads the verified flag |
| 25 lib modules · 10 components · 13 routes | **36 · 14 · 16** |
| QR 435 chars, 44% crypto, signer 64 + sig 128 | **379 chars, 38%, signer 59 + sig 86** |
| 11 precached entries, ~1.6 MB | **37 entries, 2.26 MiB** — font subsets were added |
| First install 62 s on 2G | **≈129 s** — the old figure excluded fonts |
| 1643 KB raw → 390 KB brotli | **1,959 KiB raw → 442 KiB brotli** |
