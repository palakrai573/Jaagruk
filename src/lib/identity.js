// Worker identity, offline PIN login, and the device signing key.
//
// SECURITY BOUNDARY — read this before trusting it:
// PIN verification happens entirely on the device against a PBKDF2 verifier in
// IndexedDB. There is no server check. This gives a worker a durable identity
// that works 300 m underground with no signal, which is the actual requirement.
// It is NOT an authorization boundary — anyone with the unlocked phone and
// devtools can read the local database. Production needs server-issued
// credentials. `docs/ARCHITECTURE.md` §9 states this too.

import { STORE, idbGet, idbPut, idbGetAll, idbQuery, idbDelete } from './idb.js'
import { generateSigningKey, hashPin, verifyPin, randomId, signerWarning } from './crypto.js'
import { LS, lsGet, lsSet, lsRemove, lsGetJson, lsSetJson } from './local.js'

export const ROLE = { WORKER: 'worker', SUPERVISOR: 'supervisor' }
export const DEFAULT_SITE_ID = 'site-default'

const DEVICE_KEY_ID = 'device'
const TRUSTED_KEY_ID = 'trusted'

/* ================================================================== */
/* Device signing key                                                  */
/* ================================================================== */

let deviceKeyPromise = null

/**
 * The keypair this device uses to sign certificate records. Generated on first
 * use and reused thereafter. The private key is a non-extractable CryptoKey
 * handle where the platform allows it, stored via structured clone.
 *
 * Clearing browser storage destroys this key permanently. That is why records
 * gossip to a second device — see sync.js.
 */
export async function getDeviceKey() {
  if (deviceKeyPromise) return deviceKeyPromise

  deviceKeyPromise = (async () => {
    const existing = await idbGet(STORE.KEYS, DEVICE_KEY_ID)
    if (existing?.alg && existing?.publicKey && existing?.privateKey) return existing

    const generated = await generateSigningKey()
    const record = {
      id: DEVICE_KEY_ID,
      alg: generated.alg,
      privateKey: generated.privateKey,
      publicKey: generated.publicKey,
      createdAt: Date.now(),
      label: 'This device',
    }
    try {
      await idbPut(STORE.KEYS, record)
    } catch {
      // Even if we can't persist it, the in-session key still works so the
      // demo doesn't break. It just won't survive a reload.
    }
    await trustPublicKey(generated.alg, generated.publicKey, 'This device')
    return record
  })()

  return deviceKeyPromise
}

/** Non-null when signing is running on a weaker fallback scheme. */
export async function getSignerWarning() {
  const key = await getDeviceKey()
  return signerWarning(key.alg)
}

/** Public keys this device accepts as valid certificate signers. */
export async function getTrustedKeys() {
  const rec = await idbGet(STORE.KEYS, TRUSTED_KEY_ID)
  return Array.isArray(rec?.keys) ? rec.keys : []
}

export async function trustPublicKey(alg, publicKey, label = 'Imported device') {
  if (!alg || !publicKey) return
  const keys = await getTrustedKeys()
  if (keys.some((k) => k.publicKey === publicKey && k.alg === alg)) return
  keys.push({ alg, publicKey, label, addedAt: Date.now() })
  try {
    await idbPut(STORE.KEYS, { id: TRUSTED_KEY_ID, keys })
  } catch {
    /* non-fatal */
  }
}

export async function untrustPublicKey(publicKey) {
  const keys = (await getTrustedKeys()).filter((k) => k.publicKey !== publicKey)
  try {
    await idbPut(STORE.KEYS, { id: TRUSTED_KEY_ID, keys })
  } catch {
    /* non-fatal */
  }
}

/* ================================================================== */
/* Active site                                                         */
/* ================================================================== */

export function getActiveSiteId() {
  return lsGet(LS.ACTIVE_SITE, DEFAULT_SITE_ID) || DEFAULT_SITE_ID
}

export function setActiveSiteId(siteId) {
  lsSet(LS.ACTIVE_SITE, siteId || DEFAULT_SITE_ID)
}

/* ================================================================== */
/* Worker records                                                      */
/* ================================================================== */

/**
 * Reduce a typed phone number to its canonical ten digits.
 *
 * This used to be `.replace(/\D/g,'').slice(-10)`, and the blind slice was a
 * validation hole rather than a convenience: ANY long run of digits became a
 * "valid" ten-digit number by truncation. Typing fourteen nines produced
 * 9999999999 and passed every check downstream, which is exactly the "any number
 * is accepted" behaviour that prompted this.
 *
 * Country code and trunk prefix are now stripped EXPLICITLY, so anything else of
 * the wrong length stays the wrong length and fails validation instead of being
 * silently trimmed into shape.
 */
