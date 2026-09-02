import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative asset paths so one build artefact deploys anywhere: a domain root,
  // a sub-path like /jaagruk/ on GitHub Pages, and the Capacitor WebView, which
  // serves from https://localhost. Safe because routing is HashRouter — the
  // document path never changes, so relative URLs always resolve correctly.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // NOTE: `includeAssets` previously listed favicon.ico, which does not exist
      // in public/. Workbox warned and skipped it on every build. The PWA icons
      // are declared in the manifest below and picked up by globPatterns.
      manifest: {
        name: 'Jaagruk — Industrial Safety Training & Certification',
        short_name: 'Jaagruk',
        description:
          'AR safety training, reaction-time assessment and tamper-evident offline certification for mining, steel and mica workers in Jharkhand.',
        theme_color: '#1C1F22',
        background_color: '#1C1F22',
        display: 'standalone',
        orientation: 'portrait',
        // Relative so the app also works when served from a sub-path or inside
        // the Capacitor webview, where an absolute '/' resolves differently.
        start_url: './',
        scope: './',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell. Training, assessment, certification and
        // verification all have to work with no network at all — that is the
        // core requirement, not a nice-to-have.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],

        // ...but not every script's fonts.
        //
        // Latin, Devanagari and Ol Chiki ARE precached: the problem statement
        // names Hindi and Santali localisation specifically, so those two have to
        // be fully styled on a cold offline start. Ol Chiki costs 10 KB for both
        // weights, so there is no reason to defer it.
        //
        // Bengali, Odia and Urdu are runtime-cached instead. They are additional
        // languages beyond the brief, and Nastaliq alone is ~317 KB for two
        // weights — making every worker download it up front to install the app
        // would be the wrong default. They cache permanently on first use.
        globIgnores: [
          '**/noto-sans-bengali-*.woff2',
          '**/noto-sans-oriya-*.woff2',
          '**/noto-nastaliq-urdu-*.woff2',
        ],
        // The three-panel dashboard plus three.js pushes the bundle past the
        // default 2 MB precache ceiling.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Google Fonts stylesheet: revalidate when online, serve from cache
            // when not.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'jaagruk-font-css' },
          },
          {
            // Font binaries are immutable, so cache-first is correct here.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'jaagruk-fonts',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // MediaPipe hand-tracking runtime and model. Fetched once, then the
            // gesture layer works offline. The model bytes are additionally
            // cached in IndexedDB by gesture.js.
            urlPattern: ({ url }) =>
              url.href.includes('cdn.jsdelivr.net/npm/@mediapipe') ||
              url.href.includes('storage.googleapis.com/mediapipe-models'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'jaagruk-mediapipe',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The three deferred script fonts. Self-hosted, so same-origin and
            // immutable once hashed — cache-first and keep them for a year. After
            // one online use of Bengali, Odia or Urdu, that language is offline
            // too.
            urlPattern: /\/assets\/noto-(sans-bengali|sans-oriya|nastaliq-urdu)-[^/]+\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jaagruk-script-fonts',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // The previous config applied CacheFirst to EVERY request that was not
          // a Gemini/OpenAI call. That pinned stale copies of anything the app
          // touched, including responses that should never be cached. AI
          // endpoints and any configured DGMS upload URL are deliberately left
          // uncached so they always hit the network.
        ],
      },
    }),
  ],
  build: {
    // three.js and the AR/drill surfaces are the bulk. Splitting them out means a
    // worker who never opens a 3D drill does not download the renderer, and the
    // shell stays cacheable across releases.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
})
