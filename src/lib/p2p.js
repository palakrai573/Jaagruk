// Phone-to-phone connection with no server and no internet.
//
// THE PROBLEM: the buddy system is two humans coordinating under stress. Every
// shortcut version of this simulates the buddy as an AI character, which trains
// the wrong thing entirely — there is no coordination in talking to a script.
// So both phones have to actually be connected. Underground there is no cell
// signal, no site wifi, and no signalling server to broker a WebRTC handshake.
//
// THE APPROACH: WebRTC still works fine without a signalling server if the two
// peers can exchange their session descriptions some other way. So we exchange
// them by QR code — the host shows a code, the buddy scans it, the buddy shows
// a code back, the host scans that. Two scans and they are on a direct data
// channel over the local network or a phone hotspot. No server ever involved.
//
// THE OBSTACLE: a raw WebRTC session description is around 1100 characters,
// which makes a QR code dense enough that a cheap phone camera struggles. So we
// compress it with deflate-raw (~65% smaller) before encoding, and fall back to
// stripping non-essential SDP lines where CompressionStream isn't available.
// ICE gathering is allowed to finish before we generate the code, because
// trickle ICE has nowhere to trickle to.
//
// LIMITATION, stated plainly: this needs both phones on one LAN or hotspot.
// Android's Nearby Connections API can bring up its own radio transport and
// therefore needs no shared network at all. The browser cannot. See
// docs/ARCHITECTURE.md §9.9.

import { randomId, shortCode } from './crypto.js'

export const P2P_STATE = {
  IDLE: 'idle',
  CREATING_OFFER: 'creating_offer',
  AWAITING_ANSWER: 'awaiting_answer',
  CREATING_ANSWER: 'creating_answer',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
  CLOSED: 'closed',
}

export const P2P_ROLE = { HOST: 'host', GUEST: 'guest' }

export const P2P_ERROR = {
  UNSUPPORTED: 'P2P_UNSUPPORTED',
  BAD_SIGNAL: 'P2P_BAD_SIGNAL',
  WRONG_ROLE: 'P2P_WRONG_ROLE',
  TIMEOUT: 'P2P_TIMEOUT',
  ICE_FAILED: 'P2P_ICE_FAILED',
  CHANNEL_FAILED: 'P2P_CHANNEL_FAILED',
  ALREADY_CONNECTED: 'P2P_ALREADY_CONNECTED',
}

const SIGNAL_PREFIX = 'JGKP1'
const ICE_GATHER_TIMEOUT_MS = 2500
const CONNECT_TIMEOUT_MS = 30000
const HEARTBEAT_INTERVAL_MS = 3000
const HEARTBEAT_TIMEOUT_MS = 11000

export function webrtcSupported() {
  try {
    return typeof RTCPeerConnection !== 'undefined' && typeof RTCSessionDescription !== 'undefined'
  } catch {
    return false
  }
}

/* ================================================================== */
/* Signal compression                                                  */
/* ================================================================== */

function compressionSupported() {
  try {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
  } catch {
    return false
  }
}

async function streamThrough(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform)
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

function toB64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  // btoa then make it URL/QR-safe.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64(text) {
  const normalised = String(text).replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Drop SDP lines a data-channel-only session doesn't need, and discard any
 * non-host ICE candidate. Used as the fallback when the browser has no
 * compression API, and applied before compression regardless — a smaller input
 * compresses to a smaller output.
 */
function trimSdp(sdp) {
  const drop = [
    'a=extmap-allow-mixed',
    'a=msid-semantic',
    'a=ice-options:trickle',
    'a=rtcp-mux',
    'a=rtcp-rsize',
  ]
  return String(sdp)
    .split(/\r\n|\n/)
    .filter((line) => {
      if (!line.trim()) return false
      if (drop.some((d) => line.startsWith(d))) return false
      // Relay/reflexive candidates are useless without a network path and are
      // the bulkiest lines in the description.
      if (line.startsWith('a=candidate:') && !line.includes('typ host')) return false
      // Link-local IPv6 candidates rarely help and are long.
      if (line.startsWith('a=candidate:') && /\s(fe80:|::1)/i.test(line)) return false
      return true
    })
    .join('\r\n')
}

