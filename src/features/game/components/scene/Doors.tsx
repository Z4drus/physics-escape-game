"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, type Group } from "three";

import { useTextTexture } from "@/features/game/components/scene/decor/useTextTexture";
import { MUSEUM } from "@/features/game/components/scene/materials";
import { STATIONS } from "@/features/game/data/stations";
import { DOOR_SIZES, ROOMS, WALL_THICKNESS } from "@/features/game/data/world";
import type { Seal } from "@/types/game";

const WOOD = {
  color: MUSEUM.wainscot,
  roughness: 0.5,
  metalness: 0.05,
} as const;
const BRASS = { color: MUSEUM.metal, roughness: 0.35, metalness: 0.8 } as const;

/**
 * Recouvrement du chambranle sur la tranche du mur, et du linteau du cadre sur
 * le haut des vantaux : deux faces posées exactement dans le même plan
 * scintillent (z-fighting), un décalage de deux centimètres suffit à ce
 * qu'une seule soit visible.
 */
const OVERLAP = 0.02;
/** Jeu laissé sous le linteau du cadre, que les vantaux n'atteignent pas. */
const LEAF_GAP = 0.03;

/**
 * Vantail de porte à panneaux sur ses deux faces, l'axe des gonds sur le bord
 * `x = 0` du groupe parent : le vantail s'étend vers +x sur `width`.
 */