export function normalisePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

/*
 * Indian mobile numbers begin 6, 7, 8 or 9. The app is built for DGMS sites in
 * Jharkhand, so this is a real constraint rather than an arbitrary one, and it is
 * what rejects 0000000000 and 1234567890 — both of which passed the old
 * length-only test.
 */
const MOBILE_RE = /^[6-9]\d{9}$/

export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 6

/**
 * Is this PIN trivially guessable?
 *
 * A blocklist of four literals was the old rule and it missed 1111 in five of its
 * six lengths, plus 2345, 9876, 1122 and every other obvious run. This derives the
 * weak cases instead of listing them, so it holds for any supported length.
 */
export function isWeakPin(pin) {
  const s = String(pin || '')
  // Fails closed. Anything that is not a plain digit string has not been shown to
  // be strong, and a predicate guarding a credential should not answer "fine" to a
  // question it does not understand. validatePin checks format first, so in normal
  // use this branch is unreachable — it is here for the direct caller.
  if (!/^\d+$/.test(s)) return true
  // All one digit: 0000, 111111.
  if (/^(\d)\1+$/.test(s)) return true

  // Ascending or descending consecutive runs: 1234, 4321, 6789, 987654.
  let ascending = true
  let descending = true
  for (let i = 1; i < s.length; i += 1) {
    const delta = s.charCodeAt(i) - s.charCodeAt(i - 1)
    if (delta !== 1) ascending = false
    if (delta !== -1) descending = false
  }
  if (ascending || descending) return true

  // A repeated two-digit pair: 1212, 121212.
  if (s.length % 2 === 0 && /^(\d\d)\1+$/.test(s)) return true

  return false
}

/**
 * One PIN rule, used everywhere a PIN is set.
 *
 * It exists because there were three separate rules. Registration rejected weak
 * PINs; `changePin` and `setSupervisorPin` checked only `\d{4,6}`. So a worker
 * forced to pick a strong PIN could immediately change it to 0000, and the
 * supervisor PIN — the single credential guarding the compliance dashboard, the
 * hazard board, chain integrity and the statutory export — could be 1234. The
 * weakest rule was protecting the most sensitive thing.
 *
 * @returns array of error codes; empty means acceptable.
 */
export function validatePin(pin, { confirm } = {}) {
  const errors = []
  const clean = String(pin || '')
  if (!new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(clean)) errors.push('PIN_FORMAT')
  else if (isWeakPin(clean)) errors.push('PIN_TOO_SIMPLE')
  if (confirm !== undefined && clean !== String(confirm || '')) errors.push('PIN_MISMATCH')
  return errors
}

/**
 * Validate registration input. Returns an array of machine-readable error
 * codes; empty means valid. The UI maps codes to translated messages.
 */
export function validateRegistration({ name, phone, pin, pinConfirm }) {
  const errors = []
  const cleanName = String(name || '').trim()
  if (cleanName.length < 2) errors.push('NAME_TOO_SHORT')
  if (cleanName.length > 60) errors.push('NAME_TOO_LONG')
  // A name of pure digits or punctuation is not a name. It got through before,
  // which is how "1234" became a worker record.
  if (cleanName && !/\p{L}/u.test(cleanName)) errors.push('NAME_INVALID')

  const cleanPhone = normalisePhone(phone)
  if (cleanPhone && !MOBILE_RE.test(cleanPhone)) errors.push('PHONE_INVALID')

  errors.push(...validatePin(pin, { confirm: pinConfirm }))

  return [...new Set(errors)]
}

