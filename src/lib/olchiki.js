// Ol Chiki -> Devanagari transliteration, for speech only.
//
// WHY THIS EXISTS
// No speech engine ships a Santali voice, so speech.js maps `sat` to `hi-IN`.
// That substitution was incomplete in a way that made Santali audio not merely
// approximate but silent: the Hindi voice was handed raw Ol Chiki codepoints
// (U+1C50..U+1C7F), which a Hindi acoustic model has no entry for. Depending on
// the engine the result is nothing at all, a run of "unknown character", or the
// codepoint names read out. Transliterating to Devanagari first gives the Hindi
// voice something it can actually pronounce, and the pronunciation lands close
// enough to Santali to be understood.
//
// WHY IT IS NOT A CHARACTER MAP
// Ol Chiki is an alphabet: every letter is a full segment, vowels included, and
// they are written in sequence. Devanagari is an abugida: a consonant carries an
// inherent /ə/, and a vowel after a consonant is written as a matra bound to it.
// A one-to-one map therefore produces gibberish —
//
//     ᱦᱟᱸ  ->  ह + आ + ं  =  "हआं"    read as "ha-aa-n"
//     ᱦᱟᱸ  ->  ह + ा + ँ  =  "हाँ"     read as "hã"   <- correct
//
// so the conversion has to syllabify: decide per vowel whether it is independent
// or a matra, insert virama between consonants that genuinely cluster, and fold
// the aspiration and nasalisation modifiers into the syllable they belong to.
//
// WHAT THIS IS NOT
// It is not translation, and it is not a general-purpose romanisation. It changes
// the script, never the words. It is applied on the way to the speech engine and
// to the voice-command lexicon. Nothing it produces is ever shown on screen — a
// Santali reader must see Ol Chiki.
//
// ACCURACY
// Santali phonology has segments Devanagari does not distinguish, notably the
// checked/glottalised consonants and the /ɔ/ ~ /a/ contrast. Those are
// approximated, and each approximation is marked below. Verified against every
// Ol Chiki string in the app by scripts/translit-check.mjs, including the
// brand name: ᱡᱟᱜᱨᱩᱠ -> जाग्रुक -> "jaagruk".

/* ================================================================== */
/* Character classes                                                   */
/* ================================================================== */

export const OL_CHIKI_PATTERN = /[\u1C50-\u1C7F]/

/** True when the text contains any Ol Chiki. */
export function hasOlChiki(text) {
  return OL_CHIKI_PATTERN.test(String(text || ''))
}

/**
 * Vowels: independent form when they open a syllable, matra when they follow a
 * consonant. ᱚ LA is the one that makes this tidy — it is Devanagari's inherent
 * vowel, so its matra is the empty string.
 */
const VOWELS = {
  '\u1C5A': { independent: '\u0905', matra: '', long: '\u0906' }, // ᱚ LA  /ɔ/  अ
  '\u1C5F': { independent: '\u0906', matra: '\u093E', long: '\u0906' }, // ᱟ LAA /a/  आ ा
  '\u1C64': { independent: '\u0907', matra: '\u093F', long: '\u0908' }, // ᱤ LI  /i/  इ ि
  '\u1C69': { independent: '\u0909', matra: '\u0941', long: '\u090A' }, // ᱩ LU  /u/  उ ु
  '\u1C6E': { independent: '\u090F', matra: '\u0947', long: '\u090F' }, // ᱮ LE  /e/  ए े
  '\u1C73': { independent: '\u0913', matra: '\u094B', long: '\u0913' }, // ᱳ LO  /o/  ओ ो
}

/** Long counterpart of a matra, for the lengthening modifiers. */
const LONG_MATRA = {
  '': '\u093E', // inherent अ lengthens to ा
  '\u093E': '\u093E', // ा already long
  '\u093F': '\u0940', // ि -> ी
  '\u0941': '\u0942', // ु -> ू
  '\u0947': '\u0947', // े has no longer form in this system
  '\u094B': '\u094B', // ो likewise
}

