import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { verifyScannedCertificate, encodeCertQr, getRecordByCertId, CHAIN_STATUS } from '../lib/chain.js'
import { verifyCertificate } from '../lib/certificate.js'
import { barcodeDetectionSupported } from '../lib/p2p.js'
import { isOnline } from '../lib/sync.js'
import QrScanner from '../components/QrScanner.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Certificate verification, offline.
 *
 * An inspector standing at a pit head with no signal needs to answer four
 * separate questions, and collapsing them into one valid/invalid badge would hide
 * the interesting cases:
 *
 *   1. Is the record intact and correctly signed?  (works from the QR alone)
 *   2. Is the signing device one this phone trusts?
 *   3. Is the record present in this phone's ledger?
 *   4. Does it link correctly into that chain?
 *
 * A certificate can be genuinely signed but issued by a device this phone has
 * never met — that is not forgery, it is a different site. Saying so precisely is
 * more useful than a red cross.
 */

export default function Verify() {
  const { certId } = useParams()
  const { t } = useLanguage()

  const [result, setResult] = useState(null)
  const [pasted, setPasted] = useState('')
  const [checking, setChecking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)

  /* ---------------- deep link by id ---------------- */

  const checkById = useCallback(async (id) => {
    setChecking(true)
    setNotFound(false)
    try {
      const local = await verifyCertificate(id)
      if (!local.found) {
        setNotFound(true)
        setResult(null)
        return
      }
      // Re-run the QR path so both routes produce the same shape.
      const record = await getRecordByCertId(id)
      const scanned = await verifyScannedCertificate(encodeCertQr(record))
      setResult(scanned)
    } catch {
      setNotFound(true)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (certId) checkById(certId)
  }, [certId, checkById])

  /* ---------------- scan / paste ---------------- */

  const checkPayload = useCallback(async (text) => {
    setChecking(true)
    setNotFound(false)
    setScanning(false)
    try {
      setResult(await verifyScannedCertificate(text))
    } catch {
      setResult({ found: false, reason: 'UNREADABLE' })
    } finally {
      setChecking(false)
    }
  }, [])

  /* ---------------- render ---------------- */

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3 text-center">{t('verify_eyebrow')}</p>
      <h1 className="font-display font-bold text-3xl md:text-4xl uppercase mb-3 text-center">{t('verify_title')}</h1>

      <p className="font-mono text-[10px] uppercase tracking-widest text-center mb-8 flex items-center justify-center gap-2">
        <Pictogram name={isOnline() ? 'correct' : 'warning'} size={14} />
        <span className="text-safe">{t('vf_offline_ok')}</span>
      </p>

      {checking && (
        <p className="font-mono text-xs text-concrete uppercase tracking-widest text-center py-8">
          {t('loading_label')}
        </p>
      )}

      {/* Input, when there is no result yet */}
      {!checking && !result && (
        <>
          {notFound && (
            <div className="bg-hazard/10 border-2 border-hazard rounded-lg p-6 text-center mb-8">
              <Pictogram name="incorrect" size={44} className="mx-auto mb-3" />
              <p className="font-bold text-hazard uppercase tracking-widest text-sm mb-2">{t('verify_invalid')}</p>
              <p className="text-concrete text-sm">{t('verify_invalid_desc')}</p>
            </div>
          )}

          <p className="text-sm text-concrete mb-5 text-center">{t('vf_scan_or_paste')}</p>

          {scanning ? (
            <QrScanner onResult={checkPayload} height={280} />
          ) : (
            <button
              type="button"
              onClick={() => setScanning(true)}
              disabled={!barcodeDetectionSupported()}
              className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-4 rounded mb-4 disabled:opacity-40"
            >
              {t('ad_tab_verify')}
            </button>
          )}

          {!barcodeDetectionSupported() && (
            <p className="font-mono text-[11px] text-concrete text-center mb-4">{t('bd_qr_unsupported')}</p>
          )}

          <div className="mt-5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-concrete block mb-2">
              {t('bd_paste_instead')}
            </label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={t('vf_paste_placeholder')}
              rows={4}
              className="w-full bg-steel border border-steel-lighter rounded px-3 py-2 font-mono text-[11px] focus:border-amber outline-none"
            />
            <button
              type="button"
              onClick={() => checkPayload(pasted)}
              disabled={pasted.trim().length < 20}
              className="w-full border border-concrete rounded py-3 font-mono text-sm mt-3 hover:border-amber hover:text-amber disabled:opacity-40"
            >
              {t('vf_check_now')}
            </button>
          </div>
        </>
      )}

      {/* Result */}
      {!checking && result && (
        <>
          {!result.found ? (
            <div className="bg-hazard/10 border-2 border-hazard rounded-lg p-8 text-center">
              <Pictogram name="incorrect" size={52} className="mx-auto mb-4" />
              <p className="font-bold text-hazard uppercase tracking-widest text-sm mb-2">{t('vf_unreadable')}</p>
              <p className="text-concrete text-sm">{t('verify_invalid_desc')}</p>
            </div>
          ) : (
            <VerifyResult result={result} t={t} />
          )}

          <button
            type="button"
            onClick={() => {
              setResult(null)
              setPasted('')
              setNotFound(false)
            }}
            className="w-full border border-concrete rounded py-3 font-mono text-sm mt-6 hover:border-amber hover:text-amber"
          >
            {t('ad_tab_verify')}
          </button>
        </>
      )}

      <div className="text-center mt-10">
        <Link to="/" className="text-amber underline text-sm">
          {t('nav_home')}
        </Link>
      </div>
    </div>
  )
}

