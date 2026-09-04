import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createPeer, webrtcSupported, P2P_ROLE, P2P_STATE } from '../lib/p2p.js'
import { createGossipSession } from '../lib/sync.js'
import QrScanner from './QrScanner.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Phone-to-phone record hand-off.
 *
 * THE SCENARIO THIS SOLVES: a worker certifies at the bottom of a shaft where
 * there is no network, and that record has to reach the site office. Rather than
 * waiting for the worker's own phone to see a network, a supervisor connects to it
 * underground, pulls the records across, walks up, and uploads from there.
 *
 * Pairing is the same QR handshake the buddy drill uses — no server, no internet.
 * The exchange itself is a three-step manifest/want/data protocol, so only records
 * the other side is actually missing cross the wire. Media is excluded because a
 * batch of hazard photos would blow past the data channel's frame limit.
 *
 * Nothing unverified enters the ledger: every incoming record has its signature
 * and self-hash checked before it is stored, and signer trust stays an explicit
 * decision rather than a side effect of pairing.
 */

const STAGE = {
  IDLE: 'idle',
  HOST_SHOW: 'host_show',
  HOST_SCAN: 'host_scan',
  JOIN_SCAN: 'join_scan',
  JOIN_SHOW: 'join_show',
  SYNCING: 'syncing',
  DONE: 'done',
}

