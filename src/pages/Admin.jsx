import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  supervisorPinIsSet,
  setSupervisorPin,
  verifySupervisorPin,
  getActiveSiteId,
  listWorkers,
} from '../lib/identity.js'
import { CERTIFICATION_DOMAINS } from '../lib/scenarios.js'
import { getCertificates } from '../lib/certificate.js'
import { verifyChain, CHAIN_STATUS } from '../lib/chain.js'
import { listAllAttempts, hesitationRisks, formatLatency } from '../lib/assessment.js'
import {
  listHazards,
  hazardStats,
  updateHazardStatus,
  allowedTransitions,
  clusterByBearing,
  categoryMeta,
  SEVERITY_COLOR,
  HAZARD_STATUS,
} from '../lib/hazards.js'
import {
  exportDgmsBundle,
  importDgmsBundle,
  downloadBundle,
  readBundleFile,
  pushToEndpoint,
  queueStats,
  getSyncEndpoint,
  SYNC_STATUS,
} from '../lib/sync.js'
import PeerSync from '../components/PeerSync.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Compliance dashboard for a site safety officer or DGMS inspector.
 *
 * ON THE PIN GATE, stated plainly: it is a local speed bump so a worker who
 * borrows the site phone does not wander into the compliance data. It is NOT
 * authorization — the records live in this browser and anyone with devtools can
 * read them. Production needs server-issued roles. The page says so on screen
 * rather than only in the docs.
 */

const TABS = [
  { id: 'compliance', key: 'ad_tab_compliance', pictogram: 'correct' },
  { id: 'hesitation', key: 'ad_tab_hesitation', pictogram: 'slow' },
  { id: 'hazards', key: 'ad_tab_hazards', pictogram: 'warning' },
  { id: 'ledger', key: 'ad_tab_ledger', pictogram: 'lockout' },
]

export default function Admin() {
  const { t } = useLanguage()
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} t={t} />
  return <Console t={t} onLock={() => setUnlocked(false)} />
}

/* ================================================================== */
/* Gate                                                               */
/* ================================================================== */

function Gate({ onUnlock, t }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const needsSetup = !supervisorPinIsSet()

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (needsSetup) {
        if (!/^\d{4,6}$/.test(pin)) {
          setError('err_PIN_FORMAT')
          return
        }
        if (pin !== confirm) {
          setError('err_PIN_MISMATCH')
          return
        }
        await setSupervisorPin(pin)
        onUnlock()
        return
      }
      const ok = await verifySupervisorPin(pin)
      if (ok) onUnlock()
      else setError('ad_gate_wrong')
    } catch {
      setError('err_PIN_FORMAT')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <Pictogram name="lockout" size={56} className="mx-auto mb-6" />
      <h1 className="font-display font-bold text-2xl uppercase text-center mb-2">
        {needsSetup ? t('ad_gate_set_title') : t('ad_gate_title')}
      </h1>
      <p className="text-ink-tertiary text-sm text-center mb-8">
        {needsSetup ? t('ad_gate_set_body') : t('ad_gate_enter')}
      </p>

      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !needsSetup) submit()
        }}
        placeholder="••••"
        autoFocus
        className="w-full bg-surface-inset border border-line-subtle rounded px-4 py-3 font-mono text-2xl tracking-[0.4em] text-center focus:border-brand outline-none mb-4"
      />

      {needsSetup && (
        <input
          type="password"
          inputMode="numeric"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
          className="w-full bg-surface-inset border border-line-subtle rounded px-4 py-3 font-mono text-2xl tracking-[0.4em] text-center focus:border-brand outline-none mb-4"
        />
      )}

      {error && <p className="text-xs text-hazard-text text-center mb-4">{t(error)}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || pin.length < 4}
        className="w-full bg-brand text-ink-onBrand font-display font-bold uppercase py-3 rounded disabled:opacity-40"
      >
        {needsSetup ? t('save_label') : t('ad_gate_unlock')}
      </button>

      <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mt-8 flex items-start gap-3">
        <Pictogram name="warning" size={20} />
        <p className="text-[11px] text-ink-tertiary leading-relaxed">{t('ad_auth_warning')}</p>
      </div>

      <div className="text-center mt-6">
        <Link to="/" className="font-mono text-xs text-ink-tertiary underline">
          {t('nav_home')}
        </Link>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Console                                                            */
