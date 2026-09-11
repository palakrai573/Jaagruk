# Jaagruk — Architecture & Implementation Plan

**SIH Problem Statement 26041** — AR-Based Vocational Training Simulator for Industrial
Safety in Jharkhand's Mining & Manufacturing Sector
**Organization:** Government of Jharkhand, Dept. of Higher & Technical Education

---

## 1. One-line description

A phone-only AR safety trainer that teaches workers inside their *actual* worksite, tests
them the way a real emergency would (correctness **and** reaction time), certifies them
into a tamper-evident offline hash-chain, and turns every trained worker into a live
hazard sensor for the site.

---

## 2. Stack decision, stated plainly

The reference architecture for this pitch was drafted for **Kotlin + ARCore + Room +
Nearby Connections**. This repository implements the same four layers on a **web stack
packaged as an Android app via Capacitor**:

- React 18 + Vite + Tailwind CSS
- IndexedDB for the local ledger and media (the Room equivalent)
- Web Crypto for signing and hashing
- WebRTC data channels for phone-to-phone drills
- `getUserMedia` + `DeviceOrientationEvent` for camera-anchored AR overlay
- MediaPipe Tasks Vision (WASM) for hand tracking
- Web Speech API for voice I/O
- Service worker + IndexedDB for offline-first behaviour

This is a deliberate trade. The web stack costs us ARCore's depth mesh and true SLAM
tracking. It buys us a single codebase that runs as an installable Android APK, as a PWA
on any shared site tablet, and as a browser demo for judges with nothing to install.
**Section 9 states exactly what this costs and what the native upgrade path is.** We do
not claim capabilities we did not build.

---

## 3. Native-plan → web-implementation mapping

| Pitch component | Native design | Jaagruk implementation | Fidelity |
|---|---|---|---|
| Site-Scan AR | ARCore Depth API + Persistent Cloud Anchors | Rear camera passthrough + `DeviceOrientationEvent` compass/pitch. Supervisor marks anchors by aiming the phone; each anchor stores magnetic bearing + elevation + thumbnail. Workers see markers reproject at those bearings. | **Functional equivalent for orientation-anchored overlay.** No depth mesh, no occlusion, no translational tracking. |
| Glove-friendly gesture input | MediaPipe Hands (native TFLite) | `@mediapipe/tasks-vision` `HandLandmarker` (same model family, WASM runtime). Point-to-aim, pinch-to-select, dwell-to-select fallback. | **Full** — same model, browser runtime. |
| Hindi voice commands | Vosk offline Hindi model | Web Speech API with `hi-IN` locale, transcript normalised and matched against a fixed command lexicon | **Partial** — Android WebView speech may use a network recogniser depending on OEM. Documented. |
| Santali voice commands | Custom TFLite keyword spotter | Fixed lexicon matched against the `hi-IN` acoustic model plus romanised variants and Devanagari transliterations | **Partial by design** — no production Santali ASR exists. Documented honestly rather than faked. |
| Local database | Room (SQLite) | IndexedDB, versioned schema, promise wrapper, quota handling | **Full** |
| Peer-to-peer buddy drill | Nearby Connections (Wi-Fi Direct + BT) | WebRTC `RTCDataChannel`, **QR-code manual signalling** — no signalling server, no internet. Host candidates connect over the shared LAN/hotspot. BroadcastChannel fallback for same-device demo. | **Functional equivalent.** Requires both phones on one LAN or hotspot; Nearby Connections can bootstrap its own transport. |
| Certificate signing | Ed25519 via Tink + Android Keystore | Web Crypto Ed25519 with automatic ECDSA P-256 fallback; non-extractable private key handle stored in IndexedDB | **Full crypto, weaker key isolation** — no hardware-backed keystore in the browser. |
| Deferred sync | WorkManager | Sync queue in IndexedDB + `online` event + Background Sync API where available + manual "Sync now" + signed bundle export/import | **Functional equivalent** |
| Refresher notifications | AlarmManager exact alarms | Due-list computed on device, Notification API on app open, `periodicSync` where the browser supports it | **Partial** — the web platform cannot wake a closed tab on a schedule. Documented. |

---

## 4. The four layers

### Layer 1 — Training

**1a. Site-Scan AR.**
A supervisor opens Site Setup once per zone, aims the phone at each landmark and taps to
drop an anchor: `EXIT`, `EXTINGUISHER`, `GAS_ZONE`, `ASSEMBLY_POINT`, `LOTO_PANEL`,
`FIRST_AID`. Each anchor records magnetic bearing (`alpha`), elevation (`beta`), a
downscaled thumbnail, and a label. The zone is saved to IndexedDB and can be exported as
a JSON bundle so one supervisor's scan seeds every worker's phone.

