# Jaagruk — Deployment

Where to host this so every feature actually works, what is non-negotiable, and what to check
after you ship.

---

## 1. The one hard requirement: HTTPS

Not a best practice here — a functional requirement. Five things this app depends on are
gated behind a **secure context**, and all of them fail silently or throw on plain HTTP:

| API | Used for | What happens over HTTP |
|---|---|---|
| `crypto.subtle` | **All** hashing and signing | **`undefined`.** Certificate issuance and verification cannot run at all. |
| `getUserMedia` | AR camera passthrough, hazard photos | Rejects. No AR, no photo capture. |
| `DeviceOrientationEvent` | Compass bearing + pitch for anchors | Blocked or permission-denied. No AR anchoring. |
| `RTCPeerConnection` | Buddy drill, record gossip | Blocked in modern browsers. |
| `serviceWorker` | Offline shell | Will not register. No offline boot. |

`crypto.subtle` is the decisive one. Over HTTP the app is not degraded, it is broken —
certification is the core deliverable and it is the first thing to fail.

**`localhost` is exempt** (browsers treat it as secure), which is why `npm run dev` works. Any
other origin needs a real certificate.

---

## 2. What this app does *not* need

Worth knowing, because it makes hosting much simpler than a typical React SPA:

- **No SPA rewrite rules.** Routing is `HashRouter`, so every route is a fragment
  (`/#/verify/abc123`). The server only ever sees `/`. No `_redirects` catch-all, no
  `try_files`, no 404.html hack. Deep links work on every static host including GitHub Pages.
- **No domain root.** `vite.config.js` sets `base: './'`, so assets resolve relatively. The
  same build works at `example.org/`, `example.org/jaagruk/`, and inside the Capacitor
  WebView at `https://localhost`.
- **No Node runtime.** The web deploy is pure static files.
- **No environment variables at build time.** The AI key is supplied by the user at runtime in
  Settings and stored on device. Nothing secret is baked into the bundle.

---

## 3. Host recommendation

| Host | Verdict | Why |
|---|---|---|
| **Cloudflare Pages** | **Recommended** | Free with unlimited bandwidth. Strong India PoPs (Mumbai, Delhi, Chennai, Bengaluru, Hyderabad, Kolkata) so first load is fast on site. Reads `public/_headers` natively. Workers/D1/R2 sit alongside it if you add the backend. |
| **Firebase Hosting** | **Recommended if you add a Firebase backend** | Google's network, good India latency, generous free tier. The coherent choice if auth and aggregation will be Firebase Auth + Firestore. Needs `firebase.json` for headers. |
| Netlify | Good | Same `_headers` file works unchanged. Free tier is 100 GB/month, which is plenty. |
| Vercel | Good, with a caveat | Excellent DX, but the free Hobby tier is licensed for non-commercial use. A government pilot needs a paid plan. |
| GitHub Pages | Viable as a free mirror | Works now that routing is hash-based and `base` is relative. **Cannot set custom headers**, so you lose the cache-control policy in §5 and updates may be served stale longer. |
| S3 + CloudFront | Fine, more work | Correct but you are hand-rolling what Pages gives you. Only pick this if AWS is mandated. |

**Do not** deploy to a plain HTTP VPS, an internal IP, or a `http://192.168.x.x` LAN address
for anything but `localhost` testing. See §1.

---

## 4. Deploying to Cloudflare Pages

```bash
npm install
npm run build          # produces dist/
```

**Via dashboard (simplest):** Workers & Pages → Create → Pages → Connect to Git.

| Setting | Value |
|---|---|
| Framework preset | None / Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |

**Via CLI:**

```bash
npm install -g wrangler
wrangler pages deploy dist --project-name jaagruk
```

HTTPS is provisioned automatically on `*.pages.dev`. Add a custom domain in the dashboard if
the department provides one; the certificate is issued for you.

### Firebase Hosting alternative

`firebase.json` — note there is no `rewrites` block, because hash routing does not need one:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "/{sw.js,registerSW.js,index.html,manifest.webmanifest}",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

```bash
npm install -g firebase-tools
firebase login && firebase init hosting && npm run build && firebase deploy
```

