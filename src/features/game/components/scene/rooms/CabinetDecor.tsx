"use client";

import { CuratorDesk } from "@/features/game/components/scene/decor/Desks";
import { Safe } from "@/features/game/components/scene/decor/Devices";
import { Bookshelf } from "@/features/game/components/scene/decor/Fixtures";
import {
  Chalkboard,
  UvMessage,
} from "@/features/game/components/scene/decor/WallPieces";
import { MUSEUM } from "@/features/game/components/scene/materials";
import { useGameStore } from "@/features/game/state/useGameStore";

/**
 * Décor du cabinet du conservateur : bureau, coffre, bibliothèque, tableau
 * noir et le message invisible du mur nord.
 */
export function CabinetDecor() {
  const safeOpen = useGameStore((state) => state.safeOpen);
  const uvRevealed = useGameStore((state) => state.uvRevealed);
  const riddle = useGameStore((state) => state.safeRiddle);

  return (
    <group>
      <CuratorDesk position={[11.6, 0, 0.05]} />
      <Safe position={[13.6, 0, -0.45]} open={safeOpen} />
      <Bookshelf position={[11.3, 0, 4.78]} rotationY={Math.PI} />
      <Chalkboard
        position={[13.5, 2.15, -0.99]}
        rotationY={0}
        width={1.3}
        height={1.0}
      />
      <UvMessage
        position={[11.6, 1.8, -0.98]}
        rotationY={0}
        revealed={uvRevealed}
        lines={[
          "Le coffre s'ouvre sur l'énergie",
          "potentielle, en joules,",
          `d'une masse de ${riddle.massKg} kg`,
          `posée à ${riddle.heightM} m de hauteur.`,
          "g = 10 m/s²",
        ]}
      />

      {/* Tapis et plafonnier */}
      <mesh position={[11.3, 0.005, 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.6, 2.6]} />
        <meshStandardMaterial color="#5a2a24" roughness={0.95} />
      </mesh>
      <mesh position={[11.3, 3.2, 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.8, 6]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[11.3, 2.85, 2]}>
        <sphereGeometry args={[0.18, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={MUSEUM.accentLight}
          emissive={MUSEUM.lightWarm}
          emissiveIntensity={1.1}
          side={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
