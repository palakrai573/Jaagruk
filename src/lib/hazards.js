// Near-miss hazard reporting — the loop that turns a trained worker into a
// sensor for the site.
//
// This is the piece that changes the platform from a one-way pipeline (train,
// certify, forget) into something the site benefits from continuously. A worker
// who has just been taught to recognise an unguarded machine walks past a real
// one an hour later. Without this, that recognition dies in their head. With it,
// it lands on the safety officer's board in ten seconds.
//
// It also gives DGMS something they currently have no access to: ground-level
// hazard data from the workforce, before an accident rather than after one.
//
// LOCATION: tagged by site zone plus compass bearing, not GPS. GPS does not work
// underground, and in a steel shed it is little better. The bearing comes from
// the same orientation tracker the AR drills use, so a report can be tied to
// "the corridor's north-west wall" rather than a useless lat/long. GPS is
// recorded opportunistically when available, as a bonus rather than the anchor.

import { STORE, idbGet, idbPut, idbGetAll, idbQuery, idbDelete } from './idb.js'
import { randomId } from './crypto.js'
import { getActiveSiteId } from './identity.js'
import { normaliseHeading, toFiniteNumber } from './siteMap.js'

export const HAZARD_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
}

export const HAZARD_SEVERITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }

export const SEVERITY_COLOR = {
  [HAZARD_SEVERITY.LOW]: '#2E7D4F',
  [HAZARD_SEVERITY.MEDIUM]: '#FFB020',
  [HAZARD_SEVERITY.HIGH]: '#D93025',
}

/**
 * Report categories, each mapped to a pictogram so the whole reporting flow can
 * be driven without reading a word. The list is deliberately short and concrete
 * — these are the things workers actually walk past.
 */
export const HAZARD_CATEGORY = {
  BLOCKED_EXIT: { id: 'BLOCKED_EXIT', pictogram: 'exit', labelKey: 'hz_cat_blocked_exit', defaultSeverity: HAZARD_SEVERITY.HIGH },
  EXPOSED_WIRING: { id: 'EXPOSED_WIRING', pictogram: 'electric', labelKey: 'hz_cat_wiring', defaultSeverity: HAZARD_SEVERITY.HIGH },
  MISSING_GUARD: { id: 'MISSING_GUARD', pictogram: 'machinery', labelKey: 'hz_cat_guard', defaultSeverity: HAZARD_SEVERITY.HIGH },
  MISSING_EXTINGUISHER: { id: 'MISSING_EXTINGUISHER', pictogram: 'extinguisher', labelKey: 'hz_cat_extinguisher', defaultSeverity: HAZARD_SEVERITY.MEDIUM },
  GAS_SMELL: { id: 'GAS_SMELL', pictogram: 'gas', labelKey: 'hz_cat_gas', defaultSeverity: HAZARD_SEVERITY.HIGH },
  EXCESS_DUST: { id: 'EXCESS_DUST', pictogram: 'dust', labelKey: 'hz_cat_dust', defaultSeverity: HAZARD_SEVERITY.MEDIUM },
  UNSTABLE_LOAD: { id: 'UNSTABLE_LOAD', pictogram: 'unstable_load', labelKey: 'hz_cat_load', defaultSeverity: HAZARD_SEVERITY.MEDIUM },
  DAMAGED_EQUIPMENT: { id: 'DAMAGED_EQUIPMENT', pictogram: 'damaged_ladder', labelKey: 'hz_cat_equipment', defaultSeverity: HAZARD_SEVERITY.MEDIUM },
  NO_PPE: { id: 'NO_PPE', pictogram: 'helmet', labelKey: 'hz_cat_ppe', defaultSeverity: HAZARD_SEVERITY.MEDIUM },
  NO_LOTO: { id: 'NO_LOTO', pictogram: 'lockout', labelKey: 'hz_cat_loto', defaultSeverity: HAZARD_SEVERITY.HIGH },
  OTHER: { id: 'OTHER', pictogram: 'warning', labelKey: 'hz_cat_other', defaultSeverity: HAZARD_SEVERITY.LOW },
}

export const HAZARD_CATEGORY_LIST = Object.values(HAZARD_CATEGORY)

export function categoryMeta(id) {
  return HAZARD_CATEGORY[id] || HAZARD_CATEGORY.OTHER
}

/* ================================================================== */
/* Storage budget                                                      */
/* ================================================================== */

/**
 * Reports carry photos and voice notes, which is the only part of this app that
 * can plausibly fill a phone's storage quota. So the count is capped and old
 * closed reports are evicted first. An open hazard is never evicted — that would
 * be losing exactly the data the feature exists to keep.
 */