---

## 5. Cache policy, and why it matters here

`public/_headers` is in the repo and is applied automatically by Cloudflare Pages and Netlify.
The rule it encodes:

- `/assets/*` → `max-age=31536000, immutable`. Filenames are content-hashed, so a changed file
  is a different URL. Caching forever is correct and free.
- `sw.js`, `registerSW.js`, `index.html`, `manifest.webmanifest` → `no-cache`.

**Get the second one wrong and updates stop reaching devices.** A cached service worker will
keep serving an old precache manifest indefinitely, and because `registerType` is
`autoUpdate`, the app will confidently believe it is current. On a host that cannot set headers
(GitHub Pages) this is the specific risk you accept.

---

## 6. Content Security Policy

Optional hardening. If you add one, these origins must be allowed or features break:

| Origin | Needed for | Breaks if blocked |
|---|---|---|
| `https://fonts.googleapis.com`, `https://fonts.gstatic.com` | Typography | Falls back to system fonts (cosmetic only) |
| `https://cdn.jsdelivr.net` | MediaPipe runtime + WASM | Gesture control never initialises |
| `https://storage.googleapis.com` | Hand-landmarker model | Gesture control never initialises |
| `https://generativelanguage.googleapis.com` | Gemini hazard scan | AI scan fails |
| `https://api.openai.com` | OpenAI hazard scan | AI scan fails |

A working starting point:

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
media-src 'self' blob:;
connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com
            https://generativelanguage.googleapis.com https://api.openai.com;
worker-src 'self' blob:;
```

`'wasm-unsafe-eval'` is required by the MediaPipe WASM runtime. `blob:` in `media-src` and
`img-src` is required for camera frames, downscaled photos and voice notes.

**Test the AR drill, gesture mode and the AI scan after adding a CSP.** Every one of them
touches an origin a naive policy would block.

---

## 7. Android APK

The web deploy and the APK are independent. The APK bundles `dist/` — it does not load from
your hosting, so **the app works with no network from first launch**.

```bash
npm run android:sync     # vite build + cap sync android
npm run android:open     # opens Android Studio
```

Then in Android Studio: **Build → Generate Signed Bundle / APK → APK → release**.

**Already configured correctly, do not change:**
- `androidScheme: "https"` — the WebView serves from `https://localhost`, a secure context, so
  camera, compass, WebRTC and `crypto.subtle` all work inside the APK.
- `allowMixedContent: false` — consequence: **any backend endpoint you configure must be
  HTTPS.** A plain-HTTP sync URL is blocked in the APK even though it may work in a browser.
- `minSdkVersion: 29` — Android 10 and up.

**Keystore.** Generate once, back it up somewhere that is not this repository, and never lose
it — a Play Store listing cannot be updated with a different signing key.

```bash
keytool -genkey -v -keystore jaagruk-release.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias jaagruk
```

**Distribution.** For judging and a pilot, hand over the signed APK directly or push it via
the department's MDM — no store review, no delay. For Play Store, the app ID
`in.gov.jharkhand.jaagruk` implies government ownership, so the developer account should
belong to the department rather than a student.

**Permissions to declare** in `android/app/src/main/AndroidManifest.xml`: `CAMERA`,
`RECORD_AUDIO`, `INTERNET`, and optionally `ACCESS_FINE_LOCATION` (GPS is a bonus field on
hazard reports; the app works without it).

---

## 8. Backend deployment, when you add it

| Piece | Recommendation | Note |
|---|---|---|
| API | **Cloud Run**, region `asia-south1` (Mumbai) | Scales to zero, HTTPS included, cheap at pilot volume. Fly.io `bom` is an equally good alternative. |
| Database | **Neon** or **Supabase** Postgres, or Cloud SQL `asia-south1` | Keep the DB in the same region as the API. |
| Anchoring worker | Cloud Scheduler → Cloud Run job | One Merkle root per batch; one transaction per run. |
| Secrets | Secret Manager / platform secret store | Never in the client bundle. |

**Two things that will bite you:**