During a drill the worker's phone shows live camera with markers reprojected at their
recorded bearings, so "the exit is left past the second pillar" is learned in the real
corridor. Unscanned sites fall back to a generic template zone — the platform degrades,
it never blocks. `src/lib/demoSite.js` is a hand-authored three-zone scan covering all ten
anchor types, loadable in one tap from Site Setup, so the registered overlay can be shown
without first walking a real building. It seeds the site only, never training records.

**Two layers are drawn over the feed, and they cannot disagree.**

The flat marker layer is absolutely-positioned DOM: pictogram, label, edge arrows for
anchors out of frame. It works on any device with a camera and a compass and is never
switched off.

Above it, `src/components/ARScene3D.jsx` draws real geometry — a door frame for an exit, a
floor ring for a muster point, the same extinguisher and switchgear meshes the 3D briefing
uses, so an object learned in the briefing is recognised in the field. It is a transparent
`react-three-fiber` canvas, lazy-loaded behind a WebGL probe that is deliberately separate
from `arBlocker()`: a phone with a camera and a compass but no usable renderer still gets
the full drill, just flat.

The reason the two layers stay together is worth stating, because it is the part that is
easy to get wrong. Both are placed from **one** azimuth. `cameraQuaternion()` takes pitch
and roll from the device quaternion but overrides its yaw to equal the same smoothed
`heading` the DOM markers use. Feeding the raw sensor quaternion to the 3D camera would
leave two independent estimates of where the worker is looking, and they diverge whenever
the compass is off — a 3D exit sign floating beside its own label. It also means a manual
re-centre moves both layers at once, since the offset already lives inside `heading`.
`tests/geometry.test.mjs` asserts that the camera's forward vector equals
`anchorDirection()` for the same bearing, exactly.

Projection is true perspective, `tan(θ)/tan(fov/2)`. The vertical term divides by
`cos(θ)` as well, because off-axis vertical screen position genuinely depends on the
horizontal angle; treating the two axes independently — the obvious approach, and the
one used before — put high anchors near the frame edge measurably too low. Anchors beyond
90° are intercepted rather than divided, since the perspective divide changes sign there
and would fold an exit that is *behind* the worker back into the middle of the frame.

A floor-projected chevron path leads to the active target using **bearing only**: you walk
on the ground whether the target is a muster point or a door at the top of a stair. It is
never drawn toward a hazard, gas zone or dust source — a line of arrows is an instruction
to walk somewhere, and those anchors are marked, not routed to.

**1a-ii. On-device object detection** (`src/lib/vision.js`, opt-in per drill). MediaPipe
EfficientDet-Lite0, int8, cached in IndexedDB after first download. It reports **people and
vehicles, and nothing else** — see limitation 9. Headcount at a muster point and a
large-vehicle proximity warning are the two things it does that carry real safety weight.

**1b. Touchless control.** Hand tracking gives a pointer driven by the index fingertip,
pinch to confirm, and a 1.2 s dwell ring as a precision fallback. Voice is a first-class
parallel input. Touch always remains available. Gesture is opt-in and every failure mode
(no model, no camera, permission denied, low frame rate) degrades to touch with an honest
status message.

**1c. Zero-text pictogram mode.** Every scenario step and choice carries a pictogram key.
In pictogram mode the UI renders ISO 7010-style inline SVG plus audio narration, with text
suppressed. Onboarding itself is icon and voice driven, so a worker who cannot read can
select a language and log in unaided.

### Layer 2 — Assessment

**2a. Panic-response speed.** Every decision records `startedAt` → `decidedAt`. Each step
carries a calibrated `targetMs`. Outcomes classify as:

- `fast` — within target → confident
- `normal` — within 2× target
- `slow` — beyond 2× target → **hesitation flag**, surfaced to the safety officer even
  when the answer was correct
- `incorrect` — retrain regardless of speed

`readiness = round(0.7 × accuracy + 0.3 × speed)`, where speed scores 100 / 70 / 35 for
fast / normal / slow.

**2b. Real buddy drill.** Two phones pair over WebRTC by scanning each other's QR codes,
then run a shared confined-space state machine. The drill scripts a distress event on one
side; the other worker is scored on whether they noticed, how fast they responded, and
whether they ran the correct sequence. Both sides are scored on coordination, not on
individual quiz knowledge. Disconnects, timeouts, duplicate frames and role collisions
are all handled explicitly.