/* ================================================================== */

function VerifyResult({ result, t }) {
  const cert = result.described
  const genuine = result.selfValid

  return (
    <div>
      {/* Headline verdict — is the record itself intact and signed? */}
      <div
        className="rounded-lg p-8 text-center mb-6"
        style={{
          background: genuine ? 'rgba(46,125,79,0.1)' : 'rgba(217,48,37,0.1)',
          border: `2px solid{genuine ? '#2E7D4F' : '#D93025'}`,
        }}
      >
        <Pictogram name={genuine ? 'correct' : 'incorrect'} size={56} className="mx-auto mb-4" />
        <p
          className="font-bold uppercase tracking-widest text-sm mb-4"
          style={{ color: genuine ? '#2E7D4F' : '#D93025' }}
        >
          {genuine ? t('vf_genuine') : t('vf_tampered')}
        </p>

        {cert && (
          <>
            <h2 className="font-display font-bold text-2xl uppercase mb-1">{cert.workerName}</h2>
            <p className="text-concrete text-xs font-mono">
              {t('verify_issued')} {new Date(cert.issuedAt).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      {/* The three independent signals */}
      <div className="border border-steel-lighter rounded-lg divide-y divide-steel-lighter mb-6">
        <SignalRow
          ok={result.signerKnown}
          okText={t('vf_signer_known')}
          warnText={t('vf_signer_unknown')}
          neutral
        />
        <SignalRow
          ok={result.chainLinked}
          okText={t('vf_in_ledger')}
          warnText={t('vf_not_in_ledger')}
          neutral={!result.presentLocally}
        />
      </div>

      {/* Specific failures, named */}
      {result.selfIssues?.length > 0 && (
        <div className="bg-hazard/10 border border-hazard/40 rounded-lg p-4 mb-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-hazard mb-2">{t('verify_invalid')}</p>
          <ul className="space-y-1">
            {result.selfIssues.map((issue) => (
              <li key={issue} className="text-xs text-concrete flex items-start gap-2">
                <Pictogram name="warning" size={14} />
                {t(`chain_${issue}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.chainIssues?.length > 0 && result.presentLocally && (
        <div className="bg-amber/10 border border-amber/40 rounded-lg p-4 mb-6">
          <ul className="space-y-1">
            {result.chainIssues
              .filter((i) => i !== CHAIN_STATUS.OK)
              .map((issue) => (
                <li key={issue} className="text-xs text-concrete flex items-start gap-2">
                  <Pictogram name="warning" size={14} />
                  {t(`chain_${issue}`)}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Domain detail */}
      {cert && (
        <div className="border border-steel-lighter rounded-lg p-5 mb-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-concrete mb-4">
            {t('cert_domains_passed')}
          </p>
          <div className="space-y-2">
            {cert.domains.map((d) => (
              <div key={d.domain} className="flex justify-between items-center text-sm gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  {d.hesitation && <Pictogram name="slow" size={15} />}
                  <span className="truncate">{d.domain}</span>
                </span>
                <span className="font-mono text-amber font-bold shrink-0">{d.readiness}%</span>
              </div>
            ))}
          </div>

          <div className="border-t border-steel-lighter mt-4 pt-4 flex justify-between text-sm">
            <span className="font-bold">{t('cert_readiness_now')}</span>
            <span className="font-mono text-amber font-bold">{cert.avgReadiness}%</span>
          </div>

          {cert.hesitationCount > 0 && (
            <p className="font-mono text-[10px] text-amber mt-3">
              {cert.hesitationCount} · {t('db_flagged_slow')}
            </p>
          )}
        </div>
      )}

      {/* Ledger detail */}
      {cert && (
        <div className="border border-steel-lighter rounded-lg p-5 space-y-2">
          <Detail label={t('cert_chain_position')} value={`#${cert.seq}`} />
          <Detail label={t('cert_record_hash')} value={cert.hash.slice(0, 40)} mono />
          <Detail label={t('cert_prev_hash')} value={cert.prevHash.slice(0, 40)} mono />
          <Detail label="ID" value={cert.certId} mono />
        </div>
      )}
    </div>
  )
}

function SignalRow({ ok, okText, warnText, neutral }) {
  const color = ok ? '#2E7D4F' : neutral ? '#FFB020' : '#D93025'
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <Pictogram name={ok ? 'correct' : 'warning'} size={20} />
      <p className="text-xs leading-relaxed" style={{ color }}>
        {ok ? okText : warnText}
      </p>
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-concrete shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-chalk break-all text-right`}>{value}</span>
    </div>
  )
}