1. **CORS must allow the Capacitor origin.** The WebView origin is `https://localhost`, not
   your Pages domain. Allowlist both:
   ```
   Access-Control-Allow-Origin: https://jaagruk.pages.dev
   Access-Control-Allow-Origin: https://localhost
   ```
   Miss the second and sync works in the browser and fails silently in the APK — a genuinely
   annoying bug to chase.

2. **HTTPS is mandatory for the endpoint**, per `allowMixedContent: false` above.

---

## 9. Pre-flight checklist

```bash
npm ci
npm run build            # must finish with no warnings
npm run preview          # smoke test the production bundle locally
```

- [ ] Build completes clean (expect ~727 modules, 35 precache entries, ≈2292 KiB)
- [ ] Precache entry count equals the number of distinct files — a count higher than the file
      count means something is listed twice and every install fetches it twice
- [ ] `dist/_headers` present
- [ ] `dist/index.html` references `./assets/...` (relative, not `/assets/...`)
- [ ] Target host serves over HTTPS
- [ ] Cache headers applied (§5)
- [ ] Custom domain certificate valid, if using one

## 10. Post-deploy verification

Do these **on a real phone**, not a desktop browser. Several of them cannot fail on a laptop.

| # | Check | Expected |
|---|---|---|
| 1 | Load over HTTPS, open DevTools console | No errors; service worker registered |
| 2 | Onboard a worker with a PIN | Succeeds — proves `crypto.subtle` is available |
| 3 | Run one drill and issue a certificate | QR renders — proves signing works |
| 4 | **Turn on airplane mode, force-close, reopen** | App boots fully offline |
| 5 | Offline: run a drill, verify a certificate | Both complete with no network |
| 6 | Open Site Setup, aim the phone | Compass heading updates live |
| 6a | **Open any drill on a fresh install** | **Camera view appears with no setting changed** — AR is default-on where the device supports it. If you get the 3D scene, check Home: it names the reason. |
| 6b | **Mark two anchors in Site Setup, then open a drill** | **Those markers appear at their real bearings, and the "site has not been scanned" chip is gone.** This path was broken until Phase 8 — the drill always used generic bearings — so it is worth confirming on a device rather than assuming. |
| 6c | **Site Setup → Load demo site, then open a drill** | Three zones appear; the drill uses one of them, not the generic zone. Fastest route to a registered overlay with no walking. Tap it twice — the second tap must add nothing. |
| 6d | **In the drill, tilt the phone side to side** | **3D objects stay level with the world**; the overlay horizon matches the video horizon. This is the roll path. If the geometry tilts *with* the phone, the device reports no `gamma` and the overlay has fallen back to a level camera — correct behaviour, but worth knowing. |
| 6e | **Turn a full circle on the spot** | Objects leave and re-enter frame at their own bearings, edge arrows point the short way round, and nothing behind you is drawn ahead of you. |
| 6f | **Compare a 3D object with its flat label** | They sit on the same spot. Horizontal separation means the two layers disagree about azimuth, which `cameraQuaternion()` exists to prevent. |
| 7 | Start a hazard report, take a photo | Camera opens, photo downscales |
| 8 | Enable gesture mode (online first time) | Model downloads then tracks |
| 8a | **Tap "Live detection" in a drill, online first time** | ~4 MB model downloads, then boxes appear around people. The "detects people and vehicles only" line must be visible beside the counts. Reload offline — it still works, from the IndexedDB cache. |
| 8b | **Site Setup → Start marking → "Start tracked AR"** | On an ARCore phone a session starts and a reticle tracks real surfaces. On anything else you get a plain "this device does not offer tracked AR" note and the compass view below still works. **That fallback is the thing to confirm**, since most handsets will take it. |
| 8c | **Align: tap the marker plate, then a point 2 m+ away** | A second tap closer than 2 m is **refused with an explanation**, not accepted. A short baseline rotates the whole zone. |
| 8d | **Place an anchor in tracked AR, then open the compass view** | The same anchor appears in both. XR placement derives bearing and elevation from the measurement, so it must be usable by the older path. |
| 8e | **Walk 10 m, then look back at a tracked anchor** | It stays on the real object. This is the whole difference from compass mode, which cannot survive translation — the single most worthwhile check on a device. |
| 8f | **Exit the XR session and re-enter** | Alignment is **not** requested again; the site frame is deliberately held outside the session. |
| 9 | Two phones on one hotspot → buddy drill | QR pairing connects |
| 10 | Install to home screen, relaunch offline | Opens standalone, data intact |
| 10a | **Installed, on a gesture-navigation phone** (Nothing Phone, Galaxy S24 / S24 FE, Pixel 6+) | The wordmark and the menu button clear the status bar and the punch-hole. `viewport-fit=cover` means the app paints edge to edge, so a header that ignores `safe-area-inset-top` renders *underneath* the clock. |
| 10b | **Scroll any long page to the very bottom** | The last row is fully visible above the bottom bar, with a gutter. Nothing is hidden behind it. |
| 10c | **Tap the assistant button (bottom right)** | The button is fully above the bottom bar and tappable — it was under it before the layout constants landed. The panel that opens sits above the button, not behind the bar. |
| 10d | **Start a drill with gesture control on** | The "hands detected" notice clears the bottom bar; the running pill clears the header. Both were within two pixels of colliding. |
| 10e | **Enter tracked AR, then look for Exit** | Exit is above the gesture bar and reachable. In an XR session the overlay covers the whole screen, so this is the one place where a missing inset locks a worker into an immersive session. |
| 10f | **Switch to Urdu, then rotate to landscape** | Content clears the cutout on whichever side it physically is. The insets are applied as physical left/right, so they must not swap when the document flips to RTL. |
| 10g | **System font size and display size at maximum** | Nav labels wrap rather than clip; no control loses its tap target. |
| 10h | **Switch to the light theme and open Dashboard** | Cards read as cards: a white card on the grey page, a neutral `Badge` with a visible chip behind it, a toast that floats rather than sits flat. `npm run contrast` proves the token values; only a screen proves the result. |
| 10i | **Light theme, press and hold a primary button** | It gets *darker*, not lighter. It used to lighten, which dropped the white label to 3.74:1 at exactly the moment of the tap. |
| 10j | **Reload a data screen on a slow connection, both themes** | The loading skeletons match their surface. They were hardcoded dark grey, so on light they were black blocks on the first screen a user ever sees. |
| 10k | **Tab through a form with a keyboard** | Every control shows a 2 px offset ring, and a pill-shaped control **keeps its round shape** while focused. The ring used to re-round the element itself to 4 px, so every badge and dot visibly squared off. |
| 10l | **Run a timed drill and watch the countdown bar** | Smooth at the same moment the app is timing the decision to the millisecond. This is the one animation whose cost lands inside a measurement that goes into a certificate. |
| 10m | **Turn on "Remove animations" in Android accessibility settings** | Every screen renders complete and static: progress bars still show their value, the spinner is a static mark rather than frozen mid-tilt, no reveal is stuck invisible. |
| 10n | **Set the language to Santali, open the module list** | Every one of the nine modules carries an amber **HI** badge. The drill content has no Santali, so it resolves to Hindi — the badge is the app saying so before the worker commits to a drill. |
| 10o | **Santali, start any drill, listen from the first second** | You hear a Santali sentence telling you the drill is in हिन्दी, *then* the Hindi intro. The notice is the only Santali audio in a drill and it is deliberately first. If you hear the Hindi intro immediately, the notice was skipped — check `narrationNotice()` returned non-null. |
| 10p | **Open the assistant, press Escape** | It closes and focus returns to the launcher button. Then reopen and confirm a long answer keeps its paragraph breaks rather than running together. |
| 10p1 | **Before testing anything below: Settings → check the Build stamp** | It matches the build you just deployed. **Do this first.** An installed PWA serves its precached shell until the service worker updates *and* the page reloads, and with the radio off it cannot update at all — so a fix can be absent purely because the copy on the phone predates it. To force it: open the app online once and reload twice, or uninstall and reinstall. Every row below is meaningless against a stale install. |
| 10p2 | **Settings → "Speech recognition order on this device"** | Shows the locale ladder, e.g. `hi-IN · en-IN · en-US · device default`. If this row is missing, the phone is on an old build — see 10p1. |
| 10q | **Airplane mode, app in Hindi, start a drill and say "ek"** | It is caught. This was the reported bug: Android can only recognise offline in languages whose voice pack is downloaded, devices ship English and rarely Hindi. The engine reports `language-not-supported`, which was unmapped and read as a generic UNKNOWN — permanently fatal after five retries — so the locale ladder never took a step. Recognition now switches locale on the first such error and the row says "Listening in English". |
| 10r | **Same, then say "one"** | Also caught. Once the model is English this is the reliable phrase, which is exactly what the hint tells the worker to say. Saying "1" works too — digits are what most engines actually return. |
| 10s | **Install the Hindi voice pack** (Android Settings → System → Languages → Voice input → Google → Offline speech recognition → Hindi), airplane mode, say "ek" | Caught **without** the English hint appearing, because `hi-IN` now succeeds and never escalates. This is the difference between the workaround and the real fix, and it is worth knowing which one a demo device is running. |
| 10t | **Online, app in Hindi, say "ek"** | Caught, and no English hint. Proves the fallback did not become a permanent downgrade for anyone with a connection — one network blip must not move the recogniser off the worker's own language. |
| 11 | Deploy a change, reload twice | New version is picked up (validates §5) |

