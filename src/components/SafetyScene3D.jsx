import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'

/* -------------------- FLOOR -------------------- */

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[14, 10]} />
      <meshStandardMaterial color="#252525" />
    </mesh>
  )
}

/* -------------------- WORKER -------------------- */

function Worker() {
  return (
    <group position={[-2.5, -0.5, 0]}>
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

      <Html position={[0, 1.65, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- FIRE -------------------- */

function Fire() {
  return (
    <group position={[2, -0.5, 0]}>
      {/* Outer flame */}
      <mesh>
        <coneGeometry args={[0.7, 1.8, 16]} />
        <meshStandardMaterial
          color="#d32f2f"
          emissive="#7f0000"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Inner flame */}
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.38, 1.2, 16]} />
        <meshStandardMaterial
          color="#ffb300"
          emissive="#ff6f00"
          emissiveIntensity={1}
        />
      </mesh>

      <Html position={[0, 1.5, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- FIRE EXTINGUISHER -------------------- */

function FireExtinguisher() {
  return (
    <group position={[3.4, -0.7, 0]}>
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

      <Html position={[0, 1.1, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- ELECTRICAL PANEL -------------------- */

function ElectricalPanel() {
  return (
    <group position={[2, 0, 0]}>
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

      <Html position={[0, 1.7, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- MACHINERY -------------------- */

function Machinery() {
  return (
    <group position={[2, -0.2, 0]}>
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

      <Html position={[0, 2, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- MINE -------------------- */

function MineTunnel() {
  return (
    <group>
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

      <Html position={[2, 2.9, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- GAS DETECTOR -------------------- */

function GasDetector() {
  return (
    <group position={[3, -0.3, 0.7]}>
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

      <Html position={[0, 0.8, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- DUST MACHINE -------------------- */

function DustMachine() {
  return (
    <group position={[2, -0.1, 0]}>
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

      <Html position={[0, 2.6, 0]} center>
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
      </Html>
    </group>
  )
}

/* -------------------- WAREHOUSE -------------------- */

function Warehouse() {
  return (
    <group position={[2, -0.5, 0]}>
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

      <Html position={[0, 1.8, 0]} center>
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
      </Html>
    </group>
  )
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

    default:
      return <Fire />
  }
}

/* -------------------- 3D WORLD -------------------- */

function Scene({ scenarioId }) {
  return (
    <>
      <ambientLight intensity={1.2} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
      />

      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.6}
      />

      <Floor />

      <Worker />

      <ScenarioObjects scenarioId={scenarioId} />

      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={11}
        maxPolarAngle={Math.PI / 2.05}
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
        background: '#111518',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{
          position: [5, 3, 7],
          fov: 45,
        }}
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