export const MAX_REPORTS = 60
export const PHOTO_MAX_DIM = 720
export const PHOTO_QUALITY = 0.62
export const VOICE_MAX_MS = 20000

/* ================================================================== */
/* Photo capture                                                       */
/* ================================================================== */

export const MEDIA_ERROR = {
  DECODE_FAILED: 'IMAGE_DECODE_FAILED',
  ENCODE_FAILED: 'IMAGE_ENCODE_FAILED',
  TOO_LARGE: 'IMAGE_TOO_LARGE',
  MIC_DENIED: 'MIC_DENIED',
  MIC_UNSUPPORTED: 'MIC_UNSUPPORTED',
  RECORD_FAILED: 'RECORD_FAILED',
}

async function decodeImage(blob) {
  // createImageBitmap is faster and avoids a DOM round-trip, but is missing on
  // some older WebViews.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob)
    } catch {
      /* fall through to the <img> path */
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(MEDIA_ERROR.DECODE_FAILED))
    }
    img.src = url
  })
}

/**
 * Downscale and re-encode a captured photo.
 *
 * Three things this buys us beyond size: a phone camera JPEG is 3-8 MB and would
 * blow the storage quota after a dozen reports; re-encoding through a canvas
 * strips EXIF, so a report doesn't quietly carry the worker's GPS coordinates
 * and device serial; and a ~60 KB image syncs over a bad connection.
 *
 * @returns { dataUrl, width, height, bytes }
 */
export async function downscalePhoto(fileOrBlob, { maxDim = PHOTO_MAX_DIM, quality = PHOTO_QUALITY } = {}) {
  if (!fileOrBlob) throw new Error(MEDIA_ERROR.DECODE_FAILED)
  // 40 MB of input is a broken file or a hostile one, not a photo.
  if (fileOrBlob.size && fileOrBlob.size > 40 * 1024 * 1024) throw new Error(MEDIA_ERROR.TOO_LARGE)

  const source = await decodeImage(fileOrBlob)
  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight
  if (!srcW || !srcH) throw new Error(MEDIA_ERROR.DECODE_FAILED)

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  let dataUrl
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(MEDIA_ERROR.ENCODE_FAILED)
    ctx.drawImage(source, 0, 0, width, height)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  } catch {
    throw new Error(MEDIA_ERROR.ENCODE_FAILED)
  } finally {
    if (typeof source.close === 'function') source.close()
  }

  if (!dataUrl || !dataUrl.startsWith('data:image/')) throw new Error(MEDIA_ERROR.ENCODE_FAILED)

  return {
    dataUrl,
    width,
    height,
    // base64 is 4 chars per 3 bytes; close enough for a budget display.
    bytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
  }
}

/* ================================================================== */
/* Voice note                                                          */
/* ================================================================== */

export function voiceRecordingSupported() {
  try {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  } catch {
    return false
  }
}

function pickAudioMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', '']
  for (const type of candidates) {
    if (!type) return ''
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
      /* try the next */
    }
  }
  return ''
}

/**
 * Record a short spoken note.
 *
 * A voice note matters more than a text field for this workforce: a worker who
 * cannot comfortably write Hindi can absolutely describe what they saw. The
 * recording is hard-capped so it can't silently eat storage.
 *
 * @returns { start, stop, cancel, supported }
 */
export function createVoiceRecorder({ maxMs = VOICE_MAX_MS, onComplete, onError, onTick } = {}) {
  if (!voiceRecordingSupported()) {
    return { supported: false, start: () => {}, stop: () => {}, cancel: () => {} }
  }

  let recorder = null
  let stream = null
  let chunks = []
  let stopTimer = null
  let tickTimer = null
  let startedAt = 0
  let cancelled = false

  const cleanup = () => {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          /* already stopped */
        }
      })
      stream = null
    }
    recorder = null
  }

  return {
    supported: true,

    async start() {
      cancelled = false
      chunks = []
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        const name = err?.name || ''
        onError?.(name === 'NotAllowedError' || name === 'SecurityError' ? MEDIA_ERROR.MIC_DENIED : MEDIA_ERROR.MIC_UNSUPPORTED)
        return false
      }

      try {
        const mimeType = pickAudioMime()
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      } catch {
        cleanup()
        onError?.(MEDIA_ERROR.RECORD_FAILED)
        return false
      }

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data)
      }

      recorder.onerror = () => {
        cleanup()
        onError?.(MEDIA_ERROR.RECORD_FAILED)
      }

      recorder.onstop = async () => {
        const durationMs = Date.now() - startedAt
        const type = recorder?.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type })
        cleanup()
        if (cancelled || !blob.size) return
        try {
          const dataUrl = await blobToDataUrl(blob)
          onComplete?.({ dataUrl, durationMs, bytes: blob.size, mimeType: type })
        } catch {
          onError?.(MEDIA_ERROR.RECORD_FAILED)
        }
      }

      startedAt = Date.now()
      try {
        recorder.start()
      } catch {
        cleanup()
        onError?.(MEDIA_ERROR.RECORD_FAILED)
        return false
      }

      stopTimer = setTimeout(() => {
        try {
          recorder?.stop()
        } catch {
          cleanup()
        }
      }, maxMs)

      if (onTick) {
        tickTimer = setInterval(() => {
          onTick(Math.min(maxMs, Date.now() - startedAt), maxMs)
        }, 200)
      }

      return true
    },

    stop() {
      if (!recorder) return
      try {
        recorder.stop()
      } catch {
        cleanup()
      }
    },

    cancel() {
      cancelled = true
      if (recorder) {
        try {
          recorder.stop()
        } catch {
          /* fall through to cleanup */
        }
      }
      cleanup()
    },
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(MEDIA_ERROR.RECORD_FAILED))
    reader.readAsDataURL(blob)
  })
}

