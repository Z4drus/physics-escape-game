import { boxFromCenter, type Box2 } from "@/lib/collision";
import type { InteractiveObject, Vec3 } from "@/types/game";

/** Dimensions intérieures de la salle, en mètres. */
export const ROOM = {
  width: 14,
  depth: 14,
  height: 3.4,
  wallThickness: 0.3,
} as const;

export const ROOM_HALF_WIDTH = ROOM.width / 2;
export const ROOM_HALF_DEPTH = ROOM.depth / 2;

/** Porte de sortie, percée dans le mur nord (z négatif). */
export const DOOR = {
  width: 2.2,
  height: 2.6,
  /** Position du centre de la porte sur l'axe X. */
  centerX: 0,
  /** Position du mur nord sur l'axe Z. */
  z: -ROOM_HALF_DEPTH,
} as const;

/** Longueur du couloir visible derrière la porte. */
export const CORRIDOR_DEPTH = 6;

/** Position de départ du joueur (les yeux sont placés à `PLAYER.eyeHeight`). */
export const PLAYER_SPAWN: Vec3 = [0, 0, 5.4];

/** Caractéristiques du personnage contrôlé à la première personne. */
export const PLAYER = {
  eyeHeight: 1.68,
  radius: 0.38,
  walkSpeed: 3.4,
  runSpeed: 5.6,
  /** Constante de lissage de la vitesse : plus c'est grand, plus c'est réactif. */
  acceleration: 12,
  /** Distance maximale d'interaction avec un dispositif. */
  reach: 2.9,
  /** Écart angulaire maximal (radians) entre le regard et l'objet visé. */
  aimTolerance: 0.7,
} as const;

/** Dispositifs interactifs, un par énigme. */
export const INTERACTIVE_OBJECTS: readonly InteractiveObject[] = [
  {
    id: "pendulum",
    puzzleId: "pendulum",
    kind: "pendulum",
    label: "Pendule simple",
    position: [-4.6, 0, -4.2],
    rotationY: 0.32,
    footprint: [1.5, 1.5],
  },
  {
    id: "incline",
    puzzleId: "incline",
    kind: "incline",
    label: "Plan incliné",
    position: [4.5, 0, -4.3],
    rotationY: -0.45,
    footprint: [2.2, 1.6],
  },
  {
    id: "circuit",
    puzzleId: "circuit",
    kind: "circuit",
    label: "Banc d'électricité",
    position: [-5.1, 0, 2.7],
    rotationY: 1.15,
    footprint: [1.8, 1.3],
  },
  {
    id: "spring",
    puzzleId: "spring",
    kind: "spring",
    label: "Ressort et masse",
    position: [5.2, 0, 2.6],
    rotationY: -1.05,
    footprint: [1.4, 1.4],
  },
  {
    id: "lever",
    puzzleId: "lever",
    kind: "lever",
    label: "Balance à levier",
    position: [0, 0, 0.4],
    rotationY: Math.PI / 2,
    footprint: [1.4, 2.6],
  },
];

/** Caisses de décor : elles habillent la salle et servent d'obstacles. */
export const CRATES: readonly {
  position: Vec3;
  size: Vec3;
  rotationY: number;
}[] = [
  { position: [-6.1, 0, -0.6], size: [0.9, 0.9, 0.9], rotationY: 0.25 },
  { position: [-6.0, 0.9, -0.5], size: [0.7, 0.7, 0.7], rotationY: -0.4 },
  { position: [6.0, 0, -1.2], size: [1.1, 1.1, 1.1], rotationY: -0.18 },
];

/**
 * Construit la liste des obstacles au sol.
 * Le mur nord est découpé en deux tronçons dès que la porte est ouverte,
 * ce qui laisse passer le joueur par l'embrasure.
 */
export function buildColliders(doorOpen: boolean): Box2[] {
  const halfW = ROOM_HALF_WIDTH;
  const halfD = ROOM_HALF_DEPTH;
  const t = ROOM.wallThickness;

  const colliders: Box2[] = [
    // Mur sud, mur est, mur ouest.
    boxFromCenter(0, halfD + t / 2, ROOM.width + t * 2, t),
    boxFromCenter(halfW + t / 2, 0, t, ROOM.depth + t * 2),
    boxFromCenter(-halfW - t / 2, 0, t, ROOM.depth + t * 2),
  ];

  if (doorOpen) {
    const sideWidth = (ROOM.width - DOOR.width) / 2;
    const offset = DOOR.width / 2 + sideWidth / 2;
    colliders.push(
      boxFromCenter(DOOR.centerX - offset, -halfD - t / 2, sideWidth, t),
      boxFromCenter(DOOR.centerX + offset, -halfD - t / 2, sideWidth, t),
      // Parois du couloir de sortie.
      boxFromCenter(
        DOOR.centerX - DOOR.width / 2 - t / 2,
        -halfD - CORRIDOR_DEPTH / 2,
        t,
        CORRIDOR_DEPTH,
      ),
      boxFromCenter(
        DOOR.centerX + DOOR.width / 2 + t / 2,
        -halfD - CORRIDOR_DEPTH / 2,
        t,
        CORRIDOR_DEPTH,
      ),
    );
  } else {
    colliders.push(boxFromCenter(0, -halfD - t / 2, ROOM.width + t * 2, t));
  }

  for (const object of INTERACTIVE_OBJECTS) {
    const [width, depth] = object.footprint;
    colliders.push(
      boxFromCenter(object.position[0], object.position[2], width, depth),
    );
  }

  for (const crate of CRATES) {
    // Seules les caisses posées au sol bloquent le passage.
    if (crate.position[1] > 0.1) continue;
    colliders.push(
      boxFromCenter(
        crate.position[0],
        crate.position[2],
        crate.size[0] + 0.1,
        crate.size[2] + 0.1,
      ),
    );
  }

  return colliders;
}

/** Ligne franchie derrière la porte qui déclenche la fin de la partie. */
export const EXIT_TRIGGER_Z = -ROOM_HALF_DEPTH - 1.6;
