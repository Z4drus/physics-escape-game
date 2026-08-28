"use client";

import { LAB } from "@/features/game/components/scene/materials";
import { ROOM, ROOM_HALF_DEPTH } from "@/features/game/data/room";

const NEON_POSITIONS: readonly [number, number][] = [
  [-3.4, -3.4],
  [3.4, -3.4],
  [-3.4, 3.4],
  [3.4, 3.4],
];

/**
 * Éclairage de la salle : une base ambiante froide, quatre néons au plafond
 * et une lumière directionnelle qui porte les ombres.
 */
export function Lights({ doorOpen }: { doorOpen: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} color={LAB.lightAmbient} />
      <hemisphereLight
        intensity={0.45}
        color={LAB.glass}
        groundColor={LAB.ceiling}
      />

      {NEON_POSITIONS.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, ROOM.height - 0.16, z]}>
          <mesh>
            <boxGeometry args={[2.6, 0.08, 0.3]} />
            <meshStandardMaterial
              color={LAB.lightNeon}
              emissive={LAB.glass}
              emissiveIntensity={1.9}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, -0.4, 0]}
            intensity={9}
            distance={11}
            decay={2}
            color={LAB.glass}
          />
        </group>
      ))}

      <directionalLight
        position={[5, 8, 4]}
        intensity={1.1}
        color={LAB.lightKey}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={30}
        shadow-bias={-0.0008}
      />

      {/* La sortie s'illumine en vert dès que la porte est déverrouillée. */}
      <pointLight
        position={[0, 2.2, -ROOM_HALF_DEPTH + 1.4]}
        intensity={doorOpen ? 14 : 4}
        distance={8}
        decay={2}
        color={doorOpen ? LAB.accentLight : LAB.warning}
      />
    </>
  );
}
