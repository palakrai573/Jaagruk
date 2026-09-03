import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { verifyScannedCertificate, encodeCertQr, getRecordByCertId, CHAIN_STATUS } from '../lib/chain.js'
import { verifyCertificate } from '../lib/certificate.js'
import { barcodeDetectionSupported } from '../lib/p2p.js'
import QrScanner from '../components/QrScanner.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'
import {
  Button,
  Card,
  Badge,
  Reveal,
  Skeleton,
  SkeletonText,
  TextAreaField,
} from '../components/ui/index.js'

/**
 * Certificate verification, offline.
 *
 * An inspector at a pit head with no signal needs FOUR separate answers, and
 * collapsing them into one valid/invalid badge hides the interesting cases:
 *
 *   1. Is the record intact and correctly signed?   (from the QR alone)
 *   2. Is the signing device one this phone trusts?
 *   3. Is the record present in this phone's ledger?
 *   4. Does it link correctly into that chain?
 *
 * A certificate can be genuinely signed but issued by a device this phone has
 * never met. That is not forgery, it is a different site — and saying so precisely
 * is more useful than a red cross.
 *
 * PHASE 2b fixed two things here. The verdict panel's border was built from a
 * template literal missing its `$`, so the string `2px solid{...}` was emitted as
 * a border value — invalid CSS, meaning the most important panel in the app had no
 * border at all. And signals 3 and 4 were folded into one row, so "not in this
 * ledger" and "links incorrectly" were indistinguishable; they are now separate,
 * matching the four documented above.
 */

