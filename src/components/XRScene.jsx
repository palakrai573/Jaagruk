/*
 * The contents of an immersive-ar session: a hit-test reticle and anchors placed at
 * real, measured positions.
 *
 * WHY THIS IS SEPARATE FROM ARScene3D
 *
 * ARScene3D draws over a video element and fakes a camera from compass bearings. In
 * here the camera IS the device, driven by ARCore through WebXR, and positions are
 * metres in a tracked world rather than directions on a ring. The two share their
 * meshes and nothing else — trying to make one component do both would mean a
 * viewport that is sometimes a real camera and sometimes an approximation of one,
 * with every placement path forked internally.
 *
 * WHAT IS AND IS NOT IMPLEMENTED HERE
 *
 * Implemented: six-degree-of-freedom tracking, hit-testing against real surfaces so a
 * placed anchor has a genuine position and therefore a genuine DISTANCE, correct
 * perspective and scale from ARCore's own camera parameters, and two-tap alignment to
 * a printed marker so placements survive the session ending.
 *
 * NOT implemented: depth-based occlusion. The `depth-sensing` feature is requested and
 * whether it was granted is reported, but actually hiding geometry behind a real wall
 * needs a custom material that samples the depth texture per fragment, and that is
 * code I cannot run or verify without an ARCore device. Shipping an untested shader
 * and calling it occlusion would be worse than not claiming it. See
 * docs/ARCHITECTURE.md.
 */

import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { anchorMeta } from '../lib/siteMap.js'
import {
  poseToPoint,
  siteToWorld,
  siteFrameFrom,
  placementReadiness,
  medianPoint,
  trackingQuality,
  PLACEMENT_SAMPLES,
  TRACKING,
} from '../lib/webxr.js'
import { MESH_FOR_TYPE, UnknownMarker } from './ARScene3D.jsx'
import { HideMeshLabels } from './SafetyScene3D.jsx'

/* ================================================================== */
/* Hit testing                                                         */
/* ================================================================== */

/**
 * Hit-tests down the middle of the view, accumulating evidence rather than trusting
 * a single frame.
 *
 * WHY A BUFFER AND NOT JUST THE LATEST RESULT
 *
 * A hit-test pose is an estimate re-derived every frame, and it visibly jitters and
 * snaps between surfaces. The first version of this captured whichever single frame
 * coincided with the worker's finger, which meant the accuracy of every anchor in the
 * zone was settled by a coin toss. Now the recent samples are kept, the placement is
 * refused until they agree, and the point used is their median — so an occasional snap
 * to the wall behind a doorway is outvoted instead of recorded.
 *
 * `requestHitTestSource` is asynchronous and the session may end before it resolves,
 * which is the common case when someone taps Exit immediately — so the result is
 * discarded if the session has moved on. Without that guard the source leaks and
 * throws on the next frame.
 */
function useViewerHitTest({ samplesRef, latestResultRef, onState }) {
  const gl = useThree((s) => s.gl)
  const sourceRef = useRef(null)
  const requestedForRef = useRef(null)
  const lastReportRef = useRef('')

  useFrame((state, delta, frame) => {
    // No frame means we are not in an XR session; nothing to do.
    if (!frame) return
    const session = gl.xr.getSession?.()
    if (!session) return

    if (requestedForRef.current !== session) {
      requestedForRef.current = session
      sourceRef.current = null
      samplesRef.current = []
      const viewerSpace = session.requestReferenceSpace?.('viewer')
      if (viewerSpace?.then) {
        viewerSpace
          .then((space) => session.requestHitTestSource({ space }))
          .then((source) => {
            // Stale by the time it resolved: the session ended or was replaced.
            if (requestedForRef.current !== session) {
              source?.cancel?.()
              return
            }
            sourceRef.current = source
          })
          .catch(() => {
            // hit-test is a required feature, so this only fires on a real fault.
            sourceRef.current = null
          })
      }
      return
    }

    const referenceSpace = gl.xr.getReferenceSpace?.()
    if (!referenceSpace) return

    /*
     * Tracking quality first, because it invalidates everything below it.
     * `emulatedPosition` means the runtime is reporting orientation while INVENTING
     * position — the reticle still draws and a tap still works, and the resulting
     * anchor is fiction. That must be refused, not averaged.
     */
    const tracking = trackingQuality(frame.getViewerPose?.(referenceSpace))
    if (tracking !== TRACKING.GOOD) {
      samplesRef.current = []
      latestResultRef.current = null
      report(onState, lastReportRef, { point: null, ready: false, reason: tracking, spread: null, tracking })
      return
    }

    const source = sourceRef.current
    if (!source) return

    const results = frame.getHitTestResults(source)
    if (!results?.length) {
      samplesRef.current = []
      latestResultRef.current = null
      report(onState, lastReportRef, { point: null, ready: false, reason: 'NO_SURFACE', spread: null, tracking })
      return
    }

    const point = poseToPoint(results[0].getPose(referenceSpace))
    if (!point) return

    // Kept so a placement can be anchored to the real surface via createAnchor().
    latestResultRef.current = results[0]

    const buffer = samplesRef.current
    buffer.push(point)
    if (buffer.length > PLACEMENT_SAMPLES) buffer.shift()

    const readiness = placementReadiness(buffer)
    report(onState, lastReportRef, {
      // The live reticle follows the raw point so it feels responsive; only the
      // PLACED position uses the median.
      point,
      ready: readiness.ready,
      reason: readiness.reason,
      spread: readiness.spread,
      tracking,
    })
  })
}

