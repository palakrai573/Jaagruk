import { useState, useEffect, useCallback } from 'react'
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
import {
  Button,
  Card,
  Badge,
  Progress,
  Reveal,
  Skeleton,
  SkeletonText,
  EmptyState,
  ErrorState,
  useToast,
} from '../components/ui/index.js'

/**
 * Certification.
 *
 * The certificate carries its entire signed record inside the QR, so a DGMS
 * inspector can verify it with no network and no copy of the ledger — the specific
 * gap the problem statement names.
 *
 * Eligibility is gated on DECAYED readiness, so this page can move a worker from
 * eligible back to not-eligible with nothing having changed except the calendar.
 * That is the point, and the copy says so rather than leaving it to be discovered.
 *
 * PHASE 2b: presentation only. Every branch of the issuance path is unchanged —
 * this is the record that gets hashed and signed, so it is not a place to be
 * refactoring logic at the same time as restyling.
 */

export default function Certification() {
  const { t } = useLanguage()
  const toast = useToast()

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
        // Scoped to this worker. An earlier build showed certificates[0] — the
        // newest certificate on the device regardless of owner — so on a shared
        // site phone a worker saw somebody else's certificate under their name.
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
  const rows = Object.values(progress)

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
      toast.success(t('cert_issued_label'), t('cert_offline_note'))
    } catch {
      setError('ad_import_failed')
    } finally {
      setIssuing(false)
    }
  }

  if (loading) return <CertificationSkeleton />

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">
      <Reveal>
        <p className="font-mono text-2xs tracking-[0.22em] uppercase text-brand-text mb-3">{t('cert_eyebrow')}</p>
        <h1 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-tight text-balance mb-3">
          {t('cert_title')}
        </h1>
        <p className="text-ink-secondary max-w-xl leading-relaxed text-pretty mb-8">{t('cert_desc')}</p>
      </Reveal>

      <Reveal index={1}>
        <ComplianceSummary compliance={compliance} eligible={eligible} t={t} />
      </Reveal>

      <Reveal index={2}>
        <p className="text-xs text-ink-tertiary leading-relaxed max-w-xl mt-4 mb-8">{t('cert_decay_note')}</p>
      </Reveal>

      <ol className="space-y-2.5 mb-10">
        {rows.map((row, i) => (
          <Reveal as="li" key={row.domain} index={i} step={40}>
            <DomainRow row={row} t={t} />
          </Reveal>
        ))}
      </ol>

      {!worker && (
        <Card className="mb-8 p-6">
          <div className="flex items-start gap-4">
            <Pictogram name="ppe" size={36} />
            <div className="min-w-0">
              <p className="font-display font-bold text-lg uppercase mb-2">{t('cert_sign_in_first')}</p>
              <p className="text-sm text-ink-secondary leading-relaxed mb-5">{t('cert_sign_in_why')}</p>
              <Button to="/start" size="md">
                {t('ob_sign_in')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {worker && !eligible && (
        <Card className="mb-8">
          <EmptyState
            icon={<Pictogram name="slow" size={40} />}
            title={t('cert_not_eligible')}
            body={t('cert_pass_threshold') + ' ' + PASS_THRESHOLD + '%'}
            action={
              <Button to="/train" variant="secondary" size="md">
                {t('nav_train')}
              </Button>
            }
          />
        </Card>
      )}

      {worker && eligible && (
        <Card accent="safe" className="mb-8 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="min-w-0">
              <p className="font-display font-bold text-xl uppercase tracking-tight mb-1">
                {t('cert_eligible_title')}
              </p>
              <p className="font-mono text-sm text-ink-secondary truncate">{worker.name}</p>
            </div>
            <Badge tone="safe" dot>
              {compliance.passedCount}/{compliance.totalDomains}
            </Badge>
          </div>

          {cert && <p className="text-xs text-ink-tertiary leading-relaxed mb-4">{t('cert_existing_note')}</p>}

          {/* A certificate signed with the HMAC fallback cannot be verified by
              another device, which is a materially weaker guarantee. The worker is
              told before issuing, not after. */}
          {cryptoWarning === 'HMAC_FALLBACK' && (
            <div className="bg-warning-subtle border border-warning-border rounded-lg p-3 mb-4 flex items-start gap-3">
              <Pictogram name="warning" size={20} />
              <p className="text-xs text-ink-secondary leading-relaxed">{t('cert_weak_crypto')}</p>
            </div>
          )}

          <Button onClick={handleIssue} loading={issuing} size="lg" fullWidth>
            {cert ? t('cert_issue_again') : t('cert_issue_btn')}
          </Button>
        </Card>
      )}

      {error && (
        <ErrorState
          className="mb-8"
          icon={<Pictogram name="warning" size={32} />}
          title={t('error_label')}
          body={t(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refresh}>
              {t('retry_label')}
            </Button>
          }
        />
      )}

      {cert && <CertificateCard cert={cert} t={t} />}
    </div>
  )
}

/* ================================================================== */

function CertificationSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">
      <Skeleton className="h-2.5 w-28 mb-4" />
      <Skeleton className="h-9 w-3/4 mb-4" />
      <SkeletonText lines={2} className="max-w-xl mb-8" />

      <div className="bg-surface-1 border border-line-subtle rounded-xl p-6 mb-8 flex items-center gap-8 flex-wrap">
        <Skeleton className="w-32 h-32" rounded="full" />
        <div className="flex-1 min-w-[180px] space-y-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-3 w-full" rounded="full" />
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" rounded="lg" />
        ))}
      </div>
    </div>
  )
}

