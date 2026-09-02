// Cryptographic primitives for the Jaagruk certificate ledger.
//
// Design decisions worth knowing:
//
// 1. HASHING IS ALWAYS PURE JS AND SYNCHRONOUS. Web Crypto's digest() is only
//    available in a secure context (https or localhost). A site tablet served
//    over plain http on a LAN IP would lose it. Since the whole point of the
//    hash-chain is that it verifies anywhere, offline, we carry our own
//    SHA-256. Records are a few hundred bytes, so the cost is irrelevant.
//
// 2. SIGNING PREFERS Ed25519, FALLS BACK TO ECDSA P-256, AND FALLS BACK AGAIN
//    TO HMAC-SHA256 if crypto.subtle is missing entirely. The algorithm used
//    is recorded on the key and on every signature, so verification always
//    knows what it's checking. The HMAC path is symmetric — it proves the
//    record came from a device holding the site secret, not from a specific
//    device. That is weaker, and `signerWarning()` says so out loud.

/* ================================================================== */
/* SHA-256 (pure JS, sync)                                             */
/* ================================================================== */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0

/** SHA-256 over raw bytes. Returns a 32-byte Uint8Array. */
export function sha256Bytes(msg) {
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ])

  const ml = msg.length
  const padded = new Uint8Array((((ml + 8) >> 6) + 1) << 6)
  padded.set(msg)
  padded[ml] = 0x80

  const dv = new DataView(padded.buffer)
  const bitLen = ml * 8
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  dv.setUint32(padded.length - 4, bitLen >>> 0)

  const w = new Uint32Array(64)

  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15]
      const y = w[i - 2]
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let a = H[0]
    let b = H[1]
    let c = H[2]
    let d = H[3]
    let e = H[4]
    let f = H[5]
    let g = H[6]
    let h = H[7]

    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      const ch = ((e & f) ^ (~e & g)) >>> 0
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      const t2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    H[0] = (H[0] + a) >>> 0
    H[1] = (H[1] + b) >>> 0
    H[2] = (H[2] + c) >>> 0
    H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0
    H[5] = (H[5] + f) >>> 0
    H[6] = (H[6] + g) >>> 0
    H[7] = (H[7] + h) >>> 0
  }

  const out = new Uint8Array(32)
  const odv = new DataView(out.buffer)
  for (let i = 0; i < 8; i += 1) odv.setUint32(i * 4, H[i])
  return out
}

/** SHA-256 of a UTF-8 string, as lowercase hex. */
export function sha256Hex(text) {
  return bytesToHex(sha256Bytes(utf8(text)))
}

/* ================================================================== */
/* HMAC-SHA256 (pure JS, sync) — used only in the no-subtle fallback   */
/* ================================================================== */

export function hmacSha256Bytes(keyBytes, msgBytes) {
  const BLOCK = 64
  let key = keyBytes
  if (key.length > BLOCK) key = sha256Bytes(key)

  const padKey = new Uint8Array(BLOCK)
  padKey.set(key)

  const inner = new Uint8Array(BLOCK + msgBytes.length)
  const outer = new Uint8Array(BLOCK + 32)

  for (let i = 0; i < BLOCK; i += 1) {
    inner[i] = padKey[i] ^ 0x36
    outer[i] = padKey[i] ^ 0x5c
  }
  inner.set(msgBytes, BLOCK)
  outer.set(sha256Bytes(inner), BLOCK)

  return sha256Bytes(outer)
}

/* ================================================================== */
/* Encoding helpers                                                    */
/* ================================================================== */

const TEXT_ENCODER = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

export function utf8(text) {
  const str = String(text ?? '')
  if (TEXT_ENCODER) return TEXT_ENCODER.encode(str)
  // Minimal manual UTF-8 encoder for environments without TextEncoder.
  const bytes = []
  for (let i = 0; i < str.length; i += 1) {
    let cp = str.codePointAt(i)
    if (cp > 0xffff) i += 1
    if (cp < 0x80) bytes.push(cp)
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63))
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
  }
  return new Uint8Array(bytes)
}

export function bytesToHex(bytes) {
  let hex = ''
  for (let i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

export function hexToBytes(hex) {
  const clean = String(hex || '').replace(/[^0-9a-f]/gi, '')
  const out = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

const B64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function bytesToB64url(bytes) {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += B64URL_ALPHABET[b0 >> 2]
    out += B64URL_ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]
    if (b1 === undefined) break
    out += B64URL_ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]
    if (b2 === undefined) break
    out += B64URL_ALPHABET[b2 & 63]
  }
  return out
}

