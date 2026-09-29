# Enhancement implementation progress

The complete scope remains in SIH_2026_ENHANCEMENT_PLAN.md. This record tracks
implemented changes and evidence; a passed unit test is not a hardware test.

## First slice: assessment readiness

- Added a monotonic decision clock with independent reader/listener elapsed time.
- Connected it to Scenario scoring, the visible timer and voice/answer readiness.
- Camera mode requires video readiness, active orientation and portrait projection.
- 3D mode reports readiness after its first scene frame has rendered.
- Hidden-page time is excluded and interrupted elapsed time is preserved.
- Camera acquisition uses generation checks to stop late streams after cleanup or
  a newer request. Track end/mute and video wait/pause clear camera readiness.
- Aim holds no longer complete while the camera is unavailable or page hidden.
- Narration callbacks from disposed step effects are ignored.

Verification: npm run verify passed, including 362 tests (five new clock tests),
accessibility/contrast gates, localization/transliteration and production PWA build.
git diff --check passed. In-app browser test could not start: its native bridge
reported unavailable/untrusted. Live camera, physical phone AR and audible speech
are therefore still unverified. Development preview: http://127.0.0.1:5173.

## Offline camera assets

- Pinned MediaPipe Tasks Vision 0.10.18 as a local dependency; removed runtime CDN imports.
- Added reproducible preparation with a committed SHA-256/size/source lock for six
  WASM and model assets. Initial developer preparation needs internet access.
- Both WASM variants and both models are included in the production precache and
  Capacitor asset directory. Build fails if any asset is missing or not precached.
- Production install is approximately 32.6 MiB precached, including app assets.
- Playwright confirms offline restart, all six binary fetches, and initialization
  and inference of HandLandmarker and ObjectDetector with networking disabled.
- See OFFLINE_VISION.md for preparation, verification and distribution limitations.

## Camera and scene resilience

- Video readiness now requires fresh decoded frames; stalled, muted, paused,
  hidden or ended streams cannot continue assessment readiness indefinitely.
- Camera errors keep the video element mounted so retry does not race its remount.
- Pending startup provides a 3D fallback; late permission streams are stopped.
- Multiple available cameras can be selected, including USB cameras. Explicit
  device selection never silently falls back to a different camera.
- 3D rendering pauses assessment readiness on context loss and restores readiness
  after frames resume. Portrait scene framing preserves a wider horizontal view.
- Unit tests cover frame readiness and exact-device constraints. Browser tests
  cover actual WebGL context loss/restore and answering/advancing in the 3D drill.
- Physical USB device switching and ARCore tracking are not hardware-verified.

## Worker workspace

- Root route now opens the training workspace, with nine direct module entries,
  worker-scoped retention/progress, due refreshers, certificates and daily actions.
- Existing project overview remains accessible at /#/about.
- Failed storage reads show an error/retry state instead of fabricated zero metrics.
- Fixed shared header overflow at 320px; compact profile access keeps its accessible
  name. Required-language layout tests cover English, Hindi and Santali at 1440,
  390 and 320px. This tests layout, not translation correctness.
- Desktop/mobile screenshots and canvas pixel checks verify nonblank 3D rendering.
  Current meshes are still stylized primitives, not the final realistic asset pack.

## Native narration

Changes in the separate Jaagruk - Kotlin repository:

- DrillViewModel sends the prompt key instead of an empty fallback string.
- NarrationPlayer resolves resources using the prepared locale, queues the latest
  prompt during TTS initialization, cancels stale requests, and guards callbacks.
- Per-clip TTS fallback is independent of whether another recording exists.
- Santali does not silently use English TTS. Reviewed Santali recordings are still
  absent, so this repair does not claim complete Santali audio.
- Five new Robolectric regression tests pass. Full Android debug unit suite:
  86 tests, zero failures/errors/skips. Debug Kotlin compilation passes.
- Audible phone playback and native narration/assessment timing remain release gates.

## Verification commands

