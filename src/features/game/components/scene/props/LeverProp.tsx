"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { MathUtils } from "three";

/** Balance à levier : le fléau s'équilibre une fois l'énigme résolue. */
export function LeverProp({ solved }: { solved: boolean }) {
  const beam = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!beam.current) return;
    const target = solved ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.16;
    beam.current.rotation.z = MathUtils.lerp(
      beam.current.rotation.z,
      target,
      1 - Math.exp(-6 * delta),
    );
  });

  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.34, 0.6, 4]} />
        <meshStandardMaterial
          color="#4a5570"
          metalness={0.5}
          roughness={0.45}
        />
      </mesh>

      <group ref={beam} position={[0, 0.64, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.2, 0.08, 0.24]} />
          <meshStandardMaterial
            color={solved ? "#2f6f63" : "#6d7896"}
            metalness={0.55}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[-0.9, 0.16, 0]} castShadow>
          <boxGeometry args={[0.3, 0.24, 0.3]} />
          <meshStandardMaterial
            color="#c9a15b"
            metalness={0.35}
            roughness={0.6}
          />
        </mesh>
        <mesh position={[0.86, 0.2, 0]} castShadow>
          <boxGeometry args={[0.34, 0.32, 0.34]} />
          <meshStandardMaterial
            color="#a8b2c8"
            metalness={0.45}
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
