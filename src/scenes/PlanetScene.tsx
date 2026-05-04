import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, Html, Trail } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import type { Group, Mesh } from 'three';
import { Vector3 } from 'three';

export interface PlanetData {
  id: string;
  stage: number;
  name: string;
  subtitle: string;
  status: 'cleared' | 'active' | 'locked';
  color: string;
  size: number;
  position: [number, number, number];
}

interface PlanetProps {
  data: PlanetData;
  onClick: (id: string) => void;
}

function Planet({ data, onClick }: PlanetProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
    }
    if (groupRef.current && data.status === 'active') {
      groupRef.current.position.y = data.position[1] + Math.sin(Date.now() * 0.001) * 0.15;
    }
  });

  const emissive = data.status === 'locked' ? '#222233' : data.color;
  const emissiveIntensity = data.status === 'active' ? 1.4 : data.status === 'cleared' ? 0.7 : 0.25;

  return (
    <group ref={groupRef} position={data.position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(data.id)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[data.size, 48, 48]} />
        <meshStandardMaterial
          color={data.color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>

      {data.status === 'active' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 1.5, data.size * 1.7, 64]} />
          <meshBasicMaterial color={data.color} transparent opacity={0.5} />
        </mesh>
      )}

      <Html distanceFactor={10} position={[0, data.size + 0.6, 0]} center>
        <div
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 11,
            letterSpacing: 2,
            color: data.status === 'locked' ? '#6e769c' : '#e8ecff',
            textAlign: 'center',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 9, color: '#55e6ff' }}>STAGE {data.stage.toString().padStart(2, '0')}</div>
          <div style={{ fontWeight: 700 }}>{data.name}</div>
        </div>
      </Html>
    </group>
  );
}

function Spaceship({ target }: { target: [number, number, number] }) {
  const ref = useRef<Mesh>(null);
  const targetVec = useMemo(() => new Vector3(...target), [target]);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * 0.5;
      const orbitRadius = 1.2;
      ref.current.position.x = targetVec.x + Math.cos(t) * orbitRadius;
      ref.current.position.z = targetVec.z + Math.sin(t) * orbitRadius;
      ref.current.position.y = targetVec.y + Math.sin(t * 2) * 0.2;
      ref.current.lookAt(targetVec);
    }
  });

  return (
    <Trail
      width={1.2}
      length={8}
      color="#55e6ff"
      attenuation={(t) => t * t}
    >
      <mesh ref={ref}>
        <coneGeometry args={[0.1, 0.4, 8]} />
        <meshStandardMaterial
          color="#55e6ff"
          emissive="#55e6ff"
          emissiveIntensity={2}
        />
      </mesh>
    </Trail>
  );
}

function PathLine({ planets }: { planets: PlanetData[] }) {
  const points = useMemo(() => {
    return planets.map((p) => new Vector3(...p.position));
  }, [planets]);

  return (
    <>
      {points.slice(0, -1).map((start, i) => {
        const end = points[i + 1];
        const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
        const length = start.distanceTo(end);
        const dir = new Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(dir.z, dir.x);

        return (
          <mesh
            key={i}
            position={[mid.x, mid.y, mid.z]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, 0.02, 0.02]} />
            <meshBasicMaterial
              color={planets[i + 1].status === 'locked' ? '#2a2e55' : '#9b6bff'}
              transparent
              opacity={0.55}
            />
          </mesh>
        );
      })}
    </>
  );
}

interface Props {
  planets: PlanetData[];
  activePlanetPos: [number, number, number];
  onPlanetClick: (id: string) => void;
}

export default function PlanetScene({ planets, activePlanetPos, onPlanetClick }: Props) {
  return (
    <Canvas camera={{ position: [0, 4, 16], fov: 55 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[-20, 10, -10]} intensity={1.8} color="#9b6bff" />
      <pointLight position={[20, 10, 10]} intensity={1.5} color="#55e6ff" />
      <pointLight position={[0, -10, 0]} intensity={0.8} color="#ff5fd2" />

      <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade />

      <PathLine planets={planets} />
      {planets.map((p) => (
        <Planet key={p.id} data={p} onClick={onPlanetClick} />
      ))}
      <Spaceship target={activePlanetPos} />

      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={10}
        maxDistance={28}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}
