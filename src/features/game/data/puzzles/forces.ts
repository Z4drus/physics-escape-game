import type { Puzzle } from "@/types/game";

/**
 * Thème « Forces » : pesanteur (poids et masse), force de soutien sur un plan
 * incliné, poussée d'Archimède et flottaison.
 *
 * Les trois questions couvrent les trois niveaux de difficulté : application
 * directe, raisonnement avec projection, puis piège sur le volume immergé.
 */
export const FORCES_PUZZLES: readonly Puzzle[] = [
  {
    id: "forces-poids-caisse-etabli",
    topic: "forces",
    scenario:
      "Une caisse à outils de 5,0 kg est posée, immobile, sur l'établi du laboratoire, où l'intensité de la pesanteur vaut g = 9,81 m/s².",
    question: "Quelle est l'intensité du poids de cette caisse ?",
    answers: [
      { id: "a", label: "5,0 N" },
      { id: "b", label: "49,1 N" },
      { id: "c", label: "0,51 N" },
    ],
    correctAnswerId: "b",
    explanation:
      "Le poids est la force exercée par la pesanteur sur un corps : P = m · g, avec m en kilogrammes et g en mètres par seconde carrée. Ici P = 5,0 × 9,81 = 49,05 N, soit 49,1 N. La masse (5,0 kg) et le poids (49,1 N) sont deux grandeurs distinctes : la masse ne change pas d'un astre à l'autre, le poids si.",
    formula: "P = m · g",
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
    scenario:
      "Une caisse de 20 kg reste immobile sur une rampe inclinée de 30° par rapport à l'horizontale, bloquée par un taquet fixé en bas de la pente.",
    question:
      "Quelle est l'intensité de la force de soutien exercée par la rampe sur la caisse (g = 9,81 m/s²) ?",
    answers: [
      { id: "a", label: "196 N" },
      { id: "b", label: "98,1 N" },
      { id: "c", label: "170 N" },
    ],
    correctAnswerId: "c",
    explanation:
      "La force de soutien est toujours perpendiculaire à la surface d'appui : elle ne compense que la composante du poids perpendiculaire au plan, soit N = m · g · cos α. Ici P = 20 × 9,81 = 196,2 N, puis N = 196,2 × cos 30° = 169,9 N, soit 170 N. La force de soutien n'est égale au poids que sur un plan horizontal (α = 0°) ; l'autre composante, m · g · sin α = 98,1 N, est retenue par le taquet.",
    formula: "N = m · g · cos α",
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
    scenario:
      "Un cube de bois de 20 cm d'arête et de 4,8 kg flotte à la surface de l'eau d'un aquarium, une partie du cube dépassant hors de l'eau.",
    question:
      "Quelle est l'intensité de la poussée d'Archimède exercée par l'eau sur ce cube (ρ_eau = 1000 kg/m³, g = 9,81 m/s²) ?",
    answers: [
      { id: "a", label: "47,1 N" },
      { id: "b", label: "78,5 N" },
      { id: "c", label: "31,4 N" },
    ],
    correctAnswerId: "a",
    explanation:
      "La poussée d'Archimède ne dépend que du volume réellement immergé : F_A = ρ_eau · g · V_immergé. Le cube flottant est en équilibre, donc F_A compense son poids : F_A = P = 4,8 × 9,81 = 47,1 N, ce qui correspond à V_immergé = 4,8 / 1000 = 4,8 × 10⁻³ m³, soit 60 % des 8,0 × 10⁻³ m³ du cube. Prendre le volume total donnerait 1000 × 9,81 × 8,0 × 10⁻³ = 78,5 N, valeur atteinte seulement si l'on enfonçait entièrement le cube.",
    formula: "F_A = ρ_fluide · g · V_immergé",
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