### Layer 3 — Certification

Each certificate is a record:

```
{ v, workerId, workerName, moduleId, domain, score, readiness,
  latencyGrade, timestamp, siteId, seq, prevHash }
```

Canonical-JSON → SHA-256 → `hash`; `hash` is signed by the issuing device key. Every new
record embeds the previous record's hash, forming a per-site append-only chain. Verification
recomputes every hash and link and checks every signature, and reports the specific failure:
broken link, mutated payload, bad signature, unknown signer, sequence gap, or fork.

Records gossip between devices over the same WebRTC transport, merge additively by hash,
and flush to a central endpoint whenever any device sees the internet.

**Terminology:** this is a **tamper-evident hash-chained ledger**, not a blockchain. There
is no consensus, no distributed agreement, no mining. Calling it a blockchain would be
inaccurate and any judge who knows the space would rightly mark it down.

### Layer 4 — Intelligence

**4a. Spaced refreshers.** Intervals of 2, 7, 21 and 60 days per domain. Readiness decays
with time since the last pass — full value for 7 days, then **linearly** to a 0.55 floor at
90 days (`1 − 0.45 × (days − 7) / 83`). A refresher pass resets the clock and advances the
interval index; a fail resets the index. Certification requires *effective* (decayed)
readiness ≥ 70 per domain, so a certificate reflects current competence rather than a
historical date stamp.

The curve is linear rather than exponential on purpose. A real forgetting curve is closer to
exponential, but a linear slide is legible: a worker or a safety officer reading a roster can
tell at a glance how many days are left before a certification lapses. The floor exists
because training is degraded by disuse, not erased by it.

**4b. Near-miss hazard tagging.** Any worker can photograph a real hazard, add a voice note,
and tag it to a site zone by bearing (GPS is unreliable underground). Reports queue locally
and sync opportunistically. Safety officers triage them open → acknowledged → resolved.

**4c. Compliance dashboard.** Site and worker compliance with live decayed readiness, a
hesitation-risk list, the hazard board, a chain-integrity panel, a QR verification tool, and
statutory CSV export referencing the Mines Act 1952 and Factories Act 1948. Peer gossip sync
sits in the same panel as export/import, because it is the same kind of hand-off action.

**4d. Worker dashboard visualisations.** Each widget answers one question and nothing that
failed to answer one was kept:

| Widget | Question it answers |
| --- | --- |
| Readiness ring + animated metrics | Am I certifiable right now? |
| Radar across 5 domains, 70% threshold ring | Which domain is weak? |
| Decay curve with pass-mark crossing | What happens if I do nothing? |
| Stacked reaction-time mix | Is my problem knowledge or speed? |
| 12-week consistency heatmap + streaks | Am I actually turning up? |

All charts are hand-rolled inline SVG in `src/lib/charts.js` (geometry, pure) and
`src/components/Charts.jsx` (rendering). No charting dependency: the bundle already carries
three.js, and these must render offline. Every animation is gated on
`prefers-reduced-motion`.

---

## 5. Data model (IndexedDB `jaagruk`, v1)

| Store | Key | Indexes | Contents |
|---|---|---|---|
| `workers` | `id` | `siteId`, `phone` | id, name, phone, pinHash, pinSalt, role, siteId, createdAt |
| `chain` | `hash` | `siteId`, `seq`, `workerId` | signed certificate records |
| `keys` | `id` | — | device keypair handle, site public keys, algorithm |
| `attempts` | `id` | `workerId`, `domain`, `at` | per-step latency, grade, readiness |
| `schedule` | `id` (`workerId:domain`) | `workerId`, `dueAt` | interval index, lastPassAt, dueAt |
| `sites` | `id` | — | site + zones + anchors |
| `hazards` | `id` | `siteId`, `status`, `at` | report, thumbnail blob, voice note blob |
| `syncQueue` | `id` | `kind` | pending outbound records |
| `blobs` | `id` | — | cached ML model, media |

Small, synchronous-read settings (language, API key, active session, pictogram/gesture
toggles) stay in `localStorage`. Legacy `khatra_*` keys migrate to `jaagruk_*` once,
idempotently, on boot.

---

## 6. Offline-first write path

```
UI action
  └─> write to IndexedDB (always succeeds first, never blocks on network)
        └─> append to syncQueue
              ├─ internet available ──> POST batch to configured endpoint (idempotency key)
              └─ no internet ────────> gossip to nearby supervisor phone over WebRTC
                                          └─> supervisor gets internet later ──> POST batch
```

