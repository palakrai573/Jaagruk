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
/* Capability checks                                                   */
/* ================================================================== */

export function speechSynthesisSupported() {
  try {
    return typeof window !== 'undefined' && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined'
  } catch {
    return false
  }
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

  const chunks = chunkText(text)
  if (!chunks.length) return 0

  const { rate = 0.95, pitch = 1, onEnd, onStart, interrupt = true } = opts

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
 */
export const COMMAND_PHRASES = {
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
  [COMMAND.ONE]: [
    'one', 'first', 'option one', 'number one',
    'एक', 'पहला', 'ek', 'pehla', 'pahla',
    'ᱢᱤᱫ', 'mit', "mit'",
  ],
  [COMMAND.TWO]: [
    'two', 'second', 'option two', 'number two',
    'दो', 'दूसरा', 'do', 'dusra', 'doosra',
    'ᱵᱟᱨ', 'bar', 'baria',
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
  ABORTED: 'ABORTED',
  AUDIO: 'AUDIO',
  UNKNOWN: 'UNKNOWN',
}

function mapAsrError(code) {
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
    case 'audio-capture':
      return ASR_ERROR.AUDIO
    default:
      return ASR_ERROR.UNKNOWN
  }
}

export function createRecognizer(lang = 'en') {
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
  if (!SR) return null
  const rec = new SR()
  rec.lang = String(lang).includes('-') ? lang : speechLocaleFor(lang)
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.continuous = false
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

  const setState = (state) => {
    if (!destroyed) onStateChange?.(state)
  }

  const build = () => {
    const r = createRecognizer(lang)
    if (!r) return null

    r.onresult = (event) => {
      // Check every alternative — the top pick is often worse for Hindi.
      const alternatives = []
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        for (let j = 0; j < result.length; j += 1) alternatives.push(result[j].transcript)
      }
      if (alternatives.length) onTranscript?.(alternatives[0], alternatives)

      let match = null
      for (const alt of alternatives) {
        match = matchCommand(alt, { allowed })
        if (match) break
      }

      if (match) onCommand?.(match)
      else onError?.(ASR_ERROR.NO_MATCH, alternatives[0] || '')
    }

    r.onerror = (event) => {
      const mapped = mapAsrError(event?.error)
      // Silence is not a failure worth shouting about.
      if (mapped !== ASR_ERROR.ABORTED) onError?.(mapped)
    }

    r.onend = () => {
      listening = false
      setState('idle')
    }

    r.onstart = () => {
      listening = true
      setState('listening')
    }

    return r
  }

  return {
    supported: true,
    get listening() {
      return listening
    },
    start() {
      if (destroyed || listening) return
      // Speaking and listening at once makes the mic hear the app.
      stopSpeaking()
      rec = build()
      if (!rec) {
        onError?.(ASR_ERROR.UNSUPPORTED)
        return
      }
      try {
        rec.start()
        setState('starting')
      } catch {
        // start() throws if called while an earlier session is still closing.
        listening = false
        setState('idle')
        onError?.(ASR_ERROR.UNKNOWN)
      }
    },
    stop() {
      if (!rec) return
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
