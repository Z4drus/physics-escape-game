"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshStandardMaterial } from "three";

import { CircuitProp } from "@/features/game/components/scene/props/CircuitProp";
import { InclineProp } from "@/features/game/components/scene/props/InclineProp";
import { LeverProp } from "@/features/game/components/scene/props/LeverProp";
import { PendulumProp } from "@/features/game/components/scene/props/PendulumProp";
import { SpringProp } from "@/features/game/components/scene/props/SpringProp";
import { PUZZLES_BY_ID } from "@/features/game/data/puzzles";
import { useGameStore } from "@/features/game/state/useGameStore";
import type { InteractiveObject } from "@/types/game";

/**
 * Dispositif interactif complet : socle, anneau de visée et modèle animé.
 * Le composant ne s'abonne qu'aux deux booléens qui le concernent afin de
 * ne pas re-rendre toute la scène à chaque changement d'objet visé.
 */
export function PuzzleStation({ object }: { object: InteractiveObject }) {
  const focused = useGameStore((state) => state.focusedObjectId === object.id);
  const solved = useGameStore((state) =>
    state.solvedPuzzleIds.includes(object.puzzleId),
  );

  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshStandardMaterial>(null);
  const pedestal = useRef<MeshStandardMaterial>(null);

  const keyColor =
    PUZZLES_BY_ID.get(object.puzzleId)?.reward.color ?? "#4ee1c1";
  const [width, depth] = object.footprint;

  useFrame(({ clock }) => {
    const pulse = (Math.sin(clock.elapsedTime * 3) + 1) / 2;

    if (ring.current) {
      ring.current.visible = focused && !solved;
      ring.current.scale.setScalar(1 + pulse * 0.05);
    }
    if (ringMaterial.current) {
      ringMaterial.current.emissiveIntensity = 1.2 + pulse * 1.4;
    }
    if (pedestal.current) {
      pedestal.current.emissiveIntensity = solved ? 0.9 : focused ? 0.55 : 0.16;
    }
  });

  return (
    <group position={object.position}>
      <mesh position={[0, 0.07, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.14, depth]} />
        <meshStandardMaterial
          ref={pedestal}
          color="#212a3d"
          emissive={solved ? "#4ee1c1" : keyColor}
          emissiveIntensity={0.16}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      <mesh
        ref={ring}
        position={[0, 0.16, 0]}
        rotation-x={-Math.PI / 2}
        visible={false}
      >
        <ringGeometry
          args={[
            Math.max(width, depth) * 0.62,
            Math.max(width, depth) * 0.72,
            48,
          ]}
        />
        <meshStandardMaterial
          ref={ringMaterial}
          color={keyColor}
          emissive={keyColor}
          emissiveIntensity={1.6}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      <group position={[0, 0.14, 0]} rotation-y={object.rotationY}>
        <StationModel kind={object.kind} solved={solved} />
      </group>

      {solved ? <FloatingKey color={keyColor} /> : null}
    </group>
  );
}

function StationModel({
  kind,
  solved,
}: {
  kind: InteractiveObject["kind"];
  solved: boolean;
}) {
  switch (kind) {
    case "pendulum":
      return <PendulumProp solved={solved} />;
    case "incline":
      return <InclineProp solved={solved} />;
    case "circuit":
      return <CircuitProp solved={solved} />;
    case "spring":
      return <SpringProp solved={solved} />;
    case "lever":
      return <LeverProp solved={solved} />;
  }
}

/** Clé lumineuse qui flotte au-dessus d'un dispositif résolu. */
function FloatingKey({ color }: { color: string }) {
  const key = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!key.current) return;
    key.current.position.y = 2.5 + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    key.current.rotation.y = clock.elapsedTime * 0.9;
  });

  return (
    <mesh ref={key} position={[0, 2.5, 0]}>
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
