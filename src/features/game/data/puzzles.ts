import type { Puzzle } from "@/types/game";

/**
 * Énigmes de la salle. Chaque bonne réponse débloque une clé ; la porte
 * s'ouvre lorsque toutes les clés sont réunies.
 */
export const PUZZLES: readonly Puzzle[] = [
  {
    id: "pendulum",
    topic: "Oscillateurs — pendule simple",
    question:
      "On double la longueur du fil d'un pendule simple. Par combien sa période d'oscillation est-elle multipliée ?",
    answers: [
      { id: "a", label: "Par 2" },
      { id: "b", label: "Par √2 ≈ 1,41" },
      { id: "c", label: "Par 4" },
    ],
    correctAnswerId: "b",
    explanation:
      "La période vaut T = 2π√(L/g) : elle dépend de la racine carrée de la longueur. Doubler L multiplie donc T par √2.",
    reward: { id: "key-pendulum", label: "Clé du pendule", color: "#4ee1c1" },
  },
  {
    id: "incline",
    topic: "Mécanique — chute sur plan incliné",
    question:
      "Deux billes de masses différentes sont lâchées en même temps du haut d'un plan incliné sans frottement. Laquelle atteint le bas en premier ?",
    answers: [
      { id: "a", label: "La plus lourde" },
      { id: "b", label: "La plus légère" },
      { id: "c", label: "Elles arrivent en même temps" },
    ],
    correctAnswerId: "c",
    explanation:
      "Sans frottement, l'accélération vaut a = g·sin(α) : la masse se simplifie dans la deuxième loi de Newton. Les deux billes arrivent ensemble.",
    reward: {
      id: "key-incline",
      label: "Clé du plan incliné",
      color: "#f5b544",
    },
  },
  {
    id: "circuit",
    topic: "Électricité — résistances en parallèle",
    question:
      "Deux résistances de 6 Ω sont branchées en parallèle. Quelle est la résistance équivalente du dipôle ?",
    answers: [
      { id: "a", label: "12 Ω" },
      { id: "b", label: "6 Ω" },
      { id: "c", label: "3 Ω" },
    ],
    correctAnswerId: "c",
    explanation:
      "En parallèle, 1/Req = 1/R₁ + 1/R₂ = 1/6 + 1/6 = 1/3, donc Req = 3 Ω : deux résistances identiques en parallèle valent la moitié de l'une d'elles.",
    reward: { id: "key-circuit", label: "Clé du circuit", color: "#7db4ff" },
  },
  {
    id: "spring",
    topic: "Oscillateurs — système masse-ressort",
    question:
      "On quadruple la masse accrochée à un ressort vertical. Par combien la période des oscillations est-elle multipliée ?",
    answers: [
      { id: "a", label: "Par 4" },
      { id: "b", label: "Par 2" },
      { id: "c", label: "Elle ne change pas" },
    ],
    correctAnswerId: "b",
    explanation:
      "La période vaut T = 2π√(m/k). Multiplier m par 4 multiplie T par √4 = 2.",
    reward: { id: "key-spring", label: "Clé du ressort", color: "#c58bff" },
  },
  {
    id: "lever",
    topic: "Statique — équilibre d'un levier",
    question:
      "Une masse de 2 kg est posée à 30 cm du pivot d'un levier. À quelle distance du pivot faut-il placer 3 kg pour équilibrer la balance ?",
    answers: [
      { id: "a", label: "20 cm" },
      { id: "b", label: "45 cm" },
      { id: "c", label: "15 cm" },
    ],
    correctAnswerId: "a",
    explanation:
      "L'équilibre des moments impose m₁·d₁ = m₂·d₂, soit 2 × 30 = 3 × d₂ et donc d₂ = 20 cm.",
    reward: { id: "key-lever", label: "Clé du levier", color: "#f4736b" },
  },
];

/** Index par identifiant pour un accès direct depuis le store et la scène. */
export const PUZZLES_BY_ID: ReadonlyMap<string, Puzzle> = new Map(
  PUZZLES.map((puzzle) => [puzzle.id, puzzle]),
);

/** Nombre de clés nécessaires pour ouvrir la porte de sortie. */
export const TOTAL_KEYS = PUZZLES.length;