export function b64urlToBytes(str) {
  const clean = String(str || '').replace(/[^A-Za-z0-9\-_]/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let acc = 0
  let bits = 0
  let p = 0
  for (let i = 0; i < clean.length; i += 1) {
    const v = B64URL_ALPHABET.indexOf(clean[i])
    if (v < 0) continue
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[p] = (acc >> bits) & 0xff
      p += 1
    }
  }
  return out.subarray(0, p)
}

/* ================================================================== */
/* Canonical JSON — deterministic bytes for hashing                    */
/* ================================================================== */

/**
 * Serialise a value with recursively sorted object keys and no whitespace, so
 * the same logical record always produces the same hash on every device.
 * Non-finite numbers become null; undefined and functions are dropped.
 */
export function canonicalJson(value) {
  if (value === null || value === undefined) return 'null'
  const type = typeof value
  if (type === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null'
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'string') return JSON.stringify(value)
  if (type === 'function' || type === 'symbol') return 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (type === 'object') {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined && typeof value[k] !== 'function')
      .sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`
  }
  return 'null'
}

/** Content hash of a record: SHA-256 over its canonical JSON, as hex. */
export function hashRecord(record) {
  return sha256Hex(canonicalJson(record))
}

/* ================================================================== */
/* Randomness                                                          */
/* ================================================================== */

export function randomBytes(n) {
  const out = new Uint8Array(n)
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(out)
      return out
    }
  } catch {
    /* fall through */
  }
  // Last resort. Only reachable in environments with no Web Crypto at all;
  // `randomnessIsStrong()` reports this so the UI can warn.
  for (let i = 0; i < n; i += 1) out[i] = Math.floor(Math.random() * 256)
  return out
}

export function randomnessIsStrong() {
  try {
    return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
  } catch {
    return false
  }
}

/** URL-safe random identifier. */
export function randomId(bytes = 12) {
  return bytesToB64url(randomBytes(bytes))
}

/** Short human-readable code (uppercase, unambiguous alphabet). */
export function shortCode(len = 6) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i += 1) out += alphabet[bytes[i] % alphabet.length]
  return out
}

/* ================================================================== */
/* Signing keys                                                        */
/* ================================================================== */

export const SIG_ALG = {
  ED25519: 'ed25519',
  ECDSA_P256: 'ecdsa-p256',
  HMAC_FALLBACK: 'hmac-sha256',
}

function subtle() {
  try {
    return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null
  } catch {
    return null
  }
}

export function isSecureCryptoAvailable() {
  return !!subtle()
}

/**
 * Generate a device signing key.
 * Returns { alg, privateKey, publicKeySpki (b64url) | secret (b64url) }.
 * The private key is non-extractable where the platform supports it.
 */
export async function generateSigningKey() {
  const s = subtle()

  if (s) {
    // Preferred: Ed25519.
    try {
      const pair = await s.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])
      const spki = await s.exportKey('spki', pair.publicKey)
      return {
        alg: SIG_ALG.ED25519,
        privateKey: pair.privateKey,
        publicKey: bytesToB64url(new Uint8Array(spki)),
      }
    } catch {
      /* not supported on this engine — try ECDSA */
    }

    try {
      const pair = await s.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
      const spki = await s.exportKey('spki', pair.publicKey)
      return {
        alg: SIG_ALG.ECDSA_P256,
        privateKey: pair.privateKey,
        publicKey: bytesToB64url(new Uint8Array(spki)),
      }
    } catch {
      /* fall through to HMAC */
    }
  }

  // No usable asymmetric crypto. Symmetric tamper-evidence only.
  const secret = randomBytes(32)
  return {
    alg: SIG_ALG.HMAC_FALLBACK,
    privateKey: bytesToB64url(secret),
    publicKey: bytesToB64url(secret),
  }
}

/** Sign a hex digest string. Returns a base64url signature. */
export async function signHash(key, hashHex) {
  const data = utf8(hashHex)

  if (key.alg === SIG_ALG.HMAC_FALLBACK) {
    return bytesToB64url(hmacSha256Bytes(b64urlToBytes(key.privateKey), data))
  }

  const s = subtle()
  if (!s) throw new Error('CRYPTO_UNAVAILABLE')

  const params = key.alg === SIG_ALG.ED25519 ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }
  const sig = await s.sign(params, key.privateKey, data)
  return bytesToB64url(new Uint8Array(sig))
}

const publicKeyCache = new Map()

async function importPublicKey(alg, publicKeyB64) {
  const cacheKey = `${alg}:${publicKeyB64}`
  if (publicKeyCache.has(cacheKey)) return publicKeyCache.get(cacheKey)

  const s = subtle()
  if (!s) throw new Error('CRYPTO_UNAVAILABLE')

  const spki = b64urlToBytes(publicKeyB64)
  const params = alg === SIG_ALG.ED25519 ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' }
  const key = await s.importKey('spki', spki, params, false, ['verify'])
  publicKeyCache.set(cacheKey, key)
  return key
}

/**
 * Verify a signature over a hex digest.
 * Returns true/false; never throws for a merely-invalid signature.
 */
export async function verifyHashSignature(alg, publicKeyB64, hashHex, signatureB64) {
  if (!alg || !publicKeyB64 || !hashHex || !signatureB64) return false
  const data = utf8(hashHex)

  try {
    if (alg === SIG_ALG.HMAC_FALLBACK) {
      const expected = hmacSha256Bytes(b64urlToBytes(publicKeyB64), data)
      return constantTimeEqual(expected, b64urlToBytes(signatureB64))
    }

    const s = subtle()
    if (!s) return false
    const key = await importPublicKey(alg, publicKeyB64)
    const params = alg === SIG_ALG.ED25519 ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }
    return await s.verify(params, key, b64urlToBytes(signatureB64), data)
  } catch {
    return false
  }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Non-null when the active signing scheme is weaker than intended. */
export function signerWarning(alg) {
  if (alg === SIG_ALG.HMAC_FALLBACK) return 'HMAC_FALLBACK'
  if (alg === SIG_ALG.ECDSA_P256) return null
  return null
}

/* ================================================================== */
/* PIN hashing (offline worker login)                                  */
/* ================================================================== */

const PIN_ITERATIONS = 210000

/**
 * Derive a PIN verifier. Uses PBKDF2-SHA256 via Web Crypto when available,
 * and an iterated HMAC-SHA256 chain otherwise (same construction, pure JS,
 * fewer rounds so a low-end phone stays responsive).
 */
export async function hashPin(pin, saltB64) {
  const salt = saltB64 ? b64urlToBytes(saltB64) : randomBytes(16)
  const pinBytes = utf8(String(pin))
  const s = subtle()

  if (s) {
    try {
      const base = await s.importKey('raw', pinBytes, { name: 'PBKDF2' }, false, ['deriveBits'])
      const bits = await s.deriveBits(
        { name: 'PBKDF2', salt, iterations: PIN_ITERATIONS, hash: 'SHA-256' },
        base,
        256
      )
      return {
        salt: bytesToB64url(salt),
        hash: bytesToB64url(new Uint8Array(bits)),
        kdf: `pbkdf2-sha256-${PIN_ITERATIONS}`,
      }
    } catch {
      /* fall through */
    }
  }

  const rounds = 20000
  let acc = hmacSha256Bytes(salt, pinBytes)
  for (let i = 1; i < rounds; i += 1) acc = hmacSha256Bytes(salt, acc)
  return { salt: bytesToB64url(salt), hash: bytesToB64url(acc), kdf: `hmac-chain-${rounds}` }
}

/** Verify a PIN against a stored verifier, using whichever KDF produced it. */
export async function verifyPin(pin, stored) {
  if (!stored?.hash || !stored?.salt) return false
  const salt = b64urlToBytes(stored.salt)
  const pinBytes = utf8(String(pin))
  const kdf = stored.kdf || ''

  try {
    if (kdf.startsWith('pbkdf2')) {
      const s = subtle()
      if (!s) return false
      const iterations = parseInt(kdf.split('-').pop(), 10) || PIN_ITERATIONS
      const base = await s.importKey('raw', pinBytes, { name: 'PBKDF2' }, false, ['deriveBits'])
      const bits = await s.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, 256)
      return constantTimeEqual(new Uint8Array(bits), b64urlToBytes(stored.hash))
    }

    const rounds = parseInt(kdf.split('-').pop(), 10) || 20000
    let acc = hmacSha256Bytes(salt, pinBytes)
    for (let i = 1; i < rounds; i += 1) acc = hmacSha256Bytes(salt, acc)
    return constantTimeEqual(acc, b64urlToBytes(stored.hash))
  } catch {
    return false
  }
}
