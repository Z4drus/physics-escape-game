import { useTranslations, type Messages } from "next-intl";

import type { AnswerId, Puzzle } from "@/types/game";

type PuzzleKey = keyof Messages["puzzles"];

/** Textes d'une question, dans la langue active. */
export interface PuzzleCopy {
  /** Mise en situation en une phrase, affichée au-dessus du schéma. */
  scenario: string;
  question: string;
  /** Correction : le raisonnement et le calcul, en deux ou trois phrases. */
  explanation: string;
  /** Relation mise en jeu, affichée en évidence dans la correction. */
  formula: string;
  answer: (answerId: AnswerId) => string;
}

/**
 * Textes d'une question, lus sous `puzzles.<id>` dans le fichier de messages
 * de son thème.
 */
export function usePuzzleCopy(puzzle: Puzzle): PuzzleCopy {
  const t = useTranslations("puzzles");
  // Les identifiants viennent des données, typés `string` : ils sont rattachés
  // ici, en un seul endroit, aux clés connues des messages.
  const key = puzzle.id as PuzzleKey;

  return {
    scenario: t(`${key}.scenario`),
    question: t(`${key}.question`),
    explanation: t(`${key}.explanation`),
    formula: t(`${key}.formula`),
    answer: (answerId) => t(`${key}.answers.${answerId}`),
  };
}
