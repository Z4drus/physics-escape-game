"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";

import { LAB } from "@/features/game/components/scene/materials";
import { AirRailProp } from "@/features/game/components/scene/props/AirRailProp";
import { CalorimeterProp } from "@/features/game/components/scene/props/CalorimeterProp";
import { CircuitBenchProp } from "@/features/game/components/scene/props/CircuitBenchProp";
import { EnergyTrackProp } from "@/features/game/components/scene/props/EnergyTrackProp";
import { ForceTableProp } from "@/features/game/components/scene/props/ForceTableProp";
import { PressureBenchProp } from "@/features/game/components/scene/props/PressureBenchProp";
import { useGameStore } from "@/features/game/state/useGameStore";
import type { Station, StationKind } from "@/types/game";

/**
 * Poste de travail complet : socle, anneau de visée et modèle animé.
 * Le composant ne s'abonne qu'aux deux booléens qui le concernent afin de ne
 * pas re-rendre toute la scène à chaque changement de station visée.
 */
export function StationProp({ station }: { station: Station }) {
  const focused = useGameStore(
    (state) => state.focusedStationId === station.id,
  );
  const solved = useGameStore((state) =>
    state.solvedStationIds.includes(station.id),
  );

  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshStandardMaterial>(null);
  const pedestal = useRef<MeshStandardMaterial>(null);

  const [width, depth] = station.footprint;
  const accent = solved ? LAB.solved : station.reward.color;

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
      pedestal.current.emissiveIntensity = solved ? 0.9 : focused ? 0.55 : 0.14;
    }
  });

  return (
    <group position={station.position}>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial
          ref={pedestal}
          color={LAB.frame}
          emissive={accent}
          emissiveIntensity={0.14}
          roughness={0.65}
          metalness={0.25}
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

      <group position={[0, 0.12, 0]} rotation-y={station.rotationY}>
        <StationModel kind={station.kind} solved={solved} />
      </group>

      {solved ? <FloatingKey color={station.reward.color} /> : null}
    </group>
  );
}

function StationModel({
  kind,
  solved,
}: {
  kind: StationKind;
  solved: boolean;
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
      return <CircuitBenchProp solved={solved} />;
    case "calorimeter":
      return <CalorimeterProp solved={solved} />;
  }
}

/** Clé lumineuse qui flotte au-dessus d'une station résolue. */
function FloatingKey({ color }: { color: string }) {
  const key = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!key.current) return;
    key.current.position.y = 2.4 + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    key.current.rotation.y = clock.elapsedTime * 0.9;
  });

  return (
    <mesh ref={key} position={[0, 2.4, 0]}>
      <torusGeometry args={[0.1, 0.03, 12, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}
