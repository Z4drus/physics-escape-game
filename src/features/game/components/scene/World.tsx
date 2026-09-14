"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  ClampToEdgeWrapping,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from "three";

import { MUSEUM } from "@/features/game/components/scene/materials";
import {
  useRepeatedSet,
  useTextureSet,
  type TextureSet,
} from "@/features/game/components/scene/textures";
import {
  FACADES,
  HORIZON_HEIGHT,
  OUTSIDE_COLORS,
  PANORAMAS,
  ROOFTOPS,
  ROOFTOP_RIDGE_HEIGHT,
  ROOMS,
  WALLS,
  WALL_THICKNESS,
  WINDOWS,
  type FacadeSpec,
  type PanoramaId,
  type RoomSpec,
  type WallSpec,
  type WindowSpec,
} from "@/features/game/data/world";
import type { RoomId } from "@/types/game";

/** Hauteur du soubassement en bois. */
const WAINSCOT_HEIGHT = 1.05;
const WAINSCOT_DEPTH = 0.035;
/** Hauteur de la cimaise (barre à tableaux). */
const PICTURE_RAIL = 3.2;
// Vecteurs partagés : un même objet pour tous les matériaux, jamais recréé.
const FLOOR_NORMAL_SCALE = new Vector2(0.6, 0.6);
const WALL_NORMAL_SCALE = new Vector2(0.5, 0.5);
/**
 * Hauteur de ciel ajoutée au-dessus du cadre de la photographie. Le plan
 * déborde l'image et le mode `ClampToEdge` y étire sa dernière ligne : le
 * ciel se prolonge donc de lui-même, sans raccord visible, quand le joueur
 * colle le nez à la vitre et lève les yeux.
 */
const SKY_EXTENSION = 26;

/**
 * Dimensions du décor d'une façade. Le plan est plus haut que la photo : la
 * bande utile est calée pour que l'horizon tombe à `HORIZON_HEIGHT`, le reste
 * étant occupé par l'étirement des bords.
 */
function facadeLayout(facade: FacadeSpec) {
  const image = PANORAMAS[facade.panorama];
  const width = facade.to - facade.from;
  const imageHeight = width * image.aspect;
  const imageTop = HORIZON_HEIGHT + image.horizon * imageHeight;
  const below = imageHeight * 0.15;
  const height = SKY_EXTENSION + imageHeight + below;
  const top = imageTop + SKY_EXTENSION;
  return {
    width,
    height,
    top,
    bottom: top - height,
    center: facade.from + width / 2,
    /** Bas de la photographie, où se raccorde le fond de cour. */
    imageBottom: imageTop - imageHeight,
    repeatY: height / imageHeight,
    offsetY: -below / imageHeight,
  };
}

/**
 * Coque du musée : sols, plafonds, murs percés de portes et de fenêtres,
 * soubassements, corniches et paysage extérieur. Tout dérive des données de
 * `data/world.ts`.
 */
export function World() {
  const parquet = useTextureSet("parquet");
  const plaster = useTextureSet("plaster");
  const wood = useTextureSet("wood");
  const marble = useTextureSet("marble");
  const [westImage, southImage, rooftopsImage] = useTexture([
    PANORAMAS.west.url,
    PANORAMAS.south.url,
    ROOFTOPS.url,
  ]);

  // Chaque façade reçoit son propre clone : même image en mémoire, mais
  // cadrage et miroir décidés ici, dans le `useMemo` qui les fabrique.
  const outside = useMemo(() => {
    const sources: Record<PanoramaId, Texture> = {
      west: westImage,
      south: southImage,
    };
    const tune = (
      source: Texture,
      mirrored: boolean,
      repeatY = 1,
      offsetY = 0,
    ) => {
      const clone = source.clone();
      clone.colorSpace = SRGBColorSpace;
      clone.wrapS = ClampToEdgeWrapping;
      clone.wrapT = ClampToEdgeWrapping;
      clone.anisotropy = 8;
      clone.repeat.set(mirrored ? -1 : 1, repeatY);
      clone.offset.set(mirrored ? 1 : 0, offsetY);
      clone.needsUpdate = true;
      return clone;
    };
    return FACADES.map((facade) => {
      const layout = facadeLayout(facade);
      return {
        facade,
        panorama: tune(
          sources[facade.panorama],
          facade.mirrored,
          layout.repeatY,
          layout.offsetY,
        ),
        rooftops: facade.rooftops
          ? tune(rooftopsImage, facade.rooftops.mirrored)
          : null,
      };
    });
  }, [westImage, southImage, rooftopsImage]);

  return (
    <group>
      {Object.values(ROOMS).map((room) => (
        <RoomShell
          key={room.id}
          room={room}
          floor={room.id === "hologram" ? marble : parquet}
        />
      ))}
      {WALLS.map((wall) => (
        <Wall key={wall.id} wall={wall} plaster={plaster} wood={wood} />
      ))}
      {outside.map(({ facade, panorama, rooftops }) => (
        <Facade
          key={facade.id}
          facade={facade}
          panorama={panorama}
          rooftops={rooftops}
        />
      ))}
      <WingRoof />
    </group>
  );
}

