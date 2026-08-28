"use client";

import { cn } from "@/lib/cn";
import type { AnswerResult } from "@/features/game/state/useGameStore";
import type { PuzzleAnswer } from "@/types/game";

/**
 * Les trois propositions d'une question. Chaque ligne est séparée par un
 * filet plutôt que par un espace, et le fond apparaît au survol par une
 * transition de 450 ms — la micro-interaction de référence du système.
 */
export function AnswerList({
  answers,
  selectedAnswerId,
  answerResult,
  correctAnswerId,
  onAnswer,
}: {
  answers: readonly PuzzleAnswer[];
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  correctAnswerId: string;
  onAnswer: (answerId: string) => void;
}) {
  const revealed = answerResult === "correct";

  return (
    <ul className="flex flex-col">
      {answers.map((answer, index) => {
        const selected = selectedAnswerId === answer.id;
        const isCorrect = revealed && answer.id === correctAnswerId;
        const isWrong = answerResult === "wrong" && selected;

        return (
          <li key={answer.id} className="border-line border-t first:border-t-0">
            <button
              type="button"
              disabled={Boolean(answerResult)}
              onClick={() => onAnswer(answer.id)}
              className={cn(
                "group relative flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left",
                "ease-smooth transition-colors duration-[450ms]",
                "hover:bg-surface-raised focus-visible:bg-surface-raised",
                "disabled:cursor-default disabled:hover:bg-transparent",
                isCorrect && "bg-sky/12 disabled:hover:bg-sky/12",
                isWrong && "bg-amber/12",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-xs font-mono text-xs",
                  "outline-line-strong outline-1 outline-offset-[-1px]",
                  "ease-smooth transition-colors duration-[450ms]",
                  isCorrect && "bg-sky text-background outline-transparent",
                  isWrong && "bg-amber text-background outline-transparent",
                )}
              >
                {index + 1}
              </span>

              <span
                className={cn(
                  "flex-1 text-sm",
                  isCorrect && "text-sky",
                  isWrong && "text-amber",
                )}
              >
                {answer.label}
              </span>

              {/*
               * Le pictogramme distingue déjà les deux issues sans recourir à
               * la seule couleur ; le libellé masqué fait de même à l'oreille.
               */}
              {isCorrect ? (
                <>
                  <span className="sr-only">Bonne réponse</span>
                  <CheckGlyph />
                </>
              ) : null}
              {isWrong ? (
                <>
                  <span className="sr-only">Réponse incorrecte</span>
                  <CrossGlyph />
                </>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="text-sky size-4"
    >
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="text-amber size-4"
    >
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
