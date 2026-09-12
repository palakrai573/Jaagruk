import { forSpeech, olChikiToDevanagari, hasOlChiki } from './olchiki.js'

// Voice layer — output (TTS) and fixed-vocabulary input (ASR).
//
// Two things the previous version got wrong, both fixed here:
//
// 1. It hardcoded `en-IN` for every utterance, so Hindi and Santali text was
//    read aloud by an English voice. For an app whose pitch is voice-guided
//    training for low-literacy workers, that was the single worst bug in it.
//
// 2. It had no input side at all. Workers wear gloves and work in dust; the
//    problem statement's population needs a hands-free path.
//
// ON SANTALI SPEECH INPUT — stated plainly: there is no production-quality
// Santali ASR. We do not pretend otherwise. Santali *output* (Ol Chiki text and
// spoken audio via the closest available voice) is real. Santali *input* runs
// the Hindi acoustic model and matches against a fixed lexicon that includes
// romanised Santali, Devanagari transliterations, Hindi and English. Workers in
// Jharkhand code-switch constantly, so accepting the union of all four is both
// more honest and more usable than pretending to recognise one.

/* ================================================================== */
/* Locale mapping                                                      */
/* ================================================================== */

/**
 * App language code -> BCP-47 speech locale.
 * `sat` maps to Hindi because no engine ships a Santali voice; this is a
 * documented fallback, not an oversight.
 */
export const SPEECH_LOCALE = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  or: 'or-IN',
  ur: 'ur-PK',
  sat: 'hi-IN',
}

/** Languages where the spoken voice is a substitute, not the real thing. */
export const SPEECH_IS_SUBSTITUTE = { sat: 'hi' }

export function speechLocaleFor(lang) {
  return SPEECH_LOCALE[lang] || SPEECH_LOCALE.en
}

/* ================================================================== */
/* Recognition locale fallback                                         */
/* ================================================================== */

/**
 * Recognition locales to try when the preferred one cannot run on this device.
 *
 * WHY THIS EXISTS — the bug it fixes is specific and was reported from a phone.
 * With the net off, English voice answers worked and Hindi ones did not: saying
 * "ek" or "do" was never caught.
 *
 * Recognition on Chrome/Android is served by the Android speech service, which can
 * only work offline for languages whose pack has been downloaded. Devices ship an
 * English model; Hindi is an opt-in download most workers have never made. With no
 * pack and no network the engine reports `network` — and the old listener retried
 * `hi-IN` on an exponential backoff, forever, against a wall that could not move.
 * The live indicator kept saying "listening" because a restart counts as listening,
 * so the worker spoke Hindi into a microphone that was never going to hear them and
 * nothing on screen said otherwise.
 *
 * Falling back to a locale that does have a model is the right answer here, and it
 * is not a hack, because the lexicon was never single-language: COMMAND_PHRASES
 * accepts English, Devanagari, romanised Hindi, Ol Chiki and romanised Santali for
 * every command, precisely because workers in Jharkhand code-switch. An English
 * model transcribing a Hindi speaker is a worse recogniser, not a useless one — and
 * the numerals now in the lexicon are what most engines return for a spoken digit in
 * any language.
 *
 * The caller is told when this happens (`onLocaleChange`), because the reliable move
 * once the model is English is to say the English number, and the worker can only do
 * that if the app says so.
 */
/**
 * The last rung: let the engine use whatever the device's own default is.
 *
 * An empty `lang` is spec-defined as "the user agent's default language", and it is
 * the only value guaranteed to have a model if the device has one at all. Needed
 * because the first fallback was `en-IN`, and a phone set to `en-US` may have no
 * `en-IN` pack either — so a chain that stopped at en-IN could still end at a locale
 * this device cannot serve, which is the same dead end one step further along.
 */
export const ASR_DEVICE_DEFAULT = ''

export const ASR_FALLBACK_LOCALE = {
  'hi-IN': ['en-IN', 'en-US', ASR_DEVICE_DEFAULT],
  'bn-IN': ['en-IN', 'en-US', ASR_DEVICE_DEFAULT],
  'or-IN': ['en-IN', 'en-US', ASR_DEVICE_DEFAULT],
  'ur-PK': ['en-IN', 'en-US', ASR_DEVICE_DEFAULT],
  // English asks for en-IN, which is also not guaranteed offline on a phone set to
  // en-US or en-GB. It gets the same ladder minus the step it is already on.
  'en-IN': ['en-US', ASR_DEVICE_DEFAULT],
}

/**
 * How many consecutive `network` failures before trying the next locale.
 *
 * Two, not one. A single failure is also what a genuine momentary connection drop
 * looks like on a network-backed recogniser, and downgrading the model on the first
 * hiccup would quietly cost accuracy for anyone who is actually online. Two in a row
 * with no successful result in between is the offline signature, and at a 1s then 2s
 * backoff the switch happens inside about three seconds.
 */
export const ASR_LOCALE_ESCALATE_AFTER = 2

/** The locales to try, in order, for an app language or an explicit tag. */
export function asrLocaleChain(lang) {
  const preferred = String(lang).includes('-') ? lang : speechLocaleFor(lang)
  const fallbacks = (ASR_FALLBACK_LOCALE[preferred] || []).filter((l) => l !== preferred)
  return [preferred, ...fallbacks]
}

/** True once the chain has walked past the language the worker actually chose. */
export function isFallbackLocale(chain, index) {
  return index > 0 && Array.isArray(chain) && index < chain.length
}

