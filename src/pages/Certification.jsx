import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  loadDomainProgress,
  overallCompliance,
  isEligibleForCertificate,
  issueCertificate,
  latestCertificateFor,
  PASS_THRESHOLD,
} from '../lib/certificate.js'
import { listAttempts } from '../lib/assessment.js'
import { getCurrentWorker, getSignerWarning } from '../lib/identity.js'
import { encodeCertQr } from '../lib/chain.js'
import { enqueue, SYNC_KIND } from '../lib/sync.js'
import Pictogram from '../lib/pictograms.jsx'
import { ReadinessRing } from '../components/DrillUI.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Certification.
 *
 * The certificate carries its entire signed record inside the QR, so a DGMS
 * inspector can verify it with no network and no copy of the ledger — which is
 * the specific gap the problem statement names.
 *
 * Eligibility is gated on decayed readiness, so this page can move a worker from
 * eligible back to not-eligible over time without anything having changed except
 * the calendar. That is intentional.
 */

export default function Certification() {
  const { t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState(null)
  const [progress, setProgress] = useState({})
  const [cert, setCert] = useState(null)
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState(null)
  const [cryptoWarning, setCryptoWarning] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const current = await getCurrentWorker()
      setWorker(current)

      const attempts = await listAttempts(current?.id || '')
      const domainProgress = await loadDomainProgress(current?.id || '', attempts)
      setProgress(domainProgress)

      if (current?.id) {
        // Scoped to this worker. The earlier build showed certificates[0] — the
        // newest certificate on the device regardless of owner — so on a shared
        // site phone a worker saw somebody else's certificate with their name on it.
        setCert(await latestCertificateFor(current.id))
      } else {
        setCert(null)
      }

      setCryptoWarning(await getSignerWarning())
    } catch {
      setError('ad_import_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const compliance = overallCompliance(progress)
  const eligible = isEligibleForCertificate(progress)

  const handleIssue = async () => {
    if (!worker) return
    setIssuing(true)
    setError(null)
    try {
      const record = await issueCertificate(progress, worker)
      if (!record) {
        setError('cert_not_eligible')
        return
      }
      await enqueue(SYNC_KIND.CERT, record.hash, {
        hash: record.hash,
        payload: record.payload,
        sig: record.sig,
        sigAlg: record.sigAlg,
        signer: record.signer,
      })
      await refresh()
    } catch {
      setError('ad_import_failed')
    } finally {
      setIssuing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <p className="font-mono text-xs text-concrete uppercase tracking-widest">{t('loading_label')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('cert_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-2">{t('cert_title')}</h1>
      <p className="text-concrete mb-8 max-w-xl leading-relaxed">{t('cert_desc')}</p>

      {/* Compliance summary */}
      <div className="bg-steel-light border border-steel-lighter rounded-lg p-6 mb-8 flex items-center gap-8 flex-wrap">
        <ReadinessRing readiness={compliance.avgReadiness} size={128} showBreakdown={false} />

        <div className="flex-1 min-w-[220px]">
          <div className="font-display font-bold text-4xl text-amber mb-1">
            {compliance.passedCount}/{compliance.totalDomains}
          </div>
          <p className="font-mono text-[10px] text-concrete uppercase tracking-widest mb-4">
            {t('cert_domains_passed')}
          </p>

          <div className="h-3 bg-steel rounded-full overflow-hidden mb-2">
            <div className="h-full bg-amber transition-all" style={{ width: `${compliance.percent}%` }} />
          </div>
          <p className="text-xs text-concrete font-mono">
            {t('cert_pass_threshold')} {PASS_THRESHOLD}%
          </p>
        </div>
      </div>

      <p className="text-[11px] text-concrete mb-8 leading-relaxed max-w-xl">{t('cert_decay_note')}</p>

      {/* Domain checklist */}
      <div className="space-y-3 mb-10">
        {Object.values(progress).map((d) => (
          <DomainRow key={d.domain} row={d} t={t} />
        ))}
      </div>

      {/* Guest */}
      {!worker && (
        <div className="border border-steel-lighter rounded-lg p-6 mb-8 flex items-start gap-4">
          <Pictogram name="ppe" size={36} />
          <div>
            <p className="font-bold mb-2">{t('cert_sign_in_first')}</p>
            <p className="text-xs text-concrete mb-4 leading-relaxed">{t('cert_sign_in_why')}</p>
            <Link
              to="/start"
              className="inline-block bg-amber text-steel font-bold text-xs uppercase px-5 py-2.5 rounded"
            >
              {t('ob_sign_in')}
            </Link>
          </div>
        </div>
      )}

      {/* Not eligible */}
      {worker && !eligible && (
        <div className="border border-steel-lighter rounded-lg p-6 text-center text-concrete text-sm mb-8">
          {t('cert_not_eligible')}{' '}
          <Link to="/train" className="text-amber underline">
            {t('nav_train')}
          </Link>
        </div>
      )}

      {/* Issue */}
      {worker && eligible && (
        <div className="bg-steel-light border border-amber rounded-lg p-6 mb-8">
          <p className="font-bold text-lg mb-2">{t('cert_eligible_title')}</p>
          <p className="text-sm text-concrete mb-1">{worker.name}</p>
          {cert && <p className="text-xs text-concrete mb-4 leading-relaxed">{t('cert_existing_note')}</p>}

          {cryptoWarning === 'HMAC_FALLBACK' && (
            <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-4 flex items-start gap-3">
              <Pictogram name="warning" size={20} />
              <p className="text-[11px] text-concrete leading-relaxed">{t('cert_weak_crypto')}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleIssue}
            disabled={issuing}
            className="w-full bg-amber text-steel font-display font-bold text-lg uppercase py-3 rounded disabled:opacity-50 mt-2"
          >
            {issuing ? t('loading_label') : cert ? t('cert_issue_again') : t('cert_issue_btn')}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-8">
          <p className="text-xs text-hazard">{t(error)}</p>
        </div>
      )}

      {/* Certificate */}
      {cert && <CertificateCard cert={cert} t={t} />}
    </div>
  )
}

/* ================================================================== */

function DomainRow({ row, t }) {
  const decayed = row.readiness > 0 && row.effectiveReadiness < row.readiness
  const color = row.passed ? '#2E7D4F' : row.effectiveReadiness > 0 ? '#FFB020' : '#8B8F94'

  return (
    <div className="bg-steel-light border border-steel-lighter rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: row.passed ? '#2E7D4F' : '#3A3F45' }}
        >
          {row.passed && <Pictogram name="correct" size={16} />}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm">{row.domain}</p>
          <p className="font-mono text-[10px] text-concrete mt-0.5">
            {row.attempts === 0 && t('cert_not_attempted')}
            {row.attempts > 0 && !row.passed && <span className="text-hazard">{t('cert_retry_needed')}</span>}
            {row.everHesitated && <span className="text-amber"> · {t('db_flagged_slow')}</span>}
            {row.legacyOnly && row.attempts > 0 && <span> · {t('as_grade_unknown')}</span>}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span className="font-mono text-lg font-bold" style={{ color }}>
          {row.attempts > 0 ? `${row.effectiveReadiness}%` : '—'}
        </span>
        {decayed && (
          <p className="font-mono text-[10px] text-concrete">
            {t('db_decayed_from')} {row.readiness}%
          </p>
        )}
      </div>
    </div>
  )
}

function CertificateCard({ cert, t }) {
  const [qrPayload, setQrPayload] = useState('')
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    try {
      setQrPayload(encodeCertQr(cert.record))
      setQrError(false)
    } catch {
      setQrError(true)
    }
  }, [cert])

  return (
    <div className="bg-steel-light border border-amber rounded-lg p-8 text-center print-card">
      <p className="font-mono text-amber text-xs uppercase tracking-widest mb-4">{t('cert_issued_label')}</p>
      <h2 className="font-display font-bold text-3xl uppercase mb-1">{cert.workerName}</h2>

      <p className="text-concrete text-sm mb-1">
        {t('cert_readiness_now')}: <span className="text-amber font-bold">{cert.avgReadiness}%</span>
      </p>
      <p className="text-concrete text-xs font-mono mb-6">{new Date(cert.issuedAt).toLocaleDateString()}</p>

      {/* Per-domain breakdown as issued */}
      <div className="text-left space-y-2 border-t border-steel-lighter pt-5 mb-6">
        {cert.domains.map((d) => (
          <div key={d.domain} className="flex justify-between items-center text-sm gap-3">
            <span className="flex items-center gap-2 min-w-0">
              {d.hesitation && <Pictogram name="slow" size={16} />}
              <span className="truncate">{d.domain}</span>
            </span>
            <span className="font-mono text-amber font-bold shrink-0">{d.readiness}%</span>
          </div>
        ))}
      </div>

      {/* QR */}
      {qrError ? (
        <p className="font-mono text-xs text-hazard mb-4">{t('vf_unreadable')}</p>
      ) : (
        <>
          <div className="bg-white rounded-lg p-4 inline-block mb-3">
            <QRCodeSVG value={qrPayload} size={188} level="L" />
          </div>
          <p className="text-[11px] text-concrete max-w-xs mx-auto mb-4 leading-relaxed">{t('cert_offline_note')}</p>
        </>
      )}

      {/* Ledger position — what makes tampering detectable */}
      <div className="border-t border-steel-lighter pt-5 text-left space-y-2 mb-6">
        <LedgerLine label={t('cert_chain_position')} value={`#${cert.seq}`} />
        <LedgerLine label={t('cert_record_hash')} value={cert.hash.slice(0, 32)} mono />
        <LedgerLine label={t('cert_prev_hash')} value={cert.prevHash.slice(0, 32)} mono />
      </div>

      <p className="font-mono text-xs text-concrete break-all mb-6">{cert.certId}</p>

      <div className="flex gap-4 justify-center flex-wrap no-print">
        <Link
          to={`/verify/${cert.certId}`}
          className="border border-concrete rounded px-5 py-2.5 font-mono text-xs hover:border-amber hover:text-amber"
        >
          {t('cert_view_verification')}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-amber text-steel font-bold text-xs uppercase px-5 py-2.5 rounded"
        >
          {t('cert_print')}
        </button>
      </div>
    </div>
  )
}

function LedgerLine({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-concrete shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-chalk break-all text-right`}>{value}</span>
    </div>
  )
}
