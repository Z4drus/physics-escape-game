import { FURNITURE_COLLIDERS } from "@/features/game/data/interactables";
import { STATIONS } from "@/features/game/data/stations";
import {
  OBSTACLES,
  WALLS,
  WALL_THICKNESS,
  type DoorId,
  type WallSpec,
} from "@/features/game/data/world";
import { boxFromCenter, type Box2 } from "@/lib/collision";

/** Tronçons pleins d'un mur, une fois retirées les ouvertures franchissables. */
function wallSegments(
  wall: WallSpec,
  openDoors: ReadonlySet<DoorId>,
): [from: number, to: number][] {
  const passable = wall.openings
    .filter((opening) => !opening.doorId || openDoors.has(opening.doorId))
    .map(
      (opening) =>
        [
          opening.center - opening.width / 2,
          opening.center + opening.width / 2,
        ] as const,
    )
    .sort((a, b) => a[0] - b[0]);

  const segments: [number, number][] = [];
  let cursor = wall.from;
  for (const [start, end] of passable) {
    if (start > cursor) segments.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < wall.to) segments.push([cursor, wall.to]);
  return segments;
}

function wallBox(wall: WallSpec, from: number, to: number): Box2 {
  const length = to - from;
  const center = from + length / 2;
  return wall.axis === "x"
    ? boxFromCenter(center, wall.at, length, WALL_THICKNESS)
    : boxFromCenter(wall.at, center, WALL_THICKNESS, length);
}

/**
 * Construit la liste des obstacles au sol pour l'état courant des portes.
 * Une porte ouverte retire son tronçon de mur, ce qui laisse passer le joueur
 * par l'embrasure.
 */
export function buildColliders(openDoors: ReadonlySet<DoorId>): Box2[] {
  const colliders: Box2[] = [];

  for (const wall of WALLS) {
    for (const [from, to] of wallSegments(wall, openDoors)) {
      colliders.push(wallBox(wall, from, to));
    }
  }

  for (const station of STATIONS) {
    const [width, depth] = station.footprint;
    colliders.push(
      boxFromCenter(station.position[0], station.position[2], width, depth),
    );
  }

  for (const box of [...OBSTACLES, ...FURNITURE_COLLIDERS]) {
    colliders.push(
      boxFromCenter(box.center[0], box.center[1], box.size[0], box.size[1]),
    );
  }

  return colliders;
}
