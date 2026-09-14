"use client";

import { Column } from "@/features/game/components/scene/decor/Fixtures";
import { Hologram } from "@/features/game/components/scene/decor/Hologram";
import { MUSEUM } from "@/features/game/components/scene/materials";
import { OBSTACLES, ROOMS } from "@/features/game/data/world";
import { useGameStore } from "@/features/game/state/useGameStore";

const SCONCES: readonly [number, number, number][] = [
  [-3.85, 2.4, -9.8],
  [3.85, 2.4, -9.8],
];

/** Salle de l'hologramme : colonnes, appliques et l'estrade de projection. */
export function HologramHallDecor() {
  const active = useGameStore(
    (state) => state.status === "finale" || state.status === "won",
  );
  const room = ROOMS.hologram;

  return (
    <group>
      {OBSTACLES.filter((obstacle) => obstacle.id.startsWith("column")).map(
        (column) => (
          <Column
            key={column.id}
            position={[column.center[0], 0, column.center[1]]}
            height={room.height}
          />
        ),
      )}

      {SCONCES.map((position) => (
        <group key={position.join(":")} position={position}>
          <mesh>
            <boxGeometry args={[0.1, 0.5, 0.3]} />
            <meshStandardMaterial
              color={MUSEUM.metal}
              roughness={0.35}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[position[0] > 0 ? -0.07 : 0.07, 0.1, 0]}>
            <boxGeometry args={[0.03, 0.3, 0.22]} />
            <meshStandardMaterial
              color={MUSEUM.accentLight}
              emissive={MUSEUM.lightWarm}
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      <Hologram active={active} />
    </group>
  );
}
