import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import {
  HAZARD_CATEGORY_LIST,
  HAZARD_SEVERITY,
  HAZARD_STATUS,
  SEVERITY_COLOR,
  categoryMeta,
  downscalePhoto,
  createVoiceRecorder,
  voiceRecordingSupported,
  tryGetPosition,
  createHazardReport,
  listHazards,
  toTransport,
  VOICE_MAX_MS,
} from '../lib/hazards.js'
import { createOrientationTracker, HEADING_SOURCE, listZones, GENERIC_ZONE_ID } from '../lib/siteMap.js'
import { getActiveSiteId, getCurrentWorker } from '../lib/identity.js'
import { enqueue, SYNC_KIND, isOnline } from '../lib/sync.js'
import { speak } from '../lib/speech.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Near-miss hazard reporting — the loop that turns a trained worker into a sensor
 * for the site.
 *
 * The whole flow is one photo and a tap, because anything longer will not happen
 * mid-shift. Location is recorded as a compass bearing within a site zone rather
 * than GPS, since GPS does not work underground and is barely better inside a
 * steel shed. GPS is captured opportunistically as a bonus field.
 *
 * Everything is written locally first, so filing a report never depends on having
 * signal. It syncs later, on its own.
 */

const SEVERITIES = [HAZARD_SEVERITY.LOW, HAZARD_SEVERITY.MEDIUM, HAZARD_SEVERITY.HIGH]

