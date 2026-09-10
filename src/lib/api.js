// Central AI helper. Supports Google Gemini (best free tier) or OpenAI.
// The API key is entered by the user in Settings and stored in localStorage only
// (never sent anywhere except directly to the provider's API from the browser).

import { LS, lsGet, lsSet } from './local.js'

export function getApiKey() {
  return lsGet(LS.API_KEY, '') || ''
}
export function setApiKey(key) {
  lsSet(LS.API_KEY, String(key || '').trim())
}
export function getProvider() {
  const stored = lsGet(LS.PROVIDER, 'gemini')
  return stored === 'openai' ? 'openai' : 'gemini'
}
export function setProvider(p) {
  lsSet(LS.PROVIDER, p === 'openai' ? 'openai' : 'gemini')
}

/**
 * Analyze a photo for industrial safety hazards.
 * imageBase64: raw base64 string (no data: prefix)
 * Returns: { hazards: [{label, severity, description, bbox:[x,y,w,h] (0-1 normalized)}], summary }
 */
export async function analyzeHazardImage(imageBase64, mimeType = 'image/jpeg') {
  const provider = getProvider()
  const key = getApiKey()
  if (!key) throw new Error('NO_API_KEY')

  const prompt = `You are an industrial safety inspector AI trained on mining and manufacturing safety standards (DGMS, OSHA-equivalent Indian norms).
Look at this workplace photo and identify visible safety hazards or violations (e.g. missing PPE like helmet/gloves/goggles, exposed wiring, unguarded machinery, poor housekeeping, blocked exits, improper lifting posture, missing signage).

Respond ONLY with valid JSON, no markdown, no backticks, in this exact shape:
{
  "hazards": [
    {
      "label": "short hazard name",
      "severity": "low" | "medium" | "high",
      "description": "one sentence explaining the risk",
      "bbox": [x, y, w, h],
      "ppe": true if this hazard is a missing or misused item of personal protective equipment, otherwise false
    }
  ],
  "summary": "one or two sentence overall safety assessment",
  "riskScore": 0-100
}
bbox values are normalized 0 to 1 (fraction of image width/height) for where the hazard appears. If you cannot localize precisely, make a reasonable estimate. If no hazards are visible, return an empty hazards array and a low riskScore.

Severity guidance, so the scores mean the same thing across photos:
- high: could cause death or permanent injury on this shift (no fall protection at height, unguarded in-running nip, live exposed conductor, blocked or locked escape route)
- medium: likely to cause a reportable injury, or a control that has been defeated (missing helmet or eye protection in an active area, a wedged fire door, damaged access equipment still in use)
- low: a housekeeping or signage problem that raises risk without being immediately dangerous

Set "ppe" true only for protective equipment worn by a person — helmet, eye protection, gloves, respirator, hearing protection, harness, footwear. A missing machine guard is not PPE.`

  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          // responseMimeType makes the model emit JSON instead of being asked to.
          // Most parse failures were markdown fences or a sentence of preamble,
          // and this removes that class of failure at the source rather than
          // recovering from it afterwards.
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'Gemini API error')
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return normaliseScanResult(parseScanJson(text))
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        // Same reasoning as Gemini's responseMimeType above.
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'OpenAI API error')
    const text = data.choices?.[0]?.message?.content || ''
    return normaliseScanResult(parseScanJson(text))
  }

  throw new Error('Unknown provider')
}

/**
 * Conversational AI trainer — given scenario context + user's message/choice history,
 * returns the next coaching line and feedback.
 */
export async function askTrainer(systemContext, messages) {
  const provider = getProvider()
  const key = getApiKey()
  if (!key) throw new Error('NO_API_KEY')

  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemContext }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { temperature: 0.6 },
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'Gemini API error')
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        messages: [{ role: 'system', content: systemContext }, ...messages],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'OpenAI API error')
    return data.choices?.[0]?.message?.content || ''
  }

  throw new Error('Unknown provider')
}

/* ================================================================== */
/* Scan result validation                                              */
/* ================================================================== */

export const SCAN_SEVERITY = ['low', 'medium', 'high']

