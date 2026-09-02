// IndexedDB layer for Jaagruk — the browser equivalent of the Room/SQLite
// database in the native architecture. Everything the app writes goes here
// first (local-first), and syncs outward later.
//
// Every call degrades to an in-memory store if IndexedDB is unavailable
// (Firefox private browsing, locked-down WebViews, storage disabled). The app
// stays usable for the session; it just can't persist. `isPersistent()` lets
// the UI tell the user the truth about that.

const DB_NAME = 'jaagruk'
const DB_VERSION = 1

export const STORE = {
  WORKERS: 'workers',
  CHAIN: 'chain',
  KEYS: 'keys',
  ATTEMPTS: 'attempts',
  SCHEDULE: 'schedule',
  SITES: 'sites',
  HAZARDS: 'hazards',
  SYNC_QUEUE: 'syncQueue',
  BLOBS: 'blobs',
}

const SCHEMA = {
  [STORE.WORKERS]: { keyPath: 'id', indexes: ['siteId', 'phone'] },
  [STORE.CHAIN]: { keyPath: 'hash', indexes: ['siteId', 'seq', 'workerId'] },
  [STORE.KEYS]: { keyPath: 'id', indexes: [] },
  [STORE.ATTEMPTS]: { keyPath: 'id', indexes: ['workerId', 'domain', 'at'] },
  [STORE.SCHEDULE]: { keyPath: 'id', indexes: ['workerId', 'dueAt'] },
  [STORE.SITES]: { keyPath: 'id', indexes: [] },
  [STORE.HAZARDS]: { keyPath: 'id', indexes: ['siteId', 'status', 'at'] },
  [STORE.SYNC_QUEUE]: { keyPath: 'id', indexes: ['kind'] },
  [STORE.BLOBS]: { keyPath: 'id', indexes: [] },
}

/* ------------------------------------------------------------------ */
/* In-memory fallback                                                  */
/* ------------------------------------------------------------------ */

const memory = new Map()
let usingMemory = false

function mem(store) {
  if (!memory.has(store)) memory.set(store, new Map())
  return memory.get(store)
}

function keyOf(store, value) {
  return value?.[SCHEMA[store].keyPath]
}

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    let idb
    try {
      idb = typeof indexedDB !== 'undefined' ? indexedDB : null
    } catch {
      idb = null
    }
    if (!idb) {
      usingMemory = true
      resolve(null)
      return
    }

    let req
    try {
      req = idb.open(DB_NAME, DB_VERSION)
    } catch {
      usingMemory = true
      resolve(null)
      return
    }

    // If another tab holds an old version open, we don't want to hang forever.
    const timer = setTimeout(() => {
      usingMemory = true
      resolve(null)
    }, 6000)

    req.onupgradeneeded = () => {
      const db = req.result
      for (const [name, def] of Object.entries(SCHEMA)) {
        let store
        if (!db.objectStoreNames.contains(name)) {
          store = db.createObjectStore(name, { keyPath: def.keyPath })
        } else {
          store = req.transaction.objectStore(name)
        }
        for (const idx of def.indexes) {
          if (!store.indexNames.contains(idx)) store.createIndex(idx, idx, { unique: false })
        }
      }
    }

    req.onsuccess = () => {
      clearTimeout(timer)
      const db = req.result
      // If a newer version is requested elsewhere, close so we don't block it.
      db.onversionchange = () => {
        try {
          db.close()
        } catch {
          /* already closed */
        }
        dbPromise = null
      }
      resolve(db)
    }

    req.onerror = () => {
      clearTimeout(timer)
      usingMemory = true
      resolve(null)
    }

    req.onblocked = () => {
      clearTimeout(timer)
      usingMemory = true
      resolve(null)
    }
  })

  return dbPromise
}

/** True once we know writes are actually persisting to disk. */
export async function isPersistent() {
  const db = await openDb()
  return !!db && !usingMemory
}

/** Human-readable storage status for the Settings page. */
export async function storageStatus() {
  const persistent = await isPersistent()
  let quota = null
  let usage = null
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      quota = est.quota ?? null
      usage = est.usage ?? null
    }
  } catch {
    /* estimate unsupported */
  }
  return { persistent, quota, usage }
}

/* ------------------------------------------------------------------ */
/* Core operations                                                     */
/* ------------------------------------------------------------------ */

