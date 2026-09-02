// Per-script font loading.
//
// THE PROBLEM THIS FIXES
// Barlow Condensed and Inter cover Latin only. The app claims six languages, but
// Hindi, Santali, Bengali, Odia and Urdu were all falling back to whatever the OS
// happened to provide — so five of six languages rendered unstyled, and on a
// device with no Ol Chiki font at all, Santali rendered as tofu boxes.
//
// WHY NOT JUST BUNDLE EVERYTHING
// Six script families is several hundred kilobytes. A Hindi-speaking worker on a
// 2G link should never download Ol Chiki or Nastaliq. Each script is a separate
// dynamic import, fetched the first time its language is selected and cached by
// the service worker after that.
//
// WHY NOT THE GOOGLE FONTS CDN
// It was a network dependency on first run, which contradicts the offline-first
// guarantee. These are npm packages bundled by Vite and precached by Workbox, so
// the app is fully styled on a cold offline start.

/** Script family per app language. Latin is always present. */
const SCRIPT_BY_LANG = {
  en: null,
  hi: 'devanagari',
  sat: 'olchiki',
  bn: 'bengali',
  or: 'oriya',
  ur: 'urdu',
}

/**
 * CSS font-family stacks per script, in the order the browser should try.
 * Latin display/body/mono come first so digits, Latin punctuation and units
 * inside a translated string keep the app's typography instead of switching
 * mid-sentence.
 */
export const FONT_STACK = {
  latin: {
    display: "'Barlow Condensed', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  devanagari: {
    display: "'Barlow Condensed', 'Noto Sans Devanagari', system-ui, sans-serif",
    body: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif",
  },
  olchiki: {
    display: "'Barlow Condensed', 'Noto Sans Ol Chiki', system-ui, sans-serif",
    body: "'Inter', 'Noto Sans Ol Chiki', system-ui, sans-serif",
  },
  bengali: {
    display: "'Barlow Condensed', 'Noto Sans Bengali', system-ui, sans-serif",
    body: "'Inter', 'Noto Sans Bengali', system-ui, sans-serif",
  },
  oriya: {
    display: "'Barlow Condensed', 'Noto Sans Oriya', system-ui, sans-serif",
    body: "'Inter', 'Noto Sans Oriya', system-ui, sans-serif",
  },
  urdu: {
    // Nastaliq leads for Urdu: it is the script Urdu readers expect, and a
    // naskh fallback looks wrong rather than merely plain.
    display: "'Noto Nastaliq Urdu', 'Barlow Condensed', system-ui, sans-serif",
    body: "'Noto Nastaliq Urdu', 'Inter', system-ui, sans-serif",
  },
}

/**
 * Loaders are lazy so Vite emits one chunk per script.
 * 400 and 700 only — the app uses regular and bold, and shipping 100–900 for six
 * scripts would defeat the point of loading them separately.
 */
const LOADERS = {
  devanagari: () => [
    import('@fontsource/noto-sans-devanagari/devanagari-400.css'),
    import('@fontsource/noto-sans-devanagari/devanagari-700.css'),
  ],
  olchiki: () => [
    import('@fontsource/noto-sans-ol-chiki/ol-chiki-400.css'),
    import('@fontsource/noto-sans-ol-chiki/ol-chiki-700.css'),
  ],
  bengali: () => [
    import('@fontsource/noto-sans-bengali/bengali-400.css'),
    import('@fontsource/noto-sans-bengali/bengali-700.css'),
  ],
  oriya: () => [
    import('@fontsource/noto-sans-oriya/oriya-400.css'),
    import('@fontsource/noto-sans-oriya/oriya-700.css'),
  ],
  urdu: () => [
    import('@fontsource/noto-nastaliq-urdu/arabic-400.css'),
    import('@fontsource/noto-nastaliq-urdu/arabic-700.css'),
  ],
}

const loaded = new Set()
const inFlight = new Map()

export function scriptForLang(lang) {
  return SCRIPT_BY_LANG[lang] ?? null
}

/** True once the script's font files have been requested successfully. */
export function isScriptLoaded(script) {
  return !script || loaded.has(script)
}

/**
 * Load the font for a language. Idempotent and safe to call on every render.
 * A failure is swallowed deliberately: the OS fallback is worse-looking but
 * still legible, and a font 404 must never stop a worker reaching a drill.
 */
export async function loadFontForLang(lang) {
  const script = scriptForLang(lang)
  if (!script) return true
  if (loaded.has(script)) return true

  if (inFlight.has(script)) return inFlight.get(script)

  const load = LOADERS[script]
  if (!load) return false

  const promise = Promise.all(load())
    .then(() => {
      loaded.add(script)
      return true
    })
    .catch(() => false)
    .finally(() => {
      inFlight.delete(script)
    })

  inFlight.set(script, promise)
  return promise
}

/**
 * Point the document's font variables at the right stack. Applied immediately,
 * before the font file resolves, so the correct fallback is in place during the
 * fetch and text never reflows from one Latin face to another.
 */
export function applyFontStack(lang) {
  const script = scriptForLang(lang) || 'latin'
  const stack = FONT_STACK[script] || FONT_STACK.latin
  const root = document.documentElement
  root.style.setProperty('--font-display', stack.display)
  root.style.setProperty('--font-body', stack.body)
  root.setAttribute('data-script', script)
  return script
}

/**
 * Set the stack now, fetch the file in the background.
 *
 * Not named use* on purpose — it is a plain side-effecting function, not a React
 * hook, and the hook prefix would make the linter enforce rules that do not apply
 * and mislead the next reader into thinking it must be called at the top level.
 */
export function activateFontForLang(lang) {
  applyFontStack(lang)
  return loadFontForLang(lang)
}
