import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';

function DriftingStars() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      ref.current.rotation.x += delta * 0.006;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={120} depth={60} count={6000} factor={4} saturation={0} fade speed={0.5} />
    </group>
  );
}

function Nebula() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[-20, 10, -20]} intensity={2.2} color="#9b6bff" />
      <pointLight position={[20, -10, -15]} intensity={1.8} color="#55e6ff" />
      <pointLight position={[0, 0, 15]} intensity={0.9} color="#ff5fd2" />
    </>
  );
}

export default function SpaceBackground() {
  return (
    <div className="space-bg-canvas">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Nebula />
        <DriftingStars />
      </Canvas>
    </div>
  );
}
