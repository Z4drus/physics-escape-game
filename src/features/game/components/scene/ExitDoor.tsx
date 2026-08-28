"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";
import { MathUtils } from "three";

import { LAB } from "@/features/game/components/scene/materials";
import { TOTAL_KEYS } from "@/features/game/data/stations";
import { DOOR, ROOM, ROOM_HALF_DEPTH } from "@/features/game/data/room";

const PANEL_WIDTH = DOOR.width / 2;
const CLOSED_OFFSET = PANEL_WIDTH / 2;
const OPEN_OFFSET = PANEL_WIDTH * 1.55;
const DOOR_Z = -ROOM_HALF_DEPTH - ROOM.wallThickness / 2;

/**
 * Porte de sortie à double battant. Les vantaux coulissent dans le mur
 * lorsque toutes les clés ont été récupérées.
 */
export function ExitDoor({
  open,
  collectedKeys,
}: {
  open: boolean;
  collectedKeys: number;
}) {
  const leftPanel = useRef<Mesh>(null);
  const rightPanel = useRef<Mesh>(null);
  const indicator = useRef<MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    const target = open ? OPEN_OFFSET : CLOSED_OFFSET;
    // Lissage exponentiel : indépendant du framerate, sans à-coups.
    const smoothing = 1 - Math.exp(-4 * delta);

    if (leftPanel.current) {
      leftPanel.current.position.x = MathUtils.lerp(
        leftPanel.current.position.x,
        -target,
        smoothing,
      );
    }
    if (rightPanel.current) {
      rightPanel.current.position.x = MathUtils.lerp(
        rightPanel.current.position.x,
        target,
        smoothing,
      );
    }
    if (indicator.current) {
      indicator.current.emissiveIntensity = open ? 2.4 : 1.1;
    }
  });

  return (
    <group>
      <mesh
        ref={leftPanel}
        position={[DOOR.centerX - CLOSED_OFFSET, DOOR.height / 2, DOOR_Z]}
        castShadow
      >
        <boxGeometry args={[PANEL_WIDTH, DOOR.height, 0.14]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.42}
          metalness={0.65}
        />
      </mesh>
      <mesh
        ref={rightPanel}
        position={[DOOR.centerX + CLOSED_OFFSET, DOOR.height / 2, DOOR_Z]}
        castShadow
      >
        <boxGeometry args={[PANEL_WIDTH, DOOR.height, 0.14]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.42}
          metalness={0.65}
        />
      </mesh>

      {/* Lecteur de clés : une LED par énigme */}
      <group
        position={[
          DOOR.centerX + DOOR.width / 2 + 0.55,
          1.45,
          -ROOM_HALF_DEPTH + 0.06,
        ]}
      >
        <mesh>
          <boxGeometry args={[0.42, 0.9, 0.08]} />
          <meshStandardMaterial
            color={LAB.frame}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.05]}>
          <boxGeometry args={[0.3, 0.12, 0.02]} />
          <meshStandardMaterial
            ref={indicator}
            color={open ? LAB.accentLight : LAB.warning}
            emissive={open ? LAB.accentLight : LAB.warning}
            emissiveIntensity={1.1}
            toneMapped={false}
          />
        </mesh>
        {Array.from({ length: TOTAL_KEYS }, (_, index) => {
          const lit = index < collectedKeys;
          return (
            <mesh key={index} position={[0, 0.14 - index * 0.12, 0.05]}>
              <boxGeometry args={[0.22, 0.06, 0.02]} />
              <meshStandardMaterial
                color={lit ? LAB.accentLight : LAB.frame}
                emissive={lit ? LAB.accentLight : "#000000"}
                emissiveIntensity={lit ? 1.6 : 0}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
