"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3, type Group, type Mesh } from "three";

const COILS = 7;
const REST_LENGTH = 0.9;

/** Système masse-ressort : la masse oscille verticalement. */
export function SpringProp({ solved }: { solved: boolean }) {
  const spring = useRef<Mesh>(null);
  const mass = useRef<Group>(null);

  /** Hélice servant de profil au ressort, étirée ensuite via `scale.y`. */
  const curve = useMemo(() => {
    const points: Vector3[] = [];
    const steps = COILS * 16;
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const angle = t * COILS * Math.PI * 2;
      points.push(
        new Vector3(
          Math.cos(angle) * 0.1,
          -t * REST_LENGTH,
          Math.sin(angle) * 0.1,
        ),
      );
    }
    return new CatmullRomCurve3(points);
  }, []);

  useFrame(({ clock }) => {
    const amplitude = solved ? 0.05 : 0.14;
    const offset = Math.sin(clock.elapsedTime * 2.6) * amplitude;
    if (spring.current) {
      spring.current.scale.y = 1 + offset / REST_LENGTH;
    }
    if (mass.current) {
      mass.current.position.y = 2 - REST_LENGTH - offset - 0.17;
    }
  });

  return (
    <group>
      <mesh position={[0, 1.1, -0.35]} castShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial
          color="#6d7896"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 2.05, -0.18]} castShadow>
        <boxGeometry args={[0.09, 0.09, 0.44]} />
        <meshStandardMaterial
          color="#6d7896"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>

      <mesh ref={spring} position={[0, 2, 0]} castShadow>
        <tubeGeometry args={[curve, 160, 0.022, 8, false]} />
        <meshStandardMaterial
          color="#cbd4e6"
          metalness={0.8}
          roughness={0.28}
        />
      </mesh>

      <group ref={mass} position={[0, 2 - REST_LENGTH - 0.17, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.34, 0.34]} />
          <meshStandardMaterial
            color={solved ? "#4ee1c1" : "#8b95ad"}
            metalness={0.5}
            roughness={0.4}
            emissive={solved ? "#4ee1c1" : "#000000"}
            emissiveIntensity={solved ? 0.35 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}
