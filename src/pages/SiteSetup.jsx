import { useState, useEffect, useCallback, useRef, useId } from 'react'
import {
  getSite,
  saveSite,
  createZone,
  renameZone,
  deleteZone,
  addAnchor,
  deleteAnchor,
  exportSiteBundle,
  importSiteBundle,
  siteScanSummary,
  anchorMeta,
  normaliseHeading,
  ANCHOR_TYPE,
  HEADING_SOURCE,
  GENERIC_ZONE_ID,
} from '../lib/siteMap.js'
import { getActiveSiteId, getCurrentWorker, ROLE } from '../lib/identity.js'
import { downloadBundle, readBundleFile } from '../lib/sync.js'
import ARDrill from '../components/ARDrill.jsx'
import Pictogram from '../lib/pictograms.jsx'
import { Dialog, useConfirm, usePrompt, useToast, Skeleton } from '../components/ui/index.js'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Site Setup — the supervisor walks a zone once and marks where the exits,
 * extinguishers and hazards really are.
 *
 * This is the web stand-in for ARCore Persistent Cloud Anchors. An anchor here is
 * a DIRECTION rather than a 3D point: the supervisor aims the phone at the real
 * exit and taps, and the compass bearing plus elevation of that sighting is what
 * gets stored. During a drill the marker reprojects at that bearing, so a worker
 * turning around sees the exit marker stay over the real exit.
 *
 * What that buys: "the exit is left past the second pillar" gets learned in the
 * actual corridor. What it does not buy: depth, occlusion, or surviving a walk to
 * the far end of the building. Those need ARCore.
 *
 * The scan exports as a small JSON file so one supervisor's walkthrough seeds
 * every worker's phone — the hand-off that Cloud Anchors would otherwise do
 * through a hosted service.
 */

const MARKABLE = [
  ANCHOR_TYPE.EXIT,
  ANCHOR_TYPE.EXTINGUISHER,
  ANCHOR_TYPE.ASSEMBLY_POINT,
  ANCHOR_TYPE.FIRST_AID,
  ANCHOR_TYPE.GAS_ZONE,
  ANCHOR_TYPE.LOTO_PANEL,
  ANCHOR_TYPE.ELECTRICAL_PANEL,
  ANCHOR_TYPE.MACHINE,
  ANCHOR_TYPE.DUST_SOURCE,
  ANCHOR_TYPE.HAZARD,
]

