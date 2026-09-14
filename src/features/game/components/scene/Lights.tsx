"use client";

import { MUSEUM } from "@/features/game/components/scene/materials";
import { ROOMS, WINDOWS, WALLS_BY_ID } from "@/features/game/data/world";

/** Points d'accroche des lustres de la galerie, à hauteur de plafond. */
export const CHANDELIER_POSITIONS: readonly [number, number, number][] = [
  [0, ROOMS.gallery.height - 1.0, -3],
  [0, ROOMS.gallery.height - 1.0, 1],
  [0, ROOMS.gallery.height - 1.0, 5],
];

/** Fenêtres qui portent une lumière de crépuscule (les plus visibles). */
const LIT_WINDOWS = new Set([
  "w-west-1",
  "w-west-2",
  "w-west-3",
  "w-south-1",
  "w-south-2",
  "w-east-1",
  "w-cabinet",
]);

/**
 * Éclairage du musée. Avant le rétablissement du courant, la galerie vit sur
 * ses veilleuses et la lumière bleue des fenêtres ; les lustres prennent le
 * relais ensuite. Le cabinet a sa lampe de banquier, la salle de
 * l'hologramme sa lueur cyan.
 */
export function Lights({
  powered,
  finale,
}: {
  powered: boolean;
  finale: boolean;
}) {
  return (
    <>
      <hemisphereLight
        intensity={powered ? 0.7 : 0.5}
        color="#f6e7cf"
        groundColor="#3a2a1c"
      />
      <ambientLight
        intensity={powered ? 0.3 : 0.2}
        color={MUSEUM.lightAmbient}
      />

      <directionalLight
        position={[-6, 9, 3]}
        intensity={0.5}
        color="#ffe6c4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {CHANDELIER_POSITIONS.map(([x, y, z]) => (
        <pointLight
          key={`${x}:${z}`}
          position={[x, y - 1.1, z]}
          intensity={powered ? 14 : 6}
          distance={15}
          decay={2}
          color={MUSEUM.lightWarm}
        />
      ))}

      {WINDOWS.filter((window) => LIT_WINDOWS.has(window.id)).map((window) => {
        const wall = WALLS_BY_ID.get(window.wallId);
        if (!wall) return null;
        // La lueur se place côté pièce : vers le centre de la pièce du mur.
        const room = ROOMS[wall.roomId];
        const roomCenter =
          wall.axis === "x"
            ? (room.minZ + room.maxZ) / 2
            : (room.minX + room.maxX) / 2;
        const inward = Math.sign(roomCenter - wall.at) * 0.9;
        const position: [number, number, number] =
          wall.axis === "z"
            ? [wall.at + inward, window.sill + 1.6, window.center]
            : [window.center, window.sill + 1.6, wall.at + inward];
        return (
          <pointLight
            key={window.id}
            position={position}
            intensity={5}
            distance={7}
            decay={2}
            color={MUSEUM.lightDusk}
          />
        );
      })}

      {/* Cabinet : plafonnier et lampe de banquier */}
      <pointLight
        position={[11.3, 2.6, 2]}
        intensity={9}
        distance={9}
        decay={2}
        color={MUSEUM.lightWarm}
      />
      <pointLight
        position={[12.15, 1.3, -0.1]}
        intensity={3}
        distance={3.5}
        decay={2}
        color="#8fe6a8"
      />

      {/* Salle de l'hologramme */}
      <pointLight
        position={[0, 3.4, -10]}
        intensity={finale ? 9 : 4}
        distance={10}
        decay={2}
        color={MUSEUM.hologram}
      />
      <pointLight
        position={[0, 2.8, -5.2]}
        intensity={6}
        distance={6}
        decay={2}
        color={MUSEUM.lightWarm}
      />
    </>
  );
}
