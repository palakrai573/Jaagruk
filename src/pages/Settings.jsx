import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getApiKey, setApiKey, getProvider, setProvider } from '../lib/api.js'
import { LANGUAGES, allCoverage } from '../lib/i18n.js'
import { voiceAvailability, speak, SPEECH_IS_SUBSTITUTE } from '../lib/speech.js'
import { gestureBlocker, gestureStatusKey } from '../lib/gesture.js'
import { storageStatus, idbClearAll, requestPersistence } from '../lib/idb.js'
import { getSyncEndpoint, setSyncEndpoint, queueStats, rebuildQueue } from '../lib/sync.js'
import { getCurrentWorker, logout, ROLE } from '../lib/identity.js'
import { LS, lsGetBool, lsSetBool, lsRemove } from '../lib/local.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Settings.
 *
 * The accessibility modes come first because they are the ones that decide
 * whether the app is usable at all for the workforce this is built for. Provider
 * keys and sync plumbing come after.
 *
 * Capability reporting here is deliberately blunt: if this device has no Hindi
 * voice installed, or the browser refuses persistent storage, or hand tracking
 * cannot run, the page says so. Silently degrading would leave a supervisor
 * assuming a feature works on hardware where it does not.
 */

export default function Settings() {
  const { t, lang, setLang } = useLanguage()

  const [key, setKey] = useState(() => getApiKey())
  const [provider, setProviderState] = useState(() => getProvider())
  const [saved, setSaved] = useState(false)

  const [pictogramMode, setPictogramMode] = useState(() => lsGetBool(LS.MODE_PICTOGRAM, false))
  const [voiceMode, setVoiceMode] = useState(() => lsGetBool(LS.MODE_VOICE, false))
  const [gestureMode, setGestureMode] = useState(() => lsGetBool(LS.MODE_GESTURE, false))
  const [arMode, setArMode] = useState(() => lsGetBool(LS.MODE_AR, false))

  const [endpoint, setEndpoint] = useState(() => getSyncEndpoint())
  const [endpointError, setEndpointError] = useState(null)
  const [endpointSaved, setEndpointSaved] = useState(false)

  const [storage, setStorage] = useState(null)
  const [queue, setQueue] = useState(null)
  const [worker, setWorker] = useState(null)
  const [voices, setVoices] = useState([])
  const [resetText, setResetText] = useState('')
  const [resetting, setResetting] = useState(false)

  const gestureBlock = gestureBlocker()

  const refresh = useCallback(async () => {
    const [status, queueInfo, current] = await Promise.all([storageStatus(), queueStats(), getCurrentWorker()])
    setStorage(status)
    setQueue(queueInfo)
    setWorker(current)
    setVoices(voiceAvailability())
  }, [])

  useEffect(() => {
    refresh()
    // Voice list populates asynchronously in Chrome, so re-read shortly after.
    const timer = setTimeout(() => setVoices(voiceAvailability()), 1200)
    return () => clearTimeout(timer)
  }, [refresh])

  const saveProvider = () => {
    setApiKey(key.trim())
    setProvider(provider)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveEndpoint = () => {
    const result = setSyncEndpoint(endpoint)
    if (!result.ok) {
      setEndpointError(`st_${result.error}`)
      setEndpointSaved(false)
      return
    }
    setEndpointError(null)
    setEndpointSaved(true)
    setEndpoint(result.url || '')
    setTimeout(() => setEndpointSaved(false), 2000)
    refresh()
  }

  const toggle = (value, setter, storageKey) => {
    const next = !value
    setter(next)
    lsSetBool(storageKey, next)
  }

  const eraseDevice = async () => {
    setResetting(true)
    try {
      await idbClearAll()
      // Clear the app's own settings but leave nothing half-configured.
      Object.values(LS).forEach((k) => lsRemove(k))
      logout()
      window.location.hash = '#/'
      window.location.reload()
    } finally {
      setResetting(false)
    }
  }

  const coverage = allCoverage()

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <p className="font-mono text-brand-text text-xs tracking-[0.2em] uppercase mb-3">{t('set_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl uppercase mb-8">{t('set_title')}</h1>

      {/* ---------------- session ---------------- */}
      <Card>
        <SectionTitle pictogram={worker ? 'ppe' : 'buddy'} title={t('ob_signed_in_as')} />
        {worker ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold">{worker.name}</p>
              <p className="font-mono text-[10px] text-ink-tertiary mt-0.5">
                {worker.role === ROLE.SUPERVISOR ? t('site_eyebrow') : t('nav_train')}
                {worker.phone && ` · ${worker.phone}`}
              </p>
            </div>
            <Link
              to="/start"
              className="font-mono text-xs border border-line-subtle rounded px-4 py-2 text-ink-tertiary hover:border-brand hover:text-brand-text"
            >
              {t('ob_sign_out')}
            </Link>
          </div>
        ) : (
          <Link
            to="/start"
            className="inline-block bg-brand text-ink-onBrand font-bold text-xs uppercase px-5 py-2.5 rounded"
          >
            {t('ob_sign_in')}
          </Link>
        )}
      </Card>

      {/* ---------------- accessibility modes ---------------- */}
      <Card>
        <SectionTitle pictogram="listen" title={t('st_modes_title')} />

        <Toggle
          pictogram="exit_arrow"
          label={t('st_pictogram_mode')}
          hint={t('st_pictogram_hint')}
          on={pictogramMode}
          onToggle={() => toggle(pictogramMode, setPictogramMode, LS.MODE_PICTOGRAM)}
          t={t}
        />
        <Toggle
          pictogram="listen"
          label={t('st_voice_mode')}
          hint={t('st_voice_hint')}
          on={voiceMode}
          onToggle={() => toggle(voiceMode, setVoiceMode, LS.MODE_VOICE)}
          t={t}
        />
        <Toggle
          pictogram="gloves"
          label={t('st_gesture_mode')}
          hint={t('st_gesture_hint')}
          on={gestureMode}
          disabled={!!gestureBlock}
          disabledReason={gestureBlock ? t(gestureStatusKey(gestureBlock)) : null}
          onToggle={() => toggle(gestureMode, setGestureMode, LS.MODE_GESTURE)}
          t={t}
        />
        <Toggle
          pictogram="warning"
          label={t('st_ar_mode')}
          hint={t('st_ar_hint')}
          on={arMode}
          onToggle={() => toggle(arMode, setArMode, LS.MODE_AR)}
          t={t}
          last
        />
      </Card>

      {/* ---------------- language ---------------- */}
      <Card>
        <SectionTitle pictogram="assembly_point" title={t('set_language_label')} />

        <div className="grid grid-cols-3 gap-2 mb-5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code)
                speak(l.native, l.code)
              }}
              className={`rounded p-2.5 font-mono text-sm border ${
                lang === l.code ? 'border-brand text-brand-text bg-brand-subtle' : 'border-line-subtle text-ink-tertiary'
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>

        {/* Measured coverage, not a claim */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary mb-2">{t('st_voice_check')}</p>
        <div className="space-y-1.5">
          {coverage.map((c) => {
            const voice = voices.find((v) => v.lang === c.code)
            return (
              <div key={c.code} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-ink-tertiary min-w-0 truncate">{c.label}</span>
                <span className="flex items-center gap-3 shrink-0 font-mono">
                  <span style={{ color: c.percent >= 92 ? 'rgb(var(--safe-text))' : 'rgb(var(--warning-text))' }}>{c.percent}%</span>
                  <span
                    className="text-[10px]"
                    style={{ color: voice?.available ? 'rgb(var(--safe-text))' : 'rgb(var(--text-tertiary))' }}
                  >
                    {voice?.available
                      ? SPEECH_IS_SUBSTITUTE[c.code]
                        ? t('st_voice_substitute')
                        : voice.voiceName?.slice(0, 18) || '✓'
                      : t('st_voice_missing')}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ---------------- AI provider ---------------- */}
      <Card>
        <SectionTitle pictogram="report_it" title={t('set_provider_label')} />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => setProviderState('gemini')}
            className={`rounded p-3 font-mono text-sm border ${
              provider === 'gemini' ? 'border-brand text-brand-text bg-brand-subtle' : 'border-line-subtle text-ink-tertiary'
            }`}
          >
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => setProviderState('openai')}
            className={`rounded p-3 font-mono text-sm border ${
              provider === 'openai' ? 'border-brand text-brand-text bg-brand-subtle' : 'border-line-subtle text-ink-tertiary'
            }`}
          >
            OpenAI
          </button>
        </div>
        <p className="text-xs text-ink-tertiary mb-5">{t('set_provider_hint')}</p>

        <label className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary block mb-2">
          {t('set_key_label')}
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t('set_key_placeholder')}
          autoComplete="off"
          className="w-full bg-surface-inset border border-line-subtle rounded px-4 py-3 font-mono text-sm focus:border-brand outline-none"
        />
        <p className="text-xs text-ink-tertiary mt-2 mb-4 leading-relaxed">{t('set_key_hint1')}</p>

        <button
          type="button"
          onClick={saveProvider}
          className="w-full bg-brand text-ink-onBrand font-display font-bold uppercase py-3 rounded"
        >
          {saved ? t('set_saved') : t('set_save')}
        </button>

        <div className="mt-5 text-xs text-ink-tertiary space-y-1">
          <p className="font-bold text-ink mb-1">{t('set_getting_key')}</p>
          <p>• Gemini: aistudio.google.com/apikey</p>
          <p>• OpenAI: platform.openai.com/api-keys</p>
        </div>
      </Card>

      {/* ---------------- storage ---------------- */}
      <Card>
        <SectionTitle pictogram="lockout" title={t('db_all_local')} />

        {storage && (
          <div className="space-y-2 mb-4">
            <Row
              label={t('st_on')}
              value={storage.persistent ? t('st_on') : t('st_off')}
              warn={!storage.persistent}
            />
            {storage.usage !== null && storage.quota !== null && storage.quota > 0 && (
              <Row
                label="Used"
                value={`${Math.round(storage.usage / 1024 / 1024)} MB / ${Math.round(
                  storage.quota / 1024 / 1024
                )} MB`}
              />
            )}
            {queue && <Row label={t('db_pending_sync')} value={queue.total} />}
          </div>
        )}

        {storage && !storage.persistent && (
          <div className="bg-hazard/10 border border-hazard/40 rounded p-3 mb-4 flex items-start gap-3">
            <Pictogram name="warning" size={20} />
            <div>
              <p className="text-[11px] text-ink-tertiary leading-relaxed mb-2">{t('db_storage_temp')}</p>
              <button
                type="button"
                onClick={async () => {
                  await requestPersistence()
                  refresh()
                }}
                className="font-mono text-[10px] uppercase text-brand-text underline"
              >
                {t('retry_label')}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            await rebuildQueue({})
            refresh()
          }}
          className="w-full border border-line rounded py-2.5 font-mono text-xs hover:border-brand hover:text-brand-text"
        >
          {t('ad_sync_pending')}
        </button>
      </Card>

      {/* ---------------- central upload ---------------- */}
      <Card>
        <SectionTitle pictogram="alarm" title={t('st_sync_title')} />
        <p className="text-xs text-ink-tertiary mb-4 leading-relaxed">{t('st_sync_hint')}</p>

        <input
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://…"
          className="w-full bg-surface-inset border border-line-subtle rounded px-4 py-3 font-mono text-sm focus:border-brand outline-none"
        />
        {endpointError && <p className="text-xs text-hazard-text mt-2">{t(endpointError)}</p>}

        <button
          type="button"
          onClick={saveEndpoint}
          className="w-full border border-line rounded py-2.5 font-mono text-xs mt-3 hover:border-brand hover:text-brand-text"
        >
          {endpointSaved ? t('set_saved') : t('save_label')}
        </button>
      </Card>

      {/* ---------------- danger zone ---------------- */}
      <Card danger>
        <SectionTitle pictogram="do_not_enter" title={t('st_reset_device')} />
        <p className="text-xs text-ink-tertiary mb-4 leading-relaxed">{t('st_reset_warning')}</p>

        <input
          type="text"
          value={resetText}
          onChange={(e) => setResetText(e.target.value)}
          placeholder={t('st_reset_confirm')}
          className="w-full bg-surface-inset border border-line-subtle rounded px-4 py-2.5 font-mono text-sm focus:border-hazard outline-none mb-3"
        />
        <button
          type="button"
          onClick={eraseDevice}
          disabled={resetText !== 'ERASE' || resetting}
          className="w-full bg-hazard text-white font-display font-bold uppercase py-3 rounded disabled:opacity-30"
        >
          {resetting ? t('loading_label') : t('st_reset_device')}
        </button>
      </Card>
    </div>
  )
}

/* ================================================================== */

function Card({ children, danger }) {
  return (
    <div
      className={`rounded-lg p-6 mb-6 ${
        danger ? 'bg-hazard/5 border border-hazard/40' : 'bg-surface-1 border border-line-subtle'
      }`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ pictogram, title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Pictogram name={pictogram} size={26} />
      <h2 className="font-display font-bold text-xl uppercase">{title}</h2>
    </div>
  )
}

function Toggle({ pictogram, label, hint, on, onToggle, disabled, disabledReason, t, last }) {
  return (
    <div className={`flex items-start gap-4 py-4 ${last ? '' : 'border-b border-line-subtle'}`}>
      <Pictogram name={pictogram} size={32} />

      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">{label}</p>
        <p className="text-[11px] text-ink-tertiary mt-1 leading-relaxed">{hint}</p>
        {disabled && disabledReason && (
          <p className="text-[11px] text-hazard-text mt-1.5 leading-relaxed">{disabledReason}</p>
        )}
      </div>

      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        aria-pressed={on}
        className={`shrink-0 font-mono text-[10px] uppercase tracking-widest rounded px-3 py-2 border ${
          on ? 'border-brand text-brand-text bg-brand-subtle' : 'border-line-subtle text-ink-tertiary'
        } ${disabled ? 'opacity-40 cursor-default' : ''}`}
      >
        {on ? t('st_on') : t('st_off')}
      </button>
    </div>
  )
}

function Row({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary">{label}</span>
      <span className={`font-mono ${warn ? 'text-hazard-text' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
