import type { RoomId, Vec3 } from "@/types/game";

/** Épaisseur commune de tous les murs, en mètres. */
export const WALL_THICKNESS = 0.3;

export interface RoomSpec {
  id: RoomId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

/**
 * Les trois espaces, en repère monde. Le joueur démarre au sud de la galerie
 * et regarde vers le nord (z négatif), où se trouve la porte finale.
 */
export const ROOMS: Readonly<Record<RoomId, RoomSpec>> = {
  gallery: {
    id: "gallery",
    label: "Galerie des instruments",
    minX: -8,
    maxX: 8,
    minZ: -6,
    maxZ: 8,
    height: 5.2,
  },
  cabinet: {
    id: "cabinet",
    label: "Cabinet du conservateur",
    minX: 8.3,
    maxX: 14.3,
    minZ: -1,
    maxZ: 5,
    height: 3.6,
  },
  hologram: {
    id: "hologram",
    label: "Salle de l'hologramme",
    minX: -4,
    maxX: 4,
    minZ: -13.3,
    maxZ: -6.3,
    height: 4.4,
  },
};

/** Espace dans lequel se trouve un point du sol, `null` dans un mur. */
export function roomAt(x: number, z: number): RoomId | null {
  for (const room of Object.values(ROOMS)) {
    if (x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ) {
      return room.id;
    }
  }
  return null;
}

/** Portes percées dans les murs. */
export type DoorId = "cabinet" | "final" | "entrance";

export interface Opening {
  /** Coordonnée du centre le long du mur. */
  center: number;
  width: number;
  height: number;
  /** Porte associée ; une ouverture sans porte est toujours franchissable. */
  doorId?: DoorId;
}

export interface WallSpec {
  id: string;
  /** Pièce dont le mur prend le revêtement. */
  roomId: RoomId;
  /** Axe le long duquel court le mur. */
  axis: "x" | "z";
  /** Coordonnée du plan médian du mur sur l'axe perpendiculaire. */
  at: number;
  from: number;
  to: number;
  height: number;
  openings: readonly Opening[];
}

const G = ROOMS.gallery;
const C = ROOMS.cabinet;
const H = ROOMS.hologram;
const T = WALL_THICKNESS;

export const DOOR_SIZES: Readonly<
  Record<DoorId, { width: number; height: number }>
> = {
  cabinet: { width: 1.3, height: 2.5 },
  final: { width: 2.2, height: 3.2 },
  entrance: { width: 2.4, height: 3.2 },
};

/**
 * Tous les murs du musée. Les murs mitoyens sont déclarés une seule fois,
 * du côté de la galerie, l'épaisseur étant centrée sur `at`.
 */
export const WALLS: readonly WallSpec[] = [
  // Galerie
  {
    id: "gallery-south",
    roomId: "gallery",
    axis: "x",
    at: G.maxZ + T / 2,
    from: G.minX - T,
    to: G.maxX + T,
    height: G.height,
    openings: [{ center: 0, ...DOOR_SIZES.entrance, doorId: "entrance" }],
  },
  {
    id: "gallery-west",
    roomId: "gallery",
    axis: "z",
    at: G.minX - T / 2,
    from: G.minZ - T,
    to: G.maxZ + T,
    height: G.height,
    openings: [],
  },
  {
    id: "gallery-north",
    roomId: "gallery",
    axis: "x",
    at: G.minZ - T / 2,
    from: G.minX - T,
    to: G.maxX + T,
    height: G.height,
    openings: [{ center: 0, ...DOOR_SIZES.final, doorId: "final" }],
  },
  {
    id: "gallery-east",
    roomId: "gallery",
    axis: "z",
    at: G.maxX + T / 2,
    from: G.minZ - T,
    to: G.maxZ + T,
    height: G.height,
    openings: [{ center: 2, ...DOOR_SIZES.cabinet, doorId: "cabinet" }],
  },
  // Cabinet du conservateur
  {
    id: "cabinet-north",
    roomId: "cabinet",
    axis: "x",
    at: C.minZ - T / 2,
    from: G.maxX + T,
    to: C.maxX + T,
    height: C.height,
    openings: [],
  },
  {
    id: "cabinet-south",
    roomId: "cabinet",
    axis: "x",
    at: C.maxZ + T / 2,
    from: G.maxX + T,
    to: C.maxX + T,
    height: C.height,
    openings: [],
  },
  {
    id: "cabinet-east",
    roomId: "cabinet",
    axis: "z",
    at: C.maxX + T / 2,
    from: C.minZ - T,
    to: C.maxZ + T,
    height: C.height,
    openings: [],
  },
  // Salle de l'hologramme
  {
    id: "hologram-west",
    roomId: "hologram",
    axis: "z",
    at: H.minX - T / 2,
    from: H.minZ - T,
    to: G.minZ - T,
    height: H.height,
    openings: [],
  },
  {
    id: "hologram-east",
    roomId: "hologram",
    axis: "z",
    at: H.maxX + T / 2,
    from: H.minZ - T,
    to: G.minZ - T,
    height: H.height,
    openings: [],
  },
  {
    id: "hologram-north",
    roomId: "hologram",
    axis: "x",
    at: H.minZ - T / 2,
    from: H.minX - T,
    to: H.maxX + T,
    height: H.height,
    openings: [],
  },
];

/** Fenêtres, percées dans l'épaisseur des murs. */
export interface WindowSpec {
  id: string;
  wallId: string;
  /** Coordonnée du centre le long du mur. */
  center: number;
  width: number;
  height: number;
  /** Hauteur de l'allège. */
  sill: number;
}

export const WINDOWS: readonly WindowSpec[] = [
  {
    id: "w-west-1",
    wallId: "gallery-west",
    center: -3.2,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-west-2",
    wallId: "gallery-west",
    center: 0.6,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-west-3",
    wallId: "gallery-west",
    center: 4.4,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-south-1",
    wallId: "gallery-south",
    center: -5.4,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-south-2",
    wallId: "gallery-south",
    center: 5.4,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-east-1",
    wallId: "gallery-east",
    center: -3.6,
    width: 1.9,
    height: 3.4,
    sill: 0.95,
  },
  {
    id: "w-cabinet",
    wallId: "cabinet-east",
    center: 2,
    width: 1.5,
    height: 2.2,
    sill: 0.95,
  },
];

export const WALLS_BY_ID: ReadonlyMap<string, WallSpec> = new Map(
  WALLS.map((wall) => [wall.id, wall]),
);

/**
 * Hauteur, en mètres, de la ligne d'horizon des panoramas extérieurs. Elle
 * est posée juste au-dessus du regard (`PLAYER.eyeHeight`) : les toits
 * s'étalent sous les yeux du joueur, le ciel occupe le haut des baies.
 */
export const HORIZON_HEIGHT = 1.9;

/** Hauteur du faîtage de la rangée de toits proches. */
export const ROOFTOP_RIDGE_HEIGHT = 1.5;

/**
 * Photographies panoramiques utilisées comme fond de façade. `aspect` est le
 * rapport hauteur/largeur de l'image, `horizon` la fraction de sa hauteur,
 * mesurée depuis le haut, où se trouve la ligne d'horizon.
 */
export const PANORAMAS = {
  west: {
    url: "/images/decor/paris-panorama-west.webp",
    aspect: 1303 / 3072,
    horizon: 0.459,
  },
  south: {
    url: "/images/decor/paris-panorama-south.webp",
    aspect: 1303 / 3072,
    horizon: 0.478,
  },
} as const;

export type PanoramaId = keyof typeof PANORAMAS;

/**
 * Rangée de toits découpée, posée entre le mur et le panorama. `ridge` est la
 * fraction de hauteur, depuis le haut de l'image, où court le faîtage.
 */
export const ROOFTOPS = {
  url: "/images/decor/paris-rooftops.webp",
  aspect: 448 / 1536,
  ridge: 0.353,
} as const;

/** Rangée de toits proches d'une façade. */
export interface RooftopRowSpec {
  /** Coordonnée du plan sur l'axe perpendiculaire à la façade. */
  at: number;
  from: number;
  to: number;
  /** Image retournée horizontalement, pour varier une même photo. */
  mirrored: boolean;
}

/**
 * Décor extérieur d'une façade. Le panorama est un seul grand plan par
 * façade, posé plusieurs mètres au-delà du mur : les baies y découpent
 * chacune une portion différente d'un même paysage, et la vue glisse dans
 * les ouvertures quand le joueur se déplace.
 */
export interface FacadeSpec {
  id: string;
  /** Axe le long duquel s'étendent les plans du décor. */
  axis: "x" | "z";
  /** Coordonnée du panorama sur l'axe perpendiculaire. */
  at: number;
  /** Sens du regard : `1` vers les coordonnées croissantes. */
  outward: 1 | -1;
  /** Coordonnée de la face extérieure du mur, d'où part le sol extérieur. */
  wallFace: number;
  from: number;
  to: number;
  panorama: PanoramaId;
  mirrored: boolean;
  rooftops: RooftopRowSpec | null;
}

/**
 * Les trois façades ouvertes du musée. Les distances sont choisies pour que
 * la parallaxe soit franche sans que le paysage paraisse à portée de main :
 * le panorama est à 7 m des baies de la galerie (16 m pour la vue est, plus
 * dégagée), la rangée de toits à 2,2 m.
 */
export const FACADES: readonly FacadeSpec[] = [
  {
    id: "west",
    axis: "z",
    at: G.minX - T - 7,
    outward: -1,
    wallFace: G.minX - T,
    from: -15,
    to: 13,
    panorama: "west",
    mirrored: false,
    rooftops: { at: G.minX - T - 2.2, from: -9, to: 9.5, mirrored: false },
  },
  {
    id: "south",
    axis: "x",
    at: G.maxZ + T + 7,
    outward: 1,
    wallFace: G.maxZ + T,
    from: -17,
    to: 17,
    panorama: "south",
    mirrored: false,
    rooftops: { at: G.maxZ + T + 2.2, from: -10, to: 10, mirrored: true },
  },
  {
    id: "east",
    axis: "z",
    at: G.maxX + T + 16,
    outward: 1,
    wallFace: G.maxX + T,
    // Cadrage décalé vers le sud : le dôme du Panthéon, déjà visible à
    // l'ouest, sort ainsi du champ des baies est de la galerie.
    from: -22,
    to: 40,
    panorama: "west",
    mirrored: true,
    rooftops: null,
  },
];

/** Teintes de raccord du décor extérieur, relevées sur les photographies. */
export const OUTSIDE_COLORS = {
  /** Haut du ciel, prolongé au-dessus du panorama. */
  sky: "#bccbd4",
  /** Fond de cour, sous le panorama. */
  ground: "#33383a",
  /** Pierre de taille, sous la rangée de toits proches. */
  stone: "#706854",
  /** Zinc de la toiture de l'aile du cabinet. */
  zinc: "#6c737a",
} as const;

/** Position de départ du joueur (les yeux sont placés à `PLAYER.eyeHeight`). */
export const PLAYER_SPAWN: Vec3 = [0, 0, 6.4];

/** Caractéristiques du personnage contrôlé à la première personne. */
export const PLAYER = {
  eyeHeight: 1.68,
  radius: 0.38,
  walkSpeed: 3.4,
  runSpeed: 5.6,
  /** Constante de lissage de la vitesse : plus c'est grand, plus c'est réactif. */
  acceleration: 12,
  /** Distance maximale d'interaction avec un objet. */
  reach: 2.6,
  /** Écart angulaire maximal (radians) entre le regard et l'objet visé. */
  aimTolerance: 0.6,
} as const;

/** Estrade de l'hologramme : y monter déclenche la finale. */
export const HOLOGRAM_DAIS = {
  center: [0, -10.6] as [number, number],
  radius: 1.9,
  height: 0.28,
  /** Distance au centre en deçà de laquelle la finale démarre. */
  triggerRadius: 2.4,
} as const;

/**
 * Obstacles de décor : ils bloquent le joueur mais ne sont pas des
 * interactables. Les meubles interactifs déclarent leur propre boîte dans
 * `interactables.ts`.
 */
export const OBSTACLES: readonly {
  id: string;
  center: [number, number];
  size: [number, number];
}[] = [
  // Bibliothèque du cabinet, le long du mur sud.
  { id: "bookshelf", center: [11.3, 4.72], size: [5.2, 0.5] },
  // Colonnes de la salle de l'hologramme.
  { id: "column-1", center: [-3.3, -7.0], size: [0.7, 0.7] },
  { id: "column-2", center: [3.3, -7.0], size: [0.7, 0.7] },
  { id: "column-3", center: [-3.3, -12.6], size: [0.7, 0.7] },
  { id: "column-4", center: [3.3, -12.6], size: [0.7, 0.7] },
  // Banquette au centre de la galerie.
  { id: "bench", center: [0, 2.2], size: [1.9, 0.6] },
  // Vitrines des instruments d'électricité, angles nord de la galerie.
  { id: "showcase-galvanometer", center: [-6.8, -5.0], size: [0.9, 0.9] },
  { id: "showcase-induction", center: [6.8, -5.0], size: [0.9, 0.9] },
];
