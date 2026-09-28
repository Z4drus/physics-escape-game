import type { Puzzle } from "@/types/game";

/**
 * Thème « Forces » : pesanteur (poids et masse), force de soutien sur un plan
 * incliné, poussée d'Archimède et flottaison.
 *
 * Les trois questions couvrent les trois niveaux de difficulté : application
 * directe, raisonnement avec projection, puis piège sur le volume immergé.
 * Leurs textes sont dans les messages, sous `puzzles.<id>`, dans
 * `i18n/messages/<langue>/forces.json`.
 */
export const FORCES_PUZZLES: readonly Puzzle[] = [
  {
    id: "forces-poids-caisse-etabli",
    topic: "forces",
    correctAnswerId: "b",
    diagram: {
      kind: "weight-crate-bench",
      params: {
        masse_kg: 5,
        g_m_s2: 9.81,
        poids_N: 49.1,
      },
    },
    difficulty: 1,
  },
  {
    id: "forces-soutien-plan-incline",
    topic: "forces",
    correctAnswerId: "c",
    diagram: {
      kind: "incline-normal-force",
      params: {
        masse_kg: 20,
        angle_deg: 30,
        g_m_s2: 9.81,
        poids_N: 196.2,
        soutien_N: 169.9,
        composante_parallele_N: 98.1,
      },
    },
    difficulty: 2,
  },
  {
    id: "forces-archimede-cube-flottant",
    topic: "forces",
    correctAnswerId: "a",
    diagram: {
      kind: "buoyancy-floating-cube",
      params: {
        arete_m: 0.2,
        masse_kg: 4.8,
        masse_volumique_eau_kg_m3: 1000,
        g_m_s2: 9.81,
        volume_total_m3: 0.008,
        volume_immerge_m3: 0.0048,
        hauteur_immergee_m: 0.12,
        poussee_N: 47.1,
        poids_N: 47.1,
      },
    },
    difficulty: 3,
  },
];
