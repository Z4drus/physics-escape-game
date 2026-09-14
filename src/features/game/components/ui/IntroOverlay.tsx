"use client";

import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { INTRO_CARDS } from "@/features/game/data/clues";
import { cn } from "@/lib/cn";
import { TRANSITION } from "@/lib/motion";

/**
 * Les trois cartes du récit. La dernière porte le bouton qui capture la
 * souris : il doit rester un vrai clic utilisateur pour que le navigateur
 * l'autorise.
 */
export function IntroOverlay({
  step,
  onNext,
  onEnter,
  ready,
}: {
  step: number;
  onNext: () => void;
  onEnter: () => void;
  /** `false` pendant le délai de garde imposé après une sortie de Pointer Lock. */
  ready: boolean;
}) {
  const index = Math.min(step, INTRO_CARDS.length - 1);
  const card = INTRO_CARDS[index];
  const last = index === INTRO_CARDS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.micro}
      className="scrim fixed inset-0 z-20 flex justify-center overflow-y-auto overscroll-contain p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={TRANSITION.base}
        className="glass my-auto w-full max-w-xl rounded-xl p-2"
      >
        <div className="parchment overflow-hidden rounded-lg">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION.base}
              className="px-7 pt-7 pb-6"
              aria-live="polite"
            >
              <p className="text-xs font-medium uppercase opacity-70">
                {card.eyebrow} · {index + 1}/{INTRO_CARDS.length}
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl">{card.title}</h2>
              <p className="mt-4 text-base leading-relaxed">{card.body}</p>
            </motion.article>
          </AnimatePresence>

          <footer className="flex items-center justify-between gap-4 border-t border-[rgb(43_29_18/0.14)] px-7 py-4">
            <ol
              className="flex items-center gap-1.5"
              aria-label="Progression du récit"
            >
              {INTRO_CARDS.map((entry, dot) => (
                <li
                  key={entry.title}
                  aria-current={dot === index ? "step" : undefined}
                  className={cn(
                    "rounded-pill ease-smooth h-1.5 transition-[width,background-color] duration-[450ms]",
                    dot === index
                      ? "w-6 bg-[#2b1d12]"
                      : "w-1.5 bg-[#2b1d12]/30",
                  )}
                />
              ))}
            </ol>

            {last ? (
              <Button onClick={onEnter} disabled={!ready} withArrow>
                {ready ? "Entrer dans la galerie" : "Un instant…"}
              </Button>
            ) : (
              <Button onClick={onNext} withArrow>
                Suivant
              </Button>
            )}
          </footer>
        </div>
      </motion.div>
    </motion.div>
  );
}
