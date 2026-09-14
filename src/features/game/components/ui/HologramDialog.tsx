"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HOLOGRAM_LINES } from "@/features/game/data/clues";
import { TRANSITION } from "@/lib/motion";

/**
 * Dialogue avec l'hologramme d'Einstein : une réplique à la fois, révélée
 * lettre par lettre, puis le passage au score.
 */
export function HologramDialog({
  step,
  onNext,
  onFinish,
}: {
  step: number;
  onNext: () => void;
  onFinish: () => void;
}) {
  const index = Math.min(step, HOLOGRAM_LINES.length - 1);
  const line = HOLOGRAM_LINES[index];
  const last = index === HOLOGRAM_LINES.length - 1;
  /** Rang de la dernière réplique entièrement affichée, ou passée. */
  const [completedIndex, setCompletedIndex] = useState(-1);
  const [skippedIndex, setSkippedIndex] = useState(-1);
  const complete = completedIndex >= index || skippedIndex >= index;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.micro}
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center p-4 sm:p-8"
    >
      <motion.div
        role="dialog"
        aria-modal="false"
        aria-label="Hologramme d'Albert Einstein"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={TRANSITION.base}
        className="glass w-full max-w-3xl rounded-xl p-2"
      >
        <div className="bg-background-deep/90 flex items-stretch overflow-hidden rounded-lg">
          <div className="relative hidden w-40 shrink-0 sm:block">
            <Image
              src="/images/decor/einstein-hologram.webp"
              alt="Hologramme cyan d'Albert Einstein"
              fill
              sizes="160px"
              className="object-cover"
              priority
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(13_9_8/0.9))]"
            />
          </div>

          <div className="flex min-h-40 flex-1 flex-col px-5 py-4">
            <Eyebrow className="text-cyan">
              Albert Einstein · hologramme
            </Eyebrow>
            <Typewriter
              key={index}
              text={line}
              skip={skippedIndex >= index}
              onComplete={() => setCompletedIndex(index)}
            />
            <div className="mt-auto flex items-center justify-between gap-4 pt-3">
              <ol
                className="flex items-center gap-1.5"
                aria-label="Progression du dialogue"
              >
                {HOLOGRAM_LINES.map((entry, dot) => (
                  <li
                    key={entry}
                    className={
                      dot <= index
                        ? "bg-cyan rounded-pill size-1.5"
                        : "bg-line-strong rounded-pill size-1.5"
                    }
                  />
                ))}
              </ol>
              <motion.div
                animate={{ opacity: complete ? 1 : 0.6 }}
                transition={TRANSITION.micro}
              >
                {last ? (
                  <Button onClick={onFinish} withArrow>
                    Voir le classement
                  </Button>
                ) : (
                  <Button
                    variant="glass"
                    onClick={complete ? onNext : () => setSkippedIndex(index)}
                  >
                    {complete ? "Continuer" : "Tout afficher"}
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Révèle un texte lettre par lettre. Le composant est remonté à chaque
 * réplique (clé du parent), ce qui repart de zéro sans remise à l'état.
 */
function Typewriter({
  text,
  skip,
  onComplete,
}: {
  text: string;
  skip: boolean;
  onComplete: () => void;
}) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced ? text.length : 0);
  const shown = skip || reduced ? text.length : visible;
  const done = shown >= text.length;

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setVisible((count) => Math.min(count + 1, text.length));
    }, 22);
    return () => clearInterval(interval);
  }, [done, text.length]);

  useEffect(() => {
    if (done) onComplete();
  }, [done, onComplete]);

  return (
    <p
      className="font-display mt-2 min-h-16 text-lg leading-snug sm:text-xl"
      aria-live="polite"
    >
      <span aria-hidden>{text.slice(0, shown)}</span>
      <span className="sr-only">{text}</span>
      {!done ? (
        <span
          aria-hidden
          className="bg-cyan ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse"
        />
      ) : null}
    </p>
  );
}