Every write is local-first, timestamped, and additive. Sync is eventual and idempotent;
replaying a batch is always safe because records are keyed by content hash.

---

## 7. Route map

| Route | Purpose |
|---|---|
| `/` | Home |
| `/start` | Icon + voice onboarding, PIN register/login |
| `/scan` | AI hazard scan (existing) |
| `/train`, `/train/:id` | Module list and drill runner (AR / 3D / pictogram modes) |
| `/buddy` | P2P buddy drill |
| `/refresher` | Due spaced refreshers |
| `/report` | Near-miss hazard tagging |
| `/site` | Supervisor site scan setup |
| `/certification` | Domain progress + certificate issuance |
| `/verify/:certId` | Offline chain verification |
| `/dashboard` | Worker readiness view |
| `/admin` | Compliance dashboard (supervisor gate) |
| `/settings` | Provider/key, language, accessibility, sync endpoint |

---

## 8. Build sequence

1. Foundation — IndexedDB wrapper, crypto, identity/PIN
2. Layer 3 — chain, QR payload, verification
3. Layer 2a — latency assessment, spaced repetition, decay
4. Layer 1 support — speech, pictograms, gesture
5. Layer 1 — site anchors, AR drill overlay
6. Layer 2b — WebRTC buddy drill
7. Layer 4 — hazards, sync queue, gossip
8. i18n for everything new
9. Page wiring and dashboard upgrades
10. Rebrand, migration, build verification
11. Dashboard visualisation layer (`charts.js` + `Charts.jsx`)
12. Dead-feature audit — everything built is now reachable from the UI

### 8.1 What step 12 found

Two subsystems were fully implemented but unreachable, which is worse than not having them:

- **Gesture control** (`gesture.js`) was never mounted. `GestureLayer` now sits once in the
  App shell and hit-tests any element carrying `data-gesture-target`, dispatching a real
  click. Any button becomes gesture-operable by adding that attribute — no per-page wiring.
  Two confirm paths, pinch and a 1.2 s dwell, because heavy gloves remove pinch precision.
- **Peer gossip sync** (`createGossipSession`) had no entry point. `PeerSync` is now embedded
  in the Admin sync panel.

