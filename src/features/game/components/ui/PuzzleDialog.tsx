"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { AnswerList } from "@/features/game/components/ui/AnswerList";
import { PuzzleVerdict } from "@/features/game/components/ui/PuzzleVerdict";
import { DiagramViewer } from "@/features/game/components/diagrams/DiagramViewer";
import { TOPIC_LABELS } from "@/features/game/data/puzzles";
import { useFocusTrap } from "@/features/game/hooks/useFocusTrap";
import type { AnswerResult } from "@/features/game/state/useGameStore";
import { cn } from "@/lib/cn";
import { TRANSITION, revealAt } from "@/lib/motion";
import type { Puzzle, PuzzleAnswer, RoomKey } from "@/types/game";

/**
 * Boîte de dialogue d'un poste : le schéma 3D animé de la situation à gauche,
 * l'énoncé et les propositions à droite. Les touches 1, 2 et 3 répondent au
 * clavier, Échap referme le poste.
 */
export function PuzzleDialog({
  puzzle,
  answers,
  stationLabel,
  reward,
  selectedAnswerId,
  answerResult,
  onAnswer,
  onRetry,
  onClose,
}: {
  puzzle: Puzzle;
  /** Propositions dans leur ordre d'affichage, tiré à l'ouverture du poste. */
  answers: readonly PuzzleAnswer[];
  stationLabel: string;
  reward: RoomKey;
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  onAnswer: (answerId: string) => void;
  onRetry: () => void;
  onClose: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [diagramExpanded, setDiagramExpanded] = useState(false);

  // La tabulation reste dans la boîte de dialogue. Quand le schéma agrandi
  // passe devant, son propre piège se place au-dessus de celui-ci.
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [puzzle.id]);

  /*
   * Après une réponse, le bouton qui portait le focus vient d'être désactivé :
   * le focus retomberait sur le corps du document. On le ramène sur la boîte
   * de dialogue pour que la tabulation reprenne sur la correction.
   */
  useEffect(() => {
    if (answerResult) dialogRef.current?.focus();
  }, [answerResult]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Le schéma agrandi passe devant : il gère lui-même ses raccourcis.
      if (diagramExpanded) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (answerResult) return;

      const index = Number.parseInt(event.key, 10) - 1;
      const answer = answers[index];
      if (answer) {
        event.preventDefault();
        onAnswer(answer.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answerResult, answers, diagramExpanded, onAnswer, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.micro}
      className="scrim fixed inset-0 z-20 grid place-items-center p-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="puzzle-question"
        tabIndex={-1}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={TRANSITION.base}
        className="glass w-full max-w-6xl rounded-xl p-2 outline-none"
      >
        <div className="bg-background-deep max-h-[88dvh] overflow-hidden rounded-lg">
          <header className="border-line flex items-center justify-between gap-4 border-b px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Eyebrow>{TOPIC_LABELS[puzzle.topic]}</Eyebrow>
              <span aria-hidden className="bg-line-strong h-3.5 w-px" />
              <p className="text-ink-mute text-xs">{stationLabel}</p>
            </div>

            <div className="flex items-center gap-3">
              <DifficultyMeter level={puzzle.difficulty} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le poste"
                className="text-ink-mute hover:text-ink hover:bg-surface-raised ease-smooth tap-target grid size-10 cursor-pointer place-items-center rounded-sm transition-colors duration-[200ms]"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className="size-4"
                >
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </header>

          <div className="grid max-h-[calc(88dvh-3.5rem)] overflow-y-auto overscroll-contain lg:grid-cols-[1.3fr_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(0, 0.05)}
              className="border-line border-b p-5 lg:border-r lg:border-b-0"
            >
              <p className="text-ink-fade mb-4 text-sm">{puzzle.scenario}</p>
              <DiagramViewer
                spec={puzzle.diagram}
                caption={puzzle.scenario}
                expanded={diagramExpanded}
                onExpandedChange={setDiagramExpanded}
              />
            </motion.section>

            <section className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(1, 0.05)}
                className="border-line border-b p-5"
              >
                <h2 id="puzzle-question" className="text-xl">
                  {puzzle.question}
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(2, 0.05)}
              >
                <AnswerList
                  answers={answers}
                  selectedAnswerId={selectedAnswerId}
                  answerResult={answerResult}
                  correctAnswerId={puzzle.correctAnswerId}
                  onAnswer={onAnswer}
                />
              </motion.div>

              <AnimatePresence initial={false} mode="wait">
                {answerResult ? (
                  <PuzzleVerdict
                    key={answerResult}
                    puzzle={puzzle}
                    result={answerResult}
                    reward={reward}
                    onRetry={onRetry}
                    onClose={onClose}
                  />
                ) : (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={TRANSITION.micro}
                    className="text-ink-mute border-line mt-auto border-t px-5 py-4 text-xs"
                  >
                    Répondez à la souris ou avec les touches 1, 2 et 3. Échap
                    pour quitter le poste.
                  </motion.p>
                )}
              </AnimatePresence>
            </section>
          </div>
        </div>

        {/*
         * Région d'annonce montée en permanence : une région insérée en même
         * temps que son contenu n'est pas restituée de façon fiable.
         */}
        <p className="sr-only" aria-live="polite">
          {answerResult === "correct"
            ? `Bonne réponse. ${reward.label} récupérée.`
            : answerResult === "wrong"
              ? "Réponse incorrecte. Vous pouvez retenter sans pénalité."
              : ""}
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Trois barres indiquant le niveau d'exigence de la question. */
function DifficultyMeter({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div
      className="flex items-end gap-0.5"
      role="img"
      title={`Difficulté ${level} sur 3`}
      aria-label={`Difficulté ${level} sur 3`}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-[1px]",
            index === 0 && "h-2",
            index === 1 && "h-3",
            index === 2 && "h-4",
            index < level ? "bg-accent-soft" : "bg-ink-mute",
          )}
        />
      ))}
    </div>
  );
}
