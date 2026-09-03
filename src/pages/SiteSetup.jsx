import { useState, useEffect, useCallback, useRef } from 'react'
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
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const viewRef = useRef({ heading: 0, elevation: 0, headingSource: HEADING_SOURCE.NONE })

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

  /* ---------------- render ---------------- */

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <p className="font-mono text-xs text-concrete uppercase tracking-widest">{t('loading_label')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('site_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-3">{t('site_title')}</h1>
      <p className="text-concrete mb-6 max-w-xl leading-relaxed">{t('site_desc')}</p>

      {worker && worker.role !== ROLE.SUPERVISOR && (
        <div className="bg-amber/10 border border-amber/40 rounded p-3 mb-6 flex items-start gap-3">
          <Pictogram name="warning" size={22} />
          <p className="text-xs text-concrete leading-relaxed">{t('ad_auth_warning')}</p>
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
        <label className="font-mono text-[10px] uppercase tracking-widest text-concrete block mb-2">
          {t('site_name_label')}
        </label>
        <input
          type="text"
          value={site?.name || ''}
          onChange={(e) => setSite((prev) => ({ ...prev, name: e.target.value }))}
          onBlur={(e) => handleRenameSite(e.target.value)}
          className="w-full bg-steel border border-steel-lighter rounded px-4 py-3 text-sm focus:border-amber outline-none"
        />
      </div>

      {/* Zones */}
      <section className="mb-8">
        <h2 className="font-display font-bold text-2xl uppercase mb-4">{t('site_zones')}</h2>

        {(!site?.zones || site.zones.length === 0) && (
          <p className="text-sm text-concrete border border-steel-lighter rounded-lg p-6 text-center mb-4">
            {t('site_no_zones')}
          </p>
        )}

        <div className="grid gap-2 mb-4">
          {(site?.zones || []).map((zone) => (
            <div
              key={zone.id}
              className={`rounded-lg border p-4 flex items-center justify-between gap-3 flex-wrap ${
                zone.id === activeZoneId ? 'border-amber bg-amber/5' : 'border-steel-lighter bg-steel-light'
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
                  <span className="block font-mono text-[10px] text-concrete">
                    {(zone.anchors || []).length} {t('site_anchors_count')}
                  </span>
                </span>
              </button>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const next = window.prompt(t('site_zone_name_prompt'), zone.name)
                    if (next !== null) {
                      await renameZone(siteId, zone.id, next)
                      await refresh()
                    }
                  }}
                  className="font-mono text-[10px] uppercase border border-steel-lighter rounded px-2.5 py-1.5 text-concrete hover:border-amber hover:text-amber"
                >
                  {t('save_label')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // Deleting a zone destroys every anchor in it, so it needs a
                    // confirmation the supervisor cannot fat-finger past.
                    if (!window.confirm(`${t('site_delete_zone')} — ${zone.name}?`)) return
                    await deleteZone(siteId, zone.id)
                    if (activeZoneId === zone.id) setActiveZoneId(null)
                    await refresh()
                  }}
                  className="font-mono text-[10px] uppercase border border-steel-lighter rounded px-2.5 py-1.5 text-concrete hover:border-hazard hover:text-hazard"
                >
                  ✕
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
            placeholder={t('site_zone_name_prompt')}
            className="flex-1 bg-steel border border-steel-lighter rounded px-4 py-2.5 text-sm focus:border-amber outline-none"
          />
          <button
            type="button"
            onClick={handleCreateZone}
            className="bg-amber text-steel font-bold text-xs uppercase px-4 py-2.5 rounded shrink-0"
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
              className="font-mono text-[10px] uppercase tracking-widest border border-steel-lighter rounded px-3 py-2 text-concrete hover:border-amber hover:text-amber"
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

              <div className="bg-steel-light border border-steel-lighter rounded-lg p-5 mb-4">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <p className="text-sm">{t('site_aim_and_tap')}</p>
                  <span
                    className="font-mono text-xs px-2.5 py-1 rounded"
                    style={{
                      color: headingSource === HEADING_SOURCE.COMPASS ? 'rgb(var(--safe-text))' : 'rgb(var(--warning-text))',
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {t('site_heading_now')} {normaliseHeading(headingDisplay)}°
                  </span>
                </div>

                <input
                  type="text"
                  value={pendingLabel}
                  onChange={(e) => setPendingLabel(e.target.value)}
                  placeholder={t('site_marked')}
                  className="w-full bg-steel border border-steel-lighter rounded px-4 py-2.5 text-sm mb-4 focus:border-amber outline-none"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MARKABLE.map((type) => {
                    const meta = anchorMeta(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleDropAnchor(type)}
                        className="rounded-lg border border-steel-lighter bg-steel p-3 flex flex-col items-center gap-2 hover:border-amber"
                      >
                        <Pictogram name={meta.pictogram} size={34} />
                        <span className="font-mono text-[10px] text-center leading-tight text-concrete">
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

              <p className="text-[11px] text-concrete leading-relaxed">{t('site_scan_note')}</p>
            </>
          )}

          {/* Anchor list */}
          {(activeZone.anchors || []).length > 0 && (
            <div className="border border-steel-lighter rounded-lg divide-y divide-steel-lighter mt-4">
              {activeZone.anchors.map((anchor) => {
                const meta = anchorMeta(anchor.type)
                return (
                  <div key={anchor.id} className="p-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <Pictogram name={meta.pictogram} size={26} />
                      <span className="min-w-0">
                        <span className="block text-sm truncate">{anchor.label}</span>
                        <span className="block font-mono text-[10px] text-concrete">
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
                      className="font-mono text-[10px] uppercase text-concrete hover:text-hazard shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Sharing */}
      <section className="border-t border-steel-lighter pt-8">
        <h2 className="font-display font-bold text-xl uppercase mb-3">{t('site_export_scan')}</h2>
        <p className="text-xs text-concrete mb-4 leading-relaxed max-w-xl">{t('site_scan_note')}</p>

        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            disabled={!summary?.scanned}
            className="bg-amber text-steel font-bold text-xs uppercase px-4 py-2.5 rounded disabled:opacity-40"
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
            className="border border-concrete rounded px-4 py-2.5 font-mono text-xs hover:border-amber hover:text-amber"
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
    <div className="bg-steel-light border border-steel-lighter rounded-lg p-4 text-center">
      <p className={`font-display font-bold text-2xl ${accent ? 'text-amber' : 'text-chalk'}`}>{value}</p>
      <p className="font-mono text-[9px] text-concrete uppercase tracking-widest mt-1 leading-tight">{label}</p>
    </div>
  )
}
