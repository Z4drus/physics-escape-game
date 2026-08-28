"use client";

import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, type ComponentRef, type RefObject } from "react";
import { ACESFilmicToneMapping } from "three";

import { ExitDoor } from "@/features/game/components/scene/ExitDoor";
import { Lights } from "@/features/game/components/scene/Lights";
import { Player } from "@/features/game/components/scene/Player";
import { StationProp } from "@/features/game/components/scene/StationProp";
import { Room } from "@/features/game/components/scene/Room";
import { PLAYER, PLAYER_SPAWN } from "@/features/game/data/room";
import { STATIONS } from "@/features/game/data/stations";
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
  const status = useGameStore((state) => state.status);

  // Une modale occupe l'écran : la salle reste visible derrière le voile mais
  // n'a plus besoin d'être redessinée, et le schéma récupère le GPU.
  const isModalOpen = status === "puzzle" || status === "won";

  return (
    <Canvas
      frameloop={isModalOpen ? "demand" : "always"}
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      resize={{ offsetSize: true }}
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
      <color attach="background" args={["#00070d"]} />
      <fogExp2 attach="fog" args={["#000f18", 0.024]} />

      <Lights doorOpen={doorOpen} />
      <Suspense fallback={null}>
        <Room />
      </Suspense>
      <ExitDoor open={doorOpen} collectedKeys={collectedKeys} />

      {STATIONS.map((station) => (
        <StationProp key={station.id} station={station} />
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