/* ================================================================== */

function Console({ t, onLock }) {
  const fileRef = useRef(null)
  const siteId = getActiveSiteId()

  const [tab, setTab] = useState('compliance')
  const [loading, setLoading] = useState(true)
  const [certs, setCerts] = useState([])
  const [attempts, setAttempts] = useState([])
  const [workers, setWorkers] = useState([])
  const [hazards, setHazards] = useState([])
  const [hzStats, setHzStats] = useState(null)
  const [chain, setChain] = useState(null)
  const [queue, setQueue] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [certList, attemptList, workerList, hazardList, stats, queueInfo] = await Promise.all([
        getCertificates(),
        listAllAttempts(),
        listWorkers(siteId),
        listHazards({ siteId }),
        hazardStats(siteId),
        queueStats(),
      ])
      setCerts(certList)
      setAttempts(attemptList)
      setWorkers(workerList)
      setHazards(hazardList)
      setHzStats(stats)
      setQueue(queueInfo)
    } catch {
      setNotice({ kind: 'error', key: 'ad_import_failed' })
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const flash = (kind, key) => {
    setNotice({ kind, key })
    setTimeout(() => setNotice(null), 4000)
  }

  const workerName = useCallback(
    (id) => workers.find((w) => w.id === id)?.name || certs.find((c) => c.workerId === id)?.workerName || id || '—',
    [workers, certs]
  )

  /* ---------------- actions ---------------- */

  const runChainCheck = async () => {
    setChain(await verifyChain(siteId))
  }

  const exportCsv = () => {
    // Statutory export. Readiness is reported as of today, not as of the test
    // date, which is the whole point of the decay model.
    const header = [
      'Worker Name',
      'Certificate ID',
      'Issued Date',
      'Ledger Seq',
      'Record Hash',
      'Avg Readiness %',
      'Hesitation Flags',
      ...CERTIFICATION_DOMAINS,
    ]
    const rows = certs.map((c) => [
      c.workerName,
      c.certId,
      new Date(c.issuedAt).toISOString().slice(0, 10),
      c.seq,
      c.hash,
      c.avgReadiness,
      c.hesitationCount,
      ...CERTIFICATION_DOMAINS.map((d) => c.domains.find((x) => x.domain === d)?.readiness ?? ''),
    ])

    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jaagruk-compliance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportBundle = async () => {
    const bundle = await exportDgmsBundle({ siteId })
    downloadBundle(bundle, `jaagruk-dgms-${siteId}-${new Date().toISOString().slice(0, 10)}.json`)
    flash('ok', 'ad_export_dgms')
  }

  const importBundle = async (file) => {
    try {
      const bundle = await readBundleFile(file)
      // Trusting a new signer is a real decision, so it is an explicit prompt
      // rather than a silent default.
      const trust = window.confirm(t('ad_import_trust'))
      await importDgmsBundle(bundle, { trustSigners: trust })
      flash('ok', 'ad_import_done')
      await refresh()
      setChain(null)
    } catch {
      flash('error', 'ad_import_failed')
    }
  }

  const syncNow = async () => {
    const result = await pushToEndpoint()
    if (result.status === SYNC_STATUS.NO_ENDPOINT) flash('error', 'ad_sync_no_endpoint')
    else if (result.status === SYNC_STATUS.OFFLINE) flash('error', 'ad_sync_offline')
    else if (result.status === SYNC_STATUS.FAILED) flash('error', 'ad_sync_failed')
    else flash('ok', 'ad_sync_done')
    setQueue(await queueStats())
  }

  const changeHazard = async (id, status) => {
    try {
      await updateHazardStatus(id, status, { by: 'supervisor' })
      await refresh()
    } catch {
      flash('error', 'ad_import_failed')
    }
  }

  /* ---------------- derived ---------------- */

  const risks = hesitationRisks(attempts)
  const filteredCerts = certs.filter((c) => c.workerName.toLowerCase().includes(search.toLowerCase()))
  const avgReadiness = certs.length
    ? Math.round(certs.reduce((s, c) => s + c.avgReadiness, 0) / certs.length)
    : 0

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <p className="font-mono text-brand-text text-xs tracking-[0.2em] uppercase mb-2">{t('admin_eyebrow')}</p>
          <h1 className="font-display font-bold text-4xl md:text-5xl uppercase">{t('admin_title')}</h1>
        </div>
        <button
          type="button"
          onClick={onLock}
          className="font-mono text-[10px] uppercase tracking-widest border border-line-subtle rounded px-3 py-2 text-ink-tertiary hover:border-brand hover:text-brand-text shrink-0"
        >
          {t('ad_gate_lock')}
        </button>
      </div>

      <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-8 flex items-start gap-3">
        <Pictogram name="warning" size={20} />
        <p className="text-[11px] text-ink-tertiary leading-relaxed">{t('ad_auth_warning')}</p>
      </div>

      {notice && (
        <div
          className={`rounded p-3 mb-6 flex items-center gap-3 ${
            notice.kind === 'ok' ? 'bg-safe/10 border border-safe/40' : 'bg-hazard/10 border border-hazard/40'
          }`}
          role="status"
        >
          <Pictogram name={notice.kind === 'ok' ? 'correct' : 'warning'} size={20} />
          <p className="text-xs">{t(notice.key)}</p>
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label={t('admin_total_certs')} value={certs.length} />
        <Stat label={t('cert_readiness_now')} value={`${avgReadiness}%`} accent />
        <Stat label={t('ad_tab_hesitation')} value={risks.length} warn={risks.length > 0} />
        <Stat label={t('ad_open_high')} value={hzStats?.openHighCount ?? 0} warn={(hzStats?.openHighCount ?? 0) > 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id)
              if (item.id === 'ledger' && !chain) runChainCheck()
            }}
            className={`flex items-center gap-2 rounded px-3 py-2 font-mono text-[11px] uppercase tracking-widest whitespace-nowrap shrink-0 ${
              tab === item.id ? 'bg-brand text-ink-onBrand font-bold' : 'text-ink-tertiary border border-line-subtle'
            }`}
          >
            <Pictogram name={item.pictogram} size={16} />
            {t(item.key)}
          </button>
        ))}
      </div>

      {loading && <p className="font-mono text-xs text-ink-tertiary uppercase tracking-widest">{t('loading_label')}</p>}

      {/* ---------------- compliance ---------------- */}
      {!loading && tab === 'compliance' && (
        <>
          <section className="mb-10">
            <h2 className="font-display font-bold text-2xl uppercase mb-4">{t('admin_domain_breakdown')}</h2>
            <div className="space-y-2">
              {CERTIFICATION_DOMAINS.map((domain) => {
                const scores = certs
                  .map((c) => c.domains.find((d) => d.domain === domain)?.readiness)
                  .filter((v) => v !== undefined)
                const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
                const flagged = certs.filter((c) => c.domains.find((d) => d.domain === domain)?.hesitation).length

                return (
                  <div
                    key={domain}
                    className="bg-surface-1 border border-line-subtle rounded p-3 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <span className="text-sm font-bold min-w-0 flex-1 truncate">{domain}</span>
                    <span className="flex items-center gap-4 shrink-0">
                      {flagged > 0 && (
                        <span className="font-mono text-[10px] text-brand-text flex items-center gap-1">
                          <Pictogram name="slow" size={14} />
                          {flagged}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-ink-tertiary">
                        {scores.length} {t('ad_ledger_records')}
                      </span>
                      <span className="font-mono text-brand-text font-bold text-sm w-12 text-end">
                        {avg !== null ? `${avg}%` : '—'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-display font-bold text-2xl uppercase">{t('admin_certified_workers')}</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin_search')}
                  className="bg-surface-1 border border-line-subtle rounded px-3 py-2 text-sm font-mono focus:border-brand outline-none"
                />
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={certs.length === 0}
                  className="bg-brand text-ink-onBrand font-bold text-xs uppercase px-4 py-2 rounded disabled:opacity-40"
                >
                  {t('admin_export_csv')}
                </button>
              </div>
            </div>

            {filteredCerts.length === 0 ? (
              <p className="text-ink-tertiary font-mono text-sm border border-line-subtle rounded-lg p-8 text-center">
                {t('admin_no_certs')}
              </p>
            ) : (
              <div className="border border-line-subtle rounded-lg divide-y divide-line-subtle">
                {filteredCerts.map((c) => (
                  <div key={c.hash} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm flex items-center gap-2">
                        {c.hesitationCount > 0 && <Pictogram name="slow" size={15} />}
                        <span className="truncate">{c.workerName}</span>
                      </p>
                      <p className="font-mono text-[10px] text-ink-tertiary mt-0.5 break-all">
                        {c.certId} · #{c.seq} · {new Date(c.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-brand-text font-bold">{c.avgReadiness}%</span>
                      <Link
                        to={`/verify/${c.certId}`}
                        className="font-mono text-[10px] uppercase border border-line-subtle rounded px-2.5 py-1.5 text-ink-tertiary hover:border-brand hover:text-brand-text"
                      >
                        {t('vf_check_now')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <SyncPanel
            t={t}
            queue={queue}
            siteId={siteId}
            onSync={syncNow}
            onExport={exportBundle}
            onImportClick={() => fileRef.current?.click()}
            onPeerComplete={refresh}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importBundle(file)
              e.target.value = ''
            }}
          />
        </>
      )}

      {/* ---------------- hesitation ---------------- */}
      {!loading && tab === 'hesitation' && (
        <section>
          <h2 className="font-display font-bold text-2xl uppercase mb-2">{t('ad_tab_hesitation')}</h2>
          <p className="text-sm text-ink-tertiary mb-6 leading-relaxed max-w-2xl">{t('ad_hesitation_desc')}</p>

          {risks.length === 0 ? (
            <div className="border border-line-subtle rounded-lg p-10 text-center">
              <Pictogram name="correct" size={40} className="mx-auto mb-4" />
              <p className="text-ink-tertiary text-sm">{t('ad_hesitation_none')}</p>
            </div>
          ) : (
            <div className="border border-line-subtle rounded-lg divide-y divide-line-subtle">
              {risks.map((risk) => (
                <div key={risk.workerId || 'unknown'} className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <p className="font-bold text-sm flex items-center gap-2">
                      <Pictogram name="slow" size={18} />
                      {workerName(risk.workerId)}
                    </p>
                    <span className="font-mono text-xs text-hazard-text shrink-0">
                      {t('ad_worst_pause')}: {formatLatency(risk.worstLatencyMs)}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-ink-tertiary">
                    {risk.domains.join(' · ')} — {new Date(risk.at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- hazards ---------------- */}
      {!loading && tab === 'hazards' && (
        <section>
          <h2 className="font-display font-bold text-2xl uppercase mb-4">{t('ad_tab_hazards')}</h2>

          {hzStats && hzStats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat label={t('hz_status_open')} value={hzStats.byStatus.open} warn={hzStats.byStatus.open > 0} />
              <Stat label={t('hz_status_acknowledged')} value={hzStats.byStatus.acknowledged} />
              <Stat label={t('hz_status_resolved')} value={hzStats.byStatus.resolved} accent />
              <Stat label={t('ad_oldest_open')} value={hzStats.oldestOpenDays} warn={hzStats.oldestOpenDays > 7} />
            </div>
          )}

          {/* Bearing clusters — where reports pile up in the real space */}
          {hazards.length > 0 && (
            <div className="mb-8">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary mb-3">
                {t('ad_zone_clusters')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {clusterByBearing(hazards.filter((h) => h.status === HAZARD_STATUS.OPEN))
                  .slice(0, 8)
                  .map((cluster) => (
                    <span
                      key={cluster.key}
                      className="font-mono text-[10px] border border-line-subtle rounded px-2.5 py-1.5 flex items-center gap-2"
                      style={{ color: cluster.highCount > 0 ? 'rgb(var(--hazard-text))' : 'rgb(var(--text-tertiary))' }}
                    >
                      {cluster.zoneName || t('hz_no_direction')}
                      {cluster.centreBearing !== null && ` ${Math.round(cluster.centreBearing)}°`}
                      <span className="text-ink font-bold">{cluster.count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {hazards.length === 0 ? (
            <div className="border border-line-subtle rounded-lg p-10 text-center">
              <Pictogram name="correct" size={40} className="mx-auto mb-4" />
              <p className="text-ink-tertiary text-sm">{t('ad_hazards_none')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hazards.map((h) => (
                <HazardCard key={h.id} report={h} t={t} onChange={changeHazard} reporter={workerName(h.reportedBy)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- ledger ---------------- */}
      {!loading && tab === 'ledger' && (
        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-display font-bold text-2xl uppercase">{t('ad_tab_ledger')}</h2>
            <button
              type="button"
              onClick={runChainCheck}
              className="bg-brand text-ink-onBrand font-bold text-xs uppercase px-4 py-2 rounded"
            >
              {t('ad_ledger_verify')}
            </button>
          </div>

          {!chain && <p className="font-mono text-xs text-ink-tertiary">{t('loading_label')}</p>}

          {chain && chain.length === 0 && (
            <p className="text-ink-tertiary font-mono text-sm border border-line-subtle rounded-lg p-8 text-center">
              {t('ad_ledger_empty')}
            </p>
          )}

          {chain && chain.length > 0 && (
            <>
              <div
                className="rounded-lg p-5 mb-6 flex items-start gap-4"
                style={{
                  background: chain.ok ? 'rgba(46,125,79,0.1)' : 'rgba(217,48,37,0.1)',
                  border: `1px solid ${chain.ok ? 'rgb(var(--safe) / 0.4)' : 'rgb(var(--hazard) / 0.4)'}`,
                }}
              >
                <Pictogram name={chain.ok ? 'correct' : 'incorrect'} size={34} />
                <div>
                  <p className="font-bold text-sm mb-1" style={{ color: chain.ok ? 'rgb(var(--safe-text))' : 'rgb(var(--hazard-text))' }}>
                    {chain.ok
                      ? t('ad_ledger_intact')
                      : `${t('ad_ledger_intact_to')} #${Math.max(0, chain.firstBrokenIndex)}`}
                  </p>
                  <p className="font-mono text-[10px] text-ink-tertiary">
                    {chain.verifiedCount}/{chain.length} {t('ad_ledger_records')}
                  </p>
                  {chain.issues.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {chain.issues.map((issue) => (
                        <li key={issue} className="text-[11px] text-ink-tertiary flex items-start gap-2">
                          <Pictogram name="warning" size={13} />
                          {t(`chain_${issue}`)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="border border-line-subtle rounded-lg divide-y divide-line-subtle">
                {chain.results.map((entry) => (
                  <div key={entry.record.hash} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className="flex items-center gap-3 min-w-0 flex-1">
                      <Pictogram name={entry.ok ? 'correct' : 'incorrect'} size={20} />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold">
                          #{entry.record.seq}{' '}
                          {entry.described?.kind === 'genesis' ? '· genesis' : `· ${entry.described?.workerName}`}
                        </span>
                        <span className="block font-mono text-[9px] text-ink-tertiary break-all">
                          {entry.record.hash.slice(0, 28)}
                        </span>
                      </span>
                    </span>
                    {!entry.ok && (
                      <span className="font-mono text-[9px] text-hazard-text shrink-0 text-end">
                        {entry.issues
                          .filter((i) => i !== CHAIN_STATUS.OK)
                          .map((i) => t(`chain_${i}`))
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <p className="text-[11px] text-ink-tertiary mt-12 leading-relaxed border-t border-line-subtle pt-6">
        {t('ad_statutory_note')}
      </p>
    </div>
  )
}

/* ================================================================== */
/* Pieces                                                             */
/* ================================================================== */

function Stat({ label, value, accent, warn }) {
  const color = warn ? 'text-hazard-text' : accent ? 'text-brand-text' : 'text-ink'
  return (
    <div className="bg-surface-1 border border-line-subtle rounded-lg p-4">
      <p className={`font-display font-bold text-3xl ${color}`}>{value}</p>
      <p className="font-mono text-[9px] text-ink-tertiary uppercase tracking-widest mt-1 leading-tight">{label}</p>
    </div>
  )
}

function SyncPanel({ t, queue, siteId, onSync, onExport, onImportClick, onPeerComplete }) {
  const endpoint = getSyncEndpoint()

  return (
    <section className="border-t border-line-subtle pt-8">
      <h2 className="font-display font-bold text-xl uppercase mb-4">{t('st_sync_title')}</h2>

      {queue && (
        <p className="font-mono text-[11px] text-ink-tertiary mb-4">
          {queue.total} {t('ad_sync_pending')}
          {!endpoint && ` · ${t('ad_sync_no_endpoint')}`}
        </p>
      )}

      <div className="flex gap-3 flex-wrap mb-6">
        <button
          type="button"
          onClick={onExport}
          className="bg-brand text-ink-onBrand font-bold text-xs uppercase px-4 py-2.5 rounded"
        >
          {t('ad_export_dgms')}
        </button>
        <button
          type="button"
          onClick={onImportClick}
          className="border border-line rounded px-4 py-2.5 font-mono text-xs hover:border-brand hover:text-brand-text"
        >
          {t('ad_import_bundle')}
        </button>
        <button
          type="button"
          onClick={onSync}
          disabled={!endpoint}
          className="border border-line rounded px-4 py-2.5 font-mono text-xs hover:border-brand hover:text-brand-text disabled:opacity-40"
        >
          {t('ad_sync_now')}
        </button>
      </div>

      {/*
        Direct phone-to-phone hand-off, for the case the file export cannot cover:
        a certificate issued at the bottom of a shaft that has to reach the office
        without either phone ever seeing a network down there.
      */}
      <PeerSync siteId={siteId} onComplete={onPeerComplete} />

      <p className="text-[11px] text-ink-tertiary mt-4 leading-relaxed max-w-2xl">{t('ad_gossip_desc')}</p>
    </section>
  )
}

function HazardCard({ report, t, onChange, reporter }) {
  const meta = categoryMeta(report.category)
  const transitions = allowedTransitions(report.status)

  const ACTION_LABEL = {
    [HAZARD_STATUS.ACKNOWLEDGED]: 'ad_hazard_ack',
    [HAZARD_STATUS.RESOLVED]: 'ad_hazard_resolve',
    [HAZARD_STATUS.DISMISSED]: 'ad_hazard_dismiss',
    [HAZARD_STATUS.OPEN]: 'ad_hazard_reopen',
  }

  return (
    <div
      className="bg-surface-1 border rounded-lg p-4"
      style={{
        borderColor:
          report.status === HAZARD_STATUS.OPEN
            ? // SEVERITY_COLOR is an ISO hex, so the alpha suffix is still valid here.
              `${SEVERITY_COLOR[report.severity]}88`
            : 'rgb(var(--border-default))',
      }}
    >
      <div className="flex items-start gap-4">
        <Pictogram name={meta.pictogram} size={40} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <p className="font-bold text-sm">{t(meta.labelKey)}</p>
            <span
              className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded shrink-0"
              style={{ color: SEVERITY_COLOR[report.severity], background: 'rgba(255,255,255,0.05)' }}
            >
              {t(`hz_sev_${report.severity}`)}
            </span>
          </div>

          <p className="font-mono text-[10px] text-ink-tertiary mb-2">
            {new Date(report.at).toLocaleString()}
            {report.zoneName && ` · ${report.zoneName}`}
            {report.bearing !== null && ` · ${report.bearing}°`}
            {reporter && reporter !== '—' && ` · ${reporter}`}
          </p>

          {report.note && <p className="text-xs text-ink-tertiary leading-relaxed mb-2">{report.note}</p>}

          {report.photo && (
            <img src={report.photo} alt="" className="rounded border border-line-subtle max-h-40 mb-2" />
          )}
          {report.voice && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={report.voice} className="w-full h-8 mb-2" />
          )}
          {report.mediaDropped && (
            <p className="font-mono text-[9px] text-brand-text mb-2">{t('hz_storage_full')}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink-tertiary me-2">
              {t(`hz_status_${report.status}`)}
            </span>
            {transitions.map((next) => (
              <button
                key={next}
                type="button"
                onClick={() => onChange(report.id, next)}
                className="font-mono text-[9px] uppercase border border-line-subtle rounded px-2 py-1 text-ink-tertiary hover:border-brand hover:text-brand-text"
              >
                {t(ACTION_LABEL[next] || 'save_label')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
