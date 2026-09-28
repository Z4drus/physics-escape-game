import type { Puzzle } from "@/types/game";

/**
 * Thème CHALEUR / THERMIQUE : trois questions de difficulté croissante, de
 * l'application directe de Q = m·c·ΔT au piège classique de la chaleur latente.
 * Sauf indication contraire dans l'énoncé, c(eau liquide) = 4180 J/(kg·K).
 * Leurs textes sont dans les messages, fichier `chaleur.json` de chaque langue.
 */
export const CHALEUR_PUZZLES: readonly Puzzle[] = [
  {
    id: "chaleur-chauffage-eau-becher",
    topic: "chaleur",
    correctAnswerId: "b",
    diagram: {
      kind: "water-heating-beaker",
      params: {
        masseEauKg: 0.5,
        temperatureInitialeC: 20,
        temperatureFinaleC: 80,
        capaciteThermiqueJParKgK: 4180,
      },
    },
    difficulty: 1,
  },
  {
    id: "chaleur-equilibre-melange-eau",
    topic: "chaleur",
    correctAnswerId: "c",
    diagram: {
      kind: "thermal-mixing-calorimeter",
      params: {
        masseFroideKg: 2,
        temperatureFroideC: 20,
        masseChaudeKg: 1,
        temperatureChaudeC: 80,
        capaciteThermiqueJParKgK: 4180,
      },
    },
    difficulty: 2,
  },
  {
    id: "chaleur-fusion-glace-latente",
    topic: "chaleur",
    correctAnswerId: "a",
    diagram: {
      kind: "ice-melting-beaker",
      params: {
        masseGlaceKg: 0.2,
        temperatureInitialeC: 0,
        temperatureFinaleC: 20,
        chaleurLatenteFusionJParKg: 334000,
        capaciteThermiqueJParKgK: 4180,
      },
    },
    difficulty: 3,
  },
];
