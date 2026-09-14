"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dial } from "@/components/ui/Dial";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CloseButton, ModalShell } from "@/components/ui/ModalShell";
import { TRANSITION, revealAt } from "@/lib/motion";

/**
 * Cadenas à quatre molettes de la porte du cabinet. Un code faux compte une
 * erreur ; un code juste referme la fenêtre après un court instant.
 */
export function CodeLockDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (digits: number[]) => boolean;
  onClose: () => void | Promise<void>;
}) {
  const [digits, setDigits] = useState([0, 0, 0, 0]);
  const [feedback, setFeedback] = useState<"idle" | "wrong" | "open">("idle");

  useEffect(() => {
    if (feedback !== "open") return;
    const timeout = setTimeout(() => onClose(), 1100);
    return () => clearTimeout(timeout);
  }, [feedback, onClose]);

  const submit = () => {
    if (feedback === "open") return;
    setFeedback(onSubmit(digits) ? "open" : "wrong");
  };

  return (
    <ModalShell
      labelledBy="code-lock-title"
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <header className="border-line flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div>
          <Eyebrow>Porte du cabinet</Eyebrow>
          <h2 id="code-lock-title" className="mt-1 text-2xl">
            Cadenas à quatre chiffres
          </h2>
        </div>
        <CloseButton onClick={onClose} label="Laisser le cadenas" />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={revealAt(0, 0.05)}
        className="px-5 pt-5"
      >
        <p className="text-ink-fade text-sm">
          Quatre chiffres, dans l&apos;ordre du temps. Les cartels de la galerie
          savent qui a vécu avant qui.
        </p>
      </motion.div>

      <motion.div
        key={feedback === "wrong" ? "shake" : "still"}
        initial={feedback === "wrong" ? { x: 0 } : false}
        animate={feedback === "wrong" ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center gap-3 px-5 py-6"
      >
        {digits.map((digit, index) => (
          <Dial
            key={index}
            value={digit}
            label={`Molette ${index + 1}`}
            disabled={feedback === "open"}
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
        <div className="min-h-5 text-sm" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {feedback === "wrong" ? (
              <motion.p
                key="wrong"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.micro}
                className="text-negative"
              >
                Le cadenas résiste. Une erreur de plus au classement.
              </motion.p>
            ) : feedback === "open" ? (
              <motion.p
                key="open"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.micro}
                className="text-positive"
              >
                Clic. Le cadenas s&apos;ouvre.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        <Button onClick={submit} disabled={feedback === "open"} withArrow>
          Tirer le cadenas
        </Button>
      </div>
    </ModalShell>
  );
}