function ComplianceSummary({ compliance, eligible, t }) {
  const tone = eligible ? 'safe' : compliance.avgReadiness >= 45 ? 'warning' : 'hazard'

  return (
    <Card accent={tone} className="p-5 md:p-6">
      {/* Column-stacked below sm. The previous layout used flex-wrap with a
          220px minimum, which at 320px forced the ring and the figures into a
          cramped two-up that overflowed. */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8">
        <div className="shrink-0">
          <ReadinessRing readiness={compliance.avgReadiness} size={128} showBreakdown={false} />
        </div>

        <div className="flex-1 min-w-0 w-full text-center sm:text-start">
          <div className="font-display font-bold text-2xl text-ink tabular-nums leading-none mb-1.5">
            {compliance.passedCount}
            <span className="text-ink-disabled">/{compliance.totalDomains}</span>
          </div>
          <p className="font-mono text-2xs text-ink-tertiary uppercase tracking-widest mb-5">
            {t('cert_domains_passed')}
          </p>

          <Progress value={compliance.percent} tone={tone} size="lg" showValue />

          <p className="font-mono text-2xs text-ink-tertiary mt-2.5">
            {t('cert_pass_threshold')} {PASS_THRESHOLD}%
          </p>

          {compliance.hesitationDomains.length > 0 && (
            <div className="mt-4 flex justify-center sm:justify-start">
              <Badge tone="warning" icon={<Pictogram name="slow" size={12} />}>
                {compliance.hesitationDomains.length} · {t('db_flagged_slow')}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * One domain.
 *
 * Shows the decayed figure as the headline number with the original beside it when
 * they differ, because "82% (was 91%)" is the sentence that explains why a worker
 * who passed is being asked to refresh. Previously the decay note was easy to miss.
 */
function DomainRow({ row, t }) {
  const decayed = row.readiness > 0 && row.effectiveReadiness < row.readiness
  const attempted = row.attempts > 0
  const tone = row.passed ? 'safe' : attempted ? 'warning' : 'neutral'

  const TEXT = {
    safe: 'text-safe-text',
    warning: 'text-warning-text',
    neutral: 'text-ink-disabled',
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3.5">
        {/* Status disc. Semantic fill, and the check only appears on a pass so the
            state is readable without relying on colour alone. */}
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            row.passed ? 'bg-safe' : 'bg-surface-3 border border-line'
          }`}
          aria-hidden="true"
        >
          {row.passed ? <Pictogram name="correct" size={16} /> : null}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-ink leading-snug">{row.domain}</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            {!attempted && (
              <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">
                {t('cert_not_attempted')}
              </span>
            )}
            {attempted && !row.passed && (
              <Badge tone="hazard" size="sm">
                {t('cert_retry_needed')}
              </Badge>
            )}
            {row.everHesitated && (
              <Badge tone="warning" size="sm" icon={<Pictogram name="slow" size={11} />}>
                {t('db_flagged_slow')}
              </Badge>
            )}
            {row.legacyOnly && attempted && (
              <Badge tone="neutral" size="sm">
                {t('as_grade_unknown')}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-end shrink-0">
          <span className={`font-mono text-lg font-bold tabular-nums ${TEXT[tone]}`}>
            {attempted ? `${row.effectiveReadiness}%` : '—'}
          </span>
          {decayed && (
            <p className="font-mono text-2xs text-ink-tertiary mt-0.5 whitespace-nowrap">
              {t('db_decayed_from')} {row.readiness}%
            </p>
          )}
        </div>
      </div>

      {attempted && (
        <div className="mt-3.5">
          <Progress value={row.effectiveReadiness} tone={row.passed ? 'safe' : 'warning'} size="sm" />
        </div>
      )}
    </Card>
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
    <Reveal>
      {/* print-card is kept: certificates are printed as physical records for a
          site file, and index.css strips the app chrome for that. */}
      <div className="bg-surface-1 border-2 border-brand-border rounded-xl overflow-hidden print-card">
        <div className="bg-brand-subtle border-b border-brand-border px-6 py-4 text-center">
          <p className="font-mono text-2xs uppercase tracking-[0.22em] text-brand-text">{t('cert_issued_label')}</p>
        </div>

        <div className="p-6 md:p-8 text-center">
          <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-balance mb-3">
            {cert.workerName}
          </h2>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-1">
            <span className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary">
              {t('cert_readiness_now')}
            </span>
            <span className="font-mono text-xl font-bold text-safe-text tabular-nums">{cert.avgReadiness}%</span>
          </div>

          <p className="font-mono text-xs text-ink-tertiary mb-7">
            {new Date(cert.issuedAt).toLocaleDateString()}
          </p>

          {/* The breakdown as issued — a snapshot, not the live figures, which is
              what makes the record meaningful later. */}
          <dl className="text-start space-y-2 border-t border-line-subtle pt-5 mb-6">
            {cert.domains.map((d) => (
              <div key={d.domain} className="flex justify-between items-center gap-3 text-sm">
                <dt className="flex items-center gap-2 min-w-0">
                  {d.hesitation && <Pictogram name="slow" size={15} />}
                  <span className="truncate text-ink-secondary">{d.domain}</span>
                </dt>
                <dd className="font-mono font-bold text-ink shrink-0 tabular-nums">{d.readiness}%</dd>
              </div>
            ))}
          </dl>

          {qrError ? (
            <p className="font-mono text-xs text-hazard-text mb-4">{t('vf_unreadable')}</p>
          ) : (
            <>
              {/* Always on white, in both themes. A QR on a dark surface is a QR
                  most scanners refuse, and this one has to work at a pit head. */}
              <div className="bg-white rounded-lg p-4 inline-block mb-3">
                <QRCodeSVG value={qrPayload} size={188} level="L" />
              </div>
              <p className="text-xs text-ink-tertiary max-w-xs mx-auto mb-6 leading-relaxed">
                {t('cert_offline_note')}
              </p>
            </>
          )}

          {/* Ledger position — what makes tampering detectable. */}
          <dl className="border-t border-line-subtle pt-5 text-start space-y-2 mb-5">
            <LedgerLine label={t('cert_chain_position')} value={`#${cert.seq}`} />
            <LedgerLine label={t('cert_record_hash')} value={cert.hash.slice(0, 32)} mono />
            <LedgerLine label={t('cert_prev_hash')} value={cert.prevHash.slice(0, 32)} mono />
          </dl>

          <p className="font-mono text-2xs text-ink-tertiary break-all mb-6">{cert.certId}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center no-print">
            <Button to={`/verify/${cert.certId}`} variant="secondary" size="md">
              {t('cert_view_verification')}
            </Button>
            <Button onClick={() => window.print()} size="md">
              {t('cert_print')}
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

function LedgerLine({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary shrink-0">{label}</dt>
      <dd className={`${mono ? 'font-mono' : ''} text-ink-secondary break-all text-end`}>{value}</dd>
    </div>
  )
}
