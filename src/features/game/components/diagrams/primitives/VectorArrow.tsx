"use client";

import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";

import type { Vec3 } from "@/types/game";

const UP = new Vector3(0, 1, 0);

/**
 * Flèche vectorielle : une tige cylindrique surmontée d'une tête conique.
 * La longueur représente l'intensité de la grandeur, ce qui permet de
 * comparer deux forces d'un coup d'œil sur un même schéma.
 */
export function VectorArrow({
  origin,
  direction,
  length,
  color,
  thickness = 0.035,
  opacity = 1,
}: {
  origin: Vec3;
  /** Direction de la flèche ; elle est normalisée par le composant. */
  direction: Vec3;
  length: number;
  color: string;
  thickness?: number;
  opacity?: number;
}) {
  const quaternion = useMemo(() => {
    const target = new Vector3(...direction).normalize();
    return new Quaternion().setFromUnitVectors(UP, target);
  }, [direction]);

  const headLength = Math.min(length * 0.32, thickness * 7);
  const shaftLength = Math.max(length - headLength, 0.001);

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh position={[0, shaftLength / 2, 0]}>
        <cylinderGeometry args={[thickness, thickness, shaftLength, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          transparent={opacity < 1}
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, shaftLength + headLength / 2, 0]}>
        <coneGeometry args={[thickness * 2.6, headLength, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          transparent={opacity < 1}
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
