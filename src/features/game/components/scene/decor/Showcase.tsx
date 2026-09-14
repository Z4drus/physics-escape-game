"use client";

import { GltfProp } from "@/features/game/components/scene/decor/GltfProp";
import { useTextTexture } from "@/features/game/components/scene/decor/useTextTexture";
import { MUSEUM } from "@/features/game/components/scene/materials";

/**
 * Piédestal de musée, avec ou sans vitrine, portant un modèle 3D et son
 * cartel. `position` est le centre du socle au sol.
 */
export function Showcase({
  position,
  rotationY = 0,
  model,
  modelHeight,
  pedestalHeight = 1.0,
  pedestalSize = 0.62,
  glass = false,
  glassHeight = 0.9,
  caption,
}: {
  position: [number, number, number];
  rotationY?: number;
  model: string;
  modelHeight: number;
  pedestalHeight?: number;
  pedestalSize?: number;
  glass?: boolean;
  glassHeight?: number;
  caption?: string;
}) {
  const plaque = useTextTexture({
    lines: caption ? [caption] : [],
    width: 512,
    height: 96,
    fontSize: 38,
    color: "#2b1d12",
  });
  const half = pedestalSize / 2;

  return (
    <group position={position} rotation-y={rotationY}>
      {/* Socle en noyer, plinthe et tablette de marbre */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[pedestalSize + 0.1, 0.08, pedestalSize + 0.1]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, pedestalHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[pedestalSize, pedestalHeight, pedestalSize]} />
        <meshStandardMaterial
          color={MUSEUM.panel}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, pedestalHeight + 0.02, 0]} castShadow>
        <boxGeometry args={[pedestalSize + 0.06, 0.04, pedestalSize + 0.06]} />
        <meshStandardMaterial color="#d9d2c4" roughness={0.25} />
      </mesh>

      <GltfProp
        url={model}
        height={modelHeight}
        position={[0, pedestalHeight + 0.04, 0]}
      />

      {glass ? (
        <group position={[0, pedestalHeight + 0.04 + glassHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[pedestalSize, glassHeight, pedestalSize]} />
            <meshPhysicalMaterial
              color={MUSEUM.glass}
              roughness={0.05}
              metalness={0}
              transparent
              opacity={0.16}
              depthWrite={false}
            />
          </mesh>
          {/* Arêtes de laiton */}
          {[
            [-half, -half],
            [half, -half],
            [-half, half],
            [half, half],
          ].map(([x, z]) => (
            <mesh key={`${x}:${z}`} position={[x, 0, z]}>
              <boxGeometry args={[0.025, glassHeight, 0.025]} />
              <meshStandardMaterial
                color={MUSEUM.metal}
                roughness={0.35}
                metalness={0.8}
              />
            </mesh>
          ))}
          {[-1, 1].map((sign) => (
            <group key={sign}>
              <mesh position={[0, sign * (glassHeight / 2), -half]}>
                <boxGeometry args={[pedestalSize, 0.025, 0.025]} />
                <meshStandardMaterial
                  color={MUSEUM.metal}
                  roughness={0.35}
                  metalness={0.8}
                />
              </mesh>
              <mesh position={[0, sign * (glassHeight / 2), half]}>
                <boxGeometry args={[pedestalSize, 0.025, 0.025]} />
                <meshStandardMaterial
                  color={MUSEUM.metal}
                  roughness={0.35}
                  metalness={0.8}
                />
              </mesh>
              <mesh position={[-half, sign * (glassHeight / 2), 0]}>
                <boxGeometry args={[0.025, 0.025, pedestalSize]} />
                <meshStandardMaterial
                  color={MUSEUM.metal}
                  roughness={0.35}
                  metalness={0.8}
                />
              </mesh>
              <mesh position={[half, sign * (glassHeight / 2), 0]}>
                <boxGeometry args={[0.025, 0.025, pedestalSize]} />
                <meshStandardMaterial
                  color={MUSEUM.metal}
                  roughness={0.35}
                  metalness={0.8}
                />
              </mesh>
            </group>
          ))}
        </group>
      ) : null}

      {caption ? (
        <group position={[0, pedestalHeight - 0.16, half + 0.012]}>
          <mesh>
            <boxGeometry args={[0.44, 0.09, 0.016]} />
            <meshStandardMaterial
              color={MUSEUM.metal}
              roughness={0.35}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[0, 0, 0.009]}>
            <planeGeometry args={[0.42, 0.08]} />
            <meshBasicMaterial map={plaque} transparent />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