export async function listWorkers(siteId) {
  const all = siteId ? await idbQuery(STORE.WORKERS, 'siteId', siteId) : await idbGetAll(STORE.WORKERS)
  return all.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export async function getWorker(id) {
  return idbGet(STORE.WORKERS, id)
}

export async function findWorkerByPhone(phone, siteId = getActiveSiteId()) {
  const clean = normalisePhone(phone)
  if (!clean) return null
  const rows = await idbQuery(STORE.WORKERS, 'phone', clean)
  return rows.find((w) => w.siteId === siteId) || rows[0] || null
}

/**
 * Create a worker with a locally-verifiable PIN.
 * Throws an Error whose message is a machine-readable code.
 */
export async function registerWorker({ name, phone, pin, role = ROLE.WORKER, siteId = getActiveSiteId() }) {
  const errors = validateRegistration({ name, phone, pin })
  if (errors.length) {
    const err = new Error(errors[0])
    err.codes = errors
    throw err
  }

  const cleanPhone = normalisePhone(phone)
  if (cleanPhone) {
    const existing = await findWorkerByPhone(cleanPhone, siteId)
    if (existing) throw new Error('PHONE_TAKEN')
  }

  const verifier = await hashPin(pin)
  const worker = {
    id: `w_${randomId(9)}`,
    name: String(name).trim(),
    phone: cleanPhone,
    pinHash: verifier,
    role: role === ROLE.SUPERVISOR ? ROLE.SUPERVISOR : ROLE.WORKER,
    siteId: siteId || DEFAULT_SITE_ID,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await idbPut(STORE.WORKERS, worker)
  return worker
}

export async function updateWorker(id, patch) {
  const worker = await getWorker(id)
  if (!worker) throw new Error('WORKER_NOT_FOUND')
  const next = { ...worker, ...patch, id: worker.id, updatedAt: Date.now() }
  if (patch?.name !== undefined) next.name = String(patch.name).trim()
  if (patch?.phone !== undefined) next.phone = normalisePhone(patch.phone)
  await idbPut(STORE.WORKERS, next)
  return next
}

export async function changePin(id, newPin, { confirm } = {}) {
  // Same rule as registration. Previously this checked format only, so the
  // strong-PIN requirement at sign-up could be undone thirty seconds later.
  const errors = validatePin(newPin, { confirm })
  if (errors.length) {
    const err = new Error(errors[0])
    err.codes = errors
    throw err
  }
  const verifier = await hashPin(newPin)
  return updateWorker(id, { pinHash: verifier })
}

export async function deleteWorker(id) {
  await idbDelete(STORE.WORKERS, id)
  if (getSession()?.workerId === id) logout()
}

/* ================================================================== */
/* PIN attempt throttling                                             */
/* ================================================================== */

const LOCKOUT_KEY = 'jaagruk_pin_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_STEPS_MS = [30_000, 60_000, 300_000, 900_000]

function readAttempts() {
  return lsGetJson(LOCKOUT_KEY, {})
}

function writeAttempts(map) {
  lsSetJson(LOCKOUT_KEY, map)
}

/** Milliseconds remaining before this worker may try a PIN again. 0 = allowed. */
export function lockoutRemainingMs(workerId) {
  const entry = readAttempts()[workerId]
  if (!entry?.until) return 0
  return Math.max(0, entry.until - Date.now())
}

function recordFailure(workerId) {
  const map = readAttempts()
  const entry = map[workerId] || { fails: 0, lockLevel: 0, until: 0 }
  entry.fails += 1
  if (entry.fails >= MAX_ATTEMPTS) {
    const step = LOCKOUT_STEPS_MS[Math.min(entry.lockLevel, LOCKOUT_STEPS_MS.length - 1)]
    entry.until = Date.now() + step
    entry.lockLevel += 1
    entry.fails = 0
  }
  map[workerId] = entry
  writeAttempts(map)
  return entry
}

function clearFailures(workerId) {
  const map = readAttempts()
  delete map[workerId]
  writeAttempts(map)
}

export function attemptsRemaining(workerId) {
  const entry = readAttempts()[workerId]
  if (!entry) return MAX_ATTEMPTS
  return Math.max(0, MAX_ATTEMPTS - (entry.fails || 0))
}

/* ================================================================== */
/* Session                                                             */
/* ================================================================== */

/**
 * Verify a PIN and start a session.
 * Throws: WORKER_NOT_FOUND | LOCKED_OUT | PIN_WRONG
 */
export async function login(workerId, pin) {
  const worker = await getWorker(workerId)
  if (!worker) throw new Error('WORKER_NOT_FOUND')

  const remaining = lockoutRemainingMs(workerId)
  if (remaining > 0) {
    const err = new Error('LOCKED_OUT')
    err.retryInMs = remaining
    throw err
  }

  const ok = await verifyPin(pin, worker.pinHash)
  if (!ok) {
    const entry = recordFailure(workerId)
    const err = new Error('PIN_WRONG')
    err.attemptsRemaining = Math.max(0, MAX_ATTEMPTS - (entry.fails || 0))
    err.retryInMs = Math.max(0, (entry.until || 0) - Date.now())
    throw err
  }

  clearFailures(workerId)
  const session = { workerId: worker.id, role: worker.role, siteId: worker.siteId, at: Date.now() }
  lsSetJson(LS.SESSION, session)
  setActiveSiteId(worker.siteId)
  return worker
}

export function getSession() {
  const s = lsGetJson(LS.SESSION, null)
  if (!s?.workerId) return null
  return s
}

export function logout() {
  lsRemove(LS.SESSION)
}

/** The logged-in worker record, or null. Also self-heals a stale session. */
export async function getCurrentWorker() {
  const session = getSession()
  if (!session) return null
  const worker = await getWorker(session.workerId)
  if (!worker) {
    logout()
    return null
  }
  return worker
}

export function isSupervisorSession() {
  return getSession()?.role === ROLE.SUPERVISOR
}

/* ================================================================== */
/* Supervisor gate for /admin                                          */
/* ================================================================== */

/**
 * The compliance dashboard sits behind a local PIN. This is a demo-grade
 * speed bump, not authorization — see the notice rendered on the page itself.
 */
/*
 * The lockout ledger is keyed by worker id. The supervisor PIN has no worker, so
 * it borrows a reserved key that cannot collide with a generated id (those are all
 * `w_` + 9 random chars).
 */
export const SUPERVISOR_LOCK_ID = '__supervisor__'

export async function setSupervisorPin(pin, { confirm } = {}) {
  // Held to the same standard as a worker PIN. It used to be weaker, which was
  // backwards: this one credential opens the compliance dashboard, the hazard
  // board, chain integrity and the statutory CSV export.
  const errors = validatePin(pin, { confirm })
  if (errors.length) {
    const err = new Error(errors[0])
    err.codes = errors
    throw err
  }
  const verifier = await hashPin(pin)
  lsSetJson(LS.SUPERVISOR_PIN, verifier)
  clearFailures(SUPERVISOR_LOCK_ID)
}

export function supervisorPinIsSet() {
  const v = lsGetJson(LS.SUPERVISOR_PIN, null)
  return !!v?.hash
}

/** Milliseconds until the supervisor gate will accept another attempt. */
export function supervisorLockoutRemainingMs() {
  return lockoutRemainingMs(SUPERVISOR_LOCK_ID)
}

export function supervisorAttemptsRemaining() {
  return attemptsRemaining(SUPERVISOR_LOCK_ID)
}

/**
 * Verify the supervisor PIN, with the same throttling worker sign-in has.
 *
 * WHY THIS CHANGED: worker login has had a five-attempt lockout with escalating
 * delays since it was written. This gate had none — so the credential guarding the
 * most sensitive screen in the app was the one that could be brute-forced at full
 * speed, offline, with no penalty. A four-digit PIN is ten thousand guesses, which
 * is seconds of scripted attempts against an unthrottled check.
 *
 * Throws LOCKED_OUT (with retryInMs) rather than returning false, so the caller
 * cannot mistake "too many attempts" for "wrong PIN".
 */
export async function verifySupervisorPin(pin) {
  const verifier = lsGetJson(LS.SUPERVISOR_PIN, null)
  if (!verifier?.hash) return false

  const remaining = lockoutRemainingMs(SUPERVISOR_LOCK_ID)
  if (remaining > 0) {
    const err = new Error('LOCKED_OUT')
    err.retryInMs = remaining
    throw err
  }

  const ok = await verifyPin(pin, verifier)
  if (ok) clearFailures(SUPERVISOR_LOCK_ID)
  else recordFailure(SUPERVISOR_LOCK_ID)
  return ok
}

export function clearSupervisorPin() {
  lsRemove(LS.SUPERVISOR_PIN)
  clearFailures(SUPERVISOR_LOCK_ID)
}

/* ================================================================== */
/* Legacy profile bridge                                              */
/* ================================================================== */

/**
 * Before Jaagruk had real worker records, the app stored a bare
 * `{ name }` profile. Surface it so an existing user's name still appears,
 * and so Certification can offer to convert it into a real worker.
 */
export function getLegacyProfileName() {
  const p = lsGetJson(LS.WORKER, null)
  return typeof p?.name === 'string' ? p.name : ''
}

export function setLegacyProfileName(name) {
  lsSetJson(LS.WORKER, { name: String(name || '').trim() })
}