/* ================================================================== */
/* Optional GPS                                                        */
/* ================================================================== */

/**
 * Try for a coordinate, but never block on it. Underground this will fail or
 * return something wrong, which is exactly why the zone bearing is the primary
 * location and this is a bonus field.
 */
export function tryGetPosition({ timeoutMs = 6000 } = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation?.getCurrentPosition) {
      resolve(null)
      return
    }
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          finish({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            at: pos.timestamp,
          }),
        () => finish(null),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
      )
    } catch {
      finish(null)
    }
    setTimeout(() => finish(null), timeoutMs + 500)
  })
}

/* ================================================================== */
/* Reports                                                             */
/* ================================================================== */

/**
 * File a report. Writes locally first and always succeeds from the worker's
 * point of view — a hazard report that fails because the network is down would
 * defeat the entire purpose.
 *
 * @returns the stored report, with `persisted: false` if storage rejected it
 */
export async function createHazardReport({
  category = HAZARD_CATEGORY.OTHER.id,
  severity = null,
  note = '',
  photo = null,
  voice = null,
  zoneId = null,
  zoneName = '',
  bearing = null,
  elevation = null,
  gps = null,
  reportedBy = '',
  reporterName = '',
  siteId = getActiveSiteId(),
} = {}) {
  const meta = categoryMeta(category)
  const bearingValue = toFiniteNumber(bearing)

  const report = {
    id: `hz_${randomId(9)}`,
    siteId: siteId || 'site-default',
    category: meta.id,
    severity: Object.values(HAZARD_SEVERITY).includes(severity) ? severity : meta.defaultSeverity,
    status: HAZARD_STATUS.OPEN,
    note: String(note || '').slice(0, 400),
    photo: photo?.dataUrl || null,
    photoBytes: photo?.bytes || 0,
    voice: voice?.dataUrl || null,
    voiceMs: voice?.durationMs || 0,
    voiceBytes: voice?.bytes || 0,
    zoneId: zoneId || null,
    zoneName: String(zoneName || '').slice(0, 60),
    bearing: bearingValue === null ? null : normaliseHeading(bearingValue),
    elevation: toFiniteNumber(elevation),
    gps: gps || null,
    reportedBy: reportedBy || '',
    reporterName: String(reporterName || '').slice(0, 60),
    at: Date.now(),
    updatedAt: Date.now(),
    history: [{ status: HAZARD_STATUS.OPEN, at: Date.now(), by: reportedBy || '' }],
  }

  try {
    await evictIfNeeded(report.siteId)
    await idbPut(STORE.HAZARDS, report)
    return { ...report, persisted: true }
  } catch (err) {
    return { ...report, persisted: false, storageError: err?.message || 'STORAGE_WRITE_FAILED' }
  }
}

/**
 * Make room for a new report by dropping the oldest CLOSED ones.
 * Open and acknowledged hazards are never evicted.
 */
