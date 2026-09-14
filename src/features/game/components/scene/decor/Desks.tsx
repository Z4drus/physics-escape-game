"use client";

import { MUSEUM } from "@/features/game/components/scene/materials";

const WOOD = { color: MUSEUM.panel, roughness: 0.55, metalness: 0.05 } as const;
const BRASS = { color: MUSEUM.metal, roughness: 0.35, metalness: 0.8 } as const;

/**
 * Bureau du surveillant, près de l'entrée : un bureau simple, une lampe, un
 * registre et le tiroir où dort la lampe UV. `drawerOpen` sort le tiroir une
 * fois fouillé.
 */
export function GuardDesk({
  position,
  rotationY = 0,
  drawerOpen,
}: {
  position: [number, number, number];
  rotationY?: number;
  drawerOpen: boolean;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.05, 0.75]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]} castShadow>
          <boxGeometry args={[0.16, 0.74, 0.7]} />
          <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
        </mesh>
      ))}
      {/* Tiroir central */}
      <mesh position={[0, 0.66, drawerOpen ? 0.55 : 0.34]} castShadow>
        <boxGeometry args={[0.6, 0.12, 0.6]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, drawerOpen ? 0.86 : 0.65]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {/* Registre et lampe de bureau */}
      <mesh position={[-0.35, 0.8, 0.05]} rotation-y={0.15}>
        <boxGeometry args={[0.32, 0.03, 0.42]} />
        <meshStandardMaterial color="#6b2f2a" roughness={0.7} />
      </mesh>
      <group position={[0.5, 0.78, -0.2]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 16]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.36, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <coneGeometry args={[0.14, 0.12, 20, 1, true]} />
          <meshStandardMaterial
            color={MUSEUM.velvet}
            emissive={MUSEUM.lightWarm}
            emissiveIntensity={0.9}
            side={2}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Bureau du conservateur : plateau de cuir vert, lampe de banquier, encrier.
 * La lumière verte de la lampe est portée par `Lights`.
 */
export function CuratorDesk({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.06, 0.9]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      <mesh position={[0, 0.815, 0]}>
        <boxGeometry args={[1.5, 0.012, 0.6]} />
        <meshStandardMaterial color={MUSEUM.leather} roughness={0.7} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.38, 0]} castShadow>
          <boxGeometry args={[0.36, 0.76, 0.84]} />
          <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
        </mesh>
      ))}
      {[-0.7, 0.7].flatMap((x) =>
        [0.2, 0.42, 0.64].map((y) => (
          <mesh key={`${x}:${y}`} position={[x, y, 0.43]}>
            <boxGeometry args={[0.06, 0.02, 0.01]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        )),
      )}
      {/* Lampe de banquier */}
      <group position={[0.55, 0.82, -0.22]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.04, 16]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.34, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.38, 0.05]} rotation-x={0.35}>
          <cylinderGeometry args={[0.1, 0.1, 0.26, 20, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color="#1f5a3a"
            emissive="#7fe0a0"
            emissiveIntensity={1.4}
            side={2}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* Encrier, sous-main et papiers */}
      <mesh position={[-0.55, 0.85, -0.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.06, 12]} />
        <meshStandardMaterial color="#1a1512" roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, 0.83, 0.05]} rotation-y={-0.1}>
        <boxGeometry args={[0.4, 0.01, 0.3]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.9} />
      </mesh>
      {/* Fauteuil */}
      <group position={[0, 0, -0.85]}>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.6, 0.1, 0.6]} />
          <meshStandardMaterial color={MUSEUM.leather} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.85, -0.27]} castShadow>
          <boxGeometry args={[0.6, 0.7, 0.08]} />
          <meshStandardMaterial color={MUSEUM.leather} roughness={0.7} />
        </mesh>
        {[-0.25, 0.25].flatMap((x) =>
          [-0.25, 0.25].map((z) => (
            <mesh key={`${x}:${z}`} position={[x, 0.22, z]}>
              <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
              <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
