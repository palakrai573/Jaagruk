# Jaagruk

**AR-based vocational training and safety certification for Jharkhand's mining and manufacturing sector.**

Smart India Hackathon problem statement **26041** — Government of Jharkhand, Department of Higher & Technical Education.

---

## The one-line version

A phone-only safety trainer that teaches workers inside their *actual* worksite, tests them the way a real emergency would — correctness **and** reaction time — certifies them into a tamper-evident offline ledger, and turns every trained worker into a live hazard sensor for the site.

---

## Why the obvious build isn't enough

The baseline reading of this problem statement is: AR overlay → quiz → QR certificate → dashboard. That is the correct scope, and it is also what every other submission will be. It leaves the three things that actually cause the problem untouched:

| The real problem | What a quiz-and-certificate app does about it | What Jaagruk does |
|---|---|---|
| Workers who *know* the right action still freeze during evacuations | Nothing. Right/wrong scoring cannot see hesitation. | Every decision is timed against a calibrated baseline. Correct-but-slow is flagged for retraining instead of quietly passed. |
| Retention falls below 20% after one week | Nothing. A one-time module makes the first exposure better, not stickier. | Readiness **decays** with time since the last pass and recovers on a 90-second refresher. Certification is gated on today's score, not the test date. |
| The buddy system is two humans coordinating under stress | Simulates the buddy as an AI character, which trains none of the coordination. | Two real phones, paired directly over WebRTC with no server and no internet. Scored on check-in discipline and how long you took to notice your buddy collapse. |

---

## Deliverables against the expected solution

| Required | Status |
|---|---|
| Working Android APK | Capacitor project configured, `minSdk 29` (Android 10+). `npm run android:sync` |
| At least two complete AR training modules | **Six** modules covering all five named safety domains, plus a bonus manual-handling module |
| Assessment engine | Accuracy + reaction-time latency grading, hesitation detection, decaying readiness |
| QR certificate generation and verification | Ed25519/ECDSA-signed hash-chained ledger; QR carries the whole record for offline verification |
| Hindi and Santali localisation | 6 languages. Hindi 100%. Santali in Ol Chiki, partial and **explicitly flagged as unverified** |
| Offline functionality | Training, assessment, certification and verification all work with no network |
| Web admin compliance dashboard | Compliance, hesitation-risk list, hazard board, ledger integrity, QR verify, statutory CSV export |

---

## The four layers

### 1 — Training

- **Site-Scan AR.** A supervisor walks a real corridor once and marks where the exits, extinguishers and gas zones actually are. Each anchor stores the compass bearing and elevation of that sighting, so during a drill the marker reprojects over the real object. "The exit is left past the second pillar" gets learned in the actual corridor. The scan exports as a small JSON file, so one walkthrough seeds every worker's phone.
- **Glove-friendly input.** Point-to-aim and pinch-to-select via MediaPipe hand tracking, with a dwell ring as the precision fallback — because heavy gloves are exactly what takes pinch precision away. Voice answers ("one"/"two", `ek`/`do`, Ol Chiki equivalents) run in parallel. Touch always works.
- **Zero-text pictogram mode.** ISO 7010 sign geometry and colour semantics — the same shapes already painted on a DGMS-regulated mine wall — plus audio narration. No icon on a choice button reveals the answer; that is enforced by a test.

### 2 — Assessment

- `readiness = 0.7 × accuracy + 0.3 × speed`, where speed only counts on decisions that were **correct**. Fast and wrong earns nothing.
- Per-step reaction-time baselines graded by how much time the real situation allows: 6 s for an escalating fire, 13 s for a judgement call about a colleague's cough.
- **Buddy drill** over WebRTC with QR-code signalling. No server, no internet. Scored on check-in intervals, notice latency, and whether the responder resisted going in unprotected — the decision that turns one casualty into two.

### 3 — Certification

- Each record embeds the previous record's hash, is signed by a device key, and appends to a per-site chain.
- Verification reports four **independent** signals: is the record intact and signed, is the signer known to this phone, is it present in this phone's ledger, does it link correctly. Collapsing those into one badge would hide the interesting cases.
- The QR carries the entire signed record (~376 characters), so an inspector verifies it at the pit head with no signal and no copy of the ledger.
- Records gossip phone-to-phone when a site has no connectivity, and flush upward when any device sees the internet.

> **Terminology:** this is a **tamper-evident hash-chained ledger**, not a blockchain. No consensus, no mining, no distributed agreement. Calling it a blockchain would be inaccurate.

### 4 — Intelligence

