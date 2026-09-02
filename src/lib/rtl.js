// Text direction.
//
// THE BUG THIS FIXES
// Urdu is a supported language and is written right-to-left. Nothing in the app
// set `dir`, so Urdu rendered left-to-right: the words appeared, but alignment,
// list order, icon placement and every directional arrow pointed the wrong way.
// Six languages could not honestly be claimed with that open.
//
// APPROACH
// Set `dir` on <html> and let CSS logical properties do the rest. That is why the
// rebuild uses ms-/me-/ps-/pe- and text-start/text-end rather than ml-/mr-/pl-/pr-
// and text-left/text-right — logical properties mirror themselves, physical ones
// do not, and hand-writing an [dir='rtl'] override for every rule is how RTL
// support rots.

/** Right-to-left app languages. */
const RTL_LANGS = new Set(['ur'])

export function isRtlLang(lang) {
  return RTL_LANGS.has(lang)
}

export function directionFor(lang) {
  return isRtlLang(lang) ? 'rtl' : 'ltr'
}

/**
 * Apply direction and language to the document.
 *
 * `lang` matters as much as `dir`: it drives hyphenation, the correct glyph
 * variants for Han/Devanagari, and — most importantly here — which voice a
 * screen reader picks. A screen reader announcing Ol Chiki with an English voice
 * is unusable.
 */
export function applyDirection(lang) {
  const dir = directionFor(lang)
  const root = document.documentElement
  root.setAttribute('dir', dir)
  root.setAttribute('lang', bcp47For(lang))
  return dir
}

/**
 * App code to BCP-47 tag, for the lang attribute and for speech.
 * Santali is tagged with its script explicitly, because `sat` alone leaves the
 * script ambiguous — it is written in both Ol Chiki and Devanagari, and the tag
 * is how assistive technology knows which it is looking at.
 */
export function bcp47For(lang) {
  switch (lang) {
    case 'hi':
      return 'hi-IN'
    case 'sat':
      return 'sat-Olck-IN'
    case 'bn':
      return 'bn-IN'
    case 'or':
      return 'or-IN'
    case 'ur':
      return 'ur-PK'
    default:
      return 'en-IN'
  }
}

/**
 * Mirror a directional glyph for RTL. Chevrons and arrows are the one case where
 * logical properties cannot help, because the character itself has a direction.
 */
export function flipForDir(dir, ltrGlyph, rtlGlyph) {
  return dir === 'rtl' ? rtlGlyph : ltrGlyph
}