async function packSignal({ role, sessionId, sdp, type }) {
  const trimmed = trimSdp(sdp)
  const encoder = new TextEncoder()
  const raw = encoder.encode(trimmed)

  let body
  let encoding
  if (compressionSupported()) {
    try {
      const deflated = await streamThrough(raw, new CompressionStream('deflate-raw'))
      // Only take the win if it actually is one.
      if (deflated.length < raw.length) {
        body = toB64(deflated)
        encoding = 'd'
      }
    } catch {
      /* fall through to plain */
    }
  }
  if (!body) {
    body = toB64(raw)
    encoding = 'p'
  }

  return [SIGNAL_PREFIX, role === P2P_ROLE.HOST ? 'h' : 'g', type === 'offer' ? 'o' : 'a', encoding, sessionId, body].join('.')
}

async function unpackSignal(text) {
  const raw = String(text || '').trim()
  if (!raw.startsWith(`${SIGNAL_PREFIX}.`)) return null

  const parts = raw.split('.')
  if (parts.length < 6) return null
  const [, roleCode, typeCode, encoding, sessionId] = parts
  // The body is base64url so it contains no dots, but rejoin defensively.
  const body = parts.slice(5).join('.')
  if (!body) return null

  let bytes
  try {
    bytes = fromB64(body)
  } catch {
    return null
  }

  let sdpBytes = bytes
  if (encoding === 'd') {
    if (!compressionSupported()) return null
    try {
      sdpBytes = await streamThrough(bytes, new DecompressionStream('deflate-raw'))
    } catch {
      return null
    }
  } else if (encoding !== 'p') {
    return null
  }

  let sdp
  try {
    sdp = new TextDecoder().decode(sdpBytes)
  } catch {
    return null
  }
  if (!sdp.includes('v=0') || !sdp.includes('m=application')) return null

  return {
    role: roleCode === 'h' ? P2P_ROLE.HOST : P2P_ROLE.GUEST,
    type: typeCode === 'o' ? 'offer' : 'answer',
    sessionId: sessionId || '',
    sdp: sdp.endsWith('\r\n') ? sdp : `${sdp}\r\n`,
  }
}

// Exposed for diagnostics and for the unit checks.
export const __signalCodec = { packSignal, unpackSignal, trimSdp, toB64, fromB64, compressionSupported }

/* ================================================================== */
/* Peer                                                                */
/* ================================================================== */

/**
 * Create one side of a buddy connection.
 *
 * @param onState    (state, detail) => void
 * @param onMessage  (envelope) => void — envelope is { kind, payload, seq, at }
 * @param onError    (code) => void
 * @param iceServers optional STUN list for cross-network use; empty by default
 *                   so nothing is contacted and LAN-only is guaranteed
 */