const CONSONANTS = {
  '\u1C5B': '\u0924', // ᱛ AT   /t/   त
  '\u1C5C': '\u0917', // ᱜ AG   /g/   ग
  '\u1C5D': '\u0919', // ᱝ ANG  /ŋ/   ङ  — becomes anusvara when syllable-final
  '\u1C5E': '\u0932', // ᱞ AL   /l/   ल
  '\u1C60': '\u0915', // ᱠ AAK  /k/   क
  '\u1C61': '\u091C', // ᱡ AAJ  /dʒ/  ज
  '\u1C62': '\u092E', // ᱢ AAM  /m/   म
  '\u1C63': '\u0935', // ᱣ AAW  /w/   व
  '\u1C65': '\u0938', // ᱥ IS   /s/   स
  '\u1C66': '\u0939', // ᱦ IH   /h/   ह
  '\u1C67': '\u091E', // ᱧ INY  /ɲ/   ञ
  '\u1C68': '\u0930', // ᱨ IR   /r/   र
  '\u1C6A': '\u091A', // ᱪ UC   /tʃ/  च
  '\u1C6B': '\u0926', // ᱫ UD   /d/   द
  '\u1C6C': '\u0923', // ᱬ UNN  /ɳ/   ण
  '\u1C6D': '\u092F', // ᱭ UY   /j/   य
  '\u1C6F': '\u092A', // ᱯ EP   /p/   प
  '\u1C70': '\u0921', // ᱰ EDD  /ɖ/   ड
  '\u1C71': '\u0928', // ᱱ EN   /n/   न
  '\u1C72': '\u0921\u093C', // ᱲ ERR /ɽ/ ड़
  '\u1C74': '\u091F', // ᱴ OTT  /ʈ/   ट
  '\u1C75': '\u092C', // ᱵ OB   /b/   ब
  // ᱶ OV is a nasalised /w/. Devanagari has no single letter for it; व plus a
  // nasal mark is the closest a Hindi voice can render.
  '\u1C76': '\u0935',
}

const ANG = '\u1C5D' // ᱝ
const ASPIRATE = '\u1C77' // ᱷ OH
const NASAL = '\u1C78' // ᱸ MU TTUDDAG
const NASAL_LONG = '\u1C7A' // ᱺ MU-GAAHLAA TTUDDAAG
const LENGTHEN = '\u1C79' // ᱹ GAAHLAA TTUDDAAG
const RELAA = '\u1C7B' // ᱻ RELAA
const PHAARKAA = '\u1C7C' // ᱼ
const AHAD = '\u1C7D' // ᱽ
const OV = '\u1C76' // ᱶ

const VIRAMA = '\u094D'
const ANUSVARA = '\u0902' // ं
const CANDRABINDU = '\u0901' // ँ

/** Aspirated counterparts, for folding ᱷ into the preceding consonant. */
const ASPIRATED = {
  '\u0915': '\u0916', // क ख
  '\u0917': '\u0918', // ग घ
  '\u091A': '\u091B', // च छ
  '\u091C': '\u091D', // ज झ
  '\u091F': '\u0920', // ट ठ
  '\u0921': '\u0922', // ड ढ
  '\u0921\u093C': '\u0922\u093C', // ड़ ढ़
  '\u0924': '\u0925', // त थ
  '\u0926': '\u0927', // द ध
  '\u092A': '\u092B', // प फ
  '\u092C': '\u092D', // ब भ
}

/** Ol Chiki digits U+1C50..U+1C59 -> Devanagari digits. */
function digit(ch) {
  const code = ch.codePointAt(0)
  if (code < 0x1c50 || code > 0x1c59) return null
  return String.fromCodePoint(0x0966 + (code - 0x1c50))
}

const PUNCTUATION = {
  '\u1C7E': '\u0964', // ᱾ MUCAAD -> danda
  '\u1C7F': '\u0965', // ᱿ DOUBLE MUCAAD -> double danda
}

/* ================================================================== */
/* Conversion                                                          */
/* ================================================================== */

/**
 * Transliterate Ol Chiki to Devanagari.
 *
 * Text in any other script passes through untouched, so a mixed string such as
 * "ᱟᱯᱞᱳᱰ URL" converts the Santali and leaves the Latin alone.
 *
 * @param {string} text
 * @returns {string}
 */
