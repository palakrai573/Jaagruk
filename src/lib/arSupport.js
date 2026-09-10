// Can this device actually run the AR drill, and if not, why?
//
// WHY THIS EXISTS
// AR used to be a bare boolean in localStorage defaulting to false. That had
// three consequences, and all three were bad:
//
//  1. A capable phone showed the 3D scene on first run and never mentioned that
//     the camera view existed. The headline feature of an AR submission was off
//     out of the box.
//  2. The Settings toggle would happily read "On" on a laptop with no camera,
//     because nothing checked. The gesture toggle beside it had a capability
//     guard; this one did not.
//  3. Every failure surfaced as "the camera could not start", including the one
//     failure with a specific and fixable cause: the page not being on HTTPS.
//     `navigator.mediaDevices` is undefined outside a secure context, so opening
//     the dev server at http://192.168.x.x:5173 on a phone produces exactly that
//     message while the real problem is the scheme. On localhost — a secure
//     context by definition — it works, so the fault is invisible on the machine
//     doing the developing and only appears on the device that matters.
//
// So capability is computed, the reason is specific, and the stored flag becomes
// an override rather than the source of truth: unset means "use AR if this device
// can", not "off".

export const AR_BLOCK = {
  /** Not a browser, or no window. Server-side render or a hostile sandbox. */
  UNSUPPORTED: 'AR_UNSUPPORTED',
  /** Page is not in a secure context, so mediaDevices does not exist. Fixable. */
  INSECURE_CONTEXT: 'AR_INSECURE_CONTEXT',
  /** Secure, but the browser has no getUserMedia at all. */
  NO_CAMERA_API: 'AR_NO_CAMERA_API',
  /** No DeviceOrientationEvent, so markers cannot be placed on real bearings. */
  NO_ORIENTATION: 'AR_NO_ORIENTATION',
}

/** i18n key for each block reason. */
export const AR_BLOCK_KEYS = {
  [AR_BLOCK.UNSUPPORTED]: 'ar_block_unsupported',
  [AR_BLOCK.INSECURE_CONTEXT]: 'ar_block_insecure',
  [AR_BLOCK.NO_CAMERA_API]: 'ar_block_no_camera',
  [AR_BLOCK.NO_ORIENTATION]: 'ar_block_no_orientation',
}

/**
 * True when the page can reach camera and sensor APIs at all.
 *
 * `window.isSecureContext` is the authoritative check and covers the cases a
 * protocol comparison misses — localhost, 127.0.0.1, and file-served contexts are
 * all secure without being https. Falling back to a scheme test only when the
 * property is absent keeps very old browsers working.
 */
export function secureContext() {
  try {
    if (typeof window === 'undefined') return false
    if (typeof window.isSecureContext === 'boolean') return window.isSecureContext
    const { protocol, hostname } = window.location
    return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Why AR cannot run, or null if it should.
 *
 * Ordered most-specific-first, because the reasons are not independent: an
 * insecure context also has no `mediaDevices`, and reporting the missing API
 * would send someone looking for a browser bug instead of adding a certificate.
 *
 * Orientation is checked last and separately. A device with a camera but no
 * motion sensor can still show the feed; it just cannot anchor markers to real
 * directions, which is what ARDrill's `orientationDead` branch already handles by
 * offering the 3D view. Treating it as a block here means we do not open the
 * camera only to immediately tell the worker it was pointless.
 */
export function arBlocker() {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return AR_BLOCK.UNSUPPORTED
    if (!secureContext()) return AR_BLOCK.INSECURE_CONTEXT
    if (!navigator.mediaDevices?.getUserMedia) return AR_BLOCK.NO_CAMERA_API
    if (!('DeviceOrientationEvent' in window)) return AR_BLOCK.NO_ORIENTATION
    return null
  } catch {
    return AR_BLOCK.UNSUPPORTED
  }
}

/** Convenience inverse of arBlocker(). */
export function arCapable() {
  return arBlocker() === null
}

/**
 * Should the AR view be used for this drill?
 *
 * `stored` is the user's explicit choice from localStorage, or null if they have
 * never expressed one. The distinction matters: a null means we are free to pick
 * the better experience, whereas an explicit false is a decision to respect even
 * on a phone that could manage AR perfectly well.
 *
 * A stored true never overrides a hard block. Someone who enabled AR on their
 * phone and then opened the same app on a desktop should get the 3D scene rather
 * than an error panel.
 */
export function shouldUseAr(stored) {
  if (!arCapable()) return false
  if (stored === null || stored === undefined) return true
  return stored === true
}

/**
 * Advice for a fixable block, so the UI can say something more useful than that
 * it did not work. Only INSECURE_CONTEXT is actionable by the person holding the
 * phone, which is why it is the only one with a hint key.
 */
export function arBlockHintKey(reason) {
  return reason === AR_BLOCK.INSECURE_CONTEXT ? 'ar_block_insecure_hint' : null
}