async function evictIfNeeded(siteId) {
  const all = await idbGetAll(STORE.HAZARDS)
  if (all.length < MAX_REPORTS) return

  const closed = all
    .filter((h) => h.status === HAZARD_STATUS.RESOLVED || h.status === HAZARD_STATUS.DISMISSED)
    .sort((a, b) => a.at - b.at)

  const overBy = all.length - MAX_REPORTS + 1
  for (let i = 0; i < Math.min(overBy, closed.length); i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await idbDelete(STORE.HAZARDS, closed[i].id)
  }

  // If everything on the device is still open, drop the media from the oldest
  // rather than the record itself. Losing a photo is recoverable; losing the
  // knowledge that a hazard exists is not.
  const remaining = await idbGetAll(STORE.HAZARDS)
  if (remaining.length >= MAX_REPORTS) {
    const oldestWithMedia = remaining
      .filter((h) => h.photo || h.voice)
      .sort((a, b) => a.at - b.at)[0]
    if (oldestWithMedia) {
      // eslint-disable-next-line no-await-in-loop
      await idbPut(STORE.HAZARDS, {
        ...oldestWithMedia,
        photo: null,
        voice: null,
        mediaDropped: true,
        updatedAt: Date.now(),
      })
    }
  }
  void siteId
}

export async function getHazard(id) {
  return idbGet(STORE.HAZARDS, id)
}

export async function listHazards({ siteId = null, status = null } = {}) {
  let rows = siteId ? await idbQuery(STORE.HAZARDS, 'siteId', siteId) : await idbGetAll(STORE.HAZARDS)
  if (status) rows = rows.filter((h) => h.status === status)
  return rows.sort((a, b) => b.at - a.at)
}

const STATUS_FLOW = {
  [HAZARD_STATUS.OPEN]: [HAZARD_STATUS.ACKNOWLEDGED, HAZARD_STATUS.RESOLVED, HAZARD_STATUS.DISMISSED],
  [HAZARD_STATUS.ACKNOWLEDGED]: [HAZARD_STATUS.RESOLVED, HAZARD_STATUS.DISMISSED],
  [HAZARD_STATUS.RESOLVED]: [HAZARD_STATUS.OPEN],
  [HAZARD_STATUS.DISMISSED]: [HAZARD_STATUS.OPEN],
}

export function allowedTransitions(status) {
  return STATUS_FLOW[status] || []
}

/**
 * Move a report through triage. Illegal transitions are rejected rather than
 * silently applied, and every change appends to the history so the audit trail
 * shows who closed what and when.
 */
export async function updateHazardStatus(id, nextStatus, { by = '', comment = '' } = {}) {
  const report = await getHazard(id)
  if (!report) throw new Error('HAZARD_NOT_FOUND')
  if (!Object.values(HAZARD_STATUS).includes(nextStatus)) throw new Error('BAD_STATUS')
  if (report.status === nextStatus) return report
  if (!allowedTransitions(report.status).includes(nextStatus)) throw new Error('ILLEGAL_TRANSITION')

  const next = {
    ...report,
    status: nextStatus,
    updatedAt: Date.now(),
    history: [
      ...(report.history || []),
      { status: nextStatus, at: Date.now(), by: by || '', comment: String(comment || '').slice(0, 200) },
    ],
  }
  await idbPut(STORE.HAZARDS, next)
  return next
}

export async function deleteHazard(id) {
  await idbDelete(STORE.HAZARDS, id)
}

/* ================================================================== */
/* Rollups                                                             */
/* ================================================================== */

export async function hazardStats(siteId = null) {
  const rows = siteId ? await idbQuery(STORE.HAZARDS, 'siteId', siteId) : await idbGetAll(STORE.HAZARDS)

  const byStatus = { open: 0, acknowledged: 0, resolved: 0, dismissed: 0 }
  const bySeverity = { low: 0, medium: 0, high: 0 }
  const byCategory = {}
  let mediaBytes = 0
  let oldestOpenAt = 0

  for (const h of rows) {
    if (byStatus[h.status] !== undefined) byStatus[h.status] += 1
    if (bySeverity[h.severity] !== undefined) bySeverity[h.severity] += 1
    byCategory[h.category] = (byCategory[h.category] || 0) + 1
    mediaBytes += (h.photoBytes || 0) + (h.voiceBytes || 0)
    if (h.status === HAZARD_STATUS.OPEN) {
      oldestOpenAt = oldestOpenAt ? Math.min(oldestOpenAt, h.at) : h.at
    }
  }

  const openHighCount = rows.filter(
    (h) => h.status === HAZARD_STATUS.OPEN && h.severity === HAZARD_SEVERITY.HIGH
  ).length

  return {
    total: rows.length,
    byStatus,
    bySeverity,
    byCategory,
    openHighCount,
    mediaBytes,
    oldestOpenAt,
    // Age of the oldest unaddressed high-severity report, in days — the single
    // number a safety officer should be judged on.
    oldestOpenDays: oldestOpenAt ? Math.floor((Date.now() - oldestOpenAt) / 86400000) : 0,
    capacityUsedPct: Math.round((rows.length / MAX_REPORTS) * 100),
  }
}