function runTx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    let tx
    try {
      tx = db.transaction(store, mode)
    } catch (err) {
      reject(err)
      return
    }
    const os = tx.objectStore(store)
    let result
    try {
      result = fn(os)
    } catch (err) {
      try {
        tx.abort()
      } catch {
        /* noop */
      }
      reject(err)
      return
    }
    tx.oncomplete = () => resolve(result?.__req ? result.__req.result : result)
    tx.onerror = () => reject(tx.error || new Error('IDB transaction failed'))
    tx.onabort = () => reject(tx.error || new Error('IDB transaction aborted'))
  })
}

function wrap(req) {
  return { __req: req }
}

export async function idbGet(store, key) {
  if (key === undefined || key === null) return null
  const db = await openDb()
  if (!db) return mem(store).get(key) ?? null
  try {
    const out = await runTx(db, store, 'readonly', (os) => wrap(os.get(key)))
    return out ?? null
  } catch {
    return mem(store).get(key) ?? null
  }
}

export async function idbPut(store, value) {
  const key = keyOf(store, value)
  if (key === undefined || key === null) {
    throw new Error(`idbPut(${store}): missing key "${SCHEMA[store].keyPath}"`)
  }
  const db = await openDb()
  if (!db) {
    mem(store).set(key, value)
    return value
  }
  try {
    await runTx(db, store, 'readwrite', (os) => wrap(os.put(value)))
    return value
  } catch (err) {
    // Quota exhaustion is the realistic failure here. Keep the record in
    // memory for this session and let the caller surface a warning.
    mem(store).set(key, value)
    const e = new Error(isQuotaError(err) ? 'STORAGE_FULL' : 'STORAGE_WRITE_FAILED')
    e.cause = err
    throw e
  }
}

/** Put many records in one transaction. Atomic: all or nothing. */
export async function idbPutMany(store, values) {
  if (!Array.isArray(values) || values.length === 0) return 0
  const db = await openDb()
  if (!db) {
    values.forEach((v) => mem(store).set(keyOf(store, v), v))
    return values.length
  }
  try {
    await runTx(db, store, 'readwrite', (os) => {
      values.forEach((v) => os.put(v))
      return values.length
    })
    return values.length
  } catch (err) {
    values.forEach((v) => mem(store).set(keyOf(store, v), v))
    const e = new Error(isQuotaError(err) ? 'STORAGE_FULL' : 'STORAGE_WRITE_FAILED')
    e.cause = err
    throw e
  }
}

export async function idbDelete(store, key) {
  const db = await openDb()
  if (!db) {
    mem(store).delete(key)
    return
  }
  try {
    await runTx(db, store, 'readwrite', (os) => wrap(os.delete(key)))
  } catch {
    mem(store).delete(key)
  }
}

export async function idbGetAll(store) {
  const db = await openDb()
  if (!db) return [...mem(store).values()]
  try {
    const out = await runTx(db, store, 'readonly', (os) => wrap(os.getAll()))
    return Array.isArray(out) ? out : []
  } catch {
    return [...mem(store).values()]
  }
}

export async function idbQuery(store, index, value) {
  const db = await openDb()
  if (!db) return [...mem(store).values()].filter((v) => v?.[index] === value)
  try {
    const out = await runTx(db, store, 'readonly', (os) => {
      if (!os.indexNames.contains(index)) return wrap(os.getAll())
      return wrap(os.index(index).getAll(value))
    })
    const rows = Array.isArray(out) ? out : []
    // Filtering again is a no-op when the index existed, and is the actual
    // filter when we had to fall back to getAll() because it didn't.
    return rows.filter((r) => r?.[index] === value)
  } catch {
    return [...mem(store).values()].filter((v) => v?.[index] === value)
  }
}

export async function idbCount(store) {
  const db = await openDb()
  if (!db) return mem(store).size
  try {
    const out = await runTx(db, store, 'readonly', (os) => wrap(os.count()))
    return typeof out === 'number' ? out : 0
  } catch {
    return mem(store).size
  }
}

export async function idbClear(store) {
  const db = await openDb()
  mem(store).clear()
  if (!db) return
  try {
    await runTx(db, store, 'readwrite', (os) => wrap(os.clear()))
  } catch {
    /* already cleared in memory */
  }
}

/** Wipe every Jaagruk store. Used by the "reset device" action in Settings. */
export async function idbClearAll() {
  for (const store of Object.values(STORE)) {
    // eslint-disable-next-line no-await-in-loop
    await idbClear(store)
  }
}

function isQuotaError(err) {
  const name = err?.name || ''
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

/**
 * Ask the browser not to evict our data. Best-effort: unsupported or denied
 * both resolve false rather than throwing.
 */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
