import { useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { analyzeHazardImage, getApiKey } from '../lib/api.js'
import { addLogEntry } from '../lib/store.js'
import { speak } from '../lib/speech.js'
import RiskGauge from '../components/RiskGauge.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

// ISO fills, used as borders and chip backgrounds. Identical in both themes,
const severityColor = { low: 'rgb(var(--safe))', medium: 'rgb(var(--warning))', high: 'rgb(var(--hazard))' }

export default function HazardScan() {
  const { t, lang } = useLanguage()
  const fileInputRef = useRef(null)
  const imgRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    setError(null)
    setResult(null)
    setMimeType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setImageSrc(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }, [])

  const runScan = async () => {
    if (!getApiKey()) {
      setError('NO_KEY')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeHazardImage(imageBase64, mimeType)
      setResult(data)
      addLogEntry({ type: 'scan', riskScore: data.riskScore || 0, hazardCount: data.hazards?.length || 0 })
      // Pass the active language through. Without it the summary was read by an
      // English voice regardless of what the worker had selected.
      if (data.summary) speak(data.summary, lang)
    } catch (e) {
      setError(e.message || 'Something went wrong analyzing the image.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <p className="font-mono text-amber text-xs tracking-[0.2em] uppercase mb-3">{t('scan_eyebrow')}</p>
      <h1 className="font-display font-bold text-4xl md:text-5xl uppercase mb-2">{t('scan_title')}</h1>
      <p className="text-concrete mb-8 max-w-xl">{t('scan_desc')}</p>

      {!imageSrc && (
        <div className="border-2 border-dashed border-steel-lighter rounded-lg p-14 text-center bg-steel-light">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber text-steel font-display font-bold text-xl uppercase px-8 py-4 rounded hover:bg-white transition-colors"
          >
            {t('scan_open')}
          </button>
          <p className="text-concrete text-xs mt-4 font-mono">{t('scan_hint')}</p>
        </div>
      )}

      {imageSrc && (
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-8">
          <div className="relative rounded-lg overflow-hidden border border-steel-lighter bg-steel-light">
            <img ref={imgRef} src={imageSrc} alt="Captured work area" className="w-full block" />
            {result?.hazards?.map((h, i) => (
              <HazardBox key={i} hazard={h} />
            ))}
            {!result && (
              <div className="absolute bottom-3 left-3 right-3 flex gap-3">
                <button
                  onClick={runScan}
                  disabled={loading}
                  className="flex-1 bg-amber text-steel font-display font-bold text-lg uppercase py-3 rounded disabled:opacity-60"
                >
                  {loading ? t('scan_analyzing') : t('scan_run')}
                </button>
                <button
                  onClick={() => {
                    setImageSrc(null)
                    setResult(null)
                  }}
                  className="px-4 border border-concrete rounded text-sm font-mono"
                >
                  {t('scan_retake')}
                </button>
              </div>
            )}
          </div>

          <div>
            {error === 'NO_KEY' && (
              <div className="bg-hazard/10 border border-hazard rounded p-4 text-sm">
                <p className="font-bold text-hazard mb-1">{t('scan_no_key_title')}</p>
                <p className="text-concrete">
                  {t('scan_no_key_body')}{' '}
                  <Link to="/settings" className="text-amber underline">
                    {t('nav_settings')}
                  </Link>
                </p>
              </div>
            )}
            {error && error !== 'NO_KEY' && (
              <div className="bg-hazard/10 border border-hazard rounded p-4 text-sm text-hazard">{error}</div>
            )}

            {result && (
              <div className="space-y-6">
                <RiskGauge score={result.riskScore || 0} />
                <p className="text-sm text-concrete leading-relaxed border-t border-steel-lighter pt-4">
                  {result.summary}
                </p>
                <div className="space-y-3">
                  {(result.hazards || []).length === 0 && (
                    <p className="font-mono text-safe text-sm">{t('scan_no_hazards')}</p>
                  )}
                  {(result.hazards || []).map((h, i) => (
                    <div key={i} className="bg-steel-light border-l-4 rounded p-3" style={{ borderColor: severityColor[h.severity] || '#8B8F94' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm uppercase">{h.label}</span>
                        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: severityColor[h.severity] }}>
                          {h.severity}
                        </span>
                      </div>
                      <p className="text-xs text-concrete">{h.description}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setImageSrc(null)
                    setResult(null)
                  }}
                  className="w-full border border-concrete rounded py-3 font-mono text-sm hover:border-amber hover:text-amber"
                >
                  {t('scan_another')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HazardBox({ hazard }) {
  const [x, y, w, h] = hazard.bbox || [0.1, 0.1, 0.3, 0.3]
  const color = severityColor[hazard.severity] || 'rgb(var(--warning))'
  return (
    <div
      className="absolute border-2 rounded"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        borderColor: color,
        // A translucent inner glow reads as a highlight over a photo. The
        // previous value was `0 0 0 9999px rgba(0,0,0,0)` — a fully transparent
        // spread, so it rendered nothing at all.
        boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.45), 0 0 12px ${color}55`,
      }}
    >
      <span
        className="absolute -top-6 left-0 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded whitespace-nowrap"
        style={{ backgroundColor: color, color: '#1C1F22' }}
      >
        {hazard.label}
      </span>
    </div>
  )
}