export default function PeerSync({ siteId = null, onComplete }) {
  const { t } = useLanguage()

  const peerRef = useRef(null)
  const sessionRef = useRef(null)

  const [stage, setStage] = useState(STAGE.IDLE)
  const [myCode, setMyCode] = useState('')
  const [pasted, setPasted] = useState('')
  const pasteId = useId()
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState({ certs: 0, hazards: 0 })
  const [summary, setSummary] = useState(null)

  /* ---------------- teardown ---------------- */

  const teardown = useCallback(() => {
    sessionRef.current?.cancel()
    sessionRef.current = null
    peerRef.current?.close()
    peerRef.current = null
  }, [])

  useEffect(() => teardown, [teardown])

  /* ---------------- gossip ---------------- */

  const beginGossip = useCallback(
    async (peer) => {
      setStage(STAGE.SYNCING)

      const session = createGossipSession({
        peer,
        siteId,
        onProgress: (p) => {
          if (p.certs !== undefined || p.hazards !== undefined) {
            setProgress((prev) => ({
              certs: p.certs ?? prev.certs,
              hazards: p.hazards ?? prev.hazards,
            }))
          }
        },
        onComplete: (result) => {
          setSummary(result)
          setStage(STAGE.DONE)
          onComplete?.(result)
        },
      })

      sessionRef.current = session
      await session.start()
    },
    [siteId, onComplete]
  )

  const buildPeer = useCallback(
    (role) => {
      const peer = createPeer({
        role,
        onState: (state) => {
          if (state === P2P_STATE.CONNECTED) beginGossip(peer)
          if (state === P2P_STATE.FAILED) setError('bd_failed')
          if (state === P2P_STATE.DISCONNECTED && stage === STAGE.SYNCING) {
            // Partial transfer is still progress; records are content-addressed
            // so whatever arrived is valid and the rest can come next time.
            setSummary({ ...progress, reason: 'disconnected' })
            setStage(STAGE.DONE)
          }
        },
        // Gossip frames and any other traffic both arrive here; the session
        // ignores anything that is not a sync_* kind.
        onMessage: (envelope) => sessionRef.current?.handleMessage(envelope),
        onError: () => setError('bd_failed'),
      })
      peerRef.current = peer
      return peer
    },
    [beginGossip, stage, progress]
  )

  /* ---------------- pairing ---------------- */

  const startHost = async () => {
    setError(null)
    if (!webrtcSupported()) {
      setError('bd_no_webrtc')
      return
    }
    const peer = buildPeer(P2P_ROLE.HOST)
    try {
      setMyCode(await peer.createOffer())
      setStage(STAGE.HOST_SHOW)
    } catch {
      setError('bd_failed')
    }
  }

  const startJoin = () => {
    setError(null)
    if (!webrtcSupported()) {
      setError('bd_no_webrtc')
      return
    }
    buildPeer(P2P_ROLE.GUEST)
    setStage(STAGE.JOIN_SCAN)
  }

  const consumeOffer = async (text) => {
    setError(null)
    try {
      setMyCode(await peerRef.current.acceptOffer(text))
      setPasted('')
      setStage(STAGE.JOIN_SHOW)
    } catch {
      setError('bd_bad_code')
    }
  }

  const consumeAnswer = async (text) => {
    setError(null)
    try {
      await peerRef.current.acceptAnswer(text)
      setPasted('')
    } catch {
      setError('bd_bad_code')
    }
  }

  const reset = () => {
    teardown()
    setStage(STAGE.IDLE)
    setMyCode('')
    setPasted('')
    setError(null)
    setProgress({ certs: 0, hazards: 0 })
    setSummary(null)
  }

  /* ---------------- render ---------------- */

  return (
    <div className="border border-line-subtle rounded-lg p-5">
      <div className="flex items-start gap-3 mb-4">
        <Pictogram name="buddy" size={30} />
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg uppercase leading-tight">{t('ad_gossip_title')}</h3>
          <p className="text-[11px] text-ink-tertiary mt-1 leading-relaxed">{t('ad_gossip_desc')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-4 flex items-start gap-2">
          <Pictogram name="warning" size={18} />
          <div>
            <p className="text-xs text-hazard">{t(error)}</p>
            {error === 'bd_failed' && <p className="text-[11px] text-ink-tertiary mt-1">{t('bd_failed_hint')}</p>}
          </div>
        </div>
      )}

      {/* Choose a role */}
      {stage === STAGE.IDLE && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={startHost}
            className="flex-1 min-w-[140px] border border-line-subtle rounded px-4 py-3 font-mono text-xs hover:border-brand hover:text-brand-text flex items-center justify-center gap-2"
          >
            <Pictogram name="report_it" size={18} />
            {t('ps_offer')}
          </button>
          <button
            type="button"
            onClick={startJoin}
            className="flex-1 min-w-[140px] border border-line-subtle rounded px-4 py-3 font-mono text-xs hover:border-brand hover:text-brand-text flex items-center justify-center gap-2"
          >
            <Pictogram name="exit_arrow" size={18} />
            {t('ps_collect')}
          </button>
        </div>
      )}

      {/* Show my code */}
      {(stage === STAGE.HOST_SHOW || stage === STAGE.JOIN_SHOW) && (
        <>
          <p className="font-mono text-[11px] text-ink-tertiary mb-3">
            {stage === STAGE.HOST_SHOW ? t('bd_host_step1') : t('bd_join_step2')}
          </p>

          <div className="bg-white rounded-lg p-3 flex justify-center mb-3">
            <QRCodeSVG value={myCode} size={190} level="L" />
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(myCode)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              } catch {
                setCopied(false)
              }
            }}
            className="w-full border border-line-subtle rounded py-2 font-mono text-[11px] text-ink-tertiary hover:border-brand hover:text-brand-text mb-3"
          >
            {copied ? t('bd_copied') : t('bd_copy_code')}
          </button>

          {stage === STAGE.HOST_SHOW && (
            <button
              type="button"
              onClick={() => setStage(STAGE.HOST_SCAN)}
              className="w-full bg-brand text-ink-onBrand font-bold text-xs uppercase py-2.5 rounded mb-3"
            >
              {t('bd_host_step2')}
            </button>
          )}

          {stage === STAGE.JOIN_SHOW && (
            <p className="font-mono text-[11px] text-ink-tertiary text-center mb-3">{t('bd_waiting_buddy')}</p>
          )}

          <button type="button" onClick={reset} className="w-full font-mono text-[11px] text-ink-tertiary underline">
            {t('cancel_label')}
          </button>
        </>
      )}

      {/* Scan their code */}
      {(stage === STAGE.HOST_SCAN || stage === STAGE.JOIN_SCAN) && (
        <>
          <p className="font-mono text-[11px] text-ink-tertiary mb-3">
            {stage === STAGE.JOIN_SCAN ? t('bd_join_step1') : t('bd_host_step2')}
          </p>

          <QrScanner
            height={220}
            onResult={(value) => (stage === STAGE.JOIN_SCAN ? consumeOffer(value) : consumeAnswer(value))}
          />

          <label
            htmlFor={pasteId}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary block mt-4 mb-2"
          >
            {t('bd_paste_instead')}
          </label>
          <textarea
            id={pasteId}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t('bd_paste_placeholder')}
            rows={2}
            className="w-full bg-surface-0 border border-line-subtle rounded px-3 py-2 font-mono text-[10px] focus:border-brand outline-none"
          />
          <button
            type="button"
            onClick={() => (stage === STAGE.JOIN_SCAN ? consumeOffer(pasted) : consumeAnswer(pasted))}
            disabled={pasted.trim().length < 20}
            className="w-full bg-brand text-ink-onBrand font-bold text-xs uppercase py-2.5 rounded mt-2 disabled:opacity-40"
          >
            {t('bd_use_code')}
          </button>

          <button type="button" onClick={reset} className="w-full font-mono text-[11px] text-ink-tertiary underline mt-3">
            {t('cancel_label')}
          </button>
        </>
      )}

      {/* Exchanging */}
      {stage === STAGE.SYNCING && (
        <div className="text-center py-4">
          <span className="inline-flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-safe live-dot" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-safe">{t('bd_connected')}</span>
          </span>

          <div className="grid grid-cols-2 gap-3">
            <Counter label={t('ad_ledger_records')} value={progress.certs} />
            <Counter label={t('hz_eyebrow')} value={progress.hazards} />
          </div>

          <p className="font-mono text-[10px] text-ink-tertiary mt-4">{t('ps_exchanging')}</p>
        </div>
      )}

      {/* Result */}
      {stage === STAGE.DONE && summary && (
        <div className="text-center py-2">
          <Pictogram
            name={summary.reason === 'disconnected' ? 'warning' : 'correct'}
            size={40}
            className="mx-auto mb-3"
          />
          <p className="font-bold text-sm mb-3">
            {summary.reason === 'disconnected' ? t('bd_disconnected') : t('ad_sync_done')}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Counter label={t('ps_received')} value={(summary.certs || 0) + (summary.hazards || 0)} accent />
            <Counter label={t('ps_sent')} value={(summary.sent?.certs || 0) + (summary.sent?.hazards || 0)} />
          </div>

          <button
            type="button"
            onClick={reset}
            className="w-full bg-brand text-ink-onBrand font-bold text-xs uppercase py-2.5 rounded"
          >
            {t('done_label')}
          </button>
        </div>
      )}
    </div>
  )
}

function Counter({ label, value, accent }) {
  return (
    <div className="bg-surface-0 rounded p-3">
      <p className={`font-display font-bold text-2xl ${accent ? 'text-brand-text' : 'text-ink'}`}>{value}</p>
      <p className="font-mono text-[9px] text-ink-tertiary uppercase tracking-widest mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