export default function SiteSetup() {
  // Declared before the body so the handlers below can close over them.
  const toast = useToast()
  const { confirm, dialogProps: confirmProps } = useConfirm()
  const { prompt, dialogProps: promptProps } = usePrompt()

  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const viewRef = useRef({ heading: 0, elevation: 0, headingSource: HEADING_SOURCE.NONE })

  const siteNameId = useId()

  const [site, setSite] = useState(null)
  const [summary, setSummary] = useState(null)
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)

  const [activeZoneId, setActiveZoneId] = useState(null)
  const [marking, setMarking] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [pendingLabel, setPendingLabel] = useState('')
  const [notice, setNotice] = useState(null)
  const [headingDisplay, setHeadingDisplay] = useState(0)
  const [headingSource, setHeadingSource] = useState(HEADING_SOURCE.NONE)

  const siteId = getActiveSiteId()

  /* ---------------- load ---------------- */

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [loaded, stats, current] = await Promise.all([getSite(siteId), siteScanSummary(siteId), getCurrentWorker()])
      setSite(loaded)
      setSummary(stats)
      setWorker(current)
      setActiveZoneId((prev) => prev || loaded.zones?.[0]?.id || null)
    } catch {
      setNotice({ kind: 'error', key: 'ad_import_failed' })
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The AR viewport pushes the live bearing here. Kept in a ref for the drop
  // action and mirrored into state at a low rate purely for the readout.
  const handleView = useCallback((view) => {
    viewRef.current = view
    setHeadingDisplay(Math.round(view.heading))
    setHeadingSource(view.headingSource)
  }, [])

  const activeZone = site?.zones?.find((z) => z.id === activeZoneId) || null

  /* ---------------- actions ---------------- */

  const flash = (kind, key) => {
    setNotice({ kind, key })
    setTimeout(() => setNotice(null), 3500)
  }

  const handleCreateZone = async () => {
    const zone = await createZone(siteId, newZoneName)
    setNewZoneName('')
    setActiveZoneId(zone.id)
    await refresh()
  }

  const handleRenameSite = async (name) => {
    if (!site) return
    const next = await saveSite({ ...site, name })
    setSite(next)
  }

  const handleDropAnchor = async (type) => {
    if (!activeZone) return

    const view = viewRef.current
    // Without a bearing there is nothing to anchor to, and storing a default of
    // due north would put the marker somewhere arbitrary in the real room.
    if (view.headingSource === HEADING_SOURCE.NONE) {
      flash('error', 'ar_no_compass_title')
      return
    }

    try {
      await addAnchor(siteId, activeZone.id, {
        type,
        label: pendingLabel.trim() || t(anchorMeta(type).labelKey),
        bearing: view.heading,
        elevation: view.elevation,
      })
      setPendingLabel('')
      flash('ok', 'site_marked')
      await refresh()
    } catch {
      flash('error', 'ar_no_compass_title')
    }
  }

  const handleExport = async () => {
    const bundle = await exportSiteBundle(siteId)
    downloadBundle(bundle, `jaagruk-site-${siteId}.json`)
    flash('ok', 'site_export_scan')
  }

  const handleImport = async (file) => {
    try {
      const bundle = await readBundleFile(file)
      const result = await importSiteBundle(bundle, { siteId })
      flash('ok', 'site_import_done')
      setActiveZoneId(result.site.zones?.[0]?.id || null)
      await refresh()
    } catch {
      flash('error', 'ad_import_failed')
    }
  }

  /* ---------------- zone actions ---------------- */

  /**
   * Rename. Replaces window.prompt, which could not be translated and could not
   * validate — an empty name or 200 characters was accepted silently.
   */
  const renameZonePrompt = async (zone) => {
    const next = await prompt({
      title: t('site_zone_name_prompt'),
      initial: zone.name,
      confirmLabel: t('save_label'),
      cancelLabel: t('cancel_label'),
      maxLength: 40,
    })
    // null means cancelled. An empty result is impossible: the confirm button
    // stays disabled until the trimmed value is usable.
    if (next === null) return
    await renameZone(siteId, zone.id, next)
    await refresh()
    toast.success(t('site_zone_renamed'))
  }

  /**
   * Delete. Destroys every anchor in the zone, so it is a `danger` dialog naming
   * the zone and the anchor count — window.confirm could say neither, and could
   * not distinguish this from clearing a log.
   */
  const deleteZoneConfirm = async (zone) => {
    const anchorCount = zone.anchors?.length || 0
    const agreed = await confirm({
      tone: 'danger',
      title: t('site_delete_zone'),
      body: `${zone.name} — ${anchorCount} ${t('m_anchors')}`,
      confirmLabel: t('delete_label'),
      cancelLabel: t('cancel_label'),
    })
    if (!agreed) return
    await deleteZone(siteId, zone.id)
    if (activeZoneId === zone.id) setActiveZoneId(null)
    await refresh()
    toast.success(t('site_zone_deleted'))
  }

  /* ---------------- render ---------------- */

  if (loading) {
    // Skeleton matching the real layout, so content does not jump in when it
    // arrives. Replaces a centred "Loading…".
    return (
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Skeleton className="h-2.5 w-24 mb-4" />
        <Skeleton className="h-9 w-2/3 mb-4" />
        <Skeleton className="h-3 w-full max-w-xl mb-8" />
        <Skeleton className="h-56 w-full mb-6" rounded="lg" />
        <div className="space-y-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" rounded="lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      {/* One Dialog element per hook, rendered once at the page root. The hooks
          hold the promise resolver, so these must stay mounted. */}
      <Dialog {...confirmProps} />
      <Dialog {...promptProps} />
      <p className="font-mono text-brand-text text-xs tracking-[0.2em] uppercase mb-3">{t('site_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-3">{t('site_title')}</h1>
      <p className="text-ink-tertiary mb-6 max-w-xl leading-relaxed">{t('site_desc')}</p>

      {worker && worker.role !== ROLE.SUPERVISOR && (
        <div className="bg-brand-subtle border border-brand/40 rounded p-3 mb-6 flex items-start gap-3">
          <Pictogram name="warning" size={22} />
          <p className="text-xs text-ink-tertiary leading-relaxed">{t('ad_auth_warning')}</p>
        </div>
      )}

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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label={t('site_zones')} value={summary?.zoneCount ?? 0} />
        <Stat label={t('site_anchors_count')} value={summary?.anchorCount ?? 0} accent />
        <Stat
          label={t('site_marked')}
          value={summary?.scanned ? t('st_on') : t('st_off')}
        />
      </div>

      {/* Site name */}
      <div className="mb-8">
        <label
          htmlFor={siteNameId}
          className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary block mb-2"
        >
          {t('site_name_label')}
        </label>
        <input
          id={siteNameId}
          type="text"
          value={site?.name || ''}
          onChange={(e) => setSite((prev) => ({ ...prev, name: e.target.value }))}
          onBlur={(e) => handleRenameSite(e.target.value)}
          className="w-full bg-surface-0 border border-line-subtle rounded px-4 py-3 text-sm focus:border-brand outline-none"
        />
      </div>

      {/* Zones */}
      <section className="mb-8">
        <h2 className="font-display font-bold text-2xl uppercase mb-4">{t('site_zones')}</h2>

        {(!site?.zones || site.zones.length === 0) && (
          <p className="text-sm text-ink-tertiary border border-line-subtle rounded-lg p-6 text-center mb-4">
            {t('site_no_zones')}
          </p>
        )}

        <div className="grid gap-2 mb-4">
          {(site?.zones || []).map((zone) => (
            <div
              key={zone.id}
              className={`rounded-lg border p-4 flex items-center justify-between gap-3 flex-wrap ${
                zone.id === activeZoneId ? 'border-brand bg-brand-subtle' : 'border-line-subtle bg-surface-1'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveZoneId(zone.id)}
                className="text-start min-w-0 flex-1 flex items-center gap-3"
              >
                <Pictogram name="assembly_point" size={26} />
                <span className="min-w-0">
                  <span className="block font-bold text-sm truncate">{zone.name}</span>
                  <span className="block font-mono text-[10px] text-ink-tertiary">
                    {(zone.anchors || []).length} {t('site_anchors_count')}
                  </span>
                </span>
              </button>

              {/* 44px targets. These were 26px tall, which on a phone held in a
                  gloved hand put "rename" and "delete this zone and every anchor
                  in it" within a thumb-width of each other. */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => renameZonePrompt(zone)}
                  className="font-mono text-2xs uppercase border border-line-subtle rounded-lg px-3 min-h-[44px] flex items-center text-ink-tertiary hover:border-brand hover:text-brand-text transition-colors duration-fast"
                >
                  {t('rename_label')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteZoneConfirm(zone)}
                  aria-label={`${t('site_delete_zone')} — ${zone.name}`}
                  className="font-mono text-sm border border-line-subtle rounded-lg px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-tertiary hover:border-hazard hover:text-hazard-text transition-colors duration-fast"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            aria-label={t('site_new_zone')}
            placeholder={t('site_zone_name_prompt')}
            className="flex-1 bg-surface-0 border border-line-subtle rounded px-4 py-2.5 text-sm focus:border-brand outline-none"
          />
          <button
            type="button"
            onClick={handleCreateZone}
            className="bg-brand text-ink-onBrand font-bold text-xs uppercase px-4 py-2.5 rounded shrink-0"
          >
            {t('site_new_zone')}
          </button>
        </div>
      </section>

      {/* Marking */}
      {activeZone && (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-display font-bold text-2xl uppercase">{t('site_start_marking')}</h2>
            <button
              type="button"
              onClick={() => setMarking((m) => !m)}
              className="font-mono text-[10px] uppercase tracking-widest border border-line-subtle rounded px-3 py-2 text-ink-tertiary hover:border-brand hover:text-brand-text"
            >
              {marking ? t('close_label') : t('site_start_marking')}
            </button>
          </div>

          {marking && (
            <>
              <ARDrill
                anchors={activeZone.anchors || []}
                mode="view"
                zoneName={activeZone.name}
                isGenericZone={activeZone.id === GENERIC_ZONE_ID}
                onView={handleView}
                height={360}
                onFallback={() => setMarking(false)}
              />

              <div className="bg-surface-1 border border-line-subtle rounded-lg p-5 mb-4">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <p className="text-sm">{t('site_aim_and_tap')}</p>
                  <span
                    className="font-mono text-xs px-2.5 py-1 rounded"
                    style={{
                      color: headingSource === HEADING_SOURCE.COMPASS ? 'rgb(var(--safe-text))' : 'rgb(var(--warning-text))',
                      background: 'rgb(var(--surface-inset))',
                    }}
                  >
                    {t('site_heading_now')} {normaliseHeading(headingDisplay)}°
                  </span>
                </div>

                <input
                  type="text"
                  value={pendingLabel}
                  onChange={(e) => setPendingLabel(e.target.value)}
                  aria-label={t('site_marker_label')}
                  placeholder={t('site_marked')}
                  className="w-full bg-surface-0 border border-line-subtle rounded px-4 py-2.5 text-sm mb-4 focus:border-brand outline-none"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MARKABLE.map((type) => {
                    const meta = anchorMeta(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleDropAnchor(type)}
                        className="rounded-lg border border-line-subtle bg-surface-0 p-3 flex flex-col items-center gap-2 hover:border-brand"
                      >
                        <Pictogram name={meta.pictogram} size={34} />
                        <span className="font-mono text-[10px] text-center leading-tight text-ink-tertiary">
                          {t(meta.labelKey)}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {headingSource === HEADING_SOURCE.NONE && (
                  <p className="font-mono text-[11px] text-hazard mt-4">{t('ar_no_compass_body')}</p>
                )}
              </div>

              <p className="text-[11px] text-ink-tertiary leading-relaxed">{t('site_scan_note')}</p>
            </>
          )}

          {/* Anchor list */}
          {(activeZone.anchors || []).length > 0 && (
            <div className="border border-line-subtle rounded-lg divide-y divide-line-subtle mt-4">
              {activeZone.anchors.map((anchor) => {
                const meta = anchorMeta(anchor.type)
                return (
                  <div key={anchor.id} className="p-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <Pictogram name={meta.pictogram} size={26} />
                      <span className="min-w-0">
                        <span className="block text-sm truncate">{anchor.label}</span>
                        <span className="block font-mono text-[10px] text-ink-tertiary">
                          {Math.round(anchor.bearing)}° · {Math.round(anchor.elevation)}°
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteAnchor(siteId, activeZone.id, anchor.id)
                        await refresh()
                      }}
                      aria-label={t('site_delete_anchor')}
                      className="font-mono text-[10px] uppercase text-ink-tertiary hover:text-hazard shrink-0"
                    >
                      <span aria-hidden="true">✕</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Sharing */}
      <section className="border-t border-line-subtle pt-8">
        <h2 className="font-display font-bold text-xl uppercase mb-3">{t('site_export_scan')}</h2>
        <p className="text-xs text-ink-tertiary mb-4 leading-relaxed max-w-xl">{t('site_scan_note')}</p>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            disabled={!summary?.scanned}
            className="bg-brand text-ink-onBrand font-bold text-xs uppercase px-4 py-2.5 rounded disabled:opacity-40"
          >
            {t('site_export_scan')}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border border-line rounded px-4 py-2.5 font-mono text-xs hover:border-brand hover:text-brand-text"
          >
            {t('site_import_scan')}
          </button>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-surface-1 border border-line-subtle rounded-lg p-4 text-center">
      <p className={`font-display font-bold text-2xl ${accent ? 'text-brand-text' : 'text-ink'}`}>{value}</p>
      <p className="font-mono text-[9px] text-ink-tertiary uppercase tracking-widest mt-1 leading-tight">{label}</p>
    </div>
  )
}
