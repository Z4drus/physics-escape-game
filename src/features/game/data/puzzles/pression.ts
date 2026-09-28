import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Pression » : définition p = F/S, pression
 * hydrostatique et principe de Pascal. Une question par niveau de difficulté.
 * Leurs textes sont dans les messages, fichier `pression.json` de chaque
 * langue ; les schémas composent eux-mêmes leurs légendes à partir des
 * grandeurs numériques ci-dessous.
 */
export const PRESSION_PUZZLES: readonly Puzzle[] = [
  {
    id: "pression-caisse-au-sol",
    topic: "pression",
    correctAnswerId: "c",
    diagram: {
      kind: "pressure-box-on-ground",
      params: {
        forceN: 600,
        contactWidthM: 0.5,
        contactDepthM: 0.4,
        boxHeightM: 0.35,
        contactAreaM2: 0.2,
      },
    },
    difficulty: 1,
  },
  {
    id: "pression-fond-du-bassin",
    topic: "pression",
    correctAnswerId: "a",
    diagram: {
      kind: "hydrostatic-column",
      params: {
        densityKgPerM3: 1000,
        gravityMPerS2: 9.81,
        depthM: 2.5,
        tankWidthM: 1.2,
        tankDepthM: 0.8,
      },
    },
    difficulty: 2,
  },
  {
    id: "pression-presse-hydraulique",
    topic: "pression",
    correctAnswerId: "b",
    diagram: {
      kind: "hydraulic-press",
      params: {
        smallPistonDiameterM: 0.04,
        largePistonDiameterM: 0.2,
        inputForceN: 150,
        areaRatio: 25,
      },
    },
    difficulty: 3,
  },
];
