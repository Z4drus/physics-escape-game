"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { TRANSITION } from "@/lib/motion";
import type { AnswerResult } from "@/features/game/state/useGameStore";
import type { Puzzle, RoomKey } from "@/types/game";

/**
 * Correction affichée après une réponse : la relation mise en jeu, le
 * raisonnement chiffré, et la clé obtenue le cas échéant.
 */
export function PuzzleVerdict({
  puzzle,
  result,
  reward,
  onRetry,
  onClose,
}: {
  puzzle: Puzzle;
  result: AnswerResult;
  reward: RoomKey;
  onRetry: () => void;
  onClose: () => void | Promise<void>;
}) {
  const isCorrect = result === "correct";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={TRANSITION.base}
      className="border-line border-t p-5"
    >
      {isCorrect ? (
        <>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="rounded-pill size-2"
              style={{
                backgroundColor: reward.color,
                boxShadow: `0 0 12px ${reward.color}`,
              }}
            />
            <p className="text-sky text-sm font-medium">
              Bonne réponse. {reward.label} récupérée.
            </p>
          </div>

          <p className="text-accent-soft mt-4 font-mono text-sm">
            {puzzle.formula}
          </p>
          <p className="text-ink-fade mt-2 text-sm">{puzzle.explanation}</p>
        </>
      ) : (
        <>
          <p className="text-amber text-sm font-medium">
            Ce n&apos;est pas la bonne réponse.
          </p>
          <p className="text-ink-fade mt-2 text-sm">
            Reprenez la relation en jeu et les unités de l&apos;énoncé, puis
            retentez : aucune pénalité.
          </p>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {isCorrect ? (
          <Button onClick={onClose} withArrow>
            Retourner dans la salle
          </Button>
        ) : (
          <>
            <Button onClick={onRetry}>Réessayer</Button>
            <Button variant="glass" size="md" onClick={onClose}>
              Quitter le poste
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
