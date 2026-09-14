"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  MathUtils,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";

import { useTextTexture } from "@/features/game/components/scene/decor/useTextTexture";
import { MUSEUM } from "@/features/game/components/scene/materials";
import { AirRailProp } from "@/features/game/components/scene/props/AirRailProp";
import { CalorimeterProp } from "@/features/game/components/scene/props/CalorimeterProp";
import { CircuitBenchProp } from "@/features/game/components/scene/props/CircuitBenchProp";
import { EnergyTrackProp } from "@/features/game/components/scene/props/EnergyTrackProp";
import { ForceTableProp } from "@/features/game/components/scene/props/ForceTableProp";
import { PressureBenchProp } from "@/features/game/components/scene/props/PressureBenchProp";
import { ROOMS } from "@/features/game/data/world";
import { useGameStore } from "@/features/game/state/useGameStore";
import type { Station, StationKind } from "@/types/game";

/**
 * Poste complet : socle, cartel, anneau de visée, modèle animé, et selon le
 * poste une vitrine verrouillée ou un banc hors tension. Le composant ne
 * s'abonne qu'aux booléens qui le concernent afin de ne pas re-rendre toute
 * la scène à chaque changement d'objet visé.
 */
export function StationProp({ station }: { station: Station }) {
  const focused = useGameStore((state) => state.focusedId === station.id);
  const solved = useGameStore((state) =>
    state.solvedStationIds.includes(station.id),
  );
  const powered = useGameStore(
    (state) => station.gate !== "power" || state.powerRestored,
  );
  const caseOpen = useGameStore(
    (state) => station.gate !== "energy-case" || state.energyCaseUnlocked,
  );

  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshStandardMaterial>(null);
  const pedestal = useRef<MeshStandardMaterial>(null);

  const [width, depth] = station.footprint;
  const accent = solved ? MUSEUM.solved : station.reward.color;

  // Le cartel regarde le centre de la pièce.
  const room = ROOMS[station.roomId];
  const toCenterX = (room.minX + room.maxX) / 2 - station.position[0];
  const toCenterZ = (room.minZ + room.maxZ) / 2 - station.position[2];
  const facing = Math.atan2(toCenterX, toCenterZ);
  const cartel = useTextTexture({
    lines: [station.label],
    width: 768,
    height: 128,
    fontSize: 56,
    color: "#2b1d12",
  });

  useFrame(({ clock }) => {
    const pulse = (Math.sin(clock.elapsedTime * 3) + 1) / 2;

    if (ring.current) {
      ring.current.visible = focused && !solved;
      ring.current.scale.setScalar(1 + pulse * 0.04);
    }
    if (ringMaterial.current) {
      ringMaterial.current.emissiveIntensity = 1.2 + pulse * 1.4;
    }
    if (pedestal.current) {
      pedestal.current.emissiveIntensity = solved
        ? 0.32
        : focused
          ? 0.28
          : 0.06;
    }
  });

  return (
    <group position={station.position}>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial
          ref={pedestal}
          color={MUSEUM.frame}
          emissive={accent}
          emissiveIntensity={0.06}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <boxGeometry args={[width + 0.06, 0.012, depth + 0.06]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>

      <mesh
        ref={ring}
        position={[0, 0.14, 0]}
        rotation-x={-Math.PI / 2}
        visible={false}
      >
        <ringGeometry
          args={[
            Math.max(width, depth) * 0.6,
            Math.max(width, depth) * 0.68,
            64,
          ]}
        />
        <meshStandardMaterial
          ref={ringMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.6}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Cartel sur pupitre, côté visiteur */}
      <group
        position={[
          Math.sin(facing) * (Math.max(width, depth) / 2 + 0.25),
          0,
          Math.cos(facing) * (Math.max(width, depth) / 2 + 0.25),
        ]}
        rotation-y={facing}
      >
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.9, 10]} />
          <meshStandardMaterial
            color={MUSEUM.metal}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
        <group position={[0, 0.95, 0.02]} rotation-x={-0.5}>
          <mesh>
            <boxGeometry args={[0.5, 0.12, 0.02]} />
            <meshStandardMaterial
              color={MUSEUM.metal}
              roughness={0.35}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[0, 0, 0.011]}>
            <planeGeometry args={[0.48, 0.1]} />
            <meshBasicMaterial map={cartel} transparent />
          </mesh>
        </group>
      </group>

      <group position={[0, 0.12, 0]} rotation-y={station.rotationY}>
        <StationModel kind={station.kind} solved={solved} powered={powered} />
      </group>

      {station.gate === "energy-case" ? (
        <DisplayCase width={width} depth={depth} open={caseOpen} />
      ) : null}

      {solved ? <FloatingSeal color={station.reward.color} /> : null}
    </group>
  );
}

function StationModel({
  kind,
  solved,
  powered,
}: {
  kind: StationKind;
  solved: boolean;
  powered: boolean;
}) {
  switch (kind) {
    case "force-table":
      return <ForceTableProp solved={solved} />;
    case "air-rail":
      return <AirRailProp solved={solved} />;
    case "pressure-bench":
      return <PressureBenchProp solved={solved} />;
    case "energy-track":
      return <EnergyTrackProp solved={solved} />;
    case "circuit-bench":
      return <CircuitBenchProp solved={solved} powered={powered} />;
    case "calorimeter":
      return <CalorimeterProp solved={solved} />;
  }
}

/** Vitrine de verre et de laiton qui se soulève quand la clé l'ouvre. */
function DisplayCase({
  width,
  depth,
  open,
}: {
  width: number;
  depth: number;
  open: boolean;
}) {
  const group = useRef<Group>(null);
  const height = 1.9;

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.y = MathUtils.lerp(
      group.current.position.y,
      open ? height + 0.6 : 0.13,
      1 - Math.exp(-2.2 * delta),
    );
  });

  const w = width + 0.1;
  const d = depth + 0.1;
  return (
    <group ref={group} position={[0, 0.13, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[w, height, d]} />
        <meshPhysicalMaterial
          color={MUSEUM.glass}
          roughness={0.05}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      {[
        [-w / 2, -d / 2],
        [w / 2, -d / 2],
        [-w / 2, d / 2],
        [w / 2, d / 2],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, height / 2, z]}>
          <boxGeometry args={[0.03, height, 0.03]} />
          <meshStandardMaterial
            color={MUSEUM.metal}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
      ))}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[w + 0.02, 0.03, d + 0.02]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      {/* Serrure en façade */}
      <mesh position={[0, 1.0, d / 2 + 0.02]}>
        <boxGeometry args={[0.08, 0.1, 0.03]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

/** Sceau lumineux qui flotte au-dessus d'un poste résolu. */
function FloatingSeal({ color }: { color: string }) {
  const seal = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!seal.current) return;
    seal.current.position.y = 2.5 + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    seal.current.rotation.y = clock.elapsedTime * 0.9;
  });

  return (
    <group ref={seal} position={[0, 2.5, 0]}>
      <mesh>
        <torusGeometry args={[0.12, 0.025, 12, 32]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