export function createPeer({ role = P2P_ROLE.HOST, onState, onMessage, onError, onPeerLeft, iceServers = [] } = {}) {
  if (!webrtcSupported()) {
    onError?.(P2P_ERROR.UNSUPPORTED)
    return null
  }

  const sessionId = shortCode(4)
  let pc = null
  let channel = null
  let state = P2P_STATE.IDLE
  let closed = false
  let outSeq = 0
  const seenSeq = new Set()

  let connectTimer = null
  let heartbeatTimer = null
  let lastPongAt = 0

  const setState = (next, detail) => {
    if (closed && next !== P2P_STATE.CLOSED) return
    if (state === next) return
    state = next
    onState?.(next, detail)
  }

  const clearTimers = () => {
    if (connectTimer) {
      clearTimeout(connectTimer)
      connectTimer = null
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const startHeartbeat = () => {
    lastPongAt = Date.now()
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      if (closed) return
      // A DataChannel can stay "open" while the peer has physically walked out
      // of wifi range. Heartbeats are how we notice within a few seconds, which
      // matters when the drill is scoring response time.
      if (Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) {
        setState(P2P_STATE.DISCONNECTED, { reason: 'heartbeat' })
        onPeerLeft?.('heartbeat')
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
        return
      }
      rawSend({ kind: '__ping', payload: null })
    }, HEARTBEAT_INTERVAL_MS)
  }

  const rawSend = (envelope) => {
    if (!channel || channel.readyState !== 'open') return false
    try {
      outSeq += 1
      channel.send(JSON.stringify({ ...envelope, seq: outSeq, at: Date.now() }))
      return true
    } catch {
      return false
    }
  }

  const attachChannel = (dc) => {
    channel = dc
    channel.binaryType = 'arraybuffer'

    channel.onopen = () => {
      clearTimeout(connectTimer)
      connectTimer = null
      setState(P2P_STATE.CONNECTED, { sessionId })
      startHeartbeat()
    }

    channel.onclose = () => {
      if (closed) return
      setState(P2P_STATE.DISCONNECTED, { reason: 'channel_closed' })
      onPeerLeft?.('channel_closed')
    }

    channel.onerror = () => {
      if (closed) return
      onError?.(P2P_ERROR.CHANNEL_FAILED)
    }

    channel.onmessage = (event) => {
      let envelope
      try {
        envelope = JSON.parse(event.data)
      } catch {
        return // malformed frame from a peer we can't control; ignore it
      }
      if (!envelope || typeof envelope !== 'object' || typeof envelope.kind !== 'string') return

      // The channel is reliable and ordered, so seq is only needed to swallow
      // an accidental duplicate rather than to reassemble anything.
      if (typeof envelope.seq === 'number') {
        const key = envelope.seq
        if (seenSeq.has(key)) return
        seenSeq.add(key)
        if (seenSeq.size > 500) {
          // Bound the set; the drill is short and old seqs can't recur usefully.
          const oldest = Math.min(...seenSeq)
          seenSeq.delete(oldest)
        }
      }

      if (envelope.kind === '__ping') {
        lastPongAt = Date.now()
        rawSend({ kind: '__pong', payload: null })
        return
      }
      if (envelope.kind === '__pong') {
        lastPongAt = Date.now()
        return
      }
      if (envelope.kind === '__bye') {
        setState(P2P_STATE.DISCONNECTED, { reason: 'peer_left' })
        onPeerLeft?.('peer_left')
        return
      }

      lastPongAt = Date.now()
      onMessage?.(envelope)
    }
  }

  const buildConnection = () => {
    pc = new RTCPeerConnection({ iceServers: Array.isArray(iceServers) ? iceServers : [] })

    pc.onconnectionstatechange = () => {
      if (closed || !pc) return
      const cs = pc.connectionState
      if (cs === 'failed') {
        setState(P2P_STATE.FAILED, { reason: 'connection_failed' })
        onError?.(P2P_ERROR.ICE_FAILED)
      } else if (cs === 'disconnected') {
        setState(P2P_STATE.DISCONNECTED, { reason: 'ice_disconnected' })
      }
    }

    pc.ondatachannel = (event) => attachChannel(event.channel)
  }

  /** Resolve once ICE gathering finishes, or after a timeout — whichever first. */
  const waitForIce = () =>
    new Promise((resolve) => {
      if (!pc || pc.iceGatheringState === 'complete') {
        resolve()
        return
      }
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        pc?.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
      const check = () => {
        if (pc?.iceGatheringState === 'complete') done()
      }
      pc.addEventListener('icegatheringstatechange', check)
      // Waiting forever would hang the UI on networks that never finish
      // gathering; whatever candidates we have by now are the ones that matter.
      setTimeout(done, ICE_GATHER_TIMEOUT_MS)
    })

  const armConnectTimeout = () => {
    if (connectTimer) clearTimeout(connectTimer)
    connectTimer = setTimeout(() => {
      if (closed || state === P2P_STATE.CONNECTED) return
      setState(P2P_STATE.FAILED, { reason: 'timeout' })
      onError?.(P2P_ERROR.TIMEOUT)
    }, CONNECT_TIMEOUT_MS)
  }

  return {
    role,
    sessionId,
    get state() {
      return state
    },
    get connected() {
      return state === P2P_STATE.CONNECTED && channel?.readyState === 'open'
    },

    /** HOST: produce the code the buddy scans first. */
    async createOffer() {
      if (role !== P2P_ROLE.HOST) throw new Error(P2P_ERROR.WRONG_ROLE)
      if (state === P2P_STATE.CONNECTED) throw new Error(P2P_ERROR.ALREADY_CONNECTED)

      setState(P2P_STATE.CREATING_OFFER)
      buildConnection()
      attachChannel(pc.createDataChannel('jaagruk-drill', { ordered: true }))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIce()

      const signal = await packSignal({
        role: P2P_ROLE.HOST,
        sessionId,
        sdp: pc.localDescription.sdp,
        type: 'offer',
      })

      setState(P2P_STATE.AWAITING_ANSWER)
      armConnectTimeout()
      return signal
    },

    /** GUEST: consume the host's code and produce the reply code. */
    async acceptOffer(signalText) {
      if (role !== P2P_ROLE.GUEST) throw new Error(P2P_ERROR.WRONG_ROLE)

      const parsed = await unpackSignal(signalText)
      if (!parsed || parsed.type !== 'offer') throw new Error(P2P_ERROR.BAD_SIGNAL)

      setState(P2P_STATE.CREATING_ANSWER)
      buildConnection()

      await pc.setRemoteDescription({ type: 'offer', sdp: parsed.sdp })
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await waitForIce()

      const signal = await packSignal({
        role: P2P_ROLE.GUEST,
        sessionId: parsed.sessionId,
        sdp: pc.localDescription.sdp,
        type: 'answer',
      })

      setState(P2P_STATE.CONNECTING)
      armConnectTimeout()
      return signal
    },

    /** HOST: consume the buddy's reply code to complete the handshake. */
    async acceptAnswer(signalText) {
      if (role !== P2P_ROLE.HOST) throw new Error(P2P_ERROR.WRONG_ROLE)
      if (!pc) throw new Error(P2P_ERROR.BAD_SIGNAL)

      const parsed = await unpackSignal(signalText)
      if (!parsed || parsed.type !== 'answer') throw new Error(P2P_ERROR.BAD_SIGNAL)

      await pc.setRemoteDescription({ type: 'answer', sdp: parsed.sdp })
      setState(P2P_STATE.CONNECTING)
    },

    send(kind, payload) {
      return rawSend({ kind, payload })
    },

    close() {
      if (closed) return
      rawSend({ kind: '__bye', payload: null })
      closed = true
      clearTimers()
      try {
        channel?.close()
      } catch {
        /* ignore */
      }
      try {
        pc?.close()
      } catch {
        /* ignore */
      }
      channel = null
      pc = null
      state = P2P_STATE.CLOSED
      onState?.(P2P_STATE.CLOSED, { reason: 'local_close' })
    },
  }
}

