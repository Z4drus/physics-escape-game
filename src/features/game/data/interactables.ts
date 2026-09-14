import { STATIONS } from "@/features/game/data/stations";
import type { Interactable } from "@/types/game";

/**
 * Tout ce que le joueur peut viser, hors postes : tableaux, meubles, portes,
 * dispositifs. Les postes sont ajoutés automatiquement depuis `STATIONS`.
 *
 * `position` est le point visé (au centre de l'objet, à hauteur des yeux pour
 * les objets muraux), `radius` la tolérance de distance ajoutée à la portée.
 */
const OBJECTS: readonly Interactable[] = [
  // ---- Galerie : les quatre tableaux de l'énigme du code ----
  {
    id: "painting-archimede",
    kind: "inspect",
    roomId: "gallery",
    label: "Portrait d'Archimède",
    verb: "Inspecter",
    position: [-7.85, 1.9, -1.3],
    radius: 0.7,
  },
  {
    id: "painting-galilee",
    kind: "inspect",
    roomId: "gallery",
    label: "Portrait de Galilée",
    verb: "Inspecter",
    position: [-4.8, 1.9, -5.85],
    radius: 0.7,
  },
  {
    id: "painting-newton",
    kind: "inspect",
    roomId: "gallery",
    label: "Portrait de Newton",
    verb: "Inspecter",
    position: [7.85, 1.9, -0.6],
    radius: 0.7,
  },
  {
    id: "painting-curie",
    kind: "inspect",
    roomId: "gallery",
    label: "Portrait de Marie Curie",
    verb: "Inspecter",
    position: [-2.8, 1.9, 7.85],
    radius: 0.7,
  },
  // ---- Galerie : décor à lire ----
  {
    id: "poster",
    kind: "inspect",
    roomId: "gallery",
    label: "Affiche de l'exposition",
    verb: "Lire",
    position: [2.8, 1.9, 7.85],
    radius: 0.7,
  },
  {
    id: "plaque-rules",
    kind: "inspect",
    roomId: "gallery",
    label: "Plaque du conservateur",
    verb: "Lire",
    position: [7.9, 1.5, 3.4],
    radius: 0.6,
  },
  {
    id: "bust-archimede",
    kind: "inspect",
    roomId: "gallery",
    label: "Buste d'Archimède",
    verb: "Inspecter",
    position: [-2.3, 1.3, -0.6],
    radius: 0.6,
  },
  {
    id: "vitrine-armillary",
    kind: "inspect",
    roomId: "gallery",
    label: "Sphère armillaire",
    verb: "Inspecter",
    position: [2.3, 1.3, -0.6],
    radius: 0.6,
  },
  {
    id: "vitrine-telescope",
    kind: "inspect",
    roomId: "gallery",
    label: "Lunette astronomique",
    verb: "Inspecter",
    position: [-6.2, 1.2, 1.0],
    radius: 0.7,
  },
  // ---- Galerie : dispositifs ----
  {
    id: "guard-desk",
    kind: "pickup",
    roomId: "gallery",
    label: "Bureau du surveillant",
    verb: "Fouiller",
    position: [3.6, 0.9, 6.6],
    radius: 0.9,
  },
  {
    id: "fuse-box",
    kind: "fuse-box",
    roomId: "gallery",
    label: "Tableau électrique",
    verb: "Ouvrir",
    position: [7.85, 1.5, 6.5],
    radius: 0.6,
  },
  {
    id: "cabinet-door",
    kind: "cabinet-door",
    roomId: "gallery",
    label: "Porte du cabinet",
    verb: "Déverrouiller",
    position: [8.15, 1.3, 2],
    radius: 0.8,
  },
  {
    id: "final-door",
    kind: "final-door",
    roomId: "gallery",
    label: "Porte de la salle de l'hologramme",
    verb: "Ouvrir",
    position: [0, 1.6, -6.15],
    radius: 1.2,
  },
  // ---- Cabinet du conservateur ----
  {
    id: "desk-note",
    kind: "inspect",
    roomId: "cabinet",
    label: "Bureau du conservateur",
    verb: "Fouiller",
    position: [11.6, 0.9, 0.1],
    radius: 1.0,
  },
  {
    id: "uv-wall",
    kind: "uv-wall",
    roomId: "cabinet",
    label: "Mur derrière le bureau",
    verb: "Éclairer à l'UV",
    position: [11.6, 1.9, -0.85],
    radius: 0.9,
  },
  {
    id: "safe",
    kind: "safe",
    roomId: "cabinet",
    label: "Coffre-fort",
    verb: "Ouvrir",
    position: [13.6, 0.6, -0.45],
    radius: 0.6,
  },
  {
    id: "chalkboard",
    kind: "inspect",
    roomId: "cabinet",
    label: "Tableau noir",
    verb: "Lire",
    position: [13.5, 2.1, -0.85],
    radius: 0.8,
  },
];

const STATION_INTERACTABLES: readonly Interactable[] = STATIONS.map(
  (station) => ({
    id: station.id,
    kind: "station",
    roomId: station.roomId,
    label: station.label,
    verb: "Analyser",
    position: station.position,
    radius: Math.max(station.footprint[0], station.footprint[1]) / 2,
  }),
);

export const INTERACTABLES: readonly Interactable[] = [
  ...STATION_INTERACTABLES,
  ...OBJECTS,
];

export const INTERACTABLES_BY_ID: ReadonlyMap<string, Interactable> = new Map(
  INTERACTABLES.map((item) => [item.id, item]),
);

/** Boîtes de collision des meubles interactifs, en repère monde. */
export const FURNITURE_COLLIDERS: readonly {
  id: string;
  center: [number, number];
  size: [number, number];
}[] = [
  { id: "bust-archimede", center: [-2.3, -0.6], size: [0.8, 0.8] },
  { id: "vitrine-armillary", center: [2.3, -0.6], size: [0.9, 0.9] },
  { id: "vitrine-telescope", center: [-6.2, 1.0], size: [1.2, 1.2] },
  { id: "guard-desk", center: [3.6, 6.9], size: [1.7, 1.0] },
  { id: "desk-note", center: [11.6, -0.15], size: [1.9, 1.0] },
  { id: "safe", center: [13.6, -0.45], size: [0.8, 0.8] },
];