export default function ReportHazard() {
  const { t, lang } = useLanguage()
  const fileInputRef = useRef(null)
  const trackerRef = useRef(null)
  const recorderRef = useRef(null)

  const [category, setCategory] = useState(null)
  const [severity, setSeverity] = useState(null)
  const [note, setNote] = useState('')
  const noteId = useId()
  const zoneSelectId = useId()
  const [photo, setPhoto] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const [voice, setVoice] = useState(null)
  const [voiceError, setVoiceError] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordMs, setRecordMs] = useState(0)

  const [zones, setZones] = useState([])
  const [zoneId, setZoneId] = useState(null)
  const [bearing, setBearing] = useState(null)
  const [headingSource, setHeadingSource] = useState(HEADING_SOURCE.NONE)

  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [worker, setWorker] = useState(null)
  const [mine, setMine] = useState([])

  const siteId = getActiveSiteId()

  /* ---------------- load ---------------- */

  const refreshMine = useCallback(async () => {
    try {
      const [all, current] = await Promise.all([listHazards({ siteId }), getCurrentWorker()])
      setWorker(current)
      setMine(current ? all.filter((h) => h.reportedBy === current.id) : all.slice(0, 8))
    } catch {
      setMine([])
    }
  }, [siteId])

  useEffect(() => {
    ;(async () => {
      try {
        const list = await listZones(siteId)
        setZones(list)
        // Default to the first real zone; the generic fallback is a poor label
        // for a real hazard, so only use it if nothing else exists.
        const firstReal = list.find((z) => z.id !== GENERIC_ZONE_ID)
        setZoneId(firstReal?.id || list[0]?.id || null)
      } catch {
        setZones([])
      }
      refreshMine()
    })()
  }, [siteId, refreshMine])

  // Compass, for the direction tag. Optional — a report with no bearing is still
  // a useful report.
  useEffect(() => {
    const tracker = createOrientationTracker({
      onUpdate: (state) => {
        setBearing(Math.round(state.heading))
        setHeadingSource(state.headingSource)
      },
    })
    trackerRef.current = tracker
    tracker.start()
    return () => tracker.stop()
  }, [])

  useEffect(() => () => recorderRef.current?.cancel(), [])

  /* ---------------- media ---------------- */

  const handlePhoto = async (file) => {
    if (!file) return
    setPhotoError(null)
    try {
      const shrunk = await downscalePhoto(file)
      setPhoto(shrunk)
    } catch {
      // A HEIC file or a corrupt capture lands here.
      setPhotoError('hz_photo_failed')
      setPhoto(null)
    }
  }

  const startRecording = async () => {
    setVoiceError(null)
    const recorder = createVoiceRecorder({
      onComplete: (result) => {
        setVoice(result)
        setRecording(false)
        setRecordMs(0)
      },
      onError: (code) => {
        setVoiceError(`hz_${code}`)
        setRecording(false)
        setRecordMs(0)
      },
      onTick: (elapsed) => setRecordMs(elapsed),
    })
    recorderRef.current = recorder
    const ok = await recorder.start()
    if (ok) setRecording(true)
  }

  /* ---------------- submit ---------------- */

  const submit = async () => {
    if (!category) return
    setBusy(true)
    try {
      // Never block the report on a slow GPS fix.
      const gps = await tryGetPosition({ timeoutMs: 4000 })
      const zone = zones.find((z) => z.id === zoneId)

      const report = await createHazardReport({
        category,
        severity,
        note,
        photo,
        voice,
        zoneId: zone?.id || null,
        zoneName: zone?.name || '',
        bearing: headingSource === HEADING_SOURCE.NONE ? null : bearing,
        elevation: null,
        gps,
        reportedBy: worker?.id || '',
        reporterName: worker?.name || '',
        siteId,
      })

      try {
        await enqueue(SYNC_KIND.HAZARD, report.id, toTransport(report))
      } catch {
        // The report itself is stored; a full queue is not worth failing on.
      }

      setSubmitted(report)
      speak(t('hz_thanks_title'), lang)
      refreshMine()
    } catch {
      setPhotoError('hz_storage_full')
    } finally {
      setBusy(false)
    }
  }

  const resetForm = () => {
    setCategory(null)
    setSeverity(null)
    setNote('')
    setPhoto(null)
    setVoice(null)
    setPhotoError(null)
    setVoiceError(null)
    setSubmitted(null)
  }

  /* ---------------- submitted ---------------- */

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-5 py-14 text-center">
        <Pictogram name="correct" size={64} className="mx-auto mb-5" />
        <h1 className="font-display font-bold text-2xl uppercase mb-3">{t('hz_thanks_title')}</h1>
        <p className="text-ink-tertiary text-sm mb-8 leading-relaxed">{t('hz_thanks_body')}</p>

        <div className="border border-line-subtle rounded-lg p-4 mb-8 flex items-center gap-4 text-start">
          <Pictogram name={categoryMeta(submitted.category).pictogram} size={38} />
          <div className="min-w-0">
            <p className="font-bold text-sm">{t(categoryMeta(submitted.category).labelKey)}</p>
            <p className="font-mono text-[10px] text-ink-tertiary mt-0.5">
              {submitted.zoneName || t('hz_no_direction')}
              {submitted.bearing !== null && ` · ${submitted.bearing}°`}
            </p>
          </div>
        </div>

        {submitted.persisted === false && (
          <p className="font-mono text-[11px] text-hazard mb-6">{t('hz_storage_full')}</p>
        )}
        {!isOnline() && <p className="font-mono text-[11px] text-ink-tertiary mb-6">{t('offline_label')}</p>}

        <div className="grid gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="w-full bg-brand text-ink-onBrand font-display font-bold uppercase py-3 rounded"
          >
            {t('hz_report_another')}
          </button>
          <Link to="/" className="font-mono text-xs text-ink-tertiary underline">
            {t('nav_home')}
          </Link>
        </div>
      </div>
    )
  }

  /* ---------------- form ---------------- */

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <p className="font-mono text-brand-text text-xs tracking-[0.2em] uppercase mb-3">{t('hz_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-3">{t('hz_title')}</h1>
      <p className="text-ink-tertiary mb-8 max-w-xl leading-relaxed">{t('hz_desc')}</p>

      {/* 1. What */}
      <Section number={1} title={t('hz_pick_what')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HAZARD_CATEGORY_LIST.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.id)
                setSeverity((prev) => prev || cat.defaultSeverity)
                speak(t(cat.labelKey), lang)
              }}
              aria-pressed={category === cat.id}
              data-gesture-target={`category-${cat.id}`}
              className={`rounded-lg border p-3 flex flex-col items-center gap-2 transition-colors ${
                category === cat.id ? 'border-brand bg-brand-subtle' : 'border-line-subtle bg-surface-1 hover:border-brand'
              }`}
            >
              <Pictogram name={cat.pictogram} size={40} />
              <span className="font-mono text-[10px] text-center leading-tight text-ink-tertiary">{t(cat.labelKey)}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* 2. How bad */}
      {category && (
        <Section number={2} title={t('hz_how_bad')}>
          <div className="grid gap-2">
            {SEVERITIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverity(level)}
                aria-pressed={severity === level}
                className="rounded-lg border p-4 flex items-center gap-4 transition-colors"
                style={{
                  borderColor: severity === level ? SEVERITY_COLOR[level] : 'rgb(var(--border-default))',
                  background: severity === level ? `${SEVERITY_COLOR[level]}18` : 'transparent',
                }}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: SEVERITY_COLOR[level] }}
                  aria-hidden="true"
                />
                <span className="text-sm">{t(`hz_sev_${level}`)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Photo */}
      {category && (
        <Section number={3} title={t('hz_add_photo')} hint={t('hz_photo_optional')}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handlePhoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          {photo ? (
            <div className="rounded-lg overflow-hidden border border-line-subtle">
              <img src={photo.dataUrl} alt="" className="w-full block" />
              <div className="flex items-center justify-between gap-3 p-3 bg-surface-1">
                <span className="font-mono text-[10px] text-ink-tertiary">
                  {photo.width}×{photo.height} · {Math.round(photo.bytes / 1024)} KB
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-mono text-[10px] uppercase text-ink-tertiary hover:text-brand-text"
                >
                  {t('hz_retake_photo')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-line-subtle rounded-lg py-10 flex flex-col items-center gap-3 hover:border-brand"
            >
              <Pictogram name="report_it" size={44} />
              <span className="font-mono text-xs text-ink-tertiary">{t('hz_add_photo')}</span>
            </button>
          )}

          {photoError && <p className="font-mono text-[11px] text-hazard mt-3">{t(photoError)}</p>}
        </Section>
      )}

      {/* 4. Voice + note */}
      {category && (
        <Section number={4} title={t('hz_add_voice')}>
          {voiceRecordingSupported() ? (
            <>
              {voice ? (
                <div className="flex items-center justify-between gap-3 border border-line-subtle rounded-lg p-4">
                  <span className="flex items-center gap-3">
                    <Pictogram name="listen" size={26} />
                    <span className="font-mono text-xs text-safe">
                      {t('hz_voice_saved')} · {Math.round(voice.durationMs / 1000)}s
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setVoice(null)}
                    className="font-mono text-[10px] uppercase text-ink-tertiary hover:text-hazard"
                  >
                    {t('hz_voice_remove')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (recording) recorderRef.current?.stop()
                    else startRecording()
                  }}
                  className={`w-full rounded-lg border py-4 flex items-center justify-center gap-3 font-mono text-sm ${
                    recording ? 'border-hazard text-hazard bg-hazard/10' : 'border-line-subtle text-ink-tertiary hover:border-brand'
                  }`}
                >
                  <Pictogram name="listen" size={24} />
                  {recording
                    ? `${t('hz_stop_recording')} · ${Math.round(recordMs / 1000)}s / ${VOICE_MAX_MS / 1000}s`
                    : t('hz_add_voice')}
                </button>
              )}
              {voiceError && <p className="font-mono text-[11px] text-hazard mt-3">{t(voiceError)}</p>}
            </>
          ) : (
            <p className="font-mono text-[11px] text-ink-tertiary">{t('hz_MIC_UNSUPPORTED')}</p>
          )}

          <label
            htmlFor={noteId}
            className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary block mt-5 mb-2"
          >
            {t('hz_note_optional')}
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 400))}
            placeholder={t('hz_note_placeholder')}
            rows={3}
            className="w-full bg-surface-0 border border-line-subtle rounded px-4 py-3 text-sm focus:border-brand outline-none"
          />
        </Section>
      )}

      {/* 5. Where */}
      {category && (
        <Section number={5} title={t('hz_location')} hint={t('hz_location_note')}>
          {zones.length > 0 && (
            <>
              <label
                htmlFor={zoneSelectId}
                className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary block mb-2"
              >
                {t('hz_zone_label')}
              </label>
              <select
                id={zoneSelectId}
                value={zoneId || ''}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full bg-surface-0 border border-line-subtle rounded px-4 py-3 text-sm focus:border-brand outline-none mb-4"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="flex items-center gap-3">
            <Pictogram name={headingSource === HEADING_SOURCE.NONE ? 'warning' : 'correct'} size={22} />
            <span className="font-mono text-xs text-ink-tertiary">
              {headingSource === HEADING_SOURCE.NONE
                ? t('hz_no_direction')
                : `${t('hz_facing')} ${bearing}°`}
            </span>
          </div>
        </Section>
      )}

      {/* Submit */}
      {category && (
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full bg-brand text-ink-onBrand font-display font-bold text-lg uppercase py-4 rounded disabled:opacity-50 mt-4"
        >
          {busy ? t('hz_submitting') : t('hz_submit')}
        </button>
      )}

      {/* My reports */}
      {mine.length > 0 && (
        <section className="mt-12 border-t border-line-subtle pt-8">
          <h2 className="font-display font-bold text-xl uppercase mb-4">{t('hz_my_reports')}</h2>
          <div className="border border-line-subtle rounded-lg divide-y divide-line-subtle">
            {mine.slice(0, 8).map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between gap-3">
                <span className="flex items-center gap-3 min-w-0">
                  <Pictogram name={categoryMeta(report.category).pictogram} size={28} />
                  <span className="min-w-0">
                    <span className="block text-sm truncate">{t(categoryMeta(report.category).labelKey)}</span>
                    <span className="block font-mono text-[10px] text-ink-tertiary">
                      {new Date(report.at).toLocaleDateString()}
                      {report.zoneName && ` · ${report.zoneName}`}
                    </span>
                  </span>
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded shrink-0"
                  style={{
                    color: report.status === HAZARD_STATUS.RESOLVED ? 'rgb(var(--safe-text))' : 'rgb(var(--warning-text))',
                    // A white overlay was invisible on the light theme, so the
                    // chip lost its background entirely. Tokenised instead.
                    background: 'rgb(var(--surface-inset))',
                  }}
                >
                  {t(`hz_status_${report.status}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {mine.length === 0 && category === null && (
        <p className="font-mono text-xs text-ink-tertiary text-center mt-12">{t('hz_none_yet')}</p>
      )}
    </div>
  )
}

function Section({ number, title, hint, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-surface-3 text-ink font-display font-bold text-sm flex items-center justify-center shrink-0">
          {number}
        </span>
        <h2 className="font-display font-bold text-xl uppercase">{title}</h2>
      </div>
      {hint && <p className="text-[11px] text-ink-tertiary mb-3 leading-relaxed">{hint}</p>}
      {children}
    </section>
  )
}
