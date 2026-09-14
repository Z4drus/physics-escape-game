"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dial } from "@/components/ui/Dial";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CloseButton, ModalShell } from "@/components/ui/ModalShell";
import { INVENTORY_ITEMS } from "@/features/game/data/clues";
import { TRANSITION, revealAt } from "@/lib/motion";

/**
 * Coffre-fort du conservateur : trois molettes, une poignée. Une combinaison
 * fausse compte une erreur ; la bonne ouvre la porte et montre le contenu.
 */
export function SafeDialog({
  hintRevealed,
  onSubmit,
  onClose,
}: {
  /** Le message UV a été lu : on rappelle la nature de la combinaison. */
  hintRevealed: boolean;
  onSubmit: (value: number) => boolean;
  onClose: () => void | Promise<void>;
}) {
  const [digits, setDigits] = useState([0, 0, 0]);
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "open">("idle");

  const submit = () => {
    if (feedback === "open") return;
    const value = digits[0] * 100 + digits[1] * 10 + digits[2];
    setFeedback(onSubmit(value) ? "open" : "wrong");
  };

  return (
    <ModalShell labelledBy="safe-title" onClose={onClose} maxWidth="max-w-lg">
      <header className="border-line flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div>
          <Eyebrow>Cabinet du conservateur</Eyebrow>
          <h2 id="safe-title" className="mt-1 text-2xl">
            Coffre-fort
          </h2>
        </div>
        <CloseButton onClick={onClose} label="Laisser le coffre" />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {feedback === "open" ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITION.base}
            className="px-5 py-6"
          >
            <p className="text-positive text-sm font-medium">
              La poignée tourne. Le coffre est ouvert.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {(["fuse", "case-key"] as const).map((id, index) => (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={revealAt(index, 0.1)}
                  className="glass flex items-center gap-3 rounded-md px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="rounded-pill size-2 shrink-0"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      boxShadow: "0 0 10px var(--accent-soft)",
                    }}
                  />
                  <span className="text-sm">
                    <span className="font-medium">
                      {INVENTORY_ITEMS[id].label}
                    </span>
                    <span className="text-ink-mute block text-xs">
                      {INVENTORY_ITEMS[id].description}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-5">
              <Button onClick={onClose} withArrow>
                Emporter et refermer
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITION.base}
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(0, 0.05)}
              className="text-ink-fade px-5 pt-5 text-sm"
            >
              {hintRevealed
                ? "Trois chiffres : l'énergie potentielle, en joules, révélée sur le mur. Le carnet la rappelle."
                : "Trois molettes. Rien n'indique la combinaison, pour l'instant."}
            </motion.p>

            <motion.div
              key={feedback === "wrong" ? "shake" : "still"}
              animate={
                feedback === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center gap-3 px-5 py-6"
            >
              {digits.map((digit, index) => (
                <Dial
                  key={index}
                  value={digit}
                  tone="iron"
                  label={`Molette ${index + 1}`}
                  onChange={(value) => {
                    setFeedback("idle");
                    setDigits((current) =>
                      current.map((d, i) => (i === index ? value : d)),
                    );
                  }}
                />
              ))}
            </motion.div>

            <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
              <p className="min-h-5 text-sm" aria-live="polite">
                {feedback === "wrong" ? (
                  <span className="text-negative">
                    La poignée bloque. Une erreur de plus au classement.
                  </span>
                ) : null}
              </p>
              <Button onClick={submit} withArrow>
                Tourner la poignée
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalShell>
  );
}
