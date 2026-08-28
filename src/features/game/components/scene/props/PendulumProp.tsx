"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

/** Pendule simple : la masse oscille autour de son point d'attache. */
export function PendulumProp({ solved }: { solved: boolean }) {
  const swing = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!swing.current) return;
    const amplitude = solved ? 0.18 : 0.42;
    swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.9) * amplitude;
  });

  return (
    <group>
      <mesh position={[0, 1.05, -0.45]} castShadow>
        <boxGeometry args={[0.12, 1.9, 0.12]} />
        <meshStandardMaterial
          color="#6d7896"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.98, -0.2]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.62]} />
        <meshStandardMaterial
          color="#6d7896"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>

      <group ref={swing} position={[0, 1.96, 0.08]}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
          <meshStandardMaterial color="#cbd4e6" />
        </mesh>
        <mesh position={[0, -1.05, 0]} castShadow>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshStandardMaterial
            color={solved ? "#4ee1c1" : "#d0d7e8"}
            metalness={0.75}
            roughness={0.25}
            emissive={solved ? "#4ee1c1" : "#000000"}
            emissiveIntensity={solved ? 0.4 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}
