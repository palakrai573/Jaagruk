import { useEffect, useRef, useState } from 'react'
import { createQrScanner, barcodeDetectionSupported } from '../lib/p2p.js'
import { openRearCamera, stopStream, CAMERA_ERROR } from '../lib/siteMap.js'
import Pictogram from '../lib/pictograms.jsx'
import { useLanguage } from '../context/LanguageContext.jsx'

/**
 * Camera QR reader, shared by certificate verification, buddy pairing and peer
 * sync.
 *
 * Falls back to an explanatory message when the browser has no BarcodeDetector,
 * because every caller also offers a paste-the-code field. A text field is
 * unglamorous but it always works, and a pairing that cannot start is worse than
 * one that starts slowly.
 */

const ERROR_KEYS = {
  [CAMERA_ERROR.PERMISSION_DENIED]: 'ar_camera_denied',
  [CAMERA_ERROR.NOT_FOUND]: 'ar_camera_missing',
  [CAMERA_ERROR.IN_USE]: 'ar_camera_in_use',
  [CAMERA_ERROR.UNSUPPORTED]: 'ar_camera_unsupported',
  [CAMERA_ERROR.UNKNOWN]: 'ar_camera_unknown',
}

export default function QrScanner({ onResult, height = 260, hint }) {
  const { t } = useLanguage()

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scannerRef = useRef(null)
  const resultRef = useRef(onResult)
  resultRef.current = onResult

  const [error, setError] = useState(() => (barcodeDetectionSupported() ? null : 'bd_qr_unsupported'))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!barcodeDetectionSupported()) return undefined

    let cancelled = false

    ;(async () => {
      let stream
      try {
        stream = await openRearCamera()
      } catch (err) {
        if (!cancelled) setError(ERROR_KEYS[err?.message] || 'ar_camera_unknown')
        return
      }

      if (cancelled) {
        stopStream(stream)
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stopStream(stream)
        return
      }

      video.srcObject = stream
      try {
        await video.play()
      } catch {
        if (!cancelled) setError('ar_camera_unknown')
        return
      }

      if (cancelled) return
      setReady(true)

      scannerRef.current = await createQrScanner({
        video,
        // Route through a ref so a caller passing an inline arrow does not
        // restart the scanner on every one of its own renders.
        onResult: (value) => resultRef.current?.(value),
        onError: () => setError('bd_qr_unsupported'),
      })
    })()

    return () => {
      cancelled = true
      scannerRef.current?.stop()
      scannerRef.current = null
      stopStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) {
        try {
          video.pause()
          video.srcObject = null
        } catch {
          /* already torn down */
        }
      }
    }
  }, [])

  if (error) {
    return (
      <div className="border border-line-subtle rounded-lg p-5 flex items-start gap-3">
        <Pictogram name="warning" size={24} />
        <p className="text-xs text-ink-tertiary leading-relaxed">{t(error)}</p>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-line-subtle bg-surface-0"
      style={{ height }}
    >
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary">{t('ar_starting')}</p>
        </div>
      )}

      {/* Framing guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-2 border-brand rounded-lg" style={{ width: height * 0.6, height: height * 0.6 }} />
      </div>

      <p className="absolute bottom-2 inset-x-0 text-center font-mono text-[10px] text-ink pointer-events-none">
        {hint || t('bd_scan_now')}
      </p>
    </div>
  )
}
