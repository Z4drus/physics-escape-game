"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Matrix4, type InstancedMesh } from "three";

import { MUSEUM } from "@/features/game/components/scene/materials";

const BRASS = { color: MUSEUM.metal, roughness: 0.35, metalness: 0.8 } as const;

/* --- Bibliothèque --- */
/** Épaisseur des planches du caisson. */
const BOARD = 0.04;
const CASE_DEPTH = 0.4;
/** Hauteur de la première tablette, qui repose sur la plinthe. */
const SHELF_BASE = 0.1;
const SHELF_THICKNESS = 0.03;
const BOOK_DEPTH = 0.24;
const BOOK_Z = 0.06;
// Objets de travail réutilisés pour poser les instances de reliures.
const bookMatrix = new Matrix4();
const bookColor = new Color();

/** Lustre de laiton à bougies. `lit` pilote l'intensité des flammes. */
export function Chandelier({
  position,
  lit,
}: {
  position: [number, number, number];
  lit: boolean;
}) {
  const candles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return [Math.cos(angle) * 0.55, Math.sin(angle) * 0.55] as const;
      }),
    [],
  );

  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.2, 6]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.55, 0.03, 10, 40]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {candles.map(([x, z], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
            <meshStandardMaterial color="#f4e9d2" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial
              color={MUSEUM.accentLight}
              emissive={MUSEUM.lightWarm}
              emissiveIntensity={lit ? 1.3 : 0.2}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Bibliothèque murale remplie de reliures. `width` est la longueur totale. */
export function Bookshelf({
  position,
  rotationY = 0,
  width = 5.2,
  height = 2.6,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
}) {
  const shelves = 5;
  const books = useMemo(() => {
    const items: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
    }[] = [];
    const palette = [
      "#5a2a24",
      "#2f4a3a",
      "#3b2a1c",
      "#6b5a2a",
      "#26303f",
      "#7a3f2b",
      "#4a3b5c",
    ];
    // Bruit déterministe : la bibliothèque est la même à chaque rendu.
    const noise = (index: number) => {
      const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    let step = 0;
    for (let shelf = 0; shelf < shelves; shelf += 1) {
      let x = -width / 2 + 0.1;
      // Les reliures reposent sur le dessus de leur tablette.
      const y =
        SHELF_BASE + SHELF_THICKNESS / 2 + shelf * ((height - 0.2) / shelves);
      while (x < width / 2 - 0.15) {
        const w = 0.04 + noise(step) * 0.05;
        const h = 0.22 + noise(step + 1) * 0.14;
        const gap = noise(step + 2) < 0.08 ? 0.12 : 0;
        step += 3;
        items.push({
          x: x + w / 2,
          y: y + h / 2,
          w,
          h,
          color: palette[items.length % palette.length],
        });
        x += w + 0.006 + gap;
      }
    }
    return items;
  }, [width, height]);

  // Les reliures partagent une géométrie et un matériau : un seul appel de
  // dessin pour toutes, chacune avec sa matrice et sa teinte.
  const bookMesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = bookMesh.current;
    if (!mesh) return;
    books.forEach((book, index) => {
      bookMatrix
        .makeScale(book.w, book.h, BOOK_DEPTH)
        .setPosition(book.x, book.y, BOOK_Z);
      mesh.setMatrixAt(index, bookMatrix);
      mesh.setColorAt(index, bookColor.set(book.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [books]);

  const innerWidth = width - 2 * BOARD;
  const plinthHeight = SHELF_BASE - SHELF_THICKNESS / 2;

  return (
    <group position={position} rotation-y={rotationY}>
      {/* Caisson ouvert en façade : fond, joues, chapeau et plinthe */}
      <mesh
        position={[0, (height - BOARD) / 2, -CASE_DEPTH / 2 + BOARD / 2]}
        receiveShadow
      >
        <boxGeometry args={[innerWidth, height - BOARD, BOARD]} />
        <meshStandardMaterial color="#1b120c" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (width / 2 - BOARD / 2), height / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BOARD, height, CASE_DEPTH]} />
          <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, height - BOARD / 2, 0]} castShadow>
        <boxGeometry args={[innerWidth, BOARD, CASE_DEPTH]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, plinthHeight / 2, CASE_DEPTH / 2 - BOARD / 2]}>
        <boxGeometry args={[innerWidth, plinthHeight, BOARD]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.6} />
      </mesh>
      {Array.from({ length: shelves + 1 }, (_, index) => (
        <mesh
          key={index}
          position={[
            0,
            SHELF_BASE + index * ((height - 0.2) / shelves),
            BOARD / 2,
          ]}
        >
          <boxGeometry
            args={[innerWidth, SHELF_THICKNESS, CASE_DEPTH - BOARD]}
          />
          <meshStandardMaterial color={MUSEUM.panel} roughness={0.55} />
        </mesh>
      ))}
      <instancedMesh ref={bookMesh} args={[undefined, undefined, books.length]}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
    </group>
  );
}

/** Banquette capitonnée de la galerie. */
export function Bench({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.14, 0.55]} />
        <meshStandardMaterial color={MUSEUM.velvet} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[1.84, 0.05, 0.59]} />
        <meshStandardMaterial color={MUSEUM.frame} roughness={0.55} />
      </mesh>
      {[-0.8, 0.8].flatMap((x) =>
        [-0.2, 0.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.16, z]}>
            <cylinderGeometry args={[0.03, 0.04, 0.32, 10]} />
            <meshStandardMaterial color={MUSEUM.frame} roughness={0.55} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Colonne cannelée de la salle de l'hologramme. */
export function Column({
  position,
  height,
}: {
  position: [number, number, number];
  height: number;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.2, 0.7]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.6} />
      </mesh>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.28, height - 0.4, 20]} />
        <meshStandardMaterial color="#d9d1c2" roughness={0.7} />
      </mesh>
      <mesh position={[0, height - 0.1, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.7]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Poteau de laiton à corde, autour des pièces exposées. */
export function Stanchion({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 20]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.96, 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  );
}

/** Corde de velours tendue entre deux poteaux. */
export function Rope({
  from,
  to,
}: {
  from: [number, number, number];
  to: [number, number, number];
}) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, 0.92, (from[2] + to[2]) / 2]}
      rotation={[Math.PI / 2, 0, angle]}
    >
      <cylinderGeometry args={[0.018, 0.018, length - 0.1, 8]} />
      <meshStandardMaterial color="#8f3b2c" roughness={0.9} />
    </mesh>
  );
}