/* ================================================================== */
/* Capability checks                                                   */
/* ================================================================== */

export function speechSynthesisSupported() {
  try {
    return typeof window !== 'undefined' && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Should voice answering be on for this drill?
 *
 * `stored` is the worker's explicit choice, or null if they have never made one. The
 * distinction matters, and it is the same one arSupport.shouldUseAr draws: null means
 * we are free to pick the better default, whereas an explicit false is a decision to
 * respect.
 *
 * The default is ON where the browser can hear at all, for the reason AR is default-on
 * — a feature that exists for workers who cannot reliably tap is useless if those
 * workers have to tap a settings toggle to discover it. Nothing happens silently: the
 * browser still asks for the microphone the first time, the drill screen shows a live
 * indicator whenever it is open, and one tap mutes it.
 *
 * A stored true never overrides a missing engine.
 */
export function shouldUseVoice(stored) {
  if (!speechRecognitionSupported()) return false
  if (stored === null || stored === undefined) return true
  return stored === true
}

export function speechRecognitionSupported() {
  try {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  } catch {
    return false
  }
}

// Kept for backwards compatibility with the previous module's API.
export const isSpeechRecognitionSupported = speechRecognitionSupported

/* ================================================================== */
/* Voice selection                                                     */
/* ================================================================== */

let voiceCache = []
let voicesReady = false

function loadVoices() {
  if (!speechSynthesisSupported()) return []
  try {
    const voices = window.speechSynthesis.getVoices() || []
    if (voices.length) {
      voiceCache = voices
      voicesReady = true
    }
    return voiceCache
  } catch {
    return voiceCache
  }
}

// getVoices() is empty on first call in Chrome until the engine populates it.
if (speechSynthesisSupported()) {
  loadVoices()
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
  } catch {
    try {
      window.speechSynthesis.onvoiceschanged = loadVoices
    } catch {
      /* older engine without the event */
    }
  }
}

/** Wait (briefly) for the voice list to populate. Resolves either way. */
export function voicesLoaded(timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (!speechSynthesisSupported()) {
      resolve([])
      return
    }
    if (voicesReady && voiceCache.length) {
      resolve(voiceCache)
      return
    }
    const start = Date.now()
    const tick = () => {
      loadVoices()
      if ((voicesReady && voiceCache.length) || Date.now() - start > timeoutMs) resolve(voiceCache)
      else setTimeout(tick, 120)
    }
    tick()
  })
}

/**
 * Best available voice for a locale. Prefers an exact tag match, then the same
 * base language in any region, then gives up and lets the engine pick.
 */
export function pickVoice(locale) {
  const voices = loadVoices()
  if (!voices.length) return null

  const target = String(locale || '').toLowerCase()
  const base = target.split('-')[0]

  const exact = voices.find((v) => String(v.lang).toLowerCase() === target)
  if (exact) return exact

  const sameLang = voices.find((v) => String(v.lang).toLowerCase().startsWith(`${base}-`))
  if (sameLang) return sameLang

  const bareLang = voices.find((v) => String(v.lang).toLowerCase() === base)
  if (bareLang) return bareLang

  return null
}

/** Whether the device can actually speak this app language. */
export function hasVoiceFor(lang) {
  return !!pickVoice(speechLocaleFor(lang))
}

/** Report which app languages have a usable voice — shown in Settings. */
export function voiceAvailability() {
  return Object.keys(SPEECH_LOCALE).map((lang) => {
    const locale = speechLocaleFor(lang)
    const voice = pickVoice(locale)
    return {
      lang,
      locale,
      available: !!voice,
      voiceName: voice?.name || null,
      substituteFor: SPEECH_IS_SUBSTITUTE[lang] || null,
    }
  })
}

/* ================================================================== */
/* Speaking                                                            */
/* ================================================================== */

// Some engines truncate long utterances, and Chrome has a long-standing bug
// where speech stops after roughly 15 seconds. Splitting on sentence
// boundaries avoids both.
const MAX_CHUNK_CHARS = 180

function chunkText(text) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return []
  if (clean.length <= MAX_CHUNK_CHARS) return [clean]

  // Split on sentence enders across the scripts we support (Latin ., Devanagari
  // danda, Urdu full stop) then re-pack into chunks.
  const sentences = clean.split(/(?<=[.!?।۔॥])\s+/)
  const chunks = []
  let current = ''

  for (const sentence of sentences) {
    if (!sentence) continue
    if (sentence.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      // Hard-wrap an over-long sentence at word boundaries.
      let rest = sentence
      while (rest.length > MAX_CHUNK_CHARS) {
        let cut = rest.lastIndexOf(' ', MAX_CHUNK_CHARS)
        if (cut <= 0) cut = MAX_CHUNK_CHARS
        chunks.push(rest.slice(0, cut).trim())
        rest = rest.slice(cut).trim()
      }
      if (rest) current = rest
      continue
    }
    if ((`${current} ${sentence}`).trim().length > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) chunks.push(current)
  return chunks.filter(Boolean)
}

// Every speak() call gets a token. A cancel request only takes effect if it
// refers to the current token, so a stale React effect cleanup can no longer
// silence narration that a later render legitimately started.
let currentToken = 0
let speaking = false