/** Sol et plafond d'une pièce. */
function RoomShell({ room, floor }: { room: RoomSpec; floor: TextureSet }) {
  const width = room.maxX - room.minX;
  const depth = room.maxZ - room.minZ;
  const centerX = (room.minX + room.maxX) / 2;
  const centerZ = (room.minZ + room.maxZ) / 2;
  const isHologram = room.id === "hologram";
  const floorSet = useRepeatedSet(floor, width / 2.2, depth / 2.2);

  return (
    <group>
      <mesh
        position={[centerX, 0, centerZ]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={floorSet.map}
          normalMap={floorSet.normalMap}
          roughnessMap={floorSet.roughnessMap}
          normalScale={FLOOR_NORMAL_SCALE}
          color={isHologram ? "#8a8078" : "#ffffff"}
          roughness={isHologram ? 0.35 : 0.8}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[centerX, room.height, centerZ]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={isHologram ? MUSEUM.darkFloor : MUSEUM.ceiling}
          roughness={0.95}
        />
      </mesh>

      {/* Rosace centrale de la galerie */}
      {room.id === "gallery" ? (
        <mesh
          position={[centerX, room.height - 0.02, centerZ]}
          rotation-x={Math.PI / 2}
        >
          <ringGeometry args={[1.2, 2.6, 48]} />
          <meshStandardMaterial color={MUSEUM.moulding} roughness={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

/** Tronçon plein d'un mur, entre deux ouvertures ou au-dessus de l'une d'elles. */
interface WallPiece {
  key: string;
  from: number;
  to: number;
  bottom: number;
  top: number;
  /** Tronçon de plein pied, qui porte soubassement, cimaise et corniche. */
  full: boolean;
}

/**
 * Découpe un mur autour de ses ouvertures. Une porte laisse un linteau, une
 * fenêtre laisse une allège sous l'appui et un trumeau au-dessus du cintre :
 * la baie est donc réellement percée de part en part, et l'épaisseur du mur
 * forme d'elle-même l'ébrasement.
 */
function wallPieces(
  wall: WallSpec,
  windows: readonly WindowSpec[],
): WallPiece[] {
  const gaps = [
    ...wall.openings.map((opening) => ({
      start: opening.center - opening.width / 2,
      end: opening.center + opening.width / 2,
      bands: [{ bottom: opening.height, top: wall.height }],
    })),
    ...windows.map((window) => ({
      start: window.center - window.width / 2,
      end: window.center + window.width / 2,
      bands: [
        { bottom: 0, top: window.sill },
        { bottom: window.sill + window.height, top: wall.height },
      ],
    })),
  ].sort((a, b) => a.start - b.start);

  const pieces: WallPiece[] = [];
  let cursor = wall.from;
  for (const [index, gap] of gaps.entries()) {
    if (gap.start > cursor) {
      pieces.push({
        key: `seg-${index}`,
        from: cursor,
        to: gap.start,
        bottom: 0,
        top: wall.height,
        full: true,
      });
    }
    for (const [band, { bottom, top }] of gap.bands.entries()) {
      if (top - bottom < 0.001) continue;
      pieces.push({
        key: `band-${index}-${band}`,
        from: gap.start,
        to: gap.end,
        bottom,
        top,
        full: false,
      });
    }
    cursor = Math.max(cursor, gap.end);
  }
  if (cursor < wall.to) {
    pieces.push({
      key: "seg-end",
      from: cursor,
      to: wall.to,
      bottom: 0,
      top: wall.height,
      full: true,
    });
  }
  return pieces;
}

/** Position monde d'un point situé le long d'un mur. */
function alongWall(
  wall: WallSpec,
  along: number,
  y: number,
  offset = 0,
): [number, number, number] {
  return wall.axis === "x"
    ? [along, y, wall.at + offset]
    : [wall.at + offset, y, along];
}

function Wall({
  wall,
  plaster,
  wood,
}: {
  wall: WallSpec;
  plaster: TextureSet;
  wood: TextureSet;
}) {
  const windows = useMemo(
    () => WINDOWS.filter((window) => window.wallId === wall.id),
    [wall.id],
  );
  const pieces = useMemo(() => wallPieces(wall, windows), [wall, windows]);
  const length = wall.to - wall.from;
  const plasterSet = useRepeatedSet(plaster, length / 3, wall.height / 3);
  const woodSet = useRepeatedSet(wood, length / 1.5, 0.5);
  const rotationY = wall.axis === "x" ? 0 : Math.PI / 2;
  const wallColor = wall.roomId === "hologram" ? MUSEUM.darkWall : MUSEUM.wall;

  // La cimaise s'interrompt devant les fenêtres, qu'elle traverserait sinon.
  const railSegments = useMemo(() => {
    const spans = windows
      .map(
        (window) =>
          [
            window.center - window.width / 2 - 0.1,
            window.center + window.width / 2 + 0.1,
          ] as const,
      )
      .sort((a, b) => a[0] - b[0]);
    return pieces
      .filter((piece) => piece.full)
      .flatMap((piece) => {
        const segments: [number, number][] = [];
        let cursor = piece.from;
        for (const [start, end] of spans) {
          if (end <= piece.from || start >= piece.to) continue;
          if (start > cursor) segments.push([cursor, start]);
          cursor = Math.max(cursor, end);
        }
        if (cursor < piece.to) segments.push([cursor, piece.to]);
        return segments;
      });
  }, [pieces, windows]);

  return (
    <group>
      {pieces.map((piece) => {
        const pieceLength = piece.to - piece.from;
        const height = piece.top - piece.bottom;
        const center = piece.from + pieceLength / 2;
        return (
          <mesh
            key={piece.key}
            position={alongWall(wall, center, piece.bottom + height / 2)}
            rotation-y={rotationY}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[pieceLength, height, WALL_THICKNESS]} />
            <meshStandardMaterial
              map={plasterSet.map}
              normalMap={plasterSet.normalMap}
              roughnessMap={plasterSet.roughnessMap}
              normalScale={WALL_NORMAL_SCALE}
              color={wallColor}
              roughness={0.9}
            />
          </mesh>
        );
      })}

      {/* Soubassement et cimaise haute, sur les deux faces des pleins. */}
      {[-1, 1].map((side) =>
        pieces
          .filter((piece) => piece.full)
          .map((piece) => {
            const pieceLength = piece.to - piece.from;
            const center = piece.from + pieceLength / 2;
            const offset = side * (WALL_THICKNESS / 2 + WAINSCOT_DEPTH / 2);
            return (
              <group key={`${side}-${piece.key}`}>
                <mesh
                  position={alongWall(
                    wall,
                    center,
                    WAINSCOT_HEIGHT / 2,
                    offset,
                  )}
                  rotation-y={rotationY}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry
                    args={[pieceLength, WAINSCOT_HEIGHT, WAINSCOT_DEPTH]}
                  />
                  <meshStandardMaterial
                    map={woodSet.map}
                    normalMap={woodSet.normalMap}
                    roughnessMap={woodSet.roughnessMap}
                    color={MUSEUM.wainscot}
                    roughness={0.55}
                    metalness={0.05}
                  />
                </mesh>
                <mesh
                  position={alongWall(
                    wall,
                    center,
                    WAINSCOT_HEIGHT + 0.03,
                    offset * 1.25,
                  )}
                  rotation-y={rotationY}
                >
                  <boxGeometry
                    args={[pieceLength, 0.06, WAINSCOT_DEPTH * 1.6]}
                  />
                  <meshStandardMaterial
                    color={MUSEUM.wainscot}
                    roughness={0.5}
                  />
                </mesh>
              </group>
            );
          }),
      )}

      {/* Corniche : elle court sans rupture sur tout ce qui monte au plafond. */}
      {[-1, 1].map((side) =>
        pieces
          .filter((piece) => piece.top >= wall.height - 0.001)
          .map((piece) => {
            const pieceLength = piece.to - piece.from;
            const center = piece.from + pieceLength / 2;
            // Le dos de la corniche mord dans le mur et son dessus reste sous
            // le plafond : aucune face exactement dans le plan d'une autre.
            const depth = WAINSCOT_DEPTH * 1.8;
            const offset = side * (WALL_THICKNESS / 2 + depth / 2 - 0.01);
            const corniceHeight = 0.2;
            return (
              <mesh
                key={`cornice-${side}-${piece.key}`}
                position={alongWall(
                  wall,
                  center,
                  wall.height - 0.01 - corniceHeight / 2,
                  offset,
                )}
                rotation-y={rotationY}
              >
                <boxGeometry args={[pieceLength, corniceHeight, depth]} />
                <meshStandardMaterial color={MUSEUM.ceiling} roughness={0.85} />
              </mesh>
            );
          }),
      )}

      {[-1, 1].map((side) =>
        railSegments.map(([from, to]) => {
          const offset = side * (WALL_THICKNESS / 2 + WAINSCOT_DEPTH / 2) * 0.9;
          return (
            <mesh
              key={`rail-${side}-${from}`}
              position={alongWall(
                wall,
                from + (to - from) / 2,
                PICTURE_RAIL,
                offset,
              )}
              rotation-y={rotationY}
            >
              <boxGeometry args={[to - from, 0.05, WAINSCOT_DEPTH]} />
              <meshStandardMaterial color={MUSEUM.moulding} roughness={0.85} />
            </mesh>
          );
        }),
      )}

      {windows.map((window) => (
        <ArchedWindow
          key={window.id}
          wall={wall}
          roomId={wall.roomId}
          center={window.center}
          width={window.width}
          height={window.height}
          sill={window.sill}
          wallColor={wallColor}
        />
      ))}
    </group>
  );
}

/**
 * Fenêtre cintrée. Le mur est réellement percé par `wallPieces` : ne restent
 * ici que les écoinçons qui ferment les angles du cintre, le vitrage, le
 * chambranle, l'appui et les meneaux. Le paysage, lui, est plusieurs mètres
 * plus loin, ce qui fait glisser la vue dans la baie quand on se déplace.
 */
function ArchedWindow({
  wall,
  roomId,
  center,
  width,
  height,
  sill,
  wallColor,
}: {
  wall: WallSpec;
  roomId: RoomId;
  center: number;
  width: number;
  height: number;
  sill: number;
  wallColor: string;
}) {
  const room = ROOMS[roomId];
  // La face intérieure est celle qui regarde le centre de la pièce.
  const roomCenter =
    wall.axis === "x"
      ? (room.minZ + room.maxZ) / 2
      : (room.minX + room.maxX) / 2;
  const inward = Math.sign(roomCenter - wall.at);
  const faceOffset = inward * (WALL_THICKNESS / 2);
  const rotationY =
    wall.axis === "x"
      ? inward > 0
        ? 0
        : Math.PI
      : inward > 0
        ? Math.PI / 2
        : -Math.PI / 2;
  const radius = width / 2;
  const rectHeight = height - radius;
  const centerY = sill + rectHeight / 2;
  const archY = sill + rectHeight;
  const frame = MUSEUM.moulding;

  // Écoinçons : le percement est rectangulaire, ces deux coins de maçonnerie
  // referment ce que le demi-cercle du cintre ne prend pas.
  const spandrels = useMemo(() => {
    const left = new Shape();
    left.moveTo(-radius, 0);
    left.lineTo(-radius, radius);
    left.lineTo(0, radius);
    left.absarc(0, 0, radius, Math.PI / 2, Math.PI, false);
    const right = new Shape();
    right.moveTo(radius, 0);
    right.lineTo(radius, radius);
    right.lineTo(0, radius);
    right.absarc(0, 0, radius, Math.PI / 2, 0, true);
    return new ExtrudeGeometry([left, right], {
      depth: WALL_THICKNESS,
      bevelEnabled: false,
      curveSegments: 24,
    });
  }, [radius]);

  return (
    <group
      position={alongWall(wall, center, 0, faceOffset)}
      rotation-y={rotationY}
    >
      <mesh
        position={[0, archY, -WALL_THICKNESS]}
        geometry={spandrels}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* Vitrage : un voile à peine teinté, posé dans l'ébrasement */}
      <mesh position={[0, centerY, -0.04]}>
        <planeGeometry args={[width, rectHeight]} />
        <meshPhysicalMaterial
          color={MUSEUM.glass}
          transparent
          opacity={0.08}
          roughness={0.16}
          metalness={0}
          specularIntensity={0.3}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, archY, -0.04]}>
        <circleGeometry args={[radius, 32, 0, Math.PI]} />
        <meshPhysicalMaterial
          color={MUSEUM.glass}
          transparent
          opacity={0.08}
          roughness={0.16}
          metalness={0}
          specularIntensity={0.3}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      {/* Allège lambrissée sous l'appui, un peu en retrait des lambris voisins */}
      <mesh
        position={[0, (sill - 0.12) / 2, WAINSCOT_DEPTH / 2 - 0.004]}
        receiveShadow
      >
        <boxGeometry args={[width - 0.02, sill - 0.12, WAINSCOT_DEPTH]} />
        <meshStandardMaterial color={MUSEUM.wainscot} roughness={0.55} />
      </mesh>

      {/*
       * Chambranle : montants, appui et cintre. Les montants mordent de deux
       * centimètres dans la baie pour recouvrir la tranche du mur, et l'appui
       * dépasse d'autant le haut de l'allège : deux faces posées dans le même
       * plan scintilleraient.
       */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (radius + 0.04), centerY, 0.05]}
          castShadow
        >
          <boxGeometry args={[0.12, rectHeight, 0.1]} />
          <meshStandardMaterial color={frame} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, sill - 0.05, 0.09]} castShadow>
        <boxGeometry args={[width + 0.36, 0.14, 0.22]} />
        <meshStandardMaterial color={frame} roughness={0.85} />
      </mesh>
      <mesh position={[0, archY, 0.05]}>
        <torusGeometry args={[radius + 0.06, 0.06, 8, 40, Math.PI]} />
        <meshStandardMaterial color={frame} roughness={0.85} />
      </mesh>

      {/* Meneaux et traverses du châssis */}
      <mesh position={[0, centerY, 0.03]}>
        <boxGeometry args={[0.05, rectHeight, 0.04]} />
        <meshStandardMaterial color={MUSEUM.wainscot} roughness={0.6} />
      </mesh>
      <mesh position={[0, sill + rectHeight * 0.55, 0.03]}>
        <boxGeometry args={[width, 0.05, 0.04]} />
        <meshStandardMaterial color={MUSEUM.wainscot} roughness={0.6} />
      </mesh>
      <mesh position={[0, archY, 0.03]}>
        <boxGeometry args={[width, 0.05, 0.04]} />
        <meshStandardMaterial color={MUSEUM.wainscot} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * Paysage d'une façade : un seul panorama pour toutes ses baies, une rangée
 * de toits détourés entre les deux, et les raccords de ciel et de cour qui
 * ferment le champ quand on colle le nez à la vitre. Les matériaux sont
 * basiques et hors brouillard : le crépuscule vient de la photographie, pas
 * de l'éclairage de la salle.
 */
function Facade({
  facade,
  panorama,
  rooftops,
}: {
  facade: FacadeSpec;
  panorama: Texture;
  rooftops: Texture | null;
}) {
  const { width, height, top, center, imageBottom } = facadeLayout(facade);
  const rotationY =
    facade.axis === "z"
      ? (-facade.outward * Math.PI) / 2
      : facade.outward > 0
        ? Math.PI
        : 0;

  /** Place un plan vertical parallèle à la façade. */
  const upright = (
    at: number,
    y: number,
    along: number,
  ): [number, number, number] =>
    facade.axis === "z" ? [at, y, along] : [along, y, at];

  const row = facade.rooftops;
  const rowWidth = row ? row.to - row.from : 0;
  const rowHeight = rowWidth * ROOFTOPS.aspect;
  const rowTop = ROOFTOP_RIDGE_HEIGHT + ROOFTOPS.ridge * rowHeight;
  const rowBottom = rowTop - rowHeight;
  const rowCenter = row ? row.from + rowWidth / 2 : 0;

  // Fond de cour, du pied du mur jusque derrière le panorama.
  const depthFar = facade.at + facade.outward * 3;
  const depthSpan = Math.abs(depthFar - facade.wallFace);
  const depthCenter = (facade.wallFace + depthFar) / 2;

  return (
    <group>
      <mesh
        position={upright(facade.at, top - height / 2, center)}
        rotation-y={rotationY}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={panorama} toneMapped={false} fog={false} />
      </mesh>

      {/* Garde-fou : le ciel se poursuit au-delà du plan photographique */}
      <mesh
        position={upright(facade.at, top + 8, center)}
        rotation-y={rotationY}
      >
        <planeGeometry args={[width, 16]} />
        <meshBasicMaterial
          color={OUTSIDE_COLORS.sky}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* Fond de cour, vu seulement quand on se penche à la fenêtre */}
      <mesh
        position={
          facade.axis === "z"
            ? [depthCenter, imageBottom, center]
            : [center, imageBottom, depthCenter]
        }
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry
          args={facade.axis === "z" ? [depthSpan, width] : [width, depthSpan]}
        />
        <meshBasicMaterial
          color={OUTSIDE_COLORS.ground}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {row && rooftops ? (
        <group>
          <mesh
            position={upright(row.at, (rowTop + rowBottom) / 2, rowCenter)}
            rotation-y={rotationY}
          >
            <planeGeometry args={[rowWidth, rowHeight]} />
            <meshBasicMaterial
              map={rooftops}
              toneMapped={false}
              fog={false}
              transparent
              alphaTest={0.5}
            />
          </mesh>
          {/* La pierre de taille continue sous le cadrage de la découpe. */}
          <mesh
            position={upright(row.at, rowBottom - 6, rowCenter)}
            rotation-y={rotationY}
          >
            <planeGeometry args={[rowWidth, 12]} />
            <meshBasicMaterial
              color={OUTSIDE_COLORS.stone}
              toneMapped={false}
              fog={false}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/**
 * Toiture de zinc de l'aile du cabinet. Sans elle, la fenêtre est de la
 * galerie donne sur un mur isolé qui flotte dans le vide.
 */
function WingRoof() {
  const cabinet = ROOMS.cabinet;
  // La tranche ouest part du milieu du mur est de la galerie et reste noyée
  // dans la maçonnerie : posée au ras du plâtre, elle scintillait au-dessus
  // de la porte du cabinet.
  const minX = ROOMS.gallery.maxX + WALL_THICKNESS / 2;
  const maxX = cabinet.maxX + WALL_THICKNESS + 0.15;
  const minZ = cabinet.minZ - WALL_THICKNESS - 0.15;
  const maxZ = cabinet.maxZ + WALL_THICKNESS + 0.15;
  // La sous-face flotte un centimètre au-dessus du plafond du cabinet, dont
  // elle occupait sinon exactement le plan.
  const bottom = cabinet.height + 0.01;
  const thickness = 0.5;

  return (
    <mesh
      position={[(minX + maxX) / 2, bottom + thickness / 2, (minZ + maxZ) / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[maxX - minX, thickness, maxZ - minZ]} />
      <meshStandardMaterial
        color={OUTSIDE_COLORS.zinc}
        roughness={0.55}
        metalness={0.35}
      />
    </mesh>
  );
}