Check 4 is the one that matters most. It is the claim the whole project rests on, and it is
the one a judge is most likely to test personally.

---

## 10A. Installing as a PWA so everything works offline

Offline is not one switch. Three different mechanisms hold the app's assets, they fill
up at different times, and one of them is not the app's to control at all. Getting a
fully offline install means understanding which is which.

### The three tiers

| Tier | What is in it | When it arrives |
|---|---|---|
| **Precached** — 35 entries, ~2.3 MB | Every route and code chunk including the lazy AR, XR and detection ones; the stylesheet; `index.html`; the manifest; and the Latin, Devanagari and **Ol Chiki** font subsets | At install. Nothing further needed. |
| **Runtime-cached** | Bengali, Odia and Urdu font subsets; the MediaPipe runtime, WASM and the two models (hand landmarker, object detector, ~4 MB) | **On first use, online.** Never fetched until something asks for them. |
| **Not the app's** | Offline *speech recognition* language packs | Android system setting. See below. |

The runtime tier is deliberate: Nastaliq alone is ~317 KB for two weights, and making
every worker download it to install an app they will use in Hindi is the wrong
default. But it means a feature you have never opened while online will not work
offline. That is the single most common cause of "it worked in the demo and not on
the day".

### Install

1. **Serve over HTTPS.** Not optional and not cosmetic: `crypto.subtle` (PIN hashing,
   certificate signing), the camera and the microphone are all unavailable in an
   insecure context. `http://` on a LAN IP will fail in ways that look like app bugs.
   `localhost` is treated as secure, so local testing is fine.