/**
 * Parse the model's reply, or throw.
 *
 * THE BUG THIS REPLACES
 * The previous version swallowed a parse failure and returned
 * `{ hazards: [], summary: 'Could not parse AI response.' }`. HazardScan renders an
 * empty hazards array as "No hazards detected." in safe green — so a scan that
 * FAILED was displayed as a clean bill of health on a safety inspection. The
 * summary line said otherwise, but the green heading is what a worker reads.
 *
 * A failed inspection must never look like a passed one, so this throws and lets
 * the caller's existing error path show it as an error.
 */
function parseScanJson(text) {
  const cleaned = String(text || '')
    .replace(/```json|```/g, '')
    .trim()
  if (!cleaned) throw new Error('SCAN_EMPTY_RESPONSE')
  try {
    return JSON.parse(cleaned)
  } catch {
    // A model that wrapped the JSON in prose is recoverable: take the outermost
    // braces and retry once before giving up.
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1))
      } catch {
        /* fall through */
      }
    }
    throw new Error('SCAN_UNREADABLE_RESPONSE')
  }
}

const clamp01 = (n) => Math.max(0, Math.min(1, n))

/**
 * Coerce one hazard into something the UI can render, or return null to drop it.
 *
 * HazardScan destructures `bbox` positionally and feeds the values straight into
 * CSS percentages, so a bbox of the wrong length yields `undefined%` and a box
 * outside 0..1 draws outside the photo. Boxes are clamped into frame here rather
 * than trusted, and a hazard with no usable label is dropped — an unlabelled
 * marker on a photo tells a worker nothing.
 */
function normaliseHazard(raw) {
  if (!raw || typeof raw !== 'object') return null

  const label = String(raw.label ?? '').trim()
  if (!label) return null

  const severity = SCAN_SEVERITY.includes(raw.severity) ? raw.severity : 'medium'

  // Unrecognised severity defaults to medium, never to low: guessing downwards on
  // a hazard the model described but mislabelled is the wrong direction to err.
  const box = Array.isArray(raw.bbox) ? raw.bbox.map(Number) : []
  let bbox
  if (box.length === 4 && box.every(Number.isFinite)) {
    const x = clamp01(box[0])
    const y = clamp01(box[1])
    // Width and height are trimmed so the box cannot extend past the edge.
    bbox = [x, y, clamp01(Math.min(box[2], 1 - x)), clamp01(Math.min(box[3], 1 - y))]
  } else {
    // No usable geometry. Still worth listing, so it gets a centred default and
    // is flagged as unlocalised rather than silently drawn somewhere arbitrary.
    bbox = [0.35, 0.35, 0.3, 0.3]
  }

  return {
    label: label.slice(0, 80),
    severity,
    description: String(raw.description ?? '').trim().slice(0, 300),
    bbox,
    localised: box.length === 4 && box.every(Number.isFinite),
    ppe: raw.ppe === true,
  }
}

/**
 * Validate and clamp a scan result so the UI cannot be handed a shape it will
 * render incorrectly. Exported for tests.
 */
export function normaliseScanResult(raw) {
  const hazards = (Array.isArray(raw?.hazards) ? raw.hazards : []).map(normaliseHazard).filter(Boolean)

  // A model that returns hazards but forgets the score would otherwise show a
  // reassuring zero on the gauge, so derive one from the worst severity present.
  const derived = hazards.length
    ? Math.max(...hazards.map((h) => ({ low: 30, medium: 60, high: 90 })[h.severity]))
    : 0

  /* `Number(null)` and `Number('')` are both 0, and 0 is finite — so testing
     Number.isFinite alone accepted a MISSING score as a genuine zero and put a
     reassuring empty gauge next to a list of things that are wrong. Absence has to
     be checked before coercion, not after. */
  const rawScore = raw?.riskScore
  const scoreProvided =
    rawScore !== null && rawScore !== undefined && rawScore !== '' && Number.isFinite(Number(rawScore))
  const riskScore = scoreProvided ? Math.max(0, Math.min(100, Math.round(Number(rawScore)))) : derived

  return {
    hazards,
    summary: String(raw?.summary ?? '').trim(),
    riskScore,
    // Counted separately so the UI can say "3 hazards, 2 of them PPE" without a
    // second model call or a separate screen that fails offline.
    ppeCount: hazards.filter((h) => h.ppe).length,
    highCount: hazards.filter((h) => h.severity === 'high').length,
  }
}

