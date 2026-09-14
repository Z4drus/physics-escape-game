"use client";

import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";

import { MUSEUM } from "@/features/game/components/scene/materials";
import { useTextTexture } from "@/features/game/components/scene/decor/useTextTexture";

/**
 * Tableau encadré, plaqué contre un mur, avec son cartel de laiton et sa
 * lampe de tableau. `position` est le centre de la toile, `rotationY`
 * oriente la face peinte vers la pièce.
 */
export function Painting({
  image,
  position,
  rotationY,
  width = 1.1,
  height = 1.45,
  caption,
}: {
  image: string;
  position: [number, number, number];
  rotationY: number;
  width?: number;
  height?: number;
  caption?: string;
}) {
  const map = useTexture(image, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
  });
  const plaque = useTextTexture({
    lines: caption ? [caption] : [],
    width: 512,
    height: 96,
    fontSize: 40,
    color: "#2b1d12",
    background: "transparent",
  });

  const frameWidth = width + 0.18;
  const frameHeight = height + 0.18;

  return (
    <group position={position} rotation-y={rotationY}>
      {/* Cadre doré, mouluré en deux épaisseurs */}
      <mesh position={[0, 0, 0.03]} castShadow>
        <boxGeometry args={[frameWidth, frameHeight, 0.06]} />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.38}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <boxGeometry args={[frameWidth - 0.08, frameHeight - 0.08, 0.02]} />
        <meshStandardMaterial color="#8c6b34" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.076]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>

      {/* Lampe de tableau */}
      <group position={[0, frameHeight / 2 + 0.12, 0.16]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.03, 0.03, width * 0.7, 12]} />
          <meshStandardMaterial
            color={MUSEUM.metalDark}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, width * 0.62, 10]} />
          <meshStandardMaterial
            color={MUSEUM.accentLight}
            emissive={MUSEUM.lightWarm}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Cartel */}
      {caption ? (
        <group position={[0, -frameHeight / 2 - 0.14, 0.02]}>
          <mesh>
            <boxGeometry args={[0.56, 0.11, 0.02]} />
            <meshStandardMaterial
              color={MUSEUM.metal}
              roughness={0.35}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[0, 0, 0.011]}>
            <planeGeometry args={[0.54, 0.1]} />
            <meshBasicMaterial map={plaque} transparent />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
