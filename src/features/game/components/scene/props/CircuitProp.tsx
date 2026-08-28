"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshStandardMaterial } from "three";

/** Banc d'électricité : deux résistances alimentant une ampoule. */
export function CircuitProp({ solved }: { solved: boolean }) {
  const bulb = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!bulb.current) return;
    // L'ampoule clignote tant que le montage n'est pas validé.
    const pulse = (Math.sin(clock.elapsedTime * 3.4) + 1) / 2;
    bulb.current.emissiveIntensity = solved ? 2.6 : 0.35 + pulse * 0.9;
  });

  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.84, 0.9]} />
        <meshStandardMaterial color="#3a4460" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.87, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.06, 1]} />
        <meshStandardMaterial
          color="#222a3c"
          roughness={0.5}
          metalness={0.35}
        />
      </mesh>

      {[-0.32, 0.32].map((x) => (
        <mesh
          key={x}
          position={[x, 0.96, 0.16]}
          rotation-z={Math.PI / 2}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 0.34, 16]} />
          <meshStandardMaterial
            color="#c9a15b"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.92, 0.16]}>
        <boxGeometry args={[0.9, 0.02, 0.02]} />
        <meshStandardMaterial color="#6d7896" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[0, 1.18, -0.24]} castShadow>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial
          ref={bulb}
          color="#fff3c4"
          emissive="#ffd96b"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.0, -0.24]}>
        <cylinderGeometry args={[0.06, 0.07, 0.2, 12]} />
        <meshStandardMaterial color="#8b95ad" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
