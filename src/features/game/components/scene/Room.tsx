"use client";

import { useTexture } from "@react-three/drei";
import {
  MirroredRepeatWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

import {
  CORRIDOR_DEPTH,
  CRATES,
  DOOR,
  ROOM,
  ROOM_HALF_DEPTH,
  ROOM_HALF_WIDTH,
} from "@/features/game/data/room";
import { LAB } from "@/features/game/components/scene/materials";

/**
 * Coque de la salle : sol, plafond, murs et couloir de sortie.
 * Le mur nord est découpé en deux tronçons pour laisser l'embrasure libre.
 */
export function Room() {
  const [floorMap, wallMap] = useTexture(
    ["/textures/floor-tiles.webp", "/textures/wall-panels.webp"],
    ([floor, wall]) => {
      // Le carrelage se répète à l'identique ; les panneaux muraux sont mis en
      // miroir pour que le raccord reste invisible malgré leur éclairage
      // légèrement centré.
      floor.colorSpace = SRGBColorSpace;
      floor.wrapS = RepeatWrapping;
      floor.wrapT = RepeatWrapping;
      floor.repeat.set(7, 7);
      floor.anisotropy = 8;

      wall.colorSpace = SRGBColorSpace;
      wall.wrapS = MirroredRepeatWrapping;
      wall.wrapT = MirroredRepeatWrapping;
      wall.repeat.set(4, 1);
      wall.anisotropy = 4;
    },
  );

  const sideWallWidth = (ROOM.width - DOOR.width) / 2;
  const sideWallOffset = DOOR.width / 2 + sideWallWidth / 2;
  const lintelHeight = ROOM.height - DOOR.height;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial
          map={floorMap}
          roughness={0.78}
          metalness={0.08}
        />
      </mesh>

      <mesh position={[0, ROOM.height, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={LAB.ceiling} roughness={0.95} />
      </mesh>

      {/* Mur sud */}
      <Wall
        position={[
          0,
          ROOM.height / 2,
          ROOM_HALF_DEPTH + ROOM.wallThickness / 2,
        ]}
        size={[
          ROOM.width + ROOM.wallThickness * 2,
          ROOM.height,
          ROOM.wallThickness,
        ]}
        map={wallMap}
      />
      {/* Murs est et ouest */}
      <Wall
        position={[
          ROOM_HALF_WIDTH + ROOM.wallThickness / 2,
          ROOM.height / 2,
          0,
        ]}
        size={[
          ROOM.wallThickness,
          ROOM.height,
          ROOM.depth + ROOM.wallThickness * 2,
        ]}
        map={wallMap}
      />
      <Wall
        position={[
          -ROOM_HALF_WIDTH - ROOM.wallThickness / 2,
          ROOM.height / 2,
          0,
        ]}
        size={[
          ROOM.wallThickness,
          ROOM.height,
          ROOM.depth + ROOM.wallThickness * 2,
        ]}
        map={wallMap}
      />

      {/* Mur nord : deux tronçons encadrant la porte, plus le linteau */}
      <Wall
        position={[
          DOOR.centerX - sideWallOffset,
          ROOM.height / 2,
          -ROOM_HALF_DEPTH - ROOM.wallThickness / 2,
        ]}
        size={[sideWallWidth, ROOM.height, ROOM.wallThickness]}
        map={wallMap}
      />
      <Wall
        position={[
          DOOR.centerX + sideWallOffset,
          ROOM.height / 2,
          -ROOM_HALF_DEPTH - ROOM.wallThickness / 2,
        ]}
        size={[sideWallWidth, ROOM.height, ROOM.wallThickness]}
        map={wallMap}
      />
      <Wall
        position={[
          DOOR.centerX,
          DOOR.height + lintelHeight / 2,
          -ROOM_HALF_DEPTH - ROOM.wallThickness / 2,
        ]}
        size={[DOOR.width, lintelHeight, ROOM.wallThickness]}
        map={wallMap}
      />

      <Baseboards />
      <Corridor />
    </group>
  );
}

function Wall({
  position,
  size,
  map,
}: {
  position: [number, number, number];
  size: [number, number, number];
  map: Texture;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        map={map}
        color={LAB.wall}
        roughness={0.88}
        metalness={0.06}
      />
    </mesh>
  );
}

/** Bandeau lumineux courant le long des murs, à hauteur de plinthe. */
function Baseboards() {
  const strips: {
    position: [number, number, number];
    size: [number, number, number];
  }[] = [
    {
      position: [0, 0.09, ROOM_HALF_DEPTH - 0.02],
      size: [ROOM.width, 0.18, 0.06],
    },
    {
      position: [ROOM_HALF_WIDTH - 0.02, 0.09, 0],
      size: [0.06, 0.18, ROOM.depth],
    },
    {
      position: [-ROOM_HALF_WIDTH + 0.02, 0.09, 0],
      size: [0.06, 0.18, ROOM.depth],
    },
  ];

  return (
    <>
      {strips.map((strip, index) => (
        <mesh key={index} position={strip.position}>
          <boxGeometry args={strip.size} />
          <meshStandardMaterial
            color={LAB.panel}
            emissive={LAB.accent}
            emissiveIntensity={0.7}
          />
        </mesh>
      ))}
      {CRATES.map((crate, index) => (
        <mesh
          key={`crate-${index}`}
          position={[
            crate.position[0],
            crate.position[1] + crate.size[1] / 2,
            crate.position[2],
          ]}
          rotation-y={crate.rotationY}
          castShadow
          receiveShadow
        >
          <boxGeometry args={crate.size} />
          <meshStandardMaterial color={LAB.crate} roughness={0.85} />
        </mesh>
      ))}
    </>
  );
}

/** Couloir visible derrière la porte : donne une profondeur à la sortie. */
function Corridor() {
  const start = -ROOM_HALF_DEPTH - ROOM.wallThickness;
  const centerZ = start - CORRIDOR_DEPTH / 2;
  const halfWidth = DOOR.width / 2;

  return (
    <group>
      <mesh position={[DOOR.centerX, 0.001, centerZ]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[DOOR.width, CORRIDOR_DEPTH]} />
        <meshStandardMaterial color={LAB.corridorFloor} roughness={0.9} />
      </mesh>
      <mesh
        position={[DOOR.centerX, DOOR.height, centerZ]}
        rotation-x={Math.PI / 2}
      >
        <planeGeometry args={[DOOR.width, CORRIDOR_DEPTH]} />
        <meshStandardMaterial color={LAB.ceiling} roughness={0.95} />
      </mesh>
      <mesh
        position={[
          DOOR.centerX - halfWidth - ROOM.wallThickness / 2,
          DOOR.height / 2,
          centerZ,
        ]}
      >
        <boxGeometry args={[ROOM.wallThickness, DOOR.height, CORRIDOR_DEPTH]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.9} />
      </mesh>
      <mesh
        position={[
          DOOR.centerX + halfWidth + ROOM.wallThickness / 2,
          DOOR.height / 2,
          centerZ,
        ]}
      >
        <boxGeometry args={[ROOM.wallThickness, DOOR.height, CORRIDOR_DEPTH]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.9} />
      </mesh>
      {/* Lueur de sortie au fond du couloir */}
      <mesh
        position={[DOOR.centerX, DOOR.height / 2, centerZ - CORRIDOR_DEPTH / 2]}
      >
        <planeGeometry args={[DOOR.width, DOOR.height]} />
        <meshBasicMaterial color={LAB.accentLight} toneMapped={false} />
      </mesh>
    </group>
  );
}
