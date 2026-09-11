/*
 * ARScene3D — real geometry registered to the camera feed.
 *
 * WHAT THIS REPLACES AND WHY
 *
 * The drill overlay used to be flat DOM chips positioned by percentage over the
 * video. That is legible, cheap and works everywhere, and it is kept — this layer
 * sits on top of it, it does not replace it. But a flat chip cannot express the one
 * thing a worker in smoke actually needs: that the exit is a real object, over
 * there, at that height, and that turning your head moves it the way the world
 * moves. A chip that slides sideways when you tilt the phone reads as a heads-up
 * display. Geometry that stays nailed to a point in the room reads as the room.
 *
 * THE HONEST LIMIT, UP FRONT
 *
 * An anchor is a ray — bearing and elevation, recorded by a supervisor pointing a
 * phone. There is no distance in it and none can be recovered from one direction.
 * So every object is drawn on a ring at ANCHOR_RING_RADIUS_M. Direction is exact;
 * apparent size means nothing. See the note on that constant in siteMap.js. This is
 * why the overlay never renders a distance figure: it would be fiction.
 *
 * PERFORMANCE CONTRACT
 *
 * Orientation arrives through a ref, not props. The drill's animation loop writes
 * `viewRef.current` every frame and this scene reads it inside useFrame, so the
 * camera tracks at display rate while React re-renders only when the anchor list or
 * the aimed target actually changes. Passing orientation as a prop would re-render
 * the whole Canvas subtree sixty times a second on a device that is already running
 * a camera, a hand tracker and this renderer.
 */