/*
 * Only tells the caller when something meaningful changed.
 *
 * This runs every frame and the caller sets React state from it. Reporting a slightly
 * different spread sixty times a second would re-render the drill's whole overlay
 * continuously for no visible benefit, so the readiness verdict is what gates the
 * update and the spread is rounded to the centimetre it is displayed at.
 */
function report(onState, lastRef, next) {
  const key = `${next.ready}|${next.reason}|${next.tracking}|${next.spread === null ? '' : Math.round(next.spread * 100)}|${next.point ? 1 : 0}`
  if (key === lastRef.current) return
  lastRef.current = key
  onState?.(next)
}

/**
 * Keeps the site frame locked to the real room as ARCore refines its map.
 *
 * THIS IS THE FIX FOR THE DRIFT.
 *
 * The session's reference space is not a fixed thing. ARCore continuously improves its
 * understanding of the room, and when it does, the origin of that space moves — so a
 * position stored as three plain numbers slowly stops describing the place it was
 * recorded at. Everything in the zone then drifts together, which is the hardest kind
 * of error to notice, because the markers stay consistent with each other while all of
 * them wander away from the objects they label.
 *
 * An XRAnchor is the mechanism for this and it was the piece missing: the `anchors`
 * feature was being REQUESTED and never used. An anchor is attached to the real surface
 * and the runtime re-reports its pose in the current space every frame, absorbing
 * exactly that refinement.
 *
 * Only the two alignment points are anchored, not every object. The site frame is
 * derived from those two points, so re-deriving it from their refreshed poses moves the
 * entire zone back into place at once. Anchoring every marker individually would cost
 * far more and achieve less, because each would then be refined independently and the
 * zone would deform rather than stay rigid.
 *
 * Anchors are documented as losing their pose fairly often. When that happens the last
 * good frame is kept, because a zone that is slightly stale is vastly better than a
 * zone that blinks out of existence.
 */
function useAnchoredFrame({ originAnchorRef, referenceAnchorRef, onFrameRefined }) {
  const gl = useThree((s) => s.gl)
  const lastKeyRef = useRef('')

  useFrame((state, delta, frame) => {
    if (!frame) return
    const origin = originAnchorRef.current
    const reference = referenceAnchorRef.current
    if (!origin || !reference) return

    const referenceSpace = gl.xr.getReferenceSpace?.()
    if (!referenceSpace) return

    let a = null
    let b = null
    try {
      a = poseToPoint(frame.getPose?.(origin.anchorSpace, referenceSpace))
      b = poseToPoint(frame.getPose?.(reference.anchorSpace, referenceSpace))
    } catch {
      // A deleted or invalidated anchor throws rather than returning null.
      return
    }
    // Pose lost this frame. Routine, and explicitly not a reason to move anything.
    if (!a || !b) return

    const refreshed = siteFrameFrom(a, b)
    if (refreshed.error) return

    /*
     * Only propagated when it has moved enough to matter. Refinement is continuous and
     * mostly sub-millimetre; rebuilding React state on every frame would re-render the
     * whole overlay sixty times a second to move nothing the eye can see.
     */
    const key = `${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)},${refreshed.yaw.toFixed(4)}`
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    onFrameRefined?.(refreshed)
  })
}

/** A ring on the surface the phone is pointing at, showing where a tap would land. */
function Reticle({ point, ready }) {
  const ref = useRef(null)

  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.visible = !!point
    if (point) g.position.set(point.x, point.y + 0.005, point.z)
  })

  return (
    <group ref={ref} visible={false}>
      {/* Flat on the floor, because hit-tests here land on horizontal planes far
          more often than vertical ones and a ring reads as "on that surface". */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.09, 0.13, 32]} />
        <meshBasicMaterial color={ready ? '#2E7D4F' : '#FFB020'} side={DoubleSide} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color={ready ? '#2E7D4F' : '#FFB020'} side={DoubleSide} />
      </mesh>
    </group>
  )
}

/* ================================================================== */
/* Anchors, at real positions                                          */
/* ================================================================== */

/**
 * One anchor, placed at its stored site coordinate.
 *
 * The difference from the compass overlay is the whole point of this mode: `local`
 * is a measured position in metres, so the object sits at its real distance and its
 * apparent size means something. Anchors that predate XR have no `local` and are
 * skipped here rather than being drawn at an invented distance — the compass overlay
 * remains the correct place to view those.
 */