/**
 * Full-site knowledge base for the Jaagruk assistant chatbot, so it can answer
 * "how does this app work" style questions accurately for any page/feature.
 */
export const SITE_KNOWLEDGE = `You are the in-app assistant for Jaagruk, a phone-only industrial safety training and certification platform for mining, steel and mica workers in Jharkhand, India. Built for Smart India Hackathon problem statement 26041 (Government of Jharkhand, Department of Higher & Technical Education).

WHAT MAKES JAAGRUK DIFFERENT — the four layers:

LAYER 1, TRAINING:
- Site-Scan AR (/site): a supervisor walks a real corridor or shaft once and marks where the exits, extinguishers, gas zones and lockout panels actually are. Each marker stores the compass bearing and elevation of that sighting. Workers then see hazards overlaid in the correct real-world direction in that same space, so "the exit is left past the second pillar" is learned in the actual corridor. The scan exports as a small JSON file so one supervisor's walkthrough seeds every worker's phone.
- AR drills (/train/:id): live rear-camera view with markers anchored to real bearings, plus a smoke/low-visibility effect for fire and dust modules. Any device without a usable compass falls back to a hand-built 3D scene that teaches the same decisions.
- Picture mode: every prompt and answer can render as ISO 7010 safety pictograms with spoken narration instead of text, for workers with limited formal schooling. Answers carry a large 1/2 number badge that ties together tapping, speaking and pointing.
- Voice answers: say "one" or "two" (or "ek"/"do", or the Santali equivalents) instead of tapping — usable with gloves and dusty hands.
- Hand tracking: optional touchless control via the front camera. Point to aim, pinch or hold still to select.

LAYER 2, ASSESSMENT:
- Every decision is TIMED against a calibrated per-step baseline. This is the core differentiator: a worker who picks the right answer but takes three times too long is flagged as "hesitated" rather than passed. Real evacuation failures are usually freezing, not ignorance.
- readiness = 70% accuracy + 30% reaction speed. Speed only counts on decisions that were correct, so being fast and wrong earns nothing.
- Buddy drill (/buddy): a genuine TWO-PHONE exercise. The phones pair by scanning each other's QR codes and connect directly over WebRTC with no server and no internet. The drill scores coordination — did you check on each other at the required intervals, how many seconds did it take you to notice your buddy collapse, and did you resist going in after them unprotected. That last decision is what turns one casualty into two. There is also a same-device two-tab practice mode, clearly labelled as practice.

LAYER 3, CERTIFICATION:
- Certificates are entries in a tamper-evident HASH-CHAINED LEDGER. Each record embeds the previous record's hash and is signed with a device key (Ed25519 where available, ECDSA P-256 otherwise). Any edit or insertion breaks the linkage and is detectable offline.
- Call it a hash-chain, NOT a blockchain. There is no consensus, no mining, no distributed ledger. Being precise about this matters.
- The QR code carries the ENTIRE signed record, so a DGMS inspector can verify a certificate with no network and no copy of the ledger. Verification reports four separate signals: is the record intact and correctly signed, is the signing device known to this phone, is the record present in this phone's ledger, and does it link correctly into that chain.
- Records gossip phone-to-phone over the same WebRTC channel when a site has no connectivity, and flush to a central endpoint whenever any device sees the internet.

LAYER 4, INTELLIGENCE:
- Spaced refreshers (/refresher): review intervals of 2, 7, 21 and 60 days. Readiness DECAYS with time since the last pass — full value for 7 days, then declining to a 55% floor at 90 days. Certification is gated on decayed readiness, so a certificate reflects current competence rather than a historical date stamp. This directly targets the problem statement's figure of under-20% retention after one week.
- Near-miss hazard reporting (/report): any worker can photograph a hazard, add a spoken note, and tag it to a site zone by compass bearing (GPS does not work underground). One photo and a tap. Reports queue locally and sync on their own.
- Compliance dashboard (/admin): site and worker compliance with live decayed readiness, a HESITATION-RISK LIST naming workers who passed on paper but reacted slowly, a hazard triage board with bearing clusters, a ledger integrity panel, a QR verification tool, and CSV export formatted for Mines Act 1952 and Factories Act 1948 record-keeping.

OTHER PAGES:
- HOME (/): overview and the two main entry points.
- SIGN IN (/start): icon-and-voice onboarding. Language is chosen from native-script buttons that speak themselves when tapped. Identity is a name plus a 4-6 digit PIN verified locally with PBKDF2, because a worker 300 m underground has no signal for an OTP. Training works without an account; only a certificate needs a named worker record.
- HAZARD SCAN (/scan): photograph a work area and an AI vision model marks hazards on the image with severity and a plain-language explanation. This is the only feature that requires internet and an API key.
- SIMULATOR (/train): six modules covering the five certification domains — Fire & Explosion Response, Gas Leak & Confined Space Protocol, Machinery Safety & Lockout-Tagout, Electrical Hazard Response, Dust & Respiratory Hazard Protection — plus a bonus Manual Handling & Site Housekeeping module that does not count toward certification.
- DASHBOARD (/dashboard): the worker's own readiness, retention decay per domain, and activity history.
- SETTINGS (/settings): accessibility modes, language, AI provider and key, storage status, optional central upload URL, and a device erase.

LANGUAGES: English, Hindi, Santali (Ol Chiki script), Bengali, Odia, Urdu. Hindi and Santali are the two the problem statement names explicitly. Coverage is MEASURED at runtime, not claimed — Settings shows the real percentage per language, and a banner appears when a language falls below 92%. Santali UI coverage is partial and its translations are explicitly unverified by a native speaker; that is stated in the app rather than hidden.

BE HONEST ABOUT THESE LIMITATIONS if asked:
- No depth sensing or SLAM. Markers are anchored to compass bearing and elevation, not a 3D mesh, so they hold their direction as the worker turns but do not occlude behind real geometry or survive walking to the far end of a building. ARCore Depth plus Cloud Anchors is the native upgrade path.
- Steel structures and mine shafts distort magnetic heading. The app detects missing or relative-only heading and offers manual re-centring, but this is a sensor limitation software cannot fully remove.
- No production-quality Santali speech recognition exists. Santali text and spoken output are real; Santali voice INPUT matches a fixed command lexicon against a Hindi acoustic model.
- PIN login and the supervisor PIN on /admin are device-local, not real authorization. Production needs server-issued credentials with role-based access.
- Private keys are non-extractable Web Crypto handles in IndexedDB, not hardware-backed. Clearing browser storage destroys the device key, which is why records gossip to a second device.
- The web platform cannot wake a closed page on a schedule, so refresher reminders appear when the app is opened. Native AlarmManager is the upgrade.
- The buddy drill needs both phones on one LAN or hotspot. Android's Nearby Connections can bring up its own radio transport; a browser cannot.
- There is no DGMS server in this submission. The client sync half is complete and the shipped path is a signed export bundle.
- Reaction-time baselines are reasoned defaults, not yet validated against a measured worker cohort.

TECHNICAL FACTS:
- React 18 + Vite + Tailwind CSS, packaged as an Android APK via Capacitor (minSdk 29 = Android 10+), and installable as a PWA.
- No backend. AI calls go directly from the browser to Google Gemini or OpenAI using the user's own key, stored only in that browser's local storage.
- IndexedDB holds the ledger, attempts, hazard reports, site scans and the sync queue. Everything is local-first; sync is eventual and idempotent because records are content-addressed.
- Training, assessment, certification and verification all work fully offline. Only the AI hazard scan and AI coaching need connectivity.

HOW TO ANSWER:
- Be concise, warm and practical, like a helpful in-app guide.
- For "how do I..." questions give step-by-step direction using the real page and button names above.
- If asked about accident statistics or anything you do not actually know, say so rather than inventing a number.
- If asked something outside this app's scope, redirect gently to what you can help with.
- Reply in the same language the user asks in, or in the app's currently selected language if told which one.`

/**
 * General-purpose assistant chat, aware of the whole site. Reuses the same
 * provider/key infra as askTrainer but with a dedicated system prompt.
 */
export async function askSiteAssistant(messages, languageName) {
  const systemContext = SITE_KNOWLEDGE + (languageName ? `\n\nRespond in ${languageName}.` : '')
  return askTrainer(systemContext, messages)
}