2. Open the site in **Chrome on Android**.
3. Menu (⋮) → **Install app** or **Add to Home screen**. If the option is absent the
   manifest or the service worker did not load — check §9.
4. Launch it from the home-screen icon, not from the browser tab. The installed window
   is what gets the standalone layout and the safe-area insets.

### Then warm it up, before you go offline

Do this once, online, in the installed app. It takes about a minute and it is what
turns "installed" into "fully offline".

- [ ] **Settings → check the Build stamp** matches what you deployed. An installed PWA
      keeps serving its cached shell until the service worker updates *and* the page
      reloads; offline it cannot update at all. This is the first thing to check
      whenever a fix seems missing.
- [ ] **Run one drill to the end.** Confirms the 3D scene chunk, the assessment and the
      certificate path are all resident.
- [ ] **Open a drill with AR on**, and once with **Live detection** on. Downloads the
      MediaPipe runtime and the object detector. `vision.js` also copies the model
      bytes into IndexedDB, which survives cache eviction, so this only has to happen
      once per device.
- [ ] **Enable gesture control once.** Same, for the hand landmarker.
- [ ] **Switch language to each one you will demo.** Bengali, Odia and Urdu pull their
      font on first use. Skip this and the text renders in boxes offline. Hindi and
      Santali need nothing — their fonts are precached.