/**
 * Group open reports by zone and bearing sector for the dashboard map. Twelve
 * 30-degree sectors is enough resolution to say "three reports on the north-west
 * wall" without pretending we have metre-level accuracy.
 */
export function clusterByBearing(reports, sectors = 12) {
  const size = 360 / sectors
  const clusters = new Map()

  for (const h of reports || []) {
    const bearing = toFiniteNumber(h.bearing)
    const key = bearing === null ? 'unknown' : `${h.zoneId || 'none'}#${Math.floor(normaliseHeading(bearing) / size)}`
    const existing = clusters.get(key) || {
      key,
      zoneId: h.zoneId || null,
      zoneName: h.zoneName || '',
      sector: bearing === null ? null : Math.floor(normaliseHeading(bearing) / size),
      centreBearing: bearing === null ? null : Math.floor(normaliseHeading(bearing) / size) * size + size / 2,
      count: 0,
      highCount: 0,
      reports: [],
    }
    existing.count += 1
    if (h.severity === HAZARD_SEVERITY.HIGH) existing.highCount += 1
    existing.reports.push(h)
    clusters.set(key, existing)
  }

  return [...clusters.values()].sort((a, b) => b.count - a.count)
}

/* ================================================================== */
/* Transport shape                                                     */
/* ================================================================== */

/**
 * Strip a report down for sync. Media is excluded by default because a batch of
 * 30 reports with photos is several megabytes over a link that may be a single
 * bar of 2G at the pit office.
 */
export function toTransport(report, { includeMedia = false } = {}) {
  if (!report) return null
  return {
    id: report.id,
    siteId: report.siteId,
    category: report.category,
    severity: report.severity,
    status: report.status,
    note: report.note,
    zoneId: report.zoneId,
    zoneName: report.zoneName,
    bearing: report.bearing,
    elevation: report.elevation,
    gps: report.gps,
    reportedBy: report.reportedBy,
    reporterName: report.reporterName,
    at: report.at,
    updatedAt: report.updatedAt,
    history: report.history || [],
    hasPhoto: !!report.photo,
    hasVoice: !!report.voice,
    photo: includeMedia ? report.photo : null,
    voice: includeMedia ? report.voice : null,
  }
}

/**
 * Merge reports received from another device.
 *
 * Last-write-wins on `updatedAt`, which is the right rule here: a supervisor
 * resolving a hazard is a later, more authoritative fact than the worker's
 * original open report. Media already held locally is never overwritten with a
 * null from a media-stripped transport copy.
 */
export async function mergeHazards(incoming) {
  const rows = Array.isArray(incoming) ? incoming : []
  if (!rows.length) return { added: 0, updated: 0, skipped: 0 }

  const existing = await idbGetAll(STORE.HAZARDS)
  const byId = new Map(existing.map((h) => [h.id, h]))

  let added = 0
  let updated = 0
  let skipped = 0

  for (const candidate of rows) {
    if (!candidate?.id || !candidate?.category || !Object.values(HAZARD_STATUS).includes(candidate.status)) {
      skipped += 1
      continue
    }

    const current = byId.get(candidate.id)
    if (!current) {
      // eslint-disable-next-line no-await-in-loop
      await idbPut(STORE.HAZARDS, {
        ...candidate,
        photo: candidate.photo || null,
        voice: candidate.voice || null,
        photoBytes: candidate.photo ? Math.round(candidate.photo.length * 0.75) : 0,
        voiceBytes: candidate.voice ? Math.round(candidate.voice.length * 0.75) : 0,
        imported: true,
      })
      added += 1
      continue
    }

    if ((candidate.updatedAt || 0) <= (current.updatedAt || 0)) {
      skipped += 1
      continue
    }

    // eslint-disable-next-line no-await-in-loop
    await idbPut(STORE.HAZARDS, {
      ...current,
      ...candidate,
      photo: candidate.photo || current.photo || null,
      voice: candidate.voice || current.voice || null,
      photoBytes: current.photoBytes || 0,
      voiceBytes: current.voiceBytes || 0,
      history: mergeHistory(current.history, candidate.history),
      updatedAt: candidate.updatedAt,
    })
    updated += 1
  }

  return { added, updated, skipped }
}

function mergeHistory(a, b) {
  const combined = [...(a || []), ...(b || [])]
  const seen = new Set()
  return combined
    .filter((entry) => {
      const key = `${entry.status}#${entry.at}#${entry.by || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((x, y) => (x.at || 0) - (y.at || 0))
}
