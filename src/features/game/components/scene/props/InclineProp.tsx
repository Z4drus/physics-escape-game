"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

const RAMP_ANGLE = 0.42;
const RAMP_LENGTH = 2.1;

/** Plan incliné : une bille dévale la rampe en boucle. */
export function InclineProp({ solved }: { solved: boolean }) {
  const ball = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    // Descente en 2,4 s puis retour instantané en haut de la rampe.
    const progress = (clock.elapsedTime % 2.4) / 2.4;
    const travelled = progress * progress * RAMP_LENGTH;
    ball.current.position.set(
      -RAMP_LENGTH / 2 + travelled * Math.cos(RAMP_ANGLE),
      0.72 - travelled * Math.sin(RAMP_ANGLE) + 0.1,
      0,
    );
    ball.current.rotation.z -= progress * 0.25;
  });

  return (
    <group>
      <mesh position={[-0.9, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.72, 0.9]} />
        <meshStandardMaterial color="#3a4460" roughness={0.8} />
      </mesh>

      <mesh
        position={[0, 0.36, 0]}
        rotation-z={-RAMP_ANGLE}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[RAMP_LENGTH, 0.07, 0.8]} />
        <meshStandardMaterial
          color={solved ? "#2f6f63" : "#4a5570"}
          roughness={0.55}
          metalness={0.3}
        />
      </mesh>

      <mesh ref={ball} castShadow>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial
          color="#e0e6f5"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
