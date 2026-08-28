"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import type { Puzzle } from "@/types/game";
import type { AnswerResult } from "@/features/game/state/useGameStore";

/**
 * Boîte de dialogue d'une énigme : énoncé, trois réponses, puis retour
 * détaillé. Les touches 1, 2 et 3 permettent de répondre au clavier.
 */
export function PuzzleDialog({
  puzzle,
  selectedAnswerId,
  answerResult,
  onAnswer,
  onRetry,
  onClose,
}: {
  puzzle: Puzzle;
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  onAnswer: (answerId: string) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [puzzle.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (answerResult) return;

      const index = Number.parseInt(event.key, 10) - 1;
      const answer = puzzle.answers[index];
      if (answer) {
        event.preventDefault();
        onAnswer(answer.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answerResult, onAnswer, onClose, puzzle.answers]);

  const isCorrect = answerResult === "correct";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-20 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="puzzle-question"
        tabIndex={-1}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0 }}
        className="panel-shadow bg-surface w-full max-w-xl rounded-[28px] p-2 outline-none"
      >
        <div className="bg-surface-raised rounded-[20px] p-6">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="text-accent font-display text-[11px] tracking-[0.2em] uppercase"
          >
            {puzzle.topic}
          </motion.p>

          <motion.h2
            id="puzzle-question"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="mt-3 text-lg leading-snug font-semibold sm:text-xl"
          >
            {puzzle.question}
          </motion.h2>

          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-6 flex flex-col gap-2"
          >
            {puzzle.answers.map((answer, index) => {
              const selected = selectedAnswerId === answer.id;
              const revealCorrect = isCorrect && selected;
              const revealWrong = answerResult === "wrong" && selected;

              return (
                <li key={answer.id}>
                  <button
                    type="button"
                    disabled={Boolean(answerResult)}
                    onClick={() => onAnswer(answer.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm",
                      "transition-[scale,background-color,box-shadow,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                      "bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.96]",
                      "disabled:cursor-default disabled:hover:bg-white/[0.04]",
                      revealCorrect &&
                        "bg-accent/15 text-accent disabled:hover:bg-accent/15 shadow-[inset_0_0_0_1px_var(--accent)]",
                      revealWrong &&
                        "text-danger bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] shadow-[inset_0_0_0_1px_var(--danger)]",
                    )}
                  >
                    <kbd
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-xl font-mono text-xs",
                        "text-muted bg-white/6",
                        revealCorrect && "bg-accent text-background",
                        revealWrong && "bg-danger text-background",
                      )}
                    >
                      {index + 1}
                    </kbd>
                    <span className="flex-1">{answer.label}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>

          <AnimatePresence initial={false} mode="wait">
            {answerResult ? (
              <motion.div
                key={answerResult}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                className="mt-5"
              >
                {isCorrect ? (
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-accent flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: puzzle.reward.color,
                          boxShadow: `0 0 10px ${puzzle.reward.color}`,
                        }}
                      />
                      Bonne réponse — {puzzle.reward.label} récupérée
                    </p>
                    <p className="text-muted mt-2 text-sm">
                      {puzzle.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="text-danger text-sm font-semibold">
                      Ce n&apos;est pas la bonne réponse.
                    </p>
                    <p className="text-muted mt-2 text-sm">
                      Reprenez la relation physique en jeu, puis retentez votre
                      chance : aucune pénalité.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {!isCorrect ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="bg-accent text-background h-11 flex-1 cursor-pointer rounded-2xl text-sm font-semibold transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent-strong)] active:scale-[0.96]"
                    >
                      Réessayer
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "h-11 flex-1 cursor-pointer rounded-2xl text-sm font-semibold",
                      "transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
                      isCorrect
                        ? "bg-accent text-background hover:bg-[var(--accent-strong)]"
                        : "bg-white/6 hover:bg-white/12",
                    )}
                  >
                    Retourner dans la salle
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted mt-5 text-xs"
              >
                Répondez avec la souris ou les touches 1, 2 et 3. Échap pour
                revenir dans la salle.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
