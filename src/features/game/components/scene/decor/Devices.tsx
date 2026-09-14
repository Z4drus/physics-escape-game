"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, type Group, type MeshStandardMaterial } from "three";

import { MUSEUM } from "@/features/game/components/scene/materials";

const IRON = { color: "#2a2623", roughness: 0.5, metalness: 0.6 } as const;
const BRASS = { color: MUSEUM.metal, roughness: 0.35, metalness: 0.8 } as const;

/**
 * Coffre-fort en fonte du cabinet. La porte pivote d'un quart de tour quand
 * la combinaison a été trouvée, et laisse voir le fusible et la clé tant
 * qu'ils n'ont pas été pris (ils partent avec l'ouverture).
 */
export function Safe({
  position,
  rotationY = 0,
  open,
}: {
  position: [number, number, number];
  rotationY?: number;
  open: boolean;
}) {
  const door = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!door.current) return;
    door.current.rotation.y = MathUtils.lerp(
      door.current.rotation.y,
      open ? -1.9 : 0,
      1 - Math.exp(-4 * delta),
    );
  });

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.9, 0.7]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {/* Intérieur visible une fois ouvert */}
      <mesh position={[0, 0.45, 0.05]}>
        <boxGeometry args={[0.56, 0.76, 0.6]} />
        <meshStandardMaterial color="#0d0b0a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 0.1]}>
        <boxGeometry args={[0.5, 0.02, 0.4]} />
        <meshStandardMaterial {...IRON} />
      </mesh>
      {/* Porte, charnière sur le côté gauche */}
      <group ref={door} position={[-0.35, 0.45, 0.36]}>
        <mesh position={[0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.9, 0.06]} />
          <meshStandardMaterial {...IRON} />
        </mesh>
        <mesh position={[0.35, 0, 0.04]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 0.03, 24]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0.35, 0, 0.065]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
          <meshStandardMaterial color={MUSEUM.frame} roughness={0.5} />
        </mesh>
        <mesh position={[0.6, 0, 0.05]}>
          <boxGeometry args={[0.05, 0.22, 0.03]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      </group>
      {/* Pieds */}
      {[-0.28, 0.28].flatMap((x) =>
        [-0.28, 0.28].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.03, z]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial {...IRON} />
          </mesh>
        )),
      )}
    </group>
  );
}

/**
 * Tableau électrique de la galerie, fixé au mur. Le voyant passe du rouge au
 * vert quand le courant est rétabli et les disjoncteurs se relèvent.
 */
export function FuseBox({
  position,
  rotationY = 0,
  powered,
}: {
  position: [number, number, number];
  rotationY?: number;
  powered: boolean;
}) {
  const indicator = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!indicator.current) return;
    const blink = powered ? 1 : 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4);
    indicator.current.emissiveIntensity = 1 + blink * 1.5;
  });

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.06]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.12]} />
        <meshStandardMaterial color="#6d6a62" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.125]}>
        <boxGeometry args={[0.44, 0.62, 0.01]} />
        <meshStandardMaterial color="#3a3833" roughness={0.7} metalness={0.3} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={index}
          position={[-0.15 + index * 0.1, powered ? 0.06 : -0.06, 0.145]}
        >
          <boxGeometry args={[0.05, 0.1, 0.03]} />
          <meshStandardMaterial color="#1a1917" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.22, 0.14]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
        <meshStandardMaterial
          ref={indicator}
          color={powered ? "#7fe0a0" : "#ff5a3c"}
          emissive={powered ? "#7fe0a0" : "#ff5a3c"}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.22, 0.135]}>
        <boxGeometry args={[0.3, 0.06, 0.005]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  );
}
