import type { Station } from "@/types/game";

/**
 * Les six postes du musée, un par thème de physique. Quatre dans la galerie,
 * deux dans le cabinet du conservateur. Leurs noms et ceux de leurs sceaux
 * sont dans les messages, sous `museum.stations` et `museum.seals`.
 *
 * `footprint` est exprimée en repère MONDE (jamais tournée par `rotationY`) :
 * c'est elle qui alimente les collisions, qui sont alignées sur les axes.
 * `rotationY` n'oriente que le modèle 3D.
 */
export const STATIONS: readonly Station[] = [
  {
    id: "force-table",
    topic: "forces",
    kind: "force-table",
    roomId: "gallery",
    position: [-5.3, 0, -2.6],
    rotationY: 0.45,
    footprint: [2.3, 1.7],
    reward: { id: "seal-forces", color: "#d9a441" },
  },
  {
    id: "air-rail",
    topic: "cinematique",
    kind: "air-rail",
    roomId: "gallery",
    position: [5.2, 0, -2.8],
    rotationY: -0.45,
    footprint: [3.2, 1.6],
    reward: {
      id: "seal-cinematique",
      color: "#b98ee6",
    },
  },
  {
    id: "circuit-bench",
    topic: "electricite",
    kind: "circuit-bench",
    roomId: "gallery",
    position: [-5.3, 0, 4.2],
    rotationY: 2.6,
    footprint: [2.2, 1.6],
    reward: {
      id: "seal-electricite",
      color: "#f2c94c",
    },
    gate: "power",
  },
  {
    id: "energy-track",
    topic: "energie",
    kind: "energy-track",
    roomId: "gallery",
    position: [5.6, 0, 5.4],
    rotationY: -Math.PI / 2,
    footprint: [1.6, 2.6],
    reward: {
      id: "seal-energie",
      color: "#7cc98a",
    },
    gate: "energy-case",
  },
  {
    id: "pressure-bench",
    topic: "pression",
    kind: "pressure-bench",
    roomId: "cabinet",
    position: [13.3, 0, 2.6],
    rotationY: -Math.PI / 2,
    footprint: [1.5, 2.1],
    reward: {
      id: "seal-pression",
      color: "#5ec3c9",
    },
  },
  {
    id: "calorimeter",
    topic: "chaleur",
    kind: "calorimeter",
    roomId: "cabinet",
    position: [9.5, 0, 0.2],
    rotationY: Math.PI,
    footprint: [1.7, 1.5],
    reward: {
      id: "seal-chaleur",
      color: "#e9744f",
    },
  },
];

/** Accès direct à un poste par son identifiant. */
export const STATIONS_BY_ID: ReadonlyMap<string, Station> = new Map(
  STATIONS.map((station) => [station.id, station]),
);

/** Nombre de sceaux nécessaires pour ouvrir la porte finale. */
export const TOTAL_SEALS = STATIONS.length;
