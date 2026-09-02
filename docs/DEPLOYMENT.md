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

- [ ] Build completes clean (expect ~690 modules, 11 precache entries, ≈1.6 MB)
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
| 7 | Start a hazard report, take a photo | Camera opens, photo downscales |
| 8 | Enable gesture mode (online first time) | Model downloads then tracks |
| 9 | Two phones on one hotspot → buddy drill | QR pairing connects |
| 10 | Install to home screen, relaunch offline | Opens standalone, data intact |
| 11 | Deploy a change, reload twice | New version is picked up (validates §5) |

Check 4 is the one that matters most. It is the claim the whole project rests on, and it is
the one a judge is most likely to test personally.

---

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
