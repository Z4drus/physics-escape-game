"use client";

import {
  PerformanceMonitor,
  PointerLockControls,
  Preload,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useState, type RefObject } from "react";
import { ACESFilmicToneMapping } from "three";

import {
  CabinetDoor,
  EntranceDoor,
  FinalDoor,
} from "@/features/game/components/scene/Doors";
import { Effects } from "@/features/game/components/scene/Effects";
import { Lights } from "@/features/game/components/scene/Lights";
import { Player } from "@/features/game/components/scene/Player";
import { CabinetDecor } from "@/features/game/components/scene/rooms/CabinetDecor";
import { GalleryDecor } from "@/features/game/components/scene/rooms/GalleryDecor";
import { HologramHallDecor } from "@/features/game/components/scene/rooms/HologramHallDecor";
import { ShadowRefresh } from "@/features/game/components/scene/ShadowRefresh";
import { StationProp } from "@/features/game/components/scene/StationProp";
import { World } from "@/features/game/components/scene/World";
import { STATIONS } from "@/features/game/data/stations";
import { PLAYER, PLAYER_SPAWN } from "@/features/game/data/world";
import type { PointerLockControlsHandle } from "@/features/game/hooks/usePointerLock";
import {
  INITIAL_PERFORMANCE_FACTOR,
  renderQualityOf,
} from "@/features/game/logic/renderQuality";
import {
  openDoorsOf,
  selectFinalDoorOpen,
  useGameStore,
} from "@/features/game/state/useGameStore";
import type { GameStatus, RoomId, Station } from "@/types/game";

const STATIONS_BY_ROOM: Readonly<Record<RoomId, readonly Station[]>> = {
  gallery: STATIONS.filter((station) => station.roomId === "gallery"),
  cabinet: STATIONS.filter((station) => station.roomId === "cabinet"),
  hologram: STATIONS.filter((station) => station.roomId === "hologram"),
};

/**
 * États où un écran recouvre la salle (titre, introduction, pause, fenêtre,
 * victoire) : elle reste visible derrière le voile mais n'a plus besoin
 * d'être redessinée, et le schéma d'une question récupère le GPU.
 */
const FROZEN_STATUSES: ReadonlySet<GameStatus> = new Set([
  "idle",
  "intro",
  "paused",
  "modal",
  "won",
]);

/**
 * Rendu 3D du musée. Le verrouillage du pointeur est piloté depuis
 * l'interface via `controlsRef` : le sélecteur ci-dessous ne cible
 * volontairement aucun élément afin de désactiver le verrouillage automatique
 * de drei sur n'importe quel clic.
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
  const status = useGameStore((state) => state.status);
  const cabinetUnlocked = useGameStore((state) => state.cabinetUnlocked);
  const finalDoorOpen = useGameStore(selectFinalDoorOpen);
  const seals = useGameStore((state) => state.seals);
  const powered = useGameStore((state) => state.powerRestored);
  const [performanceFactor, setPerformanceFactor] = useState(
    INITIAL_PERFORMANCE_FACTOR,
  );
  const quality = renderQualityOf(performanceFactor);

  const openDoors = useMemo(
    () => openDoorsOf(cabinetUnlocked, finalDoorOpen),
    [cabinetUnlocked, finalDoorOpen],
  );

  const finale = status === "finale" || status === "won";

  return (
    <Canvas
      frameloop={FROZEN_STATUSES.has(status) ? "demand" : "always"}
      shadows="percentage"
      dpr={[1, quality.maxDpr]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      resize={{ offsetSize: true }}
      camera={{
        fov: 72,
        near: 0.1,
        far: 70,
        position: [PLAYER_SPAWN[0], PLAYER.eyeHeight, PLAYER_SPAWN[2]],
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <color attach="background" args={["#0b0806"]} />
      <fog attach="fog" args={["#1a120c", 20, 48]} />

      {/*
       * Mesure la cadence réelle : sur une machine qui peine, la résolution
       * baisse par paliers puis l'anticrénelage saute. Seules les images
       * dessinées sont comptées, la scène gelée derrière un écran ne fausse
       * donc pas la mesure.
       */}
      <PerformanceMonitor
        factor={INITIAL_PERFORMANCE_FACTOR}
        step={0.25}
        flipflops={3}
        onChange={({ factor }) => setPerformanceFactor(factor)}
        onFallback={() => setPerformanceFactor(0)}
      />

      <Lights powered={powered} finale={finale} />
      <ShadowRefresh />

      <Suspense fallback={null}>
        <World />
        <GalleryDecor />
        {STATIONS_BY_ROOM.gallery.map((station) => (
          <StationProp key={station.id} station={station} />
        ))}
        {/*
         * Une pièce dont la porte est close ne se voit de nulle part : son
         * contenu sort du rendu et de la passe d'ombre, ce qui divise par deux
         * les appels de dessin dans la galerie.
         */}
        <group visible={openDoors.has("cabinet")}>
          <CabinetDecor />
          {STATIONS_BY_ROOM.cabinet.map((station) => (
            <StationProp key={station.id} station={station} />
          ))}
        </group>
        <group visible={openDoors.has("final")}>
          <HologramHallDecor />
          {STATIONS_BY_ROOM.hologram.map((station) => (
            <StationProp key={station.id} station={station} />
          ))}
        </group>
        <EntranceDoor />
        <CabinetDoor unlocked={cabinetUnlocked} />
        <FinalDoor open={finalDoorOpen} seals={seals} />
        <Effects multisampling={quality.multisampling} />
        {/*
         * Compile les shaders et envoie les textures dès le chargement, pièces
         * masquées comprises : l'ouverture d'une porte ne provoque aucun
         * à-coup.
         */}
        <Preload all />
      </Suspense>

      <Player openDoors={openDoors} />

      <PointerLockControls
        ref={controlsRef}
        selector="#pointer-lock-disabled"
        onLock={onLock}
        onUnlock={onUnlock}
      />
    </Canvas>
  );
}
