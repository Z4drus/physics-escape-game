"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { ComponentRef, RefObject } from "react";
import { ACESFilmicToneMapping } from "three";

import { ExitDoor } from "@/features/game/components/scene/ExitDoor";
import { Lights } from "@/features/game/components/scene/Lights";
import { Player } from "@/features/game/components/scene/Player";
import { PuzzleStation } from "@/features/game/components/scene/PuzzleStation";
import { Room } from "@/features/game/components/scene/Room";
import {
  INTERACTIVE_OBJECTS,
  PLAYER,
  PLAYER_SPAWN,
} from "@/features/game/data/room";
import {
  selectDoorOpen,
  useGameStore,
} from "@/features/game/state/useGameStore";

export type PointerLockControlsHandle = ComponentRef<
  typeof PointerLockControls
>;

/**
 * Rendu 3D de la salle. Le verrouillage du pointeur est piloté depuis
 * l'interface (bouton « Entrer dans la salle ») via `controlsRef` : le
 * sélecteur ci-dessous ne cible volontairement aucun élément afin de
 * désactiver le verrouillage automatique de drei sur n'importe quel clic.
 */
export function GameCanvas({
  controlsRef,
  onLock,
  onUnlock,
}: {
  controlsRef: RefObject<PointerLockControlsHandle | null>;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const doorOpen = useGameStore(selectDoorOpen);
  const collectedKeys = useGameStore((state) => state.keys.length);

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        fov: 72,
        near: 0.1,
        far: 60,
        position: [PLAYER_SPAWN[0], PLAYER.eyeHeight, PLAYER_SPAWN[2]],
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#070b14"]} />
      <fogExp2 attach="fog" args={["#070b14", 0.026]} />

      <Lights doorOpen={doorOpen} />
      <Room />
      <ExitDoor open={doorOpen} collectedKeys={collectedKeys} />

      {INTERACTIVE_OBJECTS.map((object) => (
        <PuzzleStation key={object.id} object={object} />
      ))}

      <Player doorOpen={doorOpen} />

      <PointerLockControls
        ref={controlsRef}
        selector="#pointer-lock-disabled"
        onLock={onLock}
        onUnlock={onUnlock}
      />
    </Canvas>
  );
}