export function olChikiToDevanagari(text) {
  const src = String(text || '')
  if (!src) return ''

  const out = []
  // Index in `out` of the consonant that has been emitted but not yet resolved
  // against a vowel. null means the next vowel is syllable-initial.
  let openConsonant = null
  // Index in `out` of the last vowel or matra, for the lengthening modifiers.
  let lastVowel = null
  // ᱶ OV carries its own nasalisation, but Devanagari orders a syllable as
  // consonant + matra + nasal mark. Emitting the mark as soon as the letter is
  // read puts it before the matra, which leaves the matra with no letter to
  // attach to — it renders as a dotted circle and is read as noise. So the mark
  // is held until the syllable's vowel has been placed.
  let pendingNasal = false

  const isConsonant = (ch) => Object.prototype.hasOwnProperty.call(CONSONANTS, ch)
  const isVowel = (ch) => Object.prototype.hasOwnProperty.call(VOWELS, ch)

  /* A consonant left open before another consonant is a genuine cluster and
     needs virama: हिन्दी, not हिनदी. Word-finally it does NOT get one — Hindi
     orthography writes काम, not काम्, and the engine's own schwa deletion
     handles it. Writing the virama there makes some voices clip the syllable. */
  const closeCluster = () => {
    flushNasal()
    if (openConsonant !== null) out.push(VIRAMA)
    openConsonant = null
  }

  /** Emit a held nasal mark once the syllable it belongs to is complete. */
  const flushNasal = () => {
    if (!pendingNasal) return
    pendingNasal = false
    out.push(CANDRABINDU)
  }

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]

    // ---- ᱝ ANG: velar nasal ------------------------------------------------
    // Pre-vocalic it is a consonant (ङ). Syllable-final it becomes anusvara,
    // which is how Devanagari writes a nasal before a consonant or at the end
    // of a syllable, and what a Hindi voice pronounces correctly. बाङ् would be
    // read as a cluster; बां is read "baan".
    if (ch === ANG) {
      const next = src[i + 1]
      if (next && isVowel(next)) {
        closeCluster()
        out.push(CONSONANTS[ANG])
        openConsonant = out.length - 1
      } else {
        // The nasal attaches to the syllable already in progress.
        flushNasal()
        openConsonant = null
        out.push(ANUSVARA)
      }
      continue
    }

    // ---- consonants --------------------------------------------------------
    if (isConsonant(ch)) {
      closeCluster()
      out.push(CONSONANTS[ch])
      openConsonant = out.length - 1
      // Held, not emitted — see pendingNasal above.
      if (ch === OV) pendingNasal = true
      continue
    }

    // ---- vowels ------------------------------------------------------------
    if (isVowel(ch)) {
      const v = VOWELS[ch]
      if (openConsonant !== null) {
        out.push(v.matra)
        lastVowel = out.length - 1
        openConsonant = null
      } else {
        out.push(v.independent)
        lastVowel = out.length - 1
      }
      flushNasal()
      continue
    }

    // ---- aspiration --------------------------------------------------------
    // Folds into the consonant it follows. On anything else it is dropped
    // rather than emitted as a stray ह, which would add a syllable.
    if (ch === ASPIRATE) {
      if (openConsonant !== null) {
        const base = out[openConsonant]
        if (ASPIRATED[base]) out[openConsonant] = ASPIRATED[base]
      }
      continue
    }

    // ---- nasalisation ------------------------------------------------------
    if (ch === NASAL || ch === NASAL_LONG) {
      if (ch === NASAL_LONG) lengthenLastVowel()
      // An explicit mark supersedes one held from ᱶ; two would stack.
      pendingNasal = false
      // Candrabindu after an open vowel matches Hindi convention (हाँ);
      // anusvara elsewhere.
      out.push(lastVowel !== null ? CANDRABINDU : ANUSVARA)
      openConsonant = null
      continue
    }

    // ---- lengthening -------------------------------------------------------
    if (ch === LENGTHEN || ch === RELAA) {
      lengthenLastVowel()
      flushNasal()
      continue
    }

    // ---- dropped marks -----------------------------------------------------
    // PHAARKAA separates letters that would otherwise be read as one unit and
    // AHAD marks a glottal. Neither has a Devanagari equivalent that helps a
    // Hindi voice, and both are silent, so they are dropped without closing the
    // syllable in progress.
    if (ch === PHAARKAA || ch === AHAD) continue

    // ---- punctuation and digits -------------------------------------------
    if (PUNCTUATION[ch]) {
      flushNasal()
      openConsonant = null
      lastVowel = null
      out.push(PUNCTUATION[ch])
      continue
    }
    const d = digit(ch)
    if (d) {
      flushNasal()
      openConsonant = null
      lastVowel = null
      out.push(d)
      continue
    }

    // ---- anything else -----------------------------------------------------
    // Spaces, Latin, Devanagari, punctuation. A word boundary ends the syllable.
    flushNasal()
    openConsonant = null
    lastVowel = null
    out.push(ch)
  }

  flushNasal()
  return out.join('')

  function lengthenLastVowel() {
    if (openConsonant !== null) {
      // A consonant with its inherent vowel: the vowel being lengthened is the
      // implicit अ, so it becomes an explicit ा.
      out.push(LONG_MATRA[''])
      lastVowel = out.length - 1
      openConsonant = null
      return
    }
    if (lastVowel === null) return
    const current = out[lastVowel]
    if (LONG_MATRA[current] !== undefined) {
      out[lastVowel] = LONG_MATRA[current]
      return
    }
    // Independent vowel: swap for its long form.
    for (const v of Object.values(VOWELS)) {
      if (v.independent === current) {
        out[lastVowel] = v.long
        return
      }
    }
  }
}

/**
 * Prepare text for a speech engine.
 *
 * Only used when the engine's language differs in script from the text's, which
 * today means Santali read by a Hindi voice. Returns the text unchanged when
 * there is no Ol Chiki in it, so it is safe to call unconditionally.
 */
export function forSpeech(text, lang) {
  if (lang !== 'sat') return String(text || '')
  const s = String(text || '')
  if (!hasOlChiki(s)) return s
  return olChikiToDevanagari(s)
}
