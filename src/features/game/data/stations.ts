import type { Station } from "@/types/game";

/**
 * Les six postes de la salle, un par thème de physique.
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
    label: "Table des forces",
    position: [-4.9, 0, -4.4],
    rotationY: 0.34,
    footprint: [2.2, 1.5],
    reward: { id: "key-forces", label: "Clé des forces", color: "#7db4ff" },
  },
  {
    id: "air-rail",
    topic: "cinematique",
    kind: "air-rail",
    label: "Rail à coussin d'air",
    position: [4.7, 0, -4.4],
    rotationY: -0.34,
    footprint: [3.2, 1.3],
    reward: {
      id: "key-cinematique",
      label: "Clé de la cinématique",
      color: "#c58bff",
    },
  },
  {
    id: "pressure-bench",
    topic: "pression",
    kind: "pressure-bench",
    label: "Banc de pression",
    position: [-5.5, 0, 0.3],
    rotationY: Math.PI / 2,
    footprint: [1.5, 2.1],
    reward: {
      id: "key-pression",
      label: "Clé de la pression",
      color: "#45d9e8",
    },
  },
  {
    id: "energy-track",
    topic: "energie",
    kind: "energy-track",
    label: "Piste d'énergie",
    position: [5.5, 0, 0.3],
    rotationY: -Math.PI / 2,
    footprint: [1.5, 2.5],
    reward: { id: "key-energie", label: "Clé de l'énergie", color: "#6ee787" },
  },
  {
    id: "circuit-bench",
    topic: "electricite",
    kind: "circuit-bench",
    label: "Banc d'électricité",
    position: [-4.7, 0, 4.6],
    rotationY: 2.62,
    footprint: [2.1, 1.4],
    reward: {
      id: "key-electricite",
      label: "Clé de l'électricité",
      color: "#ffd24a",
    },
  },
  {
    id: "calorimeter",
    topic: "chaleur",
    kind: "calorimeter",
    label: "Calorimètre",
    position: [4.7, 0, 4.6],
    rotationY: -2.62,
    footprint: [1.7, 1.5],
    reward: { id: "key-chaleur", label: "Clé de la chaleur", color: "#ff7a5c" },
  },
];

/** Accès direct à une station par son identifiant. */
export const STATIONS_BY_ID: ReadonlyMap<string, Station> = new Map(
  STATIONS.map((station) => [station.id, station]),
);

/** Nombre de clés nécessaires pour ouvrir la porte de sortie. */
export const TOTAL_KEYS = STATIONS.length;