- Spaced refreshers at 2 / 7 / 21 / 60 days, with readiness decaying to a 55% floor at 90 days.
- Near-miss hazard reporting: one photo and a tap, tagged by zone and compass bearing because GPS does not work underground.
- Compliance dashboard with the hesitation-risk list, hazard triage with bearing clusters, ledger integrity panel, and CSV export formatted for Mines Act 1952 / Factories Act 1948 record-keeping.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm run preview
```

The AI hazard scan needs a free API key (Settings → Gemini or OpenAI). **Everything else works without one**, and without a network.

### Android

```bash
npm run android:sync   # vite build + cap sync
npm run android:open   # opens Android Studio
```

### Testing the buddy drill

Two phones on the same wifi or hotspot: one taps *Start a drill*, the other *Join my buddy*, then they scan each other's QR codes. To see it on one machine, use *Practise on one device* and open a second browser tab — clearly labelled as practice, not the real two-person exercise.

---

## Stack

React 18 + Vite + Tailwind, packaged via Capacitor. IndexedDB for the ledger and media, Web Crypto for signing, WebRTC data channels for phone-to-phone, `getUserMedia` + `DeviceOrientationEvent` for the AR overlay, MediaPipe Tasks Vision for hand tracking, Web Speech for voice. No backend.

The reference design for this pitch was Kotlin + ARCore + Room + Nearby Connections. `docs/ARCHITECTURE.md` maps every native component to what was built here and states the fidelity cost of each substitution.

---

## Honest limitations

Stated here rather than buried, because a judge will ask:

1. **No depth sensing or SLAM.** Markers anchor to compass bearing and elevation, not a 3D mesh. They hold direction as you turn but do not occlude behind real geometry or survive large translation. ARCore Depth + Cloud Anchors is the upgrade path.
2. **Magnetometer drift.** Steel plants and shafts distort magnetic heading. The app detects relative-only heading and offers manual re-centring, but this is a sensor limit, not a software one.
3. **No production Santali ASR exists.** Santali text and audio output are real; Santali voice *input* matches a fixed lexicon against a Hindi acoustic model.
4. **Santali translations are unverified.** Written by a non-native speaker as a starting point. Requires native-speaker review before deployment. Flagged in-app, and coverage is measured at runtime rather than claimed.
5. **PIN login is device-local identity, not authorization.** Same for the supervisor PIN on `/admin`. Production needs server-issued credentials with RBAC.
6. **No hardware keystore.** Keys are non-extractable Web Crypto handles in IndexedDB. Clearing site data destroys the device key — which is why records gossip to a second device.
7. **The web platform cannot wake a closed page on a schedule.** Refresher reminders surface on app open. Native AlarmManager is the upgrade.
8. **The buddy drill needs a shared LAN or hotspot.** Nearby Connections can bring up its own radio transport; a browser cannot.
9. **Reaction-time baselines are reasoned, not yet measured** against a worker cohort. They are deliberately generous, because over-flagging hesitation would erode trust in the flag.
10. **No DGMS server in this submission.** The client sync half is complete and configurable; the shipped path is a signed export bundle.

---

## Verification

Core logic was developed against executable checks covering SHA-256 (cross-checked against Node's implementation including multi-byte UTF-8), RFC 4231 HMAC vectors, chain tamper/fork/link detection, QR round-tripping with separator-containing names, latency grading boundaries, decay curve boundaries, WebRTC signal compression, buddy-drill state divergence, hazard triage transitions, gossip idempotency, and bearing maths across the 359°/0° seam.

Two bugs found and fixed during this work are worth naming, since both silently corrupted data:

- **`Number(null) === 0`** meant a dropped compass reading was being stored as a valid bearing of due north, putting AR markers in the wrong place. Bearings now go through strict coercion that rejects null. `Number([])` is also `0` and `Number(true)` is `1`, so the coercion in `src/lib/num.js` allowlists `number` and `string` rather than trying to enumerate the traps — the blocklist kept growing.
- **The safe answer was `choices[1]` in all 18 steps.** A worker who noticed could score 100% without reading anything, which made every readiness number meaningless. Choices are now shuffled per attempt with a seeded, render-stable permutation.

A third, from the pre-existing code: non-English users had feedback narration silently cancelled, because `translateScenario` returned a new object each render and an effect keyed on it re-ran and cleaned up the speech it had just started.

### Reachability

Features that exist but cannot be reached are worse than features that do not exist, so the
codebase was audited for them. Two subsystems were built and never wired up, and both are now
live: **gesture control** is mounted once in the app shell and drives any element carrying
`data-gesture-target`, and **peer-to-peer gossip sync** is reachable from the Admin sync panel.

The same audit run against the translation dictionary found five strings that were defined but
never rendered. Each marked a real gap, not a dead string:

| String | Gap it revealed |
| --- | --- |
| `bd_connecting` | WebRTC negotiation showed "waiting for buddy" for several seconds, reading as nothing happening |
| `as_your_time` / `as_target_time` | The grade pill showed `4.2s / 9s` with no indication which number was which |
| `as_decide_now` | The latency bar changed colour past target but never said so in words |
| `db_live` | The pulsing refresh indicator had no text alternative |
| `db_showing` | Filtering the attempt list silently hid rows without saying how many |
| `ar_turn_around` | Facing entirely the wrong way in AR produced only a small edge chevron |

Twenty-three genuinely dead strings left over from the pre-rebrand UI were removed. The
dictionary now has no key that is unreachable and no reachable key that is missing, in any of
the six languages.