export default function Verify() {
  const { certId } = useParams()
  const { t } = useLanguage()

  const [result, setResult] = useState(null)
  const [pasted, setPasted] = useState('')
  const [checking, setChecking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)

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
      // Re-run the QR path so a deep link and a scan produce the same shape.
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

  const reset = () => {
    setResult(null)
    setPasted('')
    setNotFound(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 md:py-14">
      <Reveal>
        <div className="text-center mb-8">
          <p className="font-mono text-2xs tracking-[0.22em] uppercase text-brand-text mb-3">{t('verify_eyebrow')}</p>
          <h1 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-tight text-balance mb-4">
            {t('verify_title')}
          </h1>

          {/* This badge is the pitch, not decoration: verification does not depend
              on connectivity, so it says so unconditionally rather than reporting
              the current network state. */}
          <div className="flex justify-center">
            <Badge tone="safe" icon={<Pictogram name="correct" size={13} />}>
              {t('vf_offline_ok')}
            </Badge>
          </div>
        </div>
      </Reveal>

      {checking && <VerifySkeleton />}

      {!checking && !result && (
        <>
          {notFound && (
            <Card accent="hazard" className="mb-8">
              <div className="p-6 text-center">
                <Pictogram name="incorrect" size={44} className="mx-auto mb-3" />
                <p className="font-display font-bold text-lg uppercase tracking-wide text-hazard-text mb-2">
                  {t('verify_invalid')}
                </p>
                <p className="text-sm text-ink-secondary leading-relaxed">{t('verify_invalid_desc')}</p>
              </div>
            </Card>
          )}

          <p className="text-sm text-ink-secondary mb-5 text-center">{t('vf_scan_or_paste')}</p>

          {scanning ? (
            <QrScanner onResult={checkPayload} height={280} />
          ) : (
            <Button
              onClick={() => setScanning(true)}
              disabled={!barcodeDetectionSupported()}
              size="field"
              icon={<Pictogram name="correct" size={20} />}
            >
              {t('ad_tab_verify')}
            </Button>
          )}

          {!barcodeDetectionSupported() && (
            <p className="font-mono text-xs text-ink-tertiary text-center mt-3">{t('bd_qr_unsupported')}</p>
          )}

          {/* Paste is the fallback that keeps this usable on a device with no
              BarcodeDetector — which is most older Android WebViews. */}
          <div className="mt-8 pt-6 border-t border-line-subtle">
            <TextAreaField
              label={t('bd_paste_instead')}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={t('vf_paste_placeholder')}
              rows={4}
              className="font-mono"
            />
            <Button
              variant="secondary"
              onClick={() => checkPayload(pasted)}
              disabled={pasted.trim().length < 20}
              fullWidth
              size="md"
            >
              {t('vf_check_now')}
            </Button>
          </div>
        </>
      )}

      {!checking && result && (
        <>
          {!result.found ? (
            <Card accent="hazard">
              <div className="p-8 text-center">
                <Pictogram name="incorrect" size={52} className="mx-auto mb-4" />
                <p className="font-display font-bold text-xl uppercase tracking-wide text-hazard-text mb-2">
                  {t('vf_unreadable')}
                </p>
                <p className="text-sm text-ink-secondary leading-relaxed">{t('verify_invalid_desc')}</p>
              </div>
            </Card>
          ) : (
            <VerifyResult result={result} t={t} />
          )}

          <Button variant="secondary" onClick={reset} fullWidth size="md" className="mt-6">
            {t('scan_again_label')}
          </Button>
        </>
      )}
    </div>
  )
}

/* ================================================================== */

function VerifySkeleton() {
  return (
    <div>
      <Skeleton className="h-40 w-full mb-6" rounded="lg" />
      <div className="border border-line-subtle rounded-xl divide-y divide-line-subtle mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-3">
            <Skeleton className="w-5 h-5" rounded="full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <SkeletonText lines={4} />
    </div>
  )
}

function VerifyResult({ result, t }) {
  const cert = result.described
  const genuine = result.selfValid

  return (
    <div>
      {/* Signal 1 — the headline. Is the record itself intact and signed?
          Uses a token-driven accent rather than an inline style; the previous
          inline border was silently invalid. */}
      <Card accent={genuine ? 'safe' : 'hazard'} className="mb-6">
        <div className={`p-6 md:p-8 text-center ${genuine ? 'bg-safe-subtle' : 'bg-hazard-subtle'}`}>
          <Pictogram name={genuine ? 'correct' : 'incorrect'} size={56} className="mx-auto mb-4" />
          <p
            className={`font-display font-bold uppercase tracking-widest text-lg mb-4 ${
              genuine ? 'text-safe-text' : 'text-hazard-text'
            }`}
          >
            {genuine ? t('vf_genuine') : t('vf_tampered')}
          </p>

          {cert && (
            <>
              <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-balance mb-1">
                {cert.workerName}
              </h2>
              <p className="font-mono text-xs text-ink-tertiary">
                {t('verify_issued')} {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Signals 2, 3 and 4 — separately, because they answer different questions.
          Folding "not in this ledger" together with "links incorrectly" made a
          record from another site indistinguishable from a broken chain. */}
      <div className="border border-line-subtle rounded-xl divide-y divide-line-subtle mb-6 overflow-hidden">
        <SignalRow
          ok={result.signerKnown}
          okText={t('vf_signer_known')}
          warnText={t('vf_signer_unknown')}
          // Unknown signer is a caution, not a failure: it means "issued
          // elsewhere", which is normal on a multi-site deployment.
          tone={result.signerKnown ? 'safe' : 'warning'}
        />
        <SignalRow
          ok={result.presentLocally}
          okText={t('vf_in_ledger')}
          warnText={t('vf_not_in_ledger')}
          tone={result.presentLocally ? 'safe' : 'warning'}
        />
        <SignalRow
          ok={result.chainLinked}
          okText={t('chain_OK')}
          warnText={t('vf_not_in_ledger')}
          // Only a genuine failure when the record IS in this ledger. If it is not
          // here, there is nothing for it to link to and amber is the honest colour.
          tone={result.chainLinked ? 'safe' : result.presentLocally ? 'hazard' : 'warning'}
        />
      </div>

      {result.selfIssues?.length > 0 && (
        <div className="bg-hazard-subtle border border-hazard-border rounded-xl p-4 mb-6">
          <p className="font-mono text-2xs uppercase tracking-widest text-hazard-text mb-2.5">
            {t('verify_invalid')}
          </p>
          <ul className="space-y-1.5">
            {result.selfIssues.map((issue) => (
              <li key={issue} className="text-xs text-ink-secondary flex items-start gap-2 leading-relaxed">
                <Pictogram name="warning" size={14} className="shrink-0 mt-0.5" />
                {t(`chain_${issue}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.chainIssues?.length > 0 && result.presentLocally && (
        <div className="bg-warning-subtle border border-warning-border rounded-xl p-4 mb-6">
          <ul className="space-y-1.5">
            {result.chainIssues
              .filter((i) => i !== CHAIN_STATUS.OK)
              .map((issue) => (
                <li key={issue} className="text-xs text-ink-secondary flex items-start gap-2 leading-relaxed">
                  <Pictogram name="warning" size={14} className="shrink-0 mt-0.5" />
                  {t(`chain_${issue}`)}
                </li>
              ))}
          </ul>
        </div>
      )}

      {cert && (
        <Card className="p-5 mb-6">
          <p className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary mb-4">
            {t('cert_domains_passed')}
          </p>

          <dl className="space-y-2.5">
            {cert.domains.map((d) => (
              <div key={d.domain} className="flex justify-between items-center gap-3 text-sm">
                <dt className="flex items-center gap-2 min-w-0">
                  {d.hesitation && <Pictogram name="slow" size={15} className="shrink-0" />}
                  <span className="truncate text-ink-secondary">{d.domain}</span>
                </dt>
                <dd className="font-mono font-bold text-ink shrink-0 tabular-nums">{d.readiness}%</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-line-subtle mt-4 pt-4 flex justify-between items-center gap-3">
            <span className="font-bold text-sm text-ink">{t('cert_readiness_now')}</span>
            <span className="font-mono text-lg font-bold text-safe-text tabular-nums">{cert.avgReadiness}%</span>
          </div>

          {cert.hesitationCount > 0 && (
            <div className="mt-4">
              <Badge tone="warning" icon={<Pictogram name="slow" size={12} />}>
                {cert.hesitationCount} · {t('db_flagged_slow')}
              </Badge>
            </div>
          )}
        </Card>
      )}

      {cert && (
        <Card className="p-5">
          <dl className="space-y-2">
            <Detail label={t('cert_chain_position')} value={`#${cert.seq}`} />
            <Detail label={t('cert_record_hash')} value={cert.hash.slice(0, 40)} mono />
            <Detail label={t('cert_prev_hash')} value={cert.prevHash.slice(0, 40)} mono />
            <Detail label="ID" value={cert.certId} mono />
          </dl>
        </Card>
      )}
    </div>
  )
}

const SIGNAL_TEXT = {
  safe: 'text-safe-text',
  warning: 'text-warning-text',
  hazard: 'text-hazard-text',
}

function SignalRow({ ok, okText, warnText, tone }) {
  return (
    <div className="px-4 py-3.5 flex items-start gap-3">
      <Pictogram name={ok ? 'correct' : 'warning'} size={20} className="shrink-0" />
      <p className={`text-xs leading-relaxed ${SIGNAL_TEXT[tone] || SIGNAL_TEXT.warning}`}>
        {ok ? okText : warnText}
      </p>
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="font-mono text-2xs uppercase tracking-widest text-ink-tertiary shrink-0">{label}</dt>
      <dd className={`${mono ? 'font-mono' : ''} text-ink-secondary break-all text-end`}>{value}</dd>
    </div>
  )
}
