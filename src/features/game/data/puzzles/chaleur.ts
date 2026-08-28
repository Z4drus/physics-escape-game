import type { Puzzle } from "@/types/game";

/**
 * Thème CHALEUR / THERMIQUE : trois questions de difficulté croissante, de
 * l'application directe de Q = m·c·ΔT au piège classique de la chaleur latente.
 * Sauf indication contraire dans l'énoncé, c(eau liquide) = 4180 J/(kg·K).
 */
export const CHALEUR_PUZZLES: readonly Puzzle[] = [
  {
    id: "chaleur-chauffage-eau-becher",
    topic: "chaleur",
    scenario:
      "Un bécher contenant 0,50 kg d'eau est posé sur une plaque chauffante et le thermomètre qui y plonge grimpe lentement de 20 °C à 80 °C.",
    question:
      "Quelle énergie thermique la plaque doit-elle fournir à l'eau pour la faire passer de 20 °C à 80 °C ? On donne c(eau) = 4180 J/(kg·K) et on néglige toute perte vers l'extérieur.",
    answers: [
      { id: "a", label: "167,2 kJ" },
      { id: "b", label: "125,4 kJ" },
      { id: "c", label: "696,0 kJ" },
    ],
    correctAnswerId: "b",
    explanation:
      "Seul l'écart de température intervient : ΔT = 80 − 20 = 60 °C, ce qui vaut exactement 60 K puisqu'un écart de 1 °C est un écart de 1 K. On obtient Q = 0,50 × 4180 × 60 = 125 400 J ≈ 125,4 kJ. Prendre la température finale au lieu de l'écart donnerait 0,50 × 4180 × 80 = 167,2 kJ, et convertir seulement la température finale en kelvins (353 − 20 = 333) donnerait 696,0 kJ.",
    formula: "Q = m · c · ΔT",
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
    scenario:
      "Dans un calorimètre, on verse 2,0 kg d'eau à 20 °C sur 1,0 kg d'eau à 80 °C, puis on referme le couvercle et on attend que le thermomètre se stabilise.",
    question:
      "Quelle température d'équilibre le thermomètre finit-il par indiquer ? Le calorimètre est parfaitement isolant et sa propre capacité thermique est négligeable.",
    answers: [
      { id: "a", label: "50 °C" },
      { id: "b", label: "60 °C" },
      { id: "c", label: "40 °C" },
    ],
    correctAnswerId: "c",
    explanation:
      "L'eau chaude cède exactement l'énergie que l'eau froide reçoit : m₁·c·(T_f − 20) + m₂·c·(T_f − 80) = 0, où la capacité thermique c se simplifie car les deux liquides sont de l'eau. La température d'équilibre est donc la moyenne pondérée par les masses : T_f = (2,0 × 20 + 1,0 × 80) / (2,0 + 1,0) = 120 / 3 = 40 °C. La moyenne arithmétique 50 °C oublie que la masse froide est deux fois plus grande, et 60 °C revient à intervertir les deux masses.",
    formula: "m₁ · c · (T_f − T₁) + m₂ · c · (T_f − T₂) = 0",
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
    scenario:
      "Un bloc de 200 g de glace à 0 °C fond dans une casserole chauffée, et le thermomètre reste bloqué sur 0 °C pendant toute la fonte avant de recommencer à monter.",
    question:
      "Quelle énergie totale faut-il fournir pour transformer ces 200 g de glace à 0 °C en eau liquide à 20 °C ? On donne L_f(glace) = 334 000 J/kg et c(eau liquide) = 4180 J/(kg·K).",
    answers: [
      { id: "a", label: "83,5 kJ" },
      { id: "b", label: "16,7 kJ" },
      { id: "c", label: "66,8 kJ" },
    ],
    correctAnswerId: "a",
    explanation:
      "Le chauffage se fait en deux étapes : la fusion, à température constante, coûte Q₁ = 0,200 × 334 000 = 66 800 J, puis le réchauffement de l'eau obtenue coûte Q₂ = 0,200 × 4180 × 20 = 16 720 J. Le total vaut Q = 66 800 + 16 720 = 83 520 J ≈ 83,5 kJ. Ne compter que Q₂ (16,7 kJ) revient à oublier la chaleur latente, et s'arrêter à Q₁ (66,8 kJ) laisse l'eau à 0 °C au lieu de 20 °C.",
    formula: "Q = m · L_f + m · c · ΔT",
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
