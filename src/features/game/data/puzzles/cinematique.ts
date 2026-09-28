import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Cinématique : MRU / MRUA ».
 * Une question par niveau de difficulté : lecture d'un graphique x(t) en
 * mouvement rectiligne uniforme, chute libre, puis distance de freinage.
 * Leurs textes sont dans les messages, sous `puzzles.<id>`, dans
 * `i18n/messages/<langue>/cinematique.json`.
 */
export const CINEMATIQUE_PUZZLES: readonly Puzzle[] = [
  {
    id: "cinematique-mru-graphique-vitesse",
    topic: "cinematique",
    correctAnswerId: "b",
    diagram: {
      kind: "uniform-motion-rail",
      params: {
        x1: 0.8,
        t1: 1,
        x2: 3.2,
        t2: 5,
        v: 0.6,
        railLength: 3.6,
        markerInterval: 1,
      },
    },
    difficulty: 1,
  },
  {
    id: "cinematique-chute-libre-profondeur",
    topic: "cinematique",
    correctAnswerId: "c",
    diagram: {
      kind: "free-fall-well",
      params: {
        g: 9.81,
        t: 1.5,
        h: 11.04,
        vFinale: 14.7,
        markerInterval: 0.25,
      },
    },
    difficulty: 2,
  },
  {
    id: "cinematique-distance-freinage",
    topic: "cinematique",
    correctAnswerId: "a",
    diagram: {
      kind: "braking-distance-track",
      params: {
        v0KmH: 72,
        v0: 20,
        a: -5,
        distance: 40,
        duree: 4,
        markerInterval: 0.5,
      },
    },
    difficulty: 3,
  },
];