function XRAnchor({ anchor, frame, aimed }) {
  const meta = anchorMeta(anchor.type)
  const Mesh = MESH_FOR_TYPE[anchor.type] || UnknownMarker

  const world = useMemo(() => siteToWorld(anchor.local, frame), [anchor.local, frame])
  if (!world) return null

  return (
    <group position={[world.x, world.y, world.z]}>
      {/* Turned to face the frame origin, which is where the marker plate is and
          therefore roughly where a worker enters the zone from. */}
      <group rotation={[0, Math.atan2(world.x - frame.origin.x, world.z - frame.origin.z), 0]}>
        <Mesh color={meta.color} position={[0, 0, 0]} />
      </group>
      {aimed && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.55, 0.68, 32]} />
          <meshBasicMaterial color="#F2F1ED" side={DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

/** The two alignment points, shown once placed so the supervisor can check them. */
function AlignmentMarkers({ origin, reference }) {
  return (
    <>
      {origin && (
        <mesh position={[origin.x, origin.y + 0.02, origin.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.18, 24]} />
          <meshBasicMaterial color="#1565C0" side={DoubleSide} />
        </mesh>
      )}
      {reference && (
        <mesh position={[reference.x, reference.y + 0.02, reference.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.13, 24]} />
          <meshBasicMaterial color="#2E7D4F" side={DoubleSide} />
        </mesh>
      )}
    </>
  )
}

/* ================================================================== */
/* Scene                                                               */
/* ================================================================== */

/**
 * @param onReticle   called every frame with the current hit point or null, so the
 *                    DOM overlay can enable or disable its Place button
 * @param frame       the site frame once aligned, or null while aligning
 */
export default function XRScene({
  anchors = [],
  frame = null,
  aimedAnchorId = null,
  alignOrigin = null,
  alignReference = null,
  onReticle,
  /*
   * Set to a function the shell can call on tap. Imperative on purpose: capturing a
   * placement needs the live sample buffer and the live XRHitTestResult, both of which
   * belong to the render loop. Lifting them into the shell's React state would mean
   * copying them out sixty times a second to be read once.
   */
  captureRef,
  originAnchorRef,
  referenceAnchorRef,
  onFrameRefined,
}) {
  const [hit, setHit] = useState(null)
  const [ready, setReady] = useState(false)
  const samplesRef = useRef([])
  const latestResultRef = useRef(null)

  const handleState = useCallback(
    (next) => {
      setHit(next.point)
      setReady(next.ready)
      onReticle?.(next)
    },
    [onReticle],
  )

  useViewerHitTest({ samplesRef, latestResultRef, onState: handleState })
  useAnchoredFrame({ originAnchorRef, referenceAnchorRef, onFrameRefined })

  /*
   * Capture a placement.
   *
   * Two things are produced and they come from different places on purpose. The POSITION
   * is the median of the recent samples, because that is the best estimate available and
   * is robust to a snap onto the wrong surface. The ANCHOR comes from the live hit-test
   * result, because only that is attached to the real geometry and can be refined later.
   *
   * createAnchor is asynchronous and can reject — the feature may not have been granted,
   * or the surface may be too poor to anchor to. A rejection is not a failed placement:
   * the position is still good, it simply will not be refined. So the anchor is awaited
   * separately and its absence degrades rather than blocks.
   */
  if (captureRef) {
    captureRef.current = async () => {
      const readiness = placementReadiness(samplesRef.current)
      if (!readiness.ready) return { ok: false, reason: readiness.reason }

      const point = readiness.point || medianPoint(samplesRef.current)
      if (!point) return { ok: false, reason: 'SAMPLING' }

      let anchor = null
      const result = latestResultRef.current
      if (result?.createAnchor) {
        try {
          anchor = await result.createAnchor()
        } catch {
          // Anchors unavailable or the surface refused one. The placement stands.
          anchor = null
        }
      }

      return { ok: true, point, anchor, spread: readiness.spread }
    }
  }

  const placeable = useMemo(
    () => (frame ? anchors.filter((a) => a?.local) : []),
    [anchors, frame],
  )

  return (
    <>
      {/*
        Lit for legibility over a real room rather than for realism. ARCore's
        light-estimation could drive this where granted, but a fixed bright rig is the
        safer default: signage that dims because the room is dim is signage that fails
        exactly when it is needed.
      */}
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 6, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />

      {/* Green only when a placement would actually be accepted, so the colour is
          information rather than decoration: amber means the aim is still moving. */}
      <Reticle point={hit} ready={ready} />

      <AlignmentMarkers origin={alignOrigin} reference={alignReference} />

      {/* Labels off: the DOM overlay carries the text, exactly as in the compass
          overlay, so an object never ends up with two captions. */}
      <HideMeshLabels>
        {placeable.map((anchor) => (
          <XRAnchor
            key={anchor.id}
            anchor={anchor}
            frame={frame}
            aimed={anchor.id === aimedAnchorId}
          />
        ))}
      </HideMeshLabels>
    </>
  )
}