function Leaf({ width, height }: { width: number; height: number }) {
  const leafHeight = height - LEAF_GAP;
  return (
    <group position={[width / 2, leafHeight / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, leafHeight, 0.08]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      {[0.045, -0.045].flatMap((z) =>
        [0.28, -0.22].map((y) => (
          <mesh key={`${z}:${y}`} position={[0, y * leafHeight, z]}>
            <boxGeometry args={[width * 0.66, leafHeight * 0.36, 0.02]} />
            <meshStandardMaterial color={MUSEUM.panel} roughness={0.5} />
          </mesh>
        )),
      )}
      {[0.07, -0.07].map((z) => (
        <mesh key={z} position={[width * 0.36, 0, z]}>
          <sphereGeometry args={[0.035, 12, 10]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </group>
  );
}

/** Épaisseur du seuil posé dans l'ouverture, au ras des parquets. */
const THRESHOLD_HEIGHT = 0.03;

/**
 * Chambranle de bois autour d'une ouverture. Les jambages mordent de
 * `OVERLAP` dans la baie pour couvrir la tranche du mur, et le linteau
 * descend d'autant pour couvrir le dessous du linteau maçonné. Le seuil
 * comble la bande de sol absente dans l'épaisseur du mur, que les sols des
 * pièces ne recouvrent pas, et déborde de chaque côté pour ne laisser aucun
 * jour.
 */
function DoorFrame({ width, height }: { width: number; height: number }) {
  const jambWidth = 0.14;
  const lintelHeight = 0.16;
  const thresholdWidth = width + 2 * (jambWidth - OVERLAP);
  const thresholdDepth = WALL_THICKNESS + 0.16;
  return (
    <group>
      <mesh position={[0, THRESHOLD_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry
          args={[thresholdWidth, THRESHOLD_HEIGHT, thresholdDepth]}
        />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      <mesh position={[0, THRESHOLD_HEIGHT + 0.003, 0]}>
        <boxGeometry args={[thresholdWidth - 0.04, 0.006, 0.05]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * (width / 2 - OVERLAP + jambWidth / 2),
            height / 2,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[jambWidth, height, WALL_THICKNESS + 0.08]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
      ))}
      <mesh position={[0, height - OVERLAP + lintelHeight / 2, 0]} castShadow>
        <boxGeometry
          args={[
            width + 2 * (jambWidth - OVERLAP),
            lintelHeight,
            WALL_THICKNESS + 0.1,
          ]}
        />
        <meshStandardMaterial {...WOOD} />
      </mesh>
    </group>
  );
}

/** Enseigne gravée au-dessus d'une porte. */
function Sign({
  text,
  y,
  width = 1.6,
}: {
  text: string;
  y: number;
  width?: number;
}) {
  const texture = useTextTexture({
    lines: [text],
    width: 1024,
    height: 160,
    fontSize: 72,
    color: "#2b1d12",
  });
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, WALL_THICKNESS / 2 + 0.03]}>
        <boxGeometry args={[width, 0.26, 0.04]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0, WALL_THICKNESS / 2 + 0.052]}>
        <planeGeometry args={[width - 0.04, 0.22]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

/** Portes d'entrée de la galerie : double battant, toujours fermé. */
export function EntranceDoor() {
  const { width, height } = DOOR_SIZES.entrance;
  const z = ROOMS.gallery.maxZ + WALL_THICKNESS / 2;
  return (
    <group position={[0, 0, z]} rotation-y={Math.PI}>
      <DoorFrame width={width} height={height} />
      <group position={[-width / 2, 0, 0]}>
        <Leaf width={width / 2} height={height} />
      </group>
      <group position={[width / 2, 0, 0]} rotation-y={Math.PI}>
        <Leaf width={width / 2} height={height} />
      </group>
      <Sign text="Musée de Physique" y={height + 0.38} width={2.2} />
    </group>
  );
}

/**
 * Porte du cabinet : un vantail sur le mur est de la galerie, tenu par un
 * cadenas côté galerie. Il s'ouvre vers le cabinet une fois le code trouvé.
 */
export function CabinetDoor({ unlocked }: { unlocked: boolean }) {
  const { width, height } = DOOR_SIZES.cabinet;
  const x = ROOMS.gallery.maxX + WALL_THICKNESS / 2;
  const centerZ = 2;
  const leaf = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!leaf.current) return;
    leaf.current.rotation.y = MathUtils.lerp(
      leaf.current.rotation.y,
      unlocked ? 1.55 : 0,
      1 - Math.exp(-3 * delta),
    );
  });

  return (
    <group position={[x, 0, centerZ]} rotation-y={-Math.PI / 2}>
      <DoorFrame width={width} height={height} />
      {/* Gonds au bord sud : le vantail s'étend vers le nord et pivote vers +x monde */}
      <group ref={leaf} position={[-width / 2, 0, 0]}>
        <Leaf width={width} height={height} />
        {/* Cadenas et moraillon, face galerie */}
        {!unlocked ? (
          <group position={[width * 0.86, height * 0.52, 0.07]}>
            <mesh>
              <boxGeometry args={[0.16, 0.05, 0.02]} />
              <meshStandardMaterial
                color={MUSEUM.metalDark}
                roughness={0.4}
                metalness={0.8}
              />
            </mesh>
            <mesh position={[0, -0.12, 0.02]}>
              <boxGeometry args={[0.11, 0.13, 0.05]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
            <mesh position={[0, -0.03, 0.02]}>
              <torusGeometry args={[0.035, 0.008, 8, 16, Math.PI]} />
              <meshStandardMaterial
                color={MUSEUM.metalDark}
                roughness={0.4}
                metalness={0.9}
              />
            </mesh>
            {[0, 1, 2, 3].map((index) => (
              <mesh
                key={index}
                position={[-0.036 + index * 0.024, -0.13, 0.05]}
                rotation-z={Math.PI / 2}
              >
                <cylinderGeometry args={[0.009, 0.009, 0.018, 10]} />
                <meshStandardMaterial color="#1a1512" roughness={0.5} />
              </mesh>
            ))}
          </group>
        ) : null}
      </group>
      <Sign text="Cabinet du conservateur" y={height + 0.38} width={1.7} />
    </group>
  );
}

/** Ouverture des vantaux de la porte finale, en radians depuis leur repos. */
const FINAL_SWING = 1.5;

/**
 * Porte de la salle de l'hologramme : double battant orné de six sceaux qui
 * s'allument un à un. Les vantaux s'ouvrent vers la salle quand tous les
 * sceaux sont réunis.
 *
 * Le vantail droit est monté retourné (rotation π au repos) : sa cible est
 * exprimée par rapport à ce repos, sinon il pivoterait d'un demi-tour à la
 * première image et resterait béant.
 */
export function FinalDoor({
  open,
  seals,
}: {
  open: boolean;
  seals: readonly Seal[];
}) {
  const { width, height } = DOOR_SIZES.final;
  const z = ROOMS.gallery.minZ - WALL_THICKNESS / 2;
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const collected = new Set(seals.map((seal) => seal.id));

  useFrame((_, delta) => {
    const smoothing = 1 - Math.exp(-2.2 * delta);
    if (left.current) {
      left.current.rotation.y = MathUtils.lerp(
        left.current.rotation.y,
        open ? FINAL_SWING : 0,
        smoothing,
      );
    }
    if (right.current) {
      right.current.rotation.y = MathUtils.lerp(
        right.current.rotation.y,
        Math.PI + (open ? -FINAL_SWING : 0),
        smoothing,
      );
    }
  });

  return (
    <group position={[0, 0, z]}>
      <DoorFrame width={width} height={height} />
      <group ref={left} position={[-width / 2, 0, 0]}>
        <Leaf width={width / 2} height={height} />
        <SealColumn
          x={width / 4}
          seals={STATIONS.slice(0, 3).map((s) => s.reward)}
          collected={collected}
        />
      </group>
      <group ref={right} position={[width / 2, 0, 0]} rotation-y={Math.PI}>
        <Leaf width={width / 2} height={height} />
        <SealColumn
          x={width / 4}
          seals={STATIONS.slice(3).map((s) => s.reward)}
          collected={collected}
          back
        />
      </group>
      <Sign text="Salle de l'hologramme" y={height + 0.38} width={1.9} />
    </group>
  );
}

/** Trois emplacements de sceaux sur un vantail, alignés verticalement. */
function SealColumn({
  x,
  seals,
  collected,
  back = false,
}: {
  x: number;
  seals: readonly Seal[];
  collected: ReadonlySet<string>;
  /** Vantail retourné : les sceaux se posent sur sa face arrière locale. */
  back?: boolean;
}) {
  const z = back ? -0.06 : 0.06;
  return (
    <group position={[x, 1.85, z]} rotation-y={back ? Math.PI : 0}>
      {seals.map((seal, index) => {
        const lit = collected.has(seal.id);
        return (
          <group key={seal.id} position={[0, 0.34 - index * 0.34, 0]}>
            <mesh rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.1, 0.014, 10, 32]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.085, 0.085, 0.02, 32]} />
              <meshStandardMaterial
                color={lit ? seal.color : "#1a1512"}
                emissive={lit ? seal.color : "#000000"}
                emissiveIntensity={lit ? 1.8 : 0}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