- [ ] **Issue one certificate and verify it.** Exercises signing and QR generation.

Then turn off wifi and mobile data, force-close the app, and reopen. It should boot
straight into the home screen with no network at all — check 4 in §10 is the one that
matters most.

### Voice input offline is an OS setting, not an app setting

This is the one thing the app cannot fix for you, so it is worth being plain about.

Speech **output** is fully offline for every language: the app ships the text and the
device's own text-to-speech reads it.

Speech **input** is served by the Android speech service, which can only recognise
offline in languages whose voice pack has been downloaded. Phones ship English.
**Hindi is an opt-in download almost nobody has made.** Without it, offline Hindi
recognition cannot work no matter what the app does — so the app detects it, falls back
to an English model, and tells the worker to say the English number instead.

To get real offline Hindi recognition:

> **Android Settings → System → Languages & input → Voice input → Google (⚙) →
> Offline speech recognition → All → Hindi → Download**

The menu path varies by manufacturer; on Samsung it is under General management. Once
installed, `hi-IN` succeeds offline, "एक" and "ek" are recognised directly, and the
"Listening in English" hint never appears. Settings → *Speech recognition order on this
device* shows the ladder the app will try.

### What is genuinely never offline

Only two things, and neither is needed for training, assessment, certification or
verification:

- **Photo hazard analysis** (`/scan`) — calls a cloud model, needs a key and a
  connection. Everything else in the app runs on-device.
- **Central upload** — the sync queue holds attempts locally and drains when a
  connection returns, so being offline delays the upload rather than losing the record.

## 11. Common failures

| Symptom | Cause | Fix |
|---|---|---|
| "Cannot read properties of undefined (reading 'digest')" | Served over HTTP; `crypto.subtle` missing | Serve over HTTPS |
| Blank page, 404s on `/assets/*` | Sub-path deploy with an absolute base | `base: './'` is already set — rebuild |
| Camera never opens | Insecure context, or permission denied at OS level | HTTPS; check Android app permissions |
| Compass static, AR markers frozen | No magnetometer, or permission not requested | App detects this and offers relative mode + re-centre; expected on most laptops |
| Gesture mode stuck initialising | CDN blocked by CSP or network | Allowlist `cdn.jsdelivr.net` and `storage.googleapis.com` |
| Updates never reach devices | `sw.js` / `index.html` cached | Apply the `no-cache` headers in §5 |
| Buddy drill pairs but never connects | Phones on different networks | Same wifi or hotspot — documented limitation |
| Sync works in browser, fails in APK | CORS missing `https://localhost`, or HTTP endpoint | See §8 |
| **The screen went white** | An uncaught render error. It should now be impossible to see a blank screen: an ErrorBoundary wraps the routes and a second one wraps the whole tree | If you do see one, the build predates the boundary — check the Build stamp in Settings. If you see the "This screen stopped working" panel instead, open **Details** and send that text; it names the failing component |
| A drill jumped a question, or scored fewer answers than you gave | Was a stale voice-command closure calling the previous step's handler | Fixed; `onCommand` is read through a ref and a per-step guard blocks duplicate submissions. Confirm the Build stamp |
| Gesture control or Live detection spins forever offline | Their MediaPipe models were never fetched, because the feature was never opened while online | Warm-up, §10A. One online use per device is enough — the bytes go to IndexedDB |
| Text renders as boxes in Bengali, Odia or Urdu offline | Those font subsets are runtime-cached, not precached | Switch to that language once while online, §10A |
| Hindi voice answers do nothing offline, English works | No offline Hindi voice pack on the device | §10A, last section. The app falls back to English and says so; the real fix is the OS download |
| Header under the status bar, or content under the bottom bar | An old WebView that does not support `env()`, so the whole `calc()` is invalid and the padding collapses | Already guarded: every inset is `env(safe-area-inset-*, 0px)` with an explicit fallback. If it still happens, check `viewport-fit=cover` survived in `index.html` |
| Bottom bar looks correct but the edge of it mis-taps | Bar painted with the inset but the tap target not extended into it | The bar takes `padding-bottom: var(--safe-b)`, which grows it rather than shifting it — do not swap that for a margin |
