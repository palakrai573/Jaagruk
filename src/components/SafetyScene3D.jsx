import { Suspense, createContext, useContext, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, ContactShadows } from '@react-three/drei'
import { usePrefersReducedMotion } from './ui/motion.js'

/*
 * These meshes are shared with the AR overlay (see ARScene3D), which needs them
 * WITHOUT the floating drei labels: the AR view already draws its own DOM label
 * layer, and doubling it up gives every object two captions. Rather than thread a
 * flag through ten components, labels read a context that defaults to on, so this
 * scene is unchanged and AR switches them off in one place.
 *
 * Html is also relatively expensive — it mounts real DOM per label and forces a
 * layout sync each frame — which is affordable in a static viewer and not on a
 * mid-range phone already running the camera, a hand tracker and a 3D pass.
 */
const ShowLabelsContext = createContext(true)

export function HideMeshLabels({ children }) {
  return <ShowLabelsContext.Provider value={false}>{children}</ShowLabelsContext.Provider>
}

function Label(props) {
  return useContext(ShowLabelsContext) ? <Html {...props} /> : null
}

/* -------------------- FLOOR -------------------- */

function Floor() {
  return (
    /* Widened from 14x10 so the three added scenes do not overhang the edge, and
       given a rough, near-matte material: a default meshStandardMaterial has a
       faint specular sheen that made a mine floor look like polished stone. */
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[20, 14]} />
      <meshStandardMaterial color="#232527" roughness={0.98} metalness={0} />
    </mesh>
  )
}

/* -------------------- WORKER -------------------- */

function Worker({ position = [-2.5, -0.5, 0] }) {
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 1.2, 0.45]} />
        <meshStandardMaterial color="#263238" />
      </mesh>

      {/* Safety vest */}
      <mesh position={[0, 0.05, 0.25]}>
        <boxGeometry args={[0.72, 0.9, 0.08]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color="#c68642" />
      </mesh>

      {/* Helmet */}
      <mesh position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.36, 20, 12]} />
        <meshStandardMaterial color="#f5c518" />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.18, -0.8, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.25]} />
        <meshStandardMaterial color="#17202a" />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.18, -0.8, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.25]} />
        <meshStandardMaterial color="#17202a" />
      </mesh>

      <Label position={[0, 1.65, 0]} center>
        <div
          style={{
            background: '#1565c0',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          WORKER
        </div>
      </Label>
    </group>
  )
}

/* -------------------- FIRE -------------------- */