/*
 * When the app last stopped talking.
 *
 * Needed because hands-free listening and narration share one room. The drill now
 * reads every option aloud — "one… two… three…" — and a live microphone hears that
 * perfectly well. Without a guard the phone answers its own question, picking
 * whichever number it said last, and the worker watches the drill play itself.
 *
 * A trailing window is required as well as an is-speaking check: recognition results
 * arrive after the audio that produced them, so a phrase captured during narration
 * can be delivered a moment after narration ends.
 */
let speechEndedAt = 0

/** Milliseconds since the app stopped speaking. Infinity if it never has. */
export function msSinceSpeech() {
  if (speaking) return 0
  return speechEndedAt ? Date.now() - speechEndedAt : Number.POSITIVE_INFINITY
}

/**
 * How long after narration a recognised phrase is still assumed to be the app's own
 * voice rather than the worker's.
 *
 * Long enough to cover the recogniser's delivery lag, short enough that a worker who
 * answers the instant the question finishes is not ignored — which is the case that
 * matters, since a fast answer is exactly what the drill is measuring.
 */
export const SELF_HEARING_GUARD_MS = 600

export function isSpeaking() {
  if (!speechSynthesisSupported()) return false
  try {
    return speaking || window.speechSynthesis.speaking
  } catch {
    return speaking
  }
}

/**
 * Speak text in the given app language.
 *
 * @param text  what to say
 * @param lang  app language code ('hi', 'sat', ...) or a full locale
 * @param opts  { rate, pitch, onEnd, onStart, interrupt }
 * @returns a token usable with stopSpeaking(token), or 0 if unsupported
 */
export function speak(text, lang = 'en', opts = {}) {
  if (!speechSynthesisSupported()) return 0

  // Santali is read by a Hindi voice, which has no entry for an Ol Chiki
  // codepoint. Handed the raw script it produces silence or a run of "unknown
  // character" — so the substitution was not approximate, it was broken.
  // Transliterating first is what makes it audible. Runs before chunking so that
  // ᱾, now a danda, is available as a sentence boundary.
  const spoken = forSpeech(text, lang)

  const chunks = chunkText(spoken)
  if (!chunks.length) return 0

  /*
   * 0.88 rather than 0.95. Slightly under the previous pace, because these are
   * safety instructions being heard once, often in a second language, sometimes
   * over plant noise — and because the drill's clock now waits for narration to
   * finish, so a slower read no longer costs the worker any score.
   */
  const { rate = 0.88, pitch = 1, onEnd, onStart, interrupt = true } = opts

  const locale = String(lang).includes('-') ? lang : speechLocaleFor(lang)
  const voice = pickVoice(locale)

  currentToken += 1
  const token = currentToken

  try {
    if (interrupt) window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }

  speaking = true
  let index = 0
  let started = false

  const speakNext = () => {
    // Superseded by a newer speak() call, or cancelled.
    if (token !== currentToken) return

    if (index >= chunks.length) {
      speaking = false
      speechEndedAt = Date.now()
      if (typeof onEnd === 'function') {
        try {
          onEnd()
        } catch {
          /* caller's problem, not ours */
        }
      }
      return
    }

    const utter = new SpeechSynthesisUtterance(chunks[index])
    index += 1

    utter.lang = locale
    if (voice) utter.voice = voice
    utter.rate = Math.max(0.5, Math.min(2, rate))
    utter.pitch = Math.max(0, Math.min(2, pitch))

    utter.onstart = () => {
      if (started || token !== currentToken) return
      started = true
      if (typeof onStart === 'function') {
        try {
          onStart()
        } catch {
          /* ignore */
        }
      }
    }

    utter.onend = () => speakNext()

    // An error must not strand the queue — advance so onEnd still fires.
    utter.onerror = () => speakNext()

    try {
      window.speechSynthesis.speak(utter)
    } catch {
      speakNext()
    }
  }

  speakNext()
  return token
}

/**
 * Stop speech. With no argument, stops unconditionally. With a token, stops
 * only if that token is still the active one — which is what component cleanup
 * should use.
 */
