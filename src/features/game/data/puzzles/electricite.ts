import type { Puzzle } from "@/types/game";

/**
 * Énigmes du thème « Électricité ».
 * Trois questions de difficulté croissante : loi d'Ohm (application directe),
 * puissance et énergie consommée (raisonnement en deux étapes), puis
 * association en parallèle et répartition des intensités (piège classique).
 */
export const ELECTRICITE_PUZZLES: readonly Puzzle[] = [
  {
    id: "electricite-loi-ohm-tension",
    topic: "electricite",
    scenario:
      "Sur le banc d'essai, une résistance de 220 Ω est branchée seule aux bornes d'une alimentation réglable et l'ampèremètre du circuit indique 0,25 A.",
    question:
      "Quelle tension l'alimentation impose-t-elle aux bornes de cette résistance ?",
    answers: [
      { id: "a", label: "880 V" },
      { id: "b", label: "55 V" },
      { id: "c", label: "13,75 V" },
    ],
    correctAnswerId: "b",
    explanation:
      "La loi d'Ohm relie la tension aux bornes d'un conducteur ohmique à l'intensité qui le traverse : U = R · I = 220 × 0,25 = 55 V. Diviser au lieu de multiplier donne 220 / 0,25 = 880 V, et utiliser R · I² = 220 × 0,25² = 13,75 revient à calculer une puissance en watts, pas une tension.",
    formula: "U = R · I",
    diagram: {
      kind: "ohm-law-circuit",
      params: { R: 220, I: 0.25, U: 55 },
    },
    difficulty: 1,
  },
  {
    id: "electricite-puissance-energie-kwh",
    topic: "electricite",
    scenario:
      "Un radiateur électrique est branché sur le secteur à 230 V et la pince ampèremétrique posée sur son câble d'alimentation lit 8,0 A.",
    question:
      "Quelle énergie électrique ce radiateur consomme-t-il pendant 2,5 h de fonctionnement, exprimée en kWh ?",
    answers: [
      { id: "a", label: "4600 kWh" },
      { id: "b", label: "0,072 kWh" },
      { id: "c", label: "4,6 kWh" },
    ],
    correctAnswerId: "c",
    explanation:
      "La puissance vaut P = U · I = 230 × 8,0 = 1840 W, soit 1,84 kW. L'énergie est E = P · t = 1,84 × 2,5 = 4,6 kWh. Oublier de convertir les watts en kilowatts conduit à 1840 × 2,5 = 4600 kWh, et poser P = U / I = 28,75 W donne à tort 0,072 kWh.",
    formula: "P = U · I  et  E = P · t",
    diagram: {
      kind: "power-appliance-circuit",
      params: { U: 230, I: 8, P: 1840, t: 2.5, E: 4.6 },
    },
    difficulty: 2,
  },
  {
    id: "electricite-parallele-intensite-totale",
    topic: "electricite",
    scenario:
      "Deux résistances, R₁ = 30 Ω et R₂ = 60 Ω, sont montées côte à côte en dérivation entre les deux mêmes nœuds, alimentés par une pile de 12 V.",
    question:
      "Quelle est l'intensité totale du courant débité par la pile dans ce montage ?",
    answers: [
      { id: "a", label: "0,60 A" },
      { id: "b", label: "0,13 A" },
      { id: "c", label: "0,40 A" },
    ],
    correctAnswerId: "a",
    explanation:
      "En parallèle, 1/R = 1/30 + 1/60 = 3/60, donc R = 20 Ω et I = U / R = 12 / 20 = 0,60 A. On retrouve ce résultat en additionnant les branches : I₁ = 12/30 = 0,40 A et I₂ = 12/60 = 0,20 A. Additionner les résistances comme en série donnerait 12/90 = 0,13 A, et 0,40 A n'est que le courant de la branche R₁, pas celui de la pile.",
    formula: "1/R = 1/R₁ + 1/R₂  et  I = I₁ + I₂",
    diagram: {
      kind: "parallel-resistors-circuit",
      params: { U: 12, R1: 30, R2: 60, Req: 20, I: 0.6, I1: 0.4, I2: 0.2 },
    },
    difficulty: 3,
  },
];
