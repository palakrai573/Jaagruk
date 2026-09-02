// Small synchronous settings store (localStorage) plus the one-time migration
// from the app's previous name.
//
// Only values that must be readable synchronously during render live here:
// language, provider/key, toggles, active session. Everything with real volume
// (ledger, attempts, hazards, media) lives in IndexedDB via idb.js.

export const LS = {
  LANG: 'jaagruk_language',
  API_KEY: 'jaagruk_api_key',
  PROVIDER: 'jaagruk_provider',
  LOG: 'jaagruk_training_log',
  WORKER: 'jaagruk_worker_profile',
  LEGACY_CERTS: 'jaagruk_certificates',
  SESSION: 'jaagruk_session',
  ACTIVE_SITE: 'jaagruk_active_site',
  SUPERVISOR_PIN: 'jaagruk_supervisor_pin',
  SYNC_ENDPOINT: 'jaagruk_sync_endpoint',
  ONBOARDED: 'jaagruk_onboarded',
  MODE_PICTOGRAM: 'jaagruk_mode_pictogram',
  MODE_GESTURE: 'jaagruk_mode_gesture',
  MODE_VOICE: 'jaagruk_mode_voice',
  MODE_AR: 'jaagruk_mode_ar',
  MIGRATED: 'jaagruk_migrated_from_khatra',
}

// old key -> new key
const MIGRATIONS = {
  khatra_language: LS.LANG,
  khatra_api_key: LS.API_KEY,
  khatra_provider: LS.PROVIDER,
  khatra_training_log: LS.LOG,
  khatra_worker_profile: LS.WORKER,
  khatra_certificates: LS.LEGACY_CERTS,
}

function available() {
  try {
    if (typeof localStorage === 'undefined') return false
    const probe = '__jaagruk_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

const HAS_LS = available()
const fallback = new Map()

export function lsAvailable() {
  return HAS_LS
}

export function lsGet(key, defaultValue = null) {
  try {
    if (!HAS_LS) return fallback.has(key) ? fallback.get(key) : defaultValue
    const raw = localStorage.getItem(key)
    return raw === null ? defaultValue : raw
  } catch {
    return defaultValue
  }
}

export function lsSet(key, value) {
  try {
    if (!HAS_LS) {
      fallback.set(key, String(value))
      return
    }
    localStorage.setItem(key, String(value))
  } catch {
    // Quota or a locked-down context. Keep it in memory for this session.
    fallback.set(key, String(value))
  }
}

export function lsRemove(key) {
  try {
    fallback.delete(key)
    if (HAS_LS) localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export function lsGetJson(key, defaultValue) {
  const raw = lsGet(key, null)
  if (raw === null) return defaultValue
  try {
    const parsed = JSON.parse(raw)
    return parsed === null || parsed === undefined ? defaultValue : parsed
  } catch {
    return defaultValue
  }
}

export function lsSetJson(key, value) {
  try {
    lsSet(key, JSON.stringify(value))
  } catch {
    /* circular or unserialisable — caller bug, don't crash the app */
  }
}

export function lsGetBool(key, defaultValue = false) {
  const raw = lsGet(key, null)
  if (raw === null) return defaultValue
  return raw === 'true' || raw === '1'
}

export function lsSetBool(key, value) {
  lsSet(key, value ? 'true' : 'false')
}

/**
 * Copy any pre-rename keys across to their new names. Idempotent: runs once,
 * never overwrites a value the user has already set under the new name, and
 * leaves the old keys in place so an older build of the app still works if
 * someone rolls back.
 */
export function migrateLegacyKeys() {
  if (!HAS_LS) return { migrated: 0, alreadyDone: true }
  if (lsGet(LS.MIGRATED) === 'true') return { migrated: 0, alreadyDone: true }

  let migrated = 0
  for (const [oldKey, newKey] of Object.entries(MIGRATIONS)) {
    try {
      const oldValue = localStorage.getItem(oldKey)
      if (oldValue === null) continue
      if (localStorage.getItem(newKey) !== null) continue
      localStorage.setItem(newKey, oldValue)
      migrated += 1
    } catch {
      /* skip this key */
    }
  }

  lsSet(LS.MIGRATED, 'true')
  return { migrated, alreadyDone: false }
}
