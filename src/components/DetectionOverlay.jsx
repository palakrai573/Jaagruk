/*
 * DetectionOverlay — on-device person and vehicle detection drawn over the feed.
 *
 * WHAT IT IS FOR, CONCRETELY
 *
 *   Headcount at a muster point. The single most common failure in a real
 *   evacuation is not knowing whether everyone got out. Pointing the phone at the
 *   assembly area and reading a count off the screen is a genuine use of a
 *   general-purpose detector.
 *
 *   Vehicle proximity. Pedestrian/vehicle interaction kills people in warehouses
 *   and on haul roads. A large vehicle in frame is worth a warning.
 *
 * WHAT IT IS NOT FOR, AND SAYS SO ON SCREEN
 *
 * The model is COCO-trained. It cannot see doors, extinguishers, hard hats or
 * machine guards, and the `vision_scope` line is rendered next to the counts in
 * every language so nobody infers otherwise from an overlay that looks clever. A
 * worker who believed this was checking for missing PPE would be relying on
 * something that is not watching.
 *
 * COST CONTROL
 *
 * Mounted only when the worker turns it on, because the first run downloads about
 * four megabytes of model. Nothing here starts until then, and the drill is fully
 * functional without it.
 */

import { useEffect, useRef, useState } from 'react'
import {
  createObjectDetectorController,
  emptyDetections,
  visionStatusKey,
  VISION_STATUS,
  DETECTED,
} from '../lib/vision.js'
import { useLanguage } from '../context/LanguageContext.jsx'

/* Fixed hues, matching the rest of the camera chrome: these sit on live video, so
   a theme-aware colour would mean nothing. Boxes use ISO amber for vehicles and a
   neutral light for people — deliberately NOT red, which is reserved for a hazard
   the worker must act on rather than an object that was merely recognised. */
const PERSON_COLOUR = '#F2F1ED'
const VEHICLE_COLOUR = '#FFB020'
const NEAR_COLOUR = '#D93025'

export default function DetectionOverlay({ videoRef }) {
  const { t } = useLanguage()
  const [result, setResult] = useState(emptyDetections)
  const [status, setStatus] = useState(VISION_STATUS.IDLE)
  const controllerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const controller = createObjectDetectorController({
      video: videoRef?.current,
      onResult: (r) => {
        if (mountedRef.current) setResult(r)
      },
      onStatus: (s) => {
        if (mountedRef.current) setStatus(s)
      },
    })
    controllerRef.current = controller
    controller.start()

    return () => {
      mountedRef.current = false
      controller.stop()
      controllerRef.current = null
    }
  }, [videoRef])

  const failed = status === VISION_STATUS.MODEL_FAILED || status === VISION_STATUS.UNSUPPORTED || status === VISION_STATUS.NO_CAMERA
  const live = status === VISION_STATUS.RUNNING || status === VISION_STATUS.READY

  return (
    <>
      {/* Boxes. Decorative: the counts below carry the same information in text,
          and a screen reader cannot use a rectangle. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {result.objects.map((o, i) =>
          o.bbox ? (
            <div
              key={`${o.kind}-${i}-${Math.round(o.bbox.x * 1000)}`}
              className="absolute rounded"
              style={{
                left: `${o.bbox.x * 100}%`,
                top: `${o.bbox.y * 100}%`,
                width: `${o.bbox.w * 100}%`,
                height: `${o.bbox.h * 100}%`,
                border: `2px solid ${
                  o.kind === DETECTED.VEHICLE ? (o.near ? NEAR_COLOUR : VEHICLE_COLOUR) : PERSON_COLOUR
                }`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.55)',
              }}
            >
              <span
                className="absolute left-0 -top-[17px] font-mono text-[9px] uppercase px-1 rounded-sm whitespace-nowrap"
                style={{
                  background:
                    o.kind === DETECTED.VEHICLE ? (o.near ? NEAR_COLOUR : VEHICLE_COLOUR) : PERSON_COLOUR,
                  color: '#101315',
                }}
              >
                {/* The raw model label, not our grouping. If it said "bus" the
                    operator should see "bus" — hiding it behind "vehicle" would
                    conceal what the model actually decided. */}
                {o.label} {Math.round(o.score * 100)}%
              </span>
            </div>
          ) : null,
        )}
      </div>

      {/* Counts and scope. A live region, because the count changing is the
          information — but polite, so it never talks over a drill prompt. */}
      <div
        /* inset-x rather than left/right: this strip is text chrome, not camera
           space, so it should mirror with the reading direction like any other
           text. Only the boxes above are pinned to physical frame coordinates. */
        className="absolute bottom-2 inset-x-2 flex flex-col items-start gap-1 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {result.nearVehicle && (
          <span
            className="font-display font-bold text-[11px] uppercase tracking-wide px-2 py-1 rounded"
            style={{ background: NEAR_COLOUR, color: '#FFFFFF' }}
          >
            {t('vision_vehicle_near')}
          </span>
        )}

        <span className="font-mono text-[10px] bg-black/75 text-white px-2 py-1 rounded">
          {failed
            ? t(visionStatusKey(status))
            : live
              ? result.total === 0
                ? t('vision_none')
                : `${t('vision_people')} ${result.people} · ${t('vision_vehicles')} ${result.vehicles}`
              : t(visionStatusKey(status))}
        </span>

        {/* The honesty line. Rendered whenever the detector is actually running,
            not tucked into a help screen nobody opens. */}
        {live && (
          <span className="font-mono text-[9px] bg-black/60 text-white/75 px-2 py-0.5 rounded leading-snug">
            {t('vision_scope')}
          </span>
        )}
      </div>
    </>
  )
}