/* ================================================================== */
/* Same-device fallback                                                */
/* ================================================================== */

/**
 * Two-tab loopback peer over BroadcastChannel, exposing the same interface as
 * createPeer.
 *
 * This is not a substitute for the real thing — it exists so the buddy drill is
 * demonstrable and testable on one machine (open the page in two tabs), and so
 * a judge can see the coordination scoring work without two phones on a
 * hotspot. The UI labels it as same-device mode rather than pretending.
 */
export function createLoopbackPeer({ room = 'jaagruk-loopback', role = P2P_ROLE.HOST, onState, onMessage, onPeerLeft } = {}) {
  if (typeof BroadcastChannel === 'undefined') return null

  const peerId = randomId(6)
  const bc = new BroadcastChannel(room)
  let state = P2P_STATE.CONNECTING
  let closed = false
  let outSeq = 0
  let partnerId = null
  let announceTimer = null

  const setState = (next, detail) => {
    if (state === next) return
    state = next
    onState?.(next, detail)
  }

  const post = (kind, payload) => {
    if (closed) return false
    outSeq += 1
    try {
      bc.postMessage({ from: peerId, role, kind, payload, seq: outSeq, at: Date.now() })
      return true
    } catch {
      return false
    }
  }

  bc.onmessage = (event) => {
    const msg = event.data
    if (!msg || msg.from === peerId) return

    if (msg.kind === '__hello') {
      partnerId = msg.from
      post('__hello_ack', null)
      setState(P2P_STATE.CONNECTED, { sessionId: room, loopback: true })
      return
    }
    if (msg.kind === '__hello_ack') {
      partnerId = msg.from
      setState(P2P_STATE.CONNECTED, { sessionId: room, loopback: true })
      return
    }
    if (msg.kind === '__bye') {
      setState(P2P_STATE.DISCONNECTED, { reason: 'peer_left' })
      onPeerLeft?.('peer_left')
      return
    }
    if (msg.kind?.startsWith('__')) return

    onMessage?.({ kind: msg.kind, payload: msg.payload, seq: msg.seq, at: msg.at })
  }

  // Announce repeatedly until a partner answers, since the other tab may open
  // after this one.
  post('__hello', null)
  announceTimer = setInterval(() => {
    if (closed || partnerId) {
      clearInterval(announceTimer)
      announceTimer = null
      return
    }
    post('__hello', null)
  }, 800)

  return {
    role,
    sessionId: room,
    loopback: true,
    get state() {
      return state
    },
    get connected() {
      return state === P2P_STATE.CONNECTED
    },
    async createOffer() {
      return `loopback:${room}`
    },
    async acceptOffer() {
      return `loopback:${room}`
    },
    async acceptAnswer() {},
    send(kind, payload) {
      return post(kind, payload)
    },
    close() {
      if (closed) return
      post('__bye', null)
      closed = true
      if (announceTimer) clearInterval(announceTimer)
      try {
        bc.close()
      } catch {
        /* ignore */
      }
      state = P2P_STATE.CLOSED
      onState?.(P2P_STATE.CLOSED, { reason: 'local_close' })
    },
  }
}

