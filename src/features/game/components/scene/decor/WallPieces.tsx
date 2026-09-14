"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, SRGBColorSpace, type MeshBasicMaterial } from "three";

import { useTextTexture } from "@/features/game/components/scene/decor/useTextTexture";
import { MUSEUM } from "@/features/game/components/scene/materials";

const BRASS = { color: MUSEUM.metal, roughness: 0.35, metalness: 0.8 } as const;

/** Plaque de laiton gravée, fixée au mur. */
export function Plaque({
  position,
  rotationY,
  lines,
  width = 0.7,
  height = 0.36,
}: {
  position: [number, number, number];
  rotationY: number;
  lines: readonly string[];
  width?: number;
  height?: number;
}) {
  const texture = useTextTexture({
    lines,
    width: 768,
    height: 384,
    fontSize: 44,
    color: "#2b1d12",
    weight: 600,
    lineHeight: 1.3,
  });

  return (
    <group position={position} rotation-y={rotationY}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.03]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[width - 0.03, height - 0.03]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

/** Tableau noir encadré, avec sa texture de formules. */
export function Chalkboard({
  position,
  rotationY,
  width = 1.6,
  height = 1.2,
}: {
  position: [number, number, number];
  rotationY: number;
  width?: number;
  height?: number;
}) {
  const map = useTexture("/images/decor/chalkboard.webp", (texture) => {
    texture.colorSpace = SRGBColorSpace;
  });
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.05]} />
        <meshStandardMaterial color={MUSEUM.panel} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} roughness={0.95} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.02, 0.08]}>
        <boxGeometry args={[width, 0.03, 0.08]} />
        <meshStandardMaterial color={MUSEUM.panel} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Message à l'encre invisible sur le mur du cabinet : il n'apparaît, en
 * violet fluorescent, que lorsque la lampe UV l'a révélé.
 */
export function UvMessage({
  position,
  rotationY,
  lines,
  revealed,
}: {
  position: [number, number, number];
  rotationY: number;
  lines: readonly string[];
  revealed: boolean;
}) {
  const material = useRef<MeshBasicMaterial>(null);
  const texture = useTextTexture({
    lines,
    width: 1024,
    height: 512,
    fontSize: 54,
    color: "#c7a7ff",
    weight: 500,
    lineHeight: 1.35,
  });

  useFrame(({ clock }, delta) => {
    if (!material.current) return;
    const flicker = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 9);
    material.current.opacity = MathUtils.lerp(
      material.current.opacity,
      revealed ? flicker : 0,
      1 - Math.exp(-3 * delta),
    );
  });

  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[2.2, 1.1]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Affiche encadrée sous verre. */
export function FramedPoster({
  position,
  rotationY,
  image,
  width = 0.9,
  height = 1.35,
}: {
  position: [number, number, number];
  rotationY: number;
  image: string;
  width?: number;
  height?: number;
}) {
  const map = useTexture(image, (texture) => {
    texture.colorSpace = SRGBColorSpace;
  });
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.04]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} roughness={0.6} />
      </mesh>
    </group>
  );
}