- Web: `npm run verify` passes (376 unit tests plus accessibility, contrast,
  localization, transliteration, build and offline package checks).
- Browser: `npm run test:browser` uses a standalone Chromium because the in-app
  browser bridge is unavailable. It requires a current production build and
  `npx playwright install chromium` on a new development machine.
- Native: `gradlew.bat :android-app:testDebugUnitTest` passes.
- Both repositories pass `git diff --check`.
- npm audit reports eight existing dependency advisories, including a high-severity
  Vite advisory. Dependency migration/security review remains outstanding; no
  force-upgrade was applied.

## Sync integrity and backend isolation

- Web upload deletion now requires a versioned per-record receipt matching kind,
  reference and content hash. HTTP 200, HTML/login responses, partial acknowledgements,
  conflicting entries and quarantined/rejected records do not erase pending records.
- Transient network/auth/rate-limit failures back off without exhausting retries.
  A pending queue reports its real remaining count; explicit supervisor Sync can
  recover capped permanent failures after configuration/content repair.
- Concurrent sync triggers share a request, automatic retries are scheduled, and
  unmount cleanup cancels pending timers. Ten regression tests cover these cases.
- Backend upload now checks the caller's access to the registered device's site
  before ingestion or receipt replay. Two new tests first reproduced the flaw
  (unauthorized cross-site requests returned 200), then passed with the fix.
- Full backend pytest suite passes. No deployment or production database changes
  were made; tests use the repository's isolated test fixtures.
- WEB_SYNC_CONTRACT.md documents the required receipt and compatibility boundary.
  Existing custom web endpoints must implement it. Native `/sync/batch` is not
  directly compatible; authenticated adaptation and shared certificate/content
  contracts remain unfinished. No live web-to-native backend integration is claimed.

## Immediate remaining work

1. Physical USB/Android camera switching and tracking tests. Browser-generated
   video tracks now cover stalls, recovery, retry, stream replacement and cleanup;
   these do not establish hardware compatibility.
2. Native-speaker review of localized pause reasons and complete Santali content.
3. Native audible-device validation, offline voices and reviewed audio packs.
4. Shared web/native content and synchronization contracts; authenticated backend
   integration and durable session revocation before deployment.
5. Realistic animated scene assets, deeper task-based simulations, remaining web
   and Kotlin screens, Flutter delivery and the rest of the comprehensive plan.

The enhancement is incomplete. No claim of completed AR, full offline packs,
reviewed Santali speech, backend integration or Flutter delivery is made here.

## Drill regression checkpoint

- Six Chromium browser tests pass against the production build. Three new tests
  cover camera permission waits, mode transitions, narration completion/replay,
  simulated document visibility, new-step timing and delayed coaching responses.
- Fixed a missing Three.js DoubleSide import that crashed the extinguisher spray
  animation. The regression deliberately selects the correct extinguisher action
  instead of relying on shuffled answer positions.
- Reproduced old coaching overwriting a later decision's feedback, then fixed it
  with request-generation checks and invalidation on step/language changes,
  advancing and unmount. Stale failures cannot clear current feedback/loading.
- `npm run verify` and `git diff --check` pass after these fixes. Browser speech,
  permission waits and visibility are controlled test inputs, not evidence of
  physical camera compatibility or reviewed audible narration.

## Camera recovery and fallback typography

- Stalled camera feeds show an explicit assessment-paused status and a camera
  retry control. Returning frames resume the existing session automatically;
  errors no longer display a second startup status underneath their error panel.
- The shared timer labels paused time honestly instead of saying the worker is
  being timed. Its elapsed value remains frozen until the scene is available.
- Browser camera tests use real canvas-capture video tracks and controlled motion
  permission/events. They verify paused answers, automatic recovery, manual retry,
  device selection, old-track shutdown and late permission completion after exit.
- Santali's font loader and CSS stack now include the self-hosted Hindi font used
  by its documented content fallback. The glyph gate caught this missing font
  coverage; a browser check loads that font and verifies the applied stack.