function Fire({ position = [2, -0.5, 0] }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const glow = useRef(null)
  const reduced = usePrefersReducedMotion()

  /*
   * Flicker. A static cone reads as an orange traffic bollard; the irregular
   * motion is most of what makes it read as fire at all.
   *
   * Two sine waves at unrelated frequencies rather than one, because a single
   * sine is visibly periodic and starts to look mechanical after a few seconds.
   * The light flickers with it, so the flame appears to be the thing lighting
   * the scene rather than a lit object sitting in it.
   */
  useFrame((state) => {
    if (reduced) return
    const t = state.clock.elapsedTime
    const a = Math.sin(t * 9) * 0.5 + Math.sin(t * 14.7) * 0.5
    if (outer.current) {
      outer.current.scale.set(1 + a * 0.05, 1 + a * 0.11, 1 + a * 0.05)
    }
    if (inner.current) {
      inner.current.scale.set(1 - a * 0.06, 1 + a * 0.16, 1 - a * 0.06)
    }
    if (glow.current) glow.current.intensity = 2.4 + a * 0.9
  })

  return (
    <group position={position}>
      {/*
        The flame lights its own surroundings. Warm, short-range, and the single
        biggest contributor to the scene looking lit rather than flat.
      */}
      <pointLight ref={glow} color="#ff7a1a" intensity={2.4} distance={7} decay={2} position={[0, 0.6, 0]} />

      {/* Outer flame */}
      <mesh ref={outer}>
        <coneGeometry args={[0.7, 1.8, 16]} />
        <meshStandardMaterial
          color="#d32f2f"
          emissive="#7f0000"
          emissiveIntensity={0.8}
          roughness={1}
        />
      </mesh>

      {/* Inner flame */}
      <mesh ref={inner} position={[0, 0.35, 0]}>
        <coneGeometry args={[0.38, 1.2, 16]} />
        <meshStandardMaterial
          color="#ffb300"
          emissive="#ff6f00"
          emissiveIntensity={1}
          roughness={1}
        />
      </mesh>

      <Label position={[0, 1.5, 0]} center>
        <div
          style={{
            background: '#d32f2f',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        >
          FIRE
        </div>
      </Label>
    </group>
  )
}

/* -------------------- FIRE EXTINGUISHER -------------------- */

function FireExtinguisher({ position = [3.4, -0.7, 0] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.32, 1.3, 20]} />
        <meshStandardMaterial color="#c62828" />
      </mesh>

      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      <mesh position={[0.15, 0.9, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.35, 0.08, 0.08]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      <Label position={[0, 1.1, 0]} center>
        <div
          style={{
            background: '#c62828',
            color: 'white',
            padding: '4px 7px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          EXTINGUISHER
        </div>
      </Label>
    </group>
  )
}

/* -------------------- ELECTRICAL PANEL -------------------- */

function ElectricalPanel({ position = [2, 0, 0] }) {
  return (
    <group position={position}>
      {/* Main panel */}
      <mesh>
        <boxGeometry args={[2.3, 2.6, 0.6]} />
        <meshStandardMaterial color="#607d8b" />
      </mesh>

      {/* Front */}
      <mesh position={[0, 0, 0.33]}>
        <boxGeometry args={[1.8, 2.1, 0.06]} />
        <meshStandardMaterial color="#263238" />
      </mesh>

      {/* Buttons */}
      <mesh position={[-0.5, 0.4, 0.38]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#4caf50"
          emissive="#1b5e20"
          emissiveIntensity={1}
        />
      </mesh>

      <mesh position={[0, 0.4, 0.38]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#f44336"
          emissive="#b71c1c"
          emissiveIntensity={1}
        />
      </mesh>

      <mesh position={[0.5, 0.4, 0.38]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#4caf50"
          emissive="#1b5e20"
          emissiveIntensity={1}
        />
      </mesh>

      {/* Exposed cable */}
      <mesh position={[1.2, -0.8, 0.4]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.06, 0.06, 2.5, 12]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      <Label position={[0, 1.7, 0]} center>
        <div
          style={{
            background: '#f9a825',
            color: '#111',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          HIGH VOLTAGE
        </div>
      </Label>
    </group>
  )
}

/* -------------------- MACHINERY -------------------- */

function Machinery({ position = [2, -0.2, 0] }) {
  return (
    <group position={position}>
      {/* Machine body */}
      <mesh>
        <boxGeometry args={[2.8, 1.8, 1.8]} />
        <meshStandardMaterial color="#455a64" />
      </mesh>

      {/* Top cylinder */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.65, 0.65, 0.4, 32]} />
        <meshStandardMaterial color="#90a4ae" />
      </mesh>

      {/* Central shaft */}
      <mesh
        position={[0, 1.15, 0.3]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.32, 0.32, 0.12, 32]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Safety guard */}
      <mesh position={[0, 0.2, 1]}>
        <boxGeometry args={[2.2, 1.2, 0.08]} />
        <meshStandardMaterial
          color="#f9a825"
          transparent
          opacity={0.45}
        />
      </mesh>

      <Label position={[0, 2, 0]} center>
        <div
          style={{
            background: '#ef6c00',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          HYDRAULIC PRESS
        </div>
      </Label>
    </group>
  )
}

/* -------------------- MINE -------------------- */

function MineTunnel({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Tunnel back wall */}
      <mesh position={[2, 0.5, -1]}>
        <boxGeometry args={[4, 4, 0.3]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>

      {/* Tunnel left wall */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 4, 2.5]} />
        <meshStandardMaterial color="#4e342e" />
      </mesh>

      {/* Tunnel right wall */}
      <mesh position={[4, 0.5, 0]}>
        <boxGeometry args={[0.3, 4, 2.5]} />
        <meshStandardMaterial color="#4e342e" />
      </mesh>

      {/* Tunnel roof */}
      <mesh position={[2, 2.4, 0]}>
        <boxGeometry args={[4, 0.3, 2.5]} />
        <meshStandardMaterial color="#3e2723" />
      </mesh>

      {/* Tunnel floor */}
      <mesh position={[2, -1.3, 0]}>
        <boxGeometry args={[4, 0.3, 2.5]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>

      {/* Support beams */}
      <mesh position={[1, 0.5, 0]}>
        <boxGeometry args={[0.18, 3.5, 0.18]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>

      <mesh position={[3, 0.5, 0]}>
        <boxGeometry args={[0.18, 3.5, 0.18]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>

      <Label position={[2, 2.9, 0]} center>
        <div
          style={{
            background: '#f9a825',
            color: '#111',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          MINE / CONFINED SPACE
        </div>
      </Label>
    </group>
  )
}

/* -------------------- GAS DETECTOR -------------------- */

function GasDetector({ position = [3, -0.3, 0.7] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.6, 1, 0.25]} />
        <meshStandardMaterial color="#263238" />
      </mesh>

      <mesh position={[0, 0.15, 0.14]}>
        <boxGeometry args={[0.35, 0.25, 0.04]} />
        <meshStandardMaterial
          color="#4caf50"
          emissive="#1b5e20"
          emissiveIntensity={1}
        />
      </mesh>

      <Label position={[0, 0.8, 0]} center>
        <div
          style={{
            background: '#2e7d32',
            color: 'white',
            padding: '4px 7px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          GAS DETECTOR
        </div>
      </Label>
    </group>
  )
}

/* -------------------- DUST MACHINE -------------------- */

function DustMachine({ position = [2, -0.1, 0] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2.5, 2, 1.6]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>

      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.8, 20]} />
        <meshStandardMaterial color="#795548" />
      </mesh>

      {/* Dust particles */}
      <mesh position={[-0.5, 2, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial
          color="#d7ccc8"
          transparent
          opacity={0.65}
        />
      </mesh>

      <mesh position={[0, 2.2, 0.2]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#d7ccc8"
          transparent
          opacity={0.65}
        />
      </mesh>

      <mesh position={[0.5, 1.9, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial
          color="#d7ccc8"
          transparent
          opacity={0.65}
        />
      </mesh>

      <Label position={[0, 2.6, 0]} center>
        <div
          style={{
            background: '#795548',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          DUST HAZARD
        </div>
      </Label>
    </group>
  )
}

/* -------------------- WAREHOUSE -------------------- */

function Warehouse({ position = [2, -0.5, 0] }) {
  return (
    <group position={position}>
      {/* Forklift body */}
      <mesh>
        <boxGeometry args={[2.2, 1, 1.2]} />
        <meshStandardMaterial color="#f9a825" />
      </mesh>

      {/* Mast */}
      <mesh position={[1, 1, 0]}>
        <boxGeometry args={[0.15, 2.5, 0.15]} />
        <meshStandardMaterial color="#455a64" />
      </mesh>

      {/* Fork */}
      <mesh position={[1.6, -0.15, 0.35]}>
        <boxGeometry args={[1.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#78909c" />
      </mesh>

      <mesh position={[1.6, -0.15, -0.35]}>
        <boxGeometry args={[1.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#78909c" />
      </mesh>

      {/* Cargo */}
      <mesh position={[-0.2, 0.7, 0]}>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>

      <Label position={[0, 1.8, 0]} center>
        <div
          style={{
            background: '#f9a825',
            color: '#111',
            padding: '5px 10px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          FORKLIFT
        </div>
      </Label>
    </group>
  )
}

/* -------------------- ROOF & STRATA -------------------- */

/*
 * Three modules shipped with no scene of their own and fell through to the
 * default, which returned a fire. A worker opening the Working at Height briefing
 * was shown a fire. These three exist to fix that, and each is modelled around the
 * one thing its module is actually teaching.
 */

/** Layered roof with bolts, a support prop, and the slab that already fell. */
function RoofStrata({ position = [1.5, 0, 0] }) {
  return (
    <group position={position}>
      {/*
        Strata drawn as separate beds rather than one slab, because the bedding
        planes ARE the hazard being taught — rock parts along them, and a worker
        needs to recognise the banding overhead.
      */}
      {[
        { y: 2.6, h: 0.34, c: '#5b5147' },
        { y: 2.26, h: 0.18, c: '#6d6154' },
        { y: 2.06, h: 0.26, c: '#4f463d' },
        { y: 1.84, h: 0.14, c: '#7a6c5d' },
      ].map((bed) => (
        <mesh key={bed.y} position={[0, bed.y, 0]}>
          <boxGeometry args={[5.2, bed.h, 3.4]} />
          <meshStandardMaterial color={bed.c} roughness={0.95} metalness={0.02} />
        </mesh>
      ))}

      {/* Roof bolts — the control measure, and what the drill asks about. */}
      {[-1.6, -0.55, 0.55, 1.6].map((x) => (
        <group key={x} position={[x, 1.4, 0.4]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 0.9, 10]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.85} />
          </mesh>
          {/* Bearing plate */}
          <mesh position={[0, -0.47, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.3]} />
            <meshStandardMaterial color="#c8ccd0" roughness={0.35} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Timber prop, leaning slightly because nothing underground is plumb. */}
      <mesh position={[-2.1, 0.15, 0.8]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.16, 0.18, 3.1, 12]} />
        <meshStandardMaterial color="#8d6e4f" roughness={0.9} />
      </mesh>

      {/* The slab that already came down. The reason the module exists. */}
      <mesh position={[0.9, -1.28, 0.9]} rotation={[0.1, 0.5, 0.16]}>
        <boxGeometry args={[1.5, 0.3, 1.1]} />
        <meshStandardMaterial color="#443c34" roughness={1} />
      </mesh>
      <mesh position={[1.7, -1.36, 0.4]} rotation={[0.3, 1.1, 0.1]}>
        <boxGeometry args={[0.7, 0.22, 0.6]} />
        <meshStandardMaterial color="#4d443b" roughness={1} />
      </mesh>

      <Label position={[0, 3.1, 0]} center>
        <div
          style={{
            background: '#8d6e4f',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          ROOF / STRATA
        </div>
      </Label>
    </group>
  )
}

/* -------------------- WORKING AT HEIGHT -------------------- */

/** Scaffold with a guard rail on one side and an open edge on the other. */
function WorkingAtHeight({ position = [1.8, 0, 0] }) {
  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 0.14, 1.9]} />
        <meshStandardMaterial color="#a98a5c" roughness={0.85} />
      </mesh>

      {/* Legs and bracing */}
      {[
        [-1.35, -0.8],
        [1.35, -0.8],
        [-1.35, 0.8],
        [1.35, 0.8],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, -0.5, z]}>
          <cylinderGeometry args={[0.06, 0.06, 2, 10]} />
          <meshStandardMaterial color="#7f8996" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, -0.5, -0.8]} rotation={[0, 0, Math.PI / 2.6]}>
        <cylinderGeometry args={[0.04, 0.04, 3.1, 8]} />
        <meshStandardMaterial color="#7f8996" roughness={0.45} metalness={0.75} />
      </mesh>

      {/*
        Guard rail on the far side only. The near edge is deliberately open — the
        module teaches recognising an unprotected edge, so the scene has to contain
        one rather than showing a compliant platform.
      */}
      {[1.05, 0.72].map((y) => (
        <mesh key={y} position={[0, y, -0.9]}>
          <cylinderGeometry args={[0.035, 0.035, 3, 8]} />
          <meshStandardMaterial color="#FFB020" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {[-1.45, 1.45].map((x) => (
        <mesh key={x} position={[x, 0.85, -0.9]}>
          <cylinderGeometry args={[0.04, 0.04, 0.75, 8]} />
          <meshStandardMaterial color="#FFB020" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}

      {/* Anchor point for a harness lanyard — the control measure. */}
      <mesh position={[1.2, 1.5, 0.7]}>
        <cylinderGeometry args={[0.05, 0.05, 1.9, 10]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[1.2, 2.4, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.045, 8, 18]} />
        <meshStandardMaterial color="#2E7D4F" roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Ladder to the platform */}
      <group position={[-1.9, -0.35, 0.55]} rotation={[0, 0, -0.2]}>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[0.07, 2.4, 0.07]} />
            <meshStandardMaterial color="#b9c0c7" roughness={0.4} metalness={0.7} />
          </mesh>
        ))}
        {[-0.9, -0.45, 0, 0.45, 0.9].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.05]} />
            <meshStandardMaterial color="#b9c0c7" roughness={0.4} metalness={0.7} />
          </mesh>
        ))}
      </group>

      <Label position={[0, 2.85, 0]} center>
        <div
          style={{
            background: '#FFB020',
            color: '#1C1F22',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          OPEN EDGE
        </div>
      </Label>
    </group>
  )
}

/* -------------------- MINE HAULAGE -------------------- */

/** Running conveyor with a walkway crossing. The belt actually moves. */
function MineHaulage({ position = [1.6, -0.4, 0] }) {
  const rollers = useRef([])
  const lumps = useRef([])
  const reduced = usePrefersReducedMotion()

  // Fixed pseudo-random offsets so the coal does not sit in a suspiciously even
  // row, but is stable across re-renders.
  const lumpSeeds = useMemo(
    () => [0, 0.9, 1.7, 2.6, 3.4, 4.2].map((s, i) => ({ s, z: ((i * 37) % 7) / 20 - 0.175 })),
    [],
  )

  useFrame((state, delta) => {
    if (reduced) return
    for (const r of rollers.current) if (r) r.rotation.z -= delta * 3.2
    /*
     * Coal travels along the belt and wraps. Moving real lumps rather than
     * scrolling a texture means the motion is unmistakable at any angle, and it
     * is what makes the machine read as RUNNING — which is the whole point of a
     * module about not crossing a live conveyor.
     */
    for (const m of lumps.current) {
      if (!m) continue
      m.position.x += delta * 1.5
      if (m.position.x > 2.6) m.position.x = -2.6
      m.rotation.z -= delta * 1.1
    }
  })

  return (
    <group position={position}>
      {/* Belt bed */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[5.4, 0.1, 1.1]} />
        <meshStandardMaterial color="#2a2d31" roughness={0.95} />
      </mesh>

      {/* Rollers */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x, i) => (
        <mesh
          key={x}
          ref={(el) => {
            rollers.current[i] = el
          }}
          position={[x, 0.52, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.17, 0.17, 1.2, 14]} />
          <meshStandardMaterial color="#8a9098" roughness={0.45} metalness={0.8} />
        </mesh>
      ))}

      {/* Coal on the belt */}
      {lumpSeeds.map(({ s, z }, i) => (
        <mesh
          key={s}
          ref={(el) => {
            lumps.current[i] = el
          }}
          position={[s - 2.6, 0.73, z]}
          rotation={[0.3, s, 0.2]}
        >
          <dodecahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color="#1b1b1d" roughness={1} />
        </mesh>
      ))}

      {/* Frame legs */}
      {[-2.2, 0, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#6f767e" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}

      {/* Guard along the walkway side, and a marked crossing point. */}
      <mesh position={[0, 0.95, 0.72]}>
        <boxGeometry args={[5.4, 0.5, 0.06]} />
        <meshStandardMaterial color="#FFB020" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 1.55]}>
        <planeGeometry args={[1.5, 1.3]} />
        <meshStandardMaterial color="#2E7D4F" roughness={0.9} />
      </mesh>

      <Label position={[0, 1.55, 0]} center>
        <div
          style={{
            background: '#FFB020',
            color: '#1C1F22',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          CONVEYOR RUNNING
        </div>
      </Label>
    </group>
  )
}

/*
 * Shared with the AR overlay. Exported rather than copied so there is exactly one
 * definition of what a fire or an extinguisher looks like — two would drift apart,
 * and a worker who learns an object in the 3D briefing has to recognise the same
 * object in the field.
 *
 * Each takes a `position` defaulting to the coordinates this scene has always used,
 * so the viewer below renders them prop-less and unchanged. AR passes its own.
 */
export {
  Worker,
  Fire,
  FireExtinguisher,
  ElectricalPanel,
  Machinery,
  MineTunnel,
  GasDetector,
  DustMachine,
  Warehouse,
  RoofStrata,
  WorkingAtHeight,
  MineHaulage,
}

/* -------------------- SCENE SELECTOR -------------------- */

function ScenarioObjects({ scenarioId }) {
  switch (scenarioId) {
    case 'fire-explosion':
      return (
        <>
          <Fire />
          <FireExtinguisher />
        </>
      )

    case 'gas-leak-confined-space':
      return (
        <>
          <MineTunnel />
          <GasDetector />
        </>
      )

    case 'machinery-safety':
      return <Machinery />

    case 'electrical-hazard':
      return <ElectricalPanel />

    case 'dust-respiratory':
      return <DustMachine />

    case 'warehouse-loading':
      return <Warehouse />

    case 'roof-strata-control':
      return (
        <>
          <MineTunnel />
          <RoofStrata />
        </>
      )

    case 'working-at-height':
      return <WorkingAtHeight />

    case 'mine-haulage':
      return (
        <>
          <MineTunnel />
          <MineHaulage />
        </>
      )

    /*
     * A module with no scene of its own gets the worker and the room, and nothing
     * else. This used to return <Fire />, which meant the three modules added in
     * Phase 11 — roof strata, working at height and haulage — each opened their
     * briefing by showing the trainee a fire. Showing the wrong hazard is worse
     * than showing none: it teaches the wrong association before a word is read.
     */
    default:
      return null
  }
}

/* -------------------- 3D WORLD -------------------- */

function Scene({ scenarioId }) {
  const reduced = usePrefersReducedMotion()

  return (
    <>
      {/*
        Lighting rebalanced. The old setup was ambient 1.2 plus a hard key at
        intensity 2, which washed everything into flat colour — no form, no sense
        of a surface facing a light. Ambient is dropped to a fill, the key is
        softened, and a cool rim from behind separates objects from the
        background. The hazard scenes add their own local light on top of this
        (the fire, for instance, lights what is around it).
      */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#8fa3b8', '#2a2622', 0.5]} />

      {/* Key */}
      <directionalLight position={[5, 8, 5]} intensity={1.35} />
      {/* Cool rim from behind, so silhouettes read against the dark backdrop. */}
      <directionalLight position={[-6, 4, -6]} intensity={0.45} color="#9fc4e8" />

      <Floor />

      {/*
        Grounding. Without this, every object floats a little — the eye reads
        contact from the shadow, not from the geometry. Chosen over a full shadow
        map because it needs no per-mesh castShadow flags across ten meshes and
        costs a fraction as much on a mid-range phone.
      */}
      <ContactShadows
        position={[0, -1.49, 0]}
        scale={16}
        resolution={512}
        blur={2.4}
        opacity={0.55}
        far={4}
        color="#000000"
      />

      <Worker />

      <ScenarioObjects scenarioId={scenarioId} />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={11}
        maxPolarAngle={Math.PI / 2.05}
        /* Slow auto-drift so the scene reads as three-dimensional before the user
           has touched anything. Stops the moment they drag, and never runs for
           anyone who asked the OS to stop moving things. */
        autoRotate={!reduced}
        autoRotateSpeed={0.35}
      />
    </>
  )
}

/* -------------------- MAIN COMPONENT -------------------- */

export default function SafetyScene3D({ scenarioId }) {
  return (
    <div
      style={{
        width: '100%',
        height: '420px',
        marginBottom: '24px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #444',
        /* A gradient rather than a flat fill, so the floor fades into the backdrop
           instead of meeting it at a hard visible line. CSS, so it costs nothing
           on the GPU that is already drawing the scene. */
        background: 'radial-gradient(120% 90% at 50% 12%, #1d242a 0%, #12171a 55%, #0c1012 100%)',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{
          position: [5, 3, 7],
          fov: 45,
        }}
        /* Capped pixel ratio: a 3x phone display would otherwise render nine times
           the pixels for a briefing diagram that gains nothing from it. */
        dpr={[1, 1.75]}
      >
        <Suspense fallback={null}>
          <Scene scenarioId={scenarioId} />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '0',
          right: '0',
          textAlign: 'center',
          color: '#cccccc',
          fontSize: '12px',
          pointerEvents: 'none',
        }}
      >
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}