export function stopSpeaking(token) {
  if (!speechSynthesisSupported()) return
  if (token !== undefined && token !== currentToken) return
  currentToken += 1 // invalidate any pending chunk callbacks
  speaking = false
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

/* ================================================================== */
/* Command lexicon                                                     */
/* ================================================================== */

export const COMMAND = {
  YES: 'YES',
  NO: 'NO',
  ONE: 'ONE',
  TWO: 'TWO',
  /*
   * THREE and FOUR exist because 22 of the 54 drill decisions offer three options
   * and the lexicon stopped at two — so a worker answering by voice could not pick
   * the third choice on 40% of the questions, with no indication why. FOUR is
   * carried ahead of the content: nothing offers four options today, and
   * tests/voice.test.mjs fails if a step ever offers more options than there are
   * commands to name them.
   */
  THREE: 'THREE',
  FOUR: 'FOUR',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  EXIT: 'EXIT',
  HELP: 'HELP',
  REPEAT: 'REPEAT',
  STOP: 'STOP',
  NEXT: 'NEXT',
  BACK: 'BACK',
}

/**
 * Accepted phrases per command. Every command lists English, Hindi
 * (Devanagari + romanised), and Santali (Ol Chiki + romanised) where the term
 * is one we can state with confidence.
 *
 * Santali coverage is deliberately partial: only words we are reasonably
 * confident of are listed. A native speaker review is required before
 * deployment — see docs/ARCHITECTURE.md §9.4.
 *
 * This is the authored table. The lexicon actually matched against is
 * COMMAND_PHRASES below, which adds a Devanagari form for every Ol Chiki entry —
 * see the note there for why the Ol Chiki entries alone could never match.
 */
const AUTHORED_PHRASES = {
  [COMMAND.YES]: [
    'yes', 'yeah', 'yep', 'ok', 'okay', 'confirm', 'correct', 'right',
    'हाँ', 'हां', 'ठीक', 'ठीक है', 'सही', 'haan', 'ha', 'theek', 'thik hai', 'sahi',
    'ᱦᱟᱸ', 'han', 'hã',
  ],
  [COMMAND.NO]: [
    'no', 'nope', 'cancel', 'wrong', 'incorrect',
    'नहीं', 'नही', 'गलत', 'nahi', 'nahin', 'galat',
    'ᱵᱟᱝ', 'bang', 'ban', 'baŋ',
  ],
  /*
   * THE NUMERALS ARE THE IMPORTANT ADDITION HERE, and they were missing.
   *
   * Speech engines very often transcribe a spoken number as a digit rather than a
   * word — "one" and "ek" both commonly come back as "1". None of the four digit
   * forms was in this table, so on any engine that does that, the two most-used
   * commands in the app matched nothing.
   *
   * It matters more for Hindi than for English, and that is the reported bug.
   * `editBudget` requires an exact match for anything three characters or shorter,
   * which is correct — one edit on a short word reaches far too many unrelated ones,
   * which is why "bar" must not fire on "car". But the Hindi words for one and two
   * are `ek` and `do`: two characters each, so zero tolerance, on the two commands a
   * worker uses on every single question. Every other command had a longer form to
   * fall back on; these had none. A digit is short too, but a bare "1" token is
   * unambiguous in a way a two-letter word is not, so the exact-match rule costs
   * nothing there.
   *
   * Devanagari and Extended Arabic-Indic digits are included because a Hindi or Urdu
   * recogniser returns numerals in its own script. They survive normaliseTranscript,
   * which strips marks and punctuation but not letters or digits.
   */
  [COMMAND.ONE]: [
    'one', 'first', 'option one', 'number one',
    '1', '१', '۱',
    'एक', 'पहला', 'पहली', 'ek', 'pehla', 'pahla', 'pehli',
    /*
     * What an ENGLISH model actually writes down when a Hindi speaker says "ek".
     * Relevant because the locale chain deliberately ends up on an English model when
     * the device has no Hindi pack, and at that point "ek" is being transcribed by
     * something with no Hindi in it. Three characters each, so they still require an
     * exact match and carry no fuzzy blast radius, and none is a word likely to appear
     * in a drill answer by accident.
     */
    'ake', 'ack', 'eck',
    'ᱢᱤᱫ', 'mit', "mit'",
  ],
  [COMMAND.TWO]: [
    'two', 'second', 'option two', 'number two',
    '2', '२', '۲',
    'दो', 'दूसरा', 'दूसरी', 'do', 'doh', 'dusra', 'doosra', 'dusri',
    // Same reason as ONE: an English model's rendering of Hindi "do".
    'dough', 'doe',
    'ᱵᱟᱨ', 'bar', 'baria',
  ],
  [COMMAND.THREE]: [
    'three', 'third', 'option three', 'number three',
    '3', '३', '۳',
    'तीन', 'तीसरा', 'तीसरी', 'teen', 'tin', 'tisra', 'teesra', 'tisri',
    // Santali 3 is ᱯᱮ (pe). "pe" alone is two characters and would fuzzy-match far
    // too much, so only the fuller romanisations are listed; the Ol Chiki form is
    // exact and safe.
    'ᱯᱮ', 'peya',
  ],
  [COMMAND.FOUR]: [
    'four', 'fourth', 'option four', 'number four',
    '4', '४', '۴',
    'चार', 'चौथा', 'चौथी', 'char', 'chaar', 'chautha', 'chauthi',
    'ᱯᱩᱱ', 'punea',
  ],
  [COMMAND.LEFT]: [
    'left', 'left side', 'go left',
    'बायाँ', 'बाया', 'बाएं', 'बाईं', 'baya', 'bayan', 'baye', 'bayin',
  ],
  [COMMAND.RIGHT]: [
    'right side', 'go right', 'turn right',
    'दायाँ', 'दाया', 'दाएं', 'दाईं', 'daya', 'dayan', 'daye', 'dayin',
  ],
  [COMMAND.EXIT]: [
    'exit', 'door', 'way out', 'escape', 'gate',
    'निकास', 'बाहर', 'दरवाज़ा', 'दरवाजा', 'nikas', 'bahar', 'darwaza',
    'ᱚᱰᱚᱠ', 'odok',
  ],
  [COMMAND.HELP]: [
    'help', 'help me', 'sos', 'emergency', 'rescue',
    'मदद', 'बचाओ', 'सहायता', 'madad', 'bachao', 'sahayata',
    'ᱜᱚᱲᱚ', 'goro', 'gorho',
  ],
  // Note: "what" is deliberately absent. It is the most common English
  // interrogative and would fire REPEAT inside any longer utterance, and it
  // sits one edit away from unrelated words like "hat". The remaining phrases
  // cover the intent without that cost.
  [COMMAND.REPEAT]: [
    'repeat', 'again', 'say again', 'pardon',
    'दोबारा', 'फिर', 'फिर से', 'दोहराओ', 'dobara', 'phir se', 'dohrao',
  ],
  [COMMAND.STOP]: [
    'stop', 'quiet', 'silence', 'pause',
    'रुको', 'बंद', 'चुप', 'ruko', 'band', 'band karo', 'chup',
  ],
  [COMMAND.NEXT]: [
    'next', 'continue', 'go on', 'forward', 'proceed',
    'आगे', 'अगला', 'जारी', 'aage', 'agla', 'jari rakho',
  ],
  [COMMAND.BACK]: [
    'back', 'previous', 'go back', 'return',
    'पीछे', 'वापस', 'पिछला', 'peeche', 'wapas', 'pichla',
  ],
}

/**
 * The lexicon matched against, derived from AUTHORED_PHRASES.
 *
 * WHY THE Ol Chiki ENTRIES NEEDED THIS
 * Santali recognition runs on the Hindi acoustic model, because no engine ships a
 * Santali one. A Hindi recogniser returns Devanagari. It cannot return Ol Chiki —
 * the script is not in its output alphabet. So every Ol Chiki entry in the table
 * above was unreachable: a Santali speaker saying "ᱦᱟᱸ" got a transcript of
 * "हाँ", which was compared against "ᱦᱟᱸ" and missed on every character.
 *
 * Adding the transliteration makes those entries live. It is the same conversion
 * used for speech output, so input and output agree on how a Santali word maps
 * into Devanagari, and nothing has to be authored twice.
 */
export const COMMAND_PHRASES = Object.fromEntries(
  Object.entries(AUTHORED_PHRASES).map(([command, phrases]) => {
    const expanded = [...phrases]
    for (const phrase of phrases) {
      if (!hasOlChiki(phrase)) continue
      const devanagari = olChikiToDevanagari(phrase)
      if (devanagari && !expanded.includes(devanagari)) expanded.push(devanagari)
    }
    return [command, expanded]
  })
)

/* ================================================================== */
/* Matching                                                            */
/* ================================================================== */

/**
 * Normalise a transcript for comparison: lowercase, strip punctuation and
 * diacritics, collapse whitespace. Devanagari and Ol Chiki survive intact
 * because we only strip Unicode marks and punctuation, not letters.
 */
export function normaliseTranscript(text) {
  let s = String(text || '').toLowerCase().trim()
  try {
    // Decompose then drop combining marks, so "ठीक" and "ठिक" converge a little.
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
  } catch {
    /* engine without full Unicode normalisation */
  }
  s = s.replace(/[.,!?;:'"“”‘’()\[\]{}।۔॥]/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

/** Levenshtein distance, iterative with a rolling row. */
export function levenshtein(a, b) {
  const s = String(a || '')
  const t = String(b || '')
  if (s === t) return 0
  if (!s.length) return t.length
  if (!t.length) return s.length

  let prev = new Array(t.length + 1)
  let curr = new Array(t.length + 1)
  for (let j = 0; j <= t.length; j += 1) prev[j] = j

  for (let i = 1; i <= s.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = curr
    curr = swap
  }
  return prev[t.length]
}

/** 0..1 similarity, 1 being identical. */
export function similarity(a, b) {
  const maxLen = Math.max(String(a || '').length, String(b || '').length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * How many edits we tolerate, by phrase length.
 *
 * A fixed similarity ratio is the wrong rule for a lexicon like this: one edit
 * in a 4-letter word ("haa" for "haan") scores 0.75 and would be rejected by
 * any threshold loose enough to be useful, while one edit in a 2-letter word
 * ("no" -> "so") scores 0.5 and must be rejected. Budgeting edits by length
 * handles both correctly.
 *
 * Words of 3 characters or fewer require an exact match, because at that length
 * a single edit reaches too many unrelated words — "bar" (Santali for two)
 * would otherwise fire on "car".
 */
function editBudget(length) {
  if (length <= 3) return 0
  if (length <= 6) return 1
  return 2
}

function withinEditBudget(candidate, phrase) {
  const budget = editBudget(phrase.length)
  if (budget === 0) return candidate === phrase
  // Length alone can rule it out before doing the work.
  if (Math.abs(candidate.length - phrase.length) > budget) return false
  return levenshtein(candidate, phrase) <= budget
}

/**
 * Match a transcript against the command lexicon.
 *
 * Strategy, in order: whole-transcript exact, token exact, multi-word substring,
 * then fuzzy on both. `allowed` restricts which commands are live for the
 * current screen, so "left" can't fire on a screen with no left option.
 *
 * @returns { command, phrase, confidence, exact } or null
 */
export function matchCommand(transcript, { allowed = null } = {}) {
  const norm = normaliseTranscript(transcript)
  if (!norm) return null

  const commands = Object.keys(COMMAND_PHRASES).filter((c) => !allowed || allowed.includes(c))
  if (!commands.length) return null

  const tokens = norm.split(' ').filter(Boolean)

  // Pass 1 — exact match on the whole transcript or any token.
  for (const command of commands) {
    for (const phrase of COMMAND_PHRASES[command]) {
      const p = normaliseTranscript(phrase)
      if (!p) continue
      if (norm === p) return { command, phrase, confidence: 1, exact: true }
    }
  }
  for (const command of commands) {
    for (const phrase of COMMAND_PHRASES[command]) {
      const p = normaliseTranscript(phrase)
      if (!p || p.includes(' ')) continue
      if (tokens.includes(p)) return { command, phrase, confidence: 0.95, exact: true }
    }
  }
  // Multi-word phrases as substrings ("option one" inside a longer utterance).
  for (const command of commands) {
    for (const phrase of COMMAND_PHRASES[command]) {
      const p = normaliseTranscript(phrase)
      if (!p || !p.includes(' ')) continue
      if (norm.includes(p)) return { command, phrase, confidence: 0.92, exact: true }
    }
  }

  // Pass 2 — fuzzy, to absorb ASR slips like "haa" for "haan".
  let best = null
  const consider = (command, phrase, candidate, p) => {
    if (!withinEditBudget(candidate, p)) return
    const confidence = similarity(candidate, p)
    if (!best || confidence > best.confidence) best = { command, phrase, confidence, exact: false }
  }

  for (const command of commands) {
    for (const phrase of COMMAND_PHRASES[command]) {
      const p = normaliseTranscript(phrase)
      if (!p) continue

      consider(command, phrase, norm, p)
      for (const token of tokens) consider(command, phrase, token, p)
    }
  }

  return best
}

/* ================================================================== */
/* Recognition                                                         */
/* ================================================================== */

export const ASR_ERROR = {
  UNSUPPORTED: 'UNSUPPORTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NO_SPEECH: 'NO_SPEECH',
  NO_MATCH: 'NO_MATCH',
  NETWORK: 'NETWORK',
  /*
   * The engine can hear, but not in the language it was asked for.
   *
   * This is the code Chrome actually fires when a locale has no model available —
   * offline with no downloaded voice pack being the case that matters here — and it
   * was not mapped at all. It fell through to UNKNOWN, whose retry policy gives up
   * for good after five attempts, so offline Hindi answers died with "Voice input had
   * a problem" and the locale fallback added for this exact situation never ran,
   * because that only triggered on NETWORK.
   *
   * `language-not-supported` is in the SpeechRecognitionErrorCode enum alongside
   * no-speech, audio-capture, not-allowed, network, aborted and service-not-allowed.
   * Unlike a network error it is a definitive statement about this locale, so it does
   * not need a second opinion before switching.
   */
  LANGUAGE_UNAVAILABLE: 'LANGUAGE_UNAVAILABLE',
  ABORTED: 'ABORTED',
  AUDIO: 'AUDIO',
  UNKNOWN: 'UNKNOWN',
}

/**
 * Should hands-free listening restart after this failure, and how soon?
 *
 * Hands-free changes what counts as an error. Under push-to-talk, "no speech
 * detected" meant the worker pressed the button and said nothing — worth reporting.
 * With the mic simply live, silence is the NORMAL state and the engine reports it
 * every few seconds; treating that as a failure would fill the screen with warnings
 * about nothing and stop the loop the moment the worker paused to think.
 *
 * The distinction that actually matters is transient versus fatal. Restarting after a
 * denied permission would prompt in a loop; restarting after a missing microphone
 * would spin forever. Those stop for good and say so once.
 *
 * @returns { retry, delayMs, fatal }
 */
export function asrRetryPolicy(code, consecutiveFailures = 0) {
  const n = Math.max(0, Math.min(6, Number(consecutiveFailures) || 0))

  switch (code) {
    /*
     * Nothing was wrong. The engine closed the utterance because the worker was
     * quiet, or heard something outside the lexicon. Restart promptly and silently —
     * the worker should never learn that thinking for four seconds is an error.
     */
    case ASR_ERROR.NO_SPEECH:
    case ASR_ERROR.NO_MATCH:
    case ASR_ERROR.ABORTED:
      return { retry: true, delayMs: 250, fatal: false }

    /*
     * Chrome's recogniser is network-backed on many builds, so this fires whenever
     * the site link drops — constantly, underground. Backed off so a dead connection
     * does not become a request loop, but never given up on, because the link coming
     * back should restore voice input without the worker noticing it went.
     */
    case ASR_ERROR.NETWORK:
      return { retry: true, delayMs: Math.min(8000, 1000 * 2 ** n), fatal: false }

    /*
     * This locale has no model. Retrying it changes nothing, so the value of a retry
     * here is entirely that the listener switches locale first — hence a short delay
     * and not fatal. The listener decides it IS fatal once the chain is exhausted,
     * because at that point no locale on the device can serve this request.
     */
    case ASR_ERROR.LANGUAGE_UNAVAILABLE:
      return { retry: true, delayMs: 200, fatal: false }

    /* No permission and no microphone are both permanent within this page. */
    case ASR_ERROR.PERMISSION_DENIED:
    case ASR_ERROR.AUDIO:
    case ASR_ERROR.UNSUPPORTED:
      return { retry: false, delayMs: 0, fatal: true }

    /*
     * Unknown faults are retried, but bounded. An unrecognised error repeating
     * without limit is how a background loop quietly eats a battery.
     */
    default:
      return n >= 5
        ? { retry: false, delayMs: 0, fatal: true }
        : { retry: true, delayMs: Math.min(4000, 500 * 2 ** n), fatal: false }
  }
}

export function mapAsrError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return ASR_ERROR.PERMISSION_DENIED
    case 'no-speech':
      return ASR_ERROR.NO_SPEECH
    case 'aborted':
      return ASR_ERROR.ABORTED
    case 'network':
      return ASR_ERROR.NETWORK
    /*
     * The two codes that were missing. `language-not-supported` is the whole reason
     * offline Hindi stayed broken after the locale fallback landed: unmapped, it read
     * as UNKNOWN, and UNKNOWN gives up permanently after five tries without ever
     * trying another locale. `bad-grammar` is mapped explicitly rather than left to
     * the default so that the default means "we have genuinely not seen this before".
     */
    case 'language-not-supported':
      return ASR_ERROR.LANGUAGE_UNAVAILABLE
    case 'bad-grammar':
      return ASR_ERROR.UNKNOWN
    case 'audio-capture':
      return ASR_ERROR.AUDIO
    default:
      return ASR_ERROR.UNKNOWN
  }
}

export function createRecognizer(lang = 'en', { continuous = false } = {}) {
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
  if (!SR) return null
  const rec = new SR()
  /*
   * The device-default rung leaves `lang` alone deliberately. Assigning '' here would
   * fall through speechLocaleFor to 'en-IN', which is the locale we are trying to get
   * past — so the last resort would silently retry the previous rung forever.
   */
  if (lang !== ASR_DEVICE_DEFAULT) {
    rec.lang = String(lang).includes('-') ? lang : speechLocaleFor(lang)
  }
  rec.interimResults = false
  rec.maxAlternatives = 3
  /*
   * `continuous` keeps the session open across pauses instead of closing after one
   * utterance. It is not sufficient on its own — engines still end the session on
   * silence or a network blip — so the listener restarts as well. Both are needed.
   */
  rec.continuous = !!continuous
  return rec
}

/**
 * Push-to-talk command listener.
 *
 * Handles every failure mode the Web Speech API can produce: unsupported
 * engine, denied mic permission, silence, unrecognised audio, network-backed
 * recognisers going offline, and the engine ending the session on its own.
 *
 * @returns { start, stop, supported, destroy }
 */
export function createCommandListener({
  lang = 'en',
  allowed = null,
  onCommand,
  onTranscript,
  onError,
  onStateChange,
  /*
   * Hands-free. The microphone stays live and the loop restarts itself, so the worker
   * can speak whenever they like — or ignore voice entirely and tap, which keeps
   * working throughout. Off by default so existing push-to-talk callers are unchanged.
   */
  handsFree = false,
  /*
   * Consulted before a recognised command is delivered. The drill uses it to refuse
   * answers until the question has finished being read out; without it the narration
   * counts as a valid answer to itself.
   *
   * A function rather than a boolean because the listener outlives any single render,
   * so a captured value would be stale by the time it mattered.
   */
  shouldAccept = null,
  /*
   * Called when recognition switches locale because the requested one could not run
   * here — offline with no language pack being the case that matters. The drill uses
   * it to tell the worker which language the microphone is now listening in, since
   * that changes what they should say.
   */
  onLocaleChange = null,
} = {}) {
  if (!speechRecognitionSupported()) {
    onError?.(ASR_ERROR.UNSUPPORTED)
    return {
      supported: false,
      start: () => {},
      stop: () => {},
      destroy: () => {},
    }
  }

  let rec = null
  let listening = false
  let destroyed = false
  /*
   * Which locale the engine is actually running. Separate from `lang`, because the
   * requested language may have no model on this device and the whole point is to
   * keep listening in something that does rather than retrying nothing forever.
   */
  const localeChain = asrLocaleChain(lang)
  let localeIndex = 0
  let networkFailures = 0
  /*
   * `wanted` is the caller's intent; `listening` is the engine's actual state. They
   * are separate because the engine stops constantly on its own in hands-free mode and
   * must be restarted, whereas an explicit stop() must NOT be undone by that restart.
   * Collapsing the two would make the mute button unable to mute.
   */
  let wanted = false
  let failures = 0
  let restartTimer = null

  const setState = (state) => {
    if (!destroyed) onStateChange?.(state)
  }

  const clearRestart = () => {
    if (restartTimer !== null) {
      clearTimeout(restartTimer)
      restartTimer = null
    }
  }

  const build = () => {
    // The resolved locale, not the app language: after an escalation these differ.
    const r = createRecognizer(localeChain[localeIndex], { continuous: handsFree })
    if (!r) return null

    r.onresult = (event) => {
      // Check every alternative — the top pick is often worse for Hindi.
      const alternatives = []
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        for (let j = 0; j < result.length; j += 1) alternatives.push(result[j].transcript)
      }
      if (alternatives.length) {
        onTranscript?.(alternatives[0], alternatives)
        /*
         * Any transcript at all proves this locale has a working model, so the
         * network tally resets here rather than on a successful match. A phrase the
         * lexicon does not know is still evidence the engine can hear — counting it
         * towards a locale downgrade would eventually move a working recogniser off
         * the worker's own language because they said something unexpected.
         */
        networkFailures = 0
      }

      let match = null
      for (const alt of alternatives) {
        match = matchCommand(alt, { allowed })
        if (match) break
      }

      if (!match) {
        onError?.(ASR_ERROR.NO_MATCH, alternatives[0] || '')
        return
      }

      /*
       * Two gates before a match becomes an answer, both about the same hazard: the
       * microphone can hear the phone.
       *
       * The drill reads every option aloud, numbered, so a live mic hears "one, two,
       * three" and would submit whichever it heard last. The trailing window covers
       * recognition results that arrive just after narration stops, transcribed from
       * audio captured while it was still talking.
       */
      if (handsFree && msSinceSpeech() < SELF_HEARING_GUARD_MS) return

      // The caller's own readiness gate — for the drill, "the question has finished".
      if (typeof shouldAccept === 'function') {
        let ok = false
        try {
          ok = !!shouldAccept()
        } catch {
          // A throwing gate must not be read as permission.
          ok = false
        }
        if (!ok) return
      }

      failures = 0
      onCommand?.(match)
    }

    r.onerror = (event) => {
      const mapped = mapAsrError(event?.error)
      const policy = asrRetryPolicy(mapped, failures)

      if (policy.fatal) {
        // Permanent for this page: stop wanting the microphone so onend does not
        // restart into the same wall, and report it once.
        wanted = false
        onError?.(mapped)
        return
      }

      /*
       * Move down the locale chain rather than retrying a locale that cannot work.
       *
       * Two codes lead here and they need different thresholds.
       *
       * LANGUAGE_UNAVAILABLE is the engine stating that this locale has no model. It
       * is definitive, so it switches on the first occurrence — and it is the code
       * that actually fires offline with no voice pack, which is why the earlier
       * network-only version of this escalation never ran.
       *
       * NETWORK is ambiguous: offline it is permanent, but online it is also what a
       * momentary drop looks like on a network-backed recogniser. Switching on the
       * first one would quietly downgrade the model for someone who is simply on a bad
       * link, so it takes two in a row with no transcript in between.
       */
      const definitive = mapped === ASR_ERROR.LANGUAGE_UNAVAILABLE
      if (definitive || mapped === ASR_ERROR.NETWORK) {
        networkFailures += 1
        const threshold = definitive ? 1 : ASR_LOCALE_ESCALATE_AFTER
        const hasNext = localeIndex < localeChain.length - 1

        if (networkFailures >= threshold && hasNext) {
          localeIndex += 1
          networkFailures = 0
          failures = 0
          onLocaleChange?.(localeChain[localeIndex], {
            fallback: localeIndex > 0,
            requested: localeChain[0],
            reason: mapped,
          })
          // Not also reported as an error: the situation is being handled, and a
          // warning beside a working microphone is just noise.
          return
        }

        /*
         * Chain exhausted and the engine still says it cannot serve the language. No
         * further retry can change that, so stop wanting the microphone instead of
         * looping — the drill's tap buttons were never affected and are the answer.
         */
        if (definitive && !hasNext) {
          wanted = false
          onError?.(mapped)
          return
        }
      } else {
        networkFailures = 0
      }

      /*
       * In hands-free mode silence and unmatched audio are the normal condition, not
       * faults. Reporting them would put a warning on screen every few seconds while
       * the worker was simply reading the question.
       */
      const routine = mapped === ASR_ERROR.NO_SPEECH || mapped === ASR_ERROR.ABORTED
      if (!(handsFree && routine) && mapped !== ASR_ERROR.ABORTED) onError?.(mapped)

      failures += 1
    }

    r.onend = () => {
      listening = false

      /*
       * The engine ends the session on its own after silence, after each utterance
       * without `continuous`, and whenever the network recogniser hiccups. Hands-free
       * therefore has to restart, or the microphone goes quiet after the first pause
       * and the worker is left speaking to nothing with no indication why.
       */
      if (handsFree && wanted && !destroyed) {
        const policy = asrRetryPolicy(ASR_ERROR.NO_SPEECH, failures)
        setState('restarting')
        clearRestart()
        restartTimer = setTimeout(() => {
          restartTimer = null
          if (!destroyed && wanted && !listening) begin()
        }, policy.delayMs)
        return
      }

      setState('idle')
    }

    r.onstart = () => {
      listening = true
      setState('listening')
    }

    return r
  }

  /**
   * Open a recognition session. Shared by start() and the restart loop.
   *
   * The one behavioural fork between the two modes lives here. Push-to-talk cancels
   * narration first, because the worker deliberately pressed a button and wants to be
   * heard now. Hands-free must NOT: the mic is live for the whole step, and cutting
   * the question off every time the loop restarts would mean the worker never hears
   * the options at all. Self-hearing is handled at dispatch instead, where it can be
   * distinguished from a real answer.
   */
  function begin() {
    if (destroyed || listening) return

    if (!handsFree) stopSpeaking()

    rec = build()
    if (!rec) {
      onError?.(ASR_ERROR.UNSUPPORTED)
      return
    }
    try {
      rec.start()
      setState('starting')
    } catch {
      /*
       * start() throws if a previous session is still closing. Not a failure in
       * hands-free mode — onend is about to fire and the loop will pick it up — so it
       * is only reported when a person is waiting on it.
       */
      listening = false
      if (handsFree && wanted) {
        setState('restarting')
        clearRestart()
        restartTimer = setTimeout(() => {
          restartTimer = null
          if (!destroyed && wanted && !listening) begin()
        }, 400)
        return
      }
      setState('idle')
      onError?.(ASR_ERROR.UNKNOWN)
    }
  }

  return {
    supported: true,
    get listening() {
      return listening
    },
    /** The locale actually in use, which is not always the one requested. */
    get locale() {
      return localeChain[localeIndex]
    },
    start() {
      if (destroyed) return
      wanted = true
      begin()
    },
    stop() {
      // Clears intent first, so the restart loop does not immediately undo this.
      wanted = false
      clearRestart()
      if (!rec) {
        setState('idle')
        return
      }
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
      listening = false
      setState('idle')
    },
    destroy() {
      destroyed = true
      wanted = false
      clearRestart()
      if (!rec) return
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      rec.onstart = null
      rec = null
    },
  }
}

/** Probe mic permission without starting recognition. */
export async function micPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state
  } catch {
    return 'unknown'
  }
}