- The new camera interruption message has English/Hindi copy. Santali follows
  the existing Hindi fallback until reviewed Santali copy is available.
- Nine browser checks pass, including the three new camera/font checks. Timing
  tests use a fully controlled monotonic clock so software-renderer delays do not
  distort the expected decision-time values. `npm run verify` also passes.

## Native assessment and spoken choices

- Four new Android regressions first reproduced unsafe pause overrides: returning
  to the app, the Resume button, tracking recovery while backgrounded, and camera
  initialization. Pause reasons now remain independent and must all clear.
- Initial prompt and numbered option narration pauses the response clock through
  the whole sequence. Options follow the actual displayed order and resource keys;
  each clip still prefers a bundled recording. Replay does not reset decision time.
- Audio completion cannot clear tracking/background pauses. Delayed voice commands
  during playback are ignored, and the microphone restarts only when permitted.
- NarrationPlayer now has exactly-once completion, cancellation without stale
  completion, and a 60-second per-clip watchdog. A hung engine is released so later
  options do not each wait another timeout. Missing audio releases the clock.
- This does not provide missing recordings: Santali still requires reviewed prompt,
  option and `option_number_N` clips. New narration-pause copy is English/Hindi;
  native-speaker Santali localization remains outstanding.
- No device was connected when checked with adb. JVM/Robolectric tests and a debug
  APK build do not establish audible playback or physical AR correctness.
- Final native verification: 99 Android unit tests, zero failures/errors/skips;
  unchanged core test task up-to-date with 606 passing tests in its report.
  `:android-app:assembleDebug` and `git diff --check` pass. Fresh APKs are under
  `D:/Endeavors/Coding/Projects/Jaagruk - Kotlin/android-app/build/outputs/apk/debug/`,
  including `android-app-arm64-v8a-debug.apk` and `android-app-universal-debug.apk`.

## Recorded-audio recovery

- MediaPlayer now receives audio attributes at creation, before preparation.
  Removed the inaccurate comment claiming audio usage could guarantee playback
  regardless of device volume settings.
- Failed starts release their player before attempting the existing fallback.
  Playback errors release immediately, mark narration unavailable and complete
  the current clip without waiting for the watchdog.
- Stop detaches the player before cleanup; callbacks from stopped/replaced clips
  cannot complete a newer question or release a newer player.
- Five added tests cover completion, failed starts, playback errors, stopped
  callbacks and callbacks from a replaced recording. These mock platform media
  playback and do not validate real recordings or device volume behavior.
- Verification: 104 Android tests pass with zero failures/errors/skips; debug
  APKs rebuilt successfully and native `git diff --check` passes.

## Native pause controls and absence timing

- Narration pauses offer Continue without audio instead of an ineffective Resume
  action. Cancellation invalidates the queued sequence, starts reading time only
  when other pause reasons clear, and ignores late audio callbacks.
- Tracking/background pause panels no longer offer a button that could suggest
  those interruptions can be bypassed. Stop drill remains reachable. Compose
  tests exercise the actual narration and tracking panels.
- Background absence uses Android monotonic elapsed time instead of wall time.
  Duplicate background notifications preserve the original deadline; a genuine
  return clears it before a subsequent absence.
- New controls have English/Hindi resources; reviewed Santali text and physical
  phone usability validation remain outstanding.

## Native result-saving guard

- Reproduced duplicate repository saves from repeated Stop events while storage
  was pending. A synchronous finish guard now permits only one save per view model.
- The screen shows its existing loading indicator while saving. Completion is
  published only after persistence returns successfully; storage exceptions show
  an explicit incomplete-save error instead of claiming a finished run.
- Cancellation still propagates. Failed saves are not automatically retried:
  repository-wide idempotency, partial-write recovery and process-death recovery
  remain necessary before enabling retries across certificate/retention effects.
- Verification after pause-control, absence-time and save-guard changes: 112
  Android tests pass with zero failures/errors/skips, debug APK assembly succeeds,
  and native `git diff --check` passes. Hardware testing remains outstanding.
