# Offline camera models

MediaPipe Tasks Vision is pinned to 0.10.18. The JavaScript runtime is bundled;
both SIMD and non-SIMD WASM variants and both models are served locally.
Google's setup supports project-local models and a custom WASM root:
https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js

Run `npm ci`, then `npm run assets:prepare`. Development and production builds
also run preparation automatically. Initial preparation needs internet access;
subsequent builds reuse verified local files. Generated binaries live under
`public/vision/0.10.18` and are ignored by Git. Source URLs, byte sizes and SHA-256
checksums are committed in `scripts/vision-assets.lock.json`.

`npm run assets:check` checks existing files without downloading. Production
`npm run build` also verifies that the generated service worker precaches every
binary. A checksum mismatch fails the build. Do not regenerate the lock merely
to bypass a mismatch: review upstream changes first.

The six assets total approximately 30 MiB. A web installation must finish caching
online before an offline restart. A Capacitor build carries the same files in
the APK. This does not promise browser storage cannot be evicted or grant camera
permission. Physical-device airplane-mode inference remains a release gate.

MediaPipe's package declares Apache-2.0. Retain upstream notices when distributing
the runtime and review the linked model documentation for release attribution.
The object model detects COCO people and vehicles, not industrial PPE or exits.