A second pass over the i18n dictionary found five strings that existed but were never
rendered. Each turned out to mark a real gap rather than a dead string, and all five are now
wired: the connecting state during WebRTC negotiation (previously read as "waiting for
buddy"), the elapsed-vs-target comparison on the latency bar and grade pill, a text
alternative for the pulsing live indicator, a filtered-count line on the attempt list, and
an explicit "turn around" prompt in AR when every marker is more than 90° behind the worker.

### 8.2 Numeric coercion

`src/lib/num.js` is the single place raw values become numbers. It exists because
`Number(null)` is `0`, `Number(true)` is `1` and `Number([])` is also `0` — a trap that had
already caused two real bugs here (a dropped compass reading stored as due north, and a
missing readiness plotted as a zero on the trend line). It allowlists `number` and `string`
rather than blocklisting known traps, since the blocklist kept growing. The duplicated
`clampPct` helpers in `assessment.js` and `chain.js` were folded into `clampPercent`, which
matters because those are the values hashed into a certificate.

---

## 9. Known limitations (state these before a judge asks)

0. **Two AR modes, and the limitations below apply to the compass one.**

   `src/lib/webxr.js` + `XRDrill` add a second mode: a WebXR `immersive-ar` session,
   which on Chrome for Android is backed by ARCore. That gives genuine 6DoF tracking,
   `hit-test` placement so an anchor has a real **distance**, and correct scale from
   ARCore's own camera parameters. Anchors placed there carry both a measured `local`
   position and a derived `bearing`/`elevation`, so a zone scanned in XR still works
   on a phone that cannot run XR — the two modes stay one product.

   Persistence without Cloud Anchors is done with a **printed marker and two taps**.
   The supervisor fixes a QR plate in the zone, taps it, then taps a second fixed
   point at least 2 m away to establish heading; every anchor is stored in that frame
   rather than in the session's arbitrary origin. A worker repeats the two taps and
   lands on the same coordinates. Offline, cross-device, nothing uploaded. The
   accuracy is bounded by how carefully the two points are tapped, which is visible
   and correctable — and a short baseline is *refused* rather than accepted and
   silently skewed.

   **Not implemented: depth occlusion.** `depth-sensing` is requested and whether it
   was granted is reported on screen, but hiding geometry behind a real wall needs a
   material that samples the depth texture per fragment, and that is code I could not
   run without an ARCore device. The UI says "no depth sensing — markers draw in front
   of walls" rather than implying otherwise.

   **Verification status:** the site-frame maths is unit-tested, including a
   cross-session test proving two sessions with different world origins resolve a
   stored coordinate to the same real point. The *session handling* is not tested and
   needs a device. It sits behind a capability probe with the compass mode intact, so
   a phone that cannot run it loses nothing.

1. **No depth or SLAM, and an anchor has no distance.** *(Compass mode.)* The overlay draws real 3D geometry,
   oriented by the full device rotation including roll, but it is anchored to compass
   bearing and elevation rather than to a reconstructed mesh. Three consequences, all worth
   saying out loud before a judge finds them:

   - **Objects do not occlude behind real geometry.** An exit sign for a door around the
     corner draws over the wall, not behind it.
   - **Nothing survives large translation.** Walk twenty metres and the bearings are stale,
     because they were recorded from where the supervisor stood.
   - **An anchor is a ray, so apparent size means nothing.** Site Setup records the
     direction a supervisor was pointing, and distance cannot be recovered from one
     direction — that needs stereo, a depth sensor, or the supervisor pacing out every
     anchor. Every object is therefore drawn on a ring at a fixed six metres
     (`ANCHOR_RING_RADIUS_M`). Direction is accurate and is what a worker in smoke acts on;
     an extinguisher three metres away and one twenty metres away render identically. This
     is why the overlay never displays a distance figure — it would be fiction.

   ARCore Depth + Persistent Cloud Anchors is the native upgrade and would fix all three.

   The floor path additionally assumes a camera height of 1.55 m (`EYE_HEIGHT_M`), since
   nothing in the browser reports how tall the person holding the phone is. Being wrong
   there shifts the painted path slightly against the real floor; the direction it indicates
   stays correct.
2. **Magnetometer drift.** Steel plants and mine shafts distort magnetic heading. The app
   detects absent or low-accuracy compass data and offers manual re-centring, but this is
   a real constraint of the sensor, not something software can fully remove.

   **The AR view requires a secure context (https).** Not a design choice — browsers do not
   expose `navigator.mediaDevices` or fire `deviceorientation` on plain http, so the camera
   and the compass are both unavailable. `localhost` counts as secure, which is why this only
   ever shows up on a phone and never on the machine doing the developing: serving the dev
   build to a handset over `http://192.168.x.x:5173` silently loses AR. `src/lib/arSupport.js`
   detects this as `AR_INSECURE_CONTEXT` and names it, rather than reporting a generic camera
   failure. Drills fall back to the 3D scene, so nothing is blocked — but a demo intending to
   show AR must be served over https (`npm run preview` behind a tunnel, or the deployed
   build). See `docs/DEPLOYMENT.md`.
3. **Santali ASR does not exist at production quality.** Commands are matched against a
   Hindi acoustic model with a fixed lexicon. Santali *text and audio output* (Ol Chiki) is
   real; Santali *speech input* is best-effort.

   Both directions of that substitution route through `src/lib/olchiki.js`, an Ol Chiki →
   Devanagari transliterator, because the substitution does not work without one. A Hindi
   voice has no entry for an Ol Chiki codepoint, so handing it Ol Chiki produces silence or
   "unknown character", not accented Santali. A Hindi recogniser returns Devanagari and
   cannot return Ol Chiki, so the Ol Chiki entries in the lexicon were unreachable. It is a
   syllabifier rather than a character map: Ol Chiki is an alphabet, Devanagari an abugida,
   and mapping letter-for-letter turns `ᱦᱟᱸ` ("hã") into `हआं` ("ha-aa-n"). Verified by
   `npm run translit`.

4. **Santali UI is 100% covered and 0% verified.** These are two different numbers and the
   app reports them separately, because conflating them is how software ends up lying.

   All 601 UI strings now exist in Ol Chiki. None has been checked by a Santali speaker.
   The 360 gathered into `src/lib/i18nSantali.js` let a reviewer work through one file; the
   other 241 in `i18n.js` / `i18nJaagruk.js` are equally unreviewed, so the file split is
   organisational rather than a quality boundary.

   The honesty mechanism is that **the in-app notice keys off a verification flag, not off
   the coverage percentage.** `SANTALI_VERIFIED` is `false` in `i18nSantali.js`, and
   `isPartiallyTranslated('sat')` returns true regardless of coverage until a reviewer is
   recorded there. Without that decoupling, writing the last string would have silenced the
   warning and left the app presenting unchecked machine-authored safety text as a finished
   translation. The notice itself changes wording too: "some screens are in Hindi" was true
   while there were gaps and is false now, so Santali gets its own message saying the
   wording is machine-written and to follow the safety signs if it is unclear.

   What is enforced mechanically, by `npm run i18n`:

   - No English text stored in another language's slot. Four nav labels used to do this,
     which inflated reported coverage while showing Latin script to a Santali reader.
   - Every authored value contains its own script.
   - Every figure survives translation, comparing across numeral systems so Bengali ৪
     counts as 4. Catches a bulk pass dropping the 4 and 6 from a PIN-length rule or 1952
     from a statute citation.
   - Every character falls inside a shipped font subset. A codepoint outside it renders as
     a box, permanently, on a device with no network — and nothing else in the build fails.
   - Fallback chains terminate in a fully covered language.

   **Scenario content is deliberately not machine-authored.** None of the 9 modules has
   Santali; they resolve to Hindi. Drill prose is where a wrong verb changes what a worker
   physically does, so it waits for a speaker rather than being filled in.

   `npm run santali:worksheet` regenerates `docs/santali-worksheet.csv`: all 601 strings
   with English and Hindi source, the current Santali, and the file to correct it in,
   ordered by consequence so drill and hazard instructions come before supervisor
   dashboards.
5. **No hardware keystore.** Private keys are non-extractable Web Crypto handles in
   IndexedDB, not hardware-backed. Clearing site data destroys the device key — which is
   why chain records gossip to a second device.
6. **PIN auth is device-local.** There is no server-side credential check in this build.
   It is offline-capable identity, not a security boundary.
7. **Supervisor gate is not real authorization.** `/admin` is protected by a local PIN.
   A production deployment needs server-issued JWTs with role-based access control.
8. **Web cannot schedule exact offline alarms.** Refreshers are computed locally and
   surfaced on app open, plus `periodicSync` where available. Native AlarmManager is the
   upgrade path.
9. **Buddy drill needs a shared LAN or hotspot.** WebRTC host candidates cannot traverse
   two unconnected phones the way Nearby Connections' own radio transport can.
10. **AI hazard scan needs connectivity** and a user-supplied Gemini or OpenAI key. Every
    training, assessment, certification and verification path works fully offline.
11. **Central sync endpoint is configurable but unimplemented server-side.** This repo
    ships the client half plus a signed export bundle. There is no DGMS server in this
    submission.
12. **Object detection sees people and vehicles. It cannot see doors, PPE or equipment.**

    The on-device model is EfficientDet-Lite0, trained on COCO. COCO has eighty classes and
    the eighty are fixed. `door`, `fire exit`, `exit sign`, `fire extinguisher`, `hard hat`,
    `helmet`, `safety vest`, `gas cylinder`, `machine guard` and `forklift` are none of
    them, so no confidence threshold or tuning would produce them. What it does report is
    `person` — a headcount, which is what a muster-point roll call needs — and the vehicle
    classes `car`, `truck`, `bus`, `motorcycle`, `bicycle`, `train`, because
    pedestrian/vehicle interaction is a leading cause of death in warehouses and on haul
    roads.

    Forklifts specifically: not a COCO class. Some read as `truck`, many are not detected at
    all. The UI says "vehicle" and means it.

    The scope is enforced rather than promised. `categoryAllowlist` is passed to MediaPipe so
    other classes are never scored; `classifyLabel()` is a second exact-match gate; and
    `tests/vision.test.mjs` contains a test that **fails if `door` or `helmet` ever becomes
    classifiable**, with a note that the honesty copy needs rewriting if the model is
    swapped. The string `vision_scope` — "Detects people and vehicles only" — renders beside
    the counts in all six languages whenever the detector is running, not buried in a help
    screen.

    Proximity is a heuristic and is described as one. Apparent size depends on the real size
    of the object and on the lens, neither of which is known, so a distant bus and a nearby
    hatchback fill the same box. It is reported as "close", never in metres.

    **Exits stay with the supervisor anchor scan, and that is not a consolation prize.** A
    walked-and-recorded bearing is exact, works in smoke and darkness where no camera model
    would, needs no download and costs no battery. For the thing that matters most, the
    boring method is the better one. A custom-trained detector for site-specific classes is
    the upgrade path, and it needs a labelled dataset this submission does not have.