import { useRef, useMemo, Suspense, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { DoubleSide } from 'three'
import {
  ANCHOR_TYPE,
  anchorMeta,
  anchorDirection,
  cameraQuaternion,
  headingQuaternion,
  ANCHOR_RING_RADIUS_M,
} from '../lib/siteMap.js'
/*
 * Only the meshes that correspond to a real anchor type are pulled in. The
 * briefing scene's Fire, Worker, MineTunnel and Warehouse are deliberately absent:
 * there is no anchor type for them, and a burning fire rendered at a fixed ring
 * radius would claim a fire is six metres away when nothing measured that.
 */
import {
  HideMeshLabels,
  FireExtinguisher,
  ElectricalPanel,
  Machinery,
  GasDetector,
  DustMachine,
} from './SafetyScene3D.jsx'
import { usePrefersReducedMotion } from './ui/motion.js'

/* ================================================================== */
/* Anchor-specific geometry                                            */
/* ================================================================== */

/*
 * Six anchor types already have a modelled object in the briefing scene and reuse
 * it directly, so a worker who studied the 3D briefing meets the same shape in the
 * field. Four have no equivalent because they are not machines — an exit, a muster
 * point, a first-aid station and a generic hazard. Those are built here, from
 * primitives, in ISO safety colours.
 */

/** EXIT — a door-shaped frame with a lit header, the one shape read fastest in smoke. */
function ExitDoor({ color }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.15, 2.1, 0.14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Recessed dark opening, so the frame reads as a doorway and not a slab. */}
      <mesh position={[0, -0.08, 0.09]}>
        <boxGeometry args={[0.86, 1.86, 0.04]} />
        <meshStandardMaterial color="#0C1710" />
      </mesh>
      {/* Header panel. Emissive so it stays visible against a bright doorway or a
          dark corridor, which is exactly where an exit sign has to work. */}
      <mesh position={[0, 1.32, 0.02]}>
        <boxGeometry args={[1.15, 0.36, 0.16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    </group>
  )
}

/** ASSEMBLY_POINT — a ring painted on the floor plus a standing post. */
function AssemblyPad({ color }) {
  return (
    <group>
      {/* Floor ring, doubled-sided because the worker may look down onto it or up
          at it depending on the recorded elevation. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[1.15, 1.65, 40]} />
        <meshStandardMaterial color={color} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.8, 12]} />
        <meshStandardMaterial color="#C9CCC7" />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.9, 0.9, 0.07]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}

/** FIRST_AID — a wall cabinet with a cross, the ISO green box. */
function FirstAidCabinet({ color }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.85, 0.85, 0.32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cross, stood off the face so it catches the light and reads at distance. */}
      <mesh position={[0, 0, 0.19]}>
        <boxGeometry args={[0.55, 0.17, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.19]}>
        <boxGeometry args={[0.17, 0.55, 0.06]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

/** HAZARD — a cone with a warning collar. Deliberately not a floating icon. */
function HazardCone({ color }) {
  return (
    <group>
      <mesh position={[0, -0.35, 0]}>
        <coneGeometry args={[0.45, 1.1, 22]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.33, 0.38, 0.2, 22]} />
        <meshStandardMaterial color="#F2F1ED" />
      </mesh>
      <mesh position={[0, -0.92, 0]}>
        <boxGeometry args={[1.05, 0.07, 1.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/**
 * The destination marker: a column of light and a chevron over the one thing that
 * matters right now.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE MARKERS
 *
 * A scanned zone shows eight or ten markers, all legible, all equally weighted. That
 * answers "where are things" and not "what do I do", and under pressure the second
 * question is the only one that matters. A worker in smoke does not need an inventory
 * of the room, they need one unambiguous destination.
 *
 * So the active target gets something categorically louder than a marker: a column
 * visible over machinery and around a corner where the object itself may be hidden, and
 * a chevron pointing down at it so the meaning is "here", not "that way". The floor path
 * shows the route; this shows the end of it.
 *
 * Deliberately only ever ONE of these on screen. Two destinations is no destination.
 */
function TargetBeacon({ color, reducedMotion }) {
  const chevron = useRef(null)

  useFrame((state) => {
    const m = chevron.current
    if (!m || reducedMotion) return
    // A slow descent, repeating. Motion downward reinforces "this spot" rather than
    // simply drawing attention to itself.
    m.position.y = 2.6 + ((state.clock.elapsedTime * 0.9) % 1) * -0.5
  })

  return (
    <group>
      {/*
        The column. Additive-ish translucency and depthWrite off so it reads as light
        rather than as a solid pillar standing in the room, and so it does not z-fight
        with the object it surrounds.
      */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 5, 20, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 5, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={DoubleSide} depthWrite={false} />
      </mesh>

      {/* Chevron, pointing down at the target. */}
      <mesh ref={chevron} position={[0, 2.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.34, 0.6, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} />
      </mesh>

      {/* Ground ring, so the column is anchored to a place on the floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]}>
        <ringGeometry args={[0.62, 0.82, 40]} />
        <meshBasicMaterial color={color} side={DoubleSide} transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </group>
  )
}

/*
 * Type to geometry. LOTO_PANEL borrows the electrical panel because that is
 * physically what a lockout point is attached to, and GAS_ZONE borrows the fixed
 * gas detector that marks one.
 */
export const MESH_FOR_TYPE = {
  [ANCHOR_TYPE.EXIT]: ExitDoor,
  [ANCHOR_TYPE.ASSEMBLY_POINT]: AssemblyPad,
  [ANCHOR_TYPE.FIRST_AID]: FirstAidCabinet,
  [ANCHOR_TYPE.HAZARD]: HazardCone,
  [ANCHOR_TYPE.EXTINGUISHER]: FireExtinguisher,
  [ANCHOR_TYPE.GAS_ZONE]: GasDetector,
  [ANCHOR_TYPE.LOTO_PANEL]: ElectricalPanel,
  [ANCHOR_TYPE.ELECTRICAL_PANEL]: ElectricalPanel,
  [ANCHOR_TYPE.MACHINE]: Machinery,
  [ANCHOR_TYPE.DUST_SOURCE]: DustMachine,
}

/** Anything unrecognised still gets a body, so a new anchor type is never invisible. */
export function UnknownMarker({ color }) {
  return (
    <mesh>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/* ================================================================== */
/* Floor path                                                          */
/* ================================================================== */

/*
 * Height of the camera above the floor, in metres.
 *
 * AN ASSUMPTION, NOT A MEASUREMENT. Nothing in the browser reports how tall the
 * person holding the phone is or whether they are standing, crouching or on a
 * gantry. 1.55 m is a phone held at chest-to-eye height by a standing adult. The
 * cost of being wrong is that the painted path sits slightly high or low against
 * the real floor; the DIRECTION it indicates stays correct, which is the part the
 * worker acts on.
 */
const EYE_HEIGHT_M = 1.55

const PATH_CHEVRONS = 6
const PATH_FIRST_M = 1.3
const PATH_SPACING_M = 0.85

/*
 * Anchor types that never get a walking path.
 *
 * A line of arrows along the floor is an instruction: walk this way. Drawing one
 * toward a gas release, a dust source or an unspecified hazard would be telling a
 * worker to approach the thing they need to stay clear of. Those anchors still get
 * their 3D object and their label — they are marked, not routed to.
 */
const NO_WALK_PATH = new Set([ANCHOR_TYPE.HAZARD, ANCHOR_TYPE.GAS_ZONE, ANCHOR_TYPE.DUST_SOURCE])

/**
 * Chevrons painted on the floor toward the target.
 *
 * Only the anchor's BEARING is used. Elevation is deliberately discarded: you walk
 * along the ground regardless of whether the target is a floor-level muster point or
 * a door at the top of a stair, and following the full 3D direction would lift the
 * path into the air and point at nothing a foot can reach.
 */
function FloorPath({ bearing, color, reducedMotion }) {
  const meshes = useRef([])

  const chevrons = useMemo(
    () => Array.from({ length: PATH_CHEVRONS }, (_, i) => PATH_FIRST_M + i * PATH_SPACING_M),
    [],
  )

  useFrame((state) => {
    const list = meshes.current
    if (!list.length) return

    if (reducedMotion) {
      // Static and evenly lit. The direction is still fully conveyed by the
      // chevrons pointing away from the worker.
      for (const m of list) if (m) m.material.opacity = 0.6
      return
    }

    /*
     * A bright band travelling outward, which is what makes the path read as
     * "away from you" rather than as a static stripe. The cycle overruns the
     * chevron count so there is a brief dark gap before it restarts, otherwise
     * the motion looks like a rotating barber pole with no clear direction.
     */
    const head = (state.clock.elapsedTime * 3.6) % (PATH_CHEVRONS + 2)
    for (let i = 0; i < list.length; i++) {
      const m = list[i]
      if (!m) continue
      const lead = head - i
      const lit = lead >= 0 && lead < 1.8 ? 1 - lead / 1.8 : 0
      m.material.opacity = 0.32 + 0.62 * lit
    }
  })

  return (
    /* Rotating the whole path once means each chevron can sit at a plain distance
       along local -Z, so there is no per-chevron trigonometry to get wrong. */
    <group rotation={[0, -((bearing || 0) * Math.PI) / 180, 0]}>
      {chevrons.map((distance, i) => (
        <mesh
          key={distance}
          ref={(el) => {
            meshes.current[i] = el
          }}
          position={[0, -EYE_HEIGHT_M, -distance]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/*
            A flat triangle lying on the floor. thetaStart of a quarter turn puts
            the first vertex — the tip — along local -Z once the mesh is laid down,
            so the arrow points away from the worker without a second rotation.
          */}
          <circleGeometry args={[0.34, 3, Math.PI / 2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            side={DoubleSide}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================== */
/* Camera                                                              */
/* ================================================================== */

/*
 * Drives the camera from the orientation ref.
 *
 * Everything here mutates three.js objects directly and returns null. Nothing in
 * this component may call setState — that is the entire reason the overlay can run
 * at frame rate next to a live camera feed.
 */
function CameraRig({ viewRef, vFov }) {
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const v = viewRef?.current
    if (!v) return

    /*
     * Vertical FOV must match the DOM layer's, which derives it from the real video
     * dimensions via computeFov. three.js `fov` IS the vertical one, so this is a
     * direct assignment and not a conversion — and it is what makes a mesh and its
     * DOM label land on the same pixel.
     *
     * It arrives as a prop rather than through the ref because it changes only when
     * the video reports a new size, and it is applied here rather than in a render
     * so the projection matrix is rebuilt exactly once per actual change.
     */
    const fov = Number.isFinite(vFov) ? vFov : 65
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // Sensor path when roll is available, level fallback when it is not. Both are
    // pinned to the same `heading` the 2D markers use, so they cannot disagree.
    const q = cameraQuaternion(v.quaternion, v.heading) || headingQuaternion(v.heading, v.elevation)
    camera.quaternion.set(q.x, q.y, q.z, q.w)
  })

  return null
}

/* ================================================================== */
/* Anchor objects                                                      */
/* ================================================================== */

function AnchorObject({ anchor, aimed, isTarget, reducedMotion }) {
  const groupRef = useRef(null)
  const meta = anchorMeta(anchor.type)
  const Mesh = MESH_FOR_TYPE[anchor.type] || UnknownMarker

  const { position, spin } = useMemo(() => {
    const d = anchorDirection(anchor.bearing, anchor.elevation)
    return {
      position: [
        d.x * ANCHOR_RING_RADIUS_M,
        d.y * ANCHOR_RING_RADIUS_M,
        d.z * ANCHOR_RING_RADIUS_M,
      ],
      /*
       * Turn each object to face the worker. Without this, an object placed east
       * of you presents its side, and these meshes were modelled to be seen from
       * the front. Rotating by the negated bearing about world up puts the same
       * face toward the origin wherever the object sits on the ring.
       */
      spin: -((anchor.bearing || 0) * Math.PI) / 180,
    }
  }, [anchor.bearing, anchor.elevation])

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    if (!aimed || reducedMotion) {
      // Snap back rather than leave a half-scaled object behind when aim moves
      // away or the user turns motion off mid-drill.
      g.scale.setScalar(1)
      return
    }
    // A slow breath on the aimed target only. Confirms the lock without becoming
    // another thing competing for attention.
    g.scale.setScalar(1 + 0.06 * Math.sin(state.clock.elapsedTime * 3))
  })

  return (
    <group ref={groupRef} position={position} rotation={[0, spin, 0]}>
      {/* The shared briefing meshes carry their own scene coordinates as prop
          defaults, so they are explicitly re-centred on the anchor point here. */}
      <Mesh color={meta.color} position={[0, 0, 0]} />

      {/* The destination marker sits OUTSIDE the object's facing rotation, so the
          column stays vertical and the chevron keeps pointing down regardless of which
          way the object was turned to face the worker. */}
      {isTarget && <TargetBeacon color={meta.color} reducedMotion={reducedMotion} />}

      {aimed && (
        /* Ground ring under the locked target. Reads as contact with the floor,
           which is what makes the object look placed rather than pasted on. */
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
          <ringGeometry args={[1.5, 1.75, 40]} />
          <meshStandardMaterial
            color="#F2F1ED"
            side={DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  )
}

/* ================================================================== */
/* Scene                                                               */
/* ================================================================== */

function Scene({ viewRef, vFov, anchors, aimedAnchorId, guideAnchorId, reducedMotion }) {
  const guide = useMemo(() => {
    if (!guideAnchorId) return null
    const found = anchors.find((a) => a.id === guideAnchorId)
    if (!found || NO_WALK_PATH.has(found.type)) return null
    return found
  }, [anchors, guideAnchorId])

  return (
    <>
      {/*
        Lit brightly and flatly on purpose. This is not a render to admire; it is
        signage composited over whatever the camera sees, and it has to stay legible
        against a bright doorway or a dark tunnel. Directional light from above
        keeps the forms readable without carving deep shadows that would fight the
        video underneath.
      */}
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 9, 5]} intensity={1.7} />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} />

      <CameraRig viewRef={viewRef} vFov={vFov} />

      {guide && (
        <FloorPath
          bearing={guide.bearing}
          color={anchorMeta(guide.type).color}
          reducedMotion={reducedMotion}
        />
      )}

      {/* No floor and no grid: the real floor is in the video. Drawing one would
          cover the thing the worker is standing in. */}
      <HideMeshLabels>
        {anchors.map((anchor) => (
          <AnchorObject
            key={anchor.id}
            anchor={anchor}
            aimed={anchor.id === aimedAnchorId}
            /* Exactly one target, and only once a destination has been chosen. Two
               destinations would be no destination. */
            isTarget={!!guide && anchor.id === guide.id}
            reducedMotion={reducedMotion}
          />
        ))}
      </HideMeshLabels>
    </>
  )
}

/**
 * The transparent 3D layer. Positioned absolutely to fill its parent, which is the
 * drill's camera shell.
 *
 * Rendered decorative to assistive technology: the DOM marker layer underneath
 * carries the real labels, roles and live-region announcements. A canvas cannot
 * convey any of that, and duplicating the anchor list into an accessibility tree it
 * cannot update would be worse than silence.
 */
function ARScene3D({
  viewRef,
  vFov = 65,
  anchors = [],
  aimedAnchorId = null,
  guideAnchorId = null,
}) {
  const reducedMotion = usePrefersReducedMotion()

  // A scene with nothing in it still costs a WebGL context and a render loop.
  if (!anchors.length) return null

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <Canvas
        /* alpha + a zero clear alpha is what lets the camera feed through. Without
           it the canvas paints opaque black over the video. */
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => gl.setClearAlpha(0)}
        /* Tone mapping off. ISO safety colours are specified values — a filmic
           curve would desaturate the exact greens and reds the signage depends on. */
        flat
        /* Capped device pixel ratio. A 3x phone display would otherwise render
           nine times the pixels for signage that gains nothing from it, while the
           camera and detector are competing for the same GPU. */
        dpr={[1, 1.5]}
        camera={{ fov: 65, near: 0.1, far: 60, position: [0, 0, 0] }}
        style={{ pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <Scene
            viewRef={viewRef}
            vFov={vFov}
            anchors={anchors}
            aimedAnchorId={aimedAnchorId}
            guideAnchorId={guideAnchorId}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
/*
 * Memoised, and this is load-bearing rather than an optimisation.
 *
 * ARDrill re-renders about thirty times a second to move its flat markers. Without
 * memo, every one of those renders would walk this whole Canvas subtree — remounting
 * nothing, but reconciling every mesh, every frame, on top of the render loop that
 * is already running. All the props here are stable by construction: `viewRef` is a
 * ref object, `anchors` is memoised upstream, and the two ids are plain strings that
 * change only when the aim or the destination actually changes. So the geometry is
 * reconciled when something meaningful moves and not otherwise, while the camera
 * still tracks the device every frame through the ref.
 */
export default memo(ARScene3D)