/* ================================================================== */
/* QR scanning                                                         */
/* ================================================================== */

/**
 * Read a QR code from a video element.
 *
 * Uses the native BarcodeDetector where present (Chrome on Android, which is
 * the target platform). Where it isn't, callers fall back to the paste-the-code
 * path — a text field is unglamorous but it always works, and a drill that
 * can't start is worse than one that starts slowly.
 */
export function barcodeDetectionSupported() {
  try {
    return typeof BarcodeDetector !== 'undefined'
  } catch {
    return false
  }
}

export async function createQrScanner({ video, onResult, onError, intervalMs = 350 } = {}) {
  if (!barcodeDetectionSupported()) {
    onError?.('QR_UNSUPPORTED')
    return null
  }

  let detector
  try {
    const formats = await BarcodeDetector.getSupportedFormats?.()
    if (formats && !formats.includes('qr_code')) {
      onError?.('QR_UNSUPPORTED')
      return null
    }
    detector = new BarcodeDetector({ formats: ['qr_code'] })
  } catch {
    onError?.('QR_UNSUPPORTED')
    return null
  }

  let timer = null
  let busy = false
  let stopped = false

  const tick = async () => {
    if (stopped || busy || !video || video.readyState < 2) return
    busy = true
    try {
      const codes = await detector.detect(video)
      if (codes?.length) {
        const value = codes[0].rawValue
        if (value) onResult?.(value)
      }
    } catch {
      // Detection throws on some frames (zero-size, decode hiccup). Not fatal.
    } finally {
      busy = false
    }
  }

  timer = setInterval(tick, intervalMs)

  return {
    stop() {
      stopped = true
      if (timer) clearInterval(timer)
      timer = null
    },
  }
}
