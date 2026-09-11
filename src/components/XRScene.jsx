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
import { poseToPoint, siteToWorld } from '../lib/webxr.js'
import { MESH_FOR_TYPE, UnknownMarker } from './ARScene3D.jsx'
import { HideMeshLabels } from './SafetyScene3D.jsx'

/* ================================================================== */
/* Hit testing                                                         */
/* ================================================================== */

/**
 * Runs a transient hit-test down the middle of the view and reports where it lands.
 *
 * `requestHitTestSource` is asynchronous and the session may end before it resolves,
 * which is the common case when someone taps Exit immediately — so the result is
 * discarded if the session has moved on. Without that guard the source leaks and
 * throws on the next frame.
 */
function useViewerHitTest(onHit) {
  const gl = useThree((s) => s.gl)
  const sourceRef = useRef(null)
  const requestedForRef = useRef(null)

  useFrame((state, delta, frame) => {
    // No frame means we are not in an XR session; nothing to do.
    if (!frame) return
    const session = gl.xr.getSession?.()
    if (!session) return

    if (requestedForRef.current !== session) {
      requestedForRef.current = session
      sourceRef.current = null
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

    const source = sourceRef.current
    if (!source) return

    const results = frame.getHitTestResults(source)
    if (!results?.length) {
      onHit(null)
      return
    }
    const referenceSpace = gl.xr.getReferenceSpace?.()
    if (!referenceSpace) return
    onHit(poseToPoint(results[0].getPose(referenceSpace)))
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
}) {
  const [hit, setHit] = useState(null)

  const handleHit = useCallback(
    (point) => {
      setHit(point)
      onReticle?.(point)
    },
    [onReticle],
  )

  useViewerHitTest(handleHit)

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

      <Reticle point={hit} ready={!!frame} />

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
