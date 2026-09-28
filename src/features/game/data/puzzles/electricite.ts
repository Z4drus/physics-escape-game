import type { Puzzle } from "@/types/game";

/**
 * Énigmes du thème « Électricité ».
 * Trois questions de difficulté croissante : loi d'Ohm (application directe),
 * puissance et énergie consommée (raisonnement en deux étapes), puis
 * association en parallèle et répartition des intensités (piège classique).
 * Leurs textes sont dans les messages, sous `puzzles.<id>`, dans
 * `i18n/messages/<langue>/electricite.json`.
 */
export const ELECTRICITE_PUZZLES: readonly Puzzle[] = [
  {
    id: "electricite-loi-ohm-tension",
    topic: "electricite",
    correctAnswerId: "b",
    diagram: {
      kind: "ohm-law-circuit",
      params: { R: 220, I: 0.25, U: 55 },
    },
    difficulty: 1,
  },
  {
    id: "electricite-puissance-energie-kwh",
    topic: "electricite",
    correctAnswerId: "c",
    diagram: {
      kind: "power-appliance-circuit",
      params: { U: 230, I: 8, P: 1840, t: 2.5, E: 4.6 },
    },
    difficulty: 2,
  },
  {
    id: "electricite-parallele-intensite-totale",
    topic: "electricite",
    correctAnswerId: "a",
    diagram: {
      kind: "parallel-resistors-circuit",
      params: { U: 12, R1: 30, R2: 60, Req: 20, I: 0.6, I1: 0.4, I2: 0.2 },
    },
    difficulty: 3,
  },
